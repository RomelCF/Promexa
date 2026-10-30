require('ts-node/register/transpile-only');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ChatGateway } = require('../src/modules/chat/chat.gateway');
function fixture() {
  const deliveries = [];
  const gateway = new ChatGateway({ verifyAsync: async () => ({ sub: 'alice', exp: Date.now() / 1000 + 60 }) }, {
    findById: async () => ({ id: 'alice', name: 'Alice' }),
    getFriends: async () => [{ id: 'bob' }],
  }, { canContact: async (senderId, recipientId) => senderId === 'alice' && recipientId === 'bob', save: async (senderId, recipientId, text) => ({ id: 'saved-message', senderId, recipientId, text, createdAt: new Date().toISOString() }) });
  gateway.server = { to: room => ({ emit: (event, message) => deliveries.push({ room, event, message }) }) };
  const client = { data: { user: { id: 'alice', name: 'Alice', expiresAt: Date.now() + 60000 } },
    handshake: { auth: { token: 'signed' } }, join: async () => {}, emit() {}, disconnect() { this.disconnected = true; },
    to: () => ({ emit() {} }) };
  return { gateway, client, deliveries };
}
test('delivers only to the chosen friend with authenticated sender identity', async () => {
  const { gateway, client, deliveries } = fixture();
  const result = await gateway.send(client, { recipientId: 'bob', text: 'Hello', senderId: 'mallory' });
  assert.equal(result.ok, true);
  assert.equal(result.message.senderId, 'alice');
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].room, 'user:bob');
});
test('rejects messages to non-friends and empty messages', async () => {
  const { gateway, client, deliveries } = fixture();
  assert.equal((await gateway.send(client, { recipientId: 'mallory', text: 'Hello' })).ok, false);
  assert.equal((await gateway.send(client, { recipientId: 'bob', text: ' ' })).ok, false);
  assert.equal(deliveries.length, 0);
});
test('disconnects expired sessions before sending', async () => {
  const { gateway, client, deliveries } = fixture();
  client.data.user.expiresAt = 0;
  assert.equal((await gateway.send(client, { recipientId: 'bob', text: 'Hello' })).ok, false);
  assert.equal(client.disconnected, true);
  assert.equal(deliveries.length, 0);
});
test('invalid JWT cannot open a connection', async () => {
  const { gateway, client } = fixture();
  gateway.jwt.verifyAsync = async () => { throw new Error('Invalid signature'); };
  client.data = {};
  await gateway.handleConnection(client);
  assert.equal(client.disconnected, true);
  assert.equal(client.data.user, undefined);
});

test('does not emit or confirm a message if persistence fails', async () => {
  const { gateway, client, deliveries } = fixture();
  gateway.chat.save = async () => { throw new Error('Database unavailable'); };
  assert.equal((await gateway.send(client, { recipientId: 'bob', text: 'Hello' })).ok, false);
  assert.equal(deliveries.length, 0);
});
const { ChatService } = require('../src/modules/chat/chat.service');
const { ChatController } = require('../src/modules/chat/chat.controller');
test('history is restricted to authenticated participants and sorted chronologically', async () => {
  let query;
  const service = new ChatService({ message: { findMany: async args => { query = args; return []; } } });
  const controller = new ChatController(service);
  await controller.history({ user: { userId: 'alice' } });
  assert.deepEqual(query.where, { OR: [{ senderId: 'alice' }, { recipientId: 'alice' }] });
  assert.deepEqual(query.orderBy, [{ createdAt: 'asc' }, { id: 'asc' }]);
});

test('permits a product inquiry to its seller even without friendship', async () => {
  const { gateway, client } = fixture();
  gateway.users.getFriends = async () => [];
  let context;
  gateway.chat.canContact = async (sender, recipient, productId) => {
    context = { sender, recipient, productId }; return productId === 'product-1' && recipient === 'bob';
  };
  let attached;
  gateway.chat.save = async (senderId, recipientId, text, productId) => {
    attached = productId; return { id: 'saved-inquiry', senderId, recipientId, text };
  };
  assert.equal((await gateway.send(client, { recipientId: 'bob', text: 'Still available?', productId: 'product-1' })).ok, true);
  assert.deepEqual(context, { sender: 'alice', recipient: 'bob', productId: 'product-1' });
  assert.equal(attached, 'product-1');
});
test('product attachment is snapshotted from the database with the message', async () => {
  let written;
  const service = new ChatService({
    product: { findFirst: async query => {
      assert.deepEqual(query.where, { id: 'product-1', sellerId: 'bob' });
      return { id: 'product-1', name: 'Real product', image: 'http://localhost/image.webp' };
    } },
    message: { create: async query => { written = query.data; return query.data; } },
  });
  await service.save('alice', 'bob', 'Hello', 'product-1');
  assert.equal(written.productName, 'Real product');
  assert.equal(written.productImage, 'http://localhost/image.webp');
  assert.equal(written.productId, 'product-1');
});
test('cannot attach a product belonging to a different seller', async () => {
  let saved = false;
  const service = new ChatService({ product: { findFirst: async () => null }, message: { create: async () => { saved = true; } } });
  await assert.rejects(service.save('alice', 'bob', 'Hello', 'other-sellers-product'), error => error.status === 400);
  assert.equal(saved, false);
});

test('temporary database authorization failures are returned as retryable errors', async () => {
  const { gateway, client, deliveries } = fixture();
  gateway.chat.canContact = async () => { throw new Error('Database down'); };
  const response = await gateway.send(client, { recipientId: 'bob', text: 'Hello' });
  assert.deepEqual(response, { ok: false, code: 'TEMPORARY' });
  assert.equal(deliveries.length, 0);
});
test('same idempotency key cannot be reused for different content', async () => {
  const service = new ChatService({ message: { findUnique: async () => ({ id: 'saved', senderId: 'alice', recipientId: 'bob', text: 'Original', productId: null }) } });
  const existing = await service.save('alice', 'bob', 'Original', undefined, 'client-id');
  assert.equal(existing.id, 'saved');
  await assert.rejects(service.save('alice', 'bob', 'Different', undefined, 'client-id'), error => error.status === 400);
});
