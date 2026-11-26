import { Component, inject, signal } from "@angular/core";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { Glyph } from "../../components/glyph";
import { Icon } from "../../components/icon";
import { Spinner } from "../../components/spinner";
import { Api } from "../../lib/api";
import type { Category, TransactionType } from "../../lib/types";
import { CategoryModal } from "./category-modal";
import { IconLibrary } from "./icon-library";
import { ADD_PATH, DELETE_PATH, EDIT_PATH, LOCK_PATH } from "./paths";

const DEFAULT_ICON = "🏷️";

const SECTIONS: { type: TransactionType; title: string; empty: string; badge: string; circle: string }[] = [
  { type: "Income", title: "Income Categories", empty: "No income categories yet.", badge: "badge-green", circle: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" },
  { type: "Expense", title: "Expense Categories", empty: "No expense categories yet.", badge: "badge-red", circle: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400" },
];

@Component({
  selector: "app-categories-page",
  imports: [ConfirmDialog, Glyph, Icon, Spinner, CategoryModal, IconLibrary],
  host: { class: "contents" },
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Categories</h1>
        <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your custom income and expense categories.</div>
      </div>
      <button class="btn-primary self-start sm:self-auto" (click)="form.set({ category: null })">
        <app-glyph [d]="paths.add" size="w-4 h-4 mr-1.5" />
        Add Category
      </button>
    </div>

    @if (loading()) {
      <app-spinner />
    } @else {
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        @for (section of sections; track section.type) {
          @let items = byType(section.type);
          <section class="card">
            <div class="flex items-center justify-between gap-3 mb-4">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ section.title }}</h2>
              <span [class]="section.badge">{{ items.length }}</span>
            </div>
            @if (items.length === 0) {
              <div class="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">{{ section.empty }}</div>
            } @else {
              <div class="flex flex-col gap-3">
                @for (category of items; track category.id) {
                  <div class="flex items-center justify-between gap-3 rounded-lg border border-gray-100 dark:border-gray-700 px-4 py-3">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" [class]="section.circle">
                        <app-icon [value]="category.icon" [fallback]="defaultIcon" emojiClass="text-lg leading-none" />
                      </div>
                      <div class="min-w-0">
                        <div class="font-medium text-gray-900 dark:text-gray-100 truncate">{{ category.name }}</div>
                        <div class="flex flex-wrap items-center gap-2 mt-1">
                          <span [class]="section.badge">{{ category.type }}</span>
                          @if (category.isSystem) { <span class="badge-blue">System</span> }
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      @if (category.isSystem) {
                        <span class="text-gray-400 dark:text-gray-500" title="System category"><app-glyph [d]="paths.lock" size="w-4 h-4" /></span>
                      } @else {
                        <button class="text-gray-400 dark:text-gray-500 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400" (click)="form.set({ category })" title="Edit category"><app-glyph [d]="paths.edit" size="w-4 h-4" /></button>
                        <button class="text-gray-400 dark:text-gray-500 transition-colors hover:text-red-600 dark:hover:text-red-400" (click)="deleting.set(category)" title="Delete category"><app-glyph [d]="paths.delete" size="w-4 h-4" /></button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </section>
        }
      </div>
    }

    <app-icon-library />

    @if (form(); as form) {
      <app-category-modal [category]="form.category" (close)="this.form.set(null)" (saved)="saved()" />
    }
    <app-confirm-dialog [visible]="!!deleting()" title="Delete category" [message]="'Delete \\'' + deleting()?.name + '\\'?'" (confirm)="confirmDelete()" (cancel)="deleting.set(null)" />
  `,
})
export class CategoriesPage {
  private readonly api = inject(Api);
  protected readonly sections = SECTIONS;
  protected readonly defaultIcon = DEFAULT_ICON;
  protected readonly paths = { add: ADD_PATH, edit: EDIT_PATH, delete: DELETE_PATH, lock: LOCK_PATH };
  protected readonly categories = signal<Category[]>([]);
  protected readonly loading = signal(true);
  protected readonly form = signal<{ category: Category | null } | null>(null);
  protected readonly deleting = signal<Category | null>(null);

  constructor() {
    this.load();
  }

  protected byType(type: TransactionType) {
    return this.categories().filter((c) => c.type === type);
  }

  private async load() {
    const { data } = await this.api.getCategories();
    this.categories.set(data ?? []);
    this.loading.set(false);
  }

  protected saved() {
    this.form.set(null);
    this.load();
  }

  protected async confirmDelete() {
    const deleting = this.deleting();
    if (!deleting) return;
    const { error } = await this.api.deleteCategory(deleting.id);
    this.deleting.set(null);
    if (!error) this.load();
  }
}
