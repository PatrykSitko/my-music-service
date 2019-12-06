import fs from "../../src/customFS.mjs";
import util from "util";
import { fileURLToPath } from "url";
import { dirname } from "path";
import child_process from "child_process";

const homeDir = process.env.HOMEDRIVE + process.env.HOMEPATH;
const __dirname = dirname(fileURLToPath(import.meta.url));
const exec = util.promisify(child_process.exec);
const stdin = process.stdin;
stdin.setRawMode(true);
stdin.setEncoding("UTF-8");

export function installFFMPEG() {
  console.log("Do you want to start the ffmpeg installation process?");
  console.log("yes/no");
  let choosenOption = false;
  stdin.on("data", async key => {
    console.log(key);
    if (key.toLowerCase() === "y" && !choosenOption) {
      choosenOption = true;
      copyFfmpegToHomeDir();
      addFfmpegPathEntry();
    }
    if (key.toLowerCase() === "n" && !choosenOption) {
      choosenOption = true;
      console.log("Missing ffmpeg. Exiting process with code 1.");
      continueOnInput(1);
    }
  });
}

function continueOnInput(exitcode = undefined) {
  console.log("Press any key to continue...");
  stdin.on("data", () => {
    if (typeof exitcode === "number" && exitcode === 1) {
      process.exit(1);
    } else {
      stdin.destroy();
    }
  });
}
function askToReboot() {
  console.log("Do you want to reboot? (required)");
  console.log("yes/no");
  let choosenOption = false;
  stdin.on("data", key => {
    if (key && choosenOption) {
      stdin.destroy();
    }
    console.log(key);
    if (key.toLowerCase() === "y" && !choosenOption) {
      (async () => {
        const { stdout } = await exec("shutdown /r");
        console.log(stdout);
      })();
      choosenOption = true;
    }
    if (key.toLowerCase() === "n") {
      console.log("Please reboot your computer");
      choosenOption = true;
    }
    console.log("Press any key to continue...");
  });
}
function copyFfmpegToHomeDir() {
  console.log("Starting ffmpeg installation process...");
  console.log(
    `Copying files and directories from: "${__dirname}\\**" to: "${homeDir}\\ffmpeg"`
  );
  fs.copyFolderRecursiveSync(__dirname, homeDir);
  console.log(
    `Finnished copying files and directories from: "${__dirname}\\**" to: "${homeDir}\\ffmpeg"`
  );
}

async function addFfmpegPathEntry() {
  try {
    const { stdout: userPath } = await exec(
      '%SystemRoot%\\System32\\reg.exe query "HKCU\\Environment" /v Path'
    );
    const newPathEntry = `${homeDir}\\ffmpeg\\bin;`;
    const localPath = userPath
      .replace("HKEY_CURRENT_USER\\Environment", "")
      .replace("Path    REG_EXPAND_SZ", "")
      .trim();

    console.log("Adding new user path entry: " + newPathEntry);
    if (!localPath.includes(newPathEntry)) {
      const { stdout } = await exec(`setx path "${localPath}${newPathEntry}"`);
      console.log(stdout);
      console.log("Finnished adding new user path entry: " + newPathEntry);
      askToReboot();
    } else {
      console.log("UserPath already contains path: " + newPathEntry);
      console.log("Abording adding new user path entry.");
      try {
        await exec("ffmpeg");
      } catch ({ stderr }) {
        if (
          stderr ===
          "'ffmpeg' is not recognized as an internal or external command,\r\n" +
            "operable program or batch file.\r\n"
        ) {
          console.log("Command:", stderr.trim());
          console.log("path variable need to be updated.");
          askToReboot();
        }
      }
      continueOnInput();
    }
  } catch (err) {
    console.error(err);
  }
}
