import React, { useState, useEffect, forwardRef } from 'react';

// A simple motion component that can be used as a drop-in replacement for framer-motion
const SimpleMotion = forwardRef(({ 
  children, 
  initial = {}, 
  animate = {}, 
  exit = {}, 
  transition = { duration: 0.3 }, 
  className = '', 
  style = {},
  ...props 
}, ref) => {
  const [currentStyle, setCurrentStyle] = useState(initial);
  
  useEffect(() => {
    // Apply animation styles after mount
    const timer = setTimeout(() => {
      setCurrentStyle(animate);
    }, 10);
    
    return () => clearTimeout(timer);
  }, [JSON.stringify(animate)]);
  
  // Merge the style props
  const mergedStyle = {
    transition: `all ${transition.duration || 0.3}s ${transition.ease || 'ease'}`,
    ...style,
    ...currentStyle
  };
  
  return (
    <div 
      ref={ref}
      className={className} 
      style={mergedStyle}
      {...props}
    >
      {children}
    </div>
  );
});

// Simple AnimatePresence replacement
const SimpleAnimatePresence = ({ children, exitBeforeEnter }) => {
  return children;
};

// Export pre-configured motion components for different HTML elements
const motion = {
  div: forwardRef((props, ref) => <SimpleMotion {...props} ref={ref} />),
  button: forwardRef((props, ref) => <SimpleMotion as="button" {...props} ref={ref} />),
  span: forwardRef((props, ref) => <SimpleMotion as="span" {...props} ref={ref} />),
  ul: forwardRef((props, ref) => <SimpleMotion as="ul" {...props} ref={ref} />),
  li: forwardRef((props, ref) => <SimpleMotion as="li" {...props} ref={ref} />),
};

export { motion, SimpleAnimatePresence as AnimatePresence }; 