import { test, expect } from '../../fixtures/api.fixture.js';
import { ApiSession } from '../../framework/lib/api/session.js';
import apiConfig, { ownedWorkspaceId } from '../../api/api.config.js';
import { PROFILES } from '../../auth/environment-profile.js';

// The guest's own username is the email the app knows it by.
const guestEmail = process.env.GUEST_USER_USERNAME;
const rpc = (api, name, data) => api.post(`/rest/v1/rpc/${name}`, { data });
const pageById = async (api, id) => api.json(await api.get(`/rest/v1/pages?select=id,title,archived_at&id=eq.${id}`));

test.describe('Pages API (Supabase PostgREST)', () => {
  test('TC0036 - anonymous requests cannot read pages', async () => {
    const anonymous = await ApiSession.create({ config: { ...apiConfig, auth: { mode: 'none' } }, profiles: PROFILES });
    try {
      const response = await anonymous.get('/rest/v1/pages?select=id&limit=1');
      expect(response.status()).toBe(401);
    } finally {
      await anonymous.dispose();
    }
  });

  test('TC0037 - a created page is returned with its title, workspace and no parent', async ({ api, seed }) => {
    const created = await seed.create('page');
    const workspaceId = await ownedWorkspaceId(api);
    const rows = await api.json(await api.get(`/rest/v1/pages?select=*&id=eq.${created.id}`));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: created.name, workspace_id: workspaceId, parent_id: null, archived_at: null });
  });

  test('TC0038 - the title can be updated with a PATCH', async ({ api, seed }) => {
    const created = await seed.create('page');
    const response = await api.patch(`/rest/v1/pages?id=eq.${created.id}`, {
      data: { title: `${created.name}-b` },
      headers: { Prefer: 'return=representation' },
    });
    expect(response.status()).toBe(200);
    expect((await pageById(api, created.id))[0].title).toBe(`${created.name}-b`);
  });

  test('TC0039 - a direct DELETE on the table is not permitted', async ({ api, seed }) => {
    const created = await seed.create('page');
    const response = await api.delete(`/rest/v1/pages?id=eq.${created.id}`);
    expect(response.status()).toBe(403);
    expect(await pageById(api, created.id)).toHaveLength(1);
  });

  test('TC0040 - archive_page marks the page archived and hides it from search', async ({ api, seed }) => {
    const created = await seed.create('page');
    const workspaceId = await ownedWorkspaceId(api);
    const search = async () => api.json(await rpc(api, 'search_pages', { p_workspace_id: workspaceId, p_query: created.name }));
    expect((await search()).map((row) => row.id)).toContain(created.id);
    expect((await rpc(api, 'archive_page', { p_page_id: created.id })).status()).toBe(204);
    expect((await pageById(api, created.id))[0].archived_at).not.toBeNull();
    expect((await search()).map((row) => row.id)).not.toContain(created.id);
  });

  test('TC0041 - delete_page_permanently removes an archived page', async ({ api, seed }) => {
    const created = await seed.create('page');
    await rpc(api, 'archive_page', { p_page_id: created.id });
    const response = await rpc(api, 'delete_page_permanently', { p_page_id: created.id });
    expect(response.ok()).toBe(true);
    expect(await pageById(api, created.id)).toEqual([]);
  });

  test('TC0042 - share_page grants the guest read access to that page only', async ({ api, seed }) => {
    const shared = await seed.create('page');
    const hidden = await seed.create('page');
    const guest = await ApiSession.create({ config: { ...apiConfig, auth: { ...apiConfig.auth, profile: 'guest' } }, profiles: PROFILES });
    try {
      const list = async (id) => guest.json(await guest.get(`/rest/v1/pages?select=id&id=eq.${id}`));
      expect(await list(shared.id)).toEqual([]);
      const share = await rpc(api, 'share_page', { p_page_id: shared.id, p_email: guestEmail, p_permission: 'VIEWER' });
      expect(share.ok()).toBe(true);
      expect(await list(shared.id)).toEqual([{ id: shared.id }]);
      expect(await list(hidden.id)).toEqual([]);
    } finally {
      await guest.dispose();
    }
  });

  test('TC0043 - the guest cannot edit, archive or delete a page shared as viewer', async ({ api, seed }) => {
    const created = await seed.create('page');
    await rpc(api, 'share_page', { p_page_id: created.id, p_email: guestEmail, p_permission: 'VIEWER' });
    const guest = await ApiSession.create({ config: { ...apiConfig, auth: { ...apiConfig.auth, profile: 'guest' } }, profiles: PROFILES });
    try {
      const patch = await guest.patch(`/rest/v1/pages?id=eq.${created.id}`, { data: { title: 'qa-auto-hacked' }, headers: { Prefer: 'return=representation' } });
      expect(await guest.json(patch)).toEqual([]);
      expect((await rpc(guest, 'archive_page', { p_page_id: created.id })).status()).toBe(403);
      expect((await rpc(guest, 'delete_page_permanently', { p_page_id: created.id })).status()).toBe(403);
      expect((await pageById(api, created.id))[0].title).toBe(created.name);
    } finally {
      await guest.dispose();
    }
  });
});
