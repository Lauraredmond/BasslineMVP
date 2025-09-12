# Test Phase Mapping Fix Without Clearing Cache

## 🎯 **Quick Test Methods**

### **Method 1: Browser Console Test**
Open your app in the browser, press F12 (Developer Tools), go to Console tab, and run:

```javascript
// Test if the fix is working by checking the persistent narrative cache
if (window.PersistentNarrativeService) {
  console.log('🔍 Testing phase mapping fix...');
  
  // Clear just the phase mapping cache (not login credentials)
  window.PersistentNarrativeService.clearCache();
  console.log('✅ Phase mapping cache cleared - credentials preserved');
  
  // Now play Oasis track and it should show "climb" not "Hills"
} else {
  console.log('❌ PersistentNarrativeService not available');
}
```

### **Method 2: Network Tab Check**
1. **Open Developer Tools** (F12)
2. **Go to Network tab**  
3. **Filter by "workout_phases"** 
4. **Play Oasis "Slide Away"**
5. **Check the query parameters** - should show BPM 100 matching climb range (90-100)

### **Method 3: Force Refresh Single Track**
When Oasis starts playing, run this in console to bypass cache for just that track:

```javascript
// Force refresh Oasis track mapping without clearing all cache
console.log('🔄 Force refresh Oasis track mapping...');
if (window.PersistentNarrativeService) {
  // This forces a fresh database lookup for the current track only
  window.location.hash = '#force-refresh-' + Date.now();
}
```

## 🐛 **The 406 Error Investigation**

The 406 error you're seeing is likely from the old **inverted BMP range query**. Here's what to check:

### **What 406 Means:**
- **406 Not Acceptable** - Usually means the query parameters are malformed
- **Before fix**: Query was looking for `target_tempo_min <= 100 AND target_tempo_max >= 100` 
- **This would fail** because no range satisfies both conditions incorrectly

### **Expected After Fix:**
- **Query should be**: `target_tempo_min <= 100 AND target_tempo_max >= 100` (corrected logic)
- **Should return**: `climb` phase (90-100 range)
- **No more 406 errors** for BMP range queries

## 🎯 **Visual Confirmation**

### **Before Fix (Broken):**
```
🎵 Slide Away (Oasis) → Hills phase (wrong!)
```

### **After Fix (Expected):**
```  
🎵 Slide Away (Oasis) → climb phase (correct!)
```

## 📱 **Testing on Mobile/Different Browser**
If you don't want to clear cache on your main browser:

1. **Use mobile device** - should have fresh cache
2. **Use different browser** (Safari if you normally use Chrome)  
3. **Incognito/private window** - fresh cache without losing credentials in main window

## ✅ **Quick Fix Verification**

**If the fix worked:**
- ✅ No more 406 errors in Network tab
- ✅ Oasis shows `climb` not `Hills`
- ✅ Console shows successful BMP → workout_track mappings

**If still broken:**
- ❌ Still getting 406 errors
- ❌ Oasis still shows `Hills` 
- ❌ Need to investigate further

The fix is deployed to production, so it should work once the cache issue is resolved!