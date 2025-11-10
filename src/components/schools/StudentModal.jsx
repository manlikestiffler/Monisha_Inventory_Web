import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, School, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

const StudentModal = ({ isOpen, onClose, school, initialData, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState({
    name: '',
    form: '',
    level: 'Junior',
    gender: 'Boys'
  });

  useEffect(() => {
    if (initialData) {
      setStudentData({
        name: initialData.name || '',
        form: initialData.form || '',
        level: initialData.level || 'Junior',
        gender: initialData.gender || 'Boys'
      });
    } else if (!isOpen) {
      setStudentData({
        name: '',
        form: '',
        level: 'Junior',
        gender: 'Boys'
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStudentData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!studentData.name.trim()) {
      toast.error('Please enter the student name');
      return;
    }

    if (!studentData.form.trim()) {
      toast.error('Please enter the student form');
      return;
    }

    try {
      setLoading(true);
      
      const studentToSave = {
        ...studentData,
        name: studentData.name.trim(),
        form: studentData.form.trim()
      };
      
      // If adding new student, include timestamps and schoolId
      if (!initialData) {
        studentToSave.schoolId = school.id;
        studentToSave.uniformLog = [];
        studentToSave.createdAt = new Date().toISOString();
        studentToSave.updatedAt = new Date().toISOString();
      } else {
        studentToSave.updatedAt = new Date().toISOString();
      }
      
      await onSave(studentToSave);
      toast.success(`${studentData.name} has been ${initialData ? 'updated' : 'added'} successfully`);
      onClose();
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error(error.message || 'Failed to save student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      transition: { 
        type: 'spring', 
        stiffness: 300, 
        damping: 30 
      } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      transition: { duration: 0.2 } 
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={modalVariants}
          className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                  <User className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {initialData ? 'Edit Student' : 'Add New Student'}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {initialData ? 'Update student information' : `Add to ${school?.name}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto space-y-6">
              {/* Student Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <User size={16} />
                  Student Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={studentData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  disabled={loading}
                  required
                />
              </div>

              {/* Form */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <GraduationCap size={16} />
                  Form *
                </label>
                <input
                  type="text"
                  name="form"
                  value={studentData.form}
                  onChange={handleChange}
                  placeholder="Enter form (e.g., 1A, 2B, 3C, 4A, 5B, 6C)"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  disabled={loading}
                  required
                />
              </div>

              {/* Level Selector */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <School size={16} />
                  Level *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['Junior', 'Senior'].map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setStudentData(prev => ({ ...prev, level }))}
                      disabled={loading}
                      className={`px-4 py-3 rounded-xl font-medium transition-all ${
                        studentData.level === level
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 ring-2 ring-red-600 ring-offset-2 dark:ring-offset-gray-900'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender Selector */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <User size={16} />
                  Gender *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['Boys', 'Girls'].map(gender => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => setStudentData(prev => ({ ...prev, gender }))}
                      disabled={loading}
                      className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center space-x-2 ${
                        studentData.gender === gender
                          ? gender === 'Boys'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 ring-2 ring-red-600 ring-offset-2 dark:ring-offset-gray-900'
                            : 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 ring-2 ring-pink-600 ring-offset-2 dark:ring-offset-gray-900'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span>{gender === 'Boys' ? '👦' : '👧'}</span>
                      <span>{gender}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <School size={14} />
                  Summary
                </h3>
                <div className="space-y-1 text-sm text-blue-800 dark:text-blue-400">
                  <p>• <span className="font-semibold">{studentData.name || 'Student Name'}</span> - Form {studentData.form || 'N/A'}</p>
                  <p>• {studentData.level} Level • {studentData.gender}</p>
                  <p className="text-xs mt-2 text-blue-700 dark:text-blue-500">
                    {initialData ? 'Will update student information' : `Will be enrolled at ${school?.name}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-3 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg shadow-red-600/30"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{initialData ? 'Updating...' : 'Adding Student...'}</span>
                  </>
                ) : (
                  <>
                    <User size={16} />
                    <span>{initialData ? 'Update Student' : 'Add Student'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StudentModal;
