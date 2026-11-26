import { DOCUMENT, Injectable, inject, signal } from "@angular/core";

const KEY = "theme";

/** Dark mode via the `dark` class on <html>; index.html applies the saved choice before Angular boots. */
@Injectable({ providedIn: "root" })
export class ThemeService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly state = signal(this.root.classList.contains("dark"));
  readonly dark = this.state.asReadonly();

  toggle() {
    const next = !this.state();
    this.root.classList.toggle("dark", next);
    localStorage.setItem(KEY, next ? "dark" : "light");
    this.state.set(next);
  }
}
