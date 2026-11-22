// game: com.JusTeam.Stuff
// Store upload test: does nothing except show a label and one toggle. Safe to delete.
var p = props([
    { type: "label", label: "Store test plugin: if you can see this, store installs work." },
    { type: "bool", key: "hello", label: "Say hello in the log", default: false }
]);
var said = false;
onFrame(function () {
    if (p.hello && !said) { said = true; console.log("[store test] hello from a community plugin"); }
    if (!p.hello) said = false;
});
