// game: com.JusTeam.Stuff
"use strict";
/*
 * stuff.js v3 - Stuff (com.JusTeam.Stuff) plugin for the universal menu.
 * Checked against com.JusTeam.Stuff_dump.cs. Anything that fails to hook is listed in
 * the Plugins tab and in the log, nothing crashes.
 *
 *   Survive      God Mode (DethPlayerManager / FightColider / DeathTrigger), Anti Ragdoll,
 *                Heal Now
 *   Monsters     Freeze (AI scripts + agents), Pacify, One Hit Kill, Kill All,
 *                Kill Nearest, Delete (local)
 *   Guns         infinite ammo, rapid fire, weapon damage multiplier, Max Ammo now
 *   Money        Add Silver / Gold (ClientGameManager balances), keep balances topped up,
 *                Skill EXP, claim mission reward (TaskManager)
 *   Console/Shop free console items, no spawn cooldown, free shop, sell price multiplier,
 *                spawn any console item free (ConsoleManager.consoleItems)
 *   Cosmetics    equip any skin (SkinPlayerManager), equip any armor (PlayerArmored),
 *                player color + rainbow (ClientPlayer)
 *   Movement     jump / speed / arm length multipliers on GorillaLocomotion.PlayerVr
 *   Teleport     to nearest monster / nearest player, bring all monsters to you, unstuck-up (PlayerVr rigidbody+transform)
 *   Combat+      Kill Aura (damage monsters in range), No Melee Cooldown (PushPoint.PushTimeOut), Giant/Tiny self
 *   ESP          through-wall boxes on monsters (EntityHealthSystem + AngryHand) and
 *                other players (ClientPlayer), range-limited, pooled, opacity slider
 *   World        no fog, bright ambient light
 *   Reliability  the tab shows local-player / host state so host-only mods are obvious;
 *                Log Status prints player + console-item counts
 *
 * v3 adds: ESP, Kill Nearest, Max Ammo, Spawn Console Item, host-state readout.
 * v2 was the from-scratch rewrite against the real dump.
 */

var ITEM_NAMES = ["FunnyPaperBag", "TonglePaperBag", "RobloxPaperBag", "BlaaPaperBag", "HloweenPaperBag", "EeeePaperBag", "Hollow", "GoldKing", "WichHat", "ClassickAura", "PoorAura", "SnowMan", "WingsGift", "ChristmasHat", "Pear", "Galaxy", "Maui", "NoTexture", "Cheast", "Raimbow", "Obamium", "Society", "BananaCat", "Ghost", "BoxCat", "Ohh", "Boo", "dogHead", "KingSkin", "DollarAura", "RoyaleCape", "KingNameTag", "Headless", "Leprichon", "LuckyTag", "LuckyEffect", "GlitchSkin", "Isoku", "Magma", "DevilWings", "TopHat", "Duck", "Pripizduchy", "Bread", "Bunny", "Carrot", "RabbitHeadband", "BigEye", "Key", "Mushroom", "IceBundle", "IceWings", "DeerBundle", "PirateHat", "Florp", "BoosterBelt", "BoosterWings", "BoosterCrown", "DeepGalaxy", "GalaxyHat", "Sunglasses", "Ayes", "Lips", "Yellow", "Pompkin"];
var ARMOR_NAMES = ["NoneArmored", "LightBodyArmor", "JuggernautBodyArmor", "DiamondArmor", "BushArmor", "Helmet", "PoliceHelmet", "MilitaryHelmet", "DiamondHelmet", "YourAd", "GoldLightBodyArmor", "Bucket", "JuggernautBodyArmorPrism", "MilitaryHelmetPrism"];
var CAT_NAMES = ["Auto", "Bundle", "Effect", "SkinColor", "NameTag", "Capes", "BodyDeformation", "Hat"];

