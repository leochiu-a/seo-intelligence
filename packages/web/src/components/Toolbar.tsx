import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Download,
  HelpCircle,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
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

function FileMenu({
  onImportJson,
  onExportJson,
  onCopyForAI,
  onClearCanvas,
  isEmpty,
}: {
  onImportJson: () => void;
  onExportJson: () => void;
  onCopyForAI: () => void | Promise<void>;
  onClearCanvas: () => void;
  isEmpty: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "default" }))}>
        <Download />
        File
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom">
        <DropdownMenuItem onClick={onImportJson}>
          <Upload size={14} />
          Import JSON
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isEmpty} onClick={onExportJson}>
          <Download size={14} />
          Export JSON
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isEmpty} onClick={() => void onCopyForAI()}>
          <Sparkles size={14} />
          Copy for AI
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isEmpty}
          className="text-destructive focus:text-destructive"
          onClick={onClearCanvas}
        >
          <Trash2 size={14} />
          Clear Canvas
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
    setClearDialogOpen(false);
  }

  return (
    <header className="flex h-12 shrink-0 items-center border-b border-border bg-white px-4 shadow-sm">
      {/* Left: brand + nav links */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-bold tracking-wide text-pink mr-3">SEO INTELLIGENCE</span>
        <Button
          render={
            <a
              href="https://leochiu-a.github.io/seo-intelligence/docs/features"
              target="_blank"
              rel="noopener noreferrer"
            />
          }
          variant="ghost"
        >
          <BookOpen size={14} />
          Docs
        </Button>
        <Button
          render={
            <a
              href="https://github.com/leochiu-a/seo-intelligence"
              target="_blank"
              rel="noopener noreferrer"
            />
          }
          variant="ghost"
          aria-label="GitHub"
        >
          <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        </Button>
      </div>

      {/* Right: actions */}
      <div className="ml-auto flex items-center gap-2">
        <Button onClick={onAddNode}>
          <Plus />
          Add Node
        </Button>
        <FileMenu
          onImportJson={onImportJson}
          onExportJson={onExportJson}
          onCopyForAI={onCopyForAI}
          onClearCanvas={() => setClearDialogOpen(true)}
          isEmpty={isEmpty}
        />
        <Button onClick={onLegendOpen} variant="outline" size="icon" aria-label="Legend">
          <HelpCircle />
        </Button>
      </div>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear canvas?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all nodes and edges from the current scenario. This action cannot be
              undone.
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
    </header>
  );
}
