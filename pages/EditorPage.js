import { BasePage } from './BasePage.js';

/** A page in the editor: breadcrumb, actions, title, body and the share dialog. */
export class EditorPage extends BasePage {
  constructor(page) {
    super(page);
    this.article = page.getByRole('article');
    this.title = page.getByRole('textbox', { name: 'Título de la página' });
    this.saveStatus = page.getByRole('status', { name: 'Estado de guardado' });
    this.body = this.article.locator('.ProseMirror');
    this.breadcrumb = page.getByRole('navigation', { name: 'Ruta de la página' });
    this.shareButton = page.getByRole('button', { name: 'Compartir', exact: true });
    this.moveButton = page.getByRole('button', { name: 'Mover', exact: true });
    this.archiveButton = page.getByRole('button', { name: 'Archivar página', exact: true });
    this.readOnlyBadge = page.getByText('Solo lectura');
    this.emptyNotice = page.getByText('Esta página está vacía.');
    this.archiveConfirm = page.getByRole('alertdialog', { name: '¿Archivar esta página?' });
    this.shareDialog = page.getByRole('dialog', { name: /^Compartir/ });
    this.shareEmail = this.shareDialog.getByRole('textbox', { name: 'Email' });
    this.sharePermission = this.shareDialog.getByRole('combobox', { name: 'Permiso para el email' });
    this.shareSubmit = this.shareDialog.getByRole('button', { name: 'Compartir', exact: true });
    this.accessList = this.shareDialog.getByRole('list', { name: 'Personas y grupos con acceso' });
  }

  async open(workspaceId, pageId) {
    await this.navigate(`/w/${workspaceId}/p/${pageId}`);
    await this.title.waitFor();
  }

  pageId() {
    return new URL(this.page.url()).pathname.match(/\/p\/([^/]+)/)?.[1];
  }

  /**
   * The status already reads "Guardado" before the debounced save fires, so wait for the request itself:
   * the title is a PATCH on `pages`, body text a PATCH on `blocks`.
   */
  savedRequest(table = 'pages') {
    return this.page.waitForResponse((r) => r.url().includes(`/rest/v1/${table}?`) && r.request().method() === 'PATCH' && r.ok());
  }

  async setTitle(text) {
    const saved = this.savedRequest('pages');
    await this.title.fill(text);
    await saved;
  }

  async typeBody(text) {
    await this.body.click();
    await this.page.keyboard.type(text);
  }

  async openShare() {
    await this.shareButton.click();
  }

  async shareWith(email, permission = 'Puede ver') {
    await this.openShare();
    await this.shareEmail.fill(email);
    await this.sharePermission.selectOption({ label: permission });
    await this.shareSubmit.click();
  }

  async archive() {
    await this.archiveButton.click();
    await this.archiveConfirm.getByRole('button', { name: 'Archivar' }).click();
  }
}
