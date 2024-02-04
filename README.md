# Challenge Mode Mod

Challenge mode for Portal 2 mods.

## Requirements

- Portal 2 installed
- [SourceAutoRecord 1.13.0+]

[SourceAutoRecord 1.13.0+]: https://sar.portal2.sr

## Supported Mods

| Game                       | Status  | Leaderboard              |
| -------------------------- | ------- | ------------------------ |
| Portal Stories: Mel        | Soon    | [mel.board.nekz.me]      |
| Aperture Tag               | Planned | [aptag.board.nekz.me]    |
| Thinking with Time Machine | Planned | [twtm.board.nekz.me]     |
| Portal Reloaded            | Planned | [reloaded.board.nekz.me] |

[mel.board.nekz.me]: https://mel.board.nekz.me
[aptag.board.nekz.me]: https://aptag.board.nekz.me
[twtm.board.nekz.me]: https://twtm.board.nekz.me
[reloaded.board.nekz.me]: https://reloaded.board.nekz.me

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
  - [cmm-portal_stories.zip][cmm-portal_stories]
- Go to the game's folder `Portal Stories Mel`
- Create a new folder called `cmm`
- Extract all files from the downloaded archive into `cmm`
- Copy `portal2_dlc1` from `Portal 2` into the game's folder
- Modify `gameinfo.txt` in `portal_stories`
  - Add `mod cmm` before `game |gameinfo_path|.`
  - Add `game portal2_dlc1` before `game portal2_dlc2`

[cmm-portal_stories]: https://github.com/NeKzor/cmm/releases/latest/download/cmm-portal_stories.zip

### Uninstall

Revert above steps + "Verify integrity of game files" via Steam.

## Credits

- Rex (menu)
- Sear (screenshots, testing)
- Nidboj132 (testing)
- Zyntex (SAR)
