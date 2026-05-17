import jwt from 'jsonwebtoken';

export function makeToken(opts: { sub?: number; email?: string; role?: string } = {}) {
  return jwt.sign(
    { sub: opts.sub ?? 1, email: opts.email ?? 'test@test.com', role: opts.role ?? 'user' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
}

export function makeChain(result: any = []) {
  const c: any = {};
  for (const m of [
    'from', 'where', 'limit', 'offset', 'orderBy', 'set', 'values',
    'returning', 'onConflictDoNothing', 'innerJoin',
  ]) {
    c[m] = jest.fn(() => c);
  }
  c.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  c.catch = (reject: any) => Promise.resolve(result).catch(reject);
  return c;
}

export function mockRedis() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
  };
}
