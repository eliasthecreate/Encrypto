import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💥</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-gray-500 mb-4">
              The app crashed while loading. Here's the error:
            </p>
            <pre className="text-xs text-left bg-gray-100 rounded-xl p-4 overflow-auto max-h-48 text-red-600 font-mono">
              {this.state.error?.message ?? "Unknown error"}
            </pre>
            <pre className="text-xs text-left bg-gray-100 rounded-xl p-4 overflow-auto max-h-32 text-gray-500 font-mono mt-2">
              {this.state.error?.stack?.split("\n").slice(1, 4).join("\n") ?? ""}
            </pre>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="mt-6 px-6 py-2 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
