import { read } from "fs";
import { setUser, readConfig } from "src/config";
function main() {
    setUser("agx");
    const config = readConfig();
    if (config) {
        console.log(readConfig());
    } else {
        console.log("No configuration found.");
    }
}

main();