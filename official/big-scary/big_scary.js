// big_scary.js - Big Scary (Axelmatic) plugin for the universal menu (v1.1).
// game: com.Axelmatic.Bigscary
// Built against game 140.1, dump in Dumps/com.Axelmatic.Bigscary_140.1_dump.cs.
// Ported from the Slate / P0ison / JaSC Big Scary menus (rift's Frida/BigScary/merged.js). The game
// scrambles most method / field names and re-scrambles them every update, so nothing here uses a
// scrambled name: the local player, its rigidbody and the gun's ammo counter are found by type / value.
//
// Inputs: [G] = right grip, [G + T] = aim with right grip and fire with right trigger.
//
// What is in here:
//   Movement   speed boost, fly (smooth / velocity / teleport, head or hand), noclip, gravity presets,
//              platforms, teleport gun, iron man, dash, long arms, no tag freeze
//   Monsters   ESP boxes / tracers / name + distance tags for every monster and extraction enemy,
//              host tools (you're master client in a private room): freeze, slow, super fast, bring to me
//   Combat     infinite ammo, rapid fire, aim assist onto monsters / extraction enemies (never players)
//   Players    player ESP boxes, tracers, name tags
//   You        RGB / color picker for your own color, set your own name, join random / leave
//
// Left out on purpose (were in the menus this is ported from): crash / lag / kill / tag / rename /
// destroy all, set master, lock / unlock server, player id spoofing, cosmetic unlocks, gacha auto-stop,
// level + extraction auto-complete and payload unlock (progression rewards), staff panel, impersonation
// names (JaSC / J0ker / owner), "log everyone's info", the infection hitbox expander and player aimbot
// (PvP), and spawn guns in public lobbies.

var input = ui.input;
var X = ui.read3;
var BTNS = ["Right Trigger", "Left Trigger", "A", "B", "X", "Y", "Right Grip", "Left Grip"];
var PAL = { "Red": [1, 0.25, 0.25], "Orange": [1, 0.6, 0.2], "Yellow": [1, 0.9, 0.3], "Green": [0.35, 1, 0.45], "Cyan": [0.3, 0.85, 1], "Purple": [0.7, 0.45, 1], "Pink": [1, 0.45, 0.8], "White": [0.95, 0.95, 0.95] };
var PAL_NAMES = Object.keys(PAL);

