import { Component } from "@angular/core";
import { dismissToast, toasts } from "../lib/toasts";

@Component({
  selector: "app-toasts",
  host: { class: "contents" },
  template: `
    <div class="fixed top-4 right-4 z-100 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none">
      @for (toast of toasts(); track toast.id) {
        <div class="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/40 rounded-lg shadow-lg p-3 pointer-events-auto flex flex-col gap-1.5">
          <div class="flex items-start gap-2">
            <div class="shrink-0 mt-0.5">
              <svg class="w-4 h-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="badge bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">{{ toast.code }}</span>
                <span class="text-sm font-medium text-gray-800 dark:text-gray-200 wrap-break-word">{{ toast.message }}</span>
              </div>
              @if (toast.traceId) {
                <p class="text-xs text-gray-400 dark:text-gray-500 font-mono truncate mt-1" [title]="toast.traceId">Trace: {{ toast.traceId }}</p>
              }
            </div>
            <button (click)="dismiss(toast.id)" class="shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors" aria-label="Dismiss">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class Toasts {
  protected readonly toasts = toasts;
  protected readonly dismiss = dismissToast;
}
