import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";

@Component({
  selector: "app-pagination",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "contents" },
  template: `
    @if (totalPages() > 1) {
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between px-2 py-3 sm:px-0 mt-4 gap-2">
        <div class="text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">Page {{ currentPage() }} of {{ totalPages() }} ({{ totalItems() }} items)</div>
        <div class="flex items-center justify-center gap-1 flex-wrap">
          <button class="btn-secondary btn-sm" [disabled]="currentPage() <= 1" (click)="pageChanged.emit(currentPage() - 1)">← Prev</button>
          @for (p of pages(); track p) {
            <button [class]="p === currentPage() ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'" (click)="pageChanged.emit(p)">{{ p }}</button>
          }
          <button class="btn-secondary btn-sm" [disabled]="currentPage() >= totalPages()" (click)="pageChanged.emit(currentPage() + 1)">Next →</button>
        </div>
      </div>
    }
  `,
})
export class Pagination {
  readonly currentPage = input.required<number>();
  readonly totalItems = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly pageChanged = output<number>();

  protected readonly totalPages = computed(() => (this.pageSize() > 0 ? Math.ceil(this.totalItems() / this.pageSize()) : 1));
  protected readonly pages = computed(() => {
    const start = Math.max(1, this.currentPage() - 2);
    const end = Math.min(this.totalPages(), this.currentPage() + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });
}
