// game: com.armoredpigstudios.beathimup
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ⚡ THOOMS BUDDY BEATDOWN  ·  LITE  ⚡                            ║
// ║  🥊 Buddy Beatdown plugin for the universal Frida menu (Quest 3) ║
// ╚══════════════════════════════════════════════════════════════════╝
//
//  ✦ WHAT IT IS
//    A cut-down, freeze-safe port of the THOOMS V34 menu. It installs NO native hooks at
//    load. Everything works by reading and writing game fields or calling game methods,
//    either from a button or from throttled onFrame code (🧠 checked against the il2cpp dump).
//
//  ✦ WHAT YOU GET
//    🕊️  Player       fly (hold B), speed hack, networked head size (others see it)
//    🔫  Combat       one-shot guns, no ability cooldown
//    🌐  Net fun      gorilla mode, doors, trebuchet, explosion, npc rings (all synced)
//    😀  Faces        force buddy emotions (EmotionManager), be-nice button
//    🎩  Hats & cape  free hats via the networked SetHat, cape wave boost
//    🧟  Zombies      size / health / speed / damage, fast fire, zero recoil & spread,
//                      zombie armies, UltimateZombie
//    📏  Item size    scale held items (owned items only)
//    🎨  Name & skin  name bypass, rainbow name/skin, color tags, anime skin, saved names
//    🛡️  OP tools     kill gun, noclip, damage in safezones (kill anywhere), unlock abilities
//    📈  Progression  set level / prestige
//    📦  Spawn        any item, truck, UFO
//    💰  Economy      add money, 500 SP
//    🧹  Wipes        level / prestige / money / SP resets (⚠ touches your save)
//
//  ✦ HOW IT STAYS SAFE
//    ● Hooks only exist when you ask for them (name bypass, safezone damage) and are
//      forced OFF at every launch, so a saved setting can't crash the game on startup.
//    ● Scene scans (abilities, cooldowns, name tags) run at most once per second.
//
//  ✦ NOT HERE ON PURPOSE
//    ✖ infinite ammo / damage / no recoil / unlock everything / OP stats /
//      aimbot / fast lasers / infinite beam / thumbstick scaling / unlimited zombies
//      → buddy_beatdown.js covers ammo, recoil, unlocks, god mode and kills.
//
//  ✦ USE IT RIGHT
//    ⚠ Kill gun and safezone damage hit real players. Private rooms only.
//    ℹ Names and skin colors change live (synced model) and are also saved to PlayerPrefs for the next launch.
//
"use strict";

// ---------------------------------------------------------------- props helpers

var NAME_COLORS = [
    ["Red", "FF3131"], ["Orange", "FF7A00"], ["Yellow", "FFFF00"], ["Green", "00FF00"],
    ["Blue", "0066FF"], ["Cyan", "00FFFF"], ["Purple", "8000FF"], ["Pink", "FF1493"],
    ["Black", "000000"], ["White", "FFFFFF"], ["Brown", "8B4513"]
];

// Exact 4-line name, colored with TextMeshPro rich-text tags:
//   "mods,"      -> blue
//   "gay"        -> rainbow (per-letter red / green / blue)
//   "singularity"-> purple
// Everything else is left at the game's default color.
var EXACT_PLAYER_NAME =
    "idiot\n" +
    "i make <color=#0066FF>mods,</color> im <color=#FF0000>g</color><color=#00FF00>a</color><color=#0000FF>y</color>\n" +
    "rooted my headset with <color=#8000FF>singularity</color>\n" +
    "dont ask for mods, they're private";

var CUSTOM_NAMES = [
    ["Invisible name", "PLAYERNAME", ""],
    ["Name: idiot (4 lines, blue/rainbow/purple)", "PLAYERNAME", EXACT_PLAYER_NAME],
    ["Name THOOM (cyan)", "PLAYERNAME", "<color=#00FFFF>THOOM</color>"],
    ["Name THOOM (red)", "PLAYERNAME", "<color=#FF3131>THOOM</color>"],
    ["Name THOOM (blue)", "PLAYERNAME", "<color=#0066FF>THOOM</color>"],
    ["Name THOOM (green)", "PLAYERNAME", "<color=#00FF00>THOOM</color>"],
    ["Name THOOM (pink)", "PLAYERNAME", "<color=#FF1493>THOOM</color>"],
    ["Name THOOM (black)", "PLAYERNAME", "<color=#000000>THOOM</color>"],
    ["Name THOOM (white)", "PLAYERNAME", "<color=#FFFFFF>THOOM</color>"],
    ["Name THOOM (yellow)", "PLAYERNAME", "<color=#FFFF00>THOOM</color>"],
    ["Name THOOM (orange)", "PLAYERNAME", "<color=#FF7A00>THOOM</color>"],
    ["Name THOOM (brown)", "PLAYERNAME", "<color=#8B4513>THOOM</color>"],
    ["Name Z (neon yellow)", "PLAYERNAME", "<color=#FFFF00>Z</color>"],
    ["Name l (neon purple)", "PLAYERNAME", "<color=#BF00FF>l</color>"],
    ["Buddy name adrian (green)", "BUDDYNAME", "<color=#00FF00>adrian christian Hernandez or as the locals call me \"A\"</color>"],
    ["Buddy name red", "BUDDYNAME", "<color=#FF3131>gay porn watcher&#11015;</color>"],
    ["Buddy name GAME SKIDDED", "BUDDYNAME", "<size=100><color=#FF3131>GAME SKIDDED</color></size>"]
];


