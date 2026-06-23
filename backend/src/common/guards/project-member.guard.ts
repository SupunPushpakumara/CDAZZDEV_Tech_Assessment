import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, ProjectRole } from '@prisma/client';
import { REQUIRES_PROJECT_MANAGER_KEY } from '../decorators/requires-project-manager.decorator';

@Injectable()
export class ProjectMemberGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Decoded in JwtAuthGuard

    if (!user) {
      throw new ForbiddenException('User authentication session not found.');
    }

    // Admins bypass project membership checks globally
    if (user.role === Role.ADMIN) {
      return true;
    }

    // Extract project ID from request parameters
    const projectId = request.params.id || request.params.projectId;
    if (!projectId) {
      return true;
    }

    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    // Verify project membership
    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: user.sub,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access Denied. You are not a member of this project.');
    }

    // Check if route requires MANAGER project role
    const requiresManager = this.reflector.get<boolean>(
      REQUIRES_PROJECT_MANAGER_KEY,
      context.getHandler(),
    );

    if (requiresManager && membership.role !== ProjectRole.MANAGER) {
      throw new ForbiddenException('Access Denied. Only project managers can perform this action.');
    }

    return true;
  }
}
