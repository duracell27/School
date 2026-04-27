import { formatCurrency } from '@/lib/format';
import type { AllocationPreview as PreviewData } from '@/types/payment';

interface AllocationPreviewProps {
  preview: PreviewData | undefined;
  isLoading: boolean;
  onWriteoff?: () => void;
  onTopup?: () => void;
  writeoffPending?: boolean;
  topupPending?: boolean;
}

export function AllocationPreview({
  preview,
  isLoading,
  onWriteoff,
  onTopup,
  writeoffPending,
  topupPending,
}: AllocationPreviewProps) {
  if (isLoading) {
    return <div className="h-16 bg-gray-50 rounded animate-pulse" />;
  }
  if (!preview) return null;

  const { debtLessons, prepaidLessons, paymentLeftover, nextLessonShortfall, schoolBalance } = preview;
  const totalCubes = debtLessons + prepaidLessons;
  const isExact = paymentLeftover === 0 && nextLessonShortfall === 0;
  const hasLeftover = paymentLeftover > 0;
  const hasShortfall = nextLessonShortfall > 0 && paymentLeftover === 0;

  return (
    <div className="rounded-lg bg-gray-50 border p-3 space-y-2">
      {totalCubes > 0 && (
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: debtLessons }).map((_, i) => (
            <span key={`d${i}`} className="w-5 h-5 rounded-sm bg-red-400" title="Борг закрито" />
          ))}
          {Array.from({ length: prepaidLessons }).map((_, i) => (
            <span key={`p${i}`} className="w-5 h-5 rounded-sm bg-green-400" title="Передоплата" />
          ))}
        </div>
      )}

      <div className="text-xs text-gray-600 space-y-0.5">
        {debtLessons > 0 && <p>Закрито боргу: {debtLessons} заняття</p>}
        {prepaidLessons > 0 && <p>Передоплачено: {prepaidLessons} заняття</p>}
        {isExact && totalCubes > 0 && <p className="text-green-600 font-medium">Точне співпадіння ✓</p>}
      </div>

      {hasLeftover && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500">
            Залишок: <span className="font-medium">{formatCurrency(paymentLeftover)}</span>
            {nextLessonShortfall > 0 && ` (недостатньо для наступного — ${formatCurrency(nextLessonShortfall)})`}
          </p>
          <button
            type="button"
            onClick={onWriteoff}
            disabled={writeoffPending}
            className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50 transition-colors"
          >
            Списати {formatCurrency(paymentLeftover)} на рахунок школи
          </button>
        </div>
      )}

      {hasShortfall && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500">
            Не вистачає: <span className="font-medium">{formatCurrency(nextLessonShortfall)}</span>
            {' '}(баланс школи: {formatCurrency(schoolBalance)})
          </p>
          <button
            type="button"
            onClick={onTopup}
            disabled={topupPending || schoolBalance < nextLessonShortfall}
            className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-50 transition-colors"
          >
            Взяти {formatCurrency(nextLessonShortfall)} з рахунку школи
          </button>
          {schoolBalance < nextLessonShortfall && (
            <p className="text-xs text-red-500">Недостатньо коштів на рахунку школи</p>
          )}
        </div>
      )}
    </div>
  );
}