var p = props([
    { type: "label", label: "Survive" },
    { type: "bool", key: "god", label: "God Mode", default: false, desc: "blocks damage and death, also void kill zones (never edits your health value)" },
    { type: "bool", key: "noRagdoll", label: "Anti Ragdoll / Shock / Drunk", default: false, desc: "ignore pushes, shocks, ragdoll and beer effect" },
    { type: "button", label: "Heal Now", onClick: function () { run(healNow); } },

    { type: "label", label: "Monsters" },
    { type: "bool", key: "freezeMon", label: "Freeze Monsters", default: false, desc: "stops their AI and movement (fully works when you are the host)" },
    { type: "bool", key: "pacify", label: "Pacify Monsters", default: false, desc: "monsters stop detecting and attacking (host side)" },
    { type: "bool", key: "oneHit", label: "One Hit Kill Monsters", default: false, desc: "damage that reaches a monster on your game becomes huge (host side)" },
    { type: "button", label: "Kill All Monsters", onClick: function () { run(killAllMonsters); } },
    { type: "button", label: "Kill Nearest Monster", onClick: function () { run(killNearestMonster); } },
    { type: "button", label: "Delete Monsters (Local Only)", onClick: function () { run(deleteMonsters); } },
    { type: "bool", key: "killAura", label: "Kill Aura", default: false, desc: "constantly damages every monster within range of you (host side, like One Hit Kill)" },
    { type: "float", key: "auraRange", label: "Kill Aura Range (m)", min: 3, max: 40, default: 12, decimals: 0 },

    { type: "label", label: "Guns" },
    { type: "bool", key: "infAmmo", label: "Infinite Ammo", default: false },
    { type: "bool", key: "rapidGun", label: "Rapid Fire", default: false },
    { type: "int", key: "rapidMs", label: "Rapid Fire Delay (ms)", min: 20, max: 300, default: 80 },
    { type: "bool", key: "dmgOn", label: "Weapon Damage Multiplier", default: false, desc: "your guns and melee hit harder, works as a client too (also hurts players)" },
    { type: "float", key: "dmgMul", label: "Damage Multiplier", min: 1, max: 100, default: 10, decimals: 0 },
    { type: "button", label: "Max Ammo (All Guns)", onClick: function () { run(maxAmmo); } },
    { type: "bool", key: "rapidMelee", label: "No Melee Cooldown", default: false, desc: "removes the push/melee cooldown so hits land back to back" },

    { type: "label", label: "Money / Progress" },
    { type: "int", key: "silverAmt", label: "Silver Amount", min: 1000, max: 1000000, default: 50000 },
    { type: "button", label: "Add Silver", onClick: function () { run(function () { addBalance("Player", Number(p.silverAmt)); }); } },
    { type: "int", key: "goldAmt", label: "Gold Amount", min: 10, max: 10000, default: 500 },
    { type: "button", label: "Add Gold", onClick: function () { run(function () { addBalance("Gold", Number(p.goldAmt)); }); } },
    { type: "bool", key: "keepRich", label: "Keep Balances Topped Up", default: false, desc: "silver stays at 999999 and gold at 9999 or higher" },
    { type: "int", key: "expAmt", label: "Skill EXP Amount", min: 100, max: 100000, default: 5000 },
    { type: "button", label: "Add Skill EXP", onClick: function () { run(addExp); } },
    { type: "button", label: "Claim Mission Reward", onClick: function () { run(claimMission); } },

    { type: "label", label: "Console / Shop" },
    { type: "bool", key: "freeItems", label: "Free Console Items", default: false, desc: "console spawns cost 0" },
    { type: "bool", key: "noCooldown", label: "No Spawn Cooldown", default: false, desc: "spawn console items back to back" },
    { type: "bool", key: "freeShop", label: "Free Shop", default: false, desc: "shop prices become 0 and mission-only items open up" },
    { type: "float", key: "sellMult", label: "Sell Price Multiplier", min: 1, max: 20, default: 1, decimals: 1 },
    { type: "int", key: "spawnIdx", label: "Console Item #", min: 0, max: 60, default: 0, desc: "index into the console's item list (Log Status prints how many there are)" },
    { type: "button", label: "Spawn Console Item (Free)", onClick: function () { run(spawnConsoleItem); } },

    { type: "label", label: "Cosmetics" },
    { type: "select", key: "skinPick", label: "Skin", options: ITEM_NAMES, default: ITEM_NAMES[0] },
    { type: "select", key: "skinCat", label: "Skin Category", options: CAT_NAMES, default: "Auto" },
    { type: "button", label: "Equip Skin", onClick: function () { run(equipSkin); } },
    { type: "select", key: "armorPick", label: "Armor", options: ARMOR_NAMES, default: ARMOR_NAMES[1] },
    { type: "button", label: "Equip Armor", onClick: function () { run(equipArmor); } },
    { type: "float", key: "cosR", label: "Color R", min: 0, max: 1, default: 1, decimals: 2 },
    { type: "float", key: "cosG", label: "Color G", min: 0, max: 1, default: 0.25, decimals: 2 },
    { type: "float", key: "cosB", label: "Color B", min: 0, max: 1, default: 0.25, decimals: 2 },
    { type: "button", label: "Apply Color", onClick: function () { run(function () { applyColor(Number(p.cosR), Number(p.cosG), Number(p.cosB)); }); } },
    { type: "bool", key: "rainbow", label: "Rainbow Color", default: false, desc: "cycles your color (sends a network update each step, keep it slow)" },
    { type: "float", key: "rainbowSpeed", label: "Rainbow Speed", min: 0.1, max: 3, default: 0.5, decimals: 1 },

    { type: "label", label: "Movement" },
    { type: "bool", key: "jumpOn", label: "Super Jump", default: false },
    { type: "float", key: "jumpMul", label: "Jump Multiplier", min: 1, max: 8, default: 2.5, decimals: 1 },
    { type: "bool", key: "speedOn", label: "Speed Boost", default: false },
    { type: "float", key: "speedMul", label: "Speed Multiplier", min: 1, max: 6, default: 1.8, decimals: 1 },
    { type: "bool", key: "armsOn", label: "Long Arms", default: false },
    { type: "float", key: "armsMul", label: "Arm Multiplier", min: 1, max: 4, default: 1.6, decimals: 1 },
    { type: "bool", key: "sizeSelf", label: "Giant / Tiny", default: false, desc: "scales your whole rig (local only)" },
    { type: "float", key: "sizeAmt", label: "Size", min: 0.2, max: 5, default: 1, decimals: 2 },

    { type: "label", label: "Teleport" },
    { type: "button", label: "Teleport To Nearest Monster", onClick: function () { run(teleToNearestMonster); } },
    { type: "button", label: "Bring All Monsters To Me", onClick: function () { run(bringMonsters); }, },
    { type: "button", label: "Teleport To Nearest Player", onClick: function () { run(teleToNearestPlayer); } },
    { type: "float", key: "tpUp", label: "Unstuck Height (m)", min: 1, max: 20, default: 4, decimals: 0 },
    { type: "button", label: "Teleport Up (unstuck)", onClick: function () { run(function () { teleportPlayer(addY(myPos(), Number(p.tpUp))); }); } },

    { type: "label", label: "ESP (see through walls)" },
    { type: "bool", key: "espMon", label: "Monster ESP", default: false, desc: "red boxes on every monster / angry hand, drawn through walls" },
    { type: "bool", key: "espPlayer", label: "Player ESP", default: false, desc: "cyan boxes on other players, drawn through walls" },
    { type: "float", key: "espAlpha", label: "ESP Opacity", min: 0.15, max: 1, default: 0.6, decimals: 2 },
    { type: "int", key: "espRange", label: "ESP Max Range (m)", min: 10, max: 300, default: 120, desc: "monsters / players farther than this are not boxed" },

    { type: "label", label: "World" },
    { type: "bool", key: "noFog", label: "No Fog", default: false },
    { type: "bool", key: "bright", label: "Bright Ambient Light", default: false },

    { type: "label", label: "Debug" },
    { type: "button", label: "Log Status", onClick: function () { run(logStatus); } },
]);

var CGMCls = null, DethCls = null, FightCls = null, DeathTrigCls = null, EHSCls = null, EPFCls = null, SCPCls = null;
var ShamCls = null, PushCls = null, MagCls = null, EBCCls = null, MonCls = [], ResCls = null, resAllM = null;
var ConsoleCls = null, SellCls = null, ShopItemCls = null, SkillCls = null, TaskCls = null, PVCls = null;
var ColorCls = null, RSCls = null, UEObject = null, findAllM = null;
var GObjCls = null, RendCls = null, CollCls = null, MatCls = null, ShaderCls = null, Vec3Cls = null, CamCls = null, CPlayerCls = null, AngryCls = null, PhotonNetCls = null;
var ready = false, hooked = 0, missed = [], liveLogged = {}, dead = {}, errs = {};

var st = {
    t: 0, refT: 0, monT: 0, richT: 0, shopT: 0, rainT: 0, worldT: 0,
    cgm: null, death: null, deathH: null, console: null,
    locoKey: "", locoOrig: {}, locoApplied: {},
    spd: {}, frozen: false, dmgOrig: {}, dmgApplied: false, dmgT: 0, gunT: 0, lastRapid: 0, shopOrig: {}, shopApplied: false, sold: {}, world: null, worldApplied: false,
};

// ---------------------------------------------------------------- helpers
function run(fn) { try { fn(); } catch (e) { log("error: " + e); notify("Failed, see log"); } }
function nn(o) { return !!o && !o.isNull(); }
function num(v) { var n = Number(v); if (!isNaN(n)) return n; try { return Number(v.field("value__").value); } catch (e) { return 0; } }
function keep(o) { try { o.ref(false); } catch (e) { } return o; }
function live(name) { if (liveLogged[name]) return; liveLogged[name] = true; log("hook live: " + name); }
function bad(label, e) { errs[label] = (errs[label] || 0) + 1; if (errs[label] === 1) log(label + " error: " + e); if (errs[label] >= 5) { dead[label] = true; log(label + " keeps failing, turned off"); } }
function bindTo(m, obj) { if (typeof m.bind === "function") return m.bind(obj); if (typeof m.withHolder === "function") return m.withHolder(obj); return m; }

