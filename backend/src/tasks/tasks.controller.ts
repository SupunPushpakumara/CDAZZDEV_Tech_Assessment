import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';
import { TaskAccessGuard } from '../common/guards/task-access.guard';
import { RequiresProjectManager } from '../common/decorators/requires-project-manager.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Tasks & Comments')
@ApiBearerAuth('JWT-auth')
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('projects/:id/tasks')
  @UseGuards(ProjectMemberGuard)
  @ApiOperation({ summary: 'Get all tasks for a project (Project members only)' })
  @ApiResponse({ status: 200, description: 'Filtered, paginated, and sorted task list returned.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Project membership required.' })
  findAll(
    @Param('id') projectId: string,
    @Query() query: GetTasksQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.findAll(projectId, query, user);
  }

  @Post('projects/:id/tasks')
  @RequiresProjectManager()
  @UseGuards(ProjectMemberGuard)
  @ApiOperation({ summary: 'Create a new task under a project (Project Managers or Admins only)' })
  @ApiResponse({ status: 201, description: 'Task successfully created.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Manager role required.' })
  create(
    @Param('id') projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(projectId, dto);
  }

  @Get('tasks/:id')
  @UseGuards(TaskAccessGuard)
  @ApiOperation({ summary: 'Get details of a specific task (Project members only)' })
  @ApiResponse({ status: 200, description: 'Task details with comments returned.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Project membership required.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch('tasks/:id')
  @UseGuards(TaskAccessGuard)
  @ApiOperation({ summary: 'Update task properties (Assignee, Project Managers, or Admins only)' })
  @ApiResponse({ status: 200, description: 'Task successfully updated.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Owner/Manager role required.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, dto);
  }

  @Post('tasks/:id/comments')
  @UseGuards(TaskAccessGuard)
  @ApiOperation({ summary: 'Add a comment to a task (Project members only)' })
  @ApiResponse({ status: 201, description: 'Comment successfully added.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Project membership required.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  addComment(
    @Param('id') taskId: string,
    @CurrentUser('sub') authorId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.tasksService.addComment(taskId, authorId, dto);
  }
}
