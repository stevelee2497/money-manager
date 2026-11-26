import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { AuthService } from "@auth0/auth0-angular";
import { ThemeService } from "../lib/theme";
import { Glyph } from "./glyph";

const ICONS = {
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  tag: "M7 7h.01M7 3h5c.53 0 1.039.211 1.414.586l6 6a2 2 0 010 2.828l-4.172 4.172a2 2 0 01-2.828 0l-6-6A2 2 0 016 9V4a1 1 0 011-1z",
  user: "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  sun: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  moon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
  logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  chevron: "M19 9l-7 7-7-7",
};

const LINK = "flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors shrink-0";
const ACTIVE = "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium";

@Component({
  selector: "app-top-bar",
  imports: [RouterLink, RouterLinkActive, Glyph],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "contents" },
  template: `
    <div class="flex items-center h-12 md:h-16 px-4 md:px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0 gap-3">
      <nav class="flex-1 flex items-center gap-1 md:gap-2 min-w-0 overflow-x-auto">
        <a routerLink="/" title="Wallets" [class]="link" [routerLinkActive]="active" [routerLinkActiveOptions]="{ exact: true }"><app-glyph [d]="icons.home" size="w-5 h-5 shrink-0" /></a>
        <a routerLink="/categories" title="Categories" [class]="link" [routerLinkActive]="active"><app-glyph [d]="icons.tag" size="w-5 h-5 shrink-0" /></a>
      </nav>
      <div class="flex items-center gap-2 md:gap-3 shrink-0">
        <button (click)="theme.toggle()" class="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Toggle dark mode" [title]="dark() ? 'Switch to light mode' : 'Switch to dark mode'">
          <app-glyph [d]="dark() ? icons.sun : icons.moon" />
        </button>
        <div class="relative">
          <button (click)="profileOpen.set(!profileOpen())" class="flex items-center gap-2 px-1.5 md:px-3 py-1.5 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            @if (user()?.picture) {
              <img [src]="user()?.picture" alt="Avatar" class="w-6 h-6 rounded-full object-cover shrink-0" />
            } @else {
              <app-glyph [d]="icons.user" size="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
            }
            <span class="hidden md:inline truncate max-w-25 font-semibold">{{ name() }}</span>
            <app-glyph [d]="icons.chevron" size="hidden md:block w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
          </button>
          @if (profileOpen()) {
            <div class="fixed inset-0 z-40" (click)="profileOpen.set(false)"></div>
            <div class="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div class="py-1">
                <button (click)="logout()" class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                  <app-glyph [d]="icons.logout" size="w-4 h-4 shrink-0" />
                  Sign Out
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class TopBar {
  private readonly auth = inject(AuthService);
  protected readonly icons = ICONS;
  protected readonly link = LINK;
  protected readonly active = ACTIVE;
  protected readonly theme = inject(ThemeService);
  protected readonly dark = this.theme.dark;
  protected readonly profileOpen = signal(false);
  protected readonly user = toSignal(this.auth.user$);
  protected readonly name = computed(() => this.user()?.name ?? this.user()?.email ?? "");

  protected logout() {
    this.auth.logout({ logoutParams: { returnTo: window.location.origin } });
  }
}
