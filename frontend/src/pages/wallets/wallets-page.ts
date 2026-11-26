import { Component, computed, effect, inject, signal } from "@angular/core";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { Glyph } from "../../components/glyph";
import { Icon } from "../../components/icon";
import { MultiSelectInput } from "../../components/multi-select-input";
import { Pagination } from "../../components/pagination";
import { Spinner } from "../../components/spinner";
import { Api } from "../../lib/api";
import { DATE_RANGE, DATE_RANGE_OPTIONS, mergeDateRanges, resolveDateRange, type Custom } from "../../lib/dateRanges";
import { formatAmount, formatDisplayDate, signedAmount } from "../../lib/format";
import type { Category, Transaction, TransactionType, Wallet } from "../../lib/types";
import { PAGE_SIZE, TRANSACTION_TYPE } from "./constants";
import { CustomRangeModal } from "./custom-range-modal";
import { PieChart } from "./pie-chart";
import { TransactionModal } from "./transaction-modal";
import { TransferModal } from "./transfer-modal";
import { WalletModal } from "./wallet-modal";

const DEFAULT_RANGE: string[] = [DATE_RANGE.thisYear];
const NO_CUSTOM: Custom = { from: null, to: null };
const ICON_PATHS = {
  edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  plus: "M12 4v16m8-8H4",
  transfer: "M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l-4-4m4 4l4-4",
};

const isIncome = (type: string) => type.toLowerCase() === TRANSACTION_TYPE.income.toLowerCase();
const toggled = <T>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

@Component({
  selector: "app-wallets-page",
  imports: [ConfirmDialog, Glyph, Icon, MultiSelectInput, Pagination, Spinner, CustomRangeModal, PieChart, TransactionModal, TransferModal, WalletModal],
  host: { class: "contents" },
  template: `
    @if (error()) {
      <div class="mb-4 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">{{ error() }}</div>
    }
    @if (loading()) {
      <app-spinner />
    } @else {
      <div class="flex flex-col lg:flex-row gap-0 lg:gap-4 mb-6">
        <div class="flex flex-1 flex-col gap-4">
          <div class="card bg-linear-to-r from-indigo-600 to-indigo-500 text-white cursor-pointer transition-all" [class]="selected().length === 0 ? 'ring-4 ring-white/40' : 'hover:opacity-90'" (click)="selectAll()">
            <div class="text-sm font-medium text-indigo-100 mb-2">Total Balance</div>
            <div class="text-3xl sm:text-4xl font-bold">{{ formatAmount(totalBalance()) }}</div>
          </div>

          @if (wallets().length > 0) { <app-pie-chart [wallets]="wallets()" [selectedIds]="selected()" /> }

          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-lg bg-green-50 dark:bg-green-900/30 px-4 py-3">
              <div class="text-xs text-green-600 dark:text-green-400 font-medium mb-0.5">Monthly Income</div>
              <div class="text-xl font-bold text-green-700 dark:text-green-400">{{ formatAmount(summary().totalIncome) }}</div>
            </div>
            <div class="rounded-lg bg-red-50 dark:bg-red-900/30 px-4 py-3">
              <div class="text-xs text-red-600 dark:text-red-400 font-medium mb-0.5">Monthly Expense</div>
              <div class="text-xl font-bold text-red-700 dark:text-red-400">{{ formatAmount(summary().totalExpense) }}</div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 mb-3">
            @for (w of wallets(); track w.id) {
              @let isSelected = selected().includes(w.id);
              <div class="relative rounded-lg border-2 cursor-pointer transition-all p-2 md:p-3 flex flex-col gap-1 md:gap-1.5 justify-between" [class]="isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300 hover:bg-gray-50 dark:hover:bg-gray-700'" (click)="toggleWallet(w.id)">
                <div class="absolute top-1.5 right-1.5 flex gap-1">
                  <button class="text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400" (click)="$event.stopPropagation(); walletForm.set({ wallet: w })" title="Edit"><app-glyph size="w-3.5 h-3.5" [d]="paths.edit" /></button>
                  <button class="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400" (click)="$event.stopPropagation(); deletingWallet.set(w)" title="Delete"><app-glyph size="w-3.5 h-3.5" [d]="paths.trash" /></button>
                </div>
                <div class="flex items-center justify-start gap-1">
                  <span class="text-xl leading-none"><app-icon [value]="w.icon" fallback="👛" size="w-6 h-6" emojiClass="" /></span>
                </div>
                <div class="text-xs font-semibold truncate" [class]="isSelected ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'">{{ w.name }}</div>
                <div class="text-sm font-bold" [class]="isSelected ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-900 dark:text-gray-100'">{{ formatAmount(w.balance) }}</div>
              </div>
            }
            <div class="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer transition-all p-3 flex flex-col items-center justify-center gap-1.5 text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400" (click)="walletForm.set({ wallet: null })">
              <app-glyph size="w-5 h-5" [d]="paths.plus" />
              <span class="text-xs font-medium">Add Wallet</span>
            </div>
          </div>
        </div>

        <div class="flex-1">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              @if (selected().length === 0) {
                <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">All Transactions</h2>
                <div class="text-sm text-gray-500 dark:text-gray-400">Showing transactions across all wallets</div>
              } @else if (selectedWallet(); as wallet) {
                <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ wallet.name }}</h2>
                <div class="text-sm text-gray-500 dark:text-gray-400">Balance: <span class="font-semibold text-gray-900 dark:text-gray-100">{{ formatAmount(wallet.balance) }} {{ wallet.currency }}</span></div>
              } @else {
                <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Selected Wallets</h2>
                <div class="text-sm text-gray-500 dark:text-gray-400">Showing transactions for {{ selected().length }} wallets</div>
              }
            </div>
          </div>

          <div class="mb-4 flex flex-col gap-3">
            <div class="flex flex-wrap gap-2">
              <button [class]="typeFilterClass(typeFilters().length === 0)" (click)="resetFilters()">All</button>
              <button [class]="typeFilterClass(typeFilters().includes(types.income))" (click)="toggleType(types.income)">Income</button>
              <button [class]="typeFilterClass(typeFilters().includes(types.expense))" (click)="toggleType(types.expense)">Expense</button>
              <app-multi-select-input [values]="categoryIds()" (valuesChange)="changeCategories($event)" [options]="categoryOptions()" placeholder="All categories" />
              <app-multi-select-input [values]="dateFilters()" (valuesChange)="changeDateFilters($event)" [options]="dateRangeOptions" placeholder="All time" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 mb-4">
            <button class="btn-primary btn w-full" (click)="transactionForm.set({ transaction: null })"><app-glyph size="w-3.5 h-3.5 mr-1" [d]="paths.plus" />Add Transaction</button>
            <button class="btn-secondary btn w-full" (click)="showTransfer.set(true)"><app-glyph size="w-3.5 h-3.5 mr-1" [d]="paths.transfer" />Transfer</button>
          </div>

          <div class="card px-3 py-1">
            @if (loadingTransactions() && transactions().length === 0) {
              <app-spinner />
            } @else if (transactions().length === 0) {
              <div class="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">No transactions found.</div>
            } @else {
              <div class="relative">
                @if (loadingTransactions()) {
                  <div class="absolute inset-0 z-10 flex items-start justify-center pt-10 bg-white/40 dark:bg-gray-900/40 rounded"><app-spinner /></div>
                }
                <div class="flex flex-col divide-y divide-gray-100 dark:divide-gray-700" [class.blur-sm]="loadingTransactions()" [class.pointer-events-none]="loadingTransactions()" [class.select-none]="loadingTransactions()">
                  @for (t of transactions(); track t.id) {
                    <div class="py-2 flex flex-col sm:flex-row sm:items-center gap-2" [class]="t.isTransfer ? '' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'" (click)="openTransaction(t)">
                      <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center text-lg shrink-0">
                          <app-icon [value]="categoryIcon(t)" [fallback]="fallbackIcon(t)" size="w-6 h-6" emojiClass="" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="font-medium text-gray-900 dark:text-gray-100 truncate">{{ t.isTransfer ? "Transfer" : t.categoryName?.trim() || "Uncategorized" }}</div>
                          <div class="text-sm text-gray-500 dark:text-gray-400 truncate flex">
                            {{ t.note?.trim() || "No description" }}
                            <div class="ml-1 flex flex-wrap items-center gap-1 text-xs italic text-gray-400 dark:text-gray-500">
                              <span>•</span>
                              <span>{{ formatDisplayDate(t.date) }}</span>
                              @if (t.isTransfer) { <span class="badge-blue hidden lg:block">Transfer</span> }
                            </div>
                          </div>
                        </div>
                        <div class="font-semibold" [class]="isIncome(t.type) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">{{ signedAmount(t.amount, t.type) }}</div>
                      </div>
                    </div>
                  }
                </div>
                <app-pagination [currentPage]="page()" [totalItems]="total()" [pageSize]="pageSize" (pageChanged)="page.set($event)" />
              </div>
            }
          </div>
        </div>
      </div>
    }

    @if (walletForm(); as form) {
      <app-wallet-modal [wallet]="form.wallet" (close)="walletForm.set(null)" (saved)="saveWallet()" />
    }
    @if (transactionForm(); as form) {
      <app-transaction-modal [transaction]="form.transaction" [wallets]="wallets()" [categories]="categories()" [defaultWalletId]="selectedWallet()?.id ?? wallets()[0]?.id ?? ''" (close)="transactionForm.set(null)" (saved)="saveTransaction()" (delete)="requestDeleteTransaction($event)" />
    }
    @if (showTransfer()) {
      <app-transfer-modal [wallets]="wallets()" [defaultFromId]="selectedWallet()?.id ?? ''" (close)="showTransfer.set(false)" (saved)="saveTransfer()" />
    }
    @if (showCustomRange()) {
      <app-custom-range-modal [initial]="dateRange()" (close)="closeCustomRange()" (applied)="applyCustomRange($event)" />
    }

    <app-confirm-dialog [visible]="!!deletingWallet()" title="Delete wallet" [message]="deleteWalletMessage()" (confirm)="deleteWallet()" (cancel)="deletingWallet.set(null)" />
    <app-confirm-dialog [visible]="!!deletingTransaction()" title="Delete transaction" [message]="deleteTransactionMessage()" (confirm)="deleteTransaction()" (cancel)="deletingTransaction.set(null)" />
  `,
})
export class WalletsPage {
  private readonly api = inject(Api);
  protected readonly paths = ICON_PATHS;
  protected readonly types = TRANSACTION_TYPE;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly dateRangeOptions = DATE_RANGE_OPTIONS;
  protected readonly formatAmount = formatAmount;
  protected readonly formatDisplayDate = formatDisplayDate;
  protected readonly signedAmount = signedAmount;
  protected readonly isIncome = isIncome;

