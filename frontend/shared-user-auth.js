/**
 * User Authentication System
 * Defers to authManager (shared-auth.js) as the single source of truth.
 */

class UserAuth {
    constructor() {
        this.isAuthenticated = false;
        this.userEmail = null;
        this.initPromise = this.init();
    }

    async init() {
        try {
            // Wait for the main authManager (shared-auth.js) to finish its async init
            await this._waitForAuthManager();

            this.isAuthenticated = window.authManager.isAuthenticated;
            this.userEmail = window.authManager.userEmail;

            if (this.isAuthenticated) {
                document.body.classList.add('logged-in');
            }

            this.applyAuthRestrictions();
        } catch (error) {
            console.error('User auth initialization error:', error);
            this.isAuthenticated = false;
            this.applyAuthRestrictions();
        }
    }

    // Wait for window.authManager and its initPromise to resolve
    _waitForAuthManager() {
        return new Promise(resolve => {
            const check = async () => {
                if (window.authManager && window.authManager.initPromise) {
                    await window.authManager.initPromise;
                    resolve();
                } else {
                    setTimeout(check, 50);
                }
            };
            check();
        });
    }

    applyAuthRestrictions() {
        this.hideUserElements();
        this.showAccessDeniedMessage();
    }

    hideUserElements() {
        const logoutElements = document.querySelectorAll('.logout-link, [data-logout], .logout-btn');
        logoutElements.forEach(el => {
            if (el) el.style.display = this.isAuthenticated ? 'block' : 'none';
        });

        const userMenuItems = document.querySelectorAll('[data-requires-auth]');
        userMenuItems.forEach(item => {
            if (item) item.style.display = this.isAuthenticated ? 'block' : 'none';
        });
    }

    showAccessDeniedMessage() {
        const userPages = ['profile', 'mycourses', 'my-courses'];
        const currentPath = window.location.pathname.toLowerCase();
        const isUserPage = userPages.some(page => currentPath.includes(page));

        if (!this.isAuthenticated && isUserPage) {
            const existing = document.querySelectorAll('.user-access-denied');
            existing.forEach(el => el.remove());

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
                        <a href="/index.html" class="btn-primary">
                            <i class='bx bx-log-in'></i> Login Now
                        </a>
                        <button onclick="window.history.back()" class="btn-secondary">
                            <i class='bx bx-arrow-back'></i> Go Back
                        </button>
                    </div>
                </div>
            `;

            const style = document.createElement('style');
            style.textContent = `
                .user-access-denied {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.9); backdrop-filter: blur(10px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 10000; padding: 20px;
                }
                .access-denied-content {
                    background: rgba(15,26,42,0.95); backdrop-filter: blur(20px);
                    border-radius: 20px; padding: 40px; text-align: center;
                    max-width: 500px; width: 100%;
                    border: 2px solid #3498db; box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                }
                .access-denied-icon { font-size: 60px; color: #3498db; margin-bottom: 20px; }
                .access-denied-content h3 { font-size: 28px; color: #ecf0f1; margin-bottom: 15px; font-weight: 700; }
                .access-denied-content p { color: #ddd; margin-bottom: 30px; line-height: 1.6; }
                .access-denied-actions { display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; }
                .access-denied-actions a, .access-denied-actions button {
                    padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer;
                    transition: all 0.3s ease; display: flex; align-items: center; gap: 8px;
                    font-size: 14px; text-decoration: none;
                }
                .btn-primary { background: #3498db; color: white; border: none; }
                .btn-primary:hover { background: #2980b9; transform: translateY(-2px); }
                .btn-secondary { background: transparent; color: #3498db; border: 2px solid #3498db; }
                .btn-secondary:hover { background: #3498db; color: white; transform: translateY(-2px); }
            `;
            document.head.appendChild(style);
            document.body.appendChild(accessDeniedDiv);
        }
    }

    isUserAuthenticated() { return this.isAuthenticated; }
    getCurrentUserEmail() { return this.userEmail; }
    async refreshAuthStatus() { await this.init(); }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { window.userAuth = new UserAuth(); });
} else {
    window.userAuth = new UserAuth();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserAuth;
}
