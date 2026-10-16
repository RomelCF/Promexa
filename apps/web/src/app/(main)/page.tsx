'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export interface Comment {
  id: string;
  author: string;
  authorAvatar: string;
  isVerified: boolean;
  text: string;
  time: string;
}

export interface Post {
  id: string;
  author: string;
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
}

const INITIAL_POSTS: Post[] = [
  {
    id: 'post-1',
    author: 'Café & Tostaduría Don Pedro',
    authorHandle: '@cafedonpedro',
    authorAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAVmOH_0LfgKtRrDGfcsmpwLcxKI-qogdYhZsxdqQoOmMDkrE_vsjcq7ZSrbmIc64hmGsuXThjH01bweDQ86iBMNYKYJvijWqr8udkZt0Fv2OzjScCgTqltUH_mqfJVrcCl1bAUCCuWhpiwhIj8nALEatyqGmn2ozrHL0iKq-MwPKzX8ahWnKverkC3WoDO39ecYoRUTWg8KCnqyu8P3gsvX39oXxxL3JePZdazD94',
    isVerified: true,
    time: 'Hace 20 min',
    location: 'Villa Rica / Miraflores',
    content:
      '¡Llegó la nueva cosecha de café de especialidad de Villa Rica! Notas a chocolate fino y frutos secos caramelizados. Ya disponible para recoger en tienda o coordinar por chat directo en Promexa. Envíos el mismo día. ☕✨',
    category: 'local',
    tags: ['#CafeEspecial', '#VillaRica', '#ComercioLocal'],
    linkedProduct: {
      name: 'Café Especial Villa Rica 500g',
      price: 38.0,
      badge: 'Disponible',
      stock: 'Stock: 24 bolsas',
      details: 'Tueste medio · Origen único · Certificación orgánica',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBfWrLJ1V3c6Jb9K8w3Zq-cKc7qSLKU79cjiI9iTBrhXaOBne7JqYkQbH4-q1EbqajbZiTt9K2o9-79GgsjXm9gRAA3FzZ4h3gUK9ibFRc9fzCL0nK8oKWMRoTFKJ8f241YtCoWsa1mJOZEt83AakjfSFIb8yazduejMbjC3arYZgbLJGEQsjyv2LCZWCuEgWndVyJuIBJKfHAaOA2wgEsAvMxaMp7qe8gOOUtZpl8',
    },
    likes: 48,
    liked: false,
    bookmarked: false,
    comments: [
      {
        id: 'c-1',
        author: 'Lucía Valenzuela',
        authorAvatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAW3jNq8mmlQrij_5yuwgR6RLmxDQkghb67R39w3_CFOvKn7Zj77Vhf75Ix2rKKdLNyHUJksp23eBjQ3knwQCAZhRzZHXdzeXnhPC0c56vsVJq3QZ6Wat3KC2QJ_9ocX2IfJVuFDNZchuG02Vr7JdVfX5a9GZ7gXgC_i52g0NZVKUNEB6b-CaWu02_mxYafd3RIh_j1LsW0kzRYW8kJURtEJZ1KZQet-NpunzUX9ys',
        isVerified: false,
        text: '¿Tienen molienda para prensa francesa o viene solo en grano entero?',
        time: 'Hace 12 min',
      },
      {
        id: 'c-2',
        author: 'Café & Tostaduría Don Pedro',
        authorAvatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAhJ61w5_4VsUw3M2vK-Et3MCFxnmCP_Gq3u9aHKjZ0nxeTw3NOhpoSsgRS4zJ-IGVbD6jnuyyF4zAu6GyMwsq0VPJY1t83Vla1bwE37oNjPOAou139ui4v6UbBzZJmGPII9aFDwtaqzOKn_TclJ-wqADTSWLknIK8QhJgb3mWJbNCeLA-R-7JwlCdQPmKtiNAwQSUeZL8ra2Wle55GN3L3Jg4UG-IsrCnqiGpc164',
        isVerified: true,
        text: '¡Hola Lucía! Sí, te lo molemos al instante según el método que uses sin costo extra. Escríbenos al chat para coordinarlo.',
        time: 'Hace 5 min',
      },
    ],
  },
  {
    id: 'post-2',
    author: 'Mariana Silva',
    authorHandle: '@marianasilva',
    authorAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAshKA2F6OeAr--bAsNxa2jZHsux0iMsWXsROkhcbPVr0wGaswS5OIBf5an35Bg8oEmHcBcv_RPcCUL17B7tTuvf6l5K0Qns8TGbg7BuBw0XNSWRTkYHtzxxt4-YUznJ9hb92FK6v83HpKCKwSgGb2RK7o5sp5DcuB3q2THFoz4xG0bP38-CqntKpGU7klU9rE82OjUUXm3sGnZ6_dD6jR_LaMJpEBXVeaHvfqQNYw',
    isVerified: false,
    time: 'Hace 2 horas',
    location: 'San Isidro, Lima',
    content:
      '¿Alguien recomienda un buen diseñador de interiores para remodelar un local comercial en San Isidro? Buscamos referencias de profesionales locales con experiencia en retail moderno y habilitación rápida. ¡Agradezco sus contactos!',
    category: 'ml-graph',
    tags: ['#DiseñoInteriores', '#SanIsidroComercial', '#NegociosLocales'],
    likes: 18,
    liked: false,
    bookmarked: false,
    comments: [
      {
        id: 'c-3',
        author: 'Muebles & Diseño',
        authorAvatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAdUConcX2iKBR0Cby8eYe3xaPphMY03YIwR75SH20THF7c9Go4mrxUcfMTTQFABav0sDOjm8G7KjNaZjI-UkDMPWV0Cc2ijJ4rDaADZVLKChwwsC6q5jrUqnMWklwyAM8Wqn-xGSHRPtEnMjFDw9rSQd9fCya1Dcj3LEEeyz-eJpNBjKj-Mmv0JTPHrdXdHkMQMlIEKPqfkPwBPqNMRnmMs9K31Yo1EFBRko7TjdA',
        isVerified: true,
        text: 'Hola Mariana, nosotros nos especializamos en diseño y mobiliario comercial en Lima. Puedes contactarnos por chat y te enviamos nuestro catálogo.',
        time: 'Hace 45 min',
      },
    ],
  },
];

