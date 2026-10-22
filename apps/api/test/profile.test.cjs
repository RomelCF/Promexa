require('ts-node/register/transpile-only');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ValidationPipe, ConflictException } = require('@nestjs/common');
const { UpdateProfileDto } = require('../src/modules/users/dto/update-profile.dto');
const { UsersService } = require('../src/modules/users/users.service');
const { UsersController } = require('../src/modules/users/users.controller');
const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
const validate = body => pipe.transform(body, { type: 'body', metatype: UpdateProfileDto });
test('normalizes profile fields and allows removing a photo', async () => {
  const result = await validate({ name: ' Alice ', email: ' ALICE@example.com ', avatar: '' });
  assert.equal(result.name, 'Alice');
  assert.equal(result.email, 'alice@example.com');
  assert.equal(result.avatar, null);
});
test('rejects blank names, invalid emails, unsafe avatar URLs and privilege edits', async () => {
  const valid = { name: 'Alice', email: 'alice@example.com', avatar: null };
  for (const change of [{ name: '  ' }, { email: 'invalid' }, { avatar: 'javascript:alert(1)' }, { role: 'ADMIN' }, { id: 'other-user' }]) {
    await assert.rejects(validate({ ...valid, ...change }));
  }
});
test('updates only the authenticated profile and never selects the password hash', async () => {
  let query;
  const service = new UsersService({ user: { update: async args => { query = args; return { id: 'alice' }; } } });
  await new UsersController(service).updateProfile({ user: { userId: 'alice' } }, { name: 'New name', email: 'alice@example.com', avatar: null });
  assert.deepEqual(query.where, { id: 'alice' });
  assert.equal(query.select.passwordHash, undefined);
  assert.equal(query.data.role, undefined);
});
test('duplicate email returns a conflict without changing the profile', async () => {
  const service = new UsersService({ user: { update: async () => { throw { code: 'P2002' }; } } });
  await assert.rejects(service.updateProfile('alice', { name: 'Alice', email: 'taken@example.com' }), ConflictException);
});

test('accepts uploaded avatar URLs on localhost and local IP addresses', async () => {
  for (const host of ['localhost:3001', '127.0.0.1:3001', 'api.example.com']) {
    const avatar = `http://${host}/api/v1/storage/images/avatar/user-1/123.webp`;
    const result = await validate({ name: 'Alice', email: 'alice@example.com', avatar });
    assert.equal(result.avatar, avatar);
  }
});
