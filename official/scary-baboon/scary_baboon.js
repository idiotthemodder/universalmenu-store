// game: com.BabTeam.Baboon
"use strict";
/*
 * scary_baboon.js v1.5 - Scary Baboon plugin for the universal menu.
 * Checked against Dumps/com.BabTeam.Baboon_dump_full.cs (2026-11-17). Untested on device.
 *
 *   Survive   God Mode: no damage + no death (HealthSystem, BaboonHealthController, DeathController,
 *             JumpscareController.OnPlayerDied, KillTP, EliminateManager, kill triggers/volumes), Heal, No Jumpscare
 *   Spawn     NetworkedObjectPool.InstantiateObject: J0ker client presets (guns, effects, sounds, monsters,
 *             rigs) or any ID from the game's spawn pool (searchable), button or hold A; spawner no-cooldown
 *   Rooms     Open Staff (hides the "Mod" blocker, from J0ker client), secret doors/rooms, toggle all doors
 *   Player    platforms (grips), noclip, ghost (stop syncing your rig), nickname, color + RGB (NetworkPlayerColor)
 *   v1.4     monsters: freeze, ignore me, bring, force state (dance/stun/slip/zap/trap), kill boss;
 *            survive: extra lives, pet protection, safe zone, health pack, respawn, anti slow;
 *            movement: size, gravity, teleport gun, checkpoint, wall walk, turn speed, fling;
 *            ESP: monsters, players, collectibles, ore, secret areas, glass bridge; RLGL light readout;
 *            world: full bright, flashlight boost; fun: spawn gun, rain items, item magnet
 *   v1.5     networked size: game's own scaler (LocomotionScaleController.SetCurrentScale, what grow/shrink items use),
 *            RPC_SetArmScale to everyone (BaboonPlayerEffectController), and your NetworkPlayer root scale
 * Not ported from the J0ker client: Crash All, Destroy All, Rig Spam (they wreck other people's game).
 *   Movement  speed / jump / arm length (GorillaLocomotion.Player fields), Fly (right trigger)
 *   Teleport  up (unstuck), to nearest monster (MonsterContainer)
 *   Info      nearest monster distance in the tab
 */

var input = ui.input;

// prefab IDs used by the J0ker client (scarybaboonmod.ts), may be renamed in newer builds - check the pool list
var PRESETS = ["SMGCommon", "ShotgunCommon", "ScarCommon", "GrenadeLauncherCommon", "PistolCommon", "SniperCommon",
    "Flare", "Lighting", "BigExplosion", "Confetti", "AMacrena", "Fein", "ladyhear", "TylerTheCreator", "TectAudio",
    "Splash", "ImBoutaBombThisPlane", "monsters/BigLarry", "monsters/MeatMan", "RagdollV2", "BaboonFighterNetwork",
    "BaboonMiner", "BaboonFling"];

var p = props([
    { type: "label", label: "Survive" },
    { type: "bool", key: "god", label: "God Mode", default: false, desc: "no damage and no death: blocks kills, kill teleports, eliminations and kill zones" },
    { type: "button", label: "Heal", onClick: function () { run(heal); } },
    { type: "bool", key: "noScare", label: "No Jumpscare", default: false, desc: "skips the jumpscare screen (visual only)" },

    { type: "bool", key: "extraLives", label: "Infinite Extra Lives", default: false, desc: "keeps the extra-life and pet-protection flags on" },
    { type: "bool", key: "safeZone", label: "Always In Safe Zone", default: false, desc: "game treats you as inside a safe zone (no damage, AI won't target)" },
    { type: "bool", key: "hpPack", label: "No Health Pack Cooldown", default: false },
    { type: "button", label: "Use Health Pack", onClick: function () { run(useHealthPack); } },
    { type: "button", label: "Respawn", onClick: function () { run(function () { C.Respawn.method("TP", 0).invoke(); }); } },
    { type: "bool", key: "antiSlow", label: "Anti Slow / Anti Stun", default: false, desc: "blocks SlowDownPlayer and hand-motion lockouts" },

    { type: "label", label: "Monsters (most need master)" },
    { type: "bool", key: "freezeMon", label: "Freeze Monsters", default: false, desc: "stops monster AI and nav agents" },
    { type: "bool", key: "ignoreMe", label: "Monsters Ignore Me", default: false, desc: "you are never a valid AI target" },
    { type: "button", label: "Bring Monsters To Me", onClick: function () { run(bringMonsters); } },
    { type: "select", key: "monState", label: "Force State", options: ["DanceSpazState", "StunnedState", "SlipState", "ZappedState", "TrappedState", "KnockbackState", "ReturnHomeState"], default: "DanceSpazState" },
    { type: "button", label: "Force State On All Monsters", onClick: function () { run(forceMonState); } },
    { type: "button", label: "Kill Boss", onClick: function () { run(killBoss); } },

    { type: "label", label: "Movement" },
    { type: "bool", key: "speedOn", label: "Speed Boost", default: false },
    { type: "float", key: "speedMul", label: "Speed Multiplier", min: 1, max: 5, default: 1.6, decimals: 1 },
    { type: "bool", key: "jumpOn", label: "Super Jump", default: false },
    { type: "float", key: "jumpMul", label: "Jump Multiplier", min: 1, max: 6, default: 2, decimals: 1 },
    { type: "bool", key: "armsOn", label: "Long Arms", default: false },
    { type: "float", key: "armsMul", label: "Arm Multiplier", min: 1, max: 3, default: 1.5, decimals: 1 },
    { type: "bool", key: "fly", label: "Fly (hold right trigger)", default: false },
    { type: "float", key: "flySpeed", label: "Fly Speed", min: 2, max: 30, default: 10, decimals: 0 },

    { type: "bool", key: "sizeOn", label: "Size Changer", default: false },
    { type: "float", key: "size", label: "Size", min: 0.2, max: 5, default: 1, decimals: 2 },
    { type: "bool", key: "sizeNet", label: "Networked Size", default: true, desc: "goes through the game's grow/shrink system + arm scale RPC so others see it" },
    { type: "bool", key: "gravOn", label: "Custom Gravity", default: false },
    { type: "float", key: "grav", label: "Gravity (1 = normal)", min: 0, max: 1, default: 0.3, decimals: 2 },
    { type: "bool", key: "tpGun", label: "Teleport Gun", default: false, desc: "hold right grip to aim, pull right trigger to teleport" },
    { type: "button", label: "Save Checkpoint", onClick: function () { run(function () { checkpoint = myPos(); notify(checkpoint ? "Checkpoint saved" : "No position"); }); } },
    { type: "button", label: "Load Checkpoint", onClick: function () { run(function () { if (checkpoint) tp(checkpoint); else notify("No checkpoint"); }); } },
    { type: "bool", key: "wallWalk", label: "Wall Walk", default: false, desc: "touching a wall with a hand sticks you to it" },
    { type: "float", key: "turnSpeed", label: "Turn Speed (deg/s)", min: 30, max: 720, default: 180, decimals: 0 },
    { type: "button", label: "Apply Turn Speed", onClick: function () { run(function () { var pl = player(); pl.method("SetTurnSpeed", 1).invoke(Number(p.turnSpeed)); pl.method("SetSmoothTurnMaxSpeed", 1).invoke(Number(p.turnSpeed)); notify("Turn speed set"); }); } },
    { type: "float", key: "flingPow", label: "Fling Power", min: 5, max: 60, default: 20, decimals: 0 },
    { type: "button", label: "Fling Me", onClick: function () { run(flingSelf); } },
    { type: "bool", key: "plats", label: "Platforms (grips)", default: false, desc: "hold a grip to stand on a platform under that hand" },
    { type: "bool", key: "noclip", label: "No Clip", default: false, desc: "turns off map mesh colliders, use with Fly" },

    { type: "label", label: "Spawn" },
    { type: "select", key: "spawnSrc", label: "Source", options: ["Preset", "Pool list"], default: "Preset" },
    { type: "select", key: "preset", label: "Preset", options: PRESETS, default: PRESETS[0] },
    { type: "text", key: "search", label: "Pool search", default: "", desc: "filters the pool list (e.g. gun, monster, sound)" },
    { type: "int", key: "spawnIdx", label: "Pool item #", min: 0, max: 400, default: 0, desc: "the tab shows the name for this number" },
    { type: "button", label: "Refresh Pool List", onClick: function () { run(refreshKeys); } },
    { type: "int", key: "spawnCount", label: "Amount", min: 1, max: 10, default: 1 },
    { type: "button", label: "Spawn At Right Hand", onClick: function () { run(spawnItem); } },
    { type: "bool", key: "spawnGun", label: "Spawn Gun", default: false, desc: "hold right grip to aim, pull right trigger to spawn there" },
    { type: "button", label: "Rain Items", onClick: function () { run(rainItems); } },
    { type: "bool", key: "magnet", label: "Item Magnet", default: false, desc: "pulls grabbable items within 8m to your right hand" },
    { type: "bool", key: "holdSpawn", label: "Hold A To Spawn", default: false, desc: "spawns the selected item every 0.3s while A is held" },
    { type: "bool", key: "noSpawnCd", label: "No Spawner Cooldown", default: false, desc: "map item spawners refill instantly" },

    { type: "label", label: "ESP (through walls)" },
    { type: "bool", key: "espMon", label: "Monsters", default: false },
    { type: "bool", key: "espPlr", label: "Players", default: false },
    { type: "bool", key: "espCol", label: "Collectibles / Eggs", default: false },
    { type: "bool", key: "espOre", label: "Ore", default: false },
    { type: "bool", key: "espSecret", label: "Secret Areas", default: false },
    { type: "bool", key: "glassEsp", label: "Glass Bridge (green safe / red breaks)", default: false },
    { type: "button", label: "Teleport To Nearest Secret Area", onClick: function () { run(tpSecret); } },

    { type: "label", label: "World" },
    { type: "bool", key: "bright", label: "Full Bright / No Fog", default: false, desc: "also fixes Lights Out" },
    { type: "bool", key: "flash", label: "Flashlight Boost", default: false },

    { type: "label", label: "Rooms / Doors" },
    { type: "button", label: "Open Staff", onClick: function () { run(openStaff); } },
    { type: "button", label: "Open Secret Doors", onClick: function () { run(openSecretDoors); } },
    { type: "button", label: "Reveal Secret Rooms", onClick: function () { run(revealRooms); } },
    { type: "button", label: "Toggle All Doors", onClick: function () { run(toggleDoors); } },

    { type: "label", label: "Player" },
    { type: "button", label: "Set Master", onClick: function () { run(setMaster); } },
    { type: "bool", key: "ghost", label: "Ghost Monkey", default: false, desc: "stops syncing your rig, others see you frozen" },
    { type: "text", key: "nick", label: "Name", default: "J0kerModZ" },
    { type: "button", label: "Set Name", onClick: function () { run(setName); } },
    { type: "float", key: "colR", label: "Color R", min: 0, max: 1, default: 1, decimals: 2 },
    { type: "float", key: "colG", label: "Color G", min: 0, max: 1, default: 0.5, decimals: 2 },
    { type: "float", key: "colB", label: "Color B", min: 0, max: 1, default: 1, decimals: 2 },
    { type: "button", label: "Apply Color", onClick: function () { run(function () { setColor(p.colR, p.colG, p.colB); }); } },
    { type: "bool", key: "rgb", label: "RGB", default: false, desc: "cycles your color (network update each step)" },

    { type: "label", label: "Teleport" },
    { type: "button", label: "Teleport Up (unstuck)", onClick: function () { run(function () { var q = myPos(); if (q) tp([q[0], q[1] + 4, q[2]]); }); } },
    { type: "button", label: "Teleport To Nearest Monster", onClick: function () { run(tpMonster); } },
]);

