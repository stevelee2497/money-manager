import { Component, computed, input } from "@angular/core";
import { formatAmount, formatPercent } from "../../lib/format";
import type { Wallet } from "../../lib/types";
import { buildPieData, type PieSlice } from "./pieData";

const point = (turns: number) => `${Math.cos(turns * 2 * Math.PI).toFixed(4)} ${Math.sin(turns * 2 * Math.PI).toFixed(4)}`;

const slicePaths = (slices: PieSlice[]) => {
  let cumulative = 0;
  return slices.map((slice) => {
    const start = cumulative;
    cumulative += slice.fraction;
    const largeArc = slice.fraction > 0.5 ? 1 : 0;
    return { key: slice.name + start, color: slice.color, d: `M 0 0 L ${point(start)} A 1 1 0 ${largeArc} 1 ${point(cumulative)} Z` };
  });
};

@Component({
  selector: "app-pie-chart",
  host: { class: "contents" },
  template: `
    <div class="card flex flex-col sm:flex-row items-center gap-4 py-3 px-5">
      <div class="shrink-0">
        <svg width="140" height="140" viewBox="-1.02 -1.02 2.04 2.04" style="transform: rotate(-90deg)">
          @if (slices().length === 1) {
            <svg:circle cx="0" cy="0" r="1" [attr.fill]="slices()[0].color" />
          } @else {
            @for (path of paths(); track path.key) {
              <svg:path [attr.d]="path.d" [attr.fill]="path.color" stroke="white" stroke-width="0.02" />
            }
          }
        </svg>
      </div>
      <div class="flex flex-col gap-3 flex-1 justify-center items-center">
        <div class="flex flex-wrap gap-x-4 gap-y-1 justify-center">
          @for (slice of slices(); track $index) {
            <div class="flex items-center gap-1.5 text-xs">
              <div class="w-2.5 h-2.5 rounded-full shrink-0" [style.background-color]="slice.color"></div>
              <span class="text-gray-700 dark:text-gray-200 font-medium">{{ slice.name }}</span>
              <span class="text-gray-400 dark:text-gray-500">{{ formatPercent(slice.fraction) }}</span>
            </div>
          }
        </div>
        <div class="border-t border-gray-100 dark:border-gray-700 w-full text-center">
          <div class="text-sm text-gray-400 dark:text-gray-500 mt-1">{{ selectedIds().length > 0 ? "Selected balance" : "Total balance" }}</div>
          <div class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ formatAmount(selectedBalance()) }}</div>
        </div>
      </div>
    </div>
  `,
})
export class PieChart {
  readonly wallets = input.required<Wallet[]>();
  readonly selectedIds = input.required<string[]>();

  protected readonly formatAmount = formatAmount;
  protected readonly formatPercent = formatPercent;
  protected readonly slices = computed(() => buildPieData(this.wallets(), this.selectedIds()));
  protected readonly paths = computed(() => slicePaths(this.slices()));
  protected readonly selectedBalance = computed(() => {
    const ids = this.selectedIds();
    const selected = ids.length > 0 ? this.wallets().filter((w) => ids.includes(w.id)) : this.wallets();
    return selected.reduce((sum, w) => sum + w.balance, 0);
  });
}
