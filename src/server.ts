import express from "express";
import http from "http";
import knex from "knex";
import { env } from "./config";
import logger from "./logger";
import bodyParser from "body-parser";

const { PORT, IP } = env;

process.on("uncaughtException", (err) => {
    logger.log("ERROR", "An exception was left uncaught", err);
});

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const backend = http.createServer(app);

const db = knex({
    client: "mysql",
    pool: { min: 0, max: 10 },
    connection: {
        host: env.DB_HOST,
        user: env.DB_USER,
        password: env.DB_PASS,
        database: env.DB_NAME,
        timezone: "UTC",
        typeCast: (field: any, next: any) => {
            if (field.type === "BIT" && field.length === 1) {
                const bytes = field.buffer();
                return bytes[0] === 1;
            }
            return next();
        },
    },
});

const testDbConnection = async () => {
    try {
        await db.raw("SELECT 1+1 AS RESULT");
        logger.log("DEBUG", "database connection ok");
    } catch (e) {
        logger.log("FATAL", "failed to connect to the database", e);
    }
};
testDbConnection();

app.get("/test", async function (_req, res) {
    res.status(200);
    return {
        success: false,
        message: "ok",
    };
});

backend.listen(Number(PORT), IP);
logger.log("INFO", "backend started");