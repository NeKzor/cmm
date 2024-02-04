// Copyright (c) 2023-2024, NeKz
// SPDX-License-Identifier: MIT

import { assertEquals } from 'std/assert/mod.ts';
import { dirname, join } from 'std/path/mod.ts';
import { crcCompute, crcInit } from './crc.ts';

export interface Vpk {
  signature: number;
  version: number;
  treeSize: number;
  extensions: VpkExtensionEntry[];
  readonly entries: VpkFileEntry[];
  dirFile: string;
  toTree(): VpkTree;
}

export class VpkTree {
  constructor(public vpk: Vpk) {}
  build() {
    const root: VpkNode = {
      label: this.vpk.dirFile,
      children: [],
    };

    const buildNode = (paths: string[], children: VpkNode[]) => {
      const [subPath, ...rest] = paths;
      let child = children.find((child) => child.label === subPath);
      if (!child) {
        child = {
          label: subPath!,
        };
        children.push(child);
      }

      if (rest.length) {
        child.children ??= [];
        buildNode(rest, child.children!);
      }
    };

    for (const entry of this.vpk.entries) {
      buildNode(entry.fileName.split('/'), root.children!);
    }

    const sortOptions: Intl.CollatorOptions = {
      numeric: true,
      sensitivity: 'base',
    };

    const byLabel = (a: VpkNode, b: VpkNode) => {
      return a.label.localeCompare(b.label, undefined, sortOptions);
    };

    this.forEachNode(root, (node) => {
      node.children?.sort(byLabel);
    });

    return root;
  }
  forEachNode(node: VpkNode, func: (node: VpkNode) => void) {
    func(node);
    node.children?.forEach((child) => this.forEachNode(child, func));
  }
}

export interface VpkNode {
  label: string;
  children?: VpkNode[];
}

export interface VpkExtensionEntry {
  extension: string;
  paths: VpkPathEntry[];
}

export interface VpkPathEntry {
  path: string;
  files: VpkFileEntry[];
}

export interface VpkFileEntry {
  fileName: string;
  extension: string;
  path: string;
  file: string;
  crc: number;
  preloadBytes: number;
  archiveIndex: number;
  entryOffset: number;
  entryLength: number;
  terminator: number;
  dirFileOffset: number;
}

export interface VpkReaderOptions {
  dirFile: string;
  onReadFileEntry?: (entry: VpkFileEntry) => void;
}

export class SourceBuffer {
  protected buffer: Uint8Array;

  #offset = 0;
  #view: DataView;
  #decoder = new TextDecoder('ascii');

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
    this.#view = new DataView(buffer.buffer);
  }

  get offset() {
    return this.#offset;
  }

  get size() {
    return this.#view.buffer.byteLength;
  }

  toArray(autoShrink = true) {
    autoShrink && this.shrinkToFit();
    return this.buffer;
  }

  seek(offset: number) {
    this.#offset = offset;
  }

  jump(offset: number, callback: () => void) {
    const previousOffset = this.#offset;
    this.#offset = offset;
    callback();
    this.#offset = previousOffset;
  }

  consume(bytes: number) {
    const oldOffset = this.#offset;
    this.#offset += bytes;
    return oldOffset;
  }

  alloc(bytes: number) {
    const newSize = this.#offset + bytes;
    if (newSize > this.size) {
      // FIXME: Use ArrayBuffer.prototype.transfer() once it lands.
      const alignedSize = (newSize + (4 - (newSize % 4))) * 2;
      const newBuffer = new Uint8Array(alignedSize);
      this.#view = new DataView(newBuffer.buffer);
      newBuffer.set(this.buffer, 0);
      this.buffer = newBuffer;
    }

    return this.consume(bytes);
  }

  shrinkToFit() {
    const newSize = this.#offset;
    if (newSize < this.size) {
      const newBuffer = new Uint8Array(newSize);
      this.#view = new DataView(newBuffer.buffer);
      newBuffer.set(this.buffer.slice(0, newSize), 0);
      this.buffer = newBuffer;
    }
  }

  readUint8() {
    const offset = this.consume(1);
    return this.#view.getUint8(offset);
  }
  readUint16(littleEndian = true) {
    const offset = this.consume(2);
    return this.#view.getUint16(offset, littleEndian);
  }
  readUint32(littleEndian = true) {
    const offset = this.consume(4);
    return this.#view.getUint32(offset, littleEndian);
  }
  readASCIIString() {
    const start = this.#offset;
    let char = this.readUint8();
    while (char !== 0x00) {
      char = this.readUint8();
    }
    const bytes = this.#view.buffer.slice(start, this.#offset - 1);
    return this.#decoder.decode(bytes);
  }

  writeUint8(value: number) {
    const offset = this.alloc(1);
    return this.#view.setUint8(offset, value);
  }
  writeUint16(value: number, littleEndian = true) {
    const offset = this.alloc(2);
    return this.#view.setUint16(offset, value, littleEndian);
  }
  writeUint32(value: number, littleEndian = true) {
    const offset = this.alloc(4);
    return this.#view.setUint32(offset, value, littleEndian);
  }
  writeASCIIString(value: string) {
    const bytes = Uint8Array.from(value, (c) => c.charCodeAt(0));
    const offset = this.alloc(bytes.byteLength + 1);
    this.buffer.set(bytes, offset);
  }
}

