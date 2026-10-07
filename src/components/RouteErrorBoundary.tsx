import * as React from "react";
import { markStartupReady } from "@/lib/startup";

type RouteErrorBoundaryProps = {
  children: React.ReactNode;
  onReload?: () => void;
};

type RouteErrorBoundaryState = {
  hasError: boolean;
  requiresReload: boolean;
};

function isLazyChunkLoadError(error: unknown): boolean {
  const message = error && typeof error === "object" && "message" in error
    ? String((error as { message: unknown }).message)
    : "";
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|chunkloaderror|loading chunk .*failed/i.test(message);
}

/** Keeps a route-local recovery UI for render faults and reloads after failed lazy chunks. */
export class RouteErrorBoundary extends React.Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false, requiresReload: false };

  static getDerivedStateFromError(error: unknown): RouteErrorBoundaryState {
    return { hasError: true, requiresReload: isLazyChunkLoadError(error) };
  }

  componentDidCatch() {
    markStartupReady();
  }

  private handleRetry = () => {
    if (this.state.requiresReload) {
      (this.props.onReload ?? (() => window.location.reload()))();
      return;
    }
    this.setState({ hasError: false, requiresReload: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div dir="rtl" role="alert" className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
        <div className="text-2xl" aria-hidden="true">!</div>
        <div className="text-base font-semibold opacity-90">حدث خطأ في هذه الصفحة</div>
        <button
          type="button"
          className="px-4 py-2 rounded-2xl bg-[var(--card)] border border-[var(--stroke)] text-sm"
          onClick={this.handleRetry}
          aria-label={this.state.requiresReload ? "إعادة تحميل الصفحة" : "إعادة المحاولة لتحميل الصفحة"}
        >
          {this.state.requiresReload ? "إعادة تحميل الصفحة" : "إعادة المحاولة"}
        </button>
      </div>
    );
  }
}
