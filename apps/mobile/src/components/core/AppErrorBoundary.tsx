import { Component, ErrorInfo, ReactNode } from 'react';
import { AppCrashScreen } from '@/components/core/AppCrashScreen';
import { reportFrontendError } from '@/lib/errors/reportFrontendError';

type AppErrorBoundaryProps = {
  children: ReactNode;
  isDark: boolean;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportFrontendError('AppErrorBoundary caught an unhandled render error', error, {
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <AppCrashScreen isDark={this.props.isDark} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}
