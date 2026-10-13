import { BasePage } from './BasePage.js';

/** Workspace shell: sidebar (search, new page, page tree, footer links) and the workspace home. */
export class WorkspacePage extends BasePage {
  constructor(page) {
    super(page);
    this.switcher = page.getByRole('button', { name: 'Cambiar de espacio de trabajo' });
    this.searchButton = page.getByRole('button', { name: /^Buscar/ });
    this.newPageButton = page.getByRole('button', { name: 'Nueva página' });
    this.pageTree = page.getByRole('navigation', { name: 'Páginas' });
    this.trashLink = page.getByRole('link', { name: 'Papelera' });
    this.membersLink = page.getByRole('link', { name: 'Miembros' });
    this.groupsLink = page.getByRole('link', { name: 'Grupos' });
    this.settingsLink = page.getByRole('link', { name: 'Preferencias' });
    this.profileLink = page.getByRole('link', { name: 'Perfil' });
    this.signOutButton = page.getByRole('button', { name: 'Cerrar sesión' });
    this.heading = page.getByRole('heading', { level: 1 });
    this.searchDialog = page.getByRole('dialog', { name: 'Buscar' });
    this.searchBox = page.getByRole('searchbox', { name: 'Buscar páginas' });
  }

  async open(workspaceId = '') {
    await this.navigate(workspaceId ? `/w/${workspaceId}` : '/');
    await this.switcher.waitFor();
  }

  /** The workspace id from the current URL. */
  workspaceId() {
    return new URL(this.page.url()).pathname.match(/^\/w\/([^/]+)/)?.[1];
  }

  treeLink(title) {
    return this.pageTree.getByRole('link', { name: title, exact: true });
  }

  treeRow(title) {
    return this.pageTree.getByRole('listitem').filter({ has: this.page.getByRole('link', { name: title, exact: true }) }).first();
  }

  async openPage(title) {
    await this.treeLink(title).click();
  }

  async addSubpage(parentTitle) {
    await this.page.getByRole('button', { name: `Agregar subpágina en ${parentTitle}`, exact: true }).click();
  }

  async archiveFromMenu(title) {
    await this.page.getByRole('button', { name: `Acciones de ${title}`, exact: true }).click();
    await this.page.getByRole('menuitem', { name: 'Archivar' }).click();
  }

  async search(query) {
    await this.searchButton.click();
    await this.searchBox.fill(query);
  }

  searchResult(title) {
    return this.searchDialog.getByRole('link', { name: title, exact: true });
  }

  workspaceItem(name) {
    return this.page.getByRole('menuitem', { name: new RegExp(`^${name}`) });
  }
}