var p = props([
    { type: "label", label: "Movement" },
    { type: "bool", key: "speed", label: "Speed Boost", default: false },
    { type: "float", key: "speedMul", label: "Speed Multiplier", min: 1, max: 6, default: 1.5, decimals: 2, desc: "multiplies the game's max jump speed" },
    { type: "float", key: "jumpMul", label: "Jump Multiplier", min: 1, max: 3, default: 1.2, decimals: 2 },
    { type: "bool", key: "gripSpeed", label: "Speed Boost: Right Grip Only", default: false },
    { type: "bool", key: "fly", label: "Fly", default: false, desc: "hold the button to fly where you look" },
    { type: "select", key: "flyBtn", label: "Fly Button", options: BTNS, default: "B" },
    { type: "select", key: "flyStyle", label: "Fly Style", options: ["Smooth", "Velocity", "Teleport"], default: "Smooth", desc: "smooth = steady speed, velocity = builds momentum, teleport = moves you directly" },
    { type: "bool", key: "handFly", label: "Fly Where Right Hand Points", default: false },
    { type: "float", key: "flySpeed", label: "Fly Speed", min: 2, max: 40, default: 12, decimals: 1 },
    { type: "bool", key: "noclip", label: "Noclip", default: false, desc: "hold the button to pass through walls and floors" },
    { type: "select", key: "noclipBtn", label: "Noclip Button", options: BTNS, default: "Right Trigger" },
    { type: "select", key: "gravity", label: "Gravity", options: ["Normal", "Low", "Moon", "Zero", "High", "Reverse"], default: "Normal" },
    { type: "bool", key: "platforms", label: "Platforms [grips]", default: false },
    { type: "select", key: "platColor", label: "Platform Color", options: PAL_NAMES, default: "Purple" },
    { type: "bool", key: "tpGun", label: "Teleport Gun [G + T]", default: false },
    { type: "bool", key: "ironMan", label: "Iron Man [grips]", default: false, desc: "each grip pushes you out of that palm" },
    { type: "bool", key: "dash", label: "Dash [A]", default: false, desc: "A launches you where you look" },
    { type: "float", key: "dashForce", label: "Dash Force", min: 4, max: 30, default: 12, decimals: 0 },
    { type: "float", key: "armScale", label: "Arm Length", min: 1, max: 1.6, default: 1, decimals: 2, desc: "scales the gorilla rig, 1 = normal" },
    { type: "bool", key: "noFreeze", label: "No Tag Freeze", default: false, desc: "keeps disableMovement off" },

    { type: "label", label: "Monsters" },
    { type: "bool", key: "botEsp", label: "Monster ESP", default: false, desc: "boxes on every monster and extraction enemy, through walls" },
    { type: "bool", key: "botTracers", label: "Monster Tracers", default: false },
    { type: "bool", key: "botTags", label: "Monster Name + Distance", default: false },
    { type: "select", key: "botColor", label: "Monster Color", options: PAL_NAMES, default: "Red" },
    { type: "float", key: "espAlpha", label: "ESP Opacity", min: 0.05, max: 0.8, default: 0.3, decimals: 2 },
    { type: "bool", key: "handInfo", label: "Hand Radar", default: false, desc: "nearest monster + count on your left hand" },

    { type: "label", label: "Host Tools (master client, private room only)" },
    { type: "select", key: "hMonSpeed", label: "Monster Speed", options: ["Normal", "Frozen", "Slow", "Fast", "Super Fast"], default: "Normal" },
    { type: "button", label: "Bring Monsters To Me", onClick: function () { try { bringMonsters(); } catch (e) { notify("Failed: " + e); } } },

    { type: "label", label: "Combat" },
    { type: "bool", key: "infAmmo", label: "Infinite Ammo", default: false, desc: "your own guns only" },
    { type: "bool", key: "rapidFire", label: "Rapid Fire", default: false, desc: "makes your gun automatic, hold the trigger" },
    { type: "bool", key: "aim", label: "Aim Assist [G]", default: false, desc: "while you hold right grip your gun's barrel points at the nearest monster / extraction enemy you can see. never targets players" },
    { type: "float", key: "aimRange", label: "Aim Range (m)", min: 5, max: 150, default: 60, decimals: 0 },
    { type: "bool", key: "aimWalls", label: "Aim Through Walls", default: false },

    { type: "label", label: "Players" },
    { type: "bool", key: "plEsp", label: "Player ESP", default: false },
    { type: "bool", key: "plTracers", label: "Player Tracers", default: false },
    { type: "bool", key: "plTags", label: "Player Name Tags", default: false },
    { type: "select", key: "plColor", label: "Player Color", options: PAL_NAMES, default: "Cyan" },

    { type: "label", label: "You" },
    { type: "bool", key: "rgb", label: "RGB Color", default: false, desc: "cycles your gorilla color (everyone sees it)" },
    { type: "select", key: "myColor", label: "Set Color", options: ["(keep)"].concat(PAL_NAMES), default: "(keep)" },
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
};

// ------------------------------------------------------------------------------------------
// init: the local GorillaLocomotion.Player. Its Instance getter and rigidbody field are scrambled, so
// the player comes from a static field of its own type (or FindObjectsOfType) and the rigidbody from
// the one instance field typed UnityEngine.Rigidbody.
// ------------------------------------------------------------------------------------------
function photon() { return img("PhotonUnityNetworking").class("Photon.Pun.PhotonNetwork"); }
function vrMgr() { return cs().class("Photon.VR.PhotonVRManager"); }
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
            G.Time = core().class("UnityEngine.Time");
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
        G.base = { maxJump: pl.field("maxJumpSpeed").value, jump: pl.field("jumpMultiplier").value };
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
function localVR() { return opt(function () { var m = vrMgr().method("get_Manager").invoke(); var lp = m.field("LocalPlayer").value; return alive(lp) ? lp : null; }, null); }
function isPrivateHost() {
    return opt(function () {
        if (!photon().method("get_InRoom").invoke() || !photon().method("get_IsMasterClient").invoke()) return false;
        var room = photon().method("get_CurrentRoom").invoke();
        return !!room && !room.isNull() && !room.method("get_IsVisible").invoke();
    }, false);
}

// ------------------------------------------------------------------------------------------
// movement
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
        try { G.head.method("set_enabled").invoke(false); } catch (e) {}
        try { G.body.method("set_enabled").invoke(false); } catch (e) {}
    } else if (noclipSaved) {
        h.writeS32(noclipSaved.mask);
        try { G.head.method("set_enabled").invoke(true); } catch (e) {}
        try { G.body.method("set_enabled").invoke(true); } catch (e) {}
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
var arm = { rig: null, at: 0, last: 1 };
function armStep() {
    var s = Number(p.armScale);
    if (s === arm.last) return;
    if (!alive(arm.rig)) arm.rig = opt(function () { return G.GameObject.method("Find").invoke(Il2Cpp.string("Gorilla Rig")); }, null);
    if (!alive(arm.rig)) return;
    tr(arm.rig).method("set_localScale").invoke([s, s, s]);
    arm.last = s;
}
function noFreezeStep() { if (p.noFreeze && G.player.field("disableMovement").value) G.player.field("disableMovement").value = false; }

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
var gun = { line: null, dot: null, prevTrig: false };
function gunHide() { if (gun.line) setActive(gun.line.go, false); if (gun.dot) setActive(gun.dot.go, false); }
function teleportTo(target) {
    tr(G.player).method("set_position").invoke(target);
    try { G.rb.method("set_position").invoke(target); G.rb.method("set_velocity").invoke([0, 0, 0]); } catch (e) {}
}
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
    if (trig && !gun.prevTrig) teleportTo(add3(hit.point, add3(mul3(hit.normal, 0.4), [0, 0.9, 0])));
    gun.prevTrig = trig;
}
function gunClear() { if (gun.line) destroyNow(gun.line.go); if (gun.dot) destroyNow(gun.dot.go); gun.line = gun.dot = null; }

