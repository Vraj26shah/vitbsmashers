// Shared Authentication System for all pages
class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.userEmail = null;
        this.userData = null;
        this.init();
    }

    async init() {
        await this.checkAuthentication();
        this.updateUI();
    }

    // Check if user is authenticated and validate token
    async checkAuthentication() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.isAuthenticated = false;
                this.userEmail = null;
                this.userData = null;
                return false;
            }

            // Load user data from localStorage if available
            const storedUserData = localStorage.getItem('userProfile');
            if (storedUserData) {
                try {
                    this.userData = JSON.parse(storedUserData);
                    this.userEmail = this.userData.email;
                } catch (parseError) {
                    console.warn('Failed to parse stored user data:', parseError);
                }
            }

            // For development: assume authenticated if token exists
            // This allows the app to work even when backend is not available or CORS issues
            this.isAuthenticated = true;

            // Set placeholder data if not loaded from storage
            if (!this.userData) {
                // Try to extract name from token
                try {
                    const token = localStorage.getItem('token');
                    if (token) {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        if (payload.email) {
                            this.userEmail = payload.email;
                            // Extract name from email (e.g., john.doe@vitbhopal.ac.in -> John Doe)
                            const emailPrefix = payload.email.split('@')[0];
                            const nameParts = emailPrefix.split('.');
                            const fullName = nameParts.map(part =>
                                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
                            ).join(' ');
                            this.userData = {
                                username: fullName,
                                fullName: fullName,
                                email: payload.email
                            };
                        }
                    }
                } catch (error) {
                    console.warn('Failed to extract name from token:', error);
                    this.userEmail = 'user@example.com';
                    this.userData = { username: 'User', fullName: 'User', email: 'user@example.com' };
                }
            }

            // Try to validate with backend for better user experience and updated data
            try {
                const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? 'http://localhost:4000/api/v1/auth'
                    : 'https://vitbsmashers.onrender.com/api/v1/auth';

                const response = await fetch(`${API_BASE}/validate-token`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.valid && data.user) {
                        // Update with real user data if validation succeeds
                        this.userEmail = data.user.email;
                        this.userData = data.user;
                        // Update localStorage with latest data
                        localStorage.setItem('userProfile', JSON.stringify(data.user));
                    }
                }
                // If validation fails, we still keep the user authenticated with stored/placeholder data
            } catch (fetchError) {
                console.warn('Backend validation failed, using stored token-based authentication:', fetchError);
                // Keep authenticated with stored/placeholder data
            }

            return true;

        } catch (error) {
            console.error('Authentication check failed:', error);
            this.clearAuthData();
            return false;
        }
    }

    // Clear authentication data
    clearAuthData() {
        localStorage.removeItem('token');
        localStorage.removeItem('cart');
        localStorage.removeItem('userProfile');
        this.isAuthenticated = false;
        this.userEmail = null;
        this.userData = null;
    }

    // Update UI based on authentication status
    updateUI() {
        this.updateLogoutButton();
        this.updateUserProfile();
    }

    // Hide/show logout button based on authentication
    updateLogoutButton() {
        const logoutLinks = document.querySelectorAll('.logout-link, .sidebar-menu a[href="#"]');
        const accountSection = document.querySelector('.sidebar-title:last-child');

        logoutLinks.forEach(link => {
            if (link.textContent.includes('Logout') || link.classList.contains('logout-link')) {
                if (this.isAuthenticated) {
                    link.style.display = 'block';
                } else {
                    link.style.display = 'none';
                }
            }
        });

        // Hide entire Account section if not authenticated
        if (accountSection && !this.isAuthenticated) {
            const nextUl = accountSection.nextElementSibling;
            if (nextUl && nextUl.tagName === 'UL') {
                nextUl.style.display = 'none';
            }
            accountSection.style.display = 'none';
        }
    }

    // Update user profile display
    updateUserProfile() {
        const userProfiles = document.querySelectorAll('.user-profile');
        const userAvatars = document.querySelectorAll('.user-avatar');
        const userNames = document.querySelectorAll('.user-name');

        userProfiles.forEach(profile => {
            if (this.isAuthenticated && this.userData) {
                profile.style.display = 'flex';

                // Update avatar
                const avatar = profile.querySelector('.user-avatar');
                if (avatar) {
                    const avatarImg = avatar.querySelector('img');
                    if (avatarImg) {
                        avatarImg.style.display = 'none';
                    }
                    const avatarSpan = avatar.querySelector('span');
                    if (avatarSpan) {
                        avatarSpan.textContent = this.getInitials(this.userData.fullName || this.userData.username || 'User');
                        avatarSpan.style.display = 'block';
                    }
                }

                // Update name
                const nameElement = profile.querySelector('.user-name');
                if (nameElement) {
                    nameElement.textContent = this.userData.fullName || this.userData.username || 'Student';
                }
            } else {
                profile.style.display = 'none';
            }
        });
    }

    // Get user initials for avatar
    getInitials(name) {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    // Check if current page requires authentication
    pageRequiresAuth() {
        const currentPath = window.location.pathname;
        const protectedPages = [
            '/features/profile/profile.html',
            '/features/mycourses/mycourses.html'
        ];

        return protectedPages.some(page => currentPath.includes(page));
    }

    // Handle unauthorized access
    handleUnauthorizedAccess() {
        if (this.pageRequiresAuth()) {
            this.showLoginRequired();
        }
    }

    // Show login required message
    showLoginRequired() {
        document.body.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: linear-gradient(135deg, #0a1423 0%, #0f1a2a 100%);
                color: #ecf0f1;
                text-align: center;
                padding: 20px;
            ">
                <div style="
                    background: rgba(15, 26, 42, 0.85);
                    backdrop-filter: blur(10px);
                    border-radius: 20px;
                    padding: 40px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                    border: 2px solid #3498db;
                    max-width: 500px;
                    width: 100%;
                ">
                    <i class='bx bx-lock-alt' style="
                        font-size: 60px;
                        color: #3498db;
                        margin-bottom: 20px;
                    "></i>
                    <h1 style="
                        font-size: 28px;
                        margin-bottom: 15px;
                        color: #ecf0f1;
                    ">Access Restricted</h1>
                    <p style="
                        font-size: 16px;
                        margin-bottom: 30px;
                        color: #ddd;
                        line-height: 1.6;
                    ">
                        You need to log in to access this page. Please sign in to view your profile and courses.
                    </p>
                    <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                        <a href="../../index.html" style="
                            background: #3498db;
                            color: white;
                            padding: 12px 24px;
                            border-radius: 10px;
                            text-decoration: none;
                            font-weight: 600;
                            transition: all 0.3s ease;
                            display: inline-flex;
                            align-items: center;
                            gap: 8px;
                        " onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='#3498db'">
                            <i class='bx bx-log-in'></i> Login Now
                        </a>
                        <button onclick="window.history.back()" style="
                            background: transparent;
                            color: #3498db;
                            border: 2px solid #3498db;
                            padding: 12px 24px;
                            border-radius: 10px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            display: inline-flex;
                            align-items: center;
                            gap: 8px;
                        " onmouseover="this.style.background='#3498db'; this.style.color='white'" onmouseout="this.style.background='transparent'; this.style.color='#3498db'">
                            <i class='bx bx-arrow-back'></i> Go Back
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Logout function
    async logout() {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                await fetch('/api/v1/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout API error:', error);
        }

        this.clearAuthData();
        this.showNotification('Logged out successfully', 'success');

        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1000);
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#2ecc71' : type === 'warning' ? '#f39c12' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            font-weight: 500;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
}

// Add CSS for notification animations
const authStyle = document.createElement('style');
authStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(authStyle);

// Initialize authentication manager
const authManager = new AuthManager();

// Make it globally available
window.authManager = authManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Add logout event listeners
    document.querySelectorAll('.logout-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            authManager.logout();
        });
    });

    // Handle sidebar logout links
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        if (link.textContent.includes('Logout') || link.classList.contains('logout-link')) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                authManager.logout();
            });
        }
    });
});