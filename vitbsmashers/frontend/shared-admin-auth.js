/**
 * Admin Authentication System
 * Restricts admin panel access to authorized email: vitbsmashers@gmail.com
 */

// Add CSS to hide admin elements by default
if (document.head) {
  const style = document.createElement('style');
  document.head.appendChild(style);
  style.textContent = `
    #adminTab, [data-tab="admin"], #admin-tab, .admin-panel, .admin-panel-demo {
      display: none !important;
    }
    [data-tab="register"], [data-tab="update"] {
      display: none !important;
    }
    .admin-only {
      display: flex !important;
    }
    .admin-only#admin-tab {
      display: block !important;
    }
    .admin-only.admin-panel {
      display: block !important;
    }
    .admin-only.admin-panel-demo {
      display: block !important;
    }
    .logged-in [data-tab="register"], .logged-in [data-tab="update"] {
      display: flex !important;
    }
  `;
}

class AdminAuth {
    constructor() {
        this.adminEmail = 'vitbsmashers@gmail.com';
        this.isAdmin = false;
        this.userEmail = null;
        this.init();
    }

    async init() {
        try {
            // Check if user is logged in and get their email
            await this.checkUserAuth();

            // Check if current user is admin
            this.isAdmin = this.checkAdminStatus();

            // Add logged-in class if user is authenticated
            if (this.userEmail) {
                document.body.classList.add('logged-in');
            }

            // Update user profile display
            this.updateUserProfile();

            // Apply admin restrictions
            this.applyAdminRestrictions();

        } catch (error) {
            console.error('Admin auth initialization error:', error);
            this.isAdmin = false;
            this.applyAdminRestrictions();
        }
    }

