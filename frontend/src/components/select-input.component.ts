import { ChangeDetectionStrategy, Component, computed, input, model, signal } from "@angular/core";
import { Icon } from "./icon.component";

export type SelectOption = { value: string; label: string; icon?: string };

const BUTTON = "w-full flex items-center justify-between gap-2 rounded-md border bg-white dark:bg-gray-800 px-3 py-2 text-left text-sm shadow-sm transition-colors focus:outline-none";
export const SELECT_PANEL = "absolute z-201 top-full left-0 mt-1 min-w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg";

export const selectButtonClass = (open: boolean, disabled?: boolean) => `${BUTTON} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${open ? "border-indigo-500 ring-1 ring-indigo-500" : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"}`;

@Component({
  selector: "app-chevron",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "contents" },
  template: `
    <svg class="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500 transition-transform duration-150" [class.rotate-180]="open()" fill="none" stroke="currentColor" viewBox="0 0 20 20">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 8l4 4 4-4" />
    </svg>
  `,
})
export class Chevron {
  readonly open = input(false);
}

@Component({
  selector: "app-select-input",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Chevron],
  host: { class: "relative block" },
  template: `
    <button type="button" [class]="buttonClass()" [disabled]="disabled()" (click)="open.set(!open())">
      <span class="flex items-center gap-2 truncate min-w-0" [class]="selected() ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'">
        @if (selected()?.icon) { <app-icon [value]="selected()?.icon" size="w-4 h-4" /> }
        <span class="truncate">{{ selected()?.label ?? "Select…" }}</span>
      </span>
      <app-chevron [open]="open()" />
    </button>
    @if (open()) {
      <div class="fixed inset-0 z-200" (click)="open.set(false)"></div>
      <div [class]="panel" style="max-height: 15rem; overflow-y: auto">
        @for (opt of options(); track opt.value) {
          <button type="button" (click)="pick(opt.value)" class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors" [class]="opt.value === value() ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'">
            <span class="flex items-center gap-2 truncate min-w-0">
              @if (opt.icon) { <app-icon [value]="opt.icon" size="w-4 h-4" /> }
              <span class="truncate">{{ opt.label }}</span>
            </span>
            @if (opt.value === value()) {
              <svg class="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            }
          </button>
        }
      </div>
    }
  `,
})
export class SelectInput {
  readonly value = model("");
  readonly options = input.required<SelectOption[]>();
  readonly disabled = input(false);

  protected readonly panel = SELECT_PANEL;
  protected readonly open = signal(false);
  protected readonly selected = computed(() => this.options().find((o) => o.value === this.value()));
  protected readonly buttonClass = computed(() => selectButtonClass(this.open(), this.disabled()));

  protected pick(value: string) {
    this.open.set(false);
    this.value.set(value);
  }
}
