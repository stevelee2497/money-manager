import { Component, inject, signal } from "@angular/core";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { Glyph } from "../../components/glyph";
import { Icon } from "../../components/icon";
import { Spinner } from "../../components/spinner";
import { Api } from "../../lib/api";
import type { IconGroup, IconItem } from "../../lib/types";
import { IconModal } from "./icon-modal";
import { ADD_PATH, DELETE_PATH, EDIT_PATH, LOCK_PATH } from "./paths";

const SECTIONS: { title: string; empty: string; badge: string; groups: IconGroup[] }[] = [
  { title: "Wallet Icons", empty: "No wallet icons yet.", badge: "badge-blue", groups: ["Wallet", "General"] },
  { title: "Category Icons", empty: "No category icons yet.", badge: "badge-green", groups: ["Category", "General"] },
];

@Component({
  selector: "app-icon-library",
  imports: [ConfirmDialog, Glyph, Icon, Spinner, IconModal],
  host: { class: "contents" },
  template: `
    <section class="card mt-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Icon Library</h2>
          <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">Browse and manage icons for wallets and categories.</div>
        </div>
        <button class="btn-primary self-start sm:self-auto" (click)="form.set({ icon: null })">
          <app-glyph [d]="paths.add" size="w-4 h-4 mr-1.5" />
          Add Icon
        </button>
      </div>
      @if (loading()) {
        <app-spinner />
      } @else {
        <div class="space-y-6">
          @for (section of sections; track section.title) {
            @let items = inGroups(section.groups);
            <div>
              <div class="flex items-center justify-between gap-3 mb-4">
                <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">{{ section.title }}</h3>
                <span [class]="section.badge">{{ items.length }}</span>
              </div>
              @if (items.length === 0) {
                <div class="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">{{ section.empty }}</div>
              } @else {
                <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  @for (icon of items; track icon.id) {
                    <div class="relative group flex flex-col items-center gap-1 rounded-lg border border-gray-100 dark:border-gray-700 p-2 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                      <div class="w-10 h-10 flex items-center justify-center text-gray-700 dark:text-gray-200">
                        <app-icon [value]="icon.value" size="w-6 h-6" emojiClass="text-2xl leading-none" />
                      </div>
                      <span class="text-xs text-gray-500 dark:text-gray-400 text-center leading-tight truncate w-full">{{ icon.name }}</span>
                      @if (icon.isSystem) {
                        <span class="absolute top-1 right-1 text-gray-300 dark:text-gray-500" title="System icon"><app-glyph [d]="paths.lock" size="w-3 h-3" /></span>
                      } @else {
                        <div class="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                          <button class="text-gray-400 dark:text-gray-500 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400" (click)="form.set({ icon })" title="Edit"><app-glyph [d]="paths.edit" size="w-3 h-3" /></button>
                          <button class="text-gray-400 dark:text-gray-500 transition-colors hover:text-red-600 dark:hover:text-red-400" (click)="deleting.set(icon)" title="Delete"><app-glyph [d]="paths.delete" size="w-3 h-3" /></button>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
      @if (form(); as form) {
        <app-icon-modal [icon]="form.icon" (close)="this.form.set(null)" (saved)="saved()" />
      }
      <app-confirm-dialog [visible]="!!deleting()" title="Delete icon" [message]="'Delete \\'' + deleting()?.name + '\\'?'" (confirm)="confirmDelete()" (cancel)="deleting.set(null)" />
    </section>
  `,
})
export class IconLibrary {
  private readonly api = inject(Api);
  protected readonly sections = SECTIONS;
  protected readonly paths = { add: ADD_PATH, edit: EDIT_PATH, delete: DELETE_PATH, lock: LOCK_PATH };
  protected readonly icons = signal<IconItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly form = signal<{ icon: IconItem | null } | null>(null);
  protected readonly deleting = signal<IconItem | null>(null);

  constructor() {
    this.load();
  }

  protected inGroups(groups: IconGroup[]) {
    return this.icons().filter((i) => groups.includes(i.group));
  }

  private async load() {
    const { data } = await this.api.getIcons();
    this.icons.set(data ?? []);
    this.loading.set(false);
  }

  protected saved() {
    this.form.set(null);
    this.load();
  }

  protected async confirmDelete() {
    const deleting = this.deleting();
    if (!deleting) return;
    const { error } = await this.api.deleteIcon(deleting.id);
    this.deleting.set(null);
    if (!error) this.load();
  }
}
