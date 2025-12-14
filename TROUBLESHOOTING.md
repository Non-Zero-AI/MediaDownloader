# Troubleshooting: No UI Loading

If you're seeing a blank page when loading the app, follow these steps:

## Step 1: Check if the Dev Server is Running

Make sure you have the frontend dev server running:

```bash
npm run dev
```

You should see output like:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Access the app at:** http://localhost:5173 (or the port shown)

## Step 2: Check Browser Console

Open your browser's developer console (F12 or Cmd+Option+I) and look for errors:

1. **Red errors** - These indicate JavaScript errors
2. **Network errors** - Check if files are loading (404 errors)
3. **Console logs** - Look for "App mounted successfully"

## Step 3: Verify Files Are Loading

In the browser's Network tab, check:
- Is `index.html` loading? (Status 200)
- Are JavaScript files loading? (`index-*.js`)
- Are CSS files loading? (`index-*.css`)

## Step 4: Common Issues

### Issue: Blank white page
**Solution:** 
- Check browser console for errors
- Make sure you're accessing the correct URL (http://localhost:5173)
- Try hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

### Issue: "Cannot find module" errors
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Supabase connection errors
**Solution:** This is OK! The app will work without Supabase, but some features (auth, knowledge base) won't work. You can:
- Set up Supabase locally: `npm run supabase:start`
- Or use the app without authentication (basic downloader will work)

### Issue: Port already in use
**Solution:**
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use a different port
npm run dev -- --port 5174
```

## Step 5: Quick Test

To verify the app is working, you should see:
1. A purple/blue gradient background
2. A navigation bar at the top
3. "Media Downloader" heading
4. A form with URL input and format buttons

If you see NONE of these, the app isn't loading at all.

## Step 6: Check Server Logs

If running the backend server (`npm run server`), check its logs for errors.

## Still Not Working?

1. **Clear browser cache** and try again
2. **Try a different browser** (Chrome, Firefox, Safari)
3. **Check if JavaScript is enabled** in your browser
4. **Verify Node.js version**: `node --version` (should be v16+)
5. **Rebuild the app**: `npm run build` then check `dist/` folder

## Getting Help

If none of these work, please share:
1. Browser console errors (screenshot or copy/paste)
2. Terminal output from `npm run dev`
3. What you see in the browser (blank page, error message, etc.)