// ------------------------------------------------------------------------------------------
// monsters: new AI (MonsterBehaviourBase, NavMeshAgent "agent"), extraction enemies
// (ExtractionBaseEnemyBehaviour, speed via ExtractionEnemyComponent.get_Speed) and the older per-level monster scripts
// ------------------------------------------------------------------------------------------
var MON_SRC = [
    ["BigScary.AI.MonsterBehaviourBase", "agent"],
    ["Extraction.ExtractionBaseEnemyBehaviour", null],
    ["monstercangoidklmao", "navMeshAgent"],
    ["Backroomsmonster", "agent2"],
    ["NAV2", "agent2"],
    ["littlemonster", null],
    ["monsteractiveate", null],
];
var mons = [], monScanAt = 0;
function prettyName(o) {
    // class name for the new AI (BasicMonster, SmileBall...), the object's own name for the old scripts
    // (NAV2 objects are called "monster nav", "ghost nav"...)
    var cn = opt(function () { return o.class.name; }, "Monster");
    var n = /^(NAV2|Backroomsmonster|monstercangoidklmao|monsteractiveate|littlemonster)$/.test(cn)
        ? opt(function () { return cstr(o.method("get_gameObject").invoke().method("get_name").invoke()).replace(/\(Clone\)/g, "").replace(/\s*nav$/i, ""); }, cn)
        : cn.replace(/(Behaviour|Behavior|Backrooms|Monster)+$/g, "").replace(/([a-z])([A-Z])/g, "$1 $2");
    n = String(n).trim();
    return n ? n.charAt(0).toUpperCase() + n.slice(1) : "Monster";
}
function monScan() {
    var t = now();
    if (t - monScanAt < 700) return;
    monScanAt = t;
    var seen = {}, out = [];
    MON_SRC.forEach(function (src) {
        var k = opt(function () { return cs().class(src[0]); }, null);
        if (!k) return;
        findObjs(k).forEach(function (o) {
            var key = o.handle.toString();
            if (seen[key]) return;
            seen[key] = 1;
            var agent = src[1] ? opt(function () { var a = o.field(src[1]).value; return alive(a) ? a : null; }, null) : null;
            out.push({ o: o, key: key, agent: agent, name: prettyName(o), extraction: src[0].indexOf("Extraction.") === 0 });
        });
    });
    mons = out;
}
function monsWanted() { return p.botEsp || p.botTracers || p.botTags || p.handInfo || p.aim || p.hMonSpeed !== "Normal" || monSpd.any; }
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
    mons.forEach(function (m) {
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

// host tools: only when you're master client in a room that isn't public
var SPD = { "Frozen": 0, "Slow": 0.4, "Fast": 2.5, "Super Fast": 12 };
var monSpd = { any: false, orig: {}, warnAt: 0, mul: 1, hook: null };
// extraction enemies keep their speed in a scrambled field, but ExtractionEnemyComponent.get_Speed() has its
// real name, so that getter gets wrapped and multiplied while a speed override is on
function exSpeedHook(on) {
    if (on && !monSpd.hook) {
        var m = cs().class("Extraction.ExtractionEnemyComponent").method("get_Speed", 0);
        m.implementation = function () { var v = this.method("get_Speed", 0).invoke(); return monSpd.any ? v * monSpd.mul : v; };
        monSpd.hook = m;
    } else if (!on && monSpd.hook) {
        try { monSpd.hook.revert(); } catch (e) {}
        monSpd.hook = null;
    }
}
function monSpeedStep() {
    var want = p.hMonSpeed !== "Normal";
    if (want && !isPrivateHost()) {
        if (now() - monSpd.warnAt > 8000) { monSpd.warnAt = now(); notify("Monster Speed: only works when you host a private room"); }
        want = false;
    }
    if (want) {
        var mul = SPD[p.hMonSpeed];
        monSpd.mul = mul;
        try { exSpeedHook(true); } catch (e) {}
        mons.forEach(function (m) {
            var k = m.key;
            if (m.agent) {
                if (!monSpd.orig[k]) monSpd.orig[k] = { a: m.agent, s: m.agent.method("get_speed").invoke(), acc: m.agent.method("get_acceleration").invoke() };
                var o = monSpd.orig[k];
                m.agent.method("set_speed").invoke(o.s * mul);
                m.agent.method("set_acceleration").invoke(Math.max(o.acc, o.acc * mul));
                try { m.agent.method("set_isStopped").invoke(mul === 0); } catch (e) {}
            }
        });
        monSpd.any = true;
    } else if (monSpd.any) {
        for (var k in monSpd.orig) {
            var o = monSpd.orig[k];
            try {
                if (o.a && alive(o.a)) { o.a.method("set_speed").invoke(o.s); o.a.method("set_acceleration").invoke(o.acc); o.a.method("set_isStopped").invoke(false); }
            } catch (e) {}
        }
        monSpd.orig = {}; monSpd.any = false;
        exSpeedHook(false);
    }
}
function bringMonsters() {
    if (!isPrivateHost()) { notify("Only works when you host a private room"); return; }
    monScanAt = 0; monScan();
    var me = pos3(G.player), n = 0;
    mons.forEach(function (m, i) {
        var a = (i / Math.max(1, mons.length)) * Math.PI * 2, at = add3(me, [Math.cos(a) * 4, 0, Math.sin(a) * 4]);
        try { if (m.agent) m.agent.method("Warp").invoke(at); else tr(m.o).method("set_position").invoke(at); n++; } catch (e) {}
    });
    notify("Brought " + n + " monster(s)");
}

// ------------------------------------------------------------------------------------------
// combat: only guns whose PhotonView is ours
// ------------------------------------------------------------------------------------------
var guns = { list: [], at: 0 };
function myGuns() {
    var t = now();
    if (t - guns.at > 1000) {
        guns.at = t;
        guns.list = findObjs(cs().class("Gun")).filter(function (g) {
            return opt(function () { var pv = g.field("photonView").value; return !alive(pv) || pv.method("get_IsMine").invoke(); }, false);
        });
    }
    guns.list = guns.list.filter(alive);
    return guns.list;
}
// the ammo counter's name changes every update, so learn it: the Int32 field that keeps matching the
// number on the gun's ammo text is the one. Then hold it at the highest value it has had.
var ammo = { score: {}, field: null, max: {}, lastN: {} };
function ammoStep() {
    if (!p.infAmmo) return;
    var GunK = cs().class("Gun");
    if (!ammo.ints) ammo.ints = GunK.fields.filter(function (f) { return !f.isStatic && f.type.name === "System.Int32"; });
    myGuns().forEach(function (g) {
        var key = g.handle.toString();
        if (!ammo.field) {
            // each time the number on the gun changes, every Int32 field holding that same number scores a
            // point (others go back to 0). Two changes in a row matched = that field is the ammo counter.
            var txt = opt(function () { return cstr(g.field("ammoText").value.method("get_text").invoke()); }, "");
            var m = txt.match(/\d+/), n = m ? parseInt(m[0], 10) : NaN;
            if (isNaN(n) || n === ammo.lastN[key]) return;
            ammo.lastN[key] = n;
            ammo.ints.forEach(function (f) { ammo.score[f.name] = g.handle.add(f.offset).readS32() === n ? (ammo.score[f.name] || 0) + 1 : 0; });
            var best = null, tie = false;
            for (var k in ammo.score) {
                if (ammo.score[k] < 2) continue;
                if (!best || ammo.score[k] > ammo.score[best]) { best = k; tie = false; } else if (ammo.score[k] === ammo.score[best]) tie = true;
            }
            if (best && !tie) { ammo.field = GunK.field(best); log("infinite ammo: ammo counter is " + best); }
            return;
        }
        var h = g.handle.add(ammo.field.offset), v = h.readS32();
        if (!(key in ammo.max) || v > ammo.max[key]) ammo.max[key] = v;
        if (v < ammo.max[key]) h.writeS32(ammo.max[key]);
    });
}
var rf = { on: false, was: {} };
function rapidStep() {
    if (p.rapidFire) {
        myGuns().forEach(function (g) {
            var k = g.handle.toString();
            if (!(k in rf.was)) rf.was[k] = { g: g, v: !!g.field("isAutomatic").value };
            if (!g.field("isAutomatic").value) g.field("isAutomatic").value = true;
        });
        rf.on = true;
    } else if (rf.on) {
        for (var k in rf.was) { var w = rf.was[k]; try { if (alive(w.g)) w.g.field("isAutomatic").value = w.v; } catch (e) {} }
        rf.was = {}; rf.on = false;
    }
}
// aim assist: point the gun's shootingPoint at the nearest monster (or move it right in front of the
// monster for through-walls). Put back as soon as the grip is released.
var aimS = { sp: null, pos: null, rot: null };
function aimReset() {
    if (aimS.sp && alive(aimS.sp)) { try { aimS.sp.method("set_localPosition").invoke(aimS.pos); aimS.sp.method("set_localRotation").invoke(aimS.rot); } catch (e) {} }
    aimS.sp = null;
}
function aimStep() {
    if (!p.aim || !input.grip(1)) { aimReset(); return; }
    var g = myGuns()[0];
    if (!g) { aimReset(); return; }
    var sp = g.field("shootingPoint").value;
    if (!alive(sp)) return;
    if (!aimS.sp || !same(aimS.sp, sp)) { aimReset(); aimS.sp = sp; aimS.pos = sp.method("get_localPosition").invoke(); aimS.rot = sp.method("get_localRotation").invoke(); }
    var from = pos3(sp), best = null;
    mons.forEach(function (m) {
        if (!m.pos) return;
        var target = add3(m.pos, [0, 1.0, 0]), d = len3(sub3(target, from));
        if (d > p.aimRange || (best && d >= best.d)) return;
        if (!p.aimWalls) { var hit = rayHit(from, mul3(sub3(target, from), 1 / d), d, -5); if (hit && hit.dist < d - 1.5) return; }
        best = { t: target, d: d };
    });
    if (!best) { sp.method("set_localPosition").invoke(aimS.pos); sp.method("set_localRotation").invoke(aimS.rot); return; }
    var dir = mul3(sub3(best.t, from), 1 / best.d);
    if (p.aimWalls && best.d > 2) sp.method("set_position").invoke(sub3(best.t, mul3(dir, 1.2)));
    sp.method("set_rotation").invoke(lookRot(dir));
}

// ------------------------------------------------------------------------------------------
// players
// ------------------------------------------------------------------------------------------
var plList = { list: [], at: 0 };
function playerEspStep() {
    var want = p.plEsp || p.plTracers || p.plTags;
    if (want) {
        var t = now();
        if (t - plList.at > 1000) { plList.at = t; plList.list = findObjs(cs().class("Photon.VR.Player.PhotonVRPlayer")); }
        var M = espMats(), me = localVR(), head = pos3(G.head), hand = pos3(G.rh);
        plList.list.forEach(function (pl) {
            if (!alive(pl) || (me && same(pl, me))) return;
            var ht = opt(function () { return pl.field("Head").value; }, null);
            if (!alive(ht)) return;
            var hp = X(ht.method("get_position").invoke()), k = pl.handle.toString();
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
                var name = opt(function () { return cstr(pl.field("NameText").value.method("get_text").invoke()); }, "") || opt(function () { return cstr(pl.field("cachedName").value); }, "") || "player";
                var d = len3(sub3(hp, head));
                setTag(poolGet(pools.plTag, k), add3(hp, [0, 0.45, 0]), name + "\n" + d.toFixed(0) + "m", Math.max(0.8, Math.min(5, d * 0.06)), head);
            }
        });
    }
    poolEnd(pools.plBox); poolEnd(pools.plLine); poolEnd(pools.plTag);
}

// ------------------------------------------------------------------------------------------
// you: color + name through the game's own PhotonVRManager calls
// ------------------------------------------------------------------------------------------
var colS = { at: 0, hue: 0, applied: "(keep)" };
function hsv(h) { var i = Math.floor(h * 6), f = h * 6 - i, q = 1 - f; return [[1, f, 0], [q, 1, 0], [0, 1, f], [0, q, 1], [f, 0, 1], [1, 0, q]][i % 6]; }
function setColour(c) { vrMgr().method("SetColour", 1).invoke([c[0], c[1], c[2], 1]); }
function colorStep() {
    var t = now();
    if (p.rgb) {
        if (t - colS.at < 250) return;
        colS.at = t; colS.hue = (colS.hue + 0.03) % 1;
        setColour(hsv(colS.hue));
    } else if (p.myColor !== colS.applied) {
        colS.applied = p.myColor;
        if (PAL[p.myColor]) { setColour(PAL[p.myColor]); notify("Color set"); }
    }
}
function applyName() {
    var n = String(p.newName || "").trim();
    if (!n) { notify("Type a name first"); return; }
    try { vrMgr().method("SetUsername", 1).invoke(Il2Cpp.string(n)); }
    catch (e) { photon().method("set_NickName", 1).invoke(Il2Cpp.string(n)); }
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
    safe("fly", function () { flyStep(dt); });
    safe("noclip", noclipStep);
    safe("gravity", gravityStep);
    safe("platforms", platformStep);
    safe("tpgun", tpGunStep);
    safe("ironman", function () { ironManStep(dt); });
    safe("dash", dashStep);
    safe("arms", armStep);
    safe("nofreeze", noFreezeStep);
    safe("monsters", monUpdate);
    safe("monesp", monEspStep);
    safe("radar", radarStep);
    safe("monspeed", monSpeedStep);
    safe("ammo", ammoStep);
    safe("rapid", rapidStep);
    safe("aim", aimStep);
    safe("players", playerEspStep);
    safe("color", colorStep);
});

