import { test, expect } from '../../fixtures/base.fixture.js';
import { ownedWorkspaceId } from '../../api/api.config.js';

test.describe('Pages', () => {
  test('TC0010 - body text is saved and survives a reload', async ({ page, api, seed, editorPage }) => {
    const created = await seed.create('page');
    await editorPage.open(await ownedWorkspaceId(api), created.id);
    const saved = editorPage.savedRequest('blocks');
    await editorPage.typeBody('qa-auto body text');
    await saved;
    await page.reload();
    await expect(editorPage.body).toContainText('qa-auto body text');
  });

  test('TC0011 - a subpage is nested under its parent in the sidebar', async ({ page, api, seed, workspacePage, editorPage }) => {
    const parent = await seed.create('page');
    await workspacePage.open(await ownedWorkspaceId(api));
    await workspacePage.addSubpage(parent.name);
    await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
    // The subpage is removed with its parent (permanent delete cascades), so only the parent is registered.
    const child = editorPage.pageId();
    expect(child).not.toBe(parent.id);
    const nested = workspacePage.treeRow(parent.name).getByRole('group').getByRole('link', { name: 'Sin título' });
    await expect(nested).toBeVisible();
    await expect(nested).toHaveAttribute('href', new RegExp(`/p/${child}$`));
  });

  test('TC0012 - archiving a page asks for confirmation and moves it to the trash', async ({ api, seed, workspacePage, editorPage, trashPage }) => {
    const created = await seed.create('page');
    const workspaceId = await ownedWorkspaceId(api);
    await editorPage.open(workspaceId, created.id);
    await editorPage.archive();
    await expect(workspacePage.treeLink(created.name)).toHaveCount(0);
    await trashPage.open(workspaceId);
    await expect(trashPage.item(created.name)).toBeVisible();
    await expect(trashPage.item(created.name)).toContainText('En la raíz');
  });

  test('TC0013 - cancelling the archive confirmation keeps the page', async ({ api, seed, workspacePage, editorPage }) => {
    const created = await seed.create('page');
    await editorPage.open(await ownedWorkspaceId(api), created.id);
    await editorPage.archiveButton.click();
    await expect(editorPage.archiveConfirm).toContainText('También se archivan todas sus subpáginas');
    await editorPage.archiveConfirm.getByRole('button', { name: 'Cancelar' }).click();
    await expect(editorPage.archiveConfirm).toBeHidden();
    await expect(workspacePage.treeLink(created.name)).toBeVisible();
  });

  test('TC0014 - an archived page can be restored from the trash', async ({ api, seed, workspacePage, trashPage }) => {
    const created = await seed.create('page');
    const workspaceId = await ownedWorkspaceId(api);
    await api.post('/rest/v1/rpc/archive_page', { data: { p_page_id: created.id } });
    await trashPage.open(workspaceId);
    await trashPage.restore(created.name);
    await expect(trashPage.item(created.name)).toHaveCount(0);
    await workspacePage.open(workspaceId);
    await expect(workspacePage.treeLink(created.name)).toBeVisible();
  });

  test('TC0015 - an archived page can be deleted permanently from the trash', async ({ api, seed, trashPage }) => {
    const created = await seed.create('page');
    await api.post('/rest/v1/rpc/archive_page', { data: { p_page_id: created.id } });
    await trashPage.open(await ownedWorkspaceId(api));
    await expect(trashPage.item(created.name)).toBeVisible();
    await trashPage.deletePermanently(created.name);
    await expect(trashPage.item(created.name)).toHaveCount(0);
    const rows = await api.json(await api.get(`/rest/v1/pages?select=id&id=eq.${created.id}`));
    expect(rows).toEqual([]);
  });

  test('TC0016 - the page actions menu offers move up, move down, move and archive', async ({ api, seed, workspacePage }) => {
    const created = await seed.create('page');
    await workspacePage.open(await ownedWorkspaceId(api));
    await workspacePage.page.getByRole('button', { name: `Acciones de ${created.name}`, exact: true }).click();
    const menu = workspacePage.page.getByRole('menu', { name: `Acciones de ${created.name}` });
    for (const item of ['Subir', 'Bajar', 'Mover a…', 'Archivar']) {
      await expect(menu.getByRole('menuitem', { name: item })).toBeVisible();
    }
  });

  test('TC0017 - searching for text that matches nothing says so', async ({ api, workspacePage }) => {
    await workspacePage.open(await ownedWorkspaceId(api));
    await workspacePage.search('qa-auto-no-such-page-zzzz');
    await expect(workspacePage.searchDialog.getByText('Sin resultados')).toBeVisible();
  });

  test('TC0018 - search also finds a page by its body text', async ({ page, api, seed, workspacePage, editorPage }) => {
    const created = await seed.create('page');
    const workspaceId = await ownedWorkspaceId(api);
    await editorPage.open(workspaceId, created.id);
    const word = `needle${Date.now().toString(36)}`;
    const saved = editorPage.savedRequest('blocks');
    await editorPage.typeBody(word);
    await saved;
    await workspacePage.open(workspaceId);
    await workspacePage.search(word);
    await expect(workspacePage.searchResult(created.name)).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Buscar' })).toBeVisible();
  });

  test('TC0019 - an archived page is not returned by search', async ({ api, seed, workspacePage }) => {
    const created = await seed.create('page');
    await api.post('/rest/v1/rpc/archive_page', { data: { p_page_id: created.id } });
    await workspacePage.open(await ownedWorkspaceId(api));
    await workspacePage.search(created.name);
    await expect(workspacePage.searchDialog.getByText('Sin resultados')).toBeVisible();
  });
});
