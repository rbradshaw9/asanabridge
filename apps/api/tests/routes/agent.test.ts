import { describe, it, expect, vi } from 'vitest';
import { request, createTestUser, createTestMapping } from '../helpers';

vi.mock('../../src/services/sync-engine', () => ({
  SyncEngine: {
    performSync: vi.fn().mockResolvedValue({
      created: [],
      updated: [],
      deleted: [],
      conflicts: [],
      errors: [],
    }),
  },
}));

describe('POST /api/agent/register', () => {
  it('registers agent with agent key auth', async () => {
    const user = await createTestUser();
    const res = await request
      .post('/api/agent/register')
      .set('Authorization', `Bearer ${user.agentKey}`)
      .send({ version: '2.3.0', platform: 'macos' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Agent registered');
  });

  it('registers agent with JWT auth', async () => {
    const user = await createTestUser();
    const res = await request
      .post('/api/agent/register')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ version: '2.3.0', platform: 'macos' });
    expect(res.status).toBe(200);
  });

  it('rejects unauthenticated request', async () => {
    const res = await request
      .post('/api/agent/register')
      .send({ version: '2.3.0' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/agent/config', () => {
  it('returns sync config for authenticated agent', async () => {
    const user = await createTestUser({ plan: 'PRO' });
    const res = await request
      .get('/api/agent/config')
      .set('Authorization', `Bearer ${user.agentKey}`);
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('PRO');
    expect(res.body).toHaveProperty('syncIntervalMinutes');
  });
});

describe('GET /api/agent/mappings', () => {
  it('returns active mappings for the user', async () => {
    const user = await createTestUser();
    await createTestMapping(user.id);
    const res = await request
      .get('/api/agent/mappings')
      .set('Authorization', `Bearer ${user.agentKey}`);
    expect(res.status).toBe(200);
    expect(res.body.mappings).toHaveLength(1);
  });
});

describe('POST /api/agent/heartbeat', () => {
  it('records heartbeat', async () => {
    const user = await createTestUser();
    const res = await request
      .post('/api/agent/heartbeat')
      .set('Authorization', `Bearer ${user.agentKey}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/agent/commands', () => {
  it('returns empty commands list for fresh agent', async () => {
    const user = await createTestUser();
    const res = await request
      .get('/api/agent/commands')
      .set('Authorization', `Bearer ${user.agentKey}`);
    expect(res.status).toBe(200);
    expect(res.body.commands).toHaveLength(0);
  });
});

describe('GET /api/agent/status (JWT)', () => {
  it('returns agent status for web dashboard', async () => {
    const user = await createTestUser();
    const res = await request
      .get('/api/agent/status')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('registered');
    expect(res.body).toHaveProperty('isOnline');
  });
});

describe('POST /api/agent/generate-key (JWT)', () => {
  it('generates a new agent key', async () => {
    const user = await createTestUser();
    const res = await request
      .post('/api/agent/generate-key')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('agentKey');
    expect(res.body.agentKey).toHaveLength(64);
  });
});

describe('POST /api/agent/disconnect (JWT)', () => {
  it('disconnects the agent', async () => {
    const user = await createTestUser();
    const res = await request
      .post('/api/agent/disconnect')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
  });
});
