'use client';
import React, { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PresenceDot, { presenceLabel } from '@/components/profile/PresenceDot';
import { useAuth } from '@/lib/auth-context';
import { ChatMessage, useChatSocket, usePresence } from '@/lib/use-chat-socket';
interface ProductInquiry { id: string; name: string; image: string; sellerId: string; store: string; sellerAvatar?: string | null; isVerified: boolean }
interface Friend { id: string; name: string; avatar: string | null; isVerified: boolean; canMessage?: boolean }
function Avatar({ friend }: { friend: Friend }) {
  return friend.avatar ? <img src={friend.avatar} alt={friend.name} className="w-10 h-10 rounded-full object-cover" />
    : <span className="material-symbols-outlined w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">person</span>;
}
function MensajesContent() {
  const { user, token } = useAuth();
  const params = useSearchParams();
  const [savedContacts, setFriends] = useState<Friend[]>([]);
  const [targetContact, setTargetContact] = useState<Friend | null>(null);
  const [productContext, setProductContext] = useState<ProductInquiry | null>(null);
  const [draftProduct, setDraftProduct] = useState<ProductInquiry | null>(null);
  const preparedInquiry = useRef('');
  const contactsWithTarget = targetContact && !savedContacts.some(contact => contact.id === targetContact.id)
    ? [...savedContacts, targetContact] : savedContacts;
  const friends = productContext && user?.profileType !== 'business' && !contactsWithTarget.some(contact => contact.id === productContext.sellerId)
    ? [...contactsWithTarget, { id: productContext.sellerId, name: productContext.store,
      avatar: productContext.sellerAvatar || null, isVerified: productContext.isVerified, canMessage: true }]
    : contactsWithTarget;
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncError, setSyncError] = useState('');
  const [contactsError, setContactsError] = useState('');
  const sendingRef = useRef(false);
  const [text, setText] = useState('');
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [typingId, setTypingId] = useState('');
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const endRef = useRef<HTMLDivElement>(null);
  const handledTarget = useRef('');
  useEffect(() => {
    const target = params.get('userId') || params.get('to');
    setTargetContact(null);
    if (!token || !target) return;
    let active = true;
    fetch(`/api/users/${encodeURIComponent(target)}/profile`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    }).then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (active && data.relationship.canMessage) {
        setTargetContact({ ...data.user, canMessage: true }); setSelectedId(data.user.id);
      }
    }).catch(() => { if (active) setError('No se pudo verificar este contacto.'); });
    return () => { active = false; };
  }, [params, token]);
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const append = (message: ChatMessage) => {
    const isCurrentChat = selectedIdRef.current === message.senderId;
    const msgWithRead: ChatMessage = {
      ...message,
      read: message.read ?? (isCurrentChat || message.senderId === user?.id),
    };
    if (isCurrentChat && token && message.recipientId === user?.id) {
      window.dispatchEvent(new CustomEvent('promexa:chat-read'));
      fetch(`/api/chat/read/${message.senderId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).then(() => {
        window.dispatchEvent(new CustomEvent('promexa:chat-read'));
      }).catch(() => {});
    }
    setMessages(previous => {
      const exists = previous.some(item => item.id === message.id);
      if (exists) {
        return previous.map(item => item.id === message.id ? msgWithRead : item);
      }
      return [...previous, msgWithRead].sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
      );
    });
  };

  const { connected, sendMessage, sendTyping } = useChatSocket({ token, onMessage: append,
    onTyping: (id, typing) => {
      setTypingId(typing ? id : '');
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (typing) typingTimer.current = setTimeout(() => setTypingId(''), 3000);
    },
  });
  const presence = usePresence([...friends.map(friend => friend.id), user?.id], productContext?.id);

  // Mark messages as read when opening a conversation
  useEffect(() => {
    if (!selectedId || !token || !user?.id) return;
    setMessages(prev =>
      prev.map(m =>
        m.senderId === selectedId && m.recipientId === user.id && !m.read
          ? { ...m, read: true }
          : m
      )
    );
    window.dispatchEvent(new CustomEvent('promexa:chat-read'));
    fetch(`/api/chat/read/${selectedId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).then(() => {
      window.dispatchEvent(new CustomEvent('promexa:chat-read'));
    }).catch(() => {});
  }, [selectedId, token, user?.id]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const loadHistory = async () => {
      try {
        const res = await fetch('/api/chat/messages', {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error('History unavailable');
        const history: ChatMessage[] = await res.json();
        if (active) setSyncError('');
        if (active) setMessages(previous => {
          const merged = new Map(history.map(message => {
            const isCurrentChat = selectedIdRef.current === message.senderId;
            return [
              message.id,
              isCurrentChat && message.recipientId === user?.id
                ? { ...message, read: true }
                : message,
            ];
          }));
          previous.forEach(message => {
            if (!merged.has(message.id)) merged.set(message.id, message);
          });
          return Array.from(merged.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
        });
      } catch {
        if (active) setSyncError('No se pudo recuperar el historial. Reintentando...');
      }
    };
    loadHistory();
    const interval = setInterval(loadHistory, 10000);
    return () => { active = false; clearInterval(interval); };
  }, [token, connected, user?.id]);
  useEffect(() => {
    if (!token) return;
    let active = true;
    const loadFriends = async () => {
      try {
        const res = await fetch('/api/chat/contacts', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error('No se pudieron cargar tus amigos');
        const data: Friend[] = await res.json();
        if (active) { setFriends(data); setContactsError(''); }
      } catch { if (active) setContactsError('No se pudieron cargar los contactos. Reintentando...'); }
      finally { if (active) setLoading(false); }
    };
    loadFriends();
    const interval = setInterval(loadFriends, 10000);
    return () => { active = false; clearInterval(interval); };
  }, [token]);
  useEffect(() => {
    const productId = params.get('productId');
    if (!token || !productId) { setProductContext(null); return; }
    let active = true;
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    fetch(`${base}/marketplace/products/${encodeURIComponent(productId)}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(8000),
    }).then(async response => {
      if (!response.ok) throw new Error();
      const product: ProductInquiry = await response.json();
      if (product.sellerId === user?.id || (params.get('userId') && params.get('userId') !== product.sellerId)) throw new Error();
      if (active) { setProductContext(product); setSelectedId(product.sellerId); }
    }).catch(() => { if (active) { setProductContext(null); setError('No se pudo cargar el producto o su vendedor.'); } });
    return () => { active = false; };
  }, [params, token, user?.id]);
  useEffect(() => {
    const target = params.get('userId') || params.get('to');
    // Compatibility with existing feed links; never fall back to a different person.
    const name = params.get('user') || params.get('name') || params.get('store');
    const key = target || name || '';
    if (handledTarget.current === key) return;
    const match = target ? friends.find(friend => friend.id === target)
      : name ? friends.find(friend => friend.name === name) : undefined;
    if (match) { setSelectedId(match.id); handledTarget.current = key; }
  }, [params, friends]);
  useEffect(() => { setText(''); setDraftProduct(null); setTypingId(''); }, [selectedId]);
  useEffect(() => {
    if (!productContext || selectedId !== productContext.sellerId) return;
    const key = `${selectedId}:${productContext.id}`;
    if (preparedInquiry.current === key) return;
    preparedInquiry.current = key;
    setText(`Hola, estoy interesado en este producto "${productContext.name}". ¿Aún sigue disponible?`);
    setDraftProduct(productContext);
  }, [selectedId, productContext]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, selectedId]);
  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current); }, []);
  const selected = friends.find(friend => friend.id === selectedId);
  useLayoutEffect(() => {
    const input = messageInputRef.current;
    if (!input) return;
    const resize = () => {
      input.style.height = 'auto';
      const height = input.scrollHeight + 2;
      input.style.height = `${Math.min(height, 160)}px`;
      input.style.overflowY = height > 160 ? 'auto' : 'hidden';
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [text, selected?.id]);
  const currentMessages = messages.filter(message =>
    (message.senderId === user?.id && message.recipientId === selectedId) ||
    (message.senderId === selectedId && message.recipientId === user?.id));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || selected.canMessage === false || !connected || !text.trim() || sendingRef.current) return;
    sendingRef.current = true;
    const recipientId = selected.id;
    setSending(true); setError('');
    try {
      const message = await sendMessage(recipientId, text.trim(), draftProduct?.id);
      append(message); setText(''); setDraftProduct(null); sendTyping(recipientId, false);
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo enviar. El borrador se conserva.'); }
    finally { sendingRef.current = false; setSending(false); }
  };
  const missingTarget = !loading && (params.get('userId') || params.get('user') || params.get('store')) && !selected;
  return <div className="max-w-6xl mx-auto p-4">
    <h1 className="text-2xl font-bold mb-4">Mensajes</h1>
    {(error || syncError || contactsError) && <p role="alert" className="mb-3 text-red-700">{error || syncError || contactsError}</p>}
    {!connected && <p role="status" className="mb-3 text-amber-700">Sin conexion en tiempo real. Intentando reconectar; tus mensajes guardados se conservan.</p>}
    <div className="flex bg-white border rounded-xl overflow-hidden min-h-[65vh]">
      <aside className={`${selected ? 'hidden md:block' : ''} w-full md:w-80 md:shrink-0 border-r p-4`}>
        <h2 className="font-semibold mb-3">Conversaciones</h2>
        <input aria-label="Buscar contacto" placeholder="Buscar contacto..." value={search} onChange={e => setSearch(e.target.value)} className="border rounded-lg p-2 w-full mb-3" />
        {loading && <p>Cargando conversaciones...</p>}
        {!loading && !friends.length && <p className="text-gray-500">Aun no tienes conversaciones. Contacta a un amigo o a un vendedor del marketplace.</p>}
        {friends
          .filter(friend => friend.name.toLowerCase().includes(search.toLowerCase()))
          .sort((a, b) => {
            const lastA = messages.filter(m => m.senderId === a.id || m.recipientId === a.id).at(-1);
            const lastB = messages.filter(m => m.senderId === b.id || m.recipientId === b.id).at(-1);
            if (!lastA && !lastB) return 0;
            if (!lastA) return 1;
            if (!lastB) return -1;
            return lastB.createdAt.localeCompare(lastA.createdAt);
          })
          .map(friend => {
            const friendMessages = messages.filter(m => m.senderId === friend.id || m.recipientId === friend.id);
            const last = friendMessages.at(-1);
            const isMe = last?.senderId === user?.id;
            const unreadCount = messages.filter(
              m => m.senderId === friend.id && m.recipientId === user?.id && !m.read
            ).length;

            const previewText = last
              ? (isMe ? `Tú: ${last.text}` : last.text)
              : 'Iniciar conversación';

            return (
              <button
                key={friend.id}
                disabled={sending}
                onClick={() => setSelectedId(friend.id)}
                className={`w-full flex items-center gap-3 text-left p-3 rounded-xl transition-all ${
                  selectedId === friend.id
                    ? 'bg-blue-50/90 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar friend={friend} />
                  <PresenceDot online={presence[friend.id]} className="absolute bottom-0 right-0 w-3 h-3 ring-2 ring-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className={`block truncate ${unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                      {friend.name}
                    </span>
                    {last && (
                      <span className={`text-[10px] shrink-0 ${unreadCount > 0 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                        {new Date(last.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`block text-xs truncate flex-1 ${unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                      {previewText}
                    </span>
                    {unreadCount > 0 && (
                      <span
                        title={`${unreadCount} mensaje${unreadCount > 1 ? 's' : ''} no leído${unreadCount > 1 ? 's' : ''}`}
                        className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shadow-xs"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
      </aside>
      <section className={`${selected ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-w-0`}>
        {selected ? <>
          <header className="p-4 border-b flex items-center gap-3">
            <button aria-label="Volver a amigos" onClick={() => setSelectedId('')} className="md:hidden">Volver</button>
            <div className="relative"><Avatar friend={selected} /><PresenceDot online={presence[selected.id]} className="absolute bottom-0 right-0 w-3 h-3 ring-2 ring-white" /></div><div><h2 className="font-semibold">{selected.name}</h2><p className="text-sm text-gray-500">{connected ? presenceLabel(presence[selected.id]) : 'Estado no disponible: reconectando'}</p></div>
          </header>
          <div className="flex-1 overflow-y-auto max-h-[55vh] p-4 space-y-3">
            {!currentMessages.length && <p className="text-center text-gray-500">Aun no hay mensajes. Saluda a {selected.name}.</p>}
            {currentMessages.map(message => <div key={message.id} className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-2 ${message.senderId === user?.id ? 'bg-blue-100' : 'bg-gray-100'}`}>{message.productName && <div className="mb-2 rounded-lg border border-gray-200 bg-white p-2">
                {message.productImage && <img src={message.productImage} alt={message.productName} className="w-full max-w-xs max-h-60 object-contain rounded-lg" />}
                <p className="text-sm font-medium mt-1">{message.productName}</p>
              </div>}<p className="whitespace-pre-wrap break-words">{message.text}</p><time className="text-xs text-gray-500">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>
            </div>)}
            {typingId === selectedId && <p className="text-sm text-gray-500">{selected.name} esta escribiendo...</p>}
            <div ref={endRef} />
          </div>
          {draftProduct && <div className="mx-4 mt-3 rounded-lg border bg-gray-50 p-3 flex items-center gap-3">
            {draftProduct.image && <img src={draftProduct.image} alt={draftProduct.name} className="w-20 h-20 rounded-lg object-contain bg-white" />}
            <div className="min-w-0"><p className="text-xs text-gray-500">Producto adjunto al mensaje</p><p className="font-medium break-words">{draftProduct.name}</p></div>
          </div>}
          <form onSubmit={submit} className="border-t p-4 flex items-end gap-2">
            <textarea
              ref={messageInputRef}
              disabled={sending || selected.canMessage === false}
              rows={1}
              aria-label="Mensaje"
              maxLength={5000}
              value={text}
              placeholder={selected.canMessage === false ? 'Podras responder cuando esta persona te escriba.' : 'Escribe un mensaje...'}
              onChange={e => { setText(e.target.value); sendTyping(selected.id, !!e.target.value.trim()); }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (!e.repeat) e.currentTarget.form?.requestSubmit();
                }
              }}
              className="border rounded-lg px-3 py-2.5 leading-[22px] flex-1 min-w-0 min-h-11 max-h-40 resize-none overflow-y-hidden"
            />
            <button type="submit" disabled={selected.canMessage === false || !connected || sending || !text.trim()} className="bg-blue-700 text-white rounded-lg h-11 w-28 shrink-0 disabled:opacity-50">{sending ? 'Enviando...' : 'Enviar'}</button>
          </form>
        </> : <p className="m-auto p-8 text-gray-500">{missingTarget ? 'Este contacto no tiene una conversacion contigo. Abre su producto desde el marketplace.' : 'Selecciona un contacto para conversar.'}</p>}
      </section>
    </div>
    <p className="text-xs text-gray-500 mt-3">{user?.profileType === 'business' ? 'Puedes responder a las personas que ya te escribieron.' : 'El historial se guarda en tu cuenta. Puedes escribir a tus amigos y contactar negocios.'}</p>
  </div>;
}
export default function MensajesPage() {
  return <Suspense fallback={<p className="p-6">Cargando mensajes...</p>}><MensajesContent /></Suspense>;
}