function findClassAny(name) {
    var asms = Il2Cpp.domain.assemblies;
    for (var i = 0; i < asms.length; i++) { try { var c = asms[i].image.tryClass(name); if (c) return c; } catch (e) { } }
    return null;
}
function initFind() {
    ResCls = findClassAny("UnityEngine.Resources");
    if (ResCls) { var rms = ResCls.methods; for (var j = 0; j < rms.length; j++) { var rm = rms[j]; if (rm.name === "FindObjectsOfTypeAll" && rm.parameterCount === 1 && rm.isStatic && rm.parameters[0].type.name === "System.Type") { resAllM = rm; break; } } }
    UEObject = findClassAny("UnityEngine.Object");
    if (!UEObject) return;
    var ms = UEObject.methods;
    for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.name === "FindObjectsOfType" && m.parameterCount === 1 && m.isStatic && m.parameters[0].type.name === "System.Type") { findAllM = m; break; }
    }
}
function allOf(cls) {
    if (!cls) return [];
    var out = [];
    if (findAllM) {
        try {
            var arr = findAllM.invoke(cls.type.object);
            for (var i = 0; i < arr.length; i++) { var o = arr.get(i); if (nn(o)) out.push(o); }
            return out;
        } catch (e) { }
    }
    try { Il2Cpp.gc.choose(cls).forEach(function (o) { if (nn(o)) out.push(o); }); } catch (e) { }
    return out;
}
function allLoaded(cls) {
    if (!cls) return [];
    if (resAllM) {
        try {
            var arr = resAllM.invoke(cls.type.object), out = [];
            for (var i = 0; i < arr.length; i++) { var o = arr.get(i); if (nn(o)) out.push(o); }
            return out;
        } catch (e) { }
    }
    return allOf(cls);
}
function firstOf(cls) { var l = allOf(cls); return l.length ? l[0] : null; }
function mkColor(r, g, b, a) {
    var ptr = Memory.alloc(16);
    ptr.writeFloat(r); ptr.add(4).writeFloat(g); ptr.add(8).writeFloat(b); ptr.add(12).writeFloat(a);
    return new Il2Cpp.ValueType(ptr, ColorCls.type);
}
function hsv(h) {
    var i = Math.floor(h * 6), f = h * 6 - i, q = 1 - f;
    switch (i % 6) { case 0: return [1, f, 0]; case 1: return [q, 1, 0]; case 2: return [0, 1, f]; case 3: return [0, q, 1]; case 4: return [f, 0, 1]; default: return [1, 0, q]; }
}

// hook(class, label, method, argCount, before(self,args) -> {skip:true,value:x} or nothing, after(self,args,result))
function hook(cls, label, name, argc, before, after) {
    if (!cls) { missed.push(label + " (class missing)"); return; }
    var m = null;
    try { m = cls.tryMethod(name, argc); } catch (e) { }
    if (!m) { missed.push(label); return; }
    try {
        m.implementation = function () {
            var self = this, args = arguments;
            if (!dead[label] && before) {
                try { var r = before(self, args); if (r && r.skip) return r.value; } catch (e) { bad(label, e); }
            }
            var b = m.isStatic ? m : bindTo(m, self);
            var res = b.invoke.apply(b, args);
            if (!dead[label] && after) { try { after(self, args, res); } catch (e) { bad(label, e); } }
            return res;
        };
        hooked++;
    } catch (e) { missed.push(label + " (" + e + ")"); }
}

function isLocalDeath(o) { return !st.deathH || o.handle.toString() === st.deathH; }

// ---------------------------------------------------------------- hooks
function hookMonster(spec) {
    var cls = null;
    try { cls = Il2Cpp.domain.tryAssembly("Assembly-CSharp").image.tryClass(spec[0]); } catch (e) { }
    if (!cls) { missed.push(spec[0] + " (class missing)"); return; }
    MonCls.push(cls);
    var SK = { skip: true }, i;
    for (i = 0; i < spec[1].length; i++) hook(cls, spec[0] + "." + spec[1][i][0], spec[1][i][0], spec[1][i][1], function () { if (p.freezeMon) return SK; });
    for (i = 0; i < spec[2].length; i++) hook(cls, spec[0] + "." + spec[2][i][0], spec[2][i][0], spec[2][i][1], function () { if (p.pacify) return SK; });
}
function killHpFx(dm) {
    var names = ["hpeffect", "damagePost"];
    for (var i = 0; i < names.length; i++) {
        try {
            var v = dm.field(names[i]).value; if (!nn(v)) continue;
            try { v.field("weight").value = 0; } catch (e) { v.method("set_weight", 1).invoke(0); }
        } catch (e) { }
    }
}

function install() {
    var SKIP = { skip: true };

    // God mode: every path that applies damage / kills the local player
    hook(DethCls, "DethPlayerManager.ToDeth", "ToDeth", 1, function (self) { if (p.god && isLocalDeath(self)) { live("god ToDeth"); return SKIP; } });
    hook(DethCls, "DethPlayerManager.DyeSynx", "DyeSynx", 3, function (self) { if (p.god && isLocalDeath(self)) { live("god DyeSynx"); return SKIP; } });
    hook(DethCls, "DethPlayerManager.LateUpdate", "LateUpdate", 0, null, function (self) { if (p.god && isLocalDeath(self)) killHpFx(self); });
    hook(DethCls, "DethPlayerManager.ToDamageEffect", "ToDamageEffect", 0, function (self) { if (p.god && isLocalDeath(self)) return SKIP; });
    hook(FightCls, "FightColider.ToDie", "ToDie", 3, function (self) {
        if (!p.god) return;
        var mine = true;
        try { var dm = self.field("dethManager").value; if (nn(dm) && st.deathH) mine = dm.handle.toString() === st.deathH; } catch (e) { }
        if (mine) { live("god FightColider.ToDie"); return SKIP; }
    });
    hook(DeathTrigCls, "DeathTrigger.OnTriggerEnter", "OnTriggerEnter", 1, function () { if (p.god) { live("god DeathTrigger"); return SKIP; } });

    // anti ragdoll / shock / beer
    hook(CGMCls, "ClientGameManager.NetworkPush", "NetworkPush", 2, function () { if (p.noRagdoll) { live("noRagdoll NetworkPush"); return SKIP; } });
    hook(CGMCls, "ClientGameManager.ToRagdool", "ToRagdool", 0, function () { if (p.noRagdoll) { live("noRagdoll ToRagdool"); return SKIP; } });
    hook(CGMCls, "ClientGameManager.ToShoked", "ToShoked", 0, function () { if (p.noRagdoll) return SKIP; });
    hook(CGMCls, "ClientGameManager.BeerVolume", "BeerVolume", 0, function () { if (p.noRagdoll) return SKIP; });

    // one hit kill: whatever damage reaches a monster becomes huge
    hook(EHSCls, "EntityHealthSystem.HealthDamage", "HealthDamage", 1, function (self, args) { if (p.oneHit) { args[0] = 99999; live("oneHit HealthDamage"); } });
    hook(EHSCls, "EntityHealthSystem.OnDamage", "OnDamage", 1, function (self, args) { if (p.oneHit) { args[0] = 99999; live("oneHit OnDamage"); } });

    // console / shop
    hook(ConsoleCls, "ConsoleManager.SpawnConsoleItem", "SpawnConsoleItem", 2, function (self, args) { if (p.freeItems) { args[1] = 0; live("freeItems"); } });
    hook(ConsoleCls, "ConsoleManager.set_currentItemKD", "set_currentItemKD", 1, function (self, args) { if (p.noCooldown) args[0] = 0; });
    hook(SellCls, "SellItemManager.SellObject", "SellObject", 1, function (self, args) {
        if (Number(p.sellMult) <= 1.01) return;
        var el = args[0]; if (!nn(el)) return;
        var k = el.handle.toString(); if (st.sold[k]) return;
        st.sold[k] = true;
        var f = el.field("Price"); f.value = Math.round(Number(f.value) * Number(p.sellMult));
        live("sellMult");
    });

    // monster AI: [method, argCount] to skip while frozen / while pacified
    var MON = [
        ["EntityPathFind", [["Update", 0], ["OnMove", 0]], []],
        ["SCPMonster", [["LateUpdate", 0]], [["DetectingPlayer", 0]]],
        ["AngryHand", [["LateUpdate", 0]], [["Ataking", 0], ["Pushing", 0], ["DetectingPlayer", 0]]],
        ["BackRoomSmile", [["LateUpdate", 0], ["WalkableUpdate", 0]], [["AgressiveUpdate", 0]]],
        ["GlitchManager", [["LateUpdate", 0]], [["AtackMode", 0], ["ToAttackTimer", 0]]],
        ["HuyZnaetManager", [["Update", 0]], [["Attack", 0]]],
        ["ShablonAttakingEntity", [["LateUpdate", 0]], [["Attack", 0]]],
        ["SplashMonster", [["LateUpdate", 0]], [["AggesiveMode", 0]]],
        ["ElectricAnomaly", [], [["OnTriggerEnter", 1]]],
    ];
    for (var mi = 0; mi < MON.length; mi++) hookMonster(MON[mi]);

    // guns
    hook(ShamCls, "ShamcerManager.set_Bullets", "set_Bullets", 1, function (self, args) {
        if (!p.infAmmo) return;
        var mx = Number(self.field("maxBullets").value);
        if (Number(args[0]) < mx) { args[0] = mx; live("infAmmo"); }
    });
    hook(ShamCls, "ShamcerManager.Update", "Update", 0, null, function (self) {
        if (!p.rapidGun) return;
        var now = Date.now();
        if (now - st.lastRapid < Number(p.rapidMs)) return;
        st.lastRapid = now;
        self.field("shootKD").value = false;
        live("rapidGun");
    });

    log(missed.length ? "stuff: " + hooked + " hooks installed, missed: " + missed.join(", ") : "stuff: all " + hooked + " hooks installed");
}

// ---------------------------------------------------------------- actions
function healNow() {
    var d = st.death; if (!d) { refresh(); d = st.death; }
    if (!d) { notify("Local player not found yet"); return; }
    d.method("OnHeal", 0).invoke();
    try { d.method("RecalculateUIHealthBar", 0).invoke(); } catch (e) { }
    notify("Healed");
}
function allMonsters() {
    var out = [];
    for (var i = 0; i < MonCls.length; i++) { var l = allOf(MonCls[i]); for (var j = 0; j < l.length; j++) out.push(l[j]); }
    return out;
}
function killAllMonsters() {
    var ehs = allOf(EHSCls), hit = 0, ang = 0, asked = 0, i;
    for (i = 0; i < ehs.length; i++) {
        var o = ehs[i];
        try { o.method("HealthDamage", 1).invoke(999999); hit++; } catch (e) { try { o.method("OnDamage", 1).invoke(999999); hit++; } catch (e2) { } }
        try { o.method("set_E_Health", 1).invoke(0); } catch (e) { }
        try { o.method("HealthStateCalculate", 0).invoke(); } catch (e) { }
    }
    var hands = allOf(findClassAny("AngryHand"));
    for (i = 0; i < hands.length; i++) { try { hands[i].field("HP").value = 0; ang++; } catch (e) { } }
    var ctrl = firstOf(EBCCls);
    if (ctrl) {
        for (i = 0; i < ehs.length; i++) {
            try { ctrl.method("EntityDestroyer", 1).invoke(ehs[i].method("get_photonView", 0).invoke()); asked++; } catch (e) { }
        }
    }
    notify("Monsters: " + hit + " damaged, " + ang + " angry hands, " + asked + " destroy requests");
    log("killAll: ehs=" + ehs.length + " damaged=" + hit + " angryHands=" + ang + " destroyRequests=" + asked);
}
function deleteMonsters() {
    var list = allMonsters(), seen = {}, n = 0;
    for (var i = 0; i < list.length; i++) {
        try {
            var go = list[i].method("get_gameObject", 0).invoke();
            if (!nn(go)) continue;
            var k = go.handle.toString(); if (seen[k]) continue; seen[k] = true;
            UEObject.method("Destroy", 1).invoke(go); n++;
        } catch (e) { }
    }
    notify("Deleted " + n + " monsters on your side");
}
function addBalance(kind, amt) {
    var g = st.cgm; if (!g) { refresh(); g = st.cgm; }
    if (!g) { notify("ClientGameManager not found yet"); return; }
    var cur = Number(g.method("get_" + kind + "Balance", 0).invoke());
    g.method("set_" + kind + "Balance", 1).invoke(Math.min(2000000000, cur + amt));
    notify("Added " + amt + " " + (kind === "Player" ? "silver" : "gold"));
}
function addExp() {
    var sm = firstOf(SkillCls); if (!sm) { notify("SkillManager not found (try near the skills area)"); return; }
    sm.method("set_Exp", 1).invoke(Number(sm.method("get_Exp", 0).invoke()) + Number(p.expAmt));
    notify("Added " + p.expAmt + " EXP");
}
function claimMission() {
    var tm = firstOf(TaskCls); if (!tm) { notify("TaskManager not found"); return; }
    tm.method("OnMissionCompleate", 0).invoke();
    notify("Mission reward claimed");
}
function addY(p, dy) { return p ? [p[0], p[1] + dy, p[2]] : null; }
function playerTransform() { var pv = locoInstance(); if (!pv) return null; try { var t = pv.method("get_transform", 0).invoke(); return nn(t) ? t : null; } catch (e) { return null; } }
function myPos() { var t = playerTransform(); return t ? readV3(t.method("get_position", 0).invoke()) : localEye(); }
function teleportPlayer(pos) {
    if (!pos) { notify("Your position not found yet"); return; }
    var pv = locoInstance(); if (!pv) { notify("Player not found (move around first)"); return; }
    var v = vec3(pos[0], pos[1], pos[2]);
    try { pv.method("get_transform", 0).invoke().method("set_position", 1).invoke(v); } catch (e) { }
    try { var rb = pv.field("playerRigidBody").value; if (nn(rb)) { rb.method("set_position", 1).invoke(v); rb.method("set_velocity", 1).invoke(vec3(0, 0, 0)); } } catch (e) { }
}
function teleToNearestMonster() {
    var ehs = allOf(EHSCls); if (!ehs.length) { notify("No monsters found"); return; }
    var me = myPos(), best = null, bd = Infinity;
    for (var i = 0; i < ehs.length; i++) { var mp = posOf(ehs[i]); if (!mp) continue; var d = me ? dist3(me, mp) : 0; if (d < bd) { bd = d; best = mp; } }
    if (!best) { notify("No reachable monster"); return; }
    teleportPlayer([best[0], best[1] + 1.5, best[2]]);
    notify("Teleported to nearest monster (" + Math.round(bd) + "m)");
}
function bringMonsters() {
    var me = myPos(); if (!me) { notify("Your position not found"); return; }
    var ehs = allOf(EHSCls), n = 0;
    for (var i = 0; i < ehs.length; i++) {
        try { var t = ehs[i].method("get_transform", 0).invoke(); if (nn(t)) { t.method("set_position", 1).invoke(vec3(me[0], me[1], me[2])); n++; } } catch (e) { }
    }
    notify("Pulled " + n + " monster(s) to you" + (n ? " (One Hit Kill + swing to clear them)" : ""));
}
function teleToNearestPlayer() {
    if (!CPlayerCls) { notify("Player class not found"); return; }
    var me = myPos(), selfH = selfPlayerHandle(), plrs = allOf(CPlayerCls), best = null, bd = Infinity, bn = "";
    for (var i = 0; i < plrs.length; i++) {
        if (selfH && plrs[i].handle.toString() === selfH) continue;
        var pp = posOf(plrs[i]); if (!pp) continue;
        var d = me ? dist3(me, pp) : 0;
        if (d < bd) { bd = d; best = pp; try { bn = String(plrs[i].field("PlayerNickName").value); } catch (e) { bn = "player"; } }
    }
    if (!best) { notify("No other players found"); return; }
    teleportPlayer([best[0], best[1] + 0.5, best[2]]);
    notify("Teleported to " + bn + " (" + Math.round(bd) + "m)");
}
function killNearestMonster() {
    var ehs = allOf(EHSCls); if (!ehs.length) { notify("No monsters found"); return; }
    var eye = localEye(), best = null, bd = Infinity;
    for (var i = 0; i < ehs.length; i++) {
        var pos = posOf(ehs[i]); if (!pos) continue;
        var d = eye ? dist3(eye, pos) : 0;
        if (d < bd) { bd = d; best = ehs[i]; }
    }
    if (!best) { notify("No reachable monster"); return; }
    try { best.method("HealthDamage", 1).invoke(999999); } catch (e) { }
    try { best.method("set_E_Health", 1).invoke(0); } catch (e) { }
    try { best.method("HealthStateCalculate", 0).invoke(); } catch (e) { }
    notify("Killed nearest monster (" + Math.round(bd) + "m)");
}
function maxAmmo() {
    var guns = allOf(ShamCls), n = 0;
    for (var i = 0; i < guns.length; i++) {
        try { guns[i].method("set_Bullets", 1).invoke(Number(guns[i].field("maxBullets").value)); n++; } catch (e) { }
    }
    notify(n ? "Reloaded " + n + " gun(s)" : "No guns found (hold one)");
}
function spawnConsoleItem() {
    var c = st.console; if (!c) { refresh(); c = st.console; }
    if (!c) { notify("Console not found (stand at the console)"); return; }
    var arr; try { arr = c.field("consoleItems").value; } catch (e) { arr = null; }
    if (!nn(arr) || !arr.length) { notify("Console item list empty"); return; }
    var idx = Number(p.spawnIdx);
    if (idx < 0 || idx >= arr.length) { notify("Item # out of range (0.." + (arr.length - 1) + ")"); return; }
    var item = arr.get(idx); if (!nn(item)) { notify("Item #" + idx + " is empty"); return; }
    var name = idx; try { name = String(item.field("nameObject").value); } catch (e) { }
    c.method("SpawnConsoleItem", 2).invoke(item, 0);
    notify("Spawned " + name + " (free)");
}
function isHost() { try { if (PhotonNetCls) return !!PhotonNetCls.method("get_IsMasterClient", 0).invoke(); } catch (e) { } return null; }
function equipSkin() {
    var g = st.cgm; if (!g) { refresh(); g = st.cgm; }
    if (!g) { notify("ClientGameManager not found yet"); return; }
    var id = ITEM_NAMES.indexOf(p.skinPick) + 1, cat = CAT_NAMES.indexOf(p.skinCat) - 1;
    if (cat < 0) {
        var shop = allOf(ShopItemCls);
        for (var i = 0; i < shop.length; i++) { try { if (num(shop[i].field("itemID").value) === id) { cat = num(shop[i].field("category").value); break; } } catch (e) { } }
    }
    if (cat < 0) { notify("Pick a category (auto only works near the shop)"); return; }
    var sm = g.field("skinPlayerManager").value;
    if (!nn(sm)) { notify("SkinPlayerManager not found"); return; }
    sm.method("SetSkin", 2).invoke(cat, id);
    try { sm.method("ApplySkins", 0).invoke(); } catch (e) { }
    notify("Equipped " + p.skinPick);
}
function equipArmor() {
    var g = st.cgm; if (!g) { refresh(); g = st.cgm; }
    if (!g) { notify("ClientGameManager not found yet"); return; }
    var cp = g.field("selfClientPlayer").value; if (!nn(cp)) { notify("Local ClientPlayer not found"); return; }
    var pa = cp.field("_playerArmored").value; if (!nn(pa)) { notify("PlayerArmored not found"); return; }
    var t = ARMOR_NAMES.indexOf(p.armorPick), sub = 0;
    try {
        var arr = pa.field("AllArmoreds").value;
        for (var i = 0; i < arr.length; i++) { var ao = arr.get(i); if (nn(ao) && num(ao.field("BodyArmored").value) === t) { sub = num(ao.field("SubBody").value); break; } }
    } catch (e) { }
    pa.method("SetNewArmored", 2).invoke(t, sub);
    notify("Equipped " + p.armorPick);
}
function applyColor(r, g, b) {
    var gm = st.cgm; if (!gm) { refresh(); gm = st.cgm; }
    if (!gm) return;
    var cp = gm.field("selfClientPlayer").value; if (!nn(cp)) return;
    cp.method("ChangePlayerColorForAll", 1).invoke(mkColor(r, g, b, 1));
}
function logStatus() {
    refresh();
    log("hooks installed: " + hooked + (missed.length ? ", missed: " + missed.join(", ") : ""));
    log("local: cgm=" + (st.cgm ? "yes" : "no") + " death=" + (st.death ? "yes" : "no") + " console=" + (st.console ? "yes" : "no"));
    var host = "unknown";
    try { var pn = findClassAny("Photon.Pun.PhotonNetwork"); if (pn) host = pn.method("get_IsMasterClient", 0).invoke() ? "yes" : "no"; } catch (e) { }
    log("you are the host: " + host);
    var cnt = [], q;
    for (q = 0; q < MonCls.length; q++) { var c = allOf(MonCls[q]).length; if (c) cnt.push(MonCls[q].name + "=" + c); }
    log("monsters with health system: " + allOf(EHSCls).length + ", by script: " + (cnt.length ? cnt.join(", ") : "none"));
    log("shop items: " + allOf(ShopItemCls).length + ", guns: " + allOf(ShamCls).length);
    if (CPlayerCls) log("players (incl. you): " + allOf(CPlayerCls).length);
    var cc = -1; try { var c = st.console; if (c) { var arr = c.field("consoleItems").value; if (nn(arr)) cc = arr.length; } } catch (e) { }
    log("console items available: " + (cc < 0 ? "unknown (stand at the console)" : cc + " (Console Item # 0.." + (cc - 1) + ")"));
    notify("Status written to log");
}

