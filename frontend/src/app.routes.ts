import type { Routes } from "@angular/router";

export const routes: Routes = [
  { path: "", loadComponent: () => import("./pages/wallets/wallets.component").then((m) => m.WalletsComponent) },
  { path: "categories", loadComponent: () => import("./pages/categories/categories.component").then((m) => m.CategoriesComponent) },
];
