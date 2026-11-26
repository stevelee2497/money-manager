import { Component, computed, inject, input, output, signal, type OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CurrencyInput } from "../../components/currency-input";
import { Modal, ModalActions } from "../../components/modal";
import { SelectInput } from "../../components/select-input";
import { Api } from "../../lib/api";
import { todayIso } from "../../lib/format";
import type { Wallet } from "../../lib/types";
import { SELECT_WALLET_OPTION, optionalText, walletOption } from "./constants";

@Component({
  selector: "app-transfer-modal",
  imports: [FormsModule, CurrencyInput, Modal, ModalActions, SelectInput],
  template: `
    <app-modal title="Transfer Funds" [error]="error()" (close)="close.emit()">
      <div>
        <label class="form-label">From Wallet *</label>
        <app-select-input [value]="fromId()" (valueChange)="changeFrom($event)" [options]="optionsExcluding(toId())" />
      </div>
      <div>
        <label class="form-label">To Wallet *</label>
        <app-select-input [(value)]="toId" [options]="optionsExcluding(fromId())" />
      </div>
      <div>
        <label class="form-label">Amount *</label>
        <app-currency-input [(value)]="amount" />
      </div>
      <div>
        <label class="form-label">Date *</label>
        <input class="form-input" type="date" [(ngModel)]="date" />
      </div>
      <div>
        <label class="form-label">Note</label>
        <input class="form-input" placeholder="Optional description" [(ngModel)]="note" />
      </div>
      <app-modal-actions [saving]="saving()" [saveDisabled]="noTargets()" (cancel)="close.emit()" (save)="save()" />
    </app-modal>
  `,
})
export class TransferModal implements OnInit {
  readonly wallets = input.required<Wallet[]>();
  readonly defaultFromId = input("");
  readonly close = output();
  readonly saved = output();

  private readonly api = inject(Api);
  protected readonly fromId = signal("");
  protected readonly toId = signal("");
  protected readonly amount = signal(0);
  protected readonly date = signal(todayIso());
  protected readonly note = signal("");
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly noTargets = computed(() => !this.wallets().some((w) => w.id !== this.fromId()));

  ngOnInit() {
    this.fromId.set(this.defaultFromId());
  }

  protected optionsExcluding(id: string) {
    return [SELECT_WALLET_OPTION, ...this.wallets().filter((w) => w.id !== id).map(walletOption)];
  }

  protected changeFrom(id: string) {
    this.fromId.set(id);
    if (id === this.toId()) this.toId.set("");
  }

  private validate() {
    if (!this.fromId()) return "Select a source wallet.";
    if (!this.toId()) return "Select a destination wallet.";
    if (this.amount() <= 0) return "Amount must be greater than zero.";
    if (!this.date()) return "Date is required.";
    return null;
  }

  protected async save() {
    const invalid = this.validate();
    this.error.set(invalid);
    if (invalid) return;
    this.saving.set(true);
    const { error } = await this.api.createTransfer({ fromWalletId: this.fromId(), toWalletId: this.toId(), amount: this.amount(), date: this.date(), note: optionalText(this.note()) });
    this.saving.set(false);
    if (error) return this.error.set(error.message ?? "Failed to create transfer.");
    this.saved.emit();
  }
}
