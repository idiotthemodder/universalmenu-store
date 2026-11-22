// dont_blink.js - Don't Blink (TripleC Games / Bmix) plugin for the universal menu (v1.0).
// game: com.TripleCGames.DontBlinkByBmix
// Built against the build installed 2026-11-21, dump in Dumps/com.TripleCGames.DontBlinkByBmix_dump.cs
// (runtime dump, Assembly-CSharp is complete). Most method / field names are scrambled, so this only uses
// real names: class names, Unity-serialized fields (agent, killColliders, jumpscareUI, AllCosmetics...)
// and RPC names (Enable / Disable / RPC_SetHidden / RPC_AlertMonster / RPC_SetColor / RPC_SyncScale).
//
// Inputs: [G] = right grip, [G + T] = aim with right grip and fire with right trigger.
//
// What is in here:
//   Safety     anti-cheat shield: /proc/self/maps reads get the frida lines masked (the game's "MODS
//              DETECTED" / "[KILL] Cheat checker" scans look for "frida" there). On by default.
//   Monsters   ESP boxes / tracers / name + distance, hand radar, hide monster models, god mode (kill
//              reports aimed at you are dropped + kill colliders off), invisible to monsters (the game's
//              own "hidden" flag, the AI ignores you), no jumpscares, lure gun (makes monsters
//              investigate wherever you point, works without being host)
//   Host       (master client) monster speed / freeze, bring to me, send home, AI off
//   Objectives ESP on fuse boxes / exits / doors / valve parts, teleport to nearest exit
//   Movement   speed boost, fly, noclip, gravity, platforms, teleport gun, iron man, dash, long arms,
//              no freeze
//   World      no fog, fullbright
//   Players    ESP boxes / tracers / name tags, teleport to random player
//   Gore       split yourself (the game's RPC_DeathGore / RipEffect), gore gun, split everyone, repeat
//   Soundboard plays the menu's sounds folder (globalThis.__RASP_SOUNDBOARD, vrfrida pushes Mods/sounds)
//              through your voice chat: the game's Photon Voice Recorder is switched to an AudioClip and
//              back to the mic when the clip ends. Optional local playback so you hear it too.
//   Spawner    network prefabs (asteroids, explosions, zombies, robot, ragdoll, sound props...) and the
//              night crawler monster. Works in any room; capped at 25 live spawns.
//   Cosmetics  equip / unequip any of the game's 59 cosmetics (synced, others see it), equip all,
//              rank badge picker, copy nearest player's outfit, unlock the wardrobe locally,
//              RGB / set color, size, name
//
// Left out on purpose: crash / lag anything, coin / currency writes (PlayFab AddUserVirtualCurrency is
// in the client, not touched), the paid "Pro Mods" menu, blocking moderator actions (ForceQuit / Smite /
// Freeze / Bring RPCs), and the admin / moderator panels: every admin RPC checks the sender against
// the staff list ("Ignored RPC_ForceQuit from non-admin sender"), kick / ban go through CloudScript.

var input = ui.input;
var X = ui.read3;
var BTNS = ["Right Trigger", "Left Trigger", "A", "B", "X", "Y", "Right Grip", "Left Grip"];
var PAL = { "Red": [1, 0.25, 0.25], "Orange": [1, 0.6, 0.2], "Yellow": [1, 0.9, 0.3], "Green": [0.35, 1, 0.45], "Cyan": [0.3, 0.85, 1], "Blue": [0.3, 0.45, 1], "Purple": [0.7, 0.45, 1], "Pink": [1, 0.45, 0.8], "White": [0.95, 0.95, 0.95], "Black": [0.05, 0.05, 0.05] };
var PAL_NAMES = Object.keys(PAL);
// VrRig.AllCosmetics on this build (names are what the Enable / Disable RPCs take)
var COSMETICS = ["RussianHat", "MopHat", "BananaHat", "PartyHat", "FlowerHat", "TopHat", "CoconutHat", "SunHat", "ChefHat", "ConeHat", "PlungerHat", "JesterHat", "CowboyHat", "Headphones", "OGbadge", "WalkieTalkie", "tung", "tungBat", "beater", "hazmat", "M", "O", "dog", "PinkBeanie", "Crown", "WitchHat", "ToiletHat", "LightHat", "PotHat", "RainHat", "Blush", "CookieJar", "BoosterCosmetic", "CONTENTCREATOR", "beta", "cheesecake", "Bageutte", "Sponge", "stop", "monster", "grapple", "celebrate", "eyeball", "spookypop", "horns", "pumpkin", "ghost", "candybasket", "Hammer", "bacteria", "RankBronze", "RankSilver", "RankGold", "RankPlatinum", "RankDiamond", "RankMaster", "TinFoil", "lurker", "bonk"];
var RANKS = ["RankBronze", "RankSilver", "RankGold", "RankPlatinum", "RankDiamond", "RankMaster"];
// Resources prefabs with a PhotonView on this build (PhotonNetwork.Instantiate takes these names)
var PREFABS = ["BigAsteroid", "SmallAsteroid", "TinyExplosion", "Spaceship", "My Robot Kyle -done-", "RAGDOILL", "Plunger", "boink", "fart", "vineboom", "getout", "Boy", "Character"];
var MONSTERS = ["MonsterForDOntBLink", "Hellephant", "ZomBear", "ZomBunny"];
var MONSTER_LABEL = { "MonsterForDOntBLink": "Night Crawler", "Hellephant": "Hellephant", "ZomBear": "ZomBear", "ZomBunny": "ZomBunny" };
// soundboard list: filled from the menu's sounds folder, mutated in place on reload (the combo reads it live)
var SB_NAMES = [];
var PL_NAMES = ["(nobody yet)"], PL_ACTORS = [-1], MAP_NAMES = ["(no maps yet)"];
var sbSounds = [];
function sbLoadList() {
    sbSounds = [];
    try {
        var m = globalThis.__RASP_SOUNDBOARD;
        if (m && m.version === 1 && Array.isArray(m.sounds)) sbSounds = m.sounds.filter(function (s) { return s && s.format === "wav" && typeof s.fileName === "string"; });
    } catch (e) {}
    SB_NAMES.length = 0;
    if (!sbSounds.length) SB_NAMES.push("(no sounds, see status)");
    sbSounds.forEach(function (s) { SB_NAMES.push(String(s.label || s.fileName)); });
    return sbSounds.length;
}
sbLoadList();

var p = props([
    { type: "label", label: "Safety" },
    { type: "bool", key: "acShield", label: "Anti-Cheat Shield", default: true, desc: "masks frida in /proc/self/maps so the game's mod scan finds nothing. its first scan runs at startup, before the menu loads" },

    { type: "label", label: "Monsters" },
    { type: "bool", key: "god", label: "God Mode", default: false, desc: "kill reports for you are dropped and monster kill colliders are switched off on your side" },
    { type: "bool", key: "hidden", label: "Invisible To Monsters", default: false, desc: "sets the game's own 'hidden from monster' flag on you for everyone, so the AI won't chase you" },
    { type: "bool", key: "noJumpscare", label: "No Jumpscares", default: false },
    { type: "bool", key: "botEsp", label: "Monster ESP", default: false, desc: "boxes on every monster, through walls" },
    { type: "bool", key: "botTracers", label: "Monster Tracers", default: false },
    { type: "bool", key: "botTags", label: "Monster Name + Distance", default: false },
    { type: "select", key: "botColor", label: "Monster Color", options: PAL_NAMES, default: "Red" },
    { type: "float", key: "espAlpha", label: "ESP Opacity", min: 0.05, max: 0.8, default: 0.3, decimals: 2 },
    { type: "bool", key: "handInfo", label: "Hand Radar", default: false, desc: "nearest monster + count on your left hand" },
    { type: "bool", key: "hideMons", label: "Hide Monster Models", default: false, desc: "only on your screen" },
    { type: "bool", key: "lureGun", label: "Lure Gun [G + T]", default: false, desc: "monsters go investigate where you shoot. works without being host" },
    { type: "button", label: "Lure Monsters Far Away", onClick: function () { try { lureFar(); } catch (e) { notify("Lure failed: " + e); } } },

    { type: "label", label: "Host Tools (you are master client)" },
    { type: "button", label: "Set Master", onClick: function () { try { setMaster(); } catch (e) { notify("Set Master failed: " + e); } } },
    { type: "select", key: "hMonSpeed", label: "Monster Speed", options: ["Normal", "Frozen", "Slow", "Fast", "Super Fast"], default: "Normal" },
    { type: "bool", key: "hAiOff", label: "Monster AI Off", default: false, desc: "turns the monsters' nav agents off" },
    { type: "button", label: "Bring Monsters To Me", onClick: function () { try { bringMonsters(false); } catch (e) { notify("Failed: " + e); } } },
    { type: "button", label: "Send Monsters Home", onClick: function () { try { bringMonsters(true); } catch (e) { notify("Failed: " + e); } } },
    { type: "select", key: "hTarget", label: "Player", options: PL_NAMES, default: PL_NAMES[0], desc: "list refreshes every few seconds" },
    { type: "button", label: "Monster Kills Player", onClick: function () { try { hostKill(pickTarget()); } catch (e) { notify("Kill failed: " + e); } } },
    { type: "button", label: "Monster Kills Everyone Else", onClick: function () { try { hostKillAll(); } catch (e) { notify("Kill failed: " + e); } } },
    { type: "bool", key: "killGun", label: "Kill Gun [G + T]", default: false, desc: "host only: point at a player, a monster kills them" },
    { type: "button", label: "Be The Monster: Tag Player", onClick: function () { try { hostTag(pickTarget()); } catch (e) { notify("Tag failed: " + e); } } },
    { type: "button", label: "Be The Monster: End Round", onClick: function () { try { hostEndRound(); } catch (e) { notify("End round failed: " + e); } } },
    { type: "select", key: "hMap", label: "Map", options: MAP_NAMES, default: MAP_NAMES[0] },
    { type: "button", label: "Set Map Vote Winner", onClick: function () { try { hostSetMap(); } catch (e) { notify("Map failed: " + e); } } },

    { type: "label", label: "Objectives" },
    { type: "bool", key: "objEsp", label: "Objective ESP", default: false, desc: "fuse boxes, exits, doors, valve parts" },
    { type: "button", label: "Teleport To Nearest Exit", onClick: function () { try { tpExit(); } catch (e) { notify("Failed: " + e); } } },

    { type: "label", label: "Movement" },
    { type: "bool", key: "speed", label: "Speed Boost", default: false },
    { type: "float", key: "speedMul", label: "Speed Multiplier", min: 1, max: 6, default: 1.5, decimals: 2 },
    { type: "float", key: "jumpMul", label: "Jump Multiplier", min: 1, max: 3, default: 1.2, decimals: 2 },
    { type: "bool", key: "gripSpeed", label: "Speed Boost: Right Grip Only", default: false },
    { type: "bool", key: "fly", label: "Fly", default: false },
    { type: "select", key: "flyBtn", label: "Fly Button", options: BTNS, default: "B" },
    { type: "select", key: "flyStyle", label: "Fly Style", options: ["Smooth", "Velocity", "Teleport"], default: "Smooth" },
    { type: "bool", key: "handFly", label: "Fly Where Right Hand Points", default: false },
    { type: "float", key: "flySpeed", label: "Fly Speed", min: 2, max: 40, default: 12, decimals: 1 },
    { type: "bool", key: "noclip", label: "Noclip", default: false, desc: "hold the button to pass through walls" },
    { type: "select", key: "noclipBtn", label: "Noclip Button", options: BTNS, default: "Right Trigger" },
    { type: "select", key: "gravity", label: "Gravity", options: ["Normal", "Low", "Moon", "Zero", "High", "Reverse"], default: "Normal" },
    { type: "bool", key: "platforms", label: "Platforms [grips]", default: false },
    { type: "select", key: "platColor", label: "Platform Color", options: PAL_NAMES, default: "Purple" },
    { type: "bool", key: "tpGun", label: "Teleport Gun [G + T]", default: false },
    { type: "bool", key: "ironMan", label: "Iron Man [grips]", default: false },
    { type: "bool", key: "dash", label: "Dash [A]", default: false },
    { type: "float", key: "dashForce", label: "Dash Force", min: 4, max: 30, default: 12, decimals: 0 },
    { type: "float", key: "armLen", label: "Arm Length", min: 1, max: 2, default: 1, decimals: 2, desc: "the game's own armLengthMultiplier, 1 = normal" },
    { type: "bool", key: "noFreeze", label: "No Freeze", default: false, desc: "keeps disableMovement / movementFrozen off" },

    { type: "label", label: "World" },
    { type: "bool", key: "noFog", label: "No Fog", default: false },
    { type: "bool", key: "fullbright", label: "Fullbright", default: false },

    { type: "label", label: "Players" },
    { type: "bool", key: "plEsp", label: "Player ESP", default: false },
    { type: "bool", key: "plTracers", label: "Player Tracers", default: false },
    { type: "bool", key: "plTags", label: "Player Name Tags", default: false },
    { type: "select", key: "plColor", label: "Player Color", options: PAL_NAMES, default: "Cyan" },
    { type: "button", label: "Teleport To Random Player", onClick: function () { try { tpRandomPlayer(); } catch (e) { notify("Failed: " + e); } } },

    { type: "label", label: "Gore (everyone sees it on you; on others it only shows for you)" },
    { type: "button", label: "Split Yourself", onClick: function () { try { goreRig(myRig(), true); } catch (e) { notify("Gore failed: " + e); } } },
    { type: "bool", key: "goreGun", label: "Gore Gun [G + T]", default: false, desc: "point at a player and fire to split them. if the game checks who sent it, it only works on you" },
    { type: "bool", key: "goreLoop", label: "Gore Yourself On Repeat", default: false },
    { type: "button", label: "Split Everyone", onClick: function () { try { goreAll(); } catch (e) { notify("Gore failed: " + e); } } },

    { type: "label", label: "Soundboard (plays through your voice chat)" },
    { type: "select", key: "sbSound", label: "Sound", options: SB_NAMES, default: SB_NAMES[0] },
    { type: "button", label: "Play Sound", onClick: function () { try { sbPlay(SB_NAMES.indexOf(p.sbSound)); } catch (e) { notify("Play failed: " + e); } } },
    { type: "button", label: "Play Random Sound", onClick: function () { try { sbPlay(Math.floor(Math.random() * sbSounds.length)); } catch (e) { notify("Play failed: " + e); } } },
    { type: "button", label: "Stop Sound", onClick: function () { try { sbStop(true); } catch (e) { notify("Stop failed: " + e); } } },
    { type: "float", key: "sbVol", label: "Sound Volume", min: 0.2, max: 2.5, default: 1, decimals: 2, desc: "above 1 gets louder (and can clip)" },
    { type: "bool", key: "sbLocal", label: "Hear It Yourself", default: true },
    { type: "bool", key: "sbLoop", label: "Loop", default: false },
    { type: "button", label: "Reload Sounds", onClick: function () { try { if (typeof globalThis.__RASP_SOUNDBOARD_RELOAD === "function") globalThis.__RASP_SOUNDBOARD_RELOAD(); sbClips = {}; notify(sbLoadList() + " sound(s)"); } catch (e) { notify("Reload failed: " + e); } } },

    { type: "label", label: "Spawner (any room, max 25 at once)" },
    { type: "select", key: "prefab", label: "Prefab", options: PREFABS, default: "BigAsteroid" },
    { type: "button", label: "Spawn Prefab", onClick: function () { try { spawnNet(p.prefab, false); } catch (e) { notify("Spawn failed: " + e); } } },
    { type: "select", key: "monPrefab", label: "Monster", options: MONSTERS, default: "MonsterForDOntBLink" },
    { type: "button", label: "Spawn Monster", onClick: function () { try { spawnNet(p.monPrefab, true); } catch (e) { notify("Spawn failed: " + e); } } },
    { type: "bool", key: "spawnGun", label: "Spawn Gun [G + T]", default: false, desc: "fires the selected prefab where you point (monster if Spawn Gun: Monster is on)" },
    { type: "bool", key: "spawnGunMon", label: "Spawn Gun: Monster", default: false },
    { type: "button", label: "Check If Networked", onClick: function () { try { checkSpawns(); } catch (e) { notify("Check failed: " + e); } } },
    { type: "button", label: "Delete My Spawns", onClick: function () { try { clearSpawns(); } catch (e) { notify("Delete failed: " + e); } } },

    { type: "label", label: "Your Player (sent through the game's own sync, everyone sees it)" },
    { type: "bool", key: "meInvis", label: "Invisible To Everyone", default: false, desc: "hides your body for the whole lobby (turn off to come back)" },
    { type: "bool", key: "meMonster", label: "Look Like The Monster", default: false, desc: "shows you with the Be The Monster model" },
    { type: "button", label: "Bonk", onClick: function () { try { bonk(); } catch (e) { notify("Bonk failed: " + e); } } },
    { type: "bool", key: "bonkLoop", label: "Bonk On Repeat (1/s)", default: false },
    { type: "label", label: "Cosmetics (everyone sees these)" },
    { type: "select", key: "cosm", label: "Cosmetic", options: COSMETICS, default: "CowboyHat" },
    { type: "button", label: "Equip Cosmetic", onClick: function () { try { equip(p.cosm, true); } catch (e) { notify("Equip failed: " + e); } } },
    { type: "button", label: "Unequip Cosmetic", onClick: function () { try { equip(p.cosm, false); } catch (e) { notify("Unequip failed: " + e); } } },
    { type: "select", key: "rank", label: "Rank Badge", options: RANKS, default: "RankMaster" },
    { type: "button", label: "Equip Rank Badge", onClick: function () { try { equipRank(p.rank); } catch (e) { notify("Failed: " + e); } } },
    { type: "button", label: "Equip Everything", onClick: function () { try { equipMany(COSMETICS.filter(function (c) { return RANKS.indexOf(c) < 0; }), true); } catch (e) { notify("Failed: " + e); } } },
    { type: "button", label: "Unequip Everything", onClick: function () { try { equipMany(enabledNames(myRig()), false); } catch (e) { notify("Failed: " + e); } } },
    { type: "button", label: "Copy Nearest Player's Outfit", onClick: function () { try { copyOutfit(); } catch (e) { notify("Failed: " + e); } } },
    { type: "button", label: "Unlock Wardrobe (local)", onClick: function () { try { unlockWardrobe(); } catch (e) { notify("Failed: " + e); } } },
    { type: "bool", key: "rgb", label: "RGB Color", default: false, desc: "cycles your color (everyone sees it)" },
    { type: "select", key: "myColor", label: "Set Color", options: ["(keep)"].concat(PAL_NAMES), default: "(keep)" },
    { type: "float", key: "size", label: "Size", min: 0.3, max: 3, default: 1, decimals: 2 },
    { type: "button", label: "Apply Size", onClick: function () { try { applySize(); } catch (e) { notify("Size failed: " + e); } } },
    { type: "text", key: "newName", label: "New Name", default: "" },
    { type: "button", label: "Apply Name", onClick: function () { try { applyName(); } catch (e) { notify("Name failed: " + e); } } },
    { type: "button", label: "Join Random Room", onClick: function () { try { photon().method("JoinRandomRoom", 0).invoke(); notify("Joining..."); } catch (e) { notify("Join failed: " + e); } } },
    { type: "button", label: "Leave Room", onClick: function () { try { photon().method("LeaveRoom", 1).invoke(true); notify("Left room"); } catch (e) { notify("Leave failed: " + e); } } },
]);

