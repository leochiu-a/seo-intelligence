export function Sidebar() {
  return (
    <div className="w-60 bg-white border-r border-gray-200 p-4 flex flex-col">
      <div
        className="border border-gray-200 rounded-md p-4 cursor-grab bg-white hover:shadow-sm"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/reactflow', 'urlNode');
          e.dataTransfer.effectAllowed = 'move';
        }}
      >
        <div className="text-sm font-semibold text-gray-900">URL Node</div>
        <div className="text-xs text-gray-500 mt-1">Drag onto canvas</div>
      </div>
    </div>
  );
}
