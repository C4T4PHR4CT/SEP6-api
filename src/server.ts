import express, { NextFunction, Request, Response } from "express";
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

const errorHandler = function (req: Request, res: Response, next: NextFunction) {
    try {
        next();
    } catch (e: any) {
        logger.log("ERROR", "POST /register", e);
        res.status(500);
        res.send({message:"internal server error",success:false});
    }
}
app.use(errorHandler);

const auth = async function (req: Request, res: Response, next: NextFunction) {
    const nonSecurePaths = ["/api/register", "/api/login"];
    if (nonSecurePaths.includes(req.path))
        return next();
  
    const tmp = req.headers.Authorization ?? req.headers.authorization ?? "";
    const token = (Array.isArray(tmp) ? tmp[0] : tmp).split(" ");
    if (token.length < 2 || token[0] !== "Bearer") {
        res.status(401);
        res.send({message:"invalid bearer token",success:false});
    } else {
        try {
            const claims = await verifyToken(token[1]);
            (req as any).claims = claims;
            next();
        } catch (_) {
            res.status(401);
            res.send({message:"failed to verify token",success:false});
        }
    }
}
app.use(auth);

app.post("/api/register", async function (req, res) {
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
});

app.post("/api/login", async function (req, res) {
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
});

app.post("/api/token/confirm", async function (req, res) {
    res.status(200);
    res.send({message:"ok",success:true});
});

app.post("/api/token/revoke", async function (req, res) {
    revokeToken((req as any).claims);
    res.status(200);
    res.send({message:"ok",success:true});
});

app.get("/api/favourite", async function (req, res) {
    const favs = (await db.raw("SELECT favourites FROM users WHERE username = ?", [(req as any).claims.sub]))[0][0].favourites;
    res.status(200);
    res.send(JSON.parse(favs));
});

app.post("/api/favourite/:movieId", async function (req, res) {
    const favs = JSON.parse((await db.raw("SELECT favourites FROM users WHERE username = ?", [(req as any).claims.sub]))[0][0].favourites) as Array<string>;
    if (!favs.includes(req.params.movieId as string)) {
        favs.push(req.params.movieId as string);
        await db.raw("UPDATE users SET favourites = ? WHERE username = ?", [JSON.stringify(favs) ,(req as any).claims.sub]);
    }
    res.status(200);
    res.send({message:"ok",success:true});
});

app.delete("/api/favourite/:movieId", async function (req, res) {
    const favs = JSON.parse((await db.raw("SELECT favourites FROM users WHERE username = ?", [(req as any).claims.sub]))[0][0].favourites) as Array<string>;
    if (favs.includes(req.params.movieId as string)) {
        favs.splice(favs.findIndex(m => m === req.params.movieId as string), 1);
        await db.raw("UPDATE users SET favourites = ? WHERE username = ?", [JSON.stringify(favs) ,(req as any).claims.sub]);
    }
    res.status(200);
    res.send({message:"ok",success:true});
});

app.post("/api/comment/:movieId", async function (req, res) {
    const content = req.body.content;
    if (nullOrEmpty(content)) {
        res.status(400);
        res.send({message:"content can't be empty",success:false});
    } else {
        await db.raw("INSERT INTO comments (author, content, movie_id) VALUES (?, ?, ?)", [(req as any).claims.sub, content, req.params.movieId as string]);
        res.status(200);
        res.send({message:"ok",success:true});
    }
});

app.get("/api/comment/:movieId", async function (req, res) {
    const comments = (await db.raw("SELECT author, content, UNIX_TIMESTAMP(entry_timestamp) AS da FROM comments WHERE movie_id = ?", [req.params.movieId as string]))[0].map((m: any) => {return {username: m.author, date: m.da, content: m.content};});
    res.status(200);
    res.send(comments);
});

backend.listen(Number(PORT), IP);
logger.log("INFO", "backend started");