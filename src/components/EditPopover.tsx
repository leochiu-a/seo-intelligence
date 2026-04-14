import { useState, useEffect, useRef } from 'react';

interface EditPopoverProps {
  nodeId: string;
  urlTemplate: string;
  pageCount: number;
  onSave: (urlTemplate: string, pageCount: number) => void;
  onClose: () => void;
}

export function EditPopover({ nodeId: _nodeId, urlTemplate, pageCount, onSave, onClose }: EditPopoverProps) {
  const [localTemplate, setLocalTemplate] = useState(urlTemplate);
  const [localCount, setLocalCount] = useState(pageCount);
  const [error, setError] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleConfirm = () => {
    if (localTemplate.trim() === '') {
      setError('URL template cannot be empty');
      return;
    }
    onSave(localTemplate.trim(), Math.max(1, localCount));
    onClose();
  };

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        if (localTemplate.trim() === '') {
          setError('URL template cannot be empty');
        } else {
          onSave(localTemplate.trim(), Math.max(1, localCount));
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [localTemplate, localCount, onSave, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') handleConfirm();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [localTemplate, localCount, onClose]);

  return (
    <div
      ref={popoverRef}
      className="absolute left-full top-0 ml-2 z-50 w-[280px] bg-white border border-border rounded-xl shadow-lg overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-fg mb-1.5">
            URL Template
          </label>
          <input
            type="text"
            autoFocus
            className="w-full h-9 text-sm text-dark border border-border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-tier-neutral/50 focus:border-tier-neutral transition"
            placeholder="/page/<id>"
            value={localTemplate}
            onChange={(e) => {
              setLocalTemplate(e.target.value);
              if (error) setError('');
            }}
          />
          {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-fg mb-1.5">
            Page Count
          </label>
          <input
            type="number"
            min={1}
            className="w-full h-9 text-sm text-dark border border-border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-tier-neutral/50 focus:border-tier-neutral transition"
            value={localCount}
            onChange={(e) => setLocalCount(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2.5">
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-secondary hover:bg-surface transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="rounded-lg bg-dark px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