var C = {}, ready = false, missed = [], orig = null, keys = [], findAllM = null;

// ---------------------------------------------------------------- helpers
function run(fn) { try { fn(); } catch (e) { log("error: " + e); notify("Failed, see log"); } }
function nn(o) { return !!o && !o.isNull(); }
function findClassAny(name) {
    var a = Il2Cpp.domain.assemblies;
    for (var i = 0; i < a.length; i++) { try { var c = a[i].image.tryClass(name); if (c) return c; } catch (e) { } }
    return null;
}
function bindTo(m, o) { return typeof m.bind === "function" ? m.bind(o) : m.withHolder(o); }
function hook(cls, name, argc, before) {
    var m = cls ? cls.tryMethod(name, argc) : null;
    if (!m) { missed.push((cls ? cls.name : "?") + "." + name); return; }
    m.implementation = function () {
        try { var r = before(this, arguments); if (r) return r.value; } catch (e) { }
        var b = m.isStatic ? m : bindTo(m, this);
        return b.invoke.apply(b, arguments);
    };
}
function hookAll(cls, name, before) {
    if (!cls) { missed.push("?." + name); return; }
    var n = 0;
    cls.methods.forEach(function (m) {
        if (m.name !== name) return;
        n++;
        m.implementation = function () {
            try { var r = before(this, arguments); if (r) return r.value; } catch (e) { }
            var b = m.isStatic ? m : bindTo(m, this);
            return b.invoke.apply(b, arguments);
        };
    });
    if (!n) missed.push(cls.name + "." + name);
}
function allOf(cls) {
    var out = []; if (!cls) return out;
    if (findAllM) { try { var a = findAllM.invoke(cls.type.object); for (var i = 0; i < a.length; i++) { var o = a.get(i); if (nn(o)) out.push(o); } return out; } catch (e) { } }
    try { Il2Cpp.gc.choose(cls).forEach(function (o) { if (nn(o)) out.push(o); }); } catch (e) { }
    return out;
}
function vec3(x, y, z) { var b = Memory.alloc(12); b.writeFloat(x); b.add(4).writeFloat(y); b.add(8).writeFloat(z); return new Il2Cpp.ValueType(b, C.Vec3.type); }
function readV3(v) { return [v.handle.readFloat(), v.handle.add(4).readFloat(), v.handle.add(8).readFloat()]; }
function posOf(t) { try { return readV3(t.method("get_position", 0).invoke()); } catch (e) { return null; } }
function dist(a, b) { var x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return Math.sqrt(x * x + y * y + z * z); }

