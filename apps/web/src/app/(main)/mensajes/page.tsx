'use client';

import React, { useState, useRef, useEffect, Suspense, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useChatSocket } from '@/lib/use-chat-socket';

export interface Message {
  id: string;
  sender: 'me' | 'other';
  text: string;
  time: string;
  status?: 'sent' | 'delivered' | 'read';
  attachmentUrl?: string;
}

export interface LinkedProduct {
  name: string;
  price: number;
  status: 'Disponible' | 'Reservado';
  image: string;
}

export interface Chat {
  id: string;
  name: string;
  avatar: string;
  isVerified: boolean;
  status: 'online' | 'offline' | 'reconnecting';
  lastMessage: string;
  time: string;
  unreadCount?: number;
  tag?: string;
  tagType?: 'product' | 'community' | 'category';
  linkedProduct?: LinkedProduct;
  phone?: string;
}

const STORAGE_KEY_CHATS = 'promexa_chat_conversations_v1';
const STORAGE_KEY_MESSAGES = 'promexa_chat_messages_map_v1';

const INITIAL_CHATS: Chat[] = [
  {
    id: 'chat-1',
    name: 'Café & Tostaduría Don Pedro',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAUOL_qpfoh7GK1nqcY2nMJKuck2wInD-IY2vZZ7MToGhpQU9rouDi2XzKNqJBrGD5Wl_aWkxXZSmaIxtLZxwLLZq4fZsKQcxRGsI78fcybUpGxocaGqRTVBQufjfz2PaOUbScjZIEn6COnn9gcx_Xk4DaUiSO_7cedvR_7cFdzIG5lqHpcGPkiY8ef34CNF2YGESXySeZn0pZpOov6nyKfTCMkB18LiB5JsZoDlks',
    isVerified: true,
    status: 'online',
    lastMessage: 'Sí, tenemos stock disponible para entrega hoy',
    time: '11:42 AM',
    unreadCount: 1,
    tag: 'Villa Rica 500g',
    tagType: 'product',
    phone: '+51 987 654 321',
    linkedProduct: {
      name: 'Café Especial Villa Rica 500g',
      price: 38.0,
      status: 'Disponible',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCnsq7vhmfVj3zx5YXyLGyAqg0KElcAls_SKlkSmI9mWGQEnmGNVoKsG_2RgvvuTvdKk2d_1ZOHWf2JTx1sd15avl3to7ME-F4xs8wCk7RvCqKWjMUcpwo_EoaQqiSeAyDq56yG8K7RLZ6iV0HvmRtk8WvxGEp92bx6gJik3Q3a-HP9krGYEabBqtcJuiJs7ZxgbyYKUjyeZnMZ9fgqrcgVXG4vLNALfTkbY0X-Lb4',
    },
  },
  {
    id: 'chat-2',
    name: 'TechStore Perú',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDV_KA-0LobmBiCQHH7Yg5XdJPBLXXTfyLV1G_5OIDzBusEWBLFuppUXfs_S2Nmi7RCgSxawHcsF1P5TiwPIaDpj-b8zuyd2H_bnkEEF_JEnM0v7WDUt9kfXFKO_qJZY1THPyXeONKGP4MPWJDktrdmOgsL5wrufJ_ZPp5Do4o4CsWiZry0-_9zitTQPxQlucl9MLHAL90WPiDd6gUiJcu-1pKLwrEAvmOMEdijp0Q',
    isVerified: true,
    status: 'online',
    lastMessage: 'El precio por 2 unidades sería S/ 280',
    time: 'Ayer',
    tag: 'Audífonos ANC Pro',
    tagType: 'product',
    phone: '+51 912 345 678',
    linkedProduct: {
      name: 'Audífonos Bluetooth ANC Pro',
      price: 149.0,
      status: 'Disponible',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBg21NIl8VdFPryF6IWY-blXSc13SLNb4Sl7Q9l8EWc2PLSRgFGRh0sujb6aUCKCUYPDPiOiITsYoFh-jk5Kn13VWgSeKG-xa-eUIQ_KOQZoBC4B7-zyLcvi6Jcv1PM5I-q2XaynJA_RoFH4LNb9KCKa6L4xSiHeqtQjEh4MM_aAXm1I2VFbn6GKlfDYzJOQjAwai280GrID5emqvvty-Skt8vBumoZrOc2D6TQrlo',
    },
  },
  {
    id: 'chat-3',
    name: 'Mariana Silva',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDPlyBB321D9BExxRh4OMTSKWJISRS3AMhDn2FToZZxqg6CktsAk76pOrUDYAoHMQQbctXIRyjDp2TGlwhUrAl1wst1azxlQoLd3ZeDrwFqRLmRcPN4gnhkkxa9h-pwcqFernAAxdGiMCfEyWWcQCwD1MjLyXpNGGjXvcuEjHAa74mqvjJ4lVdiTGkEAH4wttp0iDpgDzr6-LiBkKop1CuAixtNPQiw1x5ODgw2L-E',
    isVerified: false,
    status: 'offline',
    lastMessage: '¡Excelente recomendación de diseñador, gracias!',
    time: 'Mar 12',
    tag: 'Comunidad',
    tagType: 'community',
  },
  {
    id: 'chat-4',
    name: 'Muebles & Diseño',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAdUConcX2iKBR0Cby8eYe3xaPphMY03YIwR75SH20THF7c9Go4mrxUcfMTTQFABav0sDOjm8G7KjNaZjI-UkDMPWV0Cc2ijJ4rDaADZVLKChwwsC6q5jrUqnMWklwyAM8Wqn-xGSHRPtEnMjFDw9rSQd9fCya1Dcj3LEEeyz-eJpNBjKj-Mmv0JTPHrdXdHkMQMlIEKPqfkPwBPqNMRnmMs9K31Yo1EFBRko7TjdA',
    isVerified: true,
    status: 'online',
    lastMessage: 'El escritorio queda reservado hasta mañana',
    time: 'Mar 10',
    tag: 'Escritorio Ergonómico',
    tagType: 'product',
    phone: '+51 945 678 123',
    linkedProduct: {
      name: 'Escritorio Ergonómico Roble 120cm',
      price: 320.0,
      status: 'Reservado',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA_swiMZZIbF1o0yMzFUfJty7mqNEB2JsKwNRRCcUxW4kLP-UsTynJTDUfYZeSoh9R7CTUQYtpnT1NZh2j5b1Xf-AD-q7Ga9QVy2Snr7XVsbJbkjDxIiZOe_h_b-Dj9u9sJbTZIS8agku5KuKErkPUmd1wZLj0tvmTmVL5JKu9OQxR-RWeblxlGZfQsPd3mK49XcQmHVr2xEZWQHj9gv7hx9p31VP6qs21_UHBO-oE',
    },
  },
];

