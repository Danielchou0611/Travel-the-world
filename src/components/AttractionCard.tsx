import { useState } from 'react';
import type { Attraction } from '../types';
import { rerankAttractions } from '../services/api';

const IconStar = ({ filled }: { filled: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

interface XAIBadgeProps {
  xai: Attraction['xai'];
}

function XAIBadge({ xai }: XAIBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div className="xai-tag">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
          <path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9 9 9 0 0 0 9-9 9 9 0 0 0-9-9z" /><path d="M12 8v8" /><path d="M8 12h8" />
        </svg>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '0.04em' }}>AI 推薦分析</span>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.5 }}>{xai.summary}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 10px', color: 'var(--color-text)', fontSize: 11, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
        >
          {expanded ? '收起' : '分析詳情'}
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: 8, padding: '16px', background: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {xai.scores.map(score => (
            <div key={score.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', width: 72, flexShrink: 0 }}>{score.label}</span>
              <div className="score-track">
                <div className="score-fill" style={{ width: `${score.value}%` }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text)', width: 28, textAlign: 'right' }}>{score.value}</span>
            </div>
          ))}
          {xai.matchedInterests.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {xai.matchedInterests.map(interest => (
                <span key={interest} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#F0EEE9', color: 'var(--color-text-muted)' }}>{interest}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AttractionCardProps {
  attraction: Attraction;
  index: number;
  isEditing?: boolean;
  onDelete?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
}

export default function AttractionCard({
  attraction,
  index,
  isEditing,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
  isSelected,
  onSelect,
}: AttractionCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(true);
  }

  function handleConfirm(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(false);
    onDelete?.();
  }

  function handleCancel(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(false);
  }

  return (
    <div
      className="attraction-card"
      draggable={isEditing}
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver?.(e); }}
      onDrop={onDrop}
      onClick={onSelect}
      style={{
        position: 'relative',
        opacity: isDragOver ? 0.5 : 1,
        transition: 'opacity 0.15s, transform 0.15s, outline 0.15s',
        transform: isDragOver ? 'scale(0.98)' : 'scale(1)',
        outline: isSelected
          ? '2px solid var(--color-accent)'
          : isDragOver
            ? '2px dashed var(--color-accent)'
            : 'none',
        cursor: isEditing ? 'grab' : 'pointer',
      }}
    >
      {/* ── Confirmation overlay ─────────────────────────────── */}
      {confirmDelete && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(4px)',
          borderRadius: 12,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>確定要刪除此景點？</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>「{attraction.name}」將從今日行程移除</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleCancel}
              style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid var(--color-border)', background: '#FFF', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#EF4444', color: '#FFF', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              確定刪除
            </button>
          </div>
        </div>
      )}

      {/* ── Delete button — top-right of card ───────────────── */}
      {isEditing && (
        <button
          onClick={handleDeleteClick}
          style={{
            position: 'absolute', top: 10, right: 10, zIndex: 10,
            width: 28, height: 28, borderRadius: '50%',
            background: '#EF4444', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            animation: 'wiggle 0.4s ease',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      <div style={{ display: 'flex' }}>

        {/* ── Image side ──────────────────────────────────────── */}
        <div style={{ width: 200, flexShrink: 0, position: 'relative', overflow: 'hidden', borderRight: '1px solid var(--color-border)' }}>
          <img
            src={attraction.image}
            alt={attraction.name}
            style={{ width: '100%', height: '100%', minHeight: 200, objectFit: 'cover', display: 'block' }}
          />
          {/* Sequence number (hide in edit mode) */}
          {!isEditing && (
            <div style={{
              position: 'absolute', top: 12, left: 12,
              width: 26, height: 26,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-text)', fontSize: 12, fontWeight: 600,
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}>
              {index + 1}
            </div>
          )}
        </div>

        {/* ── Content side ────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)', margin: 0, marginBottom: 4 }}>{attraction.name}</h3>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{attraction.nameEn}</div>
            </div>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: '#FAF9F7', flexShrink: 0, marginLeft: 12 }}>
              {attraction.category}
            </span>
          </div>

          <p style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, margin: 0 }}>{attraction.description}</p>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              {attraction.duration}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
              {attraction.estimatedCost}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              {attraction.location}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconStar filled={attraction.rating >= 1} />
              <div style={{ fontWeight: 600, marginLeft: 2 }}>{attraction.rating}</div>
            </span>
          </div>

          <XAIBadge xai={attraction.xai} />
        </div>

        {/* ── Drag handle strip — right side ──────────────────── */}
        {isEditing && (
          <div style={{
            width: 36,
            flexShrink: 0,
            borderLeft: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            background: '#FAFAF9',
            borderRadius: '0 12px 12px 0',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B3B1AC" strokeWidth="2.5" strokeLinecap="round">
              <line x1="6" y1="8" x2="18" y2="8" />
              <line x1="6" y1="13" x2="18" y2="13" />
              <line x1="6" y1="18" x2="18" y2="18" />
            </svg>
          </div>
        )}

      </div>
    </div>
  );
}

export { rerankAttractions };
