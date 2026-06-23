import { PrismaClient, Role, ProjectRole, TaskStatus, TaskPriority } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. Clear existing database entries (Delete in reverse dependency order)
  await prisma.comment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Cleaned existing database entries.');

  // 2. Hash password for all seed users
  const commonPasswordHash = await bcrypt.hash('password123', 10);

  // 3. Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@teamsync.com',
      name: 'Super Admin User',
      passwordHash: commonPasswordHash,
      role: Role.ADMIN,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@teamsync.com',
      name: 'Sarah Project Manager',
      passwordHash: commonPasswordHash,
      role: Role.MANAGER,
    },
  });

  const developer1 = await prisma.user.create({
    data: {
      email: 'dev1@teamsync.com',
      name: 'Alex Developer',
      passwordHash: commonPasswordHash,
      role: Role.MEMBER,
    },
  });

  const developer2 = await prisma.user.create({
    data: {
      email: 'dev2@teamsync.com',
      name: 'Jordan Designer',
      passwordHash: commonPasswordHash,
      role: Role.MEMBER,
    },
  });

  console.log(`Created ${4} users.`);

  // 4. Create Project 1 (Owned by Sarah the Manager)
  const project1 = await prisma.project.create({
    data: {
      name: 'TeamSync App Development',
      description: 'Building the NestJS, Next.js, and React Native application core.',
      ownerId: manager.id,
      members: {
        createMany: {
          data: [
            { userId: manager.id, role: ProjectRole.MANAGER },
            { userId: developer1.id, role: ProjectRole.MEMBER },
            { userId: developer2.id, role: ProjectRole.MEMBER },
          ],
        },
      },
    },
  });

  // Create Project 2 (Sarah Manager is also owner, only Jordan is a member, Alex developer is excluded)
  const project2 = await prisma.project.create({
    data: {
      name: 'Marketing Campaign 2026',
      description: 'Creating website marketing assets and copy writing.',
      ownerId: manager.id,
      members: {
        createMany: {
          data: [
            { userId: manager.id, role: ProjectRole.MANAGER },
            { userId: developer2.id, role: ProjectRole.MEMBER },
          ],
        },
      },
    },
  });

  console.log(`📁 Created ${2} projects and established memberships.`);

  // 5. Create Tasks for Project 1 (TeamSync App Development)
  const task1 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: 'Design Database Schema',
      description: 'Model User, Project, ProjectMember, Task, and Comment schemas with correct relations and index definitions.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      assigneeId: developer1.id,
      dueDate: new Date('2026-06-25T12:00:00Z'),
    },
  });

  const task2 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: 'Implement Authentication API',
      description: 'Build JWT registration, login, and single-use refresh token rotation endpoints.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      assigneeId: developer1.id,
      dueDate: new Date('2026-06-28T18:00:00Z'),
    },
  });

  const task3 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: 'Figma Screen Hand-off and Style Tokens',
      description: 'Define styling tokens for colors, typography, spacing scales, and border radiuses in Next.js.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      assigneeId: developer2.id,
      dueDate: new Date('2026-07-02T12:00:00Z'),
    },
  });

  const task4 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: 'Expo SecureStore Integration',
      description: 'Write local secure token persistence logic for iOS/Android platforms.',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      assigneeId: developer1.id,
      dueDate: new Date('2026-07-05T12:00:00Z'),
    },
  });

  const task5 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: 'Setup CI/CD Pipeline Mock',
      description: 'Write GHA templates validating build, lint, and test runs.',
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      assigneeId: null, // Unassigned task
      dueDate: null,
    },
  });

  // Task for Project 2 (Marketing Campaign)
  const task6 = await prisma.task.create({
    data: {
      projectId: project2.id,
      title: 'Create Landing Page Design Mockup',
      description: 'Generate high-fidelity web page landing designs for marketing sign-ups.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      assigneeId: developer2.id,
      dueDate: new Date('2026-06-29T12:00:00Z'),
    },
  });

  console.log(`📝 Created ${6} tasks across projects.`);

  // 6. Create Comments
  await prisma.comment.create({
    data: {
      taskId: task1.id,
      authorId: manager.id,
      body: 'Excellent schema modeling! Please add composite indexes on Task for filtering performance.',
    },
  });

  await prisma.comment.create({
    data: {
      taskId: task1.id,
      authorId: developer1.id,
      body: 'Thanks Sarah. Added composite index covering [projectId, status, assigneeId, dueDate].',
    },
  });

  await prisma.comment.create({
    data: {
      taskId: task2.id,
      authorId: developer1.id,
      body: 'JWT token rotation logic is complete. Working on unit testing the guards now.',
    },
  });

  console.log('💬 Seeded initial task comments.');
  console.log('🌱 Seeding database complete! Default password for all users is: password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
