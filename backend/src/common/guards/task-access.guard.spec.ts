import { Test, TestingModule } from '@nestjs/testing';
import { TaskAccessGuard } from './task-access.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, ProjectRole } from '@prisma/client';

describe('TaskAccessGuard', () => {
  let guard: TaskAccessGuard;

  const mockPrisma = {
    task: {
      findUnique: jest.fn(),
    },
  };

  const createMockContext = (
    user: any,
    params: Record<string, string> = {},
    method: string = 'GET',
  ) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params,
          method,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAccessGuard,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    guard = module.get<TaskAccessGuard>(TaskAccessGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow ADMIN users to access any task without further checks', async () => {
    const context = createMockContext(
      { sub: 'admin-id', role: Role.ADMIN },
      { id: 'task-id' },
    );

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    // Admin bypasses — no Prisma call should be made
    expect(mockPrisma.task.findUnique).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when the task does not exist', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(null);

    const context = createMockContext(
      { sub: 'user-id', role: Role.MEMBER },
      { id: 'nonexistent-task' },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when user is not a member of the task project', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      assigneeId: 'other-user',
      project: {
        members: [], // User has no membership
      },
    });

    const context = createMockContext(
      { sub: 'user-id', role: Role.MEMBER },
      { id: 'task-1' },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow project MANAGER to read any task in their project', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      assigneeId: 'other-user',
      project: {
        members: [{ userId: 'manager-id', role: ProjectRole.MANAGER }],
      },
    });

    const context = createMockContext(
      { sub: 'manager-id', role: Role.MANAGER },
      { id: 'task-1' },
      'GET',
    );

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow project MANAGER to update (PATCH) any task in their project', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      assigneeId: 'other-user',
      project: {
        members: [{ userId: 'manager-id', role: ProjectRole.MANAGER }],
      },
    });

    const context = createMockContext(
      { sub: 'manager-id', role: Role.MANAGER },
      { id: 'task-1' },
      'PATCH',
    );

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow task assignee (MEMBER) to read their own task', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      assigneeId: 'member-id',
      project: {
        members: [{ userId: 'member-id', role: ProjectRole.MEMBER }],
      },
    });

    const context = createMockContext(
      { sub: 'member-id', role: Role.MEMBER },
      { id: 'task-1' },
      'GET',
    );

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow task assignee (MEMBER) to update their own task via PATCH', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      assigneeId: 'member-id',
      project: {
        members: [{ userId: 'member-id', role: ProjectRole.MEMBER }],
      },
    });

    const context = createMockContext(
      { sub: 'member-id', role: Role.MEMBER },
      { id: 'task-1' },
      'PATCH',
    );

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should DENY a MEMBER from reading a task not assigned to them', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      assigneeId: 'other-user',
      project: {
        members: [{ userId: 'member-id', role: ProjectRole.MEMBER }],
      },
    });

    const context = createMockContext(
      { sub: 'member-id', role: Role.MEMBER },
      { id: 'task-1' },
      'GET',
    );

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should DENY a MEMBER from PATCHing a task not assigned to them', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      assigneeId: 'other-user',
      project: {
        members: [{ userId: 'member-id', role: ProjectRole.MEMBER }],
      },
    });

    const context = createMockContext(
      { sub: 'member-id', role: Role.MEMBER },
      { id: 'task-1' },
      'PATCH',
    );

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user object is missing', async () => {
    const context = createMockContext(null, { id: 'task-1' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
