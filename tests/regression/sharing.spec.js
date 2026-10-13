import { test, expect, useEnvironment } from '../../fixtures/base.fixture.js';
import { ownedWorkspaceId } from '../../api/api.config.js';

// The guest's username is the email the app knows it by.
const guestEmail = process.env.GUEST_USER_USERNAME;

test.describe('Sharing as the owner', () => {
  test('TC0020 - the share dialog lists the people who got access with their permission', async ({ api, seed, editorPage }) => {
    const created = await seed.create('page');
    await editorPage.open(await ownedWorkspaceId(api), created.id);
    await editorPage.openShare();
    await expect(editorPage.shareSubmit).toBeDisabled();
    await expect(editorPage.accessList).toContainText('Nadie todavía.');
    await editorPage.shareEmail.fill(guestEmail);
    await expect(editorPage.shareSubmit).toBeEnabled();
    await editorPage.shareSubmit.click();
    await expect(editorPage.accessList.getByRole('listitem')).toHaveCount(1);
    await expect(editorPage.accessList.getByRole('combobox', { name: /^Permiso de / }).getByRole('option', { selected: true })).toHaveText('Puede ver');
  });

  test('TC0021 - the share dialog offers the three permissions for people and groups', async ({ api, seed, editorPage }) => {
    const created = await seed.create('page');
    await editorPage.open(await ownedWorkspaceId(api), created.id);
    await editorPage.openShare();
    for (const select of [editorPage.sharePermission, editorPage.shareDialog.getByRole('combobox', { name: 'Permiso para el grupo' })]) {
      await expect(select.getByRole('option')).toHaveText(['Puede ver', 'Puede editar', 'Acceso total']);
    }
  });
});

test.describe('Shared page as the guest', () => {
  test.use(useEnvironment('guest'));

  test('TC0022 - a page shared with "Puede ver" appears for the guest as read-only', async ({ api, seed, workspacePage, editorPage }) => {
    const created = await seed.create('page');
    const workspaceId = await ownedWorkspaceId(api);
    await api.json(await api.post('/rest/v1/rpc/share_page', { data: { p_page_id: created.id, p_email: guestEmail, p_permission: 'VIEWER' } }), 'share');
    await workspacePage.open(workspaceId);
    await expect(workspacePage.heading).toHaveText(`Espacio de ${process.env.TEST_USER_USERNAME}`);
    await workspacePage.openPage(created.name);
    await expect(editorPage.readOnlyBadge).toBeVisible();
    await expect(editorPage.title).toHaveValue(created.name);
    await expect(editorPage.shareButton).toHaveCount(0);
    await expect(editorPage.archiveButton).toHaveCount(0);
  });

  test('TC0023 - a page that was not shared is not visible to the guest', async ({ api, seed, workspacePage }) => {
    const created = await seed.create('page');
    await workspacePage.open(await ownedWorkspaceId(api));
    await expect(workspacePage.treeLink(created.name)).toHaveCount(0);
  });
});
