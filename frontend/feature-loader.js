// Feature Loader - Listens for preloaded data and loads features instantly
class FeatureLoader {
    constructor() {
        this.authChannel = new BroadcastChannel('auth_channel');
        this.preloadChannel = new BroadcastChannel('feature_preload_channel');
        this.isReady = false;
        this.authData = null;
        this.preloadedData = null;
        
        this.setupListeners();
        this.checkExistingData();
    }

    setupListeners() {
        // Listen for auth broadcasts
        this.authChannel.onmessage = (event) => {
            if (event.data.type === 'AUTH_SUCCESS') {
                console.log('🔔 Received auth broadcast');
                this.authData = event.data.data;
                this.isReady = true;
                this.triggerFeatureLoad();
            }
        };

        // Listen for preload broadcasts
        this.preloadChannel.onmessage = (event) => {
            if (event.data.type === 'AUTH_READY') {
                console.log('🔔 Auth ready broadcast received');
                this.authData = {
                    user: event.data.user,
                    token: event.data.token
                };
            } else if (event.data.type === 'PRELOAD_COMPLETE') {
                console.log('🔔 Preload complete broadcast received');
                this.preloadedData = event.data.data;
                this.triggerFeatureLoad();
            }
        };
    }

    checkExistingData() {
        // Check if data already exists in sessionStorage
        const cached = sessionStorage.getItem('preloadedData');
        const timestamp = sessionStorage.getItem('preloadTimestamp');
        
        if (cached && timestamp) {
            const age = Date.now() - parseInt(timestamp);
            if (age < 5 * 60 * 1000) { // 5 minutes
                try {
                    this.preloadedData = JSON.parse(cached);
                    console.log('✅ Using cached preload data');
                    this.triggerFeatureLoad();
                } catch (e) {
                    console.warn('Failed to parse cached data');
                }
            }
        }

        // Check auth data
        const token = localStorage.getItem('token');
        const userProfile = localStorage.getItem('userProfile');
        if (token && userProfile) {
            try {
                this.authData = {
                    token: token,
                    user: JSON.parse(userProfile)
                };
                this.isReady = true;
            } catch (e) {
                console.warn('Failed to parse user profile');
            }
        }
    }

    triggerFeatureLoad() {
        // Dispatch custom event that features can listen to
        const event = new CustomEvent('featureDataReady', {
            detail: {
                auth: this.authData,
                preloaded: this.preloadedData,
                timestamp: Date.now()
            }
        });
        window.dispatchEvent(event);
        console.log('📢 Feature data ready event dispatched');
    }

    // Get data for specific feature
    getFeatureData(featureName) {
        if (this.preloadedData && this.preloadedData[featureName]) {
            return this.preloadedData[featureName];
        }
        
        // Fallback to sessionStorage
        const cached = sessionStorage.getItem('preloadedData');
        if (cached) {
            try {
                const data = JSON.parse(cached);
                return data[featureName] || null;
            } catch (e) {
                return null;
            }
        }
        
        return null;
    }

    // Check if feature data is available
    hasFeatureData(featureName) {
        return this.getFeatureData(featureName) !== null;
    }

    // Wait for feature data to be ready
    async waitForData(featureName, timeout = 5000) {
        // Check if already available
        if (this.hasFeatureData(featureName)) {
            return this.getFeatureData(featureName);
        }

        // Wait for data
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Timeout waiting for ${featureName} data`));
            }, timeout);

            const handler = (event) => {
                const data = this.getFeatureData(featureName);
                if (data) {
                    clearTimeout(timeoutId);
                    window.removeEventListener('featureDataReady', handler);
                    resolve(data);
                }
            };

            window.addEventListener('featureDataReady', handler);
        });
    }
}

// Initialize feature loader
window.featureLoader = new FeatureLoader();

// Helper function for features to use
window.loadFeatureData = async function(featureName) {
    try {
        // Try to get preloaded data first
        const preloaded = window.featureLoader.getFeatureData(featureName);
        if (preloaded) {
            console.log(`✅ Using preloaded data for ${featureName}`);
            return preloaded;
        }

        // If not available, wait for it (with timeout)
        console.log(`⏳ Waiting for ${featureName} data...`);
        const data = await window.featureLoader.waitForData(featureName, 3000);
        return data;
    } catch (error) {
        console.warn(`⚠️ Preloaded data not available for ${featureName}, will fetch normally`);
        return null;
    }
};

console.log('📡 Feature Loader initialized');
