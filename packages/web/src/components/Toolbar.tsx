import { ChevronDown, Download, HelpCircle, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ToolbarProps {
  onAddNode: () => void;
  onImportJson: () => void;
  onExportJson: () => void;
  onCopyForAI: () => void | Promise<void>;
  onClearCanvas: () => void;
  isEmpty: boolean;
  onLegendOpen?: () => void;
}

function ExportMenu({
  onExportJson,
  onCopyForAI,
  isEmpty,
}: {
  onExportJson: () => void;
  onCopyForAI: () => void | Promise<void>;
  isEmpty: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isEmpty}
        className="flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      >
        <Download size={14} />
        Export
        <ChevronDown size={12} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom">
        <DropdownMenuItem onClick={onExportJson}>
          <Download size={14} />
          Export JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void onCopyForAI()}>
          <Sparkles size={14} />
          Copy for AI
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Toolbar({
  onAddNode,
  onImportJson,
  onExportJson,
  onCopyForAI,
  onClearCanvas,
  isEmpty,
  onLegendOpen,
}: ToolbarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center border-b border-border bg-white px-4 shadow-sm">
      <span className="text-sm font-bold tracking-wide text-pink">SEO INTELLIGENCE</span>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onAddNode}
          className="flex items-center gap-1.5 rounded-md bg-dark px-4 py-1.5 text-sm font-semibold text-white hover:bg-ink transition-colors"
        >
          <Plus size={16} />
          Add Node
        </button>
        <button
          onClick={onImportJson}
          className="flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface transition-colors"
        >
          <Upload size={14} />
          Import JSON
        </button>
        <ExportMenu onExportJson={onExportJson} onCopyForAI={onCopyForAI} isEmpty={isEmpty} />
        <button
          onClick={onClearCanvas}
          disabled={isEmpty}
          className="flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          <Trash2 size={14} />
          Clear Canvas
        </button>
        <button
          onClick={onLegendOpen}
          aria-label="Legend"
          className="flex items-center justify-center rounded-md border border-border bg-white p-1.5 text-ink hover:bg-surface transition-colors"
        >
          <HelpCircle size={16} />
        </button>
      </div>
    </header>
  );
}
