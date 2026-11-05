import mongoose from "mongoose";
import { requiredEnv } from "@/lib/server/env";

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalCache = globalThis as typeof globalThis & { mongooseCache?: MongooseCache };
const cache = globalCache.mongooseCache ?? { connection: null, promise: null };
globalCache.mongooseCache = cache;

export async function connectDB() {
  if (cache.connection) return cache.connection;
  if (!cache.promise) {
    cache.promise = mongoose.connect(requiredEnv("MONGO_URI"));
  }

  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
}
