// Copyright (c) 2024, NeKz
// SPDX-License-Identifier: MIT

import { colors } from 'cliffy/ansi/colors.ts';
import { Command } from 'cliffy/command/mod.ts';
import { Input, prompt, Select } from 'cliffy/prompt/mod.ts';
import { join } from 'std/path/mod.ts';
import { exists } from 'std/fs/exists.ts';
import { Spinner } from 'std/cli/spinner.ts';
import { copy } from 'std/fs/copy.ts';
import { BlobReader, Uint8ArrayWriter, ZipReader } from 'zipjs/index.js';
import { modifyGameInfo } from './game.ts';

const ChallengeModeModVersion = '0.1.0';
const UserAgent = 'cmm/' + ChallengeModeModVersion;
const GitHubRepository = 'NeKzor/cmm';
const isWindows = Deno.build.os === 'windows';

let verbose = false;

const defaultCommonPath = isWindows
  ? 'C:\\Program Files (x86)\\Steam\\steamapps\\common'
  : join('/home/', Deno.env.get('USER') ?? 'user', '/.steam/steam/steamapps/common');

const exit = (code: number): never => {
  if (isWindows) {
    console.info(`\nThis window can be closed now.`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Infinity);
  }
  Deno.exit(code);
};

interface Game {
  folder: string;
  mod: string;
}

const supportedGames: Record<string, Game> = {
  'Portal Stories: Mel': {
    folder: 'Portal Stories Mel',
    mod: 'portal_stories',
  },
  // 'Aperture Tag': {
  //   folder: 'Aperture Tag',
  //   mod: 'aperturetag',
  // },
  // 'Portal Reloaded': {
  //   folder: 'Portal Reloaded',
  //   mod: 'portal2',
  // },
  // 'Thinking with Time Machine': {
  //   folder: 'Thinking with Time Machine',
  //   mod: 'twtm',
  // },
};

