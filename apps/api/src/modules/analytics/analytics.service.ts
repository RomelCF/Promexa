import { BadRequestException, Injectable } from '@nestjs/common';
import { ProfileType } from '@prisma/client';
import { PrismaService } from '../../database/postgres/prisma.service';

export const METRICS_TIME_ZONE = 'America/Lima';
export function localDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: METRICS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function metricsRange(days: string | undefined, now = new Date()) {
  const count = days === undefined ? 30 : Number(days);
  if (!Number.isInteger(count) || ![7, 30, 90].includes(count)) throw new BadRequestException('El periodo debe ser 7, 30 o 90 dias');
  const end = new Date(`${localDay(now)}T00:00:00.000Z`);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - count + 1);
  return { count, start, end };
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordLogin(user: { id: string; role: string; profileType: ProfileType }, now = new Date()) {
    // Internal staff sessions are not customer activity.
    if (user.role === 'ADMIN') return;
    const day = new Date(`${localDay(now)}T00:00:00.000Z`);
    await this.prisma.dailyUserAccess.upsert({
      where: { userId_day: { userId: user.id, day } },
      create: { userId: user.id, day, profileType: user.profileType, loginCount: 1, lastLoginAt: now },
      update: { loginCount: { increment: 1 }, profileType: user.profileType, lastLoginAt: now },
    });
  }

  async dashboard(days?: string, now = new Date()) {
    const range = metricsRange(days, now);
    const accessWhere = { day: { gte: range.start, lte: range.end }, user: { role: { not: 'ADMIN' as const } } };
    const [people, businessesCount, verifiedBusinesses, productCount, reservedCount, grouped, uniqueUsers, firstAccess, businesses] = await Promise.all([
      this.prisma.user.count({ where: { profileType: 'personal', role: { not: 'ADMIN' } } }),
      this.prisma.user.count({ where: { profileType: 'business', role: { not: 'ADMIN' } } }),
      this.prisma.user.count({ where: { profileType: 'business', role: { not: 'ADMIN' }, isVerified: true } }),
      this.prisma.product.count({ where: { seller: { profileType: 'business', role: { not: 'ADMIN' } } } }),
      this.prisma.product.count({ where: { status: 'Reservado', seller: { profileType: 'business', role: { not: 'ADMIN' } } } }),
      this.prisma.dailyUserAccess.groupBy({ by: ['day', 'profileType'], where: accessWhere, _count: { _all: true }, _sum: { loginCount: true } }),
      this.prisma.dailyUserAccess.findMany({ where: accessWhere, distinct: ['userId'], select: { userId: true } }),
      this.prisma.dailyUserAccess.findFirst({ where: { user: { role: { not: 'ADMIN' } } }, orderBy: { day: 'asc' }, select: { day: true } }),
      this.prisma.user.findMany({ where: { profileType: 'business', role: { not: 'ADMIN' } }, orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, isVerified: true, createdAt: true, _count: { select: { products: true } } } }),
    ]);
    const daily = Array.from({ length: range.count }, (_, index) => {
      const day = new Date(range.start); day.setUTCDate(day.getUTCDate() + index);
      const date = day.toISOString().slice(0, 10);
      const rows = grouped.filter(row => row.day.toISOString().slice(0, 10) === date);
      const personal = rows.find(row => row.profileType === 'personal');
      const business = rows.find(row => row.profileType === 'business');
      return { date, personal: personal?._count._all || 0, business: business?._count._all || 0,
        uniqueUsers: rows.reduce((sum, row) => sum + row._count._all, 0),
        logins: rows.reduce((sum, row) => sum + (row._sum.loginCount || 0), 0) };
    });
    return {
      generatedAt: now.toISOString(), timeZone: METRICS_TIME_ZONE,
      period: { days: range.count, from: localDay(new Date(`${range.start.toISOString().slice(0, 10)}T12:00:00Z`)), to: localDay(now) },
      trackingSince: firstAccess?.day.toISOString().slice(0, 10) || null,
      totals: { people, businesses: businessesCount, verifiedBusinesses, businessProducts: productCount, reservedProducts: reservedCount },
      activity: { today: daily[daily.length - 1], uniqueUsers: uniqueUsers.length, logins: daily.reduce((sum, day) => sum + day.logins, 0) },
      daily,
      sales: { available: false, confirmedUnits: null, revenue: null, currency: 'PEN', reason: 'Las ventas se mediran cuando existan compras confirmadas por la pasarela de pagos.' },
      businesses: businesses.map(business => ({ id: business.id, name: business.name, isVerified: business.isVerified,
        createdAt: business.createdAt, publishedProducts: business._count.products, soldUnits: null, revenue: null })),
    };
  }
}
