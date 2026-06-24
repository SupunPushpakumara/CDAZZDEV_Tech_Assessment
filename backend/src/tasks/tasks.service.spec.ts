import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaskSortBy, SortOrder } from './dto/get-tasks-query.dto';
import { TaskPriority, TaskStatus } from '@prisma/client';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: PrismaService;

  const mockPrisma = {
    task: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should paginate results correctly based on page and limit parameters', async () => {
      const projectId = 'project-uuid';
      const query = {
        page: 2,
        limit: 5,
        sortBy: TaskSortBy.DUE_DATE,
        sortOrder: SortOrder.ASC,
      };

      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(12);

      const result = await service.findAll(projectId, query, { role: 'ADMIN' });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: { projectId },
        skip: 5, // (2 - 1) * 5
        take: 5,
        orderBy: { dueDate: 'asc' },
        include: {
          assignee: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      expect(result.meta).toEqual({
        total: 12,
        page: 2,
        limit: 5,
        totalPages: 3,
      });
    });

    it('should apply correct database filters for status, priority, and assigneeId', async () => {
      const projectId = 'project-uuid';
      const query = {
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        assigneeId: 'assignee-uuid',
        page: 1,
        limit: 10,
        sortBy: TaskSortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      };

      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(1);

      await service.findAll(projectId, query, { role: 'ADMIN' });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId,
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          assigneeId: 'assignee-uuid',
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
    });
  });
});
