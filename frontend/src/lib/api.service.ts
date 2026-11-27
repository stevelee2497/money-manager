import { Injectable, inject } from "@angular/core";
import { AuthService } from "@auth0/auth0-angular";
import { firstValueFrom } from "rxjs";
import { environment } from "../environments/environment";
import { ToastService } from "./toast.service";
import type { ApiError, ApiOptions, ApiResult, Category, CategoryInput, Created, Deleted, IconInput, IconItem, Paged, Transaction, TransactionInput, TransactionQuery, TransactionSummary, TransferInput, WalletInput, WalletsResponse } from "./types";

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

  private async request<T>(method: string, path: string, body?: unknown, options: ApiOptions = {}): Promise<ApiResult<T>> {
    // A session without a refresh token (e.g. created before refresh tokens were enabled) can't renew: sign in again.
    const token = await firstValueFrom(this.auth.getAccessTokenSilently({ authorizationParams: { audience: environment.auth0Audience } })).catch(async () => {
      await firstValueFrom(this.auth.loginWithRedirect());
      return new Promise<never>(() => {});
    });
    const isForm = body instanceof FormData;
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
    const res = await fetch(`${environment.apiUrl}/api${path}`, { method, headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body) });
    const text = await res.text();
    const json = text ? JSON.parse(text) : undefined;
    if (res.ok) return { data: json as T };
    const error = json as ApiError;
    if (!options.silent) this.toasts.showError(error);
    return { error };
  }

  getWallets = () => this.request<WalletsResponse>("GET", "/wallets");
  createWallet = (body: WalletInput) => this.request<Created>("POST", "/wallets", body);
  updateWallet = (id: string, body: Partial<Pick<WalletInput, "name" | "icon">>) => this.request<Created>("PATCH", `/wallets/${id}`, body);
  configureWallet = (id: string, currency: string) => this.request<Created>("PUT", `/wallets/${id}/config`, { currency });
  deleteWallet = (id: string) => this.request<Deleted>("DELETE", `/wallets/${id}`);

  getCategories = () => this.request<Category[]>("GET", "/categories");
  createCategory = (body: CategoryInput) => this.request<Created>("POST", "/categories", body);
  updateCategory = (id: string, body: Partial<Pick<CategoryInput, "name" | "icon">>) => this.request<Created>("PATCH", `/categories/${id}`, body);
  deleteCategory = (id: string) => this.request<Deleted>("DELETE", `/categories/${id}`);

  getTransactions = (q: TransactionQuery) => this.request<Paged<Transaction>>("GET", `/transactions${query({ ...q })}`);
  getSummary = (q: { walletIds?: string[]; dateFrom?: string; dateTo?: string }) => this.request<TransactionSummary>("GET", `/transactions/summary${query({ ...q })}`);
  createTransaction = (body: TransactionInput) => this.request<Created>("POST", "/transactions", body);
  updateTransaction = (id: string, body: Partial<TransactionInput>) => this.request<Created>("PATCH", `/transactions/${id}`, body);
  deleteTransaction = (id: string) => this.request<Deleted>("DELETE", `/transactions/${id}`);
  createTransfer = (body: TransferInput) => this.request<Created>("POST", "/transfers", body);

  getIcons = (group?: string, options?: ApiOptions) => this.request<IconItem[]>("GET", `/icons${query({ group })}`, undefined, options);
  createIcon = (body: IconInput) => this.request<Created>("POST", "/icons", body);
  updateIcon = (id: string, body: Partial<IconInput>) => this.request<Created>("PATCH", `/icons/${id}`, body);
  deleteIcon = (id: string) => this.request<Deleted>("DELETE", `/icons/${id}`);
  uploadIcon = (file: File) => this.request<{ iconUrl: string }>("POST", "/icons/upload", [file].reduce((form, f) => (form.append("file", f), form), new FormData()));
}
