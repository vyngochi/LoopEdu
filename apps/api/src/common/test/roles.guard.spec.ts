import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import type { UserRole } from '@loopedu/shared';
import { RolesGuard } from '../roles.guard.js';
import { Roles } from '../roles.decorator.js';

class Handlers {
  @Roles('admin')
  adminOnly() {}

  @Roles('editor', 'admin')
  staff() {}

  open() {}
}

const run = (name: keyof Handlers, roles: UserRole[]) => {
  const handler = Handlers.prototype[name];
  const ctx = {
    getHandler: () => handler,
    getClass: () => Handlers,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u', roles } }) }),
  } as unknown as ExecutionContext;
  return new RolesGuard(new Reflector()).canActivate(ctx);
};

describe('RolesGuard', () => {
  it('lets any signed-in user through a route without @Roles', () => {
    expect(run('open', ['learner'])).toBe(true);
  });

  it('lets through a user holding one of the required roles', () => {
    expect(run('staff', ['editor'])).toBe(true);
    expect(run('adminOnly', ['learner', 'admin'])).toBe(true);
  });

  it('answers FORBIDDEN otherwise', () => {
    expect(() => run('adminOnly', ['editor'])).toThrow(expect.objectContaining({ response: { code: 'FORBIDDEN', message: 'Not allowed' } }));
    expect(() => run('staff', ['learner'])).toThrow();
  });
});
