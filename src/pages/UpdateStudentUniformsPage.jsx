import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSchoolStore } from '../stores/schoolStore';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import UniformStatusTable from '../components/students/UniformStatusTable';
import LoadingScreen from '../components/ui/LoadingScreen';

const UpdateStudentUniformsPage = () => {
  const { schoolId, studentId } = useParams();
  const navigate = useNavigate();
  const { getSchoolById, updateStudentInSchool } = useSchoolStore();
  
  const [school, setSchool] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [displayUniforms, setDisplayUniforms] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const schoolData = await getSchoolById(schoolId);
        if (!schoolData) throw new Error('School not found');
        
        const studentData = schoolData.students?.find(s => s.id === studentId);
        if (!studentData) throw new Error('Student not found');

        setSchool(schoolData);
        setStudent(studentData);

        const level = studentData.level?.toUpperCase() || 'JUNIOR';
        const gender = studentData.gender === 'MALE' ? 'BOYS' : 'GIRLS';
        const requirements = schoolData.uniformRequirements?.[level]?.[gender] || [];

        const initializedUniforms = {};
        requirements.forEach((requirement, index) => {
          const defaultKey = `${gender}-${index}`;
          const uniformKey = requirement.item?.length ? requirement.item : defaultKey;

          const legacySizeKey = `${gender}-${index}-variant-0`;
          const newSizeKey = requirement.item;

          const studentUniformData = newSizeKey ? (studentData.uniformSizes?.[newSizeKey] || {}) : {};
          const legacySize = studentData.uniformSizes?.[legacySizeKey];

          initializedUniforms[uniformKey] = {
            required: requirement.quantityPerStudent || 1,
            received: studentUniformData.received || 0,
            size: studentUniformData.size || legacySize || '',
            status: studentUniformData.status || 'pending',
          };
        });
        
        setDisplayUniforms(initializedUniforms);

      } catch (err) {
        setError(`Failed to load data: ${err.message}`);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [schoolId, studentId, getSchoolById]);

  function handleUniformChange(uniformType, field, value) {
    setDisplayUniforms(prev => ({
      ...prev,
      [uniformType]: {
        ...prev[uniformType],
        [field]: value,
      },
    }));
  }

  const handleSaveChanges = async () => {
    if (!student) {
      toast.error('Student data is not available.');
      return;
    }
    setIsSaving(true);
    try {
      const uniformSizesToSave = {};
      Object.keys(displayUniforms).forEach(key => {
        const { received, size, status } = displayUniforms[key];
        uniformSizesToSave[key] = { received, size, status };
      });

      const studentToUpdate = {
        ...student,
        uniformSizes: uniformSizesToSave,
        updatedAt: new Date().toISOString(),
      };

      await updateStudentInSchool(schoolId, studentId, studentToUpdate);
      toast.success('Uniform status updated successfully!');
      navigate(`/schools/${schoolId}`);
    } catch (err) {
      toast.error('Failed to save changes.');
      console.error('Error saving changes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading Student Details" description="Please wait while we fetch the student information" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-6">
        <div className="text-2xl font-semibold text-red-500 dark:text-red-400">
          {error}
        </div>
        <button
          onClick={() => navigate(`/schools/${schoolId}`)}
          className="px-6 py-3 text-base font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          Return to School
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-white dark:bg-dark-primary overflow-hidden">
      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Manage Uniforms
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              For student: {student?.name} ({student?.class})
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/schools/${schoolId}`)}
              className="group flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 rounded-lg px-3 py-2"
            >
              <FiArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to School</span>
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <FiSave className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-dark-accent/50 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 md:p-8">
              <UniformStatusTable
                uniforms={displayUniforms}
                onUniformChange={handleUniformChange}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UpdateStudentUniformsPage; 