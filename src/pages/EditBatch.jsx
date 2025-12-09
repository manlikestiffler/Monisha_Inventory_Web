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

        // Normalize items to ensure sizes are arrays
        const normalizedItems = (batchData.items || []).map(item => ({
          ...item,
          sizes: Array.isArray(item.sizes)
            ? item.sizes
            : Object.entries(item.sizes || {}).map(([size, quantity]) => ({ size, quantity }))
        }));

        setVariants(normalizedItems);
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

  const handleAddSize = (variantIndex) => {
    const updatedVariants = [...variants];
    const currentVariant = updatedVariants[variantIndex];

    // Ensure sizes is an array
    if (!Array.isArray(currentVariant.sizes)) {
      const sizesArray = Object.entries(currentVariant.sizes || {}).map(([size, quantity]) => ({
        size,
        quantity
      }));
      currentVariant.sizes = sizesArray;
    }

    currentVariant.sizes.push({ size: '', quantity: 0 });
    setVariants(updatedVariants);
  };

  const handleRemoveSize = (variantIndex, sizeIndex) => {
    const updatedVariants = [...variants];
    const currentVariant = updatedVariants[variantIndex];

    if (Array.isArray(currentVariant.sizes)) {
      currentVariant.sizes.splice(sizeIndex, 1);
      setVariants(updatedVariants);
    }
  };

  const handleSizeUpdate = (variantIndex, sizeIndex, field, value) => {
    const updatedVariants = [...variants];
    const currentVariant = updatedVariants[variantIndex];

    if (Array.isArray(currentVariant.sizes)) {
      currentVariant.sizes[sizeIndex][field] = field === 'quantity' ? (parseInt(value) || 0) : value;
      setVariants(updatedVariants);
    }
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
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Sizes
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddSize(index)}
                        className="text-xs py-1 h-auto"
                      >
                        + Add Size
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {Array.isArray(variant.sizes) ? (
                        variant.sizes.map((sizeObj, sizeIndex) => (
                          <div key={sizeIndex} className="flex flex-col gap-1 p-2 border border-gray-100 dark:border-gray-700 rounded-lg relative group">
                            <button
                              type="button"
                              onClick={() => handleRemoveSize(index, sizeIndex)}
                              className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove size"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                              </svg>
                            </button>
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                                Size
                              </label>
                              <input
                                type="text"
                                value={sizeObj.size}
                                onChange={(e) => handleSizeUpdate(index, sizeIndex, 'size', e.target.value)}
                                placeholder="Size"
                                className="w-full px-2 py-1.5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-red-500 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                                Qty
                              </label>
                              <input
                                type="number"
                                value={sizeObj.quantity}
                                onChange={(e) => handleSizeUpdate(index, sizeIndex, 'quantity', e.target.value)}
                                placeholder="Qty"
                                className="w-full px-2 py-1.5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-red-500 text-sm"
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        // Handle legacy object format by converting to array first (this should be handled by useEffect but safe to keep fallback or just migrate)
                        Object.entries(variant.sizes || {}).map(([size, quantity], i) => (
                          <div key={i} className="flex items-center gap-2">
                            {/* Legacy display - ideally we convert this on load */}
                            <span className="text-sm">{size}: {quantity}</span>
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