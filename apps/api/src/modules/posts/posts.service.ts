import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/postgres/prisma.service';

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
  authorId: string;
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
  constructor(private readonly prisma: PrismaService) {}

  private formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  }

  async findAll(category?: string): Promise<Post[]> {
    const where = category && category !== 'ml-graph' && category !== 'all'
      ? { category }
      : {};

    const posts = await this.prisma.post.findMany({
      where,
      include: {
        author: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return posts.map((post) => ({
      id: post.id,
      author: post.author.name,
      authorId: post.authorId,
      authorHandle: post.authorHandle,
      authorAvatar: post.author.avatar || '',
      isVerified: post.isVerified || post.author.isVerified,
      time: this.formatTime(post.createdAt),
      location: post.location || 'Lima, Perú',
      content: post.content,
      category: post.category as 'ml-graph' | 'following' | 'local',
      tags: post.tags,
      mediaUrl: post.mediaUrl,
      linkedProduct: post.productName
        ? {
            name: post.productName,
            price: post.productPrice || 0,
            badge: post.productBadge || 'Disponible',
            stock: post.productStock || 'Stock disponible',
            details: post.productDetails || '',
            image: post.productImage,
          }
        : undefined,
      likes: post.likes,
      liked: post.liked,
      bookmarked: post.bookmarked,
      comments: [],
      createdAt: post.createdAt,
    }));
  }

  async create(data: {
    authorId: string;
    authorAvatar: string;
    isVerified: boolean;
    content: string;
    mediaUrl?: string;
    hasProduct?: boolean;
    tags?: string[];
  }): Promise<Post> {
    const author = await this.prisma.user.findUnique({
      where: { id: data.authorId },
    });

    if (!author) {
      throw new Error('Author not found');
    }

    const newPost = await this.prisma.post.create({
      data: {
        authorId: data.authorId,
        authorHandle: `@${author.name.toLowerCase().replace(/\s+/g, '')}`,
        authorAvatar: data.authorAvatar,
        isVerified: data.isVerified,
        location: 'Lima, Perú',
        content: data.content,
        category: 'following',
        tags: data.tags || [],
        mediaUrl: data.mediaUrl,
        productName: data.hasProduct ? 'Producto Destacado Promexa' : null,
        productPrice: data.hasProduct ? 45.0 : null,
        productBadge: data.hasProduct ? 'Disponible' : null,
        productStock: data.hasProduct ? 'Stock: Disponible' : null,
        productDetails: data.hasProduct ? 'Coordinación directa por chat' : null,
        productImage: data.hasProduct
          ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuBg21NIl8VdFPryF6IWY-blXSc13SLNb4Sl7Q9l8EWc2PLSRgFGRh0sujb6aUCKCUYPDPiOiITsYoFh-jk5Kn13VWgSeKG-xa-eUIQ_KOQZoBC4B7-zyLcvi6Jcv1PM5I-q2XaynJA_RoFH4LNb9KCKa6L4xSiHeqtQjEh4MM_aAXm1I2VFbn6GKlfDYzJOQjAwai280GrID5emqvvty-Skt8vBumoZrOc2D6TQrlo'
          : null,
      },
      include: {
        author: true,
      },
    });

    return {
      id: newPost.id,
      author: newPost.author.name,
      authorId: newPost.authorId,
      authorHandle: newPost.authorHandle,
      authorAvatar: newPost.author.avatar || '',
      isVerified: newPost.isVerified || newPost.author.isVerified,
      time: 'Hace un momento',
      location: newPost.location || 'Lima, Perú',
      content: newPost.content,
      category: newPost.category as 'ml-graph' | 'following' | 'local',
      tags: newPost.tags,
      mediaUrl: newPost.mediaUrl,
      linkedProduct: newPost.productName
        ? {
            name: newPost.productName,
            price: newPost.productPrice || 0,
            badge: newPost.productBadge || 'Disponible',
            stock: newPost.productStock || 'Stock disponible',
            details: newPost.productDetails || '',
            image: newPost.productImage,
          }
        : undefined,
      likes: newPost.likes,
      liked: newPost.liked,
      bookmarked: newPost.bookmarked,
      comments: [],
      createdAt: newPost.createdAt,
    };
  }

  async toggleLike(postId: string): Promise<{ liked: boolean; likes: number }> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) throw new Error('Post not found');

    const newLiked = !post.liked;
    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        liked: newLiked,
        likes: newLiked ? post.likes + 1 : Math.max(0, post.likes - 1),
      },
    });

    return { liked: updated.liked, likes: updated.likes };
  }

  async toggleBookmark(postId: string): Promise<{ bookmarked: boolean }> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) throw new Error('Post not found');

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        bookmarked: !post.bookmarked,
      },
    });

    return { bookmarked: updated.bookmarked };
  }

  async addComment(
    postId: string,
    author: string,
    authorAvatar: string,
    isVerified: boolean,
    text: string
  ): Promise<Comment> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) throw new Error('Post not found');

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      author,
      authorAvatar,
      isVerified,
      text,
      time: 'Hace un momento',
    };

    return newComment;
  }
}
