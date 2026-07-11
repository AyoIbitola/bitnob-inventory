import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * App-level error boundary. Catches render-time crashes so a bug surfaces as a
 * recoverable message instead of a blank white screen. Logs to the console for
 * debugging; swap in real error reporting (Sentry etc.) here later.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-lg">
          <div className="max-w-md rounded-lg border border-outline-variant bg-surface-container-lowest p-xl text-center shadow-overlay">
            <span className="material-symbols-outlined text-4xl text-error">error</span>
            <h1 className="mt-md text-headline-sm text-on-surface">Something broke</h1>
            <p className="mt-sm text-body-sm text-on-surface-variant">
              An unexpected error occurred while rendering this page.
            </p>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="mt-lg rounded-lg bg-primary-container px-lg py-sm font-semibold text-on-primary hover:brightness-110"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
