import { useState } from 'react';

const AddableSelect = ({
  label,
  value,
  onChange,
  options,
  onAddNew,
  placeholder = 'Select an option',
  addNewPlaceholder = 'Enter new value',
  required = false
}) => {
  const [showNewInput, setShowNewInput] = useState(false);
  const [newValue, setNewValue] = useState('');

  const handleAddNewClick = () => {
    if (!newValue.trim()) return;
    onAddNew(newValue.trim());
    setNewValue('');
    setShowNewInput(false);
  };

  return (
    <div>
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <div className="flex gap-2">
        <select 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          required={required}
          className="block w-full h-12 px-4 rounded-lg bg-[#1F2129] text-white border border-transparent focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 appearance-none pr-10"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8L9.5 4.5' stroke='%23888888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 1rem center",
            backgroundSize: "12px"
          }}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button 
          type="button" 
          onClick={() => setShowNewInput(true)} 
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-sm font-semibold"
        >
          +
        </button>
      </div>
      {showNewInput && (
        <div className="flex gap-2 mt-2">
          <input 
            type="text" 
            value={newValue} 
            onChange={(e) => setNewValue(e.target.value)} 
            placeholder={addNewPlaceholder}
            className="block w-full h-12 px-4 rounded-lg bg-[#1F2129] text-white border border-transparent focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200"
          />
          <button 
            type="button" 
            onClick={handleAddNewClick} 
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold"
          >
            Add
          </button>
          <button 
            type="button" 
            onClick={() => setShowNewInput(false)} 
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-sm font-semibold"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default AddableSelect; 