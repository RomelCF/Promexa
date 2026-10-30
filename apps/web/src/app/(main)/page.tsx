'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePresence } from '@/lib/use-chat-socket';
import PresenceDot from '@/components/profile/PresenceDot';
import ImagePicker from '@/components/profile/ImagePicker';
import { uploadImage } from '@/lib/upload-image';
import UserAvatar from '@/components/profile/UserAvatar';
import { useAuth } from '@/lib/auth-context';

export interface UserProfileModalData {
  id?: string;
  name: string;
  handle?: string;
  avatar: string;
  isVerified: boolean;
  location?: string;
  bio?: string;
  mutualCount?: number;
  tags?: string[];
  profileType?: 'personal' | 'business';
}

export interface Comment {
  id: string;
  authorId?: string;
  author: string;
  authorAvatar: string;
  isVerified: boolean;
  text: string;
  time: string;
}

export interface Post {
  id: string;
  author: string;
  authorId: string;
  authorHandle: string;
  authorAvatar: string;
  authorProfileType?: 'personal' | 'business';
  isVerified: boolean;
  time: string;
  location: string;
  content: string;
  category: 'ml-graph' | 'following' | 'local';
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
  comments: Comment[];
  isEdited?: boolean;
}

const INITIAL_POSTS: Post[] = [];

const STORAGE_KEY_POSTS = 'promexa_feed_posts_v1';
const STORAGE_KEY_FRIENDS = 'promexa_friends_map_v1';

interface SuggestedContact {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  isVerified: boolean;
  mutualCount: number;
  tags: string[];
  location: string;
  profileType?: 'personal' | 'business';
}

const SUGGESTED_CONTACTS: SuggestedContact[] = [];

