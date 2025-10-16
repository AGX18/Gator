import { read } from "fs";
import { setUser, readConfig } from "src/config";

/**
 * Represents a function that handles a CLI command.
 * @param args - An optional array of string arguments passed to the command.
 * @returns void.
 */
type CommandHandler = (cmdName: string, ...args: string[]) => void;
function handlerLogin(cmdName: string, ...args: string[]) {
    if (args.length < 1) {
        console.error("Username is required for login.");
        return;
    }
    setUser(args[0]);
    console.log(`User set to ${args[0]}`);
}

/**
 * A registry object that maps command names (string keys)
 * to their corresponding CommandHandler functions.
 */
type CommandsRegistry = Record<string, CommandHandler>;
function main() {
    const commands: CommandsRegistry = {};
    registerCommand(commands, 'login', loginHandler);
    
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error("not enough arguments were provided. No command provided.");
        process.exit(1);
    }
    const [cmd, ...cmd_args] = args;
    try {
        runCommand(commands, cmd, ...cmd_args);
    } catch (error : any) {
        console.error("Error:", error.message);
        process.exit(1);
    }
}

main();


function registerCommand(registry: CommandsRegistry, cmdName: string, handler: CommandHandler) {
    registry[cmdName] = handler;
}

function loginHandler(cmdName: string, ...args: string[]) {
    if (args.length < 1) {
        throw new Error(`username is required.`);
    }
    setUser(args[0]);
    console.log(`User set to ${args[0]}`);
}

function runCommand(registry: CommandsRegistry, cmdName: string, ...args: string[]) {
    const handler = registry[cmdName];
    if (handler) {
        handler(cmdName, ...args);
    } else {
        throw new Error(`Unknown command: ${cmdName}`);
    }
}