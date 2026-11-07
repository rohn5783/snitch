import mongoose from "mongoose";
import { getServerEnv } from "@/lib/server/config/env";

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalCache = globalThis as typeof globalThis & { mongooseCache?: MongooseCache };
const cache: MongooseCache = globalCache.mongooseCache ?? { connection: null, promise: null };
globalCache.mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.connection && mongoose.connection.readyState === 1) {
    return cache.connection;
  }

  if (!cache.promise) {
    const env = getServerEnv();
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 15,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    };

    cache.promise = mongoose.connect(env.MONGO_URI, opts).then((m) => {
      return m;
    });
  }

  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.promise = null;
    cache.connection = null;
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (cache.connection) {
    await mongoose.disconnect();
    cache.connection = null;
    cache.promise = null;
  }
}

