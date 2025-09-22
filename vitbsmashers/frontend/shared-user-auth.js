/**
 * User Authentication System
 * Restricts access to user-specific features (profile, my courses, etc.)
 * for unauthorized users
 */

class UserAuth {
    constructor() {
        this.isAuthenticated = false;
        this.userEmail = null;
        this.init();
    }

    async init() {
        try {
            // Check if user is logged in
            await this.checkUserAuth();

            // Add logged-in class if user is authenticated
            if (this.isAuthenticated) {
                document.body.classList.add('logged-in');
            }

            // Apply authentication restrictions
            this.applyAuthRestrictions();

        } catch (error) {
            console.error('User auth initialization error:', error);
            this.isAuthenticated = false;
            this.applyAuthRestrictions();
        }
    }

    async checkUserAuth() {
        try {
            // Check for token in localStorage
            const token = localStorage.getItem('token');
            if (!token) {
                this.isAuthenticated = false;
                this.userEmail = null;
                return;
            }

            // Try to validate token with backend
            const response = await fetch('/api/v1/auth/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                this.userEmail = userData?.user?.email || userData.email || null;
                this.isAuthenticated = true;
            } else {
                // Token invalid, remove it
                localStorage.removeItem('token');
                this.isAuthenticated = false;
                this.userEmail = null;
            }
        } catch (error) {
            console.error('Error checking user auth:', error);
            this.isAuthenticated = false;
            this.userEmail = null;
        }
    }

    applyAuthRestrictions() {
        // Hide/show elements based on authentication status
        this.hideUserElements();

        // Show access denied message if needed
        this.showAccessDeniedMessage();
    }

    hideUserElements() {
        // Hide logout buttons for non-authenticated users
        const logoutElements = document.querySelectorAll('.logout-link, [data-logout], .logout-btn');
        logoutElements.forEach(element => {
            if (element) {
                if (this.isAuthenticated) {
                    element.style.display = 'block';
                } else {
                    element.style.display = 'none';
                }
            }
        });

        // Hide user-specific menu items for non-authenticated users
        const userMenuItems = document.querySelectorAll('[data-requires-auth]');
        userMenuItems.forEach(item => {
            if (item) {
                if (this.isAuthenticated) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            }
        });
    }

    showAccessDeniedMessage() {
        // Only show overlay on dedicated user pages (profile, my courses, etc.)
        const userPages = ['profile', 'mycourses', 'my-courses'];
        const currentPath = window.location.pathname.toLowerCase();

        const isUserPage = userPages.some(page => currentPath.includes(page));

        if (!this.isAuthenticated && isUserPage) {
            // Remove existing access denied messages
            const existingMessages = document.querySelectorAll('.user-access-denied');
            existingMessages.forEach(msg => msg.remove());

            // Create access denied message
            const accessDeniedDiv = document.createElement('div');
            accessDeniedDiv.className = 'user-access-denied';
            accessDeniedDiv.innerHTML = `
                <div class="access-denied-content">
                    <div class="access-denied-icon">
                        <i class='bx bx-lock-alt'></i>
                    </div>
                    <h3>Authentication Required</h3>
                    <p>You need to log in to access this page. Please sign in to view your profile and courses.</p>
                    <div class="access-denied-actions">
                        <a href="../index.html" class="btn-primary">
                            <i class='bx bx-log-in'></i> Login Now
                        </a>
                        <button onclick="window.history.back()" class="btn-secondary">
                            <i class='bx bx-arrow-back'></i> Go Back
                        </button>
                    </div>
                </div>
            `;

            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .user-access-denied {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.9);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 20px;
                }

                .access-denied-content {
                    background: var(--glass-bg, rgba(15, 26, 42, 0.95));
                    backdrop-filter: blur(20px);
                    border-radius: 20px;
                    padding: 40px;
                    text-align: center;
                    max-width: 500px;
                    width: 100%;
                    border: 2px solid var(--accent-blue, #3498db);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                }

                .access-denied-icon {
                    font-size: 60px;
                    color: var(--accent-blue, #3498db);
                    margin-bottom: 20px;
                }

                .access-denied-content h3 {
                    font-size: 28px;
                    color: var(--light-color, #ecf0f1);
                    margin-bottom: 15px;
                    font-weight: 700;
                }

                .access-denied-content p {
                    color: #ddd;
                    margin-bottom: 30px;
                    line-height: 1.6;
                }

                .access-denied-actions {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    flex-wrap: wrap;
                }

                .access-denied-actions a, .access-denied-actions button {
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    text-decoration: none;
                }

                .btn-primary {
                    background: var(--accent-blue, #3498db);
                    color: white;
                    border: none;
                }

                .btn-primary:hover {
                    background: #2980b9;
                    transform: translateY(-2px);
                }

                .btn-secondary {
                    background: transparent;
                    color: var(--accent-blue, #3498db);
                    border: 2px solid var(--accent-blue, #3498db);
                }

                .btn-secondary:hover {
                    background: var(--accent-blue, #3498db);
                    color: white;
                    transform: translateY(-2px);
                }
            `;

            document.head.appendChild(style);

            // Insert the message
            document.body.appendChild(accessDeniedDiv);
        }
    }

    // Public method to check authentication status
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    // Public method to get current user email
    getCurrentUserEmail() {
        return this.userEmail;
    }

    // Method to refresh authentication status (useful after login/logout)
    async refreshAuthStatus() {
        await this.init();
    }
}

// Initialize user authentication
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        window.userAuth = new UserAuth();
    });
} else {
    window.userAuth = new UserAuth();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserAuth;
}