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
  X
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { useInventoryStore } from '../stores/inventoryStore';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUniformIcon } from '../constants/icons';

// Get unique categories from products
const getUniqueCategories = (products) => {
  return [...new Set(products.map(product => product.category))].filter(Boolean);
};

// Enhanced helper function to calculate detailed stock status
const calculateStockStatus = (variants) => {
  if (!Array.isArray(variants)) {
    return { type: 'unknown', message: 'Status Unknown', details: [] };
  }

  let variantStatuses = [];

  variants.forEach(variant => {
    if (!variant?.sizes || !Array.isArray(variant.sizes)) return;

    const variantName = variant.variantType || 'Unknown';
    let totalQuantity = 0;
    let status = 'in_stock';

    variant.sizes.forEach(size => {
      const quantity = Number(size?.quantity) || 0;
      totalQuantity += quantity;
    });

    if (totalQuantity === 0) {
      status = 'out_of_stock';
    } else if (totalQuantity < 5) {
      status = 'low_stock';
    }

    variantStatuses.push({
      name: variantName,
      status,
      quantity: totalQuantity
    });
  });

  return {
    details: variantStatuses,
    type: variantStatuses.some(v => v.status === 'out_of_stock') ? 'out_of_stock' :
          variantStatuses.some(v => v.status === 'low_stock') ? 'low_stock' : 'in_stock'
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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(null);

  const { deleteUniform } = useInventoryStore();

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const schoolsSnapshot = await getDocs(collection(db, 'schools'));
        const schoolsList = schoolsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSchools(schoolsList);
      } catch (error) {
        console.error('Error fetching schools:', error);
      }
    };

    fetchSchools();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Fetch uniforms
        const uniformsQuery = query(collection(db, 'uniforms'), orderBy('createdAt', 'desc'));
        const uniformsSnapshot = await getDocs(uniformsQuery);
        const uniformsData = await Promise.all(uniformsSnapshot.docs.map(async (docSnapshot) => {
          const uniform = { id: docSnapshot.id, ...docSnapshot.data() };
          
          // Fetch school data
          if (uniform.school) {
            const schoolDocRef = doc(db, 'schools', uniform.school);
            const schoolDocSnapshot = await getDoc(schoolDocRef);
            if (schoolDocSnapshot.exists()) {
              uniform.schoolName = schoolDocSnapshot.data().name;
            }
          }

          // Fetch creator data
          if (uniform.createdBy) {
            const userDocRef = doc(db, 'users', uniform.createdBy);
            const userDocSnapshot = await getDoc(userDocRef);
            if (userDocSnapshot.exists()) {
              const userData = userDocSnapshot.data();
              uniform.creatorName = userData.name || userData.email;
              uniform.creatorRole = userData.role || 'Unknown Role';
            }
          }

          return uniform;
        }));

        setProducts([...uniformsData]);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleEdit = (product) => {
    navigate(`/inventory/edit/${product.id}`);
  };

  const handleDelete = async (id) => {
    try {
      if (window.confirm('Are you sure you want to delete this product?')) {
        await deleteUniform(id);
        // Refresh the products list
        window.location.reload();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesSchool = schoolFilter === 'all' || product.school === schoolFilter;
    return matchesSearch && matchesCategory && matchesSchool;
  });

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {});

  const handleViewDetails = (product) => {
    navigate(`/inventory/${product.id}`);
  };

  const categories = getUniqueCategories(products);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const cardVariants = {
    hover: { scale: 1.02, transition: { duration: 0.2 } }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin"></div>
          <div className="mt-4 text-purple-400 font-medium">Loading inventory...</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white"
    >
      {/* Breadcrumb */}
      <div className="max-w-[1600px] mx-auto px-6 pt-8">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Dashboard</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-indigo-600 font-medium">Inventory</span>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
        >
          <div className="p-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                  Inventory Management
                </h1>
                <p className="mt-2 text-gray-600 text-lg">
                  Track and manage your uniform inventory efficiently
                </p>
              </div>
              <Button 
                onClick={() => navigate('/inventory/add')} 
                className="group bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3"
              >
                <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" />
                <span className="font-medium">Add New Product</span>
              </Button>
            </div>

            {/* Stats Cards with Modal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              <motion.div
                whileHover="hover"
                variants={cardVariants}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => {
                  const allProducts = products.filter(p => !calculateStockStatus(p.variants).type.includes('out_of_stock') && !calculateStockStatus(p.variants).type.includes('low_stock'));
                  setSelectedProducts({
                    title: "In Stock Products",
                    products: allProducts,
                    type: "in_stock"
                  });
                  setShowModal(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Items</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{products.length}</p>
                  </div>
                  <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Package className="w-6 h-6" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover="hover"
                variants={cardVariants}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => {
                  const inStockProducts = products.filter(p => !calculateStockStatus(p.variants).type.includes('out_of_stock') && !calculateStockStatus(p.variants).type.includes('low_stock'));
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
                    <p className="text-sm font-medium text-gray-600">In Stock</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-600">
                      {products.filter(p => !calculateStockStatus(p.variants).type.includes('out_of_stock') && !calculateStockStatus(p.variants).type.includes('low_stock')).length}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover="hover"
                variants={cardVariants}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => {
                  const lowStockProducts = products.filter(p => calculateStockStatus(p.variants).type.includes('low_stock'));
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
                    <p className="text-sm font-medium text-gray-600">Low Stock</p>
                    <p className="mt-2 text-3xl font-bold text-amber-600">
                      {products.filter(p => calculateStockStatus(p.variants).type.includes('low_stock')).length}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover="hover"
                variants={cardVariants}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => {
                  const outOfStockProducts = products.filter(p => calculateStockStatus(p.variants).type.includes('out_of_stock'));
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
                    <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                    <p className="mt-2 text-3xl font-bold text-red-600">
                      {products.filter(p => calculateStockStatus(p.variants).type.includes('out_of_stock')).length}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
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
                  className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                  onClick={() => setShowModal(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
                  >
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-900">{selectedProducts.title}</h2>
                      <button
                        onClick={() => setShowModal(false)}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        <X className="w-6 h-6 text-gray-500" />
                      </button>
                    </div>
                    <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                      <div className="space-y-6">
                        {selectedProducts.products.map((product) => (
                          <div key={product.id} className="bg-gray-50 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <img
                                  src={getProductImage(product)}
                                  alt={product.name}
                                  className="w-16 h-16 rounded-xl object-cover"
                                />
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                                  <p className="text-sm text-gray-500">{product.type}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleViewDetails(product)}
                                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors text-sm font-medium"
                              >
                                View Details
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {product.variants.map((variant, idx) => {
                                const variantStatus = calculateStockStatus([variant]);
                                if (
                                  (selectedProducts.type === "out_of_stock" && variantStatus.type !== "out_of_stock") ||
                                  (selectedProducts.type === "low_stock" && variantStatus.type !== "low_stock") ||
                                  (selectedProducts.type === "in_stock" && (variantStatus.type === "out_of_stock" || variantStatus.type === "low_stock"))
                                ) {
                                  return null;
                                }
                                return (
                                  <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="font-medium text-gray-900">{variant.variantType}</span>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        variantStatus.type === 'out_of_stock' ? 'bg-red-50 text-red-700' :
                                        variantStatus.type === 'low_stock' ? 'bg-amber-50 text-amber-700' :
                                        'bg-green-50 text-green-700'
                                      }`}>
                                        {variantStatus.details[0].quantity} in stock
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      Sizes: {variant.sizes.map(s => `${s.size} (${s.quantity})`).join(', ')}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Filters and Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
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
                  className="block w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300"
                />
              </div>
              
              <div className="flex gap-4">
                <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                    className="appearance-none block w-48 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 pr-10"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
                  <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative">
              <select
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                    className="appearance-none block w-48 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 pr-10"
              >
                <option value="all">All Schools</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </select>
                  <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added By</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <AnimatePresence>
                {filteredProducts.map((product) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="group hover:bg-gray-50 transition-all duration-300"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-12 w-12 flex-shrink-0 relative group">
                          <motion.img
                            whileHover={{ scale: 1.05 }}
                            className="h-12 w-12 rounded-2xl object-cover border border-gray-200 group-hover:border-indigo-500/50 transition-all duration-300"
                            src={getProductImage(product)}
                            alt={product.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = getDefaultProductImage(product.name, product.type);
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors">
                        {product.schoolName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                          {(product.creatorName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-900">{product.creatorName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                        {product.creatorRole || 'Unknown Role'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {product.createdAt ? new Date(product.createdAt.toDate()).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleViewDetails(product)}
                          className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-xl transition-all duration-300"
                        >
                          <Eye className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-xl transition-all duration-300"
                        >
                          <Edit2 className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-xl transition-all duration-300"
                        >
                          <Trash2 className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Inventory; 