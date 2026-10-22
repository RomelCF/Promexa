require('ts-node/register/transpile-only');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ValidationPipe } = require('@nestjs/common');
const { MarketplaceService } = require('../src/modules/marketplace/marketplace.service');
const { MarketplaceController } = require('../src/modules/marketplace/marketplace.controller');
const { CreateProductDto } = require('../src/modules/marketplace/dto/product.dto');
const { JwtAuthGuard } = require('../src/modules/auth/jwt-auth.guard');
const product = { id: 'product-1', name: 'Real item', price: 10, image: null, createdAt: new Date(1000),
  store: 'Stale name', isVerified: true, sellerId: 'alice', seller: { name: 'Alice', isVerified: false } };
test('empty database produces an empty marketplace, with no demo fallback', async () => {
  const service = new MarketplaceService({ product: { findMany: async () => [] } });
  assert.deepEqual(await service.list(), []);
});
test('listing uses the actual seller profile, never cached store or verification', async () => {
  const service = new MarketplaceService({ product: { findMany: async () => [product] } });
  const [result] = await service.list();
  assert.equal(result.store, 'Alice'); assert.equal(result.isVerified, false);
  assert.equal(result.createdAt, 1000); assert.equal(result.seller, undefined);
});
test('create takes the seller from authentication and writes to Prisma', async () => {
  let written;
  const service = new MarketplaceService({
    user: { findUnique: async () => ({ name: 'Alice', isVerified: false }) },
    product: { create: async query => { written = query.data; return product; } },
  });
  await new MarketplaceController(service).create({ user: { userId: 'alice' } }, {
    name: 'Real item', description: '', price: 10, category: 'Other', district: 'Lima', sellerId: 'bob', isVerified: true,
  });
  assert.equal(written.sellerId, 'alice'); assert.equal(written.isVerified, false);
  assert.equal(written.contactPhone, null); assert.equal(written.image, null);
});
test('status changes and deletion require ownership in the database query', async () => {
  const queries = [];
  const reject = async query => { queries.push(query); return { count: 0 }; };
  const service = new MarketplaceService({ product: { updateMany: reject, deleteMany: reject } });
  await assert.rejects(service.status('bob', 'product-1', 'Reservado'), error => error.status === 404);
  await assert.rejects(service.remove('bob', 'product-1'), error => error.status === 404);
  assert.ok(queries.every(query => query.where.sellerId === 'bob' && query.where.id === 'product-1'));
});
test('API guards and DTO reject forged ownership and invalid prices', async () => {
  assert.ok(Reflect.getMetadata('__guards__', MarketplaceController).includes(JwtAuthGuard));
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const valid = { name: 'Real item', description: '', price: 10, category: 'Other', district: 'Lima' };
  for (const change of [{ sellerId: 'bob' }, { isVerified: true }, { price: -1 }, { price: 10.123 }]) {
    await assert.rejects(pipe.transform({ ...valid, ...change }, { type: 'body', metatype: CreateProductDto }));
  }
});
