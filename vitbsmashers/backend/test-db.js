import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function testDB() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Connected to MongoDB');

        const Faculty = (await import('./models/faculty.model.js')).default;
        const count = await Faculty.countDocuments();
        console.log('Faculty count:', count);

        const faculty = await Faculty.find().limit(5);
        console.log('Sample faculty:', faculty.map(f => ({ name: f.name, email: f.email })));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testDB();