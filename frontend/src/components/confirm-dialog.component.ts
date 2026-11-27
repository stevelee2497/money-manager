import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

@Component({
  selector: "app-confirm-dialog",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "contents" },
  template: `
    @if (visible()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40" (click)="cancel.emit()"></div>
        <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
          <div class="flex items-start gap-4">
            <div class="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40">
              <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">{{ title() }}</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ message() }}</p>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button class="btn-secondary" (click)="cancel.emit()">Cancel</button>
            <button class="btn-danger" (click)="confirm.emit()">{{ confirmLabel() }}</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialog {
  readonly visible = input(false);
  readonly title = input("Confirm action");
  readonly message = input("Are you sure you want to proceed?");
  readonly confirmLabel = input("Delete");
  readonly confirm = output();
  readonly cancel = output();
}
