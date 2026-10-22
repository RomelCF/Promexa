require('ts-node/register/transpile-only');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JwtService } = require('@nestjs/jwt');
const { JwtStrategy } = require('../src/modules/auth/jwt.strategy');
const { UsersController } = require('../src/modules/users/users.controller');
const { PostsController } = require('../src/modules/posts/posts.controller');
const { JwtAuthGuard } = require('../src/modules/auth/jwt-auth.guard');
const secret = 'test-only-signing-key';
const jwt = new JwtService({ secret });
const user = { id: 'user-1', email: 'one@example.test', role: 'USER', name: 'One', avatar: '', isVerified: false };
function authenticate(token) {
  return new Promise((resolve, reject) => {
    const strategy = new JwtStrategy({ findById: async id => id === user.id ? user : null }, { getOrThrow: () => secret });
    strategy.success = value => resolve(value);
    strategy.fail = () => resolve(null);
    strategy.error = error => error.status === 401 ? resolve(null) : reject(error);
    strategy.authenticate({ headers: token ? { authorization: `Bearer ${token}` } : {} });
  });
}
test('accepts a signed token and loads the current database identity', async () => {
  const result = await authenticate(jwt.sign({ sub: user.id, role: 'ADMIN' }));
  assert.equal(result.userId, user.id);
  assert.equal(result.role, 'USER');
});
test('rejects missing, fabricated, expired, wrong-signature and unknown-user tokens', async () => {
  const valid = jwt.sign({ sub: user.id });
  const parts = valid.split('.');
  parts[1] = Buffer.from(JSON.stringify({ sub: 'user-2' })).toString('base64url');
  for (const token of [undefined, 'jwt-token-demo', parts.join('.'),
    jwt.sign({ sub: user.id }, { expiresIn: -1 }),
    jwt.sign({ sub: user.id }, { secret: 'wrong-key' }),
    jwt.sign({ sub: 'deleted-user' }), jwt.sign({})]) {
    assert.equal(await authenticate(token), null);
  }
});
test('users and posts controllers require JWT authentication', () => {
  for (const controller of [UsersController, PostsController]) {
    assert.ok(Reflect.getMetadata('__guards__', controller).includes(JwtAuthGuard));
  }
});
test('post creation uses authenticated identity instead of the supplied author', () => {
  const controller = new PostsController({ create: data => data });
  const result = controller.create({ user: { userId: user.id, avatar: '', isVerified: false } },
    { authorId: 'user-2', authorAvatar: 'forged', isVerified: true, content: 'Hello' });
  assert.equal(result.authorId, user.id);
  assert.equal(result.isVerified, false);
});