// ------------------------------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------------------------------
var G = {};
var seenErr = {};
function safe(name, fn) { try { fn(); } catch (e) { if (!seenErr[name]) { seenErr[name] = String(e); log(name + ": " + e); } } }
function img(name) { return Il2Cpp.domain.assembly(name).image; }
function cs() { return img("Assembly-CSharp"); }
function core() { return img("UnityEngine.CoreModule"); }
function physics() { return img("UnityEngine.PhysicsModule"); }
function opt(fn, fallback) { try { var v = fn(); return (v === undefined || v === null) ? fallback : v; } catch (e) { return fallback; } }
function alive(o) {
    try { return !!o && !o.isNull() && !o.handle.add(0x10).readPointer().isNull(); } catch (e) { return false; }
}
function tr(o) { return o.method("get_transform").invoke(); }
function goOf(o) { return o.method("get_gameObject").invoke(); }
function pos3(o) { return X(tr(o).method("get_position").invoke()); }
function fwdOf(o) { return X(tr(o).method("get_forward").invoke()); }
function add3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function mul3(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function len3(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
function same(a, b) { try { return !!a && !!b && !a.isNull() && !b.isNull() && a.handle.equals(b.handle); } catch (e) { return false; } }
function cstr(v) { try { if (!v || (v.isNull && v.isNull())) return ""; return v.content !== undefined ? String(v.content) : String(v); } catch (e) { return ""; } }
function col(name, a) { var c = PAL[name] || PAL.White; return [c[0], c[1], c[2], a]; }
function now() { return Date.now(); }
function cls(name) { return opt(function () { return cs().class(name); }, null); }

function pickM(obj, klass, name, count, ok) {
    try { var m = obj.method(name, count); if (!ok || ok(m.parameters)) return m; } catch (e) {}
    var ms = klass.methods;
    for (var i = 0; i < ms.length; i++) {
        var m2 = ms[i];
        if (m2.name !== name || m2.parameterCount !== count) continue;
        if (ok && !ok(m2.parameters)) continue;
        if (m2.isStatic) return m2;
        if (typeof m2.bind === "function") return m2.bind(obj);
    }
    throw new Error(name + "/" + count + " overload not found");
}
function getComp(go, klass) {
    var tries = [
        function () { var m = go.method("GetComponent", 1); if (m.parameters[0].type.name !== "System.Type") throw 0; return m.invoke(klass.type.object); },
        function () { return go.method("GetComponent", 0).inflate(klass).invoke(); },
    ];
    for (var i = 0; i < tries.length; i++) { try { var r = tries[i](); if (r && !r.isNull()) return r; } catch (e) {} }
    return null;
}
function addComp(go, klass) {
    var tries = [
        function () { var m = go.method("AddComponent", 1); if (m.parameters[0].type.name !== "System.Type") throw 0; return m.invoke(klass.type.object); },
        function () { return go.method("AddComponent", 0).inflate(klass).invoke(); },
    ];
    for (var i = 0; i < tries.length; i++) { try { var r = tries[i](); if (r && !r.isNull()) return r; } catch (e) {} }
    throw new Error("AddComponent " + klass.name + " failed");
}
function findObjs(klass) {
    var arr = null;
    try { arr = pickM(G.UObject, G.UObject, "FindObjectsOfType", 1, function (ps) { return ps[0].type.name === "System.Type"; }).invoke(klass.type.object); } catch (e) {}
    if (!arr) { try { arr = G.UObject.method("FindObjectsOfType").inflate(klass).invoke(); } catch (e) {} }
    var out = [];
    for (var i = 0; arr && i < arr.length; i++) { var o = arr.get(i); if (o && !o.isNull()) out.push(new Il2Cpp.Object(o.handle)); }
    return out;
}
function listItems(list) {
    var out = [];
    if (!list || list.isNull()) return out;
    var n = list.method("get_Count").invoke();
    for (var i = 0; i < n; i++) { var o = list.method("get_Item").invoke(i); if (o && !o.isNull()) out.push(o); }
    return out;
}
function arrItems(a) { var out = []; for (var i = 0; a && !a.isNull() && i < a.length; i++) { var o = a.get(i); if (o && !o.isNull()) out.push(o); } return out; }
function newGO(name) {
    var go = G.GameObject.alloc();
    pickM(go, G.GameObject, ".ctor", 1, function (ps) { return ps[0].type.name === "System.String"; }).invoke(Il2Cpp.string(name));
    return go;
}
function destroyNow(go) { try { if (go && !go.isNull()) G.UObject.method("Destroy", 1).invoke(go); } catch (e) {} }
function setActive(go, on) { go.method("SetActive", 1).invoke(on); }
function lookRot(dir) { return G.Quaternion.method("LookRotation", 1).invoke(dir); }
function setEnabled(c, on) { try { if (!!c.method("get_enabled").invoke() !== on) c.method("set_enabled").invoke(on); } catch (e) {} }

function btnHeld(name) {
    switch (name) {
        case "Right Trigger": return input.trigger(1) > 0.6;
        case "Left Trigger": return input.trigger(0) > 0.6;
        case "A": return !!input.primary(1);
        case "B": return !!input.secondary(1);
        case "X": return !!input.primary(0);
        case "Y": return !!input.secondary(0);
        case "Right Grip": return !!input.grip(1);
        case "Left Grip": return !!input.grip(0);
    }
    return false;
}

// ---- photon + RPCs ----
function photon() { return img("PhotonUnityNetworking").class("Photon.Pun.PhotonNetwork"); }
function inRoom() { return opt(function () { return !!photon().method("get_InRoom").invoke(); }, false); }
function isMaster() { return opt(function () { return inRoom() && !!photon().method("get_IsMasterClient").invoke(); }, false); }
function setMaster() {
    if (!inRoom()) { notify("Not in a room"); return; }
    if (isMaster()) { notify("Already master"); return; }
    var ok = photon().method("SetMasterClient", 1).invoke(photon().method("get_LocalPlayer").invoke());
    notify(ok ? "Master requested" : "Set Master refused");
}
function myActor() { return opt(function () { return photon().method("get_LocalPlayer").invoke().method("get_ActorNumber").invoke(); }, -1); }
var RPC_ALL = 0, RPC_MASTER = 2, RPC_ALL_BUFFERED = 3;
function boxPrim(className, v) { var o = Il2Cpp.corlib.class(className).alloc(); o.field("m_value").value = v; return o; }
function boxIt(a) {
    if (typeof a === "string") return Il2Cpp.string(a);
    if (a && a.i !== undefined) return boxPrim("System.Int32", a.i);
    if (a && a.b !== undefined) return boxPrim("System.Boolean", a.b);
    if (a && a.f !== undefined) return boxPrim("System.Single", a.f);
    if (a && a.v3 !== undefined) {
        var v = G.Vector3.alloc().unbox();
        v.field("x").value = a.v3[0]; v.field("y").value = a.v3[1]; v.field("z").value = a.v3[2];
        return v.box();
    }
    if (a && typeof a.box === "function") return a.box();
    return a;
}
function rpc(pv, name, target, args) {
    if (!pv || pv.isNull()) throw new Error("no PhotonView");
    var arr = Il2Cpp.array(Il2Cpp.corlib.class("System.Object"), (args || []).map(boxIt));
    pickM(pv, pv.class, "RPC", 3, function (ps) { return ps[0].type.name === "System.String" && ps[1].type.name === "Photon.Pun.RpcTarget"; }).invoke(Il2Cpp.string(name), target, arr);
}
function pvOf(c) { return opt(function () { return c.method("get_photonView").invoke(); }, null) || opt(function () { return getComp(goOf(c), img("PhotonUnityNetworking").class("Photon.Pun.PhotonView")); }, null); }
function myRig() { var r = opt(function () { return cs().class("VrRig").field("VRRig").value; }, null); return alive(r) ? r : null; }
function myRigPv() { var r = myRig(); if (!r) throw new Error("not in a room yet (no networked rig)"); return r.field("pv").value; }

// ------------------------------------------------------------------------------------------
// anti-cheat shield: the game reads /proc/self/maps looking for "frida" / "xposed" and closes itself
// (+ reports) when it finds them. Opens of maps / smaps / status get a memfd copy with those words
// masked in place (same length, so addresses stay right).
// ------------------------------------------------------------------------------------------
var ac = { hooks: [], hits: 0, on: false };
function acInstall() {
    if (ac.on) return;
    function exp(n) { try { return Module.findGlobalExportByName(n); } catch (e) { try { return Module.findExportByName(null, n); } catch (e2) { return null; } } }
    var memfd = exp("memfd_create"), wr = exp("write"), ls = exp("lseek"), cl = exp("close"), fdo = exp("fdopen"), fcl = exp("fclose");
    if (!memfd || !wr || !ls || !cl) { log("anti-cheat shield: libc functions missing, off"); return; }
    var _memfd = new NativeFunction(memfd, "int", ["pointer", "uint"]), _write = new NativeFunction(wr, "long", ["int", "pointer", "ulong"]);
    var _lseek = new NativeFunction(ls, "long", ["int", "long", "int"]), _close = new NativeFunction(cl, "int", ["int"]);
    var _fdopen = fdo ? new NativeFunction(fdo, "pointer", ["int", "pointer"]) : null, _fclose = fcl ? new NativeFunction(fcl, "int", ["pointer"]) : null;
    var RX = new RegExp("^/proc/(self|thread-self|" + Process.id + ")/(maps|smaps|status)$");
    var SIGS = ["frida-agent", "frida-gadget", "libfrida", "re.frida", "frida", "gum-js-loop", "gumjs", "linjector", "xposed", "lsposed", "zygisk", "magisk"].map(function (s) { return { re: new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), len: s.length }; });
    var bypass = false, cache = {};
    function readReal(path) {
        bypass = true; var out = "";
        try { var f = new File(path, "r"), ln; while ((ln = f.readLine()) && ln.length > 0) out += ln; f.close(); } catch (e) { out = ""; }
        bypass = false; return out;
    }
    function clean(path) {
        var c = cache[path], t = now();
        if (c && t - c.ts < 2000) return c.text;
        var s = readReal(path);
        if (s) { s = s.replace(/^(TracerPid:[ \t]*)\d+/gm, "$10"); SIGS.forEach(function (r) { s = s.replace(r.re, "x".repeat(r.len)); }); }
        cache[path] = { text: s, ts: t };
        return s;
    }
    function memfdOf(s) {
        var fd = _memfd(Memory.allocUtf8String("r"), 0);
        if (fd < 0) return -1;
        var buf = Memory.alloc(s.length + 1);
        for (var i = 0; i < s.length; i++) buf.add(i).writeU8(s.charCodeAt(i) & 0xff);
        _write(fd, buf, s.length); _lseek(fd, 0, 0);
        return fd;
    }
    function safePath(a) {
        if (!a || a.isNull() || a.compare(ptr(0x10000)) < 0) return null;
        if (a.and(ptr("0xffffffffffff0000")).equals(ptr("0xffffffffffff0000"))) return null;
        try { return a.readCString(); } catch (e) { return null; }
    }
    var FNS = { open: 0, openat: 1, open64: 0, openat64: 1, __open_2: 0, __openat_2: 1, fopen: 0, fopen64: 0 };
    Object.keys(FNS).forEach(function (name) {
        var fp = exp(name);
        if (!fp) return;
        var idx = FNS[name], isF = name.indexOf("fopen") === 0;
        ac.hooks.push(Interceptor.attach(fp, {
            onEnter: function (args) { this.path = (bypass || !p.acShield) ? null : safePath(args[idx]); },
            onLeave: function (ret) {
                if (!this.path || !RX.test(this.path)) return;
                if (isF ? ret.isNull() : ret.toInt32() < 0) return;
                var s = clean(this.path);
                if (!s) return;
                var mfd = memfdOf(s);
                if (mfd < 0) return;
                if (isF) {
                    var f2 = _fdopen ? _fdopen(mfd, Memory.allocUtf8String("r")) : NULL;
                    if (f2 && !f2.isNull()) { if (_fclose) _fclose(ret); ret.replace(f2); } else _close(mfd);
                } else { _close(ret.toInt32()); ret.replace(ptr(mfd)); }
                ac.hits++;
            },
        }));
    });
    ac.on = true;
    log("anti-cheat shield on (" + ac.hooks.length + " libc hooks)");
}
function acRemove() { ac.hooks.forEach(function (h) { try { h.detach(); } catch (e) {} }); ac.hooks = []; ac.on = false; }
try { acInstall(); } catch (e) { log("anti-cheat shield failed: " + e); }

// ------------------------------------------------------------------------------------------
// visuals: materials, boxes, lines, text tags (URP game)
// ------------------------------------------------------------------------------------------
function setMatInt(m, Mat, name, val) { pickM(m, Mat, "SetInt", 2, function (ps) { return ps[0].type.name === "System.String"; }).invoke(Il2Cpp.string(name), val); }
function setMatFloat(m, Mat, name, val) { pickM(m, Mat, "SetFloat", 2, function (ps) { return ps[0].type.name === "System.String"; }).invoke(Il2Cpp.string(name), val); }
function matFlag(m, Mat, name, val) { try { setMatFloat(m, Mat, name, val); } catch (e) {} try { setMatInt(m, Mat, name, val); } catch (e) {} }
function colorMat(c, overlay) {
    var Mat = core().class("UnityEngine.Material"), Sh = core().class("UnityEngine.Shader");
    var names = overlay
        ? ["Universal Render Pipeline/Unlit", "Sprites/Default", "Hidden/Internal-Colored", "GUI/Text Shader"]
        : ["Universal Render Pipeline/Unlit", "Unlit/Color", "Sprites/Default", "Hidden/Internal-Colored"];
    for (var i = 0; i < names.length; i++) {
        try {
            var sh = Sh.method("Find").invoke(Il2Cpp.string(names[i]));
            if (!sh || sh.isNull()) continue;
            var m = Mat.alloc();
            pickM(m, Mat, ".ctor", 1, function (ps) { return ps[0].type.name === "UnityEngine.Shader"; }).invoke(sh);
            var urp = names[i].indexOf("Universal") === 0;
            if (overlay && urp) {
                matFlag(m, Mat, "_Surface", 1); matFlag(m, Mat, "_Blend", 0);
                matFlag(m, Mat, "_SrcBlend", 5); matFlag(m, Mat, "_DstBlend", 10);
                matFlag(m, Mat, "_ZWrite", 0); matFlag(m, Mat, "_ZTest", 8); matFlag(m, Mat, "_Cull", 0);
                try { pickM(m, Mat, "EnableKeyword", 1, function (ps) { return ps[0].type.name === "System.String"; }).invoke(Il2Cpp.string("_SURFACE_TYPE_TRANSPARENT")); } catch (e) {}
            } else if (overlay && names[i] !== "GUI/Text Shader") {
                [["_ZTest", 8], ["_ZWrite", 0], ["_Cull", 0], ["_SrcBlend", 5], ["_DstBlend", 10]].forEach(function (kv) { try { setMatInt(m, Mat, kv[0], kv[1]); } catch (e) {} });
            }
            try { m.method("set_color").invoke(c); } catch (e) {}
            try { pickM(m, Mat, "SetColor", 2, function (ps) { return ps[0].type.name === "System.String"; }).invoke(Il2Cpp.string("_BaseColor"), c); } catch (e) {}
            if (overlay) { try { m.method("set_renderQueue").invoke(4000); } catch (e) {} }
            return m;
        } catch (e) {}
    }
    return null;
}
function mkVis(mat, kind) {
    var go = G.GameObject.method("CreatePrimitive").invoke(kind);
    try { var c = getComp(go, G.Collider); if (c) G.UObject.method("Destroy", 1).invoke(c); } catch (e) {}
    if (mat) { try { getComp(go, G.Renderer).method("set_sharedMaterial").invoke(mat); } catch (e) {} }
    return { go: go, mat: mat };
}
function visMat(o, mat) { if (mat && o.mat !== mat) { try { getComp(o.go, G.Renderer).method("set_sharedMaterial").invoke(mat); o.mat = mat; } catch (e) {} } }
function setLine(l, from, to, w) {
    var d = sub3(to, from), len = len3(d), t = tr(l.go);
    t.method("set_position").invoke(add3(from, mul3(d, 0.5)));
    if (len > 0.01) t.method("set_rotation").invoke(lookRot(d));
    t.method("set_localScale").invoke([w || 0.01, w || 0.01, len]);
}
var mats = {}, matKey = "";
function espMats() {
    var key = [p.botColor, p.plColor, p.espAlpha].join("|");
    if (key === matKey && mats.bot) return mats;
    matKey = key;
    mats = {
        bot: colorMat(col(p.botColor, p.espAlpha), true), botLine: colorMat(col(p.botColor, 0.85), true),
        pl: colorMat(col(p.plColor, p.espAlpha), true), plLine: colorMat(col(p.plColor, 0.85), true),
        obj: colorMat([1, 0.9, 0.3, Math.min(0.9, p.espAlpha + 0.15)], true),
    };
    return mats;
}
var tmpCls = null, tagFont = null;
function tmpClass() { if (!tmpCls) tmpCls = img("Unity.TextMeshPro").class("TMPro.TextMeshPro"); return tmpCls; }
function findFont() {
    if (tagFont) return tagFont;
    try {
        var texts = findObjs(img("Unity.TextMeshPro").class("TMPro.TMP_Text"));
        for (var i = 0; i < texts.length && !tagFont; i++) { var f = texts[i].method("get_font").invoke(); if (f && !f.isNull()) tagFont = f; }
    } catch (e) {}
    return tagFont;
}
function mkTag() {
    var go = newGO("DBTag");
    var tmp = addComp(go, tmpClass());
    var f = findFont();
    if (f) tmp.method("set_font").invoke(f);
    tmp.method("set_alignment").invoke(514);
    try { tmp.method("set_richText").invoke(true); } catch (e) {}
    try { tmp.method("set_enableWordWrapping").invoke(false); } catch (e) {}
    try {
        var fm = tmp.method("get_fontMaterial").invoke(), Mat = core().class("UnityEngine.Material");
        ["unity_GUIZTestMode", "_ZTestMode", "_ZTest"].forEach(function (n) { try { setMatInt(fm, Mat, n, 8); } catch (e) {} });
        try { fm.method("set_renderQueue").invoke(4000); } catch (e) {}
    } catch (e) {}
    return { go: go, tmp: tmp, txt: "", size: -1 };
}
function setTag(t, at, txt, size, headPos) {
    var tt = tr(t.go);
    tt.method("set_position").invoke(at);
    tt.method("set_rotation").invoke(lookRot(sub3(at, headPos)));
    if (t.txt !== txt) { t.tmp.method("set_text").invoke(Il2Cpp.string(txt)); t.txt = txt; }
    if (t.size !== size) { t.tmp.method("set_fontSize").invoke(size); t.size = size; }
}
function Pool(make) { return { make: make, items: {}, used: {} }; }
function poolGet(pool, key) {
    pool.used[key] = 1;
    var o = pool.items[key];
    if (!o || !alive(o.go)) { o = pool.items[key] = pool.make(); o.shown = false; }
    if (!o.shown) { setActive(o.go, true); o.shown = true; }
    return o;
}
function poolEnd(pool) {
    for (var k in pool.items) {
        if (pool.used[k]) continue;
        var o = pool.items[k];
        if (!alive(o.go)) { delete pool.items[k]; continue; }
        if (o.shown) { try { setActive(o.go, false); } catch (e) {} o.shown = false; }
    }
    pool.used = {};
}
function poolClear(pool) { for (var k in pool.items) destroyNow(pool.items[k].go); pool.items = {}; pool.used = {}; }
var pools = {
    botBox: Pool(function () { return mkVis(null, 3); }), botLine: Pool(function () { return mkVis(null, 3); }), botTag: Pool(mkTag),
    plBox: Pool(function () { return mkVis(null, 3); }), plLine: Pool(function () { return mkVis(null, 3); }), plTag: Pool(mkTag),
    objBox: Pool(function () { return mkVis(null, 3); }), objTag: Pool(mkTag),
};

// ------------------------------------------------------------------------------------------
// init: local GorillaLocomotion.Player (instance getter + rigidbody field are scrambled)
// ------------------------------------------------------------------------------------------
function findLocalPlayer() {
    var fs = G.PL.fields;
    for (var i = 0; i < fs.length; i++) {
        if (!fs[i].isStatic || fs[i].type.name !== "GorillaLocomotion.Player") continue;
        var v = opt(function () { return fs[i].value; }, null);
        if (alive(v)) return v;
    }
    var all = findObjs(G.PL);
    return all.length ? all[0] : null;
}
function init() {
    if (G.ok && alive(G.player)) return true;
    G.ok = false;
    try {
        if (!G.Vector3) {
            G.Vector3 = core().class("UnityEngine.Vector3");
            G.Quaternion = core().class("UnityEngine.Quaternion");
            G.GameObject = core().class("UnityEngine.GameObject");
            G.Renderer = core().class("UnityEngine.Renderer");
            G.UObject = core().class("UnityEngine.Object");
            G.Collider = physics().class("UnityEngine.Collider");
            G.PL = cs().class("GorillaLocomotion.Player");
            G.rbField = G.PL.fields.filter(function (f) { return !f.isStatic && f.type.name === "UnityEngine.Rigidbody"; })[0];
            if (!G.rbField) throw new Error("no Rigidbody field on GorillaLocomotion.Player");
        }
        var pl = findLocalPlayer();
        if (!alive(pl)) { G.initErr = "no local player yet (still loading?)"; return false; }
        G.player = pl;
        G.rb = pl.field(G.rbField.name).value;
        G.head = pl.field("headCollider").value;
        G.body = pl.field("bodyCollider").value;
        G.lh = pl.field("leftHandTransform").value;
        G.rh = pl.field("rightHandTransform").value;
        G.base = { maxJump: pl.field("maxJumpSpeed").value, jump: pl.field("jumpMultiplier").value, arm: pl.field("armLengthMultiplier").value || 1 };
        G.ok = true; G.initErr = "";
        noclipOn = false; speedWas = false;
        log("init ok (max jump " + G.base.maxJump.toFixed(2) + ", jump x" + G.base.jump.toFixed(2) + ")");
    } catch (e) {
        var msg = String(e);
        if (G.initErr !== msg) { G.initErr = msg; log("init failed: " + msg); }
        return false;
    }
    return true;
}

// ------------------------------------------------------------------------------------------
// movement (same locomotion as Big Scary)
// ------------------------------------------------------------------------------------------
var speedWas = false;
function speedStep() {
    var want = p.speed && (!p.gripSpeed || input.grip(1));
    if (want) {
        G.player.field("maxJumpSpeed").value = G.base.maxJump * p.speedMul;
        G.player.field("jumpMultiplier").value = G.base.jump * p.jumpMul;
        speedWas = true;
    } else if (speedWas) {
        G.player.field("maxJumpSpeed").value = G.base.maxJump;
        G.player.field("jumpMultiplier").value = G.base.jump;
        speedWas = false;
    }
}
function flyStep(dt) {
    if (!p.fly || !btnHeld(p.flyBtn)) return;
    var dir = p.handFly ? fwdOf(G.rh) : fwdOf(G.head);
    if (p.flyStyle === "Teleport") {
        var t = tr(G.player);
        t.method("set_position").invoke(add3(X(t.method("get_position").invoke()), mul3(dir, dt * p.flySpeed)));
        G.rb.method("set_velocity").invoke([0, 0, 0]);
    } else if (p.flyStyle === "Velocity") {
        G.rb.method("AddForce", 2).invoke(mul3(dir, p.flySpeed * dt * 2), 2);
        G.rb.method("AddForce", 2).invoke([0, 9.81, 0], 5);
    } else {
        G.rb.method("set_velocity").invoke(mul3(dir, p.flySpeed));
    }
}
var noclipOn = false, noclipSaved = null;
function noclipSet(on) {
    var off = G.PL.field("locomotionEnabledLayers").offset, h = G.player.handle.add(off);
    if (on) {
        noclipSaved = { mask: h.readS32() };
        h.writeS32(0);
        setEnabled(G.head, false); setEnabled(G.body, false);
    } else if (noclipSaved) {
        h.writeS32(noclipSaved.mask);
        setEnabled(G.head, true); setEnabled(G.body, true);
        noclipSaved = null;
    }
    noclipOn = on;
}
function noclipStep() { var want = p.noclip && btnHeld(p.noclipBtn); if (want !== noclipOn) noclipSet(want); }
var GRAV = { "Low": 4.5, "Moon": 8.2, "Zero": 9.81, "High": -9.81, "Reverse": 19.6 };
function gravityStep() { var g = GRAV[p.gravity]; if (g) G.rb.method("AddForce", 2).invoke([0, g, 0], 5); }
var platL = null, platR = null, platMats = {};
function platMat() { var k = p.platColor; if (!platMats[k]) platMats[k] = colorMat(col(k, 1), false); return platMats[k]; }
function makePlat(hand) {
    var go = G.GameObject.method("CreatePrimitive").invoke(3), t = tr(go);
    t.method("set_position").invoke(add3(pos3(hand), [0, -0.06, 0]));
    t.method("set_rotation").invoke(tr(hand).method("get_rotation").invoke());
    t.method("set_localScale").invoke([0.3, 0.025, 0.3]);
    try { var m = platMat(); if (m) getComp(go, G.Renderer).method("set_sharedMaterial").invoke(m); } catch (e) {}
    return go;
}
function platformStep() {
    if (p.platforms && input.grip(0)) { if (!platL) platL = makePlat(G.lh); } else if (platL) { destroyNow(platL); platL = null; }
    if (p.platforms && input.grip(1)) { if (!platR) platR = makePlat(G.rh); } else if (platR) { destroyNow(platR); platR = null; }
}
function rightOf(o) { return X(tr(o).method("get_right").invoke()); }
function ironManStep(dt) {
    if (!p.ironMan) return;
    if (input.grip(0)) G.rb.method("AddForce", 2).invoke(mul3(rightOf(G.lh), -15 * dt), 2);
    if (input.grip(1)) G.rb.method("AddForce", 2).invoke(mul3(rightOf(G.rh), 15 * dt), 2);
}
var dashPrev = false;
function dashStep() {
    var a = !!input.primary(1);
    if (p.dash && a && !dashPrev) G.rb.method("AddForce", 2).invoke(mul3(fwdOf(G.head), p.dashForce), 2);
    dashPrev = a;
}
var armWas = null;
function armStep() {
    var want = Number(p.armLen) === 1 ? null : G.base.arm * Number(p.armLen);
    if (want === null) { if (armWas !== null) { G.player.field("armLengthMultiplier").value = G.base.arm; armWas = null; } return; }
    if (G.player.field("armLengthMultiplier").value !== want) G.player.field("armLengthMultiplier").value = want;
    armWas = want;
}
function noFreezeStep() {
    if (!p.noFreeze) return;
    if (G.player.field("disableMovement").value) G.player.field("disableMovement").value = false;
    if (G.player.field("movementFrozen").value) G.player.field("movementFrozen").value = false;
}
function rayHit(origin, dir, dist, maskOverride) {
    var P = physics().class("UnityEngine.Physics");
    var mask = maskOverride || opt(function () { return G.player.handle.add(G.PL.field("locomotionEnabledLayers").offset).readS32(); }, -5) || -5;
    if (!G.rayAll) G.rayAll = P.method("RaycastAll", 4).overload("UnityEngine.Vector3", "UnityEngine.Vector3", "System.Single", "System.Int32");
    var hits = G.rayAll.invoke(origin, dir, dist, mask), best = null;
    for (var i = 0; hits && i < hits.length; i++) {
        var h = hits.get(i), d = Number(h.method("get_distance").invoke());
        if (!best || d < best.dist) best = { point: X(h.method("get_point").invoke()), normal: X(h.method("get_normal").invoke()), dist: d };
    }
    return best;
}
function teleportTo(target) {
    tr(G.player).method("set_position").invoke(target);
    try { G.rb.method("set_position").invoke(target); G.rb.method("set_velocity").invoke([0, 0, 0]); } catch (e) {}
}
// one gun pointer shared by the teleport gun and the lure gun
var gun = { line: null, dot: null, prevTrig: false, color: "" };
function gunHide() { if (gun.line) setActive(gun.line.go, false); if (gun.dot) setActive(gun.dot.go, false); }
function gunClear() { if (gun.line) destroyNow(gun.line.go); if (gun.dot) destroyNow(gun.dot.go); gun.line = gun.dot = null; }
function gunStep() {
    var mode = p.tpGun ? "tp" : (p.killGun ? "kill" : (p.goreGun ? "gore" : (p.spawnGun ? "spawn" : (p.lureGun ? "lure" : null))));
    if (!mode || !input.grip(1)) { gunHide(); gun.prevTrig = false; return; }
    var from = pos3(G.rh), dir = fwdOf(G.rh);
    var hit = rayHit(add3(from, mul3(dir, 0.1)), dir, 200), target = null;
    if (mode === "gore" || mode === "kill") {
        // lock onto the player closest to where you point (the world ray passes straight through rigs)
        target = goreAim(from, dir, hit ? hit.dist + 1.5 : 200);
        if (target) hit = { point: target.hp, normal: [0, 1, 0], dist: target.along };
        else if (!hit) hit = { point: add3(from, mul3(dir, 30)), normal: [0, 1, 0], dist: 30 };
    }
    if (!hit) { gunHide(); return; }
    var c = mode === "tp" ? [0.7, 0.45, 1] : (mode === "kill" ? [0.15, 0.15, 0.15] : mode === "gore" ? [0.8, 0.05, 0.05] : (mode === "spawn" ? [0.3, 1, 0.45] : [1, 0.55, 0.15]));
    if (gun.color !== mode) { gunClear(); gun.color = mode; }
    if (!gun.line) gun.line = mkVis(colorMat([c[0], c[1], c[2], 0.8], true), 3);
    if (!gun.dot) gun.dot = mkVis(colorMat([c[0], c[1], c[2], 0.9], true), 0);
    setLine(gun.line, from, hit.point, 0.008);
    var dt = tr(gun.dot.go);
    dt.method("set_position").invoke(hit.point);
    var ds = target ? 0.35 : 0.15;
    dt.method("set_localScale").invoke([ds, ds, ds]);
    setActive(gun.line.go, true); setActive(gun.dot.go, true);
    var trig = input.trigger(1) > 0.6;
    if (trig && !gun.prevTrig) {
        if (mode === "tp") teleportTo(add3(hit.point, add3(mul3(hit.normal, 0.4), [0, 0.9, 0])));
        else if (mode === "kill") { if (target) safe("killgun", function () { hostKill(actorOfRig(target.r)); }); else notify("Point at a player"); }
        else if (mode === "gore") { if (target) safe("goregun", function () { goreRig(target.r, true); }); else notify("Point at a player"); }
        else if (mode === "spawn") safe("spawngun", function () { spawnNet(p.spawnGunMon ? p.monPrefab : p.prefab, !!p.spawnGunMon, add3(hit.point, mul3(hit.normal, 0.5))); });
        else lureTo(hit.point, true);
    }
    gun.prevTrig = trig;
}

// ------------------------------------------------------------------------------------------
// monsters: MonsterNetBase (basicahhai, ohhellno, level3monster, Level7Monster, Level8Monster...)
// plus the two older scripts that don't derive from it
// ------------------------------------------------------------------------------------------
var PRETTY = { basicahhai: "Lurker", ohhellno: "Oh Hell No", level3monster: "Statue", Level7Monster: "Listener", Level8Monster: "Smacker", level2monster: "Starer", Level4NightMonster: "Night Crawler" };
var mons = [], monScanAt = 0;
function agentOf(o) {
    var a = opt(function () { return o.field("agent").value; }, null);
    if (alive(a)) return a;
    var f = o.class.fields.filter(function (x) { return !x.isStatic && x.type.name === "UnityEngine.AI.NavMeshAgent"; })[0];
    if (!f) return null;
    a = opt(function () { return o.field(f.name).value; }, null);
    return alive(a) ? a : null;
}
function monScan() {
    var t = now();
    if (t - monScanAt < 700) return;
    monScanAt = t;
    var seen = {}, out = [];
    ["MonsterNetBase", "level2monster", "Level4NightMonster"].forEach(function (cn) {
        var k = cls(cn);
        if (!k) return;
        findObjs(k).forEach(function (o) {
            var key = o.handle.toString();
            if (seen[key]) return;
            seen[key] = 1;
            var name = PRETTY[o.class.name] || opt(function () { return cstr(goOf(o).method("get_name").invoke()).replace(/\(Clone\)/g, "").trim(); }, "") || o.class.name;
            out.push({ o: o, key: key, agent: agentOf(o), name: name, base: o.class.name !== "level2monster" && o.class.name !== "Level4NightMonster" });
        });
    });
    mons = out;
}
function monsWanted() { return p.botEsp || p.botTracers || p.botTags || p.handInfo || p.hideMons || p.god || p.noJumpscare || p.hMonSpeed !== "Normal" || p.hAiOff || monSpd.any || aiOff.any || hidState.hidden; }
function monUpdate() {
    if (!monsWanted()) { mons = []; return; }
    monScan();
    var head = pos3(G.head);
    mons = mons.filter(function (m) { return alive(m.o); });
    mons.forEach(function (m) {
        m.pos = opt(function () { return pos3(m.o); }, null);
        m.dist = m.pos ? len3(sub3(m.pos, head)) : Infinity;
    });
}
function monEspStep() {
    var M = (p.botEsp || p.botTracers) ? espMats() : null;
    var head = pos3(G.head), hand = p.botTracers ? pos3(G.rh) : null;
    if (p.botEsp || p.botTracers || p.botTags) mons.forEach(function (m) {
        if (!m.pos) return;
        var center = add3(m.pos, [0, 1.1, 0]);
        if (p.botEsp) {
            var box = poolGet(pools.botBox, m.key);
            visMat(box, M.bot);
            var bt = tr(box.go);
            bt.method("set_position").invoke(center);
            bt.method("set_rotation").invoke(lookRot([head[0] - center[0], 0.0001, head[2] - center[2]]));
            bt.method("set_localScale").invoke([1.2, 2.2, 0.05]);
        }
        if (p.botTracers) { var l = poolGet(pools.botLine, m.key); visMat(l, M.botLine); setLine(l, hand, center, 0.01); }
        if (p.botTags) setTag(poolGet(pools.botTag, m.key), add3(m.pos, [0, 2.6, 0]), m.name + "\n" + m.dist.toFixed(0) + "m", Math.max(1.5, Math.min(8, m.dist * 0.09)), head);
    });
    poolEnd(pools.botBox); poolEnd(pools.botLine); poolEnd(pools.botTag);
}
var radar = { tag: null, at: 0 };
function radarStep() {
    if (!p.handInfo) { if (radar.tag) { destroyNow(radar.tag.go); radar.tag = null; } return; }
    if (!radar.tag || !alive(radar.tag.go)) radar.tag = mkTag();
    var t = now();
    if (t - radar.at > 150) {
        radar.at = t;
        var near = null;
        mons.forEach(function (m) { if (m.pos && (!near || m.dist < near.dist)) near = m; });
        radar.txt = near ? (near.name + " " + near.dist.toFixed(0) + "m\n" + mons.length + " monster(s)") : "no monsters";
    }
    setTag(radar.tag, add3(pos3(G.lh), [0, 0.12, 0]), radar.txt || "", 0.6, pos3(G.head));
}
// hide models: monsterRenderers on each script (or every Renderer under it)
var hid = { on: false, rs: [] };
function renderersOf(m) {
    var rs = opt(function () { return arrItems(m.o.field("monsterRenderers").value); }, []);
    if (!rs.length) rs = opt(function () { return arrItems(goOf(m.o).method("GetComponentsInChildren", 1).inflate(G.Renderer).invoke(true)); }, []);
    return rs;
}
function hideStep() {
    if (p.hideMons) {
        mons.forEach(function (m) { renderersOf(m).forEach(function (r) { if (r.method("get_enabled").invoke()) { r.method("set_enabled").invoke(false); hid.rs.push(r); } }); });
        hid.on = true;
    } else if (hid.on) {
        hid.rs.forEach(function (r) { try { if (alive(r)) r.method("set_enabled").invoke(true); } catch (e) {} });
        hid.rs = []; hid.on = false;
    }
}

// god mode: MonsterNetBase.RPC_ReportKill(actor) is what kills a player on every client; drop the ones
// for you, and switch off the kill colliders locally so your own client doesn't detect a hit either
var god = { hook: null, cols: [], on: false, dropped: 0 };
function godHook(on) {
    if (on && !god.hook) {
        var m = cs().class("MonsterNetBase").method("RPC_ReportKill", 2);
        m.implementation = function (actor, info) {
            if (p.god && actor === myActor()) { god.dropped++; return; }
            return this.method("RPC_ReportKill", 2).invoke(actor, info);
        };
        god.hook = m;
    } else if (!on && god.hook) { try { god.hook.revert(); } catch (e) {} god.hook = null; }
}
function godStep() {
    if (p.god) {
        try { godHook(true); } catch (e) { safe("godhook", function () { throw e; }); }
        mons.forEach(function (m) {
            if (!m.base) return;
            arrItems(opt(function () { return m.o.field("killColliders").value; }, null)).forEach(function (c) {
                if (c.method("get_enabled").invoke()) { c.method("set_enabled").invoke(false); god.cols.push(c); }
            });
        });
        god.on = true;
    } else if (god.on) {
        god.cols.forEach(function (c) { try { if (alive(c)) c.method("set_enabled").invoke(true); } catch (e) {} });
        god.cols = []; god.on = false;
        godHook(false);
    }
}

// invisible to monsters: PlayerHiddenFromMonster on your rig, synced with RPC_SetHidden
var hidState = { hidden: false, at: 0, comp: null };
function myHideComp() {
    if (hidState.comp && alive(hidState.comp)) return hidState.comp;
    var r = myRig();
    hidState.comp = r ? getComp(goOf(r), cs().class("PlayerHiddenFromMonster")) : null;
    return hidState.comp;
}
function hiddenStep() {
    if (!inRoom()) { hidState.hidden = false; return; }
    var want = !!p.hidden, t = now();
    if (want === hidState.hidden && (!want || t - hidState.at < 5000)) return;
    var c = myHideComp();
    if (!c) return;
    c.field("IsHidden").value = want;
    rpc(pvOf(c), "RPC_SetHidden", RPC_ALL, [{ b: want }]);
    if (want !== hidState.hidden) notify(want ? "Monsters can't see you" : "Monsters can see you again");
    hidState.hidden = want; hidState.at = t;
}

// no jumpscares: the jumpscare objects stay off, JumpScare triggers do nothing
var js = { hook: null, at: 0, overlays: [] };
function jsHook(on) {
    var k = cls("JumpScare");
    if (on && !js.hook && k) {
        var m = k.method("OnTriggerEnter", 1);
        m.implementation = function (c) { if (p.noJumpscare) return; return this.method("OnTriggerEnter", 1).invoke(c); };
        js.hook = m;
    } else if (!on && js.hook) { try { js.hook.revert(); } catch (e) {} js.hook = null; }
}
function jumpscareStep() {
    if (!p.noJumpscare) { if (js.hook) jsHook(false); return; }
    try { jsHook(true); } catch (e) {}
    var t = now();
    if (t - js.at < 200) return;
    js.at = t;
    var uis = [];
    mons.forEach(function (m) { var u = opt(function () { return m.o.field("jumpscareUI").value; }, null); if (alive(u)) uis.push(u); });
    var k = cls("JumpScare");
    if (k) findObjs(k).forEach(function (j) { var u = opt(function () { return j.field("jumpscareUI").value; }, null); if (alive(u)) uis.push(u); });
    uis.forEach(function (u) { try { if (u.method("get_activeSelf").invoke()) setActive(u, false); } catch (e) {} });
    var ov = cls("JumpscareOverlay");
    if (ov) findObjs(ov).forEach(function (o) { try { var pn = o.field("panel").value; if (alive(pn)) setEnabled(pn, false); var mt = o.field("messageText").value; if (alive(mt)) setEnabled(mt, false); } catch (e) {} });
}

// lure: RPC_AlertMonster(position) goes to whoever runs the monster AI (the master client)
function lureTo(pt, say) {
    monScanAt = 0; monScan();
    var n = 0;
    mons.forEach(function (m) {
        if (!m.base) return;
        try { rpc(pvOf(m.o), "RPC_AlertMonster", RPC_MASTER, [{ v3: pt }]); n++; } catch (e) { safe("lure", function () { throw e; }); }
    });
    if (say) notify(n ? "Lured " + n + " monster(s)" : "No monsters here");
    return n;
}
function lureFar() {
    if (!init()) { notify("Not loaded yet"); return; }
    var me = pos3(G.player), a = Math.random() * Math.PI * 2;
    var n = lureTo(add3(me, [Math.cos(a) * 120, 0, Math.sin(a) * 120]), false);
    notify(n ? "Sent " + n + " monster(s) away from you" : "No monsters here");
}

// host tools
var SPD = { "Frozen": 0, "Slow": 0.4, "Fast": 2.5, "Super Fast": 8 };
var monSpd = { any: false, orig: {}, warnAt: 0 };
function hostWarn(what) { if (now() - monSpd.warnAt > 8000) { monSpd.warnAt = now(); notify(what + ": only works when you're master client"); } }
function monSpeedStep() {
    var want = p.hMonSpeed !== "Normal";
    if (want && !isMaster()) { hostWarn("Monster Speed"); want = false; }
    if (want) {
        var mul = SPD[p.hMonSpeed];
        mons.forEach(function (m) {
            if (!m.agent) return;
            var k = m.key;
            if (!monSpd.orig[k]) monSpd.orig[k] = { a: m.agent, s: m.agent.method("get_speed").invoke(), acc: m.agent.method("get_acceleration").invoke() };
            var o = monSpd.orig[k];
            m.agent.method("set_speed").invoke(o.s * mul);
            m.agent.method("set_acceleration").invoke(Math.max(o.acc, o.acc * mul));
            try { m.agent.method("set_isStopped").invoke(mul === 0); } catch (e) {}
        });
        monSpd.any = true;
    } else if (monSpd.any) {
        for (var k in monSpd.orig) {
            var o = monSpd.orig[k];
            try { if (alive(o.a)) { o.a.method("set_speed").invoke(o.s); o.a.method("set_acceleration").invoke(o.acc); o.a.method("set_isStopped").invoke(false); } } catch (e) {}
        }
        monSpd.orig = {}; monSpd.any = false;
    }
}
var aiOff = { any: false, list: [] };
function aiOffStep() {
    var want = p.hAiOff;
    if (want && !isMaster()) { hostWarn("Monster AI Off"); want = false; }
    if (want) {
        mons.forEach(function (m) { if (m.agent && m.agent.method("get_enabled").invoke()) { m.agent.method("set_enabled").invoke(false); aiOff.list.push(m.agent); } });
        aiOff.any = true;
    } else if (aiOff.any) {
        aiOff.list.forEach(function (a) { try { if (alive(a)) a.method("set_enabled").invoke(true); } catch (e) {} });
        aiOff.list = []; aiOff.any = false;
    }
}
function bringMonsters(home) {
    if (!init()) { notify("Not loaded yet"); return; }
    if (!isMaster()) { notify("Only works when you're master client"); return; }
    monScanAt = 0; monScan();
    var me = pos3(G.player), n = 0;
    mons.forEach(function (m, i) {
        var at = null;
        if (home) at = opt(function () { var s = m.o.field("spawn").value; return alive(s) ? pos3(s) : null; }, null);
        else { var a = (i / Math.max(1, mons.length)) * Math.PI * 2; at = add3(me, [Math.cos(a) * 4, 0, Math.sin(a) * 4]); }
        if (!at) return;
        try { if (m.agent && m.agent.method("get_enabled").invoke()) m.agent.method("Warp").invoke(at); else tr(m.o).method("set_position").invoke(at); n++; } catch (e) {}
    });
    notify((home ? "Sent home " : "Brought ") + n + " monster(s)");
}

// ------------------------------------------------------------------------------------------
// objectives
// ------------------------------------------------------------------------------------------
var OBJ = { Level7FuseBox: "Fuse Box", Level7Exit: "Exit", Teleporter: "Door", valvepart: "Valve Part" };
var objs = { list: [], at: 0 };
function objScan() {
    var t = now();
    if (t - objs.at < 1500) return objs.list;
    objs.at = t;
    var out = [];
    Object.keys(OBJ).forEach(function (cn) { var k = cls(cn); if (k) findObjs(k).forEach(function (o) { out.push({ o: o, key: o.handle.toString(), name: OBJ[cn], cn: cn }); }); });
    objs.list = out;
    return out;
}
function objEspStep() {
    if (p.objEsp) {
        var M = espMats(), head = pos3(G.head);
        objScan().forEach(function (ob) {
            if (!alive(ob.o)) return;
            if (!opt(function () { return goOf(ob.o).method("get_activeInHierarchy").invoke(); }, true)) return;
            var at = opt(function () { return pos3(ob.o); }, null);
            if (!at) return;
            var box = poolGet(pools.objBox, ob.key);
            visMat(box, M.obj);
            var bt = tr(box.go);
            bt.method("set_position").invoke(at);
            bt.method("set_rotation").invoke(lookRot([head[0] - at[0], 0.0001, head[2] - at[2]]));
            bt.method("set_localScale").invoke([0.5, 0.5, 0.05]);
            var d = len3(sub3(at, head));
            setTag(poolGet(pools.objTag, ob.key), add3(at, [0, 0.55, 0]), ob.name + "\n" + d.toFixed(0) + "m", Math.max(0.8, Math.min(5, d * 0.06)), head);
        });
    }
    poolEnd(pools.objBox); poolEnd(pools.objTag);
}
function tpExit() {
    if (!init()) { notify("Not loaded yet"); return; }
    objs.at = 0;
    var me = pos3(G.player), best = null;
    objScan().forEach(function (ob) {
        if (ob.cn !== "Level7Exit" && ob.cn !== "Teleporter") return;
        var at = opt(function () { return pos3(ob.o); }, null);
        if (!at) return;
        var d = len3(sub3(at, me));
        if (!best || d < best.d) best = { at: at, d: d, name: ob.name };
    });
    if (!best) { notify("No exit / door in this level"); return; }
    teleportTo(add3(best.at, [0, 1, 0]));
    notify("Teleported to " + best.name);
}

// ------------------------------------------------------------------------------------------
// world
// ------------------------------------------------------------------------------------------
var world = { fog: null, amb: null, mode: null, at: 0, fogTrig: [] };
function RS() { return core().class("UnityEngine.RenderSettings"); }
function worldStep() {
    var t = now();
    if (t - world.at < 500) return;
    world.at = t;
    if (p.noFog) {
        if (world.fog === null) world.fog = !!RS().method("get_fog").invoke();
        if (RS().method("get_fog").invoke()) RS().method("set_fog").invoke(false);
        var ft = cls("FogTrigger");
        if (ft) findObjs(ft).forEach(function (f) { if (f.method("get_enabled").invoke()) { f.method("set_enabled").invoke(false); world.fogTrig.push(f); } });
    } else if (world.fog !== null) {
        RS().method("set_fog").invoke(world.fog); world.fog = null;
        world.fogTrig.forEach(function (f) { try { if (alive(f)) f.method("set_enabled").invoke(true); } catch (e) {} });
        world.fogTrig = [];
    }
    // this build strips get_ambientLight / get_ambientMode; the sky / equator / ground colors are there.
    // Flat mode (3) lights everything with the sky color. The original mode can't be read, so it goes
    // back to Trilight (1), which uses the three saved colors.
    if (p.fullbright) {
        if (world.amb === null) world.amb = ["Sky", "Equator", "Ground"].map(function (n) { return RS().method("get_ambient" + n + "Color").invoke(); });
        RS().method("set_ambientMode").invoke(3);
        ["Sky", "Equator", "Ground"].forEach(function (n) { RS().method("set_ambient" + n + "Color").invoke([1, 1, 1, 1]); });
    } else if (world.amb !== null) {
        try { RS().method("set_ambientMode").invoke(1); ["Sky", "Equator", "Ground"].forEach(function (n, i) { RS().method("set_ambient" + n + "Color").invoke(world.amb[i]); }); } catch (e) {}
        world.amb = null;
    }
}

// ------------------------------------------------------------------------------------------
// players: every VrRig except yours, head = nethead
// ------------------------------------------------------------------------------------------
var rigs = { list: [], at: 0 };
function otherRigs() {
    var t = now();
    if (t - rigs.at > 1000) { rigs.at = t; var me = myRig(); rigs.list = findObjs(cs().class("VrRig")).filter(function (r) { return !me || !same(r, me); }); }
    rigs.list = rigs.list.filter(alive);
    return rigs.list;
}
function rigHead(r) { return opt(function () { var h = r.field("nethead").value; return alive(h) ? X(h.method("get_position").invoke()) : pos3(r); }, null); }
function rigName(r) { return opt(function () { return cstr(r.field("pv").value.method("get_Owner").invoke().method("get_NickName").invoke()); }, "") || opt(function () { return cstr(r.field("n").value.field("nameTag").value.method("get_text").invoke()); }, "") || "player"; }
function playerEspStep() {
    if (p.plEsp || p.plTracers || p.plTags) {
        var M = espMats(), head = pos3(G.head), hand = pos3(G.rh);
        otherRigs().forEach(function (r) {
            var hp = rigHead(r), k = r.handle.toString();
            if (!hp) return;
            if (p.plEsp) {
                var box = poolGet(pools.plBox, k);
                visMat(box, M.pl);
                var bt = tr(box.go);
                bt.method("set_position").invoke(add3(hp, [0, -0.35, 0]));
                bt.method("set_rotation").invoke(lookRot([head[0] - hp[0], 0.0001, head[2] - hp[2]]));
                bt.method("set_localScale").invoke([0.45, 0.9, 0.05]);
            }
            if (p.plTracers) { var l = poolGet(pools.plLine, k); visMat(l, M.plLine); setLine(l, hand, hp, 0.007); }
            if (p.plTags) { var d = len3(sub3(hp, head)); setTag(poolGet(pools.plTag, k), add3(hp, [0, 0.45, 0]), rigName(r) + "\n" + d.toFixed(0) + "m", Math.max(0.8, Math.min(5, d * 0.06)), head); }
        });
    }
    poolEnd(pools.plBox); poolEnd(pools.plLine); poolEnd(pools.plTag);
}
function tpRandomPlayer() {
    if (!init()) { notify("Not loaded yet"); return; }
    rigs.at = 0;
    var l = otherRigs();
    if (!l.length) { notify("Nobody else here"); return; }
    var r = l[Math.floor(Math.random() * l.length)], hp = rigHead(r);
    if (!hp) { notify("Couldn't find them"); return; }
    teleportTo(add3(hp, [0.8, 0, 0]));
    notify("Teleported to " + rigName(r));
}

// ------------------------------------------------------------------------------------------
// gore: VrRig.RPC_DeathGore(position, direction) runs the game's RipEffect on that rig for everyone.
// Sent on the target rig's own PhotonView. No sender check on your own rig (tested); on other rigs it
// depends on whether their handler checks the sender.
// ------------------------------------------------------------------------------------------
var gore = { q: [], at: 0, loopAt: 0 };
function goreRig(r, say) {
    if (!r) throw new Error("join a room first");
    var hp = rigHead(r) || pos3(r);
    var a = Math.random() * Math.PI * 2;
    rpc(r.field("pv").value, "RPC_DeathGore", RPC_ALL, [{ v3: add3(hp, [0, -0.3, 0]) }, { v3: [Math.cos(a), 1.2, Math.sin(a)] }]);
    if (say) notify("Split " + (same(r, myRig()) ? "yourself" : rigName(r)));
}
function goreAim(from, dir, maxD) {
    var best = null;
    otherRigs().forEach(function (r) {
        var hp = rigHead(r);
        if (!hp) return;
        var body = add3(hp, [0, -0.4, 0]), rel = sub3(body, from), along = rel[0] * dir[0] + rel[1] * dir[1] + rel[2] * dir[2];
        if (along < 0.3 || along > maxD) return;
        var off = len3(sub3(rel, mul3(dir, along)));
        // generous cone: ~1m up close, wider further out
        if (off < Math.max(1.0, along * 0.08) && (!best || off / along < best.score)) best = { r: r, hp: hp, along: along, score: off / along };
    });
    return best;
}
function goreAll() {
    if (!myRig()) { notify("Join a room first"); return; }
    rigs.at = 0;
    gore.q = otherRigs().slice();
    notify("Splitting " + gore.q.length + " player(s)...");
}
function goreStep() {
    var t = now();
    if (gore.q.length && t - gore.at > 150) {
        gore.at = t;
        var r = gore.q.shift();
        if (alive(r)) safe("goreall", function () { goreRig(r, false); });
    }
    if (p.goreLoop && inRoom() && t - gore.loopAt > 2500) { gore.loopAt = t; safe("goreloop", function () { goreRig(myRig(), false); }); }
}

// ------------------------------------------------------------------------------------------
// soundboard: the game runs every outgoing mic frame (Int16) through its own FaceMicTap processor.
// We hook that processor's Process(short[]) and mix the sound's PCM into the frame in place, so the
// Recorder never changes source. (Switching the Recorder to AudioClip makes the voice Float, which
// FaceMicTap's short-only processor can't handle, and the game dies.)
// ------------------------------------------------------------------------------------------
var sbClips = {}, sb = { rec: null, playing: null, endAt: 0, len: 0, idx: -1, lastErr: "", hooked: false, hookTried: false,
    pcm: null, pcmRate: 24000, cur: 0, voiceRate: 24000, mixing: false, savedVad: null, savedTx: null, frames: 0 };
function audioImg() { return img("UnityEngine.AudioModule"); }
function sbRecorder() {
    if (sb.rec && alive(sb.rec)) return sb.rec;
    sb.rec = null;
    var R = img("PhotonVoice").class("Photon.Voice.Unity.Recorder");
    var all = findObjs(R);
    // prefer the one that's recording / transmitting (yours), else the first
    for (var i = 0; i < all.length && !sb.rec; i++) if (opt(function () { return all[i].method("get_TransmitEnabled").invoke(); }, false)) sb.rec = all[i];
    if (!sb.rec && all.length) sb.rec = all[0];
    return sb.rec;
}
function sbInstallHook() {
    if (sb.hookTried) return sb.hooked;
    sb.hookTried = true;
    try {
        var tap = img("Assembly-CSharp").class("FaceMicTap"), target = null;
        tap.nestedClasses.forEach(function (k) {
            k.methods.forEach(function (m) {
                if (!target && m.name === "Process" && !m.isStatic && m.parameterCount === 1 && m.parameters[0].type.name === "System.Int16[]") target = m;
            });
        });
        if (!target || target.virtualAddress.isNull()) throw new Error("FaceMicTap Process not found");
        // native attach: runs on Photon's audio thread, only touches the short[] memory
        sb.listener = Interceptor.attach(target.virtualAddress, {
            onEnter: function (args) {
                if (!sb.mixing) return;
                try { sbMix(args[1]); } catch (e) { sb.lastErr = String(e); sb.mixing = false; }
            }
        });
        sb.hooked = true;
    } catch (e) { sb.lastErr = String(e); log("soundboard hook: " + e); }
    return sb.hooked;
}
function sbMix(arr) {
    if (arr.isNull()) return;
    var pcm = sb.pcm; if (!pcm) return;
    var n = arr.add(0x18).readS32(); if (n <= 0 || n > 96000) return;
    var dst = new Int16Array(ArrayBuffer.wrap(arr.add(0x20), n * 2));
    var step = sb.pcmRate / sb.voiceRate, cur = sb.cur, total = pcm.length;
    sb.frames++;
    for (var i = 0; i < n; i++) {
        if (cur >= total - 1) {
            if (p.sbLoop) cur = 0; else { sb.mixing = false; break; }
        }
        var k = cur | 0, fr = cur - k;
        var smp = pcm[k] * (1 - fr) + pcm[k + 1] * fr;
        var v = dst[i] + smp * 32767;
        dst[i] = v > 32767 ? 32767 : (v < -32768 ? -32768 : v);
        cur += step;
    }
    sb.cur = cur;
}
function wavToClip(bytes, label, gain) {
    var v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < 44 || v.getUint32(0, true) !== 0x46464952 || v.getUint32(8, true) !== 0x45564157) throw new Error("not a wav");
    var off = 12, fmt = 0, ch = 0, rate = 0, bits = 0, dOff = 0, dLen = 0;
    while (off + 8 <= bytes.length) {
        var id = v.getUint32(off, true), sz = v.getUint32(off + 4, true), c = off + 8, real = Math.min(sz, bytes.length - c);
        if (id === 0x20746d66 && real >= 16) { fmt = v.getUint16(c, true); ch = v.getUint16(c + 2, true); rate = v.getUint32(c + 4, true); bits = v.getUint16(c + 14, true); if (fmt === 65534 && real >= 40) fmt = v.getUint16(c + 24, true); }
        else if (id === 0x61746164) { dOff = c; dLen = real; }
        off = c + real + (real & 1);
        if (sz > real) break;
    }
    var bps = bits >> 3;
    if ((fmt !== 1 && fmt !== 3) || !ch || !rate || !dOff || [1, 2, 3, 4].indexOf(bps) < 0) throw new Error("unsupported wav (" + fmt + "/" + bits + " bit)");
    var n = Math.floor(dLen / bps), frames = Math.floor(n / ch);
    n = frames * ch;
    var f = new Float32Array(n), mono = new Float32Array(frames), i, s;
    for (i = 0; i < n; i++) {
        var o = dOff + i * bps;
        if (bps === 2) s = v.getInt16(o, true) / 32768;
        else if (bps === 1) s = (v.getUint8(o) - 128) / 128;
        else if (bps === 3) { var x = v.getUint8(o) | (v.getUint8(o + 1) << 8) | (v.getInt8(o + 2) << 16); s = x / 8388608; }
        else s = fmt === 3 ? v.getFloat32(o, true) : v.getInt32(o, true) / 2147483648;
        s *= gain;
        f[i] = s > 1 ? 1 : (s < -1 ? -1 : s);
        mono[(i / ch) | 0] += f[i] / ch;
    }
    var clip = null;
    try {
        var AC = audioImg().class("UnityEngine.AudioClip");
        clip = AC.method("Create", 5).overload("System.String", "System.Int32", "System.Int32", "System.Int32", "System.Boolean").invoke(Il2Cpp.string(label), frames, ch, rate, false);
        var arr = Il2Cpp.array(Il2Cpp.corlib.class("System.Single"), n);
        arr.handle.add(0x20).writeByteArray(f.buffer);
        clip.method("SetData", 2).overload("System.Single[]", "System.Int32").invoke(arr, 0);
        // keep the clip alive across scene changes / GC
        try { clip.method("set_hideFlags").invoke(32); } catch (e) {}
    } catch (e) { clip = null; safe("sbclip", function () { throw e; }); }
    return { clip: clip, pcm: mono, rate: rate, len: frames / rate };
}
function sbClipFor(i) {
    var s = sbSounds[i];
    var key = s.fileName + "|" + Number(p.sbVol).toFixed(2);
    var c = sbClips[key];
    if (c && (!c.clip || alive(c.clip))) return c;
    var read = globalThis.__RASP_SOUNDBOARD_READ;
    var raw = typeof read === "function" ? read(s.fileName) : null;
    if (!raw) throw new Error("couldn't read " + s.fileName);
    var bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
    c = sbClips[key] = wavToClip(bytes, String(s.label || s.fileName), Number(p.sbVol));
    return c;
}
function sbLocalPlay(clip) {
    if (!clip || !p.sbLocal || !init()) return;
    try { audioImg().class("UnityEngine.AudioSource").method("PlayClipAtPoint", 3).overload("UnityEngine.AudioClip", "UnityEngine.Vector3", "System.Single").invoke(clip, pos3(G.head), 1.0); } catch (e) { safe("sblocal", function () { throw e; }); }
}
function sbLocalStop() {
    try { var go = G.GameObject.method("Find").invoke(Il2Cpp.string("One shot audio")); for (var k = 0; k < 4 && alive(go); k++) { destroyNow(go); go = null; } } catch (e) {}
}
function sbPlay(i) {
    if (!sbSounds.length) { notify("No sounds loaded (put sounds in Mods/sounds, push, Reload Sounds)"); return; }
    if (i < 0 || i >= sbSounds.length) i = 0;
    var c = sbClipFor(i);
    if (sb.playing) sbStop(false);
    var rec = sbRecorder(), net = false;
    if (rec && sbInstallHook()) {
        var r = Number(opt(function () { return rec.method("get_SamplingRate").invoke(); }, 0));
        sb.voiceRate = r >= 8000 && r <= 48000 ? r : 24000;
        // open the mic gate while the sound plays so quiet moments aren't cut by voice detection
        sb.savedVad = opt(function () { return !!rec.method("get_VoiceDetection").invoke(); }, null);
        sb.savedTx = opt(function () { return !!rec.method("get_TransmitEnabled").invoke(); }, null);
        if (sb.savedVad) safe("sbvad", function () { rec.method("set_VoiceDetection").invoke(false); });
        if (sb.savedTx === false) safe("sbtx", function () { rec.method("set_TransmitEnabled").invoke(true); });
        sb.pcm = c.pcm; sb.pcmRate = c.rate; sb.cur = 0; sb.frames = 0;
        sb.mixing = true; net = true;
    }
    sbLocalPlay(c.clip);
    sb.playing = c; sb.idx = i; sb.len = c.len;
    sb.endAt = now() + c.len * 1000 + 350;
    notify("Playing " + SB_NAMES[i + (sbSounds.length ? 0 : 1)] + " (" + c.len.toFixed(1) + "s)" + (net ? "" : rec ? ", local only: " + sb.lastErr : ", local only (no voice recorder)"));
}
function sbStop(say) {
    sb.mixing = false;
    var rec = sbRecorder();
    if (rec) {
        if (sb.savedVad) safe("sbvad2", function () { rec.method("set_VoiceDetection").invoke(true); });
        if (sb.savedTx === false) safe("sbtx2", function () { rec.method("set_TransmitEnabled").invoke(false); });
    }
    sb.savedVad = null; sb.savedTx = null; sb.playing = null; sb.pcm = null;
    sbLocalStop();
    if (say) notify("Sound stopped");
}
function sbStep() {
    if (!sb.playing) return;
    if (p.sbLoop) {
        if (now() > sb.endAt) { sb.endAt = now() + sb.len * 1000; sbLocalPlay(sb.playing.clip); }
        return;
    }
    if (now() > sb.endAt) sbStop(false);
}