const INITIAL_MESSAGES_MAP: { [chatId: string]: Message[] } = {
  'chat-1': [
    {
      id: 'm1-1',
      sender: 'other',
      text: '¡Hola! Gracias por tu interés en nuestro Café de especialidad de Villa Rica.',
      time: '11:38 AM',
    },
    {
      id: 'm1-2',
      sender: 'me',
      text: 'Hola Don Pedro, buenas tardes. ¿Tienen molienda media para prensa francesa o viene solo en grano entero?',
      time: '11:40 AM',
      status: 'read',
    },
    {
      id: 'm1-3',
      sender: 'other',
      text: 'Sí, tenemos stock disponible para entrega hoy. Te lo molemos al instante sin costo adicional.',
      time: '11:42 AM',
    },
  ],
  'chat-2': [
    {
      id: 'm2-1',
      sender: 'me',
      text: 'Hola TechStore, ¿los audífonos ANC Pro cuentan con garantía oficial de marca en Perú?',
      time: 'Ayer 4:15 PM',
      status: 'read',
    },
    {
      id: 'm2-2',
      sender: 'other',
      text: '¡Hola! Sí, emitimos boleta o factura con 12 meses de garantía local. El precio por 2 unidades sería S/ 280.',
      time: 'Ayer 4:20 PM',
    },
  ],
  'chat-3': [
    {
      id: 'm3-1',
      sender: 'me',
      text: 'Hola Mariana, vi tu publicación en el feed sobre la remodelación de locales comerciales.',
      time: 'Mar 12',
      status: 'read',
    },
    {
      id: 'm3-2',
      sender: 'other',
      text: '¡Excelente recomendación de diseñador, gracias! Ya me puse en contacto con el estudio.',
      time: 'Mar 12',
    },
  ],
  'chat-4': [
    {
      id: 'm4-1',
      sender: 'me',
      text: 'Buenas tardes, ¿aún está disponible el escritorio de roble?',
      time: 'Mar 10',
      status: 'read',
    },
    {
      id: 'm4-2',
      sender: 'other',
      text: 'El escritorio queda reservado hasta mañana. Si deseas te avisamos si el comprador confirma.',
      time: 'Mar 10',
    },
  ],
};

const DIRECTORY_CONTACTS = [
  {
    name: 'TravelGear Perú',
    category: 'Mochilas & Viajes',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBVxmF8dscqlLeiZaGMhVkbg-9FG2ZAtF_40174SeFo3mnxiO1fIRqnS4L14_86ec_7fw-IEMSbZC3deeelgYQzJpIXqTtxx29HsxN3Yrn7We52RvahxWzUd-bcNU3p9e-RmbSggkkWIeQm0cNmlH4_6z3EOJML_46PsgVpboNXh67lg-c2i2QIj6Zpq2rPKo7RaqaLoqFExJt_zC6YP8uyM58pz1ov1biiGipDrek',
    isVerified: true,
    phone: '+51 988 777 666',
  },
  {
    name: 'EcoBelleza Natural',
    category: 'Skincare & Cosmética Orgánica',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCZZEpVWZtYl9TBWZ1DeGTYcMZRuOKPlbcoVMizdnN8R7gXnKCLjx1jY0iMpKbL8pbpZmkZ8tKTn7u36B2h81-KyMR3qxqq-2aAtQ9_0N35uKnJthW-td1tZn8qNj1VrCtMj8pSepMNVivQYmKPJUEtTUxq0riHFyOOxpDAP6nv2qp2ceHuZKXA8vCE6YbiULPhLb__r9rBw4cFHv_sVT6NNNGMgQdoq4Mvjnrs0Zk',
    isVerified: true,
    phone: '+51 955 888 111',
  },
  {
    name: 'Pastelería Dulce Sabor',
    category: 'Gastronomía & Postres',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBwaVORiUPu7DaJRkXr9zT-6H768qBfTbF2Wt77Wfg_ClQAg_Lfc3b_fgjKuC_U6sbZmbWICWN5U0KferwY2PtN483DSUhcvirYIf1cRC7Wbjp19VLvO3OlbNIRwebQUgKbOiLsBbbCswu8-k0KeIxCvDN166HHT_eFyEZaKsBjytqKy1J2NjIep4FUpZT_yirJluSpXq4GyeOQtFQDw8u9joPBUM9_w7gdWQxOAOM',
    isVerified: true,
    phone: '+51 966 222 888',
  },
  {
    name: 'Moda Urbana Lima',
    category: 'Calzado & Zapatillas',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAtwIrPJpJDD6RZoc-kmSxoH4Q4hV8mkzGwEm3y7S-5D611CQMrt6jrg6RPNOq7wGuQuLM2zHuvjJQxwf3f8fs7YUYGlKlTZfTWaS7Odb4kCWP1L9Q2KZ1Q0UB_zMq-cP9Nt6sJDuxDYEMIo9vhXP3VF9nx1NRIks8UcRO472IQlPY4weXVMNxS2fBIfqM1_eD7sH2Hk1jNc7EUDwvDOwwAl7T3Gj508HAHytIsLd0',
    isVerified: false,
    phone: '+51 912 345 678',
  },
];

function MensajesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Estados de datos
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);
  const [messagesMap, setMessagesMap] = useState<{ [chatId: string]: Message[] }>(
    INITIAL_MESSAGES_MAP
  );
  const [selectedChatId, setSelectedChatId] = useState<string>('chat-1');

  // Filtros y búsquedas
  const [searchFilter, setSearchFilter] = useState('');
  const [tabFilter, setTabFilter] = useState<'all' | 'unread' | 'marketplace'>('all');

  // Inputs e interactividad
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [remoteTypingName, setRemoteTypingName] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Carga inicial persistente de localStorage
  useEffect(() => {
    try {
      const storedChats = localStorage.getItem(STORAGE_KEY_CHATS);
      if (storedChats) {
        const parsed = JSON.parse(storedChats);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChats(parsed);
        } else {
          localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(INITIAL_CHATS));
        }
      } else {
        localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(INITIAL_CHATS));
      }

      const storedMsgs = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (storedMsgs) {
        setMessagesMap(JSON.parse(storedMsgs));
      } else {
        localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(INITIAL_MESSAGES_MAP));
      }
    } catch (e) {
      console.error('Error loading chat storage:', e);
    }
  }, []);

  // Helper para persistir chats
  const persistChats = useCallback((updated: Chat[]) => {
    setChats(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving chats:', e);
    }
  }, []);

  // Helper para persistir mensajes
  const persistMessages = useCallback((updatedMap: { [chatId: string]: Message[] }) => {
    setMessagesMap(updatedMap);
    try {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(updatedMap));
    } catch (e) {
      console.error('Error saving messages:', e);
    }
  }, []);

  // ─── WebSocket Hook ────────────────────────────────────────────────────────
  const { sendMessage: wsSend, sendTyping, switchRoom, isConnected } = useChatSocket({
    chatId: selectedChatId,
    userId: user?.id || 'anonymous',
    userName: user?.name || 'Usuario',
    onMessage: useCallback((incomingChatId: string, msg: { id: string; sender: 'other'; text: string; senderName: string; time: string; status: 'delivered' }) => {
      // Mensaje WebSocket recibido de otro usuario real
      setMessagesMap((prev) => {
        const existing = prev[incomingChatId] || [];
        const updated = [...existing, { ...msg, sender: 'other' as const }];
        const newMap = { ...prev, [incomingChatId]: updated };
        try {
          localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(newMap));
        } catch {}
        return newMap;
      });
      setChats((prev) => {
        const updated = prev.map((c) =>
          c.id === incomingChatId
            ? { ...c, lastMessage: msg.text, time: msg.time, unreadCount: c.id !== selectedChatId ? (c.unreadCount || 0) + 1 : undefined }
            : c
        );
        try {
          localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }, [selectedChatId]),
    onTyping: useCallback((_chatId: string, senderName: string, typing: boolean) => {
      if (typing) {
        setRemoteTypingName(senderName);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setRemoteTypingName(null), 3000);
      } else {
        setRemoteTypingName(null);
      }
    }, []),
  });

  // Actualizar indicador de conexión WS periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      setWsConnected(isConnected());
    }, 1500);
    return () => clearInterval(interval);
  }, [isConnected]);

  // Procesar parámetros de URL (cuando el usuario llega desde Marketplace o Feed: ?store=...&product=...)
  useEffect(() => {
    const storeParam = searchParams.get('store');
    const productParam = searchParams.get('product');

    if (!storeParam) return;

    // Buscar si ya existe un chat con esta tienda
    const existing = chats.find(
      (c) => c.name.toLowerCase() === storeParam.toLowerCase()
    );

    if (existing) {
      setSelectedChatId(existing.id);
      setMobileView('chat');
      if (productParam && (!existing.linkedProduct || existing.linkedProduct.name !== productParam)) {
        const updated = chats.map((c) =>
          c.id === existing.id
            ? {
                ...c,
                tag: productParam,
                tagType: 'product' as const,
                linkedProduct: {
                  name: productParam,
                  price: existing.linkedProduct?.price || 45.0,
                  status: 'Disponible' as const,
                  image: existing.linkedProduct?.image || existing.avatar,
                },
              }
            : c
        );
        persistChats(updated);
      }
      if (productParam) {
        setInputText(`Hola, me interesa el producto "${productParam}". ¿Está disponible?`);
      }
    } else {
      // Crear nueva conversación para esta tienda
      const newChatId = `chat-store-${Date.now()}`;
      const newChat: Chat = {
        id: newChatId,
        name: storeParam,
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBg21NIl8VdFPryF6IWY-blXSc13SLNb4Sl7Q9l8EWc2PLSRgFGRh0sujb6aUCKCUYPDPiOiITsYoFh-jk5Kn13VWgSeKG-xa-eUIQ_KOQZoBC4B7-zyLcvi6Jcv1PM5I-q2XaynJA_RoFH4LNb9KCKa6L4xSiHeqtQjEh4MM_aAXm1I2VFbn6GKlfDYzJOQjAwai280GrID5emqvvty-Skt8vBumoZrOc2D6TQrlo',
        isVerified: true,
        status: 'online',
        lastMessage: productParam ? `Consulta por ${productParam}` : 'Nueva conversación',
        time: 'Ahora',
        tag: productParam || 'Marketplace',
        tagType: 'product',
        phone: '+51 987 654 321',
        linkedProduct: productParam
          ? {
              name: productParam,
              price: 49.0,
              status: 'Disponible',
              image:
                'https://lh3.googleusercontent.com/aida-public/AB6AXuBg21NIl8VdFPryF6IWY-blXSc13SLNb4Sl7Q9l8EWc2PLSRgFGRh0sujb6aUCKCUYPDPiOiITsYoFh-jk5Kn13VWgSeKG-xa-eUIQ_KOQZoBC4B7-zyLcvi6Jcv1PM5I-q2XaynJA_RoFH4LNb9KCKa6L4xSiHeqtQjEh4MM_aAXm1I2VFbn6GKlfDYzJOQjAwai280GrID5emqvvty-Skt8vBumoZrOc2D6TQrlo',
            }
          : undefined,
      };

      const updatedChats = [newChat, ...chats];
      persistChats(updatedChats);

      const initialMsgs: Message[] = [
        {
          id: `m-init-${Date.now()}`,
          sender: 'other',
          text: `¡Hola! Gracias por comunicarte con ${storeParam} en Promexa. Con gusto te ayudamos con tu pedido de ${productParam || 'nuestros productos'}.`,
          time: 'Ahora',
        },
      ];

      const updatedMap = { ...messagesMap, [newChatId]: initialMsgs };
      persistMessages(updatedMap);

      setSelectedChatId(newChatId);
      setMobileView('chat');
      if (productParam) {
        setInputText(`Hola, me gustaría coordinar la compra de "${productParam}". ¿Tienen delivery hoy?`);
      }
      showToast(`Conversación iniciada con ${storeParam}`);
    }
  }, [searchParams]);

  // Conversación activa y mensajes
  const selectedChat = useMemo(() => {
    return chats.find((c) => c.id === selectedChatId) || chats[0] || INITIAL_CHATS[0];
  }, [chats, selectedChatId]);

  const currentMessages = useMemo(() => {
    return messagesMap[selectedChatId] || [];
  }, [messagesMap, selectedChatId]);

  // Auto-scroll al final en nuevos mensajes
  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, isTyping]);

  // Al seleccionar un chat, marcar como leído y cambiar sala WS
  const handleSelectChat = (chatId: string) => {
    switchRoom(chatId);
    setSelectedChatId(chatId);
    setMobileView('chat');
    setRemoteTypingName(null);

    // Marcar como leído
    const updatedChats = chats.map((c) =>
      c.id === chatId ? { ...c, unreadCount: undefined } : c
    );
    persistChats(updatedChats);
  };

  // Enviar mensaje: primero por WebSocket, luego simula bot si el backend está offline
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    const currentTimeStr = `${hours}:${minutes} ${ampm}`;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'me',
      text,
      time: currentTimeStr,
      status: 'sent',
    };

    const updatedMsgs = [...currentMessages, newMsg];
    const updatedMap = { ...messagesMap, [selectedChatId]: updatedMsgs };
    persistMessages(updatedMap);

    // Actualizar último mensaje en la lista de chats
    const updatedChats = chats.map((c) =>
      c.id === selectedChatId ? { ...c, lastMessage: text, time: currentTimeStr } : c
    );
    persistChats(updatedChats);

    setInputText('');

    // Intentar enviar por WebSocket
    const sentViaWs = wsSend(text, currentTimeStr);

    // Si no hay WS disponible → simular respuesta del bot comerciante
    if (!sentViaWs) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);

        const lower = text.toLowerCase();
        let replyText = `¡Excelente! Te preparo el pedido ahora mismo. ¿En qué distrito te encuentras para calcular el tiempo de entrega?`;

        if (lower.includes('yape') || lower.includes('plin') || lower.includes('pago') || lower.includes('transferencia')) {
          replyText = `¡Claro que sí! Aceptamos Yape, Plin y transferencia bancaria inmediata (BCP, BBVA, Interbank). También puedes pagar contra entrega en efectivo.`;
        } else if (lower.includes('envío') || lower.includes('delivery') || lower.includes('costo') || lower.includes('cuanto')) {
          replyText = `Realizamos envíos el mismo día a distritos céntricos (Miraflores, San Isidro, Surco, etc.) por S/ 8 a S/ 10. Si coordinamos antes de las 5 PM te llega hoy mismo.`;
        } else if (lower.includes('oferta') || lower.includes('descuento') || lower.includes('precio')) {
          replyText = `¡Trato hecho! Por ser miembro activo de la comunidad Promexa aceptamos tu oferta. Déjanos tus datos de contacto y coordinamos el despacho.`;
        } else if (lower.includes('stock') || lower.includes('disponible') || lower.includes('tienen')) {
          replyText = `¡Sí, confirmado! Tenemos stock disponible para entrega inmediata garantizada.`;
        } else if (lower.includes('gracias') || lower.includes('perfecto') || lower.includes('bueno')) {
          replyText = `¡A ti! Es un gusto atenderte por Promexa. Quedamos a tu entera disposición para cualquier otra consulta.`;
        }

        const replyMsg: Message = {
          id: `msg-reply-${Date.now()}`,
          sender: 'other',
          text: replyText,
          time: currentTimeStr,
        };

        const withReply = [...updatedMsgs, replyMsg];
        persistMessages({ ...updatedMap, [selectedChatId]: withReply });

        const finalChats = updatedChats.map((c) =>
          c.id === selectedChatId ? { ...c, lastMessage: replyText, time: currentTimeStr } : c
        );
        persistChats(finalChats);
      }, 1400);
    }
  };

  // Emitir estado de escritura al servidor WS
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    sendTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTyping(false), 1500);
  };

  // Iniciar conversación desde el directorio
  const handleStartChatFromDirectory = (contact: (typeof DIRECTORY_CONTACTS)[0]) => {
    const existing = chats.find((c) => c.name.toLowerCase() === contact.name.toLowerCase());
    if (existing) {
      setSelectedChatId(existing.id);
    } else {
      const newId = `chat-dir-${Date.now()}`;
      const newChat: Chat = {
        id: newId,
        name: contact.name,
        avatar: contact.avatar,
        isVerified: contact.isVerified,
        status: 'online',
        lastMessage: 'Conversación iniciada',
        time: 'Ahora',
        tag: contact.category,
        tagType: 'category',
        phone: contact.phone,
      };
      const updated = [newChat, ...chats];
      persistChats(updated);
      persistMessages({
        ...messagesMap,
        [newId]: [
          {
            id: `msg-welcome-${Date.now()}`,
            sender: 'other',
            text: `¡Hola! Gracias por escribir a ${contact.name}. Cuéntanos en qué producto o servicio estás interesado hoy.`,
            time: 'Ahora',
          },
        ],
      });
      setSelectedChatId(newId);
    }

    setIsNewChatModalOpen(false);
    setMobileView('chat');
    showToast(`Chat abierto con ${contact.name}`);
  };

  // Vaciar conversación
  const handleClearCurrentChat = () => {
    if (confirm(`¿Deseas vaciar los mensajes de la conversación con ${selectedChat.name}?`)) {
      const updatedMap = { ...messagesMap, [selectedChatId]: [] };
      persistMessages(updatedMap);
      showToast('Mensajes eliminados de la conversación');
    }
  };

  // Chats filtrados
  const filteredChats = useMemo(() => {
    return chats.filter((c) => {
      if (tabFilter === 'unread' && !c.unreadCount) return false;
      if (tabFilter === 'marketplace' && c.tagType !== 'product') return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchLast = c.lastMessage.toLowerCase().includes(q);
        const matchTag = (c.tag || '').toLowerCase().includes(q);
        if (!matchName && !matchLast && !matchTag) return false;
      }
      return true;
    });
  }, [chats, tabFilter, searchFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-on-surface text-surface px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-fadeIn border border-outline-variant/30 text-body-md font-body-md">
          <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="w-full bg-surface-container-low/60 rounded-xl shadow-sm p-2 sm:p-3 border border-surface-container/60">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[720px] max-h-[840px] h-[calc(100vh-140px)]">
          {/* ========================================================================= */}
          {/* PANEL IZQUIERDO: BANDEJA DE MENSAJES (4 cols) */}
          {/* ========================================================================= */}
          <section
            aria-label="Bandeja de chats"
            className={`lg:col-span-4 xl:col-span-4 flex flex-col bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-surface-container/60 ${
              mobileView === 'chat' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Cabecera */}
            <div className="p-4 bg-surface-container-lowest border-b border-surface-container">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold text-[20px]">
                    Mensajes
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold transition-colors ${
                      wsConnected
                        ? 'bg-[#DCFCE7] text-[#16A34A]'
                        : 'bg-surface-container text-outline'
                    }`}
                    title={wsConnected ? 'WebSocket conectado al servidor' : 'Sin WebSocket — modo local activo'}
                  >
                    <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-[#16A34A] animate-pulse' : 'bg-outline'}`} />
                    <span>{wsConnected ? 'WebSocket' : 'Offline'}</span>
                  </span>
                </div>
                <button
                  className="w-9 h-9 rounded-lg text-outline hover:text-primary hover:bg-surface-container transition-colors flex items-center justify-center cursor-pointer"
                  title="Nueva conversación"
                  type="button"
                  onClick={() => setIsNewChatModalOpen(true)}
                >
                  <span className="material-symbols-outlined text-[20px]">edit_square</span>
                </button>
              </div>

              {/* Buscador de conversaciones */}
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                  search
                </span>
                <input
                  className="w-full h-10 pl-9 pr-8 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary-container transition-all"
                  placeholder="Buscar conversaciones o tiendas..."
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>

              {/* Filtros Rápidos */}
              <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 no-scrollbar">
                <button
                  className={`px-3 py-1 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-colors cursor-pointer ${
                    tabFilter === 'all'
                      ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                  type="button"
                  onClick={() => setTabFilter('all')}
                >
                  Todos ({chats.length})
                </button>
                <button
                  className={`px-3 py-1 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                    tabFilter === 'unread'
                      ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                  type="button"
                  onClick={() => setTabFilter('unread')}
                >
                  <span>No leídos</span>
                  {chats.filter((c) => c.unreadCount).length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white font-caption text-caption flex items-center justify-center leading-none">
                      {chats.filter((c) => c.unreadCount).length}
                    </span>
                  )}
                </button>
                <button
                  className={`px-3 py-1 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                    tabFilter === 'marketplace'
                      ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                  type="button"
                  onClick={() => setTabFilter('marketplace')}
                >
                  <span className="material-symbols-outlined text-[14px]">storefront</span>
                  <span>Ventas & Pedidos</span>
                </button>
              </div>
            </div>

            {/* Lista de Conversaciones */}
            <div className="flex-1 overflow-y-auto divide-y divide-surface-container-high/40">
              {filteredChats.length === 0 ? (
                <div className="p-8 text-center text-outline space-y-2">
                  <span className="material-symbols-outlined text-[36px]">forum</span>
                  <p className="font-body-md text-body-md">No se encontraron conversaciones</p>
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const isActive = chat.id === selectedChatId;
                  return (
                    <article
                      key={chat.id}
                      className={`p-3.5 cursor-pointer transition-all relative flex items-start gap-3 group ${
                        isActive
                          ? 'bg-surface-container-high/60 border-l-4 border-primary'
                          : 'hover:bg-surface-container-low'
                      }`}
                      onClick={() => handleSelectChat(chat.id)}
                    >
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-variant flex items-center justify-center shadow-sm">
                          <img
                            alt={chat.name}
                            className="w-full h-full object-cover"
                            src={chat.avatar}
                          />
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-surface-container-lowest ${
                            chat.status === 'online'
                              ? 'bg-[#16A34A]'
                              : chat.status === 'reconnecting'
                              ? 'bg-[#D97706] animate-pulse'
                              : 'bg-[#9CA3AF]'
                          }`}
                          title={chat.status}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1 min-w-0 pr-1">
                            <h3 className="font-body-md-medium text-body-md-medium text-on-surface truncate font-semibold">
                              {chat.name}
                            </h3>
                            {chat.isVerified && (
                              <span
                                className="material-symbols-outlined text-primary-container text-[16px] shrink-0"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                                title="Negocio Verificado"
                              >
                                verified
                              </span>
                            )}
                          </div>
                          <span className="font-caption text-caption text-primary-container font-semibold whitespace-nowrap">
                            {chat.time}
                          </span>
                        </div>

                        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-1 mb-1">
                          {chat.lastMessage}
                        </p>

                        <div className="flex items-center justify-between">
                          {chat.tag ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-caption text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium truncate max-w-[170px]">
                              {chat.tagType === 'product' && (
                                <span className="material-symbols-outlined text-[13px]">
                                  shopping_bag
                                </span>
                              )}
                              <span>{chat.tag}</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-outline text-[14px]">
                                done_all
                              </span>
                              <span className="font-caption text-caption text-outline">Entregado</span>
                            </div>
                          )}

                          {chat.unreadCount && (
                            <span className="w-5 h-5 rounded-full bg-red-500 text-white font-caption text-caption flex items-center justify-center font-bold">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {/* Banner Inferior */}
            <div className="p-3 bg-surface-container-low flex items-center justify-between text-outline text-caption font-caption border-t border-surface-container">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">lock</span>
                <span>Mensajería directa segura Promexa</span>
              </div>
              <button
                className="hover:text-primary transition-colors text-label-sm font-label-sm cursor-pointer"
                type="button"
                onClick={() => setIsNewChatModalOpen(true)}
              >
                + Nuevo
              </button>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* PANEL DERECHO: CONVERSACIÓN ACTIVA (8 cols) */}
          {/* ========================================================================= */}
          <section
            aria-label="Conversación actual"
            className={`lg:col-span-8 xl:col-span-8 flex flex-col bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden relative border border-surface-container/60 ${
              mobileView === 'list' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Cabecera del Chat Activo */}
            <div className="p-3.5 sm:p-4 bg-surface-container-lowest flex items-center justify-between shadow-sm z-10 border-b border-surface-container">
              <div className="flex items-center gap-3 min-w-0">
                {/* Botón Volver en móvil */}
                <button
                  type="button"
                  className="lg:hidden w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline cursor-pointer"
                  onClick={() => setMobileView('list')}
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>

                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-surface-variant shadow-sm">
                    <img
                      alt={selectedChat.name}
                      className="w-full h-full object-cover"
                      src={selectedChat.avatar}
                    />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#16A34A] rounded-full ring-2 ring-surface-container-lowest" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface truncate font-bold text-[18px]">
                      {selectedChat.name}
                    </h2>
                    {selectedChat.isVerified && (
                      <span
                        className="material-symbols-outlined text-primary-container text-[18px] shrink-0"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                        title="Negocio Verificado Promexa"
                      >
                        verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center gap-1 text-[12px] font-label-sm text-[#16A34A] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                      En línea
                    </span>
                    <span className="text-outline text-caption">•</span>
                    <span className="font-caption text-caption text-outline truncate">
                      {selectedChat.phone || 'Responde en menos de 15 min'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Acciones de Cabecera */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <Link
                  href="/marketplace"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-primary font-label-md text-label-md hover:bg-surface-container-high transition-colors shadow-sm font-medium"
                >
                  <span className="material-symbols-outlined text-[16px]">storefront</span>
                  <span>Ver en Marketplace</span>
                </Link>
                {selectedChat.phone && (
                  <a
                    href={`https://wa.me/${selectedChat.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-lg hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors text-green-600"
                    title="Abrir WhatsApp"
                  >
                    <span className="material-symbols-outlined text-[20px]">chat</span>
                  </a>
                )}
                <button
                  className="w-9 h-9 rounded-lg hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
                  title="Vaciar mensajes"
                  type="button"
                  onClick={handleClearCurrentChat}
                >
                  <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
                </button>
              </div>
            </div>

            {/* Banner de Contexto de Producto Vinculado */}
            {selectedChat.linkedProduct && (
              <div className="bg-surface-container-low p-3 mx-4 my-2.5 rounded-xl shadow-sm flex flex-col gap-2 border border-surface-container">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface-variant shrink-0 shadow-sm">
                      <img
                        alt={selectedChat.linkedProduct.name}
                        className="w-full h-full object-cover"
                        src={selectedChat.linkedProduct.image}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-caption text-caption font-medium uppercase tracking-wider text-outline">
                          Marketplace Promexa
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] font-label-sm text-label-sm font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                          {selectedChat.linkedProduct.status}
                        </span>
                      </div>
                      <h4 className="font-body-md-medium text-body-md-medium text-on-surface font-semibold truncate">
                        {selectedChat.linkedProduct.name}
                      </h4>
                      <div className="flex items-baseline gap-2">
                        <span className="font-headline-sm text-headline-sm font-bold text-primary text-[17px]">
                          S/ {selectedChat.linkedProduct.price.toFixed(2)}
                        </span>
                        <span className="font-caption text-caption text-outline">
                          Precio directo
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-auto shrink-0">
                    <Link
                      href="/marketplace"
                      className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-primary hover:bg-surface-container text-label-sm font-label-sm font-medium transition-colors shadow-sm flex items-center gap-1 border border-surface-container"
                    >
                      <span>Ver producto</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </Link>
                    <button
                      className="px-3.5 py-1.5 rounded-lg bg-[#F28C28] hover:bg-[#e07b1b] text-on-primary text-label-sm font-label-sm font-semibold transition-colors shadow-sm flex items-center gap-1 cursor-pointer"
                      type="button"
                      onClick={() =>
                        handleSendMessage(
                          `Hola, ¿podrías considerar una oferta de S/ ${(
                            selectedChat.linkedProduct!.price * 0.9
                          ).toFixed(2)} por ${selectedChat.linkedProduct!.name}?`
                        )
                      }
                    >
                      <span className="material-symbols-outlined text-[16px]">handshake</span>
                      <span>Hacer oferta (-10%)</span>
                    </button>
                  </div>
                </div>

                {/* Banner Informativo */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container text-on-surface-variant text-caption font-caption">
                  <span className="material-symbols-outlined text-[#F28C28] text-[16px] shrink-0">
                    info
                  </span>
                  <p className="truncate sm:whitespace-normal">
                    Promexa no cobra comisiones en este chat. Coordina entrega, boleta/factura y pagos de forma directa y segura.
                  </p>
                </div>
              </div>
            )}

            {/* Listado de Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-center my-3">
                <span className="px-3 py-1 rounded-full bg-surface-container text-outline font-label-sm text-label-sm shadow-sm">
                  Conversación activa con {selectedChat.name}
                </span>
              </div>

              {currentMessages.length === 0 ? (
                <div className="py-12 text-center text-outline space-y-2">
                  <span className="material-symbols-outlined text-[40px]">chat</span>
                  <p className="font-body-md text-body-md">
                    Inicia la conversación escribiendo tu primer mensaje abajo.
                  </p>
                </div>
              ) : (
                currentMessages.map((msg) => {
                  const isMe = msg.sender === 'me';
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isMe ? 'flex-col items-end ml-auto' : 'items-end gap-2'
                      } max-w-[85%] sm:max-w-[70%] animate-fadeIn`}
                    >
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-surface-variant shrink-0 mb-1">
                          <img
                            alt="Avatar"
                            className="w-full h-full object-cover"
                            src={selectedChat.avatar}
                          />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <div
                          className={`p-3.5 rounded-2xl shadow-sm leading-relaxed font-body-md text-body-md ${
                            isMe
                              ? 'rounded-br-sm bg-primary-container text-on-primary'
                              : 'rounded-bl-sm bg-surface-container text-on-surface'
                          }`}
                        >
                          <p>{msg.text}</p>
                        </div>
                        <div
                          className={`flex items-center gap-1 mt-1 ${
                            isMe ? 'self-end mr-1' : 'ml-1'
                          }`}
                        >
                          <span className="font-caption text-caption text-outline">{msg.time}</span>
                          {isMe && (
                            <span
                              className="material-symbols-outlined text-primary-container text-[16px]"
                              title="Leído"
                            >
                              done_all
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Indicador de "Escribiendo..." - bot local o usuario real via WS */}
              {(isTyping || remoteTypingName) && (
                <div className="flex items-center gap-2 pt-1 animate-fadeIn">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-surface-variant shrink-0">
                    <img
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      src={selectedChat.avatar}
                    />
                  </div>
                  <div className="px-3.5 py-2 rounded-full bg-surface-container text-on-surface-variant flex items-center gap-2 shadow-sm">
                    <span className="font-caption text-caption font-medium text-outline">
                      {remoteTypingName || selectedChat.name} está escribiendo
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Barra de Entrada de Texto */}
            <div className="p-3 sm:p-4 bg-surface-container-lowest shadow-sm z-10 border-t border-surface-container">
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
              >
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="w-9 h-9 rounded-lg text-outline hover:text-primary hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer"
                    title="Adjuntar comprobante o pedido"
                    type="button"
                    onClick={() => {
                      setInputText((prev) => prev ? `${prev} [Comprobante adjunto]` : 'Adjunto comprobante de pago para coordinar la entrega');
                      showToast('Comprobante simulado adjuntado al mensaje');
                    }}
                  >
                    <span className="material-symbols-outlined text-[20px]">attach_file</span>
                  </button>
                </div>

                <div className="relative flex-1">
                  <input
                    autoComplete="off"
                    className="w-full h-11 px-4 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/40 transition-all border border-surface-container"
                    placeholder={`Escribe un mensaje para ${selectedChat.name}...`}
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                  />
                </div>

                <button
                  className="h-11 px-4 sm:px-5 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-body-md-medium text-body-md-medium flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all shrink-0 active:scale-95 cursor-pointer font-semibold"
                  title="Enviar mensaje"
                  type="submit"
                >
                  <span className="hidden sm:inline">Enviar</span>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </form>

              {/* Atajos Rápidos Contextuales */}
              <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-0.5 no-scrollbar">
                <span className="font-caption text-caption text-outline shrink-0 font-medium">
                  Respuestas rápidas:
                </span>
                <button
                  className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant hover:bg-surface-container-high text-caption font-caption whitespace-nowrap transition-colors cursor-pointer"
                  type="button"
                  onClick={() => setInputText('¿Aceptan transferencia bancaria o Yape?')}
                >
                  ¿Aceptan Yape / Transferencia?
                </button>
                <button
                  className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant hover:bg-surface-container-high text-caption font-caption whitespace-nowrap transition-colors cursor-pointer"
                  type="button"
                  onClick={() => setInputText('¿Cuánto es el costo de envío a mi distrito?')}
                >
                  ¿Costo de envío a mi zona?
                </button>
                <button
                  className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant hover:bg-surface-container-high text-caption font-caption whitespace-nowrap transition-colors cursor-pointer"
                  type="button"
                  onClick={() => setInputText('¡Perfecto! Confirmo mi pedido para hoy.')}
                >
                  ¡Confirmo mi pedido!
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: NUEVA CONVERSACIÓN / DIRECTORIO COMERCIAL */}
      {/* ========================================================================= */}
      {isNewChatModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={() => setIsNewChatModalOpen(false)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl w-full max-w-lg shadow-2xl border border-surface-container p-6 space-y-4 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">contact_mail</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold text-[18px]">
                  Iniciar nueva conversación
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="font-body-md text-body-md text-on-surface-variant">
              Selecciona un comercio verificado o usuario de la red Promexa para iniciar un chat directo:
            </p>

            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {DIRECTORY_CONTACTS.map((contact) => (
                <div
                  key={contact.name}
                  onClick={() => handleStartChatFromDirectory(contact)}
                  className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-between gap-3 cursor-pointer transition-colors border border-surface-container"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-body-md-medium text-body-md-medium text-on-surface font-semibold">
                          {contact.name}
                        </span>
                        {contact.isVerified && (
                          <span className="material-symbols-outlined text-primary text-[15px]">
                            verified
                          </span>
                        )}
                      </div>
                      <span className="font-caption text-caption text-outline">
                        {contact.category}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-sm font-label-sm font-semibold hover:bg-primary-container"
                  >
                    Chatear
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-surface-container text-right">
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(false)}
                className="px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container font-label-md text-label-md"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MensajesPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-center text-outline">
          <span className="material-symbols-outlined text-[36px] animate-spin">refresh</span>
          <p className="font-body-md text-body-md mt-2">Cargando tus mensajes...</p>
        </div>
      }
    >
      <MensajesContent />
    </Suspense>
  );
}
