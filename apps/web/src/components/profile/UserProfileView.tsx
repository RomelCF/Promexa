'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import UserAvatar from '@/components/profile/UserAvatar';
import ProfileEditor from '@/components/profile/ProfileEditor';
import CoverCropper from '@/components/profile/CoverCropper';
import { uploadImage } from '@/lib/upload-image';

export interface UserProfileData {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    coverImage: string | null;
    bio: string | null;
    profileType: 'personal' | 'business';
    role: string;
    isVerified: boolean;
    createdAt: string;
  };
  relationship: {
    status: 'SELF' | 'FRIENDS' | 'SENT' | 'RECEIVED' | 'NONE';
    friendshipId?: string;
  };
  stats: {
    postsCount: number;
    friendsCount: number;
    photosCount: number;
    mutualCount: number;
  };
  friends: Array<{
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    isVerified: boolean;
    profileType: string;
  }>;
  mutualFriends?: Array<any>;
  photos: Array<{
    id: string;
    url: string;
    caption?: string;
    createdAt: string;
    postId?: string;
  }>;
  posts: Array<{
    id: string;
    author: string;
    authorId: string;
    authorHandle: string;
    authorAvatar: string;
    isVerified: boolean;
    time: string;
    createdAt: string;
    location: string;
    content: string;
    category: string;
    tags: string[];
    mediaUrl?: string;
    linkedProduct?: {
      name: string;
      price: number;
      badge: string;
      stock: string;
      details: string;
      image: string;
    };
    likes: number;
    liked: boolean;
    bookmarked: boolean;
    comments: Array<{
      id: string;
      author: string;
      authorAvatar: string;
      isVerified: boolean;
      text: string;
      time: string;
    }>;
  }>;
}

