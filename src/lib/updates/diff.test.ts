import { describe, it, expect } from "vitest";
import { diffChapters } from "./diff";

describe("diffChapters", () => {
  it("empty known => baseline: returns no newRefs and newCount 0 (do not flood on first follow)", () => {
    const result = diffChapters([], [
      { ref: "ch-1", number: "1" },
      { ref: "ch-2", number: "2" },
    ]);
    expect(result).toEqual({ newRefs: [], newCount: 0 });
  });

  it("one new ref not in known", () => {
    const result = diffChapters(["ch-1", "ch-2"], [
      { ref: "ch-1", number: "1" },
      { ref: "ch-2", number: "2" },
      { ref: "ch-3", number: "3" },
    ]);
    expect(result).toEqual({ newRefs: ["ch-3"], newCount: 1 });
  });

  it("several new refs not in known", () => {
    const result = diffChapters(["ch-1"], [
      { ref: "ch-1", number: "1" },
      { ref: "ch-2", number: "2" },
      { ref: "ch-3", number: "3" },
      { ref: "ch-4", number: "4" },
    ]);
    expect(result).toEqual({ newRefs: ["ch-2", "ch-3", "ch-4"], newCount: 3 });
  });

  it("none new: all fetched refs already in known", () => {
    const result = diffChapters(["ch-1", "ch-2", "ch-3"], [
      { ref: "ch-1", number: "1" },
      { ref: "ch-2", number: "2" },
      { ref: "ch-3", number: "3" },
    ]);
    expect(result).toEqual({ newRefs: [], newCount: 0 });
  });

  it("idempotent: calling with same inputs twice yields same output", () => {
    const known = ["ch-1", "ch-2"];
    const fetched = [
      { ref: "ch-1", number: "1" },
      { ref: "ch-2", number: "2" },
      { ref: "ch-3", number: "3" },
    ];
    const first = diffChapters(known, fetched);
    const second = diffChapters(known, fetched);
    expect(first).toEqual(second);
  });

  it("order-independent membership: known order does not matter, result follows fetched order", () => {
    const result = diffChapters(["ch-3", "ch-1"], [
      { ref: "ch-1", number: "1" },
      { ref: "ch-2", number: "2" },
      { ref: "ch-3", number: "3" },
      { ref: "ch-4", number: "4" },
    ]);
    // ch-2 and ch-4 are new; order follows fetched array order
    expect(result).toEqual({ newRefs: ["ch-2", "ch-4"], newCount: 2 });
  });
});
