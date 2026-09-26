import type { ProviderDriverKind, UsageProviderKind, UsageThreadUsage } from "@t3tools/contracts";

import { addTotals, EMPTY_TOTALS, type UsageRecord } from "./usageTranscripts.ts";
import { priceUsage, type RateTable } from "./usagePricing.ts";

export interface ThreadUsageKey {
  readonly provider: UsageProviderKind;
  readonly sessionId: string;
}

/**
 * Extracts the provider-native session id a thread's transcript records are
 * keyed by, from the `provider_session_runtime` resume cursor.
 *
 * Codex names the field `threadId`; its rollout `session_meta` id is the same
 * value. Claude's current cursor uses `resume`, older ones `sessionId`. Every
 * other adapter stores `sessionId`.
 */
export function threadUsageKey(
  provider: ProviderDriverKind,
  resumeCursor: unknown,
): ThreadUsageKey | null {
  if (typeof resumeCursor !== "object" || resumeCursor === null) return null;
  const cursor = resumeCursor as Record<string, unknown>;
  if (provider === "claudeAgent") {
    const sessionId =
      typeof cursor["resume"] === "string"
        ? cursor["resume"]
        : typeof cursor["sessionId"] === "string"
          ? cursor["sessionId"]
          : "";
    return sessionId.length > 0 ? { provider: "claude", sessionId } : null;
  }
  const raw = provider === "codex" ? cursor["threadId"] : cursor["sessionId"];
  const sessionId = typeof raw === "string" ? raw.trim() : "";
  if (sessionId.length === 0) return null;
  // Every driver except `claudeAgent` shares its name with the usage kind.
  return { provider: provider as UsageProviderKind, sessionId };
}

export interface ThreadUsageOptions {
  readonly rates: RateTable;
  readonly priceOverrides?: RateTable;
}

const emptyTotals = () => ({ ...EMPTY_TOTALS });

/**
 * Folds the records already filtered to one thread into its summary.
 *
 * De-duplication mirrors `UsageAggregator`: the first record for a
 * `dedupeKey` wins, so Claude messages copied into resumed transcripts count
 * once. Codex records arrive without dedupe keys; the caller numbering
 * identical events per file before folding is what keeps moved-rollout
 * copies from double counting.
 */
export function summarizeThreadUsage(
  options: ThreadUsageOptions,
  records: readonly UsageRecord[],
): UsageThreadUsage {
  let totals = emptyTotals();
  let costUsd = 0;
  let records_ = 0;
  let providerReportedRecords = 0;
  let unpricedRecords = 0;
  let lastTimestampMs: number | null = null;
  const seen = new Set<string>();

  for (const record of records) {
    if (record.dedupeKey !== null) {
      if (seen.has(record.dedupeKey)) continue;
      seen.add(record.dedupeKey);
    }
    const priced = priceUsage(options.rates, record, options.priceOverrides);
    totals = addTotals(totals, record.totals);
    costUsd += priced.costUsd;
    records_ += 1;
    if (priced.costSource === "unpriced") unpricedRecords += 1;
    if (priced.costSource === "providerReported") providerReportedRecords += 1;
    if (lastTimestampMs === null || record.timestampMs > lastTimestampMs) {
      lastTimestampMs = record.timestampMs;
    }
  }

  // The weakest provenance wins, matching bucket semantics: a thread with any
  // unpriced record still shows its partially known cost, but a thread where
  // nothing could be priced hides the figure entirely.
  const costSource: UsageThreadUsage["costSource"] =
    unpricedRecords === records_
      ? "unpriced"
      : providerReportedRecords === records_
        ? "providerReported"
        : "modelPriced";

  return {
    totals,
    records: records_,
    lastTimestampMs,
    costUsd: records_ === 0 || costSource === "unpriced" ? null : costUsd,
    costSource,
    contextUsedTokens: null,
    contextMaxTokens: null,
  };
}
