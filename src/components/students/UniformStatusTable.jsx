import React, { useState } from 'react';
import { FiChevronDown, FiMinus, FiPlus } from 'react-icons/fi';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const STATUSES = [
  { value: 'received', label: 'Received' },
  { value: 'pending', label: 'Pending' },
];

// A custom, animated dropdown component
const CustomSelect = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const displayLabel = options.find(opt => opt.value === value)?.label || placeholder;

  return (
    <div className="relative w-36">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full bg-gray-50 dark:bg-dark-secondary border border-gray-300 dark:border-gray-600 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      >
        <span className="block truncate">{displayLabel}</span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <FiChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
        </span>
      </button>
      {isOpen && (
        <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-dark-accent shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {options.map((option) => (
            <li
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="text-gray-900 dark:text-gray-200 cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white"
            >
              <span className="font-normal block truncate">{option.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const UniformTableRow = ({ uniformKey, uniformData, onUniformChange }) => {
  const { required, received, size, status } = uniformData;
  const progress = required > 0 ? (received / required) * 100 : 0;

  const handleQuantityChange = (newQuantity) => {
    onUniformChange(uniformKey, 'received', Math.max(0, newQuantity));
  };
  
  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-dark-secondary transition-colors duration-200">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white capitalize">
        {uniformKey.replace(/_/g, ' ')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
        <CustomSelect 
          options={STATUSES}
          value={status}
          onChange={(value) => onUniformChange(uniformKey, 'status', value)}
          placeholder="Select Status"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
         <CustomSelect 
          options={SIZES.map(s => ({ value: s, label: `Size ${s}`}))}
          value={size}
          onChange={(value) => onUniformChange(uniformKey, 'size', value)}
          placeholder="Select Size"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <button onClick={() => handleQuantityChange(received - 1)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50" disabled={received <= 0}>
            <FiMinus />
          </button>
          <span className="w-8 text-center">{received} / {required}</span>
          <button onClick={() => handleQuantityChange(received + 1)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <FiPlus />
          </button>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      </td>
    </tr>
  );
};

const UniformStatusTable = ({ uniforms, onUniformChange }) => {
  if (!uniforms) {
    return (
      <div className="flex justify-center items-center h-48 text-gray-500 dark:text-slate-400">
        Loading uniform details...
      </div>
    );
  }
  
  const uniformEntries = Object.entries(uniforms);

  if (uniformEntries.length === 0) {
    return (
      <div className="flex justify-center items-center h-48 text-gray-500 dark:text-slate-400">
        No uniform requirements have been set for this school.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-accent shadow-md rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-dark-secondary">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Uniform Item
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Size
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Quantity (Received / Required)
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Progress
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-dark-primary divide-y divide-gray-200 dark:divide-gray-700">
          {uniformEntries.map(([uniformKey, uniformData]) => (
            <UniformTableRow 
              key={uniformKey}
              uniformKey={uniformKey}
              uniformData={uniformData}
              onUniformChange={onUniformChange}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UniformStatusTable;