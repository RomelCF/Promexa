'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

interface Relationship {
  status: string;
  friendshipId?: string;
  canFollow: boolean;
  canRequestFriendship: boolean;
  canMessage: boolean;
}

export default function RelationshipActions({ userId, onChanged }: { userId: string; onChanged?: () => void }) {
  const { token, user } = useAuth();
  const [relation, setRelation] = useState<Relationship | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!token) return;
    const response = await fetch(`/api/users/${encodeURIComponent(userId)}/relationship`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    if (!response.ok) throw new Error('No se pudieron verificar los permisos');
    setRelation(await response.json());
  }, [token, userId]);
  useEffect(() => {
    setRelation(null); setError('');
    let active = true;
    // Guard against stale responses when switching the selected profile.
    if (token) fetch(`/api/users/${encodeURIComponent(userId)}/relationship`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    }).then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (active) setRelation(data);
    }).catch(() => { if (active) setError('No se pudieron verificar los permisos'); });
    return () => { active = false; };
  }, [token, userId]);
  if (user?.id === userId) return null;
  const act = async () => {
    if (!relation || busy || !token) return;
    setBusy(true); setError('');
    const following = relation.status === 'FOLLOWING';
    const accepting = relation.status === 'RECEIVED';
    const path = relation.canFollow ? `${userId}/follow`
      : accepting ? `friend-requests/${relation.friendshipId}/accept` : `${userId}/friend-request`;
    try {
      const response = await fetch(`/api/users/${path}`, {
        method: following ? 'DELETE' : 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo actualizar la relacion');
      await load();
      window.dispatchEvent(new CustomEvent('promexa:friendship-updated'));
      onChanged?.();
    } catch (error) { setError(error instanceof Error ? error.message : 'Error de conexion'); }
    finally { setBusy(false); }
  };
  return <div className="flex flex-wrap items-center gap-2">
    {relation && (relation.canFollow || relation.canRequestFriendship) && <button type="button" onClick={act}
      disabled={busy || relation.status === 'SENT' || relation.status === 'FRIENDS'}
      className="px-3 py-2 rounded-lg bg-primary-container text-white text-sm disabled:opacity-60">
      {busy ? 'Procesando...' : relation.canFollow ? (relation.status === 'FOLLOWING' ? 'Dejar de seguir' : 'Seguir')
        : relation.status === 'FRIENDS' ? 'Amigos' : relation.status === 'SENT' ? 'Solicitud enviada'
        : relation.status === 'RECEIVED' ? 'Aceptar solicitud' : 'Agregar amigo'}
    </button>}
    {relation?.status === 'FOLLOWING' && <span className="text-sm text-emerald-700">Siguiendo</span>}
    {relation?.canMessage && <Link href={`/mensajes?userId=${encodeURIComponent(userId)}`}
      className="px-3 py-2 rounded-lg bg-surface-container text-on-surface text-sm">Mensaje</Link>}
    {relation && !relation.canMessage && user?.profileType === 'business' && <span className="text-xs text-outline">Podras responder cuando esta persona te escriba.</span>}
    {!relation && !error && <span className="text-xs text-outline">Verificando...</span>}
    {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
  </div>;
}
