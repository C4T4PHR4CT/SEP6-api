import express from "express";
import http from "http";
import knex from "knex";
import { env } from "./config";
import logger from "./logger";
import bodyParser from "body-parser";
import { nullOrEmpty } from "./common";
import bcrypt from "bcrypt";

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
    res.send("ok");
});

app.post("/register", async function (req, res) {
    try {
        const user = req.body;
        if (nullOrEmpty(user.username)) {
            res.status(400);
            res.send("username can't be empty");
        } else if (nullOrEmpty(user.password)) {
            res.status(400);
            res.send("password can't be empty");
        } else if (nullOrEmpty(user.email)) {
            res.status(400);
            res.send("email can't be empty");
        } else if ((await db.raw("SELECT username FROM users WHERE username = ?", [user.username]))[0].length > 0) {
            res.status(409);
            res.send("username taken");
        } else {
            await db.raw("INSERT INTO users (username, password_hashed, email, favourites) VALUES (?, ?, ?, ?)", [user.username, bcrypt.hashSync(user.password, 10), user.email, "[]"]);
            res.status(200);
            res.send("ok");
        }
    } catch (e: any) {
        logger.log("ERROR", "POST /register", e);
        res.status(500);
        res.send("internal server error");
    }
});

backend.listen(Number(PORT), IP);
logger.log("INFO", "backend started");