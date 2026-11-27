import { ChangeDetectionStrategy, Component, input, output, signal, type OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Modal } from "../../../components/modal.component";
import type { Custom } from "../../../lib/dateRanges";

const RANGE_ERROR = "From date must be earlier than or equal to To date.";

@Component({
  selector: "app-custom-range-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Modal],
  template: `
    <app-modal title="Custom Date Range" [error]="error()" panelClass="max-w-md p-4 md:p-6" (close)="close.emit()">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="form-label">From</label>
          <input type="date" class="form-input" [(ngModel)]="from" />
        </div>
        <div>
          <label class="form-label">To</label>
          <input type="date" class="form-input" [(ngModel)]="to" />
        </div>
      </div>
      <div class="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button class="btn-secondary w-full sm:w-auto" (click)="close.emit()">Cancel</button>
        <button class="btn-primary w-full sm:w-auto" (click)="apply()">Apply</button>
      </div>
    </app-modal>
  `,
})
export class CustomRangeModal implements OnInit {
  readonly initial = input.required<Custom>();
  readonly close = output();
  readonly applied = output<Custom>();

  protected readonly from = signal("");
  protected readonly to = signal("");
  protected readonly error = signal<string | null>(null);

  ngOnInit() {
    this.from.set(this.initial().from ?? "");
    this.to.set(this.initial().to ?? "");
  }

  protected apply() {
    const from = this.from();
    const to = this.to();
    if (from && to && from > to) return this.error.set(RANGE_ERROR);
    this.applied.emit({ from: from || null, to: to || null });
  }
}
