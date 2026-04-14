import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { type Placement } from '../lib/graph-utils';

interface EditPopoverProps {
  nodeId: string;
  urlTemplate: string;
  pageCount: number;
  isGlobal: boolean;
  placements: Placement[];
  onSave: (urlTemplate: string, pageCount: number, isGlobal: boolean, placements: Placement[]) => void;
  onClose: () => void;
}

export function EditPopover({ nodeId: _nodeId, urlTemplate, pageCount, isGlobal, placements, onSave, onClose }: EditPopoverProps) {
  const [localTemplate, setLocalTemplate] = useState(urlTemplate);
  const [localCount, setLocalCount] = useState(pageCount);
  const [localIsGlobal, setLocalIsGlobal] = useState(isGlobal);
  const [localPlacements, setLocalPlacements] = useState<Placement[]>(placements);
  const [error, setError] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleConfirm = () => {
    if (localTemplate.trim() === '') {
      setError('URL template cannot be empty');
      return;
    }
    onSave(localTemplate.trim(), Math.max(1, localCount), localIsGlobal, localPlacements);
    onClose();
  };

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        if (localTemplate.trim() === '') {
          setError('URL template cannot be empty');
        } else {
          onSave(localTemplate.trim(), Math.max(1, localCount), localIsGlobal, localPlacements);
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [localTemplate, localCount, localIsGlobal, localPlacements, onSave, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') handleConfirm();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [localTemplate, localCount, localIsGlobal, localPlacements, onClose]);

  return (
    <div
      ref={popoverRef}
      className={`absolute left-full top-0 ml-2 z-50 ${localIsGlobal ? 'w-[320px]' : 'w-[280px]'} bg-white border border-border rounded-xl shadow-lg overflow-hidden`}
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

        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-fg">
            Global Node
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={localIsGlobal}
            onClick={() => setLocalIsGlobal((prev) => !prev)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${localIsGlobal ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${localIsGlobal ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
          </button>
        </div>

        {localIsGlobal && (
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-fg mb-1.5">
              Placements
            </label>
            <div className="space-y-2">
              {localPlacements.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    className="flex-1 h-7 text-sm text-dark border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-tier-neutral/50 focus:border-tier-neutral transition"
                    placeholder="e.g. Header Nav"
                    value={p.name}
                    onChange={(e) =>
                      setLocalPlacements((prev) =>
                        prev.map((pl) => (pl.id === p.id ? { ...pl, name: e.target.value } : pl))
                      )
                    }
                  />
                  <input
                    type="number"
                    min={1}
                    className="w-14 h-7 text-sm text-dark border border-border rounded-lg px-2 text-center focus:outline-none focus:ring-2 focus:ring-tier-neutral/50 focus:border-tier-neutral transition"
                    value={p.linkCount}
                    onChange={(e) =>
                      setLocalPlacements((prev) =>
                        prev.map((pl) => (pl.id === p.id ? { ...pl, linkCount: Math.max(1, Number(e.target.value) || 1) } : pl))
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLocalPlacements((prev) => prev.filter((pl) => pl.id !== p.id))
                    }
                    className="p-1 text-muted-fg hover:text-red-500 transition-colors"
                    aria-label={`Delete placement ${p.name}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setLocalPlacements((prev) => [
                  ...prev,
                  { id: crypto.randomUUID(), name: '', linkCount: 1 },
                ])
              }
              className="mt-2 text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              + Add Placement
            </button>
          </div>
        )}
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
