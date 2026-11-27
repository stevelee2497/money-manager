import { provideZonelessChangeDetection } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { provideAuth0 } from "@auth0/auth0-angular";
import { AppComponent } from "./app.component";
import { routes } from "./app.routes";
import { environment } from "./environments/environment";

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAuth0({ domain: environment.auth0Domain, clientId: environment.auth0ClientId, cacheLocation: "localstorage", useRefreshTokens: true, authorizationParams: { redirect_uri: window.location.origin, audience: environment.auth0Audience } }),
  ],
}).catch((error) => console.error(error));
