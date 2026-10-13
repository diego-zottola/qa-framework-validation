import { BasePage } from './BasePage.js';

/** Grupos: create and manage groups (non-guests). */
export class GroupsPage extends BasePage {
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Grupos', level: 1 });
    this.createForm = page.getByRole('form', { name: 'Crear grupo' });
    this.nameInput = this.createForm.getByRole('textbox', { name: 'Nombre del grupo' });
    this.createButton = this.createForm.getByRole('button', { name: 'Crear' });
    this.guestNotice = page.getByText('Como invitado no tenés acceso al directorio de grupos.');
  }

  async open(workspaceId) {
    await this.navigate(`/w/${workspaceId}/settings/groups`);
  }

  group(name) {
    return this.page.getByRole('region', { name, exact: true });
  }
}
