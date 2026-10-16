import { Injectable } from '@nestjs/common';

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
  linkedProduct?: {
    name: string;
    price: number;
    badge: string;
    stock: string;
    details: string;
    image: string;
  };
  mediaUrl?: string;
  likes: number;
  liked: boolean;
  bookmarked: boolean;
  comments: Comment[];
  createdAt: Date;
}

@Injectable()
export class PostsService {
  private posts: Post[] = [
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
      createdAt: new Date(),
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
          text: 'Hola Mariana, nosotros nos especializamos en habilitación de locales comerciales y mobiliario a medida. Puedes ver nuestro catálogo en el Marketplace o escribirnos por chat.',
          time: 'Hace 45 min',
        },
      ],
      createdAt: new Date(Date.now() - 7200000),
    },
  ];

  findAll(category?: string): Post[] {
    if (!category || category === 'ml-graph' || category === 'all') {
      return this.posts;
    }
    return this.posts.filter((p) => p.category === category);
  }

  create(data: {
    author: string;
    authorAvatar: string;
    isVerified: boolean;
    content: string;
    mediaUrl?: string;
    hasProduct?: boolean;
    tags?: string[];
  }): Post {
    const newPost: Post = {
      id: `post-${Date.now()}`,
      author: data.author,
      authorHandle: `@${data.author.toLowerCase().replace(/\s+/g, '')}`,
      authorAvatar: data.authorAvatar,
      isVerified: data.isVerified,
      time: 'Hace un momento',
      location: 'Lima, Perú',
      content: data.content,
      category: 'following',
      tags: data.tags || [],
      mediaUrl: data.mediaUrl,
      linkedProduct: data.hasProduct
        ? {
            name: 'Producto Destacado Promexa',
            price: 45.0,
            badge: 'Disponible',
            stock: 'Stock: Disponible',
            details: 'Coordinación directa por chat',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuBg21NIl8VdFPryF6IWY-blXSc13SLNb4Sl7Q9l8EWc2PLSRgFGRh0sujb6aUCKCUYPDPiOiITsYoFh-jk5Kn13VWgSeKG-xa-eUIQ_KOQZoBC4B7-zyLcvi6Jcv1PM5I-q2XaynJA_RoFH4LNb9KCKa6L4xSiHeqtQjEh4MM_aAXm1I2VFbn6GKlfDYzJOQjAwai280GrID5emqvvty-Skt8vBumoZrOc2D6TQrlo',
          }
        : undefined,
      likes: 0,
      liked: false,
      bookmarked: false,
      comments: [],
      createdAt: new Date(),
    };

    this.posts.unshift(newPost);
    return newPost;
  }

  toggleLike(postId: string): { liked: boolean; likes: number } {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Post not found');

    post.liked = !post.liked;
    post.likes = post.liked ? post.likes + 1 : Math.max(0, post.likes - 1);
    return { liked: post.liked, likes: post.likes };
  }

  toggleBookmark(postId: string): { bookmarked: boolean } {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Post not found');

    post.bookmarked = !post.bookmarked;
    return { bookmarked: post.bookmarked };
  }

  addComment(
    postId: string,
    author: string,
    authorAvatar: string,
    isVerified: boolean,
    text: string
  ): Comment {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Post not found');

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      author,
      authorAvatar,
      isVerified,
      text,
      time: 'Hace un momento',
    };

    post.comments.push(newComment);
    return newComment;
  }
}
