import { PrismaService } from '../../database/postgres/prisma.service';

// A follow never grants permission to send a message on behalf of a business.
export async function canMessage(prisma: PrismaService, senderId: string, recipientId: string, productId?: string) {
  if (senderId === recipientId) return false;
  const [sender, recipient] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId }, select: { profileType: true } }),
    prisma.user.findUnique({ where: { id: recipientId }, select: { profileType: true } }),
  ]);
  if (!sender || !recipient) return false;
  if (sender.profileType === 'business') {
    return Boolean(await prisma.message.findFirst({ where: { senderId: recipientId, recipientId: senderId } }));
  }
  if (recipient.profileType === 'business') return true;
  if (await prisma.friendship.findFirst({ where: { status: 'ACCEPTED', OR: [
    { requesterId: senderId, addresseeId: recipientId },
    { requesterId: recipientId, addresseeId: senderId },
  ] } })) return true;
  if (productId && await prisma.product.findFirst({ where: { id: productId, sellerId: recipientId } })) return true;
  return Boolean(await prisma.message.findFirst({ where: { OR: [
    { senderId, recipientId }, { senderId: recipientId, recipientId: senderId },
  ] } }));
}
