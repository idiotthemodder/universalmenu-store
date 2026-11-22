// animal_rails.js - Animal Rails (com.mingkun.animalrails) plugin for the universal Frida menu
// game: com.mingkun.animalrails
//
// Trimmed version: train mods, the spawner, nights, building jump, and the info panel.
// Everything goes through the game's own GM service (TrainGmRuntimeService), the part that worked.
// Make sure the old animal_rails2.js is deleted from the headset so two copies don't fight.

var p = props([
    { type: "label", label: "OWN SESSION (experimental)" },
    { type: "button", label: "Host My Own Session", desc: "0.3.17 runs matches on dedicated servers, so GM tools only work where you are host. This starts a private session on your headset with the game's own leftover StartHostAsync. Press it from the lobby, alone", onClick: function () { hostOwn(); } },
    { type: "button", label: "Session Info (log)", onClick: function () { sessionInfo(); } },
    { type: "label", label: "TRAIN" },
    { type: "bool",  key: "infFuel",   label: "Infinite fuel", default: false },
    { type: "bool",  key: "autoDrive", label: "Auto drive", default: false },
    { type: "float", key: "fuelAmount", label: "Fuel to add", min: 10, max: 500, default: 100, decimals: 0 },
    { type: "button", label: "Add fuel", onClick: function () { call("AddFuel", [p.fuelAmount]); } },
    { type: "int",   key: "jumpMeters", label: "Jump distance (m)", min: 100, max: 5000, default: 500 },
    { type: "button", label: "Jump train forward", onClick: function () { jumpForward(); } },
    { type: "button", label: "Jump train to destination", onClick: function () { jumpToEnd(); } },
    { type: "button", label: "Teleport me to train", onClick: function () { call("TeleportLocalPlayerToTrain", []); } },

    { type: "label", label: "STAY ON THE TRAIN" },
    { type: "bool",  key: "autoReturn", label: "Auto return me to the train", default: false },
    { type: "float", key: "returnDist", label: "Return if farther than (m)", min: 10, max: 150, default: 40, decimals: 0 },

    { type: "label", label: "WORLD" },
    { type: "bool",  key: "freezeTime", label: "Freeze time", default: false },

    { type: "label", label: "SPAWNER" },
    { type: "int",   key: "spawnCount", label: "Spawn amount", min: 1, max: 20, default: 1 },
]);

// ---------------------------------------------------------------- helpers
var asm = null, kcache = {};
function K(name) {
    try {
        if (kcache[name]) return kcache[name];
        if (!asm) asm = Il2Cpp.domain.assembly("Assembly-CSharp").image;
        var k = asm.tryClass(name);
        if (k) kcache[name] = k;
        return k;
    } catch (e) { log("class lookup failed " + name + ": " + e); return null; }
}
function str(o) { try { return o && !o.handle.isNull() ? o.content : ""; } catch (e) { return ""; } }

function readList(list) {
    var out = [];
    if (!list || list.handle.isNull()) return out;
    try {
        var n = list.method("get_Count", 0).invoke();
        for (var i = 0; i < n; i++) out.push(list.method("get_Item", 1).invoke(i));
        return out;
    } catch (e) {}
    try {
        var arr = new Il2Cpp.Array(list.handle);
        for (var j = 0; j < arr.length; j++) out.push(arr.get(j));
    } catch (e2) { log("readList: " + e2); }
    return out;
}

// ---- own session: the game's unused FusionSessionManager.StartHostAsync ----
function sessionMgr() {
    var k = K("AnimalRails.Network.FusionNet.FusionSessionManager");
    if (!k) return null;
    var core = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
    var arr = core.class("UnityEngine.Object").method("FindObjectsOfType", 2).overload("System.Type", "System.Boolean").invoke(k.type.object, true);
    return arr && arr.length ? arr.get(0) : null;
}
function sessionInfo() {
    try {
        var s = getSvc();
        var net = s ? String(s.method("get_FusionNetworkLabel", 0).invoke().content) : "?";
        log("session: " + net + (sessionMgr() ? "" : " (no FusionSessionManager found)"));
        notify("session: " + net, 4);
    } catch (e) { log("session info: " + e); }
}
function hostOwn() {
    try {
        var m = sessionMgr();
        if (!m) { notify("FusionSessionManager not found, open this in the lobby"); return; }
        m.method("StartHostAsync", 0).invoke();
        log("own session: StartHostAsync called, checking the session in 5 and 15 seconds");
        notify("starting your own session...", 3);
        mainThread(sessionInfo, 5000);    // game calls belong on Unity's main thread
        mainThread(sessionInfo, 15000);
    } catch (e) { log("own session failed: " + e); notify("own session failed, see log"); }
}

