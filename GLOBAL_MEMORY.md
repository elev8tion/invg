# Global Memory - Invoice Generator Project

## Project Context
- **Project**: Multi-Business Invoice Generator
- **Stack**: React, Supabase, TailwindCSS
- **Port**: 3001
- **Database**: Supabase (clyjnirqwngrzfzepghh.supabase.co)

## Critical Issues & Solutions

### 1. BusinessSwitcher Not Showing (SOLVED)
**Issue**: Component compiles but doesn't appear on screen
**Root Cause**: Browser site data cache corruption
**Solution**: Clear site data in browser
**Prevention**: Added DevTools component with cache clear buttons
**Key Learning**: Always suspect browser cache when React components don't update

### 2. React Hot Reload Corruption
**Symptoms**: 
- Changes don't appear after saving
- Components revert after refresh
- Console shows successful compile but UI doesn't update
**Solutions**:
- Clear node_modules/.cache
- Hard refresh (Cmd+Shift+R)
- Use DevTools cache clear button
- Restart dev server with `npm run start:clean`

## Component Architecture

### Business Structure
```
App.js (Main)
├── BusinessSwitcher (Header - business selection)
├── Dashboard (Main view)
│   ├── Overview Tab (Stats, Quick Actions, Pipeline)
│   ├── Payment History Tab
│   └── Purchase Orders Tab
├── InvoiceGenerator (Create/Edit invoices)
├── CustomerManagement
└── BusinessModal (Create/Edit business)
```

### Data Flow
1. **Current Business**: Selected in BusinessSwitcher → stored in App.js state
2. **Customers**: Loaded per business from Supabase
3. **Invoices**: Stored in localStorage (migrating to Supabase)

## Database Schema

### Core Tables
- `businesses` - Multi-tenant businesses
- `customers` - Per-business customers
- `invoices` - Sequential numbering per business (INV-000001)
- `invoice_items` - Line items
- `payments` - Payment tracking
- `purchase_orders` - PO management
- `email_log` - Email tracking

### Key Features
- Sequential invoice numbering per business
- Multi-business support with isolation
- Payment history tracking
- Purchase order management
- Email integration ready

## Common Commands

### Development
```bash
# Normal start
npm start

# Clean start (clear cache)
rm -rf node_modules/.cache && npm start

# Database migration
psql $DATABASE_URL < scripts/reset-and-create-schema.sql
```

### Cache Clearing
- **Keyboard**: Ctrl/Cmd + Shift + K
- **Console**: `window.__clearAllCaches()`
- **UI**: Red button in bottom-left DevTools

## Known Issues & Workarounds

### Issue: FeedbackOverlay runtime error
**Fix**: Clear all caches and npm install

### Issue: Supabase connection timeout
**Fix**: Check .env file, verify credentials

### Issue: Components not updating
**Fix**: 
1. Try hard refresh first
2. Clear browser site data
3. Delete node_modules/.cache
4. Restart dev server

## Environment Variables
```
REACT_APP_SUPABASE_URL=https://clyjnirqwngrzfzepghh.supabase.co
REACT_APP_SUPABASE_ANON_KEY=[key]
```

## Development Tools Added

### DevTools Component
- Location: Bottom-left corner
- Features:
  - Clear all caches button
  - Clear storage only button
  - Inspect storage button
  - Minimizable interface

### Cache Buster Utility
- Auto-imported in App.js
- Keyboard shortcut: Ctrl/Cmd + Shift + K
- Console access: `window.__clearAllCaches()`

## Current State (Last Updated: 2024)

### ✅ Completed
- Multi-business support with BusinessSwitcher
- Dashboard with tabs (Overview, Payments, Purchase Orders)
- Sequential invoice numbering
- Supabase integration
- Cache-busting development tools
- Payment history component (mock data)
- Purchase orders component (mock data)

### 🚧 In Progress
- Connecting Payment History to Supabase
- Connecting Purchase Orders to Supabase

### 📋 TODO
- Email integration
- Invoice templates
- Report generation
- Real payment processing

## Debugging Checklist

When something isn't working:

1. **Check Browser Console** - Look for errors
2. **Check Network Tab** - Verify API calls
3. **Check Application Tab** - Inspect localStorage
4. **Try Cache Clear** - Use DevTools button
5. **Check Supabase** - Verify data in dashboard
6. **Restart Dev Server** - With cache clear
7. **Check .env** - Verify all variables set

## Important Files

- `/src/App.js` - Main app logic, routing
- `/src/BusinessSwitcher.js` - Business selection
- `/src/Dashboard.js` - Main dashboard with tabs
- `/src/lib/supabase.js` - Database connection
- `/src/utils/cacheBuster.js` - Cache clearing utility
- `/src/components/DevTools.js` - Development tools UI
- `/scripts/reset-and-create-schema.sql` - Database schema
- `/.env` - Environment variables

## Lessons Learned

1. **Always suspect cache** when React components don't update
2. **Browser site data** persists across sessions and can corrupt
3. **Add dev tools early** to prevent wasted debugging time
4. **Document solutions** immediately to prevent repeat issues
5. **Use versioned storage** to prevent data corruption
6. **Clear node_modules/.cache** when hot reload fails

## Quick Wins

- Press `Ctrl/Cmd + Shift + K` to clear all caches
- Use the red DevTools button for visual cache clearing
- Always hard refresh (Cmd+Shift+R) before assuming code issue
- Check Supabase dashboard for data verification
- Use console logging in BusinessSwitcher to debug loading

---

*This file serves as persistent memory across sessions. Update it whenever discovering new issues or solutions.*