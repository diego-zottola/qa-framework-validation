import { BasePage } from './BasePage.js';

/** Papelera: archived pages, restore and permanent delete (owner only). */
export class TrashPage extends BasePage {
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Papelera', level: 1 });
    this.list = page.getByRole('list', { name: 'Páginas archivadas' });
    this.emptyState = page.getByRole('heading', { name: 'La papelera está vacía' });
    this.ownerOnlyNotice = page.getByRole('heading', { name: 'Solo el propietario del espacio puede ver la papelera' });
    this.deleteConfirm = page.getByRole('alertdialog', { name: '¿Eliminar definitivamente?' });
  }

  async open(workspaceId) {
    await this.navigate(`/w/${workspaceId}/trash`);
  }

  item(title) {
    return this.list.getByRole('listitem', { name: title, exact: true });
  }

  async restore(title) {
    await this.item(title).getByRole('button', { name: `Restaurar ${title}`, exact: true }).click();
  }

  async deletePermanently(title) {
    await this.item(title).getByRole('button', { name: `Eliminar definitivamente ${title}`, exact: true }).click();
    await this.deleteConfirm.getByRole('button', { name: 'Eliminar definitivamente' }).click();
  }
}
