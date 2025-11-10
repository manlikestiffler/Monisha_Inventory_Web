import { useState, useEffect } from 'react';
import { FiPackage, FiAlertTriangle, FiClock, FiUser, FiRefreshCw } from 'react-icons/fi';
import { useSchoolStore } from '../../stores/schoolStore';
import { useDeficitReportStore } from '../../stores/deficitReportStore';

const UniformDeficitReport = ({ school, student = null }) => {
  const [loading, setLoading] = useState(false);
  const [deficitData, setDeficitData] = useState({
    uniformDeficits: [],
    sizeRequests: [],
    totalStudents: 0,
    studentsWithDeficits: 0
  });
  const [useStoredReport, setUseStoredReport] = useState(true);

  const { getStudentsBySchool } = useSchoolStore();
  const { 
    getSchoolDeficitReport, 
    getStudentDeficitReport, 
    generateAndStoreDeficitReport,
    refreshDeficitReports 
  } = useDeficitReportStore();

  useEffect(() => {
    if (school) {
      generateDeficitReport();
    }
  }, [school, student]);

  const generateDeficitReport = async () => {
    setLoading(true);
    try {
      // Try to get stored report first
      if (useStoredReport) {
        if (student) {
          // Get individual student report
          const storedReport = await getStudentDeficitReport(school.id, student.id);
          if (storedReport) {
            setDeficitData({
              uniformDeficits: [],
              sizeRequests: [],
              totalStudents: 1,
              studentsWithDeficits: storedReport.totalDeficit > 0 ? 1 : 0,
              studentDeficit: storedReport
            });
            setLoading(false);
            return;
          }
        } else {
          // Get school-wide report
          const storedReport = await getSchoolDeficitReport(school.id);
          if (storedReport) {
            setDeficitData({
              uniformDeficits: storedReport.uniformDeficits || [],
              sizeRequests: storedReport.sizeRequests || [],
              totalStudents: storedReport.totalStudents || 0,
              studentsWithDeficits: storedReport.studentsWithDeficits || 0
            });
            setLoading(false);
            return;
          }
        }
      }

      // Fallback to live calculation if no stored report
      // Get all students for this school (or just the single student if provided)
      const students = student ? [student] : await getStudentsBySchool(school.id);
      
      // Get school uniform policies
      const allPolicies = school.uniformPolicy || [];
      
      const uniformDeficits = [];
      const sizeRequests = [];
      let studentsWithDeficits = 0;

      // Group policies by uniform for easier processing
      const uniformGroups = {};
      allPolicies.forEach(policy => {
        const key = `${policy.uniformId}-${policy.level}-${policy.gender}`;
        if (!uniformGroups[key]) {
          uniformGroups[key] = policy;
        }
      });

      // Process each student
      students.forEach(studentData => {
        const studentLog = studentData.uniformLog || [];
        let studentHasDeficit = false;

        // Check each uniform requirement for this student
        Object.values(uniformGroups).forEach(policy => {
          // Skip if policy doesn't apply to this student
          if (policy.level !== studentData.level || policy.gender !== studentData.gender) {
            return;
          }

          // Calculate received vs required
          const receivedEntries = studentLog.filter(log => log.uniformId === policy.uniformId);
          const receivedQuantity = receivedEntries.reduce((sum, log) => sum + (log.quantityReceived || 0), 0);
          const deficit = Math.max(0, policy.quantityPerStudent - receivedQuantity);

          if (deficit > 0) {
            studentHasDeficit = true;
            
            // Find or create uniform deficit entry
            let uniformDeficit = uniformDeficits.find(ud => 
              ud.uniformId === policy.uniformId && 
              ud.level === policy.level && 
              ud.gender === policy.gender
            );
            
            if (!uniformDeficit) {
              uniformDeficit = {
                uniformId: policy.uniformId,
                uniformName: policy.uniformName,
                uniformType: policy.uniformType,
                level: policy.level,
                gender: policy.gender,
                totalDeficit: 0,
                studentsAffected: []
              };
              uniformDeficits.push(uniformDeficit);
            }
            
            uniformDeficit.totalDeficit += deficit;
            uniformDeficit.studentsAffected.push({
              id: studentData.id,
              name: studentData.name,
              deficit: deficit
            });
          }

          // Check for size requests
          receivedEntries.forEach(log => {
            if (log.sizeWanted && !log.sizeReceived) {
              let sizeRequest = sizeRequests.find(sr => 
                sr.uniformId === policy.uniformId && 
                sr.sizeWanted === log.sizeWanted
              );
              
              if (!sizeRequest) {
                sizeRequest = {
                  uniformId: policy.uniformId,
                  uniformName: policy.uniformName,
                  sizeWanted: log.sizeWanted,
                  students: []
                };
                sizeRequests.push(sizeRequest);
              }
              
              if (!sizeRequest.students.find(s => s.id === studentData.id)) {
                sizeRequest.students.push({
                  id: studentData.id,
                  name: studentData.name,
                  requestedAt: log.loggedAt
                });
              }
            }
          });
        });

        if (studentHasDeficit) {
          studentsWithDeficits++;
        }
      });

      setDeficitData({
        uniformDeficits: uniformDeficits.sort((a, b) => b.totalDeficit - a.totalDeficit),
        sizeRequests: sizeRequests.sort((a, b) => a.uniformName.localeCompare(b.uniformName)),
        totalStudents: students.length,
        studentsWithDeficits
      });

    } catch (error) {
      console.error('Error generating deficit report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshReport = async () => {
    try {
      setLoading(true);
      const students = await getStudentsBySchool(school.id);
      await refreshDeficitReports(school.id, school, students);
      // Reload the report
      await generateDeficitReport();
    } catch (error) {
      console.error('Error refreshing deficit report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Analyzing uniform data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {student ? `${student.name} - Deficit Report` : 'School-Wide Deficit Report'}
        </h3>
        <button
          onClick={handleRefreshReport}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          Refresh Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <FiUser className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{deficitData.studentsWithDeficits}</p>
              <p className="text-sm text-muted-foreground">Students with Deficits</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <FiAlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{deficitData.uniformDeficits.length}</p>
              <p className="text-sm text-muted-foreground">Uniform Types with Deficits</p>
            </div>
          </div>
        </div>
      </div>

      {/* Uniform Deficits */}
      {deficitData.uniformDeficits.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <FiPackage className="text-red-600" />
            Uniform Deficits
          </h3>
          <div className="space-y-4">
            {deficitData.uniformDeficits.map(deficit => (
              <div 
                key={`${deficit.uniformId}-${deficit.level}-${deficit.gender}`}
                className="bg-card border-l-4 border-l-red-500 rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <FiPackage className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground">{deficit.uniformName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {deficit.level} • {deficit.gender} • {deficit.uniformType}
                      </p>
                    </div>
                  </div>
                  <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold">
                    {deficit.totalDeficit}
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-4 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-3">
                    {deficit.studentsAffected.length} Student{deficit.studentsAffected.length !== 1 ? 's' : ''} Affected:
                  </p>
                  
                  {deficit.studentsAffected.slice(0, 3).map(student => (
                    <div 
                      key={student.id} 
                      className="flex justify-between items-center py-1"
                    >
                      <p className="text-sm text-red-900 dark:text-red-200">
                        • {student.name}
                      </p>
                      <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                        Needs {student.deficit}
                      </p>
                    </div>
                  ))}
                  
                  {deficit.studentsAffected.length > 3 && (
                    <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                      +{deficit.studentsAffected.length - 3} more students
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Size Requests */}
      {deficitData.sizeRequests.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <FiClock className="text-yellow-600" />
            Unfulfilled Size Requests
          </h3>
          <div className="space-y-4">
            {deficitData.sizeRequests.map(request => (
              <div 
                key={`${request.uniformId}-${request.sizeWanted}`}
                className="bg-card border-l-4 border-l-yellow-500 rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <FiClock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground">
                        {request.uniformName} - Size {request.sizeWanted}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {request.students.length} student{request.students.length !== 1 ? 's' : ''} waiting
                      </p>
                    </div>
                  </div>
                  <div className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold">
                    {request.students.length}
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-3">
                    Students Waiting:
                  </p>
                  
                  {request.students.slice(0, 3).map(student => (
                    <div 
                      key={student.id} 
                      className="flex justify-between items-center py-1"
                    >
                      <p className="text-sm text-yellow-900 dark:text-yellow-200">
                        • {student.name}
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400">
                        {new Date(student.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  
                  {request.students.length > 3 && (
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
                      +{request.students.length - 3} more students
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Deficits Message */}
      {deficitData.uniformDeficits.length === 0 && deficitData.sizeRequests.length === 0 && (
        <div className="bg-green-50 dark:bg-green-900/10 border-2 border-dashed border-green-300 dark:border-green-700 rounded-xl p-8 text-center">
          <FiPackage className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-green-900 dark:text-green-100 mb-2">
            All Caught Up!
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300">
            {student 
              ? 'This student has no uniform deficits or pending size requests.'
              : 'No uniform deficits or pending size requests found for this school.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default UniformDeficitReport;
