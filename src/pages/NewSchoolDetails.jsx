import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useSchoolStore } from '../stores/schoolStore';
import { useUniformStore } from '../stores/uniformStore';
import useNotificationStore from '../stores/notificationStore';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import StudentModal from '../components/schools/StudentModal';
import SchoolTabUI from '../components/schools/SchoolTabUI';
import ModernStudentList from '../components/schools/ModernStudentList';
import { 
  FiArrowLeft, 
  FiPlus, 
  FiTrash2, 
  FiEdit2,
  FiUsers,
  FiHome,
  FiPhone,
  FiMail,
  FiCheckCircle,
  FiXCircle,
  FiInfo,
  FiShoppingBag,
  FiSave,
  FiX,
  FiAlertCircle,
  FiDownload,
  FiUpload,
  FiEye,
  FiCheck
} from 'react-icons/fi';
import UniformDeficitReport from '../components/students/UniformDeficitReport';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Helper Components (moved from inside NewSchoolDetails)

const DetailItem = ({ icon, label, value, field, isEditing, editValue, setEditValue, onSave, onCancel, onEdit }) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-100 dark:bg-gray-700/50">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-white dark:bg-gray-700 rounded-full shadow-sm">
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="mt-1 block w-full bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm text-gray-900 dark:text-gray-100"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && onSave()}
            />
          ) : (
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value || 'Not set'}</p>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={onSave} className="bg-green-600 hover:bg-green-700"><FiSave className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={onCancel}><FiX className="h-4 w-4" /></Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => onEdit(field)}>
          <FiEdit2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </Button>
      )}
    </div>
  );
};