Deno.test('SourceBuffer', () => {
  const buf = new SourceBuffer(new Uint8Array(0));

  buf.writeUint8(0x01);
  buf.writeUint8(0x02);
  buf.writeUint16(3);
  buf.writeUint32(0x04);
  buf.writeASCIIString('ABC');

  assertEquals(buf.offset, 12);

  buf.seek(0);

  assertEquals(buf.offset, 0);

  assertEquals(buf.readUint8(), 0x01);
  assertEquals(buf.readUint8(), 0x02);
  assertEquals(buf.readUint16(), 0x03);
  assertEquals(buf.readUint32(), 0x04);
  assertEquals(buf.readASCIIString(), 'ABC');

  assertEquals(buf.offset, 12);
});

export const readVpk = async (options: VpkReaderOptions): Promise<Vpk> => {
  const file = await Deno.readFile(options.dirFile);
  const buf = new SourceBuffer(file);

  const signature = buf.readUint32();
  if (signature !== 0X55AA1234) {
    throw new Error('Not a VPK dir file!');
  }

  const version = buf.readUint32();
  if (version !== 1) {
    throw new Error('Only VPK version 1 is supported!');
  }

  const treeSize = buf.readUint32();

  const extensions: VpkExtensionEntry[] = [];
  const entries: VpkFileEntry[] = [];
  let paths: VpkPathEntry[] = [];

  while (true) {
    const extension = buf.readASCIIString();
    if (!extension.length) {
      break;
    }

    extensions.push({
      extension,
      paths,
    });

    let files: VpkFileEntry[] = [];

    while (true) {
      const path = buf.readASCIIString();
      if (!path.length) {
        break;
      }

      paths.push({
        path,
        files,
      });

      while (true) {
        const file = buf.readASCIIString();
        if (!file.length) {
          break;
        }

        const dirFileOffset = buf.offset;

        const entry = {
          fileName: `${path}/${file}.${extension}`,
          extension,
          path,
          file,
          crc: buf.readUint32(),
          preloadBytes: buf.readUint16(),
          archiveIndex: buf.readUint16(),
          entryOffset: buf.readUint32(),
          entryLength: buf.readUint32(),
          terminator: buf.readUint16(),
          dirFileOffset,
        };

        options.onReadFileEntry && options.onReadFileEntry(entry);

        files.push(entry);
        entries.push(entry);
      }

      files = [];
    }

    paths = [];
  }

  const vpk = {
    signature,
    version,
    treeSize,
    extensions,
    entries,
    dirFile: options.dirFile,
    toTree: function () {
      return new VpkTree(this);
    },
  };

  return vpk;
};

export const createVpk = (options: VpkReaderOptions): Vpk => {
  const extensions: VpkExtensionEntry[] = [];
  const entries: VpkFileEntry[] = [];
  const vpk = {
    signature: 0X55AA1234,
    version: 1,
    treeSize: 0,
    extensions,
    entries,
    dirFile: options.dirFile,
    toTree: function () {
      return new VpkTree(this);
    },
  };

  return vpk;
};

export const updateVpk = async (dirFile: string, entries: VpkFileEntry[]) => {
  const file = await Deno.readFile(dirFile);
  const buf = new SourceBuffer(file);

  for (const entry of entries) {
    buf.seek(entry.dirFileOffset);
    buf.writeUint32(entry.crc);
    buf.writeUint16(entry.preloadBytes);
    buf.writeUint16(entry.archiveIndex);
    buf.writeUint32(entry.entryOffset);
    buf.writeUint32(entry.entryLength);
    buf.writeUint16(entry.terminator);
    console.log(
      `Modified ${entry.fileName} at offset 0x${entry.dirFileOffset.toString(16)}`,
    );
  }

  await Deno.writeFile(dirFile, file);
};

