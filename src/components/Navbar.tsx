import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  showBack?: boolean;
  backLabel?: string;
  backPath?: string;
  rightActions?: React.ReactNode;
}

export default function Navbar({ showBack, backLabel = '返回', backPath = '/', rightActions }: NavbarProps) {
  const navigate = useNavigate();

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 48px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      <div
        onClick={() => navigate('/')}
        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
      >
        <div style={{
          width: 32, height: 32,
          background: 'var(--color-accent)',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          </svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
          JapanAI
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {showBack && (
          <button
            onClick={() => navigate(backPath)}
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              padding: '6px 14px',
              color: 'var(--color-text-muted)',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            {backLabel}
          </button>
        )}
        {rightActions}
      </div>
    </nav>
  );
}
