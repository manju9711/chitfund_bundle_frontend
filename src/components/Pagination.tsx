interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange: _onItemsPerPageChange
}: PaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row justify-end items-center gap-4 py-2.5 mt-5">
      <div className="text-gray-600 text-sm">
        {startItem}-{endItem} of {totalItems}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`
            px-3 py-2 text-base border border-gray-300 rounded
            flex items-center justify-center min-w-[40px] transition-all duration-200
            ${currentPage === 1 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-white text-gray-700 cursor-pointer hover:bg-gray-50 hover:border-blue-600'
            }
          `}
          title="Previous"
        >
          ←
        </button>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`
            px-3 py-2 text-base border border-gray-300 rounded
            flex items-center justify-center min-w-[40px] transition-all duration-200
            ${currentPage === totalPages 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-white text-gray-700 cursor-pointer hover:bg-gray-50 hover:border-blue-600'
            }
          `}
          title="Next"
        >
          →
        </button>
      </div>
    </div>
  );
}
