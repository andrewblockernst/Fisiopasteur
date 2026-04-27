import type { ReactNode } from "react";

type CompactListTableProps = {
  children: ReactNode;
  className?: string;
  scrollClassName?: string;
  tableClassName?: string;
  lockToViewport?: boolean;
};

export default function CompactListTable({
  children,
  className = "",
  scrollClassName = "",
  tableClassName = "",
  lockToViewport = false,
}: CompactListTableProps) {
  const heightClass = lockToViewport ? "h-[calc(100vh-220px)] min-h-[360px]" : "h-full";

  return (
    <div className={`block bg-white shadow-md rounded-lg overflow-hidden ${heightClass} ${className}`.trim()}>
      <div className={`h-full overflow-x-auto overflow-y-auto ${scrollClassName}`.trim()}>
        <table
          className={`min-w-full divide-y divide-gray-200 [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-gray-50 ${tableClassName}`.trim()}
        >
          {children}
        </table>
      </div>
    </div>
  );
}