// ---------------------------------------------------------------- ESP (through-wall boxes)
var esp = { monPool: [], plrPool: [], mats: {}, matKey: "", matAt: 0, at: 0 };

function vec3(x, y, z) { var ptr = Memory.alloc(12); ptr.writeFloat(x); ptr.add(4).writeFloat(y); ptr.add(8).writeFloat(z); return new Il2Cpp.ValueType(ptr, Vec3Cls.type); }
function readV3(v) { try { return [v.handle.readFloat(), v.handle.add(4).readFloat(), v.handle.add(8).readFloat()]; } catch (e) { return null; } }
function posOf(o) { try { var t = o.method("get_transform", 0).invoke(); if (!nn(t)) return null; return readV3(t.method("get_position", 0).invoke()); } catch (e) { return null; } }
function dist3(a, b) { var dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2]; return Math.sqrt(dx * dx + dy * dy + dz * dz); }
function getComp(go, cls) { try { var c = go.method("GetComponent", 1).invoke(cls.type.object); return nn(c) ? c : null; } catch (e) { return null; } }

function matIntSetter() {
    if (esp.setIntM !== undefined) return esp.setIntM;
    esp.setIntM = null;
    try { var ms = MatCls.methods; for (var i = 0; i < ms.length; i++) { var m = ms[i]; if (m.name === "SetInt" && m.parameterCount === 2 && m.parameters[0].type.name === "System.String") { esp.setIntM = m; break; } } } catch (e) { }
    return esp.setIntM;
}
function matCtor() {
    if (esp.ctorM !== undefined) return esp.ctorM;
    esp.ctorM = null;
    try { var cs = MatCls.methods; for (var i = 0; i < cs.length; i++) { var c = cs[i]; if (c.name === ".ctor" && c.parameterCount === 1 && c.parameters[0].type.name === "UnityEngine.Shader") { esp.ctorM = c; break; } } } catch (e) { }
    return esp.ctorM;
}
// a material that always draws (ZTest Always), so boxes show through walls
function espMat(r, g, b, a) {
    if (!MatCls || !ShaderCls || !ColorCls) return null;
    var ctor = matCtor(), si = matIntSetter();
    if (!ctor) return null;
    var names = ["Hidden/Internal-Colored", "Sprites/Default", "Particles/Standard Unlit", "GUI/Text Shader"];
    for (var i = 0; i < names.length; i++) {
        try {
            var sh = ShaderCls.method("Find", 1).invoke(Il2Cpp.string(names[i]));
            if (!nn(sh)) continue;
            var m = MatCls.alloc();
            bindTo(ctor, m).invoke(sh);
            if (si && names[i] !== "GUI/Text Shader") {
                var kv = [["_ZTest", 8], ["_ZWrite", 0], ["_Cull", 0], ["_SrcBlend", 5], ["_DstBlend", 10]];
                for (var k = 0; k < kv.length; k++) { try { si.bind ? si.bind(m).invoke(Il2Cpp.string(kv[k][0]), kv[k][1]) : bindTo(si, m).invoke(Il2Cpp.string(kv[k][0]), kv[k][1]); } catch (e) { } }
            }
            m.method("set_color", 1).invoke(mkColor(r, g, b, a));
            try { m.method("set_renderQueue", 1).invoke(4000); } catch (e) { }
            return keep(m);
        } catch (e) { }
    }
    return null;
}
function espMats() {
    var a = Number(p.espAlpha), key = a.toFixed(2);
    var now = Date.now();
    if (esp.matKey === key && esp.mats.mon) return esp.mats;
    if (esp.mats.mon && now - esp.matAt < 400) return esp.mats;
    esp.matAt = now; esp.matKey = key;
    esp.mats = { mon: espMat(1, 0.18, 0.2, a), plr: espMat(0.2, 0.85, 1, a) };
    if (!esp.mats.mon) { if (!esp.warned) { esp.warned = true; log("esp: no usable shader found, boxes may be depth tested"); } }
    return esp.mats;
}
function mkBox(mat) {
    var go = GObjCls.method("CreatePrimitive", 1).invoke(3);   // 3 = cube
    try { var c = getComp(go, CollCls); if (c) UEObject.method("Destroy", 1).invoke(c); } catch (e) { }
    try { if (mat) { var r = getComp(go, RendCls); if (r) r.method("set_sharedMaterial", 1).invoke(mat); } } catch (e) { }
    var b = { go: keep(go), t: go.method("get_transform", 0).invoke(), mat: mat };
    return b;
}
function setBox(b, pos, w, h, mat) {
    try {
        if (mat && b.mat !== mat) { var r = getComp(b.go, RendCls); if (r) r.method("set_sharedMaterial", 1).invoke(mat); b.mat = mat; }
        b.t.method("set_position", 1).invoke(vec3(pos[0], pos[1] + h * 0.5, pos[2]));
        b.t.method("set_localScale", 1).invoke(vec3(w, h, w));
        b.go.method("SetActive", 1).invoke(true);
    } catch (e) { }
}
function hideFrom(pool, n) { for (var i = n; i < pool.length; i++) { try { pool[i].go.method("SetActive", 1).invoke(false); } catch (e) { } } }
function destroyPool(pool) { for (var i = 0; i < pool.length; i++) { try { UEObject.method("Destroy", 1).invoke(pool[i].go); } catch (e) { } } pool.length = 0; }
function espClear() { destroyPool(esp.monPool); destroyPool(esp.plrPool); }

