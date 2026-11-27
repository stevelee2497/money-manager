import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { RouterOutlet } from "@angular/router";
import { AuthService } from "@auth0/auth0-angular";
import { Toasts } from "./components/toasts.component";
import { TopBar } from "./components/top-bar.component";

/** Anonymous visitors are sent to the Auth0 hosted login; there is no login page of our own. */
@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, TopBar, Toasts],
  template: `
    @if (authenticated()) {
      <div class="flex h-screen bg-gray-50 dark:bg-gray-900">
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
          <app-top-bar />
          <main class="flex-1 overflow-y-auto p-2 md:p-6"><router-outlet /></main>
        </div>
        <app-toasts />
      </div>
    } @else {
      <div class="loading-screen"><div class="loading-spinner"></div></div>
    }
  `,
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  protected readonly authenticated = signal(false);

  constructor() {
    // isAuthenticated$ only emits once Auth0 has finished loading (including the redirect callback).
    this.auth.isAuthenticated$.pipe(takeUntilDestroyed()).subscribe((authenticated) => {
      this.authenticated.set(authenticated);
      if (!authenticated) this.auth.loginWithRedirect({ appState: { target: window.location.pathname } });
    });
  }
}
