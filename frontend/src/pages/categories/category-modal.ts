import { Component, inject, input, output, signal, type OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IconPicker } from "../../components/icon-picker";
import { Modal, ModalActions } from "../../components/modal";
import { SelectInput } from "../../components/select-input";
import { Api } from "../../lib/api";
import type { Category, TransactionType } from "../../lib/types";

const TYPE_OPTIONS = [{ value: "Income", label: "Income" }, { value: "Expense", label: "Expense" }];
const DEFAULT_TYPE: TransactionType = "Expense";

@Component({
  selector: "app-category-modal",
  imports: [FormsModule, IconPicker, Modal, ModalActions, SelectInput],
  template: `
    <app-modal [title]="category() ? 'Edit Category' : 'Add Category'" [error]="error()" (close)="close.emit()">
      <div>
        <label class="form-label">Name *</label>
        <input [(ngModel)]="name" class="form-input" placeholder="Category name" />
      </div>
      <div>
        <label class="form-label">Type</label>
        <app-select-input [(value)]="type" [options]="typeOptions" [disabled]="!!category()" />
        @if (category()) { <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">Category type can only be chosen when the category is created.</div> }
      </div>
      <div>
        <label class="form-label">Icon</label>
        <app-icon-picker group="Category" [(value)]="icon" />
      </div>
      <app-modal-actions [saving]="saving()" (cancel)="close.emit()" (save)="save()" />
    </app-modal>
  `,
})
export class CategoryModal implements OnInit {
  readonly category = input<Category | null>(null);
  readonly close = output();
  readonly saved = output();

  private readonly api = inject(Api);
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly name = signal("");
  protected readonly type = signal<string>(DEFAULT_TYPE);
  protected readonly icon = signal("");
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit() {
    const category = this.category();
    this.name.set(category?.name ?? "");
    this.type.set(category?.type ?? DEFAULT_TYPE);
    this.icon.set(category?.icon ?? "");
  }

  protected async save() {
    const name = this.name().trim();
    if (!name) return this.error.set("Name is required.");
    this.error.set(null);
    this.saving.set(true);
    const icon = this.icon().trim() || undefined;
    const category = this.category();
    const { error } = category ? await this.api.updateCategory(category.id, { name, icon }) : await this.api.createCategory({ name, type: this.type(), icon });
    this.saving.set(false);
    if (!error) this.saved.emit();
  }
}
