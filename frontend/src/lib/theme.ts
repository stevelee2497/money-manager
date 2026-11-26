import { signal } from "@angular/core";

const KEY = "theme";
const state = signal(document.documentElement.classList.contains("dark"));

export const dark = state.asReadonly();

export const toggleTheme = () => {
  const next = !state();
  document.documentElement.classList.toggle("dark", next);
  localStorage.setItem(KEY, next ? "dark" : "light");
  state.set(next);
};