export default function UserProfileView({ userId }: { userId: string }) {
  const { user: currentUser, token, updateProfile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'friends' | 'photos'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick cover / avatar direct upload
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverCropFile, setCoverCropFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Post comment inputs
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);

  // Quick bio editing
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [savingBio, setSavingBio] = useState(false);

  // Friend search in Friends tab
  const [friendSearch, setFriendSearch] = useState('');

  // Selected photo for Lightbox
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchProfile = React.useCallback(async () => {
    try {
      setLoading(true);
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('promexa_auth_token') : null);
      const res = await fetch(`/api/users/${userId}/profile`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
        setBioInput(data.user?.bio || '');
      } else {
        showToast('No se pudo cargar el perfil del usuario');
      }
    } catch {
      showToast('Error de conexión al cargar el perfil');
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Manejar solicitud de amistad
  const handleFriendAction = async () => {
    if (!profileData || actionLoading) return;
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('promexa_auth_token') : null);
    if (!authToken) {
      showToast('Inicia sesión para enviar solicitudes de amistad');
      return;
    }

    const { relationship, user } = profileData;
    setActionLoading(true);

    try {
      if (relationship.status === 'NONE') {
        const res = await fetch(`/api/users/${user.id}/friend-request`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          showToast('¡Solicitud de amistad enviada!');
          setProfileData({
            ...profileData,
            relationship: { status: 'SENT' },
          });
          window.dispatchEvent(new CustomEvent('promexa:friendship-updated'));
        } else {
          const err = await res.json();
          showToast(err.message || 'Error al enviar solicitud');
        }
      } else if (relationship.status === 'RECEIVED' && relationship.friendshipId) {
        const res = await fetch(`/api/users/friend-requests/${relationship.friendshipId}/accept`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          showToast('¡Solicitud aceptada! Ahora son amigos.');
          setProfileData({
            ...profileData,
            relationship: { status: 'FRIENDS' },
            stats: { ...profileData.stats, friendsCount: profileData.stats.friendsCount + 1 },
          });
          window.dispatchEvent(new CustomEvent('promexa:friendship-updated'));
        } else {
          showToast('Error al aceptar la solicitud');
        }
      }
    } catch {
      showToast('Error de red al procesar la solicitud');
    } finally {
      setActionLoading(false);
    }
  };

  // Guardar biografía rápida
  const handleSaveBio = async () => {
    if (savingBio) return;
    setSavingBio(true);
    try {
      await updateProfile({
        name: currentUser?.name || profileData?.user.name || '',
        email: currentUser?.email || profileData?.user.email || '',
        avatar: currentUser?.avatar || profileData?.user.avatar || null,
        coverImage: currentUser?.coverImage || profileData?.user.coverImage || null,
        bio: bioInput.trim() || null,
      });

      if (profileData) {
        setProfileData({
          ...profileData,
          user: {
            ...profileData.user,
            bio: bioInput.trim() || null,
          },
        });
      }
      setEditingBio(false);
      showToast('Biografía actualizada');
    } catch {
      showToast('Error al guardar la biografía');
    } finally {
      setSavingBio(false);
    }
  };

  // Carga rápida de portada desde el botón en el banner
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !token) return;
    if (!/\.(jpe?g|jfif|png|webp)$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
      showToast('Selecciona una imagen JPG, PNG o WebP de hasta 10 MB.');
      return;
    }
    setCoverCropFile(file);
  };

  const saveCover = async (file: File) => {
    if (!token || uploadingCover) return;
    setUploadingCover(true);
    try {
      const coverUrl = await uploadImage(file, 'cover', token);
      await updateProfile({
        name: currentUser?.name || profileData?.user.name || '',
        email: currentUser?.email || profileData?.user.email || '',
        avatar: currentUser?.avatar || profileData?.user.avatar || null,
        coverImage: coverUrl,
        bio: currentUser?.bio || profileData?.user.bio || null,
      });

      if (profileData) {
        setProfileData({
          ...profileData,
          user: { ...profileData.user, coverImage: coverUrl },
        });
      }
      setCoverCropFile(null);
      showToast('¡Foto de portada actualizada!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al subir la portada');
      throw err;
    } finally {
      setUploadingCover(false);
    }
  };

  // Carga rápida de avatar desde el botón sobre el avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !token) return;

    setUploadingAvatar(true);
    try {
      const avatarUrl = await uploadImage(file, 'avatar', token);
      await updateProfile({
        name: currentUser?.name || profileData?.user.name || '',
        email: currentUser?.email || profileData?.user.email || '',
        avatar: avatarUrl,
        coverImage: currentUser?.coverImage || profileData?.user.coverImage || null,
        bio: currentUser?.bio || profileData?.user.bio || null,
      });

      if (profileData) {
        setProfileData({
          ...profileData,
          user: { ...profileData.user, avatar: avatarUrl },
        });
      }
      showToast('¡Foto de perfil actualizada!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al subir la foto de perfil');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Manejar dar like a una publicación
  const handleLikePost = async (postId: string) => {
    if (!profileData || !token) return;
    const post = profileData.posts.find((p) => p.id === postId);
    if (!post) return;

    const newLiked = !post.liked;
    const newLikes = newLiked ? post.likes + 1 : Math.max(0, post.likes - 1);

    setProfileData({
      ...profileData,
      posts: profileData.posts.map((p) =>
        p.id === postId ? { ...p, liked: newLiked, likes: newLikes } : p
      ),
    });

    try {
      await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Revert if error
      setProfileData({
        ...profileData,
        posts: profileData.posts.map((p) =>
          p.id === postId ? { ...p, liked: post.liked, likes: post.likes } : p
        ),
      });
    }
  };

  // Enviar comentario en publicación
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || !token || !profileData || commentingPostId) return;

    setCommentingPostId(postId);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setProfileData({
          ...profileData,
          posts: profileData.posts.map((p) => {
            if (p.id === postId) {
              return {
                ...p,
                comments: [...p.comments, newComment],
              };
            }
            return p;
          }),
        });
        setCommentInputs({ ...commentInputs, [postId]: '' });
      } else {
        showToast('Error al enviar comentario');
      }
    } catch {
      showToast('Error de red al comentar');
    } finally {
      setCommentingPostId(null);
    }
  };

  // Iniciar chat
  const handleStartChat = () => {
    if (!profileData) return;
    router.push(`/mensajes?to=${profileData.user.id}`);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary-container border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-outline">Cargando perfil...</p>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <span className="material-symbols-outlined text-6xl text-outline">person_off</span>
        <h2 className="text-2xl font-bold text-on-surface">Usuario no encontrado</h2>
        <p className="text-sm text-on-surface-variant">El perfil que buscas no existe o ha sido modificado.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container text-white text-sm font-semibold hover:bg-primary transition-all"
        >
          <span className="material-symbols-outlined text-sm">home</span>
          <span>Volver al inicio</span>
        </Link>
      </div>
    );
  }

  const { user, relationship, stats, friends, photos, posts } = profileData;
  const isOwnProfile = relationship.status === 'SELF' || user.id === currentUser?.id;

  const filteredFriends = friends.filter((f) =>
    f.name.toLowerCase().includes(friendSearch.toLowerCase())
  );

  return (
    <div className="w-full pb-16 bg-[#F8F9FA] min-h-screen">
      {coverCropFile && <CoverCropper modal file={coverCropFile} onApply={saveCover} onCancel={() => setCoverCropFile(null)} />}
      {/* Toast de confirmación */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm animate-fade-in border border-gray-700">
          <span className="material-symbols-outlined text-emerald-400 text-lg">info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal Lightbox de Foto */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute top-5 right-5 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            onClick={() => setSelectedPhoto(null)}
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          <img
            src={selectedPhoto}
            alt="Vista completa"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* HEADER PRINCIPAL ESTILO FACEBOOK */}
      <div className="bg-white border-b border-outline-variant/40 shadow-xs">
        <div className="max-w-6xl mx-auto">
          {/* BANNER DE PORTADA (COVER PHOTO) */}
          <div className="relative w-full h-40 sm:h-56 md:h-64 rounded-b-2xl overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-800 to-primary-container shadow-inner group">
            {user.coverImage ? (
              <img
                src={user.coverImage}
                alt={`Portada de ${user.name}`}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/15 via-transparent to-black/30" />
                <span className="text-white/25 text-8xl material-symbols-outlined select-none">
                  landscape
                </span>
              </div>
            )}

            {/* Botón flotante para cambiar foto de portada */}
            {isOwnProfile && (
              <>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jfif,.jfif,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleCoverUpload}
                />
                <button
                  type="button"
                  disabled={uploadingCover}
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute bottom-4 right-4 bg-white/95 hover:bg-white text-gray-800 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-md flex items-center gap-2 backdrop-blur-md transition-all hover:scale-102 active:scale-98"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {uploadingCover ? 'progress_activity' : 'photo_camera'}
                  </span>
                  <span>{uploadingCover ? 'Subiendo portada...' : 'Editar foto de portada'}</span>
                </button>
              </>
            )}
          </div>

          {/* BARRA DE PERFIL INFERIOR (AVATAR + NOMBRES + BOTONES) */}
          <div className="px-4 sm:px-8 pt-4 pb-4">
            <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-4 mb-4">
              {/* Avatar y Nombres */}
              <div className="flex flex-col md:flex-row items-center md:items-end gap-4 sm:gap-6 text-center md:text-left">
                {/* Avatar circular con borde prominente */}
                <div className="relative z-10 shrink-0 -mt-16 sm:-mt-20 md:-mt-24 group">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 rounded-full ring-4 ring-white bg-white shadow-xl overflow-hidden flex items-center justify-center">
                    <UserAvatar
                      src={user.avatar || undefined}
                      alt={user.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>

                  {/* Botón para cambiar foto de perfil */}
                  {isOwnProfile && (
                    <>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jfif,.jfif,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                      <button
                        type="button"
                        disabled={uploadingAvatar}
                        onClick={() => avatarInputRef.current?.click()}
                        title="Cambiar foto de perfil"
                        className="absolute bottom-2 right-2 p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full shadow-md border-2 border-white transition-all hover:scale-110 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {uploadingAvatar ? 'progress_activity' : 'photo_camera'}
                        </span>
                      </button>
                    </>
                  )}
                </div>

                {/* Textos: Nombre, Handle, Stats */}
                <div className="space-y-1 mb-1">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                      {user.name}
                    </h1>
                  </div>

                  <p className="text-sm font-medium text-outline">
                    @{user.name.toLowerCase().replace(/\s+/g, '')} ·{' '}
                    <span className="capitalize">{user.profileType === 'business' ? 'Negocio' : 'Personal'}</span>
                  </p>

                  {/* Amigos en común o contador */}
                  <div className="flex items-center justify-center md:justify-start gap-4 text-xs font-semibold text-on-surface-variant pt-1">
                    <span className="hover:underline cursor-pointer" onClick={() => setActiveTab('friends')}>
                      {stats.friendsCount} {stats.friendsCount === 1 ? 'amigo' : 'amigos'}
                    </span>
                    {stats.mutualCount > 0 && !isOwnProfile && (
                      <span>· {stats.mutualCount} en común</span>
                    )}
                    <span>· {stats.photosCount} fotos</span>
                  </div>
                </div>
              </div>

              {/* Botones de Acción principales */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 md:pt-0">
                {isOwnProfile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-sm flex items-center gap-2 border border-outline-variant/60 shadow-xs transition-all active:scale-98"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                      <span>{isEditing ? 'Ver perfil público' : 'Editar perfil'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof navigator !== 'undefined' && navigator.clipboard) {
                          navigator.clipboard.writeText(window.location.href);
                          showToast('Enlace de tu perfil copiado al portapapeles');
                        }
                      }}
                      className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-sm border border-outline-variant/60 shadow-xs transition-all active:scale-98"
                      title="Compartir perfil"
                    >
                      <span className="material-symbols-outlined text-[18px]">share</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Botón de relación de amistad */}
                    <button
                      type="button"
                      disabled={
                        actionLoading ||
                        relationship.status === 'SENT' ||
                        relationship.status === 'FRIENDS'
                      }
                      onClick={handleFriendAction}
                      className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-xs ${
                        relationship.status === 'FRIENDS'
                          ? 'bg-[#DCFCE7] text-[#16A34A] border border-[#86EFAC]'
                          : relationship.status === 'SENT'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 cursor-default'
                          : relationship.status === 'RECEIVED'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          : 'bg-primary-container hover:bg-primary text-white shadow-sm active:scale-98'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {relationship.status === 'FRIENDS'
                          ? 'how_to_reg'
                          : relationship.status === 'SENT'
                          ? 'schedule'
                          : relationship.status === 'RECEIVED'
                          ? 'person_check'
                          : 'person_add'}
                      </span>
                      <span>
                        {actionLoading
                          ? 'Procesando...'
                          : relationship.status === 'FRIENDS'
                          ? 'Amigos'
                          : relationship.status === 'SENT'
                          ? 'Solicitud enviada'
                          : relationship.status === 'RECEIVED'
                          ? 'Aceptar solicitud'
                          : 'Agregar a amigos'}
                      </span>
                    </button>

                    {/* Botón de Enviar Mensaje */}
                    <button
                      type="button"
                      onClick={handleStartChat}
                      className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-sm flex items-center gap-2 border border-outline-variant/60 shadow-xs transition-all active:scale-98"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                      <span>Mensaje</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* SECCIÓN DE BIOGRAFÍA ESTILO FACEBOOK */}
            <div className="pt-2 pb-4 border-t border-outline-variant/30 flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
              <div className="max-w-2xl text-center md:text-left">
                {editingBio ? (
                  <div className="space-y-2 mt-2">
                    <textarea
                      maxLength={300}
                      rows={2}
                      value={bioInput}
                      onChange={(e) => setBioInput(e.target.value)}
                      placeholder="Escribe una pequeña descripción sobre ti..."
                      className="w-full text-sm rounded-xl border border-outline-variant p-3 outline-none focus:ring-2 focus:ring-primary-container/20 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-outline">{bioInput.length}/300</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingBio(false)}
                          className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-100"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={savingBio}
                          onClick={handleSaveBio}
                          className="px-3 py-1.5 rounded-lg bg-primary-container text-white text-xs font-semibold hover:bg-primary"
                        >
                          {savingBio ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {user.bio ? (
                      <p className="text-sm text-on-surface font-medium whitespace-pre-line leading-relaxed">
                        {user.bio}
                      </p>
                    ) : (
                      <p className="text-sm text-outline italic">
                        {isOwnProfile
                          ? 'Aún no has agregado una descripción a tu perfil.'
                          : 'Este usuario aún no ha agregado una descripción.'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {isOwnProfile && !editingBio && (
                <button
                  type="button"
                  onClick={() => setEditingBio(true)}
                  className="text-xs font-semibold text-primary-container hover:underline flex items-center gap-1 shrink-0"
                >
                  <span className="material-symbols-outlined text-[15px]">edit_note</span>
                  <span>{user.bio ? 'Editar descripción' : '+ Agregar descripción'}</span>
                </button>
              )}
            </div>

            {/* PESTAÑAS DE NAVEGACIÓN (TABS) ESTILO FACEBOOK */}
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('posts');
                  setIsEditing(false);
                }}
                className={`py-3 px-4 font-semibold text-sm rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'posts' && !isEditing
                    ? 'text-primary-container bg-primary-container/10 border-b-2 border-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">dynamic_feed</span>
                <span>Publicaciones</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('about');
                  setIsEditing(false);
                }}
                className={`py-3 px-4 font-semibold text-sm rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'about' && !isEditing
                    ? 'text-primary-container bg-primary-container/10 border-b-2 border-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">info</span>
                <span>Información</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('friends');
                  setIsEditing(false);
                }}
                className={`py-3 px-4 font-semibold text-sm rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'friends' && !isEditing
                    ? 'text-primary-container bg-primary-container/10 border-b-2 border-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">group</span>
                <span>Amigos</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-outline">
                  {stats.friendsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('photos');
                  setIsEditing(false);
                }}
                className={`py-3 px-4 font-semibold text-sm rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'photos' && !isEditing
                    ? 'text-primary-container bg-primary-container/10 border-b-2 border-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">photo_library</span>
                <span>Fotos</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-outline">
                  {stats.photosCount}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL POR PESTAÑAS */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {isEditing ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white border border-outline-variant/50 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary-container text-2xl">manage_accounts</span>
                <div>
                  <h2 className="font-bold text-on-surface">Editor de Perfil</h2>
                  <p className="text-xs text-on-surface-variant">Modifica tu biografía, portada, avatar y contraseña.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  fetchProfile();
                }}
                className="px-4 py-2 rounded-xl border border-outline-variant/60 text-xs font-bold hover:bg-gray-100"
              >
                Cerrar editor
              </button>
            </div>
            <ProfileEditor
              onSaved={() => {
                fetchProfile();
                showToast('Perfil actualizado con éxito');
              }}
            />
          </div>
        ) : activeTab === 'posts' ? (
          /* TAB: PUBLICACIONES (Diseño de 2 columnas como Facebook) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Columna Izquierda: Información rápida, Fotos recientes, Amigos */}
            <div className="lg:col-span-5 space-y-6">
              {/* Tarjeta de Presentación / Información */}
              <div className="bg-white border border-outline-variant/50 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-on-surface">Presentación</h3>
                {user.bio && (
                  <p className="text-sm text-on-surface-variant text-center pb-2 border-b border-outline-variant/30">
                    {user.bio}
                  </p>
                )}

                <div className="space-y-3 text-sm text-on-surface-variant">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-outline text-[20px]">badge</span>
                    <span>Perfil {user.profileType === 'business' ? 'Negocio Promexa' : 'Personal'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-outline text-[20px]">location_on</span>
                    <span>Lima, Perú</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-outline text-[20px]">calendar_month</span>
                    <span>
                      Miembro desde{' '}
                      {new Date(user.createdAt).toLocaleDateString('es-ES', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-outline text-[20px]">mail</span>
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>

                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs border border-outline-variant/60 transition-all text-center"
                  >
                    Editar información detallada
                  </button>
                )}
              </div>

              {/* Tarjeta: Fotos recientes (Miniatura de 6 fotos) */}
              <div className="bg-white border border-outline-variant/50 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-on-surface">Fotos</h3>
                    <span className="text-xs text-outline font-semibold">({photos.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('photos')}
                    className="text-xs text-primary-container font-semibold hover:underline"
                  >
                    Ver todas
                  </button>
                </div>

                {photos.length === 0 ? (
                  <p className="text-xs text-outline py-4 text-center">No hay fotos compartidas aún.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.slice(0, 6).map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => setSelectedPhoto(photo.url)}
                        className="aspect-square rounded-xl overflow-hidden bg-surface-container cursor-pointer hover:opacity-90 transition-all group relative"
                      >
                        <img src={photo.url} alt="Foto" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tarjeta: Amigos (Miniatura de 6 amigos) */}
              <div className="bg-white border border-outline-variant/50 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-on-surface">Amigos</h3>
                    <span className="text-xs text-outline">
                      {stats.friendsCount} {stats.friendsCount === 1 ? 'amigo' : 'amigos'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('friends')}
                    className="text-xs text-primary-container font-semibold hover:underline"
                  >
                    Ver todos
                  </button>
                </div>

                {friends.length === 0 ? (
                  <p className="text-xs text-outline py-4 text-center">Sin amigos agregados todavía.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {friends.slice(0, 6).map((friend) => (
                      <Link
                        key={friend.id}
                        href={`/perfil/${friend.id}`}
                        className="flex flex-col items-center text-center group"
                      >
                        <div className="w-full aspect-square rounded-xl overflow-hidden bg-surface-container mb-1.5 shadow-xs group-hover:ring-2 group-hover:ring-primary-container transition-all">
                          <UserAvatar src={friend.avatar || undefined} alt={friend.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs font-semibold text-on-surface truncate w-full group-hover:text-primary-container">
                          {friend.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Columna Derecha: Feed de publicaciones del usuario */}
            <div className="lg:col-span-7 space-y-6">
              {/* Feed de Posts */}
              {posts.length === 0 ? (
                <div className="bg-white border border-outline-variant/50 rounded-2xl p-10 text-center space-y-3 shadow-xs">
                  <span className="material-symbols-outlined text-5xl text-outline">post_add</span>
                  <h3 className="font-bold text-on-surface">No hay publicaciones</h3>
                  <p className="text-sm text-outline">
                    {isOwnProfile
                      ? 'Comparte tus novedades, proyectos o productos en el muro de Promexa.'
                      : `${user.name} todavía no ha realizado publicaciones.`}
                  </p>
                  {isOwnProfile && (
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-container text-white text-xs font-bold hover:bg-primary transition-all mt-2"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      <span>Crear una publicación</span>
                    </Link>
                  )}
                </div>
              ) : (
                posts.map((post) => (
                  <article
                    key={post.id}
                    className="bg-white border border-outline-variant/50 rounded-2xl p-5 shadow-xs space-y-4 animate-fade-in"
                  >
                    {/* Header de post */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={post.authorAvatar || user.avatar || undefined}
                          alt={post.author}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-surface-container"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-on-surface">{post.author}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-outline">
                            <span>{post.time}</span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[13px]">public</span>
                              <span>Público</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contenido de texto */}
                    <p className="text-sm text-on-surface whitespace-pre-line leading-relaxed">
                      {post.content}
                    </p>

                    {/* Etiquetas */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {post.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs font-medium text-primary-container hover:underline cursor-pointer"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Imagen adjunta */}
                    {post.mediaUrl && (
                      <div
                        onClick={() => setSelectedPhoto(post.mediaUrl!)}
                        className="rounded-xl overflow-hidden bg-surface-container cursor-pointer max-h-96 w-full flex items-center justify-center border border-outline-variant/40"
                      >
                        <img
                          src={post.mediaUrl}
                          alt="Contenido multimedia"
                          className="w-full h-full object-cover max-h-96"
                        />
                      </div>
                    )}

                    {/* Barra de likes y comentarios interactiva */}
                    <div className="flex items-center justify-between text-xs text-outline pt-2 border-t border-outline-variant/30">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-primary-container text-white flex items-center justify-center text-[11px]">
                          👍
                        </span>
                        <span>{post.likes} {post.likes === 1 ? 'reacción' : 'reacciones'}</span>
                      </span>
                      <span>{post.comments.length} comentarios</span>
                    </div>

                    {/* Botones de acción del post */}
                    <div className="grid grid-cols-2 gap-2 py-1 border-y border-outline-variant/30">
                      <button
                        type="button"
                        onClick={() => handleLikePost(post.id)}
                        className={`py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                          post.liked
                            ? 'text-primary-container bg-primary-container/10'
                            : 'text-on-surface-variant hover:bg-surface-container'
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-[19px]"
                          style={{ fontVariationSettings: post.liked ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          thumb_up
                        </span>
                        <span>{post.liked ? 'Te gusta' : 'Me gusta'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById(`comment-input-${post.id}`);
                          input?.focus();
                        }}
                        className="py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-all"
                      >
                        <span className="material-symbols-outlined text-[19px]">chat_bubble</span>
                        <span>Comentar</span>
                      </button>
                    </div>

                    {/* Lista de comentarios */}
                    {post.comments.length > 0 && (
                      <div className="space-y-3 pt-2">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="flex items-start gap-2.5">
                            <UserAvatar
                              src={comment.authorAvatar || undefined}
                              alt={comment.author}
                              className="w-8 h-8 rounded-full object-cover mt-0.5"
                            />
                            <div className="bg-surface-container rounded-2xl px-3.5 py-2 max-w-[90%]">
                              <span className="font-bold text-xs text-on-surface block">
                                {comment.author}
                              </span>
                              <p className="text-xs text-on-surface-variant mt-0.5">{comment.text}</p>
                              <span className="text-[10px] text-outline mt-1 block">{comment.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Input para agregar comentario */}
                    <div className="flex items-center gap-2 pt-2">
                      <UserAvatar
                        src={currentUser?.avatar || undefined}
                        alt="Yo"
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                      <div className="flex-1 flex items-center bg-surface-container rounded-xl px-3 py-1.5 border border-outline-variant/40">
                        <input
                          id={`comment-input-${post.id}`}
                          type="text"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) =>
                            setCommentInputs({ ...commentInputs, [post.id]: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddComment(post.id);
                          }}
                          placeholder="Escribe un comentario..."
                          className="w-full bg-transparent text-xs text-on-surface outline-none"
                        />
                        <button
                          type="button"
                          disabled={!commentInputs[post.id]?.trim() || commentingPostId === post.id}
                          onClick={() => handleAddComment(post.id)}
                          className="text-primary-container disabled:opacity-30 hover:scale-110 transition-all p-1"
                        >
                          <span className="material-symbols-outlined text-[18px]">send</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        ) : activeTab === 'friends' ? (
          /* TAB: AMIGOS (Grid completo con buscador) */
          <div className="bg-white border border-outline-variant/50 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/40">
              <div>
                <h2 className="text-xl font-bold text-on-surface">Amigos</h2>
                <p className="text-xs text-outline">{stats.friendsCount} conexiones en Promexa</p>
              </div>

              <div className="w-full sm:w-72 relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-lg">
                  search
                </span>
                <input
                  type="text"
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  placeholder="Buscar amigos..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-outline-variant/60 outline-none focus:border-primary-container"
                />
              </div>
            </div>

            {filteredFriends.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <span className="material-symbols-outlined text-5xl text-outline">group_off</span>
                <p className="text-sm font-semibold text-on-surface">No se encontraron amigos</p>
                <p className="text-xs text-outline">Intenta con otro término de búsqueda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="p-3.5 rounded-2xl border border-outline-variant/50 hover:border-primary-container/40 hover:shadow-sm transition-all flex items-center justify-between gap-3 bg-surface-container/20"
                  >
                    <Link
                      href={`/perfil/${friend.id}`}
                      className="flex items-center gap-3 min-w-0 flex-1 group"
                    >
                      <UserAvatar
                        src={friend.avatar || undefined}
                        alt={friend.name}
                        className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-white"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-sm text-on-surface truncate group-hover:text-primary-container">
                            {friend.name}
                          </span>
                        </div>
                        <span className="text-xs text-outline block truncate">
                          {friend.profileType === 'business' ? 'Negocio' : 'Miembro'}
                        </span>
                      </div>
                    </Link>

                    <Link
                      href={`/mensajes?to=${friend.id}`}
                      className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface shrink-0"
                      title="Enviar mensaje"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'photos' ? (
          /* TAB: FOTOS (Galería visual estilo Facebook) */
          <div className="bg-white border border-outline-variant/50 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/40">
              <div>
                <h2 className="text-xl font-bold text-on-surface">Fotos</h2>
                <p className="text-xs text-outline">{photos.length} fotos compartidas</p>
              </div>
            </div>

            {photos.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <span className="material-symbols-outlined text-6xl text-outline">photo_library</span>
                <p className="text-base font-bold text-on-surface">Sin fotos todavía</p>
                <p className="text-xs text-outline">Las fotos que se suban en posts o portada aparecerán aquí.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedPhoto(photo.url)}
                    className="aspect-square rounded-2xl overflow-hidden bg-surface-container cursor-pointer relative group border border-outline-variant/40 shadow-xs"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Foto'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-end p-3">
                      <p className="text-white text-xs truncate drop-shadow-md">
                        {photo.caption || 'Ver foto completa'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* TAB: INFORMACIÓN */
          <div className="bg-white border border-outline-variant/50 rounded-2xl p-6 shadow-xs space-y-6">
            <h2 className="text-xl font-bold text-on-surface pb-3 border-b border-outline-variant/40">
              Información de {user.name}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información básica */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-outline uppercase tracking-wider">
                  Información Básica
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-outline block">Nombre</span>
                    <span className="font-semibold text-on-surface">{user.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-outline block">Tipo de cuenta</span>
                    <span className="font-semibold text-on-surface capitalize">
                      {user.profileType === 'business' ? 'Cuenta de Negocio / Empresa' : 'Cuenta Personal'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-outline block">Fecha de registro</span>
                    <span className="font-semibold text-on-surface">
                      {new Date(user.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Biografía y Contacto */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-outline uppercase tracking-wider">
                  Biografía & Contacto
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-outline block">Descripción</span>
                    <p className="font-medium text-on-surface whitespace-pre-line mt-0.5">
                      {user.bio || 'Sin descripción ingresada.'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-outline block">Correo electrónico</span>
                    <span className="font-semibold text-on-surface">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-xs text-outline block">Ubicación</span>
                    <span className="font-semibold text-on-surface">Lima, Perú</span>
                  </div>
                </div>
              </div>
            </div>

            {isOwnProfile && (
              <div className="pt-4 border-t border-outline-variant/40 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2.5 rounded-xl bg-primary-container text-white text-sm font-semibold hover:bg-primary transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  <span>Modificar mis datos</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
