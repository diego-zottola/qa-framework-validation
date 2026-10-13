import { test as base, expect } from '@playwright/test';
import { qaFixtures } from '../framework/playwright/fixtures.js';
import { healFixtures } from '../framework/playwright/heal-fixtures.js';
import { PROFILES, useEnvironment } from '../auth/environment-profile.js';
import { apiFixtures } from '../framework/playwright/api-fixtures.js';
import apiConfig from '../api/api.config.js';
import { WorkspacePage } from '../pages/WorkspacePage.js';
import { EditorPage } from '../pages/EditorPage.js';
import { TrashPage } from '../pages/TrashPage.js';
import { MembersPage } from '../pages/MembersPage.js';
import { GroupsPage } from '../pages/GroupsPage.js';
import { SettingsPage } from '../pages/SettingsPage.js';
import { ProfilePage } from '../pages/ProfilePage.js';
// Add one import + one fixture per page object.

// Use another role in a spec: test.use(useEnvironment('<profile name>'))
export const test = base.extend({
  ...qaFixtures,
  ...healFixtures,
  ...apiFixtures(apiConfig, PROFILES),
  workspacePage: async ({ page }, use) => use(new WorkspacePage(page)),
  editorPage: async ({ page }, use) => use(new EditorPage(page)),
  trashPage: async ({ page }, use) => use(new TrashPage(page)),
  membersPage: async ({ page }, use) => use(new MembersPage(page)),
  groupsPage: async ({ page }, use) => use(new GroupsPage(page)),
  settingsPage: async ({ page }, use) => use(new SettingsPage(page)),
  profilePage: async ({ page }, use) => use(new ProfilePage(page)),
  // Playwright requires the destructuring pattern even when no fixture is used.
  // eslint-disable-next-line no-empty-pattern
  environmentProfile: async ({}, use) => use(PROFILES.default),
});

export { expect, useEnvironment };
