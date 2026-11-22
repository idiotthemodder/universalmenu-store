// game: com.LuWiGames.MonkeysPlaceV2
// realm-plugin.js
// Plugin-API port of the mods in realm.ts.
// Uses the same runtime API/style as realm.js: props(), onFrame(), onDisable(), ui.input.

var input = ui.input;
var p = props([
    // Movement
    { type: "bool", key: "platforms", label: "Platforms", default: false, desc: "hold either grip to create a platform at that hand" },
    { type: "bool", key: "stickyPlatforms", label: "Sticky Platforms", default: false, desc: "hold either grip to create a wide sticky platform" },
    { type: "bool", key: "ironMan", label: "Iron Man", default: false, desc: "hold primary to push away from the selected hand" },
    { type: "bool", key: "fly", label: "Fly", default: false, desc: "hold right trigger to fly in the direction your right hand points" },
    { type: "float", key: "flySpeed", label: "Fly Speed", min: 2, max: 40, default: 20, decimals: 0 },
    { type: "bool", key: "flyNoGravity", label: "Fly (No Gravity)", default: false, desc: "hold right primary to fly; otherwise counter gravity" },
    { type: "bool", key: "noclip", label: "Noclip", default: false, desc: "hold right trigger to disable mesh colliders" },
    { type: "bool", key: "longArms", label: "Long Arms", default: false },
    { type: "float", key: "armScale", label: "Arm Scale", min: 1, max: 3, default: 1.25, decimals: 2 },

    // Fun / rig
    { type: "bool", key: "longArmsTrigger", label: "Long Arms on Trigger", default: false, desc: "right trigger increases scale; left trigger decreases it" },
    { type: "bool", key: "sizeChanger", label: "Size Changer", default: false, desc: "right trigger grows you; left trigger shrinks you" },
    { type: "float", key: "sizeStep", label: "Size Change Speed", min: 0.001, max: 0.05, default: 0.01, decimals: 3 },
    { type: "select", key: "gravity", label: "Gravity", options: ["Normal", "Low", "Zero", "High"], default: "Normal" },
    { type: "bool", key: "freeze", label: "Freeze Player in Place", default: false },
    { type: "bool", key: "spawnKnockback", label: "Spawn KnockBackStickMod", default: false, desc: "hold grip to spawn one at that hand" },
    { type: "bool", key: "spawnBoy", label: "Spawn Boy", default: false, desc: "hold grip to spawn one at that hand" },
    { type: "bool", key: "spawnPlayer", label: "Spawn Player", default: false, desc: "hold grip to spawn one at that hand" },

    // Username / Photon
    { type: "text", key: "username", label: "Username", default: "-OWNER----------" },
    { type: "button", label: "Set Username", onClick: function () { run(function () {
        assembly().class("Photon.VR.PhotonVRManager").method("SetUsername", 1).invoke(Il2Cpp.string(p.username));
        notify("Username set");
    }); } },
    { type: "button", label: "Disconnect", onClick: function () { run(function () {
        assembly().class("GorillaNetworking.PhotonNetworkController").field("instance").value.method("AttemptDisconnect").invoke();
        notify("Disconnect requested");
    }); } },
    { type: "button", label: "Set Master Client", onClick: function () { run(function () {
        setMaster();
        notify("Master client request sent");
    }); } },
    { type: "bool", key: "autoMaster", label: "Auto Master Client", default: false },
    { type: "button", label: "Owner Spoof", onClick: function () { run(ownerSpoof); } }
]);

var G = {};
var lastFrame = Date.now();
var dt = 0.016;
var platforms = { left: null, right: null };
var clipped = false;
var previousNoclipTrigger = false;
var previousSpawn = { knockL: false, knockR: false, boyL: false, boyR: false, playerL: false, playerR: false };
var armsScaleActive = false;
var sizeChangerActive = false;
var triggerArmScale = 1;
var freezePosition = null;
var lastMasterAttempt = 0;
var ownerSpoofInstalled = false;

