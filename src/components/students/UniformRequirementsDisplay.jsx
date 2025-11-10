import React from 'react';
import { FiCheckCircle, FiAlertCircle, FiClock, FiPlus } from 'react-icons/fi';
import Button from '../ui/Button';

const UniformRequirementsDisplay = ({ student, school, uniformRequirements = [], onLogUniform, onRefresh }) => {

  const calculateUniformStatus = (requirement) => {
    if (!student?.uniformLog || !requirement) {
      return { received: 0, required: requirement?.quantityPerStudent || 1, status: 'pending' };
    }

    const received = student.uniformLog
      .filter(log => log.uniformId === requirement.uniformId)
      .reduce((sum, log) => sum + (log.quantityReceived || log.quantity || 0), 0);
    
    const required = requirement.quantityPerStudent || 1;
    const status = received >= required ? 'complete' : received > 0 ? 'partial' : 'pending';

    return { received, required, status };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete': return 'text-green-600 bg-green-50 border-green-200';
      case 'partial': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete': return <FiCheckCircle className="w-5 h-5" />;
      case 'partial': return <FiClock className="w-5 h-5" />;
      default: return <FiAlertCircle className="w-5 h-5" />;
    }
  };

  const getStatusText = (status, received, required) => {
    switch (status) {
      case 'complete': return `${received} of ${required} Complete`;
      case 'partial': return `${received} of ${required} Partial`;
      default: return `0 of ${required} Pending`;
    }
  };

  const handleLogUniform = (requirement) => {
    if (onLogUniform) {
      onLogUniform(requirement);
    }
  };

  if (!uniformRequirements || uniformRequirements.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <FiAlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No Uniform Requirements</h3>
        <p className="text-gray-600">
          No uniform requirements have been set up for this student's level and gender.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Uniform Requirements</h2>
      </div>

      <div className="space-y-3">
        {uniformRequirements.map((requirement) => {
          const { received, required, status } = calculateUniformStatus(requirement);
          
          return (
            <div
              key={requirement.id || requirement.uniformId}
              className={`p-4 rounded-xl border transition-all duration-200 ${getStatusColor(status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getStatusColor(status)}`}>
                    {getStatusIcon(status)}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {requirement.uniformName || 'Unknown Uniform'}
                    </h3>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      status === 'complete' ? 'text-green-600' : 
                      status === 'partial' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {getStatusText(status, received, required)}
                    </div>
                  </div>
                  
                  {status !== 'complete' && (
                    <Button
                      onClick={() => handleLogUniform(requirement)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                    >
                      <FiPlus className="w-4 h-4" />
                      Log Received
                    </Button>
                  )}
                </div>
              </div>

              {/* Uniform History */}
              {student?.uniformLog && student.uniformLog
                .filter(log => log.uniformId === requirement.uniformId)
                .length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Uniform History:</h4>
                  <div className="space-y-2">
                    {student.uniformLog
                      .filter(log => log.uniformId === requirement.uniformId)
                      .map((log, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">
                            Received {log.quantityReceived || log.quantity || 1}
                            {log.sizeReceived && `, Size ${log.sizeReceived}`}
                          </span>
                          <span className="text-gray-500">
                            {log.dateReceived ? new Date(log.dateReceived).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default UniformRequirementsDisplay;
