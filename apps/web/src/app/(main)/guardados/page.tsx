'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import UserAvatar from '@/components/profile/UserAvatar';

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
  likes: number;
  liked: boolean;
  bookmarked: boolean;
  comments: Comment[];
  isEdited?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  district: string;
  store: string;
  sellerId?: string;
  isVerified: boolean;
  status: 'Disponible' | 'Reservado';
  image: string;
  createdAt: number;
  contactPhone?: string;
}

export default function GuardadosPage() {
  const { user, token } = useAuth();
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  const favoritesKey = `promexa_marketplace_favorites_v2:${user?.id || ''}`;

  const [activeTab, setActiveTab] = useState<'posts' | 'products'>('posts');
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<{ [id: string]: boolean }>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Cargar publicaciones guardadas (bookmarked = true)
  const fetchSavedPosts = async () => {
    if (!token) {
      setLoadingPosts(false);
      return;
    }
    setLoadingPosts(true);
    try {
      const res = await fetch(`${backendUrl}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const allPosts: Post[] = await res.json();
        setSavedPosts(allPosts.filter((p) => p.bookmarked));
      }
    } catch (e) {
      console.error('Error fetching saved posts:', e);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Cargar productos favoritos guardados
  const fetchSavedProducts = async () => {
    if (!token) {
      setLoadingProducts(false);
      return;
    }
    setLoadingProducts(true);
    try {
      let favs: { [id: string]: boolean } = {};
      try {
        favs = JSON.parse(localStorage.getItem(favoritesKey) || '{}');
      } catch {
        favs = {};
      }
      setFavoriteIds(favs);

      const res = await fetch(`${backendUrl}/marketplace/products`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const allProducts: Product[] = await res.json();
        const favProducts = allProducts.filter((p) => favs[p.id]);
        setSavedProducts(favProducts);
      }
    } catch (e) {
      console.error('Error fetching saved products:', e);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchSavedPosts();
    fetchSavedProducts();
  }, [token, user?.id]);

  // Remover publicación de guardados
  const handleRemoveBookmark = async (postId: string) => {
    setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
    showToast('Publicación removida de guardados');

    try {
      await fetch(`${backendUrl}/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.error('Error removing bookmark:', e);
    }
  };

  // Remover producto de guardados
  const handleRemoveProductFavorite = (productId: string) => {
    const updated = { ...favoriteIds, [productId]: false };
    setFavoriteIds(updated);
    try {
      localStorage.setItem(favoritesKey, JSON.stringify(updated));
    } catch (e) {
      console.error('Error updating favorites:', e);
    }
    setSavedProducts((prev) => prev.filter((p) => p.id !== productId));
    showToast('Producto removido de tus guardados');
  };

  // Like en post
  const handleToggleLike = async (postId: string) => {
    setSavedPosts((prev) =>
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

  // Filtrado por búsqueda
  const filteredPosts = savedPosts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.content.toLowerCase().includes(q) ||
      p.author.toLowerCase().includes(q) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const filteredProducts = savedProducts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.store.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.district.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-on-surface text-surface px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-fadeIn border border-outline-variant/30 text-body-md font-body-md">
          <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bookmark
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-on-surface">Elementos Guardados</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-semibold text-xs">
                {savedPosts.length + savedProducts.length} total
              </span>
            </div>
            <p className="text-sm text-outline mt-0.5">
              Accede rápidamente a tus publicaciones y productos favoritos guardados en Promexa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/"
            className="flex-1 sm:flex-initial h-10 px-4 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-body-md-medium text-body-md-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            <span>Inicio</span>
          </Link>
          <Link
            href="/marketplace"
            className="flex-1 sm:flex-initial h-10 px-4 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-md-medium text-body-md-medium flex items-center justify-center gap-1.5 shadow-sm transition-all font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            <span>Marketplace</span>
          </Link>
        </div>
      </div>

      {/* Tabs y Buscador */}
      <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm border border-surface-container/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'posts'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">dynamic_feed</span>
            <span>Publicaciones</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-xs ${
                activeTab === 'posts'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-surface-container text-outline'
              }`}
            >
              {savedPosts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            <span>Productos</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-xs ${
                activeTab === 'products'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-surface-container text-outline'
              }`}
            >
              {savedProducts.length}
            </span>
          </button>
        </div>

        {/* Buscador dentro de guardados */}
        <div className="relative flex-1 sm:max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder={
              activeTab === 'posts' ? 'Buscar en publicaciones...' : 'Buscar en productos...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-8 bg-surface-container-low rounded-lg border border-surface-container text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Contenido: Tab Publicaciones */}
      {activeTab === 'posts' && (
        <section className="space-y-4">
          {loadingPosts ? (
            <div className="bg-surface-container-lowest rounded-xl p-12 text-center border border-surface-container/60 space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-on-surface-variant text-sm">Cargando tus publicaciones guardadas...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-dashed border-outline-variant/60 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-surface-container flex items-center justify-center text-outline">
                <span className="material-symbols-outlined text-[32px]">bookmark_border</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface">
                  {searchQuery ? 'No se encontraron publicaciones' : 'No tienes publicaciones guardadas'}
                </h3>
                <p className="text-outline text-sm mt-1 max-w-md mx-auto">
                  {searchQuery
                    ? 'No hay publicaciones guardadas que coincidan con tu búsqueda.'
                    : 'Cuando encuentres una publicación interesante en el feed, haz clic en el icono de marcador para guardarla aquí.'}
                </p>
              </div>
              <Link
                href="/"
                className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-semibold text-sm transition-all shadow-sm inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">explore</span>
                <span>Explorar el feed</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container/60 space-y-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        alt={post.author}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-primary/20"
                        src={post.authorAvatar}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-on-surface text-sm">{post.author}</span>
                          {post.isVerified && (
                            <span
                              className="material-symbols-outlined text-primary-container text-[16px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                              title="Verificado"
                            >
                              verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-outline mt-0.5">
                          <span>{post.time}</span>
                          {post.location && (
                            <>
                              <span>·</span>
                              <span>{post.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBookmark(post.id)}
                      className="px-3 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Quitar de guardados"
                    >
                      <span className="material-symbols-outlined text-[16px]">bookmark_remove</span>
                      <span>Quitar</span>
                    </button>
                  </div>

                  <p className="text-on-surface font-body-md whitespace-pre-line leading-relaxed">
                    {post.content}
                  </p>

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

                  {post.mediaUrl && (
                    <div className="rounded-xl overflow-hidden bg-surface-container-low max-h-[380px] flex items-center justify-center border border-surface-container">
                      <img
                        src={post.mediaUrl}
                        alt="Contenido adjunto"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-surface-container text-xs text-on-surface-variant">
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
                          className="material-symbols-outlined text-[16px]"
                          style={{ fontVariationSettings: post.liked ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          favorite
                        </span>
                        <span>{post.likes}</span>
                      </button>

                      <div className="flex items-center gap-1 text-outline">
                        <span className="material-symbols-outlined text-[16px]">chat_bubble_outline</span>
                        <span>{post.comments?.length || 0} comentarios</span>
                      </div>
                    </div>

                    <span className="text-outline flex items-center gap-1 text-xs">
                      <span
                        className="material-symbols-outlined text-primary text-[15px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        bookmark
                      </span>
                      <span>Guardado</span>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Contenido: Tab Productos */}
      {activeTab === 'products' && (
        <section className="space-y-4">
          {loadingProducts ? (
            <div className="bg-surface-container-lowest rounded-xl p-12 text-center border border-surface-container/60 space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-on-surface-variant text-sm">Cargando tus productos favoritos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-dashed border-outline-variant/60 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-surface-container flex items-center justify-center text-outline">
                <span className="material-symbols-outlined text-[32px]">favorite_border</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface">
                  {searchQuery ? 'No se encontraron productos' : 'No tienes productos guardados'}
                </h3>
                <p className="text-outline text-sm mt-1 max-w-md mx-auto">
                  {searchQuery
                    ? 'No hay productos guardados que coincidan con tu búsqueda.'
                    : 'Explora el marketplace y presiona el corazón en los productos que quieras guardar.'}
                </p>
              </div>
              <Link
                href="/marketplace"
                className="px-5 py-2.5 rounded-lg bg-[#F28C28] hover:bg-[#e07b1b] text-white font-semibold text-sm transition-all shadow-sm inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">storefront</span>
                <span>Ir al Marketplace</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-surface-container/60 flex flex-col group"
                >
                  {/* Foto & Badges */}
                  <div className="relative aspect-video w-full bg-surface-container-low overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                        Sin imagen
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm text-xs font-semibold">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          product.status === 'Disponible' ? 'bg-green-600' : 'bg-amber-600'
                        }`}
                      />
                      <span>{product.status}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveProductFavorite(product.id)}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm text-red-600 hover:bg-red-50 flex items-center justify-center shadow-sm transition-colors cursor-pointer"
                      title="Quitar de favoritos"
                    >
                      <span
                        className="material-symbols-outlined text-[18px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        favorite
                      </span>
                    </button>
                  </div>

                  {/* Datos del producto */}
                  <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                    <div>
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="text-xl font-bold text-primary">
                          S/ {product.price.toFixed(2)}
                        </span>
                        <span className="text-xs text-outline bg-surface-container-low px-2 py-0.5 rounded">
                          {product.district}
                        </span>
                      </div>
                      <h4 className="font-semibold text-on-surface line-clamp-1">{product.name}</h4>
                      <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">
                        {product.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-surface-container flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-outline text-[16px] shrink-0">
                          storefront
                        </span>
                        <span className="text-xs text-on-surface-variant truncate font-medium">
                          {product.store}
                        </span>
                      </div>

                      <Link
                        href={`/mensajes?userId=${encodeURIComponent(
                          product.sellerId || ''
                        )}&productId=${encodeURIComponent(product.id)}`}
                        className="h-8 px-3 rounded-lg bg-[#F28C28] hover:bg-[#e07b1b] text-white text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[14px]">chat</span>
                        <span>Contactar</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
