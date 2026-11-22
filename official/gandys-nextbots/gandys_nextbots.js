// gandys_nextbots.js - Gandalf's Nextbots (LuWiGames) plugin for the universal menu (v1.5).
// game: com.LuWiGames.GandalfsNextbots
// Built against game 0.9.9.9944, dump in Dumps/com.LuWiGames.GandalfsNextbots_0999944_dump.cs.
// Soundboard plugin: uses globalThis.__RASP_SOUNDBOARD (this line also tells vrfrida to push Mods/sounds).
//
// Inputs: [G] = right grip, [G + T] = aim with right grip and fire with right trigger.
// Mods that need their own button have a button picker next to them.
//
// What is in here:
//   Movement   speed boost, fly, noclip, low gravity, platforms, teleport gun, no freeze/pull,
//              teleport to nearest bot, escape nearest bot
//   Monsters   god mode (nextbots + arcade monsters / explosions / zone / roulette), auto revive,
//              revive downed players (team arcade modes),
//   Arcade     infinite flashlight battery, no dash cooldown, keep power on (local), objective ESP
//              nextbot ESP + distance tags, chase alerts, hide / mute bots,
//              host tools that only run in your own private lobby (freeze, slow/fast, repel, kill, ignore me)
//   Players    player ESP boxes, tracers, name tags
//   Soundboard plays the clips from Mods/sounds through your mic (and for you), no staff RPCs
//   Money      a visual-only balance display + a read-out of your real balance
//
// Left out on purpose: anything that changes real currency (the game sends coin deltas to its PlayFab
// cloud script, so writing those values would be taking money from the dev), IAP / cosmetic unlocks,
// staff RPCs (staff soundboard, set bot amount, kick gun, ban sniper), griefing other players in public
// lobbies, quest / arcade-run auto-complete (pays coins + XP through PlayFab), and anything that dodges
// the game's voice moderation.

var input = ui.input;
var X = ui.read3;
var BTNS = ["Right Trigger", "Left Trigger", "A", "B", "X", "Y", "Right Grip", "Left Grip"];
var PAL = { "Red": [1, 0.25, 0.25], "Orange": [1, 0.6, 0.2], "Yellow": [1, 0.9, 0.3], "Green": [0.35, 1, 0.45], "Cyan": [0.3, 0.85, 1], "Purple": [0.7, 0.45, 1], "Pink": [1, 0.45, 0.8], "White": [0.95, 0.95, 0.95] };
var PAL_NAMES = Object.keys(PAL);
// plain-text versions of the Buddy Beatdown presets: names here are max 16 characters and go through the
// game's own name filter, which strips rich text, so the colors / multi-line bios can't carry over
var NAME_PRESETS = ["(type my own)", "THOOM", "Z", "l", "idiot", "MODDER", "ROOTED", "NIGHT OWL", "BURN", "FROSTBITE",
    "TOXIC", "THE KING", "SAKURA", "GLITCH", "WARNING", "ERROR 404", "WAKE UP BUDDY", "DONT ASK"];
var FAKE_AMOUNTS = ["Off", "1,000", "25,000", "100,000", "1,000,000", "9,999,999", "Custom"];

var p = props([
    { type: "label", label: "Movement" },
    { type: "bool", key: "speed", label: "Speed Boost", default: false },
    { type: "float", key: "speedMul", label: "Speed Multiplier", min: 1, max: 3, default: 1.4, decimals: 2, desc: "multiplies the game's max jump speed" },
    { type: "float", key: "jumpMul", label: "Jump Multiplier", min: 1, max: 3, default: 1.25, decimals: 2, desc: "how hard each push throws you" },
    { type: "bool", key: "gripSpeed", label: "Speed Boost: Right Grip Only", default: false },
    { type: "bool", key: "fly", label: "Fly", default: false, desc: "hold the button to fly where you look" },
    { type: "select", key: "flyBtn", label: "Fly Button", options: BTNS, default: "B" },
    { type: "select", key: "flyStyle", label: "Fly Style", options: ["Smooth", "Teleport"], default: "Smooth", desc: "smooth pushes your body, teleport moves you directly" },
    { type: "bool", key: "handFly", label: "Fly Where Right Hand Points", default: false },
    { type: "float", key: "flySpeed", label: "Fly Speed", min: 2, max: 40, default: 12, decimals: 1 },
    { type: "bool", key: "noclip", label: "Noclip", default: false, desc: "hold the button to pass through walls and floors (combine with fly)" },
    { type: "select", key: "noclipBtn", label: "Noclip Button", options: BTNS, default: "Right Trigger" },
    { type: "select", key: "gravity", label: "Gravity", options: ["Normal", "Low", "Moon", "Zero"], default: "Normal" },
    { type: "bool", key: "platforms", label: "Platforms [grips]", default: false, desc: "a platform under each hand while you hold its grip" },
    { type: "select", key: "platColor", label: "Platform Color", options: PAL_NAMES, default: "Purple" },
    { type: "bool", key: "tpGun", label: "Teleport Gun [G + T]", default: false, desc: "hold right grip to aim, pull the right trigger to teleport to the dot" },
    { type: "bool", key: "noFreeze", label: "No Freeze / Pull", default: false, desc: "event effects can't freeze you or drag you toward a bot" },
    { type: "button", label: "Teleport To Nearest Bot", onClick: function () { try { teleToBot(); } catch (e) { notify("Teleport failed: " + e); } } },
    { type: "float", key: "escapeDist", label: "Escape Distance (m)", min: 4, max: 40, default: 12, decimals: 0 },
    { type: "button", label: "Escape Nearest Bot", onClick: function () { try { escapeBots(); } catch (e) { notify("Escape failed: " + e); } } },

    { type: "label", label: "Monsters" },
    { type: "bool", key: "god", label: "God Mode", default: false, desc: "nextbots touching you don't kill you" },
    { type: "bool", key: "godAll", label: "God Mode: Everything Else", default: false, desc: "arcade monsters (angel, dark grab, run creatures), explosions, the Last Standing zone timer and roulette can't kill you. falling off the map still respawns you" },
    { type: "bool", key: "autoRevive", label: "Auto Revive", default: false, desc: "skips the death screen and respawns you after the delay below" },
    { type: "float", key: "reviveDelay", label: "Revive Delay (s)", min: 0, max: 6, default: 0.5, decimals: 1, desc: "0 = instant. skipped when you're eliminated in Last Standing or downed in a team mode" },
    { type: "button", label: "Respawn Me Now", onClick: function () { try { notify(reviveNow(true) ? "Respawned" : "You're not dead"); } catch (e) { notify("Respawn failed: " + e); } } },
    { type: "button", label: "Revive All Downed Players", onClick: function () { try { reviveOthersStart(); } catch (e) { notify("Revive failed: " + e); } }, desc: "team arcade modes with downed bodies: teleports you onto each body for the revive time, then back to where you were" },
    { type: "bool", key: "autoReviveOthers", label: "Auto Revive Downed Players", default: false, desc: "does the above by itself whenever someone goes down" },
    { type: "float", key: "reviveHeight", label: "Revive Head Height (m)", min: -0.5, max: 1.5, default: 0.2, decimals: 2, desc: "how far above the body your head is put. the game needs you within 3 m up/down and 2.4 m sideways" },
    { type: "bool", key: "botEsp", label: "Nextbot ESP", default: false, desc: "boxes on every nextbot, through walls" },
    { type: "bool", key: "botTracers", label: "Nextbot Tracers", default: false, desc: "a line from your right hand to every nextbot" },
    { type: "bool", key: "botTags", label: "Nextbot Distance Tags", default: false, desc: "name and distance above each bot, CHASING YOU when it targets you" },
    { type: "select", key: "botColor", label: "Nextbot Color", options: PAL_NAMES, default: "Orange" },
    { type: "select", key: "botChaseColor", label: "Chasing You Color", options: PAL_NAMES, default: "Red" },
    { type: "float", key: "espAlpha", label: "ESP Opacity", min: 0.05, max: 0.8, default: 0.3, decimals: 2 },
    { type: "bool", key: "handInfo", label: "Hand Radar", default: false, desc: "text on your left hand: nearest bot, how many chase you, your speed" },
    { type: "bool", key: "chaseAlert", label: "Chase Alerts", default: false, desc: "a notification when a bot starts chasing you" },
    { type: "bool", key: "hideBots", label: "Hide Nextbots (only you)", default: false, desc: "hides bot pictures and models on your screen. they can still catch you unless god mode is on" },
    { type: "bool", key: "muteBots", label: "Mute Nextbots (only you)", default: false },

    { type: "label", label: "Arcade / World" },
    { type: "bool", key: "infBattery", label: "Infinite Flashlight Battery", default: false, desc: "arcade runs: your flashlight battery stays full" },
    { type: "bool", key: "noDashCd", label: "No Dash Cooldown", default: false, desc: "dash again right away" },
    { type: "bool", key: "powerOn", label: "Keep Power On (only you)", default: false, desc: "turns the lights back on for you when an event shuts the electricity off" },
    { type: "bool", key: "objEsp", label: "Objective ESP", default: false, desc: "arcade runs: boxes + names on exits, fuses, beacons, sparks, carts, cages, cells and the charger, through walls" },
    { type: "select", key: "objColor", label: "Objective Color", options: PAL_NAMES, default: "Green" },

    { type: "label", label: "Scare Effects (only you)" },
    { type: "bool", key: "noJumpscare", label: "No Jumpscares", default: false, desc: "hides the jumpscare picture, prank jumpscares and the death blood splash" },
    { type: "bool", key: "noGlitch", label: "No Chase Glitch / Screen FX", default: false, desc: "removes the glitch overlay while chased, the bot-near vignette and screen flashes" },
    { type: "bool", key: "noFear", label: "No Hallucinations / Heartbeat", default: false, desc: "turns off the fear director: fake bots, whispers, heartbeat, rumble" },
    { type: "bool", key: "noShake", label: "No Screen Shake", default: false },

    { type: "label", label: "Lobby" },
    { type: "button", label: "Create Private Lobby (become host)", onClick: function () { createPrivateLobby(); } },
    { type: "int", key: "freeRoam", label: "Free-Roam Count", min: 1, max: 30, default: 8 },
    { type: "button", label: "Spawn Free-Roam Bots (host)", onClick: function () { spawnFreeRoam(Number(p.freeRoam)); } },

    { type: "label", label: "Host Tools (your own private lobby only)" },
    { type: "bool", key: "hFreeze", label: "Freeze All Bots", default: false },
    { type: "bool", key: "hSpeedOn", label: "Bot Speed Override", default: false },
    { type: "float", key: "hSpeed", label: "Bot Speed", min: 0.1, max: 3, default: 0.5, decimals: 2, desc: "1 = normal" },
    { type: "bool", key: "hSizeOn", label: "Bot Size Override", default: false, desc: "host only: resize every bot. networked, everyone sees it" },
    { type: "float", key: "hSize", label: "Bot Size", min: 0.2, max: 5, default: 2, decimals: 2, desc: "1 = normal" },
    { type: "bool", key: "hSeekOn", label: "Bot Detection Range", default: false, desc: "host only: how far bots can notice players. low = nearly blind, high = see across the map" },
    { type: "float", key: "hSeek", label: "Detection Mult", min: 0.05, max: 4, default: 0.2, decimals: 2, desc: "1 = normal" },
    { type: "bool", key: "hIgnoreMe", label: "Bots Ignore Me", default: false },
    { type: "button", key: "hRepel", label: "Repel Bots Around Me", onClick: function () { hostAction("repel"); } },
    { type: "button", key: "hKill", label: "Kill Bots Near Me", onClick: function () { hostAction("kill"); } },

    { type: "label", label: "Players" },
    { type: "bool", key: "plEsp", label: "Player ESP", default: false },
    { type: "bool", key: "plTracers", label: "Player Tracers", default: false },
    { type: "bool", key: "plTags", label: "Player Name Tags", default: false, desc: "name + distance, through walls" },
    { type: "select", key: "plColor", label: "Player Color", options: PAL_NAMES, default: "Cyan" },

    { type: "label", label: "Name" },
    { type: "select", key: "namePreset", label: "Name Preset", options: NAME_PRESETS, default: "(type my own)", desc: "from the buddy beatdown presets, plain text only" },
    { type: "text", key: "newName", label: "New Name", default: "" },
    { type: "button", key: "applyName", label: "Apply Name", onClick: function () { applyName(); }, desc: "goes through the game's own name filter and name menu" },

    { type: "label", label: "Soundboard (sounds go in Mods/sounds)" },
    { type: "bool", key: "sbMic", label: "Play Through Mic", default: true, desc: "other players hear it in your voice" },
    { type: "bool", key: "sbLocal", label: "Hear It Yourself", default: true },
    { type: "float", key: "sbVol", label: "Mic Volume", min: 0.1, max: 1.5, default: 0.8, decimals: 2 },
    { type: "float", key: "sbLocalVol", label: "Your Volume", min: 0.05, max: 1, default: 0.6, decimals: 2 },
    { type: "select", key: "sbBtn", label: "Random Sound Button", options: ["Off", "Left Stick Click", "Right Stick Click"].concat(BTNS), default: "Off" },

    { type: "label", label: "Money (visual only)" },
    { type: "select", key: "fakeCoins", label: "Shown Coins", options: FAKE_AMOUNTS, default: "Off", desc: "only changes the number on your screen, you can't spend it" },
    { type: "select", key: "fakeGems", label: "Shown Gems", options: FAKE_AMOUNTS, default: "Off" },
    { type: "select", key: "fakeGreen", label: "Shown Green Coins", options: FAKE_AMOUNTS, default: "Off" },
    { type: "text", key: "fakeCustom", label: "Custom Amount", default: "1337" },
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
function pos3(o) { return X(tr(o).method("get_position").invoke()); }
function fwdOf(o) { return X(tr(o).method("get_forward").invoke()); }
function add3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function mul3(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function len3(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
function same(a, b) { try { return !!a && !!b && !a.isNull() && !b.isNull() && a.handle.equals(b.handle); } catch (e) { return false; } }
function cstr(v) { try { if (!v || (v.isNull && v.isNull())) return ""; return v.content !== undefined ? String(v.content) : String(v); } catch (e) { return ""; } }
function col(name, a) { var c = PAL[name] || PAL.White; return [c[0], c[1], c[2], a]; }

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
function newGO(name) {
    var go = G.GameObject.alloc();
    pickM(go, G.GameObject, ".ctor", 1, function (ps) { return ps[0].type.name === "System.String"; }).invoke(Il2Cpp.string(name));
    return go;
}
function destroyNow(go) { try { if (go && !go.isNull()) G.UObject.method("Destroy", 1).invoke(go); } catch (e) {} }
function setActive(go, on) { go.method("SetActive", 1).invoke(on); }
function lookRot(dir) { return G.Quaternion.method("LookRotation", 1).invoke(dir); }
function now() { return Date.now(); }
function gameTime() { return G.Time.method("get_time").invoke(); }

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
        case "Left Stick Click": return !!input.stickClick(0);
        case "Right Stick Click": return !!input.stickClick(1);
    }
    return false;
}

// ------------------------------------------------------------------------------------------
// init: the local GorillaLocomotion.Player (it is recreated on every map load)
// ------------------------------------------------------------------------------------------
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
            G.Time = core().class("UnityEngine.Time");
            G.Collider = physics().class("UnityEngine.Collider");
            G.PL = cs().class("GorillaLocomotion.Player");
            G.offMax = G.PL.field("maxJumpSpeed").offset;
            G.offJump = G.PL.field("jumpMultiplier").offset;
        }
        var pl = G.PL.method("get_Instance").invoke();
        if (!alive(pl)) { G.initErr = "no local player yet (still loading?)"; return false; }
        G.player = pl;
        G.rb = pl.field("playerRigidBody").value;
        G.head = pl.field("headCollider").value;
        G.body = pl.field("bodyCollider").value;
        G.lh = pl.field("leftHandTransform").value;
        G.rh = pl.field("rightHandTransform").value;
        G.base = {
            maxJump: opt(function () { return pl.field("defaultMaxJumpSpeed").value; }, 0) || pl.field("maxJumpSpeed").value,
            jump: opt(function () { return pl.field("defaultJumpMultiplier").value; }, 0) || pl.field("jumpMultiplier").value,
        };
        G.ok = true;
        G.initErr = "";
        noclipOn = false; speedWas = false;
        log("init ok (max jump " + G.base.maxJump.toFixed(2) + ", jump x" + G.base.jump.toFixed(2) + ")");
    } catch (e) {
        var msg = String(e);
        if (G.initErr !== msg) { G.initErr = msg; log("init failed: " + msg); }
        return false;
    }
    return true;
}

// local NetworkPlayer, nextbot manager, players
function netMgr() { return opt(function () { var v = cs().class("NetworkManager").field("instance").value; return alive(v) ? v : null; }, null); }
function botMgr() { return opt(function () { var v = cs().class("NextbotManager").field("instance").value; return alive(v) ? v : null; }, null); }
function allPlayers() { return opt(function () { return listItems(cs().class("NextbotManager").field("allPlayers").value).filter(alive); }, []); }
var meCache = { t: 0, v: null };
function localNet() {
    var t = now();
    if (t - meCache.t < 1000 && alive(meCache.v)) return meCache.v;
    meCache.t = t;
    var me = opt(function () { return cs().class("NetworkManager").field("NetworkPlayerTemp").value; }, null);
    if (!alive(me)) {
        me = null;
        var ps = allPlayers();
        for (var i = 0; i < ps.length && !me; i++) if (opt(function () { return ps[i].method("get_HasInputAuthority").invoke(); }, false)) me = ps[i];
    }
    meCache.v = me;
    return me;
}
function botsList() {
    var m = botMgr();
    if (!m) return [];
    return listItems(m.field("spawnedNextbots").value).filter(function (b) {
        return alive(b) && opt(function () { return b.method("get_gameObject").invoke().method("get_activeInHierarchy").invoke(); }, false);
    });
}
function botName(b) {
    return opt(function () { var d = b.field("currentNextbot").value; return alive(d) ? cstr(d.method("get_name").invoke()) : ""; }, "") || "Nextbot";
}
function playerName(pl) {
    var n = opt(function () { return cstr(pl.field("FixedNickName").value); }, "");
    if (!n) n = opt(function () { return cstr(pl.method("get_NickName").invoke().toString()); }, "");
    return n || "player";
}

// ------------------------------------------------------------------------------------------
// movement
// ------------------------------------------------------------------------------------------
// Speed is written right before the locomotion FixedUpdate reads it, so event speed changes made by
// GNPlayer in Update can't overwrite it in between.
var spd = { active: false, max: 0, jump: 0 }, fuHook = null, speedWas = false;
function speedHookOn() {
    if (fuHook) return;
    var m = G.PL.method("FixedUpdate", 0);
    fuHook = Interceptor.attach(m.virtualAddress, {
        onEnter: function (args) {
            if (!spd.active) return;
            try { args[0].add(G.offMax).writeFloat(spd.max); args[0].add(G.offJump).writeFloat(spd.jump); } catch (e) {}
        }
    });
    log("speed: hooked FixedUpdate");
}
function speedStep() {
    var want = p.speed && (!p.gripSpeed || input.grip(1));
    if (want) {
        speedHookOn();
        spd.max = G.base.maxJump * p.speedMul;
        spd.jump = G.base.jump * p.jumpMul;
        spd.active = true;
        speedWas = true;
    } else if (speedWas) {
        spd.active = false;
        speedWas = false;
        // let the game put its own values back (respects event speed effects)
        try { G.player.method("RevertSpeedMultlipier").invoke(); } catch (e) { G.player.field("maxJumpSpeed").value = G.base.maxJump; }
        try { G.player.method("RevertJumpMultlipier").invoke(); } catch (e) { G.player.field("jumpMultiplier").value = G.base.jump; }
        try { var gp = cs().class("GNPlayer").method("get_I").invoke(); if (alive(gp)) gp.method("Apply").invoke(); } catch (e) {}
    }
}

function flyStep(dt) {
    if (!p.fly || !btnHeld(p.flyBtn)) return;
    var dir = p.handFly ? fwdOf(G.rh) : fwdOf(G.head);
    if (p.flyStyle === "Teleport") {
        var t = tr(G.player);
        t.method("set_position").invoke(add3(X(t.method("get_position").invoke()), mul3(dir, dt * p.flySpeed)));
        G.rb.method("set_velocity").invoke([0, 0, 0]);
    } else {
        G.rb.method("set_velocity").invoke(mul3(dir, p.flySpeed));
    }
}

// noclip: hands stop raycasting against the world and the body colliders turn off, nothing else changes
var noclipOn = false, noclipSaved = null;
function noclipSet(on) {
    var pl = G.player;
    var maskF = G.PL.field("locomotionEnabledLayers");
    if (on) {
        noclipSaved = { mask: pl.handle.add(maskF.offset).readS32() };
        pl.handle.add(maskF.offset).writeS32(0);
        try { G.head.method("set_enabled").invoke(false); } catch (e) {}
        try { G.body.method("set_enabled").invoke(false); } catch (e) {}
    } else if (noclipSaved) {
        pl.handle.add(maskF.offset).writeS32(noclipSaved.mask);
        try { G.head.method("set_enabled").invoke(true); } catch (e) {}
        try { G.body.method("set_enabled").invoke(true); } catch (e) {}
        noclipSaved = null;
    }
    noclipOn = on;
}
function noclipStep() {
    var want = p.noclip && btnHeld(p.noclipBtn);
    if (want !== noclipOn) noclipSet(want);
}

var GRAV = { "Low": 4.5, "Moon": 8.2, "Zero": 9.81 };
function gravityStep() {
    var g = GRAV[p.gravity];
    if (g) G.rb.method("AddForce", 2).invoke([0, g, 0], 5);
}

var platL = null, platR = null, platMats = {};
function platMat() {
    var key = p.platColor;
    if (!platMats[key]) platMats[key] = colorMat(col(p.platColor, 1), false);
    return platMats[key];
}
function makePlat(hand) {
    var go = G.GameObject.method("CreatePrimitive").invoke(3);
    var t = tr(go);
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

function rayHit(origin, dir, dist) {
    var P = physics().class("UnityEngine.Physics");
    var mask = opt(function () { return G.player.handle.add(G.PL.field("locomotionEnabledLayers").offset).readS32(); }, -5);
    if (!mask) mask = -5;
    if (!G.rayAll) G.rayAll = P.method("RaycastAll", 4).overload("UnityEngine.Vector3", "UnityEngine.Vector3", "System.Single", "System.Int32");
    var hits = G.rayAll.invoke(origin, dir, dist, mask);
    var best = null;
    for (var i = 0; hits && i < hits.length; i++) {
        var h = hits.get(i), d = Number(h.method("get_distance").invoke());
        if (!best || d < best.dist) best = { point: X(h.method("get_point").invoke()), normal: X(h.method("get_normal").invoke()), dist: d };
    }
    return best;
}
var gun = { line: null, dot: null, prevTrig: false };
function gunHide() { if (gun.line) setActive(gun.line.go, false); if (gun.dot) setActive(gun.dot.go, false); }
function tpGunStep() {
    if (!p.tpGun || !input.grip(1)) { gunHide(); gun.prevTrig = false; return; }
    var from = pos3(G.rh), dir = fwdOf(G.rh);
    var hit = rayHit(add3(from, mul3(dir, 0.1)), dir, 200);
    if (!hit) { gunHide(); return; }
    if (!gun.line) gun.line = mkVis(colorMat([0.7, 0.45, 1, 0.8], true), 3);
    if (!gun.dot) gun.dot = mkVis(colorMat([0.7, 0.45, 1, 0.9], true), 0);
    setLine(gun.line, from, hit.point, 0.008);
    var dt = tr(gun.dot.go);
    dt.method("set_position").invoke(hit.point);
    dt.method("set_localScale").invoke([0.15, 0.15, 0.15]);
    setActive(gun.line.go, true); setActive(gun.dot.go, true);
    var trig = input.trigger(1) > 0.6;
    if (trig && !gun.prevTrig) {
        var target = add3(hit.point, add3(mul3(hit.normal, 0.4), [0, 0.9, 0]));
        tr(G.player).method("set_position").invoke(target);
        G.rb.method("set_position").invoke(target);
        G.rb.method("set_velocity").invoke([0, 0, 0]);
    }
    gun.prevTrig = trig;
}
function gunClear() { if (gun.line) destroyNow(gun.line.go); if (gun.dot) destroyNow(gun.dot.go); gun.line = gun.dot = null; }
// same teleport the teleport gun uses: move the player transform + rigidbody, zero velocity
function teleportTo(target) {
    if (!G.player || !target) { notify("Player not ready"); return; }
    tr(G.player).method("set_position").invoke(target);
    try { G.rb.method("set_position").invoke(target); G.rb.method("set_velocity").invoke([0, 0, 0]); } catch (e) {}
}
function nearestBot() {
    var head = pos3(G.head), list = botsList(), best = null, bd = Infinity;
    for (var i = 0; i < list.length; i++) {
        var bo = list[i], bp = opt(function () { return pos3(bo); }, null);
        if (!bp) continue;
        var d = len3(sub3(bp, head));
        if (d < bd) { bd = d; best = { pos: bp, dist: d }; }
    }
    return best;
}
function teleToBot() { var b = nearestBot(); if (!b) { notify("No bots found"); return; } teleportTo(add3(b.pos, [0, 1, 0])); notify("Teleported to nearest bot (" + Math.round(b.dist) + "m)"); }
function escapeBots() {
    var b = nearestBot(); if (!b) { notify("No bots found"); return; }
    var head = pos3(G.head), away = sub3(head, b.pos), l = len3(away);
    var dir = l > 0.1 ? mul3(away, 1 / l) : [1, 0, 0];
    teleportTo(add3(head, mul3(dir, Number(p.escapeDist))));
    notify("Escaped " + Math.round(Number(p.escapeDist)) + "m from nearest bot");
}

// no freeze / pull: event scripts call GNPlayer.Freeze and set the pull fields
var freezeImpl = false;
function noFreezeStep() {
    var Freeze = cs().class("GNPlayer").method("Freeze", 1);
    if (p.noFreeze && !freezeImpl) { Freeze.implementation = function (secs) { }; freezeImpl = true; log("no freeze: hooked"); }
    else if (!p.noFreeze && freezeImpl) { try { Freeze.revert(); } catch (e) {} freezeImpl = false; }
    if (!p.noFreeze) return;
    var gp = cs().class("GNPlayer").method("get_I").invoke();
    if (!alive(gp)) return;
    if (gp.field("frozen").value) { try { gp.method("Unfreeze").invoke(); } catch (e) { gp.field("frozen").value = false; } }
    if (gp.field("pulling").value) gp.field("pulling").value = false;
}

// ------------------------------------------------------------------------------------------
// visuals: materials, boxes, lines, text tags
// ------------------------------------------------------------------------------------------
function setMatInt(m, Mat, name, val) {
    pickM(m, Mat, "SetInt", 2, function (ps) { return ps[0].type.name === "System.String"; }).invoke(Il2Cpp.string(name), val);
}
function setMatFloat(m, Mat, name, val) {
    pickM(m, Mat, "SetFloat", 2, function (ps) { return ps[0].type.name === "System.String"; }).invoke(Il2Cpp.string(name), val);
}
function matFlag(m, Mat, name, val) { try { setMatFloat(m, Mat, name, val); } catch (e) {} try { setMatInt(m, Mat, name, val); } catch (e) {} }
// see-through (overlay) or normal unlit material in a color.
// This game is URP: the old built-in "Hidden/Internal-Colored" shader shows up magenta/purple and renders
// wrong per eye in VR. URP/Unlit is the correct one, set up as a transparent, draw-through material.
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
                // make URP/Unlit transparent + see-through, the way URP's own material inspector does it
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
function visMat(o, mat) {
    if (mat && o.mat !== mat) { try { getComp(o.go, G.Renderer).method("set_sharedMaterial").invoke(mat); o.mat = mat; } catch (e) {} }
}
function setLine(l, from, to, w) {
    var d = sub3(to, from), len = len3(d), t = tr(l.go);
    t.method("set_position").invoke(add3(from, mul3(d, 0.5)));
    if (len > 0.01) t.method("set_rotation").invoke(lookRot(d));
    t.method("set_localScale").invoke([w || 0.01, w || 0.01, len]);
}

var mats = {}, matKey = "";
function espMats() {
    var key = [p.botColor, p.botChaseColor, p.plColor, p.espAlpha].join("|");
    if (key === matKey && mats.bot) return mats;
    matKey = key;
    mats = {
        bot: colorMat(col(p.botColor, p.espAlpha), true),
        chase: colorMat(col(p.botChaseColor, p.espAlpha + 0.15), true),
        botLine: colorMat(col(p.botColor, 0.85), true),
        chaseLine: colorMat(col(p.botChaseColor, 0.9), true),
        pl: colorMat(col(p.plColor, p.espAlpha), true),
        plLine: colorMat(col(p.plColor, 0.85), true),
    };
    return mats;
}

// TextMeshPro tags drawn on top of walls
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
    var go = newGO("GNTag");
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

// one pool per kind, keyed by object handle; anything not drawn this frame is hidden
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
function poolClear(pool) {
    for (var k in pool.items) destroyNow(pool.items[k].go);
    pool.items = {}; pool.used = {};
}
var pools = {
    botBox: Pool(function () { return mkVis(null, 3); }),
    botLine: Pool(function () { return mkVis(null, 3); }),
    botTag: Pool(mkTag),
    plBox: Pool(function () { return mkVis(null, 3); }),
    plLine: Pool(function () { return mkVis(null, 3); }),
    plTag: Pool(mkTag),
    objBox: Pool(function () { return mkVis(null, 3); }),
    objTag: Pool(mkTag),
};

// ------------------------------------------------------------------------------------------
// monsters
// ------------------------------------------------------------------------------------------
// god mode: the two ways the local player gets caught
var godImpl = false;
function godStep() {
    var Kill = cs().class("DieTrigger").method("KillLocalPlayer", 1);
    var Catch = cs().class("GNPlayer").method("Catch", 1);
    if (p.god && !godImpl) {
        Kill.implementation = function (bot) { };
        Catch.implementation = function (bot) { };
        godImpl = true;
        log("god mode: hooked");
    } else if (!p.god && godImpl) {
        try { Kill.revert(); } catch (e) {}
        try { Catch.revert(); } catch (e) {}
        godImpl = false;
    }
}

// god mode for everything else. Every death in the game ends in GameManager.GetKilled. Its callers in
// 0.9.9.9944 (found by scanning libil2cpp for branches to it):
//   DieTrigger.KillLocalPlayer, GNPlayer.Catch   nextbots / possessed players (handled by godStep above)
//   ArcadeRun.Taken, ArcadeRun.TakenTick         arcade monsters: run creatures, the angel, the dark grab
//   ExplosionManager.LocalPlayer                 grenades / explosions
//   LastStanding.SafeZoneClock, .ReachClock      Last Standing zone timer
//   RouletteTable.Reveal, NetworkManager.RussianRouletteGunRpc   roulette
//   GorillaLocomotion.Player.FixedUpdate         fell below the map: this one IS the respawn, so it's never blocked
// Each source gets an enter/leave listener that marks "a blockable death is in progress". Several of them
// tail-call GetKilled, but the listener's leave runs after that returns, so the mark still covers it.
var DEATH_SRC = [
    ["ArcadeRun", "Taken", 3, "arcade monster"],
    ["ArcadeRun", "TakenTick", 1, "arcade monster"],
    ["ExplosionManager", "LocalPlayer", 4, "explosion"],
    ["LastStanding", "SafeZoneClock", 0, "zone timer"],
    ["LastStanding", "ReachClock", 0, "zone timer"],
    ["RouletteTable", "Reveal", 0, "roulette"],
    ["NetworkManager", "RussianRouletteGunRpc", 4, "roulette"],
];
var godAll = { on: false, hooks: [], gk: null, src: [], noteAt: 0 };
function godAllStep() {
    if (p.godAll && !godAll.on) {
        DEATH_SRC.forEach(function (d) {
            try {
                var m = cs().class(d[0]).method(d[1], d[2]);
                godAll.hooks.push(Interceptor.attach(m.virtualAddress, {
                    onEnter: function () { godAll.src.push(d[3]); },
                    onLeave: function () { godAll.src.pop(); }
                }));
            } catch (e) { log("god all: no " + d[0] + "." + d[1] + ": " + e); }
        });
        var GK = cs().class("GameManager").method("GetKilled", 4);
        GK.implementation = function (wasNextbot, face, sound, spot) {
            var why = godAll.src.length ? godAll.src[godAll.src.length - 1] : null;
            if (why && p.godAll) {
                if (now() - godAll.noteAt > 3000) { godAll.noteAt = now(); notify("Blocked death (" + why + ")"); }
                return;
            }
            return this.method("GetKilled", 4).invoke(wasNextbot, face, sound, spot);
        };
        godAll.gk = GK;
        godAll.on = true;
        log("god all: " + godAll.hooks.length + "/" + DEATH_SRC.length + " death sources hooked");
    } else if (!p.godAll && godAll.on) {
        godAllOff();
    }
}
function godAllOff() {
    godAll.hooks.forEach(function (h) { try { h.detach(); } catch (e) {} });
    godAll.hooks = []; godAll.src = [];
    try { if (godAll.gk) godAll.gk.revert(); } catch (e) {}
    godAll.gk = null; godAll.on = false;
}

// auto revive: does what the end of GameManager.DeathSequence does (HideDeathText, RespawnSpot, Spawn,
// FadeInAfterRespawn) without waiting for the death screen. Skipped when the game wouldn't respawn you
// either: eliminated in Last Standing, or downed in a team mode (teammates revive you there).
var rev = { deadAt: 0, tryAt: 0 };
function isDeadNow() { return !!cs().class("GameManager").field("isDead").value; }
function reviveNow(force) {
    var GM = cs().class("GameManager");
    if (!isDeadNow()) return false;
    if (!force) {
        if (opt(function () { return cs().class("LastStanding").method("get_Eliminated").invoke(); }, false)) return false;
        if (opt(function () { return cs().class("RouteDowned").method("get_Applies").invoke(); }, false)) return false;
    }
    var gm = GM.field("instance").value;
    if (!alive(gm)) throw new Error("no GameManager");
    var routine = gm.field("deathRoutine").value;
    if (routine && !routine.isNull()) {
        try { gm.method("StopCoroutine").overload("UnityEngine.Coroutine").invoke(routine); } catch (e) { log("revive: StopCoroutine " + e); }
        gm.handle.add(gm.field("deathRoutine").offset).writePointer(NULL);
    }
    try { gm.method("HideDeathText").invoke(); } catch (e) {}
    var zero = G.Vector3.method("get_zero").invoke();
    var spot = opt(function () { return cs().class("ArcadeRun").method("RespawnSpot", 1).invoke(zero); }, zero);
    gm.method("Spawn", 1).invoke(spot);
    try { gm.method("StartCoroutine").overload("System.Collections.IEnumerator").invoke(gm.method("FadeInAfterRespawn").invoke()); } catch (e) { log("revive: fade " + e); }
    if (isDeadNow()) GM.field("isDead").value = false;
    return true;
}
function reviveStep() {
    if (!p.autoRevive) { rev.deadAt = 0; return; }
    if (!isDeadNow()) { rev.deadAt = 0; return; }
    var t = now();
    if (!rev.deadAt) rev.deadAt = t;
    if (t - rev.deadAt < Number(p.reviveDelay) * 1000 || t - rev.tryAt < 1500) return;
    rev.tryAt = t;
    if (reviveNow(false)) log("auto revive: respawned after " + ((t - rev.deadAt) / 1000).toFixed(1) + "s");
}

// reviving other players. Only the team arcade modes have it (RouteDowned): a downed player's own game
// (RouteDowned.Run) revives them once another player's synced HeadTransform stays within ReviveRadius
// of their ragdoll (PlayerRagdoll.BodyOf) for ReviveSeconds. RouteDowned.AtBody does the distance check:
// under 3 m up/down and inside the radius sideways. So we stand on each body for that long and go back.
// Other modes have no revive: dead players respawn on their own timer and nobody else can speed that up.
var ro = { queue: [], cur: null, until: 0, home: null, need: 0, lastScan: 0, done: 0 };
function downedPlayers() {
    var me = localNet(), out = [];
    allPlayers().forEach(function (np) {
        if (me && same(np, me)) return;
        if (!opt(function () { return np.method("get_isDead").invoke(); }, false)) return;
        var body = opt(function () { return cs().class("PlayerRagdoll").method("BodyOf", 1).invoke(np); }, null);
        if (alive(body)) out.push({ np: np, body: body });
    });
    return out;
}
function reviveSecs() { return opt(function () { return cs().class("RouteDowned").field("ReviveSeconds").value; }, 3) || 3; }
function reviveOthersStart(quiet) {
    if (ro.cur || ro.queue.length) { if (!quiet) notify("Already reviving"); return; }
    if (isDeadNow()) { if (!quiet) notify("You're dead, revive yourself first"); return; }
    var list = downedPlayers();
    if (!list.length) { if (!quiet) notify("Nobody is downed (only team arcade modes have bodies to revive)"); return; }
    ro.queue = list; ro.home = pos3(G.player); ro.need = (reviveSecs() + 1.5) * 1000; ro.done = 0;
    notify("Reviving " + list.length + " player(s)");
}
function reviveOthersStep() {
    var t = now();
    if (p.autoReviveOthers && !ro.cur && !ro.queue.length && t - ro.lastScan > 1000) { ro.lastScan = t; reviveOthersStart(true); }
    if (!ro.cur && !ro.queue.length) return;
    if (!ro.cur || t > ro.until || !opt(function () { return ro.cur.np.method("get_isDead").invoke(); }, false) || !alive(ro.cur.body)) {
        if (ro.cur && !opt(function () { return ro.cur.np.method("get_isDead").invoke(); }, true)) ro.done++;
        ro.cur = ro.queue.shift() || null;
        if (!ro.cur) {
            if (ro.home) teleportTo(ro.home);
            notify("Revived " + ro.done + " player(s)");
            ro.home = null;
            return;
        }
        ro.until = t + ro.need;
        log("revive: going to " + playerName(ro.cur.np));
    }
    // put our head right over the body (the rig root isn't under the head in room-scale) and hold it there
    var bp = pos3(ro.cur.body), hp = pos3(G.head), root = pos3(G.player);
    teleportTo(add3(root, [bp[0] - hp[0], bp[1] + Number(p.reviveHeight) - hp[1], bp[2] - hp[2]]));
}

// ------------------------------------------------------------------------------------------
// arcade / world
// ------------------------------------------------------------------------------------------
// flashlight: ArcadeRun.battery is a static the local run drains (BatteryLasts = seconds a full charge
// lasts). It's kept at the highest value seen (at least 1 = full), so it works whether it's stored as a
// 0..1 fraction or in seconds.
var bat = { max: 0 };
function batteryStep() {
    if (!p.infBattery) { bat.max = 0; return; }
    var AR = cs().class("ArcadeRun"), f = AR.field("battery"), v = f.value;
    if (v > bat.max) bat.max = v;
    var full = bat.max > 1.01 ? Math.max(bat.max, opt(function () { return AR.field("BatteryLasts").value; }, 0)) : 1;
    if (v < full) f.value = full;
}

// dash: DashExtension.dashCooldown counts down to 0 (charge = 1 - dashCooldown / cooldown)
function dashStep() {
    if (!p.noDashCd) return;
    var d = cs().class("DashExtension").field("instance").value;
    if (alive(d) && d.field("dashCooldown").value > 0) d.field("dashCooldown").value = 0;
}

// power: the shutdown event ends up in GameManager.ShutdownElectricity on every client; turning it back
// on with GameManager.StartupElectricity(false) is local, nobody else's lights change
var pwr = { at: 0, did: false };
function powerStep() {
    var t = now();
    if (t - pwr.at < 500) return;
    pwr.at = t;
    var GM = cs().class("GameManager"), gm = GM.field("instance").value;
    if (!alive(gm)) return;
    var off = !!gm.field("electricityIsOff").value;
    if (p.powerOn && off) {
        gm.method("StartupElectricity", 1).invoke(false);
        if (!pwr.did) { pwr.did = true; log("power: lights back on (local)"); }
    } else if (!p.powerOn && pwr.did) {
        // put the blackout back if the event is still going (ShutdownElectricity also plays its sound)
        pwr.did = false;
        if (GM.field("ElectricityShutdown").value) { try { gm.method("ShutdownElectricity").invoke(); } catch (e) {} }
    }
}

// objective ESP: RouteProps.slots holds every arcade-run prop the game is showing (kind + position)
var OBJ_KINDS = ["None", "Exit", "Fuse", "Beacon", "Bolt", "Spark", "Scanner", "Cart", "Cage", "Mark", "Drop", "Cell", "Creature"];
var objMat = { key: "", m: null };
function objEspStep() {
    if (!p.objEsp) { poolEnd(pools.objBox); poolEnd(pools.objTag); return; }
    var mk = p.objColor + "|" + p.espAlpha;
    if (objMat.key !== mk || !objMat.m) { objMat.key = mk; objMat.m = colorMat(col(p.objColor, p.espAlpha + 0.1), true); }
    var head = pos3(G.head), list = [];
    var RP = cs().class("RouteProps"), slots = opt(function () { return RP.field("slots").value; }, null);
    if (slots && !slots.isNull()) {
        for (var i = 0; i < slots.length; i++) {
            var sl = slots.get(i);
            if (!sl || sl.isNull()) continue;
            var root = sl.field("root").value;
            if (!alive(root) || !root.method("get_activeInHierarchy").invoke()) continue;
            var kind = sl.handle.add(sl.field("shown").offset).readS32();
            if (kind <= 0) continue;
            var at = sl.handle.add(sl.field("shownAt").offset);
            list.push({ key: "s" + i, name: OBJ_KINDS[kind] || ("Prop " + kind), pos: [at.readFloat(), at.add(4).readFloat(), at.add(8).readFloat()] });
        }
    }
    var AR = cs().class("ArcadeRun");
    if (opt(function () { return AR.field("chargerCell").value; }, -1) >= 0) {
        var c = opt(function () { return X(AR.field("chargerAt").value); }, null);
        if (c && (c[0] || c[1] || c[2])) list.push({ key: "charger", name: "Charger", pos: c });
    }
    list.forEach(function (o) {
        var center = add3(o.pos, [0, 0.6, 0]), d = len3(sub3(o.pos, head));
        var box = poolGet(pools.objBox, o.key);
        visMat(box, objMat.m);
        var bt = tr(box.go);
        bt.method("set_position").invoke(center);
        bt.method("set_rotation").invoke(lookRot([head[0] - center[0], 0.0001, head[2] - center[2]]));
        bt.method("set_localScale").invoke([0.8, 1.2, 0.05]);
        setTag(poolGet(pools.objTag, o.key), add3(o.pos, [0, 1.6, 0]), o.name + "\n" + d.toFixed(0) + "m", Math.max(1.5, Math.min(8, d * 0.09)), head);
    });
    poolEnd(pools.objBox); poolEnd(pools.objTag);
}

// per frame snapshot of the bots, shared by ESP / radar / alerts / host tools
var bots = [], chasing = {}, lastAlert = 0;
function botScan() {
    bots = [];
    if (!(p.botEsp || p.botTracers || p.botTags || p.handInfo || p.chaseAlert || p.hideBots || p.muteBots || hostWanted() || hidden.any || muted.any)) return;
    var me = localNet();
    var list = botsList();
    var head = pos3(G.head);
    for (var i = 0; i < list.length; i++) {
        var b = list[i];
        var bp = opt(function () { return pos3(b); }, null);
        if (!bp) continue;
        var target = opt(function () { return b.field("lastTarget").value; }, null);
        var mine = !!me && alive(target) && same(target, me);
        bots.push({ o: b, key: b.handle.toString(), pos: bp, dist: len3(sub3(bp, head)), chasing: mine, size: opt(function () { return b.method("get_Size").invoke(); }, 1) || 1 });
    }
    if (p.chaseAlert) {
        var t = now(), seen = {};
        for (var j = 0; j < bots.length; j++) {
            var e = bots[j];
            if (!e.chasing) continue;
            seen[e.key] = 1;
            if (!chasing[e.key] && t - lastAlert > 2500) { lastAlert = t; notify(botName(e.o) + " is chasing you! (" + Math.round(e.dist) + "m)"); }
        }
        chasing = seen;
    }
}

function botEspStep() {
    var M = (p.botEsp || p.botTracers) ? espMats() : null;
    var head = pos3(G.head), hand = (p.botTracers ? pos3(G.rh) : null);
    for (var i = 0; i < bots.length; i++) {
        var b = bots[i];
        var s = Math.max(0.6, Math.min(6, b.size));
        var center = add3(b.pos, [0, s * 0.9, 0]);
        if (p.botEsp) {
            var box = poolGet(pools.botBox, b.key);
            visMat(box, b.chasing ? M.chase : M.bot);
            var bt = tr(box.go);
            bt.method("set_position").invoke(center);
            bt.method("set_rotation").invoke(lookRot([head[0] - center[0], 0.0001, head[2] - center[2]]));
            bt.method("set_localScale").invoke([s * 1.2, s * 1.8, 0.05]);
        }
        if (p.botTracers) {
            var l = poolGet(pools.botLine, b.key);
            visMat(l, b.chasing ? M.chaseLine : M.botLine);
            setLine(l, hand, center, b.chasing ? 0.014 : 0.009);
        }
        if (p.botTags) {
            var tg = poolGet(pools.botTag, b.key);
            var txt = botName(b.o) + "\n" + b.dist.toFixed(0) + "m" + (b.chasing ? "\n<color=#ff5050>CHASING YOU</color>" : "");
            var at = add3(b.pos, [0, s * 1.9 + 0.4, 0]);
            setTag(tg, at, txt, Math.max(1.5, Math.min(8, b.dist * 0.09)), head);
        }
    }
    poolEnd(pools.botBox); poolEnd(pools.botLine); poolEnd(pools.botTag);
}

// left hand radar text
var radar = { tag: null, at: 0 };
function radarStep() {
    if (!p.handInfo) { if (radar.tag) { destroyNow(radar.tag.go); radar.tag = null; } return; }
    if (!radar.tag || !alive(radar.tag.go)) radar.tag = mkTag();
    var head = pos3(G.head);
    var at = add3(pos3(G.lh), [0, 0.12, 0]);
    var t = now();
    var txt = radar.tag.txt;
    if (t - radar.at > 150) {
        radar.at = t;
        var near = null, n = 0;
        for (var i = 0; i < bots.length; i++) { if (!near || bots[i].dist < near.dist) near = bots[i]; if (bots[i].chasing) n++; }
        var v = opt(function () { return len3(X(G.rb.method("get_velocity").invoke())); }, 0);
        txt = (near ? (near.chasing ? "<color=#ff5050>" : "") + "nearest: " + near.dist.toFixed(1) + "m" + (near.chasing ? "</color>" : "") : "no bots") +
            "\nchasing you: " + n + "\n" + v.toFixed(1) + " m/s";
    }
    setTag(radar.tag, at, txt, 0.9, head);
}

// hide / mute bots on your screen only; originals are restored when switched off
var hidden = { any: false, items: {} }, muted = { any: false, items: {} };
function hideStep() {
    if (p.hideBots) {
        for (var i = 0; i < bots.length; i++) {
            var b = bots[i].o, k = bots[i].key;
            var sr = opt(function () { return b.field("spriteRenderer").value; }, null);
            if (alive(sr) && sr.method("get_enabled").invoke()) { sr.method("set_enabled").invoke(false); hidden.items[k + "s"] = sr; }
            var m3 = opt(function () { return b.field("model3D").value; }, null);
            if (alive(m3)) { var go = m3.method("get_gameObject").invoke(); if (go.method("get_activeSelf").invoke()) { setActive(go, false); hidden.items[k + "m"] = go; } }
        }
        hidden.any = true;
    } else if (hidden.any) {
        for (var key in hidden.items) {
            var o = hidden.items[key];
            if (!alive(o)) continue;
            try { if (key.slice(-1) === "s") o.method("set_enabled").invoke(true); else setActive(o, true); } catch (e) {}
        }
        hidden = { any: false, items: {} };
    }
    if (p.muteBots) {
        for (var j = 0; j < bots.length; j++) {
            var a = opt(function () { return bots[j].o.field("botAudio").value; }, null);
            if (alive(a) && !a.method("get_mute").invoke()) { a.method("set_mute").invoke(true); muted.items[bots[j].key] = a; }
        }
        muted.any = true;
    } else if (muted.any) {
        for (var mk in muted.items) { var src = muted.items[mk]; if (alive(src)) { try { src.method("set_mute").invoke(false); } catch (e) {} } }
        muted = { any: false, items: {} };
    }
}

// host tools: only when this client runs the bots AND the lobby is private
function hostWanted() { return p.hFreeze || p.hSpeedOn || p.hSizeOn || p.hSeekOn || p.hIgnoreMe || botSpeed.any || botSize.any || botSeek.any || ignore.on; }
function hostState() {
    var m = botMgr(), n = netMgr();
    if (!m || !n) return { ok: false, why: "not in a lobby" };
    var auth = opt(function () { return !!m.method("get_HasStateAuthority").invoke(); }, false);
    var priv = opt(function () { return !!n.method("get_IsPrivateLobby").invoke(); }, false);
    if (!priv) return { ok: false, why: "public lobby (host tools only run in your own private lobby)" };
    if (!auth) return { ok: false, why: "you are not the one running the bots in this lobby" };
    return { ok: true, why: "ok" };
}
var botSpeed = { any: false, orig: {}, wrote: {} }, botSize = { any: false, orig: {}, wrote: {} }, botSeek = { any: false, orig: {}, wrote: {} }, ignore = { on: false, who: null }, hostFreezeAt = 0;
function hostStep() {
    var hs = hostWanted() ? hostState() : { ok: false };
    G.host = hs;
    // freeze: keep every bot stunned
    if (p.hFreeze && hs.ok && now() - hostFreezeAt > 300) {
        hostFreezeAt = now();
        for (var i = 0; i < bots.length; i++) { try { bots[i].o.method("Knockback", 3).invoke([0, 0, 0], 0.6, true); } catch (e) {} }
    }
    // speed override: remember each bot's own speed, put it back after
    if (p.hSpeedOn && hs.ok) {
        for (var j = 0; j < bots.length; j++) {
            var b = bots[j].o, k = bots[j].key;
            var cur = b.method("get_BaseSpeed").invoke();
            if (botSpeed.wrote[k] === undefined || Math.abs(cur - botSpeed.wrote[k]) > 0.001) botSpeed.orig[k] = cur; // new bot or the game reset it
            var want = botSpeed.orig[k] * p.hSpeed;
            if (Math.abs(cur - want) > 0.001) b.method("set_BaseSpeed").invoke(want);
            botSpeed.wrote[k] = want;
        }
        botSpeed.any = true;
    } else if (botSpeed.any) {
        for (var q = 0; q < bots.length; q++) {
            var k2 = bots[q].key;
            if (botSpeed.orig[k2] !== undefined) { try { bots[q].o.method("set_BaseSpeed").invoke(botSpeed.orig[k2]); } catch (e) {} }
        }
        botSpeed = { any: false, orig: {}, wrote: {} };
    }
    // size override: same shape as speed, networked from the host
    if (p.hSizeOn && hs.ok) {
        for (var si = 0; si < bots.length; si++) {
            var sb = bots[si].o, sk = bots[si].key;
            var scur = sb.method("get_Size").invoke();
            if (botSize.wrote[sk] === undefined || Math.abs(scur - botSize.wrote[sk]) > 0.001) botSize.orig[sk] = scur;
            var swant = botSize.orig[sk] * p.hSize;
            if (Math.abs(scur - swant) > 0.001) sb.method("set_Size").invoke(swant);
            botSize.wrote[sk] = swant;
        }
        botSize.any = true;
    } else if (botSize.any) {
        for (var sq = 0; sq < bots.length; sq++) {
            var sk2 = bots[sq].key;
            if (botSize.orig[sk2] !== undefined) { try { bots[sq].o.method("set_Size").invoke(botSize.orig[sk2]); } catch (e) {} }
        }
        botSize = { any: false, orig: {}, wrote: {} };
    }
    // detection range override: same shape, networked from the host
    if (p.hSeekOn && hs.ok) {
        for (var ri = 0; ri < bots.length; ri++) {
            var rb = bots[ri].o, rk = bots[ri].key;
            var rcur = rb.method("get_SeekRadius").invoke();
            if (botSeek.wrote[rk] === undefined || Math.abs(rcur - botSeek.wrote[rk]) > 0.001) botSeek.orig[rk] = rcur;
            var rwant = botSeek.orig[rk] * p.hSeek;
            if (Math.abs(rcur - rwant) > 0.001) rb.method("set_SeekRadius").invoke(rwant);
            botSeek.wrote[rk] = rwant;
        }
        botSeek.any = true;
    } else if (botSeek.any) {
        for (var rq = 0; rq < bots.length; rq++) {
            var rk2 = bots[rq].key;
            if (botSeek.orig[rk2] !== undefined) { try { bots[rq].o.method("set_SeekRadius").invoke(botSeek.orig[rk2]); } catch (e) {} }
        }
        botSeek = { any: false, orig: {}, wrote: {} };
    }
    // ignore me: the game skips players in NextbotManager.safePlayers when picking targets
    var wantIgnore = p.hIgnoreMe && hs.ok;
    if (wantIgnore !== ignore.on) {
        var set = cs().class("NextbotManager").field("safePlayers").value;
        var me = localNet();
        if (wantIgnore && me && set && !set.isNull()) { set.method("Add").invoke(me); ignore = { on: true, who: me }; log("bots ignore me: on"); }
        else if (!wantIgnore && ignore.on) { try { if (set && !set.isNull() && alive(ignore.who)) set.method("Remove").invoke(ignore.who); } catch (e) {} ignore = { on: false, who: null }; }
    }
}
function hostAction(kind) {
    mainThread(function () {
        safe("host " + kind, function () {
            if (!init()) { notify("Not ready yet"); return; }
            var hs = hostState();
            if (!hs.ok) { notify("Host tools: " + hs.why); return; }
            var me = pos3(G.head);
            var NB = cs().class("Nextbot");
            if (kind === "repel") { NB.method("Push", 4).invoke(me, 20.0, 30.0, 2.0); notify("Pushed the bots away"); }
            else { var n = NB.method("Explosion", 4).invoke(me, 8.0, 14.0, false); notify("Killed " + n + " bot(s) near you"); }
        });
    });
}

// create a private lobby: you become the Fusion host, which unlocks the host tools above.
// same calls the game's own "private lobby" menu makes. Best run from the menu, not mid-game.
function createPrivateLobby() {
    mainThread(function () {
        safe("create lobby", function () {
            if (!init()) { notify("Not ready yet"); return; }
            var n = netMgr(); if (!n) { notify("Network not ready (open the game's lobby/computer first)"); return; }
            var NM = cs().class("NetworkManager");
            var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", code = "";
            for (var i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
            var name = NM.method("PrivateKey", 1).invoke(Il2Cpp.string(code));
            try { n.method("set_IsPrivateLobby", 1).invoke(true); } catch (e) {}
            n.method("JoinPrivateRoom", 1).invoke(name);
            notify("Creating private lobby. Your code: " + code + " - share it so friends can join.", 8);
            log("private lobby code: " + code);
        });
    });
}
function spawnFreeRoam(amount) {
    mainThread(function () {
        safe("free-roam", function () {
            if (!init()) { notify("Not ready yet"); return; }
            var hs = hostState(); if (!hs.ok) { notify("Host tools: " + hs.why); return; }
            var m = botMgr(); if (!m) { notify("Bot manager not ready"); return; }
            var gen = opt(function () { return Number(m.method("get_FreeRoamGen").invoke()); }, 0);
            m.method("SetFreeRoamBots", 2).invoke(amount, gen);
            notify("Spawned " + amount + " free-roam bot(s)");
        });
    });
}

// ------------------------------------------------------------------------------------------
// players
// ------------------------------------------------------------------------------------------
function playerEspStep() {
    var want = p.plEsp || p.plTracers || p.plTags;
    if (want) {
        var M = espMats();
        var me = localNet(), head = pos3(G.head), hand = pos3(G.rh);
        var ps = allPlayers();
        for (var i = 0; i < ps.length; i++) {
            var pl = ps[i];
            if (me && same(pl, me)) continue;
            var ht = opt(function () { return pl.field("HeadTransform").value; }, null);
            if (!alive(ht)) continue;
            var hp = X(ht.method("get_position").invoke());
            var k = pl.handle.toString();
            var dead = opt(function () { return pl.method("get_isDead").invoke(); }, false);
            if (p.plEsp) {
                var box = poolGet(pools.plBox, k);
                visMat(box, M.pl);
                var bt = tr(box.go);
                bt.method("set_position").invoke(add3(hp, [0, -0.35, 0]));
                bt.method("set_rotation").invoke(lookRot([head[0] - hp[0], 0.0001, head[2] - hp[2]]));
                bt.method("set_localScale").invoke([0.45, 0.9, 0.05]);
            }
            if (p.plTracers) { var l = poolGet(pools.plLine, k); visMat(l, M.plLine); setLine(l, hand, hp, 0.007); }
            if (p.plTags) {
                var tg = poolGet(pools.plTag, k);
                var d = len3(sub3(hp, head));
                setTag(tg, add3(hp, [0, 0.45, 0]), playerName(pl) + (dead ? " <color=#ff5050>(dead)</color>" : "") + "\n" + d.toFixed(0) + "m", Math.max(0.8, Math.min(5, d * 0.06)), head);
            }
        }
    }
    poolEnd(pools.plBox); poolEnd(pools.plLine); poolEnd(pools.plTag);
}

// ------------------------------------------------------------------------------------------
// scare effects: all of these are local presentation only (overlays, sprites, sounds, shake)
// ------------------------------------------------------------------------------------------
var impls = {};
function implToggle(key, klass, name, argc, on, fn, types) {
    if (on && !impls[key]) {
        var m = cs().class(klass).method(name, argc);
        if (types) m = m.overload.apply(m, types);
        if (m.returnType.name !== "System.Void") throw new Error(name + " returns " + m.returnType.name + ", not stubbing it");
        m.implementation = fn; impls[key] = m; log(key + ": hooked");
    }
    else if (!on && impls[key]) { try { impls[key].revert(); } catch (e) {} delete impls[key]; }
}
var scare = { gm: null, gmAt: 0, sprites: {}, jmAt: 0, quads: {}, fearOrig: null };
function noop() { }
function keepHidden(key, sr) {
    if (!alive(sr)) return;
    if (!(key in scare.sprites)) scare.sprites[key] = { sr: sr, was: !!sr.method("get_enabled").invoke() };
    if (sr.method("get_enabled").invoke()) sr.method("set_enabled").invoke(false);
}
function quadOff(key, fx) {
    if (!alive(fx)) return;
    var q = fx.field("quad").value;
    if (!alive(q)) return;
    var go = q.method("get_gameObject").invoke();
    if (go.method("get_activeSelf").invoke()) { setActive(go, false); scare.quads[key] = go; }
}
function scareStep() {
    // jumpscares
    implToggle("no prank jumpscare", "GameManager", "PrankJumpscare", 1, p.noJumpscare, noop);
    implToggle("no death impact", "GameManager", "DeathImpact", 1, p.noJumpscare, noop);
    if (p.noJumpscare) {
        var t = now();
        if (!alive(scare.gm) && t - scare.gmAt > 2000) { scare.gmAt = t; scare.gm = findObjs(cs().class("GameManager"))[0] || null; }
        if (alive(scare.gm)) { keepHidden("js", scare.gm.field("Jumpscare").value); keepHidden("jsbg", scare.gm.field("JumpscareBG").value); }
        if (t - scare.jmAt > 1000) {
            scare.jmAt = t;
            findObjs(cs().class("JumpscareMovement")).forEach(function (j) { keepHidden("jm" + j.handle, j.field("spriteRenderer").value); });
        }
    } else if (Object.keys(scare.sprites).length) {
        for (var k in scare.sprites) { var e = scare.sprites[k]; if (alive(e.sr)) { try { e.sr.method("set_enabled").invoke(e.was); } catch (x) {} } }
        scare.sprites = {};
    }
    // chase glitch, bot-near vignette, screen flashes
    implToggle("no chase glitch", "ChaseGlitchFx", "LateUpdate", 0, p.noGlitch, noop);
    implToggle("no bot-near fx", "BotNearFx", "LateUpdate", 0, p.noGlitch, noop);
    implToggle("no screen flash", "ScreenFx", "Flash", 2, p.noGlitch, noop);
    if (p.noGlitch) {
        quadOff("glitch", opt(function () { return cs().class("ChaseGlitchFx").field("instance").value; }, null));
        quadOff("near", opt(function () { return cs().class("BotNearFx").field("instance").value; }, null));
    } else if (Object.keys(scare.quads).length) {
        for (var q in scare.quads) { if (alive(scare.quads[q])) { try { setActive(scare.quads[q], true); } catch (x) {} } }
        scare.quads = {};
    }
    // fear director: hallucinations, heartbeat, whispers, rumble
    var FD = cs().class("FearDirector");
    implToggle("no hallucinations", "FearDirector", "Hallucinate", 1, p.noFear, noop, ["System.Int32"]);
    if (p.noFear) {
        if (scare.fearOrig === null) scare.fearOrig = !!FD.field("Enabled").value;
        if (FD.field("Enabled").value) FD.field("Enabled").value = false;
        var fd = FD.field("instance").value;
        if (alive(fd)) { var r = fd.field("rumble").value; if (alive(r) && r.method("get_isPlaying").invoke()) r.method("Stop").invoke(); }
    } else if (scare.fearOrig !== null) {
        FD.field("Enabled").value = scare.fearOrig;
        scare.fearOrig = null;
    }
    // screen shake (also the controller rumble that comes with it)
    implToggle("no screen shake", "GandysInputs", "ShakeCamera", 4, p.noShake, noop);
}
function scareClear() {
    var pr = [p.noJumpscare, p.noGlitch, p.noFear, p.noShake];
    p.noJumpscare = p.noGlitch = p.noFear = p.noShake = false;
    try { scareStep(); } catch (e) {}
    p.noJumpscare = pr[0]; p.noGlitch = pr[1]; p.noFear = pr[2]; p.noShake = pr[3];
}

// ------------------------------------------------------------------------------------------
// name changer: same path as the in-game name menu, filtered by the game's own bad-word check.
// If the game's filter says no, nothing is applied.
// ------------------------------------------------------------------------------------------
function applyName() {
    mainThread(function () {
        safe("name", function () {
            if (!init()) { notify("Not ready yet"); return; }
            var want = (p.namePreset && p.namePreset !== NAME_PRESETS[0]) ? p.namePreset : String(p.newName || "").trim();
            if (!want) { notify("Type a name first"); return; }
            var NM = cs().class("NetworkManager");
            var clean = cstr(NM.method("SanitizeUsername", 1).invoke(Il2Cpp.string(want)));
            if (!clean || NM.method("IsBadName", 1).invoke(Il2Cpp.string(clean))) { notify("The game's name filter rejected that name"); return; }
            clean = cstr(NM.method("TruncateUsername", 1).invoke(Il2Cpp.string(clean))) || clean;
            var menus = findObjs(cs().class("MenuNameApplyer"));
            if (menus.length) menus[0].method("applyName", 1).invoke(Il2Cpp.string(clean));
            else NM.method("SetNetworkNickname", 1).invoke(Il2Cpp.string(clean));
            notify("Name set to " + clean + (clean !== want ? " (the game adjusted it)" : ""));
            log("name: applied '" + clean + "' via " + (menus.length ? "MenuNameApplyer" : "SetNetworkNickname"));
            meCache.t = 0;
        });
    });
}

// ------------------------------------------------------------------------------------------
// soundboard: the menu loads Mods/sounds (pushed by vrfrida) into globalThis.__RASP_SOUNDBOARD
// mic route = mix samples into Photon Voice's outgoing LocalVoiceAudio PushData buffers
// ------------------------------------------------------------------------------------------
var SB = { sounds: [], pcm: null, rate: 24000, cursor: 0, playing: false, label: "", decode: null, hooks: [], hookErr: "", micRate: 0,
           infoOff: -1, rateOff: 0, chOff: 0, recorders: [], saved: null, clip: null, endAt: 0, prevBtn: false, status: "idle" };
function sbLoad() {
    SB.sounds = [];
    try {
        var m = globalThis.__RASP_SOUNDBOARD;
        if (m && Array.isArray(m.sounds)) SB.sounds = m.sounds.filter(function (s) { return s && s.fileName && s.format === "wav"; });
    } catch (e) {}
    return SB.sounds.length;
}
function sbReload() { try { if (typeof globalThis.__RASP_SOUNDBOARD_RELOAD === "function") globalThis.__RASP_SOUNDBOARD_RELOAD(); } catch (e) {} return sbLoad(); }
function sbBytes(s) {
    try {
        var rd = globalThis.__RASP_SOUNDBOARD_READ;
        if (typeof rd === "function") { var raw = rd(s.fileName); if (raw) return raw instanceof Uint8Array ? raw : new Uint8Array(raw); }
    } catch (e) { log("soundboard read: " + e); }
    return null;
}
// parse the wav header, then decode a chunk per frame so big files don't hitch
function sbStartDecode(s) {
    var bytes = sbBytes(s);
    if (!bytes || bytes.length < 44) { notify("Couldn't read " + s.label); return; }
    var v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (v.getUint32(0, true) !== 0x46464952 || v.getUint32(8, true) !== 0x45564157) { notify(s.label + " is not a wav"); return; }
    var off = 12, fmt = 0, ch = 0, rate = 0, bits = 0, dOff = 0, dLen = 0;
    while (off + 8 <= bytes.length) {
        var id = v.getUint32(off, true), sz = v.getUint32(off + 4, true), co = off + 8, cs2 = Math.min(sz, bytes.length - co);
        if (id === 0x20746d66 && cs2 >= 16) {
            fmt = v.getUint16(co, true); ch = v.getUint16(co + 2, true); rate = v.getUint32(co + 4, true); bits = v.getUint16(co + 14, true);
            if (fmt === 65534 && cs2 >= 40) fmt = v.getUint16(co + 24, true);
        } else if (id === 0x61746164) { dOff = co; dLen = cs2; }
        off = co + cs2 + (cs2 & 1);
        if (sz > cs2) break;
    }
    var bps = bits >> 3;
    if ((fmt !== 1 && fmt !== 3) || ch < 1 || rate < 1000 || !dOff || [1, 2, 3, 4].indexOf(bps) < 0) { notify(s.label + ": unsupported wav format"); return; }
    var frames = Math.floor(dLen / (bps * ch));
    SB.decode = { s: s, v: v, fmt: fmt, ch: ch, rate: rate, bps: bps, dOff: dOff, frames: frames, i: 0, out: new Float32Array(frames) };
    SB.status = "loading " + s.label;
}
function sbSample(d, at) {
    var v = d.v;
    if (d.fmt === 3) return d.bps === 4 ? v.getFloat32(at, true) : 0;
    switch (d.bps) {
        case 1: return (v.getUint8(at) - 128) / 128;
        case 2: return v.getInt16(at, true) / 32768;
        case 3: var x = v.getUint8(at) | (v.getUint8(at + 1) << 8) | (v.getInt8(at + 2) << 16); return x / 8388608;
        default: return v.getInt32(at, true) / 2147483648;
    }
}
function sbDecodeStep() {
    var d = SB.decode;
    if (!d) return;
    var end = Math.min(d.frames, d.i + 120000), stride = d.bps * d.ch;
    for (var f = d.i; f < end; f++) {
        var base = d.dOff + f * stride, sum = 0;
        for (var c = 0; c < d.ch; c++) sum += sbSample(d, base + c * d.bps);
        d.out[f] = sum / d.ch;
    }
    d.i = end;
    if (d.i >= d.frames) { SB.decode = null; sbPlay(d.s.label, d.out, d.rate); }
}

function sbHooks() {
    if (SB.hooks.length || SB.hookErr) return SB.hooks.length > 0;
    try {
        var api = null;
        ["PhotonVoice.API", "PhotonVoice"].forEach(function (n) { if (!api) { try { var im = img(n); im.class("Photon.Voice.LocalVoiceAudioShort"); api = im; } catch (e) {} } });
        if (!api) throw new Error("PhotonVoice.API not found");
        var LV = api.class("Photon.Voice.LocalVoice");
        var VI = api.class("Photon.Voice.VoiceInfo");
        SB.infoOff = LV.field("info").offset;
        SB.rateOff = SB.infoOff + VI.field("<SamplingRate>k__BackingField").offset - 0x10;
        SB.chOff = SB.infoOff + VI.field("<Channels>k__BackingField").offset - 0x10;
        var variants = [["Photon.Voice.LocalVoiceAudioShort", "System.Int16[]", 2], ["Photon.Voice.LocalVoiceAudioFloat", "System.Single[]", 4]];
        var addrs = {};
        variants.forEach(function (vr) {
            var k = api.class(vr[0]), push = null;
            while (k && !push) {
                try { push = k.method("PushData", 1).overload(vr[1]); } catch (e) {}
                try { k = k.parent; } catch (e) { k = null; }
            }
            if (!push || push.virtualAddress.isNull()) return;
            var a = String(push.virtualAddress);
            if (addrs[a]) return;
            addrs[a] = 1;
            var isShort = vr[2] === 2;
            SB.hooks.push(Interceptor.attach(push.virtualAddress, {
                onEnter: function (args) { if (SB.playing && SB.pcm && p.sbMic) { try { sbMix(args[0], args[1], isShort); } catch (e) {} } }
            }));
        });
        if (!SB.hooks.length) throw new Error("PushData not found");
        log("soundboard: " + SB.hooks.length + " mic mixer hook(s)");
    } catch (e) { SB.hookErr = String(e); log("soundboard mic hook: " + e); }
    return SB.hooks.length > 0;
}
// runs on Photon's audio thread: only raw memory, no il2cpp calls
function sbMix(voice, arr, isShort) {
    if (arr.isNull()) return;
    var n = arr.add(0x18).readU32();
    if (n <= 0 || n > 96000) return;
    var rate = voice.add(SB.rateOff).readS32(), ch = voice.add(SB.chOff).readS32();
    if (rate < 8000 || rate > 96000) rate = 48000;
    if (ch < 1 || ch > 2) ch = 1;
    SB.micRate = rate;
    SB.pushes++;
    var pcm = SB.pcm, step = SB.rate / rate, vol = p.sbVol, total = pcm.length;
    var data = arr.add(0x20);
    var buf = isShort ? new Int16Array(data.readByteArray(n * 2)) : new Float32Array(data.readByteArray(n * 4));
    for (var i = 0; i < n; i += ch) {
        var f = Math.floor(SB.cursor);
        if (f >= total - 1) { SB.playing = false; SB.micEnd = "finished"; break; }
        var fr = SB.cursor - f, smp = (pcm[f] * (1 - fr) + pcm[f + 1] * fr) * vol;
        for (var c = 0; c < ch && i + c < n; c++) {
            if (isShort) { var m = buf[i + c] / 32768 + smp; buf[i + c] = Math.round(Math.max(-1, Math.min(1, m)) * 32767); }
            else buf[i + c] = Math.max(-1, Math.min(1, buf[i + c] + smp));
        }
        SB.cursor += step;
    }
    data.writeByteArray(buf.buffer);
}
// make sure the mic is actually sending while a clip plays, then put the settings back
function sbRecorders() {
    try { return findObjs(img("PhotonVoice").class("Photon.Voice.Unity.Recorder")); } catch (e) { return []; }
}
function sbOpenMic() {
    SB.saved = [];
    sbRecorders().forEach(function (r) {
        try {
            var st = { r: r, tx: r.method("get_TransmitEnabled").invoke(), vd: r.method("get_VoiceDetection").invoke() };
            if (!st.tx) r.method("set_TransmitEnabled").invoke(true);
            if (st.vd) r.method("set_VoiceDetection").invoke(false);
            SB.saved.push(st);
        } catch (e) {}
    });
}
function sbCloseMic() {
    (SB.saved || []).forEach(function (st) {
        if (!alive(st.r)) return;
        try { if (!st.tx) st.r.method("set_TransmitEnabled").invoke(false); } catch (e) {}
        try { if (st.vd) st.r.method("set_VoiceDetection").invoke(true); } catch (e) {}
    });
    SB.saved = null;
}
function sbLocal(label, pcm, rate) {
    if (!p.sbLocal) return;
    try {
        var AM = img("UnityEngine.AudioModule");
        var clip = AM.class("UnityEngine.AudioClip").method("Create", 5).invoke(Il2Cpp.string(label), pcm.length, 1, rate, false);
        var arr = Il2Cpp.array(Il2Cpp.corlib.class("System.Single"), pcm.length);
        arr.handle.add(0x20).writeByteArray(pcm.buffer);
        pickM(clip, clip.class, "SetData", 2, function (ps) { return ps[0].type.name === "System.Single[]"; }).invoke(arr, 0);
        var AS = AM.class("UnityEngine.AudioSource");
        if (!SB.src || !alive(SB.src)) {
            SB.srcGo = newGO("GNSoundboard");
            try { G.UObject.method("DontDestroyOnLoad").invoke(SB.srcGo); } catch (e) {}
            SB.src = addComp(SB.srcGo, AS);
            SB.src.method("set_playOnAwake").invoke(false);
            SB.src.method("set_spatialBlend").invoke(0.0);   // 2D: same volume wherever you go
            try { SB.src.method("set_ignoreListenerPause").invoke(true); } catch (e) {}
        }
        SB.src.method("set_volume").invoke(p.sbLocalVol);
        SB.src.method("set_clip").invoke(clip);
        SB.src.method("Play", 0).invoke();
        SB.clip = clip;
        try { SB.clipPin = new Il2Cpp.Object(clip.handle).ref(true); } catch (e) { SB.clipPin = null; }
    } catch (e) { log("soundboard local: " + e); }
}
function sbPlay(label, pcm, rate) {
    sbStop();
    SB.pcm = pcm; SB.rate = rate; SB.cursor = 0; SB.label = label; SB.pushes = 0; SB.micEnd = ""; SB.forceAt = 0;
    var mic = p.sbMic && sbHooks();
    if (mic) { sbOpenMic(); SB.playing = true; }
    sbLocal(label, pcm, rate);
    SB.endAt = now() + (pcm.length / rate) * 1000 + 400;
    SB.status = "playing " + label + (mic ? " (mic" + (p.sbLocal ? " + you)" : ")") : (p.sbLocal ? " (only you)" : ""));
}
function sbStop(why) {
    if (SB.pcm && SB.label) {
        var len = SB.pcm.length / SB.rate, micAt = SB.cursor / SB.rate;
        var localAt = opt(function () { return alive(SB.src) ? SB.src.method("get_time").invoke() : -1; }, -1);
        log("soundboard: '" + SB.label + "' stopped (" + (why || "replaced/stop") + ") - length " + len.toFixed(1) + "s, mic got to " + micAt.toFixed(1) + "s in " + (SB.pushes || 0) + " pushes" + (SB.micEnd ? " (" + SB.micEnd + ")" : "") + ", local at " + (localAt >= 0 ? localAt.toFixed(1) + "s" : "n/a"));
    }
    if (alive(SB.src)) { try { SB.src.method("Stop", 0).invoke(); SB.src.method("set_clip").invoke(NULL); } catch (e) {} }
    if (SB.clipPin) { try { SB.clipPin.free(); } catch (e) {} SB.clipPin = null; }
    SB.playing = false;
    SB.pcm = null;
    SB.decode = null;
    if (SB.saved) sbCloseMic();
    if (SB.clip) { destroyNow(SB.clip); SB.clip = null; }
    SB.status = "idle";
}
function sbStep() {
    sbDecodeStep();
    if (SB.status.indexOf("playing") === 0) {
        if (now() > SB.endAt) sbStop("finished");
        else {
            if (SB.playing && SB.saved && now() - SB.forceAt > 250) {
                SB.forceAt = now();
                SB.saved.forEach(function (st) {
                    if (!alive(st.r)) return;
                    try { if (!st.r.method("get_TransmitEnabled").invoke()) st.r.method("set_TransmitEnabled").invoke(true); } catch (e) {}
                    try { if (st.r.method("get_VoiceDetection").invoke()) st.r.method("set_VoiceDetection").invoke(false); } catch (e) {}
                });
            }
            if (alive(SB.src)) { try { SB.src.method("set_volume").invoke(p.sbLocalVol); } catch (e) {} }
        }
    }
    var held = p.sbBtn !== "Off" && btnHeld(p.sbBtn);
    if (held && !SB.prevBtn && SB.sounds.length) sbStartDecode(SB.sounds[Math.floor(Math.random() * SB.sounds.length)]);
    SB.prevBtn = held;
}

// ------------------------------------------------------------------------------------------
// money: visual only. CurrencyDisplay.Update writes the number, we overwrite the text after it.
// Never touches PlayfabManager.localNextCoins / localNextGems / localGreenCoins (those get synced).
// ------------------------------------------------------------------------------------------
var money = { hook: null, offText: 0, offNG: 0, offGC: 0, setText: null, pending: [] };
function fakeAmount(sel) {
    if (sel === "Off") return null;
    if (sel === "Custom") { var n = parseInt(String(p.fakeCustom || "0").replace(/[^0-9]/g, ""), 10); return isNaN(n) ? "0" : n.toLocaleString("en-US"); }
    return sel;
}
function moneyStep() {
    var want = p.fakeCoins !== "Off" || p.fakeGems !== "Off" || p.fakeGreen !== "Off";
    if (want && !money.hook) {
        var CD = cs().class("CurrencyDisplay");
        money.offText = CD.field("currencyText").offset; money.offNG = CD.field("NG").offset; money.offGC = CD.field("GC").offset;
        money.hook = Interceptor.attach(CD.method("Update", 0).virtualAddress, {
            onEnter: function (args) { this.self = args[0]; },
            onLeave: function () {
                try {
                    var self = this.self;
                    var ng = self.add(money.offNG).readU8(), gc = self.add(money.offGC).readU8();
                    var amt = fakeAmount(ng ? p.fakeGems : (gc ? p.fakeGreen : p.fakeCoins));
                    if (amt === null) return;
                    var txt = self.add(money.offText).readPointer();
                    if (txt.isNull()) return;
                    new Il2Cpp.Object(txt).method("set_text").invoke(Il2Cpp.string(amt));
                } catch (e) {}
            }
        });
        log("money display: hooked");
    } else if (!want && money.hook) {
        money.hook.detach(); money.hook = null;
        // force the real numbers back
        findObjs(cs().class("CurrencyDisplay")).forEach(function (d) { try { d.method("OnEnable").invoke(); } catch (e) {} });
    }
}
var bal = { at: 0, txt: "" };
function realBalance() {
    var t = now();
    if (t - bal.at < 2000) return bal.txt;
    bal.at = t;
    bal.txt = opt(function () {
        var pm = findObjs(cs().class("PlayfabManager"))[0];
        if (!pm) return "not loaded";
        return "coins " + pm.field("<localNextCoins>k__BackingField").value + "   gems " + pm.field("<localNextGems>k__BackingField").value + "   green " + pm.field("localGreenCoins").value;
    }, "unknown");
    return bal.txt;
}

// ------------------------------------------------------------------------------------------
// main loop
// ------------------------------------------------------------------------------------------
var last = Date.now();
sbLoad();
onFrame(function () {
    var t = Date.now(), dt = Math.min(0.1, (t - last) / 1000); last = t;
    if (!init()) return;
    safe("speed", speedStep);
    safe("fly", function () { flyStep(dt); });
    safe("noclip", noclipStep);
    safe("gravity", gravityStep);
    safe("platforms", platformStep);
    safe("tpgun", tpGunStep);
    safe("nofreeze", noFreezeStep);
    safe("god", godStep);
    safe("godall", godAllStep);
    safe("revive", reviveStep);
    safe("reviveothers", reviveOthersStep);
    safe("battery", batteryStep);
    safe("dash", dashStep);
    safe("power", powerStep);
    safe("objesp", objEspStep);
    safe("bots", botScan);
    safe("botesp", botEspStep);
    safe("radar", radarStep);
    safe("hide", hideStep);
    safe("scare", scareStep);
    safe("host", hostStep);
    safe("players", playerEspStep);
    safe("soundboard", sbStep);
    safe("money", moneyStep);
});

onDisable(function () {
    try { sbStop("plugin off"); } catch (e) {}
    try { if (SB.srcGo) destroyNow(SB.srcGo); SB.srcGo = SB.src = null; } catch (e) {}
    try { scareClear(); } catch (e) {}
    try { godAllOff(); } catch (e) {}
    try { p.powerOn = false; powerStep(); } catch (e) {}
    try { for (var k in pools) poolClear(pools[k]); } catch (e) {}
    try { gunClear(); } catch (e) {}
    try { if (radar.tag) destroyNow(radar.tag.go); radar.tag = null; } catch (e) {}
    try { destroyNow(platL); destroyNow(platR); platL = platR = null; } catch (e) {}
    if (!G.ok || !alive(G.player)) return;
    try { if (noclipOn) noclipSet(false); } catch (e) {}
    try { p.hideBots = false; p.muteBots = false; hideStep(); } catch (e) {}
    try { var pr = { hSpeedOn: p.hSpeedOn, hIgnoreMe: p.hIgnoreMe }; p.hSpeedOn = false; p.hIgnoreMe = false; hostStep(); p.hSpeedOn = pr.hSpeedOn; p.hIgnoreMe = pr.hIgnoreMe; } catch (e) {}
    try { if (speedWas) { spd.active = false; G.player.method("RevertSpeedMultlipier").invoke(); G.player.method("RevertJumpMultlipier").invoke(); } } catch (e) {}
    try { if (money.hook) { money.hook.detach(); money.hook = null; findObjs(cs().class("CurrencyDisplay")).forEach(function (d) { try { d.method("OnEnable").invoke(); } catch (e) {} }); } } catch (e) {}
    // hooks made with Interceptor / .implementation are removed by the menu when the plugin turns off
});

tab(function (ui) {
    ui.separator();
    ui.text("SOUNDBOARD   " + SB.sounds.length + " sound(s)   " + SB.status);
    if (ui.button("Stop")) sbStop("stop button");
    ui.sameLine(); if (ui.button("Random")) { if (SB.sounds.length) sbStartDecode(SB.sounds[Math.floor(Math.random() * SB.sounds.length)]); }
    ui.sameLine(); if (ui.button("Reload Sounds")) notify(sbReload() + " sound(s) loaded");
    for (var i = 0; i < SB.sounds.length; i++) {
        if (i % 3 !== 0) ui.sameLine();
        var lbl = String(SB.sounds[i].label || SB.sounds[i].fileName);
        if (ui.button((lbl.length > 18 ? lbl.slice(0, 17) + "." : lbl) + "##sb" + i)) { var s = SB.sounds[i]; mainThread(function () { safe("soundboard play", function () { if (init()) sbStartDecode(s); }); }); }
    }
    if (!SB.sounds.length) ui.text("no sounds: put mp3/wav files in Mods/sounds and run vrfrida again");
    if (SB.hookErr) ui.text("mic route unavailable: " + SB.hookErr.slice(0, 70));
    ui.text("heads up: the game's voice filter listens to your mic, clips with swears can get you voice banned");

    ui.separator();
    ui.text("MONEY");
    ui.text("real balance: " + (G.ok ? realBalance() : "-"));
    ui.text("the Shown amounts above are visual only, real coins come from playing");

    ui.separator();
    ui.text("STATUS");
    ui.text("init: " + (G.ok ? "ok" : ("not ready" + (G.initErr ? " - " + G.initErr : ""))));
    if (G.ok) {
        ui.text("bots: " + bots.length + "   players: " + allPlayers().length + "   me: " + (localNet() ? playerName(localNet()) : "?"));
        ui.text("host tools: " + (G.host && G.host.why ? G.host.why : (hostWanted() ? "checking" : "off")));
    }
    var keys = Object.keys(seenErr);
    if (keys.length) { ui.text("errors (first time each):"); keys.slice(0, 8).forEach(function (k) { ui.text(" " + k + ": " + String(seenErr[k]).slice(0, 70)); }); }
    else ui.text("errors: none so far");
});

log("gandys nextbots plugin v1.3 loaded");
