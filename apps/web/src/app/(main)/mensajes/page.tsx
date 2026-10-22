'use client';
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PresenceDot, { presenceLabel } from '@/components/profile/PresenceDot';
import { useAuth } from '@/lib/auth-context';
import { ChatMessage, useChatSocket, usePresence } from '@/lib/use-chat-socket';
interface ProductInquiry { id: string; name: string; image: string; sellerId: string; store: string; sellerAvatar?: string | null; isVerified: boolean }
interface Friend { id: string; name: string; avatar: string | null; isVerified: boolean }
function Avatar({ friend }: { friend: Friend }) {
  return friend.avatar ? <img src={friend.avatar} alt={friend.name} className="w-10 h-10 rounded-full object-cover" />
    : <span className="material-symbols-outlined w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">person</span>;
}
function MensajesContent() {
  const { user, token } = useAuth();
  const params = useSearchParams();
  const [savedContacts, setFriends] = useState<Friend[]>([]);
  const [productContext, setProductContext] = useState<ProductInquiry | null>(null);
  const [draftProduct, setDraftProduct] = useState<ProductInquiry | null>(null);
  const preparedInquiry = useRef('');
  const friends = productContext && !savedContacts.some(contact => contact.id === productContext.sellerId)
    ? [...savedContacts, { id: productContext.sellerId, name: productContext.store,
      avatar: productContext.sellerAvatar || null, isVerified: productContext.isVerified }]
    : savedContacts;
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncError, setSyncError] = useState('');
  const [contactsError, setContactsError] = useState('');
  const sendingRef = useRef(false);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [typingId, setTypingId] = useState('');
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const endRef = useRef<HTMLDivElement>(null);
  const handledTarget = useRef('');
  const append = (message: ChatMessage) => setMessages(previous =>
    previous.some(item => item.id === message.id) ? previous : [...previous, message].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)));
  const { connected, sendMessage, sendTyping } = useChatSocket({ token, onMessage: append,
    onTyping: (id, typing) => {
      setTypingId(typing ? id : '');
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (typing) typingTimer.current = setTimeout(() => setTypingId(''), 3000);
    },
  });
  const presence = usePresence([...friends.map(friend => friend.id), user?.id], productContext?.id);
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
          const merged = new Map(history.map(message => [message.id, message]));
          previous.forEach(message => merged.set(message.id, message));
          return Array.from(merged.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
        });
      } catch {
        if (active) setSyncError('No se pudo recuperar el historial. Reintentando...');
      }
    };
    loadHistory();
    const interval = setInterval(loadHistory, 10000);
    return () => { active = false; clearInterval(interval); };
  }, [token, connected]);
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
    const target = params.get('userId');
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
  const currentMessages = messages.filter(message =>
    (message.senderId === user?.id && message.recipientId === selectedId) ||
    (message.senderId === selectedId && message.recipientId === user?.id));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !text.trim() || sendingRef.current) return;
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
        {friends.filter(friend => friend.name.toLowerCase().includes(search.toLowerCase())).map(friend => {
          const last = messages.filter(m => m.senderId === friend.id || m.recipientId === friend.id).at(-1);
          return <button key={friend.id} disabled={sending} onClick={() => setSelectedId(friend.id)} className={`w-full flex items-center gap-3 text-left p-3 rounded-lg ${selectedId === friend.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
            <div className="relative shrink-0"><Avatar friend={friend} /><PresenceDot online={presence[friend.id]} className="absolute bottom-0 right-0 w-3 h-3 ring-2 ring-white" /></div><span className="min-w-0"><span className="block font-medium truncate">{friend.name}</span><span className="block text-sm text-gray-500 truncate">{last?.text || 'Iniciar conversacion'}</span></span>
          </button>;
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
          <form onSubmit={submit} className="border-t p-4 flex gap-2">
            <textarea disabled={sending} rows={3} aria-label="Mensaje" maxLength={5000} value={text} placeholder="Escribe un mensaje..." onChange={e => { setText(e.target.value); sendTyping(selected.id, !!e.target.value.trim()); }} className="border rounded-lg p-3 flex-1 min-w-0" />
            <button disabled={!connected || sending || !text.trim()} className="bg-blue-700 text-white rounded-lg px-4 disabled:opacity-50">{sending ? 'Enviando...' : 'Enviar'}</button>
          </form>
        </> : <p className="m-auto p-8 text-gray-500">{missingTarget ? 'Este contacto no tiene una conversacion contigo. Abre su producto desde el marketplace.' : 'Selecciona un contacto para conversar.'}</p>}
      </section>
    </div>
    <p className="text-xs text-gray-500 mt-3">El historial se guarda en tu cuenta. Tu amigo puede leer los mensajes cuando vuelva a conectarse.</p>
  </div>;
}
export default function MensajesPage() {
  return <Suspense fallback={<p className="p-6">Cargando mensajes...</p>}><MensajesContent /></Suspense>;
}
