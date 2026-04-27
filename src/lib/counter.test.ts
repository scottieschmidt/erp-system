import { describe, expect, it } from "vitest";

import { CounterSet } from "#/lib/counter";

describe("CounterSet", () => {
  it("tracks retain/release counts before deleting key", () => {
    const set = new CounterSet<string>();

    set.retain("feature-a");
    set.retain("feature-a");

    expect(set.has("feature-a")).toBe(true);

    set.release("feature-a");
    expect(set.has("feature-a")).toBe(true);

    set.release("feature-a");
    expect(set.has("feature-a")).toBe(false);
  });

  it("ignores release for missing keys", () => {
    const set = new CounterSet<string>();

    set.release("missing-key");

    expect(set.has("missing-key")).toBe(false);
    expect(Array.from(set.items())).toEqual([]);
  });

  it("exposes retained keys through items()", () => {
    const set = new CounterSet<string>();

    set.retain("a");
    set.retain("b");

    expect(new Set(set.items())).toEqual(new Set(["a", "b"]));
  });
});
