import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '../config/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, getDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { HexColorPicker } from 'react-colorful';
import SchoolSelect from '../components/SchoolSelect';
import { UNIFORM_CATEGORIES } from '../constants/uniforms';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { useInventoryStore } from '../stores/inventoryStore';
import useNotificationStore from '../stores/notificationStore';
import React from 'react'; // Added for useMemo
import Lottie from "lottie-react";
import successAnimation from "../assets/Checkmark Burst.json";

const findUserByEmail = async (email) => {
  // First, check the inventory_managers collection
  let q = query(collection(db, 'inventory_managers'), where('email', '==', email));
  let querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
  }

  // If not found, check the inventory_staff collection
  q = query(collection(db, 'inventory_staff'), where('email', '==', email));
  querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
  }

  return null;
};

const PRODUCT_TYPES = {
  UNIFORM: 'uniform',
  RAW_MATERIAL: 'raw_material'
};

const RAW_MATERIAL_TYPES = ['Fabric', 'Thread', 'Buttons', 'Zippers', 'Elastic', 'Labels', 'Packaging'];
const UNITS = ['Meters', 'Yards', 'Pieces', 'Kilograms', 'Grams', 'Dozen', 'Box'];

// Reusable Components
const Section = ({ title, description, children }) => (
  <div className="mb-8">
    <div className="mb-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-foreground">{title}</h2>
      <p className="text-gray-500 dark:text-muted-foreground mt-1">{description}</p>
    </div>
    <div>
      {children}
    </div>
  </div>
);

const Input = (props) => (
  <input {...props} className={`block w-full h-12 px-4 rounded-lg bg-white dark:bg-background text-gray-900 dark:text-foreground border border-gray-300 dark:border-input placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 ${props.className || ''}`} />
);

const Select = (props) => (
  <select {...props} className={`block w-full h-12 px-4 rounded-lg bg-white dark:bg-background text-gray-900 dark:text-foreground border border-gray-300 dark:border-input focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 appearance-none pr-10 ${props.className || ''}`} style={{
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8L9.5 4.5' stroke='%23888888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 1rem center",
    backgroundSize: "12px"
  }} />
);

const Label = ({ children, ...props }) => (
  <label {...props} className="block text-sm font-medium text-muted-foreground mb-2">{children}</label>
);

const FormField = ({ label, children }) => (
  <div className="mb-6">
    <p className="text-gray-700 dark:text-muted-foreground text-sm font-medium mb-2">{label}</p>
    {children}
  </div>
);

