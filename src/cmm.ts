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

let verbose = false;

const isWindows = Deno.build.os === 'windows';

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

const downloadChallengeModeMod = async (game: Game, cmmFolder: string) => {
  try {
    const loading = new Spinner({ message: 'Downloading mod contents...' });
    loading.start();

    const res = await fetch(`https://github.com/${GitHubRepository}/releases/latest/download/cmm-${game.mod}.zip`, {
      headers: {
        'User-Agent': UserAgent,
      },
    });

    const blob = await res.blob();
    loading.stop();

    let zip: ZipReader<BlobReader> | null = null;

    try {
      zip = new ZipReader(new BlobReader(blob), { useWebWorkers: false });

      await Deno.mkdir(cmmFolder);

      for (const entry of await zip.getEntries()) {
        const data = await entry.getData!(new Uint8ArrayWriter());

        await Deno.writeFile(join(cmmFolder, entry.filename), data);

        console.log(
          colors.white(`Extracted file ${colors.italic.gray(entry.filename)}`),
        );
      }

      console.info(`Downloaded contents to cmm folder.`);
    } finally {
      zip && await zip.close();
    }
  } catch (err) {
    verbose && console.error(err);
    console.error(colors.red(`❌️ Failed to download cmm contents.`));
    Deno.exit(1);
  }
};

const downloadSourceAutoRecord = async (sarPath: string, pdbPath: string | null) => {
  try {
    const loading = new Spinner({ message: 'Downloading SAR...' });
    loading.start();

    const res = await fetch(
      `https://github.com/p2sr/SourceAutoRecord/releases/latest/download/sar.${isWindows ? 'dll' : 'so'}`,
      {
        headers: {
          'User-Agent': UserAgent,
        },
      },
    );

    using file = await Deno.open(sarPath, { write: true, createNew: true });
    res.body && await res.body?.pipeTo(file.writable);

    if (pdbPath) {
      const res = await fetch(`https://github.com/p2sr/SourceAutoRecord/releases/latest/download/sar.pdb`, {
        headers: {
          'User-Agent': UserAgent,
        },
      });

      using file = await Deno.open(pdbPath, { write: true, createNew: true });
      res.body && await res.body?.pipeTo(file.writable);
    }

    loading.stop();
    console.info(`Downloaded SAR.`);
  } catch (err) {
    verbose && console.error(err);
    console.error(colors.red(`❌️ Failed to download SAR.`));
    Deno.exit(1);
  }
};

const validateApiKey = async (apiKey: string) => {
  try {
    const loading = new Spinner({ message: 'Validating API key...' });
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

    const validation = await res.json() as { userId: string };

    loading.stop();
    console.info(`Validated API key:`, validation);
  } catch (err) {
    verbose && console.error(err);
    console.error(colors.red(`❌️ Failed to check API key.`));
    Deno.exit(1);
  }
};

const cli = new Command()
  .name('cmm')
  .version(ChallengeModeModVersion)
  .description('Command line app for installing challenge mode for Portal 2 mods.')
  .option('-v, --verbose [boolean]', 'Enable verbose error logging.')
  .action(async (option) => {
    verbose = !!option.verbose;

    const setup = await prompt([
      {
        name: 'game_name',
        message: '🎮️ Choose which game to install the mod:',
        type: Select,
        options: Object.keys(supportedGames),
      },
      {
        name: 'steam_common',
        message: "📂️ Please enter your Steam's common directory path where all games are installed.",
        suggestions: [
          isWindows
            ? 'C:\\Program Files (x86)\\Steam\\steamapps\\common'
            : join('/home/', Deno.env.get('USER') ?? 'user', '/.steam/steam/steamapps/common'),
        ],
        type: Input,
        after: async ({ steam_common, game_name }, next) => {
          if (steam_common) {
            try {
              const { state } = await Deno.permissions.request({
                name: 'read',
                path: steam_common,
              });

              if (state !== 'granted') {
                console.log(colors.red("❌️ Access denied for Steam's common folder."));
                Deno.exit(1);
              }

              const stat = await Deno.stat(steam_common);
              if (stat.isDirectory) {
                let errored = false;

                const gamesDir = steam_common;

                const { state } = await Deno.permissions.request({
                  name: 'read',
                  path: gamesDir,
                });

                if (state !== 'granted') {
                  console.log(colors.red("❌️ Access denied for Steam's common folder."));
                  Deno.exit(1);
                }

                const game = supportedGames[game_name as keyof typeof supportedGames] as Game;

                try {
                  await Deno.stat(join(gamesDir, game.folder));
                } catch (err) {
                  verbose && console.error(err);
                  console.error(colors.red(`❌️ ${game_name} is not installed.`));

                  errored = true;
                }

                try {
                  // FIXME: Handle case where Portal 2 is installed on a different path
                  //        but nobody does that, right?
                  await Deno.stat(join(gamesDir, 'Portal 2'));
                } catch (err) {
                  verbose && console.error(err);
                  console.error(colors.red(`❌️ Portal 2 is not installed.`));

                  errored = true;
                }

                if (errored) {
                  Deno.exit(1);
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
          await next('steam_common');
        },
      },
    ]);

    const game = supportedGames[setup.game_name as keyof typeof supportedGames] as Game;
    const gameDir = join(setup.steam_common!, game.folder);
    const gameInfo = join(gameDir, game.mod, 'gameinfo.txt');

    const result = await modifyGameInfo(gameInfo);
    if (typeof result === 'string') {
      console.error(colors.red(`❌️ ${result}`));
      Deno.exit(1);
    }

    console.info(result ? `Modified gameinfo.txt` : `Gameinfo is already modified. Skipping step.`);

    const cmmFolder = join(gameDir, 'cmm');
    if (!await exists(cmmFolder)) {
      await downloadChallengeModeMod(game, cmmFolder);
    } else {
      // TODO: Ask to uninstall the mod?
      console.info(`The mod contents are already downloaded. Skipping step.`);
    }

    const dlcFolder = join(gameDir, 'portal2_dlc1');
    const portal2DlcFolder = join(setup.steam_common!, 'Portal 2', 'portal2_dlc1');

    if (!await exists(dlcFolder)) {
      if (!await exists(portal2DlcFolder)) {
        console.error(
          colors.red(`❌️ Unable to find portal2_dlc1. Please make sure that Portal 2 is installed correctly.`),
        );
        Deno.exit(1);
      }

      const loading = new Spinner({ message: 'Copying DLC folder...' });
      loading.start();

      await copy(portal2DlcFolder, dlcFolder);

      loading.stop();
      console.info(`Copied portal2_dlc1 folder.`);
    } else {
      console.info(`The DLC folder is already copied. Skipping step.`);
    }

    const sar = join(gameDir, 'sar.' + (isWindows ? 'dll' : 'so'));
    if (!await exists(sar)) {
      await downloadSourceAutoRecord(sar, isWindows ? join(gameDir, 'sar.pdb') : null);
    } else {
      console.warn(`Detected that SAR is already installed. Please make sure that it is the latest version.`);
    }

    const autosubmitKey = join(gameDir, 'autosubmit.key');
    if (await exists(autosubmitKey)) {
      await validateApiKey(await Deno.readTextFile(autosubmitKey));
    } else {
      console.warn(`Missing autosubmit.key file. Skipping validation step.`);
    }

    console.info(`Done.`);
  });

try {
  await cli.parse(Deno.args);
} catch (err) {
  verbose && console.error(err);
  console.error(colors.red(`❌️ Unknown error.`));
}
