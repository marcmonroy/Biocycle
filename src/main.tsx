import { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[BioCycle Error]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#1a0f3d',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
          <p style={{ color: '#FFD93D', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Something went wrong
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '1.5rem', maxWidth: '320px' }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#FFD93D',
              color: '#1a0f3d',
              border: 'none',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
