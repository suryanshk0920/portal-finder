const crypto = require('crypto');

/**
 * Admin Authentication Middleware
 * Secures admin endpoints with API key authentication
 */

// Default admin API key (should be changed in production)
const DEFAULT_ADMIN_KEY = 'portal_finder_admin_2024_secure_key';

/**
 * Generate a secure admin API key
 */
function generateAdminKey() {
  return `pf_admin_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Validate admin API key
 */
function isValidAdminKey(providedKey) {
  const adminKey = process.env.ADMIN_API_KEY || DEFAULT_ADMIN_KEY;
  
  // Constant-time comparison to prevent timing attacks
  if (typeof providedKey !== 'string' || providedKey.length !== adminKey.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(providedKey, 'utf8'),
    Buffer.from(adminKey, 'utf8')
  );
}

/**
 * Middleware to authenticate admin requests
 */
const requireAdminAuth = (req, res, next) => {
  // Check for API key in different places
  const apiKey = 
    req.headers['x-admin-api-key'] ||           // Custom header
    req.headers['authorization']?.replace('Bearer ', '') ||  // Authorization header
    req.query.admin_key ||                      // Query parameter (less secure)
    req.body?.admin_api_key;                    // Request body

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Admin API key is required',
      timestamp: new Date().toISOString()
    });
  }

  if (!isValidAdminKey(apiKey)) {
    // Log failed authentication attempts
    console.warn(`[SECURITY] Invalid admin API key attempt from ${req.ip} at ${new Date().toISOString()}`);
    
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      message: 'The provided admin API key is invalid',
      timestamp: new Date().toISOString()
    });
  }

  // Log successful admin access
  console.log(`[ADMIN] Authenticated admin access to ${req.path} from ${req.ip} at ${new Date().toISOString()}`);
  
  next();
};

/**
 * Middleware to serve admin static files with authentication
 */
const requireAdminAuthForStatic = (req, res, next) => {
  // Skip auth for login page
  if (req.path === '/login.html' || req.path === '/admin-auth.js') {
    return next();
  }

  // Check for API key in session/cookie or require login
  const apiKey = req.headers['x-admin-api-key'] || req.query.admin_key;
  
  if (!apiKey || !isValidAdminKey(apiKey)) {
    // Redirect to login page
    return res.redirect('/admin/login.html');
  }

  next();
};

/**
 * Rate limiting for admin endpoints
 */
class AdminRateLimiter {
  constructor() {
    this.attempts = new Map(); // IP -> { count, resetTime }
    this.maxAttempts = 10;     // Max requests per window
    this.windowMs = 15 * 60 * 1000; // 15 minutes
  }

  isAllowed(ip) {
    const now = Date.now();
    const record = this.attempts.get(ip);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.attempts.set(ip, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (record.count >= this.maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  getRemainingTime(ip) {
    const record = this.attempts.get(ip);
    if (!record) return 0;
    return Math.max(0, record.resetTime - Date.now());
  }

  cleanup() {
    const now = Date.now();
    for (const [ip, record] of this.attempts.entries()) {
      if (now > record.resetTime) {
        this.attempts.delete(ip);
      }
    }
  }
}

const adminRateLimiter = new AdminRateLimiter();

// Cleanup rate limiter every 5 minutes
setInterval(() => {
  adminRateLimiter.cleanup();
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware for admin endpoints
 */
const adminRateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;

  if (!adminRateLimiter.isAllowed(ip)) {
    const remainingTime = Math.ceil(adminRateLimiter.getRemainingTime(ip) / 1000 / 60);
    
    console.warn(`[SECURITY] Rate limit exceeded for admin access from ${ip}`);
    
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: `Too many admin requests. Try again in ${remainingTime} minutes.`,
      retry_after_minutes: remainingTime,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict transport security (if using HTTPS)
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content security policy for admin dashboard
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
    "font-src 'self' https://cdnjs.cloudflare.com",
    "img-src 'self' data:",
    "connect-src 'self'"
  ].join('; '));

  next();
};

module.exports = {
  requireAdminAuth,
  requireAdminAuthForStatic,
  adminRateLimit,
  securityHeaders,
  generateAdminKey,
  isValidAdminKey
};