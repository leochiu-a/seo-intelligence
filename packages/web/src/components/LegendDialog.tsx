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
      <div className="flex-shrink-0 w-20 flex justify-center pt-0.5">{indicator}</div>
      <div>
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

const BADGE =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide";

export function LegendDialog({ open, onClose }: LegendDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl overflow-y-auto max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Indicators</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 pt-1">
          {/* Score Tiers */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Score Tiers
            </h3>
            <p className="text-sm text-gray-500">
              Each node's score is a PageRank-style value — pages that receive more internal links
              from other well-connected pages score higher. Nodes are split into thirds (High / Mid
              / Low) relative to the rest of the graph.
            </p>
            <p className="text-sm text-gray-500">
              A node's score also affects what it gives away: a{" "}
              <strong className="text-gray-700">High-scoring page passes more link equity</strong>{" "}
              to the pages it links to. Getting a link from a High page is more valuable than
              getting one from a Low page — even if both have the same link count.
            </p>
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Node Labels
            </h3>
            <LegendRow
              indicator={
                <span className={`${BADGE} gap-1 bg-blue-100 text-blue-700`}>
                  <Globe size={10} />
                  Global
                </span>
              }
              label="Global"
              description="Appears on every page (e.g. header nav). Contributes link equity to all other nodes."
            />
            <LegendRow
              indicator={
                <span className={`${BADGE} gap-1 bg-violet-100 text-violet-700`}>
                  <Home size={10} />
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Warnings
            </h3>
            <p className="text-sm text-gray-500">
              Warnings appear on canvas nodes (subtitle icons) and in the right sidebar — Orphan /
              Unreachable pages are listed under the Score tab, and the Health tab shows all pages
              with any active warning.
            </p>
            <LegendRow
              indicator={<TriangleAlert size={16} className="text-amber-500" />}
              label="Weak"
              description="Score is significantly below average — add more internal links pointing here."
            />
            <LegendRow
              indicator={<Unplug size={16} className="text-red-500" />}
              label="Orphan"
              description="No inbound links (excluding Root) — nothing links to this page."
            />
            <LegendRow
              indicator={<Unplug size={16} className="text-red-500" />}
              label="Unreachable"
              description="Cannot be reached via a crawl path from the Root node."
            />
            <LegendRow
              indicator={<Layers size={16} className="text-amber-500" />}
              label="Deep (Depth > 3)"
              description="Depth = shortest click-path from the Root node. Depth 1 means Root links directly here; depth 4+ means search engines may crawl it less frequently."
            />
            <LegendRow
              indicator={<TriangleAlert size={16} className="text-red-500" />}
              label="Over-linked (> 150)"
              description="More than 150 outbound links — dilutes link equity per destination."
            />
          </div>

          <hr className="border-gray-100" />

          {/* How to improve */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              How to Improve Link Equity
            </h3>
            <ul className="flex flex-col gap-2 text-sm text-gray-500 list-none">
              <li>
                <strong className="text-gray-700">Add inbound links.</strong> The more pages that
                link to a node, the more equity it receives.
              </li>
              <li>
                <strong className="text-gray-700">Link from high-scoring pages.</strong> A link from
                a High page transfers more equity than one from a Low page.
              </li>
              <li>
                <strong className="text-gray-700">Share tags with linking pages.</strong> Links
                between pages that share a tag carry a 1.5× equity bonus.
              </li>
              <li>
                <strong className="text-gray-700">Reduce outbound links on source pages.</strong>{" "}
                Each page splits its equity across all outbound links — fewer links means more
                equity per destination.
              </li>
              <li>
                <strong className="text-gray-700">Increase link count on edges.</strong> Higher link
                count (the number on an edge) gives that destination a larger share of the source's
                equity.
              </li>
            </ul>
          </div>

          <hr className="border-gray-100" />

          {/* Tags / Clusters */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Tags / Clusters
            </h3>
            <p className="text-sm text-gray-500">
              Tags group pages by topic. The same tag name always maps to the same colour —
              determined by a hash of the tag name.
            </p>
            <p className="text-sm text-gray-500">
              Tags also affect scoring: when a link connects two pages that share at least one tag,
              the link equity transferred is multiplied by{" "}
              <strong className="text-gray-700">1.5×</strong>. Tagging related pages together makes
              links between them more powerful.
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
