// Copyright (c) 2023-2024, NeKz
// SPDX-License-Identifier: MIT

import { extname, join } from 'std/path/mod.ts';
import { Command } from 'cliffy/command/mod.ts';
import { createVpk, mergeVpk, packVpk, readVpk, VpkFileEntry } from './vpk/mod.ts';

const main = async () => {
  await new Command()
    .name('vpkt')
    .description('VPK tool.')
    .version('1.0.0')
    .command('list')
    .description('List all entries.')
    .option('-i, --input [type:string]', 'Path to VPK dir file.', {
      required: true,
    })
    .action(async (args) => {
      const dirFile = args.input as string;
      await readVpk({
        dirFile,
        onReadFileEntry: (entry) => {
          console.log(entry.fileName);
        },
      });
    })
    .command('tree')
    .description('List all entries as a tree.')
    .option('-i, --input [type:string]', 'Path to VPK dir file.', {
      required: true,
    })
    .action(async (args) => {
      const dirFile = args.input as string;
      const vpk = await readVpk({ dirFile });
      const tree = vpk.toTree().build();
      console.dir(tree, { depth: 8 });
    })
    .command('merge')
    .description('Merge a folder.')
    .option('-i, --input [type:string]', 'Path to VPK dir file.', {
      required: true,
    })
    .option('-m, --merge [type:string]', 'Path to folder to merge.', {
      required: true,
    })
    .option('-d, --dry-run', 'Run the command without merging anything.')
    .action(async (args) => {
      const toMerge = new Map<
        string,
        (Partial<VpkFileEntry> & { sourceFile: string })[]
      >();

      const readDir = async (dir: string, root: string) => {
        for await (const file of Deno.readDir(dir)) {
          const sourceFile = join(dir, file.name);
          if (file.isDirectory) {
            await readDir(
              sourceFile,
              root.length ? [root, file.name].join('/') : file.name,
            );
          } else {
            const fileName = root.length ? [root, file.name].join('/') : file.name;
            const extension = extname(file.name).slice(1);
            const path = root;

            const merge: Partial<VpkFileEntry> & { sourceFile: string } = {
              extension,
              file: file.name.slice(0, -(extension.length + 1)),
              path,
              fileName,
              sourceFile,
            };

            const merges = toMerge.get(extension);
            if (merges) {
              merges.push(merge);
            } else {
              toMerge.set(extension, [merge]);
            }
          }
        }
      };

      await readDir(args.merge as string, '');
      const dirFile = args.input as string;
      const vpk = await readVpk({ dirFile });
      await mergeVpk(dirFile, vpk, toMerge, args.dryRun!);
    })
    .command('pack')
    .description('Pack a folder.')
    .option('-o, --output [type:string]', 'Path to VPK dir file.', {
      required: true,
    })
    .option('-p, --pack [type:string]', 'Path to folder to pack.', {
      required: true,
    })
    .option('-d, --dry-run', 'Run the command without merging anything.')
    .action(async (args) => {
      const toPack = new Map<
        string,
        (Partial<VpkFileEntry> & { sourceFile: string })[]
      >();

      const readDir = async (dir: string, root: string) => {
        for await (const file of Deno.readDir(dir)) {
          const sourceFile = join(dir, file.name);
          if (file.isDirectory) {
            await readDir(
              sourceFile,
              root.length ? [root, file.name].join('/') : file.name,
            );
          } else if (root !== '') {
            const fileName = root.length ? [root, file.name].join('/') : file.name;
            const extension = extname(file.name).slice(1);
            const path = root;

            const merge: Partial<VpkFileEntry> & { sourceFile: string } = {
              extension,
              file: file.name.slice(0, -(extension.length + 1)),
              path,
              fileName,
              sourceFile,
            };

            const merges = toPack.get(extension);
            if (merges) {
              merges.push(merge);
            } else {
              toPack.set(extension, [merge]);
            }
          }
        }
      };

      await readDir(args.pack as string, '');

      const dirFile = args.output as string;
      const vpk = createVpk({ dirFile });

      for (const [extension, files] of toPack) {
        const paths = files.reduce((paths, file) => {
          const files = paths.get(file.path!);
          if (files) {
            files.push(file as VpkFileEntry);
          } else {
            paths.set(file.path!, [file as VpkFileEntry]);
          }
          return paths;
        }, new Map<string, VpkFileEntry[]>());

        vpk.extensions.push({
          extension,
          paths: [...paths.entries()].map(([path, files]) => {
            return {
              path,
              files,
            };
          }),
        });
      }

      await packVpk(dirFile, vpk, toPack, args.dryRun!);
    })
    // .command('modify')
    // .description('Modify any entry.')
    // .option('-i, --input [type:string]', 'Path to VPK dir file.', {
    //   required: true,
    // })
    // .option('-p, --path [type:string]', 'Path in VPK dir to modify.', {
    //   required: true,
    // })
    // .option('-r, --replacement [type:string]', 'Path to replacement file.', {
    //   required: true,
    // })
    // .option('-d, --dry-run', 'Run the command without modifying anything.')
    // .action(async (args) => {
    //   let file: VpkFileEntry | undefined;

    //   const dirFile = args.input as string;
    //   const _folder = dirname(dirFile);

    //   const _vpk = await readVpk({
    //     dirFile,
    //     onReadFileEntry: (entry) => {
    //       if (entry.fileName === args.path as string) {
    //         file = entry;
    //       }
    //     },
    //   });

    //   console.log({ file });

    // if (file) {
    //   const archiveIndex = file.archiveIndex.toString().padStart(3, "0");

    //   // const file = await Deno.readFile(
    //   //   join(folder, `pak01_${archiveIndex}.vpk`),
    //   // );

    //   // const buf = new BitStream(file.buffer);
    //   // buf.byteIndex = file.entryOffset;

    //   const replacementFile = await Deno.readFile(args.replacement as string);

    //   const delta = replacementFile.byteLength - file.entryLength;
    //   console.log({ delta });
    //   let nextOffset = file.entryOffset + file.entryLength;
    //   const oldOffset = nextOffset;

    //   crcInit();
    //   const newCrc = crcCompute(replacementFile);

    //   file.crc = newCrc;
    //   file.entryLength = replacementFile.byteLength;

    //   const entriesToUpdate = [file];

    //   for (
    //     const toUpdate of entries.filter((toUpdate) =>
    //       toUpdate.archiveIndex === entry.archiveIndex &&
    //       toUpdate.entryOffset >= nextOffset
    //     ).sort((a, b) => a.entryOffset - b.entryOffset)
    //   ) {
    //     if (toUpdate.entryOffset !== nextOffset) {
    //       throw new Error(`Error when calculating next entry offset`);
    //     }
    //     nextOffset += toUpdate.entryLength;
    //     toUpdate.entryOffset += delta;
    //     entriesToUpdate.push(toUpdate);
    //   }

    //   if (!args.dryRun) {
    //     await updateVpk(dirFile, entriesToUpdate);

    //     const fileName = join(folder, `pak01_${archiveIndex}_o.vpk`);
    //     const fileNameUpdated = join(folder, `pak01_${archiveIndex}.vpk`);
    //     const archive = await Deno.readFile(fileName);

    //     const newFile = await Deno.open(fileNameUpdated, {
    //       write: true,
    //       create: true,
    //       truncate: true,
    //     });

    //     try {
    //       const writer = newFile.writable.getWriter();
    //       await writer.write(archive.slice(0, entry.entryOffset));
    //       await writer.write(replacementFile);
    //       await writer.write(archive.slice(oldOffset));
    //     } catch (err) {
    //       console.error(err);
    //     } finally {
    //       newFile.close();
    //     }
    //   }
    // }
    // })
    .parse(Deno.args);
};

try {
  await main();
} catch (err) {
  console.error(err);
  Deno.exit(1);
}
