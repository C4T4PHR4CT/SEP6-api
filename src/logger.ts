import moment from "moment";
import { env } from "src/config";
import { shallowStringify } from "./common";

export type log_level = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

const levels = ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"] as Array<log_level>;

export const LOG_LEVEL = env.LOG_LEVEL === undefined ? env.NODE_ENV === "production" ? "WARN" : "DEBUG" : env.LOG_LEVEL;

const logged_levels = levels.slice(levels.findIndex(l => l === LOG_LEVEL));

const KEEP_LAST_N = 0;
const LAST_N = new Array<string>(0);

let level_print_length = 0;
for (const lvl of levels)
    if ((lvl as string).length > level_print_length)
        level_print_length = (lvl as string).length;

export default class Logger {
    public static log(level: log_level, content: string, additional?: any): void {
        if (logged_levels.includes(level)) {
            let lvl = level as string;
            while (lvl.length < level_print_length)
                lvl += " ";
            let msg = `[${lvl} - ${moment.unix(moment.now()/1000).format("YYYY/MM/DD HH:mm:ss")}] ${content}`;
            if (additional !== undefined) {
                if (typeof additional === "object")
                    if (additional.toString !== undefined && typeof additional.toString === "function" && additional.toString() !== "[object Object]")
                        additional = additional.toString();
                    else if (additional.error !== undefined)
                        if (typeof additional.error === "function")
                            additional = additional.error();
                        else
                            additional = additional.error;
                    else if (additional.message !== undefined)
                        if (typeof additional.message === "function")
                            additional = additional.message();
                        else
                            additional = additional.message;
                    else
                        additional = shallowStringify(additional);
                additional = ""+additional;
                if (additional.trim() !== "") {
                    const add = additional.split("\n");
                    msg += " {\n";
                    for (const a of add)
                        msg += `    ${a}\n`;
                    msg += "}";
                }
            }
            console.log(msg);
            if (KEEP_LAST_N > 0) {
                LAST_N.push(msg);
                if (LAST_N.length > KEEP_LAST_N)
                    LAST_N.shift();
            }
        }
    }

    public static getLastN(): Array<string> {
        return JSON.parse(JSON.stringify(LAST_N));
    }
}