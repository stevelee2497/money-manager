import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/** A single-path 24×24 outline icon (Heroicons style). */
@Component({
  selector: "app-glyph",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "contents" },
  template: `<svg [class]="size()" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="d()" /></svg>`,
})
export class Glyph {
  readonly d = input.required<string>();
  readonly size = input("w-5 h-5");
}
