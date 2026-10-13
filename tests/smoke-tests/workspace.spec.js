import { test, expect } from '../../fixtures/base.fixture.js';
import { ownedWorkspaceId } from '../../api/api.config.js';

const ownName = `Espacio de ${process.env.TEST_USER_USERNAME}`;

test.describe('Workspace smoke', () => {
  test('TC0005 - the owner lands on the default workspace with the full sidebar', async ({ workspacePage }) => {
    await workspacePage.open();
    await expect(workspacePage.switcher).toContainText(ownName);
    await expect(workspacePage.switcher).toContainText('Propietario');
    for (const link of [workspacePage.trashLink, workspacePage.membersLink, workspacePage.groupsLink, workspacePage.settingsLink, workspacePage.profileLink]) {
      await expect(link).toBeVisible();
    }
    await expect(workspacePage.newPageButton.first()).toBeVisible();
  });

  test('TC0006 - creating a page from the sidebar opens an untitled page in the editor', async ({ page, workspacePage, editorPage, seed }) => {
    await workspacePage.open();
    await workspacePage.newPageButton.first().click();
    await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
    // Registered at once so cleanup runs even if an assertion below fails.
    const name = `qa-auto-${Date.now().toString(36)}-ui`;
    seed.items.push({ kind: 'page', id: editorPage.pageId(), name });
    await expect(editorPage.title).toHaveValue('');
    await expect(editorPage.title).toHaveAttribute('placeholder', 'Sin título');
    await expect(editorPage.saveStatus).toHaveText('Guardado');
  });

  test('TC0007 - a title edit is saved and survives a reload', async ({ page, api, seed, editorPage }) => {
    const created = await seed.create('page');
    await editorPage.open(await ownedWorkspaceId(api), created.id);
    const renamed = `${created.name}-renamed`;
    await editorPage.setTitle(renamed);
    await page.reload();
    await expect(editorPage.title).toHaveValue(renamed);
  });

  test('TC0008 - a page opens from the sidebar tree', async ({ page, api, seed, workspacePage, editorPage }) => {
    const created = await seed.create('page');
    await workspacePage.open(await ownedWorkspaceId(api));
    await workspacePage.openPage(created.name);
    await expect(page).toHaveURL(new RegExp(`/p/${created.id}$`));
    await expect(editorPage.title).toHaveValue(created.name);
  });

  test('TC0009 - search finds a page by its title', async ({ api, seed, workspacePage }) => {
    const created = await seed.create('page');
    await workspacePage.open(await ownedWorkspaceId(api));
    await workspacePage.search(created.name);
    await expect(workspacePage.searchResult(created.name)).toBeVisible();
  });
});
