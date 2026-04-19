import { TriangleAlert, Unplug, Layers, Globe, Home } from "lucide-react";
import { CLUSTER_PALETTE } from "../lib/cluster-colors";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LegendDialogProps {
  open: boolean;
  onClose: () => void;
}

function LegendRow({
  indicator,
  label,
  description,
}: {
  indicator: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-16 flex justify-center pt-0.5">{indicator}</div>
      <div>
        <span className="text-xs font-semibold text-gray-800">{label}</span>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

const BADGE =
  "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide";

export function LegendDialog({ open, onClose }: LegendDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-y-auto max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Indicators</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 pt-1">
          {/* Score Tiers */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Score Tiers
            </h3>
            <LegendRow
              indicator={<span className={`${BADGE} bg-green-100 text-green-700`}>High</span>}
              label="High"
              description="Top third of internal link strength — well-connected."
            />
            <LegendRow
              indicator={<span className={`${BADGE} bg-amber-100 text-amber-700`}>Mid</span>}
              label="Mid"
              description="Middle third — add links from high-scoring pages to push it higher."
            />
            <LegendRow
              indicator={<span className={`${BADGE} bg-red-100 text-red-700`}>Low</span>}
              label="Low"
              description="Bottom third — needs more internal links from well-connected pages."
            />
            <LegendRow
              indicator={<span className={`${BADGE} bg-indigo-100 text-indigo-700`}>Neutral</span>}
              label="Neutral"
              description="Not enough data yet to rank this node."
            />
          </div>

          <hr className="border-gray-100" />

          {/* Node Labels */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Node Labels
            </h3>
            <LegendRow
              indicator={
                <span className={`${BADGE} gap-1 bg-blue-100 text-blue-700`}>
                  <Globe size={9} />
                  Global
                </span>
              }
              label="Global"
              description="Appears on every page (e.g. header nav). Contributes link equity to all other nodes."
            />
            <LegendRow
              indicator={
                <span className={`${BADGE} gap-1 bg-violet-100 text-violet-700`}>
                  <Home size={9} />
                  Root
                </span>
              }
              label="Root"
              description="Entry point for crawl-depth calculation. Depth counts start from this node."
            />
          </div>

          <hr className="border-gray-100" />

          {/* Warnings */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Warnings
            </h3>
            <LegendRow
              indicator={<TriangleAlert size={14} className="text-amber-500" />}
              label="Weak"
              description="Score is significantly below average — add more internal links pointing here."
            />
            <LegendRow
              indicator={<Unplug size={14} className="text-red-500" />}
              label="Orphan"
              description="No inbound links (excluding Root) — nothing links to this page."
            />
            <LegendRow
              indicator={<Unplug size={14} className="text-red-500" />}
              label="Unreachable"
              description="Cannot be reached via a crawl path from the Root node."
            />
            <LegendRow
              indicator={<Layers size={14} className="text-amber-500" />}
              label="Deep (Depth > 3)"
              description="More than 3 clicks from Root — may be crawled less often by search engines."
            />
            <LegendRow
              indicator={<TriangleAlert size={14} className="text-red-500" />}
              label="Over-linked (> 150)"
              description="More than 150 outbound links — dilutes link equity per destination."
            />
          </div>

          <hr className="border-gray-100" />

          {/* Tags / Clusters */}
          <div className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Tags / Clusters
            </h3>
            <p className="text-xs text-gray-500">
              Tags group pages by topic. The same tag name always maps to the same colour —
              determined by a hash of the tag name.
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CLUSTER_PALETTE.map((c, i) => (
                <span key={i} className={`inline-block w-3 h-3 rounded-full ${c.dot}`} />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
