import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getBatchAllocationSummary, getProductFlow } from '../utils/allocationTracker';
import Button from '../components/ui/Button';
import LoadingScreen from '../components/ui/LoadingScreen';
import {
    Package,
    ArrowLeft,
    ChevronDown,
    ChevronRight,
    Building2,
    Users,
    Box,
    Layers,
    Search,
    TrendingUp,
    BarChart3,
    ArrowRight,
    Boxes
} from 'lucide-react';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: 'spring', stiffness: 200, damping: 20 }
    }
};

const ProductFlow = () => {
    const navigate = useNavigate();
    const { batchId } = useParams();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [batches, setBatches] = useState([]);
    const [products, setProducts] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [flowData, setFlowData] = useState(null);
    const [expandedNodes, setExpandedNodes] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (batchId && batches.length > 0) {
            const batch = batches.find(b => b.id === batchId);
            if (batch) {
                setSelectedBatch(batch);
                generateFlowData(batch);
            }
        }
    }, [batchId, batches]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch batches
            const batchesSnapshot = await getDocs(query(collection(db, 'batchInventory'), orderBy('createdAt', 'desc')));
            const batchesData = batchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBatches(batchesData);

            // Fetch products/uniforms
            const uniformsSnapshot = await getDocs(collection(db, 'uniforms'));
            const uniformsData = uniformsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Fetch variants for each uniform
            const variantsSnapshot = await getDocs(collection(db, 'uniform_variants'));
            const variantsData = variantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Combine uniforms with variants
            const productsWithVariants = uniformsData.map(uniform => ({
                ...uniform,
                variants: variantsData.filter(v => v.uniformId === uniform.id)
            }));
            setProducts(productsWithVariants);

            // Fetch students
            const studentsSnapshot = await getDocs(collection(db, 'students'));
            const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(studentsData);

            setLoading(false);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load product flow data');
            setLoading(false);
        }
    };

    const generateFlowData = (batch) => {
        if (!batch) return;

        const flow = getProductFlow(batch, products, students);
        setFlowData(flow);

        // Auto-expand the batch node
        setExpandedNodes({ [batch.id]: true });
    };

    const toggleNode = (nodeId) => {
        setExpandedNodes(prev => ({
            ...prev,
            [nodeId]: !prev[nodeId]
        }));
    };

    const handleBatchSelect = (batch) => {
        setSelectedBatch(batch);
        generateFlowData(batch);
        navigate(`/product-flow/${batch.id}`, { replace: true });
    };

    const filteredBatches = useMemo(() =>
        batches.filter(batch =>
            batch.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            batch.type?.toLowerCase().includes(searchTerm.toLowerCase())
        ), [batches, searchTerm]
    );

    // Calculate overall stats
    const overallStats = useMemo(() => {
        let totalItems = 0;
        let totalAllocated = 0;
        let totalUnallocated = 0;

        batches.forEach(batch => {
            const summary = getBatchAllocationSummary(batch);
            totalItems += summary.totalOriginal;
            totalAllocated += summary.totalAllocated;
            totalUnallocated += summary.totalUnallocated;
        });

        return {
            totalItems,
            totalAllocated,
            totalUnallocated,
            allocationRate: totalItems > 0 ? ((totalAllocated / totalItems) * 100).toFixed(1) : 0
        };
    }, [batches]);

    if (loading) {
        return <LoadingScreen message="Loading Product Flow" description="Mapping inventory connections..." />;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-xl mb-4">{error}</div>
                    <Button onClick={() => navigate('/batches')}>Back to Batches</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/batches')}
                            className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Flow</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Track inventory from batch to student
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Cards */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    <motion.div
                        variants={itemVariants}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <Boxes className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Total Items</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">{overallStats.totalItems.toLocaleString()}</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        variants={itemVariants}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Allocated</p>
                                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{overallStats.totalAllocated.toLocaleString()}</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        variants={itemVariants}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                                <Box className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Unallocated</p>
                                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{overallStats.totalUnallocated.toLocaleString()}</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        variants={itemVariants}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Allocation Rate</p>
                                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{overallStats.allocationRate}%</p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Batch Selection Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
                    >
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Select Batch</h2>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search batches..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto">
                            {filteredBatches.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    No batches found
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {filteredBatches.map(batch => {
                                        const summary = getBatchAllocationSummary(batch);
                                        const isSelected = selectedBatch?.id === batch.id;
                                        const allocationPercent = parseFloat(summary.allocationRate) || 0;

                                        return (
                                            <div
                                                key={batch.id}
                                                onClick={() => handleBatchSelect(batch)}
                                                className={`p-4 cursor-pointer transition-all ${isSelected
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-l-transparent'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className={`font-medium truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                                                            {batch.name}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                            {summary.totalUnallocated} available • {summary.totalAllocated} allocated
                                                        </p>
                                                    </div>
                                                    <div className={`text-xs font-medium px-2 py-1 rounded-full ${allocationPercent >= 75
                                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                                            : allocationPercent >= 25
                                                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                        }`}>
                                                        {summary.allocationRate}%
                                                    </div>
                                                </div>

                                                {/* Progress bar */}
                                                <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${allocationPercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Flow Visualization */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
                    >
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="font-semibold text-gray-900 dark:text-white">
                                {selectedBatch ? (
                                    <span className="flex items-center gap-2">
                                        <Package className="w-5 h-5 text-blue-500" />
                                        {selectedBatch.name}
                                    </span>
                                ) : 'Select a batch to view flow'}
                            </h2>
                        </div>

                        <div className="p-6">
                            {!selectedBatch ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                                    <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                                        <Layers className="w-10 h-10" />
                                    </div>
                                    <p className="text-lg font-medium text-gray-600 dark:text-gray-300">No Batch Selected</p>
                                    <p className="text-sm">Select a batch from the left panel to view its product flow</p>
                                </div>
                            ) : flowData ? (
                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="space-y-4"
                                >
                                    {/* Batch Summary */}
                                    <motion.div
                                        variants={itemVariants}
                                        className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Package className="w-6 h-6" />
                                                <div>
                                                    <p className="font-semibold">{flowData.batch.name}</p>
                                                    <p className="text-sm opacity-80">{flowData.batch.totalItems} total items</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold">{flowData.batch.allocationRate}%</p>
                                                <p className="text-xs opacity-80">Allocated</p>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Flow Items */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Products */}
                                        <motion.div variants={itemVariants} className="space-y-3">
                                            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                <Layers className="w-4 h-4" />
                                                Products ({flowData.products.length})
                                            </h3>

                                            {flowData.products.length > 0 ? (
                                                flowData.products.map((product, idx) => (
                                                    <motion.div
                                                        key={product.productId || idx}
                                                        variants={itemVariants}
                                                        className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-white">{product.productName}</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                                    <Building2 className="w-3 h-3" />
                                                                    {product.schoolName || 'No School'}
                                                                </p>
                                                            </div>
                                                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                                                {product.totalQuantity} pcs
                                                            </span>
                                                        </div>

                                                        {product.studentAllocations.length > 0 && (
                                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                                    <Users className="w-3 h-3" />
                                                                    {product.studentAllocations.length} student allocations
                                                                </p>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                ))
                                            ) : (
                                                <div className="p-6 text-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                                                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm">No products allocated yet</p>
                                                </div>
                                            )}
                                        </motion.div>

                                        {/* Unallocated Items */}
                                        <motion.div variants={itemVariants} className="space-y-3">
                                            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                <Box className="w-4 h-4" />
                                                Unallocated ({flowData.unallocated.length} types)
                                            </h3>

                                            {flowData.unallocated.length > 0 ? (
                                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                                                    <div className="divide-y divide-gray-200 dark:divide-gray-600 max-h-[300px] overflow-y-auto">
                                                        {flowData.unallocated.map((item, idx) => (
                                                            <div key={idx} className="p-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors">
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.variantType}</p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                        {item.color} • Size {item.size}
                                                                    </p>
                                                                </div>
                                                                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                                                                    {item.quantity} pcs
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-6 text-center bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                                                    <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Fully Allocated!</p>
                                                    <p className="text-xs text-emerald-600 dark:text-emerald-500">All items have been assigned to products</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="text-center text-gray-400 dark:text-gray-500 py-12">
                                    <Box className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No flow data available for this batch</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default ProductFlow;
