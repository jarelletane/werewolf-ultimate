import { describe, expect, it } from "vitest";
import { nextFocusIndex } from "./AccessibleModal";

describe("nextFocusIndex", () => {
  it("wraps forward from the final control", () => {
    expect(nextFocusIndex(2, 3, false)).toBe(0);
  });

  it("wraps backward from the first control", () => {
    expect(nextFocusIndex(0, 3, true)).toBe(2);
  });

  it("selects an edge when focus begins outside the dialog", () => {
    expect(nextFocusIndex(-1, 3, false)).toBe(0);
    expect(nextFocusIndex(-1, 3, true)).toBe(2);
  });
});
