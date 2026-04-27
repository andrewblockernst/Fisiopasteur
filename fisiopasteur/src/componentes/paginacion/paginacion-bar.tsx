import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type PaginacionBarProps = {
  pagination: PaginationMeta;
  visibleCount: number;
  pageSize: number;
  allowedPageSizes: number[];
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  loading?: boolean;
  variant?: "desktop" | "mobile";
  showSummary?: boolean;
  showFirstLastJump?: boolean;
  className?: string;
  top?: boolean;
};

export default function PaginacionBar({
  pagination,
  visibleCount,
  pageSize,
  allowedPageSizes,
  itemLabel,
  onPageChange,
  onPageSizeChange,
  loading = false,
  variant = "desktop",
  showSummary = true,
  showFirstLastJump = false,
  className = "",
  top = false,
}: PaginacionBarProps) {
  const isFirstPage = pagination.page <= 1;
  const isLastPage = pagination.page >= pagination.totalPages;
  const disablePrev = isFirstPage || loading;
  const disableNext = isLastPage || loading;

  const goToPage = (nextPage: number) => {
    const bounded = Math.max(1, Math.min(nextPage, pagination.totalPages || 1));
    onPageChange(bounded);
  };

  if (variant === "mobile") {
    return (
      <div className={`rounded-lg px-3 ${top ? "py-1" : "pb-12"} ${className}`.trim()}>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="h-8 rounded border border-neutral-300 bg-white px-3 text-xs disabled:opacity-40"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={disablePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-neutral-700">
            Pagina {pagination.page} de {pagination.totalPages}
          </span>
          <button
            type="button"
            className="h-8 rounded border border-neutral-300 px-3 text-xs disabled:opacity-40"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={disableNext}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-2 flex items-center justify-between text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <label htmlFor={`mobile-page-size-${itemLabel}`}>Por pagina</label>
            <select
              id={`mobile-page-size-${itemLabel}`}
              className="h-7 rounded border border-neutral-300 bg-white px-2 text-xs"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {allowedPageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          {showSummary ? (
            <span>
              Mostrando {visibleCount} de {pagination.total} {itemLabel}
            </span>
          ) : (
            <span />
          )}

        </div>

      </div>
    );
  }

  return (
    <div className={`grid grid-cols-3 items-center gap-3 ${className}`.trim()}>
      <div className="text-xs text-gray-600">
        {showSummary && (
          <span>
            Mostrando {visibleCount} de {pagination.total} {itemLabel}
          </span>
        )}
      </div>

      <div className="justify-self-center text-xs text-gray-600">
        {showFirstLastJump && (
          <span>
            Ir a la{" "}
            <button
              type="button"
              className="font-medium text-[#9C1838] hover:underline disabled:text-gray-400 disabled:no-underline"
              onClick={() => goToPage(1)}
              disabled={disablePrev}
            >
              primer
            </button>
            /
            <button
              type="button"
              className="font-medium text-[#9C1838] hover:underline disabled:text-gray-400 disabled:no-underline"
              onClick={() => goToPage(pagination.totalPages)}
              disabled={disableNext}
            >
              ultima
            </button>{" "}
            pagina
          </span>
        )}
      </div>

      <div className="justify-self-end flex items-center gap-2">
        <label htmlFor={`desktop-page-size-${itemLabel}`} className="text-xs text-gray-600">
          Por pagina
        </label>
        <select
          id={`desktop-page-size-${itemLabel}`}
          className="h-8 rounded border border-gray-300 bg-white px-2 text-xs"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {allowedPageSizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="h-8 rounded border border-gray-300 px-3 text-xs disabled:opacity-40"
          onClick={() => goToPage(pagination.page - 1)}
          disabled={disablePrev}
        >
          Anterior
        </button>
        <span className="min-w-20 text-center text-xs text-gray-700">
          Pagina {pagination.page} de {pagination.totalPages}
        </span>
        <button
          type="button"
          className="h-8 rounded border border-gray-300 px-3 text-xs disabled:opacity-40"
          onClick={() => goToPage(pagination.page + 1)}
          disabled={disableNext}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