function localEye() {
    try { if (CamCls) { var cam = CamCls.method("get_main", 0).invoke(); if (nn(cam)) { var ep = posOf(cam); if (ep) return ep; } } } catch (e) { }
    if (st.death) { var dp = posOf(st.death); if (dp) return dp; }
    return null;
}
function selfPlayerHandle() { try { if (st.cgm) { var sp = st.cgm.field("selfClientPlayer").value; if (nn(sp)) return sp.handle.toString(); } } catch (e) { } return null; }

function espStep() {
    if (!GObjCls || !RendCls) return;
    var mats = espMats(), eye = localEye(), range = Number(p.espRange), CAP = 48;
    // monsters: everything with a health system, plus angry hands
    var mn = 0;
    if (p.espMon && mats.mon) {
        var mobs = allOf(EHSCls);
        if (AngryCls) { var h = allOf(AngryCls); for (var a = 0; a < h.length; a++) mobs.push(h[a]); }
        for (var i = 0; i < mobs.length && mn < CAP; i++) {
            var pos = posOf(mobs[i]); if (!pos) continue;
            if (eye && dist3(eye, pos) > range) continue;
            if (!esp.monPool[mn]) esp.monPool[mn] = mkBox(mats.mon);
            setBox(esp.monPool[mn], pos, 0.9, 1.6, mats.mon);
            mn++;
        }
    }
    hideFrom(esp.monPool, mn);
    // players: every ClientPlayer except yourself
    var pn = 0;
    if (p.espPlayer && mats.plr && CPlayerCls) {
        var selfH = selfPlayerHandle(), plrs = allOf(CPlayerCls);
        for (var j = 0; j < plrs.length && pn < CAP; j++) {
            if (selfH && plrs[j].handle.toString() === selfH) continue;
            var pp = posOf(plrs[j]); if (!pp) continue;
            if (eye && dist3(eye, pp) > range) continue;
            if (!esp.plrPool[pn]) esp.plrPool[pn] = mkBox(mats.plr);
            setBox(esp.plrPool[pn], pp, 0.7, 1.7, mats.plr);
            pn++;
        }
    }
    hideFrom(esp.plrPool, pn);
}