function player() {
    try { var pl = C.Player.method("get_Instance").invoke(); if (nn(pl)) return pl; } catch (e) { }
    return null;
}
function rb() { var pl = player(); if (!pl) return null; var r = pl.field("playerRigidBody").value; return nn(r) ? r : null; }
function myPos() { var r = rb(); return r ? readV3(r.method("get_position", 0).invoke()) : null; }
function tp(pos) {
    var pl = player(); if (!pl) { notify("Player not found"); return; }
    var v = vec3(pos[0], pos[1], pos[2]);
    try { pl.method("get_transform", 0).invoke().method("set_position", 1).invoke(v); } catch (e) { }
    var r = rb(); if (r) { r.method("set_position", 1).invoke(v); r.method("set_velocity", 1).invoke(vec3(0, 0, 0)); }
}
function bhcMine(b) { try { var hs = b.field("healthSystem").value; return !nn(hs) || isMine(hs); } catch (e) { return true; } }
function isMine(hs) { try { return !!hs.method("get_IsObjectMine", 0).invoke(); } catch (e) { return false; } }

// ---------------------------------------------------------------- features
function heal() {
    var n = 0;
    Il2Cpp.gc.choose(C.Health).forEach(function (hs) { if (isMine(hs)) { hs.method("ResetHealth", 0).invoke(); n++; } });
    notify(n ? "Healed" : "Your health not found");
}

function monsters() {
    var mc = null;
    try { mc = C.MonCont.method("get_Instance").invoke(); } catch (e) { }
    if (!nn(mc)) return [];
    var list = mc.method("get_AllMonsterTransforms", 0).invoke(), out = [];
    if (!nn(list)) return out;
    var n = list.method("get_Count", 0).invoke();
    for (var i = 0; i < n; i++) { var t = list.method("get_Item", 1).invoke(i); if (nn(t)) out.push(t); }
    return out;
}
function nearestMonster() {
    var me = myPos(); if (!me) return null;
    var best = null, bd = 1e9;
    monsters().forEach(function (t) { var q = posOf(t); if (!q) return; var d = dist(me, q); if (d < bd) { bd = d; best = q; } });
    return best ? { pos: best, d: bd } : null;
}
function tpMonster() { var m = nearestMonster(); if (!m) { notify("No monsters found"); return; } tp([m.pos[0] + 3, m.pos[1] + 1, m.pos[2]]); }

// ---- spawn (NetworkedObjectPool is the game's IPunPrefabPool, its entries are every spawnable ID)
function refreshKeys() {
    keys = [];
    var pool = C.Pool.method("get_Instance").invoke();
    if (!nn(pool)) { notify("Spawn pool not ready (join a room)"); return; }
    var list = pool.method("get_SpawnEntries", 0).invoke(), n = list.method("get_Count", 0).invoke(), seen = {};
    for (var i = 0; i < n; i++) {
        try { var id = list.method("get_Item", 1).invoke(i).method("get_ID", 0).invoke().content; if (id && !seen[id]) { seen[id] = 1; keys.push(id); } } catch (e) { }
    }
    keys.sort();
    log("pool: " + keys.join(", "));
    notify(keys.length + " spawnable IDs");
}
function filtered() {
    var q = String(p.search || "").toLowerCase();
    return q ? keys.filter(function (k) { return k.toLowerCase().indexOf(q) >= 0; }) : keys;
}
function currentItem() {
    if (p.spawnSrc === "Preset") return p.preset;
    if (!keys.length) refreshKeys();
    return filtered()[p.spawnIdx] || null;
}
function spawnAt(name, pos) {
    var rot = C.Quat.method("get_identity", 0).invoke();
    var m = C.Pool.tryMethod("InstantiateObject", 4);
    var go = m ? m.invoke(Il2Cpp.string(name), pos, rot, false)
               : C.Photon.method("Instantiate", 5).invoke(Il2Cpp.string(name), pos, rot, 0, NULL);
    return nn(go);
}
function handSpot(i) {
    var hand = player().field("rightHandTransform").value;
    var h = posOf(hand), f = readV3(hand.method("get_forward", 0).invoke());
    return vec3(h[0] + f[0] * 0.4, h[1] + 0.1 + i * 0.25, h[2] + f[2] * 0.4);
}
function spawnItem() {
    var name = currentItem(); if (!name) { notify("Nothing selected"); return; }
    if (!player()) return;
    var ok = 0;
    for (var i = 0; i < p.spawnCount; i++) if (spawnAt(name, handSpot(i))) ok++;
    notify(ok ? "Spawned " + name + (ok > 1 ? " x" + ok : "") : "Spawn failed: " + name + " (check the pool list)");
}
function spawnCdStep() {
    allOf(C.GrabSp).forEach(function (o) { try { o.field("alreadySpawned").value = false; o.field("canSpawn").value = true; } catch (e) { } });
    allOf(C.PickSp).forEach(function (o) { try { o.field("_nextSpawnTime").value = 0; } catch (e) { } });
}

// ---- player
function openStaff() {
    var go = C.GO.method("Find", 1).invoke(Il2Cpp.string("Mod"));
    if (!nn(go)) { notify("Staff blocker not found on this map"); return; }
    go.method("SetActive", 1).invoke(false); notify("Staff room opened (local)");
}
function isMaster() { try { return !!C.Photon.method("get_IsMasterClient", 0).invoke(); } catch (e) { return false; } }
function setMaster() {
    if (isMaster()) { notify("Already master"); return; }
    var ok = C.Photon.method("SetMasterClient", 1).invoke(C.Photon.method("get_LocalPlayer", 0).invoke());
    notify(ok ? "Master requested" : "Set Master refused");
}
function setName() { C.Photon.method("set_NickName", 1).invoke(Il2Cpp.string(String(p.nick))); notify("Name set"); }
function myColor() {
    var mine = null;
    allOf(C.PColor).forEach(function (c) { if (mine) return; try { var pv = c.field("photonView").value; if (nn(pv) && pv.method("get_IsMine", 0).invoke()) mine = c; } catch (e) { } });
    return mine;
}
function setColor(r, g, b) { var c = myColor(); if (!c) { notify("Your rig not found"); return; } c.method("SetColor", 1).invoke(vec3(Number(r), Number(g), Number(b))); }
function localNetPlayer() { try { var sp = C.NPS.field("Instance").value; if (!nn(sp)) return null; var np = sp.method("get_LocalPlayer", 0).invoke(); return nn(np) ? np : null; } catch (e) { return null; } }

var plat = [null, null], ncList = null, ghostOn = false, rgbT = 0, rgbH = 0, holdT = 0;
function platStep() {
    var pl = player();
    for (var s = 0; s < 2; s++) {
        var held = !!input.grip(s);
        if (held && !plat[s]) {
            var hand = pl.field(s ? "rightHandTransform" : "leftHandTransform").value, h = posOf(hand);
            var go = C.GO.method("CreatePrimitive", 1).invoke(3);
            var t = go.method("get_transform", 0).invoke();
            t.method("set_position", 1).invoke(vec3(h[0], h[1] - 0.06, h[2]));
            t.method("set_localScale", 1).invoke(vec3(0.3, 0.025, 0.3));
            plat[s] = go;
        } else if (!held && plat[s]) { destroy(plat[s]); plat[s] = null; }
    }
}
function clearPlats() { for (var s = 0; s < 2; s++) if (plat[s]) { destroy(plat[s]); plat[s] = null; } }
function destroy(o) { try { C.UObj.method("Destroy", 1).invoke(o); } catch (e) { } }
function setNoclip(on) {
    if (on && !ncList) { ncList = allOf(C.MeshCol); ncList.forEach(function (c) { try { c.method("set_enabled", 1).invoke(false); } catch (e) { } }); }
    else if (!on && ncList) { ncList.forEach(function (c) { try { if (!c.isNull()) c.method("set_enabled", 1).invoke(true); } catch (e) { } }); ncList = null; }
}
function setGhost(on) { var np = localNetPlayer(); if (np) np.method("set_enabled", 1).invoke(!on); ghostOn = on; }
function hsv(h) { var i = Math.floor(h * 6), f = h * 6 - i, q = 1 - f; switch (i % 6) { case 0: return [1, f, 0]; case 1: return [q, 1, 0]; case 2: return [0, 1, f]; case 3: return [0, q, 1]; case 4: return [f, 0, 1]; default: return [1, 0, q]; } }

