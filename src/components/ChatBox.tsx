import { useState, useRef, useEffect } from 'react';
import type { Trip } from '../types';
import { modifyTrip } from '../services/api';

const IconChat = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const IconSparkles = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4M3 5h4" />
  </svg>
);

interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatBoxProps {
  trip: Trip;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
}

export default function ChatBox({ trip, setTrip }: ChatBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      content: '歡迎使用 Occupath AI 旅遊助手！\n如果想修改行程，或有任何問題，都可以隨時問我。',
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    setInputValue('');

    // Add user message
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: userText }]);
    setIsLoading(true);

    try {
      const destination = trip.preferences.destination?.join('、') || '京都';

      const updatedTrip = await modifyTrip(destination, trip, userText);
      setTrip(updatedTrip);

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '已為您更新行程！'
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `抱歉，修改行程時發生錯誤：${error.message || '未知錯誤'}。請稍後再試。`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) {
    return (
      <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 999 }}>
        {showHint && (
          <div
            className="animate-fade-up"
            style={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              marginBottom: 12,
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              border: '1px solid var(--color-border)',
              pointerEvents: 'none',
              fontFamily: 'var(--font-serif)',
            }}
          >
            有需要修改行程嗎？來問 AI 助手吧！ ✨
            <div style={{
              position: 'absolute',
              bottom: -6,
              right: 20,
              width: 10,
              height: 10,
              background: 'var(--color-surface)',
              borderBottom: '1px solid var(--color-border)',
              borderRight: '1px solid var(--color-border)',
              transform: 'rotate(45deg)',
            }} />
          </div>
        )}
        <button
          onClick={() => {
            setIsOpen(true);
            setShowHint(false);
          }}
          className="animate-fade-up"
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(15, 23, 42, 0.25)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.2)';
          }}
        >
          <IconChat />
        </button>
      </div>
    );
  }

  return (
    <div
      className="animate-fade-up"
      style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        width: 380,
        height: 520,
        background: 'var(--color-surface)',
        borderRadius: 16,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 999,
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        fontFamily: 'var(--font-serif)',
      }}
    >
      {/* Header */}
      <div style={{
        background: 'var(--color-accent)',
        color: 'white',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, fontFamily: 'var(--font-serif)', letterSpacing: '0.04em' }}>
          <IconSparkles />
          AI 旅遊助手
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'white'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
        >
          <IconClose />
        </button>
      </div>

      {/* Message Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        background: 'var(--color-bg)',
      }}>
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: isUser ? '#FDF2F2' : 'var(--color-surface)',
                color: 'var(--color-text)',
                border: isUser ? '1px solid #FCE4E4' : '1px solid var(--color-border)',
                padding: '12px 16px',
                borderRadius: 12,
                borderBottomRightRadius: isUser ? 4 : 12,
                borderBottomLeftRadius: !isUser ? 4 : 12,
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                boxShadow: isUser ? '0 2px 8px rgba(190, 49, 68, 0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              {msg.content}
            </div>
          );
        })}
        {isLoading && (
          <div style={{
            alignSelf: 'flex-start',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            padding: '12px 16px',
            borderRadius: 12,
            borderBottomLeftRadius: 4,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}>
            <span className="dot-flashing"></span>
            <span style={{ marginLeft: 16 }}>AI 正在為您修改行程</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '16px',
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-end',
      }}>
        <textarea
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="怎麼搭交通車..."
          disabled={isLoading}
          className="glass-input"
          style={{
            flex: 1,
            padding: '12px',
            resize: 'none',
            height: 48,
            maxHeight: 120,
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!inputValue.trim() || isLoading}
          className="btn-primary"
          style={{
            width: 'auto',
            padding: '0 20px',
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          送出
        </button>
      </div>

      <style>{`
        .dot-flashing {
          position: relative;
          width: 6px;
          height: 6px;
          border-radius: 3px;
          background-color: #64748b;
          color: #64748b;
          animation: dot-flashing 1s infinite linear alternate;
          animation-delay: 0.5s;
        }
        .dot-flashing::before, .dot-flashing::after {
          content: '';
          display: inline-block;
          position: absolute;
          top: 0;
        }
        .dot-flashing::before {
          left: -12px;
          width: 6px;
          height: 6px;
          border-radius: 3px;
          background-color: #64748b;
          color: #64748b;
          animation: dot-flashing 1s infinite alternate;
          animation-delay: 0s;
        }
        .dot-flashing::after {
          left: 12px;
          width: 6px;
          height: 6px;
          border-radius: 3px;
          background-color: #64748b;
          color: #64748b;
          animation: dot-flashing 1s infinite alternate;
          animation-delay: 1s;
        }
        @keyframes dot-flashing {
          0% { background-color: #64748b; }
          50%, 100% { background-color: #cbd5e1; }
        }
      `}</style>
    </div>
  );
}
