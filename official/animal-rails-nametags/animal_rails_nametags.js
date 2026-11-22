// animal_rails_nametags.js - customizable nametags for Animal Rails
// game: com.mingkun.animalrails
//
// The game already draws a TextMeshPro nametag (PlayerIdentityBindings._nameTagVisual) for every player.
// This restyles those local tags: font, size, color, bold / italic, spacing, plus extra info lines.
// Only things your client already has are shown (name, the player's color code, distance). Account creation
// dates are not sent to other players' clients, so there is nothing to show there.
// Everything is local, nobody else sees your styling.

var p = props([
    { type: "label", label: "NAMETAGS" },
    { type: "bool",  key: "nt",        label: "Custom nametags", default: false },
    { type: "float", key: "sizeMult",  label: "Size multiplier", min: 0.5, max: 4, default: 1.5, decimals: 1 },
    { type: "int",   key: "colorMode", label: "Name color: 0 game, 1 player color, 2 fixed, 3 rainbow", min: 0, max: 3, default: 1 },
    { type: "float", key: "hue",       label: "Fixed hue", min: 0, max: 1, default: 0.55, decimals: 2 },
    { type: "float", key: "sat",       label: "Fixed saturation", min: 0, max: 1, default: 0.8, decimals: 2 },
    { type: "float", key: "val",       label: "Fixed brightness", min: 0, max: 1, default: 1, decimals: 2 },
    { type: "float", key: "rgbSpeed",  label: "Rainbow speed", min: 0.05, max: 2, default: 0.3, decimals: 2 },
    { type: "bool",  key: "bold",      label: "Bold", default: false },
    { type: "bool",  key: "italic",    label: "Italic", default: false },
    { type: "float", key: "spacing",   label: "Letter spacing", min: -5, max: 20, default: 0, decimals: 1 },

    { type: "label", label: "INFO LINES" },
    { type: "bool",  key: "showHex",   label: "Show color code", default: true },
    { type: "bool",  key: "showDist",  label: "Show distance", default: true },
    { type: "float", key: "lineScale", label: "Info line size (%)", min: 40, max: 100, default: 65, decimals: 0 },
]);

// ---------------------------------------------------------------- helpers
var kc = {};
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

