import jsonwebtoken from "jsonwebtoken";
import { env } from "./config";
import { v4 as uuid } from "uuid";
import BlackList from "./utils/BlackList";

const { JWT_SECRET } = env;

export interface Claims {
    // Subject
    sub: string;
    // Issuer
    iss: string;
    // Audience
    aud: string;
    // Expiration time in seconds since 1970-01-01T00:00:00Z
    exp: number;
    // Issued at
    iat: number;
    // JWT ID
    jti: string;
    // Remaining
    [key: string]: any;
}

const tokenBlacklist = new BlackList<string>();

export function signToken(claims: Record<string, unknown>, subject: string) {
    return new Promise<string>((resolve, reject) => {
        return jsonwebtoken.sign(
            claims,
            JWT_SECRET!,
            {
                expiresIn: "8h",
                issuer: "definetly not IMDB",
                audience: "IMDB",
                subject,
                jwtid: uuid(),
            },
            (err, token) => {
                if (err) return reject(err);
                resolve(token as string);
            }
        );
    });
}

export function verifyToken(token: string) {
    return new Promise<Claims>((resolve, reject) => {
        return jsonwebtoken.verify(
            token,
            JWT_SECRET!,
            {
                issuer: "definetly not IMDB",
                audience: "IMDB",
            },
            (err, claims: Claims) => {
                if (err) reject("invalid token");
                else if (tokenBlacklist.contains(claims.jti)) {
                    reject("blacklisted token");
                } else {
                    resolve(claims);
                }
            }
        );
    });
}

export function revokeToken(claims: Claims) {
    if (!tokenBlacklist.contains(claims.jti))
        tokenBlacklist.push(claims.jti, claims.exp * 1000);
}