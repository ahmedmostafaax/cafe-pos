import mongoose from "mongoose";

const connectDB = async (retries = 5, delayMs = 3000) => {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pos";

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(mongoUri, {
        maxPoolSize: 50,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
      });
      console.log(`MongoDB connected — Database: ${conn.connection.name}`);
      return;
    } catch (err) {
      console.error(
        `MongoDB connection error (attempt ${attempt}/${retries}):`,
        err.message
      );
      if (attempt === retries) {
        console.error("MongoDB: giving up after max retries, exiting.");
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

export default connectDB;
