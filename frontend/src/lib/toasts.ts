import { signal } from "@angular/core";
import type { ApiError, Toast } from "./types";

const TOAST_TTL_MS = 8000;
const list = signal<Toast[]>([]);

export const toasts = list.asReadonly();

export const dismissToast = (id: string) => list.update((items) => items.filter((t) => t.id !== id));

export const showError = (error: Pick<ApiError, "code" | "message" | "traceId">) => {
  const toast: Toast = { id: crypto.randomUUID(), code: error.code, message: error.message, traceId: error.traceId, createdAt: Date.now() };
  list.update((items) => [...items, toast]);
  setTimeout(() => dismissToast(toast.id), TOAST_TTL_MS);
};
