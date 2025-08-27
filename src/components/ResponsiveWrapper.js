import React from 'react';

// Responsive wrapper component that handles all device sizes
const ResponsiveWrapper = ({ children, className = '' }) => {
  return (
    <div className={`container-responsive safe-area-padding ${className}`}>
      {children}
    </div>
  );
};

// Responsive grid component
export const ResponsiveGrid = ({ children, size = 'md', className = '' }) => {
  const gridClass = size === 'sm' ? 'responsive-grid-sm' : 
                     size === 'lg' ? 'responsive-grid-lg' : 
                     'responsive-grid';
  
  return (
    <div className={`${gridClass} ${className}`}>
      {children}
    </div>
  );
};

// Responsive card component
export const ResponsiveCard = ({ children, className = '', onClick }) => {
  return (
    <div 
      className={`card-responsive bg-gray-800 hover:bg-gray-750 transition-all ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Responsive button component
export const ResponsiveButton = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  onClick,
  disabled = false,
  type = 'button'
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    ghost: 'bg-transparent hover:bg-gray-700 text-gray-300'
  };
  
  const sizes = {
    sm: 'text-fluid-sm',
    md: 'text-fluid-base',
    lg: 'text-fluid-lg'
  };
  
  return (
    <button
      type={type}
      className={`btn-responsive ${variants[variant]} ${sizes[size]} transition-all duration-200 ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// Responsive modal component
export const ResponsiveModal = ({ children, isOpen, onClose, title }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="modal-responsive bg-gray-900 contain-responsive">
        {title && (
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
            <h2 className="text-fluid-xl font-bold text-white">{title}</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>
        )}
        <div className="scroll-responsive">
          {children}
        </div>
      </div>
    </div>
  );
};

// Responsive table wrapper
export const ResponsiveTable = ({ children, headers = [], data = [] }) => {
  return (
    <div className="table-responsive">
      <table className="w-full">
        <thead>
          <tr className="text-left text-gray-400 text-fluid-sm">
            {headers.map((header, index) => (
              <th key={index} className="pb-3">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-white">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-gray-700">
              {Object.values(row).map((cell, cellIndex) => (
                <td 
                  key={cellIndex} 
                  className="py-3"
                  data-label={headers[cellIndex]}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {children}
    </div>
  );
};

// Responsive form input
export const ResponsiveInput = ({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  label,
  error,
  className = '',
  ...props 
}) => {
  return (
    <div className="form-group-responsive">
      {label && (
        <label className="text-fluid-sm text-gray-400">
          {label}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`input-responsive bg-gray-800 border ${error ? 'border-red-500' : 'border-gray-700'} text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none ${className}`}
        {...props}
      />
      {error && (
        <p className="text-red-400 text-fluid-xs">{error}</p>
      )}
    </div>
  );
};

// Responsive select dropdown
export const ResponsiveSelect = ({ 
  options = [], 
  value, 
  onChange, 
  label,
  placeholder = 'Select an option',
  className = '' 
}) => {
  return (
    <div className="form-group-responsive">
      {label && (
        <label className="text-fluid-sm text-gray-400">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        className={`input-responsive bg-gray-800 border border-gray-700 text-white focus:border-purple-500 focus:outline-none ${className}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// Responsive navigation
export const ResponsiveNav = ({ items = [], activeItem, onItemClick }) => {
  return (
    <nav className="nav-responsive">
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => onItemClick(item.value)}
          className={`btn-responsive ${
            activeItem === item.value 
              ? 'bg-purple-500 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          } transition-all`}
        >
          {item.icon && <span className="text-fluid-lg">{item.icon}</span>}
          <span className="hidden sm:inline">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

// Responsive heading with fluid typography
export const ResponsiveHeading = ({ level = 1, children, className = '' }) => {
  const Component = `h${level}`;
  const sizeClasses = {
    1: 'text-fluid-5xl',
    2: 'text-fluid-4xl',
    3: 'text-fluid-3xl',
    4: 'text-fluid-2xl',
    5: 'text-fluid-xl',
    6: 'text-fluid-lg'
  };
  
  return (
    <Component className={`${sizeClasses[level]} font-bold text-white ${className}`}>
      {children}
    </Component>
  );
};

export default ResponsiveWrapper;