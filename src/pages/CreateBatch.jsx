import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, X, ArrowLeft, Package, DollarSign, Search, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import useNotificationStore from '../stores/notificationStore';
import { useBatchStore } from '../stores/batchStore';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-hot-toast';

const CreateBatch = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuthStore();
  const { createBatchNotification } = useNotificationStore();

  // Create a ref to track current variant state
  const sizesRef = useRef({});

  // Basic batch info
  const [batchName, setBatchName] = useState('');
  const [type, setType] = useState('');
  const [typeOptions, setTypeOptions] = useState([]);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Variants list for the batch
  const [batchVariants, setBatchVariants] = useState([]);
  const [currentVariant, setCurrentVariant] = useState({
    name: '',
    color: '',
    price: '',
    sizes: {}
  });

  // Autocomplete options
  const [variantOptions, setVariantOptions] = useState([]);
  const [colorOptions, setColorOptions] = useState([]);
  const [sizeOptions, setSizeOptions] = useState([]);
  const [showVariantDropdown, setShowVariantDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);

  // New size input
  const [newSize, setNewSize] = useState('');
  const [newQuantity, setNewQuantity] = useState('');

  // Log state changes for debugging
  useEffect(() => {
    console.log('Current variant state updated:', currentVariant);
    console.log('Current sizes:', currentVariant.sizes);
    // Keep sizesRef in sync with state
    sizesRef.current = currentVariant.sizes;
  }, [currentVariant]);

  // Fetch existing options from database
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const batchesSnapshot = await getDocs(collection(db, 'batchInventory'));
        const types = new Set();
        const variants = new Set();
        const colors = new Set();
        const sizes = new Set();

        batchesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.type) types.add(data.type);
          
          data.items?.forEach(item => {
            if (item.variantType) variants.add(item.variantType);
            if (item.color) colors.add(item.color);
            item.sizes?.forEach(size => {
              if (size.size) sizes.add(size.size);
            });
          });
        });

        setTypeOptions(Array.from(types));
        setVariantOptions(Array.from(variants));
        setColorOptions(Array.from(colors));
        setSizeOptions(Array.from(sizes));
      } catch (error) {
        console.error('Error fetching options:', error);
      }
    };

    fetchOptions();
  }, []);

  // Calculate totals
  const totalQuantity = batchVariants.reduce((sum, variant) => 
    sum + Object.values(variant.sizes).reduce((a, b) => a + (parseInt(b) || 0), 0), 0
  );
  const totalValue = batchVariants.reduce((sum, variant) => 
    sum + Object.values(variant.sizes).reduce((a, b) => a + ((parseInt(b) || 0) * variant.price), 0), 0
  );

  const handleAddSize = () => {
    if (!newSize.trim()) {
      toast.error('Please enter a size.');
      return;
    }
    if (!newQuantity.trim()) {
      toast.error('Please enter a quantity.');
      return;
    }
    
    console.log('Adding size:', newSize, 'with quantity:', newQuantity);
    
    // Create a completely new object for sizes
    const newSizes = {};
    
    // Copy all existing sizes if any
    if (currentVariant.sizes) {
      Object.keys(currentVariant.sizes).forEach(key => {
        newSizes[key] = currentVariant.sizes[key];
      });
    }
    
    // Add the new size
    newSizes[newSize] = parseInt(newQuantity, 10);
    
    console.log('New sizes object created:', newSizes);
    
    // First update the ref for immediate access
    sizesRef.current = newSizes;
    console.log('Updated sizesRef:', sizesRef.current);
    
    // Then create a completely new variant object
    const updatedVariant = {
      name: currentVariant.name,
      color: currentVariant.color,
      price: currentVariant.price,
      sizes: newSizes
    };
    
    console.log('Setting currentVariant to:', updatedVariant);
    
    // Update the state with the new variant object
    setCurrentVariant(updatedVariant);

    setNewSize('');
    setNewQuantity('');
    toast.success(`Size ${newSize} added successfully!`);
  };

  const handleRemoveSize = (size) => {
    const newSizes = { ...currentVariant.sizes };
      delete newSizes[size];
    
    setCurrentVariant({
      ...currentVariant,
      sizes: newSizes
    });
    
    // Also update the ref
    sizesRef.current = newSizes;
  };

  const handleAddVariant = () => {
    console.log('handleAddVariant triggered');
    console.log('Current Variant State:', currentVariant);
    console.log('Sizes from ref:', sizesRef.current);
    
    // IMPORTANT: Always use the ref for sizes as it's more reliable
    const currentSizes = sizesRef.current;
    console.log('Current sizes being checked:', currentSizes);
    console.log('Size keys:', Object.keys(currentSizes));

    if (!currentVariant.name.trim()) {
      toast.error('Please enter a variant name.');
      console.log('Validation failed: Variant name is missing.');
      return;
    }
    if (!currentVariant.color.trim()) {
      toast.error('Please enter a color.');
      console.log('Validation failed: Color is missing.');
      return;
    }
    if (!currentVariant.price.trim()) {
      toast.error('Please enter a price.');
      console.log('Validation failed: Price is missing.');
      return;
    }
    if (Object.keys(currentSizes).length === 0) {
      toast.error('Please add at least one size.');
      console.log('Validation failed: No sizes added.');
      
      // Debug what happened with the size
      console.log('Debug - newSize:', newSize);
      console.log('Debug - newQuantity:', newQuantity);
      console.log('Debug - sizesRef current value:', sizesRef.current);
      
      // If we have size input but it's not in the ref, try adding it directly
      if (newSize && newQuantity) {
        console.log('Attempting emergency size addition');
        const emergencySizes = {};
        emergencySizes[newSize] = parseInt(newQuantity, 10);
        sizesRef.current = emergencySizes;
        
        // Try again with the emergency size
        if (Object.keys(sizesRef.current).length > 0) {
          console.log('Emergency size added, proceeding with variant addition');
        } else {
          return;
        }
      } else {
        return;
      }
    }

    console.log('Validation passed. Adding variant to batch.');
    
    // Create a complete variant object with sizes from ref
    const variantToAdd = {
      name: currentVariant.name,
      color: currentVariant.color,
      price: currentVariant.price,
      sizes: {...sizesRef.current} // Always use the ref
    };
    
    console.log('Adding variant:', variantToAdd);
    setBatchVariants(prev => [...prev, variantToAdd]);
    
    // Reset current variant
    setCurrentVariant({
      name: '',
      color: '',
      price: '',
      sizes: {}
    });
    
    // Reset sizes ref
    sizesRef.current = {};
    
    console.log('Variant added and currentVariant state reset.');
    toast.success('Variant added to batch!');
  };

  const handleRemoveVariant = (index) => {
    setBatchVariants(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateBatch = async () => {
    if (!type || !batchName || batchVariants.length === 0) return;

    try {
      const { user: authUser, userProfile } = useAuthStore.getState();
      
      // Construct full name from firstName and lastName if available
      const fullName = userProfile?.firstName && userProfile?.lastName 
        ? `${userProfile.firstName} ${userProfile.lastName}`.trim()
        : userProfile?.displayName || authUser?.displayName || authUser?.email || 'Unknown User';
      
      const userInfo = {
        id: authUser?.uid,
        name: fullName,
        fullName: fullName,
        email: authUser?.email
      };
      
      console.log('🔍 CreateBatch - userInfo:', userInfo);
      
      const batchData = {
        name: batchName,
        type: type,
        items: batchVariants.map(variant => ({
          variantType: variant.name,
          color: variant.color,
          price: parseFloat(variant.price),
          sizes: Object.entries(variant.sizes).map(([size, quantity]) => ({
            size,
            quantity: parseInt(quantity)
          })),
        })),
        totalQuantity,
        totalValue,
        createdBy: fullName,
        createdByUid: authUser?.uid,
        createdByRole: userRole,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Use batchStore.addBatch to create batch and notification
      const { addBatch } = useBatchStore.getState();
      await addBatch(batchData, userInfo);
      
      toast.success(`Batch "${batchName}" created successfully!`);
      navigate('/batches');
    } catch (error) {
      console.error('Error creating batch:', error);
    }
  };

  // Filter options based on input
  const filteredTypeOptions = typeOptions.filter(option => 
    option.toLowerCase().includes(type.toLowerCase())
  );
  const filteredVariantOptions = variantOptions.filter(option => 
    option.toLowerCase().includes(currentVariant.name.toLowerCase())
  );
  const filteredColorOptions = colorOptions.filter(option => 
    option.toLowerCase().includes(currentVariant.color.toLowerCase())
  );
  const filteredSizeOptions = sizeOptions.filter(option => 
    option.toLowerCase().includes(newSize.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/batches')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create New Batch</h1>
          <p className="text-gray-500 dark:text-gray-400 ml-0">Add a new batch of uniforms to inventory</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="col-span-2 space-y-6">
          {/* Batch Details */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Batch Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batch Name</label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="Enter batch name"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  required
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setShowTypeDropdown(true);
                  }}
                  onFocus={() => setShowTypeDropdown(true)}
                  placeholder="Enter uniform type (e.g., Shirts, Trousers)"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  required
                />
                {showTypeDropdown && filteredTypeOptions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-48 overflow-auto">
                    {filteredTypeOptions.map((option) => (
                      <div
                        key={option}
                        className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                        onClick={() => {
                          setType(option);
                          setShowTypeDropdown(false);
                        }}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Variants Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Variants</h2>
              </div>

              {/* Current Variant Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Variant Name</label>
                    <input
                      type="text"
                      value={currentVariant.name}
                      onChange={(e) => {
                        setCurrentVariant(prev => ({ ...prev, name: e.target.value }));
                        setShowVariantDropdown(true);
                      }}
                      onFocus={() => setShowVariantDropdown(true)}
                      placeholder="e.g., Short Sleeve"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    {showVariantDropdown && filteredVariantOptions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-48 overflow-auto">
                        {filteredVariantOptions.map((option) => (
                          <div
                            key={option}
                            className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                            onClick={() => {
                              setCurrentVariant(prev => ({ ...prev, name: option }));
                              setShowVariantDropdown(false);
                            }}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                    <input
                      type="text"
                      value={currentVariant.color}
                      onChange={(e) => {
                        setCurrentVariant(prev => ({ ...prev, color: e.target.value }));
                        setShowColorDropdown(true);
                      }}
                      onFocus={() => setShowColorDropdown(true)}
                      placeholder="e.g., White"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    {showColorDropdown && filteredColorOptions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-48 overflow-auto">
                        {filteredColorOptions.map((option) => (
                          <div
                            key={option}
                            className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                            onClick={() => {
                              setCurrentVariant(prev => ({ ...prev, color: option }));
                              setShowColorDropdown(false);
                            }}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price</label>
                    <input
                      type="number"
                      value={currentVariant.price}
                      onChange={(e) => setCurrentVariant(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="Enter price"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Size Input */}
                <div className="space-y-4">
                  <div className="flex items-end gap-4">
                    <div className="flex-1 relative">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Size</label>
                      <input
                        type="text"
                        value={newSize}
                        onChange={(e) => {
                          setNewSize(e.target.value);
                          setShowSizeDropdown(true);
                        }}
                        onFocus={() => setShowSizeDropdown(true)}
                        placeholder="e.g., XL, 32, etc."
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      {showSizeDropdown && filteredSizeOptions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-48 overflow-auto">
                          {filteredSizeOptions.map((option) => (
                            <div
                              key={option}
                              className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                              onClick={() => {
                                setNewSize(option);
                                setShowSizeDropdown(false);
                              }}
                            >
                              {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(e.target.value)}
                        placeholder="Enter quantity"
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                    </div>

                    <Button
                      onClick={() => {
                        console.log('Add Size button clicked');
                        handleAddSize();
                      }}
                      className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 px-4 py-3 rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Size
                    </Button>
                  </div>

                  {/* Size List */}
                  {Object.entries(currentVariant.sizes).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(currentVariant.sizes).map(([size, quantity]) => (
                        <div
                          key={size}
                          className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-lg"
                        >
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{size}: {quantity}</span>
                          <button
                            onClick={() => handleRemoveSize(size)}
                            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleAddVariant}
                    className="w-full bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors font-semibold"
                  >
                    <Plus className="w-5 h-5" />
                    Add Variant to Batch
                  </Button>
                </div>
              </div>

              {/* Added Variants List */}
              <div className="space-y-4">
                    {batchVariants.map((variant, index) => (
                  <div
                        key={index}
                    className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl flex justify-between items-center"
                      >
                          <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{variant.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{variant.color} - Price: ${variant.price}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(variant.sizes).map(([size, quantity]) => (
                          <span key={size} className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full">{size}: {quantity}</span>
                        ))}
                      </div>
                          </div>
                          <button
                            onClick={() => handleRemoveVariant(index)}
                      className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                          >
                      <Trash2 className="w-5 h-5" />
                          </button>
                  </div>
                ))}
                </div>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="col-span-1">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm space-y-6 sticky top-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Batch Summary</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Total Variants</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{batchVariants.length}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Total Quantity</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{totalQuantity} pcs</span>
              </div>
              
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600 dark:text-gray-400">Total Value</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">${totalValue.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={handleCreateBatch}
              className="w-full bg-red-600 text-white hover:bg-red-700 px-4 py-3 rounded-xl flex items-center justify-center gap-2"
              disabled={!type || !batchName || batchVariants.length === 0}
            >
              <Package className="w-5 h-5" />
              Create Batch
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBatch; 