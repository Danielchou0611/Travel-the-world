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

type ItineraryItem = {
  id: string;
  time: string;
  placeName: string;
  region: string;
  xaiScore: number;
  xaiReason: string;
  imageUrl: string;
};

const initialItems: ItineraryItem[] = [
  {
    id: "sensoji",
    time: "09:00",
    placeName: "Senso-ji",
    region: "Tokyo",
    xaiScore: 0.9032,
    xaiReason: "歷史文化符合度高，評論量穩定，距離適中。",
    imageUrl:
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "tsukiji",
    time: "11:30",
    placeName: "Tsukiji Outer Market",
    region: "Tokyo",
    xaiScore: 0.8444,
    xaiReason: "美食偏好符合度高，適合安排午餐與市場散步。",
    imageUrl:
      "https://images.unsplash.com/photo-1554797589-7241bb691973?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "meiji",
    time: "14:00",
    placeName: "Meiji Jingu",
    region: "Tokyo",
    xaiScore: 0.8816,
    xaiReason: "自然與神社主題兼具，午後節奏較輕鬆。",
    imageUrl:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "shibuya",
    time: "17:00",
    placeName: "Shibuya Crossing",
    region: "Tokyo",
    xaiScore: 0.8475,
    xaiReason: "城市步行與拍照體驗強，距離效率佳。",
    imageUrl:
      "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=900&q=80",
  },
];

function SortableItineraryItem({
  item,
  index,
  onDelete,
}: {
  item: ItineraryItem;
  index: number;
  onDelete: (id: string) => void;
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
          <span>Day 1 · #{index + 1}</span>
          <span>{item.time}</span>
          <span>{item.region}</span>
        </div>
        <h2>{item.placeName}</h2>
        <p>{item.xaiReason}</p>
        <strong>XAI Score {item.xaiScore.toFixed(4)}</strong>
      </div>
      <button className="delete-button" type="button" onClick={() => onDelete(item.id)}>
        刪除
      </button>
    </article>
  );
}

export function App() {
  const [items, setItems] = useState(initialItems);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const ids = useMemo(() => items.map((item) => item.id), [items]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setItems((currentItems) => {
      const oldIndex = currentItems.findIndex((item) => item.id === active.id);
      const newIndex = currentItems.findIndex((item) => item.id === over.id);
      return arrayMove(currentItems, oldIndex, newIndex);
    });
  }

  function handleDelete(id: string) {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
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
                onDelete={handleDelete}
              />
            ))}
          </section>
        </SortableContext>
      </DndContext>
    </main>
  );
}