export default function HomePage() {
  const { user, token } = useAuth();
  const router = useRouter();

  // currentUser is always set here because the layout only renders this page when user != null
  const currentUser = user;

  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState<'ml-graph' | 'following' | 'local'>('ml-graph');
  const [postContent, setPostContent] = useState('');
  const postInputRef = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    const input = postInputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(Math.max(input.scrollHeight, 180), 420)}px`;
  }, [postContent]);
  const [photo, setPhoto] = useState<File | null>(null);
  const hasAttachedPhoto = Boolean(photo);
  const [publishing, setPublishing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const uploadedPhoto = React.useRef<{ file: File; url: string } | null>(null);
  const [hasAttachedProduct, setHasAttachedProduct] = useState(false);
  const [postVisibility, setPostVisibility] = useState('Público');
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

  // Menú contextual de los 3 puntitos
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);

  // Publicaciones ocultadas por el usuario
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('promexa_hidden_posts');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Modal para editar publicación
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContentText, setEditContentText] = useState<string>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  // Modal de confirmación para eliminar publicación
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState<boolean>(false);

  // Modal para denunciar publicación
  const [reportingPost, setReportingPost] = useState<Post | null>(null);
  const [reportReason, setReportReason] = useState<string>('Spam o publicidad no deseada');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);

  // Cerrar menú de 3 puntitos al hacer click fuera
  React.useEffect(() => {
    if (!activeMenuPostId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-post-menu]')) {
        setActiveMenuPostId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuPostId]);

  // Modal de perfil interactivo
  const [selectedProfile, setSelectedProfile] = useState<UserProfileModalData | null>(null);
  const presence = usePresence([user?.id, ...posts.map(post => post.authorId), selectedProfile?.id, ...SUGGESTED_CONTACTS.map(contact => contact.id)]);

  // Estado de relación de amistad / seguimiento para el perfil seleccionado
  const [profileRelationship, setProfileRelationship] = useState<{
    status: 'SELF' | 'FRIENDS' | 'SENT' | 'RECEIVED' | 'NONE' | 'LOADING';
    friendshipId?: string;
    isBusiness?: boolean;
  }>({ status: 'NONE' });
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  // Consultar estado de relación en backend cuando se abre el modal de perfil
  React.useEffect(() => {
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

    const checkRelationship = async () => {
      try {
        const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('promexa_auth_token') : null);
        const res = await fetch(`/api/users/${selectedProfile.id}/relationship`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setProfileRelationship({
              status: data.status || 'NONE',
              friendshipId: data.friendshipId,
              isBusiness: data.isBusiness || data.targetProfileType === 'business' || selectedProfile.profileType === 'business',
            });
          }
        } else {
          if (isMounted) setProfileRelationship({ status: 'NONE', isBusiness: selectedProfile.profileType === 'business' });
        }
      } catch {
        if (isMounted) setProfileRelationship({ status: 'NONE', isBusiness: selectedProfile.profileType === 'business' });
      }
    };

    checkRelationship();
    return () => {
      isMounted = false;
    };
  }, [selectedProfile, user?.id, token]);

  // Amigos reales cargados desde el backend
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [friendsMap, setFriendsMap] = useState<{ [name: string]: boolean }>({});

  // Comments input by post ID
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});

  // Comments expanded state by post ID (plegados por defecto)
  const [expandedComments, setExpandedComments] = useState<{ [postId: string]: boolean }>({});

  // Followed suggestions state
  const [followedUsers, setFollowedUsers] = useState<{ [userId: string]: boolean }>({});

  // Mensajes no leídos
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Helper para persistir publicaciones
  const persistPosts = (updated: Post[]) => {
    setPosts(updated);
    try {
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving posts to localStorage', e);
    }
  };

  const fetchFriends = React.useCallback(async () => {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('promexa_auth_token') : null);
    if (!authToken) return;

    try {
      const res = await fetch('/api/users/friends', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setFriendsCount(data.length);
          const map: Record<string, boolean> = {};
          data.forEach((f: any) => {
            if (f.name) map[f.name] = true;
          });
          setFriendsMap(map);
        }
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
    }
  }, [token]);

  // Carga y sondeo periódico de amigos
  React.useEffect(() => {
    if (user) {
      fetchFriends();
      const interval = setInterval(fetchFriends, 4000);
      const onFriendshipUpdated = () => fetchFriends();
      window.addEventListener('promexa:friendship-updated', onFriendshipUpdated);
      return () => {
        clearInterval(interval);
        window.removeEventListener('promexa:friendship-updated', onFriendshipUpdated);
      };
    }
  }, [user, fetchFriends]);

  // Carga periódica de mensajes no leídos para el sidebar
  React.useEffect(() => {
    if (!user || !token) {
      setUnreadChatCount(0);
      return;
    }
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/chat/messages', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const msgs = await res.json();
          if (Array.isArray(msgs)) {
            setUnreadChatCount(msgs.filter((m: any) => m.recipientId === user.id && !m.read).length);
          }
        }
      } catch { }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 4000);
    const onRead = () => fetchUnread();
    window.addEventListener('promexa:chat-read', onRead);
    return () => {
      clearInterval(interval);
      window.removeEventListener('promexa:chat-read', onRead);
    };
  }, [user, token]);

  // Carga inicial de publicaciones desde el backend
  React.useEffect(() => {
    if (!token) return;
    const fetchPosts = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        const res = await fetch(`${backendUrl}/posts?category=${activeTab}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setPosts(data);
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching posts from backend:', error);
      }

      // Si el backend falla, mostrar array vacío
      setPosts([]);
    };

    fetchPosts();
  }, [activeTab, token]);

  // Crear nueva publicación
  const handleCreatePost = async () => {
    if (publishing || (!postContent.trim() && !hasAttachedPhoto && !hasAttachedProduct)) return;
    setPublishing(true); setUploadError('');
    try {
      let mediaUrl: string | undefined;
      if (photo) {
        if (uploadedPhoto.current?.file !== photo) {
          uploadedPhoto.current = { file: photo, url: await uploadImage(photo, 'post', token) };
        }
        mediaUrl = uploadedPhoto.current.url;
      }

      // Solo los hashtags que el usuario escriba explícitamente en el contenido
      const matches = postContent.match(/#[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+/g) || [];
      const userTags = Array.from(new Set(matches));

      const postData = {
        authorId: user?.id || '',
        authorAvatar: user?.avatar || '',
        isVerified: user?.isVerified ?? true,
        content: postContent.trim(),
        mediaUrl,
        hasProduct: hasAttachedProduct,
        tags: userTags,
      };

      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        const res = await fetch(`${backendUrl}/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(postData),
        });

        if (res.ok) {
          const data = await res.json();
          const newPost: Post = {
            ...data,
            time: 'Hace un momento',
            comments: [],
          };
          const updated = [newPost, ...posts];
          setPosts(updated);
          try {
            localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(updated));
          } catch (e) {
            console.error('Error saving posts to localStorage', e);
          }
          setPostContent('');
          setPhoto(null); uploadedPhoto.current = null;
          setHasAttachedProduct(false);
          showToast('¡Tu publicación ha sido compartida exitosamente!');
          return;
        }
      } catch (error) {
        console.error('Error creating post:', error);
      }

      setUploadError('No se pudo publicar. Verifica tu sesion y la conexion al servidor.');
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'No se pudo subir la imagen');
    } finally { setPublishing(false); }
  };

  // Toggle Like con persistencia en backend
  const handleToggleLike = async (postId: string) => {
    // Actualización optimista en UI
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const newLiked = !p.liked;
          return {
            ...p,
            liked: newLiked,
            likes: newLiked ? p.likes + 1 : Math.max(0, p.likes - 1),
          };
        }
        return p;
      })
    );

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${backendUrl}/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, liked: data.liked, likes: data.likes } : p
          )
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Toggle Bookmark con persistencia en backend
  const handleToggleBookmark = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const newBookmarked = !p.bookmarked;
          showToast(
            newBookmarked
              ? 'Publicación guardada en tus favoritos'
              : 'Publicación removida de tus favoritos'
          );
          return { ...p, bookmarked: newBookmarked };
        }
        return p;
      })
    );

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${backendUrl}/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, bookmarked: data.bookmarked } : p
          )
        );
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  // Compartir enlace
  const handleSharePost = (postId: string) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/#${postId}`;
      navigator.clipboard?.writeText(url);
      showToast('¡Enlace de la publicación copiado al portapapeles!');
    }
    setActiveMenuPostId(null);
  };

  // Ocultar publicación localmente y en localStorage
  const handleHidePost = (postId: string) => {
    setHiddenPostIds((prev) => {
      const updated = [...prev, postId];
      try {
        localStorage.setItem('promexa_hidden_posts', JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving hidden posts', e);
      }
      return updated;
    });
    setActiveMenuPostId(null);
    showToast('Publicación ocultada de tu feed');
  };

  // Iniciar edición de publicación
  const handleStartEditPost = (post: Post) => {
    setEditingPost(post);
    setEditContentText(post.content);
    setActiveMenuPostId(null);
  };

  // Guardar edición de publicación
  const handleSaveEditPost = async () => {
    if (!editingPost || !editContentText.trim()) return;
    setIsSubmittingEdit(true);

    const newContent = editContentText.trim();
    const postId = editingPost.id;

    // Actualización optimista inmediata
    const updated = posts.map((p) =>
      p.id === postId ? { ...p, content: newContent, isEdited: true } : p
    );
    persistPosts(updated);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${backendUrl}/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newContent }),
      });

      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, ...data, isEdited: true } : p))
        );
      }
    } catch (error) {
      console.error('Error updating post in backend:', error);
    } finally {
      setIsSubmittingEdit(false);
      setEditingPost(null);
      showToast('Publicación editada con éxito');
    }
  };

  // Iniciar eliminación de publicación
  const handleStartDeletePost = (post: Post) => {
    setDeletingPost(post);
    setActiveMenuPostId(null);
  };

  // Confirmar eliminación de publicación
  const handleConfirmDeletePost = async () => {
    if (!deletingPost) return;
    setIsDeletingPost(true);
    const postId = deletingPost.id;

    // Eliminación optimista inmediata
    const updated = posts.filter((p) => p.id !== postId);
    persistPosts(updated);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      await fetch(`${backendUrl}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Error deleting post in backend:', error);
    } finally {
      setIsDeletingPost(false);
      setDeletingPost(null);
      showToast('Publicación eliminada');
    }
  };

  // Iniciar denuncia de publicación
  const handleStartReportPost = (post: Post) => {
    setReportingPost(post);
    setReportReason('Spam o publicidad no deseada');
    setReportDetails('');
    setActiveMenuPostId(null);
  };

  // Enviar denuncia de publicación
  const handleSubmitReport = async () => {
    if (!reportingPost) return;
    setIsSubmittingReport(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      await fetch(`${backendUrl}/posts/${reportingPost.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: reportReason,
          details: reportDetails,
        }),
      });
    } catch (error) {
      console.error('Error sending report:', error);
    } finally {
      setIsSubmittingReport(false);
      setReportingPost(null);
      showToast('Gracias. Tu denuncia ha sido enviada para revisión.');
    }
  };

  // Agregar comentario en un post con persistencia en backend
  const handleAddComment = async (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    setExpandedComments((prev) => ({ ...prev, [postId]: true }));

    // Comentario temporal optimista
    const tempComment: Comment = {
      id: `c-${Date.now()}`,
      author: user?.name || 'Usuario',
      authorAvatar: user?.avatar || '',
      isVerified: user?.isVerified ?? true,
      text,
      time: 'Hace un momento',
    };

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, tempComment] } : p
      )
    );

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${backendUrl}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const savedComment: Comment = await res.json();
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              return {
                ...p,
                comments: p.comments.map((c) =>
                  c.id === tempComment.id ? savedComment : c
                ),
              };
            }
            return p;
          })
        );
        showToast('Comentario publicado');
      } else {
        showToast('No se pudo guardar el comentario');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      showToast('Error de conexión al comentar');
    }
  };

  // Toggle follow
  const handleToggleFollow = (userId: string, userName: string) => {
    setFollowedUsers((prev) => {
      const isFollowing = !prev[userId];
      showToast(isFollowing ? `Ahora sigues a ${userName}` : `Dejaste de seguir a ${userName}`);
      return { ...prev, [userId]: isFollowing };
    });
  };

  // Enviar o gestionar solicitud de amistad
  const handleSendFriendRequest = async (targetId?: string, targetName?: string) => {
    const id = targetId || selectedProfile?.id;
    const name = targetName || selectedProfile?.name || 'este usuario';
    if (!id || friendActionLoading) return;
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('promexa_auth_token') : null);
    if (!authToken) {
      showToast('Debes iniciar sesión para agregar amigos');
      return;
    }

    setFriendActionLoading(true);
    try {
      if (selectedProfile && selectedProfile.id === id && profileRelationship.status === 'RECEIVED' && profileRelationship.friendshipId) {
        // Aceptar solicitud pendiente directamente desde el perfil
        const res = await fetch(`/api/users/friend-requests/${profileRelationship.friendshipId}/accept`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          setProfileRelationship({ status: 'FRIENDS', friendshipId: profileRelationship.friendshipId });
          setFriendsMap((prev) => ({ ...prev, [name]: true }));
          showToast(`¡Ahora tú y ${name} son amigos!`);
          fetchFriends();
        } else {
          showToast('No se pudo aceptar la solicitud');
        }
      } else {
        // Enviar solicitud de amistad al usuario
        const res = await fetch(`/api/users/${id}/friend-request`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (res.ok) {
          const isBusiness = data.isBusiness || data.isFollowing || data.status === 'FRIENDS' || (selectedProfile?.id === id && (selectedProfile.profileType === 'business' || profileRelationship.isBusiness));
          if (isBusiness || data.status === 'FRIENDS') {
            if (selectedProfile && selectedProfile.id === id) {
              setProfileRelationship({ status: 'FRIENDS', friendshipId: data.friendship?.id, isBusiness: true });
            }
            setFriendsMap((prev) => ({ ...prev, [name]: true }));
            showToast(`¡Ahora sigues a ${name}!`);
            fetchFriends();
          } else {
            if (selectedProfile && selectedProfile.id === id) {
              setProfileRelationship({ status: 'SENT', friendshipId: data.friendship?.id });
            }
            setFriendsMap((prev) => ({ ...prev, [name]: true }));
            showToast(`¡Solicitud de amistad enviada a ${name}!`);
          }
        } else {
          showToast(data.message || 'No se pudo procesar la solicitud');
          if (data.status === 'FRIENDS') {
            if (selectedProfile && selectedProfile.id === id) setProfileRelationship({ status: 'FRIENDS', isBusiness: data.isBusiness });
            setFriendsMap((prev) => ({ ...prev, [name]: true }));
            fetchFriends();
          }
          if (data.status === 'REQUEST_SENT' || data.status === 'PENDING') {
            if (selectedProfile && selectedProfile.id === id) setProfileRelationship({ status: 'SENT' });
          }
        }
      }
    } catch (err) {
      console.error('Error handling friend action:', err);
      showToast('Error de conexión al procesar la solicitud');
    } finally {
      setFriendActionLoading(false);
    }
  };

  // Iniciar conversación directa con un usuario o negocio
  const handleStartChat = (name: string, avatar: string, isVerified: boolean, id?: string) => {
    setSelectedProfile(null);
    const params = new URLSearchParams({
      user: name,
      avatar: avatar,
      verified: isVerified ? 'true' : 'false',
    });
    if (id) params.set('userId', id);
    router.push(`/mensajes?${params.toString()}`);
  };

  // Filtrado de publicaciones
  const filteredPosts = posts
    .map((post) =>
      post.authorId === user?.id
        ? { ...post, author: user.name, authorAvatar: user.avatar || '' }
        : post
    )
    .filter((p) => {
      if (hiddenPostIds.includes(p.id)) return false;
      if (activeTab === 'following') return p.category === 'following';
      if (activeTab === 'local') return p.category === 'local' || !!p.linkedProduct;
      return true; // 'ml-graph' shows everything
    });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Toast Notificación Flotante */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#121c2a] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-fadeIn border border-white/10">
          <span className="material-symbols-outlined text-[20px] text-[#16A34A]">check_circle</span>
          <span className="font-body-md text-body-md">{toastMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* COLUMNA IZQUIERDA: Perfil & Navegación (3 cols) */}
        <aside className="hidden lg:flex flex-col lg:col-span-3 gap-space-md sticky top-20">
          {/* Card Perfil Dinámico */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
            <div className="flex items-center gap-space-sm mb-space-sm">
              <div className="relative shrink-0">
                {user?.avatar ? (
                  <UserAvatar
                    alt={user?.name || 'Usuario'}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
                    src={user.avatar}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center ring-2 ring-primary/20">
                    <span className="material-symbols-outlined text-primary text-[24px]">person</span>
                  </div>
                )}
                <PresenceDot online={user ? presence[user.id] : null} className="absolute bottom-0 right-0 w-3 h-3 ring-2 ring-white" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-headline-sm text-headline-sm text-on-surface truncate font-semibold">
                    {user?.name || 'Usuario'}
                  </span>
                </div>
                <span className="font-caption text-caption text-outline truncate">
                  {user?.email || ''} · {user?.profileType === 'business' ? 'Negocio Local' : 'Usuario'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-space-xs py-space-sm my-space-xs bg-surface-container-low rounded-lg text-center">
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {posts.filter((post) => post.authorId === user?.id).length}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Posts</span>
              </div>
              <div className="flex flex-col border-x border-surface-container/60">
                <span className="font-headline-sm text-headline-sm text-primary font-bold">
                  {friendsCount}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Amigos</span>
              </div>

            </div>

            <button type="button" onClick={() => router.push('/perfil')}
              className="mt-space-xs block w-full text-center py-2 rounded-lg bg-surface-container text-primary font-label-md hover:bg-surface-container-high font-semibold">
              Editar perfil
            </button>
          </div>

          {/* Menú de Enlaces Rápidos */}
          <nav className="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm flex flex-col gap-0.5">
            <Link
              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-container text-primary font-body-md-medium text-body-md-medium"
              href="/perfil"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="material-symbols-outlined text-primary text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  person
                </span>
                <span>Mi Perfil</span>
              </div>
            </Link>

            <Link
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors font-body-md text-body-md"
              href="/mis-publicaciones"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-outline text-[20px]">dynamic_feed</span>
                <span>Mis Publicaciones</span>
              </div>
              <span className="font-caption text-caption text-outline">{posts.filter((post) => post.authorId === user?.id).length}</span>
            </Link>

            <Link
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors font-body-md text-body-md"
              href="/marketplace?mine=true"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-outline text-[20px]">storefront</span>
                <span>Mis Productos</span>
              </div>
            </Link>

            <Link
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors font-body-md text-body-md"
              href="/mensajes"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-outline text-[20px]">chat</span>
                <span>Mensajes Directos</span>
              </div>
              {unreadChatCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-xs">
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </span>
              )}
            </Link>

            <Link
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors font-body-md text-body-md"
              href="/guardados"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-outline text-[20px]">bookmark</span>
                <span>Guardados</span>
              </div>
            </Link>
          </nav>

          {/* Resumen P2P */}
          <div className="bg-surface-container-low rounded-xl p-space-md">
            <div className="flex items-center gap-2 text-primary font-label-md text-label-md mb-1 font-semibold">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span>Transacciones P2P Seguras</span>
            </div>
            <p className="font-caption text-caption text-on-surface-variant leading-relaxed">
              Promexa conecta comercios locales con compradores. Todas las transacciones se realizan directamente por mensajería.
            </p>
          </div>
        </aside>

        {/* COLUMNA CENTRAL: Feed Principal (6 cols) */}
        <section className="col-span-1 lg:col-span-6 flex flex-col gap-space-md">
          {/* Caja de Creación de Publicación */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container/60">
            <div className="flex items-start gap-space-sm mb-space-sm">
              {user?.avatar ? (
                <UserAvatar
                  alt={user?.name || 'Avatar'}
                  className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-primary/20"
                  src={user.avatar}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 ring-1 ring-primary/20">
                  <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                </div>
              )}
              <div className="flex-1">
                <textarea
                  ref={postInputRef}
                  aria-label="Contenido de la publicacion"
                  className="min-h-[180px] max-h-[420px] overflow-y-auto w-full bg-surface-container-low focus:bg-surface-container-lowest rounded-lg p-space-sm font-body-md text-body-md text-on-surface placeholder:text-outline resize-none focus:outline-none focus:ring-1 focus:ring-primary-container transition-all"
                  placeholder="¿Qué novedades tienes hoy para tu comunidad o negocio?"
                  rows={6}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                />

                {/* Previews de adjuntos */}
                {(hasAttachedPhoto || hasAttachedProduct) && (
                  <div className="mt-2 p-2 bg-surface-container rounded-lg flex items-center justify-between gap-2 text-label-sm font-label-sm animate-fadeIn">
                    <div className="flex items-center gap-2 truncate">
                      {hasAttachedPhoto && (
                        <span className="px-2 py-0.5 rounded bg-surface-container-lowest text-primary flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">image</span>
                          <span>Foto adjunta</span>
                        </span>
                      )}
                      {hasAttachedProduct && (
                        <span className="px-2 py-0.5 rounded bg-surface-container-lowest text-tertiary-container flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">sell</span>
                          <span>Producto vinculado</span>
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="text-outline hover:text-red-600 transition-colors"
                      onClick={() => {
                        setPhoto(null); uploadedPhoto.current = null;
                        setHasAttachedProduct(false);
                      }}
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs border-t border-surface-container/40">
              <div className="flex items-center gap-1 sm:gap-2">
                <ImagePicker label="Adjuntar foto" file={photo} maxMB={10} disabled={publishing}
                  onChange={setPhoto} onRemove={() => { setPhoto(null); uploadedPhoto.current = null; }} />


                <button
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors font-label-sm text-label-sm ${hasAttachedProduct
                      ? 'bg-amber-100 text-amber-800 font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  type="button"
                  onClick={() => setHasAttachedProduct(!hasAttachedProduct)}
                >
                  <span className="material-symbols-outlined text-tertiary-container text-[18px]">
                    sell
                  </span>
                  <span>Vincular producto</span>
                </button>

                {/* Selector de Visibilidad */}
                <div className="relative inline-block">
                  <button
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm hover:bg-surface-container transition-colors"
                    type="button"
                    onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
                  >
                    <span className="material-symbols-outlined text-[15px]">public</span>
                    <span>{postVisibility}</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
                  </button>

                  {showVisibilityMenu && (
                    <div className="absolute left-0 top-9 w-40 bg-surface-container-lowest rounded-lg shadow-lg border border-outline-variant/30 py-1 z-20 animate-fadeIn">
                      {['Público', 'Solo seguidores', 'Privado'].map((vis) => (
                        <button
                          key={vis}
                          type="button"
                          className="w-full text-left px-3 py-1.5 text-body-md font-body-md text-on-surface hover:bg-surface-container transition-colors"
                          onClick={() => {
                            setPostVisibility(vis);
                            setShowVisibilityMenu(false);
                          }}
                        >
                          {vis}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                className="h-9 px-5 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-body-md-medium text-body-md-medium transition-colors shadow-sm flex items-center gap-1.5 ml-auto active:scale-95 disabled:opacity-50"
                disabled={publishing || (!postContent.trim() && !hasAttachedPhoto && !hasAttachedProduct)}
                type="button"
                onClick={handleCreatePost}
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Publicar</span>
              </button>
            </div>
          </div>

          {/* Tabs de Filtrado del Feed */}
          <div className="bg-surface-container-lowest rounded-xl p-1.5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-1 w-full sm:w-auto">
              <button
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-body-md-medium text-body-md-medium flex items-center justify-center gap-1.5 transition-all ${activeTab === 'ml-graph'
                    ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                type="button"
                onClick={() => setActiveTab('ml-graph')}
              >
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                <span>Para ti (ML Graph)</span>
              </button>

              <button
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-body-md text-body-md flex items-center justify-center gap-1.5 transition-all ${activeTab === 'following'
                    ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                type="button"
                onClick={() => setActiveTab('following')}
              >
                <span className="material-symbols-outlined text-[16px]">group</span>
                <span>Siguiendo</span>
              </button>

              <button
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-body-md text-body-md flex items-center justify-center gap-1.5 transition-all ${activeTab === 'local'
                    ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                type="button"
                onClick={() => setActiveTab('local')}
              >
                <span className="material-symbols-outlined text-[16px]">store</span>
                <span>Negocios locales</span>
              </button>
            </div>

            <button
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-outline hover:text-on-surface rounded-lg font-label-sm text-label-sm transition-colors"
              type="button"
              onClick={() => showToast('Filtro por cercanía activado')}
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span>Filtros</span>
            </button>
          </div>

          {uploadError && <p role="alert" className="text-sm text-red-700">{uploadError}</p>}
          {filteredPosts.map((post) => {
            const authorName = (post.author || '').trim().toLowerCase();
            const currentUserName = (currentUser?.name || '').trim().toLowerCase();
            const currentUserId = (currentUser?.id || (currentUser as any)?.userId || '');
            const postAuthorId = (post.authorId || '');

            const isOwner = Boolean(
              currentUser && (
                (postAuthorId && currentUserId && String(postAuthorId).trim() === String(currentUserId).trim()) ||
                (authorName && currentUserName && authorName === currentUserName) ||
                (post.authorHandle && currentUserName && post.authorHandle.trim().toLowerCase().replace(/^@/, '') === currentUserName.replace(/\s+/g, ''))
              )
            );
            return (
              <article
                key={post.id}
                id={post.id}
                className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm border border-surface-container/50 animate-fadeIn"
              >
                {/* Cabecera del Post */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <div
                      className="relative cursor-pointer group"
                      onClick={() =>
                        setSelectedProfile({
                          id: post.authorId,
                          name: post.author,
                          handle: post.authorHandle,
                          avatar: post.authorAvatar,
                          isVerified: post.isVerified,
                          location: post.location,
                          tags: post.tags,
                          profileType: post.authorProfileType,
                        })
                      }
                      title={`Click para ver perfil de ${post.author}, agregar amigo o conversar`}
                    >
                      <UserAvatar
                        alt={post.author}
                        className="w-11 h-11 rounded-full object-cover ring-1 ring-primary/20 group-hover:ring-2 group-hover:ring-primary group-hover:scale-105 transition-all shadow-xs"
                        src={post.authorAvatar}
                      />
                      <PresenceDot online={presence[post.authorId]} className="absolute bottom-0 right-0 w-3 h-3 ring-2 ring-white" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span
                          className="font-headline-sm text-headline-sm text-on-surface font-semibold hover:text-primary cursor-pointer transition-colors"
                          onClick={() =>
                            setSelectedProfile({
                              id: post.authorId,
                              name: post.author,
                              handle: post.authorHandle,
                              avatar: post.authorAvatar,
                              isVerified: post.isVerified,
                              location: post.location,
                              tags: post.tags,
                              profileType: post.authorProfileType,
                            })
                          }
                        >
                          {post.author}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-caption text-caption text-outline">{post.time}</span>
                        {post.isEdited && (
                          <>
                            <span className="font-caption text-caption text-outline">·</span>
                            <span className="font-caption text-caption text-outline italic font-medium text-on-surface-variant">
                              (editado)
                            </span>
                          </>
                        )}
                        <span className="font-caption text-caption text-outline">·</span>
                        <span className="inline-flex items-center gap-0.5 font-caption text-caption text-outline">
                          <span className="material-symbols-outlined text-[13px]">location_on</span>
                          {post.location}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menú de opciones de publicación (3 puntitos) */}
                  <div className="relative" data-post-menu>
                    <button
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${activeMenuPostId === post.id
                          ? 'bg-surface-container text-primary'
                          : 'text-outline hover:bg-surface-container hover:text-on-surface'
                        }`}
                      type="button"
                      aria-label="Opciones de publicación"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuPostId((prev) => (prev === post.id ? null : post.id));
                      }}
                    >
                      <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                    </button>

                    {/* Dropdown flotante */}
                    {activeMenuPostId === post.id && (
                      <div className="absolute right-0 top-9 w-60 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 py-1.5 z-40 animate-fadeIn divide-y divide-surface-container/60">
                        <div className="py-1">
                          <button
                            type="button"
                            className="w-full px-3.5 py-2 text-left font-body-md text-sm text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors"
                            onClick={() => handleSharePost(post.id)}
                          >
                            <span className="material-symbols-outlined text-[19px] text-primary">link</span>
                            <span>Copiar enlace</span>
                          </button>

                          <button
                            type="button"
                            className="w-full px-3.5 py-2 text-left font-body-md text-sm text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors"
                            onClick={() => handleHidePost(post.id)}
                          >
                            <span className="material-symbols-outlined text-[19px] text-outline">visibility_off</span>
                            <span>Ocultar publicación</span>
                          </button>

                          <button
                            type="button"
                            className="w-full px-3.5 py-2 text-left font-body-md text-sm text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors"
                            onClick={() => handleStartReportPost(post)}
                          >
                            <span className="material-symbols-outlined text-[19px] text-[#F59E0B]">flag</span>
                            <span>Denunciar publicación</span>
                          </button>
                        </div>

                        {/* Opciones exclusivas si es el dueño */}
                        {isOwner && (
                          <div className="py-1">
                            <button
                              type="button"
                              className="w-full px-3.5 py-2 text-left font-body-md text-sm text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors"
                              onClick={() => handleStartEditPost(post)}
                            >
                              <span className="material-symbols-outlined text-[19px] text-primary">edit</span>
                              <span>Editar publicación</span>
                            </button>

                            <button
                              type="button"
                              className="w-full px-3.5 py-2 text-left font-body-md text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors font-medium"
                              onClick={() => handleStartDeletePost(post)}
                            >
                              <span className="material-symbols-outlined text-[19px] text-red-600">delete</span>
                              <span>Eliminar publicación</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Contenido textual */}
                <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>

                {/* Imagen opcional adjunta */}
                {post.mediaUrl && (
                  <div className="rounded-xl overflow-hidden bg-surface-container-low shadow-inner">
                    <img alt="Imagen de la publicacion" className="block w-full h-auto object-contain" src={post.mediaUrl} />
                  </div>
                )}

                {/* Mini-card de Producto Vinculado */}
                {post.linkedProduct && (
                  <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col sm:flex-row items-center gap-space-md hover:shadow-md transition-shadow">
                    <img
                      alt={post.linkedProduct.name}
                      className="w-full sm:w-28 h-28 rounded-lg object-cover shrink-0"
                      src={post.linkedProduct.image}
                    />
                    <div className="flex-1 w-full flex flex-col justify-between py-1">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-[#DCFCE7] text-[#16A34A] flex items-center gap-1 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                            {post.linkedProduct.badge}
                          </span>
                          <span className="font-caption text-caption text-outline">
                            {post.linkedProduct.stock}
                          </span>
                        </div>
                        <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                          {post.linkedProduct.name}
                        </h4>
                        <p className="font-caption text-caption text-on-surface-variant">
                          {post.linkedProduct.details}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-container">
                        <div className="flex items-baseline gap-1">
                          <span className="font-headline-lg text-headline-lg text-on-surface font-bold">
                            S/ {post.linkedProduct.price.toFixed(2)}
                          </span>
                          <span className="font-caption text-caption text-outline">/ unidad</span>
                        </div>
                        <Link
                          href={`/mensajes?userId=${encodeURIComponent(post.authorId)}`}
                          className="h-9 px-4 rounded-lg bg-[#F28C28] hover:bg-tertiary-container text-on-primary font-body-md-medium text-body-md-medium shadow-sm transition-colors flex items-center gap-1.5 font-semibold"
                        >
                          <span className="material-symbols-outlined text-[18px]">chat</span>
                          <span>Coordinar pedido</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tags del post */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-secondary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Botones de acción social */}
                <div className="flex items-center justify-between pt-space-xs text-on-surface-variant font-label-md text-label-md border-t border-surface-container/60">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors ${post.liked ? 'text-primary font-semibold' : ''
                        }`}
                      type="button"
                      onClick={() => handleToggleLike(post.id)}
                    >
                      <span
                        className={`material-symbols-outlined text-[18px] ${post.liked ? 'text-primary' : ''}`}
                        style={{ fontVariationSettings: post.liked ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        thumb_up
                      </span>
                      <span>{post.likes}</span>
                    </button>

                    <button
                      type="button"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${expandedComments[post.id]
                          ? 'text-primary font-semibold bg-surface-container'
                          : 'hover:bg-surface-container text-on-surface-variant'
                        }`}
                      onClick={() =>
                        setExpandedComments((prev) => ({
                          ...prev,
                          [post.id]: !prev[post.id],
                        }))
                      }
                      title={expandedComments[post.id] ? 'Plegar comentarios' : 'Desplegar comentarios'}
                    >
                      <span
                        className={`material-symbols-outlined text-[18px] ${expandedComments[post.id] ? 'text-primary' : ''
                          }`}
                        style={{ fontVariationSettings: expandedComments[post.id] ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        chat_bubble_outline
                      </span>
                      <span>{post.comments.length} comentarios</span>
                      <span className="material-symbols-outlined text-[16px] text-outline ml-0.5">
                        {expandedComments[post.id] ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors ${post.bookmarked ? 'text-primary font-semibold' : ''
                        }`}
                      type="button"
                      onClick={() => handleToggleBookmark(post.id)}
                    >
                      <span
                        className={`material-symbols-outlined text-[18px] ${post.bookmarked ? 'text-primary' : ''
                          }`}
                        style={{ fontVariationSettings: post.bookmarked ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {post.bookmarked ? 'bookmark' : 'bookmark_border'}
                      </span>
                      <span className="hidden sm:inline">Guardar</span>
                    </button>

                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors"
                      type="button"
                      onClick={() => handleSharePost(post.id)}
                    >
                      <span className="material-symbols-outlined text-[18px]">share</span>
                      <span className="hidden sm:inline">Compartir</span>
                    </button>
                  </div>
                </div>

                {/* Hilo de Comentarios */}
                <div className="pt-space-sm flex flex-col gap-space-sm bg-surface-container-low/50 -mx-space-md -mb-space-md p-space-md rounded-b-xl border-t border-surface-container/40">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-space-sm animate-fadeIn">
                      <UserAvatar
                        alt={comment.author}
                        className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-primary/20 cursor-pointer hover:ring-2 hover:ring-primary hover:scale-105 transition-all shadow-xs"
                        src={comment.authorAvatar}
                        onClick={() =>
                          setSelectedProfile({
                            id: comment.authorId,
                            name: comment.author,
                            avatar: comment.authorAvatar,
                            isVerified: comment.isVerified,
                            location: 'Lima, Perú',
                            tags: ['Comunidad Promexa'],
                          })
                        }
                        title={`Click para ver perfil de ${comment.author}, agregar o conversar`}
                      />
                      <div className="flex-1 bg-surface-container-lowest rounded-xl p-space-sm shadow-xs border border-surface-container/50">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1">
                            <span
                              className="font-body-md-medium text-body-md-medium text-on-surface font-semibold hover:text-primary cursor-pointer transition-colors"
                              onClick={() =>
                                setSelectedProfile({
                                  id: comment.authorId,
                                  name: comment.author,
                                  avatar: comment.authorAvatar,
                                  isVerified: comment.isVerified,
                                  location: 'Lima, Perú',
                                  tags: ['Comunidad Promexa'],
                                })
                              }
                            >
                              {comment.author}
                            </span>
                            {comment.isVerified && (
                              <span
                                className="material-symbols-outlined text-primary-container text-[14px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                verified
                              </span>
                            )}
                          </div>
                          <span className="font-caption text-caption text-outline">{comment.time}</span>
                        </div>
                        <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Caja de entrada interactiva para nuevo comentario */}
                  <div className="flex items-center gap-2 pt-space-xs mt-1 border-t border-surface-container/30">
                    {user?.avatar ? (
                      <UserAvatar
                        alt={user?.name || 'Yo'}
                        className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-primary/20"
                        src={user.avatar}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 ring-1 ring-primary/20">
                        <span className="material-symbols-outlined text-primary text-[16px]">person</span>
                      </div>
                    )}
                    <div className="flex-1 relative flex items-center">
                      <input
                        className="w-full h-10 pl-3 pr-10 rounded-lg bg-surface-container-lowest border border-outline-variant/50 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container transition-colors shadow-xs"
                        placeholder={`Escribe un comentario en la publicación de ${post.author}...`}
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) =>
                          setCommentInputs({ ...commentInputs, [post.id]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddComment(post.id);
                          }
                        }}
                      />
                      <button
                        className="absolute right-2 text-primary-container hover:text-primary transition-colors disabled:opacity-30 cursor-pointer"
                        disabled={!(commentInputs[post.id] || '').trim()}
                        type="button"
                        onClick={() => handleAddComment(post.id)}
                      >
                        <span className="material-symbols-outlined text-[20px]">send</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </article>
            );
          })}
        </section>

        {/* COLUMNA DERECHA: Recomendaciones Neo4j Graph Engine (3 cols) */}
        <aside className="hidden lg:flex flex-col lg:col-span-3 gap-space-md sticky top-20">
          <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm border border-surface-container/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[20px]">diversity_3</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Personas que quizás conozcas
                </h3>
              </div>
            </div>
            <p className="font-caption text-caption text-outline -mt-1">
              Sugerencias basadas en tu red local (Neo4j Graph Engine)
            </p>

            <div className="flex flex-col gap-space-sm mt-space-xs">
              {SUGGESTED_CONTACTS.map((contact) => (
                <div
                  key={contact.id}
                  className="flex flex-col gap-1.5 p-2 rounded-xl hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
                      onClick={() =>
                        setSelectedProfile({
                          name: contact.name,
                          handle: contact.handle,
                          avatar: contact.avatar,
                          isVerified: contact.isVerified,
                          location: contact.location,
                          mutualCount: contact.mutualCount,
                          tags: contact.tags,
                        })
                      }
                      title={`Click para ver perfil de ${contact.name}, agregar o conversar`}
                    >
                      <div className="relative shrink-0">
                        <UserAvatar
                          alt={contact.name}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-primary/20 group-hover:ring-2 group-hover:ring-primary group-hover:scale-105 transition-all shadow-xs"
                          src={contact.avatar}
                        />
                        <PresenceDot online={presence[contact.id]} className="absolute -bottom-0.5 -right-0.5 w-3 h-3 ring-2 ring-white" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface truncate font-semibold group-hover:text-primary transition-colors">
                            {contact.name}
                          </span>
                        </div>
                        <span className="font-caption text-caption text-outline truncate">
                          {contact.mutualCount} contactos en común
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        className={`h-8 px-2.5 rounded-lg font-label-md text-label-md transition-all shadow-xs font-semibold flex items-center gap-1 ${friendsMap[contact.name]
                            ? 'bg-[#DCFCE7] text-[#16A34A] hover:bg-[#bbf7d0]'
                            : 'bg-primary-container hover:bg-primary text-on-primary'
                          }`}
                        type="button"
                        onClick={() => handleSendFriendRequest(contact.id, contact.name)}
                        title={
                          friendsMap[contact.name]
                            ? (contact.profileType === 'business' ? 'Siguiendo a este negocio' : 'En tus amigos (Click para cambiar)')
                            : (contact.profileType === 'business' ? `Seguir a ${contact.name}` : `Agregar a ${contact.name}`)
                        }
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {friendsMap[contact.name]
                            ? (contact.profileType === 'business' ? 'check' : 'how_to_reg')
                            : (contact.profileType === 'business' ? 'add' : 'person_add')}
                        </span>
                        <span>
                          {friendsMap[contact.name]
                            ? (contact.profileType === 'business' ? 'Siguiendo' : 'Amigos')
                            : (contact.profileType === 'business' ? 'Seguir' : 'Agregar')}
                        </span>
                      </button>

                      <button
                        className="w-8 h-8 rounded-lg bg-surface-container hover:bg-primary/10 text-primary flex items-center justify-center transition-colors"
                        type="button"
                        onClick={() => handleStartChat(contact.name, contact.avatar, contact.isVerified, contact.id)}
                        title={`Conversar con ${contact.name}`}
                      >
                        <span className="material-symbols-outlined text-[17px]">chat</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 pl-12">
                    {contact.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-full bg-surface-container font-caption text-caption text-on-surface-variant"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              className="mt-2 text-center py-2 rounded-lg text-primary font-label-md text-label-md hover:bg-surface-container-high transition-colors font-semibold"
              type="button"
              onClick={() => showToast('Cargando más personas recomendadas...')}
            >
              Ver más personas sugeridas →
            </button>
          </section>

          {/* Banner de Comercio Directo */}
          <div className="bg-gradient-to-br from-surface-container to-surface-container-high rounded-xl p-space-md shadow-sm flex flex-col gap-2 relative overflow-hidden border border-surface-container">
            <div className="w-20 h-20 bg-primary-container/10 rounded-full absolute -right-6 -bottom-6 pointer-events-none" />
            <div className="flex items-center gap-2 text-primary font-semibold">
              <span className="material-symbols-outlined text-[20px]">handshake</span>
              <span className="font-headline-sm text-headline-sm">Comercio 100% Directo</span>
            </div>
            <p className="font-caption text-caption text-on-surface leading-relaxed">
              Promexa conecta personas y negocios locales sin cobrar comisiones. Todas las entregas y acuerdos se coordinan directamente en el chat.
            </p>
            <div className="pt-1 flex items-center justify-between">
              <span
                className="font-label-sm text-label-sm text-primary font-semibold hover:underline cursor-pointer"
                onClick={() => showToast('Póliza de garantías P2P Promexa')}
              >
                Saber más sobre garantías
              </span>
              <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal de Perfil de Usuario para Agregar Amigos y Conversar */}
      {selectedProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setSelectedProfile(null)}
        >
          <div
            className="bg-surface-container-lowest w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-surface-container/60 transform transition-all animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera con portada decorativa y botón cerrar */}
            <div className="h-28 bg-gradient-to-r from-primary-container via-primary to-primary-container relative p-3 flex justify-end items-start">
              <button
                className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors backdrop-blur-xs"
                type="button"
                onClick={() => setSelectedProfile(null)}
                title="Cerrar"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Contenido del Perfil */}
            <div className="px-6 pb-6 pt-0 relative flex flex-col">
              {/* Avatar grande con overlap */}
              <div className="flex justify-between items-end -mt-12 mb-3">
                <div className="relative">
                  <UserAvatar
                    alt={selectedProfile.name}
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-surface-container-lowest shadow-md bg-white"
                    src={selectedProfile.avatar}
                  />
                  <PresenceDot online={selectedProfile.id ? presence[selectedProfile.id] : null} className="absolute bottom-1 right-1 w-4 h-4 ring-2 ring-white" />
                </div>

                {/* Badge de tipo de perfil */}
                <span className="px-3 py-1 rounded-full font-label-sm text-label-sm bg-surface-container text-on-surface-variant font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    person
                  </span>
                  <span>Miembro Promexa</span>
                </span>
              </div>

              {/* Nombres y Handles */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-headline-sm text-xl text-on-surface font-bold">
                    {selectedProfile.name}
                  </h3>
                </div>
                <span className="font-body-md text-sm text-outline">
                  {selectedProfile.handle || `@${selectedProfile.name.toLowerCase().replace(/\s+/g, '')}`}
                </span>
              </div>

              {/* Ubicación y Conexiones */}
              <div className="flex items-center gap-4 text-xs text-on-surface-variant mt-3">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-outline">location_on</span>
                  {selectedProfile.location || 'Lima, Perú'}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-outline">diversity_3</span>
                  {selectedProfile.mutualCount ? `${selectedProfile.mutualCount} amigos en común` : 'Red local'}
                </span>
              </div>

              {/* Etiquetas */}
              {selectedProfile.tags && selectedProfile.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selectedProfile.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full bg-surface-container font-caption text-caption text-on-surface-variant font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Separador */}
              <div className="h-px bg-surface-container/80 my-4" />

              {/* Botones de acción principales */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                {/* Botón Conversar / Enviar Mensaje */}
                <button
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all transform active:scale-98"
                  type="button"
                  onClick={() =>
                    handleStartChat(
                      selectedProfile.name,
                      selectedProfile.avatar,
                      selectedProfile.isVerified,
                      selectedProfile.id
                    )
                  }
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  <span>Conversar ahora</span>
                </button>

                {/* Botón de amistad o seguimiento con estados reales */}
                {profileRelationship.status !== 'SELF' && (
                  (() => {
                    const isBusiness = Boolean(
                      profileRelationship.isBusiness ||
                      selectedProfile.profileType === 'business'
                    );
                    const isFollowingOrFriends = profileRelationship.status === 'FRIENDS';

                    if (isBusiness) {
                      return (
                        <button
                          className={`py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition-all shadow-xs ${isFollowingOrFriends
                              ? 'bg-[#DCFCE7] text-[#16A34A] border border-[#86EFAC] cursor-default'
                              : 'bg-primary-container hover:bg-primary text-on-primary active:scale-98'
                            }`}
                          type="button"
                          disabled={friendActionLoading || isFollowingOrFriends || profileRelationship.status === 'LOADING'}
                          onClick={() => handleSendFriendRequest()}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {isFollowingOrFriends ? 'check' : 'add'}
                          </span>
                          <span>
                            {friendActionLoading
                              ? 'Procesando...'
                              : profileRelationship.status === 'LOADING'
                                ? 'Verificando...'
                                : isFollowingOrFriends
                                  ? 'Siguiendo'
                                  : 'Seguir'}
                          </span>
                        </button>
                      );
                    }

                    return (
                      <button
                        className={`py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition-all shadow-xs ${profileRelationship.status === 'FRIENDS'
                            ? 'bg-[#DCFCE7] text-[#16A34A] border border-[#86EFAC]'
                            : profileRelationship.status === 'SENT'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 cursor-default'
                              : profileRelationship.status === 'RECEIVED'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                : 'bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/40 active:scale-98'
                          }`}
                        type="button"
                        disabled={
                          friendActionLoading ||
                          profileRelationship.status === 'FRIENDS' ||
                          profileRelationship.status === 'SENT' ||
                          profileRelationship.status === 'LOADING'
                        }
                        onClick={() => handleSendFriendRequest()}
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
                          {friendActionLoading
                            ? 'Enviando...'
                            : profileRelationship.status === 'LOADING'
                              ? 'Verificando...'
                              : profileRelationship.status === 'FRIENDS'
                                ? 'Amigos'
                                : profileRelationship.status === 'SENT'
                                  ? 'Solicitud enviada'
                                  : profileRelationship.status === 'RECEIVED'
                                    ? 'Aceptar solicitud'
                                    : 'Agregar amigo'}
                        </span>
                      </button>
                    );
                  })()
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

              <p className="text-[11px] text-center text-outline mt-3">
                Conecta y chatea en tiempo real con este usuario en Promexa.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Publicación */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-surface-container space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">edit_note</span>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface">Editar publicación</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="font-label-md text-label-md font-medium text-on-surface">
                Contenido de la publicación
              </label>
              <textarea
                value={editContentText}
                onChange={(e) => setEditContentText(e.target.value)}
                rows={4}
                className="w-full p-3.5 rounded-xl border border-outline/30 bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-body-md text-on-surface resize-none transition-all"
                placeholder="¿Qué quieres compartir?"
                autoFocus
              />
              <div className="flex justify-between items-center text-caption font-caption text-outline">
                <span>Puedes incluir hashtags con #</span>
                <span>{editContentText.length} caracteres</span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isSubmittingEdit}
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 rounded-lg border border-outline/30 font-body-md text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmittingEdit || !editContentText.trim()}
                onClick={handleSaveEditPost}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-body-md font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingEdit ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    <span>Guardar cambios</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmación Eliminar Publicación */}
      {deletingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full p-6 border border-surface-container space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">delete_forever</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">¿Eliminar publicación?</h3>
              <p className="font-body-md text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                Esta publicación se borrará permanentemente de tu perfil y del feed de Promexa. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingPost}
                onClick={() => setDeletingPost(null)}
                className="px-4 py-2 rounded-lg border border-outline/30 font-body-md text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingPost}
                onClick={handleConfirmDeletePost}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-body-md font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingPost ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    <span>Eliminar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Denunciar Publicación */}
      {reportingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-surface-container space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#F59E0B] text-[22px]">flag</span>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface">Denunciar publicación</h3>
              </div>
              <button
                type="button"
                onClick={() => setReportingPost(null)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="font-body-md text-sm text-on-surface-variant">
              Ayúdanos a mantener la comunidad segura y confiable. ¿Por qué quieres denunciar esta publicación?
            </p>

            <div className="space-y-2">
              {[
                'Spam o publicidad no deseada',
                'Contenido inapropiado u ofensivo',
                'Información falsa o engañosa',
                'Fraude o estafa comercial',
                'Acoso o incitación al odio',
                'Otro motivo',
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${reportReason === reason
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-surface-container hover:bg-surface-container-low text-on-surface'
                    }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="accent-primary"
                  />
                  <span className="font-body-md text-sm">{reason}</span>
                </label>
              ))}
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="font-label-md text-xs font-medium text-on-surface-variant">
                Detalles adicionales (opcional)
              </label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={2}
                placeholder="Cuéntanos más sobre lo que ocurre..."
                className="w-full p-3 rounded-xl border border-outline/30 bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-body-md text-sm text-on-surface resize-none transition-all"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isSubmittingReport}
                onClick={() => setReportingPost(null)}
                className="px-4 py-2 rounded-lg border border-outline/30 font-body-md text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmittingReport}
                onClick={handleSubmitReport}
                className="px-4 py-2 rounded-lg bg-[#F59E0B] hover:bg-amber-600 text-white font-body-md font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingReport ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    <span>Enviar denuncia</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
