import { Component } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

/**
 * Catches render errors so a single broken component cannot blank the app.
 * Class component because React exposes no hook equivalent.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Kept out of production telemetry, but visible for debugging.
    if (import.meta.env.DEV) {
      console.error('UI error boundary caught:', error, info?.componentStack);
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <div className="glass glass-edge grid gap-4 p-8">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-negative/10 text-negative">
            <AlertTriangle size={20} />
          </div>
          <h2 className="text-lg font-semibold text-mist-50">Something broke on this screen</h2>
          <p className="text-sm leading-relaxed text-mist-400">
            The rest of the app is still available. Reload to try again — if it keeps happening,
            the details are in the browser console.
          </p>
          <button type="button" className="btn-primary mx-auto" onClick={() => window.location.reload()}>
            <RotateCw size={15} />
            Reload
          </button>
        </div>
      </div>
    );
  }
}
