import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, createTestUser, createTestMapping } from '../helpers';

// Mock SyncEngine to avoid real Asana API calls
vi.mock('../../src/services/sync-engine', () => ({
  SyncEngine: {
    performSync: vi.fn().mockResolvedValue({
      created: ['task1'],
      updated: [],
      deleted: [],
      conflicts: [],
      errors: [],
    }),
  },
}));

describe('POST /api/sync/mappings', () => {
  it('creates a sync mapping', async () => {
    const user = await createTestUser();
    const res = await request
      .post('/api/sync/mappings')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        asanaProjectId: 'proj_abc',
        asanaProjectName: 'My Asana Project',
        ofProjectName: 'My OmniFocus Project',
      });
    expect(res.status).toBe(201);
    expect(res.body.mapping.asanaProjectId).toBe('proj_abc');
  });

  it('rejects missing fields', async () => {
    const user = await createTestUser();
    const res = await request
      .post('/api/sync/mappings')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ asanaProjectId: 'proj_abc' });
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request.post('/api/sync/mappings').send({
      asanaProjectId: 'proj_abc',
      asanaProjectName: 'X',
      ofProjectName: 'Y',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/sync/mappings', () => {
  it('returns user mappings', async () => {
    const user = await createTestUser();
    await createTestMapping(user.id);
    const res = await request
      .get('/api/sync/mappings')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.mappings).toHaveLength(1);
  });

  it('only returns mappings for the authenticated user', async () => {
    const user1 = await createTestUser({ email: 'u1@example.com' });
    const user2 = await createTestUser({ email: 'u2@example.com' });
    await createTestMapping(user1.id);
    await createTestMapping(user1.id, { asanaProjectId: 'proj_2' });

    const res = await request
      .get('/api/sync/mappings')
      .set('Authorization', `Bearer ${user2.token}`);
    expect(res.body.mappings).toHaveLength(0);
  });
});

describe('DELETE /api/sync/mappings/:id', () => {
  it('deletes own mapping', async () => {
    const user = await createTestUser();
    const mapping = await createTestMapping(user.id);
    const res = await request
      .delete(`/api/sync/mappings/${mapping.id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
  });

  it('cannot delete another user\'s mapping', async () => {
    const user1 = await createTestUser({ email: 'owner@example.com' });
    const user2 = await createTestUser({ email: 'other@example.com' });
    const mapping = await createTestMapping(user1.id);
    const res = await request
      .delete(`/api/sync/mappings/${mapping.id}`)
      .set('Authorization', `Bearer ${user2.token}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/sync/stats', () => {
  it('returns user sync stats', async () => {
    const user = await createTestUser();
    const res = await request
      .get('/api/sync/stats')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalMappings');
  });
});
