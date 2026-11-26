import { ChangeDetectionStrategy, Component, computed, model } from "@angular/core";
import { formatAmount } from "../lib/format";

const display = (value: number) => (value > 0 ? formatAmount(value) : "");

/** Digits-only amount field, displayed with thousands separators. Zero shows as empty. */
@Component({
  selector: "app-currency-input",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "contents" },
  template: `<input #field class="form-input" placeholder="0" inputmode="numeric" [value]="text()" (input)="change(field)" />`,
})
export class CurrencyInput {
  readonly value = model(0);
  protected readonly text = computed(() => display(this.value()));

  protected change(field: HTMLInputElement) {
    const value = Number(field.value.replace(/\D/g, "")) || 0;
    this.value.set(value);
    // Rewrite the field even when the number is unchanged (e.g. a letter was typed), so stray characters disappear.
    field.value = display(value);
  }
}
