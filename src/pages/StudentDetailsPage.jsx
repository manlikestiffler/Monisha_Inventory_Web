import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSchoolStore } from '../stores/schoolStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { FiArrowLeft, FiUser, FiInfo, FiClipboard, FiPackage, FiCalendar, FiCheckSquare, FiAlertCircle, FiClock, FiAlertTriangle } from 'react-icons/fi';
import LoadingScreen from '../components/ui/LoadingScreen';
import LogUniformModal from '../components/students/LogUniformModal';
import UniformDeficitReport from '../components/students/UniformDeficitReport';

const StudentDetailsPage = () => {
  const { schoolId, studentId } = useParams();
  const navigate = useNavigate();
  const { getSchoolById, getStudentById } = useSchoolStore();
  const { uniforms: availableUniforms, fetchProducts } = useInventoryStore();

  const [student, setStudent] = useState(null);
  const [school, setSchool] = useState(null);
  const [history, setHistory] = useState([]);
  const [uniformRequirements, setUniformRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [activeTab, setActiveTab] = useState('requirements'); // 'requirements' or 'deficit'

  const loadData = async () => {
    try {
      setLoading(true);
      if (availableUniforms.length === 0) {
        await fetchProducts();
      }
      const schoolData = await getSchoolById(schoolId);
      const studentData = await getStudentById(studentId);
      
      if (schoolData) {
        setSchool(schoolData);
      } else {
        setError('School not found.');
      }
      
      if (studentData) {
        setStudent(studentData);
      } else {
        setError('Student not found.');
      }
    } catch (err) {
      setError('Failed to fetch data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId, studentId]);

  useEffect(() => {
    if (student && school && availableUniforms.length > 0) {
      const generateHistory = () => {
        if (!student.uniformDistribution) {
          return [];
        }

        const historyLog = [];
        const level = student.level;
        const gender = student.gender; // Use as-is: 'Boys' or 'Girls'
        const requirements = school.uniformRequirements?.[level]?.[gender] || [];

        for (const key in student.uniformDistribution) {
          const distributionData = student.uniformDistribution[key];
          const keyParts = key.split('-');
          const reqIndex = parseInt(keyParts[keyParts.length - 1], 10);
          const requirement = requirements[reqIndex];

          if (requirement && distributionData.distributions) {
            const uniformDetails = availableUniforms.find(u => u.id === requirement.uniformId);
            const uniformName = uniformDetails?.name || 'Unknown Uniform';

            for (const item of distributionData.distributions) {
              historyLog.push({
                id: `${key}-${item.receivedAt}-${Math.random()}`,
                uniformName,
                ...item,
              });
            }
          }
        }
        return historyLog.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
      };
      setHistory(generateHistory());
      
      // Calculate uniform requirements
      const calculateRequirements = () => {
        const policies = school.uniformPolicy?.filter(policy => 
          policy.level === student.level && policy.gender === student.gender
        ) || [];
        
        const requirements = policies.map(policy => {
          const uniformDetails = availableUniforms.find(u => u.id === policy.uniformId);
          const receivedEntries = (student.uniformLog || []).filter(log => log.uniformId === policy.uniformId);
          const receivedQuantity = receivedEntries.reduce((sum, log) => sum + (log.quantityReceived || log.quantity || 0), 0);
          const pendingRequests = receivedEntries.filter(log => log.sizeWanted && !log.sizeReceived);
          
          return {
            ...policy,
            uniformName: uniformDetails?.name || 'Unknown Uniform',
            uniformType: uniformDetails?.type || 'Unknown',
            receivedQuantity,
            remainingQuantity: Math.max(0, policy.quantityPerStudent - receivedQuantity),
            status: receivedQuantity >= policy.quantityPerStudent ? 'complete' : 
                    receivedQuantity > 0 ? 'partial' : 'pending',
            logEntries: receivedEntries,
            pendingRequests
          };
        });
        
        setUniformRequirements(requirements);
      };
      
      calculateRequirements();
    }
  }, [student, school, availableUniforms]);

  if (loading) {
    return <LoadingScreen message="Loading Student Details" description="Please wait while we fetch the student information" />;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen bg-background text-destructive">Error: {error}</div>;
  }
  
  if (!student) {
     return <div className="flex items-center justify-center h-screen bg-background text-destructive">Student could not be loaded.</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button 
            onClick={() => navigate(`/schools/${schoolId}`, { state: { activeTab: 'students' } })} 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <FiArrowLeft />
            Back to Students
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-lg">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 h-16 w-16 flex items-center justify-center bg-primary/10 rounded-full text-2xl font-bold text-primary">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{student.name}</h1>
                <p className="text-sm text-muted-foreground">Form: {student.form}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoCard icon={<FiUser />} label="Gender" value={student.gender} />
              <InfoCard icon={<FiClipboard />} label="Level" value={student.level} />
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="mt-8 bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('requirements')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'requirements'
                  ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <FiPackage />
              Uniform Requirements
            </button>
            <button
              onClick={() => setActiveTab('deficit')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'deficit'
                  ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <FiAlertTriangle />
              Deficit Report
            </button>
          </div>
          
          <div className="p-6">
            {activeTab === 'requirements' ? (
              <UniformRequirements 
                requirements={uniformRequirements} 
                onLogUniform={(req) => {
                  setSelectedRequirement(req);
                  setIsLogModalOpen(true);
                }} 
              />
            ) : (
              <UniformDeficitReport school={school} student={student} />
            )}
          </div>
        </div>
      </div>
      
      {/* Log Uniform Modal */}
      {selectedRequirement && student && (
        <LogUniformModal
          isOpen={isLogModalOpen}
          onClose={() => {
            setIsLogModalOpen(false);
            setSelectedRequirement(null);
          }}
          student={student}
          uniform={selectedRequirement}
          onSuccess={async () => {
            // Refresh data after logging (same as mobile)
            await loadData();
          }}
        />
      )}
    </div>
  );
};

const UniformRequirements = ({ requirements, onLogUniform }) => {
  
  if (requirements.length === 0) {
    return (
      <div className="bg-muted/30 rounded-lg p-8 text-center border-2 border-dashed border-border">
        <FiAlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-semibold text-foreground mb-2">No Uniform Policy</p>
        <p className="text-sm text-muted-foreground">No uniform requirements have been set for this student's level and gender.</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete': return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: 'bg-green-500' };
      case 'partial': return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: 'bg-yellow-500' };
      default: return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: 'bg-red-500' };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete': return <FiCheckSquare />;
      case 'partial': return <FiClock />;
      default: return <FiAlertCircle />;
    }
  };

  return (
    <div className="space-y-4">
      {requirements.map((req) => {
        const colors = getStatusColor(req.status);
        return (
          <div key={req.id} className={`bg-card rounded-xl border-2 ${colors.border} p-5 shadow-sm`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`${colors.icon} rounded-lg p-2 text-white`}>
                  {getStatusIcon(req.status)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{req.uniformName}</h3>
                  <p className="text-sm text-muted-foreground">{req.isRequired ? 'Required' : 'Optional'} • {req.uniformType}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${colors.text}`}>
                  {req.receivedQuantity} of {req.quantityPerStudent}
                </p>
                <p className="text-xs text-muted-foreground uppercase font-semibold">{req.status}</p>
              </div>
            </div>

            {/* Log Entries */}
            {req.logEntries && req.logEntries.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-foreground mb-2">Distribution History:</p>
                {req.logEntries.map((log, idx) => (
                  <div key={idx} className="bg-muted/50 rounded-lg p-3 mb-2 flex justify-between items-center">
                    <p className="text-sm text-foreground">
                      {log.sizeReceived ? 
                        `Received ${log.quantityReceived}, Size ${log.sizeReceived}` :
                        `Requested Size ${log.sizeWanted} (Not Available)`
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.loggedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Action Button */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                {req.remainingQuantity > 0 ? (
                  <>
                    <FiAlertCircle className="text-destructive flex-shrink-0" />
                    <p className="text-sm font-medium text-destructive">
                      {req.remainingQuantity} uniform{req.remainingQuantity > 1 ? 's' : ''} still needed
                    </p>
                  </>
                ) : (
                  <>
                    <FiCheckSquare className="text-green-600 flex-shrink-0" />
                    <p className="text-sm font-medium text-green-600">All uniforms received</p>
                  </>
                )}
              </div>
              <button
                onClick={() => onLogUniform(req)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <FiPackage />
                Log Uniform
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const StudentHistory = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="bg-muted/30 rounded-lg p-8 text-center border-2 border-dashed border-border">
        <FiCalendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-semibold text-foreground mb-2">No Distribution History</p>
        <p className="text-sm text-muted-foreground">This student hasn't received any uniforms yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item) => (
        <div key={item.id} className="flex items-start gap-4 p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow">
          <div className="mt-1">
            <FiCheckSquare className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              <span className="font-bold">{item.quantity}x</span> {item.uniformName} ({item.size})
            </p>
            <p className="text-sm text-muted-foreground">
              Issued by {item.issuedBy || 'N/A'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              {new Date(item.receivedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(item.receivedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

const InfoCard = ({ icon, label, value }) => (
  <div className="bg-muted/30 p-4 rounded-lg flex items-center gap-4 border border-border">
    <div className="text-primary">{icon}</div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-foreground font-semibold">{value}</p>
    </div>
  </div>
);

export default StudentDetailsPage; 