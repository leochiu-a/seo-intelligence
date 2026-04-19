import { useState, useRef, useEffect, useCallback } from "react";
import { X, Upload, FileUp } from "lucide-react";
import { parseImportJson } from "../lib/graph-utils";
import type { Node, Edge } from "@xyflow/react";
import type { UrlNodeData, LinkCountEdgeData } from "../lib/graph-utils";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (nodes: Node<UrlNodeData>[], edges: Edge<LinkCountEdgeData>[]) => void;
}

export function ImportDialog({ open, onClose, onImport }: ImportDialogProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const { nodes, edges } = parseImportJson(e.target?.result as string);
          onImport(nodes, edges);
          onClose();
        } catch {
          setError("Invalid JSON file — please check the file format.");
        }
      };
      reader.readAsText(file);
    },
    [onImport, onClose],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      setError(null);
      const file = Array.from(e.dataTransfer.files).find((f) => f.name.endsWith(".json"));
      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const onBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Escape key closes dialog
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // Overlay — clicking it closes the dialog
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Modal card — clicks don't bubble to overlay */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
        className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="import-dialog-title" className="text-base font-semibold text-gray-900">
            Import JSON
          </h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="flex items-center justify-center rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Drag-and-drop zone */}
          <div
            data-testid="dropzone"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={[
              "rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-default",
              isDragOver ? "border-pink-400 bg-pink-50" : "border-gray-300 bg-gray-50",
            ].join(" ")}
          >
            <Upload
              size={32}
              className={["mx-auto mb-3", isDragOver ? "text-pink-400" : "text-gray-400"].join(" ")}
            />
            <p className="text-sm font-medium text-gray-700">Drag &amp; drop a .json file here</p>
            <p className="text-xs text-gray-400 mt-1">Supports files exported from Export JSON</p>
          </div>

          {/* Error message */}
          {error && <p className="text-sm text-red-500 -mt-2">{error}</p>}

          {/* Separator */}
          <div className="flex items-center gap-3">
            <hr className="flex-1 border-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <hr className="flex-1 border-gray-200" />
          </div>

          {/* File select button */}
          <button
            onClick={onBrowseClick}
            className="flex items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full"
          >
            <FileUp size={14} />
            Browse files
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </div>
    </div>
  );
}
