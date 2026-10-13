import { test, expect } from '../../fixtures/base.fixture.js';
import { ownedWorkspaceId } from '../../api/api.config.js';

const ownName = `Espacio de ${process.env.TEST_USER_USERNAME}`;

test.describe('Settings, profile and administration (owner)', () => {
  test('TC0029 - preferences show appearance, editor options and the app version', async ({ settingsPage }) => {
    await settingsPage.open();
    await expect(settingsPage.heading).toBeVisible();
    await expect(settingsPage.theme.getByRole('radio')).toHaveCount(3);
    await expect(settingsPage.compactSwitch).toBeVisible();
    await expect(settingsPage.richEditorSwitch).toBeChecked();
    await expect(settingsPage.version).toBeVisible();
  });

  test('TC0030 - choosing a theme selects its option', async ({ settingsPage }) => {
    await settingsPage.open();
    await settingsPage.chooseTheme('Oscuro');
    await expect(settingsPage.themeOption('Oscuro')).toBeChecked();
    await expect(settingsPage.page.locator('html')).toHaveClass(/dark/);
    // Restore the default so the device-local preference does not leak into other tests.
    await settingsPage.chooseTheme('Sistema');
    await expect(settingsPage.themeOption('Sistema')).toBeChecked();
  });

  test('TC0031 - the profile shows the name, the username and the workspaces with their role', async ({ profilePage }) => {
    await profilePage.open();
    await expect(profilePage.nameInput).not.toHaveValue('');
    await expect(profilePage.saveNameButton).toBeDisabled();
    await expect(profilePage.page.getByText(process.env.TEST_USER_USERNAME, { exact: true })).toBeVisible();
    await expect(profilePage.workspace(ownName)).toContainText('Propietario');
  });

  test('TC0032 - the members page lists the owner and the guest with a role selector for the guest', async ({ api, membersPage }) => {
    await membersPage.open(await ownedWorkspaceId(api));
    await expect(membersPage.member('Diego Z. (QA)')).toContainText('Propietario');
    await expect(membersPage.member('QA Viewer')).toBeVisible();
    await expect(membersPage.roleOf('QA Viewer').getByRole('option', { selected: true })).toHaveText('Invitado');
    await expect(membersPage.roleSelect.getByRole('option')).toHaveText(['Administrador', 'Miembro', 'Invitado']);
  });

  test('TC0033 - the add member button stays disabled until an email is typed', async ({ api, membersPage }) => {
    await membersPage.open(await ownedWorkspaceId(api));
    await expect(membersPage.addButton).toBeDisabled();
    await membersPage.emailInput.fill('qa-auto-nobody@example.com');
    await expect(membersPage.addButton).toBeEnabled();
    await membersPage.emailInput.fill('');
    await expect(membersPage.addButton).toBeDisabled();
  });

  test('TC0034 - the groups page lists the QA group and keeps create disabled without a name', async ({ api, groupsPage }) => {
    await groupsPage.open(await ownedWorkspaceId(api));
    await expect(groupsPage.createButton).toBeDisabled();
    await expect(groupsPage.group('Equipo QA')).toBeVisible();
    await expect(groupsPage.group('Equipo QA')).toContainText('Diego Z. (QA)');
    await groupsPage.nameInput.fill('qa-auto-group');
    await expect(groupsPage.createButton).toBeEnabled();
  });

  test('TC0035 - the workspace switcher lists the account workspaces and the create option', async ({ api, workspacePage }) => {
    await workspacePage.open(await ownedWorkspaceId(api));
    await workspacePage.switcher.click();
    await expect(workspacePage.workspaceItem(ownName)).toContainText('Propietario');
    await expect(workspacePage.page.getByRole('menuitem', { name: 'Crear espacio de trabajo' })).toBeVisible();
  });
});
