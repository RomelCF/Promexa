import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface ChatMessage {
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  time: string;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, { socketId: string; userId: string; name: string }>();

  handleConnection(client: Socket) {
    console.log(`[WS] Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
    console.log(`[WS] Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: string; userId: string; name: string },
  ) {
    client.join(payload.chatId);
    this.connectedUsers.set(client.id, {
      socketId: client.id,
      userId: payload.userId,
      name: payload.name,
    });
    console.log(`[WS] ${payload.name} se unió a la sala ${payload.chatId}`);

    // Confirmar al cliente que entró a la sala
    client.emit('joined', { chatId: payload.chatId });
  }

  @SubscribeMessage('leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: string },
  ) {
    client.leave(payload.chatId);
    console.log(`[WS] Socket ${client.id} salió de la sala ${payload.chatId}`);
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatMessage,
  ) {
    const { chatId, ...messageData } = payload;

    // Construir el objeto de mensaje con ID único
    const message = {
      id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'other' as const,
      ...messageData,
      status: 'delivered' as const,
    };

    // Emitir a todos los miembros de la sala EXCEPTO al remitente
    client.to(chatId).emit('receiveMessage', { chatId, message });

    // Confirmar al remitente que el mensaje fue enviado
    client.emit('messageSent', { chatId, messageId: message.id });

    console.log(`[WS] Mensaje en sala ${chatId}: "${payload.text.slice(0, 40)}..."`);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: string; senderName: string; isTyping: boolean },
  ) {
    // Emitir estado de escritura a los demás en la sala
    client.to(payload.chatId).emit('userTyping', {
      chatId: payload.chatId,
      senderName: payload.senderName,
      isTyping: payload.isTyping,
    });
  }
}
