import dotenv from 'dotenv';
dotenv.config();
import http from "http";

console.log('🔧 Starting server...');
console.log('📋 Environment check:');
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'Not set');
console.log('  - PORT:', process.env.PORT || 4000);
console.log('  - MONGO_URL:', process.env.MONGO_URL ? 'Set' : 'Not set');
console.log('  - STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set');
console.log('  - SKIP_EMAIL:', process.env.SKIP_EMAIL || 'Not set');

import('./app.js').then((appModule) => {
    const app = appModule.default;
    console.log('✅ App module loaded successfully');

    const PORT = process.env.PORT || 4000;
    const server = http.createServer(app);

    server.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`📱 Frontend available at: http://localhost:${PORT}`);
        console.log(`🔗 API endpoints available at: http://localhost:${PORT}/api`);
    }).on('error', (err) => {
        console.error('❌ Server error:', err.message);
        if (err.code === 'EADDRINUSE') {
            console.log('💡 Port 4000 is already in use. Try a different port.');
        }
    });
}).catch((error) => {
    console.error('❌ Error loading app:', error.message);
    console.error('Stack trace:', error.stack);
});