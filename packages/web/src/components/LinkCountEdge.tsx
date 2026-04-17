import { useState, useCallback, useRef, useEffect } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from 'reactflow';

export interface LinkCountEdgeData {
  linkCount: number;
  onLinkCountChange?: (edgeId: string, linkCount: number) => void;
}

export function LinkCountEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style,
  markerEnd,
}: EdgeProps<LinkCountEdgeData>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const [editing, setEditing] = useState(false);
  const [localCount, setLocalCount] = useState(data?.linkCount ?? 1);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    setEditing(false);
    const newCount = Math.max(1, localCount);
    if (data?.onLinkCountChange) {
      data.onLinkCountChange(id, newCount);
    }
  }, [id, localCount, data]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setLocalCount(data?.linkCount ?? 1);
  }, [data?.linkCount]);

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? '#6366F1' : '#9CA3AF',
          strokeWidth: 2,
          ...style,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
        >
          {editing ? (
            <input
              ref={inputRef}
              type="number"
              min={1}
              value={localCount}
              onChange={(e) => setLocalCount(Math.max(1, parseInt(e.target.value) || 1))}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              className="w-12 text-center text-xs font-semibold text-gray-700 bg-white border-2 border-indigo-500 rounded-full px-2 py-1 outline-none ring-2 ring-indigo-500"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className={`text-xs font-semibold text-gray-700 bg-white rounded-full px-2 py-1 border cursor-pointer hover:border-gray-300 ${
                selected ? 'border-indigo-200' : 'border-gray-200'
              }`}
            >
              {data?.linkCount ?? 1}
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
