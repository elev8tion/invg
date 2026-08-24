# 🚀 Deploy Invoice Pro to Netlify

Your app is now ready for deployment as a Progressive Web App (PWA)!

## 📋 Pre-deployment Checklist

✅ **App is PWA-ready** with:
- Service worker for offline functionality
- Web app manifest for mobile installation
- Mobile-optimized viewport and meta tags
- Caching strategy for assets

✅ **Netlify configuration** (`netlify.toml`) is set up
✅ **Build process** is configured

## 🌐 Deploy to Netlify

### Option 1: Drag & Drop (Quick)

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Go to Netlify.com** and drag the `build` folder to deploy

### Option 2: GitHub Integration (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add PWA features and Netlify config"
   git push origin main
   ```

2. **Connect to Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub account
   - Select your repository
   - Netlify will auto-detect settings from `netlify.toml`

3. **Set Environment Variables (REQUIRED):**
   In Netlify dashboard → Site configuration → Environment variables, add:
   ```
   NCB_INSTANCE    = 36905_invg
   NCB_SECRET_KEY  = <the sk_live_... key from your local .env>
   ```

   **These must NOT have a `REACT_APP_` prefix.** Create React App inlines any
   `REACT_APP_*` variable into the public JavaScript bundle, and the secret key
   is full read/write/delete on every table. It is read only by the serverless
   function in `netlify/functions/ncb.js`, never by the browser.

   Optional, client-side (safe to inline):
   ```
   REACT_APP_EMAILIT_API_KEY = your_emailit_api_key
   ```

   Without `NCB_INSTANCE` and `NCB_SECRET_KEY` the site builds and loads, but
   every data request returns HTTP 503 and no businesses, customers or invoices
   appear.

4. **Deploy:** Click "Deploy site"

   Environment variables are read when the function runs, but a deploy after
   setting them is the reliable way to pick them up. If the site is already
   deployed, use **Deploys → Trigger deploy → Clear cache and deploy site**.

## 📱 Mobile Web App Features

Once deployed, users can:

### iOS (Safari):
1. Visit your site
2. Tap the Share button
3. Choose "Add to Home Screen"
4. App appears like a native app!

### Android (Chrome):
1. Visit your site
2. Chrome will show "Add to Home Screen" banner
3. Or tap menu → "Add to Home Screen"
4. Installs like a native app!

## ✨ PWA Features Included

- **📱 Mobile-optimized** - Responsive design
- **🔄 Offline support** - Works without internet
- **⚡ Fast loading** - Cached assets
- **📲 Installable** - Add to home screen
- **🔔 Update notifications** - Auto-update prompts
- **🌐 Cross-platform** - Works on all devices

## 🔧 Post-Deployment

After deployment:

1. **Test on mobile** - Visit site on phone
2. **Install as app** - Add to home screen
3. **Test offline** - Turn off internet, app should still work
4. **Check performance** - Use Lighthouse in Chrome DevTools

## 🎯 Your Site URL

After deployment, your site will be available at:
- **Netlify subdomain:** `your-app-name.netlify.app`
- **Custom domain:** You can add your own domain in Netlify settings

## 🆘 Troubleshooting

**Build fails?**
- Check environment variables are set correctly
- Make sure all dependencies are in `package.json`

**App doesn't install on mobile?**
- Check manifest.json is loading correctly
- Ensure HTTPS is enabled (Netlify does this automatically)

**Offline mode not working?**
- Check service worker is registered
- Look for console errors in browser dev tools

## 🚀 You're Ready to Go!

Your invoice generator is now:
- ✅ Deployed to the web
- ✅ Works as a mobile app  
- ✅ Functions offline
- ✅ Automatically updates
- ✅ Professional and fast

Share the URL with anyone - they can use it on any device, anywhere! 📱💻