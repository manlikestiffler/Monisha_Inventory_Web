"use client"

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiEye,
  FiEdit
} from 'react-icons/fi';

const ModernStudentList = ({ students = [], onEdit, onDelete, onUpdateStudent, availableUniforms = [], school, allUsers = [] }) => {
  const navigate = useNavigate();
  const [activeSort, setActiveSort] = useState({ key: 'name', direction: 'asc' });
  const [filter, setFilter] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 10;

  const getUniformDetails = (student) => {
    if (!student || !school?.uniformPolicy || !student.level) {
      return { totalRequired: 0, totalReceived: 0, percentage: 0, missingCount: 0, missingUniforms: [] };
    }
    
    // Handle both 'MALE'/'FEMALE' and 'Boys'/'Girls' formats
    const normalizeGender = (gender) => {
      if (!gender) return 'BOYS';
      const g = gender.toUpperCase();
      if (g === 'MALE' || g === 'BOYS') return 'BOYS';
      if (g === 'FEMALE' || g === 'GIRLS') return 'GIRLS';
      return 'BOYS'; // default
    };
    
    const category = normalizeGender(student.gender);
    const policies = school.uniformPolicy.filter(policy => {
      const policyGender = normalizeGender(policy.gender);
      const policyLevel = policy.level?.toLowerCase();
      const studentLevel = student.level?.toLowerCase();
      
      return policyLevel === studentLevel && policyGender === category;
    });
    
    if (policies.length === 0) {
      return { totalRequired: 0, totalReceived: 0, percentage: 0, missingCount: 0, missingUniforms: [] };
    }

    let totalRequired = 0;
    let totalReceived = 0;
    const missingUniforms = [];

    // Calculate based on uniform log entries
    policies.forEach((policy) => {
      const required = policy.quantityPerStudent || 1;
      totalRequired += required;
      
      // Count received uniforms from student's uniform log
      const receivedCount = (student.uniformLog || [])
        .filter(log => log.uniformId === policy.uniformId)
        .reduce((sum, log) => sum + (log.quantityReceived || log.quantity || 0), 0);
      
      totalReceived += receivedCount;
      
      // Track missing uniforms
      const missing = required - receivedCount;
      if (missing > 0) {
        missingUniforms.push({
          name: policy.uniformName,
          missing: missing,
          required: required,
          received: receivedCount
        });
      }
    });

    const percentage = totalRequired > 0 ? Math.min(100, (totalReceived / totalRequired) * 100) : 0;
    const missingCount = Math.max(0, totalRequired - totalReceived);

    return { totalRequired, totalReceived, percentage, missingCount, missingUniforms };
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    
    let date;
    
    // Handle Firebase Timestamp
    if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
      date = dateValue.toDate();
    }
    // Handle Firebase Timestamp with seconds property
    else if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
      date = new Date(dateValue.seconds * 1000);
    }
    // Handle ISO string
    else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    }
    // Handle Date object
    else if (dateValue instanceof Date) {
      date = dateValue;
    }
    // Handle timestamp number
    else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    }
    else {
      return 'Invalid Date';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const getUserNameById = (userId) => {
    console.log('Getting user name for ID:', userId, 'Available users:', allUsers.length);
    
    if (!userId) return 'System';
    
    const user = allUsers.find(u => u.id === userId);
    console.log('Found user:', user);
    
    if (!user) {
      console.log('User not found in allUsers array');
      return 'Unknown User';
    }
    
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const finalName = fullName || user.displayName || user.name || user.email || 'Unknown User';
    console.log('Final resolved name:', finalName);
    
    return finalName;
  };

  const sortData = (data) => {
    return [...data].sort((a, b) => {
      const key = activeSort.key;
      let valA = a[key];
      let valB = b[key];

      if (key === 'uniformStatus') {
        valA = getUniformDetails(a).percentage;
        valB = getUniformDetails(b).percentage;
      }

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return activeSort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return activeSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filterData = (data) => {
    let filtered = data;
    if (filter) {
      filtered = filtered.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));
    }
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(s => s.level === selectedLevel);
    }
    return filtered;
  };

  const handleSort = (key) => {
    setActiveSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };


  const handleViewDetails = (student) => {
    navigate(`/schools/${school.id}/students/${student.id}/details`);
  };

  const sortedStudents = sortData(students);
  const filteredStudents = filterData(sortedStudents);

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * studentsPerPage,
    currentPage * studentsPerPage
  );

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  const levels = ['all', ...Array.from(new Set(students.map(s => s.level)))];

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm w-full max-w-none">
      {/* Filters and Header */}
      <div className="p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border">
        <div className="relative w-full md:w-auto">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search students..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-background border border-border rounded-lg pl-10 pr-4 py-2 w-full md:w-64 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <FiFilter className="text-muted-foreground"/>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {levels.map(level => (
              <option key={level} value={level} className="capitalize bg-background text-foreground">
                {level === 'all' ? 'All Levels' : level}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full">
          <thead className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border">
            <tr>
              {[
                { key: 'name', label: 'Student Name', align: 'left' },
                { key: 'level', label: 'Level', align: 'center' },
                { key: 'gender', label: 'Gender', align: 'center' },
                { key: 'uniformStatus', label: 'Uniform Status', align: 'center' },
              ].map(({ key, label, align }) => (
                <th key={key} scope="col" className={`px-6 py-4 text-${align} text-sm font-bold text-foreground cursor-pointer hover:bg-primary/10 transition-colors`} onClick={() => handleSort(key)}>
                  <div className={`flex items-center gap-2 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
                    <span>{label}</span>
                    {activeSort.key === key && (
                      <div className="text-primary">
                        {activeSort.direction === 'asc' ? <FiChevronUp className="w-4 h-4"/> : <FiChevronDown className="w-4 h-4"/>}
                      </div>
                    )}
                  </div>
                </th>
              ))}
              <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-foreground">
                Missing Uniforms
              </th>
              <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-foreground">
                Last Updated
              </th>
              <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {paginatedStudents.map((student, index) => {
              const { percentage, missingCount } = getUniformDetails(student);
              return (
                <tr
                  key={student.id}
                  className={`${index % 2 === 0 ? 'bg-card' : 'bg-muted/20'} hover:bg-primary/5 transition-all duration-200 cursor-pointer border-b border-border/50 last:border-b-0`}
                  onClick={() => handleViewDetails(student)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-primary/10 rounded-full text-sm font-bold text-primary">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">{student.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-600 border border-blue-200 dark:border-blue-800 capitalize">
                      {student.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-purple-600 border border-purple-200 dark:border-purple-800 capitalize">
                      {student.gender.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                        percentage >= 100 ? 'bg-green-100 text-green-700 border border-green-200' : 
                        percentage > 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        <span className={`h-2 w-2 rounded-full ${
                          percentage >= 100 ? 'bg-green-500' : 
                          percentage > 0 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></span>
                        <span>
                          {getUniformDetails(student).totalReceived} of {getUniformDetails(student).totalRequired}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {(() => {
                      const { totalRequired, missingCount, missingUniforms } = getUniformDetails(student);
                      
                      if (totalRequired === 0) {
                        return (
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium border border-gray-200">
                              <FiAlertCircle className="inline w-3 h-3 mr-1" />
                              No policy
                            </span>
                          </div>
                        );
                      }
                      
                      if (missingCount > 0) {
                        return (
                          <div className="relative group flex justify-center">
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200 cursor-help">
                              <FiAlertCircle className="inline w-3 h-3 mr-1" />
                              Pending
                            </span>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                              <div className="font-semibold mb-1">Missing Uniforms:</div>
                              {missingUniforms.map((uniform, idx) => (
                                <div key={idx} className="text-xs">
                                  {uniform.name}: {uniform.missing} needed
                                </div>
                              ))}
                              {/* Arrow */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                            <FiCheckCircle className="inline w-3 h-3 mr-1" />
                            Complete
                          </span>
                        </div>
                      );
                    })()} 
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="bg-muted/30 rounded-lg p-3 border border-border">
                      <div className="text-sm font-medium text-foreground">{formatDate(student.updatedAt)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        by {student.updatedByName || student.createdByName || getUserNameById(student.updatedBy || student.createdBy) || 'System'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleViewDetails(student); 
                        }} 
                        className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 transition-all duration-200 border border-green-200"
                        title="View Details"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(student); }} 
                        className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200 border border-blue-200"
                        title="Edit Student"
                      >
                        <FiEdit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(student.id); }} 
                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 border border-red-200"
                        title="Delete Student"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-6 flex items-center justify-between border-t border-border bg-gradient-to-r from-muted/30 to-muted/10">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all duration-200 font-medium shadow-sm"
          >
            Previous
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded-full">
              {filteredStudents.length} students
            </span>
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all duration-200 font-medium shadow-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ModernStudentList;