// ------------------------------------------------------------------------------------------
// spawner: PhotonNetwork.Instantiate (props, owned by you) / InstantiateRoomObject (monsters, owned by
// the room, master only; otherwise monsters are spawned as yours). Capped so it can't flood the lobby.
// ------------------------------------------------------------------------------------------
var spawned = [], spawnAt = 0, SPAWN_CAP = 25;
function spawnNet(name, monster, at) {
    if (!init()) { notify("Not loaded yet"); return; }
    if (!inRoom()) { notify("Join a room first"); return; }
    spawned = spawned.filter(alive);
    if (spawned.length >= SPAWN_CAP) { notify("Spawn limit (" + SPAWN_CAP + "), use Delete My Spawns"); return; }
    var roomObj = monster && isMaster();
    if (now() - spawnAt < 250) return;
    spawnAt = now();
    if (!at) at = add3(pos3(G.head), mul3(fwdOf(G.head), monster ? 4 : 1.5));
    var rot = G.Quaternion.method("get_identity").invoke(), PN = photon();
    var m = PN.methods.filter(function (x) { return x.name === (roomObj ? "InstantiateRoomObject" : "Instantiate") && x.parameterCount === 5 && x.parameters[0].type.name === "System.String"; })[0];
    if (!m) throw new Error("no PhotonNetwork." + (roomObj ? "InstantiateRoomObject" : "Instantiate"));
    var go = m.invoke(Il2Cpp.string(name), at, rot, 0, NULL);
    if (go && !go.isNull()) { spawned.push(go); var ni = spawnNetInfo(go); notify("Spawned " + (MONSTER_LABEL[name] || name) + (ni.id > 0 ? " (networked, view " + ni.id + ")" : " (LOCAL ONLY, not networked)")); monScanAt = 0; }
    else notify("Spawn returned nothing");
}
// a spawn is networked when Photon gave its PhotonView a ViewID: that means the instantiate event went
// out to the room, and everyone else's client builds the same prefab from it
function spawnNetInfo(go) {
    var pv = opt(function () { return getComp(go, img("PhotonUnityNetworking").class("Photon.Pun.PhotonView")); }, null);
    if (!pv || pv.isNull()) return { id: 0, owner: 0 };
    return { id: Number(opt(function () { return pv.method("get_ViewID").invoke(); }, 0)), owner: Number(opt(function () { return pv.method("get_OwnerActorNr").invoke(); }, 0)) };
}
function checkSpawns() {
    spawned = spawned.filter(alive);
    if (!spawned.length) { notify("No spawns out"); return; }
    var net = 0, others = opt(function () { return Number(photon().method("get_CurrentRoom").invoke().method("get_PlayerCount").invoke()) - 1; }, 0);
    spawned.forEach(function (go) {
        var ni = spawnNetInfo(go);
        if (ni.id > 0) net++;
        log("spawn " + opt(function () { return cstr(go.method("get_name").invoke()); }, "?") + " view=" + ni.id + " owner=" + ni.owner);
    });
    notify(net + "/" + spawned.length + " spawns networked" + (net ? ", sent to " + others + " other player(s)" : ""));
}
function clearSpawns() {
    var n = 0;
    spawned.forEach(function (go) {
        if (!alive(go)) return;
        try { photon().methods.filter(function (x) { return x.name === "Destroy" && x.parameterCount === 1 && x.parameters[0].type.name === "UnityEngine.GameObject"; })[0].invoke(go); n++; } catch (e) { destroyNow(go); }
    });
    spawned = [];
    notify("Deleted " + n + " spawn(s)");
}

