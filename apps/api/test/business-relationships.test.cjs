require('ts-node/register/transpile-only');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { UsersService } = require('../src/modules/users/users.service');
const { ChatService } = require('../src/modules/chat/chat.service');
const { ChatGateway } = require('../src/modules/chat/chat.gateway');

function fixture() {
  const users = {
    alice: { id: 'alice', name: 'Alice', profileType: 'personal' },
    bob: { id: 'bob', name: 'Bob', profileType: 'personal' },
    store: { id: 'store', name: 'Store', profileType: 'business' },
    shop: { id: 'shop', name: 'Shop', profileType: 'business' },
  };
  const relations = [], messages = [], notifications = [];
  const matches = (row, where) => Object.entries(where).every(([key, value]) =>
    key === 'OR' ? value.some(part => matches(row, part))
      : key === 'requester' ? users[row.requesterId].profileType === value.profileType
      : key === 'addressee' ? users[row.addresseeId].profileType === value.profileType
      : row[key] === value);
  const prisma = {
    user: {
      findUnique: async ({ where }) => users[where.id] || null,
      findMany: async ({ where }) => Object.values(users).filter(user => user.id !== where.id.not && where.OR.some(condition => {
        if (condition.profileType && user.profileType !== condition.profileType) return false;
        if (condition.sentFriendRequests) return relations.some(row => row.requesterId === user.id && matches(row, condition.sentFriendRequests.some));
        if (condition.receivedFriendRequests) return relations.some(row => row.addresseeId === user.id && matches(row, condition.receivedFriendRequests.some));
        if (condition.sentMessages) return messages.some(row => row.senderId === user.id && matches(row, condition.sentMessages.some));
        if (condition.receivedMessages) return messages.some(row => row.recipientId === user.id && matches(row, condition.receivedMessages.some));
        return false;
      })),
    },
    friendship: {
      findFirst: async ({ where }) => relations.find(row => matches(row, where)) || null,
      findUnique: async ({ where }) => relations.find(row => row.id === where.id),
      findMany: async ({ where }) => relations.filter(row => matches(row, where)).map(row => ({ ...row, requester: users[row.requesterId], addressee: users[row.addresseeId] })),
      create: async ({ data }) => { const row = { id: `r${relations.length}`, ...data }; relations.push(row); return row; },
      update: async ({ where, data }) => Object.assign(relations.find(row => row.id === where.id), data),
      deleteMany: async ({ where }) => { for (let i = relations.length - 1; i >= 0; i--) if (matches(relations[i], where)) relations.splice(i, 1); },
    },
    message: { findFirst: async ({ where }) => messages.find(row => matches(row, where)) || null },
    product: { findFirst: async () => ({ id: 'p', sellerId: 'bob' }) },
    notification: { create: async ({ data }) => { notifications.push(data); return data; }, updateMany: async () => ({ count: 0 }) },
  };
  return { users: new UsersService(prisma), chat: new ChatService(prisma), relations, messages, notifications, prisma };
}

test('personal accounts use pending requests and mutual acceptance', async () => {
  const f = fixture();
  assert.equal((await f.users.sendFriendRequest('alice', 'bob')).status, 'REQUEST_SENT');
  assert.equal(await f.chat.canContact('alice', 'bob'), false);
  await f.users.acceptFriendRequest(f.relations[0].id, 'bob');
  assert.equal((await f.users.getRelationshipStatus('alice', 'bob')).status, 'FRIENDS');
  assert.equal(await f.chat.canContact('alice', 'bob'), true);
  assert.equal((await f.users.getFriends('alice'))[0].id, 'bob');
});

test('following a business is directed, immediate, idempotent and separate from friends', async () => {
  const f = fixture();
  assert.equal((await f.users.followBusiness('alice', 'store')).status, 'FOLLOWING');
  assert.equal((await f.users.followBusiness('alice', 'store')).status, 'FOLLOWING');
  assert.equal(f.relations.length, 1);
  assert.equal(f.notifications[0].type, 'NEW_FOLLOWER');
  assert.deepEqual(await f.users.getFriends('alice'), []);
  assert.deepEqual(await f.users.getFriends('store'), []);
  assert.equal((await f.users.getFollowers('store'))[0].id, 'alice');
  assert.equal((await f.users.getFollowing('alice'))[0].id, 'store');
  assert.equal((await f.users.getRelationshipStatus('store', 'alice')).status, 'FOLLOWER');
  await f.users.unfollowBusiness('alice', 'store');
  assert.equal((await f.users.getRelationshipStatus('alice', 'store')).status, 'NONE');
});

