import { BasePage } from './BasePage.js';

/** Perfil (/profile): display name, username and the workspaces of the account. */
export class ProfilePage extends BasePage {
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Perfil', level: 1 });
    this.nameInput = page.getByRole('textbox', { name: 'Nombre' });
    this.saveNameButton = page.getByRole('button', { name: 'Guardar nombre de usuario' });
    this.workspaces = page.getByRole('list', { name: 'Tus espacios' });
  }

  async open() {
    await this.navigate('/profile');
  }

  workspace(name) {
    return this.workspaces.getByRole('listitem', { name, exact: true });
  }
}