// ------------------------------------------------------------------------------------------
// cosmetics: VrRig.Enable / VrRig.Disable(name) RPCs on your rig's PhotonView (what the wardrobe sends)
// ------------------------------------------------------------------------------------------
function enabledNames(r) { return r ? listItems(opt(function () { return r.field("EnabledCosmetics").value; }, null)).map(function (g) { return cstr(g.method("get_name").invoke()); }) : []; }
function equip(name, on, quiet) {
    rpc(myRigPv(), on ? "Enable" : "Disable", RPC_ALL_BUFFERED, [name]);
    if (!quiet) notify((on ? "Equipped " : "Unequipped ") + name);
}
function equipRank(name) {
    var have = enabledNames(myRig());
    RANKS.forEach(function (r) { if (r !== name && have.indexOf(r) >= 0) equip(r, false, true); });
    equip(name, true, true);
    notify("Rank badge: " + name.replace("Rank", ""));
}
// spread over a few frames so it doesn't flood the room with 50 RPCs at once
var cosmQ = { list: [], on: true, at: 0 };
function equipMany(names, on) {
    if (!myRig()) { notify("Join a room first"); return; }
    cosmQ.list = names.slice(); cosmQ.on = on;
    notify((on ? "Equipping " : "Unequipping ") + names.length + " cosmetics...");
}
function cosmQueueStep() {
    if (!cosmQ.list.length) return;
    var t = now();
    if (t - cosmQ.at < 120) return;
    cosmQ.at = t;
    var n = cosmQ.list.shift();
    safe("cosmqueue", function () { equip(n, cosmQ.on, true); });
    if (!cosmQ.list.length) notify("Done");
}
function copyOutfit() {
    if (!init()) { notify("Not loaded yet"); return; }
    rigs.at = 0;
    var me = pos3(G.head), best = null;
    otherRigs().forEach(function (r) { var hp = rigHead(r); if (!hp) return; var d = len3(sub3(hp, me)); if (!best || d < best.d) best = { r: r, d: d }; });
    if (!best) { notify("Nobody else here"); return; }
    var theirs = enabledNames(best.r), mine = enabledNames(myRig());
    var off = mine.filter(function (n) { return theirs.indexOf(n) < 0; });
    off.forEach(function (n) { safe("copyoff", function () { equip(n, false, true); }); });
    equipMany(theirs, true);
    notify("Copying " + rigName(best.r) + " (" + theirs.length + " cosmetics)");
}
// marks every cosmetic as owned in the game's own wardrobe UI (local only, nothing is bought)
function unlockWardrobe() {
    var n = 0;
    var cb = cls("CosmButton");
    if (cb) findObjs(cb).forEach(function (b) { try { if (!b.field("IsOwned").value) { b.field("IsOwned").value = true; n++; } } catch (e) {} });
    try {
        var dc = cs().class("dc").field("Instance").value, inv = dc.field("inventory_items").value;
        if (alive(inv)) {
            var have = listItems(inv).map(cstr);
            COSMETICS.forEach(function (c) { if (have.indexOf(c) < 0) { inv.method("Add", 1).invoke(Il2Cpp.string(c)); n++; } });
        }
    } catch (e) { log("unlock wardrobe: " + e); }
    notify(n ? "Wardrobe unlocked (" + n + " added, local)" : "Nothing to unlock here (open the wardrobe area first)");
}
// color: PlayerColorSync.RPC_SetColor(r, g, b) on your rig + the "Colour" player property late joiners read
var colS = { at: 0, hue: 0, applied: "(keep)", rgbWas: false };
function hsv(h) { var i = Math.floor(h * 6), f = h * 6 - i, q = 1 - f; return [[1, f, 0], [q, 1, 0], [0, 1, f], [0, q, 1], [f, 0, 1], [1, 0, q]][i % 6]; }
function colourProp(c) {
    var HT = img("Photon3Unity3D").class("ExitGames.Client.Photon.Hashtable"), h = HT.alloc();
    h.method(".ctor", 0).invoke();
    var json = '{"r":' + c[0].toFixed(3) + ',"g":' + c[1].toFixed(3) + ',"b":' + c[2].toFixed(3) + ',"a":1.0}';
    pickM(h, HT, "set_Item", 2, function (ps) { return ps[0].type.name === "System.Object"; }).invoke(Il2Cpp.string("Colour"), Il2Cpp.string(json));
    var lp = photon().method("get_LocalPlayer").invoke();
    pickM(lp, lp.class, "SetCustomProperties", 3, null).invoke(h, NULL, NULL);
}
function setColour(c, withProp) {
    var r = myRig();
    if (!r) throw new Error("join a room first");
    var pcs = getComp(goOf(r), cs().class("PlayerColorSync"));
    if (!pcs) throw new Error("no PlayerColorSync on your rig");
    rpc(pvOf(pcs), "RPC_SetColor", RPC_ALL, [{ f: c[0] }, { f: c[1] }, { f: c[2] }]);
    if (withProp) { try { colourProp(c); } catch (e) { safe("colourprop", function () { throw e; }); } }
}
function colorStep() {
    if (!inRoom()) return;
    var t = now();
    if (p.rgb) {
        if (t - colS.at < 300) return;
        colS.at = t; colS.hue = (colS.hue + 0.04) % 1;
        colS.last = hsv(colS.hue);
        setColour(colS.last, false);
        colS.rgbWas = true;
    } else if (colS.rgbWas) {
        colS.rgbWas = false;
        if (colS.last) setColour(colS.last, true);
    } else if (p.myColor !== colS.applied) {
        colS.applied = p.myColor;
        if (PAL[p.myColor]) { setColour(PAL[p.myColor], true); notify("Color set"); }
    }
}
function applySize() {
    var s = Number(p.size);
    rpc(myRigPv(), "RPC_SyncScale", RPC_ALL_BUFFERED, [{ f: s }]);
    notify("Size set to " + s.toFixed(2));
}
// name: everyone's nametag shows photonView.Owner.NickName, and the game takes it from PlayerPrefs "username".
// Set both, save prefs so it sticks next launch, and re-assert it in case the game puts the old one back.
var nameKeep = null, nameAt = 0;
function setNameNow(n) {
    var PN = photon(), cur = opt(function () { return cstr(PN.method("get_NickName").invoke()); }, "");
    if (cur !== n) PN.method("set_NickName", 1).invoke(Il2Cpp.string(n));
    try {
        var PP = img("UnityEngine.CoreModule").class("UnityEngine.PlayerPrefs");
        if (cstr(PP.method("GetString", 1).invoke(Il2Cpp.string("username"))) !== n) { PP.method("SetString", 2).invoke(Il2Cpp.string("username"), Il2Cpp.string(n)); PP.method("Save").invoke(); }
    } catch (e) { safe("nameprefs", function () { throw e; }); }
    try {
        findObjs(cs().class("nametag")).forEach(function (t) {
            if (opt(function () { return t.field("photonView").value.method("get_IsMine").invoke(); }, false)) t.field("nameTag").value.method("set_text").invoke(Il2Cpp.string(n));
        });
    } catch (e) {}
}
function nameStep() {
    if (!nameKeep || now() - nameAt < 2000) return;
    nameAt = now();
    setNameNow(nameKeep);
}
// your-player effects: RPCs on your own rig's PhotonView that the game itself sends for you
var meS = { invis: false, monster: false, bonkAt: 0 };
function btmPlayerPv() {
    var r = myRig(); if (!r) return null;
    var f = r.class.fields.filter(function (x) { return !x.isStatic && x.type.name === "BeTheMonsterPlayer"; })[0];
    var b = f ? opt(function () { return r.field(f.name).value; }, null) : null;
    return (b && alive(b) && pvOf(b)) || r.field("pv").value;
}
function bonk() {
    var r = myRig(); if (!r) { notify("Join a room first"); return; }
    rpc(r.field("pv").value, "RPC_Bonk", RPC_ALL, [{ v3: rigHead(r) || pos3(G.head) }]);
}
function meStep() {
    if (!inRoom() || !myRig()) { meS.invis = meS.monster = false; return; }
    if (!!p.meInvis !== meS.invis) { meS.invis = !!p.meInvis; rpc(myRigPv(), "RPC_SetInvisible", RPC_ALL_BUFFERED, [{ b: meS.invis }]); notify(meS.invis ? "You're invisible" : "You're visible again"); }
    if (!!p.meMonster !== meS.monster) { meS.monster = !!p.meMonster; rpc(btmPlayerPv(), "RPC_SyncModel", RPC_ALL_BUFFERED, [{ b: meS.monster }]); notify(meS.monster ? "Monster look on" : "Monster look off"); }
    if (p.bonkLoop && now() - meS.bonkAt > 1000) { meS.bonkAt = now(); bonk(); }
}
function meReset() {
    try { if (meS.invis && myRig()) rpc(myRigPv(), "RPC_SetInvisible", RPC_ALL_BUFFERED, [{ b: false }]); } catch (e) {}
    try { if (meS.monster && myRig()) rpc(btmPlayerPv(), "RPC_SyncModel", RPC_ALL_BUFFERED, [{ b: false }]); } catch (e) {}
    meS.invis = meS.monster = false;
}
// ------------------------------------------------------------------------------------------
// host round tools: only while you're master client. These are the same messages the game's host
// sends when a monster catches someone / a Be The Monster round ends / the map vote finishes.
// ------------------------------------------------------------------------------------------
var plListAt = 0;
function actorOfRig(r) { return Number(opt(function () { return r.field("pv").value.method("get_OwnerActorNr").invoke(); }, -1)); }
function refreshHostLists() {
    if (now() - plListAt < 3000) return;
    plListAt = now();
    var names = [], acts = [];
    otherRigs().forEach(function (r) { var a = actorOfRig(r); if (a > 0) { names.push(rigName(r) + " #" + a); acts.push(a); } });
    if (!names.length) { names.push("(nobody yet)"); acts.push(-1); }
    var keep = p.hTarget;
    PL_NAMES.length = 0; PL_ACTORS.length = 0;
    names.forEach(function (n, i) { PL_NAMES.push(n); PL_ACTORS.push(acts[i]); });
    if (PL_NAMES.indexOf(keep) < 0) p.hTarget = PL_NAMES[0];
    var mv = opt(function () { return cls("MapVoteManager").field("Instance").value; }, null), maps = [];
    if (mv && alive(mv)) { var arr = opt(function () { return mv.field("mapNames").value; }, null); for (var i = 0; arr && i < arr.length; i++) maps.push(cstr(arr.get(i)) || ("Map " + (i + 1))); }
    if (maps.length) { var km = p.hMap; MAP_NAMES.length = 0; maps.forEach(function (m) { MAP_NAMES.push(m); }); if (MAP_NAMES.indexOf(km) < 0) p.hMap = MAP_NAMES[0]; }
}
function pickTarget() { var i = PL_NAMES.indexOf(p.hTarget); return i >= 0 ? PL_ACTORS[i] : -1; }
function needHost() { if (!isMaster()) { notify("Host only: you need to be master client"); return false; } return true; }
function anyMonsterPv() {
    monScanAt = 0; monScan();
    var head = pos3(G.head), best = null;
    mons.forEach(function (m) { if (!m.base || !alive(m.o)) return; var pv = pvOf(m.o); if (!pv) return; var d = len3(sub3(opt(function () { return pos3(m.o); }, head), head)); if (!best || d < best.d) best = { pv: pv, d: d }; });
    return best ? best.pv : null;
}
function hostKill(actor) {
    if (!needHost()) return;
    if (actor <= 0) { notify("Pick a player"); return; }
    var pv = anyMonsterPv();
    if (!pv) { notify("No monster in this level to do it"); return; }
    rpc(pv, "RPC_ReportKill", RPC_ALL, [{ i: actor }]);
    notify("Monster got #" + actor);
}
var killQ = { list: [], at: 0 };
function hostKillAll() {
    if (!needHost()) return;
    killQ.list = otherRigs().map(actorOfRig).filter(function (a) { return a > 0; });
    notify("Killing " + killQ.list.length + " player(s)...");
}
function hostKillStep() {
    if (!killQ.list.length || now() - killQ.at < 200) return;
    killQ.at = now();
    var a = killQ.list.shift();
    safe("killall", function () { if (isMaster()) { var pv = anyMonsterPv(); if (pv) rpc(pv, "RPC_ReportKill", RPC_ALL, [{ i: a }]); } else killQ.list = []; });
}
function btm() { var b = opt(function () { return cls("BeTheMonsterManager").field("Instance").value; }, null); return b && alive(b) ? b : null; }
function hostTag(actor) {
    if (!needHost()) return;
    if (actor <= 0) { notify("Pick a player"); return; }
    var b = btm(); if (!b) { notify("Not in Be The Monster"); return; }
    var r = otherRigs().filter(function (x) { return actorOfRig(x) === actor; })[0];
    rpc(pvOf(b), "RPC_PlayerTagged", RPC_ALL, [{ i: actor }, { i: myActor() }, boxPrim("System.Byte", 0), { v3: (r && rigHead(r)) || pos3(G.head) }]);
    notify("Tagged #" + actor);
}
function hostEndRound() {
    if (!needHost()) return;
    var b = btm(); if (!b) { notify("Not in Be The Monster"); return; }
    rpc(pvOf(b), "RPC_EndRound", RPC_ALL, ["Round ended by host"]);
    notify("Round ended");
}
function hostSetMap() {
    if (!needHost()) return;
    var mv = opt(function () { return cls("MapVoteManager").field("Instance").value; }, null);
    if (!mv || !alive(mv)) { notify("No map vote here"); return; }
    var i = Math.max(0, MAP_NAMES.indexOf(p.hMap));
    rpc(pvOf(mv), "RPC_SetWinner", RPC_ALL, [{ i: i }]);
    notify("Map set: " + p.hMap);
}

