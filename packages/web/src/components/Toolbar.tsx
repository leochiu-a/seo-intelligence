import { useState } from "react";
import { ChevronDown, Download, HelpCircle, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <Download />
        Export
        <ChevronDown />
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
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  function handleConfirmClear() {
    onClearCanvas();
    setClearDialogOpen(false); // AlertDialogAction does not auto-close (no Close primitive)
  }

  return (
    <header className="flex h-12 shrink-0 items-center border-b border-border bg-white px-4 shadow-sm">
      <span className="text-sm font-bold tracking-wide text-pink">SEO INTELLIGENCE</span>

      <div className="ml-auto flex items-center gap-2">
        <Button onClick={onAddNode} size="sm" className="bg-dark text-white hover:bg-ink">
          <Plus />
          Add Node
        </Button>
        <Button onClick={onImportJson} variant="outline" size="sm">
          <Upload />
          Import JSON
        </Button>
        <ExportMenu onExportJson={onExportJson} onCopyForAI={onCopyForAI} isEmpty={isEmpty} />
        <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
          <AlertDialogTrigger
            disabled={isEmpty}
            className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
          >
            <Trash2 />
            Clear Canvas
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear canvas?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all nodes and edges from the current scenario. This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleConfirmClear}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button onClick={onLegendOpen} variant="outline" size="icon-sm" aria-label="Legend">
          <HelpCircle />
        </Button>
      </div>
    </header>
  );
}
