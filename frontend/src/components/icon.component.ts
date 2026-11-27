import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";

/** Renders an icon value: "<path…/>" is an SVG fragment, "http…" an image URL, anything else an emoji. */
@Component({
  selector: "app-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "contents" },
  template: `
    @switch (kind()) {
      @case ("svg") { <svg [class]="size() + ' shrink-0'" viewBox="0 0 24 24" fill="none" stroke="currentColor" [innerHTML]="svg()"></svg> }
      @case ("image") { <img [src]="icon()" alt="" [class]="size() + ' shrink-0 object-contain rounded'" /> }
      @case ("emoji") { <span [class]="emojiClass()">{{ icon() }}</span> }
    }
  `,
})
export class Icon {
  readonly value = input<string | null | undefined>();
  readonly size = input("w-5 h-5");
  readonly fallback = input<string>();
  readonly emojiClass = input("text-base leading-none shrink-0");

  private readonly sanitizer = inject(DomSanitizer);
  protected readonly icon = computed(() => this.value() || this.fallback() || "");
  protected readonly kind = computed(() => {
    const icon = this.icon();
    if (!icon) return null;
    if (icon.trimStart().startsWith("<")) return "svg";
    return icon.startsWith("http") ? "image" : "emoji";
  });
  // Icon values come from our own icon library (same trust as before: rendered as raw SVG markup).
  protected readonly svg = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.icon()));
}
