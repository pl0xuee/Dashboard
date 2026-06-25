# YouTube Stream Integration Troubleshooting

## Error: "YouTube scan failed. Try reconnecting."

This error appears in the "My Streamers" dropdown when the YouTube live channel scanner encounters an issue. Here's how to fix it:

---

## Quick Fixes (Try These First)

### 1. **Disconnect & Reconnect YouTube**
   - Click "My Streamers" dropdown
   - Click "Disconnect YouTube" (if connected)
   - Then click "+ Connect YouTube"
   - Authorize when prompted
   - Wait 2-3 seconds and try again

### 2. **Clear Browser Cache & Storage**
   ```
   - Open DevTools (F12 or Cmd+Option+I)
   - Application > Local Storage > file:/// > Clear All
   - Reload the page
   - Try connecting YouTube again
   ```

### 3. **Wait & Retry**
   - If you see "YouTube temporarily paused after error", wait 1-2 minutes
   - This cooldown prevents hitting rate limits
   - Try opening the dropdown again

---

## If Quick Fixes Don't Work

### **Step 1: Verify YouTube Data API v3 is Enabled**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one with the OAuth Client ID in `config.js`)
3. Search for "YouTube Data API v3"
4. Click on it and verify **STATUS** shows "ENABLED"
5. If not enabled, click the **ENABLE** button

### **Step 2: Check OAuth Scopes**

The app requests this scope:
```
https://www.googleapis.com/auth/youtube.readonly
```

If you're still seeing "YouTube scope missing" errors:
1. Disconnect YouTube from the app
2. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
3. Find "Stream - Command Center" or the app name
4. Click it and select **Remove Access**
5. Reconnect YouTube - you'll be asked to grant permissions again
6. Make sure to click "Allow" when prompted for YouTube access

### **Step 3: Check API Quota & Rate Limits**

1. [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **APIs & Services > Quotas**
3. Search for "YouTube Data API v3"
4. Check your **User Quota** usage
5. If usage is near the limit, you'll need to wait until the quota resets (daily quota resets at midnight PT)

Default quotas:
- **10,000 units/day** for free projects
- Each API call costs 1-100 units depending on the operation

### **Step 4: Verify Client ID in config.js**

Make sure your `config.js` has a valid YouTube Client ID:
```javascript
export const YOUTUBE_CLIENT_ID = '743961588451-0du4kputk1qd54iilbsanqfoe9t0n2c1.apps.googleusercontent.com';
```

If it still says `'YOUR_YOUTUBE_CLIENT_ID'`, you need to create one:
1. Go to [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **+ Create Credentials > OAuth 2.0 Client ID**
3. Choose **Web application**
4. Under "Authorized redirect URIs", add:
   ```
   http://localhost:8000/stream/
   file:///home/jamespc/Documents/Website_test/stream/
   ```
5. Copy the Client ID and update `config.js`

### **Step 5: Check Network & CORS**

If you see "Network error contacting YouTube":
1. Open DevTools (F12)
2. Go to **Network** tab
3. Try opening "My Streamers" dropdown again
4. Look for failed requests to `www.googleapis.com`
5. Click on a failed request and check:
   - **Status code** (should be 200, not 403/401/429)
   - **Response** (check for error details)

Common HTTP status codes:
- **401**: Token expired → Reconnect YouTube
- **403**: Insufficient permissions → Check API enabled & scopes
- **429**: Rate limited → Wait and retry in a few minutes
- **500+**: API server error → Try again in a few minutes

---

## When to Contact Google Support

If you've tried all the above and still get errors:
1. Open DevTools (F12) and note the exact error message
2. Check the **Console** tab for full error details
3. Visit [Google Cloud Support](https://cloud.google.com/support) if it's an API/quota issue

---

## How the YouTube Integration Works

1. You connect with your Google account
2. The app fetches your YouTube subscriptions
3. It checks those channels for live streams every 2 minutes
4. Live streams appear in the "My Streamers" dropdown under "YouTube Live"
5. Click a live stream name to watch it

**Note**: The app only shows live streams from channels you're subscribed to.

---

## Performance Tips

- Don't click "My Streamers" too frequently (wait 15 seconds between checks)
- Have fewer subscriptions = faster scans
- Unsubscribe from channels you don't care about for faster results
