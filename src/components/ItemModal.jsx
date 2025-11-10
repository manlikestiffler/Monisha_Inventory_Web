import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './ui/Button';
import Card from './ui/Card';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

const ItemModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  item = null,
  categories = []
}) => {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    quantity: 0,
    price: 0,
    category: '',
    description: '',
    minStockLevel: 10,
    supplier: '',
    sku: '',
    location: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData(prev => ({ ...prev, ...item }));
    }
  }, [item]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (formData.quantity < 0) newErrors.quantity = 'Quantity cannot be negative';
    if (formData.price <= 0) newErrors.price = 'Price must be greater than 0';
    if (!formData.category) newErrors.category = 'Category is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      try {
        await onSubmit(formData);
        onClose();
      } catch (error) {
        setErrors({ submit: error.message });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setErrors(newErrors);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-2xl"
          >
            <Card className={isDark ? 'bg-gray-900' : 'bg-white'}>
              <div className={`flex justify-between items-center p-6 border-b ${
                isDark ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <h2 className={`text-xl font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {item ? 'Edit Item' : 'Add New Item'}
                </h2>
                <button
                  onClick={onClose}
                  className={`${
                    isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-500'
                  } transition-colors`}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      } mb-1`}>
                        Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md ${
                          errors.name 
                            ? 'border-red-500' 
                            : isDark 
                              ? 'border-gray-600 bg-gray-800 text-white' 
                              : 'border-gray-300 bg-white text-black'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      } mb-1`}>
                        Category
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md ${
                          errors.category 
                            ? 'border-red-500' 
                            : isDark 
                              ? 'border-gray-600 bg-gray-800 text-white' 
                              : 'border-gray-300 bg-white text-black'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        <option value="">Select a category</option>
                        {categories.map(category => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                        <option value="new">+ Add New Category</option>
                      </select>
                      {errors.category && (
                        <p className="mt-1 text-sm text-red-500">{errors.category}</p>
                      )}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      } mb-1`}>
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="3"
                        className={`w-full px-3 py-2 border rounded-md ${
                          isDark 
                            ? 'border-gray-600 bg-gray-800 text-white' 
                            : 'border-gray-300 bg-white text-black'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>
                  </div>

                  {/* Inventory Details */}
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      } mb-1`}>
                        Quantity
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        min="0"
                        className={`w-full px-3 py-2 border rounded-md ${
                          errors.quantity 
                            ? 'border-red-500' 
                            : isDark 
                              ? 'border-gray-600 bg-gray-800 text-white' 
                              : 'border-gray-300 bg-white text-black'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                      {errors.quantity && (
                        <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>
                      )}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      } mb-1`}>
                        Price
                      </label>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className={`w-full px-3 py-2 border rounded-md ${
                          errors.price 
                            ? 'border-red-500' 
                            : isDark 
                              ? 'border-gray-600 bg-gray-800 text-white' 
                              : 'border-gray-300 bg-white text-black'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                      {errors.price && (
                        <p className="mt-1 text-sm text-red-500">{errors.price}</p>
                      )}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      } mb-1`}>
                        Minimum Stock Level
                      </label>
                      <input
                        type="number"
                        name="minStockLevel"
                        value={formData.minStockLevel}
                        onChange={handleChange}
                        min="0"
                        className={`w-full px-3 py-2 border rounded-md ${
                          isDark 
                            ? 'border-gray-600 bg-gray-800 text-white' 
                            : 'border-gray-300 bg-white text-black'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    } mb-1`}>
                      Supplier
                    </label>
                    <input
                      type="text"
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md ${
                        isDark 
                          ? 'border-gray-600 bg-gray-800 text-white' 
                          : 'border-gray-300 bg-white text-black'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    } mb-1`}>
                      SKU
                    </label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md ${
                        isDark 
                          ? 'border-gray-600 bg-gray-800 text-white' 
                          : 'border-gray-300 bg-white text-black'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    } mb-1`}>
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md ${
                        isDark 
                          ? 'border-gray-600 bg-gray-800 text-white' 
                          : 'border-gray-300 bg-white text-black'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>
                </div>

                {errors.submit && (
                  <p className="text-sm text-red-500">{errors.submit}</p>
                )}

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    className={isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {isSubmitting ? 'Saving...' : item ? 'Save Changes' : 'Add Item'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ItemModal; 