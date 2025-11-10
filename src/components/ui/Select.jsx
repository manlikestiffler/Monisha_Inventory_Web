import React from 'react';
import PropTypes from 'prop-types';

const Select = ({ value, onChange, options = [], placeholder, required, children, className }) => {
  const selectElement = (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`block w-full h-12 px-4 rounded-lg bg-[#1F2129] text-white border border-transparent focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 appearance-none pr-10 ${className || ''}`}
      style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8L9.5 4.5' stroke='%23888888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 1rem center",
        backgroundSize: "12px"
      }}
      required={required}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options && options.length > 0 ? (
        options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))
      ) : children}
    </select>
  );

  return selectElement;
};

Select.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
};

export default Select; 