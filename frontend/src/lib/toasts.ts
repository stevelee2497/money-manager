import { Injectable, signal } from "@angular/core";
import type { ApiError, Toast } from "./types";

const TOAST_TTL_MS = 8000;

@Injectable({ providedIn: "root" })
export class ToastService {
  private readonly list = signal<Toast[]>([]);
  readonly toasts = this.list.asReadonly();

  dismiss(id: string) {
    this.list.update((items) => items.filter((t) => t.id !== id));
  }

  showError(error: Pick<ApiError, "code" | "message" | "traceId">) {
    const toast: Toast = { id: crypto.randomUUID(), code: error.code, message: error.message, traceId: error.traceId, createdAt: Date.now() };
    this.list.update((items) => [...items, toast]);
    setTimeout(() => this.dismiss(toast.id), TOAST_TTL_MS);
  }
}
