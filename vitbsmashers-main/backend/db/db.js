import mongoose from "mongoose";

function Connect(){
    // Set mongoose options globally to avoid deprecated warnings
    mongoose.set('strictQuery', false);
    
    // Check if MONGO_URL is defined
    if (!process.env.MONGO_URL) {
        console.error("❌ MONGO_URL not found in environment variables");
        console.log("💡 Please create a .env file with MONGO_URL");
        return;
    }
    
    mongoose.connect(process.env.MONGO_URL, {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        retryWrites: true,
        w: 'majority'
    }).then(()=>{
        console.log("✅ Connected to MongoDB with optimized settings");

    }).catch(err =>{
        console.error("❌ MongoDB connection error:", err.message);
        
        // Provide helpful error messages
        if (err.message.includes('IP')) {
            console.log('💡 IP Whitelist Issue: Add your IP to MongoDB Atlas Network Access');
        } else if (err.message.includes('authentication')) {
            console.log('💡 Authentication Issue: Check your MongoDB credentials');
        } else if (err.message.includes('timeout')) {
            console.log('💡 Timeout Issue: Check your internet connection and MongoDB Atlas status');
        }
    })
}

export default Connect;