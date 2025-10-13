import React from 'react';

const SkeletonLoader = () => {
  return (
  <div className="max-w-[1500px] mx-auto p-4 sm:p-6 lg:px-6 lg:pt-8">
      {/* Header Skeleton */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6">
        <div className="animate-pulse rounded-md bg-gray-300 h-8 w-64"></div>
        <div className="animate-pulse rounded-md bg-gray-300 h-10 w-40"></div>
      </div>

      {/* Table Skeleton para Desktop */}
      <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
        <div className="animate-pulse">
          {/* Table Header */}
          <div className="bg-gray-50 px-6 py-3 flex space-x-4">
            <div className="h-4 bg-gray-300 rounded w-32"></div>
            <div className="h-4 bg-gray-300 rounded w-40"></div>
            <div className="h-4 bg-gray-300 rounded w-36"></div>
            <div className="h-4 bg-gray-300 rounded w-24"></div>
            <div className="h-4 bg-gray-300 rounded w-28"></div>
            <div className="h-4 bg-gray-300 rounded w-24"></div>
          </div>
          
          {/* Table Rows */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-t border-gray-200 px-6 py-4 flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-gray-300 h-10 w-10"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-32"></div>
                  <div className="h-3 bg-gray-300 rounded w-24"></div>
                </div>
              </div>
              <div className="h-4 bg-gray-300 rounded w-40"></div>
              <div className="flex space-x-1">
                <div className="h-6 bg-gray-300 rounded-full w-20"></div>
                <div className="h-6 bg-gray-300 rounded-full w-16"></div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded w-16"></div>
              </div>
              <div className="h-4 bg-gray-300 rounded w-28"></div>
              <div className="flex space-x-2">
                <div className="h-8 bg-gray-300 rounded w-16"></div>
                <div className="h-8 bg-gray-300 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cards Skeleton para Mobile */}
      <div className="md:hidden space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="animate-pulse">
              <div className="flex items-center space-x-3 mb-3">
                <div className="rounded-full bg-gray-300 h-12 w-12"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-32"></div>
                  <div className="h-3 bg-gray-300 rounded w-24"></div>
                </div>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="h-3 bg-gray-300 rounded w-40"></div>
                <div className="h-3 bg-gray-300 rounded w-28"></div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex space-x-1">
                  <div className="h-6 bg-gray-300 rounded-full w-16"></div>
                  <div className="h-6 bg-gray-300 rounded-full w-20"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-8 bg-gray-300 rounded w-16"></div>
                  <div className="h-8 bg-gray-300 rounded w-20"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkeletonLoader;