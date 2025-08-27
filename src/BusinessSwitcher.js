import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Building, ChevronDown, Plus, Check, Settings, AlertCircle } from 'lucide-react';
import { businessService } from './lib/supabase';

const BusinessSwitcher = ({ currentBusiness, onBusinessChange, onCreateBusiness }) => {
  const [businesses, setBusinesses] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  const loadBusinesses = useCallback(async () => {
    try {
      setLoading(true);
      console.log('BusinessSwitcher: Loading businesses...');
      
      // Get all businesses for now (in production, filter by user)
      const allBusinesses = await businessService.getAllBusinesses();
      console.log('BusinessSwitcher: Loaded businesses:', allBusinesses);
      
      if (allBusinesses && allBusinesses.length > 0) {
        setBusinesses(allBusinesses);
        
        // Set first business as current if none selected
        if (!currentBusiness) {
          console.log('BusinessSwitcher: Setting first business as current:', allBusinesses[0]);
          onBusinessChange(allBusinesses[0]);
        }
      } else {
        console.log('BusinessSwitcher: No businesses found');
        setBusinesses([]);
      }
    } catch (error) {
      console.error('BusinessSwitcher: Error loading businesses:', error);
      console.error('BusinessSwitcher: Error details:', error.message, error.stack);
      setBusinesses([]);
      setError('Failed to load businesses. Please check your connection.');
    } finally {
      console.log('BusinessSwitcher: Setting loading to false');
      setLoading(false);
    }
  }, [currentBusiness, onBusinessChange]);

  useEffect(() => {
    console.log('BusinessSwitcher: Component mounted, loading businesses...');
    
    // Set a timeout fallback in case the loading gets stuck
    const timeoutId = setTimeout(() => {
      console.warn('BusinessSwitcher: Loading timeout - forcing loading to false');
      setLoading(false);
      setError('Loading timeout. Please refresh the page.');
    }, 10000); // 10 second timeout
    
    loadBusinesses().finally(() => {
      clearTimeout(timeoutId);
    });
    
    return () => clearTimeout(timeoutId);
  }, [loadBusinesses]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBusiness = (business) => {
    onBusinessChange(business);
    setShowDropdown(false);
  };

  const handleCreateBusiness = () => {
    setShowDropdown(false);
    if (onCreateBusiness) {
      onCreateBusiness();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-xl">
        <Building size={20} className="text-gray-400" />
        <span className="text-gray-400">Loading businesses...</span>
        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-800/50 border border-red-600 rounded-xl">
        <AlertCircle size={20} className="text-red-400" />
        <div className="flex-1">
          <p className="text-sm text-red-200">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              loadBusinesses();
            }}
            className="text-xs text-red-300 hover:text-red-100 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!currentBusiness && businesses.length === 0) {
    return (
      <button
        onClick={handleCreateBusiness}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
      >
        <Plus size={20} />
        Create Your First Business
      </button>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-3 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 transition-colors min-w-[200px]"
      >
        <Building size={20} className="text-purple-400" />
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-white">
            {currentBusiness?.name || 'Select Business'}
          </p>
          {currentBusiness?.invoice_prefix && (
            <p className="text-xs text-gray-400">
              Next: {currentBusiness.invoice_prefix}-{String(currentBusiness.next_invoice_number).padStart(6, '0')}
            </p>
          )}
        </div>
        <ChevronDown 
          size={20} 
          className={`text-gray-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
        />
      </button>

      {showDropdown && (
        <div className="absolute top-full mt-2 w-full bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="max-h-64 overflow-y-auto">
            {businesses.map((business) => (
              <button
                key={business.id}
                onClick={() => handleSelectBusiness(business)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-700 flex items-center justify-between transition-colors ${
                  currentBusiness?.id === business.id ? 'bg-gray-700' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building size={18} className="text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-white">{business.name}</p>
                    <p className="text-xs text-gray-400">{business.email}</p>
                  </div>
                </div>
                {currentBusiness?.id === business.id && (
                  <Check size={18} className="text-green-400" />
                )}
              </button>
            ))}
          </div>
          
          <div className="border-t border-gray-700">
            <button
              onClick={handleCreateBusiness}
              className="w-full px-4 py-3 text-left hover:bg-gray-700 flex items-center gap-3 transition-colors"
            >
              <Plus size={18} className="text-green-400" />
              <span className="text-sm font-medium text-white">Add New Business</span>
            </button>
            
            {currentBusiness && (
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // Navigate to business settings
                  console.log('Navigate to business settings');
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 flex items-center gap-3 transition-colors border-t border-gray-700"
              >
                <Settings size={18} className="text-blue-400" />
                <span className="text-sm font-medium text-white">Business Settings</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessSwitcher;