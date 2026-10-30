'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import UserAvatar from './UserAvatar';
import RelationshipActions from './RelationshipActions';

export default function BusinessConnections() {
  const { user, token } = useAuth();
  const business = user?.profileType === 'business';
  const [contacts, setContacts] = useState<{ id: string; name: string; avatar: string | null }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!token) return;
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/users/${business ? 'followers' : 'following'}`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (active) { setContacts(data); setError(''); }
      } catch { if (active) setError('No se pudo cargar la lista.'); }
      finally { if (active) setLoading(false); }
    };
    void load();
    const timer = setInterval(load, 10000);
    window.addEventListener('promexa:friendship-updated', load);
    return () => { active = false; clearInterval(timer); window.removeEventListener('promexa:friendship-updated', load); };
  }, [token, business]);
  return <section className="bg-white rounded-xl border border-outline-variant p-5 my-5 space-y-4">
    <h2 className="text-xl font-bold">{business ? 'Mis seguidores' : 'Negocios que sigues'} ({contacts.length})</h2>
    {business && <p className="text-sm text-outline">Las personas pueden seguir tu negocio. Puedes responderles cuando te escriban.</p>}
    {error && <p role="alert">{error}</p>}
    {loading ? <p>Cargando...</p> : !error && contacts.length === 0 && <p>{business ? 'Todavia no tienes seguidores.' : 'Todavia no sigues negocios.'}</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      {contacts.map(contact => <div key={contact.id} className="p-3 rounded-lg border border-outline-variant space-y-3">
        <Link href={`/perfil/${contact.id}`} className="flex items-center gap-3">
          <UserAvatar src={contact.avatar || undefined} alt={contact.name} className="w-10 h-10 rounded-full object-cover" />
          <span>{contact.name}</span>
        </Link>
        <RelationshipActions userId={contact.id} />
      </div>)}
    </div>
  </section>;
}
