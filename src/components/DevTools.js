import React, { useState } from 'react';
import { clearAllCaches, clearStorageOnly } from '../utils/cacheBuster';

const DevTools = () => {
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;
  
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          zIndex: 99999,
          background: '#1f2937',
          color: 'white',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '2px solid #374151',
          cursor: 'pointer',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Show Dev Tools"
      >
        🛠️
      </button>
    );
  }
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: 20,
      zIndex: 99999,
      background: '#1f2937',
      border: '2px solid #374151',
      borderRadius: '12px',
      padding: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
        paddingBottom: '8px',
        borderBottom: '1px solid #374151'
      }}>
        <span style={{
          color: '#9ca3af',
          fontSize: '12px',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          Dev Tools
        </span>
        <button
          onClick={() => setIsMinimized(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0',
            marginLeft: '20px'
          }}
          title="Minimize"
        >
          _
        </button>
      </div>
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <button
          onClick={() => {
            if (window.confirm('This will clear ALL browser caches and reload. Continue?')) {
              clearAllCaches();
            }
          }}
          style={{
            background: '#ef4444',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#dc2626'}
          onMouseLeave={(e) => e.target.style.background = '#ef4444'}
        >
          🗑️ Clear All Caches
        </button>
        
        <button
          onClick={() => {
            clearStorageOnly();
          }}
          style={{
            background: '#f59e0b',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#d97706'}
          onMouseLeave={(e) => e.target.style.background = '#f59e0b'}
        >
          🔄 Clear Storage
        </button>
        
        <button
          onClick={() => {
            console.log('📊 Storage Report:');
            console.log('localStorage:', Object.keys(localStorage));
            console.log('sessionStorage:', Object.keys(sessionStorage));
            const usage = new Blob(Object.values(localStorage)).size;
            console.log('Storage usage:', (usage / 1024).toFixed(2), 'KB');
            alert(`Storage usage: ${(usage / 1024).toFixed(2)} KB\nCheck console for details.`);
          }}
          style={{
            background: '#10b981',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#059669'}
          onMouseLeave={(e) => e.target.style.background = '#10b981'}
        >
          📊 Inspect Storage
        </button>
      </div>
      
      <div style={{
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid #374151',
        color: '#6b7280',
        fontSize: '10px'
      }}>
        Ctrl/Cmd + Shift + K for quick clear
      </div>
    </div>
  );
};

export default DevTools;