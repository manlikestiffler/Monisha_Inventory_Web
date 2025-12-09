import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { FiFilter, FiGrid, FiList, FiPlus, FiSearch } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import AddSchoolModal from '../components/schools/AddSchoolModal';
import Button from '../components/ui/Button';
import LoadingScreen from '../components/ui/LoadingScreen';
import { useSchoolStore } from '../stores/schoolStore';
import { useAuthStore } from '../stores/authStore';
import { exportToExcel, exportToPDF, exportToDocx } from '../utils/exportHelper';
import { FiDownload } from 'react-icons/fi'; // Using react-icons since file already uses it

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
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

const NewSchools = () => {
  const { schools, fetchSchools, addSchool, deleteSchool, getTotalStudentCount, getStudentCountForSchool } = useSchoolStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    showActive: true,
    showInactive: true,
  });
  const [viewMode, setViewMode] = useState('grid');
  const [totalStudents, setTotalStudents] = useState(0);
  const [schoolStudentCounts, setSchoolStudentCounts] = useState({});

  useEffect(() => {
    const loadSchools = async () => {
      try {
        setLoading(true);
        await fetchSchools();
        await loadStudentCounts();
      } catch (err) {
        console.error('Error fetching schools:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSchools();
  }, [fetchSchools]);

  const loadStudentCounts = async () => {
    try {
      // Get total student count
      const total = await getTotalStudentCount();
      setTotalStudents(total);

      // Get student count for each school
      const counts = {};
      for (const school of schools) {
        counts[school.id] = await getStudentCountForSchool(school.id);
      }
      setSchoolStudentCounts(counts);
    } catch (error) {
      console.error('Error loading student counts:', error);
    }
  };

  // Reload student counts when schools change
  useEffect(() => {
    if (schools.length > 0) {
      loadStudentCounts();
    }
  }, [schools]);


  const handleDeleteSchool = async (id) => {
    if (window.confirm('Are you sure you want to delete this school?')) {
      try {
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
        await deleteSchool(id, userInfo);
      } catch (error) {
        console.error('Error deleting school:', error);
      }
    }
  };

  const filteredSchools = schools.filter(school => {
    const nameMatch = school.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const addressMatch = school.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = nameMatch || addressMatch;

    const matchesFilter = (filterOptions.showActive && school.status !== 'inactive') ||
      (filterOptions.showInactive && school.status === 'inactive');
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return <LoadingScreen message="Loading Schools" description="Please wait while we fetch your school data" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="h-24 w-24 text-red-500 mb-6"
        >
          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Schools</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <Button
            onClick={() => fetchSchools()}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Try Again
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-white dark:bg-black min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-black p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Schools</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400 font-light">Manage all schools and their uniform requirements</p>
        </div>
        <div className="flex gap-2">
          <div className="relative group">
            <Button
              variant="outline"
              className="flex items-center gap-2 border-gray-300 dark:border-gray-600"
            >
              <FiDownload className="h-5 w-5" />
              Export
            </Button>
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-20 hidden group-hover:block">
              <button
                onClick={() => handleExport('excel')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-200"
              >
                Export to Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-200"
              >
                Export to PDF
              </button>
              <button
                onClick={() => handleExport('docx')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-200"
              >
                Export to DOCX
              </button>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 shadow-md"
          >
            <FiPlus className="h-5 w-5" />
            Add School
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-black p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="Search schools by name or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 border-r pr-3 border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                title="Grid view"
              >
                <FiGrid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                title="List view"
              >
                <FiList className="h-5 w-5" />
              </button>
            </div>
            <div className="relative group">
              <button
                className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 flex items-center gap-2"
              >
                <FiFilter className="h-5 w-5" />
                <span className="hidden md:inline">Filters</span>
              </button>
              <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-10 hidden group-hover:block">
                <div className="mb-3">
                  <div className="flex items-center mb-2">
                    <input
                      id="active"
                      type="checkbox"
                      className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700"
                      checked={filterOptions.showActive}
                      onChange={() => setFilterOptions(prev => ({ ...prev, showActive: !prev.showActive }))}
                    />
                    <label htmlFor="active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Active Schools
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="inactive"
                      type="checkbox"
                      className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700"
                      checked={filterOptions.showInactive}
                      onChange={() => setFilterOptions(prev => ({ ...prev, showInactive: !prev.showInactive }))}
                    />
                    <label htmlFor="inactive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Inactive Schools
                    </label>
                  </div>
                </div>

                <button
                  className="w-full text-xs text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 font-medium"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterOptions({ showActive: true, showInactive: true });
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schools Grid/List */}
      <AnimatePresence mode="wait">
        {filteredSchools.length === 0 ? (
          <div className="bg-white dark:bg-black p-10 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-800">
              <svg className="w-8 h-8 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No schools found</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchTerm || !filterOptions.showActive || !filterOptions.showInactive
                ? "Try adjusting your search or filters"
                : "Add a new school to get started"}
            </p>
            <Button
              variant="primary"
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Add School
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <motion.div
            key="grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredSchools.map((school) => (
              <motion.div
                key={school.id}
                variants={itemVariants}
                className="bg-white dark:bg-black overflow-hidden transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{school.name}</h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-light">{school.address}</p>
                    </div>
                    {school.status === 'inactive' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Contact</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{school.contact || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Students</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{schoolStudentCounts[school.id] || 0}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Link
                      to={`/schools/${school.id}`}
                      className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 font-medium text-sm bg-gray-200 dark:bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                    >
                      View Details
                    </Link>
                    <Button
                      variant="ghost"
                      className="text-gray-600 hover:text-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg px-3 py-2"
                      onClick={() => handleDeleteSchool(school.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            className="bg-white dark:bg-black overflow-hidden"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredSchools.map((school) => (
                <motion.div
                  key={school.id}
                  variants={itemVariants}
                  className="flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{school.name}</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-light">{school.address}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Link
                      to={`/schools/${school.id}`}
                      className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                    >
                      Details
                    </Link>
                    <button
                      onClick={() => handleDeleteSchool(school.id)}
                      className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add School Modal */}
      <AddSchoolModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
};

export default NewSchools;