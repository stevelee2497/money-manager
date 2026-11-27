import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, resource, signal } from "@angular/core";
import { ConfirmDialog } from "../../components/confirm-dialog.component";
import { Glyph } from "../../components/glyph.component";
import { Icon } from "../../components/icon.component";
import { MultiSelectInput } from "../../components/multi-select-input.component";
import { Pagination } from "../../components/pagination.component";
import { Spinner } from "../../components/spinner.component";
import { Api } from "../../lib/api.service";
import { DATE_RANGE, DATE_RANGE_OPTIONS, mergeDateRanges, resolveDateRange, type Custom } from "../../lib/dateRanges";
import { formatAmount, formatDisplayDate, signedAmount } from "../../lib/format";
import type { ApiResult, Paged, Transaction, TransactionQuery, TransactionSummary, TransactionType, Wallet } from "../../lib/types";
import { CustomRangeModal } from "./components/custom-range-modal.component";
import { PieChart } from "./components/pie-chart.component";
import { TransactionModal } from "./components/transaction-modal.component";
import { TransferModal } from "./components/transfer-modal.component";
import { WalletModal } from "./components/wallet-modal.component";
import { PAGE_SIZE, TRANSACTION_TYPE } from "./utils/constants";

type TransactionsResult = ApiResult<Paged<Transaction>> | undefined;
type SummaryResult = ApiResult<TransactionSummary> | undefined;

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "contents" },
  templateUrl: "./wallets.component.html",
})
export class WalletsComponent {
  private readonly api = inject(Api);
  protected readonly paths = ICON_PATHS;
  protected readonly types = TRANSACTION_TYPE;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly dateRangeOptions = DATE_RANGE_OPTIONS;
  protected readonly formatAmount = formatAmount;
  protected readonly formatDisplayDate = formatDisplayDate;
  protected readonly signedAmount = signedAmount;
  protected readonly isIncome = isIncome;

  protected readonly selected = signal<string[]>([]);
  protected readonly page = signal(1);
  protected readonly typeFilters = signal<TransactionType[]>([]);
  protected readonly categoryIds = signal<string[]>([]);
  protected readonly dateFilters = signal<string[]>(DEFAULT_RANGE);
  private readonly appliedRanges = signal<string[]>(DEFAULT_RANGE);
  private readonly custom = signal<Custom>(NO_CUSTOM);
  private readonly actionError = signal<string | null>(null);

  protected readonly showCustomRange = signal(false);
  protected readonly walletForm = signal<{ wallet: Wallet | null } | null>(null);
  protected readonly transactionForm = signal<{ transaction: Transaction | null } | null>(null);
  protected readonly showTransfer = signal(false);
  protected readonly deletingWallet = signal<Wallet | null>(null);
  protected readonly deletingTransaction = signal<Transaction | null>(null);

  private readonly walletsResource = resource({ loader: () => this.api.getWallets() });
  private readonly categoriesResource = resource({ loader: () => this.api.getCategories() });
  private readonly transactionsResource = resource({ params: () => this.query(), loader: ({ params }) => this.api.getTransactions(params) });
  private readonly summaryResource = resource({
    params: () => ({ walletIds: this.walletIds() }),
    loader: ({ params }) => {
      const month = resolveDateRange(DATE_RANGE.thisMonth);
      return this.api.getSummary({ ...params, dateFrom: month.from ?? undefined, dateTo: month.to ?? undefined });
    },
  });

  // A resource drops its value while new params load; keep the last result so the list blurs instead of vanishing.
  private readonly lastTransactions = linkedSignal<TransactionsResult, TransactionsResult>({ source: () => this.transactionsResource.value(), computation: (result, previous) => result ?? previous?.value });
  private readonly lastSummary = linkedSignal<SummaryResult, SummaryResult>({ source: () => this.summaryResource.value(), computation: (result, previous) => result ?? previous?.value });

  protected readonly dateRange = computed(() => mergeDateRanges(this.appliedRanges(), this.custom()));
  private readonly walletIds = computed(() => (this.selected().length > 0 ? this.selected() : undefined));
  protected readonly selectedWallet = computed(() => (this.selected().length === 1 ? this.wallets().find((w) => w.id === this.selected()[0]) : undefined));
  protected readonly categoryOptions = computed(() => this.categories().map((c) => ({ value: c.id, label: c.name, icon: c.icon })));
  protected readonly deleteWalletMessage = computed(() => `Delete '${this.deletingWallet()?.name}'?`);
  protected readonly loading = computed(() => !this.walletsResource.hasValue());
  protected readonly wallets = computed(() => this.walletsResource.value()?.data?.wallets ?? []);
  protected readonly totalBalance = computed(() => this.walletsResource.value()?.data?.totalBalance ?? 0);
  protected readonly categories = computed(() => this.categoriesResource.value()?.data ?? []);
  protected readonly transactions = computed(() => this.lastTransactions()?.data?.items ?? []);
  protected readonly total = computed(() => this.lastTransactions()?.data?.total ?? 0);
  protected readonly loadingTransactions = computed(() => this.transactionsResource.isLoading());
  protected readonly summary = computed(() => ({ totalIncome: this.lastSummary()?.data?.totalIncome ?? 0, totalExpense: this.lastSummary()?.data?.totalExpense ?? 0 }));

  private readonly query = computed((): TransactionQuery => {
    const typeFilters = this.typeFilters();
    const categoryIds = this.categoryIds();
    const range = this.dateRange();
    const hasFilter = typeFilters.length > 0 || categoryIds.length > 0;
    return { page: this.page(), limit: PAGE_SIZE, walletIds: this.walletIds(), type: typeFilters.length === 1 ? typeFilters[0] : undefined, categoryIds: categoryIds.length > 0 ? categoryIds : undefined, dateFrom: range.from ?? undefined, dateTo: range.to ?? undefined, exclude: hasFilter ? "Transfer" : undefined };
  });
  protected readonly error = computed(() => {
    const walletsError = this.walletsResource.value()?.error;
    const transactionsError = this.transactionsResource.value()?.error;
    if (walletsError) return walletsError.message ?? "Failed to load wallets.";
    if (transactionsError) return transactionsError.message ?? "Failed to load transactions.";
    return this.actionError();
  });
  protected readonly deleteTransactionMessage = computed(() => {
    const t = this.deletingTransaction();
    return `Delete '${t?.note ?? t?.categoryName ?? "this transaction"}'?`;
  });

  private refresh() {
    this.actionError.set(null);
    this.walletsResource.reload();
    this.transactionsResource.reload();
    this.summaryResource.reload();
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
    this.walletsResource.reload();
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
    if (error) return this.actionError.set(error.message ?? "Failed to delete wallet.");
    this.selected.update((list) => list.filter((x) => x !== wallet.id));
    this.refresh();
  }

  protected async deleteTransaction() {
    const transaction = this.deletingTransaction();
    if (!transaction) return;
    this.deletingTransaction.set(null);
    const { error } = await this.api.deleteTransaction(transaction.id);
    if (error) return this.actionError.set(error.message ?? "Failed to delete transaction.");
    this.refresh();
  }
}