var svc = null;
function getSvc() {
    try {
        if (svc && !svc.handle.isNull()) return svc;
        svc = null;
        var k = K("AnimalRails.UI.TrainGmRuntimeService");
        if (!k) return null;
        var found = Il2Cpp.gc.choose(k);
        if (found.length) {
            svc = found[0];
        } else {
            svc = k.new();
            svc.method(".ctor").invoke();
        }
        svc.method("Refresh", 1).invoke(true);
        log("GM service ready (" + (found.length ? "found existing" : "created new") + ")");
    } catch (e) { log("GM service: " + e); svc = null; }
    return svc;
}

var lastRefresh = 0;
function svcFresh() {
    var s = getSvc();
    if (!s) return null;
    try {
        var now = Date.now();
        if (now - lastRefresh > 1000) { lastRefresh = now; s.method("Refresh", 1).invoke(false); }
    } catch (e) {}
    return s;
}

function call(name, args) {
    var s = svcFresh();
    if (!s) { notify("GM service not found yet, try again in a moment"); return null; }
    try {
        var m = s.method(name, args.length);
        var r = m.invoke.apply(m, args);
        // the GM service writes why a request did or did not go through here (0.3.17 moved sessions to dedicated servers)
        try {
            var st = s.method("get_StatusMessage", 0).invoke(), txt = st && !st.isNull() ? String(st.content) : "";
            if (txt) { log(name + " -> " + txt); notify(txt, 3); }
        } catch (e2) {}
        try { log("network: " + String(s.method("get_FusionNetworkLabel", 0).invoke().content)); } catch (e3) {}
        return r;
    } catch (e) {
        log(name + " failed: " + e);
        notify(name + " failed, see log");
        return null;
    }
}

function train() {
    try {
        var k = K("AnimalRails.Train.TrainController");
        if (!k) return null;
        var t = k.method("get_ActiveInstance", 0).invoke();
        if (t && !t.handle.isNull()) return t;
    } catch (e) {}
    return null;
}

