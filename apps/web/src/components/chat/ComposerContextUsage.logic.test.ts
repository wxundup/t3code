import { describe, expect, it } from "vite-plus/test";

import { resolveContextUsageSide } from "./ComposerContextUsage";

describe("resolveContextUsageSide", () => {
  it("uses the configured side when nothing covers it", () => {
    expect(resolveContextUsageSide("left", false)).toBe("left");
    expect(resolveContextUsageSide("right", false)).toBe("right");
  });

  it("hops to the opposite side while that spot is occupied", () => {
    expect(resolveContextUsageSide("left", true)).toBe("right");
    expect(resolveContextUsageSide("right", true)).toBe("left");
  });
});
