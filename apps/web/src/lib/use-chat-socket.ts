'use client';
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';
export interface ChatMessage {
  productId?: string | null; productName?: string | null; productImage?: string | null;
  clientMessageId?: string | null;
  id: string; senderId: string; recipientId: string; text: string; createdAt: string;
}
type Listener = { onMessage: (message: ChatMessage) => void; onTyping: (senderId: string, typing: boolean) => void };
type Presence = Record<string, boolean | null>;
interface ChatConnection {
  connected: boolean; presence: Presence;
  sendMessage: (recipientId: string, text: string, productId?: string) => Promise<ChatMessage>;
  sendTyping: (recipientId: string, typing: boolean) => void;
  subscribe: (listener: Listener) => () => void;
  watch: (ids: string[], productId?: string) => () => void;
}
const Connection = createContext<ChatConnection | null>(null);
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const ready = useRef(false);
  const presenceSequence = useRef(0);
  const listeners = useRef(new Set<Listener>());
  const watches = useRef(new Map<symbol, { ids: string[]; productId?: string }>());
  const pending = useRef(new Map<string, string>());
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence>({});
  const syncPresence = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected || !ready.current) return;
    const all = Array.from(watches.current.values());
    const ids = Array.from(new Set(all.flatMap(watch => watch.ids))).slice(0, 100);
    const productId = all.find(watch => watch.productId)?.productId;
    const sequence = ++presenceSequence.current;
    socket.timeout(4000).emit('watchPresence', { userIds: ids, productId },
      (error: Error | null, response: { ok: boolean; status?: Presence }) => {
        if (socketRef.current !== socket || !socket.connected || sequence !== presenceSequence.current) return;
        setPresence(!error && response?.ok ? response.status || {} : {});
      });
  }, []);
  useEffect(() => {
    setPresence({}); setConnected(false); pending.current.clear();
    if (!token) return;
    const socket = io(`${process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'}/chat`, {
      auth: { token }, transports: ['websocket'], reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 10000,
    });
    socketRef.current = socket;
    socket.on('ready', () => { ready.current = true; setConnected(true); syncPresence(); });
    const offline = () => { ready.current = false; ++presenceSequence.current; setConnected(false); setPresence({}); };
    socket.on('disconnect', offline); socket.on('connect_error', offline);
    const networkOffline = () => { offline(); socket.disconnect(); };
    const networkOnline = () => socket.connect();
    window.addEventListener('offline', networkOffline); window.addEventListener('online', networkOnline);
    socket.on('presenceUnavailable', () => setPresence({}));
    socket.on('presenceChanged', ({ userId, online }: { userId: string; online: boolean }) => setPresence(previous => ({ ...previous, [userId]: online })));
    socket.on('presenceUnknown', ({ userId }: { userId: string }) => setPresence(previous => ({ ...previous, [userId]: null })));
    socket.on('receiveMessage', (message: ChatMessage) => listeners.current.forEach(listener => listener.onMessage(message)));
    socket.on('userTyping', ({ senderId, isTyping }) => listeners.current.forEach(listener => listener.onTyping(senderId, isTyping)));
    const interval = setInterval(syncPresence, 15000);
    return () => { window.removeEventListener('offline', networkOffline); window.removeEventListener('online', networkOnline); ready.current = false; clearInterval(interval); socket.disconnect(); socketRef.current = null; };
  }, [token, syncPresence]);
  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener); return () => { listeners.current.delete(listener); };
  }, []);
  const watch = useCallback((ids: string[], productId?: string) => {
    const id = Symbol(); watches.current.set(id, { ids, productId }); syncPresence();
    return () => { watches.current.delete(id); syncPresence(); };
  }, [syncPresence]);
  const sendMessage = async (recipientId: string, text: string, productId?: string): Promise<ChatMessage> => {
    const socket = socketRef.current;
    if (!socket?.connected || !ready.current) throw new Error('Sin conexion. El mensaje sigue en tu borrador.');
    const key = JSON.stringify([recipientId, text, productId]);
    const clientMessageId = pending.current.get(key) || crypto.randomUUID();
    pending.current.set(key, clientMessageId);
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await new Promise<{ ok?: boolean; code?: string; message?: ChatMessage }>(resolve => {
        if (socketRef.current !== socket || !socket.connected) return resolve({ code: 'TEMPORARY' });
        socket.timeout(5000).emit('sendMessage', { recipientId, text, productId, clientMessageId },
          (error: Error | null, response: { ok?: boolean; code?: string; message?: ChatMessage }) => resolve(error ? { code: 'TEMPORARY' } : response || {}));
      });
      if (result.ok && result.message) { pending.current.delete(key); return result.message; }
      if (result.code !== 'TEMPORARY') throw new Error('No se pudo enviar. Revisa el destinatario o el producto.');
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
    }
    throw new Error('No se pudo confirmar el envio. Tu borrador se conserva; puedes reintentar sin duplicar el mensaje.');
  };
  const sendTyping = (recipientId: string, isTyping: boolean) => {
    if (socketRef.current?.connected) socketRef.current.emit('typing', { recipientId, isTyping });
  };
  return React.createElement(Connection.Provider, { value: { connected, presence, sendMessage, sendTyping, subscribe, watch } }, children);
}
export function useChatConnection() {
  const connection = useContext(Connection);
  if (!connection) throw new Error('ChatProvider missing');
  return connection;
}
export function useChatSocket({ onMessage, onTyping }: { token: string | null } & Listener) {
  const connection = useChatConnection();
  const callbacks = useRef({ onMessage, onTyping }); callbacks.current = { onMessage, onTyping };
  useEffect(() => connection.subscribe({ onMessage: message => callbacks.current.onMessage(message),
    onTyping: (id, typing) => callbacks.current.onTyping(id, typing) }), [connection.subscribe]);
  return connection;
}
export function usePresence(ids: (string | undefined)[], productId?: string) {
  const connection = useChatConnection();
  const key = JSON.stringify(Array.from(new Set(ids.filter((id): id is string => Boolean(id)))).sort());
  useEffect(() => connection.watch(JSON.parse(key), productId), [connection.watch, key, productId]);
  return connection.presence;
}
