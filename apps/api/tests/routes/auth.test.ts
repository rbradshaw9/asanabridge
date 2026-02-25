import { describe, it, expect } from 'vitest';
import { request, createTestUser } from '../helpers';

describe('POST /api/auth/register', () => {
  it('creates a new user and returns a token', async () => {
    const res = await request.post('/api/auth/register').send({
      email: 'newuser@example.com',
      password: 'password123!',
      name: 'New User',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('newuser@example.com');
  });

  it('rejects duplicate email', async () => {
    await request.post('/api/auth/register').send({
      email: 'dup@example.com',
      password: 'password123!',
      name: 'First',
    });
    const res = await request.post('/api/auth/register').send({
      email: 'dup@example.com',
      password: 'password123!',
      name: 'Second',
    });
    expect(res.status).toBe(409);
  });

  it('rejects weak password', async () => {
    const res = await request.post('/api/auth/register').send({
      email: 'weak@example.com',
      password: '123',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns token for valid credentials', async () => {
    await request.post('/api/auth/register').send({
      email: 'login@example.com',
      password: 'password123!',
      name: 'Login User',
    });
    const res = await request
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password123!' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('rejects invalid password', async () => {
    await request.post('/api/auth/register').send({
      email: 'fail@example.com',
      password: 'password123!',
      name: 'Fail User',
    });
    const res = await request
      .post('/api/auth/login')
      .send({ email: 'fail@example.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await request
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123!' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user for valid token', async () => {
    const user = await createTestUser();
    const res = await request
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it('rejects missing token', async () => {
    const res = await request.get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/auth/profile', () => {
  it('updates name', async () => {
    const user = await createTestUser();
    const res = await request
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Updated Name');
  });
});

describe('PATCH /api/auth/password', () => {
  it('changes password with correct current password', async () => {
    const user = await createTestUser({ password: 'oldpass123!' });
    const res = await request
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currentPassword: 'oldpass123!', newPassword: 'newpass456!' });
    expect(res.status).toBe(200);
  });

  it('rejects wrong current password', async () => {
    const user = await createTestUser({ password: 'oldpass123!' });
    const res = await request
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currentPassword: 'wrongpass!', newPassword: 'newpass456!' });
    expect(res.status).toBe(400);
  });
});
