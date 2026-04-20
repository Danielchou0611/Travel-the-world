import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import type { Trip, Attraction } from '../types';
import { MOCK_TRIP, rerankAttractions } from '../services/api';
import Navbar from '../components/Navbar';
import AttractionCard from '../components/AttractionCard';
import WhatIfSliders from '../components/WhatIfSliders';

const IconCalendar = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const IconYen = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="9" x2="12" y2="22" /><polyline points="6 4 12 9 18 4" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></svg>;
const IconPin = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
const IconChart = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
const IconAlert = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;

export default function ItineraryPage() {
  const { tripId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<Trip>(() => {
    return (location.state as { trip?: Trip })?.trip ?? MOCK_TRIP;
  });

  const [activeDay, setActiveDay] = useState(0);
  const [explorationStyle, setExplorationStyle] = useState(trip.preferences.explorationStyle ?? 50);
  const [foodVsAttractions, setFoodVsAttractions] = useState(trip.preferences.foodVsAttractions ?? 50);

  // ── Edit mode state ──────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editAttractions, setEditAttractions] = useState<Attraction[]>([]);
  // Drag state: stores source info for both same-day and cross-day moves
  const dragSrcRef = useRef<{ dayIndex: number; attractionIndex: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverDayTab, setDragOverDayTab] = useState<number | null>(null);
  // Track days that have been manually reordered (skip auto-ranking for these)
  const [manualOrderDays, setManualOrderDays] = useState<Set<number>>(new Set());


  // ── Ranking (used when NOT editing) ─────────────────────────────
  const rankedAttractions = useMemo(() => {
    const dayAttractions = trip.days[activeDay]?.attractions ?? [];
    return rerankAttractions(dayAttractions, explorationStyle, foodVsAttractions);
  }, [trip, activeDay, explorationStyle, foodVsAttractions]);

  const currentDay = trip.days[activeDay];

  const [reranked, setReranked] = useState(false);

  useEffect(() => {
    setReranked(true);
    const t = setTimeout(() => setReranked(false), 1500);
    return () => clearTimeout(t);
  }, [explorationStyle, foodVsAttractions]);

  // ── Edit helpers ─────────────────────────────────────────────────
  function handleDelete(index: number) {
    setEditAttractions(prev => prev.filter((_, i) => i !== index));
  }

  function handleDragStart(attractionIndex: number) {
    dragSrcRef.current = { dayIndex: activeDay, attractionIndex };
  }

  // Same-day hover
  function handleDragOver(index: number) {
    setDragOverIndex(index);
    setDragOverDayTab(null);
  }

  // Drop within the same day list
  function handleDrop(dropIndex: number) {
    const src = dragSrcRef.current;
    if (!src || src.dayIndex !== activeDay) {
      // Cross-day drop handled by day-tab handler; clear state
      dragSrcRef.current = null;
      setDragOverIndex(null);
      return;
    }
    const from = src.attractionIndex;
    if (from !== dropIndex) {
      setEditAttractions(prev => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(dropIndex, 0, moved);
        return next;
      });
    }
    dragSrcRef.current = null;
    setDragOverIndex(null);
  }

  // Drop onto a day tab → move attraction to that day
  function handleDropOnDay(targetDayIndex: number) {
    const src = dragSrcRef.current;
    setDragOverDayTab(null);
    if (!src || targetDayIndex === activeDay) {
      dragSrcRef.current = null;
      return;
    }
    const moved = editAttractions[src.attractionIndex];
    if (!moved) { dragSrcRef.current = null; return; }

    // Remove from current day
    const newSrcAttractions = editAttractions.filter((_, i) => i !== src.attractionIndex);
    setEditAttractions(newSrcAttractions);

    // Append to target day
    setTrip(prev => {
      const newDays = prev.days.map((day, i) => {
        if (i === activeDay) return { ...day, attractions: newSrcAttractions };
        if (i === targetDayIndex) return { ...day, attractions: [...day.attractions, moved] };
        return day;
      });
      return { ...prev, days: newDays };
    });

    setManualOrderDays(prev => {
      const next = new Set(prev);
      next.add(activeDay);
      next.add(targetDayIndex);
      return next;
    });

    dragSrcRef.current = null;
  }

  function commitEdits() {
    setTrip(prev => {
      const newDays = prev.days.map((day, i) =>
        i === activeDay ? { ...day, attractions: editAttractions } : day
      );
      return { ...prev, days: newDays };
    });
    setManualOrderDays(prev => new Set(prev).add(activeDay));
    setIsEditing(false);
  }

  function cancelEdits() {
    setEditAttractions(trip.days[activeDay]?.attractions ?? []);
    setIsEditing(false);
  }

  // Switch day: auto-save current day edits first, then load new day atomically
  function switchDay(newDayIndex: number) {
    if (newDayIndex === activeDay) return;
    if (isEditing) {
      // Save current day's edits and load new day in one batch → single render
      setTrip(prev => {
        const newDays = prev.days.map((day, i) =>
          i === activeDay ? { ...day, attractions: editAttractions } : day
        );
        return { ...prev, days: newDays };
      });
      setManualOrderDays(prev => new Set(prev).add(activeDay));
      // Load the new day's attractions directly (no useEffect needed)
      setEditAttractions(trip.days[newDayIndex]?.attractions ?? []);
    }
    setDragOverIndex(null);
    setActiveDay(newDayIndex);
  }

  // Displayed attractions depend on mode:
  // - editing: use local editAttractions (draft)
  // - manually ordered day: use trip data directly (preserve user order)
  // - otherwise: use AI-ranked order
  const displayAttractions = isEditing
    ? editAttractions
    : manualOrderDays.has(activeDay)
      ? (trip.days[activeDay]?.attractions ?? [])
      : rankedAttractions;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <Navbar
        showBack
        backLabel="返回"
        backPath="/"
        rightActions={
          <div style={{ display: 'flex', gap: 8 }}>
            {isEditing ? (
              <>
                <button
                  onClick={cancelEdits}
                  className="btn-primary"
                  style={{ background: '#FFFFFF', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '6px 14px', width: 'auto' }}
                >
                  取消
                </button>
                <button
                  onClick={commitEdits}
                  className="btn-primary"
                  style={{ padding: '6px 14px', width: 'auto' }}
                >
                  完成
                </button>
              </>
            ) : (
              <>
                <button className="btn-primary" style={{ background: '#FFFFFF', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '6px 14px', width: 'auto' }}>
                  儲存
                </button>
                <button className="btn-primary" style={{ background: '#FFFFFF', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '6px 14px', width: 'auto' }}>
                  PDF 匯出
                </button>
                <button
                  onClick={() => navigate(`/map/${tripId}`)}
                  className="btn-primary"
                  style={{ padding: '6px 14px', width: 'auto' }}
                >
                  開啟地圖
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Edit mode banner */}
      {isEditing && (
        <div style={{
          background: 'var(--color-accent)',
          color: '#fff',
          textAlign: 'center',
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.02em',
        }}>
          ✦ 編輯模式：拖曳排序景點，或按 ✕ 刪除
        </div>
      )}

      <div style={{ flex: 1, padding: '32px 48px 160px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>

        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              {trip.preferences.days} 天旅遊行程
            </h1>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{trip.preferences.interests.join(' ・ ')}</span>
              <span style={{ color: 'var(--color-border)' }}>|</span>
              <span>NT$ {trip.preferences.budget.toLocaleString()}</span>
              <span style={{ color: 'var(--color-border)' }}>|</span>
              <span style={{ color: 'var(--color-accent)' }}>生成於 {new Date(trip.generatedAt).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => { setEditAttractions(trip.days[activeDay]?.attractions ?? []); setIsEditing(true); }}
              className="btn-primary"
              style={{ background: '#FFFFFF', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '6px 16px', width: 'auto', flexShrink: 0, fontSize: 13 }}
            >
              編輯行程
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: '設定天數', value: `${trip.summary.totalDays} 天`, icon: <IconCalendar /> },
            { label: '估計費用', value: trip.summary.totalBudget, icon: <IconYen /> },
            { label: '景點數量', value: `${trip.summary.totalAttractions} 處`, icon: <IconPin /> },
            { label: '日均行程', value: `${trip.summary.avgPerDay} 處`, icon: <IconChart /> },
          ].map(stat => (
            <div key={stat.label} className="stat-card animate-fade-up">
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                {stat.icon}
                {stat.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {currentDay?.warning && (
          <div className="alert-banner animate-fade-up" style={{ marginBottom: 24 }}>
            <span style={{ color: '#B45309' }}><IconAlert /></span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#92400E', margin: 0 }}>
                行程提示：Day {currentDay.day} ({currentDay.date})
              </p>
              <p style={{ fontSize: 12, color: '#B45309', marginTop: 4, lineHeight: 1.5 }}>
                {currentDay.warning} 目前排定了 {currentDay.attractions.length} 個行程，若要確保旅遊節奏，建議減至 3-4 個。
              </p>
            </div>
          </div>
        )}

        {reranked && !isEditing && (
          <div style={{
            position: 'fixed',
            top: 90,
            right: 32,
            zIndex: 200,
            padding: '12px 16px',
            background: 'var(--color-accent)',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            animation: 'fadeUp 0.3s ease',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            景點排序已更新
          </div>
        )}

        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

          {/* Left: Days */}
          <div style={{ width: 120, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, position: 'sticky', top: 90 }}>
            {trip.days.map((day, i) => (
              <div
                key={day.day}
                className={`day-tab ${i === activeDay ? 'active' : ''} ${day.warning ? 'warn' : ''}`}
                onClick={() => switchDay(i)}
                onDragOver={isEditing && i !== activeDay ? e => { e.preventDefault(); setDragOverDayTab(i); } : undefined}
                onDragLeave={isEditing ? () => setDragOverDayTab(null) : undefined}
                onDrop={isEditing && i !== activeDay ? e => { e.preventDefault(); handleDropOnDay(i); } : undefined}
                style={{
                  opacity: dragOverDayTab !== null && dragOverDayTab !== i && i !== activeDay ? 0.5 : 1,
                  cursor: 'pointer',
                  background: dragOverDayTab === i ? '#FDE8EC' : undefined,
                  border: dragOverDayTab === i ? '2px dashed var(--color-accent)' : undefined,
                  transform: dragOverDayTab === i ? 'scale(1.04)' : 'scale(1)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Day {day.day}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{day.date}</div>
              </div>
            ))}
          </div>

          {/* Right: Attractions */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                Day {currentDay?.day} 第 {currentDay?.day} 天行程
              </h2>
              <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 4, background: '#F0EEE9', color: 'var(--color-text-muted)' }}>
                {displayAttractions.length} 個景點
              </span>
            </div>

            {displayAttractions.map((attraction, i) => (
              <AttractionCard
                key={attraction.id}
                attraction={attraction}
                index={i}
                isEditing={isEditing}
                onDelete={() => handleDelete(i)}
                onDragStart={() => handleDragStart(i)}
                onDragOver={() => handleDragOver(i)}
                onDrop={() => handleDrop(i)}
                isDragOver={dragOverIndex === i}
              />
            ))}

            {isEditing && displayAttractions.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '48px',
                color: 'var(--color-text-muted)',
                fontSize: 14,
                border: '2px dashed var(--color-border)',
                borderRadius: 12,
              }}>
                今天的行程已全部刪除
              </div>
            )}
          </div>

        </div>
      </div>
      <WhatIfSliders
        explorationStyle={explorationStyle}
        foodVsAttractions={foodVsAttractions}
        onExplorationChange={setExplorationStyle}
        onFoodChange={setFoodVsAttractions}
      />

    </div>
  );
}
