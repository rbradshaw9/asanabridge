import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import { prisma } from '../src/config/database';

// Suppress console noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

beforeAll(async () => {
  // Ensure we're using test DB
  if (!process.env.DATABASE_URL?.includes('test') && process.env.NODE_ENV !== 'test') {
    throw new Error('Tests must run with a test DATABASE_URL or NODE_ENV=test');
  }
});

afterEach(async () => {
  // Clean tables in dependency order after each test
  await prisma.agentCommand.deleteMany();
  await prisma.supportResponse.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.syncMapping.deleteMany();
  await prisma.omniFocusSetup.deleteMany();
  await prisma.appSession.deleteMany();
  await prisma.asanaConnection.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
