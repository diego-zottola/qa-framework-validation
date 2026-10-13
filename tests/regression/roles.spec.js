import { test, expect, useEnvironment } from '../../fixtures/base.fixture.js';

// The guest account ("QA Viewer") is a GUEST of the default account's workspace. Permissions below were checked in the app.
test.describe('Guest role', () => {
  test.use(useEnvironment('guest'));

  let workspaceId;
  test.beforeAll(async ({ api }) => {
    // The guest's own session sees the owner's workspace as a membership of role GUEST.
    const rows = await api.json(await api.get('/rest/v1/workspace_members?select=role,workspace:workspaces(id,name)&role=eq.OWNER'));
    workspaceId = rows.find((row) => row.workspace?.name === `Espacio de ${process.env.TEST_USER_USERNAME}`).workspace.id;
  });

  test('TC0024 - the guest sidebar has no new page, trash or groups entries', async ({ workspacePage }) => {
    await workspacePage.open(workspaceId);
    await expect(workspacePage.switcher).toContainText('Invitado');
    await expect(workspacePage.newPageButton).toHaveCount(0);
    await expect(workspacePage.trashLink).toHaveCount(0);
    await expect(workspacePage.groupsLink).toHaveCount(0);
    await expect(workspacePage.membersLink).toBeVisible();
    await expect(workspacePage.settingsLink).toBeVisible();
  });

  test('TC0025 - only the owner can see the trash', async ({ trashPage }) => {
    await trashPage.open(workspaceId);
    await expect(trashPage.ownerOnlyNotice).toBeVisible();
    await expect(trashPage.list).toHaveCount(0);
  });

  test('TC0026 - the guest members page hides the directory and offers to leave the workspace', async ({ membersPage }) => {
    await membersPage.open(workspaceId);
    await expect(membersPage.guestNotice).toBeVisible();
    await expect(membersPage.leaveButton).toBeVisible();
    await expect(membersPage.addForm).toHaveCount(0);
  });

  test('TC0027 - the guest has no access to the groups directory', async ({ groupsPage }) => {
    await groupsPage.open(workspaceId);
    await expect(groupsPage.guestNotice).toBeVisible();
    await expect(groupsPage.createForm).toHaveCount(0);
  });

  test('TC0028 - the guest profile lists the workspaces with the guest role', async ({ profilePage }) => {
    await profilePage.open();
    await expect(profilePage.workspace(`Espacio de ${process.env.TEST_USER_USERNAME}`)).toContainText('Invitado');
  });
});
