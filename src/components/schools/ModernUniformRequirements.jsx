import React from 'react';
import { FiShoppingBag, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';

const UniformCard = ({ uniform, onEdit, onDelete }) => {
  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 overflow-hidden hover:shadow-lg transition-all duration-200 group">
      <div className="p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{uniform.name}</h3>
          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <button 
              onClick={() => onEdit(uniform)} 
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            >
              <FiEdit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onDelete(uniform.id)} 
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-300 flex-grow space-y-2.5">
          <p className="flex items-center justify-between">
            Category 
            <span className="font-medium text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700/50 px-3 py-1 rounded-lg">{uniform.category}</span>
          </p>
          <p className="flex items-center justify-between">
            Level 
            <span className="font-medium text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700/50 px-3 py-1 rounded-lg">{uniform.level}</span>
          </p>
          <p className="flex items-center justify-between">
            Gender 
            <span className="font-medium text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700/50 px-3 py-1 rounded-lg">{uniform.gender}</span>
          </p>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50 flex justify-between items-center">
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              Qty per student
              <span className="ml-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg">
                {uniform.quantity || 1}
              </span>
            </span>
          </div>
          
          {uniform.required !== false ? (
            <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
              <FiCheck className="w-4 h-4 mr-1.5" /> Required
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300">
              <FiX className="w-4 h-4 mr-1.5" /> Optional
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const ModernUniformRequirements = ({ uniforms = [], onEdit, onDelete }) => {
  const uniformsByCategory = uniforms.reduce((acc, uniform) => {
    const category = uniform.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(uniform);
    return acc;
  }, {});

  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 overflow-hidden">
      <div className="px-7 py-5 border-b border-gray-200 dark:border-gray-700/50 flex justify-between items-center bg-gradient-to-r from-red-50 to-red-100 dark:from-red-800/20 dark:to-red-900/20">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <FiShoppingBag className="mr-3 text-red-600 dark:text-red-400" />
          Uniform Requirements
        </h2>
        <span className="text-sm bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-4 py-1.5 rounded-xl font-medium">
          {uniforms.length} {uniforms.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      
      {uniforms.length === 0 ? (
        <div className="p-16 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FiShoppingBag className="h-10 w-10 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-lg mb-3">No uniform requirements added yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Click the "Add Uniform" button to get started</p>
        </div>
      ) : (
        <div className="p-7">
          {Object.entries(uniformsByCategory).map(([category, categoryUniforms]) => (
            <div key={category} className="mb-10 last:mb-0">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-5 pb-3 border-b border-gray-200 dark:border-gray-700/50 flex items-center">
                {category}
                <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                  ({categoryUniforms.length} {categoryUniforms.length === 1 ? 'item' : 'items'})
                </span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {categoryUniforms.map((uniform) => (
                  <UniformCard 
                    key={uniform.id} 
                    uniform={uniform} 
                    onEdit={onEdit} 
                    onDelete={onDelete} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModernUniformRequirements;