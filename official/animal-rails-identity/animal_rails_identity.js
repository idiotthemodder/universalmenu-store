// animal_rails_identity.js - rainbow player color + name changer for Animal Rails
// game: com.mingkun.animalrails
//
// Uses the game's own PlayerIdentity (the same object its name / color picker changes), so it goes through
// the normal "submit player data" path. The server can still filter names or rate limit changes, and
// everyone in the lobby sees what you set. Own file on purpose: it loads without touching animal_rails.js.

var p = props([
    { type: "label", label: "COLOR" },
    { type: "bool",  key: "rgb",         label: "Rainbow color", default: false },
    { type: "float", key: "rgbSpeed",    label: "Rainbow speed (cycles per sec)", min: 0.02, max: 1, default: 0.15, decimals: 2 },
    { type: "int",   key: "rgbInterval", label: "Send color every (ms), keep it slow", min: 250, max: 3000, default: 500 },
    { type: "float", key: "hue",         label: "Fixed hue", min: 0, max: 1, default: 0.5, decimals: 2 },
    { type: "float", key: "sat",         label: "Saturation", min: 0, max: 1, default: 1, decimals: 2 },
    { type: "float", key: "val",         label: "Brightness", min: 0, max: 1, default: 1, decimals: 2 },
    { type: "button", label: "Apply fixed color", onClick: function () { setColor(p.hue, p.sat, p.val); } },
    { type: "button", label: "Random color", onClick: function () { setColor(Math.random(), 0.7 + Math.random() * 0.3, 0.8 + Math.random() * 0.2); } },
    { type: "button", label: "Restore original color", onClick: function () { restoreColor(); } },
]);

var PRESETS = [
    "Conductor", "Caboose", "Choo Choo", "Coal Goblin", "Rail Rat", "Night Rider",
    "Steam Fox", "Ticket Inspector", "Last Stop", "Stowaway", "Boxcar Bandit", "Engineer",
];

// ---------------------------------------------------------------- helpers
var asm = null, kc = {};
function K(name) {
    try {
        if (kc[name]) return kc[name];
        if (!asm) asm = Il2Cpp.domain.assembly("Assembly-CSharp").image;
        var k = asm.tryClass(name);
        if (k) kc[name] = k;
        return k;
    } catch (e) { return null; }
}
function KA(name) {
    try {
        if (kc[name]) return kc[name];
        var all = Il2Cpp.domain.assemblies;
        for (var i = 0; i < all.length; i++) {
            try { var k = all[i].image.tryClass(name); if (k) { kc[name] = k; return k; } } catch (e) {}
        }
    } catch (e) {}
    return null;
}
function str(o) { try { return o && !o.handle.isNull() ? o.content : ""; } catch (e) { return ""; } }

// finds your own PlayerIdentity (the PlayerNetworkState you have input authority over)
var ident = null, identAt = 0;
function getIdent() {
    var now = Date.now();
    try {
        if (ident && !ident.handle.isNull() && now - identAt < 10000) return ident;
        ident = null;
        var k = K("AnimalRails.Player.PlayerNetworkState");
        if (!k) return null;
        var list = Il2Cpp.gc.choose(k);
        for (var i = 0; i < list.length; i++) {
            try {
                var st = list[i];
                if (!st.method("get_HasInputAuthority", 0).invoke()) continue;
                var id = st.method("get_Identity", 0).invoke();
                if (id && !id.handle.isNull()) { ident = id; identAt = now; return ident; }
            } catch (e) {}
        }
    } catch (e) { log("identity lookup: " + e); }
    return null;
}

function hsv(h, s, v) {
    var C = KA("UnityEngine.Color");
    return C.method("HSVToRGB", 3).invoke(h, s, v);
}

var origName = null, origColor = null;
function remember(id) {
    if (origName === null) { try { origName = str(id.method("get_nameTag", 0).invoke()); } catch (e) {} }
    if (origColor === null) { try { origColor = id.method("get_color", 0).invoke(); } catch (e) {} }
}

function apply(name, color) {
    var id = getIdent();
    if (!id) { notify("couldn't find your player yet, load into a lobby first"); return false; }
    try {
        remember(id);
        if (name !== null) id.method("set_nameTag", 1).invoke(Il2Cpp.string(name));
        if (color) id.method("set_color", 1).invoke(color);
        id.method("NotifyChangedLocally", 0).invoke();
        return true;
    } catch (e) {
        log("apply failed: " + e);
        ident = null;
        notify("change failed, see log");
        return false;
    }
}

function setColor(h, s, v) { apply(null, hsv(h, s, v)); }
function restoreColor() {
    if (origColor === null) { notify("no original color saved yet"); return; }
    apply(null, origColor);
}

function utf8Len(s) { return unescape(encodeURIComponent(s)).length; }
function setName(raw) {
    var name = String(raw || "").trim();
    if (!name) { notify("type a name first"); return; }
    if (utf8Len(name) > 28) { notify("name too long (max about 28 characters)"); return; }
    if (apply(name, null)) notify("name set to " + name);
}
function restoreName() {
    if (origName === null) { notify("no original name saved yet"); return; }
    apply(origName, null);
    notify("name restored");
}

// ---------------------------------------------------------------- rainbow loop
var nextRgb = 0, rgbWasOn = false;
onFrame(function () {
    try {
        if (p.rgb) {
            rgbWasOn = true;
            var now = Date.now();
            if (now < nextRgb) return;
            nextRgb = now + p.rgbInterval;
            var h = ((now / 1000) * p.rgbSpeed) % 1;
            apply(null, hsv(h, 1, 1));
        } else if (rgbWasOn) {
            rgbWasOn = false;
            restoreColor();
        }
    } catch (e) { log("rgb: " + e); }
});

// ---------------------------------------------------------------- tab
var nameRef = ref(""), presetIdx = 0, curName = "", nextCur = 0;
tab(function (ui) {
    var now = Date.now();
    if (now > nextCur) {
        nextCur = now + 1000;
        try { var id = getIdent(); curName = id ? str(id.method("get_nameTag", 0).invoke()) : "(not found yet)"; } catch (e) { curName = "?"; }
    }

    ui.text("NAME");
    ui.text("current: " + curName);
    ui.inputText("Custom name", nameRef);
    if (ui.button("Apply custom name")) setName(nameRef.v);

    ui.separator();
    ui.text("Preset " + (presetIdx + 1) + "/" + PRESETS.length + ":  " + PRESETS[presetIdx]);
    if (ui.button("< prev")) presetIdx = (presetIdx + PRESETS.length - 1) % PRESETS.length;
    ui.sameLine(); if (ui.button("next >")) presetIdx = (presetIdx + 1) % PRESETS.length;
    if (ui.button("Apply preset")) setName(PRESETS[presetIdx]);
    ui.sameLine(); if (ui.button("Random preset")) { presetIdx = Math.floor(Math.random() * PRESETS.length); setName(PRESETS[presetIdx]); }

    ui.separator();
    if (ui.button("Restore original name")) restoreName();
});

onDisable(function () {
    try { if (rgbWasOn) restoreColor(); } catch (e) {}
});

log("animal rails identity loaded");
