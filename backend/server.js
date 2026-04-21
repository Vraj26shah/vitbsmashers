import dotenv from 'dotenv';
dotenv.config();
import http from "http";

import('./app.js').then((appModule) => {
    const app = appModule.default;

    const PORT = process.env.PORT || 4000;
    const server = http.createServer(app);

    server.listen(PORT).on('error', (err) => {
        console.error('❌ Server error:', err.message);
    });
}).catch((error) => {
    console.error('❌ Error loading app:', error.message);
    console.error('Stack trace:', error.stack);
});
