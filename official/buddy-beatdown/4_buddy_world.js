// game: com.armoredpigstudios.beathimup
// Buddy Beatdown: World & Lobby (spawn menu, bulk spawner, vehicles, lobby games, maps, room codes, kill feed).
// Only the controls live here. The code is in 0_buddy_engine.js and 0_buddy_engine_thooms.js, which must be on.
// Turning this plugin off switches off its toggles.
var CAT = "world";
var B = globalThis.__BB;
if (!B || !B.cats[CAT]) {
    props([{ type: "label", label: "the buddy engine plugins are not loaded, turn them on and reload plugins" }]);
} else {
    var defs = B.cats[CAT];
    var bag = props(defs);
    B.register(CAT, bag);
    if (B.tabs[CAT]) tab(B.tabs[CAT]);
    onDisable(function () { defs.forEach(function (d) { if (d.type === "bool" && d.key) { try { bag[d.key] = false; } catch (e) { } } }); });
}
