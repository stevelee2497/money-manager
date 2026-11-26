import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, type OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CurrencyInput } from "../../components/currency-input";
import { Modal, ModalActions } from "../../components/modal";
import { SelectInput, type SelectOption } from "../../components/select-input";
import { Api } from "../../lib/api";
import { todayIso } from "../../lib/format";
import type { Category, Transaction, TransactionType, Wallet } from "../../lib/types";
import { TRANSACTION_TYPE, optionalText, walletOption } from "./constants";

const TYPE_OPTIONS: SelectOption[] = [{ value: TRANSACTION_TYPE.income, label: "🪴 Income" }, { value: TRANSACTION_TYPE.expense, label: "💸 Expense" }];
const NO_CATEGORY: SelectOption = { value: "", label: "Select category" };

@Component({
  selector: "app-transaction-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CurrencyInput, Modal, ModalActions, SelectInput],
  template: `
    <app-modal [title]="transaction() ? 'Edit Transaction' : 'Add Transaction'" [error]="error()" panelClass="max-w-md p-4 md:p-6" (close)="close.emit()">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="form-label">Amount *</label>
          <app-currency-input [(value)]="amount" />
        </div>
        <div>
          <label class="form-label">Date *</label>
          <input class="form-input" type="date" [(ngModel)]="date" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="form-label">Type</label>
          <app-select-input [value]="type()" (valueChange)="changeType($event)" [options]="typeOptions" />
        </div>
        <div>
          <label class="form-label">Category *</label>
          <app-select-input [(value)]="categoryId" [options]="categoryOptions()" />
        </div>
      </div>
      <div>
        <label class="form-label">Note</label>
        <textarea class="form-input" rows="2" placeholder="Optional description" [(ngModel)]="note"></textarea>
      </div>
      <div>
        <label class="form-label">Wallet</label>
        <app-select-input [(value)]="walletId" [options]="walletOptions()" />
      </div>
      <app-modal-actions [saving]="saving()" (cancel)="close.emit()" (save)="save()">
        @if (transaction(); as transaction) {
          <button class="btn-danger mr-auto" (click)="delete.emit(transaction)">Delete</button>
        }
      </app-modal-actions>
    </app-modal>
  `,
})
export class TransactionModal implements OnInit {
  readonly transaction = input<Transaction | null>(null);
  readonly wallets = input.required<Wallet[]>();
  readonly categories = input.required<Category[]>();
  readonly defaultWalletId = input("");
  readonly close = output();
  readonly saved = output();
  readonly delete = output<Transaction>();

  private readonly api = inject(Api);
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly amount = signal(0);
  protected readonly type = signal<TransactionType>(TRANSACTION_TYPE.expense);
  protected readonly date = signal(todayIso());
  protected readonly note = signal("");
  protected readonly categoryId = signal("");
  protected readonly walletId = signal("");
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly categoryOptions = computed(() => [NO_CATEGORY, ...this.categories().filter((c) => this.sameType(c, this.type())).map((c) => ({ value: c.id, label: c.name, icon: c.icon }))]);
  protected readonly walletOptions = computed(() => this.wallets().map(walletOption));

  ngOnInit() {
    const t = this.transaction();
    this.amount.set(t?.amount ?? 0);
    this.type.set(t?.type ?? TRANSACTION_TYPE.expense);
    this.date.set(t?.date ?? todayIso());
    this.note.set(t?.note ?? "");
    this.categoryId.set(t?.categoryId ?? "");
    this.walletId.set(t?.walletId ?? this.defaultWalletId());
  }

  private sameType(category: Category, type: string) {
    return category.type.toLowerCase() === type.toLowerCase();
  }

  protected changeType(value: string) {
    const next = value as TransactionType;
    this.type.set(next);
    if (!this.categories().some((c) => c.id === this.categoryId() && this.sameType(c, next))) this.categoryId.set("");
  }

  private validate() {
    if (this.amount() <= 0) return "Amount must be greater than zero.";
    if (!this.date()) return "Date is required.";
    if (!this.categoryId()) return "Category is required.";
    if (!this.walletId()) return "Wallet is required.";
    return null;
  }

  protected async save() {
    const invalid = this.validate();
    this.error.set(invalid);
    if (invalid) return;
    this.saving.set(true);
    const body = { walletId: this.walletId(), amount: this.amount(), type: this.type(), date: this.date(), note: optionalText(this.note()), categoryId: this.categoryId() };
    const transaction = this.transaction();
    const { error } = transaction ? await this.api.updateTransaction(transaction.id, body) : await this.api.createTransaction(body);
    this.saving.set(false);
    if (error) return this.error.set(error.message ?? "Failed to save transaction.");
    this.saved.emit();
  }
}