// ---- name preset helpers (TextMeshPro rich text: <color>, <size>, <b>, <i>, <u>, <cspace>)
function nmC(hex, text) { return "<color=#" + hex + ">" + text + "</color>"; }
function nmHex(h) { return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
function nmMix(h1, h2, t) {
    var a = nmHex(h1), b = nmHex(h2), o = "";
    for (var i = 0; i < 3; i++) { var v = Math.round(a[i] + (b[i] - a[i]) * t).toString(16); o += (v.length < 2 ? "0" : "") + v; }
    return o.toUpperCase();
}
// per-letter gradient from one hex to another (spaces are left uncolored)
function nmGrad(text, h1, h2) {
    var chars = String(text).split(""), n = Math.max(1, chars.length - 1), out = "";
    for (var i = 0; i < chars.length; i++) out += chars[i] === " " ? " " : nmC(nmMix(h1, h2, i / n), chars[i]);
    return out;
}
var NM_RAINBOW = ["FF3131", "FF7A00", "FFFF00", "00FF00", "00FFFF", "0066FF", "8000FF", "FF1493"];
function nmRainbow(text) {
    var chars = String(text).split(""), out = "", k = 0;
    for (var i = 0; i < chars.length; i++) {
        if (chars[i] === " ") { out += " "; continue; }
        out += nmC(NM_RAINBOW[k++ % NM_RAINBOW.length], chars[i]);
    }
    return out;
}

CUSTOM_NAMES = CUSTOM_NAMES.concat([
    ["Bio: modder (rainbow header)", "PLAYERNAME",
        nmRainbow("✦ M O D D E R ✦") + "\n" +
        nmC("FFFFFF", "◆ builds menus for fun ◆") + "\n" +
        nmC("00FFFF", "➤ frida · il2cpp · quest 3") + "\n" +
        nmC("AAAAAA", "<size=70%>(yes, it's all my code)</size>")],
    ["Bio: rooted Quest (purple/cyan)", "PLAYERNAME",
        nmGrad("☄ ROOTED HEADSET ☄", "8000FF", "00FFFF") + "\n" +
        nmC("FFFFFF", "⚡ singularity root, no regrets") + "\n" +
        nmC("BF00FF", "❖ ") + nmC("00FFFF", "adb over wifi, pray for me") + nmC("BF00FF", " ❖")],
    ["Bio: private mods, don't ask", "PLAYERNAME",
        nmC("FF3131", "☠ DON'T ASK FOR MODS ☠") + "\n" +
        nmC("FFFFFF", "they're private") + "\n" +
        nmC("FF7A00", "✖ no menu · no leaks · no dms") + "\n" +
        nmC("AAAAAA", "<size=70%>skill issue is not a bug report</size>")],
    ["Bio: night owl (blue/white)", "PLAYERNAME",
        nmGrad("☾ NIGHT OWL ☾", "0066FF", "FFFFFF") + "\n" +
        nmC("FFFFFF", "★ lights off, leds on ★") + "\n" +
        nmC("66AAFF", "✧ playing since the sun went down ✧")],
    ["Bio: fire (red to yellow)", "PLAYERNAME",
        nmGrad("🔥 B U R N 🔥", "FF0000", "FFFF00") + "\n" +
        nmGrad("▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲", "FF3131", "FFD000") + "\n" +
        nmC("FF7A00", "⚔ hands are weapons ⚔")],
    ["Bio: ice (cyan to white)", "PLAYERNAME",
        nmGrad("❄ F R O S T B I T E ❄", "00BFFF", "FFFFFF") + "\n" +
        nmC("CFF4FF", "◇ ◇ ◇ cold hands, hot takes ◇ ◇ ◇") + "\n" +
        nmC("66DDFF", "<i>don't touch the ice</i>")],
    ["Bio: toxic green", "PLAYERNAME",
        nmGrad("☣ T O X I C ☣", "00FF00", "CCFF00") + "\n" +
        nmC("00FF66", "▸ radioactive since level 1") + "\n" +
        nmC("AAFFAA", "<size=70%>handle with gloves</size>")],
    ["Bio: royal gold", "PLAYERNAME",
        nmGrad("♛ THE KING ♛", "FFD700", "FFFFFF") + "\n" +
        nmC("FFD700", "✦ prestige 100 ✦ level 100 ✦") + "\n" +
        nmC("FFFFFF", "bow before the buddy")],
    ["Bio: sakura pink", "PLAYERNAME",
        nmGrad("✿ S A K U R A ✿", "FF69B4", "FFFFFF") + "\n" +
        nmC("FFB6E1", "❀ soft hands, hard punches ❀") + "\n" +
        nmC("FF1493", "♥ ") + nmC("FFFFFF", "be nice to me") + nmC("FF1493", " ♥")],
    ["Bio: big THOOM + tiny subtitle", "PLAYERNAME",
        "<size=150%>" + nmGrad("THOOM", "FF3131", "8000FF") + "</size>" + "\n" +
        nmC("FFFFFF", "<size=60%>▸ buddy beatdown · modded ◂</size>")],
    ["Bio: stats card", "PLAYERNAME",
        nmC("00FFFF", "┌─ ") + nmC("FFFFFF", "PLAYER CARD") + nmC("00FFFF", " ─┐") + "\n" +
        nmC("FFD700", "★ LVL 100   ♛ PRESTIGE 100") + "\n" +
        nmC("FF3131", "☠ kills: lost count") + "\n" +
        nmC("00FFFF", "└──────────────┘")],
    ["Bio: matrix", "PLAYERNAME",
        nmGrad("0 1 0 1 1 0 1 0 0 1", "003300", "00FF00") + "\n" +
        nmC("00FF00", "▮ WAKE UP, BUDDY ▮") + "\n" +
        nmGrad("1 0 1 0 0 1 0 1 1 0", "00FF00", "003300")],
    ["Bio: glitch", "PLAYERNAME",
        nmC("FF0044", "G") + nmC("00FFEE", "L") + nmC("FF0044", "I") + nmC("00FFEE", "T") + nmC("FF0044", "C") + nmC("00FFEE", "H") + "\n" +
        nmC("FFFFFF", "<cspace=0.3em>E R R O R  4 0 4</cspace>") + "\n" +
        nmC("AAAAAA", "<size=70%>name not found</size>")],
    ["Bio: warning label", "PLAYERNAME",
        nmC("FFFF00", "▲ WARNING ▲") + "\n" +
        nmC("FFFFFF", "may punch without notice") + "\n" +
        nmC("FF7A00", "⚡ high voltage · high ping ⚡")],
    ["Bio: all-in-one flex", "PLAYERNAME",
        nmRainbow("★ THOOM ★") + "\n" +
        nmC("FFFFFF", "✦ modder ✦ rooted ✦ night owl ✦") + "\n" +
        nmGrad("➤ frida · il2cpp · quest 3", "00FFFF", "BF00FF") + "\n" +
        nmC("FF3131", "☠ ") + nmC("AAAAAA", "dont ask for mods, they're private") + nmC("FF3131", " ☠")]
]);

var SPAWN_NAMES = [
    "EnergyBlast", "CrappyGun", "Silenced", "Shotgun", "FlameThrow", "Pinner", "Puncher",
    "Shield", "Dash", "Grapple", "Sprayer", "Taser", "Megaphone", "RPG", "StickGrenade",
    "Grenade", "HitMortar", "Mine", "Hammer", "Baseball", "Bat", "Pan", "Dumbell", "Guitar",
    "BasicSword", "Roller", "Shovel", "Claws", "Buzzsaw", "BrassKnuckles", "GreatAxe", "Katana",
    "Halberg", "BigClub", "Sledge", "Pipe", "Zanza", "GodHammer", "Pistol", "Revolver", "TommyGun",
    "Skorpion", "HeavyPistol", "FoamGun", "G18", "Sniper", "Minigun", "AKU", "SawedOff", "M249",
    "AR", "Crossbow", "HuntRifle", "AutoShotgun", "GrenadeLauncher", "Zombie", "ZombieFriend",
    "ZombieRifle", "ZombiePistol", "Truck", "UFO", "Nimbus", "GoKart", "Helicopter"
];

var ITEM_SIZES = ["0.01x", "0.1x", "0.2x", "0.25x", "0.5x", "1x", "5x", "10x", "20x", "25x", "50x", "75x", "100x"];

var defs = [
    { type: "label", label: "☼ THOOMS BUDDY BEATDOWN  ● LITE ●" },
    { type: "label", label: "► no startup hooks, so it can't freeze the game on load" },
    { type: "label", label: "► ammo / recoil / unlocks / god mode live in buddy_beatdown" },
    { type: "label", label: "► ● = on-demand hook (name bypass, safezones), off at launch" },
    { type: "label", label: "► ▲ = touches your save or other players, use private rooms" },
    { type: "label", label: "► if something misbehaves: turn it off, then check the log" },
    { type: "label", label: "" },
    { type: "label", label: "♦ PLAYER  ► movement" },
    { type: "bool", key: "fly", label: "Fly (hold B)", default: false, desc: "hold B / right secondary to thrust in the right hand's forward direction" },
    { type: "float", key: "flyForce", label: "Fly Force", min: 50, max: 2000, default: 500, decimals: 0 },
    { type: "bool", key: "speedHack", label: "Speed Hack", default: false, desc: "sets moveSpeed to the value below, original restored when off" },
    { type: "float", key: "speedValue", label: "Speed Value", min: 5, max: 100, default: 50, decimals: 0 },
    { type: "bool", key: "playerSize", label: "Networked Head Size", default: false, desc: "► scales your synced neck, so everyone sees a bigger or smaller head (whole body is not syncable)" },
    { type: "float", key: "playerSizeMul", label: "Head Size (x)", min: 0.1, max: 10, default: 2, decimals: 2 },

    { type: "label", label: "♦ COMBAT  ► guns & abilities" },
    { type: "bool", key: "oneShot", label: "One-Shot Guns", default: false, desc: "sets every gun's WeaponInfo Damage/HitDamage to 99999 (restored when off)" },
    { type: "bool", key: "quickFire", label: "Quick Fire", default: false, desc: "weapons fire again right away with full ammo (hooks every gun's TriggerPressed the first time you turn it on)" },
    { type: "bool", key: "noAbilityCooldown", label: "No Ability Cooldown", default: false },
    { type: "button", label: "Weapon Info (log)", onClick: function () { thWeaponInfo(); } },


    { type: "label", label: "♦ ZOMBIES  ► rifle zombie tuning & armies" },
    { type: "float", key: "zSize", label: "Zombie Size x", min: 0.01, max: 100, default: 1, decimals: 2 },
    { type: "float", key: "zHealth", label: "Zombie Health x", min: 0.01, max: 100, default: 1, decimals: 2 },
    { type: "float", key: "zSpeed", label: "Zombie Speed x", min: 0.01, max: 100, default: 1, decimals: 2 },
    { type: "float", key: "zDamage", label: "Zombie Damage x", min: 0.01, max: 100, default: 1, decimals: 2 },
    { type: "bool", key: "zRapid", label: "Zombie Fast Fire", default: false },
    { type: "bool", key: "zRecoil", label: "Zombie Zero Recoil", default: false },
    { type: "bool", key: "zSpread", label: "Zombie Zero Spread", default: false },
    { type: "button", label: "Apply Zombie Stats", onClick: function () { applyZombieAll(); } },
    { type: "int", key: "armyCount", label: "Army Count", min: 1, max: 100, default: 20 },
    { type: "button", label: "Spawn Zombie Army", onClick: function () { thZombieArmy("Zombie", p.armyCount); } },
    { type: "button", label: "Spawn Friendly Zombie Army", onClick: function () { thZombieArmy("ZombieFriend", p.armyCount); } },
    { type: "button", label: "Spawn Rifle Zombie Army", onClick: function () { thZombieArmy("ZombieRifle", p.armyCount); } },
    { type: "bool", key: "ultimateZombie", label: "UltimateZombie", default: false, desc: "spawns one rifle zombie and buffs it 900x HP / 10x speed / 1500 dmg" },

    { type: "label", label: "♦ ITEM SIZE  ► only items you own (Normcore)" },
    { type: "select", key: "itemScale", label: "Held Item Scale", options: ITEM_SIZES, default: "1x" },
    { type: "button", label: "Apply Held Item Size", onClick: function () { thHeldItemSize(parseFloat(p.itemScale)); } },


    { type: "label", label: "♦ NAME & SKIN  ► changes apply live (and are saved for next launch)" },
    { type: "bool", key: "animeSkin", label: "Anime Skin V2 (index 4)", default: false },
    { type: "bool", key: "nameBypass", label: "Name Bypass V34", default: false },
    { type: "bool", key: "rgbSkin", label: "RGB Skin (live)", default: false },
    { type: "bool", key: "rgbName", label: "Rainbow Name (networked)", default: false, desc: "every letter a different color, sent to everyone. other players only re-read names when your avatar spawns, so it can't animate smoothly for them" },
    { type: "float", key: "rgbEvery", label: "Rainbow Cycle Every (s, 0 = once)", min: 0, max: 30, default: 0, decimals: 0, desc: "re-sends the name with shifted colors. each re-send recreates your avatar, so keep it slow" },
    { type: "bool", key: "richName", label: "Color Name Tags (rich text)", default: false, desc: "keeps rich text on for player nameplates so the <color> tags in a saved name actually render" },
    { type: "text", key: "customName", label: "Custom Name", default: "", desc: "any name, rich text tags like <color=#ff0000> work" },
    { type: "button", label: "Apply Custom Name (live)", onClick: function () {
        if (!p.customName) { say("Type a name first"); return; }
        buddyName("PLAYERNAME", p.customName);
        say(thLastLive ? "Name changed live" : "Name saved, live change failed (see log)");
    } },
    { type: "bool", key: "namePush", label: "Name: Auto Push To Everyone", default: true, desc: "after any name change, recreates your avatar in place so every other player rebuilds your nameplate with the new name" },
    { type: "button", label: "Push Name Now (recreate avatar)", onClick: function () { try { thRecreateAvatar(); say("Avatar recreated"); } catch (e) { say("Push failed: " + e); } } },
    { type: "button", label: "Push Name (rejoin room, fallback)", desc: "if recreating the avatar does not work for others, this reconnects you to the room", onClick: function () {
        var i = currentPlayer(); if (!i) { say("Not in game"); return; }
        try { i.method("ReconnectToLobby").invoke(); } catch (e) { say("Rejoin failed: " + e); }
    } }
];

NAME_COLORS.forEach(function (c) {
    defs.push({ type: "button", label: "Name Color " + c[0], onClick: function () { thCommunityNameColor(c[1]); } });
});
NAME_COLORS.forEach(function (c) {
    defs.push({ type: "button", label: "Skin " + c[0], onClick: function () { buddySkin(c[1]); say(thLastLive ? "Skin " + c[0] + " applied live" : "Skin " + c[0] + " saved; restart game"); } });
});
defs.push(
    { type: "label", label: "► NAME PRESETS: pick one and press Apply, it changes live for everyone" },
    { type: "select", key: "namePreset", label: "Name Preset", options: CUSTOM_NAMES.map(function (n) { return n[0]; }), default: CUSTOM_NAMES[0][0], desc: "► multi-line names with colors, gradients and symbols (TextMeshPro rich text)" },
    { type: "button", label: "Apply Name Preset", onClick: function () {
        for (var i = 0; i < CUSTOM_NAMES.length; i++) {
            if (CUSTOM_NAMES[i][0] === p.namePreset) { buddyName(CUSTOM_NAMES[i][1], CUSTOM_NAMES[i][2]); say(thLastLive ? "Name changed live: " + CUSTOM_NAMES[i][0] : "Name saved: " + CUSTOM_NAMES[i][0] + ", restart game (live change failed, see log)"); return; }
        }
        say("Pick a name preset first");
    } }
);

defs.push(
    { type: "label", label: "♦ FACES  ► buddy emotions" },
    { type: "select", key: "faceEmotion", label: "Face", options: TH_EMOTIONS, default: "Angry", desc: "► emotion to force on every buddy (EmotionManager)" },
    { type: "bool", key: "faceLock", label: "Lock Face On All Buddies", default: false, desc: "► keeps the chosen emotion on, stops it from fading, re-applied twice a second" },
    { type: "button", label: "Apply Face Once", onClick: function () { say("Face applied to " + thSetEmotion(TH_EMOTIONS.indexOf(p.faceEmotion)) + " buddies"); } },
    { type: "button", label: "Be Nice To Everyone", onClick: function () { say("Nice interaction sent to " + thNiceToAll() + " buddies"); } },
    { type: "label", label: "♦ HATS & CAPE  ► hats are networked, cape wave is local" },
    { type: "button", label: "Refresh Hat List", onClick: function () { say(thRefreshHats() + " hats found, see log"); } },
    { type: "button", label: "Next Hat (free)", onClick: function () { thStepHat(1); } },
    { type: "button", label: "Previous Hat (free)", onClick: function () { thStepHat(-1); } },
    { type: "button", label: "Remove Hat", onClick: function () { if (thEquipHat("")) say("Hat removed"); } },
    { type: "bool", key: "capeBoost", label: "Cape Wave Boost", default: false, desc: "► scales every cape's wave strength and speed by the sliders (only you see it)" },
    { type: "float", key: "capeStrength", label: "Cape Strength (x)", min: 0, max: 10, default: 3, decimals: 2 },
    { type: "float", key: "capeSpeed", label: "Cape Speed (x)", min: 0, max: 10, default: 2, decimals: 2 },
    { type: "label", label: "♦ NETWORKED FUN  ► everyone in the lobby sees these" },
    { type: "bool", key: "gorillaMode", label: "Gorilla Mode", default: false, desc: "► gorilla-tag arm movement (sets the locomotion, player and synced flags), others see the avatar change" },
    { type: "int", key: "armSkin", label: "Arm Skin Index", min: 0, max: 12, default: 0 },
    { type: "button", label: "Apply Arm Skin", onClick: function () { thSetArmSkin(p.armSkin); } },
    { type: "button", label: "Open All Doors", onClick: function () { thDoors(true); } },
    { type: "button", label: "Close All Doors", onClick: function () { thDoors(false); } },
    { type: "button", label: "Fire Trebuchet (everyone sees it)", onClick: function () { thFireTrebuchet(); } },
    { type: "float", key: "explosionScale", label: "Explosion Size", min: 0.5, max: 6, default: 1.5, decimals: 2 },
    { type: "button", label: "Explosion In Front Of You  ▲ can hurt players", onClick: function () { thExplode(); } },
    { type: "select", key: "ringNpc", label: "Ring NPC", options: ["Zombie", "ZombieFriend", "ZombieRifle", "ZombiePistol"], default: "ZombieFriend", desc: "► ZombieFriend is the safe one for fun" },
    { type: "int", key: "ringCount", label: "Ring Count", min: 1, max: 24, default: 8 },
    { type: "float", key: "ringRadius", label: "Ring Radius", min: 1, max: 15, default: 4, decimals: 1 },
    { type: "float", key: "ringHeight", label: "Ring Height (0 = on the ground, more = rain)", min: 0, max: 20, default: 0, decimals: 1 },
    { type: "button", label: "Spawn NPC Ring", onClick: function () { thNpcRing(); } },
    { type: "label", label: "♦ WIPES  ▲ these change your save, careful" },
    { type: "button", label: "Level Wipe", onClick: function () { thProgressWipe("Level Wipe"); } },
    { type: "button", label: "Prestige Wipe", onClick: function () { thProgressWipe("Prestige Wipe"); } },
    { type: "button", label: "All Resets (money, SP, stats, leaderboards)", onClick: function () { thAllResetsWipe(); } },
    { type: "button", label: "SP Wipe (local)", onClick: function () { thSPWipe(); } },
    { type: "button", label: "Money Wipe (local + cloud attempt)", onClick: function () { thMoneyWipeAll(); } },

    { type: "label", label: "♦ OP TOOLS  ► kill gun, noclip, safezones" },
    { type: "bool", key: "killGun", label: "Kill Gun", default: false, desc: "right grip aims, right trigger kills the player under the beam" },
    { type: "bool", key: "noclip", label: "Noclip", default: false, desc: "disables every collider, originals restored when off" },
    { type: "bool", key: "safezoneDamage", label: "Damage in Safezones (install)", default: false, desc: "lets your hits land inside safezones (patches IsInSafeZone + DamagePlayer)" },
    { type: "button", label: "Kill All Players", onClick: function () { thKillAllPlayers(); } },
    { type: "button", label: "Spawn Truck", onClick: function () { thSpawnVehicle("Truck"); } },
    { type: "button", label: "Spawn UFO", onClick: function () { thSpawnVehicle("UFO"); } },
    { type: "button", label: "Spawn Nimbus Cloud", onClick: function () { thSpawnVehicle("Nimbus"); } },
    { type: "button", label: "Spawn Go-Kart", onClick: function () { thSpawnVehicle("GoKart"); } },
    { type: "button", label: "Spawn Helicopter", onClick: function () { thSpawnVehicle("Helicopter"); } },
    { type: "button", label: "Give 500 SP", onClick: function () { thGiveSP(500); } },
    { type: "bool", key: "abilities", label: "Unlock Abilities", default: false },

    { type: "label", label: "♦ PROGRESSION  ► level & prestige" },
    { type: "int", key: "level", label: "Level", min: 1, max: 100, default: 50 },
    { type: "button", label: "Set Level", onClick: function () { thSetLevel(p.level); } },
    { type: "int", key: "prestige", label: "Prestige", min: 0, max: 100, default: 100 },
    { type: "button", label: "Set Prestige", onClick: function () { thSetPrestige(p.prestige); } },

    { type: "label", label: "♦ SPAWN  ► items, weapons, vehicles" },
    { type: "select", key: "spawnName", label: "Spawn Item", options: SPAWN_NAMES, default: "Pistol" },
    { type: "button", label: "Spawn Selected", onClick: function () { thSpawn(p.spawnName); } },

    { type: "label", label: "♦ DEV TOOLS  ► log dumps for debugging" },
    { type: "button", label: "Scan XP / Level classes (log)", onClick: function () { thDevScanProgression(); } },
    { type: "button", label: "Dump LaserPower (log)", onClick: function () { thDevDumpClass("LaserPower"); } },
    { type: "button", label: "Dump ZombieRifle (log)", onClick: function () { thDevDumpClass("ZombieRifle"); } },
    { type: "button", label: "Dump LocalGameManager (log)", onClick: function () { thDevDumpClass("LocalGameManager"); } },
    { type: "button", label: "Log My Networked Transforms (player size probe)", onClick: function () { thLogMyTransforms(); } },

    { type: "label", label: "♦ ECONOMY  ► money" },
    { type: "int", key: "moneyAmount", label: "Money Amount", min: 100, max: 100000000, default: 10000 },
    { type: "button", label: "Add Money", onClick: function () { addMoneyLocal(p.moneyAmount); } },
    { type: "button", label: "Add 100M", onClick: function () { addMoneyLocal(100000000); } }
);


// longer descriptions (symbols limited to what the menu font draws)
var THOOMS_DESCS = {
    fly: "► hold B (right secondary) to thrust where your right hand points, let go to drift",
    playerSize: "► ♦ everyone sees your head scaled by the slider (the neck is the only synced bone scale)",
    speedHack: "► overrides your move speed with the value below, your real speed returns when off",
    oneShot: "► every gun's damage becomes 99999, originals are saved and put back when off",
    quickFire: "► every trigger pull resets the gun's fire timers and refills its ammo, hooks install the first time you turn it on",
    noAbilityCooldown: "► dash and other powers recharge instantly (checked about once a second)",
    zRapid: "► rifle zombies shoot much faster",
    zRecoil: "► rifle zombie guns stop kicking, shots land more accurately",
    zSpread: "► rifle zombie shots fly dead straight",
    ultimateZombie: "► ♦ spawns one rifle zombie with 900x health, 10x speed and 1500 damage",
    animeSkin: "► picks the anime skin (index 4), saved to prefs so restart the game",
    nameBypass: "● lets any name through the name filter, hook only installs while this is on",
    rgbSkin: "► your skin slowly cycles through rainbow colors, live for everyone",
    rgbName: "► rainbow letters on your name, everyone sees it",
    richName: "► keeps rich text on for nameplates so <color> tags in a saved name render",
    killGun: "▲ hold left grip to aim the beam, left trigger kills the player it points at",
    noclip: "► turns off every collider so you walk through walls, originals put back when off",
    safezoneDamage: "● lets your hits land inside safezones, kill anywhere. installs once, stays until restart",
    abilities: "► unlocks fly-fist, laser, smash, kamehameha, dash, grapple and teleport powers"
};
defs.forEach(function (d) { if (d.key && THOOMS_DESCS[d.key]) d.desc = THOOMS_DESCS[d.key]; });


// ---- category split: the controls live in the 1_buddy_*.js plugins, this engine reads them through `p` ----
var p = (function (defs, ns, engine) {
    var B = globalThis.__BB;
    // the main engine loads first (file order) and starts a fresh registry on every load
    if (!B || engine === "main") {
        B = globalThis.__BB = { cats: {}, bags: {}, defs: {}, local: {}, tabs: {}, engines: [] };
        B.register = function (cat, bag) {
            (B.cats[cat] || []).forEach(function (d) {
                if (!d.key) return;
                B.bags[d.key] = bag;
                if (d.key in B.local) { try { bag[d.key] = B.local[d.key]; } catch (e) { } }
            });
        };
    }
    if (B.engines.indexOf(engine) >= 0) for (var c in B.cats) B.cats[c] = B.cats[c].filter(function (d) { return d.__eng !== engine; });
    else B.engines.push(engine);
    var CATS = [
        [/^(Player\b|Movement|Stat Tweaker|Player\+|Powers\+|♦ PLAYER)/, "player"],
        [/^(Combat|Enemies|Weapons\+|Grab Anything|Vacuum|♦ COMBAT|♦ ZOMBIES|♦ OP TOOLS)/, "combat"],
        [/^(ESP|Camera)/, "visuals"],
        [/^(Lobby|Maps|Rooms|Vehicles\+|Bulk Spawner|♦ SPAWN|♦ NETWORKED FUN)/, "world"],
        [/^(Clone Rigs|Mic Soundboard|Soundboard|♦ NAME|♦ FACES|♦ HATS|♦ ITEM SIZE)/, "fun"],
        [/^(Unlocks|Economy|Rain Money|Score Changer|♦ WIPES|♦ PROGRESSION|♦ ECONOMY)/, "account"],
        [/^♦ DEV TOOLS/, "dev"],
    ];
    var cat = null;
    defs.forEach(function (d) {
        if (d.type === "label") for (var i = 0; i < CATS.length; i++) if (CATS[i][0].test(d.label)) { cat = CATS[i][1]; break; }
        d.__eng = engine;
        if (d.key) { d.key = ns + d.key; B.defs[d.key] = d; }
        if (cat) (B.cats[cat] = B.cats[cat] || []).push(d);
    });
    function dflt(d) {
        if (d.default !== undefined) return d.default;
        return d.type === "bool" ? false : d.type === "select" ? (d.options || [])[0] || "" : d.type === "text" ? "" : (d.min || 0);
    }
    return new Proxy({}, {
        get: function (_, k) {
            if (typeof k !== "string") return undefined;
            var kk = ns + k, b = B.bags[kk];
            if (b) return b[kk];
            if (kk in B.local) return B.local[kk];
            var d = B.defs[kk];
            return d ? dflt(d) : undefined;
        },
        set: function (_, k, v) { var kk = ns + k, b = B.bags[kk]; if (b) b[kk] = v; else B.local[kk] = v; return true; },
    });
})(defs, "t_", "thooms");
props([{ type: "label", label: "engine: the controls are in the buddy_player / combat / visuals / world / fun / account / dev plugins" }]);

// ---------------------------------------------------------------- state

var GAME_IMG = null, CORE_IMG = null, NR_IMG = null, PHYS_IMG = null, XR_IMG = null;
var PlayerMPCls = null, GrabCls = null, RecoilCls = null, InvCls = null, IAPCls = null;
var hooksDone = false, hooksTried = 0, lastHookTry = 0;
var thIapLast = 0;
function thIapFlags() {
    try {
        var inst = gameImg().class("IAPManager").field("Instance").value;
        if (!inst || inst.isNull()) return;
        inst.field("allWeaponsOwned").value = true;
        inst.field("ownsVehicles").value = true;
    } catch (e) { }
}
var prev = {};
var originalMoveSpeed = null;
var thKillGun = null;
var thKillGunArmed = false;
var killGunKills = 0;
var thBeamEnabled = false;

// no recoil state
var recoilOffs = null;

// item thumb hook state
var thItemThumb = { enabled: false, installed: false, step: 0.005, last: 0 };

// fast laser state
var thFastLaserEnabled = false;
var thFastLaserHooks = [];
var thFastLaserInstalled = false;
var thFastLaserKameInst = null;
var thFastLaserLaserInst = null;

// one-shot weapons / zombie state
var thWeaponOriginals = new Map();
var thZombieCfg = { size: 1, health: 1, speed: 1, damage: 1, rapid: false, recoil: false, spread: false };
var thZombieOriginals = new Map();
var thItemOriginals = new Map();
var thOpEnabled = Object.create(null);

// rgb name state
var rgbNamePlayer = null, rgbNameText = null, rgbNameLastFind = 0, rgbNameLastUpdate = 0, rgbNamePlain = "THOOM";
var RGB_NAME_UPDATE_MS = 50;
var thRichNameLast = 0;

// rgb skin state
var rgbSkinModel = null, rgbSkinLastFind = 0, rgbSkinLastUpdate = 0;
var RGB_SKIN_UPDATE_MS = 50;

// noclip state
var buddyColliderStates = new Map();

// name bypass state
var thNameBypassHooks = [];

// ultimate zombie state
var thUltimateZombie = { active: false, timer: null, seen: new Set(), modified: new Map(), scans: 0 };

// ---------------------------------------------------------------- small helpers

function gameImg() { return GAME_IMG || (GAME_IMG = Il2Cpp.domain.assembly("Assembly-CSharp").image); }
function coreImg() { return CORE_IMG || (CORE_IMG = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image); }
function nrImg() { return NR_IMG || (NR_IMG = Il2Cpp.domain.assembly("Normal.Realtime").image); }
function physImg() { return PHYS_IMG || (PHYS_IMG = Il2Cpp.domain.assembly("UnityEngine.PhysicsModule").image); }
function xrImg() { return XR_IMG || (XR_IMG = Il2Cpp.domain.assembly("UnityEngine.XRModule").image); }

function say(msg) {
    log(msg);
    try { notify(msg); } catch (e) { }
}

function stripTmpTags(s) { return String(s || "").replace(/<[^>]*>/g, ""); }

function currentPlayer() {
    try {
        var inst = gameImg().class("PlayerMultiplayer").field("instance").value;
        return inst && !inst.isNull() ? inst : null;
    } catch (e) { return null; }
}

function thFindAll(cls) {
    var core = coreImg();
    return core.class("UnityEngine.Object").method("FindObjectsOfType", 1).overload("System.Type").invoke(cls.type.object);
}

function thModel(np) {
    for (var i = 0; i < ["<model>k__BackingField", "model", "_model"].length; i++) {
        var f = ["<model>k__BackingField", "model", "_model"][i];
        try { var m = np.field(f).value; if (m && !m.isNull()) return m; } catch (e) { }
    }
    return null;
}

function thName(m) { try { return m.method("get_playerName").invoke().content; } catch (e) { return "?"; } }

function localClientID() {
    try {
        var R = nrImg().class("Normal.Realtime.Realtime");
        var en = R.method("get_instances").invoke().method("GetEnumerator").invoke();
        if (en.method("MoveNext").invoke()) return Number(en.method("get_Current").invoke().method("get_clientID").invoke());
    } catch (e) { }
    return null;
}

// The NetworkPlayer that belongs to YOU. Never falls back to "the first one in the scene",
// that is how level / prestige / rgb name / rgb skin ended up on random players.
function thMyNP() {
    // 1) the game's own reference (PlayerMultiplayer.instance.networkPlayer)
    try {
        var pm = currentPlayer();
        if (pm) {
            var mine = pm.field("networkPlayer").value;
            if (mine && !mine.isNull()) return mine;
        }
    } catch (e) { }
    // 2) a NetworkPlayer whose RealtimeView is owned by this client
    try {
        var arr = thFindAll(gameImg().class("NetworkPlayer"));
        var rvType = nrImg().class("Normal.Realtime.RealtimeView").type.object;
        for (var i = 0; arr && i < arr.length; i++) {
            var np = arr.get(i);
            if (!np || np.isNull()) continue;
            try {
                var rv = np.method("GetComponent", 1).invoke(rvType);
                if (rv && !rv.isNull() && rv.method("get_isOwnedLocallySelf").invoke()) return np;
            } catch (e) { }
        }
    } catch (e) { }
    return null;
}

function thLocal() {
    var np = thMyNP();
    if (!np) return null;
    var m = thModel(np);
    if (!m) { try { var g = np.method("get_model").invoke(); if (g && !g.isNull()) m = g; } catch (e) { } }
    return { np: np, m: m };
}


// Probe for a networked player size. Read-only. Two parts:
//  A) every RealtimeTransform in the scene, counted by why it was or was not "mine"
//  B) the transforms that sit under YOUR NetworkPlayer object, whatever their owner flags say
function thRtLine(tag, rt, extra) {
    var go = rt.method("get_gameObject").invoke();
    var tr = rt.method("get_transform").invoke();
    var path = String(go.method("get_name").invoke().content), up = tr;
    for (var d = 0; d < 4; d++) {
        up = up.method("get_parent").invoke();
        if (!up || up.isNull()) break;
        path = String(up.method("get_gameObject").invoke().method("get_name").invoke().content) + "/" + path;
    }
    var sc = tr.method("get_localScale").invoke();
    var sync = "?";
    try { sync = String(!!rt.method("get_syncScale").invoke()); } catch (e) { }
    log(tag + path + "  scale=" + Number(sc.field("x").value).toFixed(2) + "," + Number(sc.field("y").value).toFixed(2) + "," + Number(sc.field("z").value).toFixed(2) + "  syncScale=" + sync + (extra || ""));
}

function thLogMyTransforms() {
    try {
        var nr = nrImg(), core = coreImg();
        var RT = nr.class("Normal.Realtime.RealtimeTransform");
        var myID = localClientID();
        log("MY RT: clientID = " + myID);

        var np = thMyNP(), myRoot = null;
        if (np) {
            myRoot = np.method("get_transform").invoke();
            log("MY RT: my NetworkPlayer object = " + String(np.method("get_gameObject").invoke().method("get_name").invoke().content));
        } else log("MY RT: my NetworkPlayer not found (join a room first)");

        var arr = core.class("UnityEngine.Object").method("FindObjectsOfType", 1).overload("System.Type").invoke(RT.type.object);
        var total = arr ? arr.length : 0, errs = 0, firstErr = "", ownedFlag = 0, ownerMatch = 0, under = 0, shown = 0, owners = {};
        for (var i = 0; arr && i < arr.length; i++) {
            var rt = arr.get(i);
            if (!rt || rt.isNull()) continue;
            try {
                // RealtimeTransform inherits these from RealtimeComponent, no GetComponentInParent needed
                var oid = Number(rt.method("get_ownerIDInHierarchy").invoke());
                owners[oid] = (owners[oid] || 0) + 1;
                var flag = false;
                try { flag = !!rt.method("get_isOwnedLocallyInHierarchy").invoke(); } catch (e) { }
                if (flag) ownedFlag++;
                if (oid === myID) ownerMatch++;
                var below = false;
                if (myRoot) {
                    var up = rt.method("get_transform").invoke();
                    for (var d = 0; d < 12 && up && !up.isNull(); d++) {
                        if (up.handle.equals(myRoot.handle)) { below = true; break; }
                        up = up.method("get_parent").invoke();
                    }
                }
                if (below) under++;
                if ((flag || oid === myID || below) && shown < 60) {
                    shown++;
                    thRtLine("MY RT: ", rt, "  owner=" + oid + (flag ? " ownedLocally" : "") + (below ? " underMyPlayer" : ""));
                }
            } catch (e) { errs++; if (!firstErr) firstErr = String(e); }
        }
        log("MY RT: scene total " + total + ", errors " + errs + (firstErr ? " (first: " + firstErr + ")" : "") + ", ownedLocally flag " + ownedFlag + ", ownerID == clientID " + ownerMatch + ", under my NetworkPlayer " + under);
        log("MY RT: transforms per ownerID " + JSON.stringify(owners));
        say("Probe done: " + shown + " of your transforms listed, see log");
    } catch (e) { log("Log my transforms: " + e); say("Transform probe failed, see log"); }
}


// Networked size, take 2. Why the whole-body version could not work: other players only apply a synced scale
// on RealtimeTransforms that have syncScale ON on THEIR side, and your probe showed every body bone and the
// ragdoll root have it OFF. The one exception is the NECK (Network_Ragdoll(Clone)/neck, syncScale = true, the
// game uses it for head effects). So the networked size is the neck, which scales the whole head (and hat).
var thBodyOrig = {};      // transform handle -> original [x, y, z]
var thSizeState = "";

function thSizeLog(state, msg) { if (state !== thSizeState) { thSizeState = state; log("Head size: " + msg); } }

function thFindMyNeckRT() {
    var nr = nrImg(), core = coreImg();
    var RT = nr.class("Normal.Realtime.RealtimeTransform");
    var myID = localClientID();
    if (myID === null) return null;
    var arr = core.class("UnityEngine.Object").method("FindObjectsOfType", 1).overload("System.Type").invoke(RT.type.object);
    for (var i = 0; arr && i < arr.length; i++) {
        var rt = arr.get(i);
        if (!rt || rt.isNull()) continue;
        try {
            var go = rt.method("get_gameObject").invoke();
            if (String(go.method("get_name").invoke().content) !== "neck") continue;
            if (Number(rt.method("get_ownerIDInHierarchy").invoke()) !== myID) continue;
            var par = rt.method("get_transform").invoke().method("get_parent").invoke();
            if (!par || par.isNull()) continue;
            if (String(par.method("get_gameObject").invoke().method("get_name").invoke().content).indexOf("Network_Ragdoll") !== 0) continue;
            return rt;
        } catch (e) { }
    }
    return null;
}

function thApplyPlayerSize(factor) {
    try {
        var rt = thFindMyNeckRT();
        if (!rt) { thSizeLog("nofind", "your neck transform was not found (join a room, wait for your body to spawn)"); return false; }
        var tr = rt.method("get_transform").invoke();
        var key = String(tr.handle);
        var orig = thBodyOrig[key];
        if (!orig) {
            var sc = tr.method("get_localScale").invoke();
            orig = ["x", "y", "z"].map(function (n) { return Number(sc.field(n).value); });
            if (!orig.every(Number.isFinite) || orig[0] <= 0) { thSizeLog("badscale", "unexpected neck scale " + orig.join(",")); return false; }
            thBodyOrig[key] = orig;
            log("Head size: neck found, original scale " + orig.map(function (v) { return v.toFixed(2); }).join(","));
        }
        var ns = orig.map(function (x) { return x * factor; });
        if (!ns.every(Number.isFinite)) return false;
        try { rt.method("set_syncScale", 1).invoke(true); } catch (e) { thSizeLog("e1", "set_syncScale failed: " + e); }
        tr.method("set_localScale", 1).invoke(ns);
        try { rt.method("SetModelFromTransform", 0).invoke(); } catch (e) { thSizeLog("e2", "SetModelFromTransform failed: " + e); }
        var back = tr.method("get_localScale").invoke();
        var now = Number(back.field("x").value);
        thSizeLog("ok" + factor, "set neck scale to " + now.toFixed(2) + " (x" + factor + ", original " + orig[0].toFixed(2) + ")" + (Math.abs(now - ns[0]) > 0.01 ? "  WARNING: game changed it back right away" : ""));
        return true;
    } catch (e) { thSizeLog("err", "error " + e); return false; }
}

// ---------------------------------------------------------------- faces (buddy emotions)
// EmotionManager lives on the buddies (happiness / fear / anger / sadness floats + currentEmotion).
// "Lock" re-applies the chosen emotion a couple of times a second and freezes decay.
var TH_EMOTIONS = ["Neutral", "Happy", "Scared", "Angry", "Sad"];

function thSetEmotion(idx) {
    var arr = thFindAll(gameImg().class("EmotionManager"));
    var n = 0;
    for (var i = 0; arr && i < arr.length; i++) {
        var em = arr.get(i);
        if (!em || em.isNull()) continue;
        try {
            em.field("decayRate").value = 0.0;
            em.field("happiness").value = idx === 1 ? 1.0 : 0.0;
            em.field("fear").value = idx === 2 ? 1.0 : 0.0;
            em.field("anger").value = idx === 3 ? 1.0 : 0.0;
            em.field("sadness").value = idx === 4 ? 1.0 : 0.0;
            try { em.field("currentEmotion").value = idx; } catch (e) { }
            n++;
        } catch (e) { }
    }
    return n;
}

function thNiceToAll() {
    var arr = thFindAll(gameImg().class("EmotionManager")), n = 0;
    for (var i = 0; arr && i < arr.length; i++) {
        var em = arr.get(i);
        if (!em || em.isNull()) continue;
        try { em.method("OnNiceInteraction", 1).invoke(1.0); n++; } catch (e) { }
    }
    return n;
}

// ---------------------------------------------------------------- hats and capes
var thHatNames = [];
var thHatIdx = -1;

function thRefreshHats() {
    var seen = {}, out = [];
    function add(n) { n = String(n || "").replace(/\(Clone\)$/, "").trim(); if (n && !seen[n]) { seen[n] = 1; out.push(n); } }
    try {   // the hat browser's own list
        var dps = thFindAll(gameImg().class("DisplayPlayer"));
        for (var i = 0; dps && i < dps.length; i++) {
            var dp = dps.get(i);
            if (!dp || dp.isNull()) continue;
            try {
                var list = dp.field("allHats").value;
                if (!list || list.isNull()) continue;
                var cnt = Number(list.method("get_Count").invoke());
                for (var k = 0; k < cnt; k++) {
                    try { add(list.method("get_Item", 1).invoke(k).field("name").value.content); } catch (e) { }
                }
            } catch (e) { }
        }
    } catch (e) { }
    try {   // hats lying around as shop items
        var hh = thFindAll(gameImg().class("HatHolder"));
        for (var j = 0; hh && j < hh.length; j++) {
            var h = hh.get(j);
            if (!h || h.isNull()) continue;
            try { var go = h.field("hat").value; if (go && !go.isNull()) add(go.method("get_name").invoke().content); } catch (e) { }
        }
    } catch (e) { }
    out.sort();
    thHatNames = out;
    log("Hats: " + out.length + " found" + (out.length ? ": " + out.join(", ") : ""));
    return out.length;
}

function thEquipHat(name) {
    var np = thMyNP();
    if (!np) { say("Hat: your player was not found"); return false; }
    try {
        np.method("SetHat", 1).invoke(name);       // goes through the networked model, others see it
        try { var pm = currentPlayer(); if (pm) pm.method("SetHats", 0).invoke(); } catch (e) { }
        return true;
    } catch (e) { log("Equip hat: " + e); say("Hat failed, see log"); return false; }
}

function thStepHat(dir) {
    if (!thHatNames.length && !thRefreshHats()) { say("No hats found, open the hat browser or cosmetics area once, then try again"); return; }
    thHatIdx = (thHatIdx + dir + thHatNames.length) % thHatNames.length;
    var nm = thHatNames[thHatIdx];
    if (thEquipHat(nm)) say("Hat " + (thHatIdx + 1) + "/" + thHatNames.length + ": " + nm);
}

var thCapeOrig = {};
function thApplyCape(on) {
    var arr = thFindAll(gameImg().class("CapeAnimation"));
    for (var i = 0; arr && i < arr.length; i++) {
        var c = arr.get(i);
        if (!c || c.isNull()) continue;
        try {
            var key = String(c.handle);
            if (!thCapeOrig[key]) thCapeOrig[key] = [Number(c.field("waveStrength").value), Number(c.field("waveSpeed").value)];
            var o = thCapeOrig[key];
            c.field("waveStrength").value = on ? o[0] * p.capeStrength : o[0];
            c.field("waveSpeed").value = on ? o[1] * p.capeSpeed : o[1];
        } catch (e) { }
    }
}


// ---------------------------------------------------------------- networked fun
// Everything here goes through Normcore models or the game's own spawn calls, so other players see it too.
function thVec3(v) { return [Number(v.field("x").value), Number(v.field("y").value), Number(v.field("z").value)]; }

// a spot in front of you (the game's own spawn position helper)
function thFrontPos() {
    var pm = currentPlayer();
    if (!pm) return null;
    try { return thVec3(pm.method("GetNPCSpawnPosition").invoke()); } catch (e) { return null; }
}

function thModelsOf(clsName) {
    var out = [], arr = thFindAll(gameImg().class(clsName));
    for (var i = 0; arr && i < arr.length; i++) {
        var c = arr.get(i);
        if (!c || c.isNull()) continue;
        try { var m = c.method("get_model").invoke(); if (m && !m.isNull()) out.push({ c: c, m: m }); } catch (e) { }
    }
    return out;
}

// Gorilla mode is a LOCOMOTION mode (gorilla-tag style arm movement), not just a flag. Writing only the synced
// PlayerBase flag does nothing because the game rewrites it from its own settings. So all of these are set:
//   PlayerMultiplayer.gorillaMode, PlayerValues.gorillaMode (via playerStats), VRRigidBodyLocomotion.gorillaMode
//   (+ SetupGorillaCollider), GorillaController.enabled, and finally the synced model flag so others see it.
function thGorillaApply(on, loud) {
    var did = [];
    try {
        var pm = currentPlayer();
        if (pm) {
            try { pm.field("gorillaMode").value = !!on; did.push("player"); } catch (e) { }
            try {
                var st = pm.field("playerStats").value;
                if (st && !st.isNull()) { st.field("gorillaMode").value = !!on; did.push("stats"); }
            } catch (e) { }
        }
    } catch (e) { }
    try {
        var locos = thFindAll(gameImg().class("VRRigidBodyLocomotion"));
        for (var i = 0; locos && i < locos.length; i++) {
            var lo = locos.get(i);
            if (!lo || lo.isNull()) continue;
            var changed = false;
            try { changed = !!lo.field("gorillaMode").value !== !!on; lo.field("gorillaMode").value = !!on; did.push("locomotion"); } catch (e) { }
            if (changed) { try { lo.method("SetupGorillaCollider").invoke(); } catch (e) { } }
        }
    } catch (e) { }
    try {
        var gcs = thFindAll(gameImg().class("GorillaController"));
        for (var j = 0; gcs && j < gcs.length; j++) {
            var gc = gcs.get(j);
            if (!gc || gc.isNull()) continue;
            try { gc.field("enabled").value = !!on; did.push("controller"); } catch (e) { }
        }
    } catch (e) { }
    try {
        var x = thLocal();
        if (x && x.m) { x.m.method("set_gorillaMode").invoke(!!on); did.push("synced flag"); }
    } catch (e) { }
    if (loud) {
        log("Gorilla " + (on ? "ON" : "OFF") + ": set " + (did.length ? did.join(", ") : "nothing"));
        say("Gorilla mode " + (on ? "ON" : "OFF") + (did.length ? "" : ", nothing found"));
    }
    return did.length;
}

function thSetGorilla(on) { thGorillaApply(on, true); }

function thSetArmSkin(i) {
    try {
        var x = thLocal();
        if (!x || !x.m) throw new Error("local model not found");
        x.m.method("set_ikSkinIndex").invoke(Math.max(0, Math.floor(Number(i) || 0)));
        say("Arm skin " + i);
    } catch (e) { say("Arm skin failed: " + e); }
}

// every Device (RealtimeComponent<DoorModel>) gets isOpen written, which syncs to the lobby
function thDoors(open) {
    var list = thModelsOf("Device"), n = 0;
    list.forEach(function (d) { try { d.m.method("set_isOpen").invoke(!!open); n++; } catch (e) { } });
    say((open ? "Opened " : "Closed ") + n + " doors/devices");
}

// the trebuchet fires when its model's fireCount goes up (reliable property)
function thFireTrebuchet() {
    var list = thModelsOf("Trebuchet"), n = 0;
    list.forEach(function (t) {
        try { t.m.method("set_fireCount").invoke(Number(t.m.method("get_fireCount").invoke()) + 1); n++; } catch (e) { }
    });
    say(n ? "Fired " + n + " trebuchet(s)" : "No trebuchet in this map");
}

// NetworkExplosion.TriggerExplosion is the game's own call, it syncs and runs the damage code on each client
function thExplode() {
    try {
        var pos = thFrontPos();
        if (!pos) throw new Error("no spawn position");
        var list = thFindAll(gameImg().class("NetworkExplosion"));
        var ex = list && list.length ? list.get(0) : null;
        if (!ex || ex.isNull()) { say("No NetworkExplosion in this map"); return; }
        var sc = Number(p.explosionScale) || 1;
        ex.method("TriggerExplosion", 3).invoke(pos, [0, 0, 0, 1], [sc, sc, sc]);
        say("Boom");
    } catch (e) { log("Explosion: " + e); say("Explosion failed, see log"); }
}

// ring (or rain, with height) of networked NPCs around the spot in front of you
function thNpcRing() {
    try {
        var pm = currentPlayer(), base = thFrontPos();
        if (!pm || !base) throw new Error("player not ready");
        var n = Math.max(1, Math.min(24, Math.floor(p.ringCount))), r = Number(p.ringRadius), h = Number(p.ringHeight), nm = p.ringNpc, ok = 0;
        for (var i = 0; i < n; i++) {
            var a = (i / n) * Math.PI * 2;
            try {
                pm.method("SpawnNPCAt").invoke(Il2Cpp.string(nm), [base[0] + Math.cos(a) * r, base[1] + h, base[2] + Math.sin(a) * r]);
                ok++;
            } catch (e) { }
        }
        say("Spawned " + ok + " " + nm);
    } catch (e) { log("NPC ring: " + e); say("NPC ring failed, see log"); }
}

function thSetLevel(v) {
    try {
        v = Math.max(1, Math.min(100, Number(v) || 1));
        var x = thLocal();
        if (!x || !x.m) throw new Error("local model not found");
        x.m.method("set_level").invoke(v);
        say("Global level " + v);
    } catch (e) { say("Set level failed: " + e); }
}

function thSetPrestige(v) {
    try {
        v = Math.max(0, Math.min(100, Math.floor(Number(v) || 0)));
        var x = thLocal();
        if (!x || !x.m) throw new Error("local model not found");
        x.m.method("set_prestige").invoke(v);
        say("Global prestige " + v);
    } catch (e) { say("Set prestige failed: " + e); }
}

function thSpawn(name) {
    try {
        var inst = currentPlayer();
        if (!inst) throw new Error("PlayerMultiplayer.instance missing");
        inst.method("Spawn", 1).overload("System.String").invoke(Il2Cpp.string(name));
        say("Spawned: " + name);
    } catch (e) { say("Spawn error " + name + ": " + e); }
}

// Truck / UFO are one-shot spawn actions. Vehicle names go through the game's own
// SpawnVehicleAt; if the name is not a vehicle it falls back to the plain spawn path.
function thSpawnVehicle(name) {
    try {
        var inst = currentPlayer();
        if (!inst) throw new Error("PlayerMultiplayer.instance missing");
        var pos = inst.method("GetVehicleSpawnPosition").invoke();
        inst.method("SpawnVehicleAt").invoke(Il2Cpp.string(name), pos);
        say("Spawned vehicle: " + name);
    } catch (e) {
        log("Vehicle spawn (" + name + ") failed: " + e);
        thSpawn(name);
    }
}

function addMoneyLocal(amount) {
    try {
        gameImg().class("LocalGameManager").method("AddMoney", 1).invoke(Number(amount) | 0);
        say("Added " + amount);
    } catch (e) { say("Add money failed: " + e); }
}

// ---------------------------------------------------------------- fly / speed

function thFlyFrame() {
    try {
        if (!ui.input.secondary(1)) return;
        var inst = currentPlayer();
        if (!inst) return;
        var rb = inst.field("playerRigidBody").value;
        if (!rb || rb.isNull()) return;
        var core = coreImg();
        var objClass = core.class("UnityEngine.Object");
        var vec3 = core.class("UnityEngine.Vector3");
        var trackingClass = gameImg().class("VRArmIK.VRTrackingReferences");
        var refs = objClass.method("FindObjectsOfType").inflate(trackingClass).invoke();
        if (!refs || refs.length <= 0) return;
        var rightHand = refs.get(0).field("rightHand").value;
        if (!rightHand || rightHand.isNull()) return;
        var forward = rightHand.method("get_forward").invoke();
        var velocity = vec3.method("op_Multiply", 2).invoke(forward, Number(p.flyForce) || 500);
        rb.method("set_linearVelocity").invoke(velocity);
    } catch (e) { }
}

function thSpeedHack() {
    try {
        var inst = currentPlayer();
        if (!inst) return;
        var loco = inst.field("movementController").value;
        if (!loco || loco.isNull()) return;
        if (originalMoveSpeed === null) originalMoveSpeed = Number(loco.field("moveSpeed").value);
        loco.field("moveSpeed").value = Number(p.speedValue) || 50;
    } catch (e) { }
}

function restoreSpeedHack() {
    if (originalMoveSpeed === null) return;
    try {
        var inst = currentPlayer();
        if (inst) {
            var loco = inst.field("movementController").value;
            if (loco && !loco.isNull()) loco.field("moveSpeed").value = originalMoveSpeed;
        }
    } catch (e) { }
    originalMoveSpeed = null;
}

// ---------------------------------------------------------------- noclip

function setBuddyNoclip(enabled) {
    try {
        var colliders = coreImg().class("UnityEngine.Object").method("FindObjectsOfType").inflate(physImg().class("UnityEngine.Collider")).invoke();
        for (var i = 0; i < colliders.length; i++) {
            var col = colliders.get(i);
            if (!col || col.isNull()) continue;
            var key = col.handle.toString();
            if (enabled) {
                if (!buddyColliderStates.has(key)) {
                    var wasEnabled = true;
                    try { wasEnabled = col.method("get_enabled").invoke(); } catch (e) { }
                    buddyColliderStates.set(key, wasEnabled);
                }
                col.method("set_enabled").invoke(false);
            } else {
                var old = buddyColliderStates.get(key);
                if (old !== undefined) { try { col.method("set_enabled").invoke(old); } catch (e) { } }
            }
        }
        if (!enabled) buddyColliderStates.clear();
    } catch (e) { log("Noclip: " + e); }
}

// ---------------------------------------------------------------- prefs / cosmetics

var BUDDY_PREFS = "/data/data/com.armoredpigstudios.beathimup/shared_prefs/com.armoredpigstudios.beathimup.v2.playerprefs.xml";

function buddyWritePref(key, value) {
    try {
        var f = new File(BUDDY_PREFS, "r");
        var xml = f.readText();
        f.close();
        var escaped = String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        var re = new RegExp('<string name="' + key + '">[\\s\\S]*?<\\/string>');
        var replacement = '<string name="' + key + '">' + escaped + '</string>';
        if (re.test(xml)) xml = xml.replace(re, replacement);
        else if (xml.indexOf("</map>") !== -1) xml = xml.replace("</map>", "    " + replacement + "\n</map>");
        else throw new Error("preferences map not found");
        var out = new File(BUDDY_PREFS, "w");
        out.write(xml); out.flush(); out.close();
        log("Pref " + key + " updated; restart game to apply");
    } catch (e) { log("Pref write failed: " + e); say("Pref write failed, see log"); }
}

// Names and skin colors live on your synced PlayerBase model (set_playerName / set_skin), so writing them there
// changes them for everyone right away. The prefs file is still written so they survive a restart.
function thLiveName(value) {
    var x = thLocal();
    if (!x) { log("Live name: your NetworkPlayer was not found, are you in a room?"); return false; }
    var ok = false;
    if (x.m) { try { x.m.method("set_playerName").invoke(Il2Cpp.string(String(value))); ok = true; } catch (e) { log("Live name (model): " + e); } }
    else log("Live name: player model not found");
    // the game only copies the name onto your own nameplate when the avatar is created, so write it there too
    try {
        var t = x.np.field("playerNameText").value;
        if (t && !t.isNull()) { t.method("set_richText").invoke(true); t.method("set_text").invoke(Il2Cpp.string(String(value))); ok = true; }
    } catch (e) { log("Live name (text): " + e); }
    // the game reads PlayerPrefs from memory, not the XML file, so set it there too or the old name comes back on respawn
    try {
        var PP = coreImg().class("UnityEngine.PlayerPrefs");
        PP.method("SetString").invoke(Il2Cpp.string("PLAYERNAME"), Il2Cpp.string(String(value)));
        PP.method("Save").invoke();
    } catch (e) { log("Live name (prefs): " + e); }
    thRichNameLast = 0;
    try { thForceRichName(); } catch (e) { }
    if (ok && p.namePush) { try { thRecreateAvatar(); } catch (e) { log("Name push: " + e); } }
    return ok;
}
// other clients only build your nameplate when your avatar is created, so destroy and recreate it (you stay in the room)
function thRecreateAvatar() {
    var mgr = thFindAll(Il2Cpp.domain.assembly("Normal.Realtime.Shared").image.class("Normal.Realtime.RealtimeAvatarManager"));
    if (!mgr || !mgr.length) throw new Error("RealtimeAvatarManager not found (not in a room?)");
    var m = mgr.get(0);
    m.method("DestroyAvatarIfNeeded").invoke();
    m.method("CreateAvatarIfNeeded").invoke();
    log("Name push: avatar recreated so everyone re-reads your name");
}

function thLiveSkin(hex) {
    try {
        var x = thLocal();
        if (!x || !x.m) return false;
        var h = String(hex).replace(/^#/, "");
        var color = x.m.method("get_skin").invoke();
        color.field("r").value = parseInt(h.substr(0, 2), 16) / 255;
        color.field("g").value = parseInt(h.substr(2, 2), 16) / 255;
        color.field("b").value = parseInt(h.substr(4, 2), 16) / 255;
        color.field("a").value = 1.0;
        x.m.method("set_skin").invoke(color);
        return true;
    } catch (e) { log("Live skin: " + e); return false; }
}

var thLastLive = false;
function buddyName(key, value) {
    buddyWritePref(key, value);
    thLastLive = key === "PLAYERNAME" ? thLiveName(value) : false;
}

function buddySkin(hex) {
    var v = "%23" + hex.replace(/^#/, "");
    buddyWritePref("PLAYERSKIN", v);
    buddyWritePref("RAGDOLLSKIN", v);
    thLastLive = thLiveSkin(hex);
}

function thCommunityNameColor(hex) {
    try {
        var f = new File(BUDDY_PREFS, "r");
        var xml = f.readText(); f.close();
        var match = xml.match(/<string name="PLAYERNAME">([\s\S]*?)<\/string>/);
        if (!match) throw Error("PLAYERNAME not found; name unchanged");
        var decode = function (x) { return x.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&amp;/g, "&"); };
        var name = decode(match[1]).replace(/<[^>]*>/g, "");
        if (!name) throw Error("PLAYERNAME empty; name unchanged");
        buddyName("PLAYERNAME", "<color=#" + hex + ">" + name + "</color>");
        say(thLastLive ? "Name color applied live" : "Name color saved; restart to apply");
    } catch (e) { log("Name color: " + e); say("Name color failed, see log"); }
}

function thAnimeSkin(enabled) {
    var KEY = "IKSKIN_INDEX", BACKUP = "THOOMS_ORIGINAL_IKSKIN_INDEX";
    try {
        var pref = coreImg().class("UnityEngine.PlayerPrefs");
        var key = Il2Cpp.string(KEY), backup = Il2Cpp.string(BACKUP);
        var has = function (s) { return !!pref.method("HasKey", 1).invoke(s); };
        var get = function (s, fb) { return pref.method("GetInt", 2).invoke(s, fb); };
        var put = function (s, n) { pref.method("SetInt", 2).invoke(s, n); };
        var save = function () { pref.method("Save", 0).invoke(); };
        var target;
        if (enabled) {
            if (!has(backup)) {
                if (has(key)) put(backup, get(key, 0));
                else put(backup, -2147483647);
            }
            target = 4;
            put(key, target);
            save();
        } else {
            if (!has(backup)) { say("Anime V2: no original index saved"); return; }
            target = get(backup, -2147483647);
            if (target === -2147483647) pref.method("DeleteKey", 1).invoke(key);
            else put(key, target);
            pref.method("DeleteKey", 1).invoke(backup);
            save();
        }
        try {
            var f = new File(BUDDY_PREFS, "r");
            var xml = f.readText(); f.close();
            var re = /<int\s+name="IKSKIN_INDEX"\s+value="[^"]*"\s*\/>/;
            if (enabled || target !== -2147483647) {
                var replacement = '<int name="IKSKIN_INDEX" value="' + target + '" />';
                if (re.test(xml)) xml = xml.replace(re, replacement);
                else xml = xml.replace("</map>", "    " + replacement + "\n</map>");
            } else {
                xml = xml.replace(re, "");
            }
            var out = new File(BUDDY_PREFS, "w");
            out.write(xml); out.flush(); out.close();
            log("Anime V2 XML synchronized");
        } catch (xmlErr) { log("Anime V2 XML sync unavailable: " + xmlErr); }
        say(enabled ? "Anime index 4 saved (rejoin/restart)" : "Original skin index restored");
    } catch (e) { log("Anime V2 failed: " + e); say("Anime V2 failed, see log"); }
}

// ---------------------------------------------------------------- RGB name / skin

function rainbowHex() {
    var h = ((Date.now() / 2500) % 1 + 1) % 1;
    var x = h * 6, i = Math.floor(x), f = x - i, q = 1 - f;
    var r = 0, g = 0, b = 0;
    switch (i % 6) {
        case 0: r = 1; g = f; b = 0; break;
        case 1: r = q; g = 1; b = 0; break;
        case 2: r = 0; g = 1; b = f; break;
        case 3: r = 0; g = q; b = 1; break;
        case 4: r = f; g = 0; b = 1; break;
        default: r = 1; g = 0; b = q; break;
    }
    var h2 = function (n) { return Math.round(n * 255).toString(16).padStart(2, "0").toUpperCase(); };
    return h2(r) + h2(g) + h2(b);
}

function findRgbNameTarget() {
    try {
        var myNP = thMyNP();
        var players = myNP ? [myNP] : [];
        if (!players.length) return false;
        for (var i = 0; i < players.length; i++) {
            var np = players[i];
            if (!np || np.isNull()) continue;
            try {
                var textObj = np.field("playerNameText").value;
                if (!textObj || textObj.isNull()) continue;
                var current = "";
                try { current = textObj.method("get_text").invoke().content; } catch (e) { }
                var plain = stripTmpTags(current);
                if (plain && plain !== "RGB TEST") rgbNamePlain = plain;
                rgbNamePlayer = np;
                rgbNameText = textObj;
                try { rgbNameText.method("set_richText").invoke(true); } catch (e) { }
                return true;
            } catch (e) { }
        }
    } catch (e) { log("RGB name search: " + e); }
    return false;
}

// Remote players set your nameplate only in NetworkPlayer.OnRealtimeModelReplaced / InitializePlayer (checked in the
// binary), so a per-frame color cycle is invisible to them. Instead: per-letter rainbow rich text, sent as the real name.
var rgbState = { base: "", hue: 0, at: 0 };
function hsvHex(h) {
    var f = function (n) { var k = (n + h * 6) % 6; return Math.round(255 * (1 - Math.max(0, Math.min(k, 4 - k, 1)))); };
    return [f(5), f(3), f(1)].map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
}
function rainbowText(base, hue) {
    var out = "", chars = Array.from(base), n = Math.max(1, chars.length);
    for (var i = 0; i < chars.length; i++) out += chars[i] === " " ? " " : "<color=#" + hsvHex((hue + i / n) % 1) + ">" + chars[i] + "</color>";
    return out;
}
function applyRgbName() {
    var now = Date.now();
    if (!rgbState.base) {
        var x = thLocal();
        var cur = (p.customName || (x && x.m ? thName(x.m) : "") || rgbNamePlain).replace(/<[^>]*>/g, "").replace(/\n/g, " ").trim();
        rgbState.base = cur || "THOOM"; rgbState.at = 0;
    }
    if (rgbState.at && (p.rgbEvery <= 0 || now - rgbState.at < p.rgbEvery * 1000)) return;
    rgbState.at = now;
    if (rgbState.retry && now - rgbState.retry < 3000) return;
    if (!thLocal()) { rgbState.retry = now; rgbState.at = 0; return; }   // not in a room yet: try again in 3s
    rgbState.retry = 0;
    buddyName("PLAYERNAME", rainbowText(rgbState.base, rgbState.hue));
    rgbState.hue = (rgbState.hue + 0.15) % 1;
    if (!thLastLive) log("Rainbow name: live change failed, see the Live name lines above");
}
function restoreRgbName() {
    if (rgbState.base) buddyName("PLAYERNAME", rgbState.base);
    rgbState.base = "";
    rgbNamePlayer = null; rgbNameText = null;
}

// Names saved in PlayerPrefs only render their <color> tags if the nameplate's
// TextMeshPro has rich text enabled. The game may have it off, in which case the
// tags show up literally - force it on once a second.
function thForceRichName() {
    var now = Date.now();
    if (now - thRichNameLast < 1000) return;
    thRichNameLast = now;
    try {
        if (!rgbNameText || rgbNameText.isNull()) {
            findRgbNameTarget(); // also enables rich text on the text component it finds
            return;
        }
        rgbNameText.method("set_richText").invoke(true);
    } catch (e) { rgbNameText = null; }
}

function findRgbSkinModel() {
    try {
        var myNP = thMyNP();
        var players = myNP ? [myNP] : [];
        if (!players.length) return false;
        for (var i = 0; i < players.length; i++) {
            var np = players[i];
            if (!np || np.isNull()) continue;
            var fields = ["<model>k__BackingField", "model", "_model"];
            for (var j = 0; j < fields.length; j++) {
                try {
                    var model = np.field(fields[j]).value;
                    if (model && !model.isNull() && model.class.name === "PlayerBase") { rgbSkinModel = model; return true; }
                } catch (e) { }
            }
            try {
                var model2 = np.method("get_model").invoke();
                if (model2 && !model2.isNull() && model2.class.name === "PlayerBase") { rgbSkinModel = model2; return true; }
            } catch (e) { }
        }
    } catch (e) { log("RGB skin search: " + e); }
    return false;
}

function applyRgbNetworkSkin() {
    try {
        var now = Date.now();
        if (now - rgbSkinLastUpdate < RGB_SKIN_UPDATE_MS) return;
        rgbSkinLastUpdate = now;
        if (!rgbSkinModel || rgbSkinModel.isNull()) {
            if (now - rgbSkinLastFind < 1000) return;
            rgbSkinLastFind = now;
            if (!findRgbSkinModel()) return;
        }
        var color = rgbSkinModel.method("get_skin").invoke();
        if (!color) return;
        var h = ((now / 2500) % 1 + 1) % 1;
        var x = h * 6, sector = Math.floor(x), f = x - sector, q = 1 - f;
        var r = 0, g = 0, b = 0;
        switch (sector % 6) {
            case 0: r = 1; g = f; b = 0; break;
            case 1: r = q; g = 1; b = 0; break;
            case 2: r = 0; g = 1; b = f; break;
            case 3: r = 0; g = q; b = 1; break;
            case 4: r = f; g = 0; b = 1; break;
            default: r = 1; g = 0; b = q; break;
        }
        color.field("r").value = r;
        color.field("g").value = g;
        color.field("b").value = b;
        color.field("a").value = 1.0;
        rgbSkinModel.method("set_skin").invoke(color);
    } catch (e) {
        rgbSkinModel = null; rgbSkinLastFind = 0;
    }
}

// ---------------------------------------------------------------- combat tools

function thOneShot(enable) {
    try {
        if (!enable) {
            thWeaponOriginals.forEach(function (x) {
                try { x.o.field("Damage").value = x.d; x.o.field("HitDamage").value = x.h; } catch (e) { }
            });
            thWeaponOriginals.clear();
            say("One-Shot Guns OFF");
            return;
        }
        var all = thFindAll(gameImg().class("MultiplayerGrabable"));
        for (var i = 0; i < all.length; i++) {
            var g = all.get(i);
            var wi = null;
            try { wi = g.field("weaponInfo").value; } catch (e) { }
            if (!wi || wi.isNull()) continue;
            var cls = "", name = "";
            try { cls = g.class.name; } catch (e) { }
            try { name = String(g.method("get_name").invoke().content); } catch (e) { }
            if (!name || name === "undefined") { try { name = String(g.method("get_gameObject").invoke().method("get_name").invoke().content); } catch (e) { } }
            if (!/(Pistol|Gun|Taser|Crossbow|Rifle|Shotgun|Minigun|Launcher|Grenade|Mortar)/i.test(name + " " + cls)) continue;
            try {
                var k = wi.handle.toString();
                if (!thWeaponOriginals.has(k)) thWeaponOriginals.set(k, { o: wi, d: wi.field("Damage").value, h: wi.field("HitDamage").value });
                wi.field("Damage").value = 99999.0;
                wi.field("HitDamage").value = 99999.0;
            } catch (e) { }
        }
        say("One-Shot Guns ON");
    } catch (e) { log("One-Shot Guns: " + e); }
}

function resolveRecoilFields() {
    recoilOffs = [];
    if (!RecoilCls) return;
    var wanted = [["<OutRot>k__BackingField", 3], ["<OutLoc>k__BackingField", 3], ["_targetRot", 3], ["_targetLoc", 3],
        ["_rawRotOut", 3], ["_rawLocOut", 3], ["_smoothRotOut", 3], ["_smoothLocOut", 3],
        ["_noiseTarget", 2], ["_noiseOut", 2], ["_pushTarget", 1], ["_pushOut", 1]];
    var missing = [];
    for (var i = 0; i < wanted.length; i++) {
        var f = null;
        try { f = RecoilCls.tryField(wanted[i][0]); } catch (e) { }
        if (f) recoilOffs.push({ off: f.offset, n: wanted[i][1] });
        else missing.push(wanted[i][0]);
    }
    log("No recoil: " + recoilOffs.length + " of " + wanted.length + " fields found" +
        (missing.length ? " (missing: " + missing.join(", ") + ")" : ""));
}

function zeroRecoil(self) {
    if (!recoilOffs) return;
    for (var i = 0; i < recoilOffs.length; i++) {
        var r = recoilOffs[i];
        try {
            for (var k = 0; k < r.n; k++) self.handle.add(r.off + k * 4).writeFloat(0);
        } catch (e) { }
    }
}

function thWeaponInfo() {
    try {
        var all = thFindAll(gameImg().class("MultiplayerGrabable"));
        var found = 0;
        log("===== HELD WEAPON =====");
        for (var i = 0; i < all.length; i++) {
            var g = all.get(i);
            var grabbed = false;
            try { grabbed = !!g.field("grabbed").value; } catch (e) { }
            if (!grabbed) continue;
            found++;
            var n = "?", c = "?", bits = [];
            try { n = g.method("get_name").invoke().content; } catch (e) { }
            try { c = g.class.name; } catch (e) { }
            try { bits.push("CurrentAmmo=" + g.field("CurrentAmmo").value); } catch (e) { }
            try {
                var wi = g.field("weaponInfo").value;
                if (wi && !wi.isNull()) {
                    ["Damage", "HitDamage", "FireRate", "MinimumHitVelocity", "Ammo", "WeaponCooldown", "WeaponType"].forEach(function (f) {
                        try { bits.push(f + "=" + wi.field(f).value); } catch (e) { }
                    });
                }
            } catch (e) { }
            log("name=\"" + n + "\" class=" + c + " " + bits.join(" | "));
        }
        if (!found) log("no grabbed weapon found");
        say(found ? "Weapon info logged" : "Hold a weapon first");
    } catch (e) { log("Weapon info: " + e); }
}

function thNoAbilityCooldown() {
    try {
        var all = thFindAll(gameImg().class("PowerManager"));
        var changed = 0, last = "none";
        for (var i = 0; i < all.length; i++) {
            var pm = all.get(i);
            var pw = null;
            try { pw = pm.field("currentPower").value; } catch (e) { }
            if (!pw || pw.isNull()) continue;
            var cn = "?";
            try { cn = pw.class.name; } catch (e) { }
            last = cn;
            if (cn === "DashPower") { try { pw.field("cooldown").value = false; changed++; } catch (e) { } }
            else if (cn === "SmashPower") { try { pw.field("Cooldown").value = 0.0; changed++; } catch (e) { } }
            else if (cn === "LaserPower") { try { pw.field("charge").value = pw.field("MaxCharge").value; changed++; } catch (e) { } }
        }
        if (changed && !prev.noCdMsg) { prev.noCdMsg = true; say("No Cooldown: " + last); }
    } catch (e) { log("Ability cooldown: " + e); }
}

function thAbilities() {
    try {
        var img = gameImg();
        var power = img.class("PowerManager");
        var instances = thFindAll(power);
        for (var i = 0; i < instances.length; i++) {
            var pm = instances.get(i);
            if (!pm || pm.isNull()) continue;
            ["grappleOwned", "dashOwned", "laserOwned", "fireFistOwned", "smashOwned", "kamehamehaOwned", "instantTransmissionOwned"].forEach(function (f) {
                try { pm.field(f).value = true; } catch (e) { }
            });
            ["SetLaserAvailable", "SetFireFistAvailable", "SetSmashAvailable", "SetKamehamehaAvailable", "SetInstantTransmissionAvailable"].forEach(function (m) {
                try { pm.method(m, 1).invoke(true); } catch (e) { }
            });
        }
    } catch (e) { }
}

function thFastLaserTick() {
    if (!thFastLaserEnabled) return;
    try {
        var k = thFastLaserKameInst;
        if (k && !(k.isNull && k.isNull())) { try { k.field("_onCooldown").value = false; } catch (e) { } }
        var l = thFastLaserLaserInst;
        if (l && !(l.isNull && l.isNull())) {
            try { l.field("recharging").value = false; } catch (e) { }
            try { l.field("charge").value = 999; } catch (e) { }
        }
    } catch (e) { }
}

function thFastLaserSet(on) {
    if (!on) {
        thFastLaserEnabled = false;
        for (var i = 0; i < thFastLaserHooks.length; i++) { try { thFastLaserHooks[i].revert(); } catch (e) { } }
        thFastLaserHooks = [];
        thFastLaserInstalled = false;
        thFastLaserKameInst = null;
        thFastLaserLaserInst = null;
        return;
    }
    if (thFastLaserEnabled && thFastLaserInstalled) return;
    thFastLaserEnabled = true;
    if (thFastLaserInstalled) return;
    try {
        var img = gameImg();
        var Kame = null, Laser = null;
        try { Kame = img.class("KamehamehaPoower"); } catch (e) { }
        try { Laser = img.class("LaserPower"); } catch (e) { }
        if (!Kame && !Laser) throw Error("Kamehameha and LaserPower not found");
        var kameFire = null;
        if (Kame) {
            for (var a = 0; a < Kame.methods.length; a++) {
                var m = Kame.methods[a];
                if (m.name === "Fire" && m.parameters.length === 1) {
                    try { void m.nativeFunction; kameFire = m; } catch (e) { }
                }
            }
            if (kameFire) {
                for (var b = 0; b < Kame.methods.length; b++) {
                    var mm = Kame.methods[b];
                    if (mm.name === "OnTriggerPress") {
                        try {
                            void mm.nativeFunction;
                            (function (orig) {
                                mm.implementation = function () {
                                    if (!thFastLaserEnabled) return orig.invokeRaw(this.handle);
                                    thFastLaserKameInst = this;
                                    var result;
                                    try { result = orig.invokeRaw(this.handle); } catch (e) { }
                                    try {
                                        this.field("_charging").value = false;
                                        this.field("_chargeTime").value = 0;
                                        kameFire.invokeRaw(this.handle, 0.016);
                                    } catch (e) { }
                                    return result;
                                };
                                thFastLaserHooks.push(mm);
                            })(mm);
                        } catch (e) { log("Fast Lasers press hook: " + e); }
                    }
                    if (mm.name === "OnTriggerRelease") {
                        try {
                            void mm.nativeFunction;
                            (function (orig) {
                                mm.implementation = function () {
                                    var result = orig.invokeRaw(this.handle);
                                    if (thFastLaserEnabled) {
                                        try { this.field("_onCooldown").value = false; } catch (e) { }
                                        try { this.field("_charging").value = false; } catch (e) { }
                                    }
                                    return result;
                                };
                                thFastLaserHooks.push(mm);
                            })(mm);
                        } catch (e) { log("Fast Lasers release hook: " + e); }
                    }
                }
            }
        }
        if (Laser) {
            for (var c = 0; c < Laser.methods.length; c++) {
                var lm = Laser.methods[c];
                if (lm.name === "OnTriggerRelease") {
                    try {
                        void lm.nativeFunction;
                        (function (orig) {
                            lm.implementation = function () {
                                thFastLaserLaserInst = this;
                                var result = orig.invokeRaw(this.handle);
                                if (thFastLaserEnabled) {
                                    try { this.field("recharging").value = false; } catch (e) { }
                                    try { this.field("charge").value = 0; } catch (e) { }
                                }
                                return result;
                            };
                            thFastLaserHooks.push(lm);
                        })(lm);
                    } catch (e) { log("Fast Lasers laser release: " + e); }
                }
                if (lm.name === "Update") {
                    try {
                        void lm.nativeFunction;
                        (function (orig) {
                            lm.implementation = function () {
                                thFastLaserLaserInst = this;
                                if (thFastLaserEnabled) {
                                    try {
                                        this.field("lasering").value = true;
                                        this.field("triggerHeld").value = true;
                                        this.field("recharging").value = false;
                                        this.field("charge").value = 999;
                                    } catch (e) { }
                                }
                                var result = orig.invokeRaw(this.handle);
                                if (thFastLaserEnabled) {
                                    try { this.field("recharging").value = false; } catch (e) { }
                                    try { this.field("charge").value = 999; } catch (e) { }
                                }
                                return result;
                            };
                            thFastLaserHooks.push(lm);
                        })(lm);
                    } catch (e) { log("Fast Lasers laser update: " + e); }
                }
            }
        }
        thFastLaserInstalled = true;
        log("Fast Lasers hooks installed: " + thFastLaserHooks.length);
        say("Fast Lasers ON");
    } catch (e) {
        thFastLaserSet(false);
        log("Fast Lasers: " + e);
        say("Fast Lasers failed, see log");
    }
}

// ---------------------------------------------------------------- progress / resets

var thWipeBusy = false;

function thProgressWipe(kind) {
    if (thWipeBusy) { say("Wipe already running"); return; }
    var addr = null, old = null, modified = false, poll = null;
    var tag = "[WIPE " + kind + "] ";
    var restore = function () {
        if (modified) {
            try { Memory.patchCode(addr, 4, function (p) { p.writeByteArray(old); }); modified = false; log(tag + "instruction restored"); }
            catch (e) { log(tag + "RESTORE FAILED " + e); }
        }
        thWipeBusy = false;
    };
    try {
        if (Process.arch !== "arm64") throw Error("ARM64 only");
        var c = gameImg().class("XPManager");
        var nested = c.nestedClasses.find(function (x) { return x.name === "<SaveAllToCloud>d__50"; });
        if (!nested) throw Error("Save state machine missing");
        var matches = Il2Cpp.gc.choose(c);
        if (matches.length !== 1) throw Error("Expected one XPManager, found " + matches.length);
        var mgr = matches[0];
        var offset = kind === "Level Wipe" ? 0x580 : 0x588;
        var pattern = kind === "Level Wipe" ? /w8,\s*w20,\s*w8,\s*gt/ : /w22,\s*w0,\s*w9,\s*gt/;
        var dest = kind === "Level Wipe" ? "w8" : "w22";
        addr = nested.method("MoveNext").virtualAddress.add(offset);
        var inst = Instruction.parse(addr);
        if (inst.mnemonic !== "csel" || !pattern.test(inst.opStr)) throw Error("Instruction mismatch: " + inst);
        if (c.field("prestige").offset !== 0x28) throw Error("Prestige layout mismatch");
        if (kind === "Level Wipe" && mgr.field("localXP").value !== 0) throw Error("Local XP is not zero; reset canceled");
        thWipeBusy = true;
        old = addr.readByteArray(4);
        Memory.patchCode(addr, 4, function (p) {
            var w = new Arm64Writer(p, { pc: addr });
            w.putMovRegReg(dest, "wzr"); w.flush();
        });
        modified = true;
        var verify = Instruction.parse(addr);
        if (verify.mnemonic !== "mov" || verify.opStr.indexOf(dest + ", wzr") < 0) throw Error("Patch verification failed");
        if (kind === "Level Wipe") {
            mgr.field("localXP").value = 0;
            mgr.field("cloudXP").value = 0;
        } else mgr.field("prestige").value = 0;
        say(kind + ": saving to cloud...");
        var task = mgr.method("SaveAllToCloud").invoke();
        var started = Date.now();
        poll = setInterval(function () {
            Il2Cpp.perform(function () {
                try {
                    var done = task.method("get_IsCompleted").invoke();
                    if (!done && Date.now() - started < 30000) return;
                    clearInterval(poll);
                    if (!done) say(kind + ": timeout; verify after restart");
                    else {
                        var bad = task.method("get_IsFaulted").invoke() || task.method("get_IsCanceled").invoke();
                        say(kind + (bad ? ": save failed" : ": save finished; verify after restart"));
                    }
                    restore();
                } catch (e) { clearInterval(poll); log(tag + e); restore(); }
            });
        }, 250);
    } catch (e) {
        if (poll) clearInterval(poll);
        log(tag + e);
        restore();
        say(kind + " failed, see log");
    }
}

function thSPWipe() {
    try {
        var cls = gameImg().class("XPManager");
        var instances = Il2Cpp.gc.choose(cls);
        if (instances.length !== 1) throw Error("Expected one XPManager, found " + instances.length);
        var manager = instances[0];
        var names = ["spAvailable", "SPAvailable", "sp_available", "availableSP", "localSP"];
        var field = null;
        for (var i = 0; i < names.length; i++) {
            try {
                field = manager.field(names[i]);
                if (field && field.type.name === "System.Int32") break;
            } catch (e) { }
            field = null;
        }
        if (!field) throw Error("Available SP field not verified; no changes made");
        var before = field.value;
        field.value = 0;
        log("SP wipe " + field.name + ": " + before + " -> 0");
        say("SP=0 locally; cloud persistence unverified");
    } catch (e) { log("SP wipe: " + e); say("SP wipe failed, see log"); }
}

function thLocalStatWipe(key) {
    try {
        var prefs = coreImg().class("UnityEngine.PlayerPrefs");
        prefs.method("SetInt").invoke(Il2Cpp.string(key), 0);
        prefs.method("Save").invoke();
        log("Wipe " + key + " local value set to 0 (leaderboard not confirmed)");
    } catch (e) { log("Wipe " + key + ": " + e); }
}

function thResetLeaderboard(keys) {
    try {
        var cls = null;
        var asms = Il2Cpp.domain.assemblies;
        for (var i = 0; i < asms.length; i++) {
            try { cls = asms[i].image.class("Oculus.Platform.Leaderboards"); if (cls) break; } catch (e) { }
        }
        if (!cls) throw Error("Leaderboards class missing");
        var write = cls.methods.find(function (m) {
            return m.name === "WriteEntry" && m.isStatic && m.parameterCount === 4 &&
                m.parameters[0].type.name === "System.String" &&
                m.parameters[1].type.name === "System.Int64" &&
                m.parameters[2].type.name === "System.Byte[]" &&
                m.parameters[3].type.name === "System.Boolean";
        });
        if (!write) throw Error("WriteEntry overload missing");
        keys.forEach(function (key) {
            try {
                var extra = Il2Cpp.array(Il2Cpp.corlib.class("System.Byte"), 0);
                var req = write.invoke(Il2Cpp.string(key), int64(0), extra, true);
                log(key + " = 0 request sent: " + String(req));
            } catch (e) { log(key + " reset: " + e); }
        });
    } catch (e) { log("Leaderboard reset: " + e); }
}

function thMoneyWipeAll() {
    try {
        var cls = gameImg().class("LocalGameManager");
        var arr = Il2Cpp.gc.choose(cls);
        var inst = arr && arr.length ? arr[0] : null;
        if (!inst) { say("Money wipe: no LocalGameManager"); return; }
        var current = 0;
        try { current = Number(inst.method("GetMoney").invoke()); } catch (e) { }
        log("Money before wipe: " + current);
        if (current > 0) { try { cls.method("AddMoney", 1).invoke(-current); } catch (e) { log("AddMoney reset: " + e); } }
        try { inst.field("localMoney").value = 0; inst.field("cloudMoney").value = 0; } catch (e) { log("Field reset: " + e); }
        var task = null;
        try { task = inst.method("SaveMoneyToCloud").invoke(); } catch (e) { log("SaveMoneyToCloud: " + e); }
        var checks = 0;
        var timer = setInterval(function () {
            Il2Cpp.perform(function () {
                try {
                    checks++;
                    var done = task ? Boolean(task.method("get_IsCompleted").invoke()) : true;
                    if (!done && checks < 40) return;
                    clearInterval(timer);
                    thResetLeaderboard(["MOSTMONEY"]);
                    say(done ? "Money wipe done; verify after restart" : "Money wipe timeout; verify after restart");
                } catch (e) { clearInterval(timer); thResetLeaderboard(["MOSTMONEY"]); }
            });
        }, 500);
    } catch (e) { say("Money wipe failed: " + e); }
}

function thAllResetsWipe() {
    try {
        thSPWipe();
        ["DEATHS", "PLAYERKILLS", "RAGDOLLKILLS"].forEach(thLocalStatWipe);
        setTimeout(function () { Il2Cpp.perform(function () { try { thMoneyWipeAll(); } catch (e) { log("Money: " + e); } }); }, 750);
        setTimeout(function () { Il2Cpp.perform(function () { thResetLeaderboard(["PVPKILLS", "DEATHS", "BUDDYKILLS"]); }); }, 1500);
        say("All Resets started; level/prestige untouched, restart to verify");
    } catch (e) { say("All Resets failed: " + e); }
}

// ---------------------------------------------------------------- zombies

function thZombieApply() {
    try {
        var found = Il2Cpp.gc.choose(gameImg().class("AIRifleman")) || [];
        var n = 0;
        for (var i = 0; i < found.length; i++) {
            var z = found[i];
            try {
                if (!z || z.isNull()) continue;
                var key = String(z.handle);
                var base = thZombieOriginals.get(key);
                if (!base) { base = {}; thZombieOriginals.set(key, base); }
                var set = function (field, factor, absolute) {
                    try {
                        var f = z.field(field);
                        if (!(field in base)) base[field] = f.value;
                        var original = Number(base[field]);
                        var v = absolute ? factor : original * factor;
                        if (Number.isFinite(v) && Math.abs(v) < 3e38) f.value = v;
                    } catch (e) { }
                };
                ["moveSpeed", "strafeSpeed"].forEach(function (f) { set(f, thZombieCfg.speed); });
                ["maxHealth", "health"].forEach(function (f) { set(f, thZombieCfg.health); });
                set("shotDamage", thZombieCfg.damage);
                ["burstInterval", "burstCooldownMin", "burstCooldownMax"].forEach(function (f) { set(f, thZombieCfg.rapid ? 0.05 : 0, true); });
                if (!thZombieCfg.rapid) {
                    ["burstInterval", "burstCooldownMin", "burstCooldownMax"].forEach(function (f) {
                        if (f in base) { try { z.field(f).value = base[f]; } catch (e) { } }
                    });
                }
                ["recoilKickBack", "recoilKickUp", "recoilKickSide", "recoilPitch", "recoilYaw", "recoilRoll"].forEach(function (f) {
                    if (thZombieCfg.recoil) set(f, 0, true);
                    else if (f in base) { try { z.field(f).value = base[f]; } catch (e) { } }
                });
                try {
                    var ef = z.field("enableRecoil");
                    if (!("enableRecoil" in base)) base.enableRecoil = ef.value;
                    ef.value = thZombieCfg.recoil ? false : base.enableRecoil;
                } catch (e) { }
                if (thZombieCfg.spread) set("shotSpread", 0, true);
                else if ("shotSpread" in base) { try { z.field("shotSpread").value = base.shotSpread; } catch (e) { } }
                n++;
            } catch (e) { log("Zombie: " + e); }
        }
        say("Rifle zombie stats applied: " + n);
    } catch (e) { log("Zombie apply: " + e); say("Rifle zombie stats unavailable"); }
}

function thZombieSize(v) {
    thZombieCfg.size = v;
    try {
        var core = coreImg();
        var arr = core.class("UnityEngine.Object").method("FindObjectsOfType").inflate(core.class("UnityEngine.Transform")).invoke();
        var n = 0;
        for (var i = 0; i < arr.length; i++) {
            try {
                var t = arr.get(i);
                var name = String(t.method("get_gameObject").invoke().method("get_name").invoke().content);
                if (!/Zombie/i.test(name)) continue;
                t.method("set_localScale", 1).invoke([v, v, v]);
                n++;
            } catch (e) { }
        }
        say("Zombie size " + v + "x: " + n + " transforms");
    } catch (e) { log("Zombie scale: " + e); say("Zombie scaling unavailable"); }
}

function thZombieArmy(name, count) {
    count = Math.max(1, Math.min(100, Number(count) || 20));
    var i = 0;
    var timer = setInterval(function () {
        if (i++ >= count) { clearInterval(timer); return; }
        try { Il2Cpp.perform(function () { thSpawn(name); }); }
        catch (e) { log("Army: " + e); clearInterval(timer); }
    }, 200);
}

function applyZombieAll() {
    thZombieCfg.size = p.zSize;
    thZombieCfg.health = p.zHealth;
    thZombieCfg.speed = p.zSpeed;
    thZombieCfg.damage = p.zDamage;
    thZombieCfg.rapid = !!p.zRapid;
    thZombieCfg.recoil = !!p.zRecoil;
    thZombieCfg.spread = !!p.zSpread;
    thZombieApply();
    thZombieSize(p.zSize);
}

function thUltimateRifles() { return Il2Cpp.gc.choose(gameImg().class("AIRifleman")); }
function thUltimateKey(r) { return String(r.handle); }
function thUltimateStopTimer() {
    if (thUltimateZombie.timer !== null) { clearInterval(thUltimateZombie.timer); thUltimateZombie.timer = null; }
}

function thUltimateApply(r) {
    var key = thUltimateKey(r);
    if (thUltimateZombie.modified.has(key)) return;
    var desired = {
        moveSpeed: 20.0, strafeSpeed: 20.0, burstCount: 4, burstInterval: 0.03,
        burstCooldownMin: 0.24, burstCooldownMax: 0.48, shotDamage: 1500.0, shotSpread: 0.0,
        enableRecoil: false, recoilKickBack: 0.0, recoilKickUp: 0.0, recoilKickSide: 0.0,
        recoilPitch: 0.0, recoilYaw: 0.0, recoilRoll: 0.0, aimSmoothSpeed: 12.0, recoilReturnSpeed: 9.0
    };
    var original = {};
    try {
        Object.keys(desired).forEach(function (name) {
            try { original[name] = r.field(name).value; } catch (e) { }
        });
        var max = Number(r.field("maxHealth").value);
        var hp = Number(r.field("health").value);
        if (Number.isFinite(max) && Number.isFinite(hp) && max > 0 && hp > 0) {
            original.maxHealth = max;
            original.health = hp;
        }
        thUltimateZombie.modified.set(key, { original: original, rifle: r });
        Object.keys(desired).forEach(function (name) {
            if (!(name in original)) return;
            try { r.field(name).value = desired[name]; } catch (e) { }
        });
        if ("maxHealth" in original) {
            try { r.field("maxHealth").value = original.maxHealth * 900; r.field("health").value = original.health * 900; } catch (e) { }
        }
        say("UltimateZombie upgraded");
    } catch (e) { log("UltimateZombie apply: " + e); }
}

function thUltimateOn() {
    if (thUltimateZombie.active) return;
    thUltimateZombie.active = true;
    thUltimateZombie.seen.clear();
    thUltimateZombie.modified.clear();
    thUltimateZombie.scans = 0;
    try {
        var base = thUltimateRifles();
        for (var i = 0; i < base.length; i++) { if (base[i] && !base[i].isNull()) thUltimateZombie.seen.add(thUltimateKey(base[i])); }
    } catch (e) { log("UltimateZombie baseline: " + e); }
    thSpawn("ZombieRifle");
    thUltimateZombie.timer = setInterval(function () {
        if (!thUltimateZombie.active) { thUltimateStopTimer(); return; }
        try {
            Il2Cpp.perform(function () {
                if (!thUltimateZombie.active) return;
                var rifles = thUltimateRifles();
                for (var j = 0; j < rifles.length; j++) {
                    var r = rifles[j];
                    if (!r || r.isNull()) continue;
                    var key = thUltimateKey(r);
                    if (thUltimateZombie.seen.has(key)) continue;
                    thUltimateZombie.seen.add(key);
                    thUltimateApply(r);
                    thUltimateStopTimer();
                    return;
                }
                if (++thUltimateZombie.scans >= 24) {
                    log("UltimateZombie: no new Rifle Zombie found");
                    say("UltimateZombie: spawn not detected");
                    thUltimateStopTimer();
                }
            });
        } catch (e) { log("UltimateZombie poll: " + e); }
    }, 500);
    say("UltimateZombie ON, spawning");
}

function thUltimateOff() {
    thUltimateZombie.active = false;
    thUltimateStopTimer();
    var deleted = 0, failed = 0;
    try {
        Il2Cpp.perform(function () {
            thUltimateZombie.modified.forEach(function (entry) {
                try {
                    var rifle = entry.rifle;
                    if (!rifle || rifle.isNull()) return;
                    var go = rifle.method("get_gameObject").invoke();
                    if (!go || go.isNull()) throw new Error("GameObject missing");
                    coreImg().class("UnityEngine.Object").method("Destroy", 1).invoke(go);
                    deleted++;
                } catch (e) { failed++; }
            });
        });
    } catch (e) { failed++; log("UltimateZombie OFF: " + e); }
    thUltimateZombie.modified.clear();
    thUltimateZombie.seen.clear();
    say(failed ? "UltimateZombie OFF, deletion failed" : "UltimateZombie OFF, deleted " + deleted);
}

// ---------------------------------------------------------------- item size

function thHeldItemSize(v) {
    try {
        var NR = nrImg(), core = coreImg(), game = gameImg();
        var RV = NR.class("Normal.Realtime.RealtimeView");
        var RT = NR.class("Normal.Realtime.RealtimeTransform");
        var UO = core.class("UnityEngine.Object");
        var Grab = game.class("MultiplayerGrabable");
        var myID = localClientID();
        if (myID === null) { say("Item size: local client ID unavailable"); return; }
        var all = UO.method("FindObjectsOfType", 1).invoke(Grab.type.object);
        var scaled = 0, notOwned = 0, notGrabbed = 0, noSync = 0;
        for (var i = 0; i < all.length; i++) {
            try {
                var grab = all.get(i);
                if (!grab || grab.isNull()) continue;
                var grabbed = false;
                try { grabbed = !!grab.field("grabbed").value; } catch (e) { }
                if (!grabbed) { notGrabbed++; continue; }
                var go = grab.method("get_gameObject").invoke();
                var view = null;
                try { view = go.method("GetComponent", 1).invoke(RV.type.object); } catch (e) { }
                if (!view || view.isNull()) { try { view = go.method("GetComponentInParent", 1).invoke(RV.type.object); } catch (e) { } }
                if (!view || view.isNull()) { notOwned++; continue; }
                if (Number(view.method("get_ownerID").invoke()) !== myID) { notOwned++; continue; }
                var rt = null;
                try { rt = go.method("GetComponent", 1).invoke(RT.type.object); } catch (e) { }
                if (!rt || rt.isNull()) { try { rt = go.method("GetComponentInParent", 1).invoke(RT.type.object); } catch (e) { } }
                if (!rt || rt.isNull()) { noSync++; continue; }
                var tr = rt.method("get_transform").invoke();
                var key = String(tr.handle);
                var original = thItemOriginals.get(key);
                if (!original) {
                    var scale = tr.method("get_localScale").invoke();
                    original = ["x", "y", "z"].map(function (n) { return Number(scale.field(n).value); });
                    if (!original.every(Number.isFinite)) continue;
                    thItemOriginals.set(key, original);
                }
                var newScale = original.map(function (x) { return x * v; });
                if (!newScale.every(Number.isFinite)) continue;
                rt.method("set_syncScale", 1).invoke(true);
                tr.method("set_localScale", 1).invoke(newScale);
                rt.method("SetModelFromTransform", 0).invoke();
                scaled++;
            } catch (e) { log("Item size skip: " + e); }
        }
        log("Normcore scale=" + v + "x replicated=" + scaled + " notOwned=" + notOwned + " notGrabbed=" + notGrabbed + " noSync=" + noSync);
        say("Item size " + v + "x: " + scaled + " owned item(s)");
    } catch (e) { log("Item size: " + e); say("Item scaling unavailable"); }
}

function thItemThumbEnable(value) {
    thItemThumb.enabled = value;
    if (!value) return;
    if (thItemThumb.installed) return;
    try {
        var img = gameImg(), core = coreImg(), nr = nrImg(), xr = xrImg();
        var PM = img.class("PlayerMultiplayer"), MG = img.class("MultiplayerGrabable");
        var UO = core.class("UnityEngine.Object"), RV = nr.class("Normal.Realtime.RealtimeView"), RT = nr.class("Normal.Realtime.RealtimeTransform");
        var ID = xr.class("UnityEngine.XR.InputDevices"), CU = xr.class("UnityEngine.XR.CommonUsages");
        var click = CU.field("primary2DAxisClick").value;
        var out = Memory.alloc(8);
        var pressed = function (node) {
            try {
                var dev = ID.method("GetDeviceAtXRNode", 1).invoke(node);
                if (!dev || dev.isNull()) return false;
                out.writeU8(0);
                var m = dev.method("TryGetFeatureValue", 2).overload("UnityEngine.XR.InputFeatureUsage<System.Boolean>", "System.Boolean&");
                return !!m.invoke(click, out) && out.readU8() !== 0;
            } catch (e) { return false; }
        };
        Interceptor.attach(PM.method("Update", 0).virtualAddress, {
            onEnter: function () {
                if (!thItemThumb.enabled) return;
                if (Date.now() - thItemThumb.last < 80) return;
                var shrink = pressed(4), grow = pressed(5);
                if (shrink === grow) return;
                thItemThumb.last = Date.now();
                try {
                    var mine = localClientID();
                    if (mine === null) return;
                    var all = UO.method("FindObjectsOfType", 1).invoke(MG.type.object);
                    for (var i = 0; i < all.length; i++) {
                        var grab = all.get(i);
                        if (!grab || grab.isNull()) continue;
                        var held = false;
                        try { held = !!grab.field("grabbed").value; } catch (e) { }
                        if (!held) continue;
                        var go = grab.method("get_gameObject").invoke();
                        var rv = null, rt = null;
                        try { rv = go.method("GetComponent", 1).invoke(RV.type.object); } catch (e) { }
                        if (!rv || rv.isNull()) { try { rv = go.method("GetComponentInParent", 1).invoke(RV.type.object); } catch (e) { } }
                        if (!rv || rv.isNull() || Number(rv.method("get_ownerID").invoke()) !== mine) continue;
                        try { rt = go.method("GetComponent", 1).invoke(RT.type.object); } catch (e) { }
                        if (!rt || rt.isNull()) { try { rt = go.method("GetComponentInParent", 1).invoke(RT.type.object); } catch (e) { } }
                        if (!rt || rt.isNull()) continue;
                        var tr = rt.method("get_transform").invoke();
                        var cur = tr.method("get_localScale").invoke();
                        var d = (grow ? 1 : -1) * thItemThumb.step;
                        var nv = ["x", "y", "z"].map(function (k) { return Math.max(0.01, Number(cur.field(k).value) + d); });
                        if (!nv.every(Number.isFinite)) continue;
                        rt.method("set_syncScale", 1).invoke(true);
                        tr.method("set_localScale", 1).invoke(nv);
                        rt.method("SetModelFromTransform", 0).invoke();
                        break;
                    }
                } catch (e) { log("Item thumb: " + e); }
            }
        });
        thItemThumb.installed = true;
        log("Thumbstick scaling hook installed");
    } catch (e) {
        thItemThumb.enabled = false;
        log("Item thumb hook: " + e);
        say("Thumbstick scaling hook failed");
    }
}

// ---------------------------------------------------------------- safezone / SP / abilities

var thSafezoneDamageInstalled = false;

var thRetFalse = null;
function thReturnFalseStub() {
    if (thRetFalse) return thRetFalse;
    var stub = Memory.alloc(Process.pageSize);
    Memory.patchCode(stub, 8, function (code) {
        code.writeU32(0x52800000);          // mov w0, #0
        code.add(4).writeU32(0xd65f03c0);   // ret
    });
    return (thRetFalse = stub);
}
function thSafezoneDamageInstall() {
    if (thSafezoneDamageInstalled) { log("Safezone damage already installed"); return; }
    try {
        var img = gameImg(), core = coreImg();
        var PI = img.class("PlayerInfoSync"), NP = img.class("NetworkPlayer");
        var UO = core.class("UnityEngine.Object");
        ["PlayerInfoSync", "LevelSafeZone"].forEach(function (clsName) {
            try {
                var m = img.class(clsName).method("IsInSafeZone", 1);
                var addr = m.virtualAddress;
                // native "return false" stub: no JS callback, so the game's frequent safezone checks never wait on Frida's JS lock
                if (addr && !addr.isNull()) Interceptor.replace(addr, thReturnFalseStub());
            } catch (e) { }
        });
        var getPlayerMap = function () {
            var map = {};
            try {
                var players = UO.method("FindObjectsOfType", 1).invoke(NP.type.object);
                if (!players) return map;
                for (var i = 0; i < players.length; i++) {
                    var np = players.get(i);
                    if (!np || np.isNull()) continue;
                    var cid = -1;
                    try {
                        var view = np.method("GetComponent", 1).invoke(nrImg().class("Normal.Realtime.RealtimeView").type.object);
                        if (view && !view.isNull()) cid = view.method("get_ownerID").invoke();
                    } catch (e) { }
                    if (cid < 0) continue;
                    map[cid] = np;
                }
            } catch (e) { }
            return map;
        };
        var readHP = function (np) {
            if (!np) return -1;
            try {
                var model = np.method("get_model").invoke();
                if (model && !model.isNull()) {
                    try { var h = model.method("get_health").invoke(); if (typeof h === "number" && isFinite(h)) return h; } catch (e) { }
                    try { var h2 = model.field("health").value; if (typeof h2 === "number" && isFinite(h2)) return h2; } catch (e) { }
                }
            } catch (e) { }
            try { var h3 = np.method("GetHealth").invoke(); if (typeof h3 === "number" && isFinite(h3)) return h3; } catch (e) { }
            return -1;
        };
        var sph = PI.method("SetPlayerHealth", 2);
        var dp = PI.method("DamagePlayer", 3);
        var dpAddr = dp.virtualAddress;
        if (!dpAddr || dpAddr.isNull()) { log("Safezone: no DamagePlayer address"); return; }
        Interceptor.attach(dpAddr, {
            onEnter: function (args) {
                this._thisPtr = args[0];
                this._cid = args[1].toInt32();
                var dmg = this.context.s0;
                this._damage = (typeof dmg === "number" && isFinite(dmg) && dmg > 0) ? dmg : 0;
            },
            onLeave: function (retval) {
                if (retval.toInt32() === 0 && this._cid > 0 && this._damage > 0) {
                    var cid = this._cid, dmg = this._damage;
                    var np = getPlayerMap()[cid];
                    var curHP = readHP(np);
                    var newHP;
                    if (curHP >= 0) newHP = Math.max(0, curHP - dmg);
                    else {
                        try { PI.method("DamageRagdoll", 2).invokeRaw(this._thisPtr, cid, dmg); retval.replace(ptr(1)); return; }
                        catch (e) { newHP = 0; }
                    }
                    try { sph.invokeRaw(this._thisPtr, cid, newHP); } catch (e) { }
                    retval.replace(ptr(1));
                }
            }
        });
        thSafezoneDamageInstalled = true;
        say("Safezone damage installed");
    } catch (e) { log("Safezone install: " + e); say("Safezone install failed"); }
}

function thGiveSP(amount) {
    try {
        amount = Math.max(1, Math.min(1000000, Math.floor(Number(amount) || 500)));
        var xp = gameImg().class("XPManager");
        var inst = null;
        try { inst = xp.field("instance").value; } catch (e) { }
        if (!inst || inst.isNull()) {
            var found = Il2Cpp.gc.choose(xp);
            inst = found && found.length ? found[0] : null;
        }
        if (!inst || inst.isNull()) throw Error("XPManager instance is null");
        // AwardSP is an instance method in this build.
        var n = 0;
        ["AwardSP", "AwardSPPublic"].forEach(function (name) {
            if (n) return;
            try {
                var m = xp.method(name, 1);
                if (m) { m.bind(inst).invoke(amount); n++; }
            } catch (e) { log("Give SP via " + name + ": " + e); }
        });
        if (!n) {
            // Last resort: add straight to the local available-SP field.
            var f = xp.field("spAvailable");
            f.bind(inst).value = Number(f.bind(inst).value || 0) + amount;
            n++;
        }
        say("Awarded " + amount + " SP");
    } catch (e) { log("Give SP: " + e); say("Give SP failed, see log"); }
}

function thKillAllPlayers() {
    try {
        var inst = gameImg().class("PlayerInfoSync").field("instance").value;
        if (!inst || inst.isNull()) throw Error("PlayerInfoSync.instance missing");
        inst.method("KillAllPlayers").invoke();
        say("Kill All Players");
    } catch (e) { say("Kill All failed: " + e); }
}

// ---------------------------------------------------------------- name bypass

function thNameBypassStop() {
    for (var i = 0; i < thNameBypassHooks.length; i++) { try { thNameBypassHooks[i].detach(); } catch (e) { log("Name bypass detach: " + e); } }
    thNameBypassHooks = [];
}

function thNameBypassStart() {
    if (thNameBypassHooks.length) return;
    try {
        var cls = gameImg().class("BuddyNameFilter");
        var method = cls.method("IsNameAllowed", 1).overload("System.String");
        var hook = Interceptor.attach(method.virtualAddress, {
            onEnter: function (args) {
                try {
                    var arg = args[method.isStatic ? 0 : 1];
                    this.thName = arg.isNull() ? "<null>" : new Il2Cpp.String(arg).content;
                } catch (e) { this.thName = "<unreadable>"; }
            },
            onLeave: function (retval) {
                try {
                    var original = retval.toInt32() !== 0;
                    if (!original) retval.replace(ptr(1));
                    log("Name bypass input=" + JSON.stringify(this.thName) + " original=" + original);
                } catch (e) { log("Name bypass: " + e); }
            }
        });
        thNameBypassHooks.push(hook);
        say("Name bypass ON");
    } catch (e) { log("Name bypass start: " + e); say("Name bypass failed, see log"); thNameBypassStop(); }
}

// ---------------------------------------------------------------- dev tools

function thDevDumpClass(name) {
    try {
        var c = gameImg().class(name);
        log("CLASS " + name);
        for (var i = 0; i < c.fields.length; i++) log("FIELD " + c.fields[i].name + " : " + c.fields[i].type.name);
        for (var j = 0; j < c.methods.length; j++) {
            var m = c.methods[j];
            log("METHOD " + m.name + "(" + m.parameters.map(function (x) { return x.type.name; }).join(", ") + ")");
        }
    } catch (e) { log("Dump " + name + ": " + e); }
}

function thDevScanProgression() {
    try {
        var img = gameImg(), n = 0;
        for (var i = 0; i < img.classes.length; i++) {
            try {
                var c = img.classes[i];
                var fields = c.fields.filter(function (f) { return /(xp|exp|level|prestige|skill|spAvailable|money|cash)/i.test(f.name); })
                    .map(function (f) { return f.name + ":" + f.type.name; });
                if (!fields.length) continue;
                var methods = c.methods.filter(function (m) { return /(xp|exp|level|prestige|skill|money|cash)/i.test(m.name); })
                    .slice(0, 20).map(function (m) { return m.name; });
                log(c.name + " fields=[" + fields.join(",") + "] methods=[" + methods.join(",") + "]");
                if (++n >= 40) break;
            } catch (e) { }
        }
        log("Progression scan: " + n + " classes");
    } catch (e) { log("Scan failed: " + e); }
}

// ---------------------------------------------------------------- kill gun (ported)

// ---------------------------------------------------------------- kill gun

(function () {
    var KG = null;
    var beam = null, beamRend = null, beamMat = null;
    var ball = null, ballRend = null, ballMat = null;
    var localPlayer = null, handTR = null, handTRAt = 0;
    var prevPos = null, lastKillAt = 0, triggerLatchUntil = 0;
    var WHITE = [0.9, 0.9, 0.9, 1], RED = [1, 0, 0, 1];

    function gfx() {
        if (KG) return KG;
        KG = {
            GO: coreImg().class("UnityEngine.GameObject"),
            Renderer: coreImg().class("UnityEngine.Renderer"),
            Object: coreImg().class("UnityEngine.Object"),
            Shader: coreImg().class("UnityEngine.Shader"),
            Quaternion: coreImg().class("UnityEngine.Quaternion"),
            Player: gameImg().class("PlayerMultiplayer"),
            NP: gameImg().class("NetworkPlayer"),
            PIS: gameImg().class("PlayerInfoSync"),
            RV: nrImg().class("Normal.Realtime.RealtimeView")
        };
        return KG;
    }

    function getPlayer() {
        try {
            if (localPlayer && !localPlayer.isNull()) return localPlayer;
            var inst = gfx().Player.field("instance").value;
            if (inst && !inst.isNull()) { localPlayer = inst; return inst; }
        } catch (e) { }
        return null;
    }

    function getHand(player) {
        var now = Date.now();
        if (handTR && !handTR.isNull() && now - handTRAt < 1000) return handTR;
        var names = ["rightHand", "rightHandTransform", "handRightAnchor", "rightHandAnchor", "handRight", "rightController"];
        handTR = null;
        for (var i = 0; i < names.length; i++) {
            try {
                var h = player.field(names[i]).value;
                if (!h || h.isNull()) continue;
                try { handTR = h.method("get_transform").invoke(); } catch (e) { handTR = h; }
                break;
            } catch (e) { }
        }
        handTRAt = now;
        return handTR;
    }

    function num(vec, name) { try { return Number(vec.field(name).value); } catch (e) { return 0; } }

    function findShader() {
        var names = ["Universal Render Pipeline/Unlit", "Unlit/Color", "Sprites/Default", "UI/Default", "Legacy Shaders/Diffuse"];
        for (var i = 0; i < names.length; i++) {
            try {
                var s = gfx().Shader.method("Find", 1).invoke(Il2Cpp.string(names[i]));
                if (s && !s.isNull()) return s;
            } catch (e) { }
        }
        return null;
    }

    function setColor(mat, c) {
        try { if (mat && !mat.isNull()) mat.method("set_color", 1).invoke(c); } catch (e) { }
    }

    function primitive(kind, name) {
        var go = gfx().GO.method("CreatePrimitive", 1).invoke(kind);
        try { go.method("set_name", 1).invoke(Il2Cpp.string(name)); } catch (e) { }
        return go;
    }

    function build() {
        if (beam && !beam.isNull() && ball && !ball.isNull()) return true;
        var shader = findShader();
        try {
            if (!beam || beam.isNull()) {
                beam = primitive(3, "KillGunBeam");
                beamRend = beam.method("GetComponent", 1).inflate(gfx().Renderer).invoke();
                if (beamRend && !beamRend.isNull()) {
                    beamMat = beamRend.method("get_material").invoke();
                    if (shader && !shader.isNull() && beamMat && !beamMat.isNull()) {
                        try { beamMat.method("set_shader", 1).invoke(shader); } catch (e) { }
                    }
                    setColor(beamMat, WHITE);
                }
                try {
                    var c = beam.method("GetComponent", 1).inflate(physImg().class("UnityEngine.Collider")).invoke();
                    if (c && !c.isNull()) gfx().Object.method("Destroy", 1).invoke(c);
                } catch (e) { }
            }
        } catch (e) { log("Kill gun beam: " + e); return false; }
        try {
            if (!ball || ball.isNull()) {
                ball = primitive(0, "KillGunBall");
                ballRend = ball.method("GetComponent", 1).inflate(gfx().Renderer).invoke();
                if (ballRend && !ballRend.isNull()) {
                    ballMat = ballRend.method("get_material").invoke();
                    if (shader && !shader.isNull() && ballMat && !ballMat.isNull()) {
                        try { ballMat.method("set_shader", 1).invoke(shader); } catch (e) { }
                    }
                    setColor(ballMat, WHITE);
                }
                try {
                    var c2 = ball.method("GetComponent", 1).inflate(physImg().class("UnityEngine.Collider")).invoke();
                    if (c2 && !c2.isNull()) gfx().Object.method("Destroy", 1).invoke(c2);
                } catch (e) { }
            }
        } catch (e) { log("Kill gun ball: " + e); return false; }
        return true;
    }

    function setBoth(c) { setColor(beamMat, c); setColor(ballMat, c); }
    function show() {
        try { if (beam && !beam.isNull()) beam.method("SetActive", 1).invoke(true); } catch (e) { }
        try { if (ball && !ball.isNull()) ball.method("SetActive", 1).invoke(true); } catch (e) { }
    }
    function hide() {
        try { if (beam && !beam.isNull()) beam.method("SetActive", 1).invoke(false); } catch (e) { }
        try { if (ball && !ball.isNull()) ball.method("SetActive", 1).invoke(false); } catch (e) { }
    }

    function findTarget(player) {
        var hand = getHand(player);
        if (!hand) return null;
        var origin, forward;
        try { origin = hand.method("get_position").invoke(); forward = hand.method("get_forward").invoke(); }
        catch (e) { return null; }
        var ox = num(origin, "x"), oy = num(origin, "y"), oz = num(origin, "z");
        var dx = num(forward, "x"), dy = num(forward, "y"), dz = num(forward, "z");
        var selfNP = null;
        try { selfNP = player.field("networkPlayer").value; } catch (e) { }
        var arr = null;
        try { arr = gfx().Object.method("FindObjectsOfType", 1).overload("System.Type").invoke(gfx().NP.type.object); }
        catch (e) { return { o: [ox, oy, oz], e: [ox + dx * 100, oy + dy * 100, oz + dz * 100], hit: null }; }
        var best = Infinity, hit = null;
        for (var i = 0; arr && i < arr.length; i++) {
            var np = null;
            try { np = arr.get(i); } catch (e) { continue; }
            if (!np || np.isNull()) continue;
            if (selfNP && !selfNP.isNull()) { try { if (np.handle.equals(selfNP.handle)) continue; } catch (e) { continue; } }
            var col = null;
            try { col = np.field("bodyCollider").value; } catch (e) { continue; }
            if (!col || col.isNull()) continue;
            try {
                var bounds = col.method("get_bounds").invoke();
                var center = bounds.method("get_center").invoke();
                var cx = num(center, "x"), cy = num(center, "y"), cz = num(center, "z");
                var t = (cx - ox) * dx + (cy - oy) * dy + (cz - oz) * dz;
                if (t <= 0 || t >= 100 || t >= best) continue;
                var px = ox + dx * t, py = oy + dy * t, pz = oz + dz * t;
                var dist = Math.sqrt((cx - px) * (cx - px) + (cy - py) * (cy - py) + (cz - pz) * (cz - pz));
                var ext = bounds.method("get_extents").invoke();
                var ex = num(ext, "x"), ey = num(ext, "y"), ez = num(ext, "z");
                var er = Math.sqrt(ex * ex + ey * ey + ez * ez);
                if (dist < er + 0.2) { best = t; hit = np; }
            } catch (e) { }
        }
        var t2 = Number.isFinite(best) ? best : 100;
        return { o: [ox, oy, oz], e: [ox + dx * t2, oy + dy * t2, oz + dz * t2], hit: hit };
    }

    function updateBeam(o, e) {
        if (!beam || beam.isNull()) return;
        try {
            var ax = o[0], ay = o[1], az = o[2], bx = e[0], by = e[1], bz = e[2];
            var vx = bx - ax, vy = by - ay, vz = bz - az;
            var len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 0.01;
            var full = len;
            var shade = Math.max(0.01, len - 0.22);
            var q = gfx().Quaternion.method("LookRotation", 1).invoke([vx, vy, vz]);
            var tr = beam.method("get_transform").invoke();
            var nx = vx / full, ny = vy / full, nz = vz / full;
            tr.method("set_position", 1).invoke([(ax + nx * 0.11 + bx - nx * 0.11) / 2,
                (ay + ny * 0.11 + by - ny * 0.11) / 2,
                (az + nz * 0.11 + bz - nz * 0.11) / 2]);
            tr.method("set_rotation", 1).invoke(q);
            tr.method("set_localScale", 1).invoke([0.15, 0.15, shade]);
        } catch (e2) { }
    }

    function updateBall(e) {
        if (!ball || ball.isNull()) return;
        try {
            var tr = ball.method("get_transform").invoke();
            tr.method("set_position", 1).invoke(e);
            tr.method("set_localScale", 1).invoke([0.4, 0.4, 0.4]);
        } catch (e2) { }
    }

    function killPlayer(np) {
        if (!np) return false;
        try {
            if (np.isNull()) return false;
            var rv = np.method("GetComponent", 1).inflate(gfx().RV).invoke();
            if (!rv || rv.isNull()) return false;
            var ownerID = Number(rv.method("get_ownerID").invoke());
            if (!(ownerID >= 0)) return false;
            var pis = gfx().PIS.field("instance").value;
            if (!pis || pis.isNull()) return false;
            pis.method("KillPlayer").invoke(ownerID);
            log("Kill gun: KillPlayer(" + ownerID + ") sent");
            return true;
        } catch (e) { log("Kill gun kill: " + e); return false; }
    }

    function tick() {
        try {
            if (!thKillGunArmed) { hide(); prevPos = null; triggerLatchUntil = 0; return; }
            var grip = ui.input.grip(1);
            if (!grip) { hide(); setBoth(WHITE); prevPos = null; triggerLatchUntil = 0; return; }
            var player = getPlayer();
            if (!player || !build()) return;
            var hand = getHand(player);
            if (!hand) return;
            var pos = null;
            try { pos = hand.method("get_position").invoke(); } catch (e) { return; }
            var px = num(pos, "x"), py = num(pos, "y"), pz = num(pos, "z");
            var moved = 0;
            if (prevPos) {
                var mx = px - prevPos[0], my = py - prevPos[1], mz = pz - prevPos[2];
                moved = Math.sqrt(mx * mx + my * my + mz * mz);
            }
            prevPos = [px, py, pz];
            if (moved > 0.5) { hide(); return; }

            var trigger = ui.input.trigger(1) > 0.5;
            var now = Date.now();
            if (trigger) triggerLatchUntil = now + 80;
            var firing = trigger || now < triggerLatchUntil;

            var target = findTarget(player);
            if (!target) { hide(); return; }
            show();
            updateBeam(target.o, target.e);
            updateBall(target.e);
            if (firing) {
                setBoth(RED);
                if (now - lastKillAt > 250) {
                    lastKillAt = now;
                    if (target.hit) { if (killPlayer(target.hit)) killGunKills++; }
                }
            } else setBoth(WHITE);
        } catch (e) { log("Kill gun tick: " + e); }
    }

    thKillGun = {
        start: function () { thKillGunArmed = true; log("Kill gun ON"); },
        stop: function () { thKillGunArmed = false; hide(); prevPos = null; log("Kill gun OFF"); },
        tick: tick
    };
})();

// ---------------------------------------------------------------- aimbot / wallbang
//
// Silent aim. MultiplayerPistol.ShootMethod runs once per fired shot; we watch it
// (Interceptor.attach, never replace, so the gun keeps working normally), pick the
// player closest to the muzzle line and apply the gun's own WeaponInfo damage
// through PlayerInfoSync.DamagePlayer. Because DamagePlayer is a direct health call,
// the shot lands even when a wall is between you and the target.
//
// Aimbot   = any player inside a cone around the muzzle.
// Wallbang = any player sitting on the bullet line (used when the cone misses).
// Damage is queued and applied from onFrame so no game call happens inside the hook.

var thAimQueue = [];

function thV3(v) {
    try { return [Number(v.field("x").value), Number(v.field("y").value), Number(v.field("z").value)]; }
    catch (e) { return null; }
}

function thTransformPos(tf) {
    try { return tf && !tf.isNull() ? thV3(tf.method("get_position").invoke()) : null; }
    catch (e) { return null; }
}

// Muzzle ray from a MultiplayerPistol: weaponTip -> weaponTipFar, else weaponTip.forward.
function thGunRay(gun) {
    var tip = null;
    try { tip = gun.field("weaponTip").value; } catch (e) { }
    var o = thTransformPos(tip);
    if (!o) { try { o = thV3(gun.method("get_position").invoke()); } catch (e) { } }
    if (!o) return null;
    var far = null;
    try { far = gun.field("weaponTipFar").value; } catch (e) { }
    var f = thTransformPos(far);
    var d = f ? [f[0] - o[0], f[1] - o[1], f[2] - o[2]] : null;
    var len = d ? Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]) : 0;
    if (!(len > 0.0001)) {
        try { d = thV3(tip.method("get_forward").invoke()); } catch (e) { d = null; }
        len = d ? Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]) : 0;
    }
    if (!(len > 0.0001)) return null;
    return { o: o, d: [d[0] / len, d[1] / len, d[2] / len] };
}

function thAimScan(gun) {
    var ray = thGunRay(gun);
    if (!ray) return null;
    var list = null;
    try { list = thFindAll(gameImg().class("NetworkPlayer")); } catch (e) { return null; }
    if (!list) return null;
    var selfNP = null;
    try { var lp = currentPlayer(); if (lp) selfNP = lp.field("networkPlayer").value; } catch (e) { }
    var maxAng = (Number(p.aimAngle) || 8) * Math.PI / 180;
    var bestCone = null, bestLine = null;
    for (var i = 0; i < list.length; i++) {
        var np = null;
        try { np = list.get(i); } catch (e) { continue; }
        if (!np || np.isNull()) continue;
        if (selfNP && !selfNP.isNull()) { try { if (np.handle.equals(selfNP.handle)) continue; } catch (e) { continue; } }
        var col = null;
        try { col = np.field("bodyCollider").value; } catch (e) { continue; }
        if (!col || col.isNull()) continue;
        var c = null, r = 0.5;
        try {
            var bounds = col.method("get_bounds").invoke();
            c = thV3(bounds.method("get_center").invoke());
            var ext = thV3(bounds.method("get_extents").invoke());
            if (c && ext) r = Math.sqrt(ext[0] * ext[0] + ext[1] * ext[1] + ext[2] * ext[2]);
        } catch (e) { continue; }
        if (!c) continue;
        var vx = c[0] - ray.o[0], vy = c[1] - ray.o[1], vz = c[2] - ray.o[2];
        var t = vx * ray.d[0] + vy * ray.d[1] + vz * ray.d[2];
        if (!(t > 0.4) || t > 120) continue;
        var px = ray.o[0] + ray.d[0] * t, py = ray.o[1] + ray.d[1] * t, pz = ray.o[2] + ray.d[2] * t;
        var perp = Math.sqrt((c[0] - px) * (c[0] - px) + (c[1] - py) * (c[1] - py) + (c[2] - pz) * (c[2] - pz));
        var ang = Math.atan2(perp, t);
        if (p.aimbot && ang <= maxAng && (!bestCone || ang < bestCone.ang)) {
            bestCone = { np: np, t: t, ang: ang, point: c, radius: r };
        }
        if (p.wallbang && perp <= r + 0.35 && (!bestLine || t < bestLine.t)) {
            bestLine = { np: np, t: t, ang: ang, point: c, radius: r };
        }
    }
    return bestCone || bestLine;
}

