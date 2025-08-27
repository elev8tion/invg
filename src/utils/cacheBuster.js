// Cache Busting Utility for Development
// Prevents the "component not updating" issue caused by browser caching

export const clearAllCaches = async () => {
  console.log('🗑️ Starting complete cache clear...');
  
  try {
    // Clear localStorage
    localStorage.clear();
    console.log('✅ localStorage cleared');
    
    // Clear sessionStorage
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
    
    // Clear IndexedDB
    if (window.indexedDB && indexedDB.databases) {
      try {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases.map(db => {
            indexedDB.deleteDatabase(db.name);
            console.log(`✅ IndexedDB ${db.name} cleared`);
          })
        );
      } catch (e) {
        console.log('⚠️ Could not clear IndexedDB:', e);
      }
    }
    
    // Clear service worker caches
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => {
            caches.delete(name);
            console.log(`✅ Cache ${name} cleared`);
          })
        );
      } catch (e) {
        console.log('⚠️ Could not clear caches:', e);
      }
    }
    
    // Unregister service workers
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(reg => {
            reg.unregister();
            console.log('✅ Service worker unregistered');
          })
        );
      } catch (e) {
        console.log('⚠️ Could not unregister service workers:', e);
      }
    }
    
    console.log('🎉 All caches cleared! Reloading...');
    
    // Force reload without cache
    setTimeout(() => {
      window.location.reload(true);
    }, 500);
    
  } catch (error) {
    console.error('❌ Error clearing caches:', error);
    // Still try to reload
    window.location.reload(true);
  }
};

export const clearStorageOnly = () => {
  localStorage.clear();
  sessionStorage.clear();
  console.log('✅ Storage cleared');
  window.location.reload();
};

// Add keyboard shortcut for development
if (process.env.NODE_ENV === 'development') {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Shift + K to clear all caches
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      if (window.confirm('Clear all caches and reload?')) {
        clearAllCaches();
      }
    }
  });
  
  // Make it available globally for console access
  window.__clearAllCaches = clearAllCaches;
  window.__clearStorage = clearStorageOnly;
  
  console.log('💡 Dev Tools Ready:');
  console.log('   - Press Ctrl/Cmd + Shift + K to clear all caches');
  console.log('   - Or run window.__clearAllCaches() in console');
  console.log('   - Or run window.__clearStorage() for storage only');
}