function applyName() {
    var n = String(p.newName || "").trim();
    if (!n) { notify("Type a name first"); return; }
    if (n.length > 20) n = n.slice(0, 20);
    nameKeep = n;
    setNameNow(n);
    notify("Name set to " + n);
}

// ------------------------------------------------------------------------------------------
// main loop
// ------------------------------------------------------------------------------------------
var last = Date.now();
onFrame(function () {
    var t = Date.now(), dt = Math.min(0.1, (t - last) / 1000); last = t;
    if (!init()) return;
    safe("speed", speedStep);
    safe("name", nameStep);
    safe("me", meStep);
    safe("hostlists", refreshHostLists);
    safe("killall", hostKillStep);
    safe("fly", function () { flyStep(dt); });
    safe("noclip", noclipStep);
    safe("gravity", gravityStep);
    safe("platforms", platformStep);
    safe("gun", gunStep);
    safe("ironman", function () { ironManStep(dt); });
    safe("dash", dashStep);
    safe("arms", armStep);
    safe("nofreeze", noFreezeStep);
    safe("monsters", monUpdate);
    safe("monesp", monEspStep);
    safe("radar", radarStep);
    safe("hidemons", hideStep);
    safe("god", godStep);
    safe("hidden", hiddenStep);
    safe("jumpscare", jumpscareStep);
    safe("monspeed", monSpeedStep);
    safe("aioff", aiOffStep);
    safe("objesp", objEspStep);
    safe("world", worldStep);
    safe("players", playerEspStep);
    safe("cosmqueue", cosmQueueStep);
    safe("gore", goreStep);
    safe("sound", sbStep);
    safe("color", colorStep);
});

