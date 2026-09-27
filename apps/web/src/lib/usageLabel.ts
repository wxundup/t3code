import type { UsageThreadUsage } from "@t3tools/contracts";

import { formatUsd } from "@t3tools/shared/usageFormat";
import { formatContextWindowUsage } from "~/lib/contextWindow";

/**
 * `32% · 81.7k/258k · $1.24`. The usage segment is omitted when the provider
 * reports no context fill, and the cost segment disappears when the usage
 * scan has no price for the thread. Cost with no context fill labels its
 * scope so it never floats unanchored: `session $1.24`. Null when there is
 * nothing to show.
 */
export function formatThreadUsageLabel(
  modelLabel: string | null,
  usage: UsageThreadUsage | null,
): string | null {
  const segments: Array<string> = [];
  if (modelLabel !== null && modelLabel.trim().length > 0) {
    segments.push(modelLabel);
  }
  if (usage?.contextUsedTokens != null) {
    segments.push(formatContextWindowUsage(usage.contextUsedTokens, usage.contextMaxTokens));
  }
  if (usage?.costUsd != null) {
    segments.push(
      usage.contextUsedTokens == null
        ? `session ${formatUsd(usage.costUsd)}`
        : formatUsd(usage.costUsd),
    );
  }
  return segments.length === 0 ? null : segments.join(" · ");
}

/**
 * Tooltip variant: the model at full size, the usage segment without cost so
 * the caller can render it smaller beside the model name.
 */
export function formatSessionTooltipUsage(
  modelLabel: string | null,
  usage: UsageThreadUsage | null,
): { model: string; usage: string | null } {
  const model = modelLabel !== null && modelLabel.trim().length > 0 ? modelLabel : "";
  const usageLabel =
    usage?.contextUsedTokens != null
      ? formatContextWindowUsage(usage.contextUsedTokens, usage.contextMaxTokens)
      : null;
  return { model, usage: usageLabel };
}
