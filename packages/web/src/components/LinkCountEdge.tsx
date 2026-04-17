import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
  type Node,
} from 'reactflow';
import type { UrlNodeData } from '../lib/graph-utils';
import { getClusterColor } from '../lib/cluster-colors';

export interface LinkCountEdgeData {
  linkCount: number;
  onLinkCountChange?: (edgeId: string, linkCount: number) => void;
}

/**
 * Computes the stroke color for an edge based on shared cluster tags and selection state.
 * Priority: selected indigo > cluster color > default gray.
 * When multiple tags are shared, picks the first in alphabetical order (deterministic).
 */
export function computeEdgeStroke(
  sourceTags: string[] | undefined,
  targetTags: string[] | undefined,
  selected: boolean,
): string {
  if (selected) return '#6366F1';

  const src = sourceTags ?? [];
  const tgt = targetTags ?? [];

  if (src.length === 0 || tgt.length === 0) return '#9CA3AF';

  const sourceSet = new Set(src);
  const shared = tgt.filter((t) => sourceSet.has(t));

  if (shared.length === 0) return '#9CA3AF';

  shared.sort();
  return getClusterColor(shared[0]).edge;
}

export function LinkCountEdge({
  id,
  source,
  target,
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

  const { getNode } = useReactFlow();

  const clusterStrokeHex = useMemo(() => {
    const sourceNode = getNode(source) as Node<UrlNodeData> | undefined;
    const targetNode = getNode(target) as Node<UrlNodeData> | undefined;
    const sourceTags = sourceNode?.data.tags ?? [];
    const targetTags = targetNode?.data.tags ?? [];

    const sourceSet = new Set(sourceTags);
    const shared = targetTags.filter((t) => sourceSet.has(t));
    if (shared.length === 0) return null;

    shared.sort();
    return getClusterColor(shared[0]).edge;
  }, [source, target, getNode]);

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
          // Computed stroke MUST come after the inherited `...style` spread.
          // ReactFlow passes `style` from edge state which may carry `stroke: '#9CA3AF'`
          // (set during edge creation), and a trailing spread would overwrite the
          // just-computed cluster color. UAT gap — Test 6.
          ...style,
          stroke: selected ? '#6366F1' : (clusterStrokeHex ?? '#9CA3AF'),
          strokeWidth: 2,
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