const AddProductNew = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addProduct } = useInventoryStore();
  const { createProductNotification } = useNotificationStore();
  const [loading, setLoading] = useState(false);
  const [productType, setProductType] = useState(PRODUCT_TYPES.UNIFORM);
  const [error, setError] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showVariantColorPicker, setShowVariantColorPicker] = useState(false);
  const [showRawMaterialColorPicker, setShowRawMaterialColorPicker] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(null);
  const [batches, setBatches] = useState([]);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [availableVariants, setAvailableVariants] = useState({});
  const [availableSizes, setAvailableSizes] = useState({});
  const [availableColors, setAvailableColors] = useState({});
  const [availableQuantities, setAvailableQuantities] = useState({});
  const [availableQuantitiesBySize, setAvailableQuantitiesBySize] = useState({});
  const [batchId, setBatchId] = useState('');
  const [activeBatches, setActiveBatches] = useState([]);

  const [uniformData, setUniformData] = useState({
    name: '',
    school: '',
    category: UNIFORM_CATEGORIES[0],
    type: '',
    gender: '',
    level: 'JUNIOR',
    image: null,
    imageUrl: '',
    variants: []
  });

  const [rawMaterialData, setRawMaterialData] = useState({
    name: '', type: RAW_MATERIAL_TYPES[0], unit: UNITS[0], price: '', quantity: '', color: '#000000'
  });

  // Fetch and process batches when component mounts
  useEffect(() => {
    const loadAndProcessBatches = async () => {
      setLoading(true);
      try {
        const batchesSnapshot = await getDocs(collection(db, "batchInventory"));
        const fetchedBatches = batchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log("DEBUG: All batches fetched:", fetchedBatches);
        
        // Filter active batches
        const activeBatchesData = fetchedBatches.filter(batch => batch.status === "active");
        setBatches(activeBatchesData);
        setActiveBatches(activeBatchesData);
        
        // Process batches to extract available types, variants, and sizes
        const variantsByType = {};
        const sizesByVariant = {};
        const colorsByVariant = {};
        const quantitiesByType = {};
        const quantitiesBySize = {};
        
        activeBatchesData.forEach(batch => {
          console.log(`DEBUG: Processing batch: ${batch.name}`, batch);
          
          if (batch.type) {
            if (!variantsByType[batch.type]) {
              variantsByType[batch.type] = new Set();
            }
            if (!quantitiesByType[batch.type]) {
              quantitiesByType[batch.type] = 0;
            }
          }
          
          if (batch.items && Array.isArray(batch.items)) {
            batch.items.forEach(variantItem => {
              console.log(`DEBUG: Processing variant item:`, variantItem);
              
              if (variantItem.variantType) {
                console.log(`DEBUG: Found variant type: ${variantItem.variantType}`);
                variantsByType[batch.type].add(variantItem.variantType);
                
                const variantKey = `${batch.type}|${variantItem.variantType}`;
                if (!sizesByVariant[variantKey]) sizesByVariant[variantKey] = new Set();
                if (!colorsByVariant[variantKey]) colorsByVariant[variantKey] = new Set();
                
                if (variantItem.color) {
                  colorsByVariant[variantKey].add(variantItem.color);
                }
                
                variantItem.sizes?.forEach(size => {
                  if (size.size && size.quantity > 0) {
                    sizesByVariant[variantKey].add(size.size);
                    quantitiesByType[batch.type] += size.quantity;
                    const sizeKey = `${variantKey}|${size.size}`;
                    quantitiesBySize[sizeKey] = (quantitiesBySize[sizeKey] || 0) + size.quantity;
                  }
                });
              } else {
                console.log(`DEBUG: No variantType found in item`);
              }
            });
          } else {
            console.log(`DEBUG: No items array found in batch or it's not an array`);
          }
        });
        
        // Convert Sets to Arrays
        const availableTypes = Object.keys(variantsByType);
        
        const availableVariants = {};
        Object.entries(variantsByType).forEach(([type, variants]) => {
          availableVariants[type] = Array.from(variants);
        });
        
        const availableSizes = {};
        Object.entries(sizesByVariant).forEach(([variantKey, sizes]) => {
          availableSizes[variantKey] = Array.from(sizes);
        });
        
        const availableColors = {};
        Object.entries(colorsByVariant).forEach(([variantKey, colors]) => {
          availableColors[variantKey] = Array.from(colors);
        });
        
        console.log("DEBUG: Available types:", availableTypes);
        console.log("DEBUG: Available variants:", availableVariants);
        console.log("DEBUG: Available sizes:", availableSizes);
        console.log("DEBUG: Available colors:", availableColors);
        console.log("DEBUG: Available quantities:", quantitiesByType);
        console.log("DEBUG: Available quantities by size:", quantitiesBySize);
        
        setAvailableTypes(availableTypes);
        setAvailableVariants(availableVariants);
        setAvailableSizes(availableSizes);
        setAvailableColors(availableColors);
        setAvailableQuantities(quantitiesByType);
        setAvailableQuantitiesBySize(quantitiesBySize);
        
      } catch (error) {
        console.error("Error loading batches:", error);
        setError("Failed to load batches");
      } finally {
        setLoading(false);
      }
    };
    
    loadAndProcessBatches();
  }, []);

  // Add this useEffect after the existing useEffect hooks
  useEffect(() => {
    console.log("DEBUG: Current uniformData state:", uniformData);
    console.log("DEBUG: Current type:", uniformData.type);
    console.log("DEBUG: Current variants:", uniformData.variants);
    
    // If a type is selected but no variants exist, initialize with a default variant
    if (uniformData.type && uniformData.variants.length === 0) {
      console.log("DEBUG: Type selected but no variants, initializing default variant");
      addVariant();
    }
  }, [uniformData.type]);

  // Add this useEffect to ensure variants are displayed when the component mounts
  useEffect(() => {
    // Check if a type is selected but no variants are present
    if (uniformData.type && uniformData.variants.length === 0) {
      console.log("DEBUG: Type is selected but no variants present, adding variants via effect");
      
      // Force add a variant
      addVariant();
    }
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) setUniformData(prev => ({ ...prev, image: file, imageUrl: URL.createObjectURL(file) }));
  };

  const handleUniformChange = (field, value) => {
    if (field === 'type') {
      console.log("DEBUG: Type changed to:", value);
      console.log("DEBUG: *** TYPE SELECTION DETECTED ***");
      
      if (!value) {
        // If empty type is selected (Select Type option), just update the type
        setUniformData({
          ...uniformData,
          type: value,
          variants: []
        });
        return;
      }
      
      // Get available variants for this type
      const variantsForType = availableVariants[value] || [];
      console.log("DEBUG: Available variants for selected type:", variantsForType);
      
      // Create a variant based on available data
      let initialVariant;
      
      if (variantsForType.length > 0) {
        const firstVariant = variantsForType[0];
        const variantKey = `${value}|${firstVariant}`;
        const sizesForVariant = availableSizes[variantKey] || [];
        const colorsForVariant = availableColors[variantKey] || [];
        
        console.log("DEBUG: Using first variant:", firstVariant);
        console.log("DEBUG: Available sizes:", sizesForVariant);
        console.log("DEBUG: Available colors:", colorsForVariant);
        
        initialVariant = {
          variant: firstVariant,
          color: colorsForVariant.length > 0 ? colorsForVariant[0] : '#000000',
          sizes: [{
            size: sizesForVariant.length > 0 ? sizesForVariant[0] : 'Default',
            quantity: '',
            price: ''
          }]
        };
        setBatchId(activeBatches.find(b => b.type === value)?.id || '');
      } else {
        console.log("DEBUG: No variants available, using default");
        initialVariant = {
          variant: 'Default',
          color: '#000000',
          sizes: [{ size: 'Default', quantity: '', price: '' }]
        };
      }
      
      // Update state with the new type and initial variant
      console.log("DEBUG: Setting initial variant:", initialVariant);
      
      // Use a direct state update to ensure it happens immediately
      setUniformData({
        ...uniformData,
        type: value,
        variants: [initialVariant]
      });
      
      // Also log after the update
      setTimeout(() => {
        console.log("DEBUG: After state update - uniformData:", {
          type: value,
          variants: [initialVariant]
        });
        
        // Add a toast notification to confirm the type was selected
        toast.success(`Type "${value}" selected with default variant`);
      }, 0);
    } else {
      setUniformData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  
  const handleRawMaterialChange = (field, value) => setRawMaterialData(prev => ({ ...prev, [field]: value }));

  // Optimize variant change handler for better performance
  const handleVariantChange = (i, field, value) => {
    console.log(`DEBUG: Changing variant ${i} ${field} to ${value}`);
    
    // Use functional state update to ensure we have the latest state
    setUniformData(prev => {
      const newVariants = [...prev.variants];
      newVariants[i] = { ...newVariants[i], [field]: value };

      // Special handling for variant type change
      if (field === 'variant') {
        const variantKey = `${prev.type}|${value}`;
        const sizesForNewVariant = availableSizes[variantKey] || [];
        const firstSize = sizesForNewVariant.length > 0 ? sizesForNewVariant[0] : 'Default';
        const colorsForNewVariant = availableColors[variantKey] || [];
        const firstColor = colorsForNewVariant.length > 0 ? colorsForNewVariant[0] : '#000000';
        
        // Only reset sizes if there's valid size data for this variant
        if (sizesForNewVariant.length > 0) {
          newVariants[i].sizes = [{ size: firstSize, quantity: '', price: '' }];
        }
        
        // Only update color if there's valid color data
        if (colorsForNewVariant.length > 0) {
          newVariants[i].color = firstColor;
        }
        
        toast.success(`Variant type changed to "${value}"`);
      }
      
      return { ...prev, variants: newVariants };
    });
  };

  // Optimize size change handler for better performance
  const handleSizeChange = (variantIndex, sizeIndex, field, value) => {
    if (field === 'quantity') {
      const requestedQuantity = parseInt(value, 10);
      
      if (value !== '' && (isNaN(requestedQuantity) || requestedQuantity < 0)) {
        return; // Ignore invalid numeric input
      }

      const variant = uniformData.variants[variantIndex];
      const size = variant.sizes[sizeIndex].size;
      const variantKey = `${uniformData.type}|${variant.variant}`;
      const sizeKey = `${variantKey}|${size}`;
      const availableQuantity = availableQuantitiesBySize[sizeKey] || 0;

      if (requestedQuantity > availableQuantity) {
        toast.error(`Quantity for size ${size} cannot exceed available stock of ${availableQuantity}.`);
        return;
      }
    }
    if (field === 'price') {
      if (value !== '' && isNaN(parseFloat(value))) {
        return; // Ignore invalid numeric input
      }
    }
    
    setUniformData(prev => {
      const newVariants = [...prev.variants];
      // Ensure the path exists
      if (!newVariants[variantIndex] || !newVariants[variantIndex].sizes[sizeIndex]) {
        return prev; // Return unchanged if path doesn't exist
      }
      
      newVariants[variantIndex].sizes[sizeIndex] = { 
        ...newVariants[variantIndex].sizes[sizeIndex], 
        [field]: value 
      };
      return { ...prev, variants: newVariants };
    });
  };

  // Optimize add variant function for better UX
  const addVariant = () => {
    console.log("DEBUG: Add Variant clicked");
    console.log("DEBUG: Current type:", uniformData.type);
    console.log("DEBUG: Available variants for type:", availableVariants[uniformData.type]);
    
    if (!uniformData.type) {
      console.log("DEBUG: No type selected, cannot add variant");
      toast.error("Please select a product type first");
      return;
    }
    
    const variantsForType = availableVariants[uniformData.type] || [];
    console.log("DEBUG: Variants for type:", variantsForType);
    
    // Always add a variant, even if none are available in batch data
    if (variantsForType.length === 0) {
      console.log("DEBUG: No variants available for this type, adding a default variant");
      
      const newVariant = {
        variant: 'Default',
        color: '#000000',
        sizes: [{ size: 'Default', quantity: '', price: '' }]
      };
      
      console.log("DEBUG: Adding default variant:", newVariant);
      
      setUniformData(prev => ({
        ...prev,
        variants: [...prev.variants, newVariant]
      }));
      
      toast.success("No predefined variants found. Added a default variant.");
      return;
    }
    
    // Get existing variant types that have been added
    const addedVariantTypes = new Set(uniformData.variants.map(v => v.variant));
    console.log("DEBUG: Already added variant types:", Array.from(addedVariantTypes));
    
    // Find a variant type that hasn't been added yet
    let nextVariantType = variantsForType.find(v => !addedVariantTypes.has(v));
    
    if (!nextVariantType) {
      console.log("DEBUG: All variant types already added, using first one");
      nextVariantType = variantsForType[0];
      toast.success(`All variant types already added. Adding another "${nextVariantType}" variant.`);
    }
    
    console.log("DEBUG: Selected next variant type:", nextVariantType);
    
    const variantKey = `${uniformData.type}|${nextVariantType}`;
    const sizesForVariant = availableSizes[variantKey] || [];
    const firstSize = sizesForVariant.length > 0 ? sizesForVariant[0] : 'Default';
    const colorsForVariant = availableColors[variantKey] || [];
    const firstColor = colorsForVariant.length > 0 ? colorsForVariant[0] : '#000000';
    
    console.log("DEBUG: Sizes for variant:", sizesForVariant);
    console.log("DEBUG: Colors for variant:", colorsForVariant);
    
    const newVariant = {
      variant: nextVariantType,
      sizes: [{ size: firstSize, quantity: '', price: '' }],
      color: firstColor
    };
    
    console.log("DEBUG: Adding new variant:", newVariant);
    
    // Scroll to the newly added variant after state update
    setUniformData(prev => {
      const updatedVariants = [...prev.variants, newVariant];
      
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        // Scroll to the newly added variant
        const variantElements = document.querySelectorAll('.variant-card');
        if (variantElements.length > 0) {
          const lastVariant = variantElements[variantElements.length - 1];
          lastVariant.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
      return { ...prev, variants: updatedVariants };
    });
    
    console.log("DEBUG: Variant added");
    toast.success(`Added variant "${nextVariantType}" successfully`);
  };
  
  // Optimize remove variant function
  const removeVariant = (i) => {
    // Confirm before removing
    if (window.confirm("Are you sure you want to remove this variant?")) {
      setUniformData(prev => ({ 
        ...prev, 
        variants: prev.variants.filter((_, idx) => idx !== i) 
      }));
      toast.success("Variant removed successfully");
    }
  };
  
  // Optimize add size function to be fully immutable
  const handleAddSize = (variantIndex) => {
    setUniformData(prev => {
      const newVariants = prev.variants.map((variant, vIndex) => {
        if (vIndex === variantIndex) {
          return {
            ...variant,
            sizes: [...variant.sizes, { size: '', quantity: '', price: '' }]
          };
        }
        return variant;
      });
      return { ...prev, variants: newVariants };
    });
    toast.success("Size added successfully");
  };
  
  // Optimize remove size function to be fully immutable
  const handleRemoveSize = (variantIndex, sizeIndex) => {
    setUniformData(prev => {
      const newVariants = prev.variants.map((variant, vIndex) => {
        if (vIndex === variantIndex) {
          const newSizes = variant.sizes.filter((_, sIndex) => sIndex !== sizeIndex);
          return { ...variant, sizes: newSizes };
        }
        return variant;
      });
      return { ...prev, variants: newVariants };
    });
    toast.success("Size removed successfully");
  };

  // Add this function to manually initialize variants when needed
  const initializeVariantsForType = (type) => {
    console.log("DEBUG: Manually initializing variants for type:", type);
    
    if (!type) return;
    
    const variantsForType = availableVariants[type] || [];
    let initialVariant;
    
    if (variantsForType.length > 0) {
      const firstVariant = variantsForType[0];
      const variantKey = `${type}|${firstVariant}`;
      const sizesForVariant = availableSizes[variantKey] || [];
      const colorsForVariant = availableColors[variantKey] || [];
      
      initialVariant = {
        variant: firstVariant,
        color: colorsForVariant.length > 0 ? colorsForVariant[0] : '#000000',
        sizes: [{
          size: sizesForVariant.length > 0 ? sizesForVariant[0] : 'Default',
          quantity: '',
          price: ''
        }]
      };
    } else {
      initialVariant = {
        variant: 'Default',
        color: '#000000',
        sizes: [{ size: 'Default', quantity: '', price: '' }]
      };
    }
    
    console.log("DEBUG: Setting initial variant:", initialVariant);
    
    setUniformData(prev => ({
      ...prev,
      variants: [initialVariant]
    }));
  };

  // Add a useMemo to optimize the available types list
  const filteredAvailableTypes = React.useMemo(() => {
    // Sort types alphabetically for easier navigation
    return [...availableTypes].sort((a, b) => a.localeCompare(b));
  }, [availableTypes]);

  // Add function to check for form validity before submission
  const checkFormValidity = () => {
    if (!uniformData.school) {
      toast.error("Please select a school");
      return false;
    }
    
    if (!uniformData.name) {
      toast.error("Please enter a product name");
      return false;
    }
    
    if (!uniformData.type) {
      toast.error("Please select a product type");
      return false;
    }
    
    if (uniformData.variants.length === 0) {
      toast.error("Please add at least one variant");
      return false;
    }
    
    // Check each variant
    for (let i = 0; i < uniformData.variants.length; i++) {
      const variant = uniformData.variants[i];
      
      if (!variant.variant) {
        toast.error(`Variant ${i + 1} is missing a type`);
        return false;
      }
      
      if (variant.sizes.length === 0) {
        toast.error(`Variant ${i + 1} needs at least one size`);
        return false;
      }
      
      // Check each size
      for (let j = 0; j < variant.sizes.length; j++) {
        const size = variant.sizes[j];
        
        if (!size.size) {
          toast.error(`Variant ${i + 1}, Size ${j + 1} is missing a size`);
          return false;
        }
        
        if (!size.quantity) {
          toast.error(`Variant ${i + 1}, Size ${j + 1} is missing a quantity`);
          return false;
        }
        
        if (!size.price) {
          toast.error(`Variant ${i + 1}, Size ${j + 1} is missing a price`);
          return false;
        }
      }
    }
    
    return true;
  };

  // Update the handleSubmit function to use the form validity check
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // First check form validity
    if (!checkFormValidity()) {
      return;
    }
    
    setLoading(true);
    let productTypeStr;
    
    try {
      let productData = {};
      let imageUrls = [];

      // Find the user's document ID from their email
      const userProfile = await findUserByEmail(user?.email);
      if (!userProfile) {
        toast.error("Could not find a user profile. Please contact support.");
        setLoading(false);
        return;
      }

      if (productType === PRODUCT_TYPES.UNIFORM) {
        productTypeStr = 'Uniform';
        // Validate required fields
        if (!uniformData.school || !uniformData.type || uniformData.variants.length === 0) {
          toast.error("Please fill all required fields");
          setLoading(false);
          return;
        }
        // Get user info first
        const { userProfile: profile1 } = useAuthStore.getState();
        const fullName = profile1?.firstName && profile1?.lastName 
          ? `${profile1.firstName} ${profile1.lastName}`.trim()
          : profile1?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Unknown User';
        
        productData = {
          ...uniformData,
          createdBy: fullName, // Use constructed full name
          createdByUid: user?.uid, // Use Firebase Auth UID
          batchId: batchId,
        };
        
        const userInfo = {
          id: user?.uid,
          name: fullName,
          fullName: fullName,
          email: user?.email
        };
        
        console.log('🔍 AddProduct (Uniform) - userInfo:', userInfo);
        
        // The inventoryStore already creates the notification, so we don't duplicate it here
        await addProduct(productData, 'uniform', userInfo);
        
        // Update batch inventory
        for (const variant of uniformData.variants) {
          for (const size of variant.sizes) {
            const batchRef = doc(db, 'batchInventory', productData.batchId);
            const batchDoc = await getDoc(batchRef);
            if (batchDoc.exists()) {
              const batchData = batchDoc.data();
              const updatedItems = batchData.items.map(item => {
                if (item.variantType === variant.variant && item.color === variant.color) {
                  const updatedSizes = item.sizes.map(s => {
                    if (s.size === size.size) {
                      return { ...s, quantity: s.quantity - size.quantity };
                    }
                    return s;
                  });
                  return { ...item, sizes: updatedSizes };
                }
                return item;
              });
              await updateDoc(batchRef, { items: updatedItems });
            }
          }
        }
        
      } else {
        productTypeStr = 'Raw Material';
        // Validate required fields
        if (!rawMaterialData.name || !rawMaterialData.quantity || !rawMaterialData.unit || !rawMaterialData.price) {
          toast.error("Please fill all required fields");
          setLoading(false);
          return;
        }
        // Get user info first
        const { userProfile: profile2 } = useAuthStore.getState();
        const fullName2 = profile2?.firstName && profile2?.lastName 
          ? `${profile2.firstName} ${profile2.lastName}`.trim()
          : profile2?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Unknown User';
        
        productData = {
          ...rawMaterialData,
          createdBy: fullName2, // Use constructed full name
          createdByUid: user?.uid, // Use Firebase Auth UID
          productType: "raw_material"
        };
        
        const userInfo2 = {
          id: user?.uid,
          name: fullName2,
          fullName: fullName2,
          email: user?.email
        };
        
        console.log('🔍 AddProduct (Raw Material) - userInfo:', userInfo2);
        
        // The inventoryStore already creates the notification, so we don't duplicate it here
        await addProduct(productData, 'raw_material', userInfo2);
      }
      
      // Success message and reset form
      setShowSuccessAnimation(true);
      resetForm();
      
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error(`Failed to add ${productTypeStr || 'product'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUniformData({
      name: '',
      school: '',
      category: UNIFORM_CATEGORIES[0],
      type: '',
      gender: '',
      level: 'JUNIOR',
      image: null,
      imageUrl: '',
      variants: []
    });
    
    setRawMaterialData({
      name: '', 
      type: RAW_MATERIAL_TYPES[0], 
      unit: UNITS[0], 
      price: '', 
      quantity: '', 
      color: '#000000'
    });
  };

  // Add this code right before the return statement
  // Force initialize variants if type is selected but variants array is empty
  if (uniformData.type && uniformData.variants.length === 0) {
    console.log("DEBUG: Forcing variant initialization in render");
    // This will run during render, but before the component is painted
    setTimeout(() => {
      setUniformData(prev => ({
        ...prev,
        variants: [{
          variant: "Default",
          color: "#000000",
          sizes: [{ size: "Default", quantity: "", price: "" }]
        }]
      }));
    }, 0);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnimatePresence>
        {showSuccessAnimation && <SuccessModal onAnimationComplete={() => setShowSuccessAnimation(false)} />}
      </AnimatePresence>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-foreground tracking-tight">Add New Product</h1>
            <p className="text-gray-600 dark:text-muted-foreground mt-1">Fill in the details to add a new product to your inventory.</p>
          </div>
          <button onClick={() => navigate('/inventory')} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-muted-foreground bg-gray-100 dark:bg-secondary rounded-lg border border-gray-300 dark:border-transparent hover:bg-gray-200 dark:hover:bg-secondary/80 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            Cancel
          </button>
        </div>

        {error && <div className="mb-6 bg-red-900/30 text-red-300 p-4 rounded-lg border border-red-500/50">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <Section title="Product Type" description="Select whether you're adding a finished uniform or a raw material.">
            <div className="flex w-full p-1 bg-gray-100 dark:bg-card rounded-lg border dark:border-input">
              <button type="button" onClick={() => setProductType(PRODUCT_TYPES.UNIFORM)} className={`w-1/2 py-2.5 text-sm font-semibold rounded-md transition-colors ${productType === PRODUCT_TYPES.UNIFORM ? 'bg-primary text-primary-foreground' : 'text-gray-700 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground'}`}>Uniform</button>
              <button type="button" onClick={() => setProductType(PRODUCT_TYPES.RAW_MATERIAL)} className={`w-1/2 py-2.5 text-sm font-semibold rounded-md transition-colors ${productType === PRODUCT_TYPES.RAW_MATERIAL ? 'bg-primary text-primary-foreground' : 'text-gray-700 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground'}`}>Raw Material</button>
            </div>
          </Section>

          {productType === PRODUCT_TYPES.UNIFORM ? (
            <>
              <Section title="Basic Information" description="Enter the main details of the product.">
                <div className="space-y-6">
                  <FormField label="Select School">
                    <SchoolSelect value={uniformData.school} onChange={(value) => handleUniformChange('school', value)} required />
                  </FormField>
                  
                  <FormField label="Product Name">
                    <Input type="text" value={uniformData.name} onChange={(e) => handleUniformChange('name', e.target.value)} placeholder="e.g., Senior Boys Blazer" required />
                  </FormField>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div>
                      <p className="text-gray-700 dark:text-muted-foreground text-sm font-medium mb-2">Category</p>
                      <div className="flex gap-2">
                        <Select 
                          value={uniformData.category} 
                          onChange={(e) => handleUniformChange('category', e.target.value)} 
                          required
                          className="flex-grow"
                        >
                          {UNIFORM_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-gray-700 dark:text-muted-foreground text-sm font-medium mb-2">Type</p>
                      <div className="flex gap-2">
                        <Select 
                          value={uniformData.type} 
                          onChange={(e) => handleUniformChange('type', e.target.value)} 
                          required
                          className="flex-grow"
                          disabled={availableTypes.length === 0}
                        >
                          <option value="">Select Type</option>
                          {filteredAvailableTypes.length > 0 ? (
                            filteredAvailableTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                            ))
                          ) : (
                            <option value="" disabled>No types available in batches</option>
                          )}
                        </Select>
                      </div>
                      {availableTypes.length === 0 && (
                        <p className="text-xs text-red-400 mt-1">
                          No types available. Please add products to batch inventory first.
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-700 dark:text-muted-foreground text-sm font-medium mb-2">Gender</p>
                      <Select 
                        value={uniformData.gender} 
                        onChange={(e) => handleUniformChange('gender', e.target.value)} 
                        required
                        className="flex-grow"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Unisex">Unisex</option>
                      </Select>
                    </div>

                    <div>
                      <p className="text-gray-700 dark:text-muted-foreground text-sm font-medium mb-2">Level</p>
                      <Select 
                        value={uniformData.level} 
                        onChange={(e) => handleUniformChange('level', e.target.value)} 
                        required
                        className="flex-grow"
                      >
                        <option value="JUNIOR">Junior</option>
                        <option value="SENIOR">Senior</option>
                      </Select>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Product Image" description="Upload a high-quality image of the product.">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 dark:border-input rounded-xl cursor-pointer bg-gray-50 dark:bg-card hover:bg-gray-100 dark:hover:bg-card/80 transition-colors">
                    {uniformData.imageUrl ? (
                      <img src={uniformData.imageUrl} alt="Product preview" className="w-full h-full object-contain rounded-xl p-2" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                        <svg className="w-10 h-10 mb-3 text-gray-400 dark:text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="text-sm text-gray-500 dark:text-muted-foreground"><span className="font-semibold text-gray-700 dark:text-foreground">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1">PNG, JPG or JPEG (MAX. 800x400px)</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                </div>
              </Section>
              
              <Section title="Product Variants" description="Add variants with different types, colors, and sizes.">
                {!uniformData.type ? (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-card rounded-lg text-center border border-slate-200 dark:border-input">
                    <p className="text-slate-500 dark:text-muted-foreground">Please select a product type first to see available variants</p>
                  </div>
                ) : (availableQuantities[uniformData.type] > 0) ? (
                  <div className="mt-4">
                    {console.log("DEBUG: Rendering variants section. Type:", uniformData.type, "Variants:", uniformData.variants)}
                    
                    {/* Variants List */}
                    {uniformData.variants.length > 0 ? (
                      <div className="space-y-6">
                        {uniformData.variants.map((variant, variantIndex) => {
                          const batchItemForVariant = batches
                            .flatMap(batch => batch.items || [])
                            .find(item => item.variantType === variant.variant);
                          
                          const costPrice = batchItemForVariant ? batchItemForVariant.price : null;

                          return (
                            <div key={variantIndex} className="variant-card bg-white dark:bg-card border border-gray-200 dark:border-input rounded-lg overflow-hidden shadow-sm transition-all hover:border-gray-300 dark:hover:border-input/80">
                              {/* Variant Header */}
                              <div className="bg-gray-50 dark:bg-secondary/50 px-4 py-3 flex justify-between items-center">
                                <h3 className="font-medium text-gray-800 dark:text-foreground flex items-center gap-2">
                                  <span className="inline-block w-4 h-4 rounded-full border border-gray-300 dark:border-input/30" style={{ backgroundColor: variant.color }}></span>
                                  {variantIndex === 0 ? 'Primary Variant' : `Variant ${variantIndex + 1}`}
                                  <span className="text-sm text-gray-500 dark:text-muted-foreground">({variant.variant})</span>
                                </h3>
                                {variantIndex > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => removeVariant(variantIndex)}
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                    title="Remove Variant"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              
                              {/* Variant Content */}
                              <div className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                  <div>
                                    <Label>Variant Type</Label>
                                    <Select
                                      value={variant.variant}
                                      onChange={(e) => handleVariantChange(variantIndex, 'variant', e.target.value)}
                                      className="bg-white dark:bg-background border-gray-300 dark:border-input"
                                    >
                                      {availableVariants[uniformData.type]?.length === 0 ? (
                                        <option value="Default">Default</option>
                                      ) : (
                                        availableVariants[uniformData.type]?.map((v) => (
                                          <option key={v} value={v}>
                                            {v}
                                          </option>
                                        ))
                                      )}
                                    </Select>
                                  </div>
                                  
                                  <div>
                                    <Label>Color</Label>
                                    <div className="flex items-center gap-2">
                                      <div className="relative">
                                        <button
                                          type="button"
                                          className="h-12 w-12 rounded-lg border border-gray-300 dark:border-input shadow-inner"
                                          style={{ backgroundColor: variant.color }}
                                          onClick={() => {
                                            setSelectedVariantIndex(variantIndex);
                                            setShowVariantColorPicker(prev => !prev);
                                          }}
                                        />
                                        {showVariantColorPicker && selectedVariantIndex === variantIndex && (
                                          <div className="absolute z-10 mt-2">
                                            <div className="fixed inset-0" onClick={() => setShowVariantColorPicker(false)} />
                                            <div className="relative bg-card p-2 rounded-lg shadow-xl border border-input">
                                              <HexColorPicker
                                                color={variant.color}
                                                onChange={(color) => handleVariantChange(variantIndex, 'color', color)}
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      <Input
                                        type="text"
                                        value={variant.color}
                                        onChange={(e) => handleVariantChange(variantIndex, 'color', e.target.value)}
                                        className="flex-grow"
                                      />
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Sizes Section */}
                                <div className="border-t border-gray-200 dark:border-gray-700/50 pt-4">
                                  <div className="flex justify-between items-center mb-3">
                                    <Label className="mb-0 flex items-center gap-1">
                                      <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                      </svg>
                                      Sizes
                                    </Label>
                                    <button
                                      type="button"
                                      onClick={() => handleAddSize(variantIndex)}
                                      className="text-sm bg-primary/20 text-primary hover:bg-primary/30 dark:bg-primary/30 dark:hover:bg-primary/40 px-3 py-1 rounded-md transition-colors flex items-center gap-1"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                      </svg>
                                      Add Size
                                    </button>
                        </div>
                                  
                                  {/* Size Header */}
                                  <div className="grid grid-cols-1 md:grid-cols-11 gap-2 mb-2 px-2">
                                    <div className="md:col-span-4 text-xs text-gray-500 dark:text-gray-400 font-medium">Size</div>
                                    <div className="md:col-span-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Quantity</div>
                                    <div className="md:col-span-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Price</div>
                                    <div className="md:col-span-1"></div>
                                  </div>
                                  
                                  {/* Size List */}
                                  <div className="space-y-3">
                                    {variant.sizes.map((size, sizeIndex) => {
                                      const sellingPrice = parseFloat(size.price);
                                      let profitLossIndicator = null;
                                      if (costPrice !== null && size.price && !isNaN(sellingPrice)) {
                                          const profit = sellingPrice - costPrice;
                                          
                                          if (profit > 0) {
                                              const profitMargin = (profit / costPrice) * 100;
                                              profitLossIndicator = <span className="text-xs text-green-400">Profit: ${profit.toFixed(2)} ({profitMargin.toFixed(0)}%)</span>;
                                          } else if (profit < 0) {
                                              const profitMargin = costPrice > 0 ? (profit / costPrice) * 100 : 0;
                                              profitLossIndicator = <span className="text-xs text-red-400">Loss: ${Math.abs(profit).toFixed(2)} ({profitMargin.toFixed(0)}%)</span>;
                                          } else {
                                              profitLossIndicator = <span className="text-xs text-gray-400 dark:text-gray-500">Breakeven</span>;
                                          }
                                      }

                                      return (
                                        <div key={sizeIndex} 
                                            className={`grid grid-cols-1 md:grid-cols-11 gap-2 items-start rounded-lg px-3 py-3 transition-all ${
                                              sizeIndex % 2 === 0 ? 'bg-gray-50 dark:bg-black/30' : 'bg-white dark:bg-black/10'
                                            } hover:bg-gray-100 dark:hover:bg-black/40 border-l-2 ${!size.size || !size.quantity || !size.price ? 'border-red-500/70' : 'border-transparent'}`}>
                                          <div className="md:col-span-4">
                                            <Select
                                              value={size.size}
                                              onChange={(e) => handleSizeChange(variantIndex, sizeIndex, 'size', e.target.value)}
                                              className="border-gray-300 dark:border-gray-700/50 bg-white dark:bg-black/30"
                                            >
                                              <option value="" disabled>Select Size</option>
                                              {availableSizes[`${uniformData.type}|${variant.variant}`]?.length === 0 ? (
                                                <option value="Default">Default</option>
                                              ) : (
                                                availableSizes[`${uniformData.type}|${variant.variant}`]?.map((s) => (
                                                  <option key={s} value={s}>
                                                    {s}
                                                  </option>
                                                ))
                                              )}
                              </Select>
                                            {!size.size && <p className="text-xs text-red-400 mt-1">Size is required</p>}
                            </div>
                                          <div className="md:col-span-3">
                                            <div className="relative">
                                              <Input
                                                type="number"
                                                placeholder="Quantity"
                                                value={size.quantity}
                                                onChange={(e) => handleSizeChange(variantIndex, sizeIndex, 'quantity', e.target.value)}
                                                min="1"
                                                className={`border-gray-300 dark:border-gray-700/50 bg-white dark:bg-black/30 ${!size.quantity ? "border-red-500/50" : ""}`}
                                              />
                                              <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                <div className="flex flex-col">
                                                  <button 
                                                    type="button" 
                                                    className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 px-1"
                                                    onClick={() => {
                                                      const newValue = size.quantity ? parseInt(size.quantity) + 1 : 1;
                                                      handleSizeChange(variantIndex, sizeIndex, 'quantity', newValue.toString());
                                                    }}
                                                  >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                    </svg>
                                                  </button>
                                                  <button 
                                                    type="button" 
                                                    className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 px-1"
                                                    onClick={() => {
                                                      if (!size.quantity || parseInt(size.quantity) <= 1) return;
                                                      const newValue = parseInt(size.quantity) - 1;
                                                      handleSizeChange(variantIndex, sizeIndex, 'quantity', newValue.toString());
                                                    }}
                                                    disabled={!size.quantity || parseInt(size.quantity) <= 1}
                                                  >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                  </button>
                        </div>
                      </div>
                    </div>
                                            {!size.quantity && <p className="text-xs text-red-400 mt-1">Quantity is required</p>}
                </div>
                                          <div className="md:col-span-3">
                                            <div className="relative">
                                              <Input
                                                type="number"
                                                placeholder="Price"
                                                value={size.price}
                                                onChange={(e) => handleSizeChange(variantIndex, sizeIndex, 'price', e.target.value)}
                                                min="0"
                                                step="0.01"
                                                className={`pl-8 border-gray-300 dark:border-gray-700/50 bg-white dark:bg-black/30 ${!size.price ? "border-red-500/50" : ""}`}
                                              />
                                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-gray-500 dark:text-gray-400 font-medium">$</span>
              </div>
                                              <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                <div className="flex flex-col">
                                                  <button 
                                                    type="button" 
                                                    className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 px-1"
                                                    onClick={() => {
                                                      const currentPrice = parseFloat(size.price || 0);
                                                      const newValue = (currentPrice + 0.5).toFixed(2);
                                                      handleSizeChange(variantIndex, sizeIndex, 'price', newValue);
                                                    }}
                                                  >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                    </svg>
                                                  </button>
                                                  <button 
                                                    type="button" 
                                                    className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 px-1"
                                                    onClick={() => {
                                                      const currentPrice = parseFloat(size.price || 0);
                                                      if (currentPrice <= 0) return;
                                                      const newValue = Math.max(0, currentPrice - 0.5).toFixed(2);
                                                      handleSizeChange(variantIndex, sizeIndex, 'price', newValue);
                                                    }}
                                                    disabled={!size.price || parseFloat(size.price) <= 0}
                                                  >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                            {!size.price && <p className="text-xs text-red-400 mt-1">Price is required</p>}
                                            <div className="h-4 mt-1">
                                                {costPrice !== null && <p className="text-xs text-gray-500 dark:text-gray-400">Cost: ${costPrice.toFixed(2)}</p>}
                                                {profitLossIndicator}
                                            </div>
                                          </div>
                                          <div className="md:col-span-1 flex justify-center">
                                            {sizeIndex > 0 && (
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveSize(variantIndex, sizeIndex)}
                                                className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-red-500/10"
                                                title="Remove Size"
                                              >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                  
                                  {/* Show error if no sizes */}
                                  {variant.sizes.length === 0 && (
                                    <div className="text-center p-4 bg-gray-100 dark:bg-card rounded-lg border dark:border-input">
                                      <p className="text-gray-500 dark:text-gray-400">No sizes added yet. Click the "Add Size" button to add sizes.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        
                        {/* Add Variant Button - outside variants */}
                        <div className="flex justify-center mt-8">
                          <button
                            type="button"
                            onClick={addVariant}
                            className="group relative px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md hover:from-red-700 hover:to-red-800 transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0"
                          >
                            <span className="absolute -left-1 -top-1 bg-white/10 w-12 h-12 rounded-full blur-lg group-hover:blur-xl transition-all duration-300"></span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span className="font-medium">Add Another Variant</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-6 p-8 bg-gray-100 dark:bg-card rounded-lg text-center border dark:border-input">
                        <div className="flex flex-col items-center gap-4">
                          <svg className="w-16 h-16 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                          </svg>
                          <p className="text-gray-400 dark:text-gray-300 max-w-md mx-auto">No variants added yet. Each product needs at least one variant with size and pricing information.</p>
                          <button
                            type="button"
                            onClick={addVariant}
                            className="group relative px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md hover:from-red-700 hover:to-red-800 transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0"
                          >
                            <span className="absolute -left-1 -top-1 bg-white/10 w-12 h-12 rounded-full blur-lg group-hover:blur-xl transition-all duration-300"></span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span className="font-medium">Add First Variant</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-gray-100 dark:bg-card rounded-lg text-center border dark:border-input">
                    <p className="text-red-500 dark:text-red-400">No stock available for this product type. All items have been depleted from the batch inventory.</p>
                  </div>
                )}
              </Section>
            </>
          ) : (
            <Section title="Raw Material Details" description="Enter the specifications for the raw material.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Material Name">
                  <Input value={rawMaterialData.name} onChange={(e) => handleRawMaterialChange('name', e.target.value)} required />
                </FormField>
                <FormField label="Material Type">
                  <Select value={rawMaterialData.type} onChange={(e) => handleRawMaterialChange('type', e.target.value)} required>
                    {RAW_MATERIAL_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </Select>
                </FormField>
                <FormField label="Unit">
                  <Select value={rawMaterialData.unit} onChange={(e) => handleRawMaterialChange('unit', e.target.value)} required>
                    {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                  </Select>
                </FormField>
                <FormField label="Price per Unit">
                  <Input type="number" value={rawMaterialData.price} onChange={(e) => handleRawMaterialChange('price', e.target.value)} required />
                </FormField>
                <FormField label="Quantity">
                  <Input type="number" value={rawMaterialData.quantity} onChange={(e) => handleRawMaterialChange('quantity', e.target.value)} required />
                </FormField>
                <FormField label="Color">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button type="button" className="h-12 w-12 rounded-lg border border-gray-300 dark:border-input" style={{ backgroundColor: rawMaterialData.color }} onClick={() => setShowRawMaterialColorPicker(prev => !prev)} />
                      {showRawMaterialColorPicker && <div className="absolute z-10 mt-2"><div className="fixed inset-0" onClick={() => setShowRawMaterialColorPicker(false)} /><div className="relative bg-card p-2 rounded-lg shadow-xl border border-input"><HexColorPicker color={rawMaterialData.color} onChange={(color) => handleRawMaterialChange('color', color)} /></div></div>}
                    </div>
                    <Input type="text" value={rawMaterialData.color} onChange={(e) => handleRawMaterialChange('color', e.target.value)} />
                  </div>
                </FormField>
              </div>
            </Section>
          )}

          <div className="pt-8 flex justify-end">
            <button 
              type="submit" 
              disabled={loading} 
              className="group relative w-full md:w-auto px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0"
            >
              <span className="absolute -left-1 -top-1 bg-white/10 w-12 h-12 rounded-full blur-lg group-hover:blur-xl transition-all duration-300"></span>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SuccessModal = ({ onAnimationComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onAnimationComplete();
    }, 2000); // Close after 2 seconds as a fallback

    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        className="bg-gray-800 p-8 rounded-lg shadow-xl text-center"
      >
        <Lottie
          animationData={successAnimation}
          loop={false}
          onComplete={onAnimationComplete}
          style={{ width: 150, height: 150, margin: '0 auto' }}
        />
        <h2 className="text-2xl font-bold text-white mt-4">Product Added!</h2>
        <p className="text-gray-300">The new product has been successfully added to your inventory.</p>
      </motion.div>
    </div>
  );
};

export default AddProductNew; 