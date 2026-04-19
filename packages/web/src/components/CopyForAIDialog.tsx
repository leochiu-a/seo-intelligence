import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CopyForAIDialogProps {
  open: boolean;
  onClose: () => void;
  text: string;
}

export function CopyForAIDialog({ open, onClose, text }: CopyForAIDialogProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — silently ignore
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Copy for AI</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Preview the content that will be copied to your clipboard.
          </p>
        </DialogHeader>

        <textarea
          readOnly
          value={text}
          className="flex-1 min-h-0 resize-none rounded-md border border-border bg-surface font-mono text-xs text-ink p-3 overflow-y-auto focus:outline-none"
          style={{ height: "60vh", minHeight: "480px" }}
        />

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border bg-white px-4 py-1.5 text-sm font-medium text-ink hover:bg-surface transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-md bg-dark px-4 py-1.5 text-sm font-semibold text-white hover:bg-ink transition-colors"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
