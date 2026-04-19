import { useState, useRef, useEffect } from "react";
import { Plus, Settings } from "lucide-react";
import type { ScenarioRecord } from "../lib/scenario-types";

interface ScenarioTabBarProps {
  scenarios: ScenarioRecord[];
  activeId: string;
  onSwitch: (id: string) => void;
  onAdd: (mode: "blank" | "clone") => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

interface ScenarioTabProps {
  scenario: ScenarioRecord;
  isActive: boolean;
  canDelete: boolean;
  onActivate: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function ScenarioTab({
  scenario,
  isActive,
  canDelete,
  onActivate,
  onRename,
  onDelete,
}: ScenarioTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(scenario.name);
  const [showPopover, setShowPopover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Close popover on outside click
  useEffect(() => {
    if (!showPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPopover]);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== scenario.name) {
      onRename(trimmed);
    } else {
      setEditValue(scenario.name);
    }
    setIsEditing(false);
    setShowPopover(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitRename();
    } else if (e.key === "Escape") {
      setEditValue(scenario.name);
      setIsEditing(false);
      setShowPopover(false);
    }
  };

  const handleRenameClick = () => {
    setEditValue(scenario.name);
    setIsEditing(true);
    setShowPopover(false);
  };

  const handleDeleteClick = () => {
    if (!canDelete) return;
    setShowPopover(false);
    onDelete();
  };

  return (
    <div className="relative flex items-center">
      {/* Tab button */}
      <button
        onClick={onActivate}
        className={
          isActive
            ? "border-b-2 border-dark font-semibold text-dark px-3 py-1 cursor-pointer bg-transparent outline-none"
            : "text-muted-fg hover:text-ink px-3 py-1 cursor-pointer bg-transparent outline-none"
        }
        aria-pressed={isActive}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent border-b border-dark text-sm w-24 outline-none"
          />
        ) : (
          <span>{scenario.name}</span>
        )}
      </button>

      {/* Gear button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowPopover((v) => !v);
        }}
        className="ml-0.5 p-0.5 rounded text-muted-fg hover:text-ink hover:bg-surface transition-colors"
        aria-label={`Options for ${scenario.name}`}
      >
        <Settings size={12} />
      </button>

      {/* Popover with Rename / Delete */}
      {showPopover && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 z-50 mt-1 min-w-[120px] rounded-md border border-border bg-white shadow-md py-1"
        >
          <button
            onClick={handleRenameClick}
            className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-surface transition-colors"
          >
            Rename
          </button>
          <button
            onClick={handleDeleteClick}
            disabled={!canDelete}
            className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
              canDelete
                ? "text-red-600 hover:bg-red-50"
                : "opacity-50 cursor-not-allowed text-muted-fg"
            }`}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function ScenarioTabBar({
  scenarios,
  activeId,
  onSwitch,
  onAdd,
  onRename,
  onDelete,
}: ScenarioTabBarProps) {
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  const addButtonRef = useRef<HTMLDivElement>(null);

  // Close add prompt on outside click
  useEffect(() => {
    if (!showAddPrompt) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (addButtonRef.current && !addButtonRef.current.contains(e.target as Node)) {
        setShowAddPrompt(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddPrompt]);

  const handleAdd = (mode: "blank" | "clone") => {
    setShowAddPrompt(false);
    onAdd(mode);
  };

  return (
    <div className="flex items-center border-b border-border bg-white px-4 h-9 text-sm gap-1 shrink-0">
      {scenarios.map((s) => (
        <ScenarioTab
          key={s.id}
          scenario={s}
          isActive={s.id === activeId}
          canDelete={scenarios.length > 1}
          onActivate={() => onSwitch(s.id)}
          onRename={(name) => onRename(s.id, name)}
          onDelete={() => onDelete(s.id)}
        />
      ))}

      {/* [+] button with blank/clone prompt */}
      <div ref={addButtonRef} className="relative ml-1">
        <button
          onClick={() => setShowAddPrompt((v) => !v)}
          className="flex items-center gap-1 rounded px-2 py-1 text-muted-fg hover:text-ink hover:bg-surface transition-colors"
          aria-label="New scenario"
        >
          <Plus size={14} />
        </button>

        {showAddPrompt && (
          <div className="absolute top-full left-0 z-50 mt-1 min-w-[140px] rounded-md border border-border bg-white shadow-md py-1">
            <p className="px-3 py-1 text-xs text-muted-fg font-medium">New scenario</p>
            <button
              onClick={() => handleAdd("blank")}
              className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-surface transition-colors"
            >
              Blank
            </button>
            <button
              onClick={() => handleAdd("clone")}
              className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-surface transition-colors"
            >
              Clone Current
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