// ---------------------------------------------------------------- per frame work
function same(a, b) { return !!a && !!b && a.handle.toString() === b.handle.toString(); }
function refresh() {
    var g = firstOf(CGMCls), d = null;
    if (g) { if (!same(st.cgm, g)) st.cgm = keep(g); } else st.cgm = null;
    if (g) { try { var dv = g.field("death").value; if (nn(dv)) d = dv; } catch (e) { } }
    if (!d && PVCls) {
        try { var gi = PVCls.tryMethod("get_Instance"); var pv = gi ? gi.invoke() : null; if (nn(pv)) { var d2 = pv.field("dethPlayerManager").value; if (nn(d2)) d = d2; } } catch (e) { }
    }
    if (d) { if (!same(st.death, d)) st.death = keep(d); } else st.death = null;
    st.deathH = st.death ? st.death.handle.toString() : null;
    var c = firstOf(ConsoleCls);
    if (c) { if (!same(st.console, c)) st.console = keep(c); } else st.console = null;
}

var LOCO = [
    { on: "jumpOn", mul: "jumpMul", field: "jumpMultiplier" },
    { on: "speedOn", mul: "speedMul", field: "velocityLimit" },
    { on: "armsOn", mul: "armsMul", field: "maxArmLength" },
];
function locoInstance() {
    try { var gi = PVCls ? PVCls.tryMethod("get_Instance") : null; var pv = gi ? gi.invoke() : null; return nn(pv) ? pv : null; } catch (e) { return null; }
}
function locoTick(force) {
    var anyOn = false, i;
    for (i = 0; i < LOCO.length; i++) if (p[LOCO[i].on] || st.locoApplied[LOCO[i].field]) anyOn = true;
    if (!anyOn) return;
    var pv = locoInstance(); if (!pv) return;
    var key = pv.handle.toString();
    if (st.locoKey !== key) { st.locoKey = key; st.locoOrig = {}; st.locoApplied = {}; }
    for (i = 0; i < LOCO.length; i++) {
        var d = LOCO[i], f = pv.field(d.field);
        if (st.locoOrig[d.field] === undefined) st.locoOrig[d.field] = Number(f.value);
        if (p[d.on] && !force) { f.value = st.locoOrig[d.field] * Number(p[d.mul]); st.locoApplied[d.field] = true; }
        else if (st.locoApplied[d.field]) { f.value = st.locoOrig[d.field]; st.locoApplied[d.field] = false; }
    }
}
function freezeMon(on) {
    var list = allMonsters();
    for (var i = 0; i < list.length; i++) {
        try {
            var ag = list[i].field("agent").value; if (!nn(ag)) continue;
            var k = ag.handle.toString();
            if (on) {
                if (st.spd[k] === undefined) st.spd[k] = Number(ag.method("get_speed", 0).invoke());
                ag.method("set_speed", 1).invoke(0);
                try { ag.method("set_isStopped", 1).invoke(true); } catch (e) { }
                try { ag.method("ResetPath", 0).invoke(); } catch (e) { }
            } else if (st.spd[k] !== undefined) {
                ag.method("set_speed", 1).invoke(st.spd[k]);
                try { ag.method("set_isStopped", 1).invoke(false); } catch (e) { }
            }
        } catch (e) { }
    }
    if (!on) st.spd = {};
}
// weapon damage multiplier: magazine assets (guns) and PushPoint (melee / pushes)
function dmgApply(on) {
    var jobs = [[allLoaded(MagCls), "damage"], [allOf(PushCls), "Damage"]], extra = allOf(ShamCls), i, j;
    for (i = 0; i < extra.length; i++) { try { var mg = extra[i].field("magazine").value; if (nn(mg)) jobs[0][0].push(mg); } catch (e) { } }
    for (i = 0; i < jobs.length; i++) {
        for (j = 0; j < jobs[i][0].length; j++) {
            try {
                var o = jobs[i][0][j], k = jobs[i][1] + ":" + o.handle.toString(), f = o.field(jobs[i][1]);
                if (on) {
                    if (st.dmgOrig[k] === undefined) st.dmgOrig[k] = Number(f.value);
                    f.value = st.dmgOrig[k] * Number(p.dmgMul);
                } else if (st.dmgOrig[k] !== undefined) f.value = st.dmgOrig[k];
            } catch (e) { }
        }
    }
    if (!on) st.dmgOrig = {};
}
function shopTick(on) {
    var list = allOf(ShopItemCls);
    for (var i = 0; i < list.length; i++) {
        try {
            var si = list[i], k = si.handle.toString();
            if (on) {
                if (!st.shopOrig[k]) st.shopOrig[k] = { price: Number(si.field("Price").value), mission: !!si.field("MissionOnly").value };
                si.field("Price").value = 0; si.field("MissionOnly").value = false;
            } else if (st.shopOrig[k]) {
                si.field("Price").value = st.shopOrig[k].price; si.field("MissionOnly").value = st.shopOrig[k].mission;
            }
        } catch (e) { }
    }
    if (!on) st.shopOrig = {};
}
function worldTick(on) {
    if (!RSCls) return;
    if (on && !st.world && (p.noFog || p.bright)) {
        var lc = RSCls.method("get_ambientLight", 0).invoke();
        st.world = {
            fog: !!RSCls.method("get_fog", 0).invoke(), mode: Number(RSCls.method("get_ambientMode", 0).invoke()),
            inten: Number(RSCls.method("get_ambientIntensity", 0).invoke()),
            light: [lc.handle.readFloat(), lc.handle.add(4).readFloat(), lc.handle.add(8).readFloat(), lc.handle.add(12).readFloat()]
        };
    }
    if (!st.world) return;
    if (on) {
        if (p.noFog) RSCls.method("set_fog", 1).invoke(false);
        if (p.bright) {
            RSCls.method("set_ambientMode", 1).invoke(3);
            RSCls.method("set_ambientLight", 1).invoke(mkColor(1, 1, 1, 1));
            RSCls.method("set_ambientIntensity", 1).invoke(2);
        }
    }
    if (!p.noFog && st.worldApplied) RSCls.method("set_fog", 1).invoke(st.world.fog);
    if (!p.bright && st.worldApplied) {
        RSCls.method("set_ambientMode", 1).invoke(st.world.mode);
        RSCls.method("set_ambientLight", 1).invoke(mkColor(st.world.light[0], st.world.light[1], st.world.light[2], st.world.light[3]));
        RSCls.method("set_ambientIntensity", 1).invoke(st.world.inten);
    }
    st.worldApplied = !!(p.noFog || p.bright);
    if (!st.worldApplied) st.world = null;
}

function tick(now) {
    if (now - st.refT > 1500) { st.refT = now; refresh(); }

    locoTick(false);

    if (p.noCooldown && st.console) { try { st.console.field("SpawnTimer").value = false; } catch (e) { st.console = null; } }

    if (p.freezeMon) { if (now - st.monT > 500) { st.monT = now; freezeMon(true); st.frozen = true; } }
    else if (st.frozen) { freezeMon(false); st.frozen = false; }

    if (p.keepRich && st.cgm && now - st.richT > 700) {
        st.richT = now;
        try {
            var g = st.cgm;
            if (Number(g.method("get_PlayerBalance", 0).invoke()) < 999999) g.method("set_PlayerBalance", 1).invoke(999999);
            if (Number(g.method("get_GoldBalance", 0).invoke()) < 9999) g.method("set_GoldBalance", 1).invoke(9999);
        } catch (e) { bad("keepRich", e); }
    }

    if (p.dmgOn) { if (now - st.dmgT > 1500) { st.dmgT = now; try { dmgApply(true); st.dmgApplied = true; } catch (e) { bad("dmg", e); } } }
    else if (st.dmgApplied) { try { dmgApply(false); } catch (e) { } st.dmgApplied = false; }

    if (p.freeShop) { if (now - st.shopT > 2000) { st.shopT = now; shopTick(true); st.shopApplied = true; } }
    else if (st.shopApplied) { shopTick(false); st.shopApplied = false; }

    if (p.rainbow && now - st.rainT > 250) {
        st.rainT = now;
        var c = hsv(((now / 1000) * Number(p.rainbowSpeed) * 0.1) % 1);
        try { applyColor(c[0], c[1], c[2]); } catch (e) { bad("rainbow", e); }
    }

    if (now - st.worldT > 1000) { st.worldT = now; try { worldTick(true); } catch (e) { bad("world", e); } }

    if (p.killAura && now - (st.auraT || 0) > 250) {
        st.auraT = now;
        var me = myPos();
        if (me) {
            var mobs = allOf(EHSCls), r = Number(p.auraRange);
            for (var ai = 0; ai < mobs.length; ai++) {
                var ap = posOf(mobs[ai]); if (!ap || dist3(me, ap) > r) continue;
                try { mobs[ai].method("HealthDamage", 1).invoke(99999); } catch (e) { }
                try { mobs[ai].method("set_E_Health", 1).invoke(0); } catch (e) { }
            }
        }
    }

    if (p.rapidMelee && now - (st.meleeT || 0) > 150) {
        st.meleeT = now;
        try { var pp = allOf(PushCls); for (var mi = 0; mi < pp.length; mi++) { try { pp[mi].field("PushTimeOut").value = false; } catch (e) { } } } catch (e) { bad("rapidMelee", e); }
    }

    if (p.sizeSelf) {
        var pt = playerTransform();
        if (pt) { var s = Number(p.sizeAmt); try { pt.method("set_localScale", 1).invoke(vec3(s, s, s)); st.sizeApplied = true; } catch (e) { bad("size", e); } }
    } else if (st.sizeApplied) {
        var pt2 = playerTransform(); if (pt2) { try { pt2.method("set_localScale", 1).invoke(vec3(1, 1, 1)); } catch (e) { } }
        st.sizeApplied = false;
    }

    if (p.espMon || p.espPlayer) { if (now - esp.at > 120) { esp.at = now; try { espStep(); } catch (e) { bad("esp", e); } } }
    else if (esp.monPool.length || esp.plrPool.length) { try { espClear(); } catch (e) { } }
}

onFrame(function () {
    if (!ready) return;
    var now = Date.now();
    if (now - st.t < 100) return;
    st.t = now;
    try { tick(now); } catch (e) { bad("tick", e); }
});

tab(function (u) {
    u = u || ui;
    u.textDisabled("hooks installed: " + hooked + (missed.length ? "   missed: " + missed.length + " (see Log Status)" : ""));
    u.textDisabled("local player: " + (st.death ? "found" : "not found yet"));
    var h = isHost();
    u.textDisabled("you are host: " + (h === null ? "unknown" : h ? "yes - host-side mods fully work" : "no - freeze / pacify / one-hit are limited"));
    if (p.espMon || p.espPlayer) u.textDisabled("ESP boxes: " + esp.monPool.length + " monster, " + esp.plrPool.length + " player");
    if (CPlayerCls) {
        var me = myPos(), selfH = selfPlayerHandle(), plrs = allOf(CPlayerCls), shown = 0;
        for (var i = 0; i < plrs.length && shown < 10; i++) {
            if (selfH && plrs[i].handle.toString() === selfH) continue;
            var nm = "player"; try { nm = String(plrs[i].field("PlayerNickName").value); } catch (e) { }
            var pp = posOf(plrs[i]), d = (me && pp) ? "  " + Math.round(dist3(me, pp)) + "m" : "";
            u.textDisabled("  " + nm + d); shown++;
        }
        if (!shown) u.textDisabled("no other players");
    }
});

onDisable(function () {
    try { locoTick(true); } catch (e) { }
    try { if (st.frozen) freezeMon(false); } catch (e) { }
    try { if (st.dmgApplied) dmgApply(false); } catch (e) { }
    try { if (st.shopApplied) shopTick(false); } catch (e) { }
    try { p.noFog = false; p.bright = false; worldTick(false); } catch (e) { }
    try { espClear(); } catch (e) { }
    try {
        p.pacify = false; p.infAmmo = false; p.rapidGun = false; p.dmgOn = false;
        p.god = false; p.noRagdoll = false; p.oneHit = false; p.freezeMon = false; p.keepRich = false;
        p.freeItems = false; p.noCooldown = false; p.freeShop = false; p.rainbow = false;
        p.jumpOn = false; p.speedOn = false; p.armsOn = false; p.sellMult = 1;
        p.espMon = false; p.espPlayer = false;
        p.killAura = false; p.rapidMelee = false;
    } catch (e) { }
    try { if (st.sizeApplied) { p.sizeSelf = false; var pt = playerTransform(); if (pt) pt.method("set_localScale", 1).invoke(vec3(1, 1, 1)); st.sizeApplied = false; } } catch (e) { }
});

Il2Cpp.perform(function () {
    try {
        var asm = Il2Cpp.domain.tryAssembly("Assembly-CSharp");
        var img = asm ? asm.image : null;
        if (!img) { log("stuff: no Assembly-CSharp found, is this the right game?"); return; }
        CGMCls = img.tryClass("ClientGameManager");
        DethCls = img.tryClass("DethPlayerManager");
        FightCls = img.tryClass("FightColider");
        DeathTrigCls = img.tryClass("DeathTrigger");
        EHSCls = img.tryClass("EntityHealthSystem");
        EPFCls = img.tryClass("EntityPathFind");
        SCPCls = img.tryClass("SCPMonster");
        ShamCls = img.tryClass("ShamcerManager");
        PushCls = img.tryClass("PushPoint");
        MagCls = img.tryClass("MagazineObservable");
        EBCCls = img.tryClass("EntityBihaviorController");
        ConsoleCls = img.tryClass("ConsoleManager");
        SellCls = img.tryClass("SellItemManager");
        ShopItemCls = img.tryClass("ShopItem");
        SkillCls = img.tryClass("SkillManager");
        TaskCls = img.tryClass("TaskManager");
        PVCls = img.tryClass("GorillaLocomotion.PlayerVr");
        CPlayerCls = img.tryClass("ClientPlayer");
        AngryCls = img.tryClass("AngryHand");
        ColorCls = findClassAny("UnityEngine.Color");
        RSCls = findClassAny("UnityEngine.RenderSettings");
        GObjCls = findClassAny("UnityEngine.GameObject");
        RendCls = findClassAny("UnityEngine.Renderer");
        CollCls = findClassAny("UnityEngine.Collider");
        MatCls = findClassAny("UnityEngine.Material");
        ShaderCls = findClassAny("UnityEngine.Shader");
        Vec3Cls = findClassAny("UnityEngine.Vector3");
        CamCls = findClassAny("UnityEngine.Camera");
        PhotonNetCls = findClassAny("Photon.Pun.PhotonNetwork");
        initFind();
        install();
        ready = true;
    } catch (e) { log("stuff: setup failed: " + e); }
});
log("Stuff plugin v3 loaded, open its section in the Plugins tab");