    async checkUserAuth() {
        try {
            // Try to get user profile from backend
            const token = localStorage.getItem('token');
            if (!token) {
                this.userEmail = null;
                return;
            }

            // First try to get admin status
            const adminResponse = await fetch('/api/v1/auth/admin-status', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (adminResponse.ok) {
                const adminData = await adminResponse.json();
                this.userEmail = adminData.email;
                this.isAdmin = adminData.isAdmin;
                return;
            }

            // Fallback to profile endpoint (backend mounts at /api/v1/auth)
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
            } else {
                this.userEmail = null;
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            this.userEmail = null;
        }
    }

    checkAdminStatus() {
        return this.userEmail === this.adminEmail;
    }

    applyAdminRestrictions() {
        // Hide admin tabs and sections for non-admin users
        this.hideAdminElements();
        
        // Show admin access denied message if needed
        this.showAccessDeniedMessage();
        
        // Add admin indicators for admin users
        if (this.isAdmin) {
            this.showAdminIndicators();
        }
    }

    hideAdminElements() {
        // Common admin elements to show/hide
        const adminElements = [
            '#adminTab',
            '.admin-tab',
            '[data-tab="admin"]',
            '#admin-tab',
            '.admin-panel',
            '.admin-panel-demo',
            '.admin-section'
        ];

        adminElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element) {
                    if (this.isAdmin) {
                        // Add admin-only class to show for admin users
                        element.classList.add('admin-only');
                    } else {
                        // Remove admin-only class for non-admin users (CSS hides by default)
                        element.classList.remove('admin-only');
                    }
                }
            });
        });

        // Handle admin buttons
        const adminButtons = document.querySelectorAll('button[data-tab="admin"], #adminTab');
        adminButtons.forEach(button => {
            if (button) {
                if (this.isAdmin) {
                    button.classList.add('admin-only');
                } else {
                    button.classList.remove('admin-only');
                }
            }
        });
    }

    showAccessDeniedMessage() {
        // Only show overlay on dedicated admin pages (URLs containing 'admin')
        if (!this.isAdmin && window.location.pathname.includes('/admin')) {
            // Remove existing access denied messages
            const existingMessages = document.querySelectorAll('.admin-access-denied');
            existingMessages.forEach(msg => msg.remove());
    
            // Create access denied message
            const accessDeniedDiv = document.createElement('div');
            accessDeniedDiv.className = 'admin-access-denied';
            accessDeniedDiv.innerHTML = `
                <div class="access-denied-content">
                    <div class="access-denied-icon">
                        <i class='bx bxs-shield-x'></i>
                    </div>
                    <h3>Admin Access Required</h3>
                    <p>This section is restricted to authorized administrators only.</p>
                    <p>If you believe you should have access, please contact the system administrator.</p>
                    <div class="access-denied-actions">
                        <button onclick="window.location.href='../profile/profile.html'" class="btn-primary">
                            <i class='bx bxs-user'></i> Go to Profile
                        </button>
                        <button onclick="window.history.back()" class="btn-secondary">
                            <i class='bx bx-arrow-back'></i> Go Back
                        </button>
                    </div>
                </div>
            `;
    
            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .admin-access-denied {
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
                    border: 2px solid var(--danger-color, #e74c3c);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                }
                
                .access-denied-icon {
                    font-size: 80px;
                    color: var(--danger-color, #e74c3c);
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
                    margin-bottom: 10px;
                    line-height: 1.6;
                }
                
                .access-denied-actions {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    margin-top: 30px;
                    flex-wrap: wrap;
                }
                
                .access-denied-actions button {
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                }
                
                .btn-primary {
                    background: var(--accent-blue, #3498db);
                    color: white;
                    border: none;
                }
                
                .btn-primary:hover {
                    background: var(--primary-blue, #1e3a5f);
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
                
                .admin-only {
                    border-left: 3px solid var(--accent-teal, #2ecc71) !important;
                    background: rgba(46, 204, 113, 0.1) !important;
                }
                
                .admin-only::before {
                    content: "🔒 ADMIN";
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    background: var(--accent-teal, #2ecc71);
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 600;
                }
            `;
            
            document.head.appendChild(style);
            
            // Insert the message
            document.body.appendChild(accessDeniedDiv);
        }
    }

    showAdminIndicators() {
        // Add admin badge to header
        const header = document.querySelector('.header');
        if (header && !document.querySelector('.admin-badge')) {
            const adminBadge = document.createElement('div');
            adminBadge.className = 'admin-badge';
            adminBadge.innerHTML = `
                <i class='bx bxs-shield'></i>
                <span>Admin Mode</span>
            `;
            
            const badgeStyle = document.createElement('style');
            badgeStyle.textContent = `
                .admin-badge {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: var(--accent-teal, #2ecc71);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    z-index: 1000;
                    box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            `;
            
            document.head.appendChild(badgeStyle);
            document.body.appendChild(adminBadge);
        }
    }

    // Public method to check admin status
    isUserAdmin() {
        return this.isAdmin;
    }

    // Public method to get current user email
    getCurrentUserEmail() {
        return this.userEmail;
    }

    // Update user profile display in header
    updateUserProfile() {
        try {
            const userNameElement = document.querySelector('.user-name');
            if (userNameElement) {
                let displayName = 'Student'; // Default for unauthorized users

                if (this.userEmail) {
                    // For authorized users, extract name from email or use stored data
                    const storedUserData = localStorage.getItem('userProfile');
                    if (storedUserData) {
                        try {
                            const userData = JSON.parse(storedUserData);
                            displayName = userData.fullName || userData.username || 'Student';
                        } catch (error) {
                            console.warn('Failed to parse stored user data:', error);
                        }
                    }

                    // If still 'Student', try to extract from email
                    if (displayName === 'Student') {
                        const emailPrefix = this.userEmail.split('@')[0];
                        const nameParts = emailPrefix.split('.');
                        displayName = nameParts.map(part =>
                            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
                        ).join(' ');
                    }
                }

                userNameElement.textContent = displayName;
            }

            // Update user avatar initial
            const userAvatar = document.querySelector('.user-avatar span');
            if (userAvatar && this.userEmail) {
                const emailPrefix = this.userEmail.split('@')[0];
                const nameParts = emailPrefix.split('.');
                const initial = nameParts[0].charAt(0).toUpperCase();
                userAvatar.textContent = initial;
            }

        } catch (error) {
            console.error('Error updating user profile:', error);
        }
    }

    // Method to refresh admin status (useful after login/logout)
    async refreshAdminStatus() {
        await this.init();
    }
}

// Initialize admin authentication
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        window.adminAuth = new AdminAuth();
    });
} else {
    window.adminAuth = new AdminAuth();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminAuth;
}
