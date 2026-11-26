import { provideZonelessChangeDetection } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter, type Routes } from "@angular/router";
import { provideAuth0 } from "@auth0/auth0-angular";
import { App } from "./app";

const routes: Routes = [
  { path: "", loadComponent: () => import("./pages/wallets/wallets-page").then((m) => m.WalletsPage) },
  { path: "categories", loadComponent: () => import("./pages/categories/categories-page").then((m) => m.CategoriesPage) },
];

bootstrapApplication(App, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAuth0({ domain: VITE_AUTH0_DOMAIN, clientId: VITE_AUTH0_CLIENT_ID, cacheLocation: "localstorage", useRefreshTokens: true, authorizationParams: { redirect_uri: window.location.origin, audience: VITE_AUTH0_AUDIENCE } }),
  ],
}).catch((error) => console.error(error));
