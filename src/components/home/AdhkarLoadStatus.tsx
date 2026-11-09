import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type AdhkarLoadStatusProps = {
  hasData: boolean;
  error: unknown;
  isFetching: boolean;
  onRetry: () => void;
};

/** Keeps Home usable with cached adhkar and gives first-load failures a clear retry. */
export function AdhkarLoadStatus({ hasData, error, isFetching, onRetry }: AdhkarLoadStatusProps) {
  if (!error) return null;

  const retryButton = (
    <Button
      variant="outline"
      size="sm"
      aria-label="إعادة تحميل الأذكار"
      aria-busy={isFetching}
      disabled={isFetching}
      onClick={onRetry}
    >
      <RotateCw size={15} aria-hidden="true" className={isFetching ? "animate-spin" : undefined} />
      {isFetching ? "جارٍ إعادة المحاولة" : "إعادة المحاولة"}
    </Button>
  );

  if (hasData) {
    return (
      <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 text-sm">
        <p className="m-0 opacity-80">تعذّر تحديث الأذكار. تتابع الآن باستخدام آخر بيانات متاحة.</p>
        {retryButton}
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card role="alert" className="p-6">
        <h1 className="text-lg font-semibold">تعذّر تحميل الأذكار</h1>
        <p className="mt-2 mb-4 text-sm leading-6 opacity-75">حاول مرة أخرى بعد لحظات.</p>
        {retryButton}
      </Card>
    </div>
  );
}
