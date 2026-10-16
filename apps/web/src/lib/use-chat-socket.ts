'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export interface WsIncomingMessage {
  id: string;
  sender: 'other';
  text: string;
  senderName: string;
  time: string;
  status: 'delivered';
}

export interface UseChatSocketOptions {
  chatId: string;
  userId: string;
  userName: string;
  onMessage: (chatId: string, msg: WsIncomingMessage) => void;
  onTyping: (chatId: string, senderName: string, isTyping: boolean) => void;
  onMessageSent?: (chatId: string, messageId: string) => void;
}

export function useChatSocket({
  chatId,
  userId,
  userName,
  onMessage,
  onTyping,
  onMessageSent,
}: UseChatSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const currentChatIdRef = useRef<string>(chatId);

  // Actualizar la ref cuando cambia el chatId
  useEffect(() => {
    currentChatIdRef.current = chatId;
  }, [chatId]);

  // Inicializar y conectar el socket (solo una vez)
  useEffect(() => {
    if (socketRef.current) return;

    const socket = io(`${WS_URL}/chat`, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WS] Conectado al servidor de chat:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Desconectado:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[WS] Error de conexión (backend puede estar offline):', err.message);
    });

    socket.on('receiveMessage', ({ chatId: incomingChatId, message }: { chatId: string; message: WsIncomingMessage }) => {
      onMessage(incomingChatId, message);
    });

    socket.on('userTyping', ({ chatId: incomingChatId, senderName, isTyping }: { chatId: string; senderName: string; isTyping: boolean }) => {
      onTyping(incomingChatId, senderName, isTyping);
    });

    socket.on('messageSent', ({ chatId: incomingChatId, messageId }: { chatId: string; messageId: string }) => {
      onMessageSent?.(incomingChatId, messageId);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-unirse a la nueva sala cuando cambia chatId
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    socket.emit('join', { chatId, userId, name: userName });
  }, [chatId, userId, userName]);

  // Unirse a la sala cuando se conecta (cubre el caso de conexión tardía)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleConnect = () => {
      socket.emit('join', {
        chatId: currentChatIdRef.current,
        userId,
        name: userName,
      });
    };

    socket.on('connect', handleConnect);
    return () => {
      socket.off('connect', handleConnect);
    };
  }, [userId, userName]);

  // Enviar un mensaje a través de WebSocket
  const sendMessage = useCallback((text: string, time: string) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      // El backend no está disponible, solo opera en modo local
      return false;
    }

    socket.emit('sendMessage', {
      chatId: currentChatIdRef.current,
      senderId: userId,
      senderName: userName,
      text,
      time,
    });
    return true;
  }, [userId, userName]);

  // Emitir estado de escritura
  const sendTyping = useCallback((isTyping: boolean) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    socket.emit('typing', {
      chatId: currentChatIdRef.current,
      senderName: userName,
      isTyping,
    });
  }, [userName]);

  // Cambiar de sala
  const switchRoom = useCallback((newChatId: string) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    socket.emit('leave', { chatId: currentChatIdRef.current });
    socket.emit('join', { chatId: newChatId, userId, name: userName });
    currentChatIdRef.current = newChatId;
  }, [userId, userName]);

  const isConnected = () => socketRef.current?.connected ?? false;

  return { sendMessage, sendTyping, switchRoom, isConnected };
}
