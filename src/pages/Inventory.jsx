import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  Search, 
  Plus, 
  Package, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Eye,
  Edit2,
  Trash2,
  Filter,
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Box,
  Layers
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import DetailedInventoryAnalysis from '../components/dashboard/DetailedInventoryAnalysis';
import LoadingScreen from '../components/ui/LoadingScreen';
import ReorderModal from '../components/inventory/ReorderModal';
import { useInventoryStore } from '../stores/inventoryStore';
import { collection, getDocs, query, orderBy, doc, getDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUniformIcon } from '../constants/icons';
import ExcelJS from 'exceljs';
import { PDFDocument, rgb } from 'pdf-lib';
import { useAuthStore } from '../stores/authStore';
import Modal from '../components/ui/Modal';

// Get unique levels from products
const getUniqueLevels = (products) => {
  return [...new Set(products.map(product => product.level))].filter(Boolean);
};

// Calculate total inventory count (sum of all size quantities)
const calculateTotalInventoryCount = (products) => {
  return products.reduce((total, product) => {
    if (!product.variants || !Array.isArray(product.variants)) return total;
    
    const productTotal = product.variants.reduce((variantTotal, variant) => {
      if (!variant.sizes || !Array.isArray(variant.sizes)) return variantTotal;
      
      const variantSizeTotal = variant.sizes.reduce((sizeTotal, size) => {
        return sizeTotal + (Number(size?.quantity) || 0);
      }, 0);
      
      return variantTotal + variantSizeTotal;
    }, 0);
    
    return total + productTotal;
  }, 0);
};

// Enhanced helper function to calculate detailed stock status
const calculateStockStatus = (variants) => {
  if (!Array.isArray(variants)) {
    return { type: 'unknown', message: 'Status Unknown', details: [] };
  }

  let variantStatuses = [];
  let hasOutOfStock = false;
  let hasLowStock = false;

  variants.forEach(variant => {
    if (!variant?.sizes || !Array.isArray(variant.sizes)) return;

    const variantName = variant.variantType || 'Unknown';
    let totalQuantity = 0;
    let variantHasOutOfStock = false;
    let variantHasLowStock = false;

    // Check each size individually against its reorder level
    variant.sizes.forEach(size => {
      const quantity = Number(size?.quantity) || 0;
      const reorderLevel = Number(size?.reorderLevel) || Number(variant?.defaultReorderLevel) || 5;
      
      totalQuantity += quantity;

      if (quantity === 0) {
        variantHasOutOfStock = true;
        hasOutOfStock = true;
      } else if (quantity <= reorderLevel) {
        variantHasLowStock = true;
        hasLowStock = true;
      }
    });

    // Determine variant status based on individual size checks
    let status = 'in_stock';
    if (variantHasOutOfStock) {
      status = 'out_of_stock';
    } else if (variantHasLowStock) {
      status = 'low_stock';
    }

    variantStatuses.push({
      name: variantName,
      status,
      quantity: totalQuantity
    });
  });

  // Determine overall product status
  let overallType = 'success';
  if (hasOutOfStock) {
    overallType = 'error';
  } else if (hasLowStock) {
    overallType = 'warning';
  }

  return {
    details: variantStatuses,
    type: overallType
  };
};

const getDefaultProductImage = (name, type) => {
  const bgColors = {
    'Shirt': '4299e1',  // blue-500
    'Trouser': '48bb78', // green-500
    'Blazer': '9f7aea', // purple-500
    'Skirt': 'ed64a6',  // pink-500
    'Tie': 'f56565',    // red-500
    'default': 'a0aec0'  // gray-500
  };

  const bgColor = bgColors[type] || bgColors.default;
  const textColor = 'ffffff'; // white text
  
  // Create a more visually appealing placeholder with the product name and type
  const displayText = `${name}\n(${type})`;
  return `https://placehold.co/400x400/${bgColor}/${textColor}?text=${encodeURIComponent(displayText)}`;
};

