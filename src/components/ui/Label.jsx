import React from 'react';
import PropTypes from 'prop-types';

const Label = ({ children, className = '', htmlFor, required }) => {
  return (
    <label 
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-400 mb-2 ${className}`}
    >
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
};

Label.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  htmlFor: PropTypes.string,
  required: PropTypes.bool
};

export default Label; 