function run(fn) {
    try { fn(); }
    catch (e) { log("error: " + e); notify("Failed, see log"); }
}
function assembly() { return Il2Cpp.domain.assembly("Assembly-CSharp").image; }
function core() { return Il2Cpp.domain.assembly("UnityEngine.CoreModule").image; }
function tr(o) { return o.method("get_transform").invoke(); }
function mulV(v, s) { return G.Vector3.method("op_Multiply", 2).invoke(v, s); }
function setMaster() {
    var pn = Il2Cpp.domain.assembly("PhotonUnityNetworking").image.class("Photon.Pun.PhotonNetwork");
    pn.method("SetMasterClientOnPhoton").invoke(pn.method("get_LocalPlayer").invoke());
}
function init() {
    if (G.ok) {
        try { if (G.player && !G.player.isNull()) return true; } catch (_) {}
        G.ok = false;
    }
    try {
        G.player = assembly().class("GorillaLocomotion1.Player").method("get_Instance").invoke();
        if (!G.player || G.player.isNull()) return false;
        G.rb = G.player.field("playerRigidBody").value;
        G.left = G.player.field("leftHandTransform").value;
        G.right = G.player.field("rightHandTransform").value;
        G.Vector3 = core().class("UnityEngine.Vector3");
        G.GameObject = core().class("UnityEngine.GameObject");
        G.UObject = core().class("UnityEngine.Object");
        G.Resources = core().class("UnityEngine.Resources");
        G.ok = true;
        return true;
    } catch (e) {
        log("player init: " + e);
        return false;
    }
}
function setColliders(enabled) {
    var physics = Il2Cpp.domain.assembly("UnityEngine.PhysicsModule").image;
    var meshCollider = physics.class("UnityEngine.MeshCollider");
    var arr = G.UObject.method("FindObjectsOfType").inflate(meshCollider).invoke();
    for (var i = 0; i < arr.length; i++) arr.get(i).method("set_enabled").invoke(enabled);
}
function destroy(obj) {
    if (!obj) return;
    try { G.UObject.method("Destroy", 1).invoke(obj); } catch (_) {}
}
function removePlatform(hand) {
    var key = hand === 0 ? "left" : "right";
    if (platforms[key]) destroy(platforms[key]);
    platforms[key] = null;
}
function updatePlatform(hand, sticky) {
    var key = hand === 0 ? "left" : "right";
    var handTransform = hand === 0 ? G.left : G.right;
    if (!platforms[key]) platforms[key] = G.GameObject.method("CreatePrimitive").invoke(3);
    var platform = platforms[key];
    var pt = tr(platform);
    pt.method("set_position").invoke(handTransform.method("get_position").invoke());
    pt.method("set_rotation").invoke(handTransform.method("get_rotation").invoke());
    pt.method("set_localScale").invoke(sticky ? [-0.3, 0.1, 0.1] : [0.015, 0.15, -0.2]);
}
function spawnAtHand(prefabName, hand) {
    try {
        var prefab = G.Resources.method("Load", 1).invoke(Il2Cpp.string(prefabName));
        if (!prefab || prefab.isNull()) return;
        var spawned = G.GameObject.method("Instantiate", 1).invoke(prefab);
        var handTransform = hand === 0 ? G.left : G.right;
        var spawnedTransform = tr(spawned);
        spawnedTransform.method("set_position").invoke(handTransform.method("get_position").invoke());
        spawnedTransform.method("set_rotation").invoke(handTransform.method("get_rotation").invoke());
    } catch (e) { log("spawn " + prefabName + ": " + e); }
}
function updateSpawnToggle(enabled, prefab, hand, previousKey) {
    var held = input.grip(hand);
    if (enabled && held && !previousSpawn[previousKey]) spawnAtHand(prefab, hand);
    previousSpawn[previousKey] = enabled && held;
}
function ownerSpoof() {
    if (ownerSpoofInstalled) { notify("Owner Spoof hook already installed"); return; }
    var playerClass = assembly().class("Photon.VR.Player.PhotonVRPlayer");
    var update = playerClass.method("Update");
    var originalUpdate = update;
    update.implementation = function () {
        originalUpdate.invoke(this);
        try {
            var rankData = this.field("rankData").value;
            if (!rankData || rankData.isNull()) return;
            rankData.field("IsOwner").value = true;
            rankData.field("IsModerator").value = true;
        } catch (_) {}
    };
    var gameData = assembly().class("GameData").field("instance").value;
    if (gameData && !gameData.isNull()) {
        var vent = gameData.field("moderatorVentEntrance").value;
        if (vent) destroy(vent);
        var enableWhenMod = gameData.field("enableWhenMod").value;
        for (var i = 0; enableWhenMod && i < enableWhenMod.length; i++) {
            var obj = enableWhenMod.get(i);
            if (obj) obj.method("SetActive").invoke(true);
        }
    }
    ownerSpoofInstalled = true;
    notify("Owner Spoof hook installed");
}

