import { Injectable, inject } from "@angular/core";
import { AuthService } from "@auth0/auth0-angular";
import { firstValueFrom } from "rxjs";
import { ToastService } from "./toasts";
import type { ApiError, Category, IconInput, IconItem, Paged, Transaction, TransactionInput, TransactionQuery, TransactionSummary, TransferInput, WalletsResponse } from "./types";

export type ApiResult<T> = { data?: T; error?: ApiError };
type Options = { silent?: boolean };

const query = (params: Record<string, string | number | string[] | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    for (const v of Array.isArray(value) ? value : [value]) search.append(key, String(v));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
};

/** Typed API client. Every call attaches the Auth0 token, and failed calls raise a toast unless `silent`. */
@Injectable({ providedIn: "root" })
export class Api {
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);

  private async request<T>(method: string, path: string, body?: unknown, options: Options = {}): Promise<ApiResult<T>> {
    // A session without a refresh token (e.g. created before refresh tokens were enabled) can't renew: sign in again.
    const token = await firstValueFrom(this.auth.getAccessTokenSilently({ authorizationParams: { audience: VITE_AUTH0_AUDIENCE } })).catch(async () => {
      await firstValueFrom(this.auth.loginWithRedirect());
      return new Promise<never>(() => {});
    });
    const isForm = body instanceof FormData;
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
    const res = await fetch(`${VITE_API_URL}/api${path}`, { method, headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body) });
    const text = await res.text();
    const json = text ? JSON.parse(text) : undefined;
    if (res.ok) return { data: json as T };
    const error = json as ApiError;
    if (!options.silent) this.toasts.showError(error);
    return { error };
  }

  getWallets = () => this.request<WalletsResponse>("GET", "/wallets");
  createWallet = (body: { name: string; initialBalance: number; currency: string; icon?: string }) => this.request<{ id: string }>("POST", "/wallets", body);
  updateWallet = (id: string, body: { name?: string; icon?: string }) => this.request<{ id: string }>("PATCH", `/wallets/${id}`, body);
  configureWallet = (id: string, currency: string) => this.request<{ id: string }>("PUT", `/wallets/${id}/config`, { currency });
  deleteWallet = (id: string) => this.request<{ success: boolean }>("DELETE", `/wallets/${id}`);

  getCategories = () => this.request<Category[]>("GET", "/categories");
  createCategory = (body: { name: string; type: string; icon?: string }) => this.request<{ id: string }>("POST", "/categories", body);
  updateCategory = (id: string, body: { name?: string; icon?: string }) => this.request<{ id: string }>("PATCH", `/categories/${id}`, body);
  deleteCategory = (id: string) => this.request<{ success: boolean }>("DELETE", `/categories/${id}`);

  getTransactions = (q: TransactionQuery) => this.request<Paged<Transaction>>("GET", `/transactions${query({ ...q })}`);
  getSummary = (q: { walletIds?: string[]; dateFrom?: string; dateTo?: string }) => this.request<TransactionSummary>("GET", `/transactions/summary${query({ ...q })}`);
  createTransaction = (body: TransactionInput) => this.request<{ id: string }>("POST", "/transactions", body);
  updateTransaction = (id: string, body: Partial<TransactionInput>) => this.request<{ id: string }>("PATCH", `/transactions/${id}`, body);
  deleteTransaction = (id: string) => this.request<{ success: boolean }>("DELETE", `/transactions/${id}`);
  createTransfer = (body: TransferInput) => this.request<{ id: string }>("POST", "/transfers", body);

  getIcons = (group?: string, options?: Options) => this.request<IconItem[]>("GET", `/icons${query({ group })}`, undefined, options);
  createIcon = (body: IconInput) => this.request<{ id: string }>("POST", "/icons", body);
  updateIcon = (id: string, body: Partial<IconInput>) => this.request<{ id: string }>("PATCH", `/icons/${id}`, body);
  deleteIcon = (id: string) => this.request<{ success: boolean }>("DELETE", `/icons/${id}`);
  uploadIcon = (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return this.request<{ iconUrl: string }>("POST", "/icons/upload", form);
  };
}