onDisable(function () {
    try { for (var k in pools) poolClear(pools[k]); } catch (e) {}
    try { gunClear(); } catch (e) {}
    try { if (radar.tag) destroyNow(radar.tag.go); radar.tag = null; } catch (e) {}
    try { destroyNow(platL); destroyNow(platR); platL = platR = null; } catch (e) {}
    try { aimReset(); } catch (e) {}
    try { p.rapidFire = false; rapidStep(); } catch (e) {}
    try { p.hMonSpeed = "Normal"; monSpeedStep(); } catch (e) {}
    if (!G.ok || !alive(G.player)) return;
    try { if (noclipOn) noclipSet(false); } catch (e) {}
    try { if (speedWas) { G.player.field("maxJumpSpeed").value = G.base.maxJump; G.player.field("jumpMultiplier").value = G.base.jump; } } catch (e) {}
    try { if (arm.last !== 1 && alive(arm.rig)) tr(arm.rig).method("set_localScale").invoke([1, 1, 1]); } catch (e) {}
});

tab(function (ui) {
    ui.separator();
    ui.text("STATUS");
    if (G.initErr) ui.text("waiting: " + G.initErr);
    if (ammo.field) ui.text("ammo counter: " + ammo.field.name);
    else if (p.infAmmo) ui.text("infinite ammo: learning the ammo counter, fire a few shots");
    ui.text("monsters tracked: " + mons.length + (isPrivateHost() ? "  |  you host a private room" : ""));
});
