import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/postgres/prisma.service';
import { canMessage } from '../users/relationship-policy';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async canContact(senderId: string, recipientId: string, productId?: string) {
    return canMessage(this.prisma, senderId, recipientId, productId);
  }

  async save(senderId: string, recipientId: string, text: string, productId?: string, clientMessageId?: string) {
    const replay = async () => {
      const previous = await this.prisma.message.findUnique({ where: { senderId_clientMessageId: { senderId, clientMessageId } } });
      if (previous && (previous.recipientId !== recipientId || previous.text !== text || (previous.productId || undefined) !== productId)) {
        throw new BadRequestException('El identificador ya pertenece a otro mensaje');
      }
      return previous;
    };
    if (clientMessageId) {
      const previous = await replay();
      if (previous) return previous;
    }
    let product: { id: string; name: string; image: string | null } | null = null;
    if (productId) {
      product = await this.prisma.product.findFirst({ where: { id: productId, sellerId: recipientId }, select: { id: true, name: true, image: true } });
      if (!product) throw new BadRequestException('Producto no encontrado para este vendedor');
    }
    try {
    return await this.prisma.message.create({ data: { senderId, recipientId, text,
      ...(clientMessageId ? { clientMessageId } : {}),
      ...(product ? { productId: product.id, productName: product.name, productImage: product.image } : {}),
    } });
    } catch (error) {
      if (clientMessageId && error.code === 'P2002') {
        const previous = await replay();
        if (previous) return previous;
      }
      throw error;
    }
  }

  async contacts(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { profileType: true } });
    if (!user) return [];
    const contacts = await this.prisma.user.findMany({ where: { id: { not: userId }, OR: [
      ...(user.profileType === 'business' ? [] : [
        { profileType: 'personal' as const, sentFriendRequests: { some: { addresseeId: userId, status: 'ACCEPTED' as const } } },
        { profileType: 'personal' as const, receivedFriendRequests: { some: { requesterId: userId, status: 'ACCEPTED' as const } } },
      ]),
      { sentMessages: { some: { recipientId: userId } } },
      { receivedMessages: { some: { senderId: userId } } },
    ] }, select: { id: true, name: true, avatar: true, isVerified: true, profileType: true } });
    return Promise.all(contacts.map(async contact => ({ ...contact,
      canMessage: await this.canContact(userId, contact.id),
    })));
  }

  history(userId: string) {
    return this.prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  async markAsRead(userId: string, senderId: string) {
    return this.prisma.message.updateMany({
      where: {
        recipientId: userId,
        senderId: senderId,
        read: false,
      },
      data: { read: true },
    });
  }
}
