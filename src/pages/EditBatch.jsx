import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../stores/authStore';
import { FiArrowLeft, FiPackage, FiSave } from 'react-icons/fi';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

function EditBatch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [batch, setBatch] = useState(null);
  const [batchName, setBatchName] = useState('');
  const [type, setType] = useState('');
  const [variants, setVariants] = useState([]);

  useEffect(() => {
    const fetchBatch = async () => {
      try {
        setLoading(true);
        const batchRef = doc(db, 'batchInventory', id);
        const batchSnap = await getDoc(batchRef);
        
        if (!batchSnap.exists()) {
          setError('Batch not found');
          return;
        }

        const batchData = batchSnap.data();
        setBatch(batchData);
        setBatchName(batchData.name || '');
        setType(batchData.type || '');
        setVariants(batchData.items || []);
      } catch (err) {
        console.error('Error fetching batch:', err);
        setError('Failed to load batch details');
      } finally {
        setLoading(false);
      }
    };

    fetchBatch();
  }, [id]);

  const handleUpdateBatch = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const batchRef = doc(db, 'batchInventory', id);
      
      await updateDoc(batchRef, {
        name: batchName,
        type,
        items: variants,
        updatedAt: new Date(),
        updatedBy: user.uid
      });

      navigate(`/batches/${id}`);
    } catch (err) {
      console.error('Error updating batch:', err);
      setError('Failed to update batch');
      setSaving(false);
    }
  };

  const handleVariantChange = (index, field, value) => {
    const updatedVariants = [...variants];
    updatedVariants[index] = {
      ...updatedVariants[index],
      [field]: value
    };
    setVariants(updatedVariants);
  };

  const handleSizeChange = (variantIndex, size, quantity) => {
    const updatedVariants = [...variants];
    const currentVariant = updatedVariants[variantIndex];
    
    // Convert sizes object to array if it's not already
    if (!Array.isArray(currentVariant.sizes)) {
      const sizesArray = Object.entries(currentVariant.sizes || {}).map(([size, quantity]) => ({
        size,
        quantity
      }));
      currentVariant.sizes = sizesArray;
    }

    // Update the size quantity in the array
    const sizeIndex = currentVariant.sizes.findIndex(s => s.size === size);
    if (sizeIndex >= 0) {
      currentVariant.sizes[sizeIndex].quantity = parseInt(quantity) || 0;
    } else {
      currentVariant.sizes.push({ size, quantity: parseInt(quantity) || 0 });
    }

    setVariants(updatedVariants);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center">
          <FiPackage className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Error</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={() => navigate('/batches')} variant="outline">
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Back to Batches
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/batches/${id}`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <FiArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Edit Batch</h1>
            <p className="text-gray-500 dark:text-gray-400">Update batch details and variants</p>
          </div>
        </div>

        <form onSubmit={handleUpdateBatch} className="space-y-8">
          {/* Batch Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm space-y-4"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Batch Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Batch Name
                </label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
            </div>
          </motion.div>

          {/* Variants */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm space-y-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Variants</h2>
            
            <div className="space-y-6">
              {variants.map((variant, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Variant Name
                      </label>
                      <input
                        type="text"
                        value={variant.variantType}
                        onChange={(e) => handleVariantChange(index, 'variantType', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border-0 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Color
                      </label>
                      <input
                        type="text"
                        value={variant.color}
                        onChange={(e) => handleVariantChange(index, 'color', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border-0 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Price
                      </label>
                      <input
                        type="number"
                        value={variant.price}
                        onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border-0 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  {/* Sizes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sizes
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {Array.isArray(variant.sizes) ? (
                        variant.sizes.map((sizeObj) => (
                          <div key={sizeObj.size} className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                {sizeObj.size}
                              </label>
                              <input
                                type="number"
                                value={sizeObj.quantity}
                                onChange={(e) => handleSizeChange(index, sizeObj.size, e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border-0 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100"
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        // Handle legacy object format
                        Object.entries(variant.sizes || {}).map(([size, quantity]) => (
                          <div key={size} className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                {size}
                              </label>
                              <input
                                type="number"
                                value={quantity}
                                onChange={(e) => handleSizeChange(index, size, e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border-0 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100"
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/batches/${id}`)}
              className="bg-transparent dark:bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {saving ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <FiSave className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditBatch; 