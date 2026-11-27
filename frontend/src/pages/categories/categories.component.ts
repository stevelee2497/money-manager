import { ChangeDetectionStrategy, Component, computed, inject, resource, signal } from "@angular/core";
import { ConfirmDialog } from "../../components/confirm-dialog.component";
import { Glyph } from "../../components/glyph.component";
import { Icon } from "../../components/icon.component";
import { Spinner } from "../../components/spinner.component";
import { Api } from "../../lib/api.service";
import type { Category, TransactionType } from "../../lib/types";
import { CategoryModal } from "./components/category-modal.component";
import { IconLibrary } from "./components/icon-library.component";
import { ADD_PATH, DELETE_PATH, EDIT_PATH, LOCK_PATH } from "./utils/paths";

const DEFAULT_ICON = "🏷️";

const SECTIONS: { type: TransactionType; title: string; empty: string; badge: string; circle: string }[] = [
  { type: "Income", title: "Income Categories", empty: "No income categories yet.", badge: "badge-green", circle: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" },
  { type: "Expense", title: "Expense Categories", empty: "No expense categories yet.", badge: "badge-red", circle: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400" },
];

@Component({
  selector: "app-categories-page",
  imports: [ConfirmDialog, Glyph, Icon, Spinner, CategoryModal, IconLibrary],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "contents" },
  templateUrl: "./categories.component.html",
})
export class CategoriesComponent {
  private readonly api = inject(Api);
  protected readonly sections = SECTIONS;
  protected readonly defaultIcon = DEFAULT_ICON;
  protected readonly paths = { add: ADD_PATH, edit: EDIT_PATH, delete: DELETE_PATH, lock: LOCK_PATH };
  protected readonly form = signal<{ category: Category | null } | null>(null);
  protected readonly deleting = signal<Category | null>(null);
  protected readonly deleteMessage = computed(() => `Delete '${this.deleting()?.name}'?`);

  private readonly categoriesResource = resource({ loader: () => this.api.getCategories() });
  protected readonly loading = computed(() => !this.categoriesResource.hasValue());
  private readonly categories = computed(() => this.categoriesResource.value()?.data ?? []);

  protected byType(type: TransactionType) {
    return this.categories().filter((c) => c.type === type);
  }

  protected saved() {
    this.form.set(null);
    this.categoriesResource.reload();
  }

  protected async confirmDelete() {
    const deleting = this.deleting();
    if (!deleting) return;
    const { error } = await this.api.deleteCategory(deleting.id);
    this.deleting.set(null);
    if (!error) this.categoriesResource.reload();
  }
}
