import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const createMockContext = (user: any, handler: any = () => {}, className: any = {}) => {
    return {
      getHandler: () => handler,
      getClass: () => className,
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if route is decorated as public', () => {
    mockReflector.getAllAndOverride.mockImplementation((key) => {
      if (key === 'isPublic') return true;
      return null;
    });

    const context = createMockContext(null);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if no specific roles are required', () => {
    mockReflector.getAllAndOverride.mockImplementation((key) => {
      if (key === 'isPublic') return false;
      if (key === 'roles') return null;
      return null;
    });

    const context = createMockContext({ role: Role.MEMBER });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user role matches requirements', () => {
    mockReflector.getAllAndOverride.mockImplementation((key) => {
      if (key === 'isPublic') return false;
      if (key === 'roles') return [Role.MANAGER];
      return null;
    });

    const context = createMockContext({ role: Role.MANAGER });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user lacks required roles', () => {
    mockReflector.getAllAndOverride.mockImplementation((key) => {
      if (key === 'isPublic') return false;
      if (key === 'roles') return [Role.ADMIN, Role.MANAGER];
      return null;
    });

    const context = createMockContext({ role: Role.MEMBER });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow access if user is Admin, bypassing role limitations', () => {
    mockReflector.getAllAndOverride.mockImplementation((key) => {
      if (key === 'isPublic') return false;
      if (key === 'roles') return [Role.MANAGER];
      return null;
    });

    const context = createMockContext({ role: Role.ADMIN });
    expect(guard.canActivate(context)).toBe(true);
  });
});
