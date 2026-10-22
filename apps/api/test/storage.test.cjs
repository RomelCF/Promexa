require('ts-node/register/transpile-only');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { StorageService } = require('../src/modules/storage/storage.service');
function service() { return new StorageService({ get: key => key === 'PUBLIC_API_URL' ? 'http://localhost:3001/api/v1' : undefined }); }
test('uploads a real image as WebP and retrieves it without original metadata', async () => {
  const storage = service();
  const dir = await mkdtemp(join(tmpdir(), 'promexa-images-')); storage.directory = dir;
  try {
    const input = await sharp({ create: { width: 800, height: 600, channels: 3, background: 'red' } }).png().toBuffer();
    const result = await storage.upload('avatar', 'user-1', { buffer: input, size: input.length });
    assert.match(result.key, /^avatar\/user-1\/[a-f0-9-]+\.webp$/);
    assert.equal(result.url, `http://localhost:3001/api/v1/storage/images/${result.key}`);
    const response = await storage.read(...result.key.split('/'));
    const chunks = []; for await (const chunk of response.getStream()) chunks.push(chunk);
    const metadata = await sharp(Buffer.concat(chunks)).metadata();
    assert.equal(metadata.format, 'webp'); assert.ok(metadata.width <= 512); assert.ok(!metadata.exif);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('rejects disguised files, oversized avatars, missing files and invalid destinations', async () => {
  const storage = service();
  for (const [purpose, file] of [['avatar', undefined], ['avatar', { buffer: Buffer.from('not an image'), size: 12 }],
    ['avatar', { buffer: Buffer.from('x'), size: 6 * 1024 * 1024 }], ['other', { buffer: Buffer.from('x'), size: 1 }]]) {
    await assert.rejects(storage.upload(purpose, 'user-1', file), error => error.status === 400);
  }
});
test('rejects path traversal and unknown media keys', async () => {
  await assert.rejects(service().read('avatar', '..', 'secret'), error => error.status === 404);
  await assert.rejects(service().read('avatar', 'user-1', '../../.env'), error => error.status === 404);
});

test('HTTP upload requires JWT, accepts multipart images and serves the resulting image', async () => {
  const { Module } = require('@nestjs/common');
  const { NestFactory } = require('@nestjs/core');
  const { JwtModule, JwtService } = require('@nestjs/jwt');
  const { PassportModule } = require('@nestjs/passport');
  const { ConfigService } = require('@nestjs/config');
  const { JwtStrategy } = require('../src/modules/auth/jwt.strategy');
  const { UsersService } = require('../src/modules/users/users.service');
  const { StorageController } = require('../src/modules/storage/storage.controller');
  const secret = 'upload-test-secret';
  class TestModule {}
  Module({
    imports: [JwtModule.register({ secret }), PassportModule.register({ defaultStrategy: 'jwt' })],
    controllers: [StorageController], providers: [StorageService, JwtStrategy,
      { provide: ConfigService, useValue: { get: () => undefined, getOrThrow: () => secret } },
      { provide: UsersService, useValue: { findById: async id => id === 'user-1' ? { id, name: 'Test', email: 'test@example.com', role: 'USER' } : null } }],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  const dir = await mkdtemp(join(tmpdir(), 'promexa-images-http-'));
  app.get(StorageService).directory = dir;
  try {
    await app.listen(0, '127.0.0.1');
    const address = await app.getUrl();
    assert.equal((await fetch(`${address}/storage/images/avatar`, { method: 'POST' })).status, 401);
    const token = app.get(JwtService).sign({ sub: 'user-1' }, { expiresIn: '1m' });
    const buffer = await sharp({ create: { width: 20, height: 20, channels: 3, background: 'blue' } }).png().toBuffer();
    const body = new FormData(); body.append('file', new Blob([buffer], { type: 'image/png' }), 'photo.png');
    const response = await fetch(`${address}/storage/images/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
    assert.equal(response.status, 201);
    const result = await response.json();
    const image = await fetch(`${address}/storage/images/${result.key}`);
    assert.equal(image.status, 200); assert.equal(image.headers.get('content-type'), 'image/webp');
    assert.ok((await image.arrayBuffer()).byteLength > 0);
    const fake = new FormData(); fake.append('file', new Blob(['not an image'], { type: 'image/png' }), 'fake.png');
    assert.equal((await fetch(`${address}/storage/images/post`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fake })).status, 400);
  } finally {
    await app.close();
    assert.ok(dir.startsWith(join(tmpdir(), 'promexa-images-http-')));
    await rm(dir, { recursive: true, force: true });
  }
});
