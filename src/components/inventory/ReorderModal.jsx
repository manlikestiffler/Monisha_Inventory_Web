import { useState, useEffect } from 'react';
import { X, Package, AlertTriangle, TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useAuthStore } from '../../stores/authStore';
import useNotificationStore from '../../stores/notificationStore';
import toast from 'react-hot-toast';

const ReorderModal = ({ isOpen, onClose, variant, size, currentStock, reorderLevel, batchId, product }) => {
  const [quantityToReorder, setQuantityToReorder] = useState(10);
  const [loading, setLoading] = useState(false);
  const [batchStock, setBatchStock] = useState(null);
  const [loadingBatchStock, setLoadingBatchStock] = useState(false);
  const [noBatchIdError, setNoBatchIdError] = useState(false);

  // Internal state for the modal, derived from props
  const [selectedVariant, setSelectedVariant] = useState(variant);
  const [selectedSize, setSelectedSize] = useState(size);
  const [selectedCurrentStock, setSelectedCurrentStock] = useState(currentStock);
  const [selectedReorderLevel, setSelectedReorderLevel] = useState(reorderLevel);

  const { reorderFromBatch } = useInventoryStore();
  const { user } = useAuthStore();
  const { createStockUpdateNotification } = useNotificationStore();

  // Effect 1: Synchronize internal state with props when the modal opens or props change.
  useEffect(() => {
    if (isOpen) {
      setSelectedVariant(variant);
      setSelectedSize(size);
      setSelectedCurrentStock(Number(currentStock) || 0);
      const effectiveReorderLevel = Number(reorderLevel) || 5;
      setSelectedReorderLevel(effectiveReorderLevel);
      setQuantityToReorder(effectiveReorderLevel * 2);
    }
  }, [isOpen, variant, size, currentStock, reorderLevel]);

  // Effect 2: Fetch batch stock whenever the identifying information changes.
  useEffect(() => {
    if (isOpen && batchId && variant && size) {
      fetchBatchStock(batchId, variant, size);
    }
  }, [isOpen, batchId, variant, size]);

  // Handle variant change
  const handleVariantChange = (variantId) => {
    const newVariant = product?.variants?.find(v => v.id === variantId);
    if (newVariant && newVariant.sizes && newVariant.sizes.length > 0) {
      const firstSize = newVariant.sizes[0];
      setSelectedVariant({
        id: newVariant.id || variantId,
        color: newVariant.color,
        variantType: newVariant.variantType
      });
      setSelectedSize(firstSize.size);
      setSelectedCurrentStock(Number(firstSize.quantity) || 0);
      setSelectedReorderLevel(firstSize.reorderLevel || newVariant.defaultReorderLevel || 5);
    }
  };

  // Handle size change
  const handleSizeChange = (sizeValue) => {
    const currentVariant = product?.variants?.find(v => v.id === selectedVariant.id);
    const sizeData = currentVariant?.sizes?.find(s => s.size === sizeValue);
    if (sizeData) {
      setSelectedSize(sizeValue);
      setSelectedCurrentStock(Number(sizeData.quantity) || 0);
      setSelectedReorderLevel(sizeData.reorderLevel || currentVariant.defaultReorderLevel || 5);
    }
  };

  const fetchBatchStock = async (currentBatchId, currentVariant, currentSize) => {
    if (!currentBatchId || !currentVariant) {
      console.error('Missing batchId or variant:', { batchId: currentBatchId, variant: currentVariant });
      setNoBatchIdError(true);
      return;
    }

    setLoadingBatchStock(true);
    setNoBatchIdError(false); // Reset error state
    try {
      console.log('🔍 Fetching batch stock for:', { batchId: currentBatchId, variant: currentVariant, size: currentSize });
      const batchRef = doc(db, 'batchInventory', currentBatchId);
      const batchDoc = await getDoc(batchRef);
      
      if (!batchDoc.exists()) {
        console.error('❌ Batch document not found:', batchId);
        toast.error(`Batch not found: ${batchId}`);
        setNoBatchIdError(true);
        return;
      }
      
      const batchData = batchDoc.data();
      console.log('Batch data:', batchData);
      console.log('Looking for variant:', { variantType: currentVariant.variantType, color: currentVariant.color, size: currentSize });
      
      // Find matching batch item - try multiple field combinations
      const matchingItem = batchData.items?.find(item => {
        // Standardize the names from both batch item and selected variant
        const itemVariantType = (item.variantType || item.name || item.variant || '').toLowerCase();
        const itemColor = (item.color || '').toLowerCase();
        const variantType = (currentVariant.variantType || currentVariant.variant || '').toLowerCase();
        const variantColor = (currentVariant.color || '').toLowerCase();

        console.log('Comparing batch item:', { itemVariantType, itemColor }, 'with selected variant:', { variantType, variantColor });

        // Perform a case-insensitive comparison
        return itemVariantType === variantType && itemColor === variantColor;
      });
      
      if (matchingItem) {
        const matchingSize = matchingItem.sizes?.find(s => s.size === currentSize);
        if (matchingSize) {
          setBatchStock(matchingSize.quantity);
          console.log('Found batch stock:', matchingSize.quantity, 'for size', currentSize);
        } else {
          console.warn('Size not found in batch item');
          setBatchStock(null);
        }
      } else {
        console.warn('Matching item not found in batch');
        setBatchStock(null);
      }
    } catch (error) {
      console.error('Error fetching batch stock:', error);
      toast.error('Failed to fetch batch inventory');
    } finally {
      setLoadingBatchStock(false);
    }
  };

  const handleReorder = async (e) => {
    e.preventDefault(); // Prevent form submission and page reload
    console.log('🔄 Reorder clicked with:', { batchId, variant, size, quantityToReorder });
    
    if (!batchId) {
      toast.error('No batch ID found. Cannot reorder.');
      return;
    }

    if (quantityToReorder <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (batchStock !== null && quantityToReorder > batchStock) {
      toast.error(`Cannot reorder ${quantityToReorder} units. Only ${batchStock} available in batch.`);
      return;
    }

    setLoading(true);
    try {
      // Get user profile to construct full name
      const { user: authUser, userProfile } = useAuthStore.getState();
      const fullName = userProfile?.firstName && userProfile?.lastName 
        ? `${userProfile.firstName} ${userProfile.lastName}`.trim()
        : userProfile?.displayName || authUser?.displayName || authUser?.email?.split('@')[0] || 'Unknown User';
      
      const userInfo = {
        id: authUser?.uid,
        name: fullName,
        fullName: fullName,
        email: authUser?.email
      };
      
      console.log('📦 ReceiveStock - userInfo:', userInfo);
      console.log('📦 ReceiveStock - quantity:', quantityToReorder);
      console.log('📦 ReceiveStock - selectedVariant:', selectedVariant);
      console.log('📦 ReceiveStock - selectedVariant.id:', selectedVariant?.id);
      console.log('📦 ReceiveStock - variant prop:', variant);
      console.log('📦 ReceiveStock - variant.id:', variant?.id);
      
      // Use the variant.id from props if selectedVariant.id is undefined
      const variantId = selectedVariant?.id || variant?.id;
      console.log('📦 ReceiveStock - final variantId:', variantId);
      
      if (!variantId) {
        throw new Error('Variant ID is missing. Cannot proceed with reorder.');
      }
      
      await reorderFromBatch(
        variantId,
        batchId,
        selectedSize,
        quantityToReorder,
        authUser?.uid || 'unknown',
        fullName
      );

      // Create notification for stock update with proper userInfo
      const { addNotification } = useNotificationStore.getState();
      await addNotification({
        type: 'stock_updated',
        title: 'Stock Updated',
        message: `${product?.name || 'Product'} (${selectedVariant.color} - Size ${selectedSize}) received ${quantityToReorder} units`,
        category: 'inventory',
        priority: 'low',
        icon: '📈'
      }, userInfo);

      toast.success(`Successfully received ${quantityToReorder} units of ${selectedVariant.color} - Size ${selectedSize}`);
      
      // Close modal without reloading - let real-time listeners handle updates
      onClose();
    } catch (error) {
      console.error('Reorder error:', error);
      toast.error(error.message || 'Failed to reorder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const stockStatus = selectedCurrentStock === 0 ? 'OUT_OF_STOCK' : selectedCurrentStock <= selectedReorderLevel ? 'LOW_STOCK' : 'IN_STOCK';

  // Show error if no batch ID is available
  if (noBatchIdError) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl max-w-lg w-full p-8 space-y-6 border border-red-100 dark:border-red-900/30"
          >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Cannot Receive Stock
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Missing Batch Information
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 hover:rotate-90"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Error Message */}
          <div className="p-6 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border-2 border-red-200 dark:border-red-700/50 rounded-2xl">
            <h3 className="font-bold text-base text-red-900 dark:text-red-100 mb-3">
              🚫 Product Not Linked to Batch
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">
              This product doesn't have batch information attached to it. To enable receiving stock:
            </p>
            <ul className="text-sm text-red-700 dark:text-red-300 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Delete this product and recreate it from a batch, OR</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Manually add stock by editing the product quantities</span>
              </li>
            </ul>
          </div>

          {/* Product Info */}
          <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-800/30 rounded-2xl border border-gray-200 dark:border-gray-600">
            <div className="text-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Color:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{selectedVariant?.color || 'N/A'}</span>
              </div>
              <div className="h-px bg-gray-200 dark:bg-gray-600"></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Size:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{selectedSize}</span>
              </div>
              <div className="h-px bg-gray-200 dark:bg-gray-600"></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Current Stock:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{selectedCurrentStock}</span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-6 py-4 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-800 dark:text-gray-200 rounded-2xl hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
          >
            Close
          </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl max-w-2xl w-full border border-indigo-100 dark:border-indigo-900/30 max-h-[90vh] overflow-hidden flex flex-col"
        >
        {/* Modal Content with Scroll */}
        <div className="overflow-y-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-4 rounded-2xl shadow-lg ${
              stockStatus === 'OUT_OF_STOCK' ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/30' :
              stockStatus === 'LOW_STOCK' ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/30' :
              'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30'
            } text-white`}>
              <Package className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Receive Stock
                <Sparkles className="w-5 h-5 text-indigo-500" />
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {selectedVariant.color} • Size {selectedSize}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 hover:rotate-90"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Variant and Size Selector */}
        {product?.variants && product.variants.length > 0 && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                Select Variant
              </label>
              <select
                value={selectedVariant.id}
                onChange={(e) => handleVariantChange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-gray-700 dark:text-white font-medium transition-all duration-200"
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.color} - {v.variantType}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                Select Size
              </label>
              <select
                value={selectedSize}
                onChange={(e) => handleSizeChange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-gray-700 dark:text-white font-medium transition-all duration-200"
              >
                {product.variants
                  .find(v => v.id === selectedVariant.id)?.sizes?.map((s) => (
                    <option key={s.size} value={s.size}>
                      Size {s.size} ({s.quantity || 0} in stock)
                    </option>
                  ))}
              </select>
            </div>
          </motion.div>
        )}

        {/* Batch Stock Info */}
        {loadingBatchStock ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-800/30 rounded-2xl flex items-center justify-center space-x-3 border border-gray-200 dark:border-gray-600"
          >
            <div className="w-5 h-5 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Loading batch inventory...</span>
          </motion.div>
        ) : batchStock !== null ? (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-5 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-2 border-indigo-200 dark:border-indigo-700/50 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                📦 Available in Batch
              </span>
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {batchStock}
              </span>
            </div>
            <p className="text-xs text-indigo-700 dark:text-indigo-300">
              Size {selectedSize} • {selectedVariant.color}
            </p>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-5 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-2 border-amber-200 dark:border-amber-700/50 rounded-2xl"
          >
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              ⚠️ Could not find batch inventory for this item
            </p>
          </motion.div>
        )}

        {/* Stock Status Alert */}
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={`p-5 rounded-2xl flex items-start space-x-3 border-2 ${
            stockStatus === 'OUT_OF_STOCK' ? 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200' :
            stockStatus === 'LOW_STOCK' ? 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200' :
            'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200'
          }`}>
          <AlertTriangle className={`w-6 h-6 mt-0.5 ${
            stockStatus === 'OUT_OF_STOCK' ? 'text-red-600' :
            stockStatus === 'LOW_STOCK' ? 'text-amber-600' :
            'text-emerald-600'
          }`} />
          <div className="flex-1">
            <h3 className={`font-bold text-base ${
              stockStatus === 'OUT_OF_STOCK' ? 'text-red-900' :
              stockStatus === 'LOW_STOCK' ? 'text-amber-900' :
              'text-emerald-900'
            }`}>
              {stockStatus === 'OUT_OF_STOCK' ? '🔴 Out of Stock' :
               stockStatus === 'LOW_STOCK' ? '⚠️ Low Stock Alert' :
               '✅ Restock Inventory'}
            </h3>
            <p className={`text-sm mt-1 ${
              stockStatus === 'OUT_OF_STOCK' ? 'text-red-700' :
              stockStatus === 'LOW_STOCK' ? 'text-amber-700' :
              'text-emerald-700'
            }`}>
              Current stock: <span className="font-bold">{selectedCurrentStock}</span> | 
              Reorder level: <span className="font-bold">{selectedReorderLevel}</span>
            </p>
          </div>
        </motion.div>

        {/* Reorder Quantity Input */}
        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
            Quantity to Receive
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              value={quantityToReorder}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || value === '0') {
                  setQuantityToReorder(0);
                } else {
                  const numValue = parseInt(value);
                  if (!isNaN(numValue) && numValue >= 0) {
                    setQuantityToReorder(numValue);
                  }
                }
              }}
              className="w-full px-5 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-lg font-semibold transition-all duration-200"
              placeholder="Enter quantity"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 dark:text-gray-400">
              units
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            Suggested: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{selectedReorderLevel ? selectedReorderLevel * 2 : 10} units</span> (2x reorder level)
          </p>
          {batchStock !== null && (
            <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Package className="w-3 h-3 text-blue-500" />
              Available in batch: <span className="font-semibold text-blue-600 dark:text-blue-400">{batchStock} units</span>
            </p>
          )}
          {batchStock !== null && quantityToReorder > batchStock && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl">
              <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Cannot receive {quantityToReorder} units. Only {batchStock} available in batch.
              </p>
            </div>
          )}
        </motion.div>

        {/* Stock After Reorder Preview */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-5 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl border-2 border-emerald-200 dark:border-emerald-700/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
              📈 Stock After Receiving
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {(selectedCurrentStock || 0) + (quantityToReorder || 0)}
              </span>
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex space-x-3 pt-2"
        >
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-5 py-4 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-800 dark:text-gray-200 rounded-2xl hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-200 font-semibold disabled:opacity-50 shadow-md hover:shadow-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleReorder}
            disabled={loading || quantityToReorder <= 0 || (batchStock !== null && quantityToReorder > batchStock)}
            className="flex-1 px-5 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/30 hover:shadow-xl"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Receive {quantityToReorder} Units</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Info Note */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-center text-gray-600 dark:text-gray-400 pt-2"
        >
          💡 This will deduct from batch inventory and add to product inventory with full audit trail
        </motion.p>
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReorderModal;
