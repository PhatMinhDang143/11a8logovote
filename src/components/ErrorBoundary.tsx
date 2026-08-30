import React, { Component, ReactNode, ErrorInfo } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0c0f14] text-[#f1ede3]">
          <div className="w-full max-w-md bg-[#181d26] border border-[#333d4d] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center space-y-4">
            <div className="w-12 h-12 bg-[#e2725b]/20 border border-[#e2725b]/40 text-[#e2725b] mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="font-serif italic text-lg font-semibold text-[#f1ede3]">
              Đã khôi phục trạng thái
            </h2>
            <p className="text-xs text-[#b9bdc7]">
              Ứng dụng đã gặp sự cố nhỏ và đã được cô lập an toàn để không mất dữ liệu chấm điểm của bạn.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 font-semibold text-sm bg-gradient-to-b from-[#e0bc4a] to-[#c9a227] text-[#1a1206] shadow-md hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
