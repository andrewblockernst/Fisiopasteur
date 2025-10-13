import React from 'react';

export type SkeletonType =
  | 'table'
  | 'cards'
  | 'calendar'
  | 'form'
  | 'dashboard'
  | 'list';

interface UnifiedSkeletonLoaderProps {
  type: SkeletonType;
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  showFilters?: boolean;
  showSearch?: boolean;
  className?: string;
}

const SkeletonItem = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-gray-300 ${className}`} />
);

export default function UnifiedSkeletonLoader({
  type,
  rows = 5,
  columns = 6,
  showHeader = true,
  showFilters = true,
  showSearch = true,
  className = ""
}: UnifiedSkeletonLoaderProps) {
  const renderTableSkeleton = () => (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="animate-pulse">
        {/* Table Header */}
        <div className="bg-gray-50 px-6 py-3 flex space-x-4">
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonItem key={i} className="h-4 w-20" />
          ))}
        </div>

        {/* Table Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="border-t border-gray-200 px-6 py-4 flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <SkeletonItem className="rounded-full h-10 w-10" />
              <div className="space-y-2">
                <SkeletonItem className="h-4 w-32" />
                <SkeletonItem className="h-3 w-24" />
              </div>
            </div>
            {Array.from({ length: columns - 1 }).map((_, colIndex) => (
              <div key={colIndex} className="flex items-center space-x-2">
                {colIndex === columns - 2 ? (
                  <>
                    <SkeletonItem className="h-6 w-6 rounded" />
                    <SkeletonItem className="h-4 w-16" />
                  </>
                ) : colIndex === columns - 1 ? (
                  <div className="flex space-x-2">
                    <SkeletonItem className="h-8 w-16 rounded" />
                    <SkeletonItem className="h-8 w-20 rounded" />
                  </div>
                ) : (
                  <SkeletonItem className={`h-4 ${colIndex % 2 === 0 ? 'w-40' : 'w-28'}`} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const renderCardsSkeleton = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="animate-pulse">
            <div className="flex items-center space-x-3 mb-3">
              <SkeletonItem className="rounded-full h-12 w-12" />
              <div className="space-y-2">
                <SkeletonItem className="h-4 w-32" />
                <SkeletonItem className="h-3 w-24" />
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <SkeletonItem className="h-3 w-40" />
              <SkeletonItem className="h-3 w-28" />
            </div>

            <div className="flex justify-between items-center">
              <div className="flex space-x-1">
                <SkeletonItem className="h-6 w-16 rounded-full" />
                <SkeletonItem className="h-6 w-20 rounded-full" />
              </div>
              <div className="flex space-x-2">
                <SkeletonItem className="h-8 w-16 rounded" />
                <SkeletonItem className="h-8 w-20 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCalendarSkeleton = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="animate-pulse">
        <SkeletonItem className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-7 gap-2 mb-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonItem key={i} className="h-6 w-8" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-20 border border-gray-200 rounded p-2">
              <SkeletonItem className="h-4 w-6 mb-2" />
              <div className="space-y-1">
                <SkeletonItem className="h-3 w-full" />
                <SkeletonItem className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFormSkeleton = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="animate-pulse space-y-6">
        <div>
          <SkeletonItem className="h-4 w-24 mb-2" />
          <SkeletonItem className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <SkeletonItem className="h-4 w-20 mb-2" />
            <SkeletonItem className="h-10 w-full" />
          </div>
          <div>
            <SkeletonItem className="h-4 w-16 mb-2" />
            <SkeletonItem className="h-10 w-full" />
          </div>
        </div>
        <div>
          <SkeletonItem className="h-4 w-28 mb-2" />
          <SkeletonItem className="h-24 w-full" />
        </div>
        <div className="flex justify-end space-x-3">
          <SkeletonItem className="h-10 w-20" />
          <SkeletonItem className="h-10 w-24" />
        </div>
      </div>
    </div>
  );

  const renderDashboardSkeleton = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <SkeletonItem className="h-8 w-48" />
        <SkeletonItem className="h-10 w-32" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="animate-pulse flex items-center space-x-4">
              <SkeletonItem className="h-12 w-12 rounded-full" />
              <div>
                <SkeletonItem className="h-4 w-20 mb-2" />
                <SkeletonItem className="h-6 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <SkeletonItem className="h-6 w-32 mb-4" />
          <SkeletonItem className="h-64 w-full" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <SkeletonItem className="h-6 w-32 mb-4" />
          <SkeletonItem className="h-64 w-full" />
        </div>
      </div>
    </div>
  );

  const renderListSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="animate-pulse flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SkeletonItem className="h-10 w-10 rounded-full" />
              <div>
                <SkeletonItem className="h-4 w-32 mb-1" />
                <SkeletonItem className="h-3 w-24" />
              </div>
            </div>
            <div className="flex space-x-2">
              <SkeletonItem className="h-8 w-16 rounded" />
              <SkeletonItem className="h-8 w-16 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    switch (type) {
      case 'table':
        return renderTableSkeleton();
      case 'cards':
        return renderCardsSkeleton();
      case 'calendar':
        return renderCalendarSkeleton();
      case 'form':
        return renderFormSkeleton();
      case 'dashboard':
        return renderDashboardSkeleton();
      case 'list':
        return renderListSkeleton();
      default:
        return renderTableSkeleton();
    }
  };

  return (
  <div className={`max-w-[1500px] mx-auto p-4 sm:p-6 lg:px-6 lg:pt-8 ${className}`}>
      {/* Mobile Header Skeleton */}
      <div className="sm:hidden bg-white border-b border-gray-200 mb-4">
        <div className="flex items-center px-4 py-3">
          <SkeletonItem className="h-6 w-6 mr-3" />
          <SkeletonItem className="h-6 w-32 flex-1 mr-9" />
        </div>
        {showSearch && (
          <div className="px-4 pb-3">
            <SkeletonItem className="h-10 w-full rounded-lg" />
          </div>
        )}
      </div>

      {/* Desktop Header */}
      {showHeader && (
        <div className="hidden sm:flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6">
          <SkeletonItem className="h-8 w-64" />
          <SkeletonItem className="h-10 w-40" />
        </div>
      )}

      {/* Filters Skeleton */}
      {showFilters && (
        <div className="hidden sm:block bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="animate-pulse">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                {showSearch && <SkeletonItem className="h-10 w-80" />}
                <div className="flex items-center gap-2">
                  <SkeletonItem className="h-4 w-16" />
                  <SkeletonItem className="h-10 w-32 rounded-lg" />
                </div>
              </div>
              <SkeletonItem className="h-10 w-40 rounded-lg" />
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <SkeletonItem className="h-4 w-48" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Skeleton */}
      {renderContent()}
    </div>
  );
}