function myPos() {
    try {
        var h = ui.rig.head();
        if (!h) return null;
        return ui.read3(h.method("get_position", 0).invoke());
    } catch (e) { return null; }
}
function trainPos() {
    try {
        var t = train();
        if (!t) return null;
        return ui.read3(t.method("get_transform", 0).invoke().method("get_position", 0).invoke());
    } catch (e) { return null; }
}
function dist(a, b) {
    var dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function jumpForward() {
    var t = train();
    if (!t) { notify("no train found"); return; }
    var cur = t.method("get_Mileage", 0).invoke();
    call("RequestJumpToMileageMeters", [cur + p.jumpMeters, Il2Cpp.string("plugin"), true]);
}
function jumpToEnd() {
    var t = train();
    if (!t) { notify("no train found"); return; }
    var target = t.method("get_TargetMileage", 0).invoke();
    call("RequestJumpToMileageMeters", [Math.max(0, target - 5), Il2Cpp.string("plugin"), true]);
}

// ---------------------------------------------------------------- toggles (only react when you change them)
var last = {};
["infFuel", "autoDrive", "freezeTime"].forEach(function (k) { last[k] = p[k]; });
function edge(key, fn) {
    if (last[key] !== p[key]) { last[key] = p[key]; fn(p[key]); }
}
function applyToggles() {
    edge("infFuel",    function (v) { call("SetInfiniteFuel", [v]); });
    edge("autoDrive",  function (v) { call("SetAutoDrive", [v]); });
    edge("freezeTime", function (v) { call("RequestSetTimePaused", [v]); });
}

// re-apply every couple of seconds in case the game resets them (new train, scene change)
var nextKeep = 0;
function keepApplied() {
    var now = Date.now();
    if (now < nextKeep) return;
    nextKeep = now + 2500;
    var s = svc;
    if (!s) return;
    try {
        if (p.infFuel && !s.method("get_InfiniteFuel", 0).invoke()) call("SetInfiniteFuel", [true]);
        if (p.autoDrive && !s.method("get_AutoDriveActive", 0).invoke()) call("SetAutoDrive", [true]);
    } catch (e) { log("keepApplied: " + e); }
}

// ---------------------------------------------------------------- auto return to the train (moves only you)
var nextReturn = 0;
function returnTick() {
    if (!p.autoReturn) return;
    var now = Date.now();
    if (now < nextReturn) return;
    nextReturn = now + 1500;
    var tp = trainPos(), me = myPos();
    if (!tp || !me) return;
    if (dist(me, tp) > p.returnDist) {
        nextReturn = now + 8000;
        call("TeleportLocalPlayerToTrain", []);
        notify("you fell off, sending you back to the train");
    }
}

onFrame(function () {
    try { applyToggles(); } catch (e) { log("toggles: " + e); }
    try { keepApplied(); } catch (e) {}
    try { returnTick(); } catch (e) { log("return: " + e); }
});

// ---------------------------------------------------------------- tab data
var info = {}, nextInfo = 0;
function refreshInfo() {
    var s = svc;
    if (!s) { getSvc(); return; }
    var keys = { net: "get_FusionNetworkLabel", fuel: "get_TrainFuelLabel", speed: "get_TrainSpeedLabel",
                 mile: "get_TrainMileageLabel", time: "get_CurrentGameTimeLabel", night: "get_CurrentNightLabel",
                 hp: "get_LocalHealthLabel" };
    Object.keys(keys).forEach(function (k) {
        try { info[k] = str(s.method(keys[k], 0).invoke()); } catch (e) { info[k] = "?"; }
    });
}

var CATS = ["Item", "Ranged weapon", "Melee weapon", "Bullet", "Enemy", "Friendly", "Neutral"];
var catRef = ref(4), lastCat = -1, idx = 0, ents = [], nextLoad = 0;
function loadCat() {
    var s = svcFresh();
    if (!s) return;
    try {
        s.method("EnsureSpawnCatalog", 1).invoke(false);
        var list = s.method("GetSpawnCatalogEntries", 1).invoke(catRef.v + 1);
        ents = readList(list).map(function (e) {
            return { id: str(e.method("get_EntityId", 0).invoke()) || "?", label: str(e.method("get_DisplayLabel", 0).invoke()) };
        });
        log("catalog " + CATS[catRef.v] + ": " + ents.length + " entries");
    } catch (e) { log("catalog: " + e); }
}
function spawnSelected() {
    var e = ents[idx];
    if (!e) { notify("nothing selected"); return; }
    var n = p.spawnCount;
    for (var i = 0; i < n; i++) {
        mainThread(function () { call("SpawnEntityInFrontAsync", [Il2Cpp.string(e.id)]); }, i * 250);
    }
    notify("spawning " + n + "x " + (e.label || e.id));
}

var nights = [], nightIdx = 0, nextNight = 0;
function loadNights() {
    var s = svcFresh();
    if (!s) return;
    try {
        nights = readList(s.method("GetNightTypeEntries", 0).invoke()).map(function (e) {
            return { id: e.method("get_NightTypeId", 0).invoke(), label: str(e.method("get_DisplayLabel", 0).invoke()) };
        });
        log("night types: " + nights.length);
    } catch (e) { log("nights: " + e); }
}

var buildings = [], bIdx = 0, nextB = 0;
function loadBuildings() {
    var s = svcFresh();
    if (!s) return;
    try {
        s.method("EnsureBuildingJumpCatalog", 1).invoke(false);
        buildings = readList(s.method("get_BuildingJumpEntries", 0).invoke()).map(function (e) {
            return {
                key: str(e.method("get_UniqueKey", 0).invoke()),
                label: str(e.method("get_DisplayLabel", 0).invoke()),
                km: Math.round(e.method("get_MileageMeters", 0).invoke() / 100) / 10,
            };
        });
        log("buildings: " + buildings.length);
    } catch (e) { log("buildings: " + e); }
}

// ---------------------------------------------------------------- environment events (weather etc.)
// Goes through the GM service's RequestDebugEnvironmentEvent(id, phase, exit, out requestId, out completed).
// The two out params are passed as raw memory. The server's answer comes back through
// HandleEnvironmentEventResult, which is hooked below just to show you what it said.
var events = [], evIdx = 0, nextEv = 0, evStatus = "";
function loadEvents() {
    var s = svcFresh();
    if (!s) return;
    try {
        events = readList(s.method("GetEnvironmentEventEntries", 0).invoke()).map(function (e) {
            return {
                id: e.method("get_EventTypeId", 0).invoke(),
                phase: e.method("get_Phase", 0).invoke(),
                label: str(e.method("get_DisplayLabel", 0).invoke()) || str(e.method("get_Name", 0).invoke()),
            };
        });
        log("environment events: " + events.length);
    } catch (e) { log("events: " + e); }
}
function runEvent(stop) {
    var s = svcFresh();
    if (!s) { notify("GM service not found"); return; }
    var ev = events[evIdx];
    if (!ev) { notify("no event selected"); return; }
    try {
        var rid = Memory.alloc(8), done = Memory.alloc(8);
        rid.writeS32(0);
        done.writeU8(0);
        var m = s.method("RequestDebugEnvironmentEvent", 5);
        var ok = m.invoke(ev.id, ev.phase, stop, rid, done);
        var completed = done.readU8() !== 0;
        evStatus = (stop ? "stop " : "start ") + ev.label + ": " + (ok ? "sent" : "not sent") +
                   (completed ? ", done" : ", waiting for the server") + " (request " + rid.readS32() + ")";
        log(evStatus);
        notify(evStatus);
    } catch (e) {
        log("runEvent: " + e);
        notify("event request failed, see log");
    }
}
Il2Cpp.perform(function () {
    try {
        var k = K("AnimalRails.UI.TrainGmRuntimeService");
        var m = k.method("HandleEnvironmentEventResult", 3);
        m.implementation = function (requestId, success, msg) {
            try {
                var text = "";
                try { text = msg ? msg.content : ""; } catch (e2) {}
                evStatus = "server said: " + (success ? "ok" : "refused") + (text ? " (" + text + ")" : "");
                log(evStatus);
                notify(evStatus);
            } catch (e) {}
            var orig = this.method("HandleEnvironmentEventResult", 3);
            return orig.invoke(requestId, success, msg);
        };
    } catch (e) { log("event result hook: " + e); }
});

// ---------------------------------------------------------------- custom time
// Goes through the GM service's RequestTimeJump(day, clock). The day and sun times are read from the game's TimeManager.
var clockRef = ref("12:00"), dayRef = ref("");
function tmgr() {
    var s = svcFresh();
    if (!s) return null;
    try {
        var t = s.field("_timeManager").value;
        if (t && !t.handle.isNull()) return t;
    } catch (e) {}
    return null;
}
function fmtClock(h) {
    h = ((h % 24) + 24) % 24;
    var hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    if (mm === 60) { hh = (hh + 1) % 24; mm = 0; }
    return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
}
function tmGet(name, fallback) {
    try { var t = tmgr(); if (t) return t.method(name, 0).invoke(); } catch (e) {}
    return fallback;
}
function jumpTime(clock, day) {
    if (!day) day = String(tmGet("get_CurrentDay", 1));
    var ok = call("RequestTimeJump", [Il2Cpp.string(String(day)), Il2Cpp.string(clock)]);
    notify(ok ? "time set to " + clock + " (day " + day + ")" : "time jump refused, check the clock format (HH:MM)");
}

// small picker row: label + prev/next buttons, returns new index
function picker(ui, title, list, i, labelFn) {
    if (!list.length) return i;
    if (i >= list.length) i = list.length - 1;
    ui.text(title + " " + (i + 1) + "/" + list.length + ":  " + labelFn(list[i]));
    if (ui.button("<<##" + title)) i = Math.max(0, i - 10);
    ui.sameLine(); if (ui.button("<##" + title)) i = Math.max(0, i - 1);
    ui.sameLine(); if (ui.button(">##" + title)) i = Math.min(list.length - 1, i + 1);
    ui.sameLine(); if (ui.button(">>##" + title)) i = Math.min(list.length - 1, i + 10);
    return i;
}

tab(function (ui) {
    var now = Date.now();

    // ---- live info
    if (now > nextInfo) { nextInfo = now + 500; refreshInfo(); }
    ui.text("INFO");
    ui.text("network: " + (info.net || "?"));
    ui.text("train: " + (info.fuel || "?") + "   " + (info.speed || "?") + "   " + (info.mile || "?"));
    ui.text("time: " + (info.time || "?") + "   night: " + (info.night || "?") + "   hp: " + (info.hp || "?"));

    // ---- spawner
    ui.separator();
    ui.text("SPAWNER (in front of you, through the game's GM spawn)");
    ui.combo("Category", catRef, CATS);
    if (catRef.v !== lastCat) { lastCat = catRef.v; idx = 0; ents = []; nextLoad = 0; }
    if (!ents.length && now > nextLoad) { nextLoad = now + 2000; loadCat(); }
    if (!ents.length) {
        ui.text("catalog empty, load into a game then press Refresh");
    } else {
        idx = picker(ui, "item", ents, idx, function (e) { return (e.label || e.id) + "  [" + e.id + "]"; });
        if (ui.button("Spawn selected")) spawnSelected();
        ui.sameLine();
        if (ui.button("Add to backpack")) {
            var e = ents[idx];
            if (e) call("StoreEntityToBackpack", [Il2Cpp.string(e.id)]);
        }
    }
    if (ui.button("Refresh catalog")) { ents = []; nextLoad = 0; loadCat(); }

    // ---- nights
    ui.separator();
    ui.text("NIGHTS (game's own debug night start / exit)");
    if (!nights.length && now > nextNight) { nextNight = now + 3000; loadNights(); }
    if (!nights.length) {
        ui.text("no night types loaded yet");
    } else {
        nightIdx = picker(ui, "night", nights, nightIdx, function (n) { return n.label; });
        if (ui.button("Start this night")) call("RequestDebugStartNightType", [nights[nightIdx].id]);
        ui.sameLine();
        if (ui.button("Exit night")) call("RequestDebugExitNight", []);
    }
    if (ui.button("Refresh nights")) { nights = []; nextNight = 0; loadNights(); }

    // ---- time
    ui.separator();
    ui.text("TIME (set the clock, day is optional)");
    ui.text("now: " + (info.time || "?"));
    ui.inputText("Clock (HH:MM)", clockRef);
    ui.inputText("Day (blank = today)", dayRef);
    if (ui.button("Set time")) jumpTime((clockRef.v || "").trim() || "12:00", (dayRef.v || "").trim());
    if (ui.button("Sunrise")) jumpTime(fmtClock(tmGet("get_SunriseTimeHours", 6)), "");
    ui.sameLine(); if (ui.button("Noon")) jumpTime("12:00", "");
    ui.sameLine(); if (ui.button("Sunset")) jumpTime(fmtClock(tmGet("get_SunsetTimeHours", 18)), "");
    ui.sameLine(); if (ui.button("Midnight")) jumpTime("00:00", "");
    if (ui.button("+1 hour")) jumpTime(fmtClock(tmGet("get_CurrentClockHoursOfDay", 12) + 1), "");
    ui.sameLine(); if (ui.button("-1 hour")) jumpTime(fmtClock(tmGet("get_CurrentClockHoursOfDay", 12) - 1), "");
    ui.sameLine(); if (ui.button("Next day")) jumpTime(fmtClock(tmGet("get_CurrentClockHoursOfDay", 12)), String(tmGet("get_CurrentDay", 1) + 1));

    // ---- environment events
    ui.separator();
    ui.text("WEATHER / EVENTS (game's debug environment events)");
    if (!events.length && now > nextEv) { nextEv = now + 3000; loadEvents(); }
    if (!events.length) {
        ui.text("no events loaded yet");
    } else {
        evIdx = picker(ui, "event", events, evIdx, function (ev) { return ev.label + "  [" + (ev.phase === 1 ? "night" : "day") + "]"; });
        if (ui.button("Start event")) runEvent(false);
        ui.sameLine();
        if (ui.button("Stop event")) runEvent(true);
        if (evStatus) ui.text(evStatus);
    }
    if (ui.button("Refresh events")) { events = []; nextEv = 0; loadEvents(); }

    // ---- buildings
    ui.separator();
    ui.text("BUILDINGS (jump the train to one)");
    if (!buildings.length && now > nextB) { nextB = now + 4000; loadBuildings(); }
    if (!buildings.length) {
        ui.text("no buildings in the catalog yet (needs a loaded map)");
    } else {
        bIdx = picker(ui, "building", buildings, bIdx, function (b) { return b.label + "  (" + b.km + " km)"; });
        if (ui.button("Jump to selected building")) {
            var b = buildings[bIdx];
            call("SetSelectedBuildingJumpEntry", [Il2Cpp.string(b.key)]);
            call("RequestJumpToSelectedBuilding", []);
        }
    }
    if (ui.button("Refresh buildings")) { buildings = []; nextB = 0; loadBuildings(); }
});

// ---------------------------------------------------------------- cleanup when switched off
onDisable(function () {
    try {
        if (svc && !svc.handle.isNull()) {
            if (last.infFuel) svc.method("SetInfiniteFuel", 1).invoke(false);
            if (last.autoDrive) svc.method("SetAutoDrive", 1).invoke(false);
            if (last.freezeTime) svc.method("RequestSetTimePaused", 1).invoke(false);
        }
    } catch (e) {}
});

log("animal rails (trimmed) loaded");
