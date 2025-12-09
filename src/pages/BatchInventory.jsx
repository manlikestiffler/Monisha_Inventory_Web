import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { useBatchStore } from '../stores/batchStore';
import { useSchoolStore } from '../stores/schoolStore';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Search, Plus, Filter, FileText, Edit2, Trash2, TrendingUp, Package, DollarSign, BarChart2, X, AlertTriangle, Download, FileSpreadsheet, GitBranch } from 'lucide-react';
import { collection, getDocs, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import LoadingScreen from '../components/ui/LoadingScreen';
import Modal from '../components/ui/Modal';
import { exportToExcel, exportToPDF, exportToDocx } from '../utils/exportHelper';
import { getAggregatedAllocationData, getBatchAllocationSummary } from '../utils/allocationTracker';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
    },
  },
};

import EditBatchModal from '../components/batches/EditBatchModal';

const BatchInventory = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { user, isManager } = useAuthStore();
  const { deleteBatch } = useBatchStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localBatches, setLocalBatches] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalBatches: 0,
    totalValue: 0,
    totalItems: 0,
    allocatedItems: 0,
    unallocatedItems: 0,
    allocatedValue: 0,
    unallocatedValue: 0,
    allocationRate: 0
  });
  const [creatorNames, setCreatorNames] = useState({});

  // State for Edit Modal
  const [editingBatch, setEditingBatch] = useState(null);

  // Filter States
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All'); // 'All', 'Depleted', 'Available'

  const formatCreatorName = (createdBy) => {
    if (!createdBy) return 'N/A';

    // If it's already a proper name (doesn't contain @), return as is
    if (!createdBy.includes('@')) {
      return createdBy;
    }

    // If it's an email, format it to a readable name
    const name = createdBy.split('@')[0];
    return name.replace(/[._]/g, ' ')
      .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  };

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'batchInventory'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const batchesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Don't set batches immediately - wait for creator names to be fetched first
      const creatorEmails = [...new Set(batchesData.map(b => b.createdBy).filter(Boolean))];

      if (creatorEmails.length > 0) {
        const namesMap = { ...creatorNames };
        const emailsToFetch = creatorEmails.filter(email => !namesMap[email]);

        if (emailsToFetch.length > 0) {
          const fetchNames = async (emails, collectionName) => {
            const fetchedNames = {};
            const profilesRef = collection(db, collectionName);
            // Firestore 'in' query supports up to 30 elements in the array
            const chunks = [];
            for (let i = 0; i < emails.length; i += 30) {
              chunks.push(emails.slice(i, i + 30));
            }
            for (const chunk of chunks) {
              const userQuery = query(profilesRef, where('email', 'in', chunk));
              const querySnapshot = await getDocs(userQuery);
              querySnapshot.forEach(doc => {
                const profile = doc.data();
                const fullName = profile.fullName ||
                  `${profile.firstName || ''} ${profile.lastName || ''}`.trim() ||
                  profile.displayName ||
                  profile.name;
                if (profile.email && fullName) {
                  fetchedNames[profile.email] = fullName;
                }
              });
            }
            return fetchedNames;
          };

          const staffNames = await fetchNames(emailsToFetch, 'inventory_staff');
          const managerNames = await fetchNames(emailsToFetch, 'inventory_managers');

          const updatedCreatorNames = { ...namesMap, ...staffNames, ...managerNames };
          setCreatorNames(updatedCreatorNames);

          // Now set batches after creator names are ready
          setBatches(batchesData);
          setLocalBatches(batchesData);
        } else {
          // Creator names already available, set batches immediately
          setBatches(batchesData);
          setLocalBatches(batchesData);
        }
      } else {
        // No creators to fetch, set batches immediately
        setBatches(batchesData);
        setLocalBatches(batchesData);
      }

      setLoading(false);
    }, (error) => {
      console.error("Error fetching batches:", error);
      setError('Failed to load batches.');
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setLocalBatches(batches);
  }, [batches]);

  const filteredBatches = localBatches.filter(batch => {
    const matchesSearch = (
      (batch?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (batch?.type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (batch?.createdBy?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const batchDate = batch.createdAt?.seconds ? new Date(batch.createdAt.seconds * 1000) : new Date();
    const matchesYear = selectedYear === 'All' || batchDate.getFullYear().toString() === selectedYear;

    const totalQuantity = batch.items?.reduce((sum, item) => sum + item.sizes?.reduce((sizeSum, size) => sizeSum + (size.quantity || 0), 0), 0) || 0;
    const totalAllocated = batch.items?.reduce((sum, item) => sum + item.sizes?.reduce((sizeSum, size) => sizeSum + (size.allocated || 0), 0), 0) || 0;
    const isDepleted = totalQuantity === 0;
    const hasAllocations = totalAllocated > 0;
    const isFullyAllocated = totalQuantity === 0 && totalAllocated > 0;

    let matchesStatus = true;
    if (selectedStatus === 'Depleted') {
      matchesStatus = isDepleted;
    } else if (selectedStatus === 'Available') {
      matchesStatus = !isDepleted;
    } else if (selectedStatus === 'Allocated') {
      matchesStatus = hasAllocations;
    } else if (selectedStatus === 'Unallocated') {
      matchesStatus = !hasAllocations && totalQuantity > 0;
    } else if (selectedStatus === 'Partially Allocated') {
      matchesStatus = hasAllocations && totalQuantity > 0;
    }

    return matchesSearch && matchesYear && matchesStatus;
  });

  // Get unique years for filter
  const years = ['All', ...new Set(localBatches.map(batch => {
    const date = batch.createdAt?.seconds ? new Date(batch.createdAt.seconds * 1000) : new Date();
    return date.getFullYear().toString();
  }))].sort((a, b) => b - a);

  const handleDeleteClick = (batch) => {
    if (!batch?.id) {
      // For undefined batches, remove them directly from local state
      setLocalBatches(prev => prev.filter(b => b !== batch));
      return;
    }
    setBatchToDelete(batch);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!batchToDelete) return;

    try {
      setIsDeleting(true);
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
      await deleteBatch(batchToDelete.id, userInfo);
      // Update local state immediately
      setLocalBatches(prev => prev.filter(batch => batch.id !== batchToDelete.id));
      setShowDeleteModal(false);
      setBatchToDelete(null);
    } catch (error) {
      console.error('Error deleting batch:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async (format) => {
    const data = filteredBatches.map(batch => ({
      name: batch.name,
      type: batch.type,
      createdBy: creatorNames[batch.createdBy] || formatCreatorName(batch.createdBy),
      itemsCount: batch.items?.reduce((sum, item) => sum + item.sizes?.reduce((sizeSum, size) => sizeSum + (size.quantity || 0), 0), 0) || 0,
      value: batch.items?.reduce((sum, item) => sum + item.sizes?.reduce((sizeSum, size) => sizeSum + ((size.quantity || 0) * (item.price || 0)), 0), 0) || 0,
      date: batch.createdAt?.seconds ? new Date(batch.createdAt.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString()
    }));

    const columns = [
      { header: 'Batch Name', key: 'name', width: 25 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Created By', key: 'createdBy', width: 20 },
      { header: 'Items', key: 'itemsCount', width: 10 },
      { header: 'Value', key: 'value', width: 15 },
      { header: 'Date', key: 'date', width: 15 }
    ];

    const filename = `batch_inventory_${new Date().toISOString().split('T')[0]}`;

    try {
      if (format === 'excel') {
        await exportToExcel(data, columns, 'Batches', filename);
      } else if (format === 'pdf') {
        exportToPDF(data, columns, 'Batch Inventory Report', filename);
      } else if (format === 'docx') {
        await exportToDocx(data, columns, 'Batch Inventory Report', filename);
      }
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export batches');
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading Batches" description="Please wait while we fetch the batch data" />;
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Batches</h2>
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
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
            Batch Inventory
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your uniform batches</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/product-flow')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-3 rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
          >
            <GitBranch className="w-5 h-5" />
            Product Flow
          </Button>
          {isManager() && (
            <Button
              onClick={() => navigate('/batches/create')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New Batch
            </Button>
          )}
        </div>
      </div>
      <div className="flex gap-4">
        <div className="relative">
          <Button
            onClick={() => document.getElementById('batchExportDropdown').classList.toggle('hidden')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export
          </Button>
          <div id="batchExportDropdown" className="hidden absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1">
              <button
                onClick={() => handleExport('excel')}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export to Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                <FileText className="w-4 h-4" />
                Export to PDF
              </button>
              <button
                onClick={() => handleExport('docx')}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                <FileText className="w-4 h-4" />
                Export to DOCX
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      {(() => {
        const allocationData = getAggregatedAllocationData(filteredBatches);
        return (
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 dark:bg-black"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={itemVariants}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-black dark:to-black p-6 rounded-2xl border border-blue-100 dark:border-gray-700"
            >
              <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Total Batches</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{filteredBatches.length}</div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-black dark:to-black p-6 rounded-2xl border border-purple-100 dark:border-gray-700"
            >
              <div className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">Allocation Rate</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {allocationData.allocationRate}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {allocationData.totalAllocated.toLocaleString()} of {allocationData.totalOriginal.toLocaleString()} items
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-black dark:to-black p-6 rounded-2xl border border-emerald-100 dark:border-gray-700"
            >
              <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">Allocated Value</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${allocationData.allocatedValue.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {allocationData.totalAllocated.toLocaleString()} items to products
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-black dark:to-black p-6 rounded-2xl border border-amber-100 dark:border-gray-700"
            >
              <div className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">Unallocated (Warehouse)</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${allocationData.unallocatedValue.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {allocationData.totalUnallocated.toLocaleString()} items available
              </div>
            </motion.div>
          </motion.div>
        );
      })()}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search batches..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-sm"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-[120px]"
          >
            {years.map(year => (
              <option key={year} value={year}>{year === 'All' ? 'All Years' : year}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-[180px]"
          >
            <option value="All">All Status</option>
            <option value="Available">Available (Has Stock)</option>
            <option value="Depleted">Depleted (No Stock)</option>
            <option value="Allocated">Allocated (Used)</option>
            <option value="Unallocated">Unallocated (Unused)</option>
            <option value="Partially Allocated">Partially Allocated</option>
          </select>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Batch"
      >
        <div className="p-6">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Are you sure?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You are about to delete the batch <span className="font-semibold text-gray-800 dark:text-gray-200">{batchToDelete?.name}</span>.
              This action is irreversible.
            </p>
          </div>
          <div className="mt-6 flex justify-center gap-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} isLoading={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Batch'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Batch Modal */}
      <EditBatchModal
        isOpen={!!editingBatch}
        onClose={() => setEditingBatch(null)}
        batch={editingBatch}
      />

      {/* Batch List */}
      <div className="mt-6">
        {filteredBatches.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-black rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border">
                  <tr>
                    {[
                      { key: 'batch', label: 'Batch', align: 'left' },
                      { key: 'items', label: 'Items', align: 'center' },
                      { key: 'value', label: 'Value', align: 'center' },
                      { key: 'creator', label: 'Creator', align: 'center' },
                      { key: 'created', label: 'Created', align: 'center' },
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
                  {filteredBatches.map((batch, index) => {
                    const totalItems = batch.items?.reduce((sum, item) => sum + item.sizes?.reduce((sizeSum, size) => sizeSum + (size.quantity || 0), 0), 0) || 0;
                    const totalValue = batch.items?.reduce((sum, item) => sum + item.sizes?.reduce((sizeSum, size) => sizeSum + ((size.quantity || 0) * (item.price || 0)), 0), 0) || 0;
                    const isDepleted = totalItems === 0;
                    return (
                      <tr key={batch.id} className={`${index % 2 === 0 ? 'bg-card' : 'bg-muted/20'} hover:bg-primary/5 transition-all duration-200 cursor-pointer border-b border-border/50 last:border-b-0 ${isDepleted ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-2">
                                {batch.name}
                                {isDepleted && (
                                  <span className="px-2 py-1 inline-flex items-center text-xs font-bold rounded-full bg-gradient-to-r from-red-500/10 to-red-600/10 text-red-600 border border-red-200 dark:border-red-800">
                                    Depleted
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">{batch.type}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-600 border border-blue-200 dark:border-blue-800">
                            {totalItems} pcs
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-gradient-to-r from-green-500/10 to-green-600/10 text-green-600 border border-green-200 dark:border-green-800">
                            ${totalValue.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="bg-muted/30 rounded-lg p-2 border border-border">
                            <div className="text-sm font-medium text-foreground">{creatorNames[batch.createdBy] || formatCreatorName(batch.createdBy)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/50 rounded-full">
                            {new Date(batch.createdAt?.seconds * 1000).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => navigate(`/batches/${batch.id}`)}
                              className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200 border border-blue-200"
                              title="View Batch"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            {isManager() && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingBatch(batch);
                                  }}
                                  className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 transition-all duration-200 border border-amber-200"
                                  title="Edit Batch"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(batch);
                                  }}
                                  className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 border border-red-200"
                                  title="Delete Batch"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-gray-500 dark:text-gray-400"
            >
              No batches found.
            </motion.div>
          )
        )}
      </div>
    </div >
  );
};

export default BatchInventory;