const downloadChallengeModeMod = async (game: Game, cmmFolder: string, dlcFolder: string) => {
  const loading = new Spinner({ message: 'Downloading mod contents...' });
  try {
    loading.start();

    const res = await fetch(`https://github.com/${GitHubRepository}/releases/latest/download/cmm-${game.mod}.zip`, {
      headers: {
        'User-Agent': UserAgent,
      },
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const blob = await res.blob();
    loading.stop();

    let zip: ZipReader<BlobReader> | null = null;

    try {
      zip = new ZipReader(new BlobReader(blob), { useWebWorkers: false });

      await Deno.mkdir(cmmFolder);

      for (const entry of await zip.getEntries()) {
        const data = await entry.getData!(new Uint8ArrayWriter());

        const targetFolder = entry.filename === 'challenge_maplist.txt' ? dlcFolder : cmmFolder;
        await Deno.writeFile(join(targetFolder, entry.filename), data);

        console.log(
          colors.white(`Extracted file ${colors.italic.gray(entry.filename)}`),
        );
      }

      console.info(`Downloaded contents to cmm folder.`);
    } finally {
      zip && await zip.close();
    }
  } catch (err) {
    loading.stop();
    verbose && console.error(err);
    console.error(colors.red(`❌️ Failed to download cmm contents.`));
    exit(1);
  }
};

const downloadSourceAutoRecord = async (sarPath: string, pdbPath: string | null) => {
  const loading = new Spinner({ message: 'Downloading SAR...' });
  try {
    loading.start();

    const res = await fetch(
      `https://github.com/p2sr/SourceAutoRecord/releases/latest/download/sar.${isWindows ? 'dll' : 'so'}`,
      {
        headers: {
          'User-Agent': UserAgent,
        },
      },
    );

    if (!res.ok) {
      throw new Error(await res.text());
    }

    using file = await Deno.open(sarPath, { write: true, create: true });
    res.body && await res.body?.pipeTo(file.writable);

    if (pdbPath) {
      const res = await fetch(`https://github.com/p2sr/SourceAutoRecord/releases/latest/download/sar.pdb`, {
        headers: {
          'User-Agent': UserAgent,
        },
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      using file = await Deno.open(pdbPath, { write: true, create: true });
      res.body && await res.body?.pipeTo(file.writable);
    }

    loading.stop();
    console.info(`Downloaded SAR.`);
  } catch (err) {
    loading.stop();
    verbose && console.error(err);
    console.error(colors.red(`❌️ Failed to download SAR.`));
    exit(1);
  }
};

const validateApiKey = async (apiKey: string) => {
  const loading = new Spinner({ message: 'Validating API key...' });
  try {
    loading.start();

    const [domain, key] = apiKey.split('\n');
    const body = new FormData();
    body.append('auth_hash', key!);

    const res = await fetch(`https://${domain}/api-v2/validate-user`, {
      method: 'POST',
      headers: {
        'User-Agent': UserAgent,
      },
      body,
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const validation = await res.json() as { userId: string };

    loading.stop();
    console.info(colors.green(`Validated API key.`));
    verbose && console.info(validation);
  } catch (err) {
    loading.stop();
    verbose && console.error(err);
    console.error(colors.red(`❌️ Failed to check API key.`));
    exit(1);
  }
};

const enableVirtualTerminalProcessing = () => {
  const kernel32 = Deno.dlopen("kernel32.dll", {
    GetStdHandle: {
      parameters: ["u32"],
      result: "pointer"
    },
    GetConsoleMode: {
      parameters: ["pointer", "buffer"],
      result: "bool"
    },
    SetConsoleMode: {
      parameters: ["pointer", "u32"],
      result: "bool"
    }
  });

  const STD_OUTPUT_HANDLE = 4294967295 - 11;
  const ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004;

  const handle = kernel32.symbols.GetStdHandle(STD_OUTPUT_HANDLE);

  const buffer = new Uint32Array(1).fill(0);
  kernel32.symbols.GetConsoleMode(handle, buffer);
  
  let consoleMode = buffer[0];
  if (consoleMode) {
    consoleMode = consoleMode | ENABLE_VIRTUAL_TERMINAL_PROCESSING;
    kernel32.symbols.SetConsoleMode(handle, consoleMode);
  }
}

const cli = new Command()
  .name('cmm')
  .version(ChallengeModeModVersion)
  .description('Command line app for installing challenge mode for Portal 2 mods.')
  .option('-v, --verbose [boolean]', 'Enable verbose error logging.')
  .action(async (option) => {
    verbose = !!option.verbose;

    if (isWindows)
      enableVirtualTerminalProcessing();

    const gameSelect = await Select.prompt({
      message: 'Choose which game to install the mod to:',
      options: Object.keys(supportedGames),
      listPointer: '>',
    });

    const game = supportedGames[gameSelect as keyof typeof supportedGames] as Game;
    let steamCommon = defaultCommonPath;

    if (!(await exists(join(defaultCommonPath, game.folder)))) {
      const steamCommonInput = await prompt([
        {
          name: 'path',
          message: "Please enter your Steam's common directory path where all games are installed:",
          suggestions: [defaultCommonPath],
          type: Input,
          after: async ({ path }, next) => {
            if (path) {
              try {
                const stat = await Deno.stat(path);
                if (stat.isDirectory) {
                  let errored = false;

                  if (!await exists(join(path, game.folder))) {
                    console.error(colors.red(`❌️ ${gameSelect} is not installed.`));
                    errored = true;
                  }

                  // FIXME: Handle case where Portal 2 is installed on a different path
                  //        but nobody does that, right?
                  if (!await exists(join(path, 'Portal 2'))) {
                    console.error(colors.red(`❌️ Portal 2 is not installed.`));
                    errored = true;
                  }

                  if (errored) {
                    exit(1);
                  }

                  return await next();
                } else {
                  console.error(`❌️ Please provide a valid path to a folder.`);
                }
              } catch (err) {
                verbose && console.error(err);
              }
            }

            console.log(colors.red('Invalid directory.'));
            await next('path');
          },
        },
      ]);

      steamCommon = steamCommonInput.path!;
    }

    const gameDir = join(steamCommon, game.folder);

    const dlcFolder = join(gameDir, 'portal2_dlc1');
    const portal2DlcFolder = join(steamCommon, 'Portal 2', 'portal2_dlc1');

    if (!await exists(dlcFolder)) {
      if (!await exists(portal2DlcFolder)) {
        console.error(
          colors.red(`❌️ Unable to find portal2_dlc1. Please make sure that Portal 2 is installed correctly.`),
        );
        exit(1);
      }

      const loading = new Spinner({ message: 'Copying DLC folder...' });
      loading.start();

      await copy(portal2DlcFolder, dlcFolder);

      loading.stop();
      console.info(`Copied portal2_dlc1 folder.`);
    } else {
      console.info(colors.italic.gray(`DLC folder is already copied. Skipping step.`));
    }

    const cmmFolder = join(gameDir, 'cmm');
    if (!await exists(cmmFolder)) {
      await downloadChallengeModeMod(game, cmmFolder, dlcFolder);
    } else {
      // TODO: Ask to uninstall the mod?
      console.info(colors.italic.gray(`Mod content is already downloaded. Skipping step.`));
    }

    const gameInfo = join(gameDir, game.mod, 'gameinfo.txt');
    const result = await modifyGameInfo(gameInfo);
    if (typeof result === 'string') {
      console.error(colors.red(`❌️ ${result}`));
      exit(1);
    }

    console.info(result ? `Modified gameinfo.txt` : colors.italic.gray(`Gameinfo is already modified. Skipping step.`));

    const sar = join(gameDir, 'sar.' + (isWindows ? 'dll' : 'so'));
    if (!await exists(sar)) {
      await downloadSourceAutoRecord(sar, isWindows ? join(gameDir, 'sar.pdb') : null);
    } else {
      console.warn(
        colors.yellow(`Detected that SAR is already installed. Please make sure that it is the latest version.`),
      );
    }

    const autosubmitKey = join(gameDir, 'autosubmit.key');
    if (await exists(autosubmitKey)) {
      await validateApiKey(await Deno.readTextFile(autosubmitKey));
    } else {
      console.info(colors.italic.gray(`Missing autosubmit.key file. Skipping validation step.`));
    }

    console.info(`Done.`);
  });

try {
  await cli.parse(Deno.args);
  exit(0);
} catch (err) {
  verbose && console.error(err);
  console.error(colors.red(`❌️ Unknown error.`));
  exit(1);
}