function thAimOwner(target) {
    try {
        var rv = target.np.method("GetComponent", 1).inflate(nrImg().class("Normal.Realtime.RealtimeView")).invoke();
        if (!rv || rv.isNull()) return -1;
        var id = Number(rv.method("get_ownerID").invoke());
        return id >= 0 ? id : -1;
    } catch (e) { return -1; }
}

function thGunDamage(gun) {
    try {
        var w = gun.field("weaponInfo").value;
        if (w && !w.isNull()) {
            var d = Number(w.field("Damage").value);
            if (d > 0 && isFinite(d)) return d;
        }
    } catch (e) { }
    return 50;
}

function thAimShot(gun) {
    try {
        if (!p.aimbot && !p.wallbang) return;
        var held = false;
        try { held = ui.input.trigger(0) > 0.3 || ui.input.trigger(1) > 0.3; } catch (e) { }
        if (!held) return; // ignore shots coming from other players' synced guns
        var target = thAimScan(gun);
        if (!target) return;
        var ownerId = thAimOwner(target);
        if (!(ownerId >= 0)) return;
        var me = localClientID();
        if (me >= 0 && ownerId === me) return; // never damage yourself
        var dmg = thGunDamage(gun) * (Number(p.aimDamage) || 1);
        thAimQueue.push({ id: ownerId, dmg: dmg, pos: target.point });
        if (thAimQueue.length > 8) thAimQueue.shift();
    } catch (e) { log("Aimbot: " + e); }
}