// ---- rooms / doors
function openSecretDoors() {
    var d = allOf(C.SecDoor); d.forEach(function (o) { try { o.method("SetOpen", 2).invoke(true, false); } catch (e) { } });
    notify(d.length + " secret doors opened (local)");
}
function revealRooms() {
    var r = allOf(C.SecRoom); r.forEach(function (o) { try { o.method("SetContentActive", 1).invoke(true); } catch (e) { } });
    notify(r.length + " secret rooms revealed (local)");
}
function toggleDoors() {
    var d = allOf(C.Door); d.forEach(function (o) { try { o.method("ToggleDoor", 0).invoke(); } catch (e) { } });
    notify(d.length + " doors toggled");
}

// speed / jump / arms: write fields every frame, put originals back when off
function applyLoco(pl) {
    var key = pl.handle.toString();
    if (!orig || orig.key !== key) orig = { key: key, jump: pl.field("jumpMultiplier").value, maxJump: pl.field("maxJumpSpeed").value, arm: pl.field("maxArmLength").value, speedSet: false };
    pl.field("jumpMultiplier").value = p.jumpOn ? orig.jump * p.jumpMul : orig.jump;
    pl.field("maxJumpSpeed").value = p.jumpOn ? orig.maxJump * p.jumpMul : orig.maxJump;
    pl.field("maxArmLength").value = p.armsOn ? orig.arm * p.armsMul : orig.arm;
    if (p.speedOn) { pl.method("SetMovementSpeedMultiplier", 1).invoke(p.speedMul); orig.speedSet = true; }
    else if (orig.speedSet) { pl.method("ResetMovementSpeedMultiplier", 0).invoke(); orig.speedSet = false; }
}
function restoreLoco() {
    var pl = player(); if (!pl || !orig || orig.key !== pl.handle.toString()) return;
    pl.field("jumpMultiplier").value = orig.jump;
    pl.field("maxJumpSpeed").value = orig.maxJump;
    pl.field("maxArmLength").value = orig.arm;
    if (orig.speedSet) pl.method("ResetMovementSpeedMultiplier", 0).invoke();
    orig = null;
}

function flyStep() {
    if (!(input.trigger(1) > 0.6)) return;
    var r = rb(); if (!r) return;
    var cam = C.Camera.method("get_main", 0).invoke(); if (!nn(cam)) return;
    var f = readV3(cam.method("get_transform", 0).invoke().method("get_forward", 0).invoke());
    var s = Number(p.flySpeed);
    r.method("set_velocity", 1).invoke(vec3(f[0] * s, f[1] * s, f[2] * s));
}

// ---------------------------------------------------------------- v1.4 features
var checkpoint = null, frozenAgents = [], lightOrig = null, flashOrig = {}, gunDot = null, gunHeld = false, glassTinted = [];
var esp = { mat: {}, pools: {}, lists: {}, listT: 0 };

function pickM(cls, name, types) {
    if (!cls) return null;
    var ms = cls.methods;
    for (var i = 0; i < ms.length; i++) {
        var m = ms[i]; if (m.name !== name || m.parameterCount !== types.length) continue;
        var ok = true; for (var j = 0; j < types.length; j++) if (m.parameters[j].type.name !== types[j]) { ok = false; break; }
        if (ok) return m;
    }
    return null;
}
function mkColor(r, g, b, a) { var x = Memory.alloc(16); x.writeFloat(r); x.add(4).writeFloat(g); x.add(8).writeFloat(b); x.add(12).writeFloat(a); return new Il2Cpp.ValueType(x, C.Color.type); }
function comp(o, cls) { try { var c = C.childM.bind ? C.childM.bind(o).invoke(cls.type.object) : bindTo(C.childM, o).invoke(cls.type.object); return nn(c) ? c : null; } catch (e) { return null; } }
function eachList(list, fn) { if (!nn(list)) return; var n = list.method("get_Count", 0).invoke(); for (var i = 0; i < n; i++) { var o = list.method("get_Item", 1).invoke(i); if (nn(o)) fn(o); } }
function myHS() { var r = null; Il2Cpp.gc.choose(C.Health).forEach(function (h) { if (!r && isMine(h)) r = h; }); return r; }
function localTarget() { try { var t = C.Tracker.method("get_Instance").invoke(); if (!nn(t)) return null; var lt = t.method("get_LocalTargetablePlayer", 0).invoke(); return nn(lt) ? lt : null; } catch (e) { return null; } }

// ---- survive
var myHsCache = null, myHsT = 0;
function survStep(now) {
    if (now - myHsT < 1000) return; myHsT = now;
    var hs = myHsCache && !myHsCache.isNull() && isMine(myHsCache) ? myHsCache : (myHsCache = myHS());
    if (!hs) return;
    if (p.extraLives) { hs.method("SetHasExtraLives", 1).invoke(true); hs.method("SetHasPetProtection", 1).invoke(true); }
    if (p.safeZone) hs.method("SetInSafeZone", 1).invoke(true);
    if (p.hpPack) hs.field("canUseHealthPack").value = true;
}
function useHealthPack() { var hs = myHS(); if (!hs) { notify("Your health not found"); return; } hs.field("canUseHealthPack").value = true; notify(hs.method("UseHealthPack", 0).invoke() ? "Health pack used" : "Health pack refused"); }

// ---- monsters
function monsterAgents() {
    var out = [];
    monsters().forEach(function (t) { var a = comp(t, C.Agent); if (a) out.push(a); });
    return out;
}
function setFreeze(on) {
    if (on) { frozenAgents = monsterAgents(); frozenAgents.forEach(function (a) { try { a.method("set_isStopped", 1).invoke(true); } catch (e) { } }); }
    else { frozenAgents.forEach(function (a) { try { if (!a.isNull()) a.method("set_isStopped", 1).invoke(false); } catch (e) { } }); frozenAgents = []; }
}
function bringMonsters() {
    var me = myPos(); if (!me) return;
    var n = 0;
    monsters().forEach(function (t, i) {
        var ang = i * 1.3, v = vec3(me[0] + Math.cos(ang) * 4, me[1], me[2] + Math.sin(ang) * 4);
        var a = comp(t, C.Agent);
        try { if (a) a.method("Warp", 1).invoke(v); else t.method("set_position", 1).invoke(v); n++; } catch (e) { }
    });
    notify(n + " monsters brought");
}
function forceMonState() {
    var cls = findClassAny(p.monState); if (!cls) { notify("State class missing"); return; }
    var st = null; Il2Cpp.gc.choose(cls).forEach(function (o) { if (!st && nn(o)) st = o; });
    if (!st) { notify(p.monState + " not loaded on this map"); return; }
    var list = C.CupidAI.method("get_ActiveInstances", 0).invoke(), n = 0;
    eachList(list, function (ai) { try { ai.method("ForceState", 1).invoke(st); n++; } catch (e) { } });
    notify(p.monState + " forced on " + n);
}
function killBoss() { var n = 0; Il2Cpp.gc.choose(C.Boss).forEach(function (b) { try { b.method("ForceSetCurrent", 1).invoke(0); n++; } catch (e) { } }); notify(n ? "Boss health set to 0" : "No boss found"); }

