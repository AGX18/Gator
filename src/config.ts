import path from "path";
import os from "os";
import fs from "fs";
import { json } from "stream/consumers";
export type Config = {
    dbUrl: string;
    currentUserName: string;
}

export function setUser(name: string) {
    let cfg = readConfig();
    if (!cfg) {
        cfg = JSON.parse(`{ "dbUrl": "postgres://example", "currentUserName": "${name}" }`) as Config;
    } else {
        cfg.currentUserName = name;
        if (cfg.dbUrl.trim() === '') {
            cfg.dbUrl = "postgres://example";
        }
    }
    writeConfig(cfg);
}

export function readConfig(): Config {
    const configPath = getConfigFilePath();
    const data = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(data);
    return validateConfig(config);
}

function getConfigFilePath(): string {
    return path.join(os.homedir(), '.gatorconfig.json');
}

function writeConfig(cfg: Config): void {
    fs.writeFileSync(getConfigFilePath(), JSON.stringify(cfg, null, 2), { encoding: 'utf-8' });
}

function validateConfig(rawConfig: any): Config {
    if (!rawConfig) {
        throw new Error("Configuration file not found. Please set up your configuration.");
    }
    if (typeof rawConfig.dbUrl !== 'string' || !rawConfig.dbUrl) {
        throw new Error("Invalid or missing 'dbUrl' in configuration.");
    }
    if (typeof rawConfig.currentUserName !== 'string' || !rawConfig.currentUserName) {
        throw new Error("Invalid or missing 'currentUserName' in configuration.");
    }
    return rawConfig as Config;
}