function thAimTick() {
    if (!thAimQueue.length) return;
    var pis = null;
    try { pis = gameImg().class("PlayerInfoSync").field("instance").value; } catch (e) { }
    if (!pis || pis.isNull()) { thAimQueue.length = 0; return; }
    while (thAimQueue.length) {
        var q = thAimQueue.shift();
        try { pis.method("DamagePlayer", 3).invoke(q.id, q.dmg, q.pos); }
        catch (e) { log("Aimbot damage: " + e); }
    }
}

// ---------------------------------------------------------------- OP stats

var TH_OP_SPECS = [
    ["opDamage", "get_DamageMultiplier", 999999],
    ["opResistance", "get_ResistanceMultiplier", 999999999],
    ["opReload", "get_ReloadSpeedMultiplier", 999999],
    ["opCritDamage", "get_CritDamageMultiplier", 999999],
    ["opRegen", "get_HPRegenMultiplier", 999999],
    ["opKnockback", "get_KnockbackMultiplier", 999999],
    ["opLowGravity", "get_GravityMultiplier", 0.000001],
    ["opBuddyHP", "get_BonusBuddyHP", 999999],
    ["opCritChance", "get_CritChance", 1],
    ["opTurboChance", "get_TurboChance", 1],
    ["opLifeSteal", "get_LifeStealFraction", 1],
    ["opBurnDamage", "get_BurnDamageFraction", 1]
];

