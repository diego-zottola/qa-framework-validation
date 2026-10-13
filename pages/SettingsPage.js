import { BasePage } from './BasePage.js';

/** Preferencias (/settings): appearance, editor and about. */
export class SettingsPage extends BasePage {
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Preferencias', level: 1 });
    this.theme = page.getByRole('radiogroup', { name: 'Tema' });
    this.compactSwitch = page.getByRole('switch', { name: 'Vista compacta' });
    this.richEditorSwitch = page.getByRole('switch', { name: 'Editor con formato' });
    this.version = page.getByText(/Versión\s*\d+\.\d+\.\d+/);
  }

  async open() {
    await this.navigate('/settings');
  }

  themeOption(name) {
    return this.theme.getByRole('radio', { name });
  }

  /** The radio inputs are visually hidden: click their visible label. */
  async chooseTheme(name) {
    await this.theme.getByText(name, { exact: true }).click();
  }
}
