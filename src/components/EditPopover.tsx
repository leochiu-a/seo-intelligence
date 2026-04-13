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
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="absolute left-full top-0 ml-2 z-50 w-[280px] p-4 bg-white border border-gray-200 rounded-lg shadow-lg"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">URL Template</label>
          <input
            type="text"
            className="w-full h-9 text-sm text-gray-900 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="/page/<id>"
            value={localTemplate}
            onChange={(e) => {
              setLocalTemplate(e.target.value);
              if (error) setError('');
            }}
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Page Count</label>
          <input
            type="number"
            min={1}
            className="w-full h-9 text-sm text-gray-900 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="1"
            value={localCount}
            onChange={(e) => setLocalCount(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
