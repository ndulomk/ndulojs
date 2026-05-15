import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from 'ndulojs';
import { registerOrganizationModule } from '../src/modules/organizations/organization.module.js';

type ElysiaTest = {
  handle(req: Request): Promise<Response>;
};

let elysia: ElysiaTest;

beforeAll(async () => {
  const { app } = await createApp({ port: 0 });
  registerOrganizationModule(app);
  elysia = app.getElysia() as unknown as ElysiaTest;
});

const req = (method: string, path: string, body?: unknown): Request =>
  new Request(`http://localhost${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

describe('Organizations CRUD', () => {
  it('GET /organizations — returns empty list', async () => {
    const res = await elysia.handle(req('GET', '/organizations'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: [] });
  });

  it('POST /organizations — creates an organization', async () => {
    const res = await elysia.handle(
      req('POST', '/organizations', { name: 'Acme Corp', description: 'Test org' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Acme Corp');
    expect(body.data.description).toBe('Test org');
    expect(body.data.id).toBeDefined();
  });

  it('POST /organizations — creates with only name', async () => {
    const res = await elysia.handle(
      req('POST', '/organizations', { name: 'Minimal Inc' }),
    );
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Minimal Inc');
    expect(body.data.description).toBeNull();
  });

  it('GET /organizations/:id — returns a single org', async () => {
    const create = await elysia.handle(
      req('POST', '/organizations', { name: 'Find Me' }),
    );
    const created = await create.json() as any;
    const id = created.data.id;

    const res = await elysia.handle(req('GET', `/organizations/${id}`));
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.name).toBe('Find Me');
  });

  it('GET /organizations/:id — 404 for unknown id', async () => {
    const res = await elysia.handle(req('GET', '/organizations/nonexistent'));
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error.type).toBe('NOT_FOUND');
  });

  it('PUT /organizations/:id — updates an org', async () => {
    const create = await elysia.handle(
      req('POST', '/organizations', { name: 'Old Name' }),
    );
    const created = await create.json() as any;
    const id = created.data.id;

    const res = await elysia.handle(
      req('PUT', `/organizations/${id}`, { name: 'New Name', description: 'Updated' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.name).toBe('New Name');
    expect(body.data.description).toBe('Updated');
  });

  it('PUT /organizations/:id — 404 for unknown id', async () => {
    const res = await elysia.handle(
      req('PUT', `/organizations/unknown-id`, { name: 'Nope' }),
    );
    expect(res.status).toBe(404);
  });

  it('DELETE /organizations/:id — deletes an org', async () => {
    const create = await elysia.handle(
      req('POST', '/organizations', { name: 'To Delete' }),
    );
    const created = await create.json() as any;
    const id = created.data.id;

    const del = await elysia.handle(req('DELETE', `/organizations/${id}`));
    expect(del.status).toBe(200);

    const get = await elysia.handle(req('GET', `/organizations/${id}`));
    expect(get.status).toBe(404);
  });

  it('DELETE /organizations/:id — 404 for unknown id', async () => {
    const res = await elysia.handle(req('DELETE', '/organizations/ghost'));
    expect(res.status).toBe(404);
  });
});