export const mergeVpk = async (
  dirFile: string,
  vpk: Vpk,
  toMerge: Map<string, (Partial<VpkFileEntry> & { sourceFile: string })[]>,
  dryRun: boolean,
) => {
  const allMerges = [...toMerge.values()];
  const addedSize = allMerges.reduce((size, merges) => {
    const paths = new Set(merges.map((merge) => merge.path!));
    const existingPaths = new Set(
      vpk.extensions.map((extension) => extension.paths.map((path) => path.path)).flat(),
    );

    existingPaths.forEach((existingPath) => {
      if (paths.has(existingPath)) {
        paths.delete(existingPath);
      }
    });

    const pathsSize = [...paths.values()].reduce((sum, path) => {
      return sum + path.length + 1;
    }, 0);

    const filesSize = merges.reduce((sum, merge) => {
      return sum + (merge.file!.length + 1) + 18;
    }, 0);

    return size + pathsSize + filesSize;
  }, 0);

  vpk.treeSize += addedSize;

  const buffer = new Uint8Array(12 + vpk.treeSize);
  const buf = new SourceBuffer(buffer);

  const dir = dirname(dirFile);

  const mergeNames = allMerges.map((merges) => merges.map((merge) => merge.fileName)).flat();

  const curArchive = {
    archiveIndex: (vpk.entries.length
      ? Math.max(
        ...vpk.entries.filter((entry) => !mergeNames.includes(entry.fileName))
          .map((entry) => entry.archiveIndex),
      )
      : 0) +
      1,
    entryOffset: 0,
    get file() {
      return join(
        dir,
        `pak01_${this.archiveIndex.toString().padStart(3, '0')}.vpk`,
      );
    },
  };

  if (!dryRun) {
    try {
      await Deno.truncate(curArchive.file);
      // deno-lint-ignore no-empty
    } catch {
    }
  }

  const checkArchiveSize = async (size: number) => {
    if (curArchive.entryOffset + size > 200_000_000) {
      curArchive.archiveIndex += 1;
      curArchive.entryOffset = 0;
      if (!dryRun) {
        try {
          await Deno.truncate(curArchive.file);
          // deno-lint-ignore no-empty
        } catch {
        }
      }
    }
  };

  buf.writeUint32(vpk.signature);
  buf.writeUint32(vpk.version);
  buf.writeUint32(vpk.treeSize);

  crcInit();

  for (const { extension, paths } of vpk.extensions) {
    buf.writeASCIIString(extension);

    const merges = toMerge.get(extension) ?? [];

    for (const { path, files } of paths) {
      buf.writeASCIIString(path);

      const filesToAdd = merges.filter((merge) => merge.path === path);
      for (const file of files) {
        if (filesToAdd.some((merge) => merge.file === file.file)) {
          console.log('Removed original', file.fileName);
          // TODO: Actually delete
          continue;
        }

        buf.writeASCIIString(file.file);
        buf.writeUint32(file.crc);
        buf.writeUint16(file.preloadBytes);
        buf.writeUint16(file.archiveIndex);
        buf.writeUint32(file.entryOffset);
        buf.writeUint32(file.entryLength);
        buf.writeUint16(file.terminator);
      }

      for (const file of filesToAdd) {
        const source = await Deno.readFile(file.sourceFile);
        buf.writeASCIIString(file.file!);
        buf.writeUint32(crcCompute(source));
        buf.writeUint16(0);

        const size = source.byteLength;
        await checkArchiveSize(size);

        buf.writeUint16(curArchive.archiveIndex);
        buf.writeUint32(curArchive.entryOffset);
        curArchive.entryOffset += size;

        buf.writeUint32(size);
        buf.writeUint16(0xffff);

        if (!dryRun) {
          await Deno.writeFile(curArchive.file, source, {
            create: true,
            append: true,
          });
        }

        console.log('Added to path', file.fileName);

        merges.splice(merges.indexOf(file), 1);
      }

      buf.writeASCIIString('');
    }

    const newPaths = merges.reduce((paths, file) => {
      const files = paths.get(file.path!);
      if (files) {
        files.push(file);
      } else {
        paths.set(file.path!, [file]);
      }
      return paths;
    }, new Map<string, (Partial<VpkFileEntry> & { sourceFile: string })[]>());

    for (const [path, files] of newPaths.entries()) {
      console.log('Adding new path', path);

      buf.writeASCIIString(path);

      for (const file of files) {
        const source = await Deno.readFile(file.sourceFile);
        buf.writeASCIIString(file.file!);
        buf.writeUint32(crcCompute(source));
        buf.writeUint16(0);

        const size = source.byteLength;
        await checkArchiveSize(size);

        buf.writeUint16(curArchive.archiveIndex);
        buf.writeUint32(curArchive.entryOffset);
        curArchive.entryOffset += size;

        buf.writeUint32(size);
        buf.writeUint16(0xffff);

        if (!dryRun) {
          await Deno.writeFile(curArchive.file, source, {
            create: true,
            append: true,
          });
        }

        console.log('Added', file.fileName);
      }

      buf.writeASCIIString('');
    }

    buf.writeASCIIString('');
  }
  buf.writeASCIIString('');

  if (!dryRun) {
    await Deno.writeFile(dirFile, buf.toArray());
  }
};

