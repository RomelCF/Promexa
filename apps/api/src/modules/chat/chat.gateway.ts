import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody,
  ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { UsersService } from '../users/users.service';
import { realtimeHealth } from '../../websockets/realtime-health';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: { origin: ['http://localhost:3000', 'http://127.0.0.1:3000', process.env.CORS_ORIGIN].filter(Boolean), credentials: true },
  namespace: '/chat',
  pingInterval: 10000,
  pingTimeout: 10000,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  constructor(private readonly jwt: JwtService, private readonly users: UsersService,
    private readonly chat: ChatService) {}

  private expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private async publishPresence(userId: string) {
    try {
      if (!realtimeHealth.available) throw new Error('Presence unavailable');
      const sockets = await this.server.in(`user:${userId}`).fetchSockets();
      this.server.to(`presence:${userId}`).emit('presenceChanged', { userId, online: sockets.length > 0 });
    } catch {
      this.server.local.to(`presence:${userId}`).emit('presenceUnknown', { userId });
    }
  }
  async handleDisconnect(client: Socket) {
    clearTimeout(this.expiryTimers.get(client.id)); this.expiryTimers.delete(client.id);
    if (client.data.user) await this.publishPresence(client.data.user.id);
  }
  @SubscribeMessage('watchPresence')
  async watchPresence(@ConnectedSocket() client: Socket, @MessageBody() payload: { userIds: string[]; productId?: string }) {
    const user = client.data.user;
    if (!user || Date.now() >= user.expiresAt) { client.disconnect(true); return { ok: false }; }
    if (!payload || !Array.isArray(payload.userIds) || payload.userIds.length > 100
      || payload.userIds.some(id => typeof id !== 'string' || id.length > 100)
      || (payload.productId !== undefined && (typeof payload.productId !== 'string' || payload.productId.length > 100))) return { ok: false };
    const revision = (client.data.presenceRevision || 0) + 1;
    client.data.presenceRevision = revision;
    try {
      if (!realtimeHealth.available) return { ok: false };
      const contacts = await this.chat.contacts(user.id);
      if (client.data.presenceRevision !== revision) return { ok: false };
      const allowed = new Set([user.id, ...contacts.map(contact => contact.id)]);
      const status: Record<string, boolean | null> = {};
      const requested = Array.from(new Set(payload.userIds));
      for (const room of client.rooms) if (room.startsWith('presence:')) await client.leave(room);
      for (const id of requested) {
        if (client.data.presenceRevision !== revision) return { ok: false };
        if (!allowed.has(id) && !(payload.productId && await this.chat.canContact(user.id, id, payload.productId))) { status[id] = null; continue; }
        await client.join(`presence:${id}`);
        const sockets = await this.server.in(`user:${id}`).fetchSockets();
        status[id] = sockets.length > 0;
      }
      return { ok: true, status };
    } catch { return { ok: false }; }
  }

  async handleConnection(client: Socket) {
    try {
      const payload = await this.jwt.verifyAsync(client.handshake.auth.token, { algorithms: ['HS256'] });
      if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now() || typeof payload.sub !== 'string') throw new Error('Invalid identity');
      const user = await this.users.findById(payload.sub);
      if (!user) throw new Error('Unknown user');
      client.data.user = { id: user.id, name: user.name, expiresAt: payload.exp * 1000 };
      if (!client.connected) return;
      await client.join(`user:${user.id}`);
      if (!client.connected) return;
      this.expiryTimers.set(client.id, setTimeout(() => client.disconnect(true), Math.min(payload.exp * 1000 - Date.now(), 2147483647)));
      await this.publishPresence(user.id);
      client.emit('ready');
    } catch {
      client.disconnect(true);
    }
  }

  private async recipient(client: Socket, recipientId: string, productId?: string) {
    const user = client.data.user;
    if (!user || !Number.isFinite(user.expiresAt) || Date.now() >= user.expiresAt) {
      client.disconnect(true);
      return null;
    }
    const friends = await this.users.getFriends(user.id);
    return user.id !== recipientId && (friends.some(friend => friend.id === recipientId)
      || await this.chat.canContact(user.id, recipientId, productId)) ? user : null;
  }

  @SubscribeMessage('sendMessage')
  async send(@ConnectedSocket() client: Socket,
    @MessageBody() payload: { recipientId: string; text: string; productId?: string; clientMessageId?: string }) {
    if (!payload || typeof payload.recipientId !== 'string' || typeof payload.text !== 'string'
      || !payload.text.trim() || payload.text.length > 5000
      || (payload.productId !== undefined && (typeof payload.productId !== 'string' || payload.productId.length > 100))
      || (payload.clientMessageId !== undefined && (typeof payload.clientMessageId !== 'string' || !/^[a-f0-9-]{36}$/.test(payload.clientMessageId)))) return { ok: false };
    let message;
    let user;
    try {
      user = await this.recipient(client, payload.recipientId, payload.productId);
      if (!user) return { ok: false, code: 'FORBIDDEN' };
      message = await this.chat.save(user.id, payload.recipientId, payload.text.trim(), payload.productId, payload.clientMessageId);
    } catch (error) {
      return { ok: false, code: error.status === 400 ? 'INVALID' : 'TEMPORARY' };
    }
    try {
      this.server.to(`user:${payload.recipientId}`).emit('receiveMessage', message);
      client.to(`user:${user.id}`).emit('receiveMessage', message);
    } catch { /* The durable history repairs missed realtime deliveries. */ }
    return { ok: true, message };
  }

  @SubscribeMessage('typing')
  async typing(@ConnectedSocket() client: Socket,
    @MessageBody() payload: { recipientId: string; isTyping: boolean }) {
    if (!payload || typeof payload.recipientId !== 'string') return;
    let user;
    try { user = await this.recipient(client, payload.recipientId); } catch { return; }
    if (user) this.server.to(`user:${payload.recipientId}`).emit('userTyping', {
      senderId: user.id, isTyping: Boolean(payload.isTyping),
    });
  }
}
