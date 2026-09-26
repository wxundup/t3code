import { describe, expect, it } from "@effect/vitest";

import { emptyUsageThreadUsage, ProviderDriverKind } from "@t3tools/contracts";

import type { UsageRecord } from "./usageTranscripts.ts";
import type { RateTable } from "./usagePricing.ts";
import { summarizeThreadUsage, threadUsageKey } from "./threadUsage.ts";

const driver = ProviderDriverKind.make;

const rates: RateTable = new Map([
  [
    "claude-fable-5",
    {
      inputCostPerToken: 1e-5,
      outputCostPerToken: 5e-5,
      cacheReadCostPerToken: 1e-6,
      cacheCreationCostPerToken: 1.25e-5,
      fastMultiplier: 1,
    },
  ],
]);

function record(overrides: Partial<UsageRecord> = {}): UsageRecord {
  return {
    provider: "claude",
    timestampMs: Date.parse("2026-08-01T10:00:00Z"),
    model: "claude-fable-5",
    sessionId: "session-1",
    totals: {
      uncachedInputTokens: 100,
      cachedInputTokens: 1000,
      cacheCreationTokens: 10,
      outputTokens: 50,
      reasoningTokens: 0,
    },
    reportedCostUsd: null,
    fast: false,
    dedupeKey: null,
    ...overrides,
  };
}

describe("threadUsageKey", () => {
  it("maps the claude resume cursor", () => {
    expect(threadUsageKey(driver("claudeAgent"), { resume: "abc-123" })).toEqual({
      provider: "claude",
      sessionId: "abc-123",
    });
  });

  it("accepts the legacy claude sessionId cursor", () => {
    expect(threadUsageKey(driver("claudeAgent"), { sessionId: "legacy" })).toEqual({
      provider: "claude",
      sessionId: "legacy",
    });
  });

  it("maps the codex thread id cursor", () => {
    expect(threadUsageKey(driver("codex"), { threadId: "rollout-1" })).toEqual({
      provider: "codex",
      sessionId: "rollout-1",
    });
  });

  it("maps the shared sessionId cursor of every ACP provider and opencode", () => {
    expect(threadUsageKey(driver("grok"), { sessionId: "g1" })).toEqual({
      provider: "grok",
      sessionId: "g1",
    });
    expect(threadUsageKey(driver("cursor"), { schemaVersion: 1, sessionId: "c1" })).toEqual({
      provider: "cursor",
      sessionId: "c1",
    });
    expect(threadUsageKey(driver("opencode"), { sessionId: "o1" })).toEqual({
      provider: "opencode",
      sessionId: "o1",
    });
    expect(threadUsageKey(driver("antigravity"), { sessionId: "a1" })).toEqual({
      provider: "antigravity",
      sessionId: "a1",
    });
  });

  it("returns null for a missing, empty, or malformed cursor", () => {
    expect(threadUsageKey(driver("claudeAgent"), null)).toBeNull();
    expect(threadUsageKey(driver("claudeAgent"), "nope")).toBeNull();
    expect(threadUsageKey(driver("grok"), { sessionId: "" })).toBeNull();
    expect(threadUsageKey(driver("opencode"), {})).toBeNull();
  });
});

describe("summarizeThreadUsage", () => {
  it("returns an empty unknown-cost summary without records", () => {
    expect(summarizeThreadUsage({ rates }, [])).toEqual(emptyUsageThreadUsage());
  });

  it("prices token records against the rate table", () => {
    const summary = summarizeThreadUsage({ rates }, [record()]);
    // 100*1e-5 + 1000*1e-6 + 10*1.25e-5 + 50*5e-5 = 0.004625
    expect(summary.costUsd).toBeCloseTo(0.004625, 12);
    expect(summary.costSource).toBe("modelPriced");
    expect(summary.records).toBe(1);
    expect(summary.totals.outputTokens).toBe(50);
    expect(summary.lastTimestampMs).toBe(Date.parse("2026-08-01T10:00:00Z"));
  });

  it("prefers provider-reported cost and reports the provenance", () => {
    const summary = summarizeThreadUsage({ rates }, [record({ reportedCostUsd: 0.5 })]);
    expect(summary.costUsd).toBe(0.5);
    expect(summary.costSource).toBe("providerReported");
  });

  it("drops repeated claude records across transcript copies", () => {
    const base = record();
    const summary = summarizeThreadUsage({ rates }, [
      record({ dedupeKey: "msg_1" }),
      record({ dedupeKey: "msg_1" }),
      record({
        dedupeKey: "msg_2",
        totals: { ...base.totals, outputTokens: 10 },
      }),
    ]);
    expect(summary.records).toBe(2);
    expect(summary.totals.outputTokens).toBe(60);
  });

  it("hides the cost when no record could be priced", () => {
    const summary = summarizeThreadUsage({ rates: new Map() }, [record()]);
    expect(summary.costUsd).toBeNull();
    expect(summary.costSource).toBe("unpriced");
    expect(summary.records).toBe(1);
    expect(summary.totals.outputTokens).toBe(50);
  });

  it("sums partial cost when only some records are unpriced", () => {
    const summary = summarizeThreadUsage({ rates: new Map() }, [
      record({ reportedCostUsd: 1 }),
      record({ model: "mystery-model" }),
    ]);
    expect(summary.costUsd).toBe(1);
    expect(summary.costSource).toBe("modelPriced");
    expect(summary.records).toBe(2);
  });
});
