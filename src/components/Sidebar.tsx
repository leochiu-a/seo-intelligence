export function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-white p-4 flex flex-col">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-fg">
        Nodes
      </h2>
      <div
        className="cursor-grab rounded-xl border-2 border-border bg-white p-3.5 shadow-sm hover:shadow-md hover:border-tier-neutral/60 transition"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/reactflow', 'urlNode');
          e.dataTransfer.effectAllowed = 'move';
        }}
      >
        <div className="text-sm font-semibold text-dark">URL Node</div>
        <div className="mt-0.5 text-[11px] text-muted-fg">Drag onto canvas</div>
      </div>
    </aside>
  );
}
