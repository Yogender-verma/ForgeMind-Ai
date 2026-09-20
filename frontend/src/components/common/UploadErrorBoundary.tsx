import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class UploadErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('UploadErrorBoundary caught error:', error, errorInfo);
  }

  private handleTryAgain = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-slate-950/90 border border-rose-500/40 text-center space-y-5 shadow-2xl animate-fadeIn">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-400 text-2xl shadow-[0_0_20px_rgba(244,63,94,0.3)]">
            ⚠️
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-extrabold font-heading text-white">
              {this.props.fallbackTitle || 'Upload section could not be loaded.'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              An unexpected issue occurred while rendering the inspection upload interface. You can safely try again or return to the dashboard.
            </p>
            {this.state.errorMessage && (
              <p className="text-[11px] font-mono text-rose-300 bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-500/20 max-w-lg mx-auto truncate">
                {this.state.errorMessage}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleTryAgain}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-slate-950 font-bold text-xs font-heading shadow-[0_0_20px_rgba(0,229,255,0.4)] transition cursor-pointer"
            >
              Try again
            </button>
            <a
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-white/10 text-slate-300 border border-white/10 font-medium text-xs transition"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
