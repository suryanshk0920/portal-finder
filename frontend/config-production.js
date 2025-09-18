// Production configuration - Auto-detects deployment type

// Auto-detect if we need separate backend URL
const isRenderDeployment = window.location.hostname.includes('onrender.com');
const isNetlifyDeployment = window.location.hostname.includes('netlify.app') || window.location.hostname.includes('netlify.com');
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Backend API URL configuration
let BACKEND_URL;
if (isNetlifyDeployment) {
  // For separate Netlify frontend deployment
  BACKEND_URL = 'https://portal-finder.onrender.com'; // Replace with your actual Render URL
} else if (isRenderDeployment || isLocalhost) {
  // For same-domain deployment (Render full-stack or localhost)
  BACKEND_URL = window.location.origin;
} else {
  // Default fallback
  BACKEND_URL = window.location.origin;
}

// For Netlify deployment, use proxy URLs (no CORS issues)
if (isNetlifyDeployment) {
  // Use Netlify's proxy - no API_CONFIG needed, use relative URLs
  window.IS_PRODUCTION = true;
  console.log('[CONFIG] Netlify deployment - Using proxy for API calls');
} else if (isRenderDeployment || isLocalhost) {
  // Same-domain deployment - use relative URLs
  console.log('[CONFIG] Same-domain deployment mode - Origin:', window.location.origin);
  window.IS_PRODUCTION = !isLocalhost;
} else {
  // Fallback for other deployments
  window.IS_PRODUCTION = true;
}

console.log('[CONFIG] Environment:', window.IS_PRODUCTION ? 'Production' : 'Development');
