import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, ProjectRole } from '@prisma/client';

@Injectable()
export class TaskAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Decoded in JwtAuthGuard

    if (!user) {
      throw new ForbiddenException('User authentication session not found.');
    }

    // Admins bypass resource checks globally
    if (user.role === Role.ADMIN) {
      return true;
    }

    const taskId = request.params.id || request.params.taskId;
    if (!taskId) {
      return true;
    }

    // Fetch the task along with its project and membership info for the user
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            members: {
              where: { userId: user.sub },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    // User must belong to the task's project
    const membership = task.project.members[0];
    if (!membership) {
      throw new ForbiddenException('Access Denied. You do not belong to the project containing this task.');
    }

    // Restrict task updates (PATCH/PUT/DELETE) to: Assignee, Project Manager, or Admin (bypassed above)
    const isWriteAction = ['PATCH', 'PUT', 'DELETE'].includes(request.method);
    if (isWriteAction) {
      const isAssignee = task.assigneeId === user.sub;
      const isProjectManager = membership.role === ProjectRole.MANAGER;

      if (!isAssignee && !isProjectManager) {
        throw new ForbiddenException(
          'Access Denied. Only the task assignee, project manager, or an Admin can modify this task.',
        );
      }
    }

    return true;
  }
}