test('business cannot send requests, follow profiles or accept old requests', async () => {
  const f = fixture();
  await assert.rejects(f.users.sendFriendRequest('store', 'alice'), error => error.status === 400);
  await assert.rejects(f.users.followBusiness('store', 'shop'), error => error.status === 400);
  await assert.rejects(f.users.followBusiness('alice', 'bob'), error => error.status === 400);
  f.relations.push({ id: 'old', requesterId: 'alice', addresseeId: 'store', status: 'PENDING' });
  await assert.rejects(f.users.acceptFriendRequest('old', 'store'), error => error.status === 400);
  assert.deepEqual(await f.users.getRecommendedFriends('store'), []);
});

test('person may initiate contact without following; business may reply only after receiving a message', async () => {
  const f = fixture();
  assert.equal(await f.chat.canContact('alice', 'store'), true);
  assert.equal(await f.chat.canContact('store', 'alice'), false);
  await f.users.followBusiness('alice', 'store');
  assert.equal(await f.chat.canContact('store', 'alice'), false);
  // Old outbound history and product context must not bypass the rule.
  f.messages.push({ senderId: 'store', recipientId: 'alice' });
  assert.equal(await f.chat.canContact('store', 'alice', 'p'), false);
  f.messages.push({ senderId: 'alice', recipientId: 'store' });
  assert.equal(await f.chat.canContact('store', 'alice'), true);
  assert.equal(await f.chat.canContact('store', 'bob'), false);
  assert.equal(await f.chat.canContact('store', 'store'), false);
  assert.equal(await f.chat.canContact('alice', 'missing'), false);
});

test('gateway cannot use legacy business friendships to bypass send or typing permissions', async () => {
  const f = fixture();
  f.relations.push({ id: 'legacy', requesterId: 'alice', addresseeId: 'store', status: 'ACCEPTED' });
  const gateway = new ChatGateway({}, f.users, f.chat);
  let emitted = 0;
  gateway.server = { to: () => ({ emit: () => emitted++ }) };
  const client = { data: { user: { id: 'store', expiresAt: Date.now() + 60000 } } };
  assert.deepEqual(await gateway.send(client, { recipientId: 'alice', text: 'Promotion' }), { ok: false, code: 'FORBIDDEN' });
  await gateway.typing(client, { recipientId: 'alice', isTyping: true });
  assert.equal(emitted, 0);
});

test('followers do not become chat contacts until a conversation exists; old outbound history stays read-only', async () => {
  const f = fixture();
  await f.users.followBusiness('alice', 'store');
  assert.deepEqual(await f.chat.contacts('store'), []);
  assert.deepEqual(await f.chat.contacts('alice'), []);
  f.messages.push({ senderId: 'store', recipientId: 'alice' });
  const [oldContact] = await f.chat.contacts('store');
  assert.equal(oldContact.id, 'alice');
  assert.equal(oldContact.canMessage, false);
  f.messages.push({ senderId: 'alice', recipientId: 'store' });
  assert.equal((await f.chat.contacts('store'))[0].canMessage, true);
  assert.equal((await f.chat.contacts('alice'))[0].canMessage, true);
});

test('old reversed business relations are not counted as follows and can be replaced by explicit personal consent', async () => {
  const f = fixture();
  f.relations.push({ id: 'old', requesterId: 'store', addresseeId: 'alice', status: 'ACCEPTED' });
  assert.equal((await f.users.getRelationshipStatus('alice', 'store')).status, 'NONE');
  assert.deepEqual(await f.users.getFollowers('store'), []);
  await f.users.followBusiness('alice', 'store');
  assert.equal(f.relations[0].requesterId, 'alice');
  assert.equal((await f.users.getRelationshipStatus('alice', 'store')).status, 'FOLLOWING');
});
