import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchoolStore } from '../stores/schoolStore';
import { FiArrowLeft, FiPackage, FiAlertTriangle, FiUser, FiSearch } from 'react-icons/fi';
import LoadingScreen from '../components/ui/LoadingScreen';
import UniformDeficitReport from '../components/students/UniformDeficitReport';

const DeficitReportPage = () => {
  const navigate = useNavigate();
  const { schools, getSchoolById, getStudentsBySchool } = useSchoolStore();
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [studentsWithDeficits, setStudentsWithDeficits] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get the first school (or let user select if multiple schools exist)
      if (schools.length > 0) {
        const school = await getSchoolById(schools[0].id);
        setSelectedSchool(school);
        
        // Get all students for this school
        const students = await getStudentsBySchool(school.id);
        setAllStudents(students);
        
        // Calculate which students have deficits
        const studentsWithDeficit = calculateStudentsWithDeficits(students, school);
        setStudentsWithDeficits(studentsWithDeficit);
      }
    } catch (error) {
      console.error('Error loading deficit report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStudentsWithDeficits = (students, school) => {
    const allPolicies = school.uniformPolicy || [];
    const studentsWithDeficit = [];

    students.forEach(student => {
      const studentLog = student.uniformLog || [];
      let hasDeficit = false;
      let totalDeficit = 0;
      const deficitDetails = [];

      // Check each uniform requirement for this student
      allPolicies.forEach(policy => {
        // Skip if policy doesn't apply to this student
        if (policy.level !== student.level || policy.gender !== student.gender) {
          return;
        }

        // Calculate received vs required
        const receivedEntries = studentLog.filter(log => log.uniformId === policy.uniformId);
        const receivedQuantity = receivedEntries.reduce((sum, log) => sum + (log.quantityReceived || 0), 0);
        const deficit = Math.max(0, policy.quantityPerStudent - receivedQuantity);

        if (deficit > 0) {
          hasDeficit = true;
          totalDeficit += deficit;
          deficitDetails.push({
            uniformName: policy.uniformName,
            deficit: deficit
          });
        }
      });

      if (hasDeficit) {
        studentsWithDeficit.push({
          ...student,
          totalDeficit,
          deficitDetails
        });
      }
    });

    return studentsWithDeficit.sort((a, b) => b.totalDeficit - a.totalDeficit);
  };

  const filteredStudents = studentsWithDeficits.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.form.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingScreen message="Loading Deficit Report" description="Analyzing student uniform data..." />;
  }

  if (!selectedSchool) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <p>No school data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate('/schools')} 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <FiArrowLeft />
            Back to Schools
          </button>
          <h1 className="text-3xl font-bold text-foreground mb-2">Uniform Deficit Report</h1>
          <p className="text-muted-foreground">
            {selectedSchool.name} • {studentsWithDeficits.length} student{studentsWithDeficits.length !== 1 ? 's' : ''} with deficits
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side - Student List */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-4">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FiUser className="text-red-600" />
                Students with Deficits
              </h2>

              {/* Search */}
              <div className="mb-4 relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Student List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FiPackage className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {searchQuery ? 'No students found' : 'No students with deficits'}
                    </p>
                  </div>
                ) : (
                  filteredStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedStudent?.id === student.id
                          ? 'bg-primary/10 border-primary'
                          : 'bg-card border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-foreground">{student.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Form {student.form} • {student.level} • {student.gender}
                          </p>
                        </div>
                        <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                          {student.totalDeficit}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {student.deficitDetails.slice(0, 2).map((detail, idx) => (
                          <p key={idx} className="text-xs text-muted-foreground">
                            • {detail.uniformName}: {detail.deficit}
                          </p>
                        ))}
                        {student.deficitDetails.length > 2 && (
                          <p className="text-xs text-muted-foreground">
                            +{student.deficitDetails.length - 2} more
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* View All Students Button */}
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-full mt-4 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors font-medium text-sm"
              >
                View School Overview
              </button>
            </div>
          </div>

          {/* Right Side - Deficit Details */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl p-6">
              {selectedStudent ? (
                <div>
                  <div className="mb-6 pb-6 border-b border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">{selectedStudent.name}</h2>
                        <p className="text-muted-foreground">
                          Form {selectedStudent.form} • {selectedStudent.level} • {selectedStudent.gender}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/schools/${selectedSchool.id}/students/${selectedStudent.id}`)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm flex items-center gap-2"
                      >
                        <FiPackage />
                        Log Uniform
                      </button>
                    </div>
                  </div>
                  <UniformDeficitReport school={selectedSchool} student={selectedStudent} />
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-6">School-Wide Deficit Overview</h2>
                  <UniformDeficitReport school={selectedSchool} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeficitReportPage;
