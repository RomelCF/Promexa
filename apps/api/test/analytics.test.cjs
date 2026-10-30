require('ts-node/register/transpile-only');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AnalyticsService, localDay, metricsRange } = require('../src/modules/analytics/analytics.service');
const { AnalyticsController } = require('../src/modules/analytics/analytics.controller');
const { AdminGuard } = require('../src/common/guards/admin.guard');
const { JwtAuthGuard } = require('../src/modules/auth/jwt-auth.guard');
const { UsersController } = require('../src/modules/users/users.controller');
const { AuthService } = require('../src/modules/auth/auth.service');

test('Lima midnight and date ranges use the business timezone, including year changes', () => {
  assert.equal(localDay(new Date('2026-10-31T04:59:59Z')), '2026-10-30');
  assert.equal(localDay(new Date('2026-10-31T05:00:00Z')), '2026-10-31');
  const range = metricsRange('7', new Date('2027-01-02T04:00:00Z'));
  assert.equal(range.start.toISOString().slice(0, 10), '2026-12-26');
  assert.equal(range.end.toISOString().slice(0, 10), '2027-01-01');
  for (const value of ['0', '-1', '365', '7.5', '', 'abc', '7 OR 1=1']) assert.throws(() => metricsRange(value), error => error.status === 400);
});

test('repeated logins increment the same user/day and admin sessions are excluded', async () => {
  const queries = [];
  const service = new AnalyticsService({ dailyUserAccess: { upsert: async args => queries.push(args) } });
  const user = { id: 'alice', role: 'USER', profileType: 'personal' };
  await service.recordLogin(user, new Date('2026-10-30T12:00:00Z'));
  await service.recordLogin(user, new Date('2026-10-30T23:00:00Z'));
  await service.recordLogin({ ...user, role: 'ADMIN' });
  assert.equal(queries.length, 2);
  assert.deepEqual(queries[0].where, queries[1].where);
  assert.deepEqual(queries[1].update.loginCount, { increment: 1 });
});

test('dashboard distinguishes period unique users, daily unique users, logins and unavailable sales', async () => {
  const rows = [
    { day: new Date('2026-10-29Z'), profileType: 'personal', _count: { _all: 2 }, _sum: { loginCount: 4 } },
    { day: new Date('2026-10-30Z'), profileType: 'personal', _count: { _all: 2 }, _sum: { loginCount: 3 } },
    { day: new Date('2026-10-30Z'), profileType: 'business', _count: { _all: 1 }, _sum: { loginCount: 2 } },
  ];
  const service = new AnalyticsService({
    user: { count: async () => 2, findMany: async () => [{ id: 'store', name: 'Store', isVerified: true, _count: { products: 5 } }] },
    product: { count: async () => 5 },
    dailyUserAccess: { groupBy: async () => rows, findMany: async () => [{ userId: 'alice' }, { userId: 'bob' }, { userId: 'store' }], findFirst: async () => ({ day: new Date('2026-10-29Z') }) },
  });
  const result = await service.dashboard('7', new Date('2026-10-30T18:00:00Z'));
  assert.equal(result.daily.length, 7);
  assert.equal(result.activity.uniqueUsers, 3);
  assert.equal(result.activity.logins, 9);
  assert.deepEqual(result.activity.today, { date: '2026-10-30', personal: 2, business: 1, uniqueUsers: 3, logins: 5 });
  assert.equal(result.daily[0].uniqueUsers, 0);
  assert.equal(result.sales.available, false);
  assert.equal(result.sales.confirmedUnits, null);
  assert.equal(result.sales.revenue, null);
  assert.equal(result.businesses[0].soldUnits, null);
  assert.equal(result.businesses[0].publishedProducts, 5);
});

test('metrics and management endpoints require a current admin role', () => {
  const guard = new AdminGuard();
  const context = user => ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) });
  for (const user of [undefined, { role: 'USER' }, { role: 'BUSINESS' }]) assert.throws(() => guard.canActivate(context(user)), error => error.status === 403);
  assert.equal(guard.canActivate(context({ role: 'ADMIN' })), true);
  const guards = Reflect.getMetadata('__guards__', AnalyticsController);
  assert.ok(guards.includes(JwtAuthGuard)); assert.ok(guards.includes(AdminGuard));
  for (const method of ['getAllUsersForAdmin', 'updateUserByAdmin', 'deleteUserByAdmin']) {
    assert.ok(Reflect.getMetadata('__guards__', UsersController.prototype[method]).includes(AdminGuard));
  }
});

test('only successful authentication and automatic registration access create login metrics', async () => {
  const recorded = [];
  const user = { id: 'alice', profileType: 'personal', role: 'USER', passwordHash: 'private' };
  const service = new AuthService({ create: async () => user, findById: async () => user }, { signAsync: async () => 'token' }, { recordLogin: async user => recorded.push(user) });
  service.validateUser = async () => { throw new Error('Invalid credentials'); };
  await assert.rejects(service.login({ email: 'bad', password: 'bad' }));
  assert.equal(recorded.length, 0);
  service.validateUser = async () => { const { passwordHash, ...safe } = user; return safe; };
  await service.login({ email: 'alice', password: 'valid' });
  const registered = await service.register({});
  assert.equal(recorded.length, 2);
  assert.equal(recorded[1].passwordHash, undefined);
  assert.equal(registered.user.passwordHash, undefined);
  await service.getProfile('alice');
  assert.equal(recorded.length, 2);
});
