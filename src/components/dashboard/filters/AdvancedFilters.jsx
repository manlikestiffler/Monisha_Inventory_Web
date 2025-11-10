import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../ui/Button';
import Select from '../../ui/Select';

const AdvancedFilters = ({ 
  onFilterChange,
  dateRange,
  schoolId,
  category,
  status,
  schools,
  categories 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Select
            value={dateRange}
            onChange={(e) => onFilterChange('dateRange', e.target.value)}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
              { value: 'custom', label: 'Custom Range' }
            ]}
            className="w-40"
          />
          
          <Select
            value={schoolId}
            onChange={(e) => onFilterChange('schoolId', e.target.value)}
            options={[
              { value: 'all', label: 'All Schools' },
              ...schools.map(school => ({
                value: school.id,
                label: school.name
              }))
            ]}
            className="w-48"
          />
          
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center"
          >
            <svg 
              className={`w-5 h-5 mr-2 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Advanced Filters
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onFilterChange('reset')}>
            Reset
          </Button>
          <Button variant="solid" onClick={() => onFilterChange('apply')}>
            Apply Filters
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-200"
          >
            <div className="p-4 bg-gray-50 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <Select
                    value={category}
                    onChange={(e) => onFilterChange('category', e.target.value)}
                    options={[
                      { value: 'all', label: 'All Categories' },
                      ...categories.map(cat => ({
                        value: cat.id,
                        label: cat.name
                      }))
                    ]}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <Select
                    value={status}
                    onChange={(e) => onFilterChange('status', e.target.value)}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'in_stock', label: 'In Stock' },
                      { value: 'low_stock', label: 'Low Stock' },
                      { value: 'out_of_stock', label: 'Out of Stock' }
                    ]}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By
                  </label>
                  <Select
                    value={status}
                    onChange={(e) => onFilterChange('sortBy', e.target.value)}
                    options={[
                      { value: 'date_desc', label: 'Date (Newest)' },
                      { value: 'date_asc', label: 'Date (Oldest)' },
                      { value: 'value_desc', label: 'Value (High to Low)' },
                      { value: 'value_asc', label: 'Value (Low to High)' }
                    ]}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {schools.length} schools and {categories.length} categories
                </div>
                <Button variant="text" onClick={() => onFilterChange('export')}>
                  Export Filtered Data
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedFilters; 