// ---- movement
var sizeNetState = { lastSent: -1, lsc: null, fx: null };
function boxFloat(v) { var b = Memory.alloc(4); b.writeFloat(v); return new Il2Cpp.ValueType(b, C.Single.type).box(); }
function myFx() {
    var c = sizeNetState.fx; if (c && !c.isNull()) return c;
    sizeNetState.fx = null;
    allOf(C.Fx).forEach(function (o) { if (sizeNetState.fx) return; try { if (o.method("get_photonView", 0).invoke().method("get_IsMine", 0).invoke()) sizeNetState.fx = o; } catch (e) { } });
    return sizeNetState.fx;
}
function myLsc() { var c = sizeNetState.lsc; if (c && !c.isNull()) return c; var l = allOf(C.LSC); return (sizeNetState.lsc = l.length ? l[0] : null); }
function armRpc(scale) {
    var fx = myFx(); if (!fx) return false;
    var pv = fx.method("get_photonView", 0).invoke();
    if (scale === null) pv.method("RPC", 3).invoke(Il2Cpp.string("RPC_ResetArmScale"), 0, Il2Cpp.array(C.Obj, []));
    else pv.method("RPC", 3).invoke(Il2Cpp.string("RPC_SetArmScale"), 0, Il2Cpp.array(C.Obj, [boxFloat(scale), boxFloat(99999)]));
    return true;
}
function rootScale(v) { var np = localNetPlayer(); if (!np) return; var r = np.field("root").value; if (nn(r)) r.method("set_localScale", 1).invoke(vec3(v, v, v)); }
function sizeStep() {
    var pl = player(), v = p.sizeOn ? Number(p.size) : 1;
    if (p.sizeOn && p.sizeNet) {
        var lsc = myLsc();
        var t = Date.now();
        if (Math.abs((sizeNetState.lastLocal || 0) - v) > 0.01 || t - (sizeNetState.localT || 0) > 5000) {
            sizeNetState.lastLocal = v; sizeNetState.localT = t;
            if (lsc) lsc.method("SetCurrentScale", 2).invoke(v, 99999); else pl.method("SetScale", 1).invoke(v);
        }
        try { rootScale(v); } catch (e) { }
        if (Math.abs(sizeNetState.lastSent - v) > 0.01) { try { if (armRpc(v)) sizeNetState.lastSent = v; } catch (e) { log("arm scale rpc: " + e); sizeNetState.lastSent = v; } }
    } else if (!p.sizeOn) {
        sizeNetState.lastLocal = 0;
        var l2 = myLsc(); if (l2) l2.method("ResetScale", 0).invoke(); pl.method("SetScale", 1).invoke(1);
        try { rootScale(1); } catch (e) { }
        if (sizeNetState.lastSent !== -1) { try { armRpc(null); } catch (e) { } sizeNetState.lastSent = -1; }
    } else pl.method("SetScale", 1).invoke(v);
}
function gravStep() {
    var r = rb(); if (!r) return;
    var dt = C.Time.method("get_deltaTime", 0).invoke(), v = readV3(r.method("get_velocity", 0).invoke());
    r.method("set_velocity", 1).invoke(vec3(v[0], v[1] + (1 - Number(p.grav)) * 9.81 * dt, v[2]));
}
function wallStep() {
    var pl = player(), r = rb(); if (!r) return;
    for (var s = 0; s < 2; s++) {
        if (!pl.method("IsHandTouching", 1).invoke(s === 0)) continue;
        var h = posOf(pl.field(s ? "rightHandTransform" : "leftHandTransform").value), me = myPos();
        var dt = C.Time.method("get_deltaTime", 0).invoke(), v = readV3(r.method("get_velocity", 0).invoke());
        var dx = h[0] - me[0], dy = h[1] - me[1], dz = h[2] - me[2], l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        r.method("set_velocity", 1).invoke(vec3(v[0] + dx / l * 9.81 * dt, v[1] + 9.81 * dt + dy / l * 9.81 * dt, v[2] + dz / l * 9.81 * dt));
        return;
    }
}
function flingSelf() {
    var r = rb(), cam = C.Camera.method("get_main", 0).invoke(); if (!r || !nn(cam)) return;
    var f = readV3(cam.method("get_transform", 0).invoke().method("get_forward", 0).invoke()), k = Number(p.flingPow);
    r.method("set_velocity", 1).invoke(vec3(f[0] * k, f[1] * k + 4, f[2] * k));
}

// ---- gun pointer (teleport gun / spawn gun)
function gunHit() {
    var hand = player().field("rightHandTransform").value;
    var o = posOf(hand), d = readV3(hand.method("get_forward", 0).invoke());
    var hits = C.rayAll.invoke(vec3(o[0] + d[0] * 0.25, o[1] + d[1] * 0.25, o[2] + d[2] * 0.25), vec3(d[0], d[1], d[2]), 300, -1);
    var best = null, bd = 1e9;
    for (var i = 0; i < hits.length; i++) {
        var h = hits.get(i);
        try { var col = h.method("get_collider", 0).invoke(); if (!nn(col) || col.method("get_isTrigger", 0).invoke()) continue; } catch (e) { continue; }
        var dd = h.method("get_distance", 0).invoke(); if (dd < bd) { bd = dd; best = readV3(h.method("get_point", 0).invoke()); }
    }
    return best;
}
function gunStep() {
    var grip = !!input.grip(1), trig = input.trigger(1) > 0.6;
    if (!grip) { if (gunDot) gunDot.method("SetActive", 1).invoke(false); gunHeld = trig; return; }
    var pt = gunHit();
    if (pt) {
        if (!gunDot) gunDot = espBox(1, 1, 1);
        var t = gunDot.method("get_transform", 0).invoke();
        t.method("set_position", 1).invoke(vec3(pt[0], pt[1], pt[2])); t.method("set_localScale", 1).invoke(vec3(0.15, 0.15, 0.15));
        gunDot.method("SetActive", 1).invoke(true);
        if (trig && !gunHeld) {
            if (p.tpGun) tp([pt[0], pt[1] + 1.2, pt[2]]);
            else if (p.spawnGun) { var nm = currentItem(); if (nm) spawnAt(nm, vec3(pt[0], pt[1] + 0.3, pt[2])); }
        }
    }
    gunHeld = trig;
}
function rainItems() {
    var nm = currentItem(), me = myPos(); if (!nm || !me) { notify("Nothing selected"); return; }
    var n = Math.max(4, p.spawnCount * 4), ok = 0;
    for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; if (spawnAt(nm, vec3(me[0] + Math.cos(a) * 3, me[1] + 4, me[2] + Math.sin(a) * 3))) ok++; }
    notify("Rained " + ok + "x " + nm);
}
function magnetStep() {
    var h = posOf(player().field("rightHandTransform").value);
    allOf(C.Grab).forEach(function (g) {
        try {
            var t = g.method("get_transform", 0).invoke(), q = posOf(t); if (!q || dist(q, h) > 8 || dist(q, h) < 0.4) return;
            t.method("set_position", 1).invoke(vec3(h[0] + (q[0] - h[0]) * 0.8, h[1] + (q[1] - h[1]) * 0.8, h[2] + (q[2] - h[2]) * 0.8));
        } catch (e) { }
    });
}

