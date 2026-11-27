import { ChangeDetectionStrategy, Component, inject, input, output, signal, type OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IconPicker } from "../../../components/icon-picker.component";
import { Modal, ModalActions } from "../../../components/modal.component";
import { Api } from "../../../lib/api.service";
import type { Wallet } from "../../../lib/types";
import { DEFAULT_CURRENCY, optionalText } from "../utils/constants";

@Component({
  selector: "app-wallet-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconPicker, Modal, ModalActions],
  template: `
    <app-modal [title]="wallet() ? 'Edit Wallet' : 'Add Wallet'" [error]="error()" (close)="close.emit()">
      <div>
        <label class="form-label">Name *</label>
        <input class="form-input" [(ngModel)]="name" placeholder="e.g. Main Account" />
      </div>
      <div>
        <label class="form-label">Opening Balance</label>
        <input class="form-input" type="number" step="0.01" [(ngModel)]="initialBalance" [disabled]="!!wallet()" />
        @if (wallet()) { <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">Opening balance can only be set when the wallet is created.</div> }
      </div>
      <div>
        <label class="form-label">Currency *</label>
        <input class="form-input" [(ngModel)]="currency" placeholder="USD" />
      </div>
      <div>
        <label class="form-label">Icon</label>
        <app-icon-picker group="Wallet" [(value)]="icon" />
      </div>
      <app-modal-actions [saving]="saving()" (cancel)="close.emit()" (save)="save()" />
    </app-modal>
  `,
})
export class WalletModal implements OnInit {
  readonly wallet = input<Wallet | null>(null);
  readonly close = output();
  readonly saved = output();

  private readonly api = inject(Api);
  protected readonly name = signal("");
  protected readonly initialBalance = signal<number | null>(0);
  protected readonly currency = signal(DEFAULT_CURRENCY);
  protected readonly icon = signal("");
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  ngOnInit() {
    const wallet = this.wallet();
    if (!wallet) return;
    this.name.set(wallet.name);
    this.initialBalance.set(wallet.initialBalance);
    this.currency.set(wallet.currency);
    this.icon.set(wallet.icon ?? "");
  }

  private async send() {
    const body = { name: this.name().trim(), icon: optionalText(this.icon()) };
    const currency = this.currency().trim();
    const wallet = this.wallet();
    if (!wallet) return this.api.createWallet({ ...body, initialBalance: Number(this.initialBalance()) || 0, currency });
    const updated = await this.api.updateWallet(wallet.id, body);
    if (updated.error || currency === wallet.currency) return updated;
    return this.api.configureWallet(wallet.id, currency);
  }

  protected async save() {
    if (!this.name().trim()) return this.error.set("Name is required.");
    if (!this.currency().trim()) return this.error.set("Currency is required.");
    this.error.set(null);
    this.saving.set(true);
    const { error } = await this.send();
    this.saving.set(false);
    if (error) return this.error.set(error.message ?? "Failed to save wallet.");
    this.saved.emit();
  }
}