function myPos() {
    try {
        var h = ui.rig.head();
        if (!h) return null;
        return ui.read3(h.method("get_position", 0).invoke());
    } catch (e) { return null; }
}
function dist(a, b) {
    var dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function hsv(h, s, v) {
    var C = KA("UnityEngine.Color");
    return C.method("HSVToRGB", 3).invoke(h, s, v);
}
function hex2(v) {
    var n = Math.max(0, Math.min(255, Math.round(v * 255)));
    return (n < 16 ? "0" : "") + n.toString(16).toUpperCase();
}
function colorHex(col) {
    try { return "#" + hex2(col.field("r").value) + hex2(col.field("g").value) + hex2(col.field("b").value); }
    catch (e) { return "#??????"; }
}

// ---------------------------------------------------------------- fonts
var fonts = [], fontIdx = -1, fontVer = 0, nextFonts = 0;
function scanFonts() {
    try {
        var k = KA("TMPro.TMP_FontAsset");
        if (!k) { log("TMP_FontAsset not found"); return; }
        var seen = {}, out = [];
        Il2Cpp.gc.choose(k).forEach(function (f) {
            var n = str(f.method("get_name", 0).invoke());
            if (!n || seen[n]) return;
            seen[n] = true;
            out.push({ obj: f, name: n });
        });
        out.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
        fonts = out;
        log("fonts found: " + out.length);
    } catch (e) { log("scanFonts: " + e); }
}

// ---------------------------------------------------------------- tag styling
var bindings = [], nextScan = 0, orig = {}, applied = {};
function scanBindings() {
    try {
        var k = KA("Normal.GorillaTemplate.PlayerIdentityBindings");
        if (k) bindings = Il2Cpp.gc.choose(k);
    } catch (e) { log("scanBindings: " + e); }
}

function styleTag(b, now, me, index) {
    var vis = b.field("_nameTagVisual").value;
    if (!vis || vis.handle.isNull()) return;
    var key = String(vis.handle);
    var o = orig[key];
    if (!o) {
        o = orig[key] = {
            vis: vis,
            font: vis.method("get_font", 0).invoke(),
            color: vis.method("get_color", 0).invoke(),
            size: vis.method("get_fontSize", 0).invoke(),
            style: vis.method("get_fontStyle", 0).invoke(),
            spacing: vis.method("get_characterSpacing", 0).invoke(),
            text: str(vis.method("get_text", 0).invoke()),
        };
        applied[key] = {};
    }
    var a = applied[key];

    // text: name, then optional small info lines
    var name = str(b.field("_nameTag").value) || o.text;
    var col = b.field("_color").value;
    var extra = [];
    if (p.showHex) extra.push(colorHex(col));
    if (p.showDist && me) {
        try {
            var tp = ui.read3(vis.method("get_transform", 0).invoke().method("get_position", 0).invoke());
            extra.push(Math.round(dist(me, tp)) + " m");
        } catch (e) {}
    }
    var text = name;
    if (extra.length) text += "\n<size=" + Math.round(p.lineScale) + "%><color=#C8C8C8>" + extra.join("   ") + "</color></size>";
    if (a.text !== text) { vis.method("set_text", 1).invoke(Il2Cpp.string(text)); a.text = text; }

    // size
    var size = o.size * p.sizeMult;
    if (a.size !== size) {
        vis.method("set_enableAutoSizing", 1).invoke(false);
        vis.method("set_fontSize", 1).invoke(size);
        a.size = size;
    }

    // font
    var fid = fontIdx < 0 ? "default" : fontIdx + ":" + fontVer;
    if (a.font !== fid) {
        vis.method("set_font", 1).invoke(fontIdx < 0 ? o.font : fonts[fontIdx].obj);
        a.font = fid;
    }

    // style + spacing
    var style = (p.bold ? 1 : 0) | (p.italic ? 2 : 0);
    if (a.style !== style) { vis.method("set_fontStyle", 1).invoke(style); a.style = style; }
    if (a.spacing !== p.spacing) { vis.method("set_characterSpacing", 1).invoke(p.spacing); a.spacing = p.spacing; }

    // color
    if (p.colorMode === 0) {
        if (a.colored) { vis.method("set_color", 1).invoke(o.color); a.colored = false; }
    } else if (p.colorMode === 1) {
        vis.method("set_color", 1).invoke(col);
        a.colored = true;
    } else if (p.colorMode === 2) {
        vis.method("set_color", 1).invoke(hsv(p.hue, p.sat, p.val));
        a.colored = true;
    } else {
        var h = ((now / 1000) * p.rgbSpeed + index * 0.12) % 1;
        vis.method("set_color", 1).invoke(hsv(h, 0.9, 1));
        a.colored = true;
    }
}

function restoreAll() {
    Object.keys(orig).forEach(function (key) {
        var o = orig[key];
        try {
            var v = o.vis;
            v.method("set_font", 1).invoke(o.font);
            v.method("set_color", 1).invoke(o.color);
            v.method("set_fontSize", 1).invoke(o.size);
            v.method("set_fontStyle", 1).invoke(o.style);
            v.method("set_characterSpacing", 1).invoke(o.spacing);
            v.method("set_text", 1).invoke(Il2Cpp.string(o.text));
        } catch (e) {}
    });
    orig = {};
    applied = {};
}

var nextTick = 0, wasOn = false, errLogged = false;
onFrame(function () {
    if (!p.nt) {
        if (wasOn) { wasOn = false; try { restoreAll(); } catch (e) {} }
        return;
    }
    if (!wasOn) { wasOn = true; nextScan = 0; }
    var now = Date.now();
    if (now < nextTick) return;
    nextTick = now + 120;
    if (now > nextScan) { nextScan = now + 3000; scanBindings(); }
    var me = myPos();
    var i = 0;
    bindings.forEach(function (b) {
        try { styleTag(b, now, me, i++); }
        catch (e) { if (!errLogged) { errLogged = true; log("nametag style: " + e); } }
    });
});

// ---------------------------------------------------------------- tab (font picker)
tab(function (ui) {
    var now = Date.now();
    if (!fonts.length && now > nextFonts) { nextFonts = now + 4000; scanFonts(); }

    ui.text("NAMETAG FONT");
    ui.text("current: " + (fontIdx < 0 ? "game default" : fonts[fontIdx].name) + (fonts.length ? "   (" + fonts.length + " loaded)" : ""));
    if (fonts.length) {
        if (ui.button("< prev font")) { fontIdx = fontIdx <= 0 ? fonts.length - 1 : fontIdx - 1; fontVer++; }
        ui.sameLine(); if (ui.button("next font >")) { fontIdx = (fontIdx + 1) % fonts.length; fontVer++; }
    }
    if (ui.button("Game default font")) { fontIdx = -1; fontVer++; }
    ui.sameLine(); if (ui.button("Rescan fonts")) { fonts = []; fontIdx = -1; nextFonts = 0; scanFonts(); }
    ui.text("turn on Custom nametags above, then step through the fonts");
});

onDisable(function () {
    try { restoreAll(); } catch (e) {}
});

log("animal rails nametags loaded");
