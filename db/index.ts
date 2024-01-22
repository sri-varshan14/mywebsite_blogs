import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as dotenv from "dotenv";
dotenv.config();

const queryClient = postgres(process.env.DATABASE_URL!);
export const db = drizzle(queryClient);
export const db_disconnect = async () => {
    await queryClient.end()
}
