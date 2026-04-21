// Shared Authentication System for all pages
class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.userEmail = null;
        this.userData = null;
        this.initPromise = this.init();
    }

    async init() {
        await this.checkAuthentication();
        await this.hydrateProfileCompletion();

        if (this.isAuthenticated && this.pageRequiresCompleteProfile() && !this.isProfileComplete(this.userData)) {
            this.showCompleteProfileRequired();
            return;
        }
        
        // Normalize display name immediately after authentication check
        if (this.userData) {
            this.normalizeDisplayName(this.userData);
        }
        
        this.updateUI();
    }

    // Check if user is authenticated and validate token
    async checkAuthentication() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token');
            const googleSuccess = urlParams.get('google_success');

            if (urlToken && googleSuccess) {
                // Legacy path: token was in URL (old flow)
                localStorage.setItem('token', urlToken);
                const newUrl = window.location.pathname + (urlParams.get('sidebar') ? '?sidebar=active' : '');
                window.history.replaceState({}, document.title, newUrl);
            } else if (googleSuccess) {
                // New path: token is in httpOnly cookie, just clean the URL
                const newUrl = window.location.pathname + (urlParams.get('sidebar') ? '?sidebar=active' : '');
                window.history.replaceState({}, document.title, newUrl);
            }

            const token = localStorage.getItem('token');
            this.syncUserScopedCache(token);

            // Load cached user data
            const storedUserData = localStorage.getItem('userProfile');
            if (storedUserData) {
                try {
                    this.userData = JSON.parse(storedUserData);
                    this.userEmail = this.userData.email;
                    
                    // Normalize display name to ensure consistency
                    this.normalizeDisplayName(this.userData);
                    localStorage.setItem('userProfile', JSON.stringify(this.userData));
                } catch (parseError) {
                    console.warn('Failed to parse stored user data:', parseError);
                }
            }

            // Validate with backend — send cookie automatically via credentials:include
            try {
                const API_BASE = window.config ? window.config.AUTH_BASE : '/api/v1/auth';
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                let response = await fetch(`${API_BASE}/validate-token`, {
                    method: 'GET',
                    headers,
                    credentials: 'include'
                });

                // If 401 and we have a refresh token, attempt one refresh then retry
                if (response.status === 401) {
                    const refreshed = await this._tryRefreshToken(API_BASE);
                    if (refreshed) {
                        const newToken = localStorage.getItem('token');
                        const retryHeaders = { 'Content-Type': 'application/json' };
                        if (newToken) retryHeaders['Authorization'] = `Bearer ${newToken}`;
                        response = await fetch(`${API_BASE}/validate-token`, {
                            method: 'GET',
                            headers: retryHeaders,
                            credentials: 'include'
                        });
                    }
                }

                // If bearer token path still fails, try cookie-only validation.
                // This prevents false "Login Required" screens when local token is stale
                // but httpOnly session cookie is valid.
                if (response.status === 401) {
                    response = await fetch(`${API_BASE}/validate-token`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include'
                    });
                }

                if (response.ok) {
                    const data = await response.json();
                    if (data.valid && data.user) {
                        this.isAuthenticated = true;
                        this.userEmail = data.user.email;
                        this.userData = data.user;
                        
                        // Normalize display name to ensure consistency
                        this.normalizeDisplayName(this.userData);
                        
                        localStorage.setItem('userProfile', JSON.stringify(this.userData));
                        this.syncProfileDataForUser(this.userData);
                        
                        // Broadcast auth and trigger preload
                        if (window.preloadManager) {
                            const token = localStorage.getItem('token');
                            window.preloadManager.broadcastAuth({
                                user: this.userData,
                                token: token,
                                email: this.userData.email
                            });
                            window.preloadManager.preloadAllFeatures(token, this.userData);
                        }
                        
                        return true;
                    }
                }
            } catch (fetchError) {
                console.warn('Backend validation failed:', fetchError);
            }

            // Localhost-only fallback using JWT payload
            if (token && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                console.warn('⚠️ Using token payload fallback (localhost only)');
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.email) {
                        this.isAuthenticated = true;
                        this.userEmail = payload.email;
                        const emailPrefix = payload.email.split('@')[0];
                        const nameParts = emailPrefix.split('.');
                        const fullName = nameParts.map(part =>
                            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
                        ).join(' ');
                        this.userData = { username: fullName, fullName, email: payload.email };
                        return true;
                    }
                } catch (error) {
                    console.warn('Failed to extract data from token:', error);
                }
            }

            this.clearAuthData();
            return false;

        } catch (error) {
            console.error('Authentication check failed:', error);
            this.clearAuthData();
            return false;
        }
    }

    getTokenPayload(token) {
        try {
            if (!token) return null;
            const parts = token.split('.');
            if (parts.length < 2) return null;
            return JSON.parse(atob(parts[1]));
        } catch {
            return null;
        }
    }

    syncUserScopedCache(token) {
        const payload = this.getTokenPayload(token);
        if (!payload) return;

        const tokenUserId = payload.sub || null;
        const tokenEmail = payload.email || null;

        try {
            const raw = localStorage.getItem('userProfile');
            if (raw) {
                const cached = JSON.parse(raw);
                const sameId = tokenUserId && cached?.id ? cached.id === tokenUserId : true;
                const sameEmail = tokenEmail && cached?.email ? cached.email === tokenEmail : true;
                if (!sameId || !sameEmail) {
                    localStorage.removeItem('userProfile');
                    localStorage.removeItem('profileData');
                    localStorage.removeItem('profileCompleted');
                }
            }
        } catch {
            localStorage.removeItem('userProfile');
            localStorage.removeItem('profileData');
            localStorage.removeItem('profileCompleted');
        }
    }

    syncProfileDataForUser(user) {
        if (!user) return;
        try {
            const rawProfileData = localStorage.getItem('profileData');
            if (!rawProfileData) return;
            const cached = JSON.parse(rawProfileData);
            const cachedEmail = cached?.email || null;
            const cachedReg = cached?.regNumber || cached?.registrationNumber || cached?.registration_number || null;
            const userEmail = user?.email || null;
            const userReg = user?.registration_number || user?.registrationNumber || user?.regNumber || null;
            const emailMismatch = userEmail && cachedEmail && userEmail !== cachedEmail;
            const regMismatch = userReg && cachedReg && userReg !== cachedReg;
            if (emailMismatch || regMismatch) {
                localStorage.removeItem('profileData');
                localStorage.removeItem('profileCompleted');
            }
        } catch {
            localStorage.removeItem('profileData');
            localStorage.removeItem('profileCompleted');
        }
    }

    // Attempt to refresh the access token using the stored refresh token
    async _tryRefreshToken(apiBase) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return false;
        try {
            const res = await fetch(`${apiBase}/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
            if (!res.ok) return false;
            const data = await res.json();
            if (data.status === 'success' && data.token) {
                localStorage.setItem('token', data.token);
                if (data.refresh) localStorage.setItem('refreshToken', data.refresh);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    // Clear authentication data
    clearAuthData() {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('cart');
        localStorage.removeItem('userProfile');
        localStorage.removeItem('profileData');
        localStorage.removeItem('profileCompleted');
        this.isAuthenticated = false;
        this.userEmail = null;
        this.userData = null;
    }

    isProfileComplete(userData) {
        const hasValue = (value) => typeof value === 'string' ? value.trim().length > 0 : !!value;
        const candidate = userData || this.userData || {};

        if (candidate.profile_completed === true || candidate.profileComplete === true || candidate.profileCompleted === true) {
            return true;
        }

        // Fallback to cached profile state to avoid false negatives from partial auth payloads
        try {
            const profileCompletedFlag = localStorage.getItem('profileCompleted') === 'true';
            const rawProfileData = localStorage.getItem('profileData');
            if (profileCompletedFlag) return true;
            if (rawProfileData) {
                const cached = JSON.parse(rawProfileData);
                if (cached.profileCompleted === true || cached.profile_complete === true) return true;
                if (
                    hasValue(cached.phone) &&
                    hasValue(cached.registration_number || cached.registrationNumber || cached.regNumber) &&
                    hasValue(cached.branch || cached.program)
                ) return true;
            }
        } catch (_) {}

        return hasValue(candidate.phone) &&
               hasValue(candidate.registration_number || candidate.registrationNumber || candidate.regNumber) &&
               hasValue(candidate.branch || candidate.program);
    }

    async hydrateProfileCompletion() {
        if (!this.isAuthenticated) return;
        try {
            const API_BASE = window.config ? window.config.API_BASE : '/api/v1';
            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/profile/me`, {
                method: 'GET',
                headers,
                credentials: 'include'
            });

            if (!response.ok) return;
            const data = await response.json();
            const profile = data?.data?.user || data?.user || null;
            if (!profile) return;

            this.userData = { ...(this.userData || {}), ...profile };
            localStorage.setItem('userProfile', JSON.stringify(this.userData));

            const hasValue = (value) => typeof value === 'string' ? value.trim().length > 0 : !!value;
            const completed =
                profile.profile_completed === true ||
                profile.profileComplete === true ||
                profile.profileCompleted === true ||
                (
                    hasValue(profile.phone) &&
                    hasValue(profile.registration_number || profile.registrationNumber || profile.regNumber) &&
                    hasValue(profile.branch || profile.program)
                );

            localStorage.setItem('profileCompleted', String(completed));
            const existingProfileData = JSON.parse(localStorage.getItem('profileData') || '{}');
            localStorage.setItem('profileData', JSON.stringify({
                ...existingProfileData,
                ...profile,
                regNumber: profile.registration_number || profile.registrationNumber || profile.regNumber || existingProfileData.regNumber,
                registrationNumber: profile.registration_number || profile.registrationNumber || profile.regNumber || existingProfileData.registrationNumber,
                program: profile.branch || profile.program || existingProfileData.program,
                branch: profile.branch || profile.program || existingProfileData.branch,
                profileCompleted: completed,
                lastUpdated: new Date().toISOString()
            }));
        } catch (_) {}
    }

    pageRequiresCompleteProfile() {
        const currentPath = window.location.pathname;
        return currentPath.includes('/features/profile/profile.html');
    }

    showCompleteProfileRequired() {
        const returnTo = window.location.pathname + window.location.search;
        const isProfilePage = returnTo.includes('/features/profile/profile.html');
        const completeProfileHref = isProfilePage
            ? '/features/profile/complete-profile.html?source=profile'
            : '/features/profile/complete-profile.html';
        try {
            localStorage.setItem('profileCompletionReturnTo', returnTo);
        } catch (_) {}

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
                    max-width: 560px;
                    width: 100%;
                ">
                    <i class='bx bx-user-check' style="
                        font-size: 60px;
                        color: #3498db;
                        margin-bottom: 20px;
                    "></i>
                    <h1 style="
                        font-size: 28px;
                        margin-bottom: 15px;
                        color: #ecf0f1;
                    ">Complete Your Profile</h1>
                    <p style="
                        font-size: 16px;
                        margin-bottom: 30px;
                        color: #ddd;
                        line-height: 1.6;
                    ">
                        Please complete your profile before accessing this section.
                    </p>
                    <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                        <a href="${completeProfileHref}" style="
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
                            <i class='bx bx-edit'></i> Complete Profile
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

    // Update UI based on authentication status
    updateUI() {
        this.updateAccountSection();
        this.updateUserProfile();
    }

    // Hide/show Account section based on authentication
    updateAccountSection() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const titles = sidebar.querySelectorAll('.sidebar-title');
        
        titles.forEach(title => {
            if (title.textContent.trim().toLowerCase().includes('account')) {
                const nextUl = title.nextElementSibling;
                
                if (this.isAuthenticated) {
                    // Show Account section for authorized users
                    if (nextUl && nextUl.tagName === 'UL') {
                        nextUl.style.display = 'block';
                    }
                    title.style.display = 'block';
                } else {
                    // Hide Account section for unauthorized users
                    if (nextUl && nextUl.tagName === 'UL') {
                        nextUl.style.display = 'none';
                    }
                    title.style.display = 'none';
                }
            }
        });
    }

    // Update user profile display - simple: show if name exists, hide if not
    updateUserProfile() {
        const userProfiles = document.querySelectorAll('.user-profile');

        userProfiles.forEach(profile => {
            const displayName = this.isAuthenticated && this.userData ? this.getDisplayName(this.userData) : null;
            
            if (displayName) {
                // Has name - show profile
                profile.style.display = 'flex';

                // Update avatar
                const avatarSpan = profile.querySelector('.user-avatar span');
                if (avatarSpan) {
                    avatarSpan.textContent = this.getInitials(displayName);
                }

                // Update name
                const nameElement = profile.querySelector('.user-name');
                if (nameElement) {
                    nameElement.textContent = displayName;
                }
            } else {
                // No name - hide profile
                profile.style.display = 'none';
            }
        });
    }

    // Get display name - ALWAYS use stored displayName, never recalculate
    getDisplayName(userData) {
        if (!userData) return null;

        // Return stored displayName - DO NOT recalculate
        return userData.displayName !== undefined ? userData.displayName : null;
    }

    // Normalize display name - store it ONCE and NEVER change it
    normalizeDisplayName(userData) {
        // If displayName already exists, DO NOT change it
        if (userData.displayName !== undefined) {
            return;
        }

        // Get name ONCE and store it permanently
        const name = userData.full_name || 
                     userData.fullName || 
                     userData.name || 
                     (userData.username && !userData.username.includes('@') ? userData.username : null);
        
        // Store it permanently - this will NEVER change
        userData.displayName = name;
        localStorage.setItem('userProfile', JSON.stringify(userData));
    }

    // Get user initials for avatar
    getInitials(name) {
        if (!name) return '?';
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
                        <a href="/index.html" style="
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
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            await fetch('/api/v1/auth/logout', {
                method: 'POST',
                headers,
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout API error:', error);
        }

        this.clearAuthData();
        this.showNotification('Logged out successfully', 'success');

        setTimeout(() => {
            window.location.href = '/index.html';
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
document.addEventListener('DOMContentLoaded', function () {
    const logoutLinks = new Set([
        ...document.querySelectorAll('.logout-link'),
        ...Array.from(document.querySelectorAll('.sidebar-menu a')).filter(link =>
            (link.textContent || '').includes('Logout') || link.classList.contains('logout-link')
        )
    ]);

    logoutLinks.forEach(link => {
        if (link.dataset.logoutBound === 'true') return;
        link.dataset.logoutBound = 'true';

        link.addEventListener('click', function (e) {
            e.preventDefault();
            if (window.__logoutInProgress) return;
            window.__logoutInProgress = true;
            Promise.resolve(authManager.logout()).finally(() => {
                setTimeout(() => { window.__logoutInProgress = false; }, 1200);
            });
        });
    });
});
