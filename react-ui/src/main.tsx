import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; stack: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null, stack: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { error, stack: error.stack || '' };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ color: '#dc2626' }}>React Rendering Error</h2>
          <pre style={{ background: '#fef2f2', padding: '1rem', borderRadius: '4px', overflow: 'auto', fontSize: '13px', lineHeight: '1.5', marginTop: '1rem' }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