// ---- ESP (unlit ZTest Always boxes, pooled per category)
function espMat(key, r, g, b) {
    if (esp.mat[key]) return esp.mat[key];
    var names = ["Hidden/Internal-Colored", "Sprites/Default", "GUI/Text Shader"];
    for (var i = 0; i < names.length; i++) {
        try {
            var sh = C.Shader.method("Find", 1).invoke(Il2Cpp.string(names[i])); if (!nn(sh)) continue;
            var m = C.Mat.alloc(); bindTo(C.matCtor, m).invoke(sh);
            if (C.setInt && i === 0) [["_ZTest", 8], ["_ZWrite", 0], ["_Cull", 0], ["_SrcBlend", 5], ["_DstBlend", 10]].forEach(function (kv) { try { bindTo(C.setInt, m).invoke(Il2Cpp.string(kv[0]), kv[1]); } catch (e) { } });
            m.method("set_color", 1).invoke(mkColor(r, g, b, 0.55));
            try { m.method("set_renderQueue", 1).invoke(4000); } catch (e) { }
            try { m.ref(false); } catch (e) { }
            return (esp.mat[key] = m);
        } catch (e) { }
    }
    return null;
}
function espBox(r, g, b) {
    var go = C.GO.method("CreatePrimitive", 1).invoke(3);
    try { var c = comp(go.method("get_transform", 0).invoke(), C.Collider); if (c) destroy(c); } catch (e) { }
    var m = espMat(r + "," + g + "," + b, r, g, b);
    if (m) try { comp(go.method("get_transform", 0).invoke(), C.Renderer).method("set_sharedMaterial", 1).invoke(m); } catch (e) { }
    try { go.ref(false); } catch (e) { }
    return go;
}
var ESP_CATS = [
    { key: "espMon", col: [1, 0.15, 0.15], size: [0.9, 1.8], list: function () { return monsters(); } },
    { key: "espPlr", col: [0.2, 0.85, 1], size: [0.6, 1.4], list: function () { return allOf(C.NetPlayer).filter(function (n) { try { return !n.method("get_photonView", 0).invoke().method("get_IsMine", 0).invoke(); } catch (e) { return false; } }); } },
    { key: "espCol", col: [1, 0.9, 0.1], size: [0.35, 0.35], list: function () { return [].concat(allOf(C.HuntCol), allOf(C.CoopCol), allOf(C.Egg)); } },
    { key: "espOre", col: [1, 0.55, 0.1], size: [0.5, 0.5], list: function () { return allOf(C.Ore); } },
    { key: "espSecret", col: [0.7, 0.3, 1], size: [1.2, 2], list: function () { return allOf(C.SecretTrig); } },
];
function espStep(now) {
    var me = myPos(); if (!me) return;
    var relist = now - esp.listT > 2000; if (relist) esp.listT = now;
    ESP_CATS.forEach(function (c) {
        var pool = esp.pools[c.key] || (esp.pools[c.key] = []), used = 0;
        if (p[c.key]) {
            if (relist || !esp.lists[c.key]) { try { esp.lists[c.key] = c.list(); } catch (e) { esp.lists[c.key] = []; } }
            esp.lists[c.key].forEach(function (o) {
                if (used >= 40 || o.isNull()) return;
                var t = o; try { if (o.class.name !== "Transform") t = o.method("get_transform", 0).invoke(); } catch (e) { return; }
                var q = posOf(t); if (!q || dist(q, me) > 250) return;
                if (!pool[used]) pool[used] = espBox(c.col[0], c.col[1], c.col[2]);
                try {
                    var bt = pool[used].method("get_transform", 0).invoke();
                    bt.method("set_position", 1).invoke(vec3(q[0], q[1] + c.size[1] * 0.5, q[2]));
                    bt.method("set_localScale", 1).invoke(vec3(c.size[0], c.size[1], c.size[0]));
                    pool[used].method("SetActive", 1).invoke(true);
                } catch (e) { }
                used++;
            });
        }
        for (var i = used; i < pool.length; i++) try { pool[i].method("SetActive", 1).invoke(false); } catch (e) { }
    });
}
function espClear() { Object.keys(esp.pools).forEach(function (k) { esp.pools[k].forEach(destroy); esp.pools[k] = []; }); if (gunDot) { destroy(gunDot); gunDot = null; } }
function tpSecret() {
    var me = myPos(), best = null, bd = 1e9;
    allOf(C.SecretTrig).forEach(function (o) { var q = posOf(o.method("get_transform", 0).invoke()); if (q && dist(q, me) < bd) { bd = dist(q, me); best = q; } });
    if (!best) { notify("No secret areas on this map"); return; }
    tp([best[0], best[1] + 0.5, best[2]]);
}

// ---- squid game
function glassStep() {
    var segs = allOf(C.GlassSeg); glassTinted = segs;
    segs.forEach(function (sg) {
        try {
            var cur = sg.field("stateMachine").value.method("get_CurrentState", 0).invoke();
            var safe = nn(cur) && cur.handle.equals(sg.field("nonBreakableState").value.handle);
            var bad = nn(cur) && cur.handle.equals(sg.field("breakableState").value.handle);
            if (!safe && !bad) return;
            var r = comp(sg.field("gfx").value.method("get_transform", 0).invoke(), C.Renderer); if (!r) return;
            r.method("get_material", 0).invoke().method("set_color", 1).invoke(safe ? mkColor(0.1, 1, 0.2, 1) : mkColor(1, 0.1, 0.1, 1));
        } catch (e) { }
    });
}
function rlglText() {
    var txt = null;
    try {
        eachList(C.RLGL.field("All").value, function (c) {
            if (txt) return;
            var cur = c.field("stateMachine").value.method("get_CurrentState", 0).invoke(); if (!nn(cur)) return;
            if (cur.handle.equals(c.field("redLightState").value.handle)) txt = "RED LIGHT - don't move";
            else if (cur.handle.equals(c.field("greenLightState").value.handle)) txt = "green light - go";
        });
    } catch (e) { }
    return txt;
}

// ---- world
function setBright(on) {
    var RS = C.RS;
    if (on) {
        if (!lightOrig) lightOrig = { fog: RS.method("get_fog", 0).invoke(), amb: readV3(RS.method("get_ambientLight", 0).invoke()), mode: RS.method("get_ambientMode", 0).invoke(), inten: RS.method("get_ambientIntensity", 0).invoke() };
        RS.method("set_fog", 1).invoke(false);
        RS.method("set_ambientMode", 1).invoke(3);
        RS.method("set_ambientLight", 1).invoke(mkColor(1, 1, 1, 1));
        RS.method("set_ambientIntensity", 1).invoke(1.5);
    } else if (lightOrig) {
        RS.method("set_fog", 1).invoke(lightOrig.fog);
        RS.method("set_ambientMode", 1).invoke(lightOrig.mode);
        RS.method("set_ambientLight", 1).invoke(mkColor(lightOrig.amb[0], lightOrig.amb[1], lightOrig.amb[2], 1));
        RS.method("set_ambientIntensity", 1).invoke(lightOrig.inten);
        lightOrig = null;
    }
}
function flashStep(on) {
    allOf(C.Flash).forEach(function (fb) {
        try {
            var l = fb.field("spotLight").value; if (!nn(l)) return;
            var k = l.handle.toString();
            if (on) {
                if (!flashOrig[k]) flashOrig[k] = { l: l, r: l.method("get_range", 0).invoke(), i: l.method("get_intensity", 0).invoke(), a: l.method("get_spotAngle", 0).invoke() };
                l.method("set_range", 1).invoke(80); l.method("set_intensity", 1).invoke(flashOrig[k].i * 3); l.method("set_spotAngle", 1).invoke(90);
            }
        } catch (e) { }
    });
    if (!on) { Object.keys(flashOrig).forEach(function (k) { var o = flashOrig[k]; try { if (!o.l.isNull()) { o.l.method("set_range", 1).invoke(o.r); o.l.method("set_intensity", 1).invoke(o.i); o.l.method("set_spotAngle", 1).invoke(o.a); } } catch (e) { } }); flashOrig = {}; }
}

