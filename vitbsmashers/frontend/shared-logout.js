// Shared logout functionality for all pages
async function handleLogout() {
    try {
        const token = localStorage.getItem('token');
        if (token) {
            // Call logout API endpoint
            const response = await fetch('/api/v1/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // If unauthorized, redirect to index
            if (response.status === 401) {
                showNotification('Please log in to continue', 'warning');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 1000);
                return;
            }
        } else {
            // No token found, redirect to index
            showNotification('Please log in to continue', 'warning');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1000);
            return;
        }
    } catch (error) {
        console.error('Logout API error:', error);
        // Continue with logout even if API call fails
    }

    // Clear all user data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('cart');
    localStorage.removeItem('userProfile');

    // Show logout message
    showNotification('Logged out successfully', 'success');

    // Redirect to index page after a short delay
    setTimeout(() => {
        window.location.href = '/index.html';
    }, 1000);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#2ecc71' : type === 'warning' ? '#f39c12' : '#3498db'};
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

// Add CSS for notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize logout functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Use MutationObserver to wait for sidebar to be loaded
    const observer = new MutationObserver(() => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            observer.disconnect();
            // Check login status and hide/show Account section
            const token = localStorage.getItem('token');
            if (!token) {
                const titles = sidebar.querySelectorAll('.sidebar-title');
                if (titles.length > 0) {
                    const accountTitle = titles[titles.length - 1];
                    const nextUl = accountTitle.nextElementSibling;
                    if (nextUl && nextUl.tagName === 'UL') {
                        nextUl.remove();
                    }
                    accountTitle.remove();
                }
            }
            // If logged in, Account section remains visible
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Add event listeners to all logout links
    document.querySelectorAll('.logout-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    });

    // Also handle sidebar menu clicks for logout
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        if (link.classList.contains('logout-link') || link.textContent.includes('Logout')) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                handleLogout();
            });
        }
    });
});