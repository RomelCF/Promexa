'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { usePresence } from '@/lib/use-chat-socket';
import PresenceDot from '@/components/profile/PresenceDot';
import UserAvatar from '@/components/profile/UserAvatar';

export interface FriendUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  profileType: string;
  isVerified: boolean;
  role?: string;
}

export interface RecommendedUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  profileType: string;
  isVerified: boolean;
  location?: string;
  mutualCount: number;
  tags: string[];
  affinityScore: number;
  recommendationReason: string;
  relationshipStatus: 'NONE' | 'REQUEST_SENT' | 'REQUEST_RECEIVED';
  friendshipId?: string;
}

export interface PendingRequest {
  id: string;
  type: string;
  status: string;
  message?: string;
  createdAt: string;
  friendshipId?: string;
  requester?: {
    id: string;
    name: string;
    avatar: string | null;
    isVerified: boolean;
    email?: string;
  };
}

export default function AmigosPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'recommended' | 'friends' | 'requests'>('recommended');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [recommended, setRecommended] = useState<RecommendedUser[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal de perfil interactivo
  const [selectedProfile, setSelectedProfile] = useState<{
    id?: string;
    name: string;
    avatar?: string | null;
    isVerified: boolean;
    location?: string;
    mutualCount?: number;
    tags?: string[];
    profileType?: string;
  } | null>(null);

  const [profileRelationship, setProfileRelationship] = useState<{
    status: 'SELF' | 'FRIENDS' | 'SENT' | 'RECEIVED' | 'NONE' | 'LOADING';
    friendshipId?: string;
    isBusiness?: boolean;
  }>({ status: 'NONE' });

  // Presencia en vivo de amigos y recomendados
  const presenceUserIds = React.useMemo(() => {
    return [
      ...friends.map((f) => f.id),
      ...recommended.map((r) => r.id),
      selectedProfile?.id,
    ].filter(Boolean) as string[];
  }, [friends, recommended, selectedProfile]);

  const presence = usePresence(presenceUserIds);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const getAuthToken = () => {
    return token || (typeof window !== 'undefined' ? localStorage.getItem('promexa_auth_token') : null);
  };

  // Carga de amigos reales
  const fetchFriends = useCallback(async () => {
    const authToken = getAuthToken();
    if (!authToken) return;
    try {
      const res = await fetch('/api/users/friends', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setFriends(data);
      }
    } catch (e) {
      console.error('Error fetching friends:', e);
    }
  }, [token]);

  // Carga de recomendaciones ML
  const fetchRecommended = useCallback(async () => {
    const authToken = getAuthToken();
    if (!authToken) return;
    try {
      const res = await fetch('/api/users/recommended', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setRecommended(data);
      }
    } catch (e) {
      console.error('Error fetching recommended:', e);
    }
  }, [token]);

  // Carga de solicitudes pendientes
  const fetchRequests = useCallback(async () => {
    const authToken = getAuthToken();
    if (!authToken) return;
    try {
      const res = await fetch('/api/users/friend-requests', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Filtrar las que son solicitudes entrantes pendientes
          setRequests(data.filter((r) => r.type === 'FRIEND_REQUEST' || r.status === 'PENDING'));
        }
      }
    } catch (e) {
      console.error('Error fetching requests:', e);
    }
  }, [token]);

  // Carga inicial y periódica
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchFriends(), fetchRecommended(), fetchRequests()]).finally(() => {
      setLoading(false);
    });

    const interval = setInterval(() => {
      fetchFriends();
      fetchRecommended();
      fetchRequests();
    }, 5000);

    const onFriendshipUpdated = () => {
      fetchFriends();
      fetchRecommended();
      fetchRequests();
    };

    window.addEventListener('promexa:friendship-updated', onFriendshipUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('promexa:friendship-updated', onFriendshipUpdated);
    };
  }, [user, fetchFriends, fetchRecommended, fetchRequests]);

  // Consultar relación de amistad al abrir el modal de perfil
  useEffect(() => {
    if (!selectedProfile) {
      setProfileRelationship({ status: 'NONE' });
      return;
    }
    if (!selectedProfile.id || selectedProfile.id === user?.id) {
      setProfileRelationship({ status: 'SELF' });
      return;
    }

    let isMounted = true;
    setProfileRelationship({ status: 'LOADING' });

    const check = async () => {
      try {
        const authToken = getAuthToken();
        const res = await fetch(`/api/users/${selectedProfile.id}/relationship`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setProfileRelationship({
              status: data.status || 'NONE',
              friendshipId: data.friendshipId,
              isBusiness: data.isBusiness || data.targetProfileType === 'business' || selectedProfile?.profileType === 'business',
            });
          }
        } else {
          if (isMounted) setProfileRelationship({ status: 'NONE' });
        }
      } catch {
        if (isMounted) setProfileRelationship({ status: 'NONE' });
      }
    };

    check();
    return () => { isMounted = false; };
  }, [selectedProfile, user?.id]);

  // Enviar solicitud de amistad
  const handleSendFriendRequest = async (targetId: string, targetName: string) => {
    const authToken = getAuthToken();
    if (!authToken) {
      showToast('Debes iniciar sesión para conectar con amigos');
      return;
    }

    setActionLoadingId(targetId);
    try {
      const res = await fetch(`/api/users/${targetId}/friend-request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        const targetUser = recommended.find((r) => r.id === targetId);
        const isBusiness = targetUser?.profileType === 'business' || data.isBusiness || data.isFollowing || data.status === 'FRIENDS';
        if (isBusiness || data.status === 'FRIENDS') {
          setRecommended((prev) =>
            prev.map((r) =>
              r.id === targetId ? { ...r, relationshipStatus: 'REQUEST_SENT' } : r
            )
          );
          if (selectedProfile && selectedProfile.id === targetId) {
            setProfileRelationship({ status: 'FRIENDS', friendshipId: data.friendship?.id, isBusiness: true });
          }
          showToast(`¡Ahora sigues a ${targetName}!`);
        } else {
          setRecommended((prev) =>
            prev.map((r) =>
              r.id === targetId ? { ...r, relationshipStatus: 'REQUEST_SENT' } : r
            )
          );
          if (selectedProfile && selectedProfile.id === targetId) {
            setProfileRelationship({ status: 'SENT', friendshipId: data.friendship?.id });
          }
          showToast(`¡Solicitud enviada a ${targetName}!`);
        }
      } else {
        showToast(data.message || 'No se pudo enviar la solicitud');
      }
    } catch (e) {
      console.error(e);
      showToast('Error de conexión al enviar la solicitud');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Aceptar solicitud de amistad
  const handleAcceptRequest = async (requestId: string, requesterName?: string) => {
    const authToken = getAuthToken();
    if (!authToken) return;

    setActionLoadingId(requestId);
    try {
      const res = await fetch(`/api/users/friend-requests/${requestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        showToast(`¡Ahora son amigos${requesterName ? ` con ${requesterName}` : ''}!`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('promexa:friendship-updated'));
        }
        fetchFriends();
        fetchRequests();
        fetchRecommended();
        if (selectedProfile) setProfileRelationship({ status: 'FRIENDS' });
      } else {
        showToast('No se pudo aceptar la solicitud');
      }
    } catch (e) {
      console.error(e);
      showToast('Error de conexión');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Rechazar solicitud de amistad
  const handleRejectRequest = async (requestId: string) => {
    const authToken = getAuthToken();
    if (!authToken) return;

    setActionLoadingId(requestId);
    try {
      const res = await fetch(`/api/users/friend-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        showToast('Solicitud rechazada');
        fetchRequests();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Iniciar chat directo
  const handleStartChat = (targetUser: { id: string; name: string; avatar?: string | null; isVerified?: boolean }) => {
    setSelectedProfile(null);
    const params = new URLSearchParams({
      user: targetUser.name,
      avatar: targetUser.avatar || '',
      verified: targetUser.isVerified ? 'true' : 'false',
      userId: targetUser.id,
    });
    router.push(`/mensajes?${params.toString()}`);
  };

  // Filtro por búsqueda
  const filteredFriends = friends.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecommended = recommended.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm animate-bounce">
          <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-surface-container-lowest border border-surface-container/60 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">group</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Amigos y Conexiones</h1>
          </div>
          <p className="text-sm text-on-surface-variant max-w-xl">
            Gestiona tu red de contactos, chatea en tiempo real y descubre nuevas personas recomendadas por el motor de afinidad de Machine Learning.
          </p>
        </div>

        {/* Resumen numérico */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-initial bg-surface-container-low px-4 py-3 rounded-xl text-center border border-surface-container/40">
            <p className="text-2xl font-bold text-primary">{friends.length}</p>
            <p className="text-xs text-on-surface-variant font-medium">Amigos</p>
          </div>
          <div className="flex-1 md:flex-initial bg-surface-container-low px-4 py-3 rounded-xl text-center border border-surface-container/40">
            <p className="text-2xl font-bold text-emerald-600">{recommended.length}</p>
            <p className="text-xs text-on-surface-variant font-medium">Sugeridos</p>
          </div>
          {requests.length > 0 && (
            <div className="flex-1 md:flex-initial bg-red-50 px-4 py-3 rounded-xl text-center border border-red-200">
              <p className="text-2xl font-bold text-red-600 animate-pulse">{requests.length}</p>
              <p className="text-xs text-red-700 font-medium">Solicitudes</p>
            </div>
          )}
        </div>
      </div>

      {/* Controles: Tabs y Buscador */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Tabs de navegación */}
        <div className="flex items-center gap-1.5 bg-surface-container-lowest p-1.5 rounded-xl border border-surface-container/60 shadow-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('recommended')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'recommended'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            <span>Recomendados por ML</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/20 font-bold">
              {recommended.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'friends'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            <span>Mis Amigos</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/20 font-bold">
              {friends.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap relative ${
              activeTab === 'requests'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">mail</span>
            <span>Solicitudes</span>
            {requests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-red-600 text-white font-bold animate-pulse">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {/* Buscador de amigos */}
        <div className="relative sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-container-lowest border border-surface-container/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* CONTENIDO DE TABS */}

      {/* 1. TAB: RECOMENDADOS POR ML */}
      {activeTab === 'recommended' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-[20px]">psychology</span>
              <span>
                <strong>Algoritmo de Afinidad Promexa (ML Service):</strong> Las sugerencias se calculan en base a conexiones mutuas, intereses compartidos y cercanía geográfica.
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Calculando recomendaciones de amigos...</p>
            </div>
          ) : filteredRecommended.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-surface-container/60 shadow-xs">
              <span className="material-symbols-outlined text-5xl text-outline mb-3 block">auto_awesome</span>
              <h3 className="text-base font-semibold text-on-surface">No hay recomendaciones adicionales</h3>
              <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
                Ya estás conectado o tienes solicitudes pendientes con las personas disponibles. ¡Revisa más tarde para nuevas sugerencias!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecommended.map((person) => {
                const isOnline = presence[person.id];
                const isSent = person.relationshipStatus === 'REQUEST_SENT';
                const isReceived = person.relationshipStatus === 'REQUEST_RECEIVED';
                const isActing = actionLoadingId === person.id;

                return (
                  <div
                    key={person.id}
                    className="bg-surface-container-lowest border border-surface-container/70 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div>
                      {/* Cabecera de tarjeta: Avatar y Afinidad */}
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="relative cursor-pointer"
                          onClick={() =>
                            setSelectedProfile({
                              id: person.id,
                              name: person.name,
                              avatar: person.avatar,
                              isVerified: person.isVerified,
                              location: person.location || 'Lima, Perú',
                              mutualCount: person.mutualCount,
                              tags: person.tags,
                            })
                          }
                          title={`Ver perfil de ${person.name}`}
                        >
                          <UserAvatar
                            src={person.avatar || ''}
                            alt={person.name}
                            className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary transition-all"
                          />
                          <PresenceDot
                            online={isOnline}
                            className="absolute bottom-0 right-0 w-3.5 h-3.5 ring-2 ring-white"
                          />
                        </div>

                        {/* Badge de afinidad ML */}
                        <div className="flex flex-col items-end">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 shadow-2xs">
                            <span className="material-symbols-outlined text-[13px]">bolt</span>
                            {person.affinityScore}% afinidad
                          </span>
                        </div>
                      </div>

                      {/* Nombre y detalles */}
                      <div className="mt-3">
                        <div className="flex items-center gap-1.5">
                          <h4
                            className="font-bold text-base text-on-surface truncate cursor-pointer hover:text-primary transition-colors"
                            onClick={() =>
                              setSelectedProfile({
                                id: person.id,
                                name: person.name,
                                avatar: person.avatar,
                                isVerified: person.isVerified,
                                location: person.location || 'Lima, Perú',
                                mutualCount: person.mutualCount,
                                tags: person.tags,
                              })
                            }
                          >
                            {person.name}
                          </h4>
                          {person.isVerified && (
                            <span
                              className="material-symbols-outlined text-primary-container text-[17px] shrink-0"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                              title="Verificado"
                            >
                              verified
                            </span>
                          )}
                        </div>

                        {/* Motivo de recomendación */}
                        <p className="text-xs text-on-surface-variant font-medium mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-outline">hub</span>
                          {person.recommendationReason}
                        </p>

                        {/* Ubicación y Conexiones */}
                        <div className="flex items-center gap-3 text-[11px] text-outline mt-2">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">location_on</span>
                            {person.location || 'Lima, Perú'}
                          </span>
                          {person.mutualCount > 0 && (
                            <span className="flex items-center gap-1 text-emerald-700 font-medium">
                              <span className="material-symbols-outlined text-[13px]">diversity_3</span>
                              {person.mutualCount} en común
                            </span>
                          )}
                        </div>

                        {/* Tags */}
                        {person.tags && person.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {person.tags.slice(0, 3).map((tag, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant text-[10px] font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Acciones de la tarjeta */}
                    <div className="flex items-center gap-2 pt-3 border-t border-surface-container/60">
                      {isSent ? (
                        <button
                          type="button"
                          disabled
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-50 text-amber-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-amber-200 cursor-default"
                        >
                          <span className="material-symbols-outlined text-[15px]">schedule</span>
                          <span>Solicitud enviada</span>
                        </button>
                      ) : isReceived ? (
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleAcceptRequest(person.friendshipId || person.id, person.name)}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                        >
                          <span className="material-symbols-outlined text-[15px]">check</span>
                          <span>{isActing ? 'Aceptando...' : 'Aceptar solicitud'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleSendFriendRequest(person.id, person.name)}
                          className="flex-1 py-2 px-3 rounded-xl bg-primary-container hover:bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[15px]">{person.profileType === 'business' ? 'add' : 'person_add'}</span>
                          <span>{isActing ? 'Procesando...' : (person.profileType === 'business' ? 'Seguir' : 'Agregar amigo')}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleStartChat(person)}
                        className="py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        title="Enviar mensaje directo"
                      >
                        <span className="material-symbols-outlined text-[16px]">chat</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. TAB: MIS AMIGOS */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Cargando tu lista de amigos...</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-surface-container/60 shadow-xs">
              <span className="material-symbols-outlined text-5xl text-outline mb-3 block">person_off</span>
              <h3 className="text-base font-semibold text-on-surface">Aún no tienes amigos agregados</h3>
              <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
                Explora la pestaña <strong>Recomendados por ML</strong> para enviar solicitudes de amistad y comenzar a conversar.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('recommended')}
                className="mt-4 px-4 py-2 bg-primary-container text-on-primary rounded-xl text-xs font-semibold hover:bg-primary transition-all"
              >
                Ver sugerencias recomendadas
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFriends.map((friend) => {
                const isOnline = presence[friend.id];

                return (
                  <div
                    key={friend.id}
                    className="bg-surface-container-lowest border border-surface-container/70 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="relative cursor-pointer shrink-0"
                        onClick={() =>
                          setSelectedProfile({
                            id: friend.id,
                            name: friend.name,
                            avatar: friend.avatar,
                            isVerified: friend.isVerified,
                            location: 'Lima, Perú',
                          })
                        }
                      >
                        <UserAvatar
                          src={friend.avatar || ''}
                          alt={friend.name}
                          className="w-13 h-13 rounded-full object-cover ring-2 ring-emerald-200 group-hover:ring-emerald-500 transition-all"
                        />
                        <PresenceDot
                          online={isOnline}
                          className="absolute bottom-0 right-0 w-3.5 h-3.5 ring-2 ring-white"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4
                            className="font-bold text-sm text-on-surface truncate cursor-pointer hover:text-primary transition-colors"
                            onClick={() =>
                              setSelectedProfile({
                                id: friend.id,
                                name: friend.name,
                                avatar: friend.avatar,
                                isVerified: friend.isVerified,
                                location: 'Lima, Perú',
                              })
                            }
                          >
                            {friend.name}
                          </h4>
                          {friend.isVerified && (
                            <span
                              className="material-symbols-outlined text-primary-container text-[16px] shrink-0"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                              title="Verificado"
                            >
                              verified
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-outline truncate">{friend.email}</p>

                        <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 mt-1">
                          <span className="material-symbols-outlined text-[13px]">how_to_reg</span>
                          <span>Amigo conectado</span>
                        </div>
                      </div>
                    </div>

                    {/* Botón de chat rápido */}
                    <button
                      type="button"
                      onClick={() => handleStartChat(friend)}
                      className="p-2.5 rounded-xl bg-primary-container hover:bg-primary text-on-primary transition-all shadow-xs flex items-center justify-center shrink-0"
                      title={`Enviar mensaje a ${friend.name}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. TAB: SOLICITUDES DE AMISTAD */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-surface-container/60 shadow-xs">
              <span className="material-symbols-outlined text-5xl text-outline mb-3 block">mark_email_read</span>
              <h3 className="text-base font-semibold text-on-surface">No tienes solicitudes pendientes</h3>
              <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
                Cuando alguien te envíe una solicitud de amistad podrás aceptarla o rechazarla aquí.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-surface-container/60 bg-surface-container-lowest border border-surface-container/70 rounded-2xl overflow-hidden shadow-xs">
              {requests.map((req) => {
                const requester = req.requester;
                const isActing = actionLoadingId === req.id || actionLoadingId === req.friendshipId;

                return (
                  <div key={req.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-surface-container-low/40 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <UserAvatar
                        src={requester?.avatar || ''}
                        alt={requester?.name || 'Usuario'}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-on-surface truncate">
                            {requester?.name || 'Usuario Promexa'}
                          </span>
                          {requester?.isVerified && (
                            <span className="material-symbols-outlined text-blue-500 text-[15px]">
                              verified
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          Te envió una solicitud de amistad
                        </p>
                        <span className="text-[10px] text-outline">
                          {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => handleAcceptRequest(req.friendshipId || req.id, requester?.name)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[15px]">check</span>
                        <span>{isActing ? 'Aceptando...' : 'Aceptar'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => handleRejectRequest(req.friendshipId || req.id)}
                        className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE PERFIL INTERACTIVO */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div
            className="bg-surface-container-lowest rounded-2xl w-full max-w-md shadow-2xl border border-surface-container/60 overflow-hidden relative animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Banner de fondo decorativo */}
            <div className="h-28 bg-gradient-to-r from-primary-container via-primary to-indigo-700 relative">
              <button
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors"
                type="button"
                onClick={() => setSelectedProfile(null)}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="px-6 pb-6 pt-0 relative flex flex-col">
              {/* Avatar grande con overlap */}
              <div className="flex justify-between items-end -mt-12 mb-3">
                <div className="relative">
                  <UserAvatar
                    alt={selectedProfile.name}
                    className="w-22 h-22 rounded-full object-cover ring-4 ring-surface-container-lowest shadow-md bg-white"
                    src={selectedProfile.avatar || ''}
                  />
                  <PresenceDot
                    online={selectedProfile.id ? presence[selectedProfile.id] : null}
                    className="absolute bottom-1 right-1 w-4 h-4 ring-2 ring-white"
                  />
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-container text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    {selectedProfile.isVerified ? 'verified' : 'person'}
                  </span>
                  <span>{selectedProfile.isVerified ? 'Verificado' : 'Miembro'}</span>
                </span>
              </div>

              {/* Nombres */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xl text-on-surface font-bold">{selectedProfile.name}</h3>
                  {selectedProfile.isVerified && (
                    <span
                      className="material-symbols-outlined text-primary-container text-[18px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  )}
                </div>
                <span className="text-xs text-outline">
                  @{selectedProfile.name.toLowerCase().replace(/\s+/g, '')}
                </span>
              </div>

              {/* Ubicación y Conexiones */}
              <div className="flex items-center gap-4 text-xs text-on-surface-variant mt-3">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-outline">location_on</span>
                  {selectedProfile.location || 'Lima, Perú'}
                </span>
                {selectedProfile.mutualCount !== undefined && selectedProfile.mutualCount > 0 && (
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <span className="material-symbols-outlined text-[15px]">diversity_3</span>
                    {selectedProfile.mutualCount} amigos en común
                  </span>
                )}
              </div>

              {/* Tags */}
              {selectedProfile.tags && selectedProfile.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {selectedProfile.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant text-[11px] font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="h-px bg-surface-container/80 my-4" />

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    handleStartChat({
                      id: selectedProfile.id || '',
                      name: selectedProfile.name,
                      avatar: selectedProfile.avatar,
                      isVerified: selectedProfile.isVerified,
                    })
                  }
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  <span>Conversar ahora</span>
                </button>

                {profileRelationship.status !== 'SELF' && selectedProfile.id && (
                  <button
                    type="button"
                    disabled={
                      actionLoadingId === selectedProfile.id ||
                      profileRelationship.status === 'FRIENDS' ||
                      profileRelationship.status === 'SENT' ||
                      profileRelationship.status === 'LOADING'
                    }
                    onClick={() => {
                      if (profileRelationship.status === 'RECEIVED' && profileRelationship.friendshipId) {
                        handleAcceptRequest(profileRelationship.friendshipId, selectedProfile.name);
                      } else {
                        handleSendFriendRequest(selectedProfile.id!, selectedProfile.name);
                      }
                    }}
                    className={`py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                      profileRelationship.status === 'FRIENDS'
                        ? 'bg-[#DCFCE7] text-[#16A34A] border border-[#86EFAC]'
                        : profileRelationship.status === 'SENT'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200 cursor-default'
                        : profileRelationship.status === 'RECEIVED'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/40 active:scale-98'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {profileRelationship.status === 'FRIENDS'
                        ? 'how_to_reg'
                        : profileRelationship.status === 'SENT'
                        ? 'schedule'
                        : profileRelationship.status === 'RECEIVED'
                        ? 'person_check'
                        : 'person_add'}
                    </span>
                    <span>
                      {actionLoadingId === selectedProfile.id
                        ? 'Procesando...'
                        : profileRelationship.status === 'LOADING'
                        ? 'Verificando...'
                        : profileRelationship.status === 'FRIENDS'
                        ? (profileRelationship.isBusiness || selectedProfile.profileType === 'business' ? 'Siguiendo' : 'Amigos')
                        : profileRelationship.status === 'SENT'
                        ? 'Solicitud enviada'
                        : profileRelationship.status === 'RECEIVED'
                        ? 'Aceptar solicitud'
                        : (profileRelationship.isBusiness || selectedProfile.profileType === 'business' ? 'Seguir' : 'Agregar amigo')}
                    </span>
                  </button>
                )}
              </div>

              {selectedProfile.id && (
                <Link
                  href={`/perfil/${selectedProfile.id}`}
                  className="mt-3 w-full py-2.5 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs flex items-center justify-center gap-2 border border-outline-variant/60 shadow-2xs transition-all text-center"
                >
                  <span className="material-symbols-outlined text-[18px]">account_box</span>
                  <span>Ver perfil completo (fotos, publicaciones, amigos)</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
