import dotenv from 'dotenv';
dotenv.config();
import http from "http";

import('./app.js').then((appModule) => {
    const app = appModule.default;

    const PORT = process.env.PORT || 4000;
    const server = http.createServer(app);

    server.listen(PORT, '0.0.0.0', () => {
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ Server is running successfully!');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log(`🌐 Server URL: http://localhost:${PORT}`);
        console.log(`📝 API Base: http://localhost:${PORT}/api/v1`);
        console.log(`💳 Payment: ${process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') ? 'TEST MODE' : 'LIVE MODE'}`);
        console.log('');
        console.log('Press Ctrl+C to stop the server');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
    }).on('error', (err) => {
        console.error('');
        console.error('═══════════════════════════════════════════════════════');
        console.error('❌ Server Error!');
        console.error('═══════════════════════════════════════════════════════');
        console.error('');
        
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use!`);
            console.error('');
            console.error('Solutions:');
            console.error(`1. Kill the process using port ${PORT}:`);
            console.error(`   lsof -ti:${PORT} | xargs kill -9`);
            console.error('');
            console.error('2. Or use a different port:');
            console.error('   PORT=5000 npm run dev');
            console.error('');
        } else {
            console.error('Error:', err.message);
            console.error('');
        }
        
        console.error('═══════════════════════════════════════════════════════');
        console.error('');
        process.exit(1);
    });
}).catch((error) => {
    console.error('');
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ Failed to start server!');
    console.error('═══════════════════════════════════════════════════════');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    console.error('');
    console.error('═══════════════════════════════════════════════════════');
    console.error('');
    process.exit(1);
});
