import { Injectable, ConflictException, NotFoundException, BadRequestException, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/postgres/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.ensureAdminAccount();
  }

  async ensureAdminAccount() {
    try {
      const email = 'adminpromexa@promexa.com';
      const name = 'adminpromexa';
      const password = 'admin123';
      const passwordHash = await bcrypt.hash(password, 10);

      const existing = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { name }
          ]
        }
      });

      if (existing) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            name,
            email,
            passwordHash,
            role: 'ADMIN',
            isVerified: true,
          }
        });
      } else {
        await this.prisma.user.create({
          data: {
            name,
            email,
            passwordHash,
            role: 'ADMIN',
            profileType: 'personal',
            isVerified: true,
          }
        });
      }
    } catch {
      // Non-fatal if DB not yet available
    }
  }

  async changePassword(userId: string, data: ChangePasswordDto) {
    if (data.newPassword !== data.confirmPassword) throw new BadRequestException('Las claves no coinciden');
    if (Buffer.byteLength(data.newPassword, 'utf8') > 72) throw new BadRequestException('La clave es demasiado larga');
    const user = await this.findById(userId);
    if (!user || !await bcrypt.compare(data.currentPassword, user.passwordHash)) {
      throw new UnauthorizedException('La clave actual es incorrecta');
    }
    if (data.currentPassword === data.newPassword) throw new BadRequestException('La nueva clave debe ser diferente');
    // MVP: require the current password. Later require a single-use email verification token here.
    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    const updated = await this.prisma.user.updateMany({
      where: { id: userId, passwordHash: user.passwordHash }, data: { passwordHash },
    });
    if (updated.count !== 1) throw new ConflictException('La clave cambio. Vuelve a intentarlo');
    return { message: 'Clave actualizada correctamente' };
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    try {
      const updateData: any = {
        name: data.name,
        email: data.email,
        avatar: data.avatar,
      };
      if (data.bio !== undefined) updateData.bio = data.bio;
      if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;

      return await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          coverImage: true,
          bio: true,
          profileType: true,
          role: true,
          isVerified: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') throw new ConflictException('Este correo ya esta registrado');
      if (error.code === 'P2025') throw new NotFoundException('Usuario no encontrado');
      throw error;
    }
  }

  async getUserFullProfile(targetId: string, currentUserId: string) {
    const resolvedId = targetId === 'me' ? currentUserId : targetId;
    const targetUser = await this.prisma.user.findUnique({
      where: { id: resolvedId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        coverImage: true,
        bio: true,
        profileType: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 1. Relación de amistad con el usuario actual
    let relationshipStatus: 'SELF' | 'FRIENDS' | 'SENT' | 'RECEIVED' | 'NONE' = 'NONE';
    let friendshipId: string | undefined = undefined;

    if (targetUser.id === currentUserId) {
      relationshipStatus = 'SELF';
    } else {
      const friendship = await this.prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: currentUserId, addresseeId: targetUser.id },
            { requesterId: targetUser.id, addresseeId: currentUserId },
          ],
        },
      });

      if (friendship) {
        friendshipId = friendship.id;
        if (friendship.status === 'ACCEPTED') {
          relationshipStatus = 'FRIENDS';
        } else if (friendship.requesterId === currentUserId) {
          relationshipStatus = 'SENT';
        } else {
          relationshipStatus = 'RECEIVED';
        }
      }
    }

    // 2. Amigos del usuario objetivo
    const friends = await this.getFriends(targetUser.id);

    // 3. Amigos en común si no es uno mismo
    let mutualFriends: any[] = [];
    if (targetUser.id !== currentUserId) {
      const myFriends = await this.getFriends(currentUserId);
      const myFriendIds = new Set(myFriends.map((f: any) => f.id));
      mutualFriends = friends.filter((f: any) => myFriendIds.has(f.id));
    }

    // 4. Publicaciones del usuario objetivo
    const posts = await this.prisma.post.findMany({
      where: {
        OR: [
          { authorId: targetUser.id },
          { authorHandle: targetUser.name },
        ],
      },
      include: {
        comments: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedPosts = posts.map((post) => ({
      id: post.id,
      author: post.authorHandle,
      authorId: post.authorId,
      authorHandle: `@${post.authorHandle.toLowerCase().replace(/\s+/g, '')}`,
      authorAvatar: post.authorAvatar || targetUser.avatar || '',
      isVerified: post.isVerified,
      time: post.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: post.createdAt,
      location: post.location || 'Lima, Perú',
      content: post.content,
      category: post.category,
      tags: post.tags,
      mediaUrl: post.mediaUrl,
      linkedProduct: post.productName ? {
        name: post.productName,
        price: post.productPrice,
        badge: post.productBadge,
        stock: post.productStock,
        details: post.productDetails,
        image: post.productImage,
      } : undefined,
      likes: post.likes,
      liked: post.liked,
      bookmarked: post.bookmarked,
      comments: post.comments.map((c) => ({
        id: c.id,
        author: c.author,
        authorAvatar: c.authorAvatar || '',
        isVerified: c.isVerified,
        text: c.text,
        time: c.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })),
    }));

    // 5. Fotos del usuario (extraídas de sus posts con imagen + avatar + portada)
    const photos: { id: string; url: string; caption?: string; createdAt: Date; postId?: string }[] = [];
    if (targetUser.coverImage) {
      photos.push({
        id: 'cover-photo',
        url: targetUser.coverImage,
        caption: 'Foto de portada',
        createdAt: targetUser.createdAt,
      });
    }
    if (targetUser.avatar) {
      photos.push({
        id: 'avatar-photo',
        url: targetUser.avatar,
        caption: 'Foto de perfil',
        createdAt: targetUser.createdAt,
      });
    }
    for (const post of posts) {
      if (post.mediaUrl) {
        photos.push({
          id: `post-photo-${post.id}`,
          url: post.mediaUrl,
          caption: post.content ? post.content.substring(0, 100) : undefined,
          createdAt: post.createdAt,
          postId: post.id,
        });
      }
    }

    return {
      user: targetUser,
      relationship: {
        status: relationshipStatus,
        friendshipId,
      },
      stats: {
        postsCount: posts.length,
        friendsCount: friends.length,
        photosCount: photos.length,
        mutualCount: mutualFriends.length,
      },
      friends,
      mutualFriends,
      photos,
      posts: formattedPosts,
    };
  }

  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: {
        requester: { select: { id: true, name: true, email: true, avatar: true, profileType: true, isVerified: true, role: true } },
        addressee: { select: { id: true, name: true, email: true, avatar: true, profileType: true, isVerified: true, role: true } },
      },
    });
    return friendships.map(f => f.requesterId === userId ? f.addressee : f.requester);
  }

  async getRecommendedFriends(currentUserId: string) {
    // 1. Obtener amigos actuales para excluirlos y calcular amigos en común
    const myFriendships = await this.prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: currentUserId }, { addresseeId: currentUserId }] },
    });
    const myFriendIds = new Set(
      myFriendships.map((f) => (f.requesterId === currentUserId ? f.addresseeId : f.requesterId))
    );

    // 2. Obtener todas las solicitudes activas
    const activeRequests = await this.prisma.friendship.findMany({
      where: {
        OR: [{ requesterId: currentUserId }, { addresseeId: currentUserId }],
      },
    });

    // 3. Buscar candidatos potenciales (excluyendo a uno mismo y amigos actuales)
    const excludeIds = [currentUserId, ...Array.from(myFriendIds)];
    const candidates = await this.prisma.user.findMany({
      where: {
        id: { notIn: excludeIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        profileType: true,
        isVerified: true,
        role: true,
        posts: {
          select: { tags: true },
          take: 3,
        },
      },
      take: 30,
    });

    if (candidates.length === 0) return [];

    // 4. Calcular amigos en común para cada candidato
    const candidateIds = candidates.map((c) => c.id);
    const candidateFriendships = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: { in: candidateIds } }, { addresseeId: { in: candidateIds } }],
      },
    });

    const candidateFeatures = candidates.map((cand) => {
      // Amigos del candidato
      const candFriendIds = new Set(
        candidateFriendships
          .filter((f) => f.requesterId === cand.id || f.addresseeId === cand.id)
          .map((f) => (f.requesterId === cand.id ? f.addresseeId : f.requesterId))
      );
      // Conteo mutuo
      let mutualCount = 0;
      for (const id of candFriendIds) {
        if (myFriendIds.has(id)) mutualCount++;
      }

      // Tags acumulados
      const tags = Array.from(new Set(cand.posts.flatMap((p) => p.tags || [])));

      // Relación actual con el usuario
      const req = activeRequests.find(
        (r) => (r.requesterId === currentUserId && r.addresseeId === cand.id) ||
               (r.addresseeId === currentUserId && r.requesterId === cand.id)
      );

      let relationshipStatus: 'NONE' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' = 'NONE';
      if (req && req.status === 'PENDING') {
        relationshipStatus = req.requesterId === currentUserId ? 'REQUEST_SENT' : 'REQUEST_RECEIVED';
      }

      return {
        id: cand.id,
        name: cand.name,
        email: cand.email,
        avatar: cand.avatar,
        profileType: cand.profileType,
        isVerified: cand.isVerified,
        location: 'Lima, Perú',
        mutualCount,
        tags,
        relationshipStatus,
        friendshipId: req?.id,
      };
    });

    // 5. Intentar consumir el servicio de recomendación ML
    let mlResults: any[] = [];
    const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    const mlApiKey = process.env.ML_INTERNAL_API_KEY || 'internal_ml_service_token';

    // ---------------------------------------------------------------------------
    // Semana 7 — Tolerancia a Fallas y Resiliencia
    // • Timeout como defensa contra latência del ml-service: AbortSignal.timeout(1500)
    //   evita que una lentitud externa bloquee la respuesta al usuario.
    // • Degradación elegante (graceful degradation): si el ml-service no responde
    //   o devuelve error, el código cae al bloque catch sin lanzar excepción.
    //   La lista final se construye igual usando la heurística local (mutualCount).
    // • Contrapresión implícita: la petición nunca espera más de 1.5 s.
    // ---------------------------------------------------------------------------
    try {
      const response = await fetch(`${mlUrl}/recommendations/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': mlApiKey,
        },
        body: JSON.stringify({
          user_id: currentUserId,
          limit: 15,
          user_features: {
            id: currentUserId,
            location: 'Lima, Perú',
            tags: ['comunidad', 'promexa', 'negocios'],
          },
          candidates: candidateFeatures.map((c) => ({
            id: c.id,
            name: c.name,
            avatar: c.avatar,
            profile_type: c.profileType,
            is_verified: c.isVerified,
            location: c.location,
            mutual_count: c.mutualCount,
            tags: c.tags,
          })),
        }),
        signal: AbortSignal.timeout(1500), // Circuit-breaker de emergencia
      });

      if (response.ok) {
        const data = await response.json();
        mlResults = data.recommended_users || [];
      }
    } catch {
      // Fallback automático si ml-service no responde (timeout / error de red)
      // — Semana 7: el sistema sigue funcionando con la heurística local
    }

    // 6. Ensamblar lista final ponderada con el ML Service o Fallback
    const mlMap = new Map(mlResults.map((item) => [item.id, item]));

    const scoredList = candidateFeatures.map((cand) => {
      const mlItem = mlMap.get(cand.id);
      const affinityScore = mlItem ? mlItem.score : Math.min(98, 65 + cand.mutualCount * 10 + (cand.isVerified ? 10 : 0));
      const recommendationReason = mlItem
        ? mlItem.recommendation_reason
        : (cand.mutualCount > 0
            ? `${cand.mutualCount} amigo${cand.mutualCount > 1 ? 's' : ''} en común · Afinidad en red`
            : cand.isVerified
            ? 'Perfil verificado en la comunidad'
            : 'Conexión recomendada en tu red');

      return {
        ...cand,
        affinityScore,
        recommendationReason,
        modelVersion: mlItem?.model_version || 'promexa-graph-v1',
      };
    });

    return scoredList.sort((a, b) => b.affinityScore - a.affinityScore);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findByEmailOrUsername(identifier: string) {
    const clean = (identifier || '').trim().toLowerCase();
    let user = await this.prisma.user.findUnique({
      where: { email: clean },
    });
    if (!user && !clean.includes('@')) {
      user = await this.prisma.user.findUnique({
        where: { email: `${clean}@promexa.com` },
      });
    }
    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { name: { equals: clean, mode: 'insensitive' } },
      });
    }
    return user;
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async searchUsers(query: string, currentUserId?: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const cleanQuery = query.trim();

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          currentUserId ? { id: { not: currentUserId } } : {},
          {
            OR: [
              { name: { contains: cleanQuery, mode: 'insensitive' } },
              { email: { contains: cleanQuery, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: 10,
    });

    let relationships: any[] = [];
    if (currentUserId && users.length > 0) {
      const userIds = users.map((u) => u.id);
      relationships = await this.prisma.friendship.findMany({
        where: {
          OR: [
            { requesterId: currentUserId, addresseeId: { in: userIds } },
            { addresseeId: currentUserId, requesterId: { in: userIds } },
          ],
        },
      });
    }

    return users.map((u) => {
      let relationshipStatus: 'NONE' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'FRIENDS' = 'NONE';

      if (currentUserId) {
        const relation = relationships.find(
          (f) =>
            (f.requesterId === currentUserId && f.addresseeId === u.id) ||
            (f.addresseeId === currentUserId && f.requesterId === u.id)
        );

        if (relation) {
          if (relation.status === 'ACCEPTED') {
            relationshipStatus = 'FRIENDS';
          } else if (relation.requesterId === currentUserId) {
            relationshipStatus = 'REQUEST_SENT';
          } else {
            relationshipStatus = 'REQUEST_RECEIVED';
          }
        }
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        profileType: u.profileType,
        isVerified: u.isVerified,
        avatar: u.avatar,
        role: u.role,
        relationshipStatus,
      };
    });
  }

  async sendFriendRequest(currentUserId: string, targetId: string) {
    if (currentUserId === targetId) {
      throw new ConflictException('No puedes enviarte una solicitud a ti mismo');
    }

    const targetUser = await this.findById(targetId);
    if (!targetUser) {
      throw new NotFoundException('Usuario destinatario no encontrado');
    }

    const isBusiness = targetUser.profileType === 'business';

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: currentUserId, addresseeId: targetId },
          { addresseeId: currentUserId, requesterId: targetId },
        ],
      },
    });

    // Si la cuenta objetivo es de tipo empresa/negocio, se sigue automáticamente sin necesidad de confirmación
    if (isBusiness) {
      if (existing) {
        if (existing.status === 'ACCEPTED') {
          return { message: 'Ya sigues a este negocio', status: 'FRIENDS', isFollowing: true, isBusiness: true };
        }
        const updated = await this.prisma.friendship.update({
          where: { id: existing.id },
          data: {
            requesterId: currentUserId,
            addresseeId: targetId,
            status: 'ACCEPTED',
          },
        });
        await this.prisma.notification.create({
          data: {
            userId: targetId,
            actorId: currentUserId,
            type: 'FRIEND_ACCEPTED',
            message: 'ha comenzado a seguir tu empresa',
            friendshipId: updated.id,
          },
        });
        return {
          message: 'Ahora sigues a esta empresa',
          status: 'FRIENDS',
          isFollowing: true,
          isBusiness: true,
          friendship: updated,
        };
      }

      const newFollow = await this.prisma.friendship.create({
        data: {
          requesterId: currentUserId,
          addresseeId: targetId,
          status: 'ACCEPTED',
        },
      });

      await this.prisma.notification.create({
        data: {
          userId: targetId,
          actorId: currentUserId,
          type: 'FRIEND_ACCEPTED',
          message: 'ha comenzado a seguir tu empresa',
          friendshipId: newFollow.id,
        },
      });

      return {
        message: 'Ahora sigues a esta empresa',
        status: 'FRIENDS',
        isFollowing: true,
        isBusiness: true,
        friendship: newFollow,
      };
    }

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return { message: 'Ya son amigos', status: 'FRIENDS' };
      }
      if (existing.status === 'PENDING') {
        if (existing.requesterId === currentUserId) {
          return { message: 'Ya existe una solicitud pendiente enviada', status: 'REQUEST_SENT' };
        } else {
          return { message: 'Este usuario ya te envió una solicitud', status: 'REQUEST_RECEIVED', friendshipId: existing.id };
        }
      }
      // If previous status was REJECTED, reset to PENDING
      const updated = await this.prisma.friendship.update({
        where: { id: existing.id },
        data: {
          requesterId: currentUserId,
          addresseeId: targetId,
          status: 'PENDING',
        },
      });

      await this.prisma.notification.create({
        data: {
          userId: targetId,
          actorId: currentUserId,
          type: 'FRIEND_REQUEST',
          message: 'Te ha enviado una solicitud de amistad',
          friendshipId: updated.id,
        },
      });

      return {
        message: 'Solicitud de amistad enviada con éxito',
        friendship: updated,
        status: 'REQUEST_SENT',
      };
    }

    const newFriendship = await this.prisma.friendship.create({
      data: {
        requesterId: currentUserId,
        addresseeId: targetId,
        status: 'PENDING',
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: targetId,
        actorId: currentUserId,
        type: 'FRIEND_REQUEST',
        message: 'Te ha enviado una solicitud de amistad',
        friendshipId: newFriendship.id,
      },
    });

    return {
      message: 'Solicitud de amistad enviada con éxito',
      friendship: newFriendship,
      status: 'REQUEST_SENT',
    };
  }

  async getRelationshipStatus(currentUserId: string, targetId: string) {
    if (currentUserId === targetId) {
      return { status: 'SELF' };
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { profileType: true },
    });

    const isBusiness = targetUser?.profileType === 'business';

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: currentUserId, addresseeId: targetId },
          { addresseeId: currentUserId, requesterId: targetId },
        ],
      },
    });

    if (!friendship) {
      return { status: 'NONE', targetProfileType: targetUser?.profileType || 'personal', isBusiness: !!isBusiness };
    }

    if (friendship.status === 'ACCEPTED') {
      return { status: 'FRIENDS', friendshipId: friendship.id, targetProfileType: targetUser?.profileType || 'personal', isBusiness: !!isBusiness };
    }

    if (friendship.status === 'PENDING') {
      return {
        status: friendship.requesterId === currentUserId ? 'SENT' : 'RECEIVED',
        friendshipId: friendship.id,
        targetProfileType: targetUser?.profileType || 'personal',
        isBusiness: !!isBusiness,
      };
    }

    return { status: 'NONE', targetProfileType: targetUser?.profileType || 'personal', isBusiness: !!isBusiness };
  }

  async getPendingFriendRequests(userId: string) {
    // 1. Pending friend requests directed to this user
    const pending = await this.prisma.friendship.findMany({
      where: {
        addresseeId: userId,
        status: 'PENDING',
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            profileType: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const requestsList = pending.map((f) => ({
      id: f.id,
      type: 'FRIEND_REQUEST',
      status: f.status,
      message: 'Te ha enviado una solicitud de amistad',
      createdAt: f.createdAt,
      friendshipId: f.id,
      read: false,
      requester: f.requester,
    }));

    // 2. Notifications for this user (e.g. FRIEND_ACCEPTED, activity from friends)
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        type: { in: ['FRIEND_ACCEPTED', 'FRIEND_REJECTED', 'NEW_POST', 'NEW_COMMENT', 'NEW_PRODUCT'] },
        read: false,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            profileType: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const notifsList = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      status: n.type === 'FRIEND_ACCEPTED' ? 'ACCEPTED' : n.type === 'FRIEND_REJECTED' ? 'REJECTED' : n.type,
      message: n.message,
      createdAt: n.createdAt,
      friendshipId: n.friendshipId,
      read: n.read,
      requester: n.actor,
    }));

    // Combine and sort by createdAt desc
    return [...requestsList, ...notifsList].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getNotifications(userId: string) {
    return this.getPendingFriendRequests(userId);
  }

  async dismissNotification(notificationId: string, currentUserId: string) {
    const notif = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (notif && notif.userId === currentUserId) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });
      return { success: true };
    }
    return { success: false };
  }

  async acceptFriendRequest(requestId: string, currentUserId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (!friendship) {
      throw new NotFoundException('Solicitud de amistad no encontrada');
    }

    if (friendship.addresseeId !== currentUserId) {
      throw new ConflictException('No tienes permiso para aceptar esta solicitud');
    }

    if (friendship.status === 'ACCEPTED') {
      return { message: 'Esta solicitud ya había sido aceptada', friendship };
    }

    const updated = await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    });

    // Mark original notification as read if exists
    await this.prisma.notification.updateMany({
      where: {
        userId: currentUserId,
        friendshipId: requestId,
      },
      data: { read: true },
    });

    // Notify the requester that their request was accepted!
    await this.prisma.notification.create({
      data: {
        userId: friendship.requesterId,
        actorId: currentUserId,
        type: 'FRIEND_ACCEPTED',
        message: 'Ha aceptado tu solicitud de amistad. ¡Ahora son amigos!',
        friendshipId: friendship.id,
      },
    });

    return {
      message: '¡Solicitud aceptada con éxito! Ahora son amigos.',
      friendship: updated,
    };
  }

  async rejectFriendRequest(requestId: string, currentUserId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (!friendship) {
      throw new NotFoundException('Solicitud de amistad no encontrada');
    }

    if (friendship.addresseeId !== currentUserId) {
      throw new ConflictException('No tienes permiso para responder a esta solicitud');
    }

    const updated = await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    // Mark original notification as read if exists
    await this.prisma.notification.updateMany({
      where: {
        userId: currentUserId,
        friendshipId: requestId,
      },
      data: { read: true },
    });

    // Notify the requester that their request was rejected!
    await this.prisma.notification.create({
      data: {
        userId: friendship.requesterId,
        actorId: currentUserId,
        type: 'FRIEND_REJECTED',
        message: 'Ha rechazado tu solicitud de amistad.',
        friendshipId: friendship.id,
      },
    });

    return {
      message: 'Solicitud rechazada',
      friendship: updated,
    };
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    profileType: 'personal' | 'business';
  }) {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('El correo electrónico ya se encuentra registrado');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const newUser = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        profileType: data.profileType === 'business' ? 'business' : 'personal',
        isVerified: data.profileType === 'business' ? false : true,
        avatar: null,
        role: data.profileType === 'business' ? 'BUSINESS' : 'USER',
      },
    });

    return newUser;
  }

  async getAllUsersForAdmin() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        profileType: true,
        isVerified: true,
        avatar: true,
        coverImage: true,
        bio: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            posts: true,
            products: true,
            receivedFriendRequests: true,
          },
        },
      },
    });
  }

  async updateUserByAdmin(
    userId: string,
    data: {
      isVerified?: boolean;
      role?: 'USER' | 'BUSINESS' | 'ADMIN';
      name?: string;
      email?: string;
      profileType?: 'personal' | 'business';
      bio?: string;
    },
  ) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.isVerified !== undefined ? { isVerified: data.isVerified } : {}),
        ...(data.role ? { role: data.role } : {}),
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email.toLowerCase() } : {}),
        ...(data.profileType ? { profileType: data.profileType } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        profileType: true,
        isVerified: true,
        avatar: true,
        coverImage: true,
        bio: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async deleteUserByAdmin(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.role === 'ADMIN') {
      throw new BadRequestException('No se puede eliminar una cuenta de Administrador');
    }
    await this.prisma.user.delete({
      where: { id: userId },
    });
    return { message: 'Usuario eliminado exitosamente' };
  }
}

