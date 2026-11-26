import { ChangeDetectionStrategy, Component, type OnInit, inject, input, model, signal } from "@angular/core";
import { Api } from "../lib/api";
import type { IconItem } from "../lib/types";
import { Icon } from "./icon";

@Component({
  selector: "app-icon-picker",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: "block" },
  template: `
    @if (icons(); as icons) {
      <div class="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2">
        <div class="grid grid-cols-6 gap-1">
          @for (icon of icons; track icon.id) {
            <button type="button" [title]="icon.name" (click)="value.set(icon.value)" class="flex items-center justify-center p-1.5 rounded transition-colors" [class]="icon.value === value() ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'">
              <app-icon [value]="icon.value" emojiClass="text-xl leading-none" />
            </button>
          }
        </div>
      </div>
    } @else {
      <div class="py-4 text-center text-sm text-gray-400 dark:text-gray-500">Loading icons…</div>
    }
  `,
})
export class IconPicker implements OnInit {
  readonly group = input.required<"Wallet" | "Category">();
  readonly value = model("");

  private readonly api = inject(Api);
  protected readonly icons = signal<IconItem[] | null>(null);

  async ngOnInit() {
    const { data } = await this.api.getIcons(this.group());
    this.icons.set(data ?? []);
    if (!this.value() && data?.length) this.value.set(data[0].value);
  }
}
