import jsonwebtoken from "jsonwebtoken";
import { env } from "./config";
import { v4 as uuid } from "uuid";

const { JWT_SECRET } = env;

export interface Claims {
    // Subject
    sub: string;
    // JWT ID
    jti: string;
    // Remaining
    [key: string]: any;
}

const tokenBlacklist = new Array<string>(0);

export function signToken(claims: Record<string, unknown>, subject: string) {
    return new Promise<string>((resolve, reject) => {
        return jsonwebtoken.sign(
            claims,
            JWT_SECRET!,
            {
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
            {},
            (err, claims: Claims) => {
                if (err) reject("Invalid token");
                else if (tokenBlacklist.includes(claims.jti)) {
                    reject("Blacklisted token");
                } else {
                    resolve(claims);
                }
            }
        );
    });
}

export function revokeToken(jti: string) {
    if (!tokenBlacklist.includes(jti))
        tokenBlacklist.push(jti);
}