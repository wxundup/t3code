import { memo } from "react";

import { cn } from "~/lib/utils";

import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

const SIDES = ["left", "right"] as const;
type Side = (typeof SIDES)[number];

const FADE_TRANSITION_MS = 200;

/**
 * The small line above the composer: live context usage and the session's
 * cost. Always rendered for a started thread so the composer height never
 * jumps; the text appears once usage is known, and fades while a full-width
 * banner, question, or task drawer covers the composer's top edge, returning
 * when it clears. Corner chips never move it.
 *
 * The compact click target is a raw button styled with the text's own
 * classes: the shared Button variants carry a taller base that vertically
 * centers the text onto the composer's edge.
 */
export const ComposerContextUsage = memo(function ComposerContextUsage(props: {
  side: Side;
  occupied: boolean;
  label: string | null;
  reserve: boolean;
  compactAvailable: boolean;
  compactDisabled: boolean;
  compactDisabledReason: string | null;
  onCompact?: (() => void) | undefined;
}) {
  const text = props.label;
  if (text === null && !props.reserve) return null;
  if (text === null) {
    return <div className="h-4" data-chat-composer-context-usage="true" />;
  }

  const textClassName =
    "truncate text-2xs leading-4 font-normal text-muted-foreground/90 italic tabular-nums";
  const interactive = props.compactAvailable && !props.compactDisabled;
  const content = interactive ? (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn("rounded-sm px-1 py-0 text-left", textClassName, "hover:underline")}
            onClick={props.onCompact}
            aria-label="Compact context"
          >
            {text}
          </button>
        }
      />
      <TooltipPopup>{props.compactDisabledReason ?? "Compact context"}</TooltipPopup>
    </Tooltip>
  ) : (
    <span className={textClassName}>{text}</span>
  );

  return (
    <div
      aria-hidden={props.occupied || undefined}
      className={cn(
        "relative h-4 transition-opacity ease-drawer motion-reduce:transition-none",
        props.occupied ? "opacity-0" : "opacity-100",
      )}
      data-chat-composer-context-usage="true"
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 flex min-w-0",
          props.side === "left" ? "justify-start" : "justify-end",
          interactive && !props.occupied && "pointer-events-auto",
        )}
      >
        {content}
      </div>
    </div>
  );
});
