import { Component, computed, input, model, signal } from "@angular/core";
import { Icon } from "./icon";
import { Chevron, SELECT_PANEL, selectButtonClass, type SelectOption } from "./select-input";

@Component({
  selector: "app-multi-select-input",
  imports: [Icon, Chevron],
  host: { class: "relative block" },
  template: `
    <button type="button" [class]="buttonClass()" [disabled]="disabled()" (click)="open.set(!open())">
      <span class="flex items-center gap-2 truncate min-w-0 text-gray-900 dark:text-gray-100">
        @if (selected().length === 1 && selected()[0].icon) { <app-icon [value]="selected()[0].icon" size="w-4 h-4" /> }
        <span class="truncate">{{ summary() }}</span>
      </span>
      <app-chevron [open]="open()" />
    </button>
    @if (open()) {
      <div class="fixed inset-0 z-200" (click)="open.set(false)"></div>
      <div [class]="panel" style="max-height: 15rem; overflow-y: auto">
        @if (selected().length > 0) {
          <button type="button" (click)="values.set([])" class="flex w-full items-center gap-2 border-b border-gray-100 dark:border-gray-700 px-3 py-1.5 text-left text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">Clear all</button>
        }
        @for (opt of options(); track opt.value) {
          @let isSelected = values().includes(opt.value);
          <button type="button" (click)="toggle(opt.value)" class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors" [class]="isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'">
            <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded border" [class]="isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300 dark:border-gray-600'">
              @if (isSelected) {
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              }
            </span>
            <span class="flex items-center gap-2 truncate min-w-0">
              @if (opt.icon) { <app-icon [value]="opt.icon" size="w-4 h-4" /> }
              <span class="truncate">{{ opt.label }}</span>
            </span>
          </button>
        }
      </div>
    }
  `,
})
export class MultiSelectInput {
  readonly values = model<string[]>([]);
  readonly options = input.required<SelectOption[]>();
  readonly placeholder = input("Select…");
  readonly disabled = input(false);

  protected readonly panel = SELECT_PANEL;
  protected readonly open = signal(false);
  protected readonly selected = computed(() => this.options().filter((o) => this.values().includes(o.value)));
  protected readonly buttonClass = computed(() => selectButtonClass(this.open(), this.disabled()));
  protected readonly summary = computed(() => {
    const selected = this.selected();
    if (selected.length === 0) return this.placeholder();
    return selected.length === 1 ? selected[0].label : `${selected.length} selected`;
  });

  protected toggle(value: string) {
    const values = this.values();
    this.values.set(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  }
}
