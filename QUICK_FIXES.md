# 🚀 Quick Fixes - Invoice Generator

## 🔴 EMERGENCY: Component Not Showing/Updating

### Immediate Fix:
1. **Press `Ctrl/Cmd + Shift + K`** (clears all caches)
2. OR click the **red button** in bottom-left corner
3. Wait for automatic reload

### If Still Broken:
```bash
# Terminal fix
rm -rf node_modules/.cache
npm start
```

### Nuclear Option:
1. Chrome: Settings → Privacy → Clear browsing data → All time → Site data
2. Close all browser tabs
3. `rm -rf node_modules/.cache build`
4. `npm install`
5. `npm start`

---

## 🟡 Common Issues & Instant Fixes

### "BusinessSwitcher not visible"
```javascript
// Check console for:
"BusinessSwitcher: Component mounted"
// If missing → cache issue → Press Ctrl/Cmd + Shift + K
```

### "Cannot read property of undefined"
```javascript
// Add optional chaining
data?.property?.subproperty || defaultValue
```

### "Supabase not connecting"
```bash
# Check .env exists and has:
REACT_APP_SUPABASE_URL=https://clyjnirqwngrzfzepghh.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_key_here
```

### "Changes reverting after refresh"
```bash
# React HMR corruption
rm -rf node_modules/.cache
# Then hard refresh: Cmd+Shift+R
```

### "FeedbackOverlay is not defined"
```bash
# Module corruption
rm -rf node_modules
npm install
```

---

## 🟢 Dev Tools Shortcuts

### Keyboard
- `Ctrl/Cmd + Shift + K` - Clear all caches
- `Cmd + Shift + R` - Hard refresh (Mac)
- `Ctrl + Shift + R` - Hard refresh (Windows/Linux)

### Console Commands
```javascript
// Clear everything
window.__clearAllCaches()

// Clear storage only
window.__clearStorage()

// Check what's stored
window.__inspectStorage()
```

### Visual Tools
- **Red Button** - Clear all caches + reload
- **Orange Button** - Clear storage only
- **Green Button** - Inspect storage usage

---

## 📊 Check Project Health

### 1. Is Supabase Connected?
```javascript
// Browser console:
await supabase.from('businesses').select('*')
// Should return data, not error
```

### 2. Is BusinessSwitcher Loading?
```javascript
// Look for in console:
"BusinessSwitcher: Loaded businesses: Array(2)"
```

### 3. Is Hot Reload Working?
```javascript
// Change any text in App.js
// Should update immediately
// If not → cache issue
```

---

## 🛠️ Start Fresh

### Complete Reset
```bash
# 1. Stop server (Ctrl+C)
# 2. Clear everything
rm -rf node_modules/.cache build dist .parcel-cache

# 3. Clear browser (in Chrome DevTools)
Application tab → Storage → Clear site data

# 4. Reinstall and start
npm install
npm start

# 5. Open in new incognito window
```

---

## 📝 Prevention

### Always Have DevTools
The DevTools component should ALWAYS be visible in development.
If not showing:
1. Check `/src/App.js` has `<DevTools />` 
2. Check import: `import DevTools from './components/DevTools'`
3. Clear cache if still not visible

### Test After Major Changes
After adding new components:
1. Save file
2. Check browser updates
3. If not → immediate cache clear
4. Don't wait, don't debug → just clear cache first

---

## 🎯 One-Line Fixes

| Problem | Fix |
|---------|-----|
| Component not updating | `Ctrl/Cmd + Shift + K` |
| Supabase timeout | Check `.env` file exists |
| Build errors | `rm -rf node_modules && npm install` |
| Console errors | Open DevTools, check red text |
| White screen | Check console, usually cache issue |
| Data not loading | Check Network tab for 401/403 |
| Styles broken | Hard refresh `Cmd+Shift+R` |

---

**Remember: 90% of React dev issues = cache problem**

When in doubt → Clear cache first, debug second!