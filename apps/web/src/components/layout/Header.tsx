'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useChatConnection } from '@/lib/use-chat-socket';
import { useAuth } from '@/lib/auth-context';

interface SearchUser {
  id: string;
  name: string;
  email: string;
  profileType: 'personal' | 'business';
  isVerified: boolean;
  avatar: string;
  role: string;
  relationshipStatus: 'NONE' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'FRIENDS';
}

export default function Header() {
  const { connected, subscribe } = useChatConnection();
  const pathname = usePathname();
  const { user, token, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Unread chat messages count
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Notifications state
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [notifActionLoadingId, setNotifActionLoadingId] = useState<string | null>(null);
  const notifContainerRef = useRef<HTMLDivElement>(null);

  const getValidAuthToken = () => {
    return token || (typeof window !== 'undefined' ? localStorage.getItem('promexa_auth_token') : null);
  };

  // Close notifications dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setShowNotificationsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch pending friend requests for the authentic logged-in user only
  const fetchFriendRequests = async () => {
    if (!user) {
      setFriendRequests([]);
      return;
    }

    const authToken = getValidAuthToken();
    if (!authToken) {
      setFriendRequests([]);
      return;
    }

    try {
      const res = await fetch('/api/users/friend-requests', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFriendRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching friend requests:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFriendRequests();
      const interval = setInterval(fetchFriendRequests, 4000);
      return () => clearInterval(interval);
    } else {
      setFriendRequests([]);
    }
  }, [user, token]);

  const fetchUnreadMessages = React.useCallback(async () => {
    if (!user) {
      setUnreadChatCount(0);
      return;
    }
    const authToken = getValidAuthToken();
    if (!authToken) return;

    try {
      const res = await fetch('/api/chat/messages', {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const msgs = await res.json();
        if (Array.isArray(msgs)) {
          const count = msgs.filter((m: any) => m.recipientId === user.id && !m.read).length;
          setUnreadChatCount(count);
        }
      }
    } catch {
      // ignore
    }
  }, [user, token]);

  useEffect(() => {
    if (!user) {
      setUnreadChatCount(0);
      return;
    }
    fetchUnreadMessages();
    const interval = setInterval(fetchUnreadMessages, 4000);

    const onChatRead = () => fetchUnreadMessages();
    window.addEventListener('promexa:chat-read', onChatRead);

    const unsubscribe = subscribe({
      onMessage: (msg) => {
        if (msg.recipientId === user.id) {
          fetchUnreadMessages();
        }
      },
      onTyping: () => {},
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('promexa:chat-read', onChatRead);
      unsubscribe();
    };
  }, [user, fetchUnreadMessages, subscribe]);

  const handleDismissNotification = async (notifId: string) => {
    const authToken = getValidAuthToken();
    setFriendRequests((prev) => prev.filter((req) => req.id !== notifId));
    if (!authToken) return;
    try {
      await fetch(`/api/users/notifications/${notifId}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch (e) {
      console.error('Error dismissing notification:', e);
    }
  };

  const handleAcceptFriendRequest = async (requestId: string, requesterId?: string) => {
    const authToken = getValidAuthToken();
    if (!authToken) return;

    setNotifActionLoadingId(requestId);
    try {
      const res = await fetch(`/api/users/friend-requests/${requestId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        setFriendRequests((prev) => prev.filter((req) => req.id !== requestId && req.friendshipId !== requestId));
        if (requesterId) {
          setSearchResults((prev) =>
            prev.map((u) => (u.id === requesterId ? { ...u, relationshipStatus: 'FRIENDS' } : u))
          );
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('promexa:friendship-updated'));
        }
      }
    } catch (err) {
      console.error('Error accepting friend request:', err);
    } finally {
      setNotifActionLoadingId(null);
    }
  };

  const handleRejectFriendRequest = async (requestId: string) => {
    const authToken = getValidAuthToken();
    if (!authToken) return;

    setNotifActionLoadingId(requestId);
    try {
      const res = await fetch(`/api/users/friend-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        setFriendRequests((prev) => prev.filter((req) => req.id !== requestId && req.friendshipId !== requestId));
      }
    } catch (err) {
      console.error('Error rejecting friend request:', err);
    } finally {
      setNotifActionLoadingId(null);
    }
  };

  const router = useRouter();
  const isCurrent = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname?.startsWith(path)) return true;
    return false;
  };

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const authToken = getValidAuthToken();
        const headers: Record<string, string> = {};
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
          headers,
        });

        if (res.ok) {
          const data: SearchUser[] = await res.json();
          setSearchResults(data);
          setShowSearchDropdown(true);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('Error buscando usuarios:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSendFriendRequest = async (targetUserId: string) => {
    setActionLoadingId(targetUserId);
    try {
      const authToken = getValidAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/users/${targetUserId}/friend-request`, {
        method: 'POST',
        headers,
      });

      if (res.ok) {
        setSearchResults((prev) =>
          prev.map((u) =>
            u.id === targetUserId ? { ...u, relationshipStatus: 'REQUEST_SENT' } : u
          )
        );
      }
    } catch (err) {
      console.error('Error enviando solicitud:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#FFFFFF] border-b border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="h-16 max-w-7xl mx-auto px-4 flex items-center justify-between gap-space-md">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-space-md shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center font-bold text-lg shadow-sm">
            P
          </div>
          <span className="font-headline-sm text-headline-sm text-primary tracking-tight">
            Promexa
          </span>
        </Link>

        {/* Global Search */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-lg hidden md:block">
          <div className="relative flex items-center w-full">
            <span className="material-symbols-outlined absolute left-3 text-outline pointer-events-none text-[20px]">
              search
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim() && searchResults.length > 0) {
                  setShowSearchDropdown(true);
                }
              }}
              className="w-full h-[42px] pl-10 pr-10 bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:border-primary-container focus:outline-none transition-colors"
              placeholder="Buscar en Promexa (personas, negocios, productos)..."
              type="text"
            />
            {isSearching && (
              <div className="absolute right-3 w-4 h-4 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
            )}
            {!isSearching && searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchDropdown(false);
                }}
                className="absolute right-3 text-gray-400 hover:text-gray-600 text-xs font-semibold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="p-2 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 text-xs text-gray-500 font-medium">
                <span>Personas y Negocios ({searchResults.length})</span>
                {searchQuery && <span className="text-[11px] text-gray-400">Coincidencias para &quot;{searchQuery}&quot;</span>}
              </div>

              {searchResults.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  <span className="material-symbols-outlined text-3xl text-gray-300 mb-1 block">
                    person_off
                  </span>
                  No se encontraron personas con ese nombre o correo
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                  {searchResults.map((person) => (
                    <div
                      key={person.id}
                      className="p-3 flex items-center justify-between hover:bg-gray-50/80 transition-colors gap-3"
                    >
                      <Link
                        href={`/perfil/${person.id}`}
                        onClick={() => setShowSearchDropdown(false)}
                        className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-85 transition-opacity"
                      >
                        <img
                          src={person.avatar}
                          alt={person.name}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-gray-900 truncate">
                              {person.name}
                            </span>
                            {person.isVerified && (
                              <span
                                className="material-symbols-outlined text-blue-500 text-[15px] shrink-0"
                                title="Verificado"
                              >
                                verified
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 truncate">
                            <span>{person.email}</span>
                            <span>•</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                person.profileType === 'business'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {person.profileType === 'business' ? 'Negocio' : 'Personal'}
                            </span>
                          </div>
                        </div>
                      </Link>

                      {/* Botón de Amistad / Conectar */}
                      <div className="flex items-center gap-2 shrink-0">
                        {person.relationshipStatus === 'FRIENDS' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-medium text-xs rounded-lg border border-emerald-200 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">check</span>
                              Amigos
                            </span>
                            <Link
                              href={`/mensajes?userId=${encodeURIComponent(person.id)}`}
                              onClick={() => setShowSearchDropdown(false)}
                              className="p-1.5 text-gray-500 hover:text-primary-container hover:bg-gray-100 rounded-lg"
                              title="Enviar mensaje"
                            >
                              <span className="material-symbols-outlined text-[18px]">chat</span>
                            </Link>
                          </div>
                        ) : person.relationshipStatus === 'REQUEST_SENT' ? (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 font-medium text-xs rounded-lg flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            Enviada
                          </span>
                        ) : person.relationshipStatus === 'REQUEST_RECEIVED' ? (
                          <button
                            type="button"
                            onClick={async () => {
                              const matchingReq = friendRequests.find((r) => r.requester?.id === person.id);
                              if (matchingReq) {
                                await handleAcceptFriendRequest(matchingReq.id, person.id);
                              }
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg shadow-sm flex items-center gap-1 transition-all"
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            Aceptar solicitud
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={actionLoadingId === person.id}
                            onClick={() => handleSendFriendRequest(person.id)}
                            className="px-3 py-1.5 bg-primary-container text-white hover:bg-primary-dark font-medium text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              person_add
                            </span>
                            {actionLoadingId === person.id ? 'Enviando...' : 'Agregar'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-space-xs">
          <Link
            href="/"
            className={`px-3 py-2 rounded-lg font-body-md text-body-md transition-colors flex items-center gap-1.5 ${
              isCurrent('/')
                ? 'bg-primary-container text-on-primary font-body-md-medium'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            Inicio
          </Link>

          <Link
            href="/marketplace"
            className={`px-3 py-2 rounded-lg font-body-md text-body-md transition-colors flex items-center gap-1.5 ${
              isCurrent('/marketplace')
                ? 'bg-primary-container text-on-primary font-body-md-medium'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            Marketplace
          </Link>

          <Link
            href="/mensajes"
            className={`relative px-3 py-2 rounded-lg font-body-md text-body-md transition-colors flex items-center gap-1.5 ${
              isCurrent('/mensajes')
                ? 'bg-primary-container text-on-primary font-body-md-medium'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span>Mensajes</span>
            <span title={connected ? 'Conectado' : 'Sin conexion'} className={`h-2 w-2 rounded-full inline-block ${connected ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            {unreadChatCount > 0 && (
              <span
                className={`ml-1 px-1.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-extrabold flex items-center justify-center shadow-xs animate-in zoom-in-75 duration-150 ${
                  isCurrent('/mensajes')
                    ? 'bg-white text-primary-container'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </Link>

          <Link
            href="/amigos"
            className={`px-3 py-2 rounded-lg font-body-md text-body-md transition-colors flex items-center gap-1.5 ${
              isCurrent('/amigos')
                ? 'bg-primary-container text-on-primary font-body-md-medium'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">group</span>
            <span>Amigos</span>
          </Link>

          {/* Notification Menu */}
          <div ref={notifContainerRef} className="relative">
            <button
              type="button"
              aria-label="Notificaciones"
              title="Notificaciones"
              onClick={() => {
                setShowNotificationsMenu(!showNotificationsMenu);
                fetchFriendRequests();
              }}
              className={`relative p-2 rounded-lg font-body-md text-body-md transition-colors flex items-center justify-center ${
                showNotificationsMenu
                  ? 'bg-primary-container text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              {friendRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-[#DC2626] text-white font-label-sm text-label-sm rounded-full text-[11px] leading-tight font-bold shadow-sm animate-pulse min-w-[18px] text-center">
                  {friendRequests.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotificationsMenu && (
              <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-container text-[20px]">
                      notifications
                    </span>
                    <h3 className="font-semibold text-sm text-gray-900">Notificaciones</h3>
                  </div>
                  {friendRequests.length > 0 && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 font-medium text-[11px] rounded-full">
                      {friendRequests.length} nueva{friendRequests.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                  {friendRequests.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">
                        notifications_none
                      </span>
                      <p className="text-sm font-medium text-gray-700">Sin notificaciones pendientes</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Cuando alguien te envíe una solicitud de amistad aparecerá aquí.
                      </p>
                    </div>
                  ) : (
                    friendRequests.map((req) => (
                      <div key={req.id} className="p-3.5 hover:bg-gray-50/70 transition-colors">
                        <div className="flex items-start gap-3">
                          <Link
                            href={`/perfil/${req.actorId || req.requester?.id}`}
                            onClick={() => setShowNotificationsMenu(false)}
                            className="shrink-0 group"
                          >
                            <img
                              src={req.requester?.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAH3UDaH5S4ho_6H4oKGGbzvRDc6LorHWo-1pfiUJf12W1Auj4lfoQJv49kAmTodxRQ2qjn9Gw3OCKEgNjPAaYs7bWaSTa1ib_zIwwkI7_Q-YO8vrIQcqc93EcFCKTlM8e8icVlD5kHDDY2RToEXmganGu3acS1w16yAXHMOQI9YlC8xg_qHtttlbMKoseK0hFBvd51mYVAjPwV2omGzRF7l9YtdZHuawkgmcCUf4Q'}
                              alt={req.requester?.name || 'Usuario'}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200 group-hover:ring-2 group-hover:ring-primary-container transition-all"
                            />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/perfil/${req.actorId || req.requester?.id}`}
                              onClick={() => setShowNotificationsMenu(false)}
                              className="flex items-center gap-1.5 hover:underline group"
                            >
                              <span className="font-semibold text-sm text-gray-900 truncate group-hover:text-primary-container">
                                {req.requester?.name || 'Usuario Promexa'}
                              </span>
                              {req.requester?.isVerified && (
                                <span className="material-symbols-outlined text-blue-500 text-[14px]">
                                  verified
                                </span>
                              )}
                            </Link>

                            {req.type === 'FRIEND_ACCEPTED' ? (
                              <>
                                <p className="text-xs text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[15px] text-emerald-600">how_to_reg</span>
                                  Ha aceptado tu solicitud de amistad. ¡Ahora son amigos!
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-[10px] text-gray-400">
                                    {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDismissNotification(req.id)}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors border border-emerald-200"
                                  >
                                    Entendido
                                  </button>
                                </div>
                              </>
                            ) : req.type === 'FRIEND_REJECTED' ? (
                              <>
                                <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[15px] text-gray-400">person_remove</span>
                                  Ha rechazado tu solicitud de amistad.
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-[10px] text-gray-400">
                                    {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDismissNotification(req.id)}
                                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                                  >
                                    Entendido
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Te ha enviado una solicitud de amistad
                                </p>
                                <span className="text-[10px] text-gray-400">
                                  {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>

                                {/* Acciones */}
                                <div className="flex items-center gap-2 mt-2.5">
                                  <button
                                    type="button"
                                    disabled={notifActionLoadingId === req.id || notifActionLoadingId === req.friendshipId}
                                    onClick={() => handleAcceptFriendRequest(req.friendshipId || req.id, req.requester?.id)}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-sm transition-all flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">check</span>
                                    {notifActionLoadingId === req.id || notifActionLoadingId === req.friendshipId ? 'Aceptando...' : 'Aceptar'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={notifActionLoadingId === req.id || notifActionLoadingId === req.friendshipId}
                                    onClick={() => handleRejectFriendRequest(req.friendshipId || req.id)}
                                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-all disabled:opacity-50"
                                  >
                                    Rechazar
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Right User Profile */}
        <div className="flex items-center gap-space-sm shrink-0">

          {user ? (
            <div className="relative">
              <button
                className="flex items-center gap-2 pl-1 cursor-pointer group focus:outline-none"
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-primary flex items-center justify-center text-white ring-1 ring-primary/20">
                  {user.avatar ? (
                    <img alt={user.name} className="w-full h-full object-cover" src={user.avatar} />
                  ) : (
                    <span className="material-symbols-outlined text-on-primary text-[18px]">
                      person
                    </span>
                  )}
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <div className="flex items-center gap-1">
                    <span className="font-body-md-medium text-body-md-medium text-on-surface">
                      {user.name}
                    </span>
                    {user.isVerified && (
                      <span
                        className="material-symbols-outlined text-primary-container text-[16px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                        title="Verificado"
                      >
                        verified
                      </span>
                    )}
                  </div>
                </div>
                <span className="material-symbols-outlined text-outline text-[20px] group-hover:text-on-surface transition-colors">
                  arrow_drop_down
                </span>
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div
                  className="absolute right-0 top-12 w-56 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 py-2 z-50 animate-fadeIn"
                  onMouseLeave={() => setShowProfileMenu(false)}
                >
                  <div className="px-4 py-2 border-b border-surface-container">
                    <p className="font-body-md-medium text-body-md-medium text-on-surface truncate">
                      {user.name}
                    </p>
                    <p className="font-caption text-caption text-outline truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-surface-container font-caption text-caption text-primary">
                      {user.profileType === 'business' ? 'Negocio Local' : 'Usuario Personal'}
                    </span>
                  </div>

                  <button type="button"
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-on-surface hover:bg-surface-container text-left font-medium"
                    onClick={() => { setShowProfileMenu(false); router.push('/perfil'); }}>
                    <span className="material-symbols-outlined text-[18px] text-outline">account_circle</span>
                    <span>Mi perfil</span>
                  </button>

                  <button type="button"
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-on-surface hover:bg-surface-container text-left"
                    onClick={() => { setShowProfileMenu(false); router.push('/perfil'); }}>
                    <span className="material-symbols-outlined text-[18px] text-outline">edit</span>
                    <span>Editar perfil</span>
                  </button>

                  <Link
                    href="/marketplace"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-on-surface hover:bg-surface-container font-body-md text-body-md transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <span className="material-symbols-outlined text-[18px] text-outline">
                      storefront
                    </span>
                    <span>Mis Productos</span>
                  </Link>

                  <div className="h-px bg-surface-container my-1" />

                  <button
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 font-body-md text-body-md transition-colors"
                    type="button"
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                      router.replace('/login');
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-surface-container text-primary font-body-md-medium text-body-md-medium hover:bg-surface-container-high transition-colors"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
