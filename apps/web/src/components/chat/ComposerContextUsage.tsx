import { memo } from "react";

import { cn } from "~/lib/utils";

import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

const SIDES = ["left", "right"] as const;
type Side = (typeof SIDES)[number];

/** The side from settings, flipped to the opposite one while that side is occupied. */
export function resolveContextUsageSide(side: Side, occupied: boolean): Side {
  if (!occupied) return side;
  return side === "left" ? "right" : "left";
}

const SLIDE_TRANSITION_MS = 240;

/**
 * The italic sub-text line above the composer: model, live context usage, and
 * the session's cost. Always rendered for a started thread so the composer
 * height never jumps; the text appears once the provider reports usage.
 *
 * The label lives on the side from settings and hops to the other side when a
 * composer feature covers it, with the app's drawer easing. Both copies stay
 * mounted so the move is a cross-fade between two positions rather than a
 * layout jump; the inactive copy is inert text, so no control is hidden from
 * assistive tech.
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
  const effectiveSide = resolveContextUsageSide(props.side, props.occupied);

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
          <Button
            variant="ghost-muted"
            className={cn("h-auto rounded-sm px-1 py-0", textClassName, "hover:underline")}
            onClick={props.onCompact}
            aria-label="Compact context"
          >
            {text}
          </Button>
        }
      />
      <TooltipPopup>{props.compactDisabledReason ?? "Compact context"}</TooltipPopup>
    </Tooltip>
  ) : (
    <span className={textClassName}>{text}</span>
  );

  return (
    <div className="relative h-4" data-chat-composer-context-usage="true">
      {SIDES.map((side) => {
        const active = side === effectiveSide;
        return (
          <div
            key={side}
            aria-hidden={active ? undefined : true}
            className={cn(
              "absolute inset-x-0 top-0 flex min-w-0",
              side === "left" ? "justify-start" : "justify-end",
              "transition-[opacity,translate] ease-drawer motion-reduce:transition-none",
              active
                ? "pointer-events-auto opacity-100 translate-x-0"
                : "pointer-events-none opacity-0",
              side === "left"
                ? active
                  ? "translate-x-0"
                  : "-translate-x-2"
                : active
                  ? "translate-x-0"
                  : "translate-x-2",
            )}
            style={{ transitionDuration: `${SLIDE_TRANSITION_MS}ms` }}
          >
            {active ? content : <span className={textClassName}>{text}</span>}
          </div>
        );
      })}
    </div>
  );
});
