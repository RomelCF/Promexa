import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/postgres/prisma.service';

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
  isEdited?: boolean;
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
    return `Hace ${days} dia${days > 1 ? 's' : ''}`;
  }

  private mapComment(c: {
    id: string;
    authorId?: string | null;
    author: string;
    authorAvatar: string | null;
    isVerified: boolean;
    text: string;
    createdAt: Date;
  }): Comment {
    return {
      id: c.id,
      authorId: c.authorId || undefined,
      author: c.author,
      authorAvatar: c.authorAvatar || '',
      isVerified: c.isVerified,
      text: c.text,
      time: this.formatTime(c.createdAt),
    };
  }

  private async notifyFriendsOfActivity(
    actorId: string,
    type: string,
    message: string,
    referenceId?: string,
  ): Promise<void> {
    try {
      const friendships = await this.prisma.friendship.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [
            { requesterId: actorId, requester: { profileType: 'personal' }, addressee: { profileType: 'personal' } },
            { addresseeId: actorId, requester: { profileType: 'personal' } },
          ],
        },
        select: { requesterId: true, addresseeId: true },
      });

      const friendIds = friendships.map((f) =>
        f.requesterId === actorId ? f.addresseeId : f.requesterId,
      );

      if (!friendIds.length) return;

      await this.prisma.notification.createMany({
        data: friendIds.map((userId) => ({
          userId,
          actorId,
          type,
          message,
          friendshipId: referenceId || null,
          read: false,
        })),
        skipDuplicates: true,
      });
    } catch (err) {
      console.error('[notifyFriendsOfActivity] Error:', err);
    }
  }

  async findAll(category?: string): Promise<Post[]> {
    const where =
      category && category !== 'ml-graph' && category !== 'all'
        ? { category }
        : {};

    const posts = await this.prisma.post.findMany({
      where,
      include: {
        author: true,
        comments: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return posts.map((post) => {
      const isEdited = post.tags?.includes('__edited__') || false;
      const visibleTags = (post.tags || []).filter((t) => t !== '__edited__');
      return {
        id: post.id,
        author: post.author.name,
        authorId: post.authorId,
        authorHandle: post.authorHandle,
        authorAvatar: post.author.avatar || '',
        authorProfileType: post.author.profileType as 'personal' | 'business',
        isVerified: post.isVerified || post.author.isVerified,
        time: this.formatTime(post.createdAt),
        location: post.location || 'Lima, Peru',
        content: post.content,
        category: post.category as 'ml-graph' | 'following' | 'local',
        tags: visibleTags,
        isEdited,
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
        comments: post.comments.map((c) => this.mapComment(c)),
        createdAt: post.createdAt,
      };
    });
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

    if (!author) throw new NotFoundException('Author not found');

    const cleanTags = (data.tags || []).filter((t) => t !== '__edited__');

    const newPost = await this.prisma.post.create({
      data: {
        authorId: data.authorId,
        authorHandle: '@' + author.name.toLowerCase().replace(/\s+/g, ''),
        authorAvatar: data.authorAvatar,
        isVerified: data.isVerified,
        location: 'Lima, Peru',
        content: data.content,
        category: 'following',
        tags: cleanTags,
        mediaUrl: data.mediaUrl,
        productName: data.hasProduct ? 'Producto Destacado Promexa' : null,
        productPrice: data.hasProduct ? 45.0 : null,
        productBadge: data.hasProduct ? 'Disponible' : null,
        productStock: data.hasProduct ? 'Stock: Disponible' : null,
        productDetails: data.hasProduct ? 'Coordinacion directa por chat' : null,
        productImage: data.hasProduct
          ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuBg21NIl8VdFPryF6IWY-blXSc13SLNb4Sl7Q9l8EWc2PLSRgFGRh0sujb6aUCKCUYPDPiOiITsYoFh-jk5Kn13VWgSeKG-xa-eUIQ_KOQZoBC4B7-zyLcvi6Jcv1PM5I-q2XaynJA_RoFH4LNb9KCKa6L4xSiHeqtQjEh4MM_aAXm1I2VFbn6GKlfDYzJOQjAwai280GrID5emqvvty-Skt8vBumoZrOc2D6TQrlo'
          : null,
      },
      include: { author: true, comments: true },
    });

    // Notificar amigos/seguidores (fire-and-forget)
    const preview = data.content.substring(0, 80);
    const ellipsis = data.content.length > 80 ? '...' : '';
    this.notifyFriendsOfActivity(
      data.authorId,
      'NEW_POST',
      author.name + ' publico algo nuevo: "' + preview + ellipsis + '"',
      newPost.id,
    );

    return {
      id: newPost.id,
      author: newPost.author.name,
      authorId: newPost.authorId,
      authorHandle: newPost.authorHandle,
      authorAvatar: newPost.author.avatar || '',
      isVerified: newPost.isVerified || newPost.author.isVerified,
      time: 'Hace un momento',
      location: newPost.location || 'Lima, Peru',
      content: newPost.content,
      category: newPost.category as 'ml-graph' | 'following' | 'local',
      tags: cleanTags,
      isEdited: false,
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

  async update(postId: string, userId: string, content: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { author: true, comments: { orderBy: { createdAt: 'asc' } } },
    });
    if (!post) throw new NotFoundException('Publicacion no encontrada');
    if (post.authorId !== userId) {
      throw new ForbiddenException('No tienes permiso para editar esta publicacion');
    }

    const matches = content.match(/#[a-zA-Z0-9_]+/g) || [];
    const newTags = Array.from(new Set([...matches, '__edited__']));

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { content, tags: newTags },
      include: { author: true, comments: { orderBy: { createdAt: 'asc' } } },
    });

    const visibleTags = (updated.tags || []).filter((t) => t !== '__edited__');

    return {
      id: updated.id,
      author: updated.author.name,
      authorId: updated.authorId,
      authorHandle: updated.authorHandle,
      authorAvatar: updated.author.avatar || '',
      isVerified: updated.isVerified || updated.author.isVerified,
      time: this.formatTime(updated.createdAt),
      location: updated.location || 'Lima, Peru',
      content: updated.content,
      category: updated.category as 'ml-graph' | 'following' | 'local',
      tags: visibleTags,
      isEdited: true,
      mediaUrl: updated.mediaUrl,
      linkedProduct: updated.productName
        ? {
            name: updated.productName,
            price: updated.productPrice || 0,
            badge: updated.productBadge || 'Disponible',
            stock: updated.productStock || 'Stock disponible',
            details: updated.productDetails || '',
            image: updated.productImage,
          }
        : undefined,
      likes: updated.likes,
      liked: updated.liked,
      bookmarked: updated.bookmarked,
      comments: updated.comments.map((c) => this.mapComment(c)),
      createdAt: updated.createdAt,
    };
  }

  async remove(postId: string, userId: string): Promise<{ success: boolean; id: string }> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Publicacion no encontrada');
    if (post.authorId !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar esta publicacion');
    }
    await this.prisma.post.delete({ where: { id: postId } });
    return { success: true, id: postId };
  }

  async report(
    postId: string,
    userId: string,
    reason: string,
    details?: string,
  ): Promise<{ success: boolean; message: string }> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Publicacion no encontrada');

    console.log('[MODERACION] Reporte de post ' + postId + ' por usuario ' + userId + '. Motivo: ' + reason + '. Detalles: ' + (details || 'Sin detalles adicionales'));

    return { success: true, message: 'Denuncia registrada exitosamente para revision' };
  }

  async toggleLike(postId: string): Promise<{ liked: boolean; likes: number }> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

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
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { bookmarked: !post.bookmarked },
    });

    return { bookmarked: updated.bookmarked };
  }

  async addComment(
    postId: string,
    authorId: string,
    author: string,
    authorAvatar: string,
    isVerified: boolean,
    text: string,
  ): Promise<Comment> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { author: { select: { name: true } } },
    });
    if (!post) throw new NotFoundException('Post not found');

    const comment = await this.prisma.comment.create({
      data: { postId, authorId, author, authorAvatar, isVerified, text },
    });

    // Notificar al dueno del post si no es el mismo que comenta
    if (post.authorId && post.authorId !== authorId) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: post.authorId,
            actorId: authorId,
            type: 'NEW_COMMENT',
            message: author + ' comento en tu publicacion: "' + text.substring(0, 60) + (text.length > 60 ? '...' : '') + '"',
            read: false,
          },
        });
      } catch (err) {
        console.error('[addComment] Error notifying post owner:', err);
      }
    }

    // Notificar a amigos/seguidores del que comenta (fire-and-forget)
    this.notifyFriendsOfActivity(
      authorId,
      'NEW_COMMENT',
      author + ' comento en una publicacion: "' + text.substring(0, 60) + (text.length > 60 ? '...' : '') + '"',
      postId,
    );

    return this.mapComment(comment);
  }
}