onFrame(function () {
    var now = Date.now();
    dt = Math.min(0.1, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;
    if (!init()) return;

    var leftGrip = input.grip(0);
    var rightGrip = input.grip(1);
    var leftTrigger = input.trigger(0) > 0.6;
    var rightTrigger = input.trigger(1) > 0.6;

    // Platforms follow the corresponding hand while grip is held.
    if (p.platforms || p.stickyPlatforms) {
        if (leftGrip) updatePlatform(0, !!p.stickyPlatforms);
        else removePlatform(0);
        if (rightGrip) updatePlatform(1, !!p.stickyPlatforms);
        else removePlatform(1);
    } else {
        removePlatform(0);
        removePlatform(1);
    }

    // Movement mods.
    if (p.ironMan) {
        if (input.primary(0)) G.rb.method("AddForce", 2).invoke(mulV(G.left.method("get_right").invoke(), -15 * dt), 2);
        if (input.primary(1)) G.rb.method("AddForce", 2).invoke(mulV(G.right.method("get_right").invoke(), 15 * dt), 2);
    }
    if (p.fly && rightTrigger) G.rb.method("set_velocity").invoke(mulV(G.right.method("get_forward").invoke(), p.flySpeed));
    if (p.flyNoGravity) {
        if (input.primary(1)) G.rb.method("set_velocity").invoke(mulV(G.right.method("get_forward").invoke(), p.flySpeed));
        else G.rb.method("set_velocity").invoke([0, 9.81 * dt, 0]);
    }

    if (p.noclip) {
        if (rightTrigger && !previousNoclipTrigger) { setColliders(false); clipped = true; }
        if (!rightTrigger && previousNoclipTrigger) { setColliders(true); clipped = false; }
        previousNoclipTrigger = rightTrigger;
    } else {
        if (clipped) { setColliders(true); clipped = false; }
        previousNoclipTrigger = false;
    }

    // Arm scaling modes.
    if (p.longArms) {
        tr(G.player).method("set_localScale").invoke([p.armScale, p.armScale, p.armScale]);
        armsScaleActive = true;
    } else if (p.longArmsTrigger) {
        if (rightTrigger) triggerArmScale = Math.min(3, triggerArmScale + 0.01);
        if (leftTrigger) triggerArmScale = Math.max(1, triggerArmScale - 0.01);
        tr(G.player).method("set_localScale").invoke([triggerArmScale, triggerArmScale, triggerArmScale]);
        armsScaleActive = true;
    } else if (armsScaleActive) {
        tr(G.player).method("set_localScale").invoke([1, 1, 1]);
        triggerArmScale = 1;
        armsScaleActive = false;
    }

    // Size changer (separate from the long-arms toggle).
    if (p.sizeChanger) {
        var sizeTransform = tr(G.player);
        var size = sizeTransform.method("get_localScale").invoke();
        if (rightTrigger) size = G.Vector3.method("op_Addition").invoke(size, [p.sizeStep, p.sizeStep, p.sizeStep]);
        if (leftTrigger) size = G.Vector3.method("op_Subtraction").invoke(size, [p.sizeStep, p.sizeStep, p.sizeStep]);
        sizeTransform.method("set_localScale").invoke(size);
        sizeChangerActive = true;
    } else if (sizeChangerActive) {
        tr(G.player).method("set_localScale").invoke([1, 1, 1]);
        sizeChangerActive = false;
    }

    // Gravity presets.
    if (p.gravity === "Low") G.rb.method("AddForce", 2).invoke(mulV(G.Vector3.field("upVector").value, 6.66), 5);
    else if (p.gravity === "Zero") G.rb.method("AddForce", 2).invoke(mulV(G.Vector3.field("upVector").value, 9.81), 5);
    else if (p.gravity === "High") G.rb.method("AddForce", 2).invoke(mulV(G.Vector3.field("downVector").value, 7.77), 5);

    // Freeze player at the first position captured after enabling.
    if (p.freeze) {
        if (!freezePosition) freezePosition = tr(G.rb).method("get_position").invoke();
        else {
            tr(G.rb).method("set_position").invoke(freezePosition);
            G.rb.method("set_velocity").invoke(G.Vector3.field("zeroVector").value);
        }
    } else freezePosition = null;

    // Spawn each prefab once per grip press rather than every frame.
    updateSpawnToggle(!!p.spawnKnockback, "KnockBackStickMod", 0, "knockL");
    updateSpawnToggle(!!p.spawnKnockback, "KnockBackStickMod", 1, "knockR");
    updateSpawnToggle(!!p.spawnBoy, "Boy", 0, "boyL");
    updateSpawnToggle(!!p.spawnBoy, "Boy", 1, "boyR");
    updateSpawnToggle(!!p.spawnPlayer, "Player", 0, "playerL");
    updateSpawnToggle(!!p.spawnPlayer, "Player", 1, "playerR");

    if (p.autoMaster && now - lastMasterAttempt > 2000) {
        lastMasterAttempt = now;
        try {
            var pn = Il2Cpp.domain.assembly("PhotonUnityNetworking").image.class("Photon.Pun.PhotonNetwork");
            if (pn.method("get_InRoom").invoke() && !pn.method("get_IsMasterClient").invoke()) setMaster();
        } catch (_) {}
    }
});

onDisable(function () {
    try {
        if (!G.ok) return;
        removePlatform(0);
        removePlatform(1);
        if (clipped) { setColliders(true); clipped = false; }
        previousNoclipTrigger = false;
        if (armsScaleActive || sizeChangerActive) tr(G.player).method("set_localScale").invoke([1, 1, 1]);
        armsScaleActive = false;
        sizeChangerActive = false;
        triggerArmScale = 1;
        freezePosition = null;
    } catch (e) { log("cleanup: " + e); }
});

log("realm plugin loaded");
