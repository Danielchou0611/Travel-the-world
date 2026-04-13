import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { deleteItineraryItem, updateItineraryOrder } from "./api/itineraryApi";
import { recalculateSchedule } from "./lib/schedule";
import type { ItineraryItem } from "./types";

const initialItems: ItineraryItem[] = [
  {
    id: "sensoji",
    placeName: "Senso-ji",
    region: "Tokyo",
    baseScore: 0.9316,
    xaiReason: "歷史文化符合度高，評論量穩定，距離適中。",
    imageUrl:
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=900&q=80",
    visitDurationMin: 90,
    order: 1,
    travelTimeFromPreviousMin: 0,
    startTime: "09:00",
    endTime: "10:30",
    scheduleScore: 1,
    finalScore: 0,
  },
  {
    id: "tsukiji",
    placeName: "Tsukiji Outer Market",
    region: "Tokyo",
    baseScore: 0.8704,
    xaiReason: "美食偏好符合度高，適合安排午餐與市場散步。",
    imageUrl:
      "https://images.unsplash.com/photo-1554797589-7241bb691973?auto=format&fit=crop&w=900&q=80",
    visitDurationMin: 75,
    order: 2,
    travelTimeFromPreviousMin: 30,
    startTime: "11:00",
    endTime: "12:15",
    scheduleScore: 0.9,
    finalScore: 0,
  },
  {
    id: "meiji",
    placeName: "Meiji Jingu",
    region: "Tokyo",
    baseScore: 0.9099,
    xaiReason: "自然與神社主題兼具，午後節奏較輕鬆。",
    imageUrl:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=900&q=80",
    visitDurationMin: 90,
    order: 3,
    travelTimeFromPreviousMin: 30,
    startTime: "12:45",
    endTime: "14:15",
    scheduleScore: 0.9,
    finalScore: 0,
  },
  {
    id: "shibuya",
    placeName: "Shibuya Crossing",
    region: "Tokyo",
    baseScore: 0.8882,
    xaiReason: "城市步行與拍照體驗強，周邊景點密度高。",
    imageUrl:
      "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=900&q=80",
    visitDurationMin: 75,
    order: 4,
    travelTimeFromPreviousMin: 30,
    startTime: "14:45",
    endTime: "16:00",
    scheduleScore: 0.9,
    finalScore: 0,
  },
];

const scheduledInitialItems = recalculateSchedule(initialItems);

function SortableItineraryItem({
  item,
  index,
  onDelete,
  isSaving,
}: {
  item: ItineraryItem;
  index: number;
  onDelete: (id: string) => void;
  isSaving: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      className={`itinerary-item${isDragging ? " is-dragging" : ""}`}
      ref={setNodeRef}
      style={style}
    >
      <button className="drag-handle" type="button" {...attributes} {...listeners}>
        <span aria-hidden="true">↕</span>
        <span className="sr-only">拖拉調整 {item.placeName} 順序</span>
      </button>
      <img src={item.imageUrl} alt={item.placeName} />
      <div className="item-copy">
        <div className="item-meta">
          <span>Day 1 · #{item.order}</span>
          <span>{item.startTime}-{item.endTime}</span>
          <span>{item.region}</span>
          <span>移動 {item.travelTimeFromPreviousMin} min</span>
        </div>
        <h2>{item.placeName}</h2>
        <p>{item.xaiReason}</p>
        <div className="score-row">
          <strong>Base {item.baseScore.toFixed(4)}</strong>
          <strong>Schedule {item.scheduleScore.toFixed(4)}</strong>
          <strong>Final {item.finalScore.toFixed(4)}</strong>
        </div>
      </div>
      <button
        className="delete-button"
        type="button"
        disabled={isSaving}
        onClick={() => onDelete(item.id)}
      >
        刪除
      </button>
    </article>
  );
}

export function App() {
  const [items, setItems] = useState(scheduledInitialItems);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState("尚未同步");
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const ids = useMemo(() => items.map((item) => item.id), [items]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const activeIndex = items.findIndex((item) => item.id === active.id);
    const overIndex = items.findIndex((item) => item.id === over.id);
    if (activeIndex < 0 || overIndex < 0) {
      return;
    }

    const reorderedItems = recalculateSchedule(arrayMove(items, activeIndex, overIndex));
    setItems(reorderedItems);
    setSyncStatus("儲存排序中...");

    const result = await updateItineraryOrder(reorderedItems);
    setSyncStatus(result.ok ? "排序已送出" : `排序尚未送出：${result.message}`);
  }

  async function handleDelete(id: string) {
    const itemToDelete = items.find((item) => item.id === id);
    if (!itemToDelete) {
      return;
    }

    setSavingItemId(id);
    setItems((currentItems) => recalculateSchedule(currentItems.filter((item) => item.id !== id)));
    setSyncStatus("刪除景點中...");

    const result = await deleteItineraryItem(id);
    if (result.ok) {
      setSyncStatus("刪除已送出");
    } else {
      setItems((currentItems) => {
        const previousIndex = items.findIndex((item) => item.id === id);
        const nextItems = [...currentItems];
        nextItems.splice(Math.max(previousIndex, 0), 0, itemToDelete);
        return recalculateSchedule(nextItems);
      });
      setSyncStatus(`刪除尚未送出：${result.message}`);
    }
    setSavingItemId(null);
  }

  return (
    <main className="app-shell">
      <section className="toolbar" aria-labelledby="page-title">
        <div>
          <p>Japan Travel Itinerary</p>
          <h1 id="page-title">Day 1 東京行程</h1>
        </div>
        <div className="summary">
          <span>{items.length} stops</span>
          <span>Drag to reorder</span>
          <span>{syncStatus}</span>
        </div>
      </section>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <section className="itinerary-list" aria-label="行程清單">
            {items.map((item, index) => (
              <SortableItineraryItem
                item={item}
                index={index}
                key={item.id}
                isSaving={savingItemId === item.id}
                onDelete={handleDelete}
              />
            ))}
          </section>
        </SortableContext>
      </DndContext>
    </main>
  );
}
