require('ts-node/register/transpile-only');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { JwtModule, JwtService } = require('@nestjs/jwt');
const { ChatGateway } = require('../src/modules/chat/chat.gateway');
const { ChatService } = require('../src/modules/chat/chat.service');
const { UsersService } = require('../src/modules/users/users.service');
const { io } = require('../../web/node_modules/socket.io-client');
const { randomUUID } = require('node:crypto');
const { realtimeHealth } = require('../src/websockets/realtime-health');
const ack = (socket, event, payload) => new Promise((resolve, reject) => socket.timeout(4000).emit(event, payload, (error, data) => error ? reject(error) : resolve(data)));
const until = async fn => {
  const deadline = Date.now() + 4000;
  while (!fn()) { if (Date.now() > deadline) throw new Error('Timed out'); await new Promise(resolve => setTimeout(resolve, 10)); }
};
test('presence tracks real sessions, multiple tabs, disconnects and concurrent retry delivery', async () => {
  const saved = new Map();
  const service = new ChatService({ message: {
    findUnique: async query => saved.get(query.where.senderId_clientMessageId.senderId + query.where.senderId_clientMessageId.clientMessageId) || null,
    create: async ({ data }) => {
      const key = data.senderId + data.clientMessageId;
      if (saved.has(key)) throw { code: 'P2002' };
      const message = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
      saved.set(key, message); return message;
    },
  } });
  service.contacts = async () => [{ id: 'alice' }, { id: 'bob' }];
  service.canContact = async () => false;
  const users = { findById: async id => ['alice', 'bob'].includes(id) ? { id, name: id } : null,
    getFriends: async id => [{ id: id === 'alice' ? 'bob' : 'alice' }] };
  class TestModule {}
  Module({ imports: [JwtModule.register({ secret: 'realtime-test-secret' })], providers: [ChatGateway,
    { provide: UsersService, useValue: users }, { provide: ChatService, useValue: service }],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  const clients = [];
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl(); const jwt = app.get(JwtService);
    const connect = async id => {
      const socket = io(`${base}/chat`, { auth: { token: jwt.sign({ sub: id }, { expiresIn: '1m' }) }, transports: ['websocket'], forceNew: true, autoConnect: false });
      clients.push(socket);
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Ready timeout')), 4000);
        socket.once('ready', () => { clearTimeout(timer); resolve(); }); socket.connect();
      });
      return socket;
    };
    const alice = await connect('alice');
    assert.equal((await ack(alice, 'watchPresence', { userIds: ['bob'] })).status.bob, false);
    let status; alice.on('presenceChanged', event => { if (event.userId === 'bob') status = event.online; });
    const bob1 = await connect('bob'); await until(() => status === true);
    const bob2 = await connect('bob');
    bob1.disconnect();
    assert.equal((await ack(alice, 'watchPresence', { userIds: ['bob'] })).status.bob, true);
    const id = randomUUID(); const responses = await Promise.all(Array.from({ length: 20 }, () => ack(alice, 'sendMessage', { recipientId: 'bob', text: 'Concurrent retry', clientMessageId: id })));
    assert.ok(responses.every(response => response.ok));
    assert.equal(new Set(responses.map(response => response.message.id)).size, 1);
    assert.equal(saved.size, 1);
    const receivedByAlice = new Set(); const receivedByBob = new Set();
    alice.on('receiveMessage', message => receivedByAlice.add(message.id));
    bob2.on('receiveMessage', message => receivedByBob.add(message.id));
    const simultaneous = await Promise.all(Array.from({ length: 24 }, (_, index) =>
      ack(index % 2 ? alice : bob2, 'sendMessage', {
        recipientId: index % 2 ? 'bob' : 'alice', text: `Simultaneous ${index}`, clientMessageId: randomUUID(),
      })));
    assert.ok(simultaneous.every(response => response.ok));
    await until(() => receivedByAlice.size === 12 && receivedByBob.size === 12);
    assert.equal(saved.size, 25);
    bob2.disconnect(); await until(() => status === false);
    const bobReconnected = await connect('bob'); await until(() => status === true);
    bobReconnected.disconnect(); await until(() => status === false);
    realtimeHealth.available = false;
    assert.equal((await ack(alice, 'watchPresence', { userIds: ['bob'] })).ok, false);
    realtimeHealth.available = true;
    assert.equal((await ack(alice, 'watchPresence', { userIds: ['bob'] })).status.bob, false);
    const invalid = io(`${base}/chat`, { auth: { token: 'invalid' }, transports: ['websocket'], forceNew: true, reconnection: false }); clients.push(invalid);
    let rejected = false; invalid.on('disconnect', () => { rejected = true; });
    await until(() => rejected);
  } finally {
    realtimeHealth.available = true;
    clients.forEach(socket => socket.disconnect());
    await app.close();
  }
});
