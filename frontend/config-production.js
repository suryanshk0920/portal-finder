// Production configuration for separate deployments
// This file will be used when frontend is deployed separately from backend

// Backend API URL - Replace with your deployed backend URL
const BACKEND_URL = 'https://your-backend-app.onrender.com'; // Replace with actual URL

// Override API endpoints for production
window.API_CONFIG = {
  // Main API endpoints
  STATES_API: `${BACKEND_URL}/api/states`,
  SEARCH_API: `${BACKEND_URL}/api/search`,
  
  // Admin endpoints (private - only accessible with direct URL)
  ADMIN_DASHBOARD: `${BACKEND_URL}/admin`,
  CACHE_API: `${BACKEND_URL}/api/cache`,
  
  // Google Sheets integration (works independently)
  GOOGLE_SCRIPT_URL: window.GOOGLE_SCRIPT_URL || 'REPLACE_WITH_YOUR_GOOGLE_SCRIPT_URL'
};

// Development vs Production detection
window.IS_PRODUCTION = !window.location.hostname.includes('localhost');

console.log('[CONFIG] Environment:', window.IS_PRODUCTION ? 'Production' : 'Development');
console.log('[CONFIG] Backend URL:', BACKEND_URL);