// per-frame driver for v1.4 toggles
var st14 = { brightT: 0, freezeT: 0, slowT: 0, freezeOn: false, brightOn: false, flashOn: false, sizeOn: false, glassT: 0, flashT: 0, magT: 0 };
function step14(now) {
    try { survStep(now); } catch (e) { }
    try {
        if (!!p.freezeMon !== st14.freezeOn) { setFreeze(!!p.freezeMon); st14.freezeOn = !!p.freezeMon; st14.freezeT = now; }
        else if (p.freezeMon && now - st14.freezeT > 2000) { st14.freezeT = now; setFreeze(true); }   // catch newly spawned monsters
    } catch (e) { }
    try { if (p.ignoreMe) { var lt = localTarget(); if (lt) lt.field("isVisible").value = false; } } catch (e) { }
    try { if ((p.sizeOn || st14.sizeOn) && (now - st14.slowT > 500 || !p.sizeOn)) { st14.slowT = now; sizeStep(); st14.sizeOn = !!p.sizeOn; } } catch (e) { }
    try { if (p.gravOn) gravStep(); } catch (e) { }
    try { if (p.wallWalk) wallStep(); } catch (e) { }
    try { if (p.tpGun || p.spawnGun) gunStep(); else if (gunDot) gunDot.method("SetActive", 1).invoke(false); } catch (e) { }
    try { if (p.magnet && now - st14.magT > 100) { st14.magT = now; magnetStep(); } } catch (e) { }
    try { if (now - esp.t > 100 || !esp.t) { esp.t = now; espStep(now); } } catch (e) { }
    try { if (p.glassEsp && now - st14.glassT > 500) { st14.glassT = now; glassStep(); } } catch (e) { }
    try { if (!!p.bright !== st14.brightOn) { setBright(!!p.bright); st14.brightOn = !!p.bright; } else if (p.bright && now - st14.brightT > 2000) { st14.brightT = now; setBright(true); } } catch (e) { }
    try { if (p.flash && now - st14.flashT > 1000) { st14.flashT = now; flashStep(true); st14.flashOn = true; } else if (!p.flash && st14.flashOn) { flashStep(false); st14.flashOn = false; } } catch (e) { }
}

// ---------------------------------------------------------------- hooks
function install() {
    var SKIP = { value: undefined };
    hook(C.Health, "TakeDamage", 2, function (self) { if (p.god && isMine(self)) return SKIP; });
    hook(C.Health, "TakeDamageRPC", 2, function (self) { if (p.god && isMine(self)) return SKIP; });
    hook(C.Health, "OnHealthDepleted", 1, function (self) { if (p.god && isMine(self)) return SKIP; });
    // no death: every kill path for the local player
    var GOD = function () { if (p.god) return SKIP; };
    hook(C.BHC, "HandleDeath", 1, function (self) { if (p.god && bhcMine(self)) return SKIP; });
    hook(C.BHC, "OnKilled", 0, function (self) { if (p.god && bhcMine(self)) return SKIP; });
    hook(C.DeathCtl, "OnPlayerDied", 4, GOD);
    hookAll(C.Scare, "OnPlayerDied", GOD);
    hook(C.KillTP, "Teleport", 4, GOD);
    ["EliminatePlayer", "ForceEliminate", "LightOutEliminate", "ConfirmEliminate"].forEach(function (n) { hookAll(C.Elim, n, GOD); });
    hook(C.OverlapKill, "Poll", 0, GOD);
    hook(C.LightKill, "OnTriggerEnter", 1, GOD);
    hook(C.MeleeKill, "OnTriggerEnter", 1, GOD);
    hook(C.SecretKill, "OnTriggerEnter", 1, GOD);

    hook(C.Scare, "PlayJumpscareSFX", 1, function () { if (p.noScare) return SKIP; });
    // v1.4
    hook(C.CupidAI, "Update", 0, function () { if (p.freezeMon) return SKIP; });
    hook(C.CupidAI, "TickSlow", 0, function () { if (p.freezeMon) return SKIP; });
    hook(C.Targeting, "Update", 0, function () { if (p.freezeMon) return SKIP; });
    hook(C.Targetable, "GetIsTargetable", 2, function (self) { if (p.ignoreMe) { var lt = localTarget(); if (lt && lt.handle.equals(self.handle)) return { value: false }; } });
    hook(C.Targetable, "get_IsVisible", 0, function (self) { if (p.ignoreMe) { var lt = localTarget(); if (lt && lt.handle.equals(self.handle)) return { value: false }; } });
    hook(C.Player, "SlowDownPlayer", 1, function () { if (p.antiSlow) return SKIP; });
    hook(C.Player, "DisableMotionWithHand", 1, function () { if (p.antiSlow) return SKIP; });
    hook(C.Scare, "PlayJumpscare", 0, function () { if (p.noScare) return SKIP; });
    hook(C.Scare, "ShowJumpscareInPlace", 2, function () { if (p.noScare) return SKIP; });
}

var cdT = 0;
onFrame(function () {
    if (!ready) return;
    var pl = player(); if (!pl) return;
    try {
        if (p.speedOn || p.jumpOn || p.armsOn || orig) applyLoco(pl);
        if (p.fly) flyStep();
    } catch (e) { }
    var now = Date.now();
    try { if (p.plats) platStep(); else clearPlats(); } catch (e) { }
    try { if (!!p.noclip !== !!ncList) setNoclip(!!p.noclip); } catch (e) { }
    try { if (!!p.ghost !== ghostOn) setGhost(!!p.ghost); } catch (e) { }
    if (p.rgb && now - rgbT > 250) { rgbT = now; rgbH = (rgbH + 0.04) % 1; var c = hsv(rgbH); try { setColor(c[0], c[1], c[2]); } catch (e) { } }
    if (p.holdSpawn && input.primary(1) && now - holdT > 300) { holdT = now; try { var nm = currentItem(); if (nm) spawnAt(nm, handSpot(0)); } catch (e) { } }
    step14(now);
    if (p.noSpawnCd) { var t = Date.now(); if (t - cdT > 1000) { cdT = t; try { spawnCdStep(); } catch (e) { } } }
});

var infoT = 0, infoTxt = "";
tab(function (u) {
    if (missed.length) u.text("not hooked: " + missed.join(", "));
    var now = Date.now();
    if (ready && now - infoT > 500) {
        infoT = now;
        try { var m = nearestMonster(); infoTxt = m ? "nearest monster: " + m.d.toFixed(1) + " m" : "no monsters nearby"; } catch (e) { infoTxt = ""; }
    }
    if (infoTxt) u.text(infoTxt);
    if (ready) { var rl = rlglText(); if (rl) u.text(rl); }
    if (ready) u.text(isMaster() ? "you are master" : "not master");
    if (p.spawnSrc === "Preset") u.text("spawning preset: " + p.preset);
    else { var fl = filtered(); u.text(keys.length ? "pool item #" + p.spawnIdx + ": " + (fl[p.spawnIdx] || "none") + "  (" + fl.length + " match)" : "pool list empty, press Refresh Pool List"); }
});

