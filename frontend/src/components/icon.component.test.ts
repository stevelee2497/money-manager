import { TestBed } from "@angular/core/testing";
import { inputBinding } from "@angular/core";
import { describe, expect, it } from "vitest";
import { Icon } from "./icon.component";

const render = (value: string | null | undefined, fallback?: string) => {
  const fixture = TestBed.createComponent(Icon, { bindings: [inputBinding("value", () => value), inputBinding("fallback", () => fallback)] });
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
};

describe("Icon", () => {
  it("renders an emoji as text", () => {
    expect(render("👛").textContent?.trim()).toBe("👛");
  });

  it("renders an image url as <img>", () => {
    expect(render("https://example.com/a.png").querySelector("img")?.getAttribute("src")).toBe("https://example.com/a.png");
  });

  it("wraps an svg path fragment in an <svg>", () => {
    expect(render('<path d="M0 0h24v24H0z" />').querySelector("svg path")).not.toBeNull();
  });

  it("falls back when there is no value", () => {
    expect(render(undefined, "💰").textContent?.trim()).toBe("💰");
  });

  it("renders nothing without value or fallback", () => {
    expect(render(null).children.length).toBe(0);
  });
});
