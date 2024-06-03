[![Deno CI](https://github.com/NeKzor/cmm/actions/workflows/CI.yml/badge.svg)](https://github.com/NeKzor/cmm/actions/workflows/CI.yml)
[![Release CD](https://github.com/NeKzor/cmm/actions/workflows/CD.yml/badge.svg)](https://github.com/NeKzor/cmm/actions/workflows/CD.yml)

# Challenge Mode Mod

Challenge mode for Portal 2 mods.

## Requirements

- Portal 2 installed
- [SourceAutoRecord]

[SourceAutoRecord]: https://sar.portal2.sr

## Supported Mods

| Game                       | Status   | Leaderboard              |
| -------------------------- | -------- | ------------------------ |
| Portal Stories: Mel        | Released | [mel.board.portal2.sr]   |
| Aperture Tag               | Planned  | [aptag.board.portal2.sr] |
| Thinking with Time Machine | -        | -                        |
| Portal Reloaded            | -        | -                        |

[mel.board.portal2.sr]: https://mel.board.portal2.sr
[aptag.board.portal2.sr]: https://aptag.board.portal2.sr

## Autosubmit

- Log in with your Steam account to one of the leaderboards
- Go to `Edit profile`
- Click `Generate` and then `Download` to get your key file
- Place the downloaded file into the game's folder e.g. `Portal Stories Mel`

## Installation

### Installer

- Download and run the latest cmm binary for [Windows][windows-release] or for [Linux][linux-release].

[windows-release]: https://github.com/NeKzor/cmm/releases/latest/download/cmm-windows.zip
[linux-release]: https://github.com/NeKzor/cmm/releases/latest/download/cmm-linux.zip

### Manual

- Download the contents for the game:
  - [cmm-aperturetag.zip][cmm-aperturetag]
  - [cmm-portal_stories.zip][cmm-portal_stories]
- Go to the game's folder `Portal Stories Mel`
- Create a new folder called `cmm`
- Extract all files from the downloaded archive into `cmm`
- Copy `portal2_dlc1` from `Portal 2` into the game's folder
- Move `cmm/challenge_maplist.txt` to replace `portal2_dlc1/challenge_maplist.txt`
- Modify `gameinfo.txt` in `portal_stories`
  - Add `mod cmm` before `game |gameinfo_path|.`
  - Add `game portal2_dlc1` before `game portal2_dlc2`

[cmm-aperturetag]: https://github.com/NeKzor/cmm/releases/latest/download/cmm-aperturetag.zip
[cmm-portal_stories]: https://github.com/NeKzor/cmm/releases/latest/download/cmm-portal_stories.zip

### Uninstall

Revert above steps + "Verify integrity of game files" via Steam.

## Contributing

[Deno] is required to pack the VPK files and when working with the installer.

[Deno]: https://deno.com

- Use `deno task pack:aptag` or `deno task pack:mel` to create the VPK files.
  - Move the created files into the game's `cmm` folder
    - `pak01_001.vpk`
    - `pak01_dir.vpk`
  - Make sure that `portal2_dlc1` is copied from `Portal 2` to the game's folder
  - Copy `challenge_maplist.txt` into `poratl2_dlc1`
- The installer can be tested with: `deno task run -s` (the `-s` flag will skip the download from the repository)

## Credits

- Rex (menu)
- hero (SAR)
- Nidboj132 (testing)
- sear (screenshots, testing)