const STORAGE_KEY_POSTS = 'promexa_feed_posts_v1';

export default function HomePage() {
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState<'ml-graph' | 'following' | 'local'>('ml-graph');
  const [postContent, setPostContent] = useState('');
  const [hasAttachedPhoto, setHasAttachedPhoto] = useState(false);
  const [hasAttachedProduct, setHasAttachedProduct] = useState(false);
  const [postVisibility, setPostVisibility] = useState('Público');
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

  // Comments input by post ID
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});

  // Followed suggestions state
  const [followedUsers, setFollowedUsers] = useState<{ [userId: string]: boolean }>({});

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

  // Carga inicial persistente de publicaciones
  React.useEffect(() => {
    try {
      const local = localStorage.getItem(STORAGE_KEY_POSTS);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Limpiar hashtags automáticos (#ComunidadPromexa, #Novedades) de pruebas previas
          const cleaned = parsed.map((p: Post) => ({
            ...p,
            tags: (p.tags || []).filter(
              (t: string) => t !== '#ComunidadPromexa' && t !== '#Novedades'
            ),
          }));
          setPosts(cleaned);
          localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(cleaned));
          return;
        }
      }
      // Si no hay datos guardados aún, persistir la lista inicial
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(INITIAL_POSTS));
      setPosts(INITIAL_POSTS);
    } catch {
      setPosts(INITIAL_POSTS);
    }
  }, []);

  // Crear nueva publicación
  const handleCreatePost = async () => {
    if (!postContent.trim() && !hasAttachedPhoto && !hasAttachedProduct) return;

    // Solo los hashtags que el usuario escriba explícitamente en el contenido
    const matches = postContent.match(/#[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+/g) || [];
    const userTags = Array.from(new Set(matches));

    const newPost: Post = {
      id: `post-${Date.now()}`,
      author: user?.name || 'Carlos Mendoza',
      authorHandle: `@${(user?.name || 'usuario').toLowerCase().replace(/\s+/g, '')}`,
      authorAvatar:
        user?.avatar ||
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAH3UDaH5S4ho_6H4oKGGbzvRDc6LorHWo-1pfiUJf12W1Auj4lfoQJv49kAmTodxRQ2qjn9Gw3OCKEgNjPAaYs7bWaSTa1ib_zIwwkI7_Q-YO8vrIQcqc93EcFCKTlM8e8icVlD5kHDDY2RToEXmganGu3acS1w16yAXHMOQI9YlC8xg_qHtttlbMKoseK0hFBvd51mYVAjPwV2omGzRF7l9YtdZHuawkgmcCUf4Q',
      isVerified: user?.isVerified ?? true,
      time: 'Hace un momento',
      location: 'Lima, Perú',
      content: postContent.trim(),
      category: 'following',
      tags: userTags,
      mediaUrl: hasAttachedPhoto
        ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuBg21NIl8VdFPryF6IWY-blXSc13SLNb4Sl7Q9l8EWc2PLSRgFGRh0sujb6aUCKCUYPDPiOiITsYoFh-jk5Kn13VWgSeKG-xa-eUIQ_KOQZoBC4B7-zyLcvi6Jcv1PM5I-q2XaynJA_RoFH4LNb9KCKa6L4xSiHeqtQjEh4MM_aAXm1I2VFbn6GKlfDYzJOQjAwai280GrID5emqvvty-Skt8vBumoZrOc2D6TQrlo'
        : undefined,
      linkedProduct: hasAttachedProduct
        ? {
            name: 'Producto Destacado Promexa',
            price: 65.0,
            badge: 'Disponible',
            stock: 'Stock: Disponible',
            details: 'Producto verificado por comerciante local',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuBg21NIl8VdFPryF6IWY-blXSc13SLNb4Sl7Q9l8EWc2PLSRgFGRh0sujb6aUCKCUYPDPiOiITsYoFh-jk5Kn13VWgSeKG-xa-eUIQ_KOQZoBC4B7-zyLcvi6Jcv1PM5I-q2XaynJA_RoFH4LNb9KCKa6L4xSiHeqtQjEh4MM_aAXm1I2VFbn6GKlfDYzJOQjAwai280GrID5emqvvty-Skt8vBumoZrOc2D6TQrlo',
          }
        : undefined,
      likes: 0,
      liked: false,
      bookmarked: false,
      comments: [],
    };

    const updated = [newPost, ...posts];
    persistPosts(updated);

    // Sync con API en segundo plano
    fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPost),
    }).catch(() => {});

    setPostContent('');
    setHasAttachedPhoto(false);
    setHasAttachedProduct(false);
    showToast('¡Tu publicación ha sido compartida y guardada exitosamente!');
  };

  // Toggle Like con persistencia
  const handleToggleLike = (postId: string) => {
    const updated = posts.map((p) => {
      if (p.id === postId) {
        const newLiked = !p.liked;
        return {
          ...p,
          liked: newLiked,
          likes: newLiked ? p.likes + 1 : Math.max(0, p.likes - 1),
        };
      }
      return p;
    });
    persistPosts(updated);
  };

  // Toggle Bookmark con persistencia
  const handleToggleBookmark = (postId: string) => {
    const updated = posts.map((p) => {
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
    });
    persistPosts(updated);
  };

  // Compartir enlace
  const handleSharePost = (postId: string) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/#${postId}`;
      navigator.clipboard?.writeText(url);
      showToast('¡Enlace de la publicación copiado al portapapeles!');
    }
  };

  // Agregar comentario en un post con persistencia
  const handleAddComment = (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      author: user?.name || 'Carlos Mendoza',
      authorAvatar:
        user?.avatar ||
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAH3UDaH5S4ho_6H4oKGGbzvRDc6LorHWo-1pfiUJf12W1Auj4lfoQJv49kAmTodxRQ2qjn9Gw3OCKEgNjPAaYs7bWaSTa1ib_zIwwkI7_Q-YO8vrIQcqc93EcFCKTlM8e8icVlD5kHDDY2RToEXmganGu3acS1w16yAXHMOQI9YlC8xg_qHtttlbMKoseK0hFBvd51mYVAjPwV2omGzRF7l9YtdZHuawkgmcCUf4Q',
      isVerified: user?.isVerified ?? true,
      text,
      time: 'Hace un momento',
    };

    const updated = posts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [...p.comments, newComment],
        };
      }
      return p;
    });

    persistPosts(updated);
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    showToast('Comentario publicado');
  };

  // Toggle follow
  const handleToggleFollow = (userId: string, userName: string) => {
    setFollowedUsers((prev) => {
      const isFollowing = !prev[userId];
      showToast(isFollowing ? `Ahora sigues a ${userName}` : `Dejaste de seguir a ${userName}`);
      return { ...prev, [userId]: isFollowing };
    });
  };

  // Filtrado de publicaciones
  const filteredPosts = posts.filter((p) => {
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
                <img
                  alt={user?.name || 'Usuario'}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
                  src={
                    user?.avatar ||
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuAH3UDaH5S4ho_6H4oKGGbzvRDc6LorHWo-1pfiUJf12W1Auj4lfoQJv49kAmTodxRQ2qjn9Gw3OCKEgNjPAaYs7bWaSTa1ib_zIwwkI7_Q-YO8vrIQcqc93EcFCKTlM8e8icVlD5kHDDY2RToEXmganGu3acS1w16yAXHMOQI9YlC8xg_qHtttlbMKoseK0hFBvd51mYVAjPwV2omGzRF7l9YtdZHuawkgmcCUf4Q'
                  }
                />
                <span
                  className="absolute bottom-0 right-0 w-3 h-3 bg-[#16A34A] rounded-full ring-2 ring-surface-container-lowest"
                  title="En línea"
                />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-headline-sm text-headline-sm text-on-surface truncate font-semibold">
                    {user?.name || 'Carlos Mendoza'}
                  </span>
                  {user?.isVerified && (
                    <span
                      className="material-symbols-outlined text-primary-container text-[18px] shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      title="Negocio Verificado"
                    >
                      verified
                    </span>
                  )}
                </div>
                <span className="font-caption text-caption text-outline truncate">
                  {user?.email || 'carlos@promexa.com'} · {user?.profileType === 'business' ? 'Negocio Local' : 'Usuario'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-space-xs py-space-sm my-space-xs bg-surface-container-low rounded-lg text-center">
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {posts.length}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Publicaciones</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-primary font-bold">1.4k</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Seguidores</span>
              </div>
            </div>

            <Link
              href="/marketplace"
              className="mt-space-xs block w-full text-center py-2 rounded-lg bg-surface-container text-primary font-label-md text-label-md hover:bg-surface-container-high transition-colors font-semibold"
            >
              Gestionar Perfil Comercial
            </Link>
          </div>

          {/* Menú de Enlaces Rápidos */}
          <nav className="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm flex flex-col gap-0.5">
            <Link
              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-container text-primary font-body-md-medium text-body-md-medium"
              href="/"
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
              href="/"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-outline text-[20px]">dynamic_feed</span>
                <span>Mis Publicaciones</span>
              </div>
              <span className="font-caption text-caption text-outline">{posts.length}</span>
            </Link>

            <Link
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors font-body-md text-body-md"
              href="/marketplace"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-outline text-[20px]">storefront</span>
                <span>Mis Productos</span>
              </div>
              <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-[#DCFCE7] text-[#16A34A] font-medium">
                3 activos
              </span>
            </Link>

            <Link
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors font-body-md text-body-md"
              href="/mensajes"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-outline text-[20px]">chat</span>
                <span>Mensajes Directos</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </Link>

            <button
              type="button"
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors font-body-md text-body-md text-left"
              onClick={() => showToast('Sección de guardados sincronizada')}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-outline text-[20px]">bookmark</span>
                <span>Guardados</span>
              </div>
            </button>
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
              <img
                alt={user?.name || 'Avatar'}
                className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-primary/20"
                src={
                  user?.avatar ||
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuAH3UDaH5S4ho_6H4oKGGbzvRDc6LorHWo-1pfiUJf12W1Auj4lfoQJv49kAmTodxRQ2qjn9Gw3OCKEgNjPAaYs7bWaSTa1ib_zIwwkI7_Q-YO8vrIQcqc93EcFCKTlM8e8icVlD5kHDDY2RToEXmganGu3acS1w16yAXHMOQI9YlC8xg_qHtttlbMKoseK0hFBvd51mYVAjPwV2omGzRF7l9YtdZHuawkgmcCUf4Q'
                }
              />
              <div className="flex-1">
                <textarea
                  className="w-full bg-surface-container-low focus:bg-surface-container-lowest rounded-lg p-space-sm font-body-md text-body-md text-on-surface placeholder:text-outline resize-none focus:outline-none focus:ring-1 focus:ring-primary-container transition-all"
                  placeholder="¿Qué novedades tienes hoy para tu comunidad o negocio?"
                  rows={2}
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
                        setHasAttachedPhoto(false);
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
                <button
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors font-label-sm text-label-sm ${
                    hasAttachedPhoto
                      ? 'bg-primary-container/10 text-primary-container font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                  type="button"
                  onClick={() => setHasAttachedPhoto(!hasAttachedPhoto)}
                >
                  <span className="material-symbols-outlined text-primary-container text-[18px]">
                    image
                  </span>
                  <span>Foto/Video</span>
                </button>

                <button
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors font-label-sm text-label-sm ${
                    hasAttachedProduct
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
                disabled={!postContent.trim() && !hasAttachedPhoto && !hasAttachedProduct}
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
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-body-md-medium text-body-md-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'ml-graph'
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
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-body-md text-body-md flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'following'
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
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-body-md text-body-md flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'local'
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

          {/* LISTA DINÁMICA DE PUBLICACIONES */}
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm border border-surface-container/50 animate-fadeIn"
            >
              {/* Cabecera del Post */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <div className="relative">
                    <img
                      alt={post.author}
                      className="w-11 h-11 rounded-full object-cover ring-1 ring-primary/20"
                      src={post.authorAvatar}
                    />
                    {post.isVerified && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#16A34A] rounded-full ring-2 ring-surface-container-lowest" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                        {post.author}
                      </span>
                      {post.isVerified && (
                        <span
                          className="material-symbols-outlined text-primary-container text-[18px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                          title="Negocio Verificado"
                        >
                          verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-caption text-caption text-outline">{post.time}</span>
                      <span className="font-caption text-caption text-outline">·</span>
                      <span className="inline-flex items-center gap-0.5 font-caption text-caption text-outline">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                        {post.location}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors"
                  type="button"
                  onClick={() => showToast('Opciones de publicación')}
                >
                  <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                </button>
              </div>

              {/* Contenido textual */}
              <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-line">
                {post.content}
              </p>

              {/* Imagen opcional adjunta */}
              {post.mediaUrl && (
                <div className="rounded-xl overflow-hidden bg-surface-container-low max-h-80 shadow-inner">
                  <img alt="Media adjunta" className="w-full h-full object-cover" src={post.mediaUrl} />
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
                        href="/mensajes"
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors ${
                      post.liked ? 'text-primary font-semibold' : ''
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

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
                    <span>{post.comments.length} comentarios</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors ${
                      post.bookmarked ? 'text-primary font-semibold' : ''
                    }`}
                    type="button"
                    onClick={() => handleToggleBookmark(post.id)}
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        post.bookmarked ? 'text-primary' : ''
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
                    <img
                      alt={comment.author}
                      className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-primary/20"
                      src={comment.authorAvatar}
                    />
                    <div className="flex-1 bg-surface-container-lowest rounded-xl p-space-sm shadow-xs border border-surface-container/50">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface font-semibold">
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
                <div className="flex items-center gap-2 pt-space-xs mt-1">
                  <img
                    alt={user?.name || 'Yo'}
                    className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-primary/20"
                    src={
                      user?.avatar ||
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuAH3UDaH5S4ho_6H4oKGGbzvRDc6LorHWo-1pfiUJf12W1Auj4lfoQJv49kAmTodxRQ2qjn9Gw3OCKEgNjPAaYs7bWaSTa1ib_zIwwkI7_Q-YO8vrIQcqc93EcFCKTlM8e8icVlD5kHDDY2RToEXmganGu3acS1w16yAXHMOQI9YlC8xg_qHtttlbMKoseK0hFBvd51mYVAjPwV2omGzRF7l9YtdZHuawkgmcCUf4Q'
                    }
                  />
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
                      className="absolute right-2 text-primary-container hover:text-primary transition-colors disabled:opacity-30"
                      disabled={!(commentInputs[post.id] || '').trim()}
                      type="button"
                      onClick={() => handleAddComment(post.id)}
                    >
                      <span className="material-symbols-outlined text-[20px]">send</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
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

            <div className="flex flex-col gap-space-md mt-space-xs">
              {/* Sugerencia 1 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      alt="Andrea Delgado"
                      className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-primary/20"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFHa94r0FSTDaE2vj18vlwbq3T6bK3uA2DN2Kn-95HvulWA_SAY5dKfwqpkAxRk81u4wLZbVeQjPa9Jbqm7zhOusUxQhl2QkuaG9rZ5TdS4HY8r2tZQVgXfGMy2FXv7v76I9gCvJ4V0QeSqUVJjWALdzTmGeVyF24h8NgoXT52eE8CKox_pgRk6DDfso8WUBkTFbohVRGcUPSiWHBXvKfp_zzRoJWe-qj9S-OR_D0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-body-md-medium text-body-md-medium text-on-surface truncate font-semibold">
                        Andrea Delgado
                      </span>
                      <span className="font-caption text-caption text-outline truncate">
                        3 contactos en común
                      </span>
                    </div>
                  </div>
                  <button
                    className={`h-8 px-3 rounded-lg font-label-md text-label-md shrink-0 transition-colors shadow-xs font-semibold ${
                      followedUsers['u1']
                        ? 'bg-surface-container text-on-surface'
                        : 'bg-primary-container hover:bg-primary text-on-primary'
                    }`}
                    type="button"
                    onClick={() => handleToggleFollow('u1', 'Andrea Delgado')}
                  >
                    {followedUsers['u1'] ? 'Siguiendo' : 'Seguir'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 pl-12">
                  <span className="px-2 py-0.5 rounded-full bg-surface-container font-caption text-caption text-on-surface-variant">
                    Gastronomía
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container font-caption text-caption text-on-surface-variant">
                    Comercio
                  </span>
                </div>
              </div>

              {/* Sugerencia 2 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      alt="Rodrigo Paz"
                      className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-primary/20"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGdbTJTJdAz3KTExVy5vUDq3BsHO2CyijPP91hFPKEP0-DAE9Dw8tSNhM5oCjI6WRNc4ytbwT2ovajiMzQfvtHLJIRHpGy1aa6K0dKCHmQTISb7jkpfBr3mZKRJNtUM8h-98T16hZ92wNrPE45t4LBClk5-hpBPtKNDj_h0oX2RYdKVooWG1Rc2Af_y6V_MQyf5F4KJQSTJc0o2F9rau3-OWS9hkdbvScJQn1IIWw"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-body-md-medium text-body-md-medium text-on-surface truncate font-semibold">
                        Rodrigo Paz
                      </span>
                      <span className="font-caption text-caption text-outline truncate">
                        5 contactos en común
                      </span>
                    </div>
                  </div>
                  <button
                    className={`h-8 px-3 rounded-lg font-label-md text-label-md shrink-0 transition-colors shadow-xs font-semibold ${
                      followedUsers['u2']
                        ? 'bg-surface-container text-on-surface'
                        : 'bg-primary-container hover:bg-primary text-on-primary'
                    }`}
                    type="button"
                    onClick={() => handleToggleFollow('u2', 'Rodrigo Paz')}
                  >
                    {followedUsers['u2'] ? 'Siguiendo' : 'Seguir'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 pl-12">
                  <span className="px-2 py-0.5 rounded-full bg-surface-container font-caption text-caption text-on-surface-variant">
                    Logística
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container font-caption text-caption text-on-surface-variant">
                    Distribución
                  </span>
                </div>
              </div>

              {/* Sugerencia 3 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      alt="Valeria Thorne"
                      className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-primary/20"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9xAepqFbzjM3s1s8cJRVo4F_4O5CbqKY7xIJlwE07ENZrE83fBIeaKD4JaKfu2OBoqzqVD65Ee3dr-qFp24pt20NjFSNMUaWidgOCwvGmzAqM45BD9WKltX5oWdraE3jzQdpEnkrpPFrreVjbBBZzE2nZpvQKcYfJp2zMvalJ_dGmW6mCcUdpkchuUAEmfjgoqGemixQT1wJMl_xk4bz_GJFjFgiWbPJeEVV498k"
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-body-md-medium text-body-md-medium text-on-surface truncate font-semibold">
                          Valeria Thorne
                        </span>
                        <span className="material-symbols-outlined text-primary-container text-[14px]">
                          verified
                        </span>
                      </div>
                      <span className="font-caption text-caption text-outline truncate">
                        2 contactos en común
                      </span>
                    </div>
                  </div>
                  <button
                    className={`h-8 px-3 rounded-lg font-label-md text-label-md shrink-0 transition-colors shadow-xs font-semibold ${
                      followedUsers['u3']
                        ? 'bg-surface-container text-on-surface'
                        : 'bg-primary-container hover:bg-primary text-on-primary'
                    }`}
                    type="button"
                    onClick={() => handleToggleFollow('u3', 'Valeria Thorne')}
                  >
                    {followedUsers['u3'] ? 'Siguiendo' : 'Seguir'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 pl-12">
                  <span className="px-2 py-0.5 rounded-full bg-surface-container font-caption text-caption text-on-surface-variant">
                    Textiles
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container font-caption text-caption text-on-surface-variant">
                    Mayorista
                  </span>
                </div>
              </div>

              {/* Sugerencia 4 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      alt="Javier Huamán"
                      className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-primary/20"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuArkPGkiepJAni4zLi3EXHLRAortuA4Ru8S7NdvEB5RU7DfEOKg4wsVNHkxHzseyod99DtucajnyNrhYLfUbW7QnD7UWUIy1RxWVMRnuquHiTrOuQJzbJEBFY9-_mDD0YuVN039WU9Ec5Vb01RV-P4WRmnpQYENeG2btQ3CD4qFZ33cVG7dbgRLW8DLdFs8SsB5IKV7vbzO_U5eJAuqlnIMXan9StKGniQIpsfCyc8"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-body-md-medium text-body-md-medium text-on-surface truncate font-semibold">
                        Javier Huamán
                      </span>
                      <span className="font-caption text-caption text-outline truncate">
                        6 contactos en común
                      </span>
                    </div>
                  </div>
                  <button
                    className={`h-8 px-3 rounded-lg font-label-md text-label-md shrink-0 transition-colors shadow-xs font-semibold ${
                      followedUsers['u4']
                        ? 'bg-surface-container text-on-surface'
                        : 'bg-primary-container hover:bg-primary text-on-primary'
                    }`}
                    type="button"
                    onClick={() => handleToggleFollow('u4', 'Javier Huamán')}
                  >
                    {followedUsers['u4'] ? 'Siguiendo' : 'Seguir'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 pl-12">
                  <span className="px-2 py-0.5 rounded-full bg-surface-container font-caption text-caption text-on-surface-variant">
                    Tecnología
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container font-caption text-caption text-on-surface-variant">
                    Finanzas
                  </span>
                </div>
              </div>
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
    </div>
  );
}
