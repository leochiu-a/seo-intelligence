import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, HelpCircle, Plus, Sparkles, Trash2, Upload } from "lucide-react";

interface ToolbarProps {
  onAddNode: () => void;
  onImportJson: () => void;
  onExportJson: () => void;
  onCopyForAI: () => void | Promise<void>;
  onClearCanvas: () => void;
  isEmpty: boolean;
  onLegendOpen?: () => void;
  exportFeedback?: "copied" | null;
}

function ExportMenu({
  onExportJson,
  onCopyForAI,
  isEmpty,
  exportFeedback,
}: {
  onExportJson: () => void;
  onCopyForAI: () => void | Promise<void>;
  isEmpty: boolean;
  exportFeedback?: "copied" | null;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleMouseDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [open]);

  const isCopied = exportFeedback === "copied";

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        disabled={isEmpty}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${isCopied ? "text-green-600" : "text-ink"}`}
      >
        <Download size={14} />
        {isCopied ? "Copied!" : "Export"}
        {!isCopied && <ChevronDown size={12} />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 min-w-40 rounded-md border border-border bg-white shadow-md z-20 py-1"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onExportJson();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ink hover:bg-surface"
          >
            <Download size={14} />
            Export JSON
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void onCopyForAI();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ink hover:bg-surface"
          >
            <Sparkles size={14} />
            Copy for AI
          </button>
        </div>
      )}
    </div>
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
  exportFeedback,
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
        <ExportMenu
          onExportJson={onExportJson}
          onCopyForAI={onCopyForAI}
          isEmpty={isEmpty}
          exportFeedback={exportFeedback}
        />
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
