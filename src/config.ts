import path from "path";
import dotenv from "dotenv";

// Init environment-specific variables
dotenv.config({ path: path.join(__dirname, "../.env") });

export const env = process.env;