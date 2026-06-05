import mongoose from 'mongoose';
import { initializeLocalDb } from './inMemoryDb.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/reloop');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`⚠️ Error connecting to MongoDB: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Database connection failed in production. Exiting process...');
      process.exit(1);
    }
    console.log('⚠️ Running in local JSON database fallback mode.');
    initializeLocalDb();
  }
};

export default connectDB;
