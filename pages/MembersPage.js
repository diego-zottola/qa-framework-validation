import { BasePage } from './BasePage.js';

/** Miembros: directory and add-member form (non-guests); explanation and leave button for guests. */
export class MembersPage extends BasePage {
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Miembros', level: 1 });
    this.addForm = page.getByRole('form', { name: 'Agregar miembro' });
    this.emailInput = this.addForm.getByRole('textbox', { name: 'Email' });
    this.roleSelect = this.addForm.getByRole('combobox', { name: 'Rol del nuevo miembro' });
    this.addButton = this.addForm.getByRole('button', { name: 'Agregar' });
    this.guestNotice = page.getByText('Como invitado solo ves las páginas que compartieron con vos');
    this.leaveButton = page.getByRole('button', { name: 'Salir del espacio de trabajo' });
  }

  async open(workspaceId) {
    await this.navigate(`/w/${workspaceId}/settings/members`);
  }

  member(name) {
    return this.page.getByRole('listitem', { name, exact: true });
  }

  roleOf(name) {
    return this.page.getByRole('combobox', { name: `Rol de ${name}`, exact: true });
  }
}