function installOpStats() {
    try {
        var sp = gameImg().class("SPManager");
        for (var i = 0; i < TH_OP_SPECS.length; i++) {
            (function (spec) {
                try {
                    var m = sp.method(spec[1], 0);
                    if (!m) return;
                    m.implementation = function () {
                        if (p[spec[0]]) return spec[2];
                        return m.bind(this).invoke();
                    };
                } catch (e) { log("OP stat " + spec[1] + ": " + e); }
            })(TH_OP_SPECS[i]);
        }
        log("OP stats hooks ready");
    } catch (e) { log("OP stats setup: " + e); }
}

// ---------------------------------------------------------------- hooks

// ---------------------------------------------------------------- hook compatibility
//
// Il2Cpp `.implementation` is Interceptor.replace-backed: replacing an address twice
// throws "already replaced this function" and the later hook is dropped. buddy_beatdown.js
// hooks some of the same methods, so those are wrapped with Interceptor.attach here.
// Frida lets attach and replace live on one address in either install order (attach
// onEnter runs before the replacement, onLeave after), so both plugins run together
// no matter which one was enabled first.

var thAttached = {};

// Frida patches the start of a function. buddy_beatdown.js replaces these methods, and
// attaching on top of an already-replaced address is the likely cause of the game
// freezing / dying right after both plugins load. While SKIP_BUDDY_OVERLAP is true,
// this plugin leaves these methods alone, so use buddy_beatdown.js's own toggles for
// Infinite Ammo, No Recoil and Unlock Everything. Set it to false only if you run
// this plugin WITHOUT buddy_beatdown.js.
var SKIP_BUDDY_OVERLAP = true;
var THOOMS_BUDDY_OVERLAP = {
    "MultiplayerGrabable.Update": 1, "RecoilAnimation.Update": 1,
    "InventoryManager.OwnsItem": 1, "InventoryManager.OwnsPower": 1,
    "WeaponLevelRequirements.IsUnlocked": 1, "WeaponLevelRequirements.GetRequiredLevel": 1,
    "AnimePackGate.OwnsAnimePack": 1, "IAPManager.OwnsItemIAP": 1,
    "IAPManager.OwnsSkin": 1, "IAPManager.OwnsHatCash": 1, "DisplayPlayer.OwnsHat": 1
};

