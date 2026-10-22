import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/postgres/prisma.service';
import { CreateProductDto } from './dto/product.dto';
const seller = { select: { name: true, isVerified: true, avatar: true } };
@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}
  private serialize(product: any) {
    const { seller: profile, ...data } = product;
    return { ...data, store: profile.name, sellerAvatar: profile.avatar, isVerified: profile.isVerified,
      image: product.image || '', createdAt: product.createdAt.getTime() };
  }
  async find(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: { seller } });
    if (!product) throw new NotFoundException('El producto ya no esta disponible');
    return this.serialize(product);
  }
  async list() {
    const products = await this.prisma.product.findMany({ include: { seller }, orderBy: { createdAt: 'desc' } });
    return products.map(product => this.serialize(product));
  }
  async create(userId: string, data: CreateProductDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, isVerified: true } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const product = await this.prisma.product.create({
      data: { name: data.name, description: data.description, price: data.price,
        category: data.category, district: data.district, image: data.image || null,
        contactPhone: data.contactPhone || null, sellerId: userId,
        store: user.name, isVerified: user.isVerified, status: 'Disponible' },
      include: { seller },
    });
    return this.serialize(product);
  }
  async status(userId: string, id: string, status: string) {
    const result = await this.prisma.product.updateMany({ where: { id, sellerId: userId }, data: { status } });
    if (!result.count) throw new NotFoundException('Producto no encontrado o no pertenece a tu cuenta');
    const product = await this.prisma.product.findUnique({ where: { id }, include: { seller } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return this.serialize(product);
  }
  async remove(userId: string, id: string) {
    const result = await this.prisma.product.deleteMany({ where: { id, sellerId: userId } });
    if (!result.count) throw new NotFoundException('Producto no encontrado o no pertenece a tu cuenta');
    return { success: true };
  }
}
