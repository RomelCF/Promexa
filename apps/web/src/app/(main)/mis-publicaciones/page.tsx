'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import UserAvatar from '@/components/profile/UserAvatar';
import ImagePicker from '@/components/profile/ImagePicker';
import { uploadImage } from '@/lib/upload-image';

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
  createdAt?: string;
}

export default function MisPublicacionesPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Formulario nueva publicación
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [publishing, setPublishing] = useState(false);
  const uploadedPhoto = useRef<{ file: File; url: string } | null>(null);

  // Menú contextual y modales
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContentText, setEditContentText] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  // Comentarios expandidos
  const [expandedComments, setExpandedComments] = useState<{ [postId: string]: boolean }>({});
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  // Cargar publicaciones del usuario
  const fetchMyPosts = async () => {
    if (!token || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${backendUrl}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const allPosts: Post[] = await res.json();
        // Filtrar solo las publicaciones del usuario actual
        const myPosts = allPosts.filter((p) => p.authorId === user.id);
        setPosts(myPosts);
      } else {
        setError('No se pudieron cargar tus publicaciones.');
      }
    } catch (err) {
      console.error('Error fetching my posts:', err);
      setError('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPosts();
  }, [token, user?.id]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
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

  // Crear publicación
  const handleCreatePost = async () => {
    if (publishing || (!postContent.trim() && !photo)) return;
    setPublishing(true);
    try {
      let mediaUrl: string | undefined;
      if (photo) {
        if (uploadedPhoto.current?.file !== photo) {
          uploadedPhoto.current = { file: photo, url: await uploadImage(photo, 'post', token) };
        }
        mediaUrl = uploadedPhoto.current.url;
      }

      const matches = postContent.match(/#[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+/g) || [];
      const userTags = Array.from(new Set(matches));

      const postData = {
        authorId: user?.id || '',
        authorAvatar: user?.avatar || '',
        isVerified: user?.isVerified ?? true,
        content: postContent.trim(),
        mediaUrl,
        hasProduct: false,
        tags: userTags,
      };

      const res = await fetch(`${backendUrl}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(postData),
      });

      if (res.ok) {
        const created: Post = await res.json();
        const newPost: Post = {
          ...created,
          time: 'Hace un momento',
          comments: [],
        };
        setPosts((prev) => [newPost, ...prev]);
        setPostContent('');
        setPhoto(null);
        uploadedPhoto.current = null;
        setIsComposerOpen(false);
        showToast('Publicación creada con éxito');
      } else {
        showToast('No se pudo crear la publicación');
      }
    } catch (err) {
      console.error('Error creating post:', err);
      showToast('Error al publicar');
    } finally {
      setPublishing(false);
    }
  };

  // Like
  const handleToggleLike = async (postId: string) => {
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
      await fetch(`${backendUrl}/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.error('Error liking post:', e);
    }
  };

  // Bookmark
  const handleToggleBookmark = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const newBookmarked = !p.bookmarked;
          showToast(newBookmarked ? 'Publicación guardada' : 'Removida de guardados');
          return { ...p, bookmarked: newBookmarked };
        }
        return p;
      })
    );

    try {
      await fetch(`${backendUrl}/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.error('Error toggling bookmark:', e);
    }
  };

  // Guardar edición
  const handleSaveEdit = async () => {
    if (!editingPost || !editContentText.trim() || isSubmittingEdit) return;
    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`${backendUrl}/posts/${editingPost.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editContentText.trim() }),
      });

      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === editingPost.id
              ? { ...p, content: editContentText.trim(), isEdited: true }
              : p
          )
        );
        setEditingPost(null);
        showToast('Publicación actualizada');
      } else {
        showToast('Error al actualizar la publicación');
      }
    } catch {
      showToast('Error de conexión');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Eliminar publicación
  const handleConfirmDelete = async () => {
    if (!deletingPost || isDeletingPost) return;
    setIsDeletingPost(true);
    try {
      const res = await fetch(`${backendUrl}/posts/${deletingPost.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== deletingPost.id));
        setDeletingPost(null);
        showToast('Publicación eliminada correctamente');
      } else {
        showToast('No se pudo eliminar la publicación');
      }
    } catch {
      showToast('Error al eliminar');
    } finally {
      setIsDeletingPost(false);
    }
  };

  // Agregar comentario
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || !user) return;

    try {
      const res = await fetch(`${backendUrl}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          author: user.name,
          authorAvatar: user.avatar || '',
          isVerified: user.isVerified,
          text,
        }),
      });

      if (res.ok) {
        const comment: Comment = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, comments: [...(p.comments || []), { ...comment, time: 'Ahora' }] }
              : p
          )
        );
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
        showToast('Comentario añadido');
      }
    } catch {
      showToast('Error al comentar');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-on-surface text-surface px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-fadeIn border border-outline-variant/30 text-body-md font-body-md">
          <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px]">dynamic_feed</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-on-surface">Mis Publicaciones</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                {posts.length} {posts.length === 1 ? 'publicación' : 'publicaciones'}
              </span>
            </div>
            <p className="text-sm text-outline mt-0.5">
              Gestiona y revisa todas tus publicaciones compartidas en el feed de Promexa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/"
            className="flex-1 sm:flex-initial h-10 px-4 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-body-md-medium text-body-md-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Feed principal</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsComposerOpen(!isComposerOpen)}
            className="flex-1 sm:flex-initial h-10 px-4 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-md-medium text-body-md-medium flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isComposerOpen ? 'close' : 'add'}
            </span>
            <span>{isComposerOpen ? 'Cerrar' : 'Nueva publicación'}</span>
          </button>
        </div>
      </div>

      {/* Caja de Composición rápida (desplegable) */}
      {isComposerOpen && (
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-primary/30 animate-fadeIn space-y-4">
          <div className="flex items-start gap-3">
            {user?.avatar ? (
              <UserAvatar
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-primary/20"
                src={user.avatar}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[20px]">person</span>
              </div>
            )}
            <div className="flex-1">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="¿Qué estás pensando o qué novedad quieres compartir hoy? (puedes usar #hashtags)"
                className="w-full min-h-[110px] p-3 rounded-lg bg-surface-container-low border border-surface-container focus:bg-surface-container-lowest focus:border-primary focus:outline-none text-on-surface font-body-md resize-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-surface-container flex-wrap gap-2">
            <ImagePicker
              label="Adjuntar foto"
              file={photo}
              maxMB={10}
              disabled={publishing}
              onChange={setPhoto}
              onRemove={() => {
                setPhoto(null);
                uploadedPhoto.current = null;
              }}
            />

            <button
              type="button"
              disabled={publishing || (!postContent.trim() && !photo)}
              onClick={handleCreatePost}
              className="h-10 px-5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-md-medium text-body-md-medium transition-all shadow-sm flex items-center gap-1.5 ml-auto active:scale-95 disabled:opacity-50 cursor-pointer font-semibold"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>{publishing ? 'Publicando...' : 'Publicar'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Listado de publicaciones */}
      {loading ? (
        <div className="bg-surface-container-lowest rounded-xl p-12 text-center border border-surface-container/60 space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-on-surface-variant font-body-md">Cargando tus publicaciones...</p>
        </div>
      ) : error ? (
        <div className="bg-surface-container-lowest rounded-xl p-8 text-center border border-red-200 space-y-3">
          <span className="material-symbols-outlined text-red-500 text-[36px]">error</span>
          <p className="text-red-700 font-body-md">{error}</p>
          <button
            type="button"
            onClick={fetchMyPosts}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary-container"
          >
            Reintentar
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-dashed border-outline-variant/60 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-surface-container flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-[32px]">post_add</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-on-surface">Aún no tienes publicaciones</h3>
            <p className="text-outline text-sm mt-1 max-w-md mx-auto">
              Comparte novedades con tus vecinos, amigos y clientes. ¡Crea tu primera publicación ahora!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsComposerOpen(true)}
            className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-md-medium text-body-md-medium transition-all shadow-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Crear mi primera publicación</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container/60 space-y-4 transition-all"
            >
              {/* Header del post */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    alt={post.author}
                    className="w-11 h-11 rounded-full object-cover ring-1 ring-primary/20"
                    src={post.authorAvatar}
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-on-surface">{post.author}</span>
                      {post.isVerified && (
                        <span
                          className="material-symbols-outlined text-primary-container text-[16px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                          title="Verificado"
                        >
                          verified
                        </span>
                      )}
                      <span className="px-2 py-0.2 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                        Tú
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-outline mt-0.5">
                      <span>{post.time}</span>
                      {post.isEdited && <span className="italic text-on-surface-variant">(editado)</span>}
                      {post.location && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]">location_on</span>
                            {post.location}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Menú de opciones de publicación */}
                <div className="relative" data-post-menu>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuPostId((prev) => (prev === post.id ? null : post.id));
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                  </button>

                  {activeMenuPostId === post.id && (
                    <div className="absolute right-0 top-9 w-44 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container py-1.5 z-30 animate-fadeIn">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPost(post);
                          setEditContentText(post.content);
                          setActiveMenuPostId(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px] text-outline">edit</span>
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingPost(post);
                          setActiveMenuPostId(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer font-medium"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        <span>Eliminar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Contenido del post */}
              <p className="text-on-surface font-body-md whitespace-pre-line leading-relaxed">
                {post.content}
              </p>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-surface-container text-primary text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Imagen adjunta */}
              {post.mediaUrl && (
                <div className="rounded-xl overflow-hidden bg-surface-container-low max-h-[420px] flex items-center justify-center border border-surface-container">
                  <img
                    src={post.mediaUrl}
                    alt="Contenido multimedia"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Barra de interacción */}
              <div className="flex items-center justify-between pt-2 border-t border-surface-container text-sm text-on-surface-variant">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(post.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      post.liked
                        ? 'text-red-600 font-semibold bg-red-50'
                        : 'hover:bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{ fontVariationSettings: post.liked ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      favorite
                    </span>
                    <span>{post.likes}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-surface-container transition-colors cursor-pointer text-on-surface-variant"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
                    <span>{post.comments?.length || 0}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleBookmark(post.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    post.bookmarked
                      ? 'text-primary font-semibold bg-primary/10'
                      : 'hover:bg-surface-container text-outline'
                  }`}
                  title="Guardar publicación"
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ fontVariationSettings: post.bookmarked ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {post.bookmarked ? 'bookmark' : 'bookmark_border'}
                  </span>
                  <span className="hidden sm:inline">Guardar</span>
                </button>
              </div>

              {/* Sección de comentarios desplegable */}
              {expandedComments[post.id] && (
                <div className="pt-3 border-t border-surface-container space-y-3 animate-fadeIn">
                  {post.comments && post.comments.length > 0 && (
                    <div className="max-h-[250px] overflow-y-auto space-y-2.5 pl-2 pr-2 custom-scrollbar">
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="flex items-start gap-2.5 text-xs">
                          <UserAvatar
                            alt={comment.author}
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                            src={comment.authorAvatar}
                          />
                          <div className="bg-surface-container-low rounded-xl px-3 py-2 flex-1">
                            <span className="font-semibold text-on-surface">{comment.author}: </span>
                            <span className="text-on-surface-variant">{comment.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input nuevo comentario */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Escribe un comentario..."
                      value={commentInputs[post.id] || ''}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment(post.id);
                      }}
                      className="flex-1 h-9 px-3 bg-surface-container-low rounded-lg border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddComment(post.id)}
                      className="h-9 px-3 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors cursor-pointer"
                    >
                      Comentar
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Modal Editar Publicación */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-surface-container animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <h3 className="text-lg font-bold text-on-surface">Editar publicación</h3>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <textarea
              value={editContentText}
              onChange={(e) => setEditContentText(e.target.value)}
              className="w-full min-h-[140px] p-3 rounded-xl bg-surface-container-low border border-surface-container text-on-surface font-body-md focus:outline-none focus:border-primary resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 rounded-lg border border-surface-container text-on-surface-variant hover:bg-surface-container font-medium text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmittingEdit || !editContentText.trim()}
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingEdit ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar Publicación */}
      {deletingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl border border-surface-container animate-scaleUp">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">delete</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface">¿Eliminar publicación?</h3>
            </div>

            <p className="text-sm text-on-surface-variant leading-relaxed">
              Esta acción no se puede deshacer. Tu publicación y sus comentarios se eliminarán permanentemente.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPost(null)}
                className="px-4 py-2 rounded-lg border border-surface-container text-on-surface-variant hover:bg-surface-container font-medium text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingPost}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isDeletingPost ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