// Uniform Card Component with updated UI
const UniformCard = ({ uniform, uniformDetails, onRemove, index, level, gender }) => {
  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground">{uniformDetails?.name || 'Unknown Uniform'}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{uniformDetails?.description || 'No description available'}</p>
          </div>
          <div className="flex items-center space-x-2">
            {uniform.isRequired ? (
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary">
                <FiCheckCircle className="mr-1 h-3 w-3" />
                Required
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground">
                <FiInfo className="mr-1 h-3 w-3" />
                Optional
              </span>
            )}
            {onRemove && (
              <button 
                onClick={() => onRemove(level, gender, index)}
                className="text-muted-foreground hover:text-destructive p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                title="Remove uniform"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm bg-muted rounded-lg p-3">
          <span className="text-muted-foreground font-medium">Quantity per student:</span>
          <span className="font-medium text-primary px-3 py-1 bg-primary/10 rounded-lg">
            {uniform.quantityPerStudent || uniform.quantity || 1}
          </span>
        </div>
      </div>
    </div>
  );
};

// Uniform Category Component
const UniformCategory = ({ title, uniforms = [], availableUniforms = [], onAddUniform, onRemoveUniform, level, gender }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-card/50 backdrop-blur-sm p-4 rounded-xl border border-border">
        <h3 className="text-lg font-bold text-foreground flex items-center">
          {gender === 'Boys' ? (
            <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </span>
          ) : (
            <span className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </span>
          )}
          {title}
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={(e) => {
            e.preventDefault();
            onAddUniform(level, gender);
          }}
          className="flex items-center gap-1 border-primary/50 text-primary hover:bg-primary/10"
        >
          <FiPlus className="h-4 w-4" />
          Add Uniform
        </Button>
      </div>
      
      {uniforms.length === 0 ? (
        <div className="bg-muted/30 rounded-xl border border-dashed border-border p-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">No uniforms added for {title}</p>
            <button 
              onClick={(e) => {
                e.preventDefault();
                onAddUniform(level, gender);
              }}
              className="mt-2 text-sm font-medium text-primary hover:text-primary/80"
            >
              Add your first uniform
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {uniforms.map((uniform, index) => (
            <UniformCard
              key={index}
              uniform={uniform}
              uniformDetails={availableUniforms.find(u => u.id === uniform.uniformId)}
              onRemove={onRemoveUniform}
              index={index}
              level={level}
              gender={gender}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Uniform Level Component
const UniformLevel = ({ level, requirements = {}, availableUniforms = [], onAddUniform, onRemoveUniform }) => {
  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl overflow-hidden border border-border">
      <div className="px-6 py-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">{level} Level</h2>
      </div>
      <div className="p-6 space-y-8">
        <UniformCategory
          title="Boys Uniforms"
          uniforms={requirements[level]?.Boys || []}
          availableUniforms={availableUniforms}
          onAddUniform={onAddUniform}
          onRemoveUniform={onRemoveUniform}
          level={level}
          gender="Boys"
        />
        <UniformCategory
          title="Girls Uniforms"
          uniforms={requirements[level]?.Girls || []}
          availableUniforms={availableUniforms}
          onAddUniform={onAddUniform}
          onRemoveUniform={onRemoveUniform}
          level={level}
          gender="Girls"
        />
      </div>
    </div>
  );
};

// Uniform Sets Component
const UniformSets = ({ uniformPolicy = [], availableUniforms = [], onAddUniform, onRemoveUniform }) => {
  // Convert uniform policy array to requirements structure for compatibility
  const uniformRequirements = {
    Junior: { Boys: [], Girls: [] },
    Senior: { Boys: [], Girls: [] }
  };
  
  uniformPolicy.forEach(policy => {
    if (uniformRequirements[policy.level] && uniformRequirements[policy.level][policy.gender]) {
      uniformRequirements[policy.level][policy.gender].push(policy);
    }
  });

  return (
    <div className="space-y-6">
      <UniformLevel
        level="Junior"
        requirements={uniformRequirements}
        availableUniforms={availableUniforms}
        onAddUniform={onAddUniform}
        onRemoveUniform={onRemoveUniform}
      />
      <UniformLevel
        level="Senior"
        requirements={uniformRequirements}
        availableUniforms={availableUniforms}
        onAddUniform={onAddUniform}
        onRemoveUniform={onRemoveUniform}
      />
    </div>
  );
};

// Main component
const NewSchoolDetails = () => {
  const params = useParams();
  const schoolId = params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    schools,
    fetchSchools,
    fetchUniforms,
    updateSchool, 
    deleteSchool, 
    addStudent: addStudentToSchool, 
    updateStudent: updateStudentInSchool, 
    deleteStudent: deleteStudentFromSchool,
    getStudentsForSchool,
    getStudentCountForSchool,
    getSchoolById,
    addUniformPolicy,
    removeUniformPolicy
  } = useSchoolStore();
  const { createStudentNotification } = useNotificationStore();
  const { getAvailableUniforms } = useUniformStore();

  const [school, setSchool] = useState(null);
  const [students, setStudents] = useState([]);
  const [uniforms, setUniforms] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('uniforms');
  
  const [isEditing, setIsEditing] = useState(null);
  const [editValue, setEditValue] = useState('');

  const [showAddUniformModal, setShowAddUniformModal] = useState(false);
  const [selectedUniform, setSelectedUniform] = useState(null);
  const [uniformQuantity, setUniformQuantity] = useState(1);
  const [isUniformRequired, setIsUniformRequired] = useState(true);
  const [currentUniformTarget, setCurrentUniformTarget] = useState({ level: null, gender: null });
  
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [newUniformName, setNewUniformName] = useState('');
  const [showAddUniformNameModal, setShowAddUniformNameModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Function to refresh all school data (students and uniform policies)
  const refreshSchoolData = async () => {
    try {
      const schoolData = await getSchoolById(schoolId);
      setSchool(schoolData);
      
      const studentsData = await getStudentsForSchool(schoolId);
      setStudents(studentsData || []);
    } catch (error) {
      console.error('Error refreshing school data:', error);
    }
  };
  
  // Legacy function name for backward compatibility
  const refreshStudentData = refreshSchoolData;

  // Real-time listener for students collection (updates from any platform)
  useEffect(() => {
    if (!schoolId) return;

    console.log('🔥 Setting up real-time listener for school:', schoolId);

    const studentsQuery = query(
      collection(db, 'students'),
      where('schoolId', '==', schoolId)
    );

    const unsubscribe = onSnapshot(studentsQuery, (snapshot) => {
      console.log('🔥 Real-time update received! Students count:', snapshot.docs.length);
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('🔥 Updated students data:', studentsData.length, 'students');
      setStudents(studentsData);
    }, (error) => {
      console.error('Error listening to students:', error);
    });

    return () => {
      console.log('🔥 Cleaning up real-time listener');
      unsubscribe();
    };
  }, [schoolId]);

  // Listen for focus/visibility changes to refresh data
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && schoolId) {
        refreshSchoolData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [schoolId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) {
        console.error('No school ID provided in URL params');
        setError('Invalid school ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        await fetchUniforms();
        const schoolData = await getSchoolById(schoolId);

        if (!schoolData) {
          console.error('School not found for ID:', schoolId);
          setError('School not found');
          return;
        }

        setSchool(schoolData);
        const studentsData = await getStudentsForSchool(schoolId);
        setStudents(studentsData || []);
      } catch (err) {
        console.error('Error fetching school:', err);
        setError('Failed to load school details.');
      } finally {
        setLoading(false);
      }
    };

    const fetchUniformsData = async () => {
      try {
        const uniformsData = await getAvailableUniforms();
        setUniforms(uniformsData || []);
      } catch (err) {
        console.error('Error fetching uniforms:', err);
      }
    };

    const fetchAllUsers = async () => {
      try {
        // Try different possible collection names for users
        const possibleCollections = ['inventory_staff', 'inventory_managers', 'staff', 'managers', 'users', 'accounts'];
        const allUsersData = [];
        
        for (const collectionName of possibleCollections) {
          try {
            const snapshot = await getDocs(collection(db, collectionName));
            if (snapshot.size > 0) {
              const users = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                role: collectionName.includes('managers') ? 'manager' : 'staff'
              }));
              allUsersData.push(...users);
              console.log(`Found ${snapshot.size} users in ${collectionName} collection`);
            }
          } catch (error) {
            console.log(`Collection ${collectionName} not accessible:`, error.message);
          }
        }
        
        console.log('Total users found for student table:', allUsersData.length);
        setAllUsers(allUsersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchData();
    fetchUniformsData();
    fetchAllUsers();
  }, [schoolId, getSchoolById, fetchUniforms, getAvailableUniforms]);

  // Handle refresh from location state (after logging uniform)
  useEffect(() => {
    if (location.state?.refresh) {
      refreshSchoolData();
      // Clear the state to prevent refresh on subsequent renders
      navigate(location.pathname, { replace: true, state: {} });
    }
    // Handle activeTab from navigation state
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      // Clear the state to prevent setting tab on subsequent renders
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);
  
  // Removed auto-refresh - data updates on user actions and tab visibility

  const handleEditField = (field) => {
    setIsEditing(field);
    setEditValue(school[field] || '');
  };

  const handleSaveField = async () => {
    if (!isEditing) return;

    try {
      const updatedData = { [isEditing]: editValue };
      const updatedSchool = await updateSchool(schoolId, updatedData);
      setSchool(updatedSchool);
      setIsEditing(null);
    } catch (error) {
      console.error(`Error updating ${isEditing}:`, error);
      // Maybe show a toast notification here
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setEditValue('');
  };

  const handleAddUniform = (level, gender) => {
    if (!level || !gender) {
      console.error('Invalid level or gender:', { level, gender });
      return;
    }

    setCurrentUniformTarget({ level, gender });
    setSelectedUniform(null);
    setUniformQuantity(1);
    setIsUniformRequired(true);
    setShowAddUniformModal(true);
  };

  const handleSelectUniform = (uniform) => {
    setSelectedUniform(uniform);
  };

  const handleIncrementQuantity = () => setUniformQuantity(q => q + 1);
  const handleDecrementQuantity = () => setUniformQuantity(q => Math.max(1, q - 1));
  const handleToggleRequired = () => setIsUniformRequired(r => !r);

  const handleSaveUniform = async () => {
    if (!selectedUniform) {
      console.error('No uniform selected');
      return;
    }

    if (!currentUniformTarget.level || !currentUniformTarget.gender) {
      console.error('Missing target data:', currentUniformTarget);
      return;
    }

    try {
      const { level, gender } = currentUniformTarget;

      // Create new uniform policy entry (matching mobile app structure)
      const newUniformPolicy = {
        uniformId: selectedUniform.id,
        uniformName: selectedUniform.name,
        uniformType: selectedUniform.type || 'UNIFORM',
        level,
        gender,
        quantityPerStudent: uniformQuantity,
        isRequired: isUniformRequired
      };

      // Add uniform policy using the store function
      await addUniformPolicy(schoolId, newUniformPolicy);

      // Refresh school data
      const updatedSchool = await getSchoolById(schoolId);
      setSchool(updatedSchool);
      
      // Reset and close modal
      setShowAddUniformModal(false);
      setSelectedUniform(null);
      setUniformQuantity(1);
      setIsUniformRequired(true);
      setCurrentUniformTarget({ level: null, gender: null });
    } catch (error) {
      console.error('Error saving uniform:', error);
    }
  };
  
  const getUniformDetailsById = (id) => uniforms.find(u => u.id === id);

  const handleRemoveUniform = async (level, gender, index) => {
    try {
      // Get the uniform policy to remove
      const uniformPolicies = school.uniformPolicy || [];
      const filteredPolicies = uniformPolicies.filter(policy => 
        policy.level === level && policy.gender === gender
      );
      
      if (filteredPolicies[index]) {
        const policyToRemove = filteredPolicies[index];
        await removeUniformPolicy(schoolId, policyToRemove);
        
        // Refresh school data
        const updatedSchool = await getSchoolById(schoolId);
        setSchool(updatedSchool);
      } else {
        console.error('Could not find uniform policy to remove at index:', index);
      }
    } catch (error) {
      console.error('Error removing uniform:', error);
    }
  };

  const getUniformRequirementsArray = (level, gender) => {
    const uniformPolicies = school?.uniformPolicy || [];
    return uniformPolicies
      .filter(policy => policy.level === level && policy.gender === gender)
      .map(policy => ({
        ...policy,
        details: getUniformDetailsById(policy.uniformId)
      }));
  };

  const handleAddStudent = async (studentData) => {
    try {
      const newStudentId = await addStudentToSchool({ ...studentData, schoolId });
      
      // Create notification for new student addition
      createStudentNotification(studentData.name, school?.name || 'School');
      
      // Refresh students list
      const updatedStudents = await getStudentsForSchool(schoolId);
      setStudents(updatedStudents);
      setShowAddStudentModal(false);
    } catch (error) {
      console.error("Error adding student:", error);
      throw error;
    }
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setShowAddStudentModal(true);
  };

  const handleUpdateStudent = async (updatedStudentData) => {
    try {
      await updateStudentInSchool(selectedStudent.id, updatedStudentData);
      // Refresh students list
      const updatedStudents = await getStudentsForSchool(schoolId);
      setStudents(updatedStudents);
      setShowAddStudentModal(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error("Error updating student:", error);
      throw error;
    }
  };
  
  const handleUpdateStudentUniforms = async (studentData) => {
    try {
      await updateStudentInSchool(studentData.id, studentData);
      // Refresh students list
      const updatedStudents = await getStudentsForSchool(schoolId);
      setStudents(updatedStudents);
    } catch (error) {
      console.error("Error updating student uniforms:", error);
      // Optionally, show a toast or other feedback to the user
    }
  };
  
  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteStudentFromSchool(studentId);
        // Refresh students list
        const updatedStudents = await getStudentsForSchool(schoolId);
        setStudents(updatedStudents);
      } catch (error) {
        console.error('Error deleting student:', error);
      }
    }
  };

  const handleDeleteSchool = async () => {
    try {
      await deleteSchool(schoolId);
      navigate('/schools');
    } catch (error) {
      console.error('Error deleting school:', error);
      // Maybe show a toast
    }
  };

  const handleEditUniform = (uniform, level, gender, index) => {
    // Logic to handle editing a uniform
    // This might involve opening a modal with the uniform's current data
  };

  const handleStudentAdded = (newStudent) => {
    setStudents(prev => [...prev, newStudent]);
  };

  const studentsTabContent = (
    <ModernStudentList
      key={`students-${students.length}-${students.map(s => s.id).join('-')}`}
      students={students}
      onEdit={handleEditStudent}
      onDelete={handleDeleteStudent}
      onUpdateStudent={handleUpdateStudentUniforms}
      availableUniforms={uniforms}
      school={school}
      allUsers={allUsers}
    />
  );

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 bg-red-100 dark:bg-red-900/20 rounded-md">Error: {error}</div>;
  }

  if (!school) {
    return <div className="p-4 text-gray-600">School not found.</div>;
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/schools')}
            className="text-foreground hover:text-foreground/80"
          >
            <FiArrowLeft className="w-5 h-5 mr-2" />
            Back to Schools
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <FiTrash2 className="w-5 h-5 mr-2" />
            Delete School
          </Button>
        </div>

        <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border">
          {/* School header */}
          <div className="px-8 py-6 border-b border-border">
            <h1 className="text-2xl font-bold text-foreground">
              {school?.name || 'Loading...'}
            </h1>
          </div>

          {/* School content */}
          <div className="p-8">
            <SchoolTabUI
              school={school}
              onAddStudent={() => setShowAddStudentModal(true)}
              uniformsTabContent={
                <UniformSets
                  uniformPolicy={school.uniformPolicy}
                  availableUniforms={uniforms}
                  onAddUniform={handleAddUniform}
                  onRemoveUniform={handleRemoveUniform}
                />
              }
              studentsTabContent={studentsTabContent}
              deficitReportTabContent={
                <UniformDeficitReport school={school} />
              }
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete School"
      >
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-500/10 rounded-full">
            <FiAlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-100">
              Are you sure you want to delete this school?
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              This action cannot be undone. All data associated with this school will be permanently removed.
            </p>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDeleteSchool}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete School
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Student Modal */}
      {showAddStudentModal && (
        <StudentModal
          isOpen={showAddStudentModal}
          onClose={() => {setShowAddStudentModal(false); setSelectedStudent(null);}}
          onSave={selectedStudent ? handleUpdateStudent : handleAddStudent}
          initialData={selectedStudent}
          school={school}
          availableUniforms={uniforms}
        />
      )}

      {/* Add Uniform Modal */}
      {showAddUniformModal && (
        <Modal
          isOpen={showAddUniformModal}
          onClose={() => {
            setShowAddUniformModal(false);
            setSelectedUniform(null);
            setUniformQuantity(1);
            setIsUniformRequired(true);
            setCurrentUniformTarget({ level: null, gender: null });
          }}
          title={`Add Uniform to ${currentUniformTarget.level} ${currentUniformTarget.gender}`}
        >
          <div className="p-6 space-y-6 bg-white">
            {/* Uniform Selection */}
            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto space-y-2 rounded-xl">
                  {(() => {
                    // Filter uniforms based on level and gender like mobile app
                    const filteredUniforms = uniforms.filter(uniform => {
                      // Check gender compatibility - handle case sensitivity
                      const uniformGender = uniform.gender?.toLowerCase();
                      const targetGender = currentUniformTarget.gender?.toLowerCase();
                      const matchesGender = uniformGender === targetGender || 
                                           uniformGender === 'unisex' || 
                                           uniformGender === 'male' && targetGender === 'boys' ||
                                           uniformGender === 'female' && targetGender === 'girls' ||
                                           !uniform.gender;
                      
                      // Check level compatibility - handle case sensitivity
                      const uniformLevel = uniform.level?.toUpperCase();
                      const targetLevel = currentUniformTarget.level?.toUpperCase();
                      const matchesLevel = uniformLevel === targetLevel || !uniform.level;
                      
                      return matchesGender && matchesLevel;
                    });

                    if (filteredUniforms.length === 0) {
                      return (
                        <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <p className="text-gray-600">No uniforms available for {currentUniformTarget.level} {currentUniformTarget.gender}</p>
                          <p className="text-xs text-gray-500 mt-2">Add uniforms with matching level and gender in the Inventory section</p>
                        </div>
                      );
                    }

                    return filteredUniforms.map(uniform => (
                      <div
                        key={uniform.id}
                        onClick={() => handleSelectUniform(uniform)}
                        className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                          selectedUniform?.id === uniform.id 
                            ? 'bg-red-500/10 border-2 border-red-500/50' 
                            : 'bg-gray-50 border border-gray-200 hover:border-red-500/30'
                        }`}
                      >
                        <p className="font-medium text-gray-900">{uniform.name}</p>
                        {uniform.description && (
                          <p className="mt-1 text-sm text-gray-400">{uniform.description}</p>
                        )}
                        <div className="mt-2 flex gap-2">
                          <span className="text-xs px-2 py-1 bg-gray-200 rounded text-gray-700">
                            {uniform.gender || 'Unisex'}
                          </span>
                          <span className="text-xs px-2 py-1 bg-gray-200 rounded text-gray-700">
                            {uniform.level || 'All Levels'}
                          </span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
            </div>

            {/* Uniform Configuration */}
            {selectedUniform && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Quantity per student:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDecrementQuantity}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-medium text-gray-900">{uniformQuantity}</span>
                    <button
                      onClick={handleIncrementQuantity}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Required item:</span>
                  <button
                    onClick={handleToggleRequired}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                      isUniformRequired ? 'bg-red-600' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        isUniformRequired ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700/50">
              <button
                onClick={() => {
                  setShowAddUniformModal(false);
                  setSelectedUniform(null);
                  setUniformQuantity(1);
                  setIsUniformRequired(true);
                  setCurrentUniformTarget({ level: null, gender: null });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUniform}
                disabled={!selectedUniform}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedUniform
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {selectedUniform ? 'Add to School' : 'Select a Uniform'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default NewSchoolDetails;