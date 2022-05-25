import express from "express";
import http from "http";
import knex from "knex";
import { env } from "./config";
import logger from "./logger";
import bodyParser from "body-parser";
import { nullOrEmpty } from "./common";
import bcrypt from "bcrypt";
import { revokeToken, signToken, verifyToken } from "./jwt";

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

app.post("/api/register", async function (req, res) {
    try {
        const user = req.body;
        if (nullOrEmpty(user.username)) {
            res.status(400);
            res.send({message:"username can't be empty",success:false});
        } else if (nullOrEmpty(user.password)) {
            res.status(400);
            res.send({message:"password can't be empty",success:false});
        } else if (nullOrEmpty(user.email)) {
            res.status(400);
            res.send({message:"email can't be empty",success:false});
        } else if ((await db.raw("SELECT username FROM users WHERE username = ?", [user.username]))[0].length > 0) {
            res.status(409);
            res.send({message:"username taken",success:false});
        } else {
            await db.raw("INSERT INTO users (username, password_hashed, email, favourites) VALUES (?, ?, ?, ?)", [user.username, bcrypt.hashSync(user.password, 10), user.email, "[]"]);
            res.status(200);
            res.send({message:"ok",success:true});
        }
    } catch (e: any) {
        logger.log("ERROR", "POST /register", e);
        res.status(500);
        res.send({message:"internal server error",success:false});
    }
});

app.post("/api/login", async function (req, res) {
    try {
        const user = req.body;
        if (nullOrEmpty(user.username)) {
            res.status(400);
            res.send({message:"username can't be empty",success:false});
        } else if (nullOrEmpty(user.password)) {
            res.status(400);
            res.send({message:"password can't be empty",success:false});
        } else if (!bcrypt.compareSync(user.password, (await db.raw("SELECT password_hashed FROM users WHERE username = ?", [user.username]))[0][0]?.password_hashed ?? "")) {
            res.status(401);
            res.send({message:"incorrect username or password",success:false});
        } else {
            const dbUser = (await db.raw("SELECT username, email FROM users WHERE username = ?", [user.username]))[0].map((v: any) => {return {username: v.username, email: v.email};})[0];
            const token = await signToken(dbUser, user.username);
            res.status(200);
            res.send({token, user: dbUser});
        }
    } catch (e: any) {
        logger.log("ERROR", "POST /login", e);
        res.status(500);
        res.send({message:"internal server error",success:false});
    }
});

app.post("/api/token/confirm", async function (req, res) {
    try {
        const tmp = req.headers.Authorization ?? req.headers.authorization ?? "";
        const token = (Array.isArray(tmp) ? tmp[0] : tmp).split(" ");
        if (token.length < 2 || token[0] !== "Bearer") {
            res.status(401);
            res.send({message:"invalid bearer token",success:false});
        } else {
            try {
                await verifyToken(token[1]);
                res.status(200);
                res.send({message:"ok",success:true});
            } catch (_) {
                res.status(401);
                res.send({message:"failed to verify token",success:false});
            }
        }
    } catch (e: any) {
        logger.log("ERROR", "POST /token/confirm", e);
        res.status(500);
        res.send({message:"internal server error",success:false});
    }
});

app.post("/api/token/revoke", async function (req, res) {
    try {
        const tmp = req.headers.Authorization ?? req.headers.authorization ?? "";
        const token = (Array.isArray(tmp) ? tmp[0] : tmp).split(" ");
        if (token.length < 2 || token[0] !== "Bearer") {
            res.status(401);
            res.send({message:"invalid bearer token",success:false});
        } else {
            try {
                const claims = await verifyToken(token[1]);
                revokeToken(claims.jti);
                res.status(200);
                res.send({message:"ok",success:true});
            } catch (_) {
                res.status(401);
                res.send({message:"failed to verify token",success:false});
            }
        }
    } catch (e: any) {
        logger.log("ERROR", "POST /token/revoke", e);
        res.status(500);
        res.send({message:"internal server error",success:false});
    }
});

backend.listen(Number(PORT), IP);
logger.log("INFO", "backend started");