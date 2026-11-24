import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Party Karado ErrorBoundary caught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let friendly = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage) as { error?: string; path?: string };
        if (parsed && parsed.error) {
          friendly = `${parsed.error}${parsed.path ? ` (${parsed.path})` : ''}`;
        }
      } catch {
        // Not JSON
      }

      return (
        <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#E5E1D8] rounded-xl p-8 shadow-sm">
            <h1 className="font-display text-2xl font-semibold text-[#18181B] mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-[#57534E] mb-4 leading-relaxed">
              We encountered an issue while loading Party Karado. Please reload the page to
              continue.
            </p>
            <div className="bg-[#F3F1EC] border border-[#E5E1D8] rounded-lg p-3 text-xs font-mono text-[#57534E] break-words mb-6">
              {friendly}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#C83E2B] text-white text-sm font-medium rounded-lg hover:bg-[#AE3221] transition-colors cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