function thAttachOnce(key, cls, name, callbacks) {
    if (thAttached[key]) return true;
    if (SKIP_BUDDY_OVERLAP) {
        var ck = "";
        try { ck = cls.name + "." + name; } catch (e) { }
        if (THOOMS_BUDDY_OVERLAP[ck]) {
            thAttached[key] = true;
            log("skipped " + ck + " (buddy_beatdown.js owns it, see SKIP_BUDDY_OVERLAP)");
            return false;
        }
    }
    try {
        var addr = cls.method(name).virtualAddress;
        if (!addr || addr.isNull()) throw Error("NULL address");
        Interceptor.attach(addr, callbacks);
        thAttached[key] = true;
        log("attach hook ready: " + key);
        return true;
    } catch (e) { log("attach hook " + key + ": " + e); return false; }
}

function thObj(handle) {
    try { return new Il2Cpp.Object(handle); } catch (e) { return null; }
}

// Quick Fire (from THOOMS tuff_menu): on every weapon TriggerPressed, zero the timing/cooldown
// fields and fill the ammo fields before and after the shot. Hooks install the first time you turn it on.
var qfInstalled = false;
function thQuickFireInstall() {
    if (qfInstalled) return;
    qfInstalled = true;
    var game;
    try { game = gameImg(); } catch (e) { qfInstalled = false; log("Quick fire: classes not ready: " + e); return; }
    try {
        var weaponNames = ["MultiplayerPistol", "Pistol", "Crossbow", "Taser", "RPG", "Puncher", "WaterBottle",
            "BuzzSaw", "SpecialHammer", "Flamethrower", "Grenade", "StickyGrenade", "PinGun", "Megaphone",
            "Sword", "Arrow", "Missile"];
        var timingRE = /fire|shoot|shot|reload|spin|burst|chamber|cooldown|delay|timer|rate|ready|hasFired|fired|next|last|spent|used/i;
        var ammoRE = /ammo|bullet|mag|clip|round|load|charge/i;
        var qfCache = {};
        var qfPlan = function (klass) {
            var key = klass.handle.toString();
            if (qfCache[key]) return qfCache[key];
            var plan = [];
            try {
                var hierarchy = klass.hierarchy();
                for (var h = 0; h < hierarchy.length; h++) {
                    var fields = hierarchy[h].fields;
                    for (var f = 0; f < fields.length; f++) {
                        var field = fields[f];
                        if (field.isStatic) continue;
                        var tn = field.type.name, val;
                        if (timingRE.test(field.name)) {
                            if (/Single|Double|Int32|Int64/.test(tn)) val = 0;
                            else if (/Boolean/.test(tn)) val = false;
                        }
                        if (ammoRE.test(field.name)) {
                            if (/Int32|Int64/.test(tn)) val = 99999;
                            else if (/Single|Double/.test(tn)) val = 99999.0;
                        }
                        if (val !== undefined) plan.push([field, val]);
                    }
                }
            } catch (e) { }
            qfCache[key] = plan;
            return plan;
        };
        var quickFireSlam = function (obj) {
            var plan = qfPlan(obj.class);
            for (var i = 0; i < plan.length; i++) {
                try { plan[i][0].bind(obj).value = plan[i][1]; } catch (e) { }
            }
        };
        for (var w = 0; w < weaponNames.length; w++) {
            var klass;
            try { klass = game.class(weaponNames[w]); } catch (e) { continue; }
            for (var mi = 0; mi < klass.methods.length; mi++) {
                var method = klass.methods[mi];
                if (method.name !== "TriggerPressed" || method.parameters.length !== 0) continue;
                try {
                    void method.nativeFunction;
                    (function (meth) {
                        meth.implementation = function () {
                            if (!p.quickFire) return meth.invokeRaw(this.handle);
                            quickFireSlam(this);
                            var result = meth.invokeRaw(this.handle);
                            quickFireSlam(this);
                            return result;
                        };
                    })(method);
                } catch (e) { log("Quick fire " + weaponNames[w] + ": " + e); }
            }
        }
        log("Quick fire hooks installed"); say("Quick Fire ON");
    } catch (e) { log("Quick fire setup: " + e); }
}

