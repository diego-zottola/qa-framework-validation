// TEMPLATE — edit this file to update the scaffold for all future projects.
// Registry pattern: FilterableTable
//
// Reusable pattern for tables with filters, search, and pagination.
// Usage: extend or compose in any Page Object that has a filterable table.
//
// Example:
//   import { FilterableTable } from '../registry/FilterableTable.js';
//   class DatasetsPage extends BasePage {
//     constructor(page) {
//       super(page);
//       this.table = new FilterableTable(page, {
//         tableLocator: '[data-testid="datasets-table"]',
//         searchLocator: '[data-testid="search-input"]',
//         paginationLocator: '[data-testid="pagination"]',
//       });
//     }
//   }

export class FilterableTable {
  constructor(page, locators = {}) {
    this.page = page;
    this.locators = {
      table:      locators.tableLocator      ?? '[role="table"]',
      search:     locators.searchLocator     ?? '[data-testid="search-input"]',
      dropdown:   locators.dropdownLocator   ?? '[data-testid="filter-dropdown"]',
      dateRange:  locators.dateRangeLocator  ?? '[data-testid="date-range"]',
      pagination: locators.paginationLocator ?? '[data-testid="pagination"]',
      rows:       locators.rowsLocator       ?? '[role="row"]',
      emptyState: locators.emptyStateLocator ?? '[data-testid="empty-state"]',
    };
  }

  // ── FILTER ACTIONS ──────────────────────────────────────────────────

  async search(term) {
    await this.page.locator(this.locators.search).fill(term);
    await this.page.keyboard.press('Enter');
    await this._waitForTableStable();
  }

  async selectDropdownFilter(value) {
    await this.page.locator(this.locators.dropdown).selectOption(value);
    await this._waitForTableStable();
  }

  async clearFilters() {
    // Try common clear patterns — adapt in the App Pack if needed
    const clearBtn = this.page.locator('[data-testid="clear-filters"]');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await this._waitForTableStable();
    }
  }

  // ── TABLE QUERIES ───────────────────────────────────────────────────

  async rowCount() {
    await this._waitForTableStable();
    const rows = this.page.locator(
      `${this.locators.table} ${this.locators.rows}`
    );
    // Subtract 1 for header row if present
    const total = await rows.count();
    return total > 0 ? total - 1 : 0;
  }

  async isEmpty() {
    const emptyState = this.page.locator(this.locators.emptyState);
    return await emptyState.isVisible();
  }

  async getRowTexts() {
    await this._waitForTableStable();
    const rows = this.page.locator(
      `${this.locators.table} ${this.locators.rows}`
    );
    const count = await rows.count();
    const texts = [];
    // Skip header row (index 0)
    for (let i = 1; i < count; i++) {
      texts.push(await rows.nth(i).innerText());
    }
    return texts;
  }

  async findRowContaining(text) {
    await this._waitForTableStable();
    return this.page.locator(
      `${this.locators.table} ${this.locators.rows}:has-text("${text}")`
    );
  }

  // ── PAGINATION ──────────────────────────────────────────────────────

  async goToNextPage() {
    const next = this.page.locator('[data-testid="pagination-next"]');
    if (await next.isEnabled()) {
      await next.click();
      await this._waitForTableStable();
      return true;
    }
    return false; // already on last page
  }

  async goToPage(number) {
    const pageBtn = this.page.locator(
      `${this.locators.pagination} [data-testid="page-${number}"]`
    );
    await pageBtn.click();
    await this._waitForTableStable();
  }

  // ── PRIVATE ─────────────────────────────────────────────────────────

  async _waitForTableStable() {
    await this.page.locator(this.locators.table).waitFor({ state: 'visible' });
    await this.page.waitForTimeout(300);
  }
}