const getProductImage = (product) => {
  if (product.imageUrl && product.imageUrl.startsWith('http')) {
    return product.imageUrl;
  }
  
  if (product.imageUrl && product.imageUrl.startsWith('gs://')) {
    // Convert Firebase Storage URL if needed
    return product.imageUrl;
  }
  
  return getDefaultProductImage(product.name, product.type);
};

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [materialFilter, setMaterialFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [batches, setBatches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(null);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [error, setError] = useState(null);
  const [schoolsMap, setSchoolsMap] = useState({});
  const [users, setUsers] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const { isManager } = useAuthStore();

  const { products: storeProducts, loading: storeLoading, error: storeError, setupRealtimeListeners, cleanup, deleteProduct } = useInventoryStore();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveModalData, setReceiveModalData] = useState(null);

  // Fetch schools and create a map of id to name
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const schoolsSnapshot = await getDocs(collection(db, 'schools'));
        const schoolsData = {};
        schoolsSnapshot.docs.forEach(doc => {
          schoolsData[doc.id] = doc.data().name;
        });
        setSchoolsMap(schoolsData);
        console.log('Schools map:', schoolsData); // Debug log
      } catch (error) {
        console.error('Error fetching schools:', error);
      }
    };

    fetchSchools();
  }, []);

  // Fetch materials
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const materialsSnapshot = await getDocs(collection(db, 'materials'));
        const materialsList = materialsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMaterials(materialsList);
      } catch (error) {
        console.error('Error fetching materials:', error);
      }
    };

    fetchMaterials();
  }, []);

  // Fetch batches
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const batchesSnapshot = await getDocs(
          query(collection(db, 'batches'), orderBy('createdAt', 'desc'))
        );
        const batchesList = batchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBatches(batchesList);
      } catch (error) {
        console.error('Error fetching batches:', error);
      }
    };

    fetchBatches();
  }, []);

  // Setup real-time listeners when component mounts
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        // Check what collections actually exist and fetch users
        console.log('Checking for user collections...');
        
        // Try different possible collection names for users
        const possibleCollections = ['inventory_staff', 'inventory_managers', 'staff', 'managers', 'users', 'accounts'];
        const userCollections = {};
        
        for (const collectionName of possibleCollections) {
          try {
            const snapshot = await getDocs(collection(db, collectionName));
            if (snapshot.size > 0) {
              userCollections[collectionName] = snapshot;
              console.log(`Found ${snapshot.size} documents in ${collectionName} collection`);
            }
          } catch (error) {
            console.log(`Collection ${collectionName} not accessible:`, error.message);
          }
        }
        
        // If no user collections found, extract creator info from products and fetch actual user profiles
        if (Object.keys(userCollections).length === 0) {
          console.log('No user collections found. Extracting creator info from products and fetching user profiles...');
          
          // Get products to extract creator UIDs
          const uniformsSnapshot = await getDocs(collection(db, 'uniforms'));
          const materialsSnapshot = await getDocs(collection(db, 'raw_materials'));
          
          const creatorMap = {};
          const creatorUIDs = new Set();
          
          // Extract creator UIDs from products
          [...uniformsSnapshot.docs, ...materialsSnapshot.docs].forEach(doc => {
            const data = doc.data();
            if (data.createdByUid) {
              creatorUIDs.add(data.createdByUid);
            }
          });
          
          // Fetch actual user profiles from user collections
          const userCollectionsToCheck = ['inventory_staff', 'inventory_managers', 'staff', 'managers', 'users'];
          
          for (const collectionName of userCollectionsToCheck) {
            try {
              const usersSnapshot = await getDocs(collection(db, collectionName));
              usersSnapshot.docs.forEach(doc => {
                const userData = doc.data();
                const userId = doc.id;
                
                if (creatorUIDs.has(userId)) {
                  const fullName = userData.fullName || 
                                 (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}`.trim() : null) ||
                                 userData.displayName ||
                                 userData.name ||
                                 userData.email;
                  
                  creatorMap[userId] = {
                    name: fullName,
                    role: userData.role || 'staff'
                  };
                }
              });
            } catch (error) {
              console.log(`Could not access ${collectionName}:`, error.message);
            }
          }
          
          // Fallback: extract any remaining creator info from products themselves
          [...uniformsSnapshot.docs, ...materialsSnapshot.docs].forEach(doc => {
            const data = doc.data();
            if (data.createdByUid && !creatorMap[data.createdByUid]) {
              const creatorName = data.createdByName || data.createdBy || 'Unknown User';
              creatorMap[data.createdByUid] = {
                name: creatorName,
                role: data.createdByRole || 'staff'
              };
            }
          });
          
          console.log('Creator map with full names:', creatorMap);
          setUsersMap(creatorMap);
          
          // Continue with the rest of initialization
          const schoolsQuery = query(collection(db, 'schools'), orderBy('createdAt', 'desc'));
          const schoolsSnapshot = await getDocs(schoolsQuery);
          const schoolsData = schoolsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setSchools(schoolsData);
          
          setupRealtimeListeners();
          
          setTimeout(async () => {
            if (storeProducts.length === 0) {
              console.log('No products from real-time listeners, fetching directly...');
              await fetchProductsDirectly();
            }
          }, 3000);
          
          setLoading(false);
          return;
        }
        
        // Process found user collections
        const allUsers = [];
        
        Object.entries(userCollections).forEach(([collectionName, snapshot]) => {
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`${collectionName} user:`, doc.id, data);
            allUsers.push({
              id: doc.id,
              ...data,
              role: collectionName.includes('managers') ? 'manager' : 'staff'
            });
          });
        });
        
        console.log('Total users found:', allUsers.length);
        setUsers(allUsers);
        
        // Create users map for quick lookup
        const usersMapData = {};
        allUsers.forEach(user => {
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          usersMapData[user.id] = {
            name: fullName || user.displayName || user.name || user.email || 'Unknown User',
            role: user.role || 'N/A'
          };
        });
        setUsersMap(usersMapData);
        console.log('Users map created with', Object.keys(usersMapData).length, 'users:', usersMapData);
        
        // Fetch schools
        const schoolsQuery = query(collection(db, 'schools'), orderBy('createdAt', 'desc'));
        const schoolsSnapshot = await getDocs(schoolsQuery);
        const schoolsData = schoolsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSchools(schoolsData);
        
        // Wait for user info to be loaded before setting up listeners
        // This ensures we have full names ready when products are displayed
        console.log('User info loaded, setting up real-time listeners...');
        
        // Setup real-time listeners for products
        setupRealtimeListeners();
        
        // Fallback: If no products after 3 seconds, fetch directly
        setTimeout(async () => {
          if (storeProducts.length === 0) {
            console.log('No products from real-time listeners, fetching directly...');
            await fetchProductsDirectly();
          }
        }, 3000);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load inventory data');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
    
    // Cleanup listeners on unmount
    return () => {
      cleanup();
    };
  }, []);

  // Use store products with user info mapping - only update when both data and user info are ready
  useEffect(() => {
    console.log('Store products changed:', storeProducts?.length || 0);
    console.log('Users map keys:', Object.keys(usersMap).length);
    
    if (storeProducts && storeProducts.length > 0 && Object.keys(usersMap).length > 0) {
      const productsWithUserInfo = storeProducts.map(product => {
        // Check if product already has creator info from store
        if (product.creatorName && product.creatorRole && !product.creatorName.includes('@')) {
          return {
            ...product,
            createdAt: product.createdAt?.toDate ? product.createdAt.toDate() : product.createdAt,
            updatedAt: product.updatedAt?.toDate ? product.updatedAt.toDate() : product.updatedAt
          };
        }
        
        // Use local users map for full names
        const creatorInfo = usersMap[product.createdByUid];
        console.log('Product creator lookup:', product.createdByUid, creatorInfo);
        
        return {
          ...product,
          creatorName: creatorInfo?.name || product.createdByName || product.createdBy || 'N/A',
          creatorRole: creatorInfo?.role || product.createdByRole || 'N/A',
          createdAt: product.createdAt?.toDate ? product.createdAt.toDate() : product.createdAt,
          updatedAt: product.updatedAt?.toDate ? product.updatedAt.toDate() : product.updatedAt
        };
      });
      setProducts(productsWithUserInfo);
      console.log('Products updated with user info:', productsWithUserInfo.length);
    } else if (storeProducts && storeProducts.length === 0) {
      setProducts([]);
      console.log('No products in store, clearing local products');
    }
  }, [storeProducts, usersMap]);

  // Direct fetch products function as fallback
  const fetchProductsDirectly = async () => {
    try {
      console.log('Fetching products directly from Firestore...');
      const directUsersMap = {};

      const fetchCreatorInfo = async (createdByUid) => {
        if (directUsersMap[createdByUid]) {
          return directUsersMap[createdByUid];
        }

        const userCollectionsToCheck = ['inventory_managers', 'inventory_staff', 'managers', 'staff', 'users'];
        for (const collectionName of userCollectionsToCheck) {
          try {
            const userRef = doc(db, collectionName, createdByUid);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const creatorInfo = {
                name: userData.displayName || `${userData.firstName} ${userData.lastName}`.trim() || userData.name || 'Unknown User',
                role: userData.role || 'staff',
              };
              directUsersMap[createdByUid] = creatorInfo;
              return creatorInfo;
            }
          } catch (error) {
            // This error is expected if a collection doesn't exist or user isn't in it.
            // console.warn(`Could not access user ${createdByUid} from ${collectionName}:`, error.message);
          }
        }
        return null; // User not found in any collection
      };

      const processSnapshot = async (snapshot, isMaterial = false) => {
        return Promise.all(snapshot.docs.map(async (docRef) => {
          const data = docRef.data();
          let creatorName = data.createdByName || data.createdBy || 'Unknown';
          let creatorRole = data.createdByRole || 'staff';

          if (data.createdByUid) {
            const creatorInfo = await fetchCreatorInfo(data.createdByUid);
            if (creatorInfo) {
              creatorName = creatorInfo.name;
              creatorRole = creatorInfo.role;
            }
          }

          // For uniforms, fetch variants with their IDs
          let variants = [];
          if (!isMaterial) {
            try {
              const variantsQuery = query(collection(db, 'uniform_variants'), where('uniformId', '==', docRef.id));
              const variantsSnapshot = await getDocs(variantsQuery);
              variants = variantsSnapshot.docs.map(variantDoc => ({
                id: variantDoc.id, // Include the Firebase document ID
                ...variantDoc.data()
              }));
              console.log(`🔧 Direct fetch - fetched variants for uniform ${docRef.id}:`, variants);
            } catch (error) {
              console.error('Error fetching variants for uniform:', docRef.id, error);
              variants = data.variants || [];
            }
          }

          return {
            id: docRef.id,
            ...data,
            creatorName,
            creatorRole,
            variants,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
          };
        }));
      };

      const uniformsQuery = query(collection(db, 'uniforms'), orderBy('createdAt', 'desc'));
      const materialsQuery = query(collection(db, 'raw_materials'), orderBy('createdAt', 'desc'));

      const [uniformsSnapshot, materialsSnapshot] = await Promise.all([
        getDocs(uniformsQuery),
        getDocs(materialsQuery),
      ]);

      const uniformsData = await processSnapshot(uniformsSnapshot);
      const materialsData = await processSnapshot(materialsSnapshot, true);

      const allProducts = [...uniformsData, ...materialsData].sort((a, b) => b.createdAt - a.createdAt);

      setProducts(allProducts);
      console.log('Direct fetch completed:', allProducts.length, 'products loaded with creator info and variant IDs');
    } catch (error) {
      console.error('Error in direct fetchProducts:', error);
      setError('Failed to load products');
    }
  };

  const handleEdit = (product) => {
    navigate(`/inventory/edit/${product.id}`);
  };

  const handleDelete = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (productToDelete) {
      try {
        const isRawMaterial = productToDelete.type === 'raw_material';
        const { user, userProfile } = useAuthStore.getState();
        const fullName = userProfile?.firstName && userProfile?.lastName 
          ? `${userProfile.firstName} ${userProfile.lastName}`.trim()
          : userProfile?.displayName || user?.displayName || 'Unknown User';
        
        const userInfo = {
          id: user?.uid,
          name: fullName,
          fullName: fullName,
          email: user?.email
        };
        await deleteProduct(productToDelete.id, isRawMaterial, userInfo);
        // Update local state after successful deletion
        setProducts(prevProducts => prevProducts.filter(p => p.id !== productToDelete.id));
        setShowDeleteModal(false);
        setProductToDelete(null);
      } catch (error) {
        console.error("Delete error:", error);
        setError('Failed to delete product. Please try again.');
      }
    }
  };

  const handleReceive = (product) => {
    // Open receive modal with product data
    // Get the first variant and first size for initial display
    if (product.variants && product.variants.length > 0) {
      const firstVariant = product.variants[0];
      const firstSize = firstVariant.sizes && firstVariant.sizes.length > 0 ? firstVariant.sizes[0] : null;
      
      console.log('🎯 handleReceive - product:', product);
      console.log('🎯 handleReceive - firstVariant:', firstVariant);
      console.log('🎯 handleReceive - firstVariant.id:', firstVariant.id);
      
      if (firstSize) {
        const variantData = {
          ...firstVariant,
          id: firstVariant.id // Explicitly ensure the id is preserved
        };
        
        console.log('🎯 handleReceive - variantData being passed:', variantData);
        
        setReceiveModalData({
          product: product,
          variant: variantData,
          size: firstSize.size,
          currentStock: Number(firstSize.quantity) || 0,
          reorderLevel: firstSize.reorderLevel || firstVariant.defaultReorderLevel || 5,
          batchId: firstVariant.batchId || product.batchId
        });
        setShowReceiveModal(true);
      }
    }
  };

  // Export functions
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory');

    // Add headers
    worksheet.columns = [
      { header: 'Product Name', key: 'name', width: 30 },
      { header: 'Level', key: 'level', width: 20 },
      { header: 'School', key: 'school', width: 30 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Total Stock', key: 'stock', width: 15 },
      { header: 'Created By', key: 'creator', width: 25 },
      { header: 'Created At', key: 'date', width: 20 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data
    products.forEach(product => {
      worksheet.addRow({
        name: product.name,
        level: product.level,
        school: product.schoolName,
        type: product.type,
        status: calculateStockStatus(product.variants).type,
        stock: product.variants.reduce((total, variant) => 
          total + variant.sizes.reduce((sum, size) => sum + (size.quantity || 0), 0), 0),
        creator: product.creatorName,
        date: product.createdAt ? new Date(product.createdAt.toDate()).toLocaleDateString() : 'Unknown'
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(column.width || 10, 15);
    });

    // Generate and download the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory_report.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    
    // Add title
    page.drawText('Inventory Report', {
      x: 50,
      y: height - 50,
      size: 20,
      color: rgb(0, 0, 0),
    });

    // Add content
    let yOffset = height - 100;
    products.forEach((product, index) => {
      const stockStatus = calculateStockStatus(product.variants);
      const text = `${index + 1}. ${product.name} - ${product.level} - ${stockStatus.type}`;
      page.drawText(text, {
        x: 50,
        y: yOffset,
        size: 12,
        color: rgb(0, 0, 0),
      });
      yOffset -= 20;
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory_report.pdf';
    link.click();
  };

  // Enhanced filtering
  const filteredProducts = products.filter((product) => {
    console.log('Filtering product:', product); // Debug log for each product

    const matchesSearch = !searchTerm || 
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.type?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLevel = levelFilter === 'all' || product.level === levelFilter;
    const matchesSchool = schoolFilter === 'all' || product.school === schoolFilter;
    
    console.log('Search match:', matchesSearch);
    console.log('Level match:', matchesLevel);
    console.log('School match:', matchesSchool);
    
    return matchesSearch && matchesLevel && matchesSchool;
  });

  console.log('Final filtered products:', filteredProducts); // Debug log for final results

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    if (!acc[product.level]) {
      acc[product.level] = [];
    }
    acc[product.level].push(product);
    return acc;
  }, {});

  const handleViewDetails = (product) => {
    navigate(`/inventory/${product.id}`);
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const cardVariants = {
    hover: { scale: 1.02, transition: { duration: 0.2 } }
  };

  if (loading) {
    return <LoadingScreen message="Loading Inventory" description="Please wait while we fetch the inventory data" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="h-24 w-24 text-red-500 mb-6"
        >
          <AlertTriangle className="w-full h-full" />
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Inventory</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Try Again
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="min-h-screen bg-background dark:bg-black"
    >
      {/* ... existing breadcrumb ... */}

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
        {/* Header Section */}
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card dark:bg-black rounded-3xl shadow-xl border border-border dark:border-gray-700 overflow-hidden"
          >
          <div className="p-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                  Inventory Management
                </h1>
                <p className="mt-2 text-muted-foreground text-lg">
                  Track and manage your uniform inventory efficiently
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="relative">
                  <Button 
                    onClick={() => document.getElementById('exportDropdown').classList.toggle('hidden')}
                    className="group bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3"
                  >
                    <Download className="w-5 h-5" />
                    <span className="font-medium">Export</span>
                  </Button>
                  <div id="exportDropdown" className="hidden absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <button
                        onClick={async () => {
                          try {
                            await exportToExcel();
                          } catch (error) {
                            console.error('Error exporting to Excel:', error);
                          }
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export to Excel
                      </button>
                      <button
                        onClick={exportToPDF}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                      >
                        <FileText className="w-4 h-4" />
                        Export to PDF
                      </button>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate('/inventory/add')} 
                  className="group bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3"
                >
                  <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" />
                  <span className="font-medium">Add New Product</span>
                </Button>
              </div>
            </div>

            {/* Stats Cards with Modal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              <motion.div
                whileHover="hover"
                variants={cardVariants}
                className="bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => {
                  const allProducts = products.filter(p => !calculateStockStatus(p.variants).type.includes('out_of_stock') && !calculateStockStatus(p.variants).type.includes('low_stock'));
                  setSelectedProducts({
                    title: "Total Products",
                    products: allProducts,
                    type: "all"
                  });
                  setShowModal(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{calculateTotalInventoryCount(products)}</p>
                  </div>
                  <div className="h-12 w-12 bg-indigo-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Package className="w-6 h-6" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover="hover"
                variants={cardVariants}
                className="bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => {
                  const inStockProducts = products.filter(p => calculateStockStatus(p.variants).type === 'success');
                  setSelectedProducts({
                    title: "In Stock Products",
                    products: inStockProducts,
                    type: "in_stock"
                  });
                  setShowModal(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Stock</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                      {products.filter(p => calculateStockStatus(p.variants).type === 'success').length}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-emerald-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover="hover"
                variants={cardVariants}
                className="bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => {
                  const lowStockProducts = products.filter(p => calculateStockStatus(p.variants).type === 'warning');
                  setSelectedProducts({
                    title: "Low Stock Products",
                    products: lowStockProducts,
                    type: "low_stock"
                  });
                  setShowModal(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock</p>
                    <p className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">
                      {products.filter(p => calculateStockStatus(p.variants).type === 'warning').length}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-amber-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover="hover"
                variants={cardVariants}
                className="bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => {
                  const outOfStockProducts = products.filter(p => calculateStockStatus(p.variants).type === 'error');
                  setSelectedProducts({
                    title: "Out of Stock Products",
                    products: outOfStockProducts,
                    type: "out_of_stock"
                  });
                  setShowModal(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Out of Stock</p>
                    <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
                      {products.filter(p => calculateStockStatus(p.variants).type === 'error').length}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-red-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400">
                    <XCircle className="w-6 h-6" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Stock Details Modal */}
            <AnimatePresence>
              {showModal && selectedProducts && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={() => {
                    setShowModal(false);
                    setShowAllProducts(false);
                    setModalSearchTerm('');
                    setCurrentPage(1);
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white bg-dark rounded-3xl shadow-2xl max-w-6xl w-full max-h-[85vh] overflow-hidden border border-gray-200 dark:border-gray-700"
                  >
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between p-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl">
                            <Package className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedProducts.title}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {selectedProducts.products.length} product{selectedProducts.products.length !== 1 ? 's' : ''} found
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowModal(false);
                            setShowAllProducts(false);
                            setModalSearchTerm('');
                            setCurrentPage(1);
                          }}
                          className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all duration-200 group"
                        >
                          <X className="w-6 h-6 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
                        </button>
                      </div>
                    </div>

                    {/* Search Bar */}
                    {selectedProducts.products.length > 10 && (
                      <div className="sticky top-[100px] z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search products..."
                            value={modalSearchTerm}
                            onChange={(e) => {
                              setModalSearchTerm(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                          />
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="overflow-y-auto max-h-[calc(85vh-180px)] custom-scrollbar">
                      <div className="p-6">
                        {(() => {
                          // Filter products based on search term
                          const filteredProducts = selectedProducts.products.filter(product =>
                            product.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                            product.type.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                            product.level?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                            product.gender?.toLowerCase().includes(modalSearchTerm.toLowerCase())
                          );

                          if (filteredProducts.length === 0) {
                            return (
                              <div className="text-center py-12">
                                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                  <Package className="w-12 h-12 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                  {modalSearchTerm ? 'No matching products found' : 'No products found'}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400">
                                  {modalSearchTerm 
                                    ? `No products match "${modalSearchTerm}". Try a different search term.`
                                    : 'There are no products matching this criteria.'
                                  }
                                </p>
                              </div>
                            );
                          }

                          // Pagination logic
                          const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                          const endIndex = startIndex + ITEMS_PER_PAGE;
                          const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
                          const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

                          return (
                            <div className="space-y-4">
                              {/* Performance info for large datasets */}
                              {filteredProducts.length > 1000 && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mb-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                                      <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                        Large Dataset ({filteredProducts.length.toLocaleString()} products)
                                      </p>
                                      <p className="text-xs text-blue-700 dark:text-blue-300">
                                        Showing {ITEMS_PER_PAGE} items per page for optimal performance
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Products List */}
                              {paginatedProducts.map((product, productIndex) => (
                              <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: productIndex * 0.05 }}
                                className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300"
                              >
                                {/* Product Header */}
                                <div className="flex items-center justify-between mb-6">
                                  <div className="flex items-center gap-4">
                                    <div className="relative">
                                      <img
                                        src={getProductImage(product)}
                                        alt={product.name}
                                        className="w-20 h-20 rounded-2xl object-cover shadow-md"
                                      />
                                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                                        <span className="text-xs font-bold text-white">{product.variants?.length || 0}</span>
                                      </div>
                                    </div>
                                    <div>
                                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{product.name}</h3>
                                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{product.type}</p>
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium">
                                          {product.level || 'N/A'}
                                        </span>
                                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium">
                                          {product.gender || 'Unisex'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleViewDetails(product)}
                                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                                  >
                                    View Details
                                  </button>
                                </div>

                                {/* Variants Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                  {product.variants?.map((variant, idx) => {
                                    const variantStatus = calculateStockStatus([variant]);
                                    if (
                                      (selectedProducts.type === "out_of_stock" && variantStatus.type !== "error") ||
                                      (selectedProducts.type === "low_stock" && variantStatus.type !== "warning") ||
                                      (selectedProducts.type === "in_stock" && variantStatus.type !== "success")
                                    ) {
                                      return null;
                                    }
                                    
                                    const totalQuantity = variant.sizes?.reduce((sum, size) => sum + (Number(size.quantity) || 0), 0) || 0;
                                    
                                    return (
                                      <div key={idx} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200">
                                        <div className="flex justify-between items-start mb-3">
                                          <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-lg">{variant.variantType}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{variant.color}</p>
                                          </div>
                                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            variantStatus.type === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                            variantStatus.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                                            'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                          }`}>
                                            {totalQuantity} total
                                          </span>
                                        </div>
                                        
                                        {/* Size breakdown */}
                                        <div className="space-y-2">
                                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Size Breakdown</p>
                                          <div className="flex flex-wrap gap-2">
                                            {variant.sizes?.map((size, sizeIdx) => (
                                              <div key={sizeIdx} className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{size.size}</span>
                                                <span className={`text-xs font-bold ${
                                                  Number(size.quantity) === 0 ? 'text-red-600 dark:text-red-400' :
                                                  Number(size.quantity) <= (Number(size.reorderLevel) || 5) ? 'text-amber-600 dark:text-amber-400' :
                                                  'text-green-600 dark:text-green-400'
                                                }`}>
                                                  ({size.quantity})
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            ))}

                              {/* Pagination Controls */}
                              {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length.toLocaleString()} products
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                      disabled={currentPage === 1}
                                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all duration-200"
                                    >
                                      Previous
                                    </button>
                                    
                                    <div className="flex items-center gap-1">
                                      {/* Show page numbers with ellipsis for large datasets */}
                                      {(() => {
                                        const pages = [];
                                        const showEllipsis = totalPages > 7;
                                        
                                        if (!showEllipsis) {
                                          // Show all pages if 7 or fewer
                                          for (let i = 1; i <= totalPages; i++) {
                                            pages.push(i);
                                          }
                                        } else {
                                          // Show smart pagination with ellipsis
                                          if (currentPage <= 4) {
                                            pages.push(1, 2, 3, 4, 5, '...', totalPages);
                                          } else if (currentPage >= totalPages - 3) {
                                            pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                                          } else {
                                            pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                                          }
                                        }
                                        
                                        return pages.map((page, index) => (
                                          page === '...' ? (
                                            <span key={index} className="px-3 py-2 text-gray-400">...</span>
                                          ) : (
                                            <button
                                              key={page}
                                              onClick={() => setCurrentPage(page)}
                                              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                                                currentPage === page
                                                  ? 'bg-indigo-500 text-white shadow-lg'
                                                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                              }`}
                                            >
                                              {page}
                                            </button>
                                          )
                                        ));
                                      })()}
                                    </div>
                                    
                                    <button
                                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                      disabled={currentPage === totalPages}
                                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all duration-200"
                                    >
                                      Next
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Analytics Section */}
        <AnimatePresence>
          {showAnalytics && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white dark:bg-black rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              <DetailedInventoryAnalysis 
                data={{
                  schools,
                  inventory: products,
                  materials,
                  batches
                }}
                filters={{
                  level: levelFilter,
                  school: schoolFilter,
                  material: materialFilter,
                  batch: batchFilter
                }}
                searchQuery={searchTerm}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Filters and Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-black rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300"
                />
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="relative">
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    className="appearance-none block w-48 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 pr-10"
                  >
                    <option value="all">All Levels</option>
                    {getUniqueLevels(products).map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={schoolFilter}
                    onChange={(e) => setSchoolFilter(e.target.value)}
                    className="appearance-none block w-48 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 pr-10"
                  >
                    <option value="all">All Schools</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                  </select>
                  <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={materialFilter}
                    onChange={(e) => setMaterialFilter(e.target.value)}
                    className="appearance-none block w-48 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 pr-10"
                  >
                    <option value="all">All Materials</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>{material.name}</option>
                    ))}
                  </select>
                  <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    className="appearance-none block w-48 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 pr-10"
                  >
                    <option value="all">All Batches</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>Batch #{batch.batchNumber}</option>
                    ))}
                  </select>
                  <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border">
                <tr>
                  {[
                    { key: 'product', label: 'Product', align: 'left' },
                    { key: 'level', label: 'Level', align: 'center' },
                    { key: 'type', label: 'Type', align: 'center' },
                    { key: 'gender', label: 'Gender', align: 'center' },
                    { key: 'creator', label: 'Creator', align: 'center' },
                    { key: 'role', label: 'Role', align: 'center' },
                    { key: 'status', label: 'Status', align: 'center' },
                    { key: 'actions', label: 'Actions', align: 'center' }
                  ].map(({ key, label, align }) => (
                    <th key={key} scope="col" className={`px-6 py-4 text-${align} text-sm font-bold text-foreground`}>
                      <div className={`flex items-center gap-2 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
                        <span>{label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-card">
                {filteredProducts.map((product, index) => (
                  <tr key={product.id} className={`${index % 2 === 0 ? 'bg-card' : 'bg-muted/20'} hover:bg-primary/5 transition-all duration-200 cursor-pointer border-b border-border/50 last:border-b-0`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img 
                          src={getProductImage(product)} 
                          alt={product.name} 
                          className="w-12 h-12 rounded-lg object-cover border border-border shadow-sm"
                        />
                        <div>
                          <div className="font-semibold text-foreground">{product.name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{product.school ? schoolsMap[product.school] : 'General'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-600 border border-blue-200 dark:border-blue-800 capitalize">
                        {product.level || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-gradient-to-r from-green-500/10 to-green-600/10 text-green-600 border border-green-200 dark:border-green-800 capitalize">
                        {product.type || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-purple-600 border border-purple-200 dark:border-purple-800 capitalize">
                        {product.gender || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="bg-muted/30 rounded-lg p-2 border border-border">
                        <div className="text-sm font-medium text-foreground">{product.creatorName || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/50 rounded-full">
                        {product.creatorRole || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={calculateStockStatus(product.variants).type} className="px-3 py-1 rounded-full font-bold">
                        {calculateStockStatus(product.variants).type.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => handleViewDetails(product)} 
                          className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200 border border-blue-200"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isManager() && (
                          <>
                            <button 
                              onClick={() => handleReceive(product)} 
                              className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 transition-all duration-200 border border-green-200"
                              title="Receive Stock"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(product)} 
                              className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 border border-red-200"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Batch Management Modal */}
      <AnimatePresence>
        {showBatchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowBatchModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Batch Management</h2>
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                <div className="space-y-6">
                  {batches.map((batch) => (
                    <div key={batch.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{batch.batchNumber}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Created on {new Date(batch.createdAt.toDate()).toLocaleDateString()}</p>
                        </div>
                        <Badge
                          variant={
                            batch.status === 'completed' ? 'success' :
                            batch.status === 'in_progress' ? 'warning' :
                            'error'
                          }
                        >
                          {batch.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {batch.products.map((product, idx) => (
                          <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-gray-900 dark:text-gray-100">{product.name}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">Qty: {product.quantity}</span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Material: {product.material}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Deletion"
      >
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete the product "{productToDelete?.name}"? This action cannot be undone.
          </p>
          <div className="mt-6 flex justify-end space-x-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Receive Stock Modal */}
      {showReceiveModal && receiveModalData && (
        <ReorderModal
          isOpen={showReceiveModal}
          onClose={() => {
            setShowReceiveModal(false);
            setReceiveModalData(null);
          }}
          variant={receiveModalData.variant}
          size={receiveModalData.size}
          currentStock={receiveModalData.currentStock}
          reorderLevel={receiveModalData.reorderLevel}
          batchId={receiveModalData.batchId}
          product={receiveModalData.product}
        />
      )}
    </motion.div>
  );
};

export default Inventory;