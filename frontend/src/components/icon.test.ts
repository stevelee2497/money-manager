import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";
import { Icon } from "./icon";

const render = (inputs: Record<string, unknown>) => {
  const fixture = TestBed.createComponent(Icon);
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
};

describe("Icon", () => {
  it("renders an emoji as text", () => expect(render({ value: "👛" }).textContent?.trim()).toBe("👛"));

  it("renders an image url as <img>", () => {
    expect(render({ value: "https://example.com/a.png" }).querySelector("img")?.getAttribute("src")).toBe("https://example.com/a.png");
  });

  it("wraps an svg path fragment in an <svg>", () => {
    expect(render({ value: '<path d="M0 0h24v24H0z" />' }).querySelector("svg path")).not.toBeNull();
  });

  it("falls back when there is no value", () => expect(render({ value: undefined, fallback: "💰" }).textContent?.trim()).toBe("💰"));

  it("renders nothing without value or fallback", () => expect(render({ value: null }).children.length).toBe(0));
});
