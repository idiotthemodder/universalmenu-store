# UniversalMenu plugin store

Plugins for the UniversalMenu Frida menu, installable from the **Store** tab of the vrfrida Quest app.
The app reads [`index.json`](index.json) and checks for plugin updates by itself.

| Folder | What |
|---|---|
| `official/` | **Trusted** plugins by idiotthemodder. They auto-update silently. |
| `community/` | **Untrusted** uploads. Anyone can upload one from the app. Each is approved by hand before it shows up here, but **approval is not a security review**. The app shows a warning, a safety scan and the code before installing, and asks again (showing what changed) on every update. |
| `scan_rules.json` | Patterns the safety scan looks for (networking, shell commands, account tokens, obfuscation...). The app downloads these too. |
| `tools/store.py` | Maintainer tool: sync official plugins, review / approve / reject uploads, rebuild the index. |

## Before you install a community plugin

A plugin runs inside the game with the same access as the game itself: your game account, its saves,
anything the game can reach on the network. **Read the code first.** The scan is a pattern check, not a
guarantee: clever or obfuscated code can hide from it. Be very suspicious of anything that:

- sends data to the internet (especially Discord webhooks, Telegram bots, paste sites, raw IP addresses)
- runs shell commands, or uses `eval` / `new Function` / downloads more code
- reads tokens, passwords or other apps' folders
- is obfuscated or minified (`_0x1a2b` names, long `\x..` strings, giant base64 blobs)

## Uploading

Store tab -> **Upload a plugin**. Pick a `.js` from `/sdcard/vrfrida/plugins` (it needs a `// game: <package>` line
in its first lines), add a name and description, and submit. It waits in a queue until it's approved.

## Maintainer

    python tools/store.py sync               # after changing plugins in ~/Mods/imgui_plugins or official.json
    python tools/store.py publish -m "msg"
    python tools/store.py pending            # uploads waiting
    python tools/store.py show <id>          # download to review/ + scan. READ IT.
    python tools/store.py approve <id> [--as <plugin-id>]
    python tools/store.py reject <id>
