import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Projects')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all projects the authenticated user belongs to' })
  @ApiResponse({ status: 200, description: 'List of project memberships returned.' })
  findAll(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.projectsService.findAll(userId, role);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a new project (Admin or Manager only)' })
  @ApiResponse({ status: 201, description: 'Project created. Creator becomes project manager.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Role ADMIN or MANAGER required.' })
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.create(dto, userId);
  }

  @Get(':id')
  @UseGuards(ProjectMemberGuard)
  @ApiOperation({ summary: 'Get details of a specific project by ID (Must be project member)' })
  @ApiResponse({ status: 200, description: 'Project details returned.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Must be project member.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }
}