function installHooks() {
    try {
        var game = gameImg();
        PlayerMPCls = game.class("PlayerMultiplayer");
        GrabCls = game.class("MultiplayerGrabable");
        RecoilCls = game.class("RecoilAnimation");
        InvCls = game.class("InventoryManager");
        IAPCls = game.class("IAPManager");
    } catch (e) { log("Classes not ready: " + e); return false; }

    // Infinite ammo. Attach instead of replace so buddy_beatdown.js's own
    // MultiplayerGrabable.Update hook keeps working next to this one.
    var ammoOff = -1;
    try { ammoOff = GrabCls.field("CurrentAmmo").offset; } catch (e) { log("CurrentAmmo offset: " + e); }
    if (ammoOff > 0) thAttachOnce("grabUpdate", GrabCls, "Update", {
        onEnter: function (args) { this.self = args[0]; },
        onLeave: function () {
            if (!p.infAmmo || !this.self) return;
            try { this.self.add(ammoOff).writeFloat(999.0); } catch (e) { }
        }
    });

    // Aimbot / shoot-through-walls: watch every shot. ShootMethod exists only on the
    // hitscan gun classes (pistols, rifles, SMGs, shotguns); attach so the gun's own
    // shot still runs untouched.
    ["MultiplayerPistol", "Pistol"].forEach(function (cn) {
        var cls = null;
        try { cls = gameImg().class(cn); } catch (e) { return; }
        thAttachOnce("aimShot_" + cn, cls, "ShootMethod", {
            onEnter: function (args) {
                var gun = thObj(args[0]);
                if (gun) thAimShot(gun);
            }
        });
    });

    // Infinite damage: DoDamage + fists
    try {
        var doDamage = PlayerMPCls.method("DoDamage");
        doDamage.implementation = function (damage, point, normal, col, other) {
            if (p.infDamage) return doDamage.bind(this).invoke(99999.0, point, normal, col, other);
            return doDamage.bind(this).invoke(damage, point, normal, col, other);
        };
    } catch (e) { log("Infinite damage hook: " + e); }
    try {
        var AIPunch = game.class("AIPunch");
        var punch = AIPunch.method("Punch");
        punch.implementation = function (pos, dir) {
            if (p.infDamage) { try { this.field("punchDamage").value = 99999.0; } catch (e) { } }
            return punch.bind(this).invoke(pos, dir);
        };
    } catch (e) { log("Punch hook: " + e); }

    // No recoil: assigning Vector3 fields through the bridge is lossy, so zero
    // the raw float memory of every recoil field. Attach (not replace) so it
    // composes with buddy_beatdown.js's RecoilAnimation.Update hook.
    try { resolveRecoilFields(); } catch (e) { log("Recoil fields: " + e); }
    thAttachOnce("recoilUpdate", RecoilCls, "Update", {
        onEnter: function (args) {
            this.rc = thObj(args[0]);
            if (p.noRecoil && this.rc) zeroRecoil(this.rc);
        },
        onLeave: function () {
            if (p.noRecoil && this.rc) zeroRecoil(this.rc);
        }
    });

    // NOTE: no PlayerMultiplayer.Spawn override here. Hooking Spawn and calling
    // invokeRaw from inside its own replacement re-enters the patched entry point and
    // Frida throws "breakpoint triggered" / access violations on every spawn. Truck and
    // UFO are plain one-shot spawn actions instead (see thSpawnVehicle).

    // Unlock everything. OwnsItem / OwnsPower are also replaced by buddy_beatdown.js,
    // so override the return value from an attach onLeave instead of taking the address.
    ["OwnsItem", "OwnsPower"].forEach(function (name) {
        thAttachOnce("owns" + name, InvCls, name, {
            onLeave: function (retval) {
                if (!p.unlockAll) return;
                try { if (retval.toInt32() === 0) retval.replace(ptr(1)); } catch (e) { }
            }
        });
    });
    // Rest of the unlock gates (the same methods the older plugin replaces). Attach +
    // retval override keeps this compose-safe with that plugin.
    [
        ["WeaponLevelRequirements", "IsUnlocked"],
        ["AnimePackGate", "OwnsAnimePack"],
        ["IAPManager", "OwnsItemIAP"],
        ["IAPManager", "OwnsSkin"],
        ["IAPManager", "OwnsHatCash"],
        ["DisplayPlayer", "OwnsHat"]
    ].forEach(function (spec) {
        var cls = null;
        try { cls = game.class(spec[0]); } catch (e) { return; }
        thAttachOnce("unlock_" + spec[0] + "_" + spec[1], cls, spec[1], {
            onLeave: function (retval) {
                if (!p.unlockAll) return;
                try { if (retval.toInt32() === 0) retval.replace(ptr(1)); } catch (e) { }
            }
        });
    });
    try {
        thAttachOnce("unlock_requiredLevel", game.class("WeaponLevelRequirements"), "GetRequiredLevel", {
            onLeave: function (retval) {
                if (!p.unlockAll) return;
                try { retval.replace(ptr(0)); } catch (e) { }
            }
        });
    } catch (e) { }
    // IAP weapon/vehicle flags. The old plugin writes these from its own onFrame, so
    // there is nothing to clash with; attach keeps it compose-safe anyway.
    // IAPManager has no Update (only Awake/Start), so the flags are written from onFrame, see thIapFlags().

    // NPC spawn cap bypass
    try {
        var npcDespawn = game.class("NPCSpawnLimit").method("Despawn", 1);
        npcDespawn.implementation = function (go) {
            if (p.unlimitedZombies) return;
            return npcDespawn.bind(this).invoke(go);
        };
    } catch (e) { log("NPC despawn hook: " + e); }

    thQuickFireInstall();

    // Infinite beam
    try {
        var beamClass = game.class("KamehamehaPoower");
        var beamCoroutine = game.classes.find(function (c) { return c.name === "<DriveBeam>d__34"; });
        var heldBeams = new Set();
        var originalDurations = new Map();
        var keyOf = function (p) { return p ? p.toString() : null; };
        var hookBeam = function (label, method, callbacks) {
            try {
                if (!method || !method.virtualAddress || method.virtualAddress.isNull()) throw new Error("missing address");
                Interceptor.attach(method.virtualAddress, callbacks);
                log("Infinite beam hook " + label);
            } catch (e) { log("Infinite beam " + label + ": " + e); }
        };
        hookBeam("press", beamClass.method("OnTriggerPress"), {
            onEnter: function (args) { var k = keyOf(args[0]); if (k) heldBeams.add(k); }
        });
        hookBeam("release", beamClass.method("OnTriggerRelease"), {
            onEnter: function (args) { var k = keyOf(args[0]); if (k) heldBeams.delete(k); }
        });
        if (beamCoroutine) {
            hookBeam("DriveBeam.MoveNext", beamCoroutine.method("MoveNext"), {
                onEnter: function (args) {
                    try {
                        var routine = new Il2Cpp.Object(args[0]);
                        var routineKey = keyOf(args[0]);
                        var owner = null;
                        try { owner = keyOf(routine.field("<>4__this").value.handle); } catch (e) { }
                        var durationField = routine.field("duration");
                        var elapsed = Number(routine.field("<elapsed>5__2").value);
                        var duration = Number(durationField.value);
                        if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(elapsed)) return;
                        var active = thBeamEnabled && (owner ? heldBeams.has(owner) : heldBeams.size === 1);
                        if (active && elapsed > 0.25) {
                            if (!originalDurations.has(routineKey)) originalDurations.set(routineKey, duration);
                            if (duration < 600) durationField.value = 600.0;
                        } else if (originalDurations.has(routineKey)) {
                            durationField.value = originalDurations.get(routineKey);
                            originalDurations.delete(routineKey);
                        }
                    } catch (e) { }
                }
            });
        } else log("Infinite beam: DriveBeam coroutine not found");
    } catch (e) { log("Infinite beam setup: " + e); }

    installOpStats();
    hooksDone = true;
    log("THOOMS hooks installed");
    return true;
}

// Install once (retry from onFrame if the game classes were not ready yet).
// LITE: no startup hooks. installHooks() is intentionally never called.

// ---------------------------------------------------------------- per frame

var thLast = {};
function thEvery(key, ms) {
    var now = Date.now();
    if (now - (thLast[key] || 0) < ms) return false;
    thLast[key] = now;
    return true;
}

onFrame(function () {
    // movement
    if (p.fly) thFlyFrame();
    if (p.speedHack) thSpeedHack(); else if (originalMoveSpeed !== null) restoreSpeedHack();

    // zombies: apply when any zombie slider/toggle changes
    var zsig = [p.zSize, p.zHealth, p.zSpeed, p.zDamage, p.zRapid, p.zRecoil, p.zSpread].join("|");
    if (zsig !== prev.zsig) {
        if (prev.zsig !== undefined) applyZombieAll();
        prev.zsig = zsig;
    }

    // live cosmetics (each has its own throttle too)
    if (p.richName && thEvery("rich", 1500)) thForceRichName();
    if (p.rgbName) applyRgbName();
    else if (prev.rgbName) restoreRgbName();
    prev.rgbName = p.rgbName;
    if (p.rgbSkin) applyRgbNetworkSkin();

    // one-shot guns (only when the toggle changes)
    if (p.oneShot !== prev.oneShot) {
        if (prev.oneShot !== undefined) thOneShot(p.oneShot);
        prev.oneShot = p.oneShot;
    }

    // noclip
    if (p.noclip !== prev.noclip) {
        if (prev.noclip !== undefined) setBuddyNoclip(p.noclip);
        prev.noclip = p.noclip;
    }

    // anime skin prefs
    if (p.animeSkin !== prev.animeSkin) {
        if (prev.animeSkin !== undefined) thAnimeSkin(p.animeSkin);
        prev.animeSkin = p.animeSkin;
    }

    // name bypass (one attach on BuddyNameFilter.IsNameAllowed, only while the toggle is on)
    if (p.nameBypass && !prev.nameBypass) thNameBypassStart();
    else if (!p.nameBypass && prev.nameBypass) thNameBypassStop();
    prev.nameBypass = p.nameBypass;

    // quick fire (TriggerPressed hooks, installed the first time you turn it on this session)
    if (p.quickFire && !qfInstalled) thQuickFireInstall();

    // safezone damage (kill anywhere): native install, only when you turn it on in this session
    if (p.safezoneDamage && !prev.safezoneDamage) thSafezoneDamageInstall();
    prev.safezoneDamage = p.safezoneDamage;

    // kill gun (no hooks, only does work while armed and the left grip is held)
    if (p.killGun && !prev.killGun && thKillGun) thKillGun.start();
    else if (!p.killGun && prev.killGun && thKillGun) thKillGun.stop();
    if (p.killGun && thKillGun) thKillGun.tick();
    prev.killGun = p.killGun;

    // faces and capes
    if (p.faceLock && thEvery("face", 500)) thSetEmotion(TH_EMOTIONS.indexOf(p.faceEmotion));
    if (p.capeBoost && thEvery("cape", 500)) thApplyCape(true);
    else if (!p.capeBoost && prev.capeBoost) thApplyCape(false);
    prev.capeBoost = p.capeBoost;

    // gorilla mode (only when the toggle changes)
    if (p.gorillaMode !== prev.gorillaMode) {
        if (prev.gorillaMode !== undefined) thSetGorilla(p.gorillaMode);
        prev.gorillaMode = p.gorillaMode;
    } else if (p.gorillaMode && thEvery("gorilla", 1000)) thGorillaApply(true, false);   // the game can reset it

    // networked player size: re-applied a few times a second (the game can reset it, ragdolls respawn)
    if (p.playerSize && thEvery("psize", 300)) thApplyPlayerSize(p.playerSizeMul);
    else if (!p.playerSize && prev.playerSize) { thApplyPlayerSize(1); say("Head size back to normal"); }
    prev.playerSize = p.playerSize;

    // abilities / cooldowns: these scan the scene, so once per second at most
    if (p.abilities && thEvery("abil", 1000)) thAbilities();
    if (p.noAbilityCooldown && thEvery("cool", 1000)) thNoAbilityCooldown();

    // ultimate zombie
    if (p.ultimateZombie && !prev.ultimateZombie) thUltimateOn();
    else if (!p.ultimateZombie && prev.ultimateZombie) thUltimateOff();
    prev.ultimateZombie = p.ultimateZombie;
});

// ---------------------------------------------------------------- cleanup

onDisable(function () {
    try {
        if (p.noclip) { p.noclip = false; setBuddyNoclip(false); }
        if (p.rgbName) restoreRgbName();
        if (p.animeSkin) { p.animeSkin = false; thAnimeSkin(false); }
        thNameBypassStop();
        if (p.gorillaMode) { p.gorillaMode = false; thSetGorilla(false); }
        if (p.capeBoost) { p.capeBoost = false; thApplyCape(false); }
        if (p.playerSize) { p.playerSize = false; thApplyPlayerSize(1); }
        if (thKillGun) thKillGun.stop();
        if (thUltimateZombie.active) thUltimateOff();
        thUltimateStopTimer();
        if (p.oneShot) { p.oneShot = false; thOneShot(false); }
        restoreSpeedHack();
    } catch (e) { log("Cleanup: " + e); }
});

// on-demand hooks never auto-install from saved settings at launch
p.safezoneDamage = false;
p.nameBypass = false;
p.quickFire = false;
log("THOOMS Buddy Beatdown LITE loaded (no native hooks) - open its section in the Plugins tab");
