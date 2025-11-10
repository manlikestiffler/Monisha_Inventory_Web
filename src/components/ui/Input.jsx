import { forwardRef } from 'react';
import PropTypes from 'prop-types';

const Input = forwardRef(({ 
  label, 
  error, 
  icon, 
  className = '', 
  ...props 
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-400 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            block w-full h-12 px-4
            bg-[#1F2129] text-white
            border border-transparent
            rounded-lg
            placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500
            transition-all duration-200
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

Input.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  icon: PropTypes.node,
  className: PropTypes.string,
};

export default Input; 