onDisable(function () {
    try { for (var k in pools) poolClear(pools[k]); } catch (e) {}
    try { gunClear(); } catch (e) {}
    try { if (radar.tag) destroyNow(radar.tag.go); radar.tag = null; } catch (e) {}
    try { destroyNow(platL); destroyNow(platR); platL = platR = null; } catch (e) {}
    try { p.hideMons = false; hideStep(); } catch (e) {}
    try { p.god = false; godStep(); godHook(false); } catch (e) {}
    try { if (hidState.hidden) { p.hidden = false; hiddenStep(); } } catch (e) {}
    try { jsHook(false); } catch (e) {}
    try { p.hMonSpeed = "Normal"; monSpeedStep(); } catch (e) {}
    try { p.hAiOff = false; aiOffStep(); } catch (e) {}
    try { p.noFog = false; p.fullbright = false; world.at = 0; worldStep(); } catch (e) {}
    try { if (sb.playing) sbStop(false); } catch (e) {}
    meReset();
    try { if (sb.listener) { sb.listener.detach(); sb.listener = null; sb.hooked = false; sb.hookTried = false; } } catch (e) {}
    try { acRemove(); } catch (e) {}
    if (!G.ok || !alive(G.player)) return;
    try { if (noclipOn) noclipSet(false); } catch (e) {}
    try { if (speedWas) { G.player.field("maxJumpSpeed").value = G.base.maxJump; G.player.field("jumpMultiplier").value = G.base.jump; } } catch (e) {}
    try { if (armWas !== null) G.player.field("armLengthMultiplier").value = G.base.arm; } catch (e) {}
});

