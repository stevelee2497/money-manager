import { provideZonelessChangeDetection } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { provideAuth0 } from "@auth0/auth0-angular";
import { AppComponent } from "./app.component";
import { routes } from "./app.routes";

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAuth0({ domain: VITE_AUTH0_DOMAIN, clientId: VITE_AUTH0_CLIENT_ID, cacheLocation: "localstorage", useRefreshTokens: true, authorizationParams: { redirect_uri: window.location.origin, audience: VITE_AUTH0_AUDIENCE } }),
  ],
}).catch((error) => console.error(error));
