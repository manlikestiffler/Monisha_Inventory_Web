import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  loading = false,
  isLoading,
  ...props 
}) => {
  // Handle both loading and isLoading props for backward compatibility
  const isButtonLoading = loading || isLoading;
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black';
  
  const variants = {
    primary: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/50',
    secondary: 'bg-[#1F2129] hover:bg-gray-800 text-white focus:ring-gray-500/50',
    outline: 'border border-gray-700 text-gray-300 hover:bg-gray-800 focus:ring-gray-500/50',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/50',
    link: 'bg-transparent text-gray-300 hover:text-white underline',
    ghost: 'bg-transparent hover:bg-gray-800 text-gray-300 hover:text-white',
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`
        ${baseStyles} 
        ${variants[variant]} 
        ${sizes[size]}
        ${isButtonLoading ? 'opacity-75 cursor-not-allowed' : ''}
        ${className}
      `}
      disabled={isButtonLoading}
      {...props}
    >
      {isButtonLoading ? (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center"
        >
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </motion.span>
      ) : children}
    </motion.button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'link', 'ghost', 'danger']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  loading: PropTypes.bool,
  isLoading: PropTypes.bool,
};

export default Button; 