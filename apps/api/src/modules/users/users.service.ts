import { Injectable, ConflictException, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/postgres/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

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
      return await this.prisma.user.update({
        where: { id: userId },
        data: { name: data.name, email: data.email, avatar: data.avatar },
        select: { id: true, name: true, email: true, avatar: true, profileType: true, role: true, isVerified: true },
      });
    } catch (error) {
      if (error.code === 'P2002') throw new ConflictException('Este correo ya esta registrado');
      if (error.code === 'P2025') throw new NotFoundException('Usuario no encontrado');
      throw error;
    }
  }

  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: {
        requester: { select: { id: true, name: true, avatar: true, isVerified: true } },
        addressee: { select: { id: true, name: true, avatar: true, isVerified: true } },
      },
    });
    return friendships.map(f => f.requesterId === userId ? f.addressee : f.requester);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
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

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: currentUserId, addresseeId: targetId },
          { addresseeId: currentUserId, requesterId: targetId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return { message: 'Ya son amigos', status: 'FRIENDS' };
      }
      return { message: 'Ya existe una solicitud pendiente', status: existing.status };
    }

    const newFriendship = await this.prisma.friendship.create({
      data: {
        requesterId: currentUserId,
        addresseeId: targetId,
        status: 'PENDING',
      },
    });

    return {
      message: 'Solicitud de amistad enviada con éxito',
      friendship: newFriendship,
      status: 'REQUEST_SENT',
    };
  }

  async getPendingFriendRequests(userId: string) {
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

    return pending.map((f) => ({
      id: f.id,
      status: f.status,
      createdAt: f.createdAt,
      requester: f.requester,
    }));
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
}
