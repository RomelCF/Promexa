require('ts-node/register/transpile-only');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { UsersService } = require('../src/modules/users/users.service');
const { UsersController } = require('../src/modules/users/users.controller');
const { ValidationPipe } = require('@nestjs/common');
const { ChangePasswordDto } = require('../src/modules/users/dto/change-password.dto');
async function fixture() {
  const oldHash = await bcrypt.hash('old-password', 4);
  let written;
  const service = new UsersService({ user: {
    findUnique: async () => ({ id: 'alice', passwordHash: oldHash }),
    updateMany: async query => { written = query; return { count: 1 }; },
  } });
  return { service, oldHash, get written() { return written; } };
}
test('changes only the authenticated user password and stores a bcrypt hash', async () => {
  const f = await fixture();
  const result = await new UsersController(f.service).changePassword({ user: { userId: 'alice' } }, {
    currentPassword: 'old-password', newPassword: 'new-password', confirmPassword: 'new-password',
  });
  assert.equal(f.written.where.id, 'alice'); assert.equal(f.written.where.passwordHash, f.oldHash);
  assert.ok(await bcrypt.compare('new-password', f.written.data.passwordHash));
  assert.equal(await bcrypt.compare('old-password', f.written.data.passwordHash), false);
  assert.equal(result.passwordHash, undefined);
});
test('wrong current password, mismatch and unchanged passwords never write', async () => {
  for (const data of [
    { currentPassword: 'wrong', newPassword: 'new-password', confirmPassword: 'new-password' },
    { currentPassword: 'old-password', newPassword: 'new-password', confirmPassword: 'different' },
    { currentPassword: 'old-password', newPassword: 'old-password', confirmPassword: 'old-password' },
  ]) {
    const f = await fixture(); await assert.rejects(f.service.changePassword('alice', data));
    assert.equal(f.written, undefined);
  }
});
test('password request rejects short passwords and foreign user identity fields', async () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  const valid = { currentPassword: 'old-password', newPassword: 'new-password', confirmPassword: 'new-password' };
  for (const change of [{ newPassword: 'short' }, { userId: 'bob' }]) {
    await assert.rejects(pipe.transform({ ...valid, ...change }, { type: 'body', metatype: ChangePasswordDto }));
  }
});
