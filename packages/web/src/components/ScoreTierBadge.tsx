import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ScoreTier } from "../lib/graph-utils";

const TIER_BADGE_MAP: Record<
  Exclude<ScoreTier, "neutral">,
  { className: string; label: string; tooltip: string }
> = {
  high: {
    className: "bg-green-100 text-green-700",
    label: "High",
    tooltip:
      "High link equity — this page is in the top third of internal link strength across your graph. It is well-connected; keep it linked from your most important pages.",
  },
  mid: {
    className: "bg-amber-100 text-amber-700",
    label: "Mid",
    tooltip:
      "Mid link equity — this page sits in the middle third of internal link strength. Add more internal links from high-scoring pages to push it higher.",
  },
  low: {
    className: "bg-red-100 text-red-700",
    label: "Low",
    tooltip:
      "Low link equity — this page receives less internal link strength than two-thirds of your pages. Point more internal links here from high-scoring pages to improve it.",
  },
};

interface ScoreTierBadgeProps {
  tier: ScoreTier;
  className?: string;
  testId?: string;
}

export function ScoreTierBadge({
  tier,
  className,
  testId = "badge-tooltip-trigger",
}: ScoreTierBadgeProps) {
  if (tier === "neutral") return null;
  const { className: tierClassName, label, tooltip } = TIER_BADGE_MAP[tier];
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span />}
        data-testid={testId}
        data-tier={tier}
        className={cn(
          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide cursor-help outline-none",
          tierClassName,
          className,
        )}
      >
        {label}
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
