import { Component, useState } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './components/pages/HomePage';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', color: '#f87171', background: '#0a0a0a', minHeight: '100vh' }}>
          <h2 style={{ color: '#fca5a5', marginBottom: 12 }}>Something went wrong</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#fca5a5' }}>
            {(error as Error).message}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#6b7280', marginTop: 16 }}>
            {(error as Error).stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 24, padding: '8px 16px', background: '#374151', color: '#f9fafb', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [page, setPage] = useState<'home' | 'editor'>('home');

  if (page === 'editor') return <ErrorBoundary><AppShell /></ErrorBoundary>;
  return <HomePage onEnter={() => setPage('editor')} />;
}

export default App;
