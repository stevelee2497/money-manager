import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

/** Dialog shell. The body is projected; an `<app-modal-actions>` child becomes the footer. */
@Component({
  selector: "app-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "contents" },
  template: `
    <div class="fixed inset-0 z-40 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" (click)="close.emit()"></div>
      <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full mx-4" [class]="panelClass()" style="max-height: 90vh; overflow-y: auto">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{{ title() }}</h2>
        @if (error()) {
          <div class="mb-3 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">{{ error() }}</div>
        }
        <div class="space-y-4"><ng-content /></div>
        <ng-content select="app-modal-actions" />
      </div>
    </div>
  `,
})
export class Modal {
  readonly title = input.required<string>();
  readonly error = input<string | null>(null);
  readonly panelClass = input("max-w-md p-6");
  readonly close = output();
}

/** Standard Cancel / Save footer. Projected content (e.g. a Delete button with `mr-auto`) goes on the left. */
@Component({
  selector: "app-modal-actions",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "flex justify-end gap-3 mt-5" },
  template: `
    <ng-content />
    <button class="btn-secondary" (click)="cancel.emit()">Cancel</button>
    <button class="btn-primary" (click)="save.emit()" [disabled]="saving() || saveDisabled()">{{ saving() ? "Saving…" : saveLabel() }}</button>
  `,
})
export class ModalActions {
  readonly saving = input(false);
  readonly saveDisabled = input(false);
  readonly saveLabel = input("Save");
  readonly cancel = output();
  readonly save = output();
}
