import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useDocumentStore } from '../../store/documentStore';
import { PageThumbnail } from './PageThumbnail';
import { PageContextMenu } from './PageContextMenu';
import { OutlinePanel } from '../panels/OutlinePanel';

type Tab = 'pages' | 'outline';

export function PagePanel() {
  const { pageCount, reorderPages, deletePage, rotatePage } = useDocumentStore();
  const [activeTab, setActiveTab] = useState<Tab>('pages');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    pageIndex: number;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const items = Array.from({ length: pageCount }, (_, i) => `page-${i}`);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);

      const newOrder = Array.from({ length: pageCount }, (_, i) => i);
      const [removed] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, removed);

      reorderPages(newOrder);
    },
    [items, pageCount, reorderPages]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, pageIndex: number) => {
      setContextMenu({ x: e.clientX, y: e.clientY, pageIndex });
    },
    []
  );

  return (
    <div className="w-[160px] bg-surface-raised border-r border-border-subtle flex flex-col">
      {/* Tab strip */}
      <div className="flex border-b border-border-subtle shrink-0">
        {(['pages', 'outline'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[10px] font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'pages' ? (
          <div className="p-2 flex flex-col gap-1">
            <div className="text-xs font-medium text-text-secondary px-1 mb-1">
              Pages ({pageCount})
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={items} strategy={verticalListSortingStrategy}>
                {items.map((id, index) => (
                  <PageThumbnail
                    key={id}
                    id={id}
                    pageIndex={index}
                    onContextMenu={handleContextMenu}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          <OutlinePanel />
        )}
      </div>

      {contextMenu && (
        <PageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          pageIndex={contextMenu.pageIndex}
          canDelete={pageCount > 1}
          onRotateCW={() => rotatePage(contextMenu.pageIndex, 90)}
          onRotateCCW={() => rotatePage(contextMenu.pageIndex, 270)}
          onDelete={() => deletePage(contextMenu.pageIndex)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
