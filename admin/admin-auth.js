/**
 * Admin Authentication Handler
 * Manages secure authentication for the Portal Finder admin dashboard
 */

class AdminAuth {
    constructor() {
        this.apiKey = null;
        this.isAuthenticated = false;
        this.init();
    }

    init() {
        // Authentication disabled - always set as authenticated
        this.apiKey = 'disabled';
        this.isAuthenticated = true;
        
        // Set up form handler if on login page (redirect to dashboard)
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // If on login page, redirect to dashboard
        if (window.location.pathname.includes('login.html')) {
            window.location.href = '/admin/';
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const apiKeyInput = document.getElementById('apiKey');
        const loginBtn = document.getElementById('loginBtn');
        const loginText = document.getElementById('loginText');
        const errorMessage = document.getElementById('errorMessage');
        
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            this.showError('Please enter your admin API key');
            return;
        }

        // Show loading state
        loginBtn.disabled = true;
        loginText.innerHTML = '<div class="loading-spinner"></div>Authenticating...';
        errorMessage.style.display = 'none';

        try {
            const response = await fetch('/api/admin/authenticate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ api_key: apiKey })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Authentication successful
                this.apiKey = apiKey;
                this.isAuthenticated = true;
                
                // Redirect to dashboard with API key
                window.location.href = `/admin/?admin_key=${encodeURIComponent(apiKey)}`;
            } else {
                // Authentication failed
                this.showError(result.message || 'Invalid API key');
            }

        } catch (error) {
            console.error('Authentication error:', error);
            this.showError('Authentication failed. Please check your connection and try again.');
        } finally {
            // Reset button state
            loginBtn.disabled = false;
            loginText.textContent = 'Access Dashboard';
        }
    }

    async verifyApiKey(apiKey) {
        try {
            const response = await fetch('/api/admin/authenticate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ api_key: apiKey })
            });

            if (response.ok) {
                this.apiKey = apiKey;
                this.isAuthenticated = true;
                return true;
            } else {
                this.redirectToLogin();
                return false;
            }
        } catch (error) {
            console.error('API key verification failed:', error);
            this.redirectToLogin();
            return false;
        }
    }

    checkAuthenticationStatus() {
        // Authentication disabled - always authenticated
        this.apiKey = 'disabled';
        this.isAuthenticated = true;
        return true;
    }

    redirectToLogin() {
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = '/admin/login.html';
        }
    }

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        } else {
            alert('Error: ' + message);
        }
    }

    // Get API key for requests
    getApiKey() {
        return this.apiKey;
    }

    // Check if user is authenticated
    isUserAuthenticated() {
        return this.isAuthenticated && this.apiKey;
    }

    // Logout functionality
    logout() {
        this.apiKey = null;
        this.isAuthenticated = false;
        this.redirectToLogin();
    }

    // Get authenticated headers for API requests (authentication disabled)
    getAuthHeaders() {
        return {
            'Content-Type': 'application/json'
        };
    }

    // Make authenticated fetch request (authentication disabled)
    async authenticatedFetch(url, options = {}) {
        const defaultOptions = {
            headers: this.getAuthHeaders()
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(url, mergedOptions);
            
            if (response.status === 429) {
                // Rate limited
                const error = await response.json().catch(() => ({ message: 'Rate limited' }));
                throw new Error(`Rate limited: ${error.message}`);
            }

            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }
}

// Global admin auth instance
window.adminAuth = new AdminAuth();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminAuth;
}