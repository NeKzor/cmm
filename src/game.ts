// Copyright (c) 2024, NeKz
// SPDX-License-Identifier: MIT

export const modifyGameInfo = async (file: string) => {
  const txt = await Deno.readTextFile(file);
  const lines = txt.split('\n');

  let gamePathIndex = -1;
  let cmmModIndex = -1;
  let dlc1Index = -1;
  let dlc2Index = -1;

  lines.forEach((line, index) => {
    const split = line.trim().split(/\s+/g);
    const type = split.at(0)?.toLowerCase();
    const path = split.at(1)?.toLowerCase();

    if (type === 'game' && path === '|gameinfo_path|.') {
      gamePathIndex = index;
    } else if (type === 'mod' && path === 'cmm') {
      cmmModIndex = index;
    } else if (type === 'game' && path === 'portal2_dlc1') {
      dlc1Index = index;
    } else if (type === 'game' && path === 'portal2_dlc2') {
      dlc2Index = index;
    }
  });

  if (gamePathIndex === -1 || dlc2Index === -1 || gamePathIndex > dlc2Index) {
    return `Found malformed gameinfo.txt.`;
  }

  if (cmmModIndex !== -1 && dlc1Index !== -1) {
    return false;
  }

  const modified: string[] = [...lines.slice(0, gamePathIndex)];

  if (cmmModIndex === -1) {
    modified.push('\t\tMod\t\t\t\tcmm');
  }

  modified.push(...lines.slice(gamePathIndex, dlc2Index));

  if (dlc1Index === -1) {
    modified.push('\t\tGame\t\t\t\tportal2_dlc1');
  }

  modified.push(...lines.slice(dlc2Index));

  await Deno.writeTextFile(file, modified.join('\n'));

  return true;
};
