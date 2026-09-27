import { describe, expect, it } from "vite-plus/test";

import { formatThreadUsageLabel } from "./usageLabel";

describe("formatThreadUsageLabel", () => {
  const usage = (overrides: Partial<Parameters<typeof formatThreadUsageLabel>[1]>) => ({
    totals: {
      uncachedInputTokens: 0,
      cachedInputTokens: 0,
      cacheCreationTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
    },
    records: 3,
    lastTimestampMs: null,
    costUsd: null,
    costSource: "modelPriced" as const,
    contextUsedTokens: null,
    contextMaxTokens: null,
    ...overrides,
  });

  it("shows context and cost side by side without parentheses", () => {
    expect(
      formatThreadUsageLabel(
        null,
        usage({ contextUsedTokens: 138_000, contextMaxTokens: 1_000_000, costUsd: 2.7612 }),
      ),
    ).toMatchInlineSnapshot(`"14% · 138k/1m · $2.76"`);
  });

  it("labels cost with its scope when no context fill is known", () => {
    expect(formatThreadUsageLabel(null, usage({ costUsd: 2.68 }))).toBe("session $2.68");
  });

  it("shows bare token counts when the window size is unknown", () => {
    expect(formatThreadUsageLabel(null, usage({ contextUsedTokens: 81_700 }))).toBe("82k");
  });

  it("returns null when there is nothing to show", () => {
    expect(formatThreadUsageLabel(null, usage({}))).toBeNull();
  });
});
