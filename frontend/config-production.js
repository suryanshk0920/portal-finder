// Production configuration - Auto-detects deployment type

// Auto-detect if we need separate backend URL
const isRenderDeployment = window.location.hostname.includes('onrender.com');
const isNetlifyDeployment = window.location.hostname.includes('netlify.app') || window.location.hostname.includes('netlify.com');
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Backend API URL configuration
let BACKEND_URL;
if (isNetlifyDeployment) {
  // For separate Netlify frontend deployment
  BACKEND_URL = 'https://your-backend-app.onrender.com'; // Replace with actual URL
} else if (isRenderDeployment || isLocalhost) {
  // For same-domain deployment (Render full-stack or localhost)
  BACKEND_URL = window.location.origin;
} else {
  // Default fallback
  BACKEND_URL = window.location.origin;
}

// Only set API_CONFIG if we need separate backend
if (isNetlifyDeployment && BACKEND_URL !== window.location.origin) {
  window.API_CONFIG = {
    // Main API endpoints
    STATES_API: `${BACKEND_URL}/api/states`,
    SEARCH_API: `${BACKEND_URL}/api/search`,
    
    // Admin endpoints (private)
    ADMIN_DASHBOARD: `${BACKEND_URL}/admin`,
    CACHE_API: `${BACKEND_URL}/api/cache`,
    
    // Google Sheets integration
    GOOGLE_SCRIPT_URL: window.GOOGLE_SCRIPT_URL || 'REPLACE_WITH_YOUR_GOOGLE_SCRIPT_URL'
  };
  
  window.IS_PRODUCTION = true;
  console.log('[CONFIG] Separate deployment mode - Backend:', BACKEND_URL);
} else {
  // Same-domain deployment - use relative URLs
  console.log('[CONFIG] Same-domain deployment mode - Origin:', window.location.origin);
  window.IS_PRODUCTION = !isLocalhost;
}

console.log('[CONFIG] Environment:', window.IS_PRODUCTION ? 'Production' : 'Development');
