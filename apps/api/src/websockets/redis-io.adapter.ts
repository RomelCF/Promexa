import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { ServerOptions } from 'socket.io';
import { realtimeHealth } from './realtime-health';

export class RedisIoAdapter extends IoAdapter {
  private publisher?: { readonly isOpen: boolean; destroy(): void };
  private subscriber?: { readonly isOpen: boolean; destroy(): void };
  private adapterFactory?: ReturnType<typeof createAdapter>;
  private notify?: () => void;
  constructor(app: INestApplicationContext) { super(app); }
  async connect(config: ConfigService) {
    realtimeHealth.available = false;
    const url = config.get<string>('REDIS_URL') || `redis://${config.get('REDIS_HOST') || 'localhost'}:${config.get('REDIS_PORT') || 6379}`;
    const publisher = createClient({ url, password: config.get('REDIS_PASSWORD') || undefined,
      disableOfflineQueue: true, socket: { connectTimeout: 3000, reconnectStrategy: retries => Math.min(500 * (retries + 1), 5000) } });
    const subscriber = publisher.duplicate();
    this.publisher = publisher; this.subscriber = subscriber;
    const health = () => {
      realtimeHealth.available = publisher.isReady && subscriber.isReady;
      if (!realtimeHealth.available) this.notify?.();
    };
    for (const client of [publisher, subscriber]) {
      client.on('error', () => { realtimeHealth.available = false; this.notify?.(); });
      client.on('reconnecting', health); client.on('end', health); client.on('ready', health);
    }
    let timeout: ReturnType<typeof setTimeout>;
    try {
      await Promise.race([Promise.all([publisher.connect(), subscriber.connect()]),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Redis no disponible para WebSockets')), 5000); })]);
      this.adapterFactory = createAdapter(publisher, subscriber, { requestsTimeout: 3000 });
    } catch {
      if (publisher.isOpen) publisher.destroy(); if (subscriber.isOpen) subscriber.destroy();
      throw new Error('No se pudo conectar Redis. Revisa la configuracion de WebSockets.');
    } finally { clearTimeout(timeout); }
  }
  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, { ...options, pingInterval: 10000, pingTimeout: 10000 });
    server.adapter(this.adapterFactory);
    this.notify = () => server.of('/chat').local.emit('presenceUnavailable');
    return server;
  }
  async dispose() {
    await super.dispose();
    if (this.publisher?.isOpen) this.publisher.destroy();
    if (this.subscriber?.isOpen) this.subscriber.destroy();
  }
}