export const packVpk = async (
  dirFile: string,
  vpk: Vpk,
  toPack: Map<string, (Partial<VpkFileEntry> & { sourceFile: string })[]>,
  dryRun: boolean,
) => {
  const buf = new SourceBuffer(new Uint8Array(1024));

  const dir = dirname(dirFile);

  const curArchive = {
    archiveIndex: 1,
    entryOffset: 0,
    get file() {
      return join(
        dir,
        `pak01_${this.archiveIndex.toString().padStart(3, '0')}.vpk`,
      );
    },
  };

  if (!dryRun) {
    try {
      await Deno.truncate(curArchive.file);
      // deno-lint-ignore no-empty
    } catch {
    }
  }

  const checkArchiveSize = async (size: number) => {
    if (curArchive.entryOffset + size > 200_000_000) {
      curArchive.archiveIndex += 1;
      curArchive.entryOffset = 0;
      if (!dryRun) {
        try {
          await Deno.truncate(curArchive.file);
          // deno-lint-ignore no-empty
        } catch {
        }
      }
    }
  };

  buf.writeUint32(vpk.signature);
  buf.writeUint32(vpk.version);
  buf.consume(4);

  const treeStartOffset = buf.offset;

  crcInit();

  for (const { extension, paths } of vpk.extensions) {
    buf.writeASCIIString(extension);

    const merges = toPack.get(extension) ?? [];

    for (const { path, files } of paths) {
      buf.writeASCIIString(path);

      const filesToAdd = merges.filter((merge) => merge.path === path);
      for (const file of files) {
        if (filesToAdd.some((merge) => merge.file === file.file)) {
          console.log('Removed original', file.fileName);
          // TODO: Actually delete
          continue;
        }

        buf.writeASCIIString(file.file);
        buf.writeUint32(file.crc);
        buf.writeUint16(file.preloadBytes);
        buf.writeUint16(file.archiveIndex);
        buf.writeUint32(file.entryOffset);
        buf.writeUint32(file.entryLength);
        buf.writeUint16(file.terminator);
      }

      for (const file of filesToAdd) {
        const source = await Deno.readFile(file.sourceFile);
        buf.writeASCIIString(file.file!);
        buf.writeUint32(crcCompute(source));
        buf.writeUint16(0);

        const size = source.byteLength;
        await checkArchiveSize(size);

        buf.writeUint16(curArchive.archiveIndex);
        buf.writeUint32(curArchive.entryOffset);
        curArchive.entryOffset += size;

        buf.writeUint32(size);
        buf.writeUint16(0xffff);

        if (!dryRun) {
          await Deno.writeFile(curArchive.file, source, {
            create: true,
            append: true,
          });
        }

        console.log('Added to path', file.fileName);

        merges.splice(merges.indexOf(file), 1);
      }

      buf.writeASCIIString('');
    }

    const newPaths = merges.reduce((paths, file) => {
      const files = paths.get(file.path!);
      if (files) {
        files.push(file);
      } else {
        paths.set(file.path!, [file]);
      }
      return paths;
    }, new Map<string, (Partial<VpkFileEntry> & { sourceFile: string })[]>());

    for (const [path, files] of newPaths.entries()) {
      console.log('Adding new path', path);

      buf.writeASCIIString(path);

      for (const file of files) {
        const source = await Deno.readFile(file.sourceFile);
        buf.writeASCIIString(file.file!);
        buf.writeUint32(crcCompute(source));
        buf.writeUint16(0);

        const size = source.byteLength;
        await checkArchiveSize(size);

        buf.writeUint16(curArchive.archiveIndex);
        buf.writeUint32(curArchive.entryOffset);
        curArchive.entryOffset += size;

        buf.writeUint32(size);
        buf.writeUint16(0xffff);

        if (!dryRun) {
          await Deno.writeFile(curArchive.file, source, {
            create: true,
            append: true,
          });
        }

        console.log('Added', file.fileName);
      }

      buf.writeASCIIString('');
    }

    buf.writeASCIIString('');
  }
  buf.writeASCIIString('');

  vpk.treeSize = buf.offset - treeStartOffset;

  buf.jump(treeStartOffset - 4, () => {
    buf.writeUint32(vpk.treeSize);
  });

  if (!dryRun) {
    await Deno.writeFile(dirFile, buf.toArray());
  }
};