onDisable(function () {
    p.god = false; p.noScare = false; p.noSpawnCd = false; p.holdSpawn = false; p.rgb = false; p.plats = false;
    try { clearPlats(); } catch (e) { }
    try { setNoclip(false); p.noclip = false; } catch (e) { }
    try { if (ghostOn) setGhost(false); p.ghost = false; } catch (e) { } p.fly = false; p.speedOn = false; p.jumpOn = false; p.armsOn = false;
    try { restoreLoco(); } catch (e) { }
    ["extraLives", "safeZone", "hpPack", "antiSlow", "ignoreMe", "gravOn", "tpGun", "spawnGun", "magnet", "wallWalk", "espMon", "espPlr", "espCol", "espOre", "espSecret", "glassEsp"].forEach(function (k) { p[k] = false; });
    try { if (st14.freezeOn) setFreeze(false); p.freezeMon = false; } catch (e) { }
    try { if (st14.brightOn) setBright(false); p.bright = false; } catch (e) { }
    try { if (st14.flashOn) flashStep(false); p.flash = false; } catch (e) { }
    try { if (st14.sizeOn) { p.sizeOn = false; sizeStep(); } p.sizeOn = false; } catch (e) { }
    try { var hs = myHS(); if (hs && p.safeZone === false) hs.method("SetInSafeZone", 1).invoke(false); } catch (e) { }
    try { espClear(); } catch (e) { }
});

Il2Cpp.perform(function () {
    try {
        var img = Il2Cpp.domain.tryAssembly("Assembly-CSharp").image;
        C.Player = img.tryClass("GorillaLocomotion.Player");
        C.Health = img.tryClass("ScaryBaboon.Combat.HealthSystem");
        C.Scare = img.tryClass("JumpscareController");
        C.MonCont = img.tryClass("MonsterContainer");
        C.BHC = img.tryClass("ScaryBaboon.Combat.BaboonHealthController");
        C.DeathCtl = img.tryClass("Monkey.Combat.DeathController");
        C.KillTP = img.tryClass("KillTP");
        C.Elim = img.tryClass("EliminateManager");
        C.OverlapKill = img.tryClass("ScaryBaboon.Features2_0.SecretRooms.LocalPlayerOverlapKillVolume");
        C.LightKill = img.tryClass("LightOutKillTrigger");
        C.MeleeKill = img.tryClass("MeleeWeaponKillTrigger");
        C.SecretKill = img.tryClass("SecretAreakillCollider");
        C.Pool = img.tryClass("NetworkedObjectPool");
        C.PColor = img.tryClass("NetworkPlayerColor");
        C.NPS = img.tryClass("NetworkPlayerSpawner");
        C.Photon = findClassAny("Photon.Pun.PhotonNetwork");
        C.GO = findClassAny("UnityEngine.GameObject");
        C.UObj = findClassAny("UnityEngine.Object");
        C.MeshCol = findClassAny("UnityEngine.MeshCollider");
        C.Respawn = img.tryClass("RespawnController");
        C.CupidAI = img.tryClass("CupidAI");
        C.Targeting = img.tryClass("Monkey.AI.AITargetingController");
        C.Targetable = img.tryClass("ScaryBaboon.Combat.BaboonAITargetablePlayer");
        C.Tracker = img.tryClass("BaboonAITargetablePlayerTracker");
        C.Boss = img.tryClass("ScaryBaboon.Features2_0.Bosses.BossHealth");
        C.NetPlayer = img.tryClass("NetworkPlayer");
        C.HuntCol = img.tryClass("ScaryBaboon.GameModes.ScavengerHunt.ScavengerHuntCollectible");
        C.CoopCol = img.tryClass("ScaryBaboon.Features2_0.Events.ScavengerHuntCoopCollectible");
        C.Egg = img.tryClass("EggCollectible");
        C.Ore = img.tryClass("ScaryBaboon.ResourceExtractionSystem.Mining.MiningOre");
        C.SecretTrig = img.tryClass("BaseSecretAreaTrigger");
        C.GlassSeg = img.tryClass("GlassBridge.GlassBridgeSegment");
        C.RLGL = img.tryClass("RedLightGreenLight.RedLightGreenLightController");
        C.Flash = img.tryClass("ScaryBaboon.Combat.Weapons.Behaviors.FlashlightBehavior");
        C.Grab = findClassAny("HurricaneVR.Framework.Core.HVRGrabbable");
        C.Agent = findClassAny("UnityEngine.AI.NavMeshAgent");
        C.RS = findClassAny("UnityEngine.RenderSettings");
        C.Time = findClassAny("UnityEngine.Time");
        C.Color = findClassAny("UnityEngine.Color");
        C.Shader = findClassAny("UnityEngine.Shader");
        C.Mat = findClassAny("UnityEngine.Material");
        C.Renderer = findClassAny("UnityEngine.Renderer");
        C.Collider = findClassAny("UnityEngine.Collider");
        C.matCtor = pickM(C.Mat, ".ctor", ["UnityEngine.Shader"]);
        C.setInt = pickM(C.Mat, "SetInt", ["System.String", "System.Int32"]);
        C.childM = pickM(findClassAny("UnityEngine.Component"), "GetComponentInChildren", ["System.Type"]);
        C.rayAll = pickM(findClassAny("UnityEngine.Physics"), "RaycastAll", ["UnityEngine.Vector3", "UnityEngine.Vector3", "System.Single", "System.Int32"]);
        C.LSC = img.tryClass("ScaryBaboon.Player.LocomotionScaleController");
        C.Fx = img.tryClass("ScaryBaboon.Player.Effects.BaboonPlayerEffectController");
        C.Single = Il2Cpp.corlib.class("System.Single");
        C.Obj = Il2Cpp.corlib.class("System.Object");
        C.GrabSp = img.tryClass("ScaryBaboon.Mechanisms.Spawner.GrabbableItemSpawner");
        C.PickSp = img.tryClass("ScaryBaboon.Features2_0.Shared.Spawning.NetworkedPickupSpawner");
        C.SecDoor = img.tryClass("ScaryBaboon.Features2_0.SecretRooms.SecretDoorMechanism");
        C.SecRoom = img.tryClass("ScaryBaboon.Features2_0.SecretRooms.SecretRoomController");
        C.Door = img.tryClass("ScaryBaboon.Mechanisms.Door.BaseDoorController");
        C.Quat = findClassAny("UnityEngine.Quaternion");
        var UO = findClassAny("UnityEngine.Object");
        if (UO) UO.methods.forEach(function (m) { if (!findAllM && m.name === "FindObjectsOfType" && m.isStatic && m.parameterCount === 1 && m.parameters[0].type.name === "System.Type") findAllM = m; });
        C.Vec3 = findClassAny("UnityEngine.Vector3");
        C.Camera = findClassAny("UnityEngine.Camera");
        if (!C.Player) { log("scary_baboon: GorillaLocomotion.Player missing, wrong game/build?"); return; }
        install();
        ready = true;
        log("scary_baboon loaded" + (missed.length ? ", missed: " + missed.join(", ") : ""));
    } catch (e) { log("scary_baboon init error: " + e); }
});