tab(function (ui) {
    ui.separator();
    ui.text("STATUS");
    if (G.initErr) ui.text("waiting: " + G.initErr);
    ui.text("anti-cheat shield: " + (ac.on && p.acShield ? "on, " + ac.hits + " maps read(s) cleaned" : "off"));
    ui.text("monsters tracked: " + mons.length + (isMaster() ? "  |  you are master client" : ""));
    if (p.god) ui.text("god mode: " + god.dropped + " kill(s) blocked");
    if (cosmQ.list.length) ui.text("cosmetics queued: " + cosmQ.list.length);
    ui.text("soundboard: " + sbSounds.length + " sound(s)" + (sb.playing ? ", playing " + Math.max(0, (sb.endAt - now()) / 1000).toFixed(1) + "s left" : "") + (sb.hookTried ? (sb.hooked ? ", mic mixer on (" + sb.frames + " frames, " + sb.voiceRate + " Hz)" : ", mic mixer failed: " + sb.lastErr) : ""));
    if (!sbSounds.length) ui.text("  no sounds: put files in Mods/sounds, run vrfrida, then Reload Sounds");
    ui.text("spawner: " + spawned.filter(alive).length + "/" + SPAWN_CAP + " spawned" + (isMaster() ? " (master)" : ""));
});