  protected readonly wallets = signal<Wallet[]>([]);
  protected readonly totalBalance = signal(0);
  protected readonly categories = signal<Category[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selected = signal<string[]>([]);

  protected readonly transactions = signal<Transaction[]>([]);
  protected readonly loadingTransactions = signal(false);
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  private readonly refreshKey = signal(0);
  protected readonly summary = signal({ totalIncome: 0, totalExpense: 0 });

  protected readonly typeFilters = signal<TransactionType[]>([]);
  protected readonly categoryIds = signal<string[]>([]);
  protected readonly dateFilters = signal<string[]>(DEFAULT_RANGE);
  private readonly appliedRanges = signal<string[]>(DEFAULT_RANGE);
  private readonly custom = signal<Custom>(NO_CUSTOM);
  protected readonly showCustomRange = signal(false);

  protected readonly walletForm = signal<{ wallet: Wallet | null } | null>(null);
  protected readonly transactionForm = signal<{ transaction: Transaction | null } | null>(null);
  protected readonly showTransfer = signal(false);
  protected readonly deletingWallet = signal<Wallet | null>(null);
  protected readonly deletingTransaction = signal<Transaction | null>(null);

  protected readonly dateRange = computed(() => mergeDateRanges(this.appliedRanges(), this.custom()));
  protected readonly selectedWallet = computed(() => (this.selected().length === 1 ? this.wallets().find((w) => w.id === this.selected()[0]) : undefined));
  private readonly walletIds = computed(() => (this.selected().length > 0 ? this.selected() : undefined));
  protected readonly categoryOptions = computed(() => this.categories().map((c) => ({ value: c.id, label: c.name, icon: c.icon })));
  protected readonly deleteWalletMessage = computed(() => `Delete '${this.deletingWallet()?.name}'?`);
  protected readonly deleteTransactionMessage = computed(() => {
    const t = this.deletingTransaction();
    return `Delete '${t?.note ?? t?.categoryName ?? "this transaction"}'?`;
  });

  constructor() {
    this.loadWallets();
    this.api.getCategories().then(({ data }) => this.categories.set(data ?? []));

    effect((onCleanup) => {
      let stale = false;
      onCleanup(() => (stale = true));
      const typeFilters = this.typeFilters();
      const categoryIds = this.categoryIds();
      const range = this.dateRange();
      const hasFilter = typeFilters.length > 0 || categoryIds.length > 0;
      const query = { page: this.page(), limit: PAGE_SIZE, walletIds: this.walletIds(), type: typeFilters.length === 1 ? typeFilters[0] : undefined, categoryIds: categoryIds.length > 0 ? categoryIds : undefined, dateFrom: range.from ?? undefined, dateTo: range.to ?? undefined, exclude: hasFilter ? ("Transfer" as const) : undefined };
      this.refreshKey();
      this.loadingTransactions.set(true);
      this.api.getTransactions(query).then(({ data, error }) => {
        if (stale) return;
        this.loadingTransactions.set(false);
        if (error) this.error.set(error.message ?? "Failed to load transactions.");
        this.transactions.set(data?.items ?? []);
        this.total.set(data?.total ?? 0);
      });
    });

    effect((onCleanup) => {
      let stale = false;
      onCleanup(() => (stale = true));
      const month = resolveDateRange(DATE_RANGE.thisMonth);
      const query = { walletIds: this.walletIds(), dateFrom: month.from ?? undefined, dateTo: month.to ?? undefined };
      this.refreshKey();
      this.api.getSummary(query).then(({ data }) => {
        if (!stale) this.summary.set({ totalIncome: data?.totalIncome ?? 0, totalExpense: data?.totalExpense ?? 0 });
      });
    });
  }

  private async loadWallets() {
    const { data, error } = await this.api.getWallets();
    this.loading.set(false);
    this.error.set(error ? error.message ?? "Failed to load wallets." : null);
    this.wallets.set(data?.wallets ?? []);
    this.totalBalance.set(data?.totalBalance ?? 0);
  }

  private refresh() {
    this.loadWallets();
    this.refreshKey.update((k) => k + 1);
  }

  protected categoryIcon(t: Transaction) {
    return this.categories().find((c) => c.id === t.categoryId)?.icon;
  }

  protected fallbackIcon(t: Transaction) {
    if (t.isTransfer) return "🔁";
    return isIncome(t.type) ? "💰" : "💸";
  }

  protected typeFilterClass(active: boolean) {
    return active ? "btn-primary btn-sm" : "btn-secondary btn-sm";
  }

  protected resetFilters() {
    this.typeFilters.set([]);
    this.categoryIds.set([]);
    this.dateFilters.set(DEFAULT_RANGE);
    this.appliedRanges.set(DEFAULT_RANGE);
    this.custom.set(NO_CUSTOM);
    this.page.set(1);
  }

  protected selectAll() {
    this.selected.set([]);
    this.resetFilters();
  }

  protected toggleWallet(id: string) {
    this.selected.update((list) => toggled(list, id));
    this.resetFilters();
  }

  protected toggleType(type: TransactionType) {
    this.typeFilters.update((list) => toggled(list, type));
    this.page.set(1);
  }

  protected changeCategories(values: string[]) {
    this.categoryIds.set(values);
    this.page.set(1);
  }

  protected changeDateFilters(values: string[]) {
    this.dateFilters.set(values);
    if (values.includes(DATE_RANGE.custom) && !this.appliedRanges().includes(DATE_RANGE.custom)) return this.showCustomRange.set(true);
    this.appliedRanges.set(values);
    this.page.set(1);
  }

  protected closeCustomRange() {
    this.showCustomRange.set(false);
    this.dateFilters.set(this.appliedRanges());
  }

  protected applyCustomRange(value: Custom) {
    this.custom.set(value);
    this.appliedRanges.set(this.dateFilters());
    this.showCustomRange.set(false);
    this.page.set(1);
  }

  protected openTransaction(t: Transaction) {
    if (!t.isTransfer) this.transactionForm.set({ transaction: t });
  }

  protected saveWallet() {
    this.walletForm.set(null);
    this.loadWallets();
  }

  protected saveTransaction() {
    this.transactionForm.set(null);
    this.page.set(1);
    this.refresh();
  }

  protected saveTransfer() {
    this.showTransfer.set(false);
    this.page.set(1);
    this.refresh();
  }

  protected requestDeleteTransaction(transaction: Transaction) {
    this.transactionForm.set(null);
    this.deletingTransaction.set(transaction);
  }

  protected async deleteWallet() {
    const wallet = this.deletingWallet();
    if (!wallet) return;
    this.deletingWallet.set(null);
    const { error } = await this.api.deleteWallet(wallet.id);
    if (error) return this.error.set(error.message ?? "Failed to delete wallet.");
    this.selected.update((list) => list.filter((x) => x !== wallet.id));
    this.refresh();
  }

  protected async deleteTransaction() {
    const transaction = this.deletingTransaction();
    if (!transaction) return;
    this.deletingTransaction.set(null);
    const { error } = await this.api.deleteTransaction(transaction.id);
    if (error) return this.error.set(error.message ?? "Failed to delete transaction.");
    this.refresh();
  }
}
