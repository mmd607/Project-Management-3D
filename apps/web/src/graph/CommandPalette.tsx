import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectListItem } from "../api/types";

interface CommandItem {
  id: string;
  label: string;
  hint: string;
  onRun: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  projects: ProjectListItem[];
  onSelectProject: (id: string) => void;
  onSwitchToGraph: () => void;
  onSwitchToList: () => void;
  onRescan: () => void;
  graphAvailable: boolean;
}

/**
 * Global command palette (Ctrl/Cmd+K), Phase 2 §8. Only surfaces things that actually
 * exist — real projects from the current workspace, plus the app's real existing
 * capabilities (switch view, rescan) — never fabricated destinations.
 */
export function CommandPalette({
  open,
  onClose,
  projects,
  onSelectProject,
  onSwitchToGraph,
  onSwitchToList,
  onRescan,
  graphAvailable,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = useMemo((): CommandItem[] => {
    const actionItems: CommandItem[] = [
      { id: "__rescan", label: "Rescan workspace", hint: "action", onRun: onRescan },
      ...(graphAvailable ? [{ id: "__graph", label: "Switch to Universe view", hint: "action", onRun: onSwitchToGraph }] : []),
      { id: "__list", label: "Switch to List view", hint: "action", onRun: onSwitchToList },
    ];
    const projectItems: CommandItem[] = projects.map((p) => ({
      id: p.id,
      label: p.name,
      hint: p.intelligenceProfile?.category ?? "project",
      onRun: () => onSelectProject(p.id),
    }));

    const all = [...projectItems, ...actionItems];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((item) => item.label.toLowerCase().includes(q) || item.hint.toLowerCase().includes(q));
  }, [projects, query, graphAvailable, onRescan, onSwitchToGraph, onSwitchToList, onSelectProject]);

  if (!open) return null;

  function run(item: CommandItem | undefined) {
    if (!item) return;
    item.onRun();
    onClose();
  }

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div
        className="command-palette"
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onClose();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            run(items[activeIndex]);
          }
        }}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="Search projects or actions…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
        />
        <ul className="command-palette-list">
          {items.length === 0 && <li className="command-palette-empty">No matches.</li>}
          {items.map((item, index) => (
            <li
              key={item.id}
              className={index === activeIndex ? "active" : ""}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => run(item)}
            >
              <span>{item.label}</span>
              <span className="command-palette-hint">{item.hint}</span>
            </li>
          ))}
        </ul>
        <div className="command-palette-footer">
          <span>↑ ↓ Navigate</span>
          <span>Enter Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
