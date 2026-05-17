import { useNavigate } from 'react-router-dom';
import occupathLogo from '../assets/occupath_logo_v2.png';

interface NavbarProps {
  showBack?: boolean;
  backLabel?: string;
  backPath?: string;
  backState?: any;
  rightActions?: React.ReactNode;
}

export default function Navbar({ showBack, backLabel = '返回', backPath = '/', backState, rightActions }: NavbarProps) {
  const navigate = useNavigate();

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 48px',
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
        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
      >
        <img src={occupathLogo} alt="Occupath Logo" style={{ height: 50, width: 'auto', objectFit: 'contain', margin: '-4px 0' }} />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {showBack && (
          <button
            onClick={() => navigate(backPath, { state: backState })}
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
