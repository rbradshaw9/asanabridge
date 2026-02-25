import supertest from 'supertest';
import app from '../src/server';
import { prisma } from '../src/config/database';
import { hashPassword, generateToken, generateAgentKey } from '../src/services/auth';

export const request = supertest(app);

export interface TestUser {
  id: string;
  email: string;
  token: string;
  agentKey: string;
}

export async function createTestUser(opts?: {
  email?: string;
  password?: string;
  plan?: string;
  isAdmin?: boolean;
}): Promise<TestUser> {
  const email = opts?.email ?? `test-${Date.now()}@example.com`;
  const password = opts?.password ?? 'password123!';
  const plan = (opts?.plan ?? 'PRO') as 'FREE' | 'PRO' | 'ENTERPRISE';
  const agentKey = generateAgentKey();

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      name: 'Test User',
      plan,
      isAdmin: opts?.isAdmin ?? false,
    },
  });

  await prisma.omniFocusSetup.create({
    data: { userId: user.id, agentKey, isActive: true },
  });

  const token = generateToken({ userId: user.id, email, plan, isAdmin: opts?.isAdmin ?? false });

  return { id: user.id, email, token, agentKey };
}

export async function createTestMapping(userId: string, opts?: {
  asanaProjectId?: string;
  asanaProjectName?: string;
  ofProjectName?: string;
}) {
  return prisma.syncMapping.create({
    data: {
      userId,
      asanaProjectId: opts?.asanaProjectId ?? 'proj_test_123',
      asanaProjectName: opts?.asanaProjectName ?? 'Test Asana Project',
      ofProjectName: opts?.ofProjectName ?? 'Test OmniFocus Project',
      isActive: true,
    },
  });
}
