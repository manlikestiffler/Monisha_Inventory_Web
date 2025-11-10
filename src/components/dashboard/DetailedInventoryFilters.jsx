import { motion } from 'framer-motion';
import ModernSelect from '../ui/ModernSelect';

const DetailedInventoryFilters = ({
  selectedSchool,
  selectedType,
  selectedVariant,
  selectedSize,
  selectedStatus,
  onSchoolChange,
  onTypeChange,
  onVariantChange,
  onSizeChange,
  onStatusChange,
  schools,
  types
}) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">School</label>
          <ModernSelect
            value={selectedSchool}
            onChange={onSchoolChange}
            options={[
              { value: 'all', label: 'All Schools' },
              ...schools
            ]}
            placeholder="Select School"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <ModernSelect
            value={selectedType}
            onChange={onTypeChange}
            options={[
              { value: 'all', label: 'All Types' },
              ...types
            ]}
            placeholder="Select Type"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Variant</label>
          <ModernSelect
            value={selectedVariant}
            onChange={onVariantChange}
            options={[
              { value: 'all', label: 'All Variants' },
              { value: 'long_sleeve', label: 'Long Sleeve' },
              { value: 'short_sleeve', label: 'Short Sleeve' },
              { value: 'regular_fit', label: 'Regular Fit' },
              { value: 'slim_fit', label: 'Slim Fit' }
            ]}
            placeholder="Select Variant"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Size</label>
          <ModernSelect
            value={selectedSize}
            onChange={onSizeChange}
            options={[
              { value: 'all', label: 'All Sizes' },
              { value: 'S', label: 'Small' },
              { value: 'M', label: 'Medium' },
              { value: 'L', label: 'Large' },
              { value: 'XL', label: 'Extra Large' }
            ]}
            placeholder="Select Size"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <ModernSelect
            value={selectedStatus}
            onChange={onStatusChange}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'in_stock', label: 'In Stock' },
              { value: 'low_stock', label: 'Low Stock' },
              { value: 'out_of_stock', label: 'Out of Stock' }
            ]}
            placeholder="Select Status"
            className="w-full"
          />
        </div>
      </div>

      <motion.div 
        className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Active Filters:</span>
          {[selectedSchool, selectedType, selectedVariant, selectedSize, selectedStatus].filter(f => f !== 'all').map((filter, index) => (
            <span 
              key={index}
              className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-sm font-medium"
            >
              {filter}
            </span>
          ))}
        </div>
        <button 
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          onClick={() => {
            onSchoolChange({ target: { value: 'all' } });
            onTypeChange({ target: { value: 'all' } });
            onVariantChange({ target: { value: 'all' } });
            onSizeChange({ target: { value: 'all' } });
            onStatusChange({ target: { value: 'all' } });
          }}
        >
          Clear Filters
        </button>
      </motion.div>
    </div>
  );
};

export default DetailedInventoryFilters; 