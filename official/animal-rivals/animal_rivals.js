// game: com.dogelabs.deadeye
"use strict";
/*
 * animal_rivals.js - Animal Rivals (com.dogelabs.deadeye) mods as a plugin for the universal menu.
 * Animal Rivals features are grouped into categories in this single plugin entry, including the
 * profile picture, cosmetics, lobby, map, computer, diagnostics, and Pizza Mods modules. Name and
 * privacy features were removed. Kick / crash / spam mods remain removed.
 */

// Change this one line and the menu title, HUD, notifications and log prefix all follow.
const MENU_NAME = "AnimalRivals";


// Bundled Animal Rivals modules: one plugin entry with feature categories.
const __arOriginalTab = tab;
const __arOriginalFrame = onFrame;
const __arOriginalProps = props;
let __arBaseDraw = null;
let __arPropsBag = null;
const __arCategories = [];
const __arCategoryLabels = {
    pizza_mods: "Pizza Mods",
    deadeye_names: "Profile Picture",
    deadeye_cosmetics: "Cosmetics",
    deadeye_join: "Lobby",
    map_loader: "Custom Maps",
    deadeye_computer: "In-game Computer",
};
const __arModuleDefs = Object.create(null);
const __arFrameCallbacks = [];
function __arModuleProps(id, defs) {
    __arModuleDefs[id] = defs || [];
    return new Proxy({}, {
        get: function (_, key) {
            if (key === "__moduleId") return id;
            return __arPropsBag ? __arPropsBag[id + "__" + String(key)] : undefined;
        },
        set: function (_, key, value) {
            if (__arPropsBag) __arPropsBag[id + "__" + String(key)] = value;
            return true;
        },
    });
}
function __arFinalizeProps() {
    const defs = [];
    Object.keys(__arModuleDefs).forEach(function (id) {
        __arModuleDefs[id].forEach(function (d) {
            const copy = Object.assign({}, d);
            if (copy.key) copy.key = id + "__" + copy.key;
            defs.push(copy);
        });
    });
    __arPropsBag = __arOriginalProps(defs);
    // Settings are drawn in their matching feature category below.
    __arOriginalProps([]);
}
function __arDrawProps(ui, id) {
    (__arModuleDefs[id] || []).forEach(function (d) {
        const key = d.key ? id + "__" + d.key : "";
        const label = d.label || d.key || "";
        if (d.type === "label") { ui.text(label); return; }
        if (d.type === "bool") {
            const r = ref(!!__arPropsBag[key]);
            if (ui.checkbox(label, r, d.desc)) __arPropsBag[key] = !!r.v;
        } else if (d.type === "int") {
            const r = ref(Number(__arPropsBag[key]));
            if (ui.sliderInt(label, r, d.min === undefined ? 0 : d.min, d.max === undefined ? 10 : d.max)) __arPropsBag[key] = r.v;
        } else if (d.type === "float") {
            const r = ref(Number(__arPropsBag[key]));
            if (ui.sliderFloat(label, r, d.min === undefined ? 0 : d.min, d.max === undefined ? 1 : d.max, d.decimals === undefined ? 2 : d.decimals)) __arPropsBag[key] = r.v;
        } else if (d.type === "select") {
            const opts = d.options || [];
            const index = Math.max(0, opts.indexOf(__arPropsBag[key]));
            const r = ref(index);
            if (ui.combo(label, r, opts)) __arPropsBag[key] = opts[r.v];
        } else if (d.type === "text" && ui.inputText) {
            const value = {
                get v() { return String(__arPropsBag[key] === undefined ? (d.default || "") : __arPropsBag[key]); },
                set v(next) { __arPropsBag[key] = String(next || ""); },
            };
            ui.inputText(label, value);
        }
    });
}
function __arCategory(id, draw) {
    let category = __arCategories.find(function (item) { return item.id === id; });
    if (!category) {
        category = { id: id, label: __arCategoryLabels[id] || id, draws: [] };
        __arCategories.push(category);
    }
    category.draws.push(draw);
}
function __arFrame(fn) { __arFrameCallbacks.push(fn); }
tab = function (draw) {
    __arBaseDraw = draw;
    __arOriginalTab(function (ui) {
        if (__arBaseDraw) __arBaseDraw(ui);
        __arCategories.forEach(function (category) {
            if (ui.collapsingHeader(category.label, false)) {
                try { __arDrawProps(ui, category.id); }
                catch (e) { console.log("[AnimalRivals] " + category.label + " settings: " + e); }
                category.draws.forEach(function (draw) {
                    try { draw(ui); }
                    catch (e) { console.log("[AnimalRivals] " + category.label + " category: " + e); }
                });
            }
        });
    });
};

const RAPID_FIRE_INTERVAL = 0.03;
const TRIGGER_FLY_SPEED = 40.6;
const JOYSTICK_FLY_SPEED = 9.0;
const JOYSTICK_FLY_TURN_SPEED = 105.0;
const JOYSTICK_DEADZONE = 0.08;
const SPEED_BOOST_JUMP_MULTIPLIER_DELTA = 1.5;
const SPEED_BOOST_MAX_SPEED_DELTA = 9.0;
const SPEED_BOOST_VELOCITY_CAP = 28.0;
const RIG_SPIN_SPEED_MIN = 1;
const RIG_SPIN_SPEED_MAX = 10;
const RIG_SPIN_SPEED_DEGREES = 2.5;
// Rig Spam - enforce renderer visibility every frame (fix invisible clones)
const AIMBOT_TARGET_REFRESH_FRAMES = 6;
const AIMBOT_EMPTY_TARGET_REFRESH_FRAMES = 20;
const AIMBOT_ROSTER_REFRESH_FRAMES = 60;
const AIMBOT_SWITCH_RATIO = 0.7;
const AIMBOT_AIM_TRANSFORM_RECHECK_FRAMES = 300;
const RIG_HITBOX_SCALE = 2.8;
const EXTEND_HITBOX_REFRESH_FRAMES = 180;
const LONG_ARMS_MULTIPLIER = 2.5;
const LONG_ARMS_BODY_SCALE = 1.6;
const VISUAL_SCAN_INTERVAL_FRAMES = 180;
const CHAM_RENDERER_RESCAN_FRAMES = 240;
const HP_TEXT_REFRESH_FRAMES = 12;
const HP_POSITION_REFRESH_FRAMES = 6;
const INVISIBILITY_RESCAN_FRAMES = 180;
const MAX_VISUAL_TARGETS = 16;
const MAX_CHAM_RENDERERS_PER_TARGET = 12;
const LOCAL_CONTROLLER_RECHECK_MS = 2000;
const LOCAL_CONTROLLER_STALE_MS = 1500;
const APPLICATION_FOCUS_POLL_CALLS = 10;
const APPLICATION_FOCUS_GRACE_FRAMES = 240;
const UNLOCK_TRANSITION_RESTORE_DELAY_MS = 4000;
const UNLOCK_TRANSITION_SAME_PLAYER_DELAY_MS = 12000;
const UNLOCK_TRANSITION_STABLE_FRAMES = 90;
const UNLOCK_TRANSITION_RETRY_FRAMES = 120;
const UNLOCK_TRANSITION_MAX_RETRIES = 8;
const UNLOCK_TRANSITION_MAX_COSMETICS = 32;
const UNLOCK_TRANSITION_OVERRIDE_SOURCE = "rasp_room_restore";
const ENABLE_EXPERIMENTAL_MIC_MIXER = false;
const GRENADE_LAUNCH_SPEED = 22.0;
const GRENADE_LAUNCH_COOLDOWN = 0.075;
const GRENADE_PREFAB_RETRY_SECONDS = 10.0;
const GRENADE_TEMPLATE_RETRY_SECONDS = 6.0;
const GRENADE_VARIANTS = [
    {
        name: "Frag",
        classNames: ["Deadeye.Throwables.GrenadeProjectile", "GrenadeProjectile"],
        prefabNames: ["FragGrenadeProjectile"],
        resourcePaths: ["FragGrenadeProjectile", "Weapons/FragGrenadeProjectile", "Projectiles/FragGrenadeProjectile"],
    },
    {
        name: "Flashbang",
        classNames: ["Deadeye.Throwables.GrenadeProjectile", "GrenadeProjectile"],
        prefabNames: ["FlashbangProjectile"],
        resourcePaths: ["FlashbangProjectile", "Weapons/FlashbangProjectile", "Projectiles/FlashbangProjectile"],
    },
    {
        name: "Smoke",
        classNames: ["Deadeye.Throwables.GrenadeProjectile", "GrenadeProjectile"],
        prefabNames: ["SmokeGrenadeProjectile"],
        resourcePaths: ["SmokeGrenadeProjectile", "Weapons/SmokeGrenadeProjectile", "Projectiles/SmokeGrenadeProjectile"],
    },
    {
        name: "Sticky Frag",
        classNames: ["Deadeye.Throwables.GrenadeProjectile", "GrenadeProjectile"],
        prefabNames: ["StickyFragProjectile"],
        resourcePaths: ["StickyFragProjectile", "Weapons/StickyFragProjectile", "Projectiles/StickyFragProjectile"],
    },
    {
        name: "Sticky Ranger",
        classNames: ["Deadeye.Throwables.GrenadeProjectile", "GrenadeProjectile"],
        prefabNames: ["StickyFragProjectile_SpaceRanger"],
        resourcePaths: ["StickyFragProjectile_SpaceRanger", "Weapons/StickyFragProjectile_SpaceRanger", "Projectiles/StickyFragProjectile_SpaceRanger"],
    },
    {
        name: "Sticky Ranger Blue",
        classNames: ["Deadeye.Throwables.GrenadeProjectile", "GrenadeProjectile"],
        prefabNames: ["StickyFragProjectile_SpaceRanger_Blue"],
        resourcePaths: ["StickyFragProjectile_SpaceRanger_Blue", "Weapons/StickyFragProjectile_SpaceRanger_Blue", "Projectiles/StickyFragProjectile_SpaceRanger_Blue"],
    },
    {
        name: "Sticky Ranger Red",
        classNames: ["Deadeye.Throwables.GrenadeProjectile", "GrenadeProjectile"],
        prefabNames: ["StickyFragProjectile_SpaceRanger_Red"],
        resourcePaths: ["StickyFragProjectile_SpaceRanger_Red", "Weapons/StickyFragProjectile_SpaceRanger_Red", "Projectiles/StickyFragProjectile_SpaceRanger_Red"],
    },
    {
        name: "Instant Blast",
        classNames: ["Deadeye.Throwables.GrenadeProjectile", "GrenadeProjectile"],
        prefabNames: ["InstantExplodeProjectile"],
        resourcePaths: ["InstantExplodeProjectile", "Weapons/InstantExplodeProjectile", "Projectiles/InstantExplodeProjectile"],
    },
    {
        name: "Instant Vertical",
        classNames: ["Deadeye.Throwables.GrenadeProjectile", "GrenadeProjectile"],
        prefabNames: ["InstantExplodeProjectile_VerticalCylinder"],
        resourcePaths: ["InstantExplodeProjectile_VerticalCylinder", "Weapons/InstantExplodeProjectile_VerticalCylinder", "Projectiles/InstantExplodeProjectile_VerticalCylinder"],
    },
];
const PLATFORM_HAND_OFFSET_Y = 0.16;
const HITBOX_VISUAL_REFRESH_FRAMES = 18;
const HITBOX_VISUAL_RESCAN_FRAMES = 180;
const MAX_HITBOX_VISUALS = 16;
const MAX_HITBOX_VISUALS_PER_TARGET = 3;
const PLATFORM_SCALE = [0.35, 0.025, 0.35];
const PLATFORM_COLOR = [1.0, 0.00, 0.00, 0.95];
const COLORS = {
    background: [0.01, 0.01, 0.01, 0.96],
    outline: [0.27, 0.035, 0.035, 1.0],
    button: [0.55, 0.10, 0.10, 0.96],
    buttonHover: [0.70, 0.12, 0.12, 1.0],
    buttonEnabled: [0.85, 0.10, 0.10, 1.0],
    buttonEnabledHover: [1.0, 0.16, 0.16, 1.0],
    text: [1.0, 1.0, 1.0, 1.0],
    subtext: [1.0, 0.30, 0.30, 1.0],
};
const mods = {
    triggerFly: false,
    joystickFly: false,
    speedBoost: false,
    longArms: false,
    platforms: false,
    infiniteAmmo: false,
    noCooldown: false,
    rapidFire: false,
    noRecoil: false,
    aimbot: false,
    grenadeLauncher: false,
    killInLobby: false,
    useGunsInLobby: false,
    unlockAll: false,
    invincibility: false,
    invisibility: false,
    spinHead: false,
    flipHead: false,
    drunkHead: false,
    tPose: false,
    ghost: false,
    fakeLag: false,
    hideRig: false,
    tracers: false,
    chams: false,
    espBoxes: false,
    showHp: false,
    showHitboxes: false,
    extendHitboxes: false,
    spinBot: false,
};
// The list comes from globalThis.__RASP_SOUNDBOARD, which the menu fills from the "sounds" folder next to the plugins
// (vrfrida.py converts everything in Mods/sounds to wav and pushes it there). Reload Sounds re-reads that folder.
const soundboardSounds = [];
function loadSoundboardManifest() {
    try {
        soundboardSounds.length = 0;
        const manifest = globalThis.__RASP_SOUNDBOARD;
        if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.sounds))
            return 0;
        for (const sound of manifest.sounds) {
            if (sound && typeof sound.id === "string" && typeof sound.label === "string" &&
                typeof sound.fileName === "string" && (sound.format === "mp3" || sound.format === "wav") &&
                (Array.isArray(sound.base64Chunks) || typeof globalThis.__RASP_SOUNDBOARD_READ === "function"))
                soundboardSounds.push(sound);
        }
    }
    catch (_) { }
    return soundboardSounds.length;
}
loadSoundboardManifest();

// ---- sound binds: play a sound from a controller button or a game event -----------------------------------
// Binds are saved to soundbinds.json next to the other plugin save files, so they survive restarts.
const SOUND_BIND_INPUTS = ["Left X", "Left Y", "Right A", "Right B", "Left Stick Click", "Right Stick Click",
    "Left Trigger", "Right Trigger", "Left Grip", "Right Grip",
    "Left Stick Up", "Left Stick Down", "Left Stick Left", "Left Stick Right",
    "Right Stick Up", "Right Stick Down", "Right Stick Left", "Right Stick Right"];
const SOUND_BIND_MODIFIERS = ["None", "Hold Left Grip", "Hold Right Grip", "Hold Left Trigger", "Hold Right Trigger"];
const SOUND_BIND_MODIFIER_INPUT = [-1, 8, 9, 6, 7];
const SOUND_BIND_EVENTS = ["Take Damage", "Die", "Respawn", "Join Lobby", "Mod Turned On", "Mod Turned Off"];
const SOUND_BIND_PATH = "/storage/emulated/0/Android/data/com.dogelabs.deadeye/files/imgui_plugins/soundbinds.json";
const soundBinds = [];
const SB = { sound: ref(0), trig: ref(0), input: ref(2), mod: ref(0), event: ref(0), modKey: ref(0), listening: false, listenStart: 0, msg: "" };
function loadSoundBinds() {
    try {
        const parsed = JSON.parse(File.readAllText(SOUND_BIND_PATH));
        if (!Array.isArray(parsed))
            return;
        soundBinds.length = 0;
        for (const b of parsed) {
            if (b && typeof b.sound === "string")
                soundBinds.push({
                    sound: b.sound, soundLabel: String(b.soundLabel || b.sound), trig: b.trig === 1 ? 1 : 0,
                    input: b.input | 0, mod: b.mod | 0, event: b.event | 0, modKey: String(b.modKey || ""),
                });
        }
    }
    catch (_) { /* first run, nothing saved yet */ }
}
function saveSoundBinds() {
    try { File.writeAllText(SOUND_BIND_PATH, JSON.stringify(soundBinds)); }
    catch (error) { console.error("[" + MENU_NAME + "] Could not save sound binds: " + error); }
}
// -1 = stop, -2 = random, -3 = sound no longer exists, otherwise an index into soundboardSounds
function soundBindSoundIndex(bind) {
    if (bind.sound === "__stop") return -1;
    if (bind.sound === "__random") return -2;
    let index = soundboardSounds.findIndex(s => s.id === bind.sound);
    if (index < 0) index = soundboardSounds.findIndex(s => s.label === bind.soundLabel);
    return index >= 0 ? index : -3;
}
function describeSoundBind(bind) {
    let what;
    if (bind.trig === 1) {
        what = SOUND_BIND_EVENTS[bind.event] || "?";
        if (bind.event >= 4) what += " (" + (bind.modKey || "?") + ")";
    }
    else {
        what = SOUND_BIND_INPUTS[bind.input] || "?";
        if (bind.mod > 0 && SOUND_BIND_MODIFIERS[bind.mod]) what = SOUND_BIND_MODIFIERS[bind.mod] + " + " + what;
    }
    const label = bind.sound === "__stop" ? "[Stop Sound]" : bind.sound === "__random" ? "[Random Sound]" : bind.soundLabel;
    return what + "  ->  " + label;
}
loadSoundBinds();

function reloadSounds() {
    try { if (typeof globalThis.__RASP_SOUNDBOARD_RELOAD === "function") globalThis.__RASP_SOUNDBOARD_RELOAD(); } catch (_) { }
    return loadSoundboardManifest();
}
let AR = null;
let activeSoundIndex = -1;
let soundboardBusy = false;
let soundboardOutgoingVoice = null;
let soundboardPcm = null;
let soundboardPcmCursor = 0.0;
let soundboardPcmRate = 24000;
let soundboardPcmChannels = 1;
let soundboardVoiceRate = 24000;
let soundboardVoiceChannels = 1;
let soundboardMixFault = false;
let soundboardMixFaultLogged = false;
let soundboardPcmFinished = false;
let soundboardPttState = null;
let soundboardMixerHooksInstalled = false;
let soundboardShortHookInstalled = false;
let soundboardFloatHookInstalled = false;
let menuFont = null;
let inputOutBool = null;
let inputOutVector2 = null;
let leftPrimary = false;
let rightPrimary = false;
let leftStickClick = false;
let rightStickClick = false;
let leftSecondary = false;
let rightSecondary = false;
let rightSecondaryDown = false;
let rightSecondaryWasPressed = false;
let leftTrigger = false;
let leftTriggerAmount = 0.0;
let rightTrigger = false;
let rightTriggerAmount = 0.0;
let leftGrip = false;
let rightGrip = false;
let selectedGrenadeVariant = 0;
let leftStickX = 0.0;
let leftStickY = 0.0;
let rightStickX = 0.0;
let rightStickY = 0.0;
let frameNumber = 0;
let pendingAmmoSweep = false;
let pendingCooldownReset = false;
let cooldownResetRetryFrame = 0;
let pendingUnlockRefresh = false;
let unlockRefreshFrames = [];
let unlockTransitionCosmetics = [];
let unlockTransitionRestorePending = false;
let unlockTransitionRestoreNotBefore = 0;
let unlockTransitionSamePlayerNotBefore = 0;
let unlockTransitionSourcePlayerKey = "";
let unlockTransitionStableFrames = 0;
let unlockTransitionRetryFrame = 0;
let unlockTransitionRestoreAttempts = 0;
let unlockTransitionConfirmedContentTypes = new Set();
let unlockTransitionWeapons = null;
let unlockTransitionWeaponsPin = null;
let pendingInvincibilityRefresh = false;
let lastGrenadeLaunchTime = -1000.0;
let lastGrenadePrefabWarningTime = -1000.0;
let grenadePrefabRetryAt = -1000.0;
let cachedClipboardWeapon = null;
let cachedGrenadePrefab = null;
let cachedGrenadePrefabVariant = -1;
let cachedProjectileWeaponTemplate = null;
let projectileWeaponTemplateRetryAt = -1000.0;
let leftHandPlatform = null;
let rightHandPlatform = null;
let aimbotTarget = null;
let aimbotRoster = [];
const AIMBOT_AIM_MODES = ["Head", "Chest", "Mixed"];
let aimbotAimMode = 0;
let aimbotBodyDrop = 0.3;
const aimbotMixed = new Map();
let aimbotRosterFrame = -1000;
let aimbotLocal = null;
let aimbotTargetRefreshFrame = -1000;
let aimbotTargetPoint = null;
let aimbotTargetPointFrame = -1000;
let heldWeaponsCacheFrame = -1000;
let heldWeaponsCache = [];
const aimbotAimTransformCache = new Map();
const teamKeyCache = new Map();
let lobbyWeaponDamageGateState = null;
let rigSpinYaw = 0.0;
let rigSpinState = null;
let rigSpinCurrentSpeed = 1;
let rigHeadSpinSpeed = 4, rigHideDistance = 300, rigGhostButton = 2;
const RIG_GHOST_BUTTONS = ["Left Grip", "Left Trigger", "Left Y", "Right A", "Right B"];
let rigSpinNextWarningAt = -1000.0;
let originalRigHitboxes = new Map();
let extendHitboxNextRefreshFrame = -1000;
let hitboxLayerIndexCache = null;
let hitboxVisuals = new Map();
let hitboxVisualRescanFrame = -1000;
let lastTickError = "";
let tickErrorCount = 0;
let activeLocalPlayer = null;
let visualRoot = null;
let visualTargets = new Map();
let visualShader = null;
let visualMaterials = new Map();
let visualHpMaterial = null;
let lastVisualScanFrame = -1000;
let lastMatchModeScanFrame = -1000;
let chamScanCursor = 0;
let cachedMatchModeActive = false;
let discoveredTeamGetterNames = null;
let discoveredTeamFieldNames = null;
let discoveredVisualRootFieldNames = null;
let discoveredMovementBoostFieldNames = null;
let discoveredMovementComponentFieldNames = null;
let cachedHealthValueAccessor = null;
let invisibilityPlayer = null;
let invisibleRenderers = new Map();
let lastInvisibilityScanFrame = -1000;
let invisibilityLayerRpcPlayer = null;
let invisibilityOriginalLayer = -1;
let invisibilityLayerRpcApplied = false;
let longArmState = null;
let joystickFlyState = null;
let speedBoostPlayer = null;
let speedBoostController = null;
let speedBoostOriginalVelocityCap = null;
let speedBoostOriginalMovementValues = null;
let speedBoostTouchedMovementValues = [];
let speedBoostLeftApplied = false;
let speedBoostRightApplied = false;
let lastLocalControllerTickAt = 0;
let lastLocalControllerValidationAt = 0;
let localControllerFocusPoll = 0;
let cachedApplicationFocused = true;
let focusCleanupPending = false;
let focusLostFrameCount = 0;
let tickInProgress = false;
Il2Cpp.perform(() => {
    const Core = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
    const PhysicsImage = Il2Cpp.domain.assembly("UnityEngine.PhysicsModule").image;
    const TextImage = Il2Cpp.domain.assembly("UnityEngine.TextRenderingModule").image;
    const XRImage = Il2Cpp.domain.assembly("UnityEngine.XRModule").image;
    const AudioImage = Il2Cpp.domain.assembly("UnityEngine.AudioModule").image;
    const Game = Il2Cpp.domain.assembly("DL.Animals.Core2025").image;
    const FusionRuntime = (() => {
        try {
            return Il2Cpp.domain.assembly("Fusion.Runtime").image;
        }
        catch (_) {
            return null;
        }
    })();
    const FusionNetworkRunner = FusionRuntime ? FusionRuntime.class("Fusion.NetworkRunner") : null;
    const AvatarBehaviourFusion = (() => {
        const fullName = "Meta.XR.MultiplayerBlocks.Fusion.AvatarBehaviourFusion";
        for (const assemblyName of [
            "Meta.XR.MultiplayerBlocks.Fusion",
            "Meta.XR.MultiplayerBlocks.Fusion.Runtime",
            "Meta.XR.MultiplayerBlocks",
        ]) {
            try {
                return Il2Cpp.domain.assembly(assemblyName).image.class(fullName);
            }
            catch (_) { }
        }
        try {
            for (const assembly of Il2Cpp.domain.assemblies) {
                try {
                    return assembly.image.class(fullName);
                }
                catch (_) { }
            }
        }
        catch (_) { }
        return null;
    })();
    const AssemblyCSharp = (() => {
        try {
            return Il2Cpp.domain.assembly("Assembly-CSharp").image;
        }
        catch (_) {
            return null;
        }
    })();
    const GameObject = Core.class("UnityEngine.GameObject");
    const Mesh = Core.class("UnityEngine.Mesh");
    const MeshFilter = Core.class("UnityEngine.MeshFilter");
    const UnityObject = Core.class("UnityEngine.Object");
    const Renderer = Core.class("UnityEngine.Renderer");
    const MeshRenderer = Core.class("UnityEngine.MeshRenderer");
    const SkinnedMeshRenderer = Core.class("UnityEngine.SkinnedMeshRenderer");
    const LineRenderer = Core.class("UnityEngine.LineRenderer");
    const Material = Core.class("UnityEngine.Material");
    const Resources = Core.class("UnityEngine.Resources");
    const Camera = Core.class("UnityEngine.Camera");
    const Application = Core.class("UnityEngine.Application");
    const Time = Core.class("UnityEngine.Time");
    const Quaternion = Core.class("UnityEngine.Quaternion");
    const LayerMask = Core.class("UnityEngine.LayerMask");
    const Shader = Core.class("UnityEngine.Shader");
    const Vector3 = Core.class("UnityEngine.Vector3");
    const Physics = PhysicsImage.class("UnityEngine.Physics");
    const Collider = PhysicsImage.class("UnityEngine.Collider");
    const Rigidbody = PhysicsImage.class("UnityEngine.Rigidbody");
    const TextMesh = TextImage.class("UnityEngine.TextMesh");
    const Font = TextImage.class("UnityEngine.Font");
    const InputDevices = XRImage.class("UnityEngine.XR.InputDevices");
    const CommonUsages = XRImage.class("UnityEngine.XR.CommonUsages");
    const AudioClip = AudioImage.class("UnityEngine.AudioClip");
    const AudioSource = AudioImage.class("UnityEngine.AudioSource");
    const SingleClass = Il2Cpp.corlib.class("System.Single");
    let PhotonRecorder = null;
    let PhotonVoiceConnection = null;
    let PhotonVoiceImage = null;
    let PhotonVoiceCoreImage = null;
    let CustomVoiceRecorder = null;
    try {
        PhotonVoiceImage = Il2Cpp.domain.assembly("PhotonVoice").image;
        PhotonRecorder = PhotonVoiceImage.class("Photon.Voice.Unity.Recorder");
        PhotonVoiceConnection = PhotonVoiceImage.class("Photon.Voice.Unity.VoiceConnection");
    }
    catch (_) { }
    for (const assemblyName of ["PhotonVoice.API", "PhotonVoiceApi", "PhotonVoice"]) {
        try {
            const image = Il2Cpp.domain.assembly(assemblyName).image;
            image.class("Photon.Voice.LocalVoiceAudioShort");
            PhotonVoiceCoreImage = image;
            break;
        }
        catch (_) { }
    }
    try {
        CustomVoiceRecorder = Game.class("CustomVoiceRecorder");
    }
    catch (_) { }
    const WeaponBase = Game.class("DLAR_WeaponBase");
    const HitscanWeapon = Game.class("HitscanWeapon");
    const ProjectileWeapon = Game.class("ProjectileWeapon");
    const projectileLaunchMethod = (() => {
        for (const parameterCount of [4, 3, 2]) {
            try {
                return ProjectileWeapon.method("LaunchProjectile", parameterCount);
            }
            catch (_) { }
        }
        return null;
    })();
    const AmmoStorage = Game.class("Weapons.WeaponAmmoStorage");
    const CooldownManager = Game.class("WeaponFireRateCooldownManager");
    const RecoilController = Game.class("DLAR_XRHandRecoilController");
    const PlayerController = Game.class("PlayerController");
    function resolveClass(className) {
        if (!className)
            return null;
        try {
            return AssemblyCSharp ? AssemblyCSharp.class(className) : null;
        }
        catch (_) { }
        try {
            return Game.class(className);
        }
        catch (_) { }
        return null;
    }
    function resolveClassAnywhere(className) {
        if (!className)
            return null;
        try {
            for (const assembly of Il2Cpp.domain.assemblies) {
                try {
                    const klass = assembly.image.class(className);
                    if (klass)
                        return klass;
                }
                catch (_) { }
            }
        }
        catch (_) { }
        return null;
    }
    function hookBooleanAccessor(className, methodName, replacementValue = false) {
        const klass = resolveClass(className);
        if (!klass)
            return;
        let methods = [];
        try {
            methods.push(klass.method(methodName, 0));
        }
        catch (_) { }
        try {
            methods = methods.concat((klass.methods || [])
                .filter((method) => method.name === methodName && method.parameterCount === 0));
        }
        catch (_) { }
        for (const method of methods) {
            try {
                if (method.returnType.name !== "System.Boolean" || method.virtualAddress.isNull()) {
                    continue;
                }
                if (method.isGeneric || method.isInflated)
                    continue;
                installHook(method, `${className}.${methodName}`, function () {
                    return !!replacementValue;
                });
                break;
            }
            catch (_) { }
        }
    }
    function hookNoopVoid(className, methodName) {
        const klass = resolveClass(className);
        if (!klass)
            return;
        let methods = [];
        try {
            methods.push(klass.method(methodName, 0));
        }
        catch (_) { }
        try {
            methods = methods.concat((klass.methods || [])
                .filter((method) => method.name === methodName && method.parameterCount === 0));
        }
        catch (_) { }
        for (const method of methods) {
            try {
                if (method.returnType.name !== "System.Void" || method.virtualAddress.isNull()) {
                    continue;
                }
                if (method.isGeneric || method.isInflated)
                    continue;
                installHook(method, `${className}.${methodName}`, function () {
                    return;
                });
                break;
            }
            catch (_) { }
        }
    }
    function installAntiCheatBypasses() {
        try {
            hookBooleanAccessor("GUPS.AntiCheat.Punisher.ExitGamePunisher", "get_IsSupported");
            hookBooleanAccessor("GUPS.AntiCheat.Punisher.ExitGamePunisher", "get_IsActive");
            hookBooleanAccessor("GUPS.AntiCheat.Punisher.ExitGamePunisher", "get_PunishOnce");
            hookBooleanAccessor("GUPS.AntiCheat.Punisher.ExitGamePunisher", "get_HasPunished");
            // This accessor is phrased positively: true means the scene/lifecycle
            // guard must be ignored. Returning false here did the opposite of the
            // intended bypass and let a room transition re-arm the tamper path.
            hookBooleanAccessor("AntiCheatRuntimeGuards", "get_ShouldIgnoreTamperCheck", true);
            hookBooleanAccessor("AntiCheatValueDetector", "get_UseUpdateLoop");
            hookBooleanAccessor("AntiCheatValueDetector", "ShouldEvaluateThisFrame");
            hookNoopVoid("GUPS.AntiCheat.Punisher.ExitGamePunisher", "Punish");
            hookNoopVoid("GUPS.AntiCheat.Punisher.ExitGamePunisher", "OnTemperingDetected");
            hookNoopVoid("AntiCheatManager", "RegisterDetector");
            hookNoopVoid("AntiCheatManager", "HandleDetectorLifecycleTamper");
            hookNoopVoid("AntiCheatManager", "HandleDetectorValueTamper");
            hookNoopVoid("AntiCheatManager", "OnTemperingDetected");
            hookNoopVoid("AntiCheatManager", "add_TamperDetected");
            hookNoopVoid("AntiCheatManager", "TriggerTamper");
            hookNoopVoid("AntiCheatManager", "ReportTamper");
            hookNoopVoid("AntiCheatManager", "DelayedLifecycleEvaluation");
            // Leave OnApplicationQuitting intact. It performs legitimate static
            // cleanup too; suppressing it made Android wait for the activity's
            // destroy timeout whenever the user closed a stuck game.
            hookNoopVoid("AntiCheatRuntimeGuards", "RunAfterDelay");
            hookNoopVoid("AntiCheatRuntimeGuards", "ArmSceneGuard");
            hookNoopVoid("AntiCheatRuntimeGuards", "Initialize");
            hookNoopVoid("AntiCheatValueDetector", "AttachToManager");
            hookNoopVoid("AntiCheatValueDetector", "get_DetectorName");
            hookNoopVoid("AntiCheatValueDetector", "TryReadValue");
            hookNoopVoid("AntiCheatValueDetector", "EvaluateLifecycleTamper");
            hookNoopVoid("AntiCheatValueDetector", "ReportValueTamper");
            hookNoopVoid("GUPSLibraryTamperReporter", "OnAndroidCheatingDetected");
            console.log("[" + MENU_NAME + "] Anti-cheat methods patched.");
        }
        catch (_) {
            console.error("[" + MENU_NAME + "] Anti-cheat patching unavailable.");
        }
    }
    installAntiCheatBypasses();
    function optionalGameClass(name) {
        try {
            return Game.class(name);
        }
        catch (_) {
            return null;
        }
    }
    // These exact classes are present in the pinned build. Keep them optional
    // so a missing subsystem disables only its unlock coverage, not the menu.
    const UITechNode = optionalGameClass("UITechNode");
    const UITouchCosmeticSelection = optionalGameClass("UITouchCosmeticSelection");
    const UITouchWeaponSelection = optionalGameClass("UITouchWeaponSelection");
    const UIPanelLoadout = optionalGameClass("UIPanelLoadout");
    const UIPanelWeaponSkins = optionalGameClass("UIPanelWeaponSkins");
    const PlayerCosmeticsLockerPanel = optionalGameClass("PlayerCosmeticsLockerPanel");
    const PlayfabItem = optionalGameClass("PlayfabItem");
    const MannequinLockerManager = optionalGameClass("MannequinLockerManager");
    const WeaponSkins = optionalGameClass("WeaponSkins");
    const WeaponsManager = optionalGameClass("WeaponsManager");
    const PlayFabManagerClient = optionalGameClass("DL.Networking.DLPlayFabManagerClient");
    const TechNodeWeaponWrap = optionalGameClass("TechNodeWeaponWrap");
    const ScriptableWeaponList = optionalGameClass("ScriptableWeaponList");
    const ClipboardWeapon = optionalGameClass("ClipboardWeapon");
    const StaffToolAccess = optionalGameClass("StaffToolAccess") ?? resolveClassAnywhere("StaffToolAccess");
    const NetworkPlayer = optionalGameClass("DLARX_NetworkPlayer");
    const NetworkRig = optionalGameClass("NetworkRig");
    const NetworkLocalAvatar = optionalGameClass("NetworkLocalAvatar");
    const PlayerGlider = optionalGameClass("PlayerGlider");
    const AdminTeleport = optionalGameClass("AdminTeleport");
    const GrenadeLauncher = optionalGameClass("GrenadeLauncher");
    const GrenadeProjectile = optionalGameClass("Deadeye.Throwables.GrenadeProjectile");
    const GorillaMovement = optionalGameClass("GorillaMovement");
    const MovementManager = optionalGameClass("MovementManager");
    const PlayerVoiceHandler = optionalGameClass("PlayerVoiceHandler");
    const MatchModeClasses = [
        "GameActivity_TeamDeathMatch",
        "Duels.GameActivity_Duels",
        "Duels.GameActivity_DuelsV2",
        "Systems.GameActivities.CTF.GameActivity_CTF",
        "Infected.GameActivity_Infected",
        "GameActivity_Extraction",
        "BattleRoyaleLiteActivity",
    ].map(optionalGameClass).filter(Boolean);
    // Unity 6's private identityQuaternion backing field can expose invalid
    // metadata through IL2CPP; the public Euler factory returns the same value.
    const identityQuaternion = Quaternion.method("Euler", 3).invoke(0, 0, 0);
    let menuSurfaceShader = null;
    const unlockViewFieldState = new Map();
    const unlockWeaponListAdditions = [];
    const unlockWeaponArrayOverrides = new Map();
    let soundboardRecorder = null;
    let soundboardCustomVoiceRecorder = null;
    let soundboardRecorderState = null;
    let soundboardMicRouted = false;
    let soundboardRouteError = "";
    let currentSoundClip = null;
    let soundboardEndTime = 0.0;
    let soundboardTransmitCheckAt = 0.0;
    let soundboardTransmitRetries = 0;
    let pendingWavDecode = null;
    inputOutBool = Il2Cpp.alloc(1);
    inputOutVector2 = Il2Cpp.alloc(8);
    function isLive(value) {
        if (!value)
            return false;
        try {
            return !value.isNull();
        }
        catch (_) {
            return false;
        }
    }
    function isUnityObjectAlive(value) {
        if (!isLive(value))
            return false;
        try {
            return !!UnityObject.method("op_Implicit", 1).invoke(value);
        }
        catch (_) {
            return false;
        }
    }
    function destroy(value) {
        if (!isLive(value))
            return;
        try {
            UnityObject.method("Destroy", 1).invoke(value);
        }
        catch (_) { }
    }
    function getTransform(value) {
        return value.method("get_transform", 0).invoke();
    }
    function getComponent(value, klass) {
        try {
            return value.method("GetComponent", 1)
                .overload("System.Type")
                .invoke(klass.type.object);
        }
        catch (_) {
            return null;
        }
    }
    function addComponent(value, klass) {
        try {
            value.method("Internal_AddComponentWithType", 1).invoke(klass.type.object);
            const component = getComponent(value, klass);
            if (isLive(component))
                return component;
        }
        catch (_) { }
        value.method("AddComponent", 1)
            .overload("System.Type")
            .invoke(klass.type.object);
        return getComponent(value, klass);
    }
    function setName(value, name) {
        try {
            value.method("set_name", 1).invoke(Il2Cpp.string(name));
        }
        catch (_) { }
    }
    function createEmpty(name) {
        const object = GameObject.alloc();
        try {
            object.method(".ctor", 1).invoke(Il2Cpp.string(name));
        }
        catch (_) {
            object.method(".ctor", 0).invoke();
            setName(object, name);
        }
        return object;
    }
    function getMenuSurfaceShader() {
        if (isUnityObjectAlive(menuSurfaceShader))
            return menuSurfaceShader;
        menuSurfaceShader = null;
        for (const shaderName of [
            "Universal Render Pipeline/Unlit",
            "Unlit/Color",
            "UI/Default",
        ]) {
            try {
                const candidate = Shader.method("Find", 1).invoke(Il2Cpp.string(shaderName));
                if (isLive(candidate)) {
                    menuSurfaceShader = candidate;
                    return menuSurfaceShader;
                }
            }
            catch (_) { }
        }
        return null;
    }
    function getFont() {
        if (isUnityObjectAlive(menuFont))
            return menuFont;
        menuFont = null;
        for (const fileName of ["LegacyRuntime.ttf", "Arial.ttf"]) {
            try {
                const candidate = Resources.method("GetBuiltinResource", 2)
                    .overload("System.Type", "System.String")
                    .invoke(Font.type.object, Il2Cpp.string(fileName));
                if (isLive(candidate)) {
                    menuFont = candidate;
                    return menuFont;
                }
            }
            catch (_) { }
        }
        return null;
    }
    function getCurrentGrenadeVariant() {
        return GRENADE_VARIANTS[selectedGrenadeVariant];
    }
    function cycleGrenadeVariant(delta) {
        const variantCount = GRENADE_VARIANTS.length;
        if (!variantCount)
            return;
        selectedGrenadeVariant = (selectedGrenadeVariant + delta + variantCount) % variantCount;
        cachedGrenadePrefab = null;
        cachedGrenadePrefabVariant = -1;
        grenadePrefabRetryAt = -1000.0;
        console.log("[" + MENU_NAME + "] Grenade variant: " + getCurrentGrenadeVariant().name);
    }
    function getCameraTransform(player) {
        try {
            const camera = player.field("playerCamera").value;
            if (isLive(camera))
                return camera.method("get_transform", 0).invoke();
        }
        catch (_) { }
        try {
            const camera = Camera.method("get_main", 0).invoke();
            if (isLive(camera))
                return camera.method("get_transform", 0).invoke();
        }
        catch (_) { }
        return null;
    }
    function resolveTransformFromField(player, fieldName) {
        try {
            const value = player.field(fieldName).value;
            if (!isLive(value))
                return null;
            if (value.class?.name === "UnityEngine.Transform")
                return value;
            try {
                return value.method("get_transform", 0).invoke();
            }
            catch (_) { }
            return isUnityObjectAlive(value) ? value : null;
        }
        catch (_) {
            return null;
        }
    }
    function isLikelyHandTransform(transform) {
        if (!isUnityObjectAlive(transform))
            return false;
        let name = "";
        try {
            name = (objectName(componentGameObject(transform)) || "").toLowerCase();
        }
        catch (_) { }
        if (!name)
            return true;
        if (/(head|neck|chest|spine|hip|pelvis|camera|face|eye|headset|hmd|body|torso)/i.test(name))
            return false;
        if (/(hand|wrist|palm|controller|grip|index|thumb|trigger|primary|secondary|offhand|secondaryhand)/i.test(name))
            return true;
        return false;
    }
    function getCameraTransformFallback(player) {
        try {
            const cameraTransform = player.field("playerCamera").value;
            if (isUnityObjectAlive(cameraTransform))
                return cameraTransform;
        }
        catch (_) { }
        return null;
    }
    function getLeftHandTransform(player) {
        const candidates = [
            "handLeftAnchor",
            "leftHandAnchor",
            "LeftHandAnchor",
            "leftHand",
            "handLeft",
            "leftHandTransform",
            "leftController",
            "leftControllerTransform",
            "leftControllerAnchor",
        ];
        for (const candidate of candidates) {
            const transform = resolveTransformFromField(player, candidate);
            if (isUnityObjectAlive(transform))
                return transform;
        }
        // Fall back to the active hand transform if legacy fields are not
        // available on this build variant.
        try {
            const hands = getLocalHeldWeapons();
            if (hands.length > 0) {
                const hand = hands[0];
                const transform = getTransform(hand);
                if (isUnityObjectAlive(transform))
                    return transform;
            }
        }
        catch (_) { }
        return null;
    }
    function getRightHandTransform(player) {
        const candidates = [
            "handRightAnchor",
            "rightHandAnchor",
            "RightHandAnchor",
            "handRight",
            "rightHand",
            "rightHandTransform",
            "rightController",
            "rightControllerTransform",
            "rightControllerAnchor",
            "offhand",
            "secondaryHand",
        ];
        let fallback = null;
        for (const candidate of candidates) {
            const transform = resolveTransformFromField(player, candidate);
            if (!isUnityObjectAlive(transform))
                continue;
            if (isLikelyHandTransform(transform))
                return transform;
            if (!fallback)
                fallback = transform;
        }
        if (!isUnityObjectAlive(fallback)) {
            try {
                const hands = getLocalHeldWeapons();
                if (hands.length > 0) {
                    const hand = hands[0];
                    const handTransform = getTransform(hand);
                    if (isUnityObjectAlive(handTransform))
                        return handTransform;
                }
            }
            catch (_) { }
        }
        return fallback;
    }
    function readBoolUsage(device, usage) {
        try {
            inputOutBool.writeU8(0);
            const ok = device.method("TryGetFeatureValue", 2)
                .overload("UnityEngine.XR.InputFeatureUsage<System.Boolean>", "System.Boolean&")
                .invoke(usage, inputOutBool);
            return !!ok && inputOutBool.readU8() !== 0;
        }
        catch (_) {
            return false;
        }
    }
    function joystickAxis(value) {
        if (!Number.isFinite(value) || Math.abs(value) < JOYSTICK_DEADZONE)
            return 0.0;
        return Math.max(-1.0, Math.min(1.0, value));
    }
    function readVector2Usage(device, usage) {
        try {
            inputOutVector2.writeFloat(0.0);
            inputOutVector2.add(4).writeFloat(0.0);
            let ok = false;
            try {
                ok = !!device.method("TryGetFeatureValue", 2)
                    .overload("UnityEngine.XR.InputFeatureUsage<UnityEngine.Vector2>", "UnityEngine.Vector2&")
                    .invoke(usage, inputOutVector2);
            }
            catch (_) {
                ok = !!device.method("TryGetFeatureValue", 2).invoke(usage, inputOutVector2);
            }
            if (!ok)
                return [0.0, 0.0];
            return [
                joystickAxis(inputOutVector2.readFloat()),
                joystickAxis(inputOutVector2.add(4).readFloat()),
            ];
        }
        catch (_) {
            return [0.0, 0.0];
        }
    }
    function updateInput(player) {
        leftSecondary = false;
        rightSecondary = false;
        leftTrigger = false;
        leftTriggerAmount = 0.0;
        rightTrigger = false;
        rightTriggerAmount = 0.0;
        leftGrip = false;
        rightGrip = false;
        leftPrimary = false;
        rightPrimary = false;
        leftStickClick = false;
        rightStickClick = false;
        leftStickX = 0.0;
        leftStickY = 0.0;
        rightStickX = 0.0;
        rightStickY = 0.0;
        try {
            const left = InputDevices.method("GetDeviceAtXRNode", 1).invoke(4);
            const right = InputDevices.method("GetDeviceAtXRNode", 1).invoke(5);
            leftSecondary = readBoolUsage(left, CommonUsages.field("secondaryButton").value);
            leftTrigger = readBoolUsage(left, CommonUsages.field("triggerButton").value);
            rightSecondary = readBoolUsage(right, CommonUsages.field("secondaryButton").value);
            rightTrigger = readBoolUsage(right, CommonUsages.field("triggerButton").value);
            leftGrip = readBoolUsage(left, CommonUsages.field("gripButton").value);
            rightGrip = readBoolUsage(right, CommonUsages.field("gripButton").value);
            leftPrimary = readBoolUsage(left, CommonUsages.field("primaryButton").value);
            rightPrimary = readBoolUsage(right, CommonUsages.field("primaryButton").value);
            leftStickClick = readBoolUsage(left, CommonUsages.field("primary2DAxisClick").value);
            rightStickClick = readBoolUsage(right, CommonUsages.field("primary2DAxisClick").value);
            [leftStickX, leftStickY] = readVector2Usage(left, CommonUsages.field("primary2DAxis").value);
            [rightStickX, rightStickY] = readVector2Usage(right, CommonUsages.field("primary2DAxis").value);
        }
        catch (_) { }
        try {
            leftTriggerAmount = Number(player.method("GetTriggerControlMagnitude", 1).invoke(0));
            if (leftTriggerAmount > 0.5)
                leftTrigger = true;
        }
        catch (_) {
            leftTriggerAmount = leftTrigger ? 1.0 : 0.0;
        }
        try {
            rightTriggerAmount = Number(player.method("GetTriggerControlMagnitude", 1).invoke(1));
            if (rightTriggerAmount > 0.5)
                rightTrigger = true;
        }
        catch (_) {
            rightTriggerAmount = rightTrigger ? 1.0 : 0.0;
        }
        try {
            if (Number(player.method("GetGripControlMagnitude", 1).invoke(0)) > 0.5)
                leftGrip = true;
        }
        catch (_) { }
        try {
            if (Number(player.method("GetGripControlMagnitude", 1).invoke(1)) > 0.5)
                rightGrip = true;
        }
        catch (_) { }
        rightSecondaryDown = rightSecondary && !rightSecondaryWasPressed;
        rightSecondaryWasPressed = rightSecondary;
    }
    function eulerFromQuaternion(rotation) {
        try {
            return vector3Value(rotation.method("get_eulerAngles", 0).invoke());
        }
        catch (_) {
            try {
                return vector3Value(rotation.method("eulerAngles", 0).invoke());
            }
            catch (_) {
                return null;
            }
        }
    }
    function findRigVisualTransform(value) {
        const object = hierarchyGameObject(value);
        if (!isUnityObjectAlive(object))
            return null;
        let root = null;
        try {
            root = getTransform(object);
        }
        catch (_) {
            return null;
        }
        // These paths are present in build 1307.  Rotate the avatar skeleton,
        // not the NetworkRig/PlayerController object that can also own the HMD.
        const paths = [
            "masterRig/masterRig_root",
            "MonkeyNetworkRig/masterRig/masterRig_root",
            "MonkeyRig/masterRig/masterRig_root",
        ];
        for (const path of paths) {
            try {
                const child = root.method("Find", 1).invoke(Il2Cpp.string(path));
                if (isUnityObjectAlive(child))
                    return child;
            }
            catch (_) { }
        }
        return root;
    }
    function transformWouldMoveMainCamera(transform) {
        if (!isUnityObjectAlive(transform))
            return true;
        try {
            const camera = Camera.method("get_main", 0).invoke();
            if (!isUnityObjectAlive(camera))
                return false;
            const cameraTransform = getTransform(camera);
            if (!isUnityObjectAlive(cameraTransform))
                return false;
            return sameObject(transform, cameraTransform) ||
                !!cameraTransform.method("IsChildOf", 1).invoke(transform) ||
                !!transform.method("IsChildOf", 1).invoke(cameraTransform);
        }
        catch (_) {
            // A root that cannot be proven independent from the camera is not
            // safe to use for a camera-independent spin.
            return true;
        }
    }
    function collectRigRotateRoots(player) {
        const roots = [];
        const addRoot = (value) => {
            const transform = findRigVisualTransform(value);
            if (!isUnityObjectAlive(transform) || transformWouldMoveMainCamera(transform))
                return;
            const object = hierarchyGameObject(transform);
            const name = (objectName(object) || "").toLowerCase();
            if (/(camera|headset|hmd|tracking.?space|xr.?origin)/i.test(name))
                return;
            if (!roots.some(existing => sameObject(existing, transform)))
                roots.push(transform);
        };
        let localNetworkPlayer = null;
        try {
            const players = objectsOfClass(NetworkPlayer);
            localNetworkPlayer = findLocalNetworkPlayer(players);
            if (isUnityObjectAlive(localNetworkPlayer)) {
                // Prefer explicit replicated body/rig references when a build
                // exposes them under a stable field name.
                for (const fieldName of ["networkRig", "playerAvatar", "avatar", "rig", "body", "playerBody"]) {
                    try {
                        addRoot(localNetworkPlayer.field(fieldName).value);
                    }
                    catch (_) { }
                }
                // Build 1307 renamed several of those fields. Discover fields
                // by both field and declared type names so obfuscated layouts
                // still resolve the NetworkRig/NetworkLocalAvatar component.
                if (roots.length === 0) {
                    try {
                        for (const field of localNetworkPlayer.class.fields || []) {
                            if (field.isStatic)
                                continue;
                            const descriptor = String(field.name || "") + " " + String(field.type?.name || "");
                            if (!/(network.?rig|network.?local.?avatar|network.?avatar|avatar.?behaviour|player.?body)/i.test(descriptor))
                                continue;
                            try {
                                addRoot(localNetworkPlayer.field(String(field.name)).value);
                            }
                            catch (_) { }
                        }
                    }
                    catch (_) { }
                }
                if (roots.length === 0 && NetworkRig) {
                    try {
                        const playerObject = componentGameObject(localNetworkPlayer);
                        const nestedRig = playerObject.method("GetComponentInChildren", 2)
                            .overload("System.Type", "System.Boolean")
                            .invoke(NetworkRig.type.object, true);
                        addRoot(nestedRig);
                    }
                    catch (_) { }
                }
                if (roots.length === 0) {
                    for (const root of localAvatarRoots(localNetworkPlayer))
                        addRoot(root);
                }
            }
        }
        catch (_) { }
        // NetworkLocalAvatar is local-only by definition and is a safer build-
        // independent fallback than rotating the PlayerController hierarchy.
        if (roots.length === 0 && NetworkLocalAvatar) {
            for (const avatar of objectsOfClass(NetworkLocalAvatar, true)) {
                addRoot(avatar);
                if (roots.length > 0)
                    break;
            }
        }
        if (roots.length === 0 && NetworkRig) {
            const rigs = objectsOfClass(NetworkRig, true);
            const authoritative = rigs.filter(rig => networkObjectHasInputAuthority(rig));
            const candidates = authoritative.length > 0 ? authoritative : rigs;
            // Some NetworkRig builds expose authority only on a parent
            // NetworkObject. When that metadata is unavailable, the local rig
            // is the rig closest to the active local PlayerController.
            if (authoritative.length === 0 && isUnityObjectAlive(player)) {
                let playerPosition = null;
                try {
                    playerPosition = vector3Value(getTransform(player).method("get_position", 0).invoke());
                }
                catch (_) { }
                if (playerPosition) {
                    candidates.sort((left, right) => {
                        const distance = (value) => {
                            try {
                                const position = vector3Value(getTransform(value).method("get_position", 0).invoke());
                                if (!position)
                                    return Number.POSITIVE_INFINITY;
                                const dx = position[0] - playerPosition[0];
                                const dy = position[1] - playerPosition[1];
                                const dz = position[2] - playerPosition[2];
                                return dx * dx + dy * dy + dz * dz;
                            }
                            catch (_) {
                                return Number.POSITIVE_INFINITY;
                            }
                        };
                        return distance(left) - distance(right);
                    });
                }
            }
            for (const rig of candidates) {
                addRoot(rig);
                if (roots.length > 0)
                    break;
            }
        }
        // Never fall back to the PlayerController root: it contains the HMD
        // camera and was the reason Spin Bot rotated the user's screen.
        // Rotating both a parent rig and its avatar child would apply the yaw
        // twice, so use the highest-priority safe replicated root only.
        return roots.slice(0, 1);
    }
    function captureRigSpinState(player) {
        const playerKey = visualObjectKey(player);
        if (!playerKey)
            return null;
        if (rigSpinState && rigSpinState.playerKey === playerKey && rigSpinState.roots.length > 0)
            return rigSpinState;
        const roots = collectRigRotateRoots(player);
        const entries = [];
        for (const transform of roots) {
            try {
                const rotation = transform.method("get_localRotation", 0).invoke();
                const baseEuler = eulerFromQuaternion(rotation);
                if (baseEuler) {
                    entries.push({ transform, baseRotation: rotation, baseEuler });
                }
            }
            catch (_) { }
        }
        rigSpinState = {
            playerKey,
            roots: entries,
            active: true,
        };
        return rigSpinState;
    }
    function applyRigSpin(player) {
        if (!mods.spinBot || !isLive(player))
            return;
        const state = captureRigSpinState(player);
        if (!state || state.roots.length === 0) {
            const now = unityNow();
            if (now >= rigSpinNextWarningAt) {
                rigSpinNextWarningAt = now + 5.0;
                console.warn("[" + MENU_NAME + "] Spin Bot is waiting for the local NetworkRig avatar.");
            }
            return;
        }
        rigSpinYaw = (rigSpinYaw + RIG_SPIN_SPEED_DEGREES *
            Math.max(RIG_SPIN_SPEED_MIN, rigSpinCurrentSpeed)) % 360;
        for (const entry of state.roots) {
            try {
                const next = Quaternion.method("Euler", 3).invoke(
                entry.baseEuler[0],
                entry.baseEuler[1] + rigSpinYaw,
                entry.baseEuler[2]);
                entry.transform.method("set_localRotation", 1).invoke(next);
            }
            catch (_) { }
        }
    }
    function restoreRigSpin() {
        if (!rigSpinState)
            return;
        for (const entry of rigSpinState.roots || []) {
            try {
                entry.transform.method("set_localRotation", 1).invoke(entry.baseRotation);
            }
            catch (_) { }
        }
        rigSpinState = null;
        rigSpinYaw = 0.0;
        rigSpinNextWarningAt = -1000.0;
    }
    function readColliderFieldValue(component, fieldName) {
        try {
            return Number(component.field(fieldName).value);
        }
        catch (_) { }
        try {
            const getter = component.method("get_" + fieldName, 0);
            const value = getter.invoke();
            return Number(value);
        }
        catch (_) {
            return Number.NaN;
        }
    }
    function readColliderVectorValue(component, fieldName) {
        try {
            return vector3Value(component.field(fieldName).value);
        }
        catch (_) { }
        try {
            const getter = component.method("get_" + fieldName, 0);
            const value = getter.invoke();
            return vector3Value(value);
        }
        catch (_) {
            return null;
        }
    }
    function writeColliderNumber(component, fieldName, value) {
        try {
            component.field(fieldName).value = value;
            return true;
        }
        catch (_) { }
        try {
            component.method("set_" + fieldName, 1).invoke(value);
            return true;
        }
        catch (_) {
            return false;
        }
    }
    function writeColliderVector(component, fieldName, vector) {
        try {
            const current = component.field(fieldName).value;
            current.field("x").value = vector[0];
            current.field("y").value = vector[1];
            current.field("z").value = vector[2];
            return true;
        }
        catch (_) { }
        const vectorFromValues = () => {
            try {
                const value = Vector3.method("get_zero", 0).invoke();
                value.field("x").value = vector[0];
                value.field("y").value = vector[1];
                value.field("z").value = vector[2];
                return value;
            }
            catch (_) { }
            try {
                return Il2Cpp.structure({
                    x: vector[0],
                    y: vector[1],
                    z: vector[2],
                });
            }
            catch (_) {
                return null;
            }
        };
        try {
            const setter = "set_" + fieldName;
            const method = component.method(setter, 1);
            const vectorTypeName = String(method.parameterTypes[0]?.name || "");
            const value = vectorFromValues();
            if (value && /UnityEngine\.Vector3/i.test(vectorTypeName)) {
                method.invoke(value);
                return true;
            }
        }
        catch (_) { }
        return false;
    }
    function hitboxLayerIndex() {
        if (Number.isInteger(hitboxLayerIndexCache))
            return hitboxLayerIndexCache;
        hitboxLayerIndexCache = 13;
        try {
            const resolved = Number(LayerMask.method("NameToLayer", 1)
                .overload("System.String")
                .invoke(Il2Cpp.string("HitBox")));
            if (Number.isInteger(resolved) && resolved >= 0)
                hitboxLayerIndexCache = resolved;
        }
        catch (_) { }
        return hitboxLayerIndexCache;
    }
    function isDamageHitboxCollider(collider) {
        if (!isUnityObjectAlive(collider))
            return false;
        const object = componentGameObject(collider);
        if (!isUnityObjectAlive(object))
            return false;
        try {
            if (Number(object.method("get_layer", 0).invoke()) !== hitboxLayerIndex())
                return false;
        }
        catch (_) {
            return false;
        }
        const className = String(collider.class?.name || collider.class?.fullName || "");
        return /(BoxCollider|SphereCollider|CapsuleCollider)$/i.test(className);
    }
    function applyHitboxScaleToCollider(collider, scaleMultiplier, patchList) {
        if (!isDamageHitboxCollider(collider))
            return;
        const className = String(collider.class?.name || collider.class?.fullName || "");
        const patchNumber = (fieldName) => {
            const original = readColliderFieldValue(collider, fieldName);
            if (!Number.isFinite(original) || original <= 0)
                return;
            if (writeColliderNumber(collider, fieldName, original * scaleMultiplier))
                patchList.push({ collider, kind: "number", fieldName, original });
        };
        if (/BoxCollider$/i.test(className)) {
            const original = readColliderVectorValue(collider, "size");
            if (original && writeColliderVector(collider, "size", [
                original[0] * scaleMultiplier,
                original[1] * scaleMultiplier,
                original[2] * scaleMultiplier,
            ])) {
                patchList.push({ collider, kind: "vector", fieldName: "size", original });
            }
            return;
        }
        if (/SphereCollider$/i.test(className)) {
            patchNumber("radius");
            return;
        }
        if (/CapsuleCollider$/i.test(className)) {
            patchNumber("radius");
            patchNumber("height");
        }
    }
    function restoreHitboxEntries(entries) {
        for (const entry of entries || []) {
            if (!isUnityObjectAlive(entry.collider))
                continue;
            if (entry.kind === "number") {
                writeColliderNumber(entry.collider, entry.fieldName, entry.original);
            }
            else if (entry.kind === "vector") {
                writeColliderVector(entry.collider, entry.fieldName, entry.original);
            }
        }
    }
    function restoreExtendHitboxes() {
        for (const entries of originalRigHitboxes.values())
            restoreHitboxEntries(entries);
        originalRigHitboxes.clear();
        extendHitboxNextRefreshFrame = -1000;
    }
    function collectDamageHitboxColliders(player) {
        const result = [];
        const seen = new Set();
        for (const root of localAvatarRoots(player)) {
            try {
                const colliders = root.method("GetComponentsInChildren", 2)
                    .overload("System.Type", "System.Boolean")
                    .invoke(Collider.type.object, true);
                for (const collider of objectArrayValues(colliders)) {
                    if (!isDamageHitboxCollider(collider))
                        continue;
                    const colliderKey = visualObjectKey(collider);
                    if (!colliderKey || seen.has(colliderKey))
                        continue;
                    seen.add(colliderKey);
                    result.push(collider);
                }
            }
            catch (_) { }
        }
        return result;
    }
    function applyExtendHitboxes(player) {
        if (!mods.extendHitboxes)
            return;
        if (!isLive(player))
            return;
        if (frameNumber < extendHitboxNextRefreshFrame)
            return;
        extendHitboxNextRefreshFrame = frameNumber + EXTEND_HITBOX_REFRESH_FRAMES;
        const players = objectsOfClass(NetworkPlayer);
        const localPlayer = findLocalNetworkPlayer(players);
        const activeKeys = new Set();
        for (const remote of players) {
            if (!isUnityObjectAlive(remote) || isLocalNetworkTarget(remote, localPlayer))
                continue;
            const playerKey = visualObjectKey(remote);
            if (!playerKey)
                continue;
            activeKeys.add(playerKey);
            const existing = originalRigHitboxes.get(playerKey);
            const colliders = collectDamageHitboxColliders(remote);
            const signature = colliders.map(visualObjectKey).sort().join("|");
            if (existing) {
                // Reassert periodically even when the collider set is
                // unchanged. Avatar code can reset dimensions in place, and
                // a write that failed on the first scan should be retried.
                restoreHitboxEntries(existing);
                originalRigHitboxes.delete(playerKey);
            }
            const patchList = [];
            for (const collider of colliders)
                applyHitboxScaleToCollider(collider, RIG_HITBOX_SCALE, patchList);
            if (patchList.length > 0) {
                patchList.signature = signature;
                originalRigHitboxes.set(playerKey, patchList);
            }
        }
        for (const key of Array.from(originalRigHitboxes.keys())) {
            if (!activeKeys.has(key)) {
                restoreHitboxEntries(originalRigHitboxes.get(key));
                originalRigHitboxes.delete(key);
            }
        }
    }
    function objectName(value) {
        try {
            const name = value.method("get_name", 0).invoke();
            return String(name && name.content !== undefined ? name.content : name);
        }
        catch (_) {
            return "";
        }
    }
    function playerFromWeaponOwner(weapon) {
        if (!isUnityObjectAlive(weapon))
            return null;
        const ownerCandidates = [
            "Owner",
            "owner",
            "<Owner>k__BackingField",
            "ownerPlayer",
            "currentPlayer",
            "_ownerPlayer",
        ];
        for (const candidate of ownerCandidates) {
            try {
                const owner = weapon.field(candidate).value;
                if (isUnityObjectAlive(owner))
                    return owner;
            }
            catch (_) { }
        }
        const getterCandidates = ["get_Owner", "get_owner", "get_CurrentPlayer", "get_OwnerPlayer", "get_EquippingPlayer"];
        for (const candidate of getterCandidates) {
            try {
                const owner = weapon.method(candidate, 0).invoke();
                if (isUnityObjectAlive(owner))
                    return owner;
            }
            catch (_) { }
        }
        return activeLocalPlayer;
    }
    function extractUnityObject(value) {
        try {
            if (!isUnityObjectAlive(value))
                return null;
            if (!value.class || !value.handle)
                return null;
            return value;
        }
        catch (_) {
            return null;
        }
    }
    function setToggle(toggle, enabled) {
        if (mods[toggle] === enabled)
            return;
        mods[toggle] = enabled;
        if (toggle === "infiniteAmmo" && enabled)
            pendingAmmoSweep = true;
        if ((toggle === "noCooldown" || toggle === "rapidFire") && enabled) {
            pendingCooldownReset = true;
            cooldownResetRetryFrame = frameNumber;
        }
        if (toggle === "unlockAll") {
            pendingUnlockRefresh = true;
            if (!enabled) {
                unlockTransitionRestorePending = false;
                unlockTransitionCosmetics = [];
                unlockTransitionStableFrames = 0;
                unlockTransitionRestoreAttempts = 0;
                unlockTransitionSourcePlayerKey = "";
                unlockTransitionConfirmedContentTypes.clear();
                unlockTransitionWeapons = null;
                try {
                    if (unlockTransitionWeaponsPin)
                        unlockTransitionWeaponsPin.free();
                }
                catch (_) { }
                unlockTransitionWeaponsPin = null;
            }
            // One deferred pass is enough to catch UI rows created by the
            // toggle. Rebuilding every catalog view six times caused a large
            // burst of Unity object deletion on the current Quest build.
            unlockRefreshFrames = enabled ? [frameNumber + 60] : [];
            refreshClipboardLobbyAccess();
            console.log(enabled
                ? "[" + MENU_NAME + "] Unlock All is active, including hidden weapon prefabs and appearances. " +
                    "Room changes preserve and automatically reapply the temporary weapon and cosmetic loadout; " +
                    "account entitlements are unchanged."
                : "[" + MENU_NAME + "] Unlock All is disabled; temporary hidden catalog entries were restored.");
        }
        if (toggle === "invincibility") {
            pendingInvincibilityRefresh = !setGodMode(enabled);
        }
        if (toggle === "speedBoost" && !enabled)
            restoreSpeedBoost();
        if (toggle === "joystickFly" && !enabled)
            restoreJoystickFly();
        if (toggle === "longArms" && !enabled)
            restoreLongArms();
        if (toggle === "platforms" && !enabled)
            clearPlatforms();
        if (toggle === "invisibility" && !enabled)
            restoreInvisibility();
        if (toggle === "tracers" && !enabled)
            clearTracers();
        if (toggle === "chams" && !enabled)
            restoreChams();
        if (toggle === "extendHitboxes" && !enabled)
            restoreExtendHitboxes();
        if (toggle === "aimbot" && !enabled) {
            aimbotTarget = null;
            aimbotTargetRefreshFrame = -1000;
            aimbotTargetPoint = null;
            aimbotTargetPointFrame = -1000;
            aimbotAimTransformCache.clear();
        aimbotRoster = [];
        aimbotRosterFrame = -1000;
        aimbotLocal = null;
        aimbotMixed.clear();
        }
        if (toggle === "killInLobby") {
            syncLobbyWeaponDamageGate();
            refreshClipboardLobbyAccess();
        }
        if (toggle === "spinBot" && !enabled)
            restoreRigSpin();
        if (toggle === "showHp" && !enabled)
            clearHpLabels();
        if (toggle === "showHitboxes" && !enabled)
            clearHitboxVisuals();
        console.log("[" + MENU_NAME + "] " + toggle + "=" + enabled);
    }
    function isGun(value) {
        if (!isLive(value))
            return false;
        try {
            return HitscanWeapon.isAssignableFrom(value.class) || ProjectileWeapon.isAssignableFrom(value.class);
        }
        catch (_) {
            return false;
        }
    }
    function sameObject(left, right) {
        if (!isLive(left) || !isLive(right))
            return false;
        try {
            return left.handle.equals(right.handle);
        }
        catch (_) {
            return false;
        }
    }
    function componentIsActiveInScene(component) {
        if (!isUnityObjectAlive(component))
            return false;
        try {
            const object = component.method("get_gameObject", 0).invoke();
            if (!isUnityObjectAlive(object) || !object.method("get_activeInHierarchy", 0).invoke())
                return false;
            return !!object.method("get_scene", 0).invoke().method("IsValid", 0).invoke();
        }
        catch (_) {
            return false;
        }
    }
    function controllerUsesMainCamera(player) {
        if (!componentIsActiveInScene(player))
            return false;
        try {
            const candidate = player.field("playerCamera").value;
            const main = Camera.method("get_main", 0).invoke();
            if (!isUnityObjectAlive(candidate))
                return false;
            if (!isUnityObjectAlive(main)) {
                try {
                    return componentIsActiveInScene(candidate) &&
                        !!candidate.method("get_enabled", 0).invoke();
                }
                catch (_) {
                    return false;
                }
            }
            if (sameObject(candidate, main))
                return true;
            return sameObject(getTransform(candidate), getTransform(main));
        }
        catch (_) {
            return false;
        }
    }
    function currentMannequinLockerManager() {
        if (!MannequinLockerManager)
            return null;
        try {
            const manager = MannequinLockerManager.field("Instance").value;
            if (isLive(manager))
                return manager;
        }
        catch (_) { }
        try {
            return objectsOfClass(MannequinLockerManager, true).find(isLive) || null;
        }
        catch (_) {
            return null;
        }
    }
    function managedStringDictionaryEntries(dictionary, maximum = UNLOCK_TRANSITION_MAX_COSMETICS) {
        const entries = [];
        if (!isLive(dictionary))
            return entries;
        try {
            const keys = dictionary.method("get_Keys", 0).invoke();
            const enumerator = keys.method("GetEnumerator", 0).invoke();
            for (let index = 0; index < maximum; index++) {
                if (!enumerator.method("MoveNext", 0).invoke())
                    break;
                const keyObject = enumerator.method("get_Current", 0).invoke();
                const contentType = managedStringContent(keyObject).trim();
                if (!contentType)
                    continue;
                let itemObject = null;
                try {
                    itemObject = dictionary.method("get_Item", 1)
                        .overload("System.String").invoke(keyObject);
                }
                catch (_) {
                    itemObject = dictionary.method("get_Item", 1).invoke(keyObject);
                }
                const itemId = managedStringContent(itemObject).trim();
                if (itemId)
                    entries.push({ contentType, itemId });
            }
        }
        catch (_) { }
        return entries;
    }
    function snapshotTransitionCosmetics() {
        const manager = currentMannequinLockerManager();
        if (!isLive(manager))
            return [];
        try {
            const equipped = manager.method("GetCachedCurrentlyEquippedItems", 0).invoke();
            return managedStringDictionaryEntries(equipped);
        }
        catch (_) {
            return [];
        }
    }
    function currentWeaponsManager() {
        if (!WeaponsManager)
            return null;
        try {
            const manager = WeaponsManager.method("get_Instance", 0).invoke();
            if (isLive(manager))
                return manager;
        }
        catch (_) { }
        try {
            const manager = WeaponsManager.field("Instance").value;
            if (isLive(manager))
                return manager;
        }
        catch (_) { }
        try {
            return objectsOfClass(WeaponsManager, true).find(componentIsActiveInScene) || null;
        }
        catch (_) {
            return null;
        }
    }
    function clearTransitionWeaponSnapshot() {
        unlockTransitionWeapons = null;
        try {
            if (unlockTransitionWeaponsPin)
                unlockTransitionWeaponsPin.free();
        }
        catch (_) { }
        unlockTransitionWeaponsPin = null;
    }
    function snapshotTransitionWeapons() {
        const manager = currentWeaponsManager();
        if (!isLive(manager))
            return false;
        let current = null;
        try {
            current = manager.method("GetActiveLoadoutWeaponsData", 0).invoke();
        }
        catch (_) {
            try {
                current = manager.method("GetCachedPlayerWeaponsData", 0).invoke();
            }
            catch (_) { }
        }
        if (!isLive(current))
            return false;
        let copy = null;
        try {
            copy = manager.method("CopyWeapons", 1).invoke(current);
        }
        catch (_) {
            try {
                copy = WeaponsManager.method("CopyWeapons", 1).invoke(current);
            }
            catch (_) { }
        }
        if (!isLive(copy))
            return false;
        clearTransitionWeaponSnapshot();
        try {
            unlockTransitionWeaponsPin = copy.ref(true);
        }
        catch (_) {
            return false;
        }
        unlockTransitionWeapons = copy;
        // Commit the active panel selection into the runtime cache before
        // Fusion begins tearing the player down. This does not write account
        // entitlements; it only keeps the selected prefab dictionary alive.
        try {
            const dictionaryType = "System.Collections.Generic.Dictionary<UITouchWeaponSlot.SlotType,DLAR_WeaponBase>";
            manager.method("SetPlayerWeaponsDataCache", 1)
                .overload(dictionaryType).invoke(unlockTransitionWeapons);
        }
        catch (_) { }
        return true;
    }
    function restoreTransitionWeapons() {
        if (!isLive(unlockTransitionWeapons))
            return false;
        const manager = currentWeaponsManager();
        if (!isLive(manager))
            return false;
        const dictionaryType = "System.Collections.Generic.Dictionary<UITouchWeaponSlot.SlotType,DLAR_WeaponBase>";
        try {
            manager.method("SetPlayerWeaponsDataCache", 1)
                .overload(dictionaryType).invoke(unlockTransitionWeapons);
            return true;
        }
        catch (_) {
            return false;
        }
    }
    function prepareUnlockAllForRoomTransition(reason = "room/map transition") {
        const hadOverrides = mods.unlockAll || unlockViewFieldState.size > 0;
        const alreadyPending = unlockTransitionRestorePending;
        if (mods.unlockAll) {
            if (!alreadyPending)
                snapshotTransitionWeapons();
            const snapshot = snapshotTransitionCosmetics();
            if (snapshot.length > 0) {
                const byContentType = new Map(unlockTransitionCosmetics.map((entry) =>
                    [entry.contentType, entry]));
                for (const entry of snapshot)
                    byContentType.set(entry.contentType, entry);
                unlockTransitionCosmetics = Array.from(byContentType.values())
                    .slice(0, UNLOCK_TRANSITION_MAX_COSMETICS);
            }
            if (!alreadyPending) {
                unlockTransitionRestorePending = true;
                unlockTransitionRestoreNotBefore = Date.now() + UNLOCK_TRANSITION_RESTORE_DELAY_MS;
                unlockTransitionSamePlayerNotBefore = Date.now() + UNLOCK_TRANSITION_SAME_PLAYER_DELAY_MS;
                unlockTransitionSourcePlayerKey = isLive(activeLocalPlayer)
                    ? String(visualObjectKey(activeLocalPlayer))
                    : "";
                unlockTransitionStableFrames = 0;
                unlockTransitionRetryFrame = frameNumber;
                unlockTransitionRestoreAttempts = 0;
                unlockTransitionConfirmedContentTypes.clear();
            }
        }
        pendingUnlockRefresh = false;
        unlockRefreshFrames = [];
        // Restore scene-owned panel fields before those panels are destroyed,
        // then immediately reapply only the persistent catalog/backend state.
        // Keeping unlockAll enabled here prevents the next room's loadout
        // validation from replacing the selected weapons with the saved loadout.
        restoreUnlockViewFields();
        if (mods.unlockAll) {
            expandUnlockWeaponCatalog();
            setUnlockCatalogTesting();
        }
        if (hadOverrides && !alreadyPending) {
            console.log("[" + MENU_NAME + "] Unlock All preserved through " + reason +
                "; the new room will refresh its loadout UI automatically.");
        }
    }
    function resetSceneCaches() {
        // Locker presentation overrides belong to the scene that created the
        // panels. Restore them before releasing those wrappers so they cannot
        // leak into the next Fusion room's catalog/loadout validation.
        prepareUnlockAllForRoomTransition();
        restoreRigSpin();
        resetRigMods();
        restoreExtendHitboxes();
        aimbotTarget = null;
        aimbotTargetRefreshFrame = -1000;
        aimbotTargetPoint = null;
        aimbotTargetPointFrame = -1000;
        heldWeaponsCacheFrame = -1000;
        heldWeaponsCache = [];
        aimbotAimTransformCache.clear();
        aimbotRoster = [];
        aimbotRosterFrame = -1000;
        aimbotLocal = null;
        aimbotMixed.clear();
        teamKeyCache.clear();
        restoreJoystickFly();
        restoreLongArms();
        restoreSpeedBoost();
        restoreInvisibility();
        clearPlatforms();
        clearVisuals();
        cachedClipboardWeapon = null;
        cachedGrenadePrefab = null;
        cachedGrenadePrefabVariant = -1;
        cachedProjectileWeaponTemplate = null;
        grenadePrefabRetryAt = -1000.0;
        projectileWeaponTemplateRetryAt = -1000.0;
        lastVisualScanFrame = -1000;
        lastMatchModeScanFrame = -1000;
        cachedMatchModeActive = false;
        chamScanCursor = 0;
        rightSecondaryDown = false;
        rightSecondaryWasPressed = false;
        focusCleanupPending = false;
    }
    function applicationAllowsMenuTick() {
        localControllerFocusPoll++;
        if (localControllerFocusPoll % APPLICATION_FOCUS_POLL_CALLS !== 0) {
            return true;
        }
        try {
            cachedApplicationFocused = !!Application.method("get_isFocused", 0).invoke();
        }
        catch (_) {
            // If this Unity build does not expose the property, preserve the
            // normal in-game path instead of disabling the menu.
            cachedApplicationFocused = true;
        }
        if (!cachedApplicationFocused) {
            focusLostFrameCount += APPLICATION_FOCUS_POLL_CALLS;
            if (focusLostFrameCount >= APPLICATION_FOCUS_GRACE_FRAMES && isUnityObjectAlive(activeLocalPlayer)) {
                focusCleanupPending = true;
                focusLostFrameCount = 0;
                return false;
            }
            return true;
        }
        if (focusCleanupPending) {
            focusCleanupPending = false;
            resetSceneCaches();
        }
        focusLostFrameCount = 0;
        return true;
    }
    function shouldTickPlayerController(player) {
        const now = Date.now();
        const appAllowed = applicationAllowsMenuTick();
        if (isLive(activeLocalPlayer)) {
            if (!sameObject(player, activeLocalPlayer)) {
                // Multiplayer invokes this hook for every remote controller.
                // The cached local handle makes those callbacks a pointer-only
                // fast path instead of repeating Unity scene/camera calls.
                if (now - lastLocalControllerTickAt < LOCAL_CONTROLLER_STALE_MS)
                    return false;
            }
            else {
                lastLocalControllerTickAt = now;
                if (!appAllowed) {
                    focusCleanupPending = true;
                    return false;
                }
                if (now - lastLocalControllerValidationAt < LOCAL_CONTROLLER_RECHECK_MS)
                    return true;
                if (controllerUsesMainCamera(player)) {
                    lastLocalControllerValidationAt = now;
                    return true;
                }
                resetSceneCaches();
                activeLocalPlayer = null;
            }
        }
        if (!appAllowed) {
            if (isUnityObjectAlive(activeLocalPlayer))
                focusCleanupPending = true;
            return false;
        }
        if (!controllerUsesMainCamera(player))
            return false;
        if (isLive(activeLocalPlayer) && !sameObject(player, activeLocalPlayer))
            resetSceneCaches();
        activeLocalPlayer = player;
        lastLocalControllerTickAt = now;
        lastLocalControllerValidationAt = now;
        return true;
    }
    function getLocalHeldWeapons() {
        if (!isLive(activeLocalPlayer))
            return [];
        if (heldWeaponsCacheFrame === frameNumber)
            return heldWeaponsCache;
        const result = [];
        for (const methodName of ["GetPreferredHandWeapon", "GetOffHandWeapon"]) {
            try {
                const weapon = activeLocalPlayer.method(methodName, 0).invoke();
                if (!isLive(weapon))
                    continue;
                if (!result.some(existing => sameObject(existing, weapon)))
                    result.push(weapon);
            }
            catch (_) { }
        }
        heldWeaponsCacheFrame = frameNumber;
        heldWeaponsCache = result;
        return heldWeaponsCache;
    }
    function isLocalWeapon(weapon) {
        if (!isLive(weapon))
            return false;
        return getLocalHeldWeapons().some(localWeapon => sameObject(localWeapon, weapon));
    }
    function isLocalAmmoStorage(storage) {
        if (!isLive(storage))
            return false;
        try {
            return isLocalWeapon(storage.field("_weapon").value);
        }
        catch (_) {
            return false;
        }
    }
    function weaponSettings(weapon) {
        try {
            const settings = weapon.field("weaponSettings").value;
            return isLive(settings) ? settings : null;
        }
        catch (_) {
            return null;
        }
    }
    function topUpWeapon(weapon) {
        if (!isLive(weapon))
            return;
        try {
            const settings = weaponSettings(weapon);
            if (!settings)
                return;
            const magazine = Math.max(0, Math.trunc(Number(settings.field("MagazineCapacity").value)));
            const total = Math.max(magazine, Math.trunc(Number(settings.field("TotalAmmo").value)));
            if (magazine > 0)
                weapon.field("<currentAmmo>k__BackingField").value = magazine;
            if (total > 0)
                weapon.field("<currentTotalAmmo>k__BackingField").value = total;
        }
        catch (_) { }
    }
    function findObjects(klass) {
        if (!klass)
            return null;
        try {
            return UnityObject.method("FindObjectsByType", 2)
                .overload("System.Type", "UnityEngine.FindObjectsSortMode")
                .invoke(klass.type.object, 0);
        }
        catch (_) {
            try {
                return UnityObject.method("FindObjectsOfType", 1)
                    .overload("System.Type")
                    .invoke(klass.type.object);
            }
            catch (_) {
                return null;
            }
        }
    }
    function findResourceObjects(klass) {
        if (!klass)
            return null;
        try {
            return Resources.method("FindObjectsOfTypeAll", 1)
                .overload("System.Type")
                .invoke(klass.type.object);
        }
        catch (_) {
            return null;
        }
    }
    function findSceneObjectsIncludingInactive(klass) {
        if (!klass)
            return null;
        try {
            return UnityObject.method("FindObjectsByType", 3)
                .overload("System.Type", "UnityEngine.FindObjectsInactive", "UnityEngine.FindObjectsSortMode")
                .invoke(klass.type.object, 1, 0);
        }
        catch (_) {
            return null;
        }
    }
    function objectArrayValues(objects) {
        const values = [];
        try {
            for (let index = 0; objects && index < objects.length; index++) {
                const value = objects.get(index);
                if (isLive(value))
                    values.push(value);
            }
        }
        catch (_) { }
        return values;
    }
    function objectsOfClass(klass, includeInactive = false, includeAssets = false) {
        const values = objectArrayValues(findObjects(klass));
        if (includeInactive) {
            for (const value of objectArrayValues(findSceneObjectsIncludingInactive(klass))) {
                if (!values.some(existing => sameObject(existing, value)))
                    values.push(value);
            }
        }
        if (includeAssets) {
            for (const value of objectArrayValues(findResourceObjects(klass))) {
                if (!values.some(existing => sameObject(existing, value)))
                    values.push(value);
            }
        }
        return values;
    }
    function componentGameObject(component) {
        if (!isLive(component))
            return null;
        try {
            return component.method("get_gameObject", 0).invoke();
        }
        catch (_) {
            return null;
        }
    }
    function findClipboardWeapon() {
        const sceneCandidates = objectsOfClass(ClipboardWeapon, true);
        if (sceneCandidates.length > 0) {
            cachedClipboardWeapon = sceneCandidates[0];
            return cachedClipboardWeapon;
        }
        if (isLive(cachedClipboardWeapon))
            return cachedClipboardWeapon;
        const resourceCandidates = objectArrayValues(findResourceObjects(ClipboardWeapon));
        cachedClipboardWeapon = resourceCandidates.length > 0 ? resourceCandidates[0] : null;
        return cachedClipboardWeapon;
    }
    function setGodMode(enabled) {
        const clipboard = findClipboardWeapon();
        if (!isLive(clipboard))
            return false;
        try {
            const current = !!clipboard.method("IsGodModeEnabled", 0).invoke();
            if (current !== enabled)
                clipboard.method("ToggleGodMode", 0).invoke();
            return !!clipboard.method("IsGodModeEnabled", 0).invoke() === enabled;
        }
        catch (_) {
            return false;
        }
    }
    function methodBoolean(value, methodNames) {
        for (const methodName of methodNames) {
            try {
                return !!value.method(methodName, 0).invoke();
            }
            catch (_) { }
        }
        return null;
    }
    function networkObjectHasInputAuthority(player) {
        const direct = methodBoolean(player, [
            "get_HasInputAuthority",
            "get_IsLocalPlayer",
            "get_IsLocal",
            "get_IsMine",
        ]);
        if (direct !== null)
            return direct;
        try {
            const networkObject = player.method("get_Object", 0).invoke();
            if (isLive(networkObject)) {
                const authority = methodBoolean(networkObject, ["get_HasInputAuthority"]);
                if (authority !== null)
                    return authority;
            }
        }
        catch (_) { }
        return false;
    }
    function networkObjectHasStateAuthority(player) {
        const direct = methodBoolean(player, [
            "get_HasStateAuthority",
            "get_IsStateAuthority",
        ]);
        if (direct !== null)
            return direct;
        try {
            const networkObject = player.method("get_Object", 0).invoke();
            if (isLive(networkObject)) {
                const authority = methodBoolean(networkObject, [
                    "get_HasStateAuthority",
                    "get_IsStateAuthority",
                ]);
                if (authority !== null)
                    return authority;
            }
        }
        catch (_) { }
        return false;
    }
    function closestNetworkPlayerToLocal(players) {
        if (!isLive(activeLocalPlayer))
            return null;
        let localPosition = null;
        try {
            localPosition = getTransform(activeLocalPlayer).method("get_position", 0).invoke();
        }
        catch (_) {
            return null;
        }
        const lx = Number(localPosition.field("x").value);
        const ly = Number(localPosition.field("y").value);
        const lz = Number(localPosition.field("z").value);
        let closest = null;
        let closestDistance = Number.POSITIVE_INFINITY;
        for (const player of players) {
            try {
                const position = getTransform(player).method("get_position", 0).invoke();
                const dx = Number(position.field("x").value) - lx;
                const dy = Number(position.field("y").value) - ly;
                const dz = Number(position.field("z").value) - lz;
                const distance = dx * dx + dy * dy + dz * dz;
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closest = player;
                }
            }
            catch (_) { }
        }
        return closest;
    }
    function findLocalNetworkPlayer(players) {
        for (const glider of objectsOfClass(PlayerGlider)) {
            try {
                if (!sameObject(glider.field("player").value, activeLocalPlayer))
                    continue;
                const networkPlayer = glider.field("networkPlayer").value;
                if (isLive(networkPlayer))
                    return networkPlayer;
            }
            catch (_) { }
        }
        for (const player of players) {
            if (networkObjectHasInputAuthority(player))
                return player;
        }
        return closestNetworkPlayerToLocal(players);
    }
    function isLocalNetworkTarget(player, resolvedLocalPlayer) {
        return sameObject(player, resolvedLocalPlayer) || networkObjectHasInputAuthority(player);
    }
    function grenadeNameLooksUsable(name) {
        const lower = name.toLowerCase();
        return lower.includes("grenade") && !lower.includes("smoke") &&
            !lower.includes("visual") && !lower.includes("vfx");
    }
    function dumpThrowables() {
        const pattern = /(grenade|bomb|projectile|throwable|explosive|mine|rocket|molotov|flash|smoke)/i;
        const entries = new Map();
        const addEntry = (value, source) => {
            if (!isUnityObjectAlive(value))
                return;
            const object = componentGameObject(value) || value;
            const name = objectName(object);
            if (!pattern.test(name))
                return;
            let className = "GameObject";
            try {
                className = String(value.class.fullName || value.class.name || className);
            }
            catch (_) { }
            entries.set(className + " | " + name, source);
        };
        for (const object of objectArrayValues(findResourceObjects(GameObject)))
            addEntry(object, "GameObject");
        for (const className of ["Deadeye.Throwables.GrenadeProjectile", "GrenadeProjectile", "GrenadeLauncher"]) {
            const klass = resolveClass(className);
            if (!klass)
                continue;
            for (const value of objectArrayValues(findResourceObjects(klass)))
                addEntry(value, className);
        }
        console.log("[" + MENU_NAME + "] Throwable dump: " + entries.size + " match(es).");
        for (const [entry, source] of [...entries.entries()].sort((left, right) => left[0].localeCompare(right[0])))
            console.log("[" + MENU_NAME + "] THROWABLE [" + source + "] " + entry);
    }
    function findGrenadePrefab() {
        if (cachedGrenadePrefabVariant === selectedGrenadeVariant && isUnityObjectAlive(cachedGrenadePrefab))
            return cachedGrenadePrefab;
        cachedGrenadePrefab = null;
        const now = unityNow();
        if (now < grenadePrefabRetryAt)
            return null;
        const variant = getCurrentGrenadeVariant();
        const prefabNames = new Set((variant.prefabNames || [])
            .map(name => String(name).toLowerCase()));
        const matchesVariant = (value) => {
            if (!isUnityObjectAlive(value))
                return false;
            const normalized = objectName(value).replace(/\(Clone\)$/i, "").trim().toLowerCase();
            return prefabNames.has(normalized);
        };
        for (const resourcePath of variant.resourcePaths) {
            try {
                const loaded = Resources.method("Load", 2)
                    .overload("System.String", "System.Type")
                    .invoke(Il2Cpp.string(resourcePath), GameObject.type.object);
                if (isUnityObjectAlive(loaded)) {
                    cachedGrenadePrefab = loaded;
                    cachedGrenadePrefabVariant = selectedGrenadeVariant;
                    return cachedGrenadePrefab;
                }
            }
            catch (_) { }
        }
        for (const launcher of objectsOfClass(GrenadeLauncher, true, false)) {
            try {
                const prefab = launcher.method("GetProjectilePrefab", 0).invoke();
                if (matchesVariant(prefab)) {
                    cachedGrenadePrefab = prefab;
                    cachedGrenadePrefabVariant = selectedGrenadeVariant;
                    return cachedGrenadePrefab;
                }
            }
            catch (_) { }
        }
        for (const className of variant.classNames) {
            const projectileClass = resolveClass(className);
            if (!projectileClass)
                continue;
            for (const projectile of objectArrayValues(findResourceObjects(projectileClass))) {
                const object = componentGameObject(projectile);
                if (!isUnityObjectAlive(object))
                    continue;
                if (matchesVariant(object)) {
                    cachedGrenadePrefab = object;
                    cachedGrenadePrefabVariant = selectedGrenadeVariant;
                    return cachedGrenadePrefab;
                }
            }
        }
        for (const object of objectArrayValues(findResourceObjects(GameObject))) {
            if (matchesVariant(object)) {
                cachedGrenadePrefab = object;
                cachedGrenadePrefabVariant = selectedGrenadeVariant;
                return cachedGrenadePrefab;
            }
        }
        grenadePrefabRetryAt = now + GRENADE_PREFAB_RETRY_SECONDS;
        return null;
    }
    function invokeProjectileLaunch(weapon, direction, extraVelocity) {
        if (!projectileLaunchMethod || !isUnityObjectAlive(weapon))
            return false;
        const bound = projectileLaunchMethod.bind(weapon);
        if (projectileLaunchMethod.parameterCount === 4) {
            // this build: LaunchProjectile(direction, offset, shootPoint, power). power 1.0 = a normal shot (not verified in game yet)
            const launchOrigin = getTransform(weapon);
            if (!isUnityObjectAlive(launchOrigin))
                return false;
            bound.invoke(direction, extraVelocity, launchOrigin, 1.0);
        }
        else if (projectileLaunchMethod.parameterCount === 3) {
            const launchOrigin = getTransform(weapon);
            if (!isUnityObjectAlive(launchOrigin))
                return false;
            bound.invoke(direction, extraVelocity, launchOrigin);
        }
        else {
            bound.invoke(direction, extraVelocity);
        }
        return true;
    }
    function launchGrenadeThroughHeldWeapon(prefab, direction) {
        for (const weapon of getLocalHeldWeapons()) {
            try {
                if (!ProjectileWeapon.isAssignableFrom(weapon.class))
                    continue;
                const overrideField = weapon.field("overrideProjectilePrefab");
                const previousOverride = overrideField.value;
                try {
                    weapon.method("SetOverrideProjectilePrefab", 1).invoke(prefab);
                    if (invokeProjectileLaunch(weapon, direction, [0, 0, 0]))
                        return true;
                }
                finally {
                    try {
                        weapon.method("SetOverrideProjectilePrefab", 1).invoke(previousOverride);
                    }
                    catch (_) { }
                }
            }
            catch (_) { }
        }
        return false;
    }
    function findProjectileWeaponTemplate() {
        if (isUnityObjectAlive(cachedProjectileWeaponTemplate))
            return cachedProjectileWeaponTemplate;
        cachedProjectileWeaponTemplate = null;
        const now = unityNow();
        if (now < projectileWeaponTemplateRetryAt)
            return null;
        const candidates = objectArrayValues(findResourceObjects(ProjectileWeapon));
        const preferred = candidates.find(candidate => {
            const name = objectName(componentGameObject(candidate)).toLowerCase();
            return name.includes("basketballlauncher") || name.includes("basketball launcher");
        });
        cachedProjectileWeaponTemplate = preferred ?? candidates.find(candidate => isLive(componentGameObject(candidate))) ?? null;
        if (!isUnityObjectAlive(cachedProjectileWeaponTemplate)) {
            projectileWeaponTemplateRetryAt = now + GRENADE_TEMPLATE_RETRY_SECONDS;
        }
        else {
            projectileWeaponTemplateRetryAt = -1000.0;
        }
        return cachedProjectileWeaponTemplate;
    }
    function launchGrenadeThroughTemplate(prefab, hand, direction) {
        const template = findProjectileWeaponTemplate();
        const templateObject = componentGameObject(template);
        if (!isLive(templateObject))
            return false;
        let clone = null;
        try {
            const position = hand.method("get_position", 0).invoke();
            const rotation = hand.method("get_rotation", 0).invoke();
            clone = UnityObject.method("Instantiate", 3)
                .overload("UnityEngine.Object", "UnityEngine.Vector3", "UnityEngine.Quaternion")
                .invoke(templateObject, position, rotation);
            if (!isLive(clone))
                return false;
            try {
                clone.method("SetActive", 1).invoke(true);
            }
            catch (_) { }
            let weapon = getComponent(clone, ProjectileWeapon);
            if (!isLive(weapon)) {
                try {
                    weapon = clone.method("GetComponentInChildren", 2)
                        .overload("System.Type", "System.Boolean")
                        .invoke(ProjectileWeapon.type.object, true);
                }
                catch (_) { }
            }
            if (!isLive(weapon))
                return false;
            weapon.method("SetOverrideProjectilePrefab", 1).invoke(prefab);
            return invokeProjectileLaunch(weapon, direction, [0, 0, 0]);
        }
        catch (_) {
            return false;
        }
        finally {
            if (isLive(clone))
                destroy(clone);
        }
    }
    function launchGrenadeFromHand(player, bypassCooldown = false, bulkLaunch = false) {
        const now = unityNow();
        if (!bypassCooldown && now - lastGrenadeLaunchTime < GRENADE_LAUNCH_COOLDOWN)
            return false;
        // Reserve the slot before any expensive lookup or spawn attempt so a
        // missing prefab/exception cannot retry on every LateUpdate while held.
        lastGrenadeLaunchTime = now;
        const hand = getRightHandTransform(player);
        const prefab = findGrenadePrefab();
        if (!isUnityObjectAlive(hand) || !isUnityObjectAlive(prefab)) {
            if (now - lastGrenadePrefabWarningTime >= 1.0) {
                lastGrenadePrefabWarningTime = now;
                console.error("[" + MENU_NAME + "] Grenade Launcher is waiting for the " +
                    getCurrentGrenadeVariant().name + " prefab.");
            }
            return false;
        }
        try {
            const forwardValue = hand.method("get_forward", 0).invoke();
            const direction = [
                Number(forwardValue.field("x").value),
                Number(forwardValue.field("y").value),
                Number(forwardValue.field("z").value),
            ];
            if (launchGrenadeThroughHeldWeapon(prefab, direction)) {
                return true;
            }
            // A temporary weapon clone is acceptable for one normal shot but
            // wasteful for a 50-projectile burst. Nuke falls through to the
            // direct prefab path when no held projectile weapon is available.
            if (!bulkLaunch && launchGrenadeThroughTemplate(prefab, hand, direction)) {
                return true;
            }
            const handPosition = hand.method("get_position", 0).invoke();
            const position = [
                Number(handPosition.field("x").value) + direction[0] * 0.22,
                Number(handPosition.field("y").value) + direction[1] * 0.22,
                Number(handPosition.field("z").value) + direction[2] * 0.22,
            ];
            const rotation = hand.method("get_rotation", 0).invoke();
            const grenade = UnityObject.method("Instantiate", 3)
                .overload("UnityEngine.Object", "UnityEngine.Vector3", "UnityEngine.Quaternion")
                .invoke(prefab, position, rotation);
            if (!isLive(grenade))
                throw new Error("Unity returned no grenade instance");
            try {
                grenade.method("SetActive", 1).invoke(true);
            }
            catch (_) { }
            let rigidbody = getComponent(grenade, Rigidbody);
            if (!isLive(rigidbody)) {
                try {
                    rigidbody = grenade.method("GetComponentInChildren", 2)
                        .overload("System.Type", "System.Boolean")
                        .invoke(Rigidbody.type.object, true);
                }
                catch (_) { }
            }
            if (isLive(rigidbody)) {
                const velocity = [
                    direction[0] * GRENADE_LAUNCH_SPEED,
                    direction[1] * GRENADE_LAUNCH_SPEED,
                    direction[2] * GRENADE_LAUNCH_SPEED,
                ];
                try {
                    rigidbody.method("set_linearVelocity", 1).invoke(velocity);
                }
                catch (_) {
                    try {
                        rigidbody.method("set_velocity", 1).invoke(velocity);
                    }
                    catch (_) {
                        rigidbody.method("AddForce", 2).invoke(velocity, 2);
                    }
                }
            }
            // Raw fallback projectiles do not always have the launcher's normal
            // cleanup path. Bound their lifetime so held rapid fire cannot leak
            // physics objects for the rest of the scene.
            try {
                UnityObject.method("Destroy", 2).invoke(grenade, bulkLaunch ? 5.0 : 8.0);
            }
            catch (_) { }
            return true;
        }
        catch (error) {
            console.error("[" + MENU_NAME + "] Grenade launch failed: " + error);
            return false;
        }
    }
    function invokeForObjects(klass, methodNames, includeInactive = false) {
        const stats = { found: 0, invoked: 0, failed: 0 };
        if (!klass)
            return stats;
        const objects = objectsOfClass(klass, includeInactive);
        stats.found = objects.length;
        for (const object of objects) {
            for (const methodName of methodNames) {
                try {
                    object.method(methodName, 0).invoke();
                    stats.invoked++;
                }
                catch (_) {
                    stats.failed++;
                }
            }
        }
        return stats;
    }
    function unlockFieldKey(object, fieldName) {
        try {
            return object.handle.toString() + ":" + fieldName;
        }
        catch (_) {
            return objectName(object) + ":" + fieldName;
        }
    }
    function setRememberedUnlockField(object, fieldName, value) {
        if (!isLive(object))
            return;
        try {
            const field = object.field(fieldName);
            const key = unlockFieldKey(object, fieldName);
            const current = field.value;
            try {
                const underlying = current.field("value__");
                if (!unlockViewFieldState.has(key)) {
                    unlockViewFieldState.set(key, {
                        object,
                        fieldName,
                        value: Number(underlying.value),
                        isEnum: true,
                    });
                }
                underlying.value = Number(value);
                return;
            }
            catch (_) { }
            if (!unlockViewFieldState.has(key)) {
                unlockViewFieldState.set(key, { object, fieldName, value: current, isEnum: false });
            }
            field.value = value;
        }
        catch (_) { }
    }
    function unlockWeaponKey(weapon) {
        if (!isUnityObjectAlive(weapon))
            return "";
        let className = "";
        try {
            className = String(weapon.class.fullName || weapon.class.name || "");
        }
        catch (_) { }
        return className + "|" + objectName(weapon);
    }
    function isPersistentWeaponAsset(weapon) {
        if (!isUnityObjectAlive(weapon))
            return false;
        try {
            const object = componentGameObject(weapon);
            if (!isUnityObjectAlive(object))
                return false;
            const scene = object.method("get_scene", 0).invoke();
            return !scene.method("IsValid", 0).invoke();
        }
        catch (_) {
            return false;
        }
    }
    function managedCollectionValues(collection, limit = 1024) {
        const values = [];
        if (!collection)
            return values;
        let count = 0;
        try {
            if (collection instanceof Il2Cpp.Array)
                count = Number(collection.length);
            else
                count = Number(collection.method("get_Count", 0).invoke());
        }
        catch (_) {
            return values;
        }
        if (!Number.isFinite(count) || count < 0)
            return values;
        count = Math.min(limit, Math.trunc(count));
        for (let index = 0; index < count; index++) {
            try {
                const value = collection instanceof Il2Cpp.Array
                    ? collection.get(index)
                    : collection.method("get_Item", 1).overload("System.Int32").invoke(index);
                if (isLive(value))
                    values.push(value);
            }
            catch (_) { }
        }
        return values;
    }
    function restoreUnlockWeaponCatalog() {
        for (let index = unlockWeaponListAdditions.length - 1; index >= 0; index--) {
            const saved = unlockWeaponListAdditions[index];
            if (!saved || !isLive(saved.collection) || !isUnityObjectAlive(saved.weapon))
                continue;
            try {
                saved.collection.method("Remove", 1).invoke(saved.weapon);
            }
            catch (_) { }
        }
        unlockWeaponListAdditions.length = 0;
        for (const saved of unlockWeaponArrayOverrides.values()) {
            try {
                if (isUnityObjectAlive(saved.object) && saved.originalValues) {
                    const replacement = Il2Cpp.array(WeaponBase, saved.originalValues.length);
                    for (let index = 0; index < saved.originalValues.length; index++)
                        replacement.set(index, saved.originalValues[index]);
                    saved.object.field(saved.fieldName).value = replacement;
                }
                else if (isUnityObjectAlive(saved.object)) {
                    saved.object.field(saved.fieldName).value = saved.original;
                }
            }
            catch (_) { }
            try {
                if (saved.originalPin)
                    saved.originalPin.free();
            }
            catch (_) { }
        }
        unlockWeaponArrayOverrides.clear();
    }
    function expandUnlockWeaponCatalogUnsafe() {
        const stats = { catalogs: 0, candidates: 0, added: 0, total: 0, names: [] };
        if (!mods.unlockAll || !ScriptableWeaponList)
            return stats;
        let candidates = objectArrayValues(findResourceObjects(WeaponBase))
            .filter(weapon => {
            try {
                return isUnityObjectAlive(weapon) && WeaponBase.isAssignableFrom(weapon.class);
            }
            catch (_) {
                return false;
            }
        });
        const persistentCandidates = candidates.filter(isPersistentWeaponAsset);
        if (persistentCandidates.length > 0)
            candidates = persistentCandidates;
        else
            candidates = candidates.filter(weapon => !componentIsActiveInScene(weapon));
        const candidatesByKey = new Map();
        for (const weapon of candidates) {
            const key = unlockWeaponKey(weapon);
            if (key && !candidatesByKey.has(key))
                candidatesByKey.set(key, weapon);
        }
        candidates = Array.from(candidatesByKey.values()).sort((left, right) =>
            unlockWeaponKey(left).localeCompare(unlockWeaponKey(right)));
        stats.candidates = candidates.length;
        for (const catalog of objectsOfClass(ScriptableWeaponList, false, true)) {
            if (!isUnityObjectAlive(catalog) || objectName(catalog) !== "SelectableWeapons")
                continue;
            const weaponCollections = [];
            for (const field of ScriptableWeaponList.fields || []) {
                let fieldName = "";
                let typeName = "";
                try {
                    if (field.isStatic)
                        continue;
                    fieldName = String(field.name);
                    typeName = String(field.type.name);
                }
                catch (_) {
                    continue;
                }
                if (!/weapon/i.test(fieldName) && !/DLAR_WeaponBase/.test(typeName))
                    continue;
                let collection = null;
                try {
                    collection = catalog.field(fieldName).value;
                }
                catch (_) {
                    continue;
                }
                const existing = managedCollectionValues(collection);
                if (existing.length === 0 || !existing.some(weapon => {
                    try {
                        return WeaponBase.isAssignableFrom(weapon.class);
                    }
                    catch (_) {
                        return false;
                    }
                })) {
                    continue;
                }
                weaponCollections.push({ fieldName, collection, existing });
            }
            // SelectableWeapons also carries a small auxiliary weapon array. The
            // primary selectable catalog is the largest WeaponBase collection;
            // expanding every weapon-shaped field would corrupt that auxiliary list.
            weaponCollections.sort((left, right) => right.existing.length - left.existing.length);
            const target = weaponCollections[0];
            if (!target)
                continue;
            stats.catalogs++;
            const { fieldName, collection, existing } = target;
            const knownKeys = new Set(existing.map(unlockWeaponKey).filter(Boolean));
            const missing = candidates.filter(weapon => {
                const key = unlockWeaponKey(weapon);
                if (!key || knownKeys.has(key))
                    return false;
                knownKeys.add(key);
                return true;
            });
            if (missing.length === 0) {
                stats.total = Math.max(stats.total, existing.length);
                continue;
            }
            if (collection instanceof Il2Cpp.Array) {
                const stateKey = unlockFieldKey(catalog, fieldName);
                let saved = unlockWeaponArrayOverrides.get(stateKey);
                if (!saved) {
                    let originalPin = null;
                    try {
                        originalPin = collection.ref(true);
                    }
                    catch (_) {
                        continue;
                    }
                    saved = { object: catalog, fieldName, original: collection, originalPin };
                    unlockWeaponArrayOverrides.set(stateKey, saved);
                }
                try {
                    const combined = existing.concat(missing);
                    const replacement = Il2Cpp.array(WeaponBase, combined.length);
                    for (let index = 0; index < combined.length; index++)
                        replacement.set(index, combined[index]);
                    catalog.field(fieldName).value = replacement;
                    stats.added += missing.length;
                    stats.total = Math.max(stats.total, combined.length);
                    stats.names.push(...missing.map(objectName));
                }
                catch (_) { }
                continue;
            }
            for (const weapon of missing) {
                try {
                    collection.method("Add", 1).invoke(weapon);
                    unlockWeaponListAdditions.push({ collection, weapon });
                    stats.added++;
                    stats.names.push(objectName(weapon));
                }
                catch (_) { }
            }
            stats.total = Math.max(stats.total, managedCollectionValues(collection).length);
        }
        return stats;
    }
    function expandUnlockWeaponCatalog() {
        const stats = { catalogs: 0, candidates: 0, added: 0, total: 0, names: [] };
        if (!mods.unlockAll || !ScriptableWeaponList)
            return stats;
        for (const catalog of objectsOfClass(ScriptableWeaponList, false, true)) {
            if (!isUnityObjectAlive(catalog) || objectName(catalog) !== "SelectableWeapons")
                continue;
            let normalWeapons = null;
            let developerWeapons = null;
            try {
                normalWeapons = catalog.field("weapons").value;
                developerWeapons = catalog.field("devWeapons").value;
            }
            catch (_) {
                continue;
            }
            if (!(normalWeapons instanceof Il2Cpp.Array) ||
                !(developerWeapons instanceof Il2Cpp.Array)) {
                continue;
            }
            const existing = managedCollectionValues(normalWeapons);
            const developer = managedCollectionValues(developerWeapons);
            stats.catalogs++;
            stats.candidates += developer.length;
            const missing = developer.filter(weapon =>
                !existing.some(current => sameObject(current, weapon)));
            if (missing.length === 0) {
                stats.total = Math.max(stats.total, existing.length);
                continue;
            }
            const stateKey = unlockFieldKey(catalog, "weapons");
            if (!unlockWeaponArrayOverrides.has(stateKey)) {
                unlockWeaponArrayOverrides.set(stateKey, {
                    object: catalog,
                    fieldName: "weapons",
                    originalValues: existing.slice(),
                });
            }
            try {
                const combined = existing.concat(missing);
                const replacement = Il2Cpp.array(WeaponBase, combined.length);
                for (let index = 0; index < combined.length; index++)
                    replacement.set(index, combined[index]);
                catalog.field("weapons").value = replacement;
                stats.added += missing.length;
                stats.total = Math.max(stats.total, combined.length);
                stats.names.push(...missing.map(objectName));
            }
            catch (_) { }
        }
        return stats;
    }
    function restoreUnlockViewFields() {
        restoreUnlockWeaponCatalog();
        for (const saved of unlockViewFieldState.values()) {
            if (!isLive(saved.object))
                continue;
            try {
                const field = saved.object.field(saved.fieldName);
                if (saved.fieldName === "_itemTestingOverrideEnabled") {
                    try {
                        saved.object.method("SetItemTestingOverride", 1).invoke(!!saved.value);
                    }
                    catch (_) {
                        field.value = !!saved.value;
                    }
                }
                else if (saved.isEnum)
                    field.value.field("value__").value = saved.value;
                else
                    field.value = saved.value;
            }
            catch (_) { }
        }
        unlockViewFieldState.clear();
    }
    function setLoadoutShowAll(panel) {
        if (!mods.unlockAll || !UIPanelLoadout || !isLive(panel))
            return;
        const showModeFields = [];
        try {
            for (const field of UIPanelLoadout.fields) {
                const typeName = String(field.type.name);
                if (typeName.endsWith("WeaponsShowMode"))
                    showModeFields.push(String(field.name));
            }
        }
        catch (_) { }
        for (const fieldName of showModeFields) {
            // WeaponsShowMode.ShowAll is the zero enum value.
            setRememberedUnlockField(panel, fieldName, 0);
        }
    }
    function setSkinPanelShowLocked(panel) {
        if (!mods.unlockAll || !isLive(panel))
            return;
        // Nonzero is this build's "show locked" presentation mode. The
        // individual ownership hooks then make those rows selectable.
        setRememberedUnlockField(panel, "lockedAppearanceVisibility", 1);
    }
    function setUnlockCatalogTesting() {
        if (!mods.unlockAll || !PlayFabManagerClient)
            return;
        try {
            const manager = PlayFabManagerClient.field("Instance").value;
            if (!isLive(manager))
                return;
            const key = unlockFieldKey(manager, "_itemTestingOverrideEnabled");
            const firstOverride = !unlockViewFieldState.has(key);
            setRememberedUnlockField(manager, "_itemTestingOverrideEnabled", true);
            if (firstOverride) {
                try {
                    manager.method("SetItemTestingOverride", 1).invoke(true);
                }
                catch (_) { }
            }
        }
        catch (_) { }
    }
    function unlockTransitionRuntimeReady(player) {
        if (!componentIsActiveInScene(player))
            return false;
        const playerKey = String(visualObjectKey(player));
        if (unlockTransitionSourcePlayerKey && playerKey === unlockTransitionSourcePlayerKey &&
            Date.now() < unlockTransitionSamePlayerNotBefore) {
            return false;
        }
        const manager = currentMannequinLockerManager();
        if (!isLive(manager))
            return false;
        try {
            const networkedCosmetics = manager.field("_networkedPlayerCosmeticsManager").value;
            if (!isUnityObjectAlive(networkedCosmetics))
                return false;
            const runner = networkedCosmetics.method("get_Runner", 0).invoke();
            if (!isUnityObjectAlive(runner))
                return false;
            if (methodBoolean(networkedCosmetics, ["get_HasStateAuthority"]) === false)
                return false;
            if (methodBoolean(runner, ["get_IsRunning"]) !== true)
                return false;
            if (methodBoolean(runner, ["get_IsShutdown"]) === true)
                return false;
            if (methodBoolean(runner, ["get_IsInSession"]) === false)
                return false;
            return true;
        }
        catch (_) {
            return false;
        }
    }
    function restoreTransitionCosmetics() {
        const manager = currentMannequinLockerManager();
        if (!isLive(manager))
            return { attempted: unlockTransitionCosmetics.length, equipped: 0, overridden: 0 };
        let equipped = 0;
        let overridden = 0;
        try {
            manager.method("ClearTemporaryCosmeticOverrides", 1)
                .overload("System.String")
                .invoke(Il2Cpp.string(UNLOCK_TRANSITION_OVERRIDE_SOURCE));
        }
        catch (_) { }
        for (const cosmetic of unlockTransitionCosmetics) {
            try {
                const accepted = !!manager.method("SetEquippedItemInternal", 4)
                    .overload("System.String", "System.String", "System.Boolean", "System.Boolean")
                    .invoke(
                        Il2Cpp.string(cosmetic.contentType),
                        Il2Cpp.string(cosmetic.itemId),
                        false,
                        true);
                if (accepted) {
                    equipped++;
                    unlockTransitionConfirmedContentTypes.add(cosmetic.contentType);
                }
            }
            catch (_) { }
            try {
                const accepted = !!manager.method("SetTemporaryCosmeticOverride", 3)
                    .overload("System.String", "System.String", "System.String")
                    .invoke(
                        Il2Cpp.string(UNLOCK_TRANSITION_OVERRIDE_SOURCE),
                        Il2Cpp.string(cosmetic.contentType),
                        Il2Cpp.string(cosmetic.itemId));
                if (accepted)
                    overridden++;
            }
            catch (_) { }
        }
        try {
            manager.method("ApplyTemporaryCosmeticOverrides", 0).invoke();
        }
        catch (_) { }
        try {
            const networkedCosmetics = manager.field("_networkedPlayerCosmeticsManager").value;
            if (isUnityObjectAlive(networkedCosmetics)) {
                // SetEquippedItemInternal normally publishes this itself, but a
                // same-ID replay may be treated as unchanged. Force the normal
                // equipment RPC once so a freshly spawned NetworkBehaviour
                // receives the complete hashed loadout.
                try {
                    networkedCosmetics.method("RPC_OnEquipmentChanged", 1)
                        .overload("System.Boolean").invoke(false);
                }
                catch (_) { }
                networkedCosmetics.method("RefreshEquipmentVisuals", 0).invoke();
            }
        }
        catch (_) { }
        return { attempted: unlockTransitionCosmetics.length, equipped, overridden };
    }
    function updateUnlockTransitionRestore(player) {
        if (!unlockTransitionRestorePending || Date.now() < unlockTransitionRestoreNotBefore ||
            frameNumber < unlockTransitionRetryFrame) {
            return;
        }
        if (!unlockTransitionRuntimeReady(player)) {
            unlockTransitionStableFrames = 0;
            return;
        }
        unlockTransitionStableFrames++;
        if (unlockTransitionStableFrames < UNLOCK_TRANSITION_STABLE_FRAMES)
            return;
        if (!mods.unlockAll) {
            mods.unlockAll = true;
        }
        if (unlockTransitionRestoreAttempts === 0) {
            pendingUnlockRefresh = true;
            unlockRefreshFrames = [frameNumber + 60];
            setUnlockCatalogTesting();
            expandUnlockWeaponCatalog();
            refreshClipboardLobbyAccess();
        }
        const weaponLoadoutRestored = restoreTransitionWeapons();
        const result = restoreTransitionCosmetics();
        unlockTransitionRestoreAttempts++;
        const allEquipped = unlockTransitionConfirmedContentTypes.size >= result.attempted;
        // Run at least two passes: the first republishes the network dictionary,
        // and the second lands after the new room's cosmetic assets finish loading.
        if (result.attempted === 0 || (allEquipped && unlockTransitionRestoreAttempts >= 2) ||
            unlockTransitionRestoreAttempts >= UNLOCK_TRANSITION_MAX_RETRIES) {
            unlockTransitionRestorePending = false;
            unlockTransitionSourcePlayerKey = "";
            console.log("[" + MENU_NAME + "] Unlock All refreshed in the new room; cosmetic loadout " +
                "equipped=" + unlockTransitionConfirmedContentTypes.size + "/" + result.attempted +
                " temporary-overrides=" + result.overridden +
                " weapon-loadout=" + (weaponLoadoutRestored ? "restored" : "unchanged") + ".");
            clearTransitionWeaponSnapshot();
            return;
        }
        unlockTransitionRetryFrame = frameNumber + UNLOCK_TRANSITION_RETRY_FRAMES;
    }
    function setUnlockViewFilters() {
        if (!mods.unlockAll) {
            restoreUnlockViewFields();
            return { catalogs: 0, candidates: 0, added: 0, total: 0, names: [] };
        }
        const hiddenWeapons = expandUnlockWeaponCatalog();
        setUnlockCatalogTesting();
        for (const panel of objectsOfClass(UIPanelWeaponSkins, true)) {
            setSkinPanelShowLocked(panel);
        }
        for (const panel of objectsOfClass(UIPanelLoadout, true)) {
            setLoadoutShowAll(panel);
        }
        return hiddenWeapons;
    }
    function unlockStats(label, stats) {
        return label + " found=" + stats.found +
            " calls=" + stats.invoked + " failed=" + stats.failed;
    }
    function refreshUnlockViews(verbose = false) {
        const hiddenWeapons = setUnlockViewFilters();
        const loadouts = invokeForObjects(UIPanelLoadout, ["LoadWeapons"], true);
        // Reset the visual lock state only. UITouchWeaponSelection.Unlock() is an
        // interaction callback, not a harmless refresh, and forcing it on every
        // row can leave the loadout screen unable to build an equip operation.
        const weaponRows = invokeForObjects(UITouchWeaponSelection, ["ResetLockStatus"], true);
        const skins = invokeForObjects(UIPanelWeaponSkins, [
            "RefreshHiddenAppearanceRows",
            "RefreshUnlocks",
            "RefreshCharmUnlocks",
        ], true);
        const cosmetics = invokeForObjects(PlayerCosmeticsLockerPanel, ["RefreshActiveSlots"], true);
        const cosmeticRows = invokeForObjects(UITouchCosmeticSelection, [], true);
        const tech = invokeForObjects(UITechNode, ["SetInitialLockState"], true);
        const techWraps = invokeForObjects(TechNodeWeaponWrap, ["RefreshSecondaryLock"], true);
        if (verbose) {
            console.log("[" + MENU_NAME + "] Unlock refresh: " + [
                unlockStats("loadouts", loadouts),
                unlockStats("weapon rows", weaponRows),
                unlockStats("skins", skins),
                unlockStats("cosmetics", cosmetics),
                unlockStats("cosmetic rows", cosmeticRows),
                unlockStats("tech", tech),
                unlockStats("tech wraps", techWraps),
                "hidden weapons catalogs=" + hiddenWeapons.catalogs +
                    " candidates=" + hiddenWeapons.candidates +
                    " added=" + hiddenWeapons.added +
                    " total=" + hiddenWeapons.total,
            ].join("; "));
            if (hiddenWeapons.names.length > 0) {
                console.log("[" + MENU_NAME + "] Added hidden weapon prefabs: " +
                    hiddenWeapons.names.join(", ") + ".");
            }
        }
    }
    function sweepAmmo() {
        for (const weapon of getLocalHeldWeapons())
            topUpWeapon(weapon);
        try {
            const storages = findObjects(AmmoStorage);
            for (let index = 0; storages && index < storages.length; index++) {
                try {
                    const storage = storages.get(index);
                    if (isLocalAmmoStorage(storage))
                        storage.method("SetMaxAmmo", 0).invoke();
                }
                catch (_) { }
            }
        }
        catch (_) { }
    }
    function resetFireRateTimers() {
        try {
            const manager = CooldownManager.method("get_Instance", 0).invoke();
            if (!isLive(manager))
                return false;
            manager.method("ResetAllTimers", 0).invoke();
            return true;
        }
        catch (_) {
            return false;
        }
    }
    function setPlayerVelocity(rigidbody, velocity) {
        if (!isUnityObjectAlive(rigidbody))
            return false;
        try {
            rigidbody.method("set_linearVelocity", 1).invoke(velocity);
            return true;
        }
        catch (_) { }
        try {
            rigidbody.method("set_velocity", 1).invoke(velocity);
            return true;
        }
        catch (_) {
            return false;
        }
    }
    function restoreJoystickFly() {
        if (!joystickFlyState)
            return;
        const rigidbody = joystickFlyState.rigidbody;
        if (isUnityObjectAlive(rigidbody)) {
            try {
                rigidbody.method("set_useGravity", 1).invoke(!!joystickFlyState.useGravity);
            }
            catch (_) { }
            setPlayerVelocity(rigidbody, [0, 0, 0]);
        }
        joystickFlyState = null;
    }
    function applyJoystickFly(player) {
        if (!mods.joystickFly) {
            if (joystickFlyState)
                restoreJoystickFly();
            return;
        }
        try {
            const rigidbody = player.field("Rigidbody").value;
            if (!isUnityObjectAlive(rigidbody)) {
                restoreJoystickFly();
                return;
            }
            if (!joystickFlyState || !sameObject(joystickFlyState.rigidbody, rigidbody)) {
                restoreJoystickFly();
                let useGravity = true;
                try {
                    useGravity = !!rigidbody.method("get_useGravity", 0).invoke();
                }
                catch (_) { }
                joystickFlyState = { rigidbody, useGravity };
            }
            try {
                rigidbody.method("set_useGravity", 1).invoke(false);
            }
            catch (_) { }
            if (movementPaused()) {
                setPlayerVelocity(rigidbody, [0, 0, 0]);
                return;
            }
            const camera = getCameraTransform(player);
            const forwardRaw = isUnityObjectAlive(camera)
                ? vector3Value(camera.method("get_forward", 0).invoke())
                : null;
            const rightRaw = isUnityObjectAlive(camera)
                ? vector3Value(camera.method("get_right", 0).invoke())
                : null;
            if (!forwardRaw || !rightRaw) {
                setPlayerVelocity(rigidbody, [0, 0, 0]);
                return;
            }
            const horizontalForwardLength = Math.sqrt(forwardRaw[0] * forwardRaw[0] + forwardRaw[2] * forwardRaw[2]) || 1.0;
            const horizontalRightLength = Math.sqrt(rightRaw[0] * rightRaw[0] + rightRaw[2] * rightRaw[2]) || 1.0;
            let velocity = [
                (forwardRaw[0] / horizontalForwardLength) * leftStickY +
                    (rightRaw[0] / horizontalRightLength) * leftStickX,
                rightStickY,
                (forwardRaw[2] / horizontalForwardLength) * leftStickY +
                    (rightRaw[2] / horizontalRightLength) * leftStickX,
            ];
            const magnitude = Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1] + velocity[2] * velocity[2]);
            if (magnitude > 1.0) {
                velocity = [velocity[0] / magnitude, velocity[1] / magnitude, velocity[2] / magnitude];
            }
            setPlayerVelocity(rigidbody, [
                velocity[0] * JOYSTICK_FLY_SPEED,
                velocity[1] * JOYSTICK_FLY_SPEED,
                velocity[2] * JOYSTICK_FLY_SPEED,
            ]);
            if (rightStickX !== 0.0) {
                let deltaTime = 1.0 / 72.0;
                try {
                    deltaTime = Math.max(0.001, Math.min(0.05, Number(Time.method("get_deltaTime", 0).invoke())));
                }
                catch (_) { }
                const transform = getTransform(player);
                const currentRotation = transform.method("get_rotation", 0).invoke();
                const yaw = Quaternion.method("Euler", 3).invoke(0, rightStickX * JOYSTICK_FLY_TURN_SPEED * deltaTime, 0);
                transform.method("set_rotation", 1).invoke(Quaternion.method("op_Multiply", 2).invoke(yaw, currentRotation));
            }
        }
        catch (_) {
            restoreJoystickFly();
        }
    }
    function applyTriggerFly(player) {
        if (!mods.triggerFly || mods.joystickFly || movementPaused() || !(leftTrigger || leftTriggerAmount > 0.5))
            return;
        try {
            const rigidbody = player.field("Rigidbody").value;
            if (!isLive(rigidbody))
                return;
            const hand = getLeftHandTransform(player);
            const directionSource = isLive(hand) ? hand : getCameraTransform(player);
            if (!isLive(directionSource))
                return;
            const forward = directionSource.method("get_forward", 0).invoke();
            const velocity = [
                Number(forward.field("x").value) * TRIGGER_FLY_SPEED,
                Number(forward.field("y").value) * TRIGGER_FLY_SPEED,
                Number(forward.field("z").value) * TRIGGER_FLY_SPEED,
            ];
            try {
                rigidbody.method("set_linearVelocity", 1).invoke(velocity);
            }
            catch (_) {
                try {
                    rigidbody.method("set_velocity", 1).invoke(velocity);
                }
                catch (_) {
                    const current = rigidbody.method("get_linearVelocity", 0).invoke();
                    rigidbody.method("AddForce", 2).invoke([
                        velocity[0] - Number(current.field("x").value),
                        velocity[1] - Number(current.field("y").value),
                        velocity[2] - Number(current.field("z").value),
                    ], 2);
                }
            }
        }
        catch (_) { }
    }
    function createHandPlatform(name, color) {
        let object = null;
        let material = null;
        try {
            object = GameObject.method("CreatePrimitive", 1).invoke(3);
            setName(object, name);
            const transform = getTransform(object);
            transform.method("set_localScale", 1).invoke(PLATFORM_SCALE);
            transform.method("set_rotation", 1).invoke(identityQuaternion);
            const renderer = getComponent(object, Renderer);
            if (isLive(renderer)) {
                renderer.method("set_enabled", 1).invoke(true);
                material = renderer.method("get_material", 0).invoke();
                if (isLive(material)) {
                    const shader = getMenuSurfaceShader();
                    if (isLive(shader))
                        material.method("set_shader", 1).invoke(shader);
                    material.method("set_color", 1).invoke(color);
                    try {
                        material.method("SetColor", 2)
                            .overload("System.String", "UnityEngine.Color")
                            .invoke(Il2Cpp.string("_BaseColor"), color);
                    }
                    catch (_) { }
                }
            }
            const collider = getComponent(object, Collider);
            if (isLive(collider)) {
                try {
                    collider.method("set_enabled", 1).invoke(true);
                }
                catch (_) { }
                try {
                    collider.method("set_isTrigger", 1).invoke(false);
                }
                catch (_) { }
            }
            const body = addComponent(object, Rigidbody);
            if (isLive(body)) {
                try {
                    body.method("set_useGravity", 1).invoke(false);
                }
                catch (_) { }
                try {
                    body.method("set_isKinematic", 1).invoke(true);
                }
                catch (_) { }
                try {
                    body.method("set_detectCollisions", 1).invoke(true);
                }
                catch (_) { }
            }
            object.method("SetActive", 1).invoke(false);
            return { object, material, active: false };
        }
        catch (_) {
            if (isUnityObjectAlive(object))
                destroy(object);
            if (isUnityObjectAlive(material))
                destroy(material);
            return null;
        }
    }
    function setHandPlatformVisible(state, visible) {
        if (!state || !isUnityObjectAlive(state.object) || state.active === visible)
            return;
        try {
            state.object.method("SetActive", 1).invoke(visible);
            state.active = visible;
        }
        catch (_) { }
    }
    function destroyHandPlatform(state) {
        if (!state)
            return;
        if (isUnityObjectAlive(state.object))
            destroy(state.object);
        if (isUnityObjectAlive(state.material))
            destroy(state.material);
    }
    function clearPlatforms() {
        destroyHandPlatform(leftHandPlatform);
        destroyHandPlatform(rightHandPlatform);
        leftHandPlatform = null;
        rightHandPlatform = null;
    }
    function updateHandPlatform(player, left, held) {
        let state = left ? leftHandPlatform : rightHandPlatform;
        if (!held) {
            setHandPlatformVisible(state, false);
            return;
        }
        // Leave an active platform fixed where the grip was first pressed so
        // it is stable enough to stand on. Releasing the grip returns it to
        // the pool; the next press moves and re-enables the same object.
        if (state && isUnityObjectAlive(state.object) && state.active)
            return;
        const hand = left ? getLeftHandTransform(player) : getRightHandTransform(player);
        const position = transformPosition(hand);
        if (!position) {
            setHandPlatformVisible(state, false);
            return;
        }
        if (!state || !isUnityObjectAlive(state.object)) {
            destroyHandPlatform(state);
            state = createHandPlatform(left ? "AnimalRivalsLeftPlatform" : "AnimalRivalsRightPlatform", PLATFORM_COLOR);
            if (left)
                leftHandPlatform = state;
            else
                rightHandPlatform = state;
        }
        if (!state || !isUnityObjectAlive(state.object))
            return;
        try {
            const transform = getTransform(state.object);
            transform.method("set_position", 1).invoke([
                position[0],
                position[1] - PLATFORM_HAND_OFFSET_Y,
                position[2],
            ]);
            transform.method("set_rotation", 1).invoke(identityQuaternion);
            setHandPlatformVisible(state, true);
        }
        catch (_) {
            setHandPlatformVisible(state, false);
        }
    }
    function updatePlatforms(player) {
        if (!mods.platforms)
            return;
        const gripsLive = !movementPaused();
        updateHandPlatform(player, true, gripsLive && leftGrip);
        updateHandPlatform(player, false, gripsLive && rightGrip);
    }
    function vector3Value(value) {
        try {
            const result = [
                Number(value.field("x").value),
                Number(value.field("y").value),
                Number(value.field("z").value),
            ];
            return result.every(Number.isFinite) ? result : null;
        }
        catch (_) {
            return null;
        }
    }
    function transformPosition(transform) {
        if (!isUnityObjectAlive(transform))
            return null;
        try {
            return vector3Value(transform.method("get_position", 0).invoke());
        }
        catch (_) {
            return null;
        }
    }
    function squaredDistance(left, right) {
        const x = left[0] - right[0];
        const y = left[1] - right[1];
        const z = left[2] - right[2];
        return x * x + y * y + z * z;
    }
    function discoverMovementFieldNames() {
        if (discoveredMovementBoostFieldNames)
            return discoveredMovementBoostFieldNames;
        discoveredMovementBoostFieldNames = [];
        try {
            for (const field of GorillaMovement.fields) {
                const name = String(field.name);
                if (/(jump|speed|velocity|arm|length|threshold|movement)/i.test(name)) {
                    discoveredMovementBoostFieldNames.push(name);
                }
            }
        }
        catch (_) { }
        return discoveredMovementBoostFieldNames;
    }
    function discoverMovementComponentFieldNames(player) {
        if (!player || !isLive(player) || !isUnityObjectAlive(player))
            return [];
        if (discoveredMovementComponentFieldNames)
            return discoveredMovementComponentFieldNames;
        discoveredMovementComponentFieldNames = [];
        try {
            for (const field of player.class.fields) {
                const name = String(field.name);
                if (/(movement|gorilla|locomotion|controller)/i.test(name)) {
                    discoveredMovementComponentFieldNames.push(name);
                }
            }
        }
        catch (_) { }
        return discoveredMovementComponentFieldNames;
    }
    function boundGorillaMovementField(movement, name) {
        if (!GorillaMovement || !isLive(movement))
            return null;
        try {
            return GorillaMovement.field(name).bind(movement);
        }
        catch (_) {
            return null;
        }
    }
    function resolveMovementField(movement, names, required = false) {
        for (const name of names) {
            try {
                const field = GorillaMovement.field(name);
                if (field)
                    return name;
            }
            catch (_) { }
        }
        const discovered = discoverMovementFieldNames();
        const loweredNames = discovered.map(name => String(name).toLowerCase());
        for (const candidate of names) {
            const lowered = String(candidate).toLowerCase();
            for (let index = 0; index < loweredNames.length; index++) {
                if (new RegExp(lowered, "i").test(loweredNames[index])) {
                    const field = discovered[index];
                    if (boundGorillaMovementField(movement, field))
                        return field;
                }
            }
        }
        if (!required)
            return null;
        for (const discoveredName of discovered) {
            const discoveredField = boundGorillaMovementField(movement, discoveredName);
            if (!discoveredField)
                continue;
            try {
                const value = Number(discoveredField.value);
                if (Number.isFinite(value))
                    return discoveredName;
            }
            catch (_) { }
        }
        return null;
    }
    function setMovementField(movement, names, delta, overwriteValue = null) {
        if (!isUnityObjectAlive(movement))
            return false;
        const resolved = resolveMovementField(movement, names, false);
        if (!resolved)
            return false;
        const field = boundGorillaMovementField(movement, resolved);
        if (!field)
            return false;
        const current = Number(field.value);
        if (!Number.isFinite(current))
            return false;
        try {
            field.value = overwriteValue !== null ? overwriteValue : current + delta;
            return true;
        }
        catch (_) {
            return false;
        }
    }
    function collectMovementCandidateFieldsWithRange(movement, expressions, minAbs = 0, maxAbs = Number.POSITIVE_INFINITY) {
        const result = [];
        try {
            const discovered = discoverMovementFieldNames();
            for (const name of discovered) {
                const lowered = String(name).toLowerCase();
                if (!expressions.some(expression => expression.test(lowered)))
                    continue;
                const field = boundGorillaMovementField(movement, name);
                if (!field)
                    continue;
                try {
                    const value = Number(field.value);
                    const magnitude = Math.abs(value);
                    if (!Number.isFinite(value) || magnitude > maxAbs || magnitude < minAbs)
                        continue;
                    if (result.includes(name))
                        continue;
                    result.push(name);
                }
                catch (_) { }
            }
        }
        catch (_) { }
        return result;
    }
    function collectArmLengthFields(movement) {
        const names = collectMovementCandidateFieldsWithRange(movement, [/arm|reach|grab|stretch|length|distance|throw|launch/], 0.001, 40.0);
        return names.length > 0 ? names : [];
    }
    function collectUnstickFields(movement) {
        const names = collectMovementCandidateFieldsWithRange(movement, [/un.?stick|release|grip|reach|distance|unhold|return/i], 0.001, 20.0);
        return names.filter(name => /un.?stick|release/i.test(name.toLowerCase()));
    }
    function recordSpeedBoostFieldBaseline(movement, names, baselineValues) {
        const resolved = resolveMovementField(movement, names, false);
        if (!resolved)
            return null;
        if (baselineValues && baselineValues[resolved] !== undefined)
            return resolved;
        const field = boundGorillaMovementField(movement, resolved);
        if (!field)
            return null;
        try {
            const value = Number(field.value);
            if (!Number.isFinite(value))
                return null;
            baselineValues[resolved] = value;
            return resolved;
        }
        catch (_) {
            return null;
        }
    }
    function resolveGorillaMovementComponent(player) {
        try {
            const direct = player.field("ActiveGorillaPlayer").value;
            if (isUnityObjectAlive(direct))
                return direct;
        }
        catch (_) { }
        const fieldNames = [
            "activeGorillaPlayer",
            "gorillaMovement",
            "movement",
            "movementController",
            "activeMovement",
            "gorillaPlayerMovement",
        ];
        for (const fieldName of fieldNames) {
            try {
                const value = player.field(fieldName).value;
                if (isUnityObjectAlive(value) && GorillaMovement && GorillaMovement.isAssignableFrom(value.class))
                    return value;
            }
            catch (_) { }
        }
        for (const fieldName of discoverMovementComponentFieldNames(player)) {
            try {
                const value = player.field(fieldName).value;
                if (isUnityObjectAlive(value) && GorillaMovement && GorillaMovement.isAssignableFrom(value.class)) {
                    return value;
                }
            }
            catch (_) { }
        }
        return null;
    }
    function resolveLongArmsMovementComponent(player) {
        const resolved = resolveGorillaMovementComponent(player);
        if (isUnityObjectAlive(resolved))
            return resolved;
        const playerObject = componentGameObject(player);
        if (isUnityObjectAlive(playerObject) && GorillaMovement) {
            const direct = getComponent(playerObject, GorillaMovement);
            if (isUnityObjectAlive(direct))
                return direct;
            try {
                const nested = playerObject.method("GetComponentInChildren", 2)
                    .overload("System.Type", "System.Boolean")
                    .invoke(GorillaMovement.type.object, true);
                if (isUnityObjectAlive(nested))
                    return nested;
            }
            catch (_) { }
        }
        // Never borrow a scene-global movement component: it may belong to a
        // remote player. Long Arms can still use the local player transform
        // when this player's GorillaMovement component is unavailable.
        return null;
    }
    function rememberSpeedBoostField(name, base) {
        for (const entry of speedBoostTouchedMovementValues) {
            if (entry.name === name)
                return;
        }
        speedBoostTouchedMovementValues.push({ name, base });
    }
    function applySpeedBoostField(movement, names, delta, absoluteValue = null) {
        const resolved = resolveMovementField(movement, names, false);
        if (!resolved)
            return false;
        const field = boundGorillaMovementField(movement, resolved);
        if (!field)
            return false;
        try {
            const base = Number(field.value);
            if (!Number.isFinite(base))
                return false;
            const nextValue = absoluteValue !== null && absoluteValue !== undefined ? absoluteValue : base + delta;
            if (!Number.isFinite(nextValue))
                return false;
            field.value = nextValue;
            rememberSpeedBoostField(resolved, base);
            return true;
        }
        catch (_) {
            return false;
        }
    }
    function snapshotMovementPower(movement) {
        const names = [
            ["jumpMultiplierLeft", "leftJumpMultiplier", "jumpMultLeft"],
            ["jumpMultiplierRight", "rightJumpMultiplier", "jumpMultRight"],
            ["maxJumpSpeedLeft", "leftMaxJumpSpeed", "maxJumpSpeedLeftHand", "leftJumpSpeed"],
            ["maxJumpSpeedRight", "rightMaxJumpSpeed", "maxJumpSpeedRightHand", "rightJumpSpeed"],
            ["velocityChangeThresholdLeft", "leftVelocityChangeThreshold"],
            ["velocityChangeThresholdRight", "rightVelocityChangeThreshold"],
        ];
        const result = {};
        let captured = 0;
        for (const aliases of names) {
            const resolved = resolveMovementField(movement, aliases, false);
            if (!resolved)
                continue;
            const field = boundGorillaMovementField(movement, resolved);
            if (!field)
                continue;
            const value = Number(field.value);
            if (!Number.isFinite(value))
                continue;
            if (result[resolved] === undefined) {
                result[resolved] = value;
                captured++;
            }
        }
        return captured === 0 ? null : result;
    }
    function applySpeedBoost(player) {
        if (!mods.speedBoost)
            return;
        try {
            const movement = resolveGorillaMovementComponent(player);
            if (!isUnityObjectAlive(movement))
                return;
            if (!sameObject(speedBoostPlayer, movement)) {
                restoreSpeedBoost();
                const originalMovementValues = snapshotMovementPower(movement);
                if (!originalMovementValues)
                    return;
                speedBoostPlayer = movement;
                speedBoostController = player;
                speedBoostOriginalMovementValues = originalMovementValues;
                speedBoostTouchedMovementValues = [];
                try {
                    const rigidbody = player.field("Rigidbody").value;
                    const cap = Number(rigidbody.method("get_maxLinearVelocity", 0).invoke());
                    speedBoostOriginalVelocityCap = Number.isFinite(cap) && cap > 0 ? cap : null;
                }
                catch (_) {
                    speedBoostOriginalVelocityCap = null;
                }
                if (speedBoostOriginalVelocityCap === null) {
                    try {
                        const fallbackCap = Number(PlayerController.field("DefaultMaxLinearVelocity").value);
                        if (Number.isFinite(fallbackCap) && fallbackCap > 0)
                            speedBoostOriginalVelocityCap = fallbackCap;
                    }
                    catch (_) { }
                }
            }
            const targets = {
                jumpMultiplierLeft: SPEED_BOOST_JUMP_MULTIPLIER_DELTA,
                jumpMultiplierRight: SPEED_BOOST_JUMP_MULTIPLIER_DELTA,
                maxJumpSpeedLeft: SPEED_BOOST_MAX_SPEED_DELTA,
                maxJumpSpeedRight: SPEED_BOOST_MAX_SPEED_DELTA,
                velocityChangeThresholdLeft: 0.0,
                velocityChangeThresholdRight: 0.0,
            };
            for (const [name, delta] of Object.entries(targets)) {
                const baseline = Number(speedBoostOriginalMovementValues[name]);
                const field = boundGorillaMovementField(movement, name);
                if (field && Number.isFinite(baseline))
                    field.value = baseline + delta;
            }
            try {
                movement.method("InvokeIfMovePowerChanged", 0).invoke();
            }
            catch (_) { }
            try {
                player.method("SetVelocityCap", 1).invoke(SPEED_BOOST_VELOCITY_CAP);
            }
            catch (_) { }
        }
        catch (_) { }
    }
    function restoreSpeedBoost() {
        if (!speedBoostPlayer && !speedBoostController)
            return;
        if (isUnityObjectAlive(speedBoostPlayer) && speedBoostOriginalMovementValues) {
            for (const [name, value] of Object.entries(speedBoostOriginalMovementValues)) {
                const field = boundGorillaMovementField(speedBoostPlayer, name);
                if (!field)
                    continue;
                try {
                    field.value = value;
                }
                catch (_) { }
            }
            try {
                speedBoostPlayer.method("InvokeIfMovePowerChanged", 0).invoke();
            }
            catch (_) { }
        }
        if (isUnityObjectAlive(speedBoostController) && speedBoostOriginalVelocityCap !== null) {
            try {
                speedBoostController.method("SetVelocityCap", 1).invoke(speedBoostOriginalVelocityCap);
            }
            catch (_) { }
        }
        speedBoostPlayer = null;
        speedBoostController = null;
        speedBoostOriginalVelocityCap = null;
        speedBoostOriginalMovementValues = null;
        speedBoostTouchedMovementValues = [];
        speedBoostLeftApplied = false;
        speedBoostRightApplied = false;
        try {
            const manager = MovementManager ? MovementManager.field("Instance").value : null;
            if (isUnityObjectAlive(manager))
                manager.method("ApplyActiveMovementModifiers", 0).invoke();
        }
        catch (_) { }
    }
    function applyLongArms(player) {
        if (!mods.longArms)
            return;
        try {
            if (!isUnityObjectAlive(player))
                return;
            const movement = GorillaMovement ? resolveLongArmsMovementComponent(player) : null;
            const owner = isUnityObjectAlive(movement) ? movement : player;
            if (!longArmState || !sameObject(longArmState.owner, owner)) {
                restoreLongArms();
                const field = isUnityObjectAlive(movement)
                    ? boundGorillaMovementField(movement, "maxArmLength")
                    : null;
                const baseline = field ? Number(field.value) : Number.NaN;
                let movementTransform = null;
                let movementScale = null;
                try {
                    movementTransform = getTransform(movement);
                    movementScale = vector3Value(movementTransform.method("get_localScale", 0).invoke());
                }
                catch (_) { }
                if (!isUnityObjectAlive(movementTransform)) {
                    try {
                        movementTransform = getTransform(player);
                        movementScale = vector3Value(movementTransform.method("get_localScale", 0).invoke());
                    }
                    catch (_) { }
                }
                const hasLengthField = Number.isFinite(baseline) && baseline > 0;
                if (!hasLengthField && (!isUnityObjectAlive(movementTransform) || !movementScale))
                    return;
                longArmState = {
                    owner,
                    movement,
                    maxArmLength: hasLengthField ? baseline : null,
                    movementTransform,
                    movementScale,
                };
            }
            const field = isUnityObjectAlive(movement)
                ? boundGorillaMovementField(movement, "maxArmLength")
                : null;
            if (field && Number.isFinite(longArmState.maxArmLength)) {
                const target = Math.min(5.0, Math.max(3.5,
                    longArmState.maxArmLength * LONG_ARMS_MULTIPLIER));
                if (Math.abs(Number(field.value) - target) > 0.001)
                    field.value = target;
            }
            // Animal Company's proven Long Arms path scales the locomotion
            // root as well as extending the reach limit. Preserve the exact
            // original scale so disabling the mod is lossless.
            if (isUnityObjectAlive(longArmState.movementTransform) && longArmState.movementScale) {
                const baselineScale = longArmState.movementScale;
                longArmState.movementTransform.method("set_localScale", 1).invoke([
                    baselineScale[0] * LONG_ARMS_BODY_SCALE,
                    baselineScale[1] * LONG_ARMS_BODY_SCALE,
                    baselineScale[2] * LONG_ARMS_BODY_SCALE,
                ]);
            }
        }
        catch (_) { }
    }
    function restoreLongArms() {
        if (longArmState) {
            if (isUnityObjectAlive(longArmState.movement) && Number.isFinite(longArmState.maxArmLength)) {
                try {
                    const field = boundGorillaMovementField(longArmState.movement, "maxArmLength");
                    if (field)
                        field.value = longArmState.maxArmLength;
                }
                catch (_) { }
            }
            if (isUnityObjectAlive(longArmState.movementTransform) && longArmState.movementScale) {
                try {
                    longArmState.movementTransform.method("set_localScale", 1).invoke(longArmState.movementScale);
                }
                catch (_) { }
            }
        }
        longArmState = null;
    }
    function visualObjectKey(value) {
        try {
            return String(value.handle);
        }
        catch (_) {
            return "";
        }
    }
    function getVisualShader() {
        if (isUnityObjectAlive(visualShader))
            return visualShader;
        visualShader = null;
        for (const name of [
            "Universal Render Pipeline/Unlit",
            "Universal Render Pipeline/Unlit/Simple",
            "Unlit/Color",
            "Unlit/Texture",
            "Unlit/Transparent",
            "Particles/Standard Unlit",
            "Sprites/Default",
            "Legacy Shaders/Particles/Alpha Blended",
            "Hidden/Internal-Colored",
            "UI/Default",
        ]) {
            try {
                const shader = Shader.method("Find", 1).invoke(Il2Cpp.string(name));
                if (isUnityObjectAlive(shader) &&
                    (() => { try {
                        return !!shader.method("get_isSupported", 0).invoke();
                    }
                    catch (_) {
                        return true;
                    } })()) {
                    visualShader = shader;
                    return shader;
                }
            }
            catch (_) { }
        }
        return null;
    }
    function setMaterialFloat(material, name, value) {
        try {
            material.method("SetFloat", 2)
                .overload("System.String", "System.Single")
                .invoke(Il2Cpp.string(name), value);
        }
        catch (_) { }
        try {
            material.method("SetInt", 2)
                .overload("System.String", "System.Int32")
                .invoke(Il2Cpp.string(name), Math.trunc(value));
        }
        catch (_) { }
    }
    function colorVisualMaterial(material, color) {
        if (!isUnityObjectAlive(material))
            return;
        try {
            material.method("set_color", 1).invoke(color);
        }
        catch (_) { }
        for (const name of ["_Color", "_BaseColor"]) {
            try {
                material.method("SetColor", 2)
                    .overload("System.String", "UnityEngine.Color")
                    .invoke(Il2Cpp.string(name), color);
            }
            catch (_) { }
        }
    }
    function configureThroughWallMaterial(material, color) {
        if (!isUnityObjectAlive(material))
            return;
        const shader = getVisualShader();
        if (isUnityObjectAlive(shader)) {
            try {
                material.method("set_shader", 1).invoke(shader);
            }
            catch (_) { }
        }
        colorVisualMaterial(material, color);
        setMaterialFloat(material, "_ZTest", 8);
        setMaterialFloat(material, "unity_GUIZTestMode", 8);
        setMaterialFloat(material, "_ZWrite", 0);
        setMaterialFloat(material, "_Cull", 0);
        try {
            material.method("set_renderQueue", 1).invoke(5000);
        }
        catch (_) { }
    }
    function visualColorKey(color) {
        if (color[1] > 0.8 && color[0] < 0.5)
            return "green";
        if (color[0] > 0.8 && color[1] < 0.5)
            return "red";
        return "white";
    }
    function getVisualMaterial(color) {
        const key = visualColorKey(color);
        const cached = visualMaterials.get(key);
        if (isUnityObjectAlive(cached))
            return cached;
        visualMaterials.delete(key);
        const shader = getVisualShader();
        if (!isUnityObjectAlive(shader))
            return null;
        try {
            const material = Material.alloc();
            material.method(".ctor", 1)
                .overload("UnityEngine.Shader")
                .invoke(shader);
            configureThroughWallMaterial(material, color);
            visualMaterials.set(key, material);
            return material;
        }
        catch (_) {
            return null;
        }
    }
    function getVisualHpMaterial() {
        if (isUnityObjectAlive(visualHpMaterial))
            return visualHpMaterial;
        visualHpMaterial = null;
        try {
            const font = getFont();
            if (!isUnityObjectAlive(font))
                return null;
            const fontMaterial = font.method("get_material", 0).invoke();
            if (!isUnityObjectAlive(fontMaterial))
                return null;
            const material = Material.alloc();
            material.method(".ctor", 1)
                .overload("UnityEngine.Material")
                .invoke(fontMaterial);
            // Keep the font shader/atlas, but draw the label after opaque world
            // geometry so the HP remains readable through walls.
            setMaterialFloat(material, "_ZTest", 8);
            setMaterialFloat(material, "unity_GUIZTestMode", 8);
            setMaterialFloat(material, "_ZWrite", 0);
            setMaterialFloat(material, "_Cull", 0);
            try {
                material.method("set_renderQueue", 1).invoke(5000);
            }
            catch (_) { }
            visualHpMaterial = material;
            return material;
        }
        catch (_) {
            return null;
        }
    }
    function clearTracers() {
        for (const target of visualTargets.values()) {
            if (isUnityObjectAlive(target.tracer))
                destroy(target.tracer);
            target.tracer = null;
            target.tracerRenderer = null;
            target.tracerColorKey = "";
        }
    }
    function clearTargetHpLabel(target) {
        if (isUnityObjectAlive(target.hpObject))
            destroy(target.hpObject);
        target.hpObject = null;
        target.hpText = null;
        target.hpRenderer = null;
        target.hpLabel = "";
        target.hpColorKey = "";
    }
    function clearHpLabels() {
        for (const target of visualTargets.values())
            clearTargetHpLabel(target);
    }
    function destroyHitboxVisual(entry) {
        if (entry && isUnityObjectAlive(entry.object))
            destroy(entry.object);
    }
    function clearHitboxVisuals() {
        for (const entry of hitboxVisuals.values())
            destroyHitboxVisual(entry);
        hitboxVisuals.clear();
        hitboxVisualRescanFrame = -1000;
    }
    function ensureHitboxVisual(key, collider) {
        const existing = hitboxVisuals.get(key);
        if (existing && isUnityObjectAlive(existing.object) && Array.isArray(existing.lines) &&
            existing.lines.every(line => isUnityObjectAlive(line))) {
            existing.collider = collider;
            return existing;
        }
        destroyHitboxVisual(existing);
        let object = null;
        try {
            object = createEmpty("AnimalRivalsHitbox:" + key);
            getTransform(object).method("SetParent", 2).invoke(ensureVisualRoot(), false);
            const entry = { object, lines: [], collider };
            hitboxVisuals.set(key, entry);
            return entry;
        }
        catch (_) {
            if (isUnityObjectAlive(object))
                destroy(object);
            return null;
        }
    }
    function ensureHitboxVisualLine(entry, index) {
        if (!entry || !isUnityObjectAlive(entry.object))
            return null;
        if (isUnityObjectAlive(entry.lines[index]))
            return entry.lines[index];
        let lineObject = null;
        try {
            lineObject = createEmpty("AnimalRivalsHitboxStrip:" + index);
            getTransform(lineObject).method("SetParent", 2)
                .invoke(getTransform(entry.object), false);
            const line = addComponent(lineObject, LineRenderer);
            if (!isUnityObjectAlive(line))
                throw new Error("LineRenderer unavailable");
            line.method("set_useWorldSpace", 1).invoke(true);
            line.method("set_positionCount", 1).invoke(0);
            line.method("set_startWidth", 1).invoke(0.012);
            line.method("set_endWidth", 1).invoke(0.012);
            const color = [1.0, 0.08, 0.04, 0.9];
            try {
                line.method("set_startColor", 1).invoke(color);
                line.method("set_endColor", 1).invoke(color);
            }
            catch (_) { }
            const material = getVisualMaterial(color);
            if (isUnityObjectAlive(material)) {
                try {
                    line.method("set_sharedMaterial", 1).invoke(material);
                }
                catch (_) { }
            }
            entry.lines[index] = line;
            return line;
        }
        catch (_) {
            if (isUnityObjectAlive(lineObject))
                destroy(lineObject);
            return null;
        }
    }
    function addVec3(left, right) {
        return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
    }
    function scaleVec3(value, scalar) {
        return [value[0] * scalar, value[1] * scalar, value[2] * scalar];
    }
    function localCirclePoints(center, firstAxis, secondAxis, radius, segments = 10) {
        const points = [];
        for (let index = 0; index <= segments; index++) {
            const angle = Math.PI * 2.0 * index / segments;
            points.push(addVec3(center, addVec3(
                scaleVec3(firstAxis, Math.cos(angle) * radius),
                scaleVec3(secondAxis, Math.sin(angle) * radius),
            )));
        }
        return points;
    }
    function colliderLocalWireStrips(collider) {
        const className = String(collider.class?.name || collider.class?.fullName || "");
        const center = readColliderVectorValue(collider, "center") || [0, 0, 0];
        if (/BoxCollider$/i.test(className)) {
            const size = readColliderVectorValue(collider, "size");
            if (!size)
                return [];
            const x0 = center[0] - size[0] * 0.5;
            const x1 = center[0] + size[0] * 0.5;
            const y0 = center[1] - size[1] * 0.5;
            const y1 = center[1] + size[1] * 0.5;
            const z0 = center[2] - size[2] * 0.5;
            const z1 = center[2] + size[2] * 0.5;
            return [[
                [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
                [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0],
                [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [x1, y1, z1],
                [x0, y1, z1], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0],
            ]];
        }
        if (/SphereCollider$/i.test(className)) {
            const radius = readColliderFieldValue(collider, "radius");
            if (!Number.isFinite(radius) || radius <= 0)
                return [];
            return [
                localCirclePoints(center, [1, 0, 0], [0, 1, 0], radius),
                localCirclePoints(center, [1, 0, 0], [0, 0, 1], radius),
                localCirclePoints(center, [0, 1, 0], [0, 0, 1], radius),
            ];
        }
        if (/CapsuleCollider$/i.test(className)) {
            const radius = readColliderFieldValue(collider, "radius");
            const height = readColliderFieldValue(collider, "height");
            const direction = Math.trunc(readColliderFieldValue(collider, "direction"));
            if (!Number.isFinite(radius) || !Number.isFinite(height) || radius <= 0 || height <= 0)
                return [];
            const axis = direction === 0 ? [1, 0, 0] : direction === 2 ? [0, 0, 1] : [0, 1, 0];
            const first = direction === 0 ? [0, 1, 0] : [1, 0, 0];
            const second = direction === 2 ? [0, 1, 0] : [0, 0, 1];
            const straightHalf = Math.max(0, height * 0.5 - radius);
            const top = addVec3(center, scaleVec3(axis, straightHalf));
            const bottom = addVec3(center, scaleVec3(axis, -straightHalf));
            const strips = [
                localCirclePoints(top, first, second, radius),
                localCirclePoints(bottom, first, second, radius),
            ];
            const appendSilhouette = (sideAxis) => {
                const points = [];
                for (let index = 0; index <= 6; index++) {
                    const angle = Math.PI * index / 6;
                    points.push(addVec3(top, addVec3(
                        scaleVec3(sideAxis, Math.cos(angle) * radius),
                        scaleVec3(axis, Math.sin(angle) * radius),
                    )));
                }
                points.push(addVec3(bottom, scaleVec3(sideAxis, -radius)));
                for (let index = 6; index <= 12; index++) {
                    const angle = Math.PI * index / 6;
                    points.push(addVec3(bottom, addVec3(
                        scaleVec3(sideAxis, Math.cos(angle) * radius),
                        scaleVec3(axis, Math.sin(angle) * radius),
                    )));
                }
                points.push(addVec3(top, scaleVec3(sideAxis, radius)));
                strips.push(points);
            };
            appendSilhouette(first);
            appendSilhouette(second);
            return strips;
        }
        return [];
    }
    function updateHitboxVisualBounds(entry) {
        if (!entry || !isDamageHitboxCollider(entry.collider) || !isUnityObjectAlive(entry.object))
            return false;
        try {
            const object = componentGameObject(entry.collider);
            const transform = isUnityObjectAlive(object) ? getTransform(object) : null;
            const strips = colliderLocalWireStrips(entry.collider);
            if (!isUnityObjectAlive(transform) || strips.length === 0)
                return false;
            for (let stripIndex = 0; stripIndex < strips.length; stripIndex++) {
                const line = ensureHitboxVisualLine(entry, stripIndex);
                const localPoints = strips[stripIndex];
                if (!isUnityObjectAlive(line) || localPoints.length === 0)
                    return false;
                line.method("set_positionCount", 1).invoke(localPoints.length);
                for (let pointIndex = 0; pointIndex < localPoints.length; pointIndex++) {
                    const world = transform.method("TransformPoint", 1).invoke(localPoints[pointIndex]);
                    line.method("SetPosition", 2).invoke(pointIndex, world);
                }
            }
            for (let index = strips.length; index < entry.lines.length; index++) {
                if (isUnityObjectAlive(entry.lines[index]))
                    entry.lines[index].method("set_positionCount", 1).invoke(0);
            }
            return true;
        }
        catch (_) {
            return false;
        }
    }
    function updateHitboxVisuals() {
        if (!mods.showHitboxes) {
            if (hitboxVisuals.size > 0)
                clearHitboxVisuals();
            return;
        }
        if (frameNumber % HITBOX_VISUAL_REFRESH_FRAMES !== 0)
            return;
        if (frameNumber >= hitboxVisualRescanFrame) {
            hitboxVisualRescanFrame = frameNumber + HITBOX_VISUAL_RESCAN_FRAMES;
            const players = objectsOfClass(NetworkPlayer);
            const local = findLocalNetworkPlayer(players);
            const active = new Set();
            for (const remote of players) {
                if (active.size >= MAX_HITBOX_VISUALS)
                    break;
                if (!isUnityObjectAlive(remote) || isLocalNetworkTarget(remote, local))
                    continue;
                let targetVisualCount = 0;
                for (const collider of collectDamageHitboxColliders(remote)) {
                    if (active.size >= MAX_HITBOX_VISUALS ||
                        targetVisualCount >= MAX_HITBOX_VISUALS_PER_TARGET) {
                        break;
                    }
                    const key = visualObjectKey(collider);
                    if (!key || active.has(key))
                        continue;
                    active.add(key);
                    targetVisualCount++;
                    ensureHitboxVisual(key, collider);
                }
            }
            for (const [key, entry] of Array.from(hitboxVisuals.entries())) {
                if (active.has(key))
                    continue;
                destroyHitboxVisual(entry);
                hitboxVisuals.delete(key);
            }
        }
        for (const [key, entry] of Array.from(hitboxVisuals.entries())) {
            if (updateHitboxVisualBounds(entry))
                continue;
            destroyHitboxVisual(entry);
            hitboxVisuals.delete(key);
        }
    }
    function restoreTargetChams(target) {
        for (const entry of target.chamRenderers || []) {
            if (!isUnityObjectAlive(entry.renderer))
                continue;
            if (isUnityObjectAlive(entry.originalMaterial)) {
                try {
                    entry.renderer.method("set_sharedMaterial", 1).invoke(entry.originalMaterial);
                }
                catch (_) { }
            }
        }
        target.chamRenderers = [];
        target.chamColorKey = "";
        target.lastChamScanFrame = -1000;
    }
    function restoreChams() {
        for (const target of visualTargets.values())
            restoreTargetChams(target);
    }
    function clearVisuals(dropStaleChams = false) {
        clearTracers();
        clearHpLabels();
        clearHitboxVisuals();
        if (dropStaleChams) {
            for (const target of visualTargets.values()) {
                target.chamRenderers = [];
                target.chamColorKey = "";
            }
        }
        else {
            restoreChams();
        }
        if (isUnityObjectAlive(visualRoot))
            destroy(visualRoot);
        for (const material of visualMaterials.values()) {
            if (isUnityObjectAlive(material))
                destroy(material);
        }
        if (isUnityObjectAlive(visualHpMaterial))
            destroy(visualHpMaterial);
        visualRoot = null;
        visualTargets.clear();
        visualMaterials.clear();
        visualHpMaterial = null;
        visualShader = null;
        lastVisualScanFrame = -1000;
        chamScanCursor = 0;
        lastMatchModeScanFrame = -1000;
        cachedMatchModeActive = false;
        focusCleanupPending = false;
    }
    function teamKeyFromValue(value, depth = 0) {
        if (value == null || depth > 2)
            return null;
        if (typeof value === "number" || typeof value === "bigint") {
            const number = Number(value);
            return Number.isFinite(number) && number >= 0 && number < 256
                ? "n:" + Math.trunc(number)
                : null;
        }
        if (typeof value === "string") {
            const normalized = value.trim();
            return normalized ? "s:" + normalized.toLowerCase() : null;
        }
        try {
            const enumValue = value.field("value__").value;
            const key = teamKeyFromValue(enumValue, depth + 1);
            if (key)
                return key;
        }
        catch (_) { }
        for (const name of ["get_TeamNumber", "get_TeamId", "get_TeamID", "get_Id", "get_ID", "get_Index", "get_Value"]) {
            try {
                const key = teamKeyFromValue(value.method(name, 0).invoke(), depth + 1);
                if (key)
                    return key;
            }
            catch (_) { }
        }
        for (const name of ["_TeamNumber", "TeamNumber", "teamNumber", "TeamId", "teamId", "Id", "id", "Index", "index"]) {
            try {
                const key = teamKeyFromValue(value.field(name).value, depth + 1);
                if (key)
                    return key;
            }
            catch (_) { }
        }
        try {
            const className = String(value.class?.fullName || value.class?.name || "");
            if (/(team|side)/i.test(className) && value.handle)
                return "o:" + String(value.handle);
        }
        catch (_) { }
        return null;
    }
    function readTeamIdUncached(player) {
        const methods = [
            "get_TeamNumber", "get_Team", "get_TeamId", "get_TeamID", "get_TeamIndex",
            "get_PlayerTeam", "get_CurrentTeam", "get_TeamNumber", "get_Side",
        ];
        for (const name of methods) {
            try {
                const key = teamKeyFromValue(player.method(name, 0).invoke());
                if (key)
                    return key;
            }
            catch (_) { }
        }
        const fields = [
            "_TeamNumber", "TeamNumber", "teamNumber", "_teamNumber",
            "Team", "team", "_team", "TeamId", "teamId", "_teamId", "TeamID", "teamID",
            "TeamIndex", "teamIndex", "PlayerTeam", "playerTeam", "CurrentTeam", "currentTeam",
            "Side", "side", "<Team>k__BackingField", "<TeamId>k__BackingField",
        ];
        for (const name of fields) {
            try {
                const key = teamKeyFromValue(player.field(name).value);
                if (key)
                    return key;
            }
            catch (_) { }
        }
        if (discoveredTeamGetterNames === null || discoveredTeamFieldNames === null) {
            discoveredTeamGetterNames = [];
            discoveredTeamFieldNames = [];
            try {
                for (const method of player.class.methods) {
                    const name = String(method.name);
                    if (method.parameterCount === 0 && /^get_/.test(name) && /(team|side)/i.test(name)) {
                        discoveredTeamGetterNames.push(name);
                    }
                }
                for (const field of player.class.fields) {
                    const name = String(field.name);
                    if (/(team|side)/i.test(name))
                        discoveredTeamFieldNames.push(name);
                }
            }
            catch (_) { }
        }
        for (const name of discoveredTeamGetterNames) {
            try {
                const method = player.method(name, 0);
                const returnName = String(method.returnType?.name || "");
                if (!/(team|side|string|byte|int|enum)/i.test(returnName))
                    continue;
                const key = teamKeyFromValue(method.invoke());
                if (key)
                    return key;
            }
            catch (_) { }
        }
        for (const name of discoveredTeamFieldNames) {
            try {
                const key = teamKeyFromValue(player.field(name).value);
                if (key)
                    return key;
            }
            catch (_) { }
        }
        return null;
    }
    function readTeamId(player) {
        if (!isUnityObjectAlive(player))
            return null;
        const key = String(visualObjectKey(player));
        if (key) {
            const cached = teamKeyCache.get(key);
            if (cached && frameNumber < cached.expires)
                return cached.value;
        }
        const value = readTeamIdUncached(player);
        if (key) {
            teamKeyCache.set(key, {
                value,
                expires: frameNumber + (value === null ? 30 : 180),
            });
        }
        return value;
    }
    function visualColor(teamMatch, localTeam, targetTeam) {
        if (!teamMatch)
            return [1, 1, 1, 0.88];
        if (localTeam !== null && targetTeam !== null && targetTeam === localTeam) {
            return [0.10, 1.0, 0.20, 0.88];
        }
        // A confirmed match must not fall back to lobby-white. Unknown teams
        // occur in 1v1/FFA modes and are enemies from the local perspective.
        return [1.0, 0.08, 0.08, 0.88];
    }
    function concreteMatchModeIsActive() {
        if (frameNumber - lastMatchModeScanFrame < 60)
            return cachedMatchModeActive;
        lastMatchModeScanFrame = frameNumber;
        cachedMatchModeActive = false;
        for (const klass of MatchModeClasses) {
            if (objectsOfClass(klass).some(componentIsActiveInScene)) {
                cachedMatchModeActive = true;
                break;
            }
        }
        if (!cachedMatchModeActive) {
            try {
                const players = objectsOfClass(NetworkPlayer);
                if (players.length >= 2) {
                    const teams = new Set();
                    let unknown = 0;
                    for (const player of players) {
                        if (!isUnityObjectAlive(player))
                            continue;
                        const team = readTeamId(player);
                        if (team)
                            teams.add(team);
                        else
                            unknown++;
                    }
                    if (teams.size >= 2)
                        cachedMatchModeActive = true;
                    else if (teams.size === 1 && unknown === 0 && players.length >= 2)
                        cachedMatchModeActive = true;
                }
            }
            catch (_) { }
        }
        return cachedMatchModeActive;
    }
    function ensureVisualRoot() {
        if (!isUnityObjectAlive(visualRoot))
            visualRoot = createEmpty("AnimalRivalsVisuals");
        return getTransform(visualRoot);
    }
    function ensureTracer(target) {
        if (isUnityObjectAlive(target.tracer) && isUnityObjectAlive(target.tracerRenderer))
            return;
        try {
            const object = createEmpty("AnimalRivalsTracer:" + target.key);
            getTransform(object).method("SetParent", 2).invoke(ensureVisualRoot(), false);
            const line = addComponent(object, LineRenderer);
            line.method("set_useWorldSpace", 1).invoke(true);
            line.method("set_positionCount", 1).invoke(2);
            line.method("set_startWidth", 1).invoke(0.008);
            line.method("set_endWidth", 1).invoke(0.008);
            try {
                line.method("set_numCornerVertices", 1).invoke(2);
            }
            catch (_) { }
            try {
                line.method("set_numCapVertices", 1).invoke(2);
            }
            catch (_) { }
            target.tracer = object;
            target.tracerRenderer = line;
            target.tracerColorKey = "";
            applyTracerColor(target);
        }
        catch (_) {
            target.tracer = null;
            target.tracerRenderer = null;
        }
    }
    function applyTracerColor(target) {
        if (!isUnityObjectAlive(target.tracerRenderer))
            return;
        const colorKey = visualColorKey(target.color);
        if (target.tracerColorKey === colorKey)
            return;
        const material = getVisualMaterial(target.color);
        try {
            target.tracerRenderer.method("set_startColor", 1).invoke(target.color);
        }
        catch (_) { }
        try {
            target.tracerRenderer.method("set_endColor", 1).invoke(target.color);
        }
        catch (_) { }
        if (isUnityObjectAlive(material)) {
            try {
                target.tracerRenderer.method("set_sharedMaterial", 1).invoke(material);
            }
            catch (_) { }
        }
        target.tracerColorKey = colorKey;
    }
    function hierarchyGameObject(value) {
        if (!isUnityObjectAlive(value))
            return null;
        try {
            if (GameObject.isAssignableFrom(value.class))
                return value;
        }
        catch (_) { }
        return componentGameObject(value);
    }
    function visualHierarchyRoots(player) {
        const roots = [];
        const addRoot = (value) => {
            const object = hierarchyGameObject(value);
            if (!isUnityObjectAlive(object))
                return;
            if (!roots.some(existing => sameObject(existing, object)))
                roots.push(object);
        };
        for (const fieldName of ["networkRig", "playerAvatar", "avatar", "rig", "body", "playerBody"]) {
            try {
                addRoot(player.field(fieldName).value);
            }
            catch (_) { }
        }
        if (discoveredVisualRootFieldNames === null) {
            discoveredVisualRootFieldNames = [];
            try {
                for (const field of player.class.fields) {
                    const name = String(field.name);
                    if (/(rig|avatar|body|model|character)/i.test(name)) {
                        discoveredVisualRootFieldNames.push(name);
                    }
                }
            }
            catch (_) { }
        }
        for (const fieldName of discoveredVisualRootFieldNames) {
            try {
                addRoot(player.field(fieldName).value);
            }
            catch (_) { }
        }
        if (roots.length === 0)
            addRoot(player);
        return roots;
    }
    function rendererIsChamCandidate(renderer) {
        if (!isUnityObjectAlive(renderer))
            return false;
        try {
            const object = componentGameObject(renderer);
            const name = objectName(object);
            if (/(particle|trail|muzzle|projectile|canvas|text|ui|name.?tag)/i.test(name))
                return false;
        }
        catch (_) { }
        return true;
    }
    function childRenderers(root, klass) {
        const values = [];
        const seen = new Set();
        const add = (sourceClass) => {
            if (!sourceClass)
                return;
            try {
                const components = root.method("GetComponentsInChildren", 2)
                    .overload("System.Type", "System.Boolean")
                    .invoke(sourceClass.type.object, true);
                for (const component of objectArrayValues(components)) {
                    const key = visualObjectKey(component);
                    if (key && !seen.has(key)) {
                        seen.add(key);
                        values.push(component);
                    }
                }
            }
            catch (_) {
                try {
                    const components = root.method("GetComponentsInChildren", 1)
                        .overload("System.Type")
                        .invoke(sourceClass.type.object);
                    for (const component of objectArrayValues(components)) {
                        const key = visualObjectKey(component);
                        if (key && !seen.has(key)) {
                            seen.add(key);
                            values.push(component);
                        }
                    }
                }
                catch (_) { }
            }
        };
        add(klass);
        return values;
    }
    function fallbackSceneRenderersForRoot(root) {
        if (!isUnityObjectAlive(root))
            return [];
        const roots = [root];
        const results = [];
        const seen = new Set();
        for (const renderer of objectsOfClass(Renderer, true)) {
            const object = componentGameObject(renderer);
            if (!isUnityObjectAlive(object))
                continue;
            if (!isUnityObjectAlive(getTransform(object)))
                continue;
            if (!objectIsWithinRoots(object, roots))
                continue;
            const key = visualObjectKey(renderer);
            if (!key || seen.has(key))
                continue;
            seen.add(key);
            results.push(renderer);
        }
        return results;
    }
    function scalarHealthValue(value, depth = 0) {
        if (depth > 2 || value == null)
            return Number.NaN;
        const direct = numericValue(value);
        if (Number.isFinite(direct))
            return direct;
        for (const methodName of ["get_Value", "get_CurrentValue", "get_RawValue"]) {
            try {
                const number = scalarHealthValue(value.method(methodName, 0).invoke(), depth + 1);
                if (Number.isFinite(number))
                    return number;
            }
            catch (_) { }
        }
        for (const fieldName of ["value", "_value", "Value", "CurrentValue", "_currentValue", "<Value>k__BackingField"]) {
            try {
                const number = scalarHealthValue(value.field(fieldName).value, depth + 1);
                if (Number.isFinite(number))
                    return number;
            }
            catch (_) { }
        }
        return Number.NaN;
    }
    function readNetworkPlayerHealth(player) {
        let health = null;
        try {
            // This is the pinned build's exact network-player health accessor.
            health = player.method("get_DLAR_Player_Health", 0).invoke();
        }
        catch (_) {
            return Number.NaN;
        }
        if (health == null)
            return Number.NaN;
        const direct = scalarHealthValue(health);
        if (Number.isFinite(direct))
            return direct;
        if (cachedHealthValueAccessor) {
            try {
                const value = cachedHealthValueAccessor.kind === "method"
                    ? health.method(cachedHealthValueAccessor.name, 0).invoke()
                    : health.field(cachedHealthValueAccessor.name).value;
                const number = scalarHealthValue(value);
                if (Number.isFinite(number))
                    return number;
            }
            catch (_) { }
            cachedHealthValueAccessor = null;
        }
        for (const name of [
            "get_CurrentHealth", "get_currentHealth", "get_Health", "get_health",
            "get_CurrentHP", "get_HP", "get_CurrentHitPoints", "GetCurrentHealth",
            "GetHealth", "get_HealthValue", "GetHealthValue",
        ]) {
            try {
                const number = scalarHealthValue(health.method(name, 0).invoke());
                if (!Number.isFinite(number))
                    continue;
                cachedHealthValueAccessor = { kind: "method", name };
                return number;
            }
            catch (_) { }
        }
        for (const name of [
            "currentHealth", "_currentHealth", "CurrentHealth", "health", "_health", "Health",
            "currentHP", "_currentHP", "CurrentHP", "HP",
            "<CurrentHealth>k__BackingField", "<Health>k__BackingField",
        ]) {
            try {
                const number = scalarHealthValue(health.field(name).value);
                if (!Number.isFinite(number))
                    continue;
                cachedHealthValueAccessor = { kind: "field", name };
                return number;
            }
            catch (_) { }
        }
        return Number.NaN;
    }
    function applyHpLabelColor(target) {
        if (!isUnityObjectAlive(target.hpText))
            return;
        const colorKey = visualColorKey(target.color);
        if (target.hpColorKey === colorKey)
            return;
        const color = [target.color[0], target.color[1], target.color[2], 1.0];
        try {
            target.hpText.method("set_color", 1).invoke(color);
        }
        catch (_) { }
        target.hpColorKey = colorKey;
    }
    function ensureHpLabel(target) {
        if (isUnityObjectAlive(target.hpObject) && isUnityObjectAlive(target.hpText)) {
            applyHpLabelColor(target);
            return;
        }
        clearTargetHpLabel(target);
        let object = null;
        try {
            object = createEmpty("AnimalRivalsHp:" + target.key);
            const transform = getTransform(object);
            transform.method("SetParent", 2).invoke(ensureVisualRoot(), false);
            transform.method("set_localScale", 1).invoke([1, 1, 1]);
            const text = addComponent(object, TextMesh);
            if (!isUnityObjectAlive(text))
                throw new Error("TextMesh unavailable");
            const font = getFont();
            if (isUnityObjectAlive(font)) {
                try {
                    text.method("set_font", 1).invoke(font);
                }
                catch (_) { }
            }
            text.method("set_text", 1).invoke(Il2Cpp.string("HP: ?"));
            try {
                text.method("set_fontSize", 1).invoke(64);
            }
            catch (_) { }
            try {
                text.method("set_characterSize", 1).invoke(0.032);
            }
            catch (_) { }
            try {
                text.method("set_fontStyle", 1).invoke(1);
            }
            catch (_) { }
            try {
                text.method("set_anchor", 1).invoke(7);
            }
            catch (_) { }
            try {
                text.method("set_alignment", 1).invoke(1);
            }
            catch (_) { }
            try {
                text.method("set_richText", 1).invoke(false);
            }
            catch (_) { }
            const renderer = getComponent(object, Renderer);
            if (isUnityObjectAlive(renderer)) {
                const material = getVisualHpMaterial();
                if (isUnityObjectAlive(material)) {
                    try {
                        renderer.method("set_sharedMaterial", 1).invoke(material);
                    }
                    catch (_) { }
                }
                try {
                    renderer.method("set_sortingOrder", 1).invoke(32767);
                }
                catch (_) { }
                try {
                    renderer.method("set_enabled", 1).invoke(true);
                }
                catch (_) { }
            }
            target.hpObject = object;
            target.hpText = text;
            target.hpRenderer = renderer;
            target.hpLabel = "";
            target.hpColorKey = "";
            applyHpLabelColor(target);
        }
        catch (_) {
            if (isUnityObjectAlive(object))
                destroy(object);
            clearTargetHpLabel(target);
        }
    }
    function formatHealth(value) {
        if (!Number.isFinite(value))
            return "HP: ?";
        const clamped = Math.max(0, Math.min(99999, value));
        return "HP: " + (Math.abs(clamped - Math.round(clamped)) < 0.05
            ? String(Math.round(clamped))
            : clamped.toFixed(1));
    }
    function updateHpLabels() {
        let cameraRotation = null;
        try {
            const camera = Camera.method("get_main", 0).invoke();
            if (isUnityObjectAlive(camera)) {
                const rawRotation = getTransform(camera).method("get_rotation", 0).invoke();
                cameraRotation = rawRotation;
            }
        }
        catch (_) { }
        for (const target of visualTargets.values()) {
            if (!isUnityObjectAlive(target.player))
                continue;
            ensureHpLabel(target);
            if (!isUnityObjectAlive(target.hpObject) || !isUnityObjectAlive(target.hpText))
                continue;
            if (frameNumber % HP_TEXT_REFRESH_FRAMES === 0 || !target.hpLabel) {
                const label = formatHealth(readNetworkPlayerHealth(target.player));
                if (label !== target.hpLabel) {
                    try {
                        target.hpText.method("set_text", 1).invoke(Il2Cpp.string(label));
                    }
                    catch (_) { }
                    target.hpLabel = label;
                }
            }
            const head = networkPlayerHeadPosition(target.player);
            if (!head)
                continue;
            try {
                const transform = getTransform(target.hpObject);
                transform.method("set_position", 1).invoke([head[0], head[1] + 0.18, head[2]]);
                if (cameraRotation)
                    transform.method("set_rotation", 1).invoke(cameraRotation);
            }
            catch (_) { }
        }
    }
    function localAvatarRoots(player) {
        const roots = [];
        const addRoot = (value) => {
            const object = hierarchyGameObject(value);
            if (!isUnityObjectAlive(object))
                return;
            if (!roots.some(existing => sameObject(existing, object)))
                roots.push(object);
        };
        for (const fieldName of ["networkRig", "playerAvatar", "avatar", "rig", "body", "playerBody"]) {
            try {
                addRoot(player.field(fieldName).value);
            }
            catch (_) { }
        }
        if (discoveredVisualRootFieldNames === null) {
            discoveredVisualRootFieldNames = [];
            try {
                for (const field of player.class.fields) {
                    const name = String(field.name);
                    if (/(rig|avatar|body|model|character)/i.test(name)) {
                        discoveredVisualRootFieldNames.push(name);
                    }
                }
            }
            catch (_) { }
        }
        if (discoveredVisualRootFieldNames) {
            for (const fieldName of discoveredVisualRootFieldNames) {
                try {
                    addRoot(player.field(fieldName).value);
                }
                catch (_) { }
            }
        }
        // Only fall back to the whole network-player hierarchy when the build
        // exposes no separate body/rig reference. Held items are still filtered.
        if (roots.length === 0)
            addRoot(player);
        return roots;
    }
    function objectIsWithinRoots(object, roots) {
        if (!isUnityObjectAlive(object))
            return false;
        let transform = null;
        try {
            transform = getTransform(object);
        }
        catch (_) {
            return false;
        }
        for (const root of roots) {
            if (!isUnityObjectAlive(root))
                continue;
            try {
                if (sameObject(object, root) ||
                    !!transform.method("IsChildOf", 1).invoke(getTransform(root)))
                    return true;
            }
            catch (_) { }
        }
        return false;
    }
    function rendererHasExcludedOwner(renderer, heldRoots) {
        const object = componentGameObject(renderer);
        if (!isUnityObjectAlive(object))
            return true;
        if (objectIsWithinRoots(object, heldRoots))
            return true;
        let transform = null;
        try {
            transform = getTransform(object);
        }
        catch (_) {
            return true;
        }
        for (let depth = 0; depth < 10 && isUnityObjectAlive(transform); depth++) {
            try {
                const owner = transform.method("get_gameObject", 0).invoke();
                const name = String(owner.method("get_name", 0).invoke());
                if (/(weapon|gun|item|holster|muzzle|projectile|grenade|clipboard|animalrivals(menu|visual|vfx|platform))/i.test(name)) {
                    return true;
                }
                transform = transform.method("get_parent", 0).invoke();
            }
            catch (_) {
                break;
            }
        }
        return false;
    }
    function restoreInvisibleRenderer(entry) {
        if (!entry || !isUnityObjectAlive(entry.renderer))
            return;
        try {
            entry.renderer.method("set_enabled", 1).invoke(!!entry.enabled);
        }
        catch (_) { }
    }
    function networkPlayerAvatarObject(player) {
        if (!isUnityObjectAlive(player))
            return null;
        try {
            return hierarchyGameObject(player.field("playerAvatar").value);
        }
        catch (_) {
            return null;
        }
    }
    function setObjectLayerRecursively(root, layer) {
        if (!isUnityObjectAlive(root) || !Number.isFinite(layer) || layer < 0 || layer > 31)
            return;
        const pending = [root];
        let visited = 0;
        while (pending.length > 0 && visited < 256) {
            const object = pending.pop();
            visited++;
            if (!isUnityObjectAlive(object))
                continue;
            try {
                object.method("set_layer", 1).invoke(Math.trunc(layer));
            }
            catch (_) { }
            try {
                const transform = getTransform(object);
                const childCount = Number(transform.method("get_childCount", 0).invoke());
                for (let index = 0; index < childCount; index++) {
                    const child = transform.method("GetChild", 1).invoke(index);
                    const childObject = child.method("get_gameObject", 0).invoke();
                    if (isUnityObjectAlive(childObject))
                        pending.push(childObject);
                }
            }
            catch (_) { }
        }
    }
    function setNetworkAvatarLayer(player, layerName) {
        if (!isUnityObjectAlive(player) || !layerName)
            return false;
        try {
            player.method("RPC_SetPlayerAvatarLayer", 1)
                .overload("System.String")
                .invoke(Il2Cpp.string(layerName));
            return true;
        }
        catch (_) {
            return false;
        }
    }
    function applyInvisibilityNetworkLayer(player) {
        if (invisibilityLayerRpcApplied && sameObject(invisibilityLayerRpcPlayer, player))
            return;
        if (invisibilityLayerRpcApplied)
            restoreInvisibilityNetworkLayer();
        const avatar = networkPlayerAvatarObject(player);
        let originalLayer = -1;
        if (isUnityObjectAlive(avatar)) {
            try {
                originalLayer = Number(avatar.method("get_layer", 0).invoke());
            }
            catch (_) { }
        }
        if (!setNetworkAvatarLayer(player, "MyLocalAvatar"))
            return;
        invisibilityLayerRpcPlayer = player;
        invisibilityOriginalLayer = originalLayer;
        invisibilityLayerRpcApplied = true;
    }
    function restoreInvisibilityNetworkLayer() {
        const player = invisibilityLayerRpcPlayer;
        const originalLayer = invisibilityOriginalLayer;
        invisibilityLayerRpcPlayer = null;
        invisibilityOriginalLayer = -1;
        const wasApplied = invisibilityLayerRpcApplied;
        invisibilityLayerRpcApplied = false;
        if (!wasApplied || !isUnityObjectAlive(player))
            return;
        // Remote clients should render this avatar normally again. Restore the
        // caller's original local layer immediately afterwards.
        setNetworkAvatarLayer(player, "MyNetworkAvatar");
        const avatar = networkPlayerAvatarObject(player);
        if (isUnityObjectAlive(avatar) && originalLayer >= 0)
            setObjectLayerRecursively(avatar, originalLayer);
    }
    function restoreInvisibility() {
        restoreInvisibilityNetworkLayer();
        for (const entry of invisibleRenderers.values())
            restoreInvisibleRenderer(entry);
        invisibleRenderers.clear();
        invisibilityPlayer = null;
        lastInvisibilityScanFrame = -1000;
    }
    function scanInvisibilityRenderers(player) {
        applyInvisibilityNetworkLayer(player);
        const heldRoots = getLocalHeldWeapons()
            .map(hierarchyGameObject)
            .filter(isUnityObjectAlive);
        const previous = new Map(invisibleRenderers);
        const next = new Map();
        const seen = new Set();
        for (const root of localAvatarRoots(player)) {
            for (const klass of [SkinnedMeshRenderer, MeshRenderer]) {
                for (const renderer of childRenderers(root, klass)) {
                    const key = visualObjectKey(renderer);
                    if (!key || seen.has(key) || !rendererIsChamCandidate(renderer))
                        continue;
                    seen.add(key);
                    const oldEntry = previous.get(key);
                    previous.delete(key);
                    if (rendererHasExcludedOwner(renderer, heldRoots)) {
                        if (oldEntry)
                            restoreInvisibleRenderer(oldEntry);
                        continue;
                    }
                    let entry = oldEntry;
                    if (!entry) {
                        let enabled = true;
                        try {
                            enabled = !!renderer.method("get_enabled", 0).invoke();
                        }
                        catch (_) { }
                        entry = { renderer, enabled };
                    }
                    try {
                        renderer.method("set_enabled", 1).invoke(false);
                    }
                    catch (_) { }
                    next.set(key, entry);
                }
            }
        }
        for (const entry of previous.values())
            restoreInvisibleRenderer(entry);
        invisibleRenderers = next;
        invisibilityPlayer = player;
        lastInvisibilityScanFrame = frameNumber;
    }
    function updateInvisibility() {
        if (!mods.invisibility) {
            if (invisibleRenderers.size > 0 || isLive(invisibilityPlayer))
                restoreInvisibility();
            return;
        }
        if (isUnityObjectAlive(invisibilityPlayer) &&
            frameNumber - lastInvisibilityScanFrame < INVISIBILITY_RESCAN_FRAMES) {
            // Renderer/LOD code may turn a body part back on. Reassert only the
            // already-cached renderers; the hierarchy scan remains throttled.
            if (frameNumber % 15 === 0) {
                for (const entry of invisibleRenderers.values()) {
                    if (!isUnityObjectAlive(entry.renderer))
                        continue;
                    try {
                        entry.renderer.method("set_enabled", 1).invoke(false);
                    }
                    catch (_) { }
                }
            }
            return;
        }
        const players = objectsOfClass(NetworkPlayer);
        const local = findLocalNetworkPlayer(players);
        if (!isUnityObjectAlive(local)) {
            restoreInvisibility();
            return;
        }
        if (isUnityObjectAlive(invisibilityPlayer) && !sameObject(invisibilityPlayer, local)) {
            restoreInvisibility();
        }
        scanInvisibilityRenderers(local);
    }
    function applyChamMaterial(target) {
        const colorKey = visualColorKey(target.color);
        const material = getVisualMaterial(target.color);
        if (!isUnityObjectAlive(material))
            return;
        let allApplied = true;
        for (const entry of target.chamRenderers || []) {
            if (!isUnityObjectAlive(entry.renderer) || entry.colorKey === colorKey)
                continue;
            let applied = false;
            // Replacing an entire native Material[] repeatedly can abort the
            // Unity player when an avatar swaps LODs mid-frame. A single
            // shared-material assignment is stable and still colors the rig.
            try {
                entry.renderer.method("set_sharedMaterial", 1).invoke(material);
                applied = true;
            }
            catch (_) { }
            if (applied) {
                entry.colorKey = colorKey;
            }
            else
                allApplied = false;
        }
        target.chamColorKey = allApplied ? colorKey : "";
    }
    function scanTargetChamRenderers(target) {
        const previous = new Map();
        for (const entry of target.chamRenderers || []) {
            previous.set(visualObjectKey(entry.renderer), entry);
        }
        const next = [];
        const seen = new Set();
        const roots = visualHierarchyRoots(target.player);
        for (const root of roots) {
            for (const klass of [SkinnedMeshRenderer]) {
                for (const renderer of childRenderers(root, klass)) {
                    if (next.length >= MAX_CHAM_RENDERERS_PER_TARGET)
                        break;
                    const key = visualObjectKey(renderer);
                    if (!key || seen.has(key) || !rendererIsChamCandidate(renderer))
                        continue;
                    seen.add(key);
                    const existing = previous.get(key);
                    if (existing) {
                        next.push(existing);
                        previous.delete(key);
                        continue;
                    }
                    try {
                        const originalMaterial = renderer.method("get_sharedMaterial", 0).invoke();
                        if (isUnityObjectAlive(originalMaterial)) {
                            next.push({ renderer, originalMaterial, colorKey: "" });
                        }
                    }
                    catch (_) { }
                }
            }
            if (next.length >= MAX_CHAM_RENDERERS_PER_TARGET)
                break;
        }
        for (const entry of previous.values()) {
            if (!isUnityObjectAlive(entry.renderer))
                continue;
            if (isUnityObjectAlive(entry.originalMaterial)) {
                try {
                    entry.renderer.method("set_sharedMaterial", 1).invoke(entry.originalMaterial);
                }
                catch (_) { }
            }
        }
        target.chamRenderers = next;
        target.lastChamScanFrame = frameNumber;
        applyChamMaterial(target);
    }
    function clearTargetEspBox(target) {
        if (!target || !Array.isArray(target.boxLines)) return;
    
        for (const entry of target.boxLines) {
            if (entry && isUnityObjectAlive(entry.object)) {
                destroy(entry.object);
            }
        }
    
        target.boxLines = [];
        target.boxColorKey = "";
    }
    
    function ensureEspBox(target) {
        if (!target) return;
    
        // FIX: initialize the array before creating any lines.
        if (!Array.isArray(target.boxLines)) {
            target.boxLines = [];
        }
    
        if (
            target.boxLines.length === 4 &&
            target.boxLines.every(
                entry =>
                    entry &&
                    isUnityObjectAlive(entry.object) &&
                    isUnityObjectAlive(entry.line)
            )
        ) {
            applyEspBoxColor(target);
            return;
        }
    
        clearTargetEspBox(target);
    
        try {
            for (let i = 0; i < 4; i++) {
                const object = createEmpty(
                    "AnimalRivalsEspBox:" + target.key + ":" + i
                );
    
                getTransform(object)
                    .method("SetParent", 2)
                    .invoke(ensureVisualRoot(), false);
    
                const line = addComponent(object, LineRenderer);
    
                if (!isUnityObjectAlive(line)) {
                    throw new Error("Failed to create ESP LineRenderer");
                }
    
                line.method("set_useWorldSpace", 1).invoke(true);
                line.method("set_positionCount", 1).invoke(2);
                line.method("set_startWidth", 1).invoke(0.012);
                line.method("set_endWidth", 1).invoke(0.012);
    
                target.boxLines.push({ object, line });
            }
    
            target.boxColorKey = "";
            applyEspBoxColor(target);
        } catch (error) {
            console.log("[ESP] Box creation failed: " + error);
            clearTargetEspBox(target);
        }
    }
    
    function applyEspBoxColor(target) {
        if (!target || !Array.isArray(target.boxLines)) return;
    
        const material = getVisualMaterial(target.color);
    
        for (const entry of target.boxLines) {
            if (!entry || !isUnityObjectAlive(entry.line)) continue;
    
            const line = entry.line;
    
            try {
                line.method("set_enabled", 1).invoke(true);
                line.method("set_startColor", 1).invoke(target.color);
                line.method("set_endColor", 1).invoke(target.color);
    
                if (isUnityObjectAlive(material)) {
                    line.method("set_sharedMaterial", 1).invoke(material);
                }
            } catch (error) {
                console.log("[ESP] Material setup failed: " + error);
            }
        }
    
        target.boxColorKey = visualColorKey(target.color);
    }
    
    function updateEspBoxes() {
        let right = null;
        let up = null;
    
        try {
            const camera = Camera.method("get_main", 0).invoke();
    
            if (isUnityObjectAlive(camera)) {
                const transform = getTransform(camera);
    
                right = vector3Value(
                    transform.method("get_right", 0).invoke()
                );
    
                up = vector3Value(
                    transform.method("get_up", 0).invoke()
                );
            }
        } catch (_) {}
    
        if (!right || !up) return;
    
        for (const target of visualTargets.values()) {
            if (!isUnityObjectAlive(target.player)) continue;
    
            ensureEspBox(target);
    
            if (!target.boxLines || target.boxLines.length !== 4) continue;
    
            const head = networkPlayerHeadPosition(target.player);
    
            if (!head) continue;
    
            const height = 1.65;
            const halfWidth = 0.42;
    
            const top = [
                head[0] + up[0] * 0.08,
                head[1] + up[1] * 0.08,
                head[2] + up[2] * 0.08
            ];
    
            const bottom = [
                head[0] - up[0] * height,
                head[1] - up[1] * height,
                head[2] - up[2] * height
            ];
    
            const tl = [
                top[0] - right[0] * halfWidth,
                top[1] - right[1] * halfWidth,
                top[2] - right[2] * halfWidth
            ];
    
            const tr = [
                top[0] + right[0] * halfWidth,
                top[1] + right[1] * halfWidth,
                top[2] + right[2] * halfWidth
            ];
    
            const bl = [
                bottom[0] - right[0] * halfWidth,
                bottom[1] - right[1] * halfWidth,
                bottom[2] - right[2] * halfWidth
            ];
    
            const br = [
                bottom[0] + right[0] * halfWidth,
                bottom[1] + right[1] * halfWidth,
                bottom[2] + right[2] * halfWidth
            ];
    
            const edges = [
                [tl, tr],
                [tr, br],
                [br, bl],
                [bl, tl]
            ];
    
            for (let i = 0; i < 4; i++) {
                try {
                    const line = target.boxLines[i].line;
    
                    line.method("SetPosition", 2).invoke(0, edges[i][0]);
                    line.method("SetPosition", 2).invoke(1, edges[i][1]);
                } catch (_) {}
            }
        }
    }
    function scanVisualTargets() {
        const players = objectsOfClass(NetworkPlayer);
        const local = findLocalNetworkPlayer(players);
        if (!isLive(local)) {
            clearVisuals();
            return;
        }
        const remotes = players
            .filter(player => !isLocalNetworkTarget(player, local) && isUnityObjectAlive(player))
            .slice(0, MAX_VISUAL_TARGETS);
        const localTeam = readTeamId(local);
        const remoteTeams = remotes.map(readTeamId);
        const teamMatch = concreteMatchModeIsActive();
        const activeKeys = new Set();
        remotes.forEach((player, index) => {
            const key = visualObjectKey(player);
            if (!key || !isUnityObjectAlive(player))
                return;
            activeKeys.add(key);
            const color = visualColor(teamMatch, localTeam, remoteTeams[index]);
            let target = visualTargets.get(key);
            if (!target) {
                target = {
                    key, player, color, tracer: null, tracerRenderer: null,
                    tracerColorKey: "", chamColorKey: "", chamRenderers: [],
                    hpObject: null, hpText: null, hpRenderer: null,
                    hpLabel: "", hpColorKey: "",
                    lastChamScanFrame: -1000,
                };
                visualTargets.set(key, target);
            }
            target.player = player;
            target.color = color;
            if (mods.tracers) {
                ensureTracer(target);
                applyTracerColor(target);
            }
            if (mods.chams) {
                if (frameNumber - target.lastChamScanFrame >= CHAM_RENDERER_RESCAN_FRAMES) {
                    scanTargetChamRenderers(target);
                }
                else if (target.chamColorKey !== visualColorKey(color)) {
                    for (const entry of target.chamRenderers || [])
                        entry.colorKey = "";
                    applyChamMaterial(target);
                }
            }
            if (mods.showHp) {
                ensureHpLabel(target);
                applyHpLabelColor(target);
            }
            if (mods.espBoxes) {
                ensureEspBox(target);
                applyEspBoxColor(target);
            }
        });
        for (const [key, target] of Array.from(visualTargets.entries())) {
            if (activeKeys.has(key))
                continue;
            if (isUnityObjectAlive(target.tracer))
                destroy(target.tracer);
            clearTargetHpLabel(target);
            restoreTargetChams(target);
            visualTargets.delete(key);
        }
    }
    function networkPlayerHeadPosition(player) {
        if (!isUnityObjectAlive(player))
            return null;
        if (ClipboardWeapon) {
            try {
                const value = ClipboardWeapon.method("GetPlayerBodyHeadCenter", 1)
                    .overload("DLARX_NetworkPlayer")
                    .invoke(player);
                const position = vector3Value(value);
                if (position)
                    return position;
            }
            catch (_) { }
        }
        try {
            const avatar = networkPlayerAvatarObject(player);
            const source = isUnityObjectAlive(avatar) ? avatar : componentGameObject(player);
            if (!isUnityObjectAlive(source))
                return null;
            const fallback = transformPosition(getTransform(source));
            if (fallback)
                fallback[1] += 0.85;
            return fallback;
        }
        catch (_) {
            return null;
        }
    }
    function readPlayerRelation(source, target, methodNames) {
        if (!isUnityObjectAlive(source) || !isUnityObjectAlive(target))
            return null;
        for (const methodName of methodNames) {
            try {
                const method = source.method(methodName, 1);
                if (String(method.returnType?.name || "") !== "System.Boolean")
                    continue;
                return !!method.invoke(target);
            }
            catch (_) { }
        }
        return null;
    }
    function activeModeHasNoTeammates() {
        for (const klass of MatchModeClasses) {
            try {
                if (!objectsOfClass(klass).some(componentIsActiveInScene))
                    continue;
                const name = String(klass.fullName || klass.name || "");
                if (/duels?/i.test(name))
                    return true;
            }
            catch (_) { }
        }
        return false;
    }
    function aimbotPlayerIsEnemy(local, target) {
        if (!isUnityObjectAlive(local) || !isUnityObjectAlive(target) ||
            isLocalNetworkTarget(target, local) || !componentIsActiveInScene(target) ||
            !concreteMatchModeIsActive())
            return false;
        const sameTeamMethods = [
            "IsTeammate", "IsTeamMate", "IsSameTeam", "IsOnSameTeam",
            "IsPlayerInMyTeam", "AreTeammates",
        ];
        const enemyMethods = ["IsEnemy", "IsOpponent", "IsRival", "IsHostile"];
        let sameTeam = readPlayerRelation(local, target, sameTeamMethods);
        if (sameTeam === null)
            sameTeam = readPlayerRelation(target, local, sameTeamMethods);
        if (sameTeam === true)
            return false;
        let enemy = readPlayerRelation(local, target, enemyMethods);
        if (enemy === null)
            enemy = readPlayerRelation(target, local, enemyMethods);
        if (enemy !== null)
            return enemy;
        const localTeam = readTeamId(local);
        const targetTeam = readTeamId(target);
        if (localTeam !== null && targetTeam !== null)
            return localTeam !== targetTeam;
        // Duels have no friendly player slot. In team modes an unknown team is
        // deliberately skipped so Aimbot can never guess and select a teammate.
        return activeModeHasNoTeammates();
    }
    function aimbotAdjustPoint(target, head) {
        if (!head || aimbotAimMode === 0)
            return head;
        let jx = 0.0, jz = 0.0;
        if (aimbotAimMode === 2) {
            // Mixed: each target gets a head or body point that is re-rolled every second or two.
            const key = String(visualObjectKey(target));
            let state = aimbotMixed.get(key);
            if (!state || frameNumber >= state.until) {
                state = {
                    head: Math.random() < 0.35,
                    until: frameNumber + 90 + Math.floor(Math.random() * 120),
                    jx: (Math.random() - 0.5) * 0.12,
                    jz: (Math.random() - 0.5) * 0.12,
                };
                if (aimbotMixed.size > 64)
                    aimbotMixed.clear();
                aimbotMixed.set(key, state);
            }
            if (state.head)
                return head;
            jx = state.jx;
            jz = state.jz;
        }
        return [head[0] + jx, head[1] - aimbotBodyDrop, head[2] + jz];
    }
    function aimbotView() {
        try {
            if (!isUnityObjectAlive(activeLocalPlayer))
                return null;
            const cam = getCameraTransform(activeLocalPlayer);
            if (!isUnityObjectAlive(cam))
                return null;
            const position = transformPosition(cam);
            const forward = vector3Value(cam.method("get_forward", 0).invoke());
            return position && forward ? { position, forward } : null;
        }
        catch (_) {
            return null;
        }
    }
    function refreshAimbotRoster() {
        // The expensive part (scene scan + team checks) only runs about once a second.
        if (frameNumber - aimbotRosterFrame < AIMBOT_ROSTER_REFRESH_FRAMES && isUnityObjectAlive(aimbotLocal))
            return;
        aimbotRosterFrame = frameNumber;
        aimbotRoster = [];
        const players = objectsOfClass(NetworkPlayer);
        aimbotLocal = findLocalNetworkPlayer(players);
        if (!isUnityObjectAlive(aimbotLocal))
            return;
        for (const candidate of players) {
            if (aimbotPlayerIsEnemy(aimbotLocal, candidate))
                aimbotRoster.push(candidate);
        }
    }
    function refreshAimbotTarget() {
        if (!mods.aimbot) {
            aimbotTarget = null;
            aimbotTargetPoint = null;
            return null;
        }
        if (frameNumber < aimbotTargetRefreshFrame)
            return isUnityObjectAlive(aimbotTarget) ? aimbotTarget : null;
        aimbotTargetRefreshFrame = frameNumber + AIMBOT_EMPTY_TARGET_REFRESH_FRAMES;
        const previous = aimbotTarget;
        aimbotTarget = null;
        aimbotTargetPoint = null;
        aimbotTargetPointFrame = -1000;
        refreshAimbotRoster();
        if (!isUnityObjectAlive(aimbotLocal) || aimbotRoster.length === 0)
            return null;
        const view = aimbotView();
        let origin = view ? view.position : null;
        if (!origin) {
            try {
                if (isUnityObjectAlive(activeLocalPlayer))
                    origin = transformPosition(getTransform(activeLocalPlayer));
            }
            catch (_) { }
        }
        if (!origin)
            origin = networkPlayerHeadPosition(aimbotLocal);
        if (!origin)
            return null;
        let best = null, bestHead = null, bestScore = Number.POSITIVE_INFINITY;
        let previousHead = null, previousScore = Number.POSITIVE_INFINITY;
        for (const candidate of aimbotRoster) {
            if (!isUnityObjectAlive(candidate))
                continue;
            const health = readNetworkPlayerHealth(candidate);
            if (Number.isFinite(health) && health <= 0)
                continue;
            const head = networkPlayerHeadPosition(candidate);
            if (!head)
                continue;
            const distanceSquared = squaredDistance(origin, head);
            let score;
            if (view && distanceSquared > 0.000001) {
                // Smallest angle from where you are looking wins; distance only breaks ties.
                const distance = Math.sqrt(distanceSquared);
                const cosine = ((head[0] - origin[0]) * view.forward[0] +
                    (head[1] - origin[1]) * view.forward[1] +
                    (head[2] - origin[2]) * view.forward[2]) / distance;
                score = (1.0 - cosine) + distance * 0.002;
            }
            else {
                score = distanceSquared;
            }
            if (candidate === previous) {
                previousHead = head;
                previousScore = score;
            }
            if (score < bestScore) {
                bestScore = score;
                best = candidate;
                bestHead = head;
            }
        }
        // Stick to the current target unless another one is clearly better (stops flicking between players).
        if (previousHead && best !== previous && bestScore > previousScore * AIMBOT_SWITCH_RATIO) {
            best = previous;
            bestHead = previousHead;
        }
        if (best) {
            aimbotTarget = best;
            aimbotTargetPoint = aimbotAdjustPoint(best, bestHead);
            aimbotTargetPointFrame = frameNumber;
            aimbotTargetRefreshFrame = frameNumber + AIMBOT_TARGET_REFRESH_FRAMES;
        }
        return aimbotTarget;
    }
    function currentAimbotTargetPoint(target) {
        if (!isUnityObjectAlive(target))
            return null;
        if (aimbotTargetPointFrame === frameNumber && aimbotTargetPoint)
            return aimbotTargetPoint;
        aimbotTargetPoint = aimbotAdjustPoint(target, networkPlayerHeadPosition(target));
        aimbotTargetPointFrame = frameNumber;
        return aimbotTargetPoint;
    }
    function weaponAimTransform(weapon) {
        const cacheKey = String(visualObjectKey(weapon));
        if (cacheKey) {
            const cached = aimbotAimTransformCache.get(cacheKey);
            if (cached && frameNumber < cached.expires && isUnityObjectAlive(cached.transform))
                return cached.transform;
        }
        let resolved = null;
        for (const fieldName of [
            "muzzleTransform", "MuzzleTransform", "muzzle", "Muzzle",
            "barrelTransform", "BarrelTransform", "barrel", "Barrel",
            "firePoint", "FirePoint", "shootPoint", "ShootPoint",
            "projectileSpawnPoint", "bulletSpawnPoint", "aimTransform",
        ]) {
            const transform = resolveTransformFromField(weapon, fieldName);
            if (isUnityObjectAlive(transform)) {
                resolved = transform;
                break;
            }
        }
        if (!resolved) {
            for (const methodName of [
                "GetMuzzleTransform", "GetMuzzle", "GetBarrelTransform",
                "GetFirePoint", "GetShootPoint", "GetProjectileSpawnPoint",
            ]) {
                try {
                    const value = weapon.method(methodName, 0).invoke();
                    const object = hierarchyGameObject(value);
                    const transform = isUnityObjectAlive(object) ? getTransform(object) : value;
                    if (isUnityObjectAlive(transform)) {
                        resolved = transform;
                        break;
                    }
                }
                catch (_) { }
            }
        }
        if (!resolved) {
            try {
                resolved = getTransform(weapon);
            }
            catch (_) { }
        }
        if (cacheKey && isUnityObjectAlive(resolved)) {
            aimbotAimTransformCache.set(cacheKey, {
                transform: resolved,
                expires: frameNumber + AIMBOT_AIM_TRANSFORM_RECHECK_FRAMES,
            });
        }
        return isUnityObjectAlive(resolved) ? resolved : null;
    }
    function aimbotDirectionForWeapon(weapon, targetPoint = null) {
        if (!mods.aimbot || !isGun(weapon))
            return null;
        const target = refreshAimbotTarget();
        if (!isUnityObjectAlive(target))
            return null;
        const destination = targetPoint || currentAimbotTargetPoint(target);
        if (!destination)
            return null;
        try {
            const root = getTransform(weapon);
            const aim = weaponAimTransform(weapon);
            const origin = transformPosition(aim);
            if (!isUnityObjectAlive(root) || !isUnityObjectAlive(aim) || !origin)
                return null;
            const direction = [
                destination[0] - origin[0],
                destination[1] - origin[1],
                destination[2] - origin[2],
            ];
            const magnitudeSquared = direction[0] * direction[0] +
                direction[1] * direction[1] + direction[2] * direction[2];
            if (!Number.isFinite(magnitudeSquared) || magnitudeSquared < 0.000001)
                return null;
            const inverseMagnitude = 1.0 / Math.sqrt(magnitudeSquared);
            direction[0] *= inverseMagnitude;
            direction[1] *= inverseMagnitude;
            direction[2] *= inverseMagnitude;
            return { root, aim, direction };
        }
        catch (_) {
            return null;
        }
    }
    function applyAimbotToWeapon(weapon, targetPoint = null) {
        const solution = aimbotDirectionForWeapon(weapon, targetPoint);
        if (!solution)
            return false;
        try {
            let rotation = null;
            try {
                const currentForward = solution.aim.method("get_forward", 0).invoke();
                const delta = Quaternion.method("FromToRotation", 2)
                    .invoke(currentForward, solution.direction);
                const current = solution.root.method("get_rotation", 0).invoke();
                rotation = Quaternion.method("op_Multiply", 2).invoke(delta, current);
            }
            catch (_) {
                rotation = Quaternion.method("LookRotation", 1).invoke(solution.direction);
            }
            solution.root.method("set_rotation", 1).invoke(rotation);
            return true;
        }
        catch (_) {
            return false;
        }
    }
    function updateAimbot() {
        if (!mods.aimbot) {
            aimbotTarget = null;
            aimbotTargetPoint = null;
            return;
        }
        const target = refreshAimbotTarget();
        const destination = currentAimbotTargetPoint(target);
        if (!destination)
            return;
        for (const weapon of getLocalHeldWeapons())
            applyAimbotToWeapon(weapon, destination);
    }
    function updateTracerPositions(player) {
        // handRightAnchor is the exact local muzzle/hand-space origin in this build.
        const originTransform = getRightHandTransform(player);
        const origin = transformPosition(originTransform);
        if (!origin)
            return;
        for (const target of visualTargets.values()) {
            if (!isUnityObjectAlive(target.player) || !isUnityObjectAlive(target.tracerRenderer))
                continue;
            const destination = networkPlayerHeadPosition(target.player);
            if (!destination)
                continue;
            try {
                target.tracerRenderer.method("SetPosition", 2).invoke(0, origin);
                target.tracerRenderer.method("SetPosition", 2).invoke(1, destination);
            }
            catch (_) { }
        }
    }
    function updateVisuals(player) {
        if (!mods.tracers)
            clearTracers();
        if (!mods.chams)
            restoreChams();
        if (!mods.showHp)
            clearHpLabels();
        if (!mods.showHitboxes)
            clearHitboxVisuals();
        const targetVisualsEnabled = mods.tracers || mods.chams || mods.showHp || mods.espBoxes;
        if (!targetVisualsEnabled && visualTargets.size > 0) {
            visualTargets.clear();
            lastVisualScanFrame = -1000;
        }
        if (!mods.tracers && !mods.chams && !mods.showHp && !mods.espBoxes && !mods.showHitboxes) {
            if (visualTargets.size > 0 || isLive(visualRoot))
                clearVisuals();
            return;
        }
        if (targetVisualsEnabled && frameNumber - lastVisualScanFrame >= VISUAL_SCAN_INTERVAL_FRAMES) {
            lastVisualScanFrame = frameNumber;
            scanVisualTargets();
        }
        if (mods.espBoxes && frameNumber % 3 === 0) {
            updateEspBoxes();
        }
        if (mods.tracers && frameNumber % 3 === 0)
            updateTracerPositions(player);
        if (mods.showHp && frameNumber % HP_POSITION_REFRESH_FRAMES === 0)
            updateHpLabels();
        if (mods.espBoxes && frameNumber % 3 === 0) {
            updateEspBoxes();
        }
        updateHitboxVisuals();
    }
    function numericValue(value) {
        try {
            let raw = value;
            for (let depth = 0; depth < 4; depth++) {
                if (typeof raw === "number")
                    return raw;
                if (typeof raw === "bigint")
                    return Number(raw);
                if (raw == null)
                    return Number.NaN;
                try {
                    const enumValue = raw.field("value__").value;
                    if (enumValue !== raw) {
                        raw = enumValue;
                        continue;
                    }
                }
                catch (_) { }
                try {
                    if (raw.value !== undefined && raw.value !== raw) {
                        raw = raw.value;
                        continue;
                    }
                }
                catch (_) { }
                break;
            }
            const number = Number(raw);
            return Number.isFinite(number) ? number : Number.NaN;
        }
        catch (_) {
            return Number.NaN;
        }
    }
    function unityNow() {
        for (const name of ["get_realtimeSinceStartup", "get_unscaledTime", "get_time"]) {
            try {
                const value = Number(Time.method(name, 0).invoke());
                if (Number.isFinite(value))
                    return value;
            }
            catch (_) { }
        }
        return frameNumber / 72.0;
    }
    function tryGetRecorderValue(recorder, name) {
        try {
            return recorder.method("get_" + name, 0).invoke();
        }
        catch (_) { }
        try {
            return recorder.method("get_" + name).invoke();
        }
        catch (_) { }
        try {
            return recorder.field(name).value;
        }
        catch (_) { }
        try {
            return recorder.field(name.charAt(0).toLowerCase() + name.substring(1)).value;
        }
        catch (_) { }
        try {
            return recorder.field("_" + name.charAt(0).toLowerCase() + name.substring(1)).value;
        }
        catch (_) { }
        return undefined;
    }
    function trySetRecorderValue(recorder, name, value) {
        try {
            recorder.method("set_" + name, 1).invoke(value);
            return true;
        }
        catch (_) { }
        try {
            recorder.method("set_" + name).invoke(value);
            return true;
        }
        catch (_) { }
        try {
            recorder.field(name).value = value;
            return true;
        }
        catch (_) { }
        try {
            recorder.field(name.charAt(0).toLowerCase() + name.substring(1)).value = value;
            return true;
        }
        catch (_) { }
        try {
            recorder.field("_" + name.charAt(0).toLowerCase() + name.substring(1)).value = value;
            return true;
        }
        catch (_) { }
        return false;
    }
    function getRecorderAliasValue(recorder, names) {
        for (const name of names) {
            const value = tryGetRecorderValue(recorder, name);
            if (value !== undefined)
                return value;
        }
        return undefined;
    }
    function setRecorderAliasValue(recorder, names, value) {
        let changed = false;
        for (const name of names) {
            if (trySetRecorderValue(recorder, name, value))
                changed = true;
        }
        return changed;
    }
    const recorderSourceNames = [
        "SourceType", "sourceType", "_sourceType",
        "InputSourceType", "inputSourceType", "_inputSourceType",
    ];
    const recorderClipNames = ["AudioClip", "audioClip", "_audioClip"];
    function getRecorderSourceType(recorder) {
        return getRecorderAliasValue(recorder, recorderSourceNames);
    }
    function setRecorderSourceType(recorder, value) {
        return setRecorderAliasValue(recorder, recorderSourceNames, value);
    }
    function getRecorderAudioClip(recorder) {
        return getRecorderAliasValue(recorder, recorderClipNames);
    }
    function setRecorderAudioClip(recorder, clip) {
        return setRecorderAliasValue(recorder, recorderClipNames, clip);
    }
    function restartVoiceRecorder(recorder) {
        try {
            const result = recorder.method("RestartRecording", 0).invoke();
            return result === undefined ? true : !!result;
        }
        catch (_) { }
        try {
            const result = recorder.method("RestartRecording", 1).invoke(true);
            return result === undefined ? true : !!result;
        }
        catch (_) { }
        try {
            recorder.method("StartRecording", 0).invoke();
            return true;
        }
        catch (_) { }
        return false;
    }
    function recorderIsUsable(recorder) {
        if (!isLive(recorder))
            return false;
        try {
            const object = recorder.method("get_gameObject", 0).invoke();
            if (!isLive(object) || !object.method("get_activeInHierarchy", 0).invoke())
                return false;
            const scene = object.method("get_scene", 0).invoke();
            return !!scene.method("IsValid", 0).invoke();
        }
        catch (_) {
            return false;
        }
    }
    function recorderScore(recorder, gameObject, fromCustomVoice) {
        let score = fromCustomVoice ? 60 : 0;
        try {
            const rawName = gameObject.method("get_name", 0).invoke();
            const name = String(rawName?.content ?? rawName?.toString?.() ?? rawName);
            if (name === "NetworkRunner")
                score += 50;
        }
        catch (_) { }
        try {
            if (gameObject.method("get_activeInHierarchy", 0).invoke())
                score += 40;
        }
        catch (_) { }
        try {
            const scene = gameObject.method("get_scene", 0).invoke();
            if (scene.method("IsValid", 0).invoke())
                score += 80;
        }
        catch (_) { }
        try {
            if (tryGetRecorderValue(recorder, "RecordingEnabled"))
                score += 20;
        }
        catch (_) { }
        try {
            if (tryGetRecorderValue(recorder, "TransmitEnabled"))
                score += 15;
        }
        catch (_) { }
        try {
            if (recorder.method("get_IsCurrentlyTransmitting", 0).invoke())
                score += 35;
        }
        catch (_) { }
        return score;
    }
    function findSoundboardRecorder() {
        if (recorderIsUsable(soundboardRecorder))
            return soundboardRecorder;
        soundboardRecorder = null;
        soundboardCustomVoiceRecorder = null;
        if (!PhotonRecorder)
            return null;
        const candidates = [];
        const seen = new Set();
        const addCandidate = (recorder, gameObject, fromCustomVoice, bonus = 0, customVoice = null) => {
            if (!recorderIsUsable(recorder))
                return;
            let key = "";
            try {
                key = String(recorder.handle);
            }
            catch (_) {
                key = String(recorder);
            }
            if (!key || seen.has(key))
                return;
            seen.add(key);
            candidates.push({
                recorder,
                customVoice,
                score: recorderScore(recorder, gameObject, fromCustomVoice) + bonus,
            });
        };
        // Deadeye's authoritative outgoing route is owned by
        // CustomVoiceRecorder, not PlayerVoiceHandler (that class belongs to a
        // different DogeLabs title). Resolve its exact Recorder first.
        if (CustomVoiceRecorder) {
            const customVoices = [];
            const addCustomVoice = (custom) => {
                if (!isUnityObjectAlive(custom) ||
                    customVoices.some(existing => sameObject(existing, custom)))
                    return;
                customVoices.push(custom);
            };
            try {
                addCustomVoice(CustomVoiceRecorder.method("get_Instance", 0).invoke());
            }
            catch (_) { }
            try {
                addCustomVoice(CustomVoiceRecorder.field("<Instance>k__BackingField").value);
            }
            catch (_) { }
            for (const custom of objectsOfClass(CustomVoiceRecorder, true))
                addCustomVoice(custom);
            for (const custom of customVoices) {
                let recorder = null;
                try {
                    recorder = custom.method("get_VoiceRecorder", 0).invoke();
                }
                catch (_) { }
                if (!recorderIsUsable(recorder)) {
                    try {
                        recorder = custom.field("voiceRecorder").value;
                    }
                    catch (_) { }
                }
                if (!recorderIsUsable(recorder))
                    continue;
                addCandidate(recorder, componentGameObject(custom), true, 1500, custom);
            }
        }
        // The game-owned local handler keeps the Recorder in bmvx and its
        // VoiceConnection in bmvz. This preserves the game's moderation,
        // player/interest-group and push-to-talk routing.
        if (PlayerVoiceHandler) {
            for (const handler of objectsOfClass(PlayerVoiceHandler)) {
                try {
                    if (!componentIsActiveInScene(handler))
                        continue;
                    try {
                        if (!handler.method("get_enabled", 0).invoke())
                            continue;
                    }
                    catch (_) { }
                    const recorder = handler.field("bmvx").value;
                    if (!recorderIsUsable(recorder))
                        continue;
                    try {
                        if (!recorder.method("get_enabled", 0).invoke())
                            continue;
                    }
                    catch (_) { }
                    const connection = handler.field("bmvz").value;
                    const primary = connection.method("get_PrimaryRecorder", 0).invoke();
                    if (!sameObject(primary, recorder))
                        continue;
                    addCandidate(recorder, componentGameObject(handler), false, 500);
                }
                catch (_) { }
            }
        }
        // The VoiceConnection primary is the recorder that is actually bound to
        // the room. Prefer it before considering scene-wide Recorder components.
        if (PhotonVoiceConnection) {
            try {
                const connections = findObjects(PhotonVoiceConnection);
                for (let index = 0; connections && index < connections.length; index++) {
                    try {
                        const connection = connections.get(index);
                        const object = connection.method("get_gameObject", 0).invoke();
                        let recorder = null;
                        try {
                            recorder = connection.method("get_PrimaryRecorder", 0).invoke();
                        }
                        catch (_) { }
                        addCandidate(recorder, object, false);
                    }
                    catch (_) { }
                }
            }
            catch (_) { }
        }
        if (candidates.length > 0) {
            candidates.sort((left, right) => right.score - left.score);
            soundboardRecorder = candidates[0].recorder;
            soundboardCustomVoiceRecorder = candidates[0].customVoice;
            console.log("[" + MENU_NAME + "] Soundboard selected " +
                (isUnityObjectAlive(soundboardCustomVoiceRecorder)
                    ? "Deadeye CustomVoiceRecorder.get_VoiceRecorder()."
                    : "VoiceConnection.PrimaryRecorder fallback."));
            return soundboardRecorder;
        }
        if (CustomVoiceRecorder) {
            try {
                const customRecorders = Resources.method("FindObjectsOfTypeAll", 1)
                    .overload("System.Type")
                    .invoke(CustomVoiceRecorder.type.object);
                for (let index = 0; customRecorders && index < customRecorders.length; index++) {
                    try {
                        const custom = customRecorders.get(index);
                        const object = custom.method("get_gameObject", 0).invoke();
                        let recorder = null;
                        try {
                            recorder = custom.method("get_VoiceRecorder", 0).invoke();
                        }
                        catch (_) { }
                        if (!recorderIsUsable(recorder))
                            recorder = custom.field("voiceRecorder").value;
                        addCandidate(recorder, object, true, 1000, custom);
                    }
                    catch (_) { }
                }
            }
            catch (_) { }
        }
        try {
            const recorders = findObjects(PhotonRecorder);
            for (let index = 0; recorders && index < recorders.length; index++) {
                try {
                    const recorder = recorders.get(index);
                    addCandidate(recorder, recorder.method("get_gameObject", 0).invoke(), false);
                }
                catch (_) { }
            }
        }
        catch (_) { }
        candidates.sort((left, right) => right.score - left.score);
        soundboardRecorder = candidates.length > 0 ? candidates[0].recorder : null;
        soundboardCustomVoiceRecorder = candidates.length > 0 ? candidates[0].customVoice : null;
        if (isLive(soundboardRecorder)) {
            console.log("[" + MENU_NAME + "] Soundboard selected the live Photon Voice recorder.");
        }
        return soundboardRecorder;
    }
    function captureRecorderState(recorder) {
        if (soundboardRecorderState || !isLive(recorder))
            return;
        const values = {};
        for (const name of [
            "LoopAudioClip", "VoiceDetection", "TransmitEnabled",
            "RecordWhenJoined", "RecordingEnabled",
        ])
            values[name] = tryGetRecorderValue(recorder, name);
        values.SourceType = getRecorderSourceType(recorder);
        values.AudioClip = getRecorderAudioClip(recorder);
        soundboardRecorderState = { recorder, values };
    }
    function clearRecorderClip(recorder) {
        setRecorderAudioClip(recorder, null);
    }
    function restoreRecorderState() {
        const state = soundboardRecorderState;
        soundboardRecorderState = null;
        if (!state || !isLive(state.recorder))
            return;
        const recorder = state.recorder;
        trySetRecorderValue(recorder, "RecordingEnabled", false);
        try {
            recorder.method("StopRecording", 0).invoke();
        }
        catch (_) { }
        if (state.values.SourceType !== undefined) {
            setRecorderSourceType(recorder, state.values.SourceType);
        }
        for (const name of ["LoopAudioClip", "VoiceDetection", "TransmitEnabled", "RecordWhenJoined"]) {
            if (state.values[name] !== undefined)
                trySetRecorderValue(recorder, name, state.values[name]);
        }
        if (state.values.AudioClip !== undefined && isLive(state.values.AudioClip)) {
            setRecorderAudioClip(recorder, state.values.AudioClip);
        }
        else {
            clearRecorderClip(recorder);
        }
        const wasRecording = state.values.RecordingEnabled === undefined
            ? true
            : !!state.values.RecordingEnabled;
        trySetRecorderValue(recorder, "RecordingEnabled", wasRecording);
        if (wasRecording)
            restartVoiceRecorder(recorder);
    }
    function startRecorderClip(recorder, clip) {
        if (!isLive(recorder) || !isLive(clip))
            return false;
        if (!isUnityObjectAlive(soundboardCustomVoiceRecorder)) {
            soundboardRouteError = "Deadeye's voice channel is not ready. Join a lobby and check voice chat.";
            return false;
        }
        try {
            if (CustomVoiceRecorder.method("IsLocalUserVoiceBannedOrSyncing", 0).invoke()) {
                soundboardRouteError = "Voice transmission is unavailable while voice moderation is active.";
                return false;
            }
        }
        catch (_) { }
        // newer builds gate voice on the Quest mic permission, which the soundboard does not need
        prepareMicForSoundboard();
        try {
            if (!soundboardCustomVoiceRecorder.method("IsLocalUserMicEnabled", 0).invoke()) {
                soundboardRouteError = "Turn on your in-game microphone before playing a sound.";
                return false;
            }
        }
        catch (_) { }
        {
            try {
                const rawReason = soundboardCustomVoiceRecorder
                    .method("GetVoiceNotWorkingExplanation", 0).invoke();
                const reason = String(rawReason?.content ?? rawReason ?? "").trim();
                if (reason && reason !== "null" && reason !== "undefined")
                    console.log("[" + MENU_NAME + "] Deadeye voice status: " + reason);
            }
            catch (_) { }
            try {
                soundboardCustomVoiceRecorder.method("UpdateVoiceTransmission", 0).invoke();
            }
            catch (_) { }
        }
        captureRecorderState(recorder);
        trySetRecorderValue(recorder, "RecordingEnabled", false);
        try {
            recorder.method("StopRecording", 0).invoke();
        }
        catch (_) { }
        const sourceConfigured = setRecorderSourceType(recorder, 1);
        const clipConfigured = setRecorderAudioClip(recorder, clip);
        trySetRecorderValue(recorder, "LoopAudioClip", false);
        trySetRecorderValue(recorder, "VoiceDetection", false);
        trySetRecorderValue(recorder, "TransmitEnabled", true);
        trySetRecorderValue(recorder, "RecordWhenJoined", true);
        trySetRecorderValue(recorder, "RecordingEnabled", true);
        const restarted = restartVoiceRecorder(recorder);
        if (isUnityObjectAlive(soundboardCustomVoiceRecorder)) {
            try {
                soundboardCustomVoiceRecorder.method("UpdateVoiceTransmission", 0).invoke();
            }
            catch (_) { }
        }
        let verified = sourceConfigured && clipConfigured;
        const sourceType = numericValue(getRecorderSourceType(recorder));
        if (Number.isFinite(sourceType))
            verified = verified && Math.round(sourceType) === 1;
        const assignedClip = getRecorderAudioClip(recorder);
        if (assignedClip !== undefined)
            verified = verified && sameObject(assignedClip, clip);
        const transmitEnabled = tryGetRecorderValue(recorder, "TransmitEnabled");
        const recordingEnabled = tryGetRecorderValue(recorder, "RecordingEnabled");
        if (transmitEnabled !== undefined)
            verified = verified && !!transmitEnabled;
        if (recordingEnabled !== undefined)
            verified = verified && !!recordingEnabled;
        soundboardTransmitCheckAt = unityNow() + 0.65;
        soundboardTransmitRetries = 0;
        console.log("[" + MENU_NAME + "] Soundboard mic route: source=" + sourceType +
            ", clip=" + (assignedClip === undefined || sameObject(assignedClip, clip)) +
            ", transmit=" + String(transmitEnabled) +
            ", recording=" + String(recordingEnabled) +
            ", restart=" + restarted + ".");
        return verified && restarted;
    }
    function decodeBase64Chunks(chunks) {
        try {
            const nativeAtob = globalThis.atob;
            if (typeof nativeAtob === "function") {
                const decoded = nativeAtob(chunks.join(""));
                const output = new Uint8Array(decoded.length);
                for (let index = 0; index < decoded.length; index++) {
                    output[index] = decoded.charCodeAt(index) & 0xff;
                }
                return output;
            }
            let encodedLength = 0;
            for (const chunk of chunks)
                encodedLength += chunk.length;
            if (encodedLength === 0)
                return null;
            let padding = 0;
            const last = chunks.length > 0 ? chunks[chunks.length - 1] : "";
            if (last.endsWith("=="))
                padding = 2;
            else if (last.endsWith("="))
                padding = 1;
            const output = new Uint8Array(Math.floor(encodedLength * 3 / 4) - padding);
            const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            let accumulator = 0;
            let bitCount = 0;
            let outputIndex = 0;
            for (const chunk of chunks) {
                for (let index = 0; index < chunk.length; index++) {
                    const character = chunk.charAt(index);
                    if (character === "=")
                        break;
                    const value = alphabet.indexOf(character);
                    if (value < 0)
                        continue;
                    accumulator = ((accumulator << 6) | value) >>> 0;
                    bitCount += 6;
                    if (bitCount >= 8) {
                        bitCount -= 8;
                        if (outputIndex < output.length) {
                            output[outputIndex++] = (accumulator >>> bitCount) & 0xff;
                        }
                    }
                }
            }
            return outputIndex === output.length ? output : output.slice(0, outputIndex);
        }
        catch (error) {
            console.error("[" + MENU_NAME + "] Soundboard base64 decode failed: " + error);
            return null;
        }
    }
    function readSoundboardBytes(sound) {
        try {
            const read = globalThis.__RASP_SOUNDBOARD_READ;
            if (typeof read === "function") {
                const raw = read(sound.fileName);
                if (raw instanceof Uint8Array)
                    return raw;
                if (raw)
                    return new Uint8Array(raw);
            }
        }
        catch (error) {
            console.error("[" + MENU_NAME + "] Soundboard file read failed: " + error);
        }
        return Array.isArray(sound.base64Chunks) && sound.base64Chunks.length
            ? decodeBase64Chunks(sound.base64Chunks)
            : null;
    }
    function readFourCc(view, offset) {
        return view.getUint32(offset, true);
    }
    function beginWavDecode(soundIndex, bytes) {
        if (bytes.length < 44)
            return false;
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        if (readFourCc(view, 0) !== 0x46464952 || readFourCc(view, 8) !== 0x45564157)
            return false;
        let offset = 12;
        let audioFormat = 0;
        let channels = 0;
        let sampleRate = 0;
        let bitsPerSample = 0;
        let dataOffset = 0;
        let dataSize = 0;
        while (offset + 8 <= bytes.length) {
            const chunkId = readFourCc(view, offset);
            const declaredSize = view.getUint32(offset + 4, true);
            const chunkOffset = offset + 8;
            const chunkSize = Math.min(declaredSize, Math.max(0, bytes.length - chunkOffset));
            if (chunkId === 0x20746d66 && chunkSize >= 16) {
                audioFormat = view.getUint16(chunkOffset, true);
                channels = view.getUint16(chunkOffset + 2, true);
                sampleRate = view.getUint32(chunkOffset + 4, true);
                bitsPerSample = view.getUint16(chunkOffset + 14, true);
                if (audioFormat === 65534 && chunkSize >= 40) {
                    audioFormat = view.getUint16(chunkOffset + 24, true);
                }
            }
            else if (chunkId === 0x61746164) {
                dataOffset = chunkOffset;
                dataSize = chunkSize;
            }
            offset = chunkOffset + chunkSize + (chunkSize & 1);
            if (declaredSize > chunkSize)
                break;
        }
        if ((audioFormat !== 1 && audioFormat !== 3) || channels <= 0 ||
            sampleRate <= 0 || dataOffset <= 0 || dataSize <= 0)
            return false;
        const bytesPerSample = Math.floor(bitsPerSample / 8);
        if (![1, 2, 3, 4].includes(bytesPerSample))
            return false;
        const totalSamples = Math.floor(dataSize / bytesPerSample);
        const frameCount = Math.floor(totalSamples / channels);
        if (frameCount <= 0)
            return false;
        const sound = soundboardSounds[soundIndex];
        const clip = AudioClip.method("Create", 5).invoke(Il2Cpp.string(sound ? sound.label : "rasp_sound"), frameCount, channels, sampleRate, false);
        if (!isLive(clip))
            return false;
        pendingWavDecode = {
            soundIndex,
            bytes,
            view,
            clip,
            audioFormat,
            channels,
            sampleRate,
            bitsPerSample,
            bytesPerSample,
            dataOffset,
            totalSamples: frameCount * channels,
            sampleIndex: 0,
            pcm: new Float32Array(frameCount * channels),
        };
        return true;
    }
    function playLocalSoundPreview(clip) {
        if (!isLive(clip))
            return false;
        // PlayClipAtPoint owns and cleans up its temporary AudioSource. Placing
        // it at the headset makes the preview audible without changing a game
        // source's volume, mute, pitch, mixer, or current clip.
        try {
            const cameraTransform = getCameraTransform(activeLocalPlayer);
            if (!isLive(cameraTransform))
                return false;
            const position = cameraTransform.method("get_position", 0).invoke();
            AudioSource.method("PlayClipAtPoint", 3)
                .overload("UnityEngine.AudioClip", "UnityEngine.Vector3", "System.Single")
                .invoke(clip, position, 1.0);
            console.log("[" + MENU_NAME + "] Soundboard local preview started.");
            return true;
        }
        catch (_) { }
        // Exact pinned-build fallback: this field is a live AudioSource on the
        // local PlayerController, and PlayOneShot preserves its normal clip.
        try {
            const source = activeLocalPlayer.field("swooshAudioSource").value;
            if (!isLive(source))
                return false;
            source.method("PlayOneShot", 2)
                .overload("UnityEngine.AudioClip", "System.Single")
                .invoke(clip, 1.0);
            console.log("[" + MENU_NAME + "] Soundboard local preview fallback started.");
            return true;
        }
        catch (error) {
            console.error("[" + MENU_NAME + "] Soundboard local preview failed: " + error);
            return false;
        }
    }
    function failSoundboard(message) {
        console.error("[" + MENU_NAME + "] Soundboard: " + message);
        stopSoundboardPlayback(false);
    }
    function voiceHandlerForRecorder(recorder) {
        if (!PlayerVoiceHandler || !isLive(recorder))
            return null;
        for (const handler of objectsOfClass(PlayerVoiceHandler)) {
            try {
                if (!componentIsActiveInScene(handler) ||
                    !sameObject(handler.field("bmvx").value, recorder))
                    continue;
                return handler;
            }
            catch (_) { }
        }
        return null;
    }
    function soundboardVoiceHandlerAllows(recorder) {
        const handler = voiceHandlerForRecorder(recorder);
        if (!isUnityObjectAlive(handler))
            return null;
        let handlerEnabled = true;
        try {
            handlerEnabled = !!handler.method("get_enabled", 0).invoke();
        }
        catch (_) { }
        try {
            if (handler.method("get_IsModerated", 0).invoke()) {
                console.error("[" + MENU_NAME + "] Soundboard mic route blocked by voice moderation.");
                return null;
            }
        }
        catch (_) { }
        let microphoneActive = false;
        try {
            microphoneActive = !!handler.method("get_IsMicrophoneActivate", 0).invoke();
        }
        catch (_) { }
        // IsMicrophoneActivate is false while PTT is released. It must not gate
        // soundboard setup, otherwise the recorder can never be armed.
        console.log("[" + MENU_NAME + "] Soundboard voice handler: enabled=" +
            handlerEnabled + ", microphoneActive=" + microphoneActive + ".");
        return handler;
    }
    function armSoundboardPushToTalk(handler) {
        if (!isUnityObjectAlive(handler))
            return;
        try {
            const pushToTalk = !!handler.method("get_IsPushToTalkEnabled", 0).invoke();
            const wasPressed = !!handler.field("bmwe").value;
            if (pushToTalk && !wasPressed) {
                handler.method("SetPushToTalkPressed", 1).invoke(true);
                soundboardPttState = { handler, wasPressed };
            }
        }
        catch (_) { }
    }
    function armSoundboardMixer(recorder) {
        if (!soundboardMixerHooksInstalled || !isLive(recorder))
            return false;
        let voice = null;
        try {
            voice = recorder.field("voice").value;
        }
        catch (_) { }
        if (!isLive(voice))
            voice = tryGetRecorderValue(recorder, "Voice");
        if (!isLive(voice))
            return false;
        let voiceType = "";
        try {
            voiceType = String(voice.class.fullName || voice.class.name);
        }
        catch (_) { }
        const compatibleHook = (/Short|Int16/.test(voiceType) && soundboardShortHookInstalled) ||
            (/Float|Single/.test(voiceType) && soundboardFloatHookInstalled);
        if (!compatibleHook)
            return false;
        const handler = voiceHandlerForRecorder(recorder);
        if (!isLive(handler))
            return false;
        try {
            if (!recorder.method("get_enabled", 0).invoke())
                return false;
        }
        catch (_) {
            return false;
        }
        try {
            if (!handler.method("get_IsMicrophoneActivate", 0).invoke())
                return false;
        }
        catch (_) { }
        try {
            if (handler.method("get_IsModerated", 0).invoke())
                return false;
        }
        catch (_) { }
        let rate = Number.NaN;
        let channels = Number.NaN;
        try {
            const info = voice.field("info").value;
            rate = numericValue(info.field("<SamplingRate>k__BackingField").value);
            channels = numericValue(info.field("<Channels>k__BackingField").value);
        }
        catch (_) { }
        if (!Number.isFinite(rate) || rate < 8000)
            rate = numericValue(tryGetRecorderValue(recorder, "SamplingRate"));
        soundboardVoiceRate = Number.isFinite(rate) && rate >= 8000 ? rate : 24000;
        soundboardVoiceChannels = Number.isFinite(channels) && channels >= 1 && channels <= 2
            ? Math.trunc(channels)
            : 1;
        soundboardOutgoingVoice = voice;
        soundboardRecorder = recorder;
        soundboardMicRouted = true;
        try {
            const pushToTalk = !!handler.method("get_IsPushToTalkEnabled", 0).invoke();
            const wasPressed = !!handler.field("bmwe").value;
            if (pushToTalk && !wasPressed) {
                handler.method("SetPushToTalkPressed", 1).invoke(true);
                soundboardPttState = { handler, wasPressed };
            }
        }
        catch (_) { }
        return true;
    }
    function sourcePcmSample(frame) {
        const pcm = soundboardPcm;
        if (!pcm)
            return 0;
        const totalFrames = Math.floor(pcm.length / soundboardPcmChannels);
        const clampedFrame = Math.max(0, Math.min(totalFrames - 1, frame));
        const base = clampedFrame * soundboardPcmChannels;
        let sample = 0;
        for (let channel = 0; channel < soundboardPcmChannels; channel++)
            sample += pcm[base + channel] || 0;
        return sample / soundboardPcmChannels;
    }
    function nextMixedPcmSample() {
        const pcm = soundboardPcm;
        if (!pcm)
            return null;
        const totalFrames = Math.floor(pcm.length / soundboardPcmChannels);
        if (soundboardPcmCursor >= totalFrames) {
            soundboardPcmFinished = true;
            return null;
        }
        const first = Math.floor(soundboardPcmCursor);
        const fraction = soundboardPcmCursor - first;
        const sample = sourcePcmSample(first) * (1 - fraction) + sourcePcmSample(first + 1) * fraction;
        soundboardPcmCursor += soundboardPcmRate / soundboardVoiceRate;
        return sample;
    }
    function mixSoundboardShort(buffer) {
        const length = Number(buffer?.length ?? 0);
        if (length <= 0)
            return;
        const destination = new Int16Array(ArrayBuffer.wrap(buffer.elements.handle, length * Int16Array.BYTES_PER_ELEMENT));
        for (let index = 0; index < length; index += soundboardVoiceChannels) {
            const sample = nextMixedPcmSample();
            if (sample === null)
                break;
            for (let channel = 0; channel < soundboardVoiceChannels && index + channel < length; channel++) {
                const mixed = Math.max(-1, Math.min(1, destination[index + channel] / 32768 + sample * 0.8));
                destination[index + channel] = Math.round(mixed * 32767);
            }
        }
    }
    function mixSoundboardFloat(buffer) {
        const length = Number(buffer?.length ?? 0);
        if (length <= 0)
            return;
        const destination = new Float32Array(ArrayBuffer.wrap(buffer.elements.handle, length * Float32Array.BYTES_PER_ELEMENT));
        for (let index = 0; index < length; index += soundboardVoiceChannels) {
            const sample = nextMixedPcmSample();
            if (sample === null)
                break;
            for (let channel = 0; channel < soundboardVoiceChannels && index + channel < length; channel++) {
                destination[index + channel] = Math.max(-1, Math.min(1, destination[index + channel] + sample * 0.8));
            }
        }
    }
    function restoreSoundboardPushToTalk() {
        const state = soundboardPttState;
        soundboardPttState = null;
        if (!state || !isUnityObjectAlive(state.handler))
            return;
        try {
            state.handler.method("SetPushToTalkPressed", 1).invoke(!!state.wasPressed);
        }
        catch (_) { }
    }
    function stopSoundboardPlayback(logStop = false) {
        // Restore the game-owned microphone source before destroying the clip
        // that Photon Voice may still reference.
        restoreRecorderState();
        if (pendingWavDecode && isLive(pendingWavDecode.clip))
            destroy(pendingWavDecode.clip);
        pendingWavDecode = null;
        restoreSoundboardPushToTalk();
        soundboardMicRouted = false;
        soundboardRecorder = null;
        soundboardOutgoingVoice = null;
        soundboardPcm = null;
        soundboardPcmCursor = 0;
        soundboardPcmFinished = false;
        if (isLive(currentSoundClip))
            destroy(currentSoundClip);
        currentSoundClip = null;
        soundboardEndTime = 0;
        soundboardTransmitCheckAt = 0;
        soundboardTransmitRetries = 0;
        activeSoundIndex = -1;
        const wasBusy = soundboardBusy;
        soundboardBusy = false;
        if (logStop && wasBusy)
            console.log("[" + MENU_NAME + "] Soundboard stopped.");
    }
    function playPreparedSound(soundIndex, clip, duration, pcm, sampleRate, channels) {
        currentSoundClip = clip;
        soundboardPcm = pcm;
        soundboardPcmCursor = 0.0;
        soundboardPcmRate = sampleRate;
        soundboardPcmChannels = Math.max(1, channels);
        soundboardPcmFinished = false;
        soundboardMixFault = false;
        soundboardMixFaultLogged = false;
        activeSoundIndex = soundIndex;
        soundboardBusy = true;
        soundboardEndTime = unityNow() + Math.max(0.25, duration) + 0.35;
        const localPlaying = playLocalSoundPreview(clip);
        let micPlaying = false;
        const recorder = findSoundboardRecorder();
        if (isLive(recorder)) {
            const handler = soundboardVoiceHandlerAllows(recorder);
            if (isUnityObjectAlive(handler))
                armSoundboardPushToTalk(handler);
            // Deadeye does not use PlayerVoiceHandler for its outgoing route.
            // Configure its CustomVoiceRecorder-owned Recorder even when no
            // optional PTT handler exists.
            if (startRecorderClip(recorder, clip)) {
                soundboardRecorder = recorder;
                soundboardMicRouted = true;
                micPlaying = true;
            }
            else {
                restoreRecorderState();
            }
        }
        if (!micPlaying && soundboardMixerHooksInstalled && isLive(recorder) &&
            armSoundboardMixer(recorder)) {
            micPlaying = true;
        }
        if (!micPlaying) {
            soundboardRecorder = null;
            soundboardOutgoingVoice = null;
            console.error("[" + MENU_NAME + "] Soundboard mic route is unavailable: " + (soundboardRouteError || "check the in-game mic and voice connection.") + (localPlaying ? " Local preview is still playing." : ""));
        }
        if (!localPlaying && !micPlaying) {
            failSoundboard(soundboardRouteError || "Could not start Photon Voice transmission. Check the in-game mic and voice connection.");
            return;
        }
        const sound = soundboardSounds[soundIndex];
        const routes = localPlaying && micPlaying ? "locally and through mic" : (micPlaying ? "through mic" : "locally only");
        console.log("[" + MENU_NAME + "] Playing " + routes + ": " + (sound?.fileName ?? "sound"));
    }
    function updatePendingWavDecode() {
        const pending = pendingWavDecode;
        if (!pending)
            return;
        try {
            const remaining = pending.totalSamples - pending.sampleIndex;
            if (remaining <= 0) {
                pendingWavDecode = null;
                playPreparedSound(pending.soundIndex, pending.clip, pending.totalSamples / (pending.sampleRate * pending.channels), pending.pcm, pending.sampleRate, pending.channels);
                return;
            }
            // Keep PCM conversion below one Quest frame budget. Writing the
            // managed float[] in one native copy avoids thousands of bridge
            // calls and the old multi-frame hitch.
            let sampleCount = Math.min(8192, remaining);
            if (remaining > sampleCount)
                sampleCount -= sampleCount % pending.channels;
            const samples = new Float32Array(sampleCount);
            for (let index = 0; index < sampleCount; index++) {
                const byteOffset = pending.dataOffset + (pending.sampleIndex + index) * pending.bytesPerSample;
                if (pending.bitsPerSample === 8) {
                    samples[index] = (pending.view.getUint8(byteOffset) - 128) / 128.0;
                }
                else if (pending.bitsPerSample === 16) {
                    samples[index] = pending.view.getInt16(byteOffset, true) / 32768.0;
                }
                else if (pending.bitsPerSample === 24) {
                    const value = pending.view.getUint8(byteOffset) |
                        (pending.view.getUint8(byteOffset + 1) << 8) |
                        (pending.view.getInt8(byteOffset + 2) << 16);
                    samples[index] = value / 8388608.0;
                }
                else if (pending.bitsPerSample === 32 && pending.audioFormat === 3) {
                    samples[index] = pending.view.getFloat32(byteOffset, true);
                }
                else if (pending.bitsPerSample === 32) {
                    samples[index] = pending.view.getInt32(byteOffset, true) / 2147483648.0;
                }
            }
            pending.pcm.set(samples, pending.sampleIndex);
            const sampleArray = Il2Cpp.array(SingleClass, sampleCount);
            sampleArray.elements.handle.writeByteArray(samples.buffer);
            const frameOffset = Math.floor(pending.sampleIndex / pending.channels);
            let wrote = false;
            try {
                wrote = !!pending.clip.method("SetData")
                    .overload("System.Single[]", "System.Int32")
                    .invoke(sampleArray, frameOffset);
            }
            catch (_) {
                wrote = !!pending.clip.method("SetData", 2)
                    .overload("System.Single[]", "System.Int32")
                    .invoke(sampleArray, frameOffset);
            }
            if (!wrote) {
                failSoundboard("Unity could not write the decoded WAV data.");
                return;
            }
            pending.sampleIndex += sampleCount;
        }
        catch (error) {
            failSoundboard("WAV decode failed: " + error);
        }
    }
    function maintainSoundboardRoute() {
        if (!soundboardBusy || !isLive(currentSoundClip))
            return;
        const now = unityNow();
        if (soundboardEndTime > 0 && now >= soundboardEndTime) {
            stopSoundboardPlayback(false);
            return;
        }
        if (soundboardRecorderState) {
            if (!soundboardMicRouted || !recorderIsUsable(soundboardRecorder)) {
                restoreRecorderState();
                restoreSoundboardPushToTalk();
                soundboardMicRouted = false;
                return;
            }
            if (now < soundboardTransmitCheckAt)
                return;
            let routeValid = true;
            const sourceType = numericValue(getRecorderSourceType(soundboardRecorder));
            if (Number.isFinite(sourceType) && Math.round(sourceType) !== 1)
                routeValid = false;
            const assignedClip = getRecorderAudioClip(soundboardRecorder);
            if (assignedClip !== undefined && !sameObject(assignedClip, currentSoundClip))
                routeValid = false;
            for (const name of ["TransmitEnabled", "RecordingEnabled"]) {
                const value = tryGetRecorderValue(soundboardRecorder, name);
                if (value !== undefined && !value)
                    routeValid = false;
            }
            let transmitting = undefined;
            try {
                transmitting = !!soundboardRecorder.method("get_IsCurrentlyTransmitting", 0).invoke();
            }
            catch (_) { }
            if (routeValid && transmitting !== false) {
                soundboardTransmitRetries = 0;
                soundboardTransmitCheckAt = now + 0.5;
                return;
            }
            if (soundboardTransmitRetries < 1) {
                soundboardTransmitRetries++;
                trySetRecorderValue(soundboardRecorder, "RecordingEnabled", false);
                try {
                    soundboardRecorder.method("StopRecording", 0).invoke();
                }
                catch (_) { }
                setRecorderSourceType(soundboardRecorder, 1);
                setRecorderAudioClip(soundboardRecorder, currentSoundClip);
                trySetRecorderValue(soundboardRecorder, "LoopAudioClip", false);
                trySetRecorderValue(soundboardRecorder, "VoiceDetection", false);
                trySetRecorderValue(soundboardRecorder, "TransmitEnabled", true);
                trySetRecorderValue(soundboardRecorder, "RecordWhenJoined", true);
                trySetRecorderValue(soundboardRecorder, "RecordingEnabled", true);
                restartVoiceRecorder(soundboardRecorder);
                soundboardTransmitCheckAt = now + 0.75;
                return;
            }
            restoreRecorderState();
            restoreSoundboardPushToTalk();
            soundboardMicRouted = false;
            soundboardRecorder = null;
            console.error("[" + MENU_NAME + "] Soundboard stopped because mic transmission failed.");
            return;
        }
        if (!soundboardMixerHooksInstalled)
            return;
        if (soundboardMixFault) {
            if (!soundboardMixFaultLogged) {
                soundboardMixFaultLogged = true;
                soundboardMicRouted = false;
                soundboardOutgoingVoice = null;
                restoreSoundboardPushToTalk();
                console.error("[" + MENU_NAME + "] Soundboard mic mixer stopped safely.");
            }
            return;
        }
        if (soundboardPcmFinished)
            return;
        if (!soundboardMicRouted || !recorderIsUsable(soundboardRecorder) || !isLive(soundboardOutgoingVoice)) {
            const recorder = findSoundboardRecorder();
            if (isLive(recorder) && armSoundboardMixer(recorder))
                return;
            soundboardMicRouted = false;
            soundboardOutgoingVoice = null;
        }
    }
    function playSoundboardSound(soundIndex) {
        const sound = soundboardSounds[soundIndex];
        if (!sound)
            return;
        stopSoundboardPlayback(false);
        soundboardRouteError = "";
        activeSoundIndex = soundIndex;
        soundboardBusy = true;
        const bytes = readSoundboardBytes(sound);
        if (!bytes || !beginWavDecode(soundIndex, bytes)) {
            failSoundboard("Could not load a valid WAV for " + sound.fileName + ".");
            return;
        }
        console.log("[" + MENU_NAME + "] Preparing sound: " + sound.fileName);
    }
    function updateSoundboard() {
        updatePendingWavDecode();
        maintainSoundboardRoute();
    }
    // ---- sound binds runner ----
    const STICK_PRESS = 0.7;
    const soundBindPrevDown = new Array(SOUND_BIND_INPUTS.length).fill(false);
    let soundBindPrevMods = null;
    let soundBindPrevHealth = Number.NaN;
    let soundBindLastTick = -1000.0;
    function soundBindInputDown(index) {
        switch (index) {
            case 0: return leftPrimary;
            case 1: return leftSecondary;
            case 2: return rightPrimary;
            case 3: return rightSecondary;
            case 4: return leftStickClick;
            case 5: return rightStickClick;
            case 6: return leftTrigger;
            case 7: return rightTrigger;
            case 8: return leftGrip;
            case 9: return rightGrip;
            case 10: return leftStickY > STICK_PRESS;
            case 11: return leftStickY < -STICK_PRESS;
            case 12: return leftStickX < -STICK_PRESS;
            case 13: return leftStickX > STICK_PRESS;
            case 14: return rightStickY > STICK_PRESS;
            case 15: return rightStickY < -STICK_PRESS;
            case 16: return rightStickX < -STICK_PRESS;
            case 17: return rightStickX > STICK_PRESS;
        }
        return false;
    }
    function runSoundBind(bind) {
        const index = soundBindSoundIndex(bind);
        if (index === -1) { stopSoundboardPlayback(true); return; }
        if (index === -3) return;
        if (index === -2) {
            if (soundboardSounds.length === 0) return;
            playSoundboardSound(Math.floor(Math.random() * soundboardSounds.length));
            return;
        }
        playSoundboardSound(index);
    }
    function fireEventBinds(eventIndex, modKey) {
        for (const bind of soundBinds) {
            if (bind.trig !== 1 || bind.event !== eventIndex)
                continue;
            if (eventIndex >= 4 && bind.modKey !== modKey)
                continue;
            runSoundBind(bind);
        }
    }
    function updateSoundBinds() {
        const now = unityNow();
        const down = SOUND_BIND_INPUTS.map((_, i) => soundBindInputDown(i));
        // listen mode: the next face button / stick / click press becomes the bind input (triggers stay free for the menu pointer)
        if (SB.listening) {
            if (Date.now() - SB.listenStart > 15000) {
                SB.listening = false;
                SB.msg = "Listen timed out.";
            }
            else {
                for (let i = 0; i < down.length; i++) {
                    if (i === 6 || i === 7 || i === 8 || i === 9)
                        continue;
                    if (down[i] && !soundBindPrevDown[i]) {
                        SB.trig.v = 0;
                        SB.input.v = i;
                        SB.mod.v = leftGrip ? 1 : rightGrip ? 2 : 0;
                        SB.listening = false;
                        SB.msg = "Captured: " + (SB.mod.v ? SOUND_BIND_MODIFIERS[SB.mod.v] + " + " : "") + SOUND_BIND_INPUTS[i];
                        break;
                    }
                }
            }
        }
        else if (!menuIsOpen() && soundBinds.length > 0) {
            for (let i = 0; i < down.length; i++) {
                if (!down[i] || soundBindPrevDown[i])
                    continue;
                const matches = soundBinds.filter(b => b.trig === 0 && b.input === i && b.input !== SOUND_BIND_MODIFIER_INPUT[b.mod] &&
                    (b.mod === 0 || down[SOUND_BIND_MODIFIER_INPUT[b.mod]]));
                // a modified bind wins over the plain one on the same button, so Grip + A does not also fire A
                const modified = matches.filter(b => b.mod > 0);
                for (const bind of (modified.length > 0 ? modified : matches))
                    runSoundBind(bind);
            }
        }
        for (let i = 0; i < down.length; i++)
            soundBindPrevDown[i] = down[i];
        if (soundBinds.length === 0)
            return;
        // game events
        if (now - soundBindLastTick > 3.0)
            fireEventBinds(3, "");
        soundBindLastTick = now;
        if (soundBindPrevMods === null)
            soundBindPrevMods = Object.assign({}, mods);
        for (const key of Object.keys(mods)) {
            if (!!mods[key] !== !!soundBindPrevMods[key])
                fireEventBinds(mods[key] ? 4 : 5, key);
            soundBindPrevMods[key] = mods[key];
        }
        if (frameNumber % 5 === 0) {
            let health = Number.NaN;
            try { if (isUnityObjectAlive(activeLocalPlayer)) health = readNetworkPlayerHealth(activeLocalPlayer); }
            catch (_) { }
            if (Number.isFinite(health)) {
                if (Number.isFinite(soundBindPrevHealth)) {
                    if (soundBindPrevHealth > 0 && health <= 0)
                        fireEventBinds(1, "");
                    else if (soundBindPrevHealth <= 0 && health > 0)
                        fireEventBinds(2, "");
                    else if (health > 0 && health < soundBindPrevHealth - 0.001)
                        fireEventBinds(0, "");
                }
                soundBindPrevHealth = health;
            }
        }
    }
    function managedStringContent(value) {
        if (value === null || value === undefined)
            return "";
        try {
            if (typeof value.content === "string")
                return value.content;
        }
        catch (_) { }
        let boxed = null;
        try {
            boxed = value.box();
        }
        catch (_) { }
        for (const candidate of [value, boxed]) {
            if (!candidate)
                continue;
            try {
                const result = candidate.method("ToString", 0).invoke();
                if (result && typeof result.content === "string")
                    return result.content;
            }
            catch (_) { }
        }
        return "";
    }

    function menuIsOpen() {
        try {
            return !!(globalThis.__imguiOpen && globalThis.__imguiOpen());
        }
        catch (_) {
            return false;
        }
    }
    // movement mods stand down while the menu is open (follows the menu's "Pause In Menu" switch when it has one)
    function movementPaused() {
        try {
            if (typeof globalThis.__imguiMovementPaused === "function")
                return !!globalThis.__imguiMovementPaused();
        }
        catch (_) { }
        return menuIsOpen();
    }
    function tick(player) {
        frameNumber++;
        updateInput(player);
        updateUnlockTransitionRestore(player);
        updateSoundboard();
        try { updateSoundBinds(); } catch (error) { console.error("[" + MENU_NAME + "] Sound binds: " + error); }
        if (pendingAmmoSweep) {
            sweepAmmo();
            pendingAmmoSweep = false;
        }
        else if (mods.infiniteAmmo && frameNumber % 120 === 0) {
            sweepAmmo();
        }
        if (pendingCooldownReset && frameNumber >= cooldownResetRetryFrame) {
            if (resetFireRateTimers())
                pendingCooldownReset = false;
            else
                cooldownResetRetryFrame = frameNumber + 60;
        }
        const scheduledUnlockRefresh = unlockRefreshFrames.length > 0 &&
            frameNumber >= unlockRefreshFrames[0];
        if (pendingUnlockRefresh || scheduledUnlockRefresh) {
            const verbose = pendingUnlockRefresh;
            pendingUnlockRefresh = false;
            while (unlockRefreshFrames.length > 0 && frameNumber >= unlockRefreshFrames[0]) {
                unlockRefreshFrames.shift();
            }
            refreshUnlockViews(verbose);
        }
        if ((pendingInvincibilityRefresh && frameNumber % 30 === 0) ||
            (mods.invincibility && frameNumber % 60 === 0)) {
            if (setGodMode(mods.invincibility))
                pendingInvincibilityRefresh = false;
        }
        updateInvisibility();
        if (mods.grenadeLauncher && !menuIsOpen() && rightTrigger) {
            launchGrenadeFromHand(player);
        }
        const movePaused = movementPaused();
        if (!mods.speedBoost || movePaused)
            restoreSpeedBoost();
        if (!mods.longArms || movePaused)
            restoreLongArms();
        if (!mods.joystickFly)
            restoreJoystickFly();
        if (!mods.spinBot)
            restoreRigSpin();
        if (!mods.extendHitboxes)
            restoreExtendHitboxes();
        if (!movePaused)
            applyLongArms(player);
        applyRigSpin(player);
        updateAimbot();
        applyExtendHitboxes(player);
        if (!movePaused)
            applySpeedBoost(player);
        applyJoystickFly(player);
        applyTriggerFly(player);
        updatePlatforms(player);
        updateVisuals(player);
    }
    function installHook(method, label, block) {
        try {
            // Cache the original NativeFunction before Interceptor.replace so
            // method.invokeRaw() inside the replacement reaches the trampoline.
            void method.nativeFunction;
            method.implementation = block;
            console.log("[" + MENU_NAME + "] Hooked " + label + ".");
            return true;
        }
        catch (error) {
            console.error("[" + MENU_NAME + "] Failed to hook " + label + ": " + error);
            return false;
        }
    }
    function installFusionRoomTransitionGuards() {
        if (!FusionNetworkRunner)
            return;
        const hookedAddresses = new Set();
        for (const method of FusionNetworkRunner.methods || []) {
            try {
                if ((method.name !== "StartGame" && method.name !== "Shutdown") ||
                    method.isStatic || method.isGeneric || method.isInflated ||
                    method.virtualAddress.isNull()) {
                    continue;
                }
                const address = String(method.virtualAddress);
                if (hookedAddresses.has(address))
                    continue;
                hookedAddresses.add(address);
                const transitionName = method.name === "StartGame"
                    ? "Fusion room startup"
                    : "Fusion room shutdown";
                // Observe entry without replacing the managed method. Fusion's
                // overloads can share one native body even when their managed
                // signatures differ; replacing that body with one overload's
                // NativeCallback corrupts the arguments and stalls Shutdown.
                Interceptor.attach(method.virtualAddress, {
                    onEnter() {
                        try {
                            prepareUnlockAllForRoomTransition(transitionName);
                            // Drop everything that points at scene objects before Fusion tears the room down.
                            restoreExtendHitboxes();
                            clearVisuals(true);
                            clearPlatforms();
                            restoreRigSpin();
                            restoreLongArms();
                            restoreSpeedBoost();
                            restoreJoystickFly();
                        }
                        catch (error) {
                            console.error("[" + MENU_NAME + "] " + transitionName +
                                " guard error: " + error);
                        }
                    },
                });
                console.log("[" + MENU_NAME + "] Watching Fusion.NetworkRunner." +
                    method.name + " for safe Unlock All transitions.");
            }
            catch (_) { }
        }
    }
    installFusionRoomTransitionGuards();
    function installLobbyWeaponGuard(klass, methodName) {
        if (!klass)
            return false;
        try {
            const method = klass.method(methodName, 0);
            if (method.returnType.name !== "System.Boolean" || method.virtualAddress.isNull())
                return false;
            return installHook(method, klass.fullName + "." + methodName + " lobby guard", function () {
                const allowed = !!method.invokeRaw(this);
                return mods.useGunsInLobby ? true : allowed;
            });
        }
        catch (_) {
            return false;
        }
    }
    function syncLobbyWeaponDamageGate() {
        try {
            const field = WeaponBase.field("canAnyWeaponShootOrDamage");
            if (mods.killInLobby) {
                if (lobbyWeaponDamageGateState === null)
                    lobbyWeaponDamageGateState = !!field.value;
                field.value = true;
            }
            else if (lobbyWeaponDamageGateState !== null) {
                field.value = lobbyWeaponDamageGateState;
                lobbyWeaponDamageGateState = null;
            }
        }
        catch (_) { }
    }
    function refreshClipboardLobbyAccess() {
        if (!ClipboardWeapon)
            return;
        for (const clipboard of objectsOfClass(ClipboardWeapon, true)) {
            if (!isUnityObjectAlive(clipboard))
                continue;
            for (const methodName of [
                "LoadActions", "GenerateButtons", "EnsureSelectPlayerAction",
                "RefreshActionPresentation", "RefreshActionButtonLabels", "RefreshButtonSelection",
            ]) {
                try {
                    clipboard.method(methodName, 0).invoke();
                }
                catch (_) { }
            }
        }
    }
    function installClipboardLobbyGuard(methodName) {
        if (!ClipboardWeapon)
            return false;
        try {
            const method = ClipboardWeapon.method(methodName, 0);
            if (method.returnType.name !== "System.Boolean" || method.virtualAddress.isNull())
                return false;
            return installHook(method, "ClipboardWeapon." + methodName + " lobby access", function () {
                const allowed = !!method.invokeRaw(this);
                return (mods.killInLobby || mods.unlockAll) ? true : allowed;
            });
        }
        catch (_) {
            return false;
        }
    }
    function installLobbyOverrides() {
        try {
            const isPlayerValid = ClipboardWeapon.method("IsPlayerValid", 1);
            if (isPlayerValid.returnType.name === "System.Boolean" && !isPlayerValid.virtualAddress.isNull()) {
                installHook(isPlayerValid, "ClipboardWeapon.IsPlayerValid lobby guard", function (player) {
                    const valid = !!isPlayerValid.invokeRaw(this, player);
                    return (mods.killInLobby || mods.unlockAll) ? true : valid;
                });
            }
        }
        catch (_) { }
        installClipboardLobbyGuard("CanUseClipboard");
        installClipboardLobbyGuard("EnforceDeveloperAccess");
        for (const methodName of [
            "CanShootWeapon", "IsShootingValid",
            "CanShoot", "CanUseWeapon", "get_CanShoot", "get_CanFire",
        ])
            installLobbyWeaponGuard(WeaponBase, methodName);
        for (const methodName of ["CanUseWeapons", "get_CanUseWeapons", "get_CanUseGuns"])
            installLobbyWeaponGuard(PlayerController, methodName);
        syncLobbyWeaponDamageGate();
        try {
            Script.bindWeak(globalThis, () => {
                mods.killInLobby = false;
                syncLobbyWeaponDamageGate();
            });
        }
        catch (_) { }
    }
    installLobbyOverrides();

    // FIX: Kill in Lobby - hook HealthManager / PlayerHealth TakeDamage so damage
    // actually lands in lobby even when the lobby's match-state gate blocks it at
    // the weapon layer. The weapon hooks (CanShootWeapon etc.) return true but the
    // health component has its own IsInMatch guard. We override it here.
    (function installLobbyHealthGuard() {
        const healthClassNames = [
            "HealthManager", "PlayerHealth", "DLARHealth",
            "DLAR_HealthManager", "DLAR_PlayerHealth",
            "Animals.HealthManager", "Animals.PlayerHealth",
        ];
        // Bool gatekeepers that block damage in lobby
        const healthBoolGuards = [
            "get_CanTakeDamage", "CanTakeDamage",
            "get_IsAlive", "IsAlive",
            "get_IsInMatch", "IsInMatch",
            "get_IsGameActive", "IsGameActive",
            "get_DamageEnabled", "DamageEnabled",
        ];
        // Void methods we want to allow through even out of match
        const healthVoidGuards = [
            "ApplyDamage", "TakeDamage", "DealDamage",
            "ReceiveDamage", "AddDamage", "OnDamageReceived",
        ];
        for (const className of healthClassNames) {
            const klass = resolveClass(className);
            if (!klass) continue;
            // Override all bool guards to return true when killInLobby is active
            for (const methodName of healthBoolGuards) {
                try {
                    let method = null;
                    try { method = klass.method(methodName, 0); } catch (_) {}
                    if (!method) continue;
                    if (method.returnType.name !== "System.Boolean" ||
                        method.virtualAddress.isNull()) continue;
                    installHook(method, className + "." + methodName + " lobby kill guard",
                        function () {
                            if (mods.killInLobby) return true;
                            return !!method.invokeRaw(this);
                        });
                }
                catch (_) {}
            }
            // For TakeDamage / ApplyDamage: hook to bypass any early-return
            // by temporarily patching the CanTakeDamage field if it exists
            for (const methodName of healthVoidGuards) {
                try {
                    let method = null;
                    try { method = klass.method(methodName, -1); } catch (_) {}
                    if (!method || method.virtualAddress.isNull()) continue;
                    if (method.returnType.name !== "System.Void") continue;
                    installHook(method, className + "." + methodName + " lobby kill passthrough",
                        function (...args) {
                            if (mods.killInLobby) {
                                // Temporarily enable damage flag fields if they exist
                                const flagNames = [
                                    "canTakeDamage", "_canTakeDamage", "damageEnabled",
                                    "isInMatch", "_isInMatch", "gameActive",
                                ];
                                const restored = [];
                                for (const f of flagNames) {
                                    try {
                                        const field = this.field(f);
                                        const orig = field.value;
                                        if (orig === false || orig === 0) {
                                            field.value = true;
                                            restored.push({ field, orig });
                                        }
                                    }
                                    catch (_) {}
                                }
                                try {
                                    method.invokeRaw(this, ...args);
                                }
                                finally {
                                    for (const { field, orig } of restored) {
                                        try { field.value = orig; }
                                        catch (_) {}
                                    }
                                }
                                return;
                            }
                            method.invokeRaw(this, ...args);
                        });
                    break; // only hook first matched overload per class
                }
                catch (_) {}
            }
            console.log("[" + MENU_NAME + "] Lobby health guard installed for " + className + ".");
        }
    })();

    function installSoundboardMixerHooks() {
        if (!PhotonVoiceCoreImage)
            return;
        try {
            const variants = [
                {
                    typeName: "System.Int16[]", label: "short",
                    concrete: "Photon.Voice.LocalVoiceAudioShort", mix: mixSoundboardShort,
                },
                {
                    typeName: "System.Single[]", label: "float",
                    concrete: "Photon.Voice.LocalVoiceAudioFloat", mix: mixSoundboardFloat,
                },
            ];
            let installed = 0;
            const resolved = [];
            for (const variant of variants) {
                try {
                    let push = null;
                    // Resolve the already-inflated concrete hierarchy. Avoid
                    // MakeGenericType on this stripped Unity 6 build.
                    let current = PhotonVoiceCoreImage.class(variant.concrete);
                    while (current && !push) {
                        try {
                            push = current.method("PushData", 1).overload(variant.typeName);
                        }
                        catch (_) { }
                        try {
                            current = current.parent;
                        }
                        catch (_) {
                            current = null;
                        }
                    }
                    if (!push)
                        continue;
                    if (push.returnType.name !== "System.Void" || push.parameterCount !== 1 ||
                        push.virtualAddress.isNull())
                        continue;
                    const address = String(push.virtualAddress);
                    resolved.push({ variant, push, address });
                }
                catch (_) { }
            }
            const addressCounts = new Map();
            for (const item of resolved) {
                addressCounts.set(item.address, (addressCounts.get(item.address) || 0) + 1);
            }
            for (const item of resolved) {
                if (addressCounts.get(item.address) !== 1)
                    continue;
                const { variant, push } = item;
                try {
                    const hooked = installHook(push, "Photon Voice " + variant.label + " outgoing mixer", function (buffer) {
                        if (soundboardBusy && soundboardPcm && !soundboardMixFault &&
                            sameObject(this, soundboardOutgoingVoice)) {
                            try {
                                variant.mix(buffer);
                            }
                            catch (_) {
                                soundboardMixFault = true;
                            }
                        }
                        push.invokeRaw(this, buffer);
                    });
                    if (hooked) {
                        installed++;
                        if (variant.label === "short")
                            soundboardShortHookInstalled = true;
                        else
                            soundboardFloatHookInstalled = true;
                    }
                }
                catch (_) { }
            }
            soundboardMixerHooksInstalled = installed > 0;
            if (!soundboardMixerHooksInstalled) {
                console.error("[" + MENU_NAME + "] Soundboard outgoing mixer hook is unavailable.");
            }
        }
        catch (_) {
            soundboardMixerHooksInstalled = false;
        }
    }
    if (ENABLE_EXPERIMENTAL_MIC_MIXER) {
        installSoundboardMixerHooks();
    }
    else {
        console.log("[" + MENU_NAME + "] Native soundboard mixer disabled; stable Photon Recorder mic routing is enabled.");
    }
    function installUnlockBooleanHook(klass, methodName, parameterTypes, unlockedValue, expectedStatic) {
        if (!klass) {
            console.error("[" + MENU_NAME + "] Unlock class missing for " + methodName + ".");
            return;
        }
        try {
            let method = klass.method(methodName, parameterTypes.length);
            if (parameterTypes.length > 0)
                method = method.overload(...parameterTypes);
            if (method.returnType.name !== "System.Boolean" ||
                method.parameterCount !== parameterTypes.length ||
                method.isStatic !== expectedStatic || method.isGeneric || method.isInflated ||
                method.virtualAddress.isNull()) {
                throw new Error("signature guard failed");
            }
            const label = klass.fullName + "." + methodName;
            installHook(method, label, function (...args) {
                if (mods.unlockAll)
                    return unlockedValue;
                return !!method.invokeRaw(this, ...args);
            });
        }
        catch (error) {
            console.error("[" + MENU_NAME + "] Skipped unlock hook " +
                klass.fullName + "." + methodName + ": " + error);
        }
    }
    function installAppearanceAvailabilityHook(methodName, itemType) {
        if (!WeaponSkins)
            return;
        try {
            const method = WeaponSkins.method(methodName, 3).overload(itemType, "System.Boolean&", "System.Boolean&");
            if (method.returnType.name !== "System.Void" || method.isStatic ||
                method.isGeneric || method.isInflated || method.virtualAddress.isNull()) {
                throw new Error("signature guard failed");
            }
            installHook(method, WeaponSkins.fullName + "." + methodName, function (item, storeUnlocked, contractUnlocked) {
                if (mods.unlockAll) {
                    // Preserve any bookkeeping performed by the game's
                    // availability query, then override only its outputs.
                    method.invokeRaw(this, item, storeUnlocked, contractUnlocked);
                    storeUnlocked.value = true;
                    contractUnlocked.value = true;
                    return;
                }
                method.invokeRaw(this, item, storeUnlocked, contractUnlocked);
            });
        }
        catch (error) {
            console.error("[" + MENU_NAME + "] Skipped appearance hook " + methodName + ": " + error);
        }
    }
    function installUnlockOnEnableRefresh(klass, methodNames, prepare) {
        if (!klass)
            return;
        try {
            const onEnable = klass.method("OnEnable", 0);
            if (onEnable.isStatic || onEnable.returnType.name !== "System.Void" ||
                onEnable.virtualAddress.isNull())
                return;
            installHook(onEnable, klass.fullName + ".OnEnable unlock refresh", function () {
                if (mods.unlockAll && prepare) {
                    try {
                        prepare(this);
                    }
                    catch (_) { }
                }
                onEnable.invokeRaw(this);
                if (!mods.unlockAll)
                    return;
                for (const methodName of methodNames) {
                    try {
                        this.method(methodName, 0).invoke();
                    }
                    catch (_) { }
                }
            });
        }
        catch (_) { }
    }
    // Runtime-only presentation and selection guards for the local locker.
    // The Fusion StartGame/Shutdown guards preserve these answers while a room
    // transition rebuilds inventory and loadout state.
    installUnlockBooleanHook(PlayfabItem, "IsItemUnlocked", [], true, false);
    installUnlockBooleanHook(PlayerCosmeticsLockerPanel, "IsItemOwned", ["System.String"], true, false);
    installUnlockBooleanHook(UITouchCosmeticSelection, "get_IsOwned", [], true, false);
    installUnlockBooleanHook(UITouchWeaponSelection, "IsCurrentInventoryWeaponLicensed", [], true, false);
    installUnlockBooleanHook(MannequinLockerManager, "CheckIfCanSetNewEquippedItem", ["System.Int32", "System.Int32"], true, false);
    installUnlockBooleanHook(PlayFabManagerClient, "get_ItemTestingOverrideEnabled", [], true, false);
    installUnlockBooleanHook(PlayFabManagerClient, "IsItemTestingExcluded", ["System.String"], false, false);
    installUnlockBooleanHook(PlayFabManagerClient, "IsCatalogItemAvailable", ["DLCatalogItem", "System.DateTime"], true, true);
    installUnlockBooleanHook(PlayFabManagerClient, "IsDLItemInCachedInventory", ["DLCatalogItem", "System.String"], true, false);
    installUnlockBooleanHook(PlayFabManagerClient, "IsDLItemInCachedInventoryForStackOrGlobal", ["DLCatalogItem", "System.String"], true, false);
    installUnlockBooleanHook(PlayFabManagerClient, "IsCatalogItemInInventory", ["System.String", "System.String"], true, false);
    installUnlockBooleanHook(PlayFabManagerClient, "IsCatalogItemInInventoryForStackOrGlobal", ["System.String", "System.String"], true, false);
    installUnlockBooleanHook(PlayFabManagerClient, "IsBundleItemInInventory", ["DLCatalogItem"], true, false);
    // This build gates staff tools through one static inventory check (the old CanUse is gone).
    installUnlockBooleanHook(StaffToolAccess, "IsCatalogItemInInventory", ["System.String"], true, true);
    installUnlockBooleanHook(UITouchWeaponSelection, "ShouldLockWeapon", ["DLAR_WeaponBase"], false, true);
    installUnlockBooleanHook(WeaponsManager, "IsLocalAccountOwnedWeapon", ["System.String"], true, true);
    installUnlockBooleanHook(WeaponsManager, "IsLocalAccountLicensedInventoryWeapon", ["DLAR_WeaponBase", "InventoryItemDefinition"], true, true);
    installUnlockBooleanHook(WeaponsManager, "get_ShouldRestrictCurrentLoadoutByActiveInventory", [], false, true);
    // UIPanelLoadout.CanShowPrivilegedWeapon is gone in this build (checked against the dump), so it is not hooked anymore.
    installUnlockBooleanHook(UIPanelWeaponSkins, "get_HideUnavailableAppearanceItems", [], false, false);
    installUnlockBooleanHook(UIPanelWeaponSkins, "ShouldShowSkinInScroller", ["WeaponSkin"], true, false);
    installUnlockBooleanHook(UIPanelWeaponSkins, "ShouldShowWrapInScroller", ["WeaponSkin", "WeaponWrapScriptable"], true, false);
    installUnlockBooleanHook(UIPanelWeaponSkins, "IsSkinUnlockedForUI", ["WeaponSkin"], true, false);
    installUnlockBooleanHook(UIPanelWeaponSkins, "IsWrapUnlockedForUI", ["WeaponWrapScriptable"], true, false);
    installUnlockBooleanHook(UIPanelWeaponSkins, "IsWrapAppearanceUnlockedForUI", ["WeaponSkin", "WeaponWrapScriptable"], true, false);
    installUnlockBooleanHook(UIPanelWeaponSkins, "IsCharmUnlockedForUI", ["Weapons.Charms.WeaponCharm"], true, false);
    installUnlockBooleanHook(WeaponSkins, "IsStoreUnlockedContract", ["SkinContractScriptable"], true, true);
    installAppearanceAvailabilityHook("IsSkinAvailable", "WeaponSkin");
    installAppearanceAvailabilityHook("IsWrapAvailable", "WeaponWrapScriptable");
    installUnlockBooleanHook(UITechNode, "IsLockedInBackend", [], false, false);
    installUnlockBooleanHook(UITechNode, "IsAllParentsUnlocked", [], true, false);
    installUnlockBooleanHook(TechNodeWeaponWrap, "IsContractUnlocked", [], true, false);
    installUnlockOnEnableRefresh(UITouchWeaponSelection, ["ResetLockStatus"]);
    // Ownership is supplied by get_IsOwned; do not invoke the row's Unlock
    // interaction callback while its panel is being constructed.
    installUnlockOnEnableRefresh(UITouchCosmeticSelection, []);
    installUnlockOnEnableRefresh(UIPanelWeaponSkins, ["RefreshHiddenAppearanceRows", "RefreshUnlocks", "RefreshCharmUnlocks"], setSkinPanelShowLocked);
    installUnlockOnEnableRefresh(PlayerCosmeticsLockerPanel, ["RefreshActiveSlots"], setUnlockCatalogTesting);
    installUnlockOnEnableRefresh(UIPanelLoadout, [], panel => {
        expandUnlockWeaponCatalog();
        setLoadoutShowAll(panel);
    });
    installUnlockOnEnableRefresh(TechNodeWeaponWrap, ["RefreshSecondaryLock"]);
    if (UIPanelLoadout) {
        try {
            const loadWeapons = UIPanelLoadout.method("LoadWeapons", 0);
            installHook(loadWeapons, "UIPanelLoadout.LoadWeapons unlock filter", function () {
                if (mods.unlockAll) {
                    expandUnlockWeaponCatalog();
                    setLoadoutShowAll(this);
                }
                loadWeapons.invokeRaw(this);
            });
        }
        catch (_) { }
    }
    if (WeaponsManager) {
        try {
            const legitimate = WeaponsManager.method("IsLoadoutWeaponLegitimate", 1)
                .overload("DLAR_WeaponBase");
            if (legitimate.returnType.name === "System.Boolean" &&
                !legitimate.virtualAddress.isNull()) {
                installHook(legitimate, "WeaponsManager.IsLoadoutWeaponLegitimate local unlock", function (weapon) {
                    const accepted = !!legitimate.invokeRaw(this, weapon);
                    if (accepted || !mods.unlockAll || !isUnityObjectAlive(weapon))
                        return accepted;
                    let localManager = legitimate.isStatic;
                    if (!localManager) {
                        try {
                            const instance = WeaponsManager.method("get_Instance", 0).invoke();
                            localManager = sameObject(this, instance);
                        }
                        catch (_) {
                            localManager = componentIsActiveInScene(this);
                        }
                    }
                    if (!localManager)
                        return false;
                    // Privileged tools (Clipboard_Dev, Clipboard_Mod and
                    // Megaphone) intentionally do not use the same settings
                    // object as ordinary guns. Requiring weaponSettings here
                    // made them visible but impossible to place in a slot.
                    return WeaponBase.isAssignableFrom(weapon.class);
                });
            }
        }
        catch (error) {
            console.error("[" + MENU_NAME + "] Loadout validator hook unavailable: " + error);
        }
    }
    const baseShoot = WeaponBase.method("Shoot", 1);
    installHook(baseShoot, "DLAR_WeaponBase.Shoot", function (spawnNetworkFX) {
        const settings = weaponSettings(this);
        const local = isLocalWeapon(this);
        const gun = local && isGun(this);
        let restoreRate = false;
        let oldRate = 0.0;
        let fired = false;
        if (mods.infiniteAmmo && local)
            topUpWeapon(this);
        if (settings && gun && (mods.noCooldown || mods.rapidFire)) {
            try {
                oldRate = Number(settings.field("FireRateSeconds").value);
                settings.field("FireRateSeconds").value = mods.noCooldown
                    ? 0.0
                    : Math.min(oldRate, RAPID_FIRE_INTERVAL);
                restoreRate = true;
            }
            catch (_) { }
        }
        try {
            if (mods.aimbot && local && gun)
                applyAimbotToWeapon(this);
            fired = !!baseShoot.invokeRaw(this, spawnNetworkFX);
            return fired;
        }
        finally {
            if (restoreRate && settings) {
                try {
                    settings.field("FireRateSeconds").value = oldRate;
                }
                catch (_) { }
            }
            if (mods.infiniteAmmo && local)
                topUpWeapon(this);
        }
    });
    const triggerStateUpdate = WeaponBase.method("UpdateOnTriggerstate", 0);
    installHook(triggerStateUpdate, "DLAR_WeaponBase.UpdateOnTriggerstate", function () {
        const settings = weaponSettings(this);
        let restoreAutomatic = false;
        let oldAutomatic = false;
        if (mods.rapidFire && settings && isLocalWeapon(this) && isGun(this)) {
            try {
                oldAutomatic = !!settings.field("isAutomatic").value;
                settings.field("isAutomatic").value = true;
                restoreAutomatic = true;
            }
            catch (_) { }
        }
        try {
            triggerStateUpdate.invokeRaw(this);
        }
        catch (_) { /* the original threw inside the game ("abort was called"); nothing to do, just don't let it escape the hook */ }
        finally {
            if (restoreAutomatic && settings) {
                try {
                    settings.field("isAutomatic").value = oldAutomatic;
                }
                catch (_) { }
            }
        }
    });
    // ---------------------------------------------------------------- rig mods
    // Changes the pose other players see (your own view is not touched). Every tick the game copies your real
    // root / head / body / hands into NetworkRig.cachedLocalPose (CacheLocalRigPose) and replicates that, so we let it
    // fill the struct and then change the numbers. Layout from the il2cpp dump: PoseData = Vector3 + Quaternion
    // (28 bytes), LocalRigPose = root, head, body, leftHand, rightHand, starting at NetworkRig + 0x8c.
    const RIG_POSE_BASE = 0x8c;
    const RIG_POSE_PARTS = { root: 0x00, head: 0x1c, body: 0x38, leftHand: 0x54, rightHand: 0x70 };
    let rigFrozen = null, rigLagFrozenUntil = 0, rigLagNextFreezeAt = 0, rigPoseWarned = false, rigPoseLogged = false;
    function rigModsActive() {
        return !!(mods.spinHead || mods.flipHead || mods.drunkHead || mods.tPose || mods.ghost || mods.fakeLag || mods.hideRig);
    }
    function resetRigMods() {
        rigFrozen = null;
        rigLagFrozenUntil = 0;
        rigLagNextFreezeAt = 0;
    }
    function rigGhostHeld() {
        switch (rigGhostButton) {
            case 0: return !!leftGrip;
            case 1: return !!leftTrigger;
            case 2: return !!leftSecondary;
            case 3: return !!rightPrimary;
            case 4: return !!rightSecondary;
            default: return false;
        }
    }
    function rigQuatMul(a, b) {
        return [
            a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
            a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
            a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
            a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
        ];
    }
    function rigQuatAxis(axis, degrees) {
        const half = degrees * Math.PI / 360, sine = Math.sin(half);
        return [axis[0] * sine, axis[1] * sine, axis[2] * sine, Math.cos(half)];
    }
    function rigQuatRotate(q, v) {
        const x = q[0], y = q[1], z = q[2], w = q[3];
        const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
        return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
    }
    function rigReadPose(rig, name) {
        const a = rig.handle.add(RIG_POSE_BASE + RIG_POSE_PARTS[name]);
        return {
            p: [a.readFloat(), a.add(4).readFloat(), a.add(8).readFloat()],
            q: [a.add(12).readFloat(), a.add(16).readFloat(), a.add(20).readFloat(), a.add(24).readFloat()],
        };
    }
    function rigWritePose(rig, name, pose) {
        const a = rig.handle.add(RIG_POSE_BASE + RIG_POSE_PARTS[name]);
        for (let i = 0; i < 3; i++) a.add(i * 4).writeFloat(pose.p[i]);
        for (let i = 0; i < 4; i++) a.add(12 + i * 4).writeFloat(pose.q[i]);
    }
    // Only touch the struct when it reads back as five sane poses (finite numbers, unit quaternions). If the layout
    // is different in some build this refuses to write instead of corrupting the rig.
    function rigPoseSane(pose) {
        for (const name of Object.keys(pose)) {
            const e = pose[name];
            for (const n of e.p) if (!Number.isFinite(n) || Math.abs(n) > 100000) return false;
            let norm = 0;
            for (const n of e.q) { if (!Number.isFinite(n)) return false; norm += n * n; }
            if (norm < 0.9 || norm > 1.1) return false;
        }
        return true;
    }
    function rigLagFreezing(t) {
        if (!mods.fakeLag) {
            rigLagFrozenUntil = 0;
            return false;
        }
        if (t < rigLagFrozenUntil) return true;
        if (t >= rigLagNextFreezeAt) {
            rigLagFrozenUntil = t + 0.15 + Math.random() * 0.3;
            rigLagNextFreezeAt = rigLagFrozenUntil + 0.15 + Math.random() * 0.25;
            return true;
        }
        return false;
    }
    function applyRigPoseMods(rig) {
        const t = unityNow();
        const pose = {};
        for (const name of Object.keys(RIG_POSE_PARTS)) pose[name] = rigReadPose(rig, name);
        if (!rigPoseSane(pose)) {
            if (!rigPoseWarned) {
                rigPoseWarned = true;
                console.warn("[" + MENU_NAME + "] Rig mods are off: NetworkRig.cachedLocalPose does not look like five poses in this build. head=" +
                    JSON.stringify(pose.head));
            }
            return;
        }
        // ghost / fake lag: send the pose from the moment the freeze started instead of the live one
        const freeze = (mods.ghost && rigGhostHeld()) || rigLagFreezing(t);
        if (freeze) {
            if (!rigFrozen) {
                rigFrozen = {};
                for (const name of Object.keys(pose)) rigFrozen[name] = { p: pose[name].p.slice(), q: pose[name].q.slice() };
            }
            for (const name of Object.keys(pose)) pose[name] = { p: rigFrozen[name].p.slice(), q: rigFrozen[name].q.slice() };
        } else {
            rigFrozen = null;
        }
        if (mods.spinHead)
            pose.head.q = rigQuatMul(pose.head.q, rigQuatAxis([0, 1, 0], (t * 180 * rigHeadSpinSpeed) % 360));
        if (mods.flipHead)
            pose.head.q = rigQuatMul(pose.head.q, rigQuatAxis([0, 0, 1], 180));
        if (mods.drunkHead)
            pose.head.q = rigQuatMul(pose.head.q, rigQuatAxis([0, 0, 1], 25 * Math.sin(t * 7.5)));
        if (mods.tPose) {
            const r = rigQuatRotate(pose.body.q, [1, 0, 0]);
            const flat = Math.hypot(r[0], r[2]) || 1;
            const rx = r[0] / flat, rz = r[2] / flat, b = pose.body.p;
            pose.leftHand = { p: [b[0] - rx * 0.75, b[1] + 0.1, b[2] - rz * 0.75], q: pose.body.q.slice() };
            pose.rightHand = { p: [b[0] + rx * 0.75, b[1] + 0.1, b[2] + rz * 0.75], q: pose.body.q.slice() };
        }
        if (mods.hideRig) {
            for (const name of Object.keys(pose)) pose[name].p[1] += rigHideDistance;
        }
        for (const name of Object.keys(pose)) rigWritePose(rig, name, pose[name]);
        if (!rigPoseLogged) {
            rigPoseLogged = true;
            console.log("[" + MENU_NAME + "] Rig mods running (head " + pose.head.p.map((n) => n.toFixed(2)).join(", ") + ").");
        }
    }
    function installRigPoseHook() {
        if (!NetworkRig) {
            console.warn("[" + MENU_NAME + "] Rig mods unavailable: NetworkRig class not found.");
            return false;
        }
        const method = NetworkRig.method("CacheLocalRigPose", 0);
        return installHook(method, "NetworkRig.CacheLocalRigPose (rig mods)", function () {
            const result = method.invokeRaw(this);
            try {
                if (rigModsActive() && this.method("get_IsLocalPlayer", 0).invoke())
                    applyRigPoseMods(this);
                else if (rigFrozen)
                    resetRigMods();
            }
            catch (error) {
                if (!rigPoseWarned) {
                    rigPoseWarned = true;
                    console.warn("[" + MENU_NAME + "] Rig mods error: " + error);
                }
            }
            return result;
        });
    }
    try { installRigPoseHook(); }
    catch (error) { console.error("[" + MENU_NAME + "] Rig mods hook failed: " + error); }
    // ---------------------------------------------------------------- soundboard: microphone availability gate
    // Newer builds added a MicrophoneAvailability check (and CustomVoiceRecorder.ApplyMicrophoneAvailability) that turns
    // voice off when the Quest has not granted the mic permission. The soundboard feeds an AudioClip into the Photon
    // Recorder, so it never needs a real microphone: while sounds are loaded, report the mic as available and keep the
    // game's cached state in sync.
    const MicrophoneAvailability = optionalGameClass("MicrophoneAvailability");
    let micGateLogged = false;
    function soundboardWantsMic() {
        return soundboardSounds.length > 0;
    }
    function forceMicAvailable() {
        if (!MicrophoneAvailability)
            return;
        for (const [name, value] of [["_checked", true], ["_isAvailable", true], ["_isDenied", false]]) {
            try { MicrophoneAvailability.field(name).value = value; }
            catch (_) { }
        }
    }
    function prepareMicForSoundboard() {
        if (!MicrophoneAvailability)
            return;
        forceMicAvailable();
        const custom = soundboardCustomVoiceRecorder;
        try {
            if (isUnityObjectAlive(custom))
                custom.method("ApplyMicrophoneAvailability", 0).invoke();
        }
        catch (_) { }
        const read = (get) => { try { return String(get()); } catch (_) { return "?"; } };
        console.log("[" + MENU_NAME + "] Soundboard mic gate: available=" +
            read(() => MicrophoneAvailability.method("get_IsAvailable", 0).invoke()) +
            ", denied=" + read(() => MicrophoneAvailability.field("_isDenied").value) +
            ", transmitAllowed=" + read(() => custom.field("_isMicTransmitAllowed").value) +
            ", micEnabled=" + read(() => custom.method("IsLocalUserMicEnabled", 0).invoke()) + ".");
    }
    function installMicAvailabilityOverride() {
        if (!MicrophoneAvailability)
            return false;   // older builds have no such class
        let any = false;
        try {
            const getter = MicrophoneAvailability.method("get_IsAvailable", 0);
            any = installHook(getter, "MicrophoneAvailability.get_IsAvailable (soundboard)", function () {
                const real = !!getter.invokeRaw(this);
                if (!real && soundboardWantsMic() && !micGateLogged) {
                    micGateLogged = true;
                    console.log("[" + MENU_NAME + "] The game reports the microphone as unavailable; overriding that for the soundboard.");
                }
                return real || soundboardWantsMic();
            }) || any;
        }
        catch (error) { console.warn("[" + MENU_NAME + "] MicrophoneAvailability.get_IsAvailable not hooked: " + error); }
        try {
            const report = MicrophoneAvailability.method("ReportIfUnavailable", 0);
            any = installHook(report, "MicrophoneAvailability.ReportIfUnavailable (soundboard)", function () {
                if (!soundboardWantsMic())
                    report.invokeRaw(this);
            }) || any;
        }
        catch (error) { console.warn("[" + MENU_NAME + "] MicrophoneAvailability.ReportIfUnavailable not hooked: " + error); }
        if (any)
            forceMicAvailable();
        return any;
    }
    try { installMicAvailabilityOverride(); }
    catch (error) { console.error("[" + MENU_NAME + "] Mic availability override failed: " + error); }
    const baseConsumeAmmo = WeaponBase.method("ConsumeAmmo", 1);
    installHook(baseConsumeAmmo, "DLAR_WeaponBase.ConsumeAmmo", function (amount) {
        if (mods.infiniteAmmo && isLocalWeapon(this))
            return;
        baseConsumeAmmo.invokeRaw(this, amount);
    });
    const baseHasAmmo = WeaponBase.method("HasAmmo", 0);
    installHook(baseHasAmmo, "DLAR_WeaponBase.HasAmmo", function () {
        if (mods.infiniteAmmo && isLocalWeapon(this))
            return true;
        return !!baseHasAmmo.invokeRaw(this);
    });
    const storageConsumeAmmo = AmmoStorage.method("ConsumeAmmo", 1);
    installHook(storageConsumeAmmo, "Weapons.WeaponAmmoStorage.ConsumeAmmo", function (bulletsNeeded) {
        if (mods.infiniteAmmo && isLocalAmmoStorage(this))
            return Math.max(0, Math.trunc(Number(bulletsNeeded)));
        return Number(storageConsumeAmmo.invokeRaw(this, bulletsNeeded));
    });
    const storageHasAmmo = AmmoStorage.method("HasAmmo", 0);
    installHook(storageHasAmmo, "Weapons.WeaponAmmoStorage.HasAmmo", function () {
        if (mods.infiniteAmmo && isLocalAmmoStorage(this))
            return true;
        return !!storageHasAmmo.invokeRaw(this);
    });
    const weaponRecoil = RecoilController.method("WeaponRecoil", 0);
    installHook(weaponRecoil, "DLAR_XRHandRecoilController.WeaponRecoil", function () {
        let localWeapon = false;
        try {
            localWeapon = isLocalWeapon(this.field("currentWeapon").value);
        }
        catch (_) { }
        if (mods.noRecoil && localWeapon)
            return;
        weaponRecoil.invokeRaw(this);
    });
    const bulletOffset = HitscanWeapon.method("GetBulletOffsetDirection", 2);
    installHook(bulletOffset, "HitscanWeapon.GetBulletOffsetDirection", function (forward, recoilPercent) {
        const local = isLocalWeapon(this);
        if (mods.aimbot && local) {
            const solution = aimbotDirectionForWeapon(this);
            if (solution) {
                applyAimbotToWeapon(this);
                forward = solution.direction;
            }
        }
        if (mods.noRecoil && local)
            return bulletOffset.invokeRaw(this, forward, 0.0);
        return bulletOffset.invokeRaw(this, forward, recoilPercent);
    });
    if (projectileLaunchMethod) {
        installHook(projectileLaunchMethod, "ProjectileWeapon.LaunchProjectile", function (...args) {
            if (mods.aimbot && isLocalWeapon(this)) {
                const solution = aimbotDirectionForWeapon(this);
                if (solution) {
                    applyAimbotToWeapon(this);
                    args[0] = solution.direction;
                }
            }
            return projectileLaunchMethod.invokeRaw(this, ...args);
        });
    }
    else {
        console.warn("[" + MENU_NAME + "] Skipped projectile aimbot hook: LaunchProjectile is unavailable.");
    }
    const playerLateUpdate = PlayerController.method("LateUpdate", 0);
    installHook(playerLateUpdate, "PlayerController.LateUpdate", function () {
        playerLateUpdate.invokeRaw(this);
        if (!shouldTickPlayerController(this))
            return;
        if (tickInProgress)
            return;
        tickInProgress = true;
        try {
            tick(this);
            lastTickError = "";
            tickErrorCount = 0;
        }
        catch (error) {
            tickErrorCount++;
            const message = String(error?.stack || error);
            if (message !== lastTickError || tickErrorCount % 300 === 0) {
                console.error("[" + MENU_NAME + "] Tick error: " + message);
                lastTickError = message;
            }
        }
        finally {
            tickInProgress = false;
        }
    });
    // ---- bridge used by the imgui menu below -------------------------------
    AR = {
        setToggle,
        dumpThrowables,
        playSound: playSoundboardSound,
        stopSound: () => stopSoundboardPlayback(true),
        setGrenadeVariant(index) {
            selectedGrenadeVariant = Math.max(0, Math.min(GRENADE_VARIANTS.length - 1, index | 0));
            cachedGrenadePrefab = null;
            cachedGrenadePrefabVariant = -1;
            grenadePrefabRetryAt = -1000.0;
        },
        hasLocalPlayer: () => isUnityObjectAlive(activeLocalPlayer),
    };
    // Aim beam for the spawn gun / teleport gun in the bundled modules below. Same LineRenderer + through-wall material
    // the hitbox boxes use: a beam from your hand, and a small circle where it lands.
    const aimBeam = { root: null, line: null, ring: null, colorKey: "" };
    function aimBeamEnsure() {
        if (isUnityObjectAlive(aimBeam.root) && isUnityObjectAlive(aimBeam.line) && isUnityObjectAlive(aimBeam.ring))
            return true;
        try {
            if (isUnityObjectAlive(aimBeam.root))
                destroy(aimBeam.root);
            aimBeam.root = createEmpty("AnimalRivalsAimBeam");
            const make = (name, width, points) => {
                const object = createEmpty(name);
                getTransform(object).method("SetParent", 2).invoke(getTransform(aimBeam.root), false);
                const line = addComponent(object, LineRenderer);
                if (!isUnityObjectAlive(line))
                    throw new Error("LineRenderer unavailable");
                line.method("set_useWorldSpace", 1).invoke(true);
                line.method("set_positionCount", 1).invoke(points);
                line.method("set_startWidth", 1).invoke(width);
                line.method("set_endWidth", 1).invoke(width);
                return line;
            };
            aimBeam.line = make("AimBeamLine", 0.006, 2);
            aimBeam.ring = make("AimBeamRing", 0.01, 15);
            aimBeam.colorKey = "";
            return true;
        }
        catch (_) {
            if (isUnityObjectAlive(aimBeam.root))
                destroy(aimBeam.root);
            aimBeam.root = aimBeam.line = aimBeam.ring = null;
            return false;
        }
    }
    function aimBeamColor(color) {
        const key = color.join(",");
        if (aimBeam.colorKey === key)
            return;
        aimBeam.colorKey = key;
        const material = getVisualMaterial(color);
        for (const line of [aimBeam.line, aimBeam.ring]) {
            try {
                line.method("set_startColor", 1).invoke(color);
                line.method("set_endColor", 1).invoke(color);
            }
            catch (_) { }
            if (isUnityObjectAlive(material)) {
                try { line.method("set_sharedMaterial", 1).invoke(material); }
                catch (_) { }
            }
        }
    }
    globalThis.__pluginBeam = {
        // from / to are [x,y,z]; ringAt is [x,y,z] or null (no circle when nothing was hit)
        show(from, to, color, ringAt) {
            if (!aimBeamEnsure())
                return false;
            aimBeamColor(color);
            try {
                aimBeam.root.method("SetActive", 1).invoke(true);
                aimBeam.line.method("SetPosition", 2).invoke(0, from);
                aimBeam.line.method("SetPosition", 2).invoke(1, to);
                if (ringAt) {
                    aimBeam.ring.method("set_enabled", 1).invoke(true);
                    const points = localCirclePoints(ringAt, [1, 0, 0], [0, 0, 1], 0.12, 14);
                    for (let i = 0; i < points.length; i++)
                        aimBeam.ring.method("SetPosition", 2).invoke(i, points[i]);
                }
                else {
                    aimBeam.ring.method("set_enabled", 1).invoke(false);
                }
                return true;
            }
            catch (_) {
                return false;
            }
        },
        hide() {
            try {
                if (isUnityObjectAlive(aimBeam.root))
                    aimBeam.root.method("SetActive", 1).invoke(false);
            }
            catch (_) { }
        },
    };
    // Lets the imgui rig use the game's own hand anchors for the pointer.
    globalThis.__pluginHands = () => {
        try {
            if (!isUnityObjectAlive(activeLocalPlayer))
                return null;
            const left = getLeftHandTransform(activeLocalPlayer);
            const right = getRightHandTransform(activeLocalPlayer);
            return isUnityObjectAlive(left) && isUnityObjectAlive(right) ? [left, right] : null;
        }
        catch (_) {
            return null;
        }
    };
    console.log("[" + MENU_NAME + "] Ready (runtime-validated build). Menu opens with the imgui hotkey.");
});


// ============================================================================
// Plugins-tab UI (was the old standalone menu's tabs)
// ============================================================================
const TG = {};
const G = { grenade: ref(0), spin: ref(1), aimMode: ref(0), aimDrop: ref(30), sound: ref(0), headSpin: ref(4), ghostBtn: ref(2), hideDist: ref(300) };
const GRENADE_NAMES = GRENADE_VARIANTS.map((v) => v.name);

function tgl(ui, label, key, desc) {
  const r = TG[key] || (TG[key] = ref(false));
  r.v = !!mods[key];
  if (ui.checkbox(label, r, desc)) {
    if (AR) AR.setToggle(key, r.v);
    else mods[key] = r.v;
    ui.notify(label + (r.v ? " on" : " off"));
  }
}

tab(function (ui) {
  if (ui.collapsingHeader("Movement", true)) {
    tgl(ui, "Trigger Fly", "triggerFly", "Hold left trigger to fly where your left hand points");
    tgl(ui, "Joystick Fly", "joystickFly", "Left stick moves, right stick turns and goes up/down");
    tgl(ui, "Speed Boost", "speedBoost");
    tgl(ui, "Long Arms", "longArms");
    tgl(ui, "Platforms", "platforms", "Hold grip to drop a platform under that hand");
  }
  if (ui.collapsingHeader("Weapons", false)) {
    tgl(ui, "Infinite Ammo", "infiniteAmmo");
    tgl(ui, "No Cooldown", "noCooldown");
    tgl(ui, "Rapid Fire", "rapidFire");
    tgl(ui, "No Recoil", "noRecoil");
    tgl(ui, "Aimbot", "aimbot");
    G.aimMode.v = aimbotAimMode;
    if (ui.combo("Aim Point", G.aimMode, AIMBOT_AIM_MODES)) aimbotAimMode = G.aimMode.v;
    if (aimbotAimMode !== 0) {
      G.aimDrop.v = Math.round(aimbotBodyDrop * 100);
      if (ui.sliderInt("Body Offset (cm)", G.aimDrop, 10, 60)) aimbotBodyDrop = G.aimDrop.v / 100;
    }
    tgl(ui, "Kill in Lobby", "killInLobby");
    tgl(ui, "Use Guns in Lobby", "useGunsInLobby");
    ui.separator();
    tgl(ui, "Grenade Launcher", "grenadeLauncher", "Right trigger throws the selected grenade");
    G.grenade.v = selectedGrenadeVariant;
    if (ui.combo("Grenade", G.grenade, GRENADE_NAMES) && AR) AR.setGrenadeVariant(G.grenade.v);
    if (ui.button("Dump Throwables") && AR) AR.dumpThrowables();
  }
  if (ui.collapsingHeader("Player", false)) {
    tgl(ui, "Invincibility", "invincibility");
    tgl(ui, "Invisibility", "invisibility");
    tgl(ui, "Extend Hitboxes", "extendHitboxes");
    tgl(ui, "Unlock All", "unlockAll", "Temporary: unlocks weapons and cosmetics locally");
    ui.separator();
    tgl(ui, "Spin Bot", "spinBot");
    G.spin.v = rigSpinCurrentSpeed;
    if (ui.sliderInt("Spin Speed", G.spin, RIG_SPIN_SPEED_MIN, RIG_SPIN_SPEED_MAX)) rigSpinCurrentSpeed = G.spin.v;
  }
  if (ui.collapsingHeader("Rig", false)) {
    ui.text("Changes how other players see you. Your own view is not touched.");
    tgl(ui, "Spin Head", "spinHead", "Your head spins for everyone else");
    G.headSpin.v = rigHeadSpinSpeed;
    if (ui.sliderInt("Head Spin Speed", G.headSpin, 1, 10)) rigHeadSpinSpeed = G.headSpin.v;
    tgl(ui, "Upside-Down Head", "flipHead");
    tgl(ui, "Drunk Head", "drunkHead", "Your head wobbles side to side");
    tgl(ui, "T-Pose", "tPose", "Your hands stay held out to the sides");
    ui.separator();
    tgl(ui, "Ghost (Hold Button)", "ghost", "While you hold the button, your rig freezes in place for everyone else while you keep moving");
    G.ghostBtn.v = rigGhostButton;
    if (ui.combo("Ghost Button", G.ghostBtn, RIG_GHOST_BUTTONS)) rigGhostButton = G.ghostBtn.v;
    tgl(ui, "Fake Lag", "fakeLag", "Your rig freezes and catches up in short bursts");
    ui.separator();
    tgl(ui, "Hide Rig", "hideRig", "Moves your rig far above you so nobody sees you. Your name tag goes with it");
    G.hideDist.v = rigHideDistance;
    if (ui.sliderInt("Hide Distance (m)", G.hideDist, 50, 2000)) rigHideDistance = G.hideDist.v;
  }
  if (ui.collapsingHeader("Visuals", false)) {
    tgl(ui, "Tracers", "tracers");
    tgl(ui, "Chams", "chams");
    tgl(ui, "ESP Boxes", "espBoxes");
    tgl(ui, "Show HP", "showHp");
    tgl(ui, "Show Hitboxes", "showHitboxes");
  }
  if (ui.collapsingHeader("Soundboard", false)) {
    ui.text("Plays locally and through your current voice chat mic route. Turn on the in-game mic to transmit.");
    if (ui.button("Reload Sounds From Folder")) { const n = reloadSounds(); ui.notify("Soundboard: " + n + " sound(s)"); if (G.sound.v >= n) G.sound.v = 0; }
    if (soundboardSounds.length === 0) {
      ui.textDisabled("No sounds found (put .mp3 / .wav files in Mods/sounds on your pc, run vrfrida.py, then press Reload)");
    } else {
      const names = soundboardSounds.map((s) => s.label);
      ui.combo("Sound", G.sound, names);
      if (ui.button("Play") && AR) AR.playSound(G.sound.v);
      ui.sameLine();
      if (ui.button("Stop") && AR) AR.stopSound();
      if (soundboardBusy && activeSoundIndex >= 0 && soundboardSounds[activeSoundIndex])
        ui.text("Playing: " + soundboardSounds[activeSoundIndex].label);
    }
    ui.separator();
    ui.text("Sound Binds");
    if (soundBinds.length === 0) ui.textDisabled("No binds yet, make one below.");
    for (let i = 0; i < soundBinds.length; i++) {
      ui.text((i + 1) + ". " + describeSoundBind(soundBinds[i]));
      if (soundBindSoundIndex(soundBinds[i]) === -3) ui.textDisabled("   (sound not found, reload sounds or remove)");
      if (ui.button("Remove bind " + (i + 1))) { soundBinds.splice(i, 1); saveSoundBinds(); break; }
    }
    const bindSoundOpts = ["[Stop Sound]", "[Random Sound]"].concat(soundboardSounds.map((s) => s.label));
    if (SB.sound.v >= bindSoundOpts.length) SB.sound.v = 0;
    ui.combo("Bind Sound", SB.sound, bindSoundOpts);
    ui.combo("Trigger Type", SB.trig, ["Controller Button", "Game Event"]);
    if (SB.trig.v === 0) {
      ui.combo("Button", SB.input, SOUND_BIND_INPUTS);
      ui.combo("Modifier", SB.mod, SOUND_BIND_MODIFIERS);
      if (ui.button(SB.listening ? "Listening, press a button on the controller..." : "Listen For Button")) {
        SB.listening = !SB.listening;
        SB.listenStart = Date.now();
        SB.msg = "";
      }
      ui.textDisabled("Listen skips triggers and grips so the menu pointer still works. Hold a grip while pressing to set it as the modifier.");
    } else {
      ui.combo("Event", SB.event, SOUND_BIND_EVENTS);
      if (SB.event.v >= 4) {
        const modKeys = Object.keys(mods);
        if (SB.modKey.v >= modKeys.length) SB.modKey.v = 0;
        ui.combo("Mod", SB.modKey, modKeys);
      }
    }
    if (SB.msg) ui.text(SB.msg);
    if (ui.button("Add Bind")) {
      const special = SB.sound.v < 2;
      const chosen = special ? null : soundboardSounds[SB.sound.v - 2];
      const modKeys = Object.keys(mods);
      soundBinds.push({
        sound: SB.sound.v === 0 ? "__stop" : SB.sound.v === 1 ? "__random" : chosen.id,
        soundLabel: special ? "" : chosen.label,
        trig: SB.trig.v === 1 ? 1 : 0,
        input: SB.input.v, mod: SB.mod.v, event: SB.event.v,
        modKey: SB.event.v >= 4 ? (modKeys[SB.modKey.v] || "") : "",
      });
      saveSoundBinds();
      SB.msg = "";
      ui.notify("Bind added");
    }
  }
});

// switching the plugin off: turn every mod off first (they restore the game values), then drop the hand bridge
onDisable(function () {
  try { if (AR) for (const k of Object.keys(mods)) { if (mods[k]) AR.setToggle(k, false); } } catch (e) { console.log("cleanup: " + e); }
  try { delete globalThis.__pluginHands; } catch (e) {}
  try { if (globalThis.__pluginBeam) globalThis.__pluginBeam.hide(); delete globalThis.__pluginBeam; } catch (e) {}
});


// ---- bundled Animal Rivals feature modules ---------------------------------

; (function () {
// ---- module: pizza_mods.js ----
// game: com.dogelabs.deadeye
"use strict";
/*
 * Pizza Mods - the leftover mods from the Pizza LARP / Network menu, bundled as an Animal Rivals category.
 * Everything the AnimalRivals plugin already does (fly, platforms, long arms, ammo, recoil,
 * esp, hitboxes, god mode, soundboard...) is NOT repeated here.
 * Kick, crash, and RPC spam / loop mods (mic ban, ear rape, hud glitch, spaz all, footsteps...)
 * are left out on purpose.
 */

const MENU_NAME = "PizzaMods";
const pzLog = (m) => console.log("[" + MENU_NAME + "] " + m);

const PZS = {
    noclip: false,
    freecam: false,
    zeroGravity: false,
    ghostMonkey: false,
    autoRevive: false,
    killAura: false,
    silentAim: false,
    targetGun: false,
    zeroSpread: false,
    handSpawn: false,
    spawnGun: false,
    tpGun: false,
    nametags: false,
    airDraw: false,
    ignoreLoadoutCost: false,
    maxWeaponLevel: false,
};

const KILL_AURA_RANGE = 40.0;
const KILL_AURA_INTERVAL = 0.4;
const AUTO_REVIVE_INTERVAL = 0.4;
const SILENT_AIM_COOLDOWN = 0.12;
const TARGET_GUN_COOLDOWN = 0.3;
const SPAWN_COOLDOWN = 0.25;
const SPAWN_GUN_RANGE = 80.0;      // how far the spawn gun ray reaches
const SPAWN_GUN_LIFT = 0.1;        // metres above the hit point, so things don't spawn inside the floor
const SPAWN_GUN_COOLDOWN = 0.2;
const SPAWN_GUN_FALLBACK = 5.0;    // used only if the game has no usable Physics.Raycast
const TP_GUN_COOLDOWN = 0.6;
const TP_GUN_LIFT = 0.05;
const SPAWN_MAX_AMOUNT = 30;
const SPAWN_PATTERNS = ["Single", "Line", "Ring", "Stack"];
const AIM_CONE_DEGREES = 12.0;
const AIM_RANGE = 300.0;
const KILL_REASON = "tungtung";

const GUN_MODES = ["Damage 50", "Damage 150", "Heal +100", "Revive", "Launch", "Freeze", "Pull to me", "Kill"];
const SPAWN_KINDS = ["Item", "Prefab"];

const PREFAB_LIST = [
    "NetworkObject", "CTFGameActivityirateMap", "CTF_Networked_Flag", "Duels_MapSelection", "[Faceoff_Duels]",
    "[GameManager_Duels]", "LCKTabletGhost", "FreeplayGameActivity", "LootContainerHighTierRoyaleChest",
    "LootContainerLowTierRoyaleChest", "LootContainerMidTierRoyaleChest", "LootContainerPlayer", "[AudioManager]",
    "[Pool]", "FriendsOverflowController", "HealthPack", "NetworkTeamDefault", "PingSystem", "[GameManager_Tag]",
    "BasicEnemy_01_BLUEPRINT", "BasicEnemy_02", "BasicEnemy_AR_Avatar", "BasicEnemy_AR_BigZombie",
    "BasicEnemy_AR_Zombie", "Enemy_RedDash Variant", "BasicEnemy_AR_Avatar1", "geyser", "NetworkPlayer",
    "NetworkedGrabbableItem", "SportsBasketball", "SportsHockeyPuck", "SportsSoccerBall", "VFX_CoinsEffect",
    "BasketballImpactProjectile", "FlashbangProjectile", "FragGrenadeProjectile", "HockeyPuckImpactProjectile",
    "InstantExplodeProjectile", "InstantExplodeProjectile_VerticalCylinder", "SmokeGrenadeProjectile",
    "SoccerBallImpactProjectile", "StickyFragProjectile", "StickyFragProjectile_SpaceRanger",
    "StickyFragProjectile_SpaceRanger_Blue", "StickyFragProjectile_SpaceRanger_Red", "CannonWorldItem",
    "SHOOTING RANGE [GameActivity]", "BattleRoyaleChest", "BattleRoyaleLiteActivity", "BattleRoyaleReviveSpot",
    "CritPowerup", "DamagePowerup", "HealthRestorePowerup", "MaxHealthPowerup", "MissLuckPowerup", "RecoilPowerup",
    "SpeedPowerup", "Duels Matchmaking", "TeamScore_MatchScoreboard", "DisappearingPlatform",
    "TriggeredDisappearingPlatform", "[TDM Lobby]", "[Lobby]", "FusionColocationDriver", "FusionAvatar",
    "FusionAvatarSdk28Plus", "NetworkedRig",
];

const ITEM_LIST = [
    { name: "PRFB_Casing_Pistol", index: 1 }, { name: "PRFB_Casing_Rifle", index: 2 },
    { name: "PRFB_FragPin", index: 5 }, { name: "PRFB_RagdollRig", index: 14 }, { name: "UIDamageValue", index: 15 },
    { name: "VFX_BulletTrail_Blue", index: 156 }, { name: "VFX_BulletTrail_Default", index: 158 },
    { name: "VFX_BulletTrail_Default_Mini", index: 159 }, { name: "VFX_BulletTrail_Default_Mini_Stealth", index: 160 },
    { name: "VFX_BulletTrail_Default_Mini_Subtle", index: 161 }, { name: "VFX_BulletTrail_Grey_Mini", index: 165 },
    { name: "VFX_BulletTrail_Kill", index: 166 }, { name: "VFX_BulletTrail_Kill_Mini", index: 167 },
    { name: "OLD_VFX_HitParticles", index: 181 }, { name: "VFX_Impact_Blood", index: 187 },
    { name: "VFX_Impact_Blood_Pellet", index: 197 }, { name: "VFX_Impact_Blood_Quasar", index: 202 },
    { name: "VFX_Impact_Blood_Splash", index: 206 }, { name: "VFX_Impact_BloodHead", index: 207 },
    { name: "VFX_Impact_BloodHead_Pellet", index: 213 }, { name: "VFX_Impact_BloodHead_Quasar", index: 218 },
    { name: "VFX_Impact_BulletContactSparks", index: 223 }, { name: "VFX_Impact_BulletContactSparks_Pellet", index: 231 },
    { name: "VFX_Impact_BulletContactSparks_Quasar", index: 236 }, { name: "VFX_Impact_Explosion_Grenade", index: 242 },
    { name: "VFX_Impact_Explosion_Rocket", index: 246 }, { name: "VFX_Impact_Explosion_Rocket_Snow", index: 247 },
    { name: "VFX_Impact_Explosion_Rocket_SnowYellow", index: 248 }, { name: "VFX_Impact_Explosion_Starter", index: 249 },
    { name: "VFX_SwordSwipeThickFullYellow_WhiteVariant", index: 256 }, { name: "VFX_MuzzleFlash_Flintlock", index: 265 },
    { name: "VFX_MuzzleFlash_Pistol", index: 266 }, { name: "VFX_MuzzleFlash_Pistol_Quasar", index: 269 },
    { name: "VFX_MuzzleFlash_PistolSilent", index: 270 }, { name: "VFX_MuzzleFlash_Rifle", index: 273 },
    { name: "VFX_MuzzleFlash_Sniper", index: 291 }, { name: "VFX_ShotLaunch_Crossbow", index: 296 },
    { name: "VFX_ShotLaunch_Hookshot", index: 300 }, { name: "VFX_ShotLaunch_Slinger", index: 301 },
    { name: "VFX_ShotSmoke_RPG", index: 305 }, { name: "VFX_ShotSmoke_RPG_Snowball", index: 306 },
    { name: "VFX_GrenadeSmoke", index: 318 }, { name: "VFX_Instant_Hit", index: 319 },
    { name: "VFX_Shockwave_Tiny", index: 323 }, { name: "VFX_Shockwave_Tiny_Red", index: 325 },
    { name: "PRFB_TrajectoryPredictionEndAoE", index: 340 }, { name: "CannonBallProjectile", index: 368 },
    { name: "CrossbowProjectile", index: 369 }, { name: "HighspeedBulletProjectile", index: 373 },
    { name: "Rocket", index: 383 }, { name: "Rocket_Snowball", index: 384 }, { name: "Shuriken", index: 385 },
];

// Every value of the game's own PoolManager.Items enum (read from the il2cpp dump). The pool index above only exists at
// runtime, so items that are not in the list above have no index yet and spawn through PoolManager.RPC_LegacySpawn instead.
// "Scan Game" in the Spawner section fills in the real runtime indexes (and adds anything else the game has).
const LEGACY_ITEMS = [
    ["TestParticles", 1], ["PRFB_RagdollRig", 10], ["VFX_Impact_Explosion_Rocket", 100],
    ["VFX_Impact_Explosion_Grenade", 101], ["VFX_GrenadeSmoke", 102], ["VFX_CoinsEffect", 103],
    ["VFX_Impact_Explosion_Grenade_SpaceRanger", 104], ["VFX_SwordSwipeThickFullYellow_WhiteVariant", 105],
    ["VFX_Instant_Hit", 106], ["VFX_Impact_Explosion_Starter", 107], ["VFX_Impact_Sparks", 108],
    ["VFX_SwordSwipeThickFullYellow_Regal", 109], ["VFX_SwordSwipeThickFullYellow_Paladin", 110],
    ["VFX_Impact_Explosion_Grenade_SpaceRanger_Red", 111], ["VFX_Impact_Explosion_Grenade_SpaceRanger_Blue", 112],
    ["VFX_SwordSwipe_Balloon", 113], ["VFX_ShotSmoke_RPG", 150], ["Proj_Rocket", 500], ["Proj_Shuriken", 501],
    ["VFX_BulletTrail_Default", 600], ["VFX_BulletTrail_Grey", 601], ["VFX_BulletTrail_Kill", 602],
    ["VFX_BulletTrail_Blue", 603], ["VFX_BulletTrail_Green", 604], ["VFX_BulletTrail_Default_Mini", 605],
    ["VFX_BulletTrail_Grey_Mini", 606], ["VFX_BulletTrail_Kill_Mini", 607],
    ["VFX_BulletTrail_Default_Mini_Stealth", 608], ["VFX_BulletTrail_Default_Mini_Subtle", 609],
    ["VFX_BulletTrail_Black", 610], ["VFX_BulletTrail_Red_Mini_Subtle", 611],
    ["VFX_BulletTrail_Green_Mini_Subtle", 612], ["VFX_BulletTrail_Blue_Mini_Subtle", 613],
    ["VFX_Impact_BulletContactSparks", 700], ["VFX_Impact_Blood", 701], ["VFX_Impact_BloodHead", 702],
    ["ODL_VFX_WoodChips", 703], ["VFX_Shockwave_Tiny", 704], ["VFX_Shockwave_Small", 705],
    ["VFX_Shockwave_Medium", 706], ["VFX_Shockwave_Tiny_Red", 707], ["VFX_CarrotImpact", 708],
    ["VFX_CarrotImpact_Critical", 709], ["VFX_Shockwave_Tiny_Quasar", 710], ["UIDamageValue", 1000],
    ["UIPlayersPanel_MessageEntry", 1002], ["VFX_MuzzleFlash_Pistol", 1100], ["VFX_MuzzleFlash_Rifle", 1101],
    ["PRFB_Casing_Pistol", 1200], ["PRFB_Casing_Rifle", 1201], ["PRFB_Casing_Shotgun", 1202],
    ["PRFB_Casing_Shotgun_Easter", 1203], ["PRFB_FragPin", 1204], ["PRFB_Casing_Pistol_Cardboard", 1205],
];
for (const [legacyName, legacyValue] of LEGACY_ITEMS) {
    const known = ITEM_LIST.find((i) => i.name === legacyName);
    if (known) known.legacy = legacyValue;
    else ITEM_LIST.push({ name: legacyName, legacy: legacyValue });
}

let PZ = null; // bridge to the in-game side, filled in by Il2Cpp.perform below

Il2Cpp.perform(() => {
    const Core = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
    const PhysicsImage = Il2Cpp.domain.assembly("UnityEngine.PhysicsModule").image;
    const XRImage = Il2Cpp.domain.assembly("UnityEngine.XRModule").image;
    const Game = Il2Cpp.domain.assembly("DL.Animals.Core2025").image;

    const UnityObject = Core.class("UnityEngine.Object");
    const GameObject = Core.class("UnityEngine.GameObject");
    const Camera = Core.class("UnityEngine.Camera");
    const Time = Core.class("UnityEngine.Time");
    const Quaternion = Core.class("UnityEngine.Quaternion");
    const Collider = PhysicsImage.class("UnityEngine.Collider");
    const Rigidbody = PhysicsImage.class("UnityEngine.Rigidbody");
    const InputDevices = XRImage.class("UnityEngine.XR.InputDevices");
    const CommonUsages = XRImage.class("UnityEngine.XR.CommonUsages");

    function gameClass(name) {
        try { return Game.class(name); } catch (_) { return null; }
    }
    function anyClass(name) {
        const direct = gameClass(name);
        if (direct) return direct;
        try {
            for (const assembly of Il2Cpp.domain.assemblies) {
                try {
                    const klass = assembly.image.class(name);
                    if (klass) return klass;
                } catch (_) { }
            }
        } catch (_) { }
        return null;
    }

    const PlayerController = gameClass("PlayerController");
    const GorillaPlayer = gameClass("GorillaLocomotion.DLAR_GorillaPlayerV2");
    const NetworkPlayer = gameClass("DLARX_NetworkPlayer");
    const PlayersManager = gameClass("DLAR_PlayersManager");
    const WeaponBase = gameClass("DLAR_WeaponBase");
    const PoolManager = gameClass("PoolManager");
    const TeamManager = gameClass("TeamManager");
    const UIPanelLoadout = gameClass("UIPanelLoadout");
    const ProgressionManager = gameClass("DLProgressionManager");
    const DuelsClasses = ["Duels.GameActivity_Duels", "Duels.GameActivity_DuelsV2"].map(anyClass).filter(Boolean);
    const CtfClasses = ["Systems.GameActivities.CTF.GameActivity_CTF", "GameActivity_CTF"].map(anyClass).filter(Boolean);

    const identityQuaternion = Quaternion.method("Euler", 3).invoke(0, 0, 0);
    const inputBool = Il2Cpp.alloc(1);
    const inputVec2 = Il2Cpp.alloc(8);

    // ---------------------------------------------------------------- helpers
    function live(value) {
        if (!value) return false;
        try { return !value.isNull(); } catch (_) { return false; }
    }
    function alive(value) {
        if (!live(value)) return false;
        try { return !!UnityObject.method("op_Implicit", 1).invoke(value); } catch (_) { return false; }
    }
    function same(a, b) {
        if (!live(a) || !live(b)) return false;
        try { return a.handle.equals(b.handle); } catch (_) { return false; }
    }
    function destroy(value) {
        if (!live(value)) return;
        try { UnityObject.method("Destroy", 1).invoke(value); } catch (_) { }
    }
    function tf(value) {
        try { return value.method("get_transform", 0).invoke(); } catch (_) { return null; }
    }
    function vec(value) {
        try {
            const r = [Number(value.field("x").value), Number(value.field("y").value), Number(value.field("z").value)];
            return r.every(Number.isFinite) ? r : null;
        } catch (_) { return null; }
    }
    function posOf(transform) {
        if (!alive(transform)) return null;
        try { return vec(transform.method("get_position", 0).invoke()); } catch (_) { return null; }
    }
    function fwdOf(transform) {
        if (!alive(transform)) return null;
        try { return vec(transform.method("get_forward", 0).invoke()); } catch (_) { return null; }
    }
    function getComp(object, klass) {
        try {
            return object.method("GetComponent", 1).overload("System.Type").invoke(klass.type.object);
        } catch (_) { return null; }
    }
    function addComp(object, klass) {
        try {
            object.method("AddComponent", 1).overload("System.Type").invoke(klass.type.object);
            return getComp(object, klass);
        } catch (_) { return null; }
    }
    function arrayValues(arr) {
        const out = [];
        try {
            for (let i = 0; arr && i < arr.length; i++) {
                const v = arr.get(i);
                if (live(v)) out.push(v);
            }
        } catch (_) { }
        return out;
    }
    function objects(klass) {
        if (!klass) return [];
        try {
            return arrayValues(UnityObject.method("FindObjectsByType", 2)
                .overload("System.Type", "UnityEngine.FindObjectsSortMode")
                .invoke(klass.type.object, 0));
        } catch (_) {
            try {
                return arrayValues(UnityObject.method("FindObjectsOfType", 1)
                    .overload("System.Type").invoke(klass.type.object));
            } catch (_) { return []; }
        }
    }
    function findOne(klasses) {
        for (const klass of klasses) {
            const found = objects(klass).find(alive);
            if (found) return found;
        }
        return null;
    }
    function methodBool(value, names) {
        for (const name of names) {
            try { return !!value.method(name, 0).invoke(); } catch (_) { }
        }
        return null;
    }
    // Calls an RPC / method by name. Returns true if the call went through.
    function call(target, name, args = [], count = null) {
        if (!live(target)) return false;
        try {
            const method = count === null ? target.method(name) : target.method(name, count);
            method.invoke(...args);
            return true;
        } catch (_) { return false; }
    }
    function str(text) { return Il2Cpp.string(text); }
    function managedString(value) {
        if (!value) return "";
        try { if (typeof value.content === "string") return value.content; } catch (_) { }
        try { return String(value.toString()).replace(/^"|"$/g, ""); } catch (_) { return ""; }
    }
    function menuOpen() {
        try { return !!(globalThis.__imguiOpen && globalThis.__imguiOpen()); } catch (_) { return false; }
    }

    // ---------------------------------------------------------------- local player
    let gt = null;
    function controllerIsLocal(controller) {
        try {
            const cam = controller.field("playerCamera").value;
            const main = Camera.method("get_main", 0).invoke();
            if (!alive(cam) || !alive(main)) return false;
            return same(cam, main) || same(tf(cam), tf(main));
        } catch (_) { return false; }
    }
    function localController() {
        if (alive(gt)) return gt;
        gt = null;
        try {
            if (GorillaPlayer) {
                const instance = GorillaPlayer.field("_instance").value;
                if (alive(instance)) { gt = instance; return gt; }
            }
        } catch (_) { }
        try {
            for (const candidate of objects(PlayerController)) {
                if (controllerIsLocal(candidate)) { gt = candidate; return gt; }
            }
        } catch (_) { }
        return null;
    }
    function playerRigidbody() {
        const g = localController();
        if (!g) return null;
        try {
            const r = g.field("Rigidbody").value;
            if (alive(r)) return r;
        } catch (_) { }
        const r = getComp(g, Rigidbody);
        return alive(r) ? r : null;
    }
    function setVelocity(rb, v) {
        try { rb.method("set_linearVelocity", 1).invoke(v); return true; } catch (_) { }
        try { rb.method("set_velocity", 1).invoke(v); return true; } catch (_) { return false; }
    }
    function addForce(v) {
        const rb = playerRigidbody();
        if (!rb) return false;
        try { rb.method("AddForce", 2).invoke(v, 2); return true; } catch (_) { return false; }
    }
    function headTransform() {
        try {
            const main = Camera.method("get_main", 0).invoke();
            if (alive(main)) return tf(main);
        } catch (_) { }
        return null;
    }
    function transformFromFields(owner, names) {
        for (const name of names) {
            try {
                const v = owner.field(name).value;
                if (!alive(v)) continue;
                if (v.class && v.class.name === "Transform") return v;
                const t = tf(v);
                if (alive(t)) return t;
            } catch (_) { }
        }
        return null;
    }
    function hands() {
        try {
            if (globalThis.__pluginHands) {
                const h = globalThis.__pluginHands();
                if (h) return h;
            }
        } catch (_) { }
        const g = localController();
        if (!g) return null;
        let left = transformFromFields(g, ["handLeftAnchor", "leftHandAnchor", "LeftHandAnchor", "leftHand", "handLeft"]);
        let right = transformFromFields(g, ["handRightAnchor", "rightHandAnchor", "RightHandAnchor", "rightHand", "handRight"]);
        if (!alive(left) || !alive(right)) {
            try {
                const lp = g.field("leftLocomotionPoints").value;
                const rp = g.field("rightLocomotionPoints").value;
                left = lp.method("get_Item", 1).invoke(0).field("transform").value;
                right = rp.method("get_Item", 1).invoke(0).field("transform").value;
            } catch (_) { }
        }
        return alive(left) && alive(right) ? [left, right] : null;
    }

    // ---------------------------------------------------------------- network players
    let myNetworkPlayer = null;
    function hasAuthority(player) {
        const direct = methodBool(player, ["get_HasInputAuthority", "get_HasStateAuthority"]);
        return direct === true;
    }
    function localNetworkPlayer() {
        if (alive(myNetworkPlayer)) return myNetworkPlayer;
        myNetworkPlayer = null;
        try {
            if (PlayersManager) {
                const mine = PlayersManager.field("_myNetworkPlayer").value;
                if (alive(mine)) { myNetworkPlayer = mine; return mine; }
            }
        } catch (_) { }
        for (const p of objects(NetworkPlayer)) {
            if (hasAuthority(p)) { myNetworkPlayer = p; return p; }
        }
        return null;
    }
    function otherPlayers() {
        const result = [];
        try {
            const instance = PlayersManager.method("get_Instance", 0).invoke();
            const list = instance.method("GetNetworkPlayers", 0).invoke();
            const count = Number(list.method("get_Count", 0).invoke());
            for (let i = 0; i < count; i++) {
                const p = list.method("get_Item", 1).invoke(i);
                if (!alive(p) || hasAuthority(p)) continue;
                result.push(p);
            }
            return result;
        } catch (_) { }
        const me = localNetworkPlayer();
        for (const p of objects(NetworkPlayer)) {
            if (alive(p) && !same(p, me) && !hasAuthority(p)) result.push(p);
        }
        return result;
    }
    function playerPos(p) {
        const base = posOf(tf(p));
        if (!base) return null;
        return [base[0], base[1] + 0.9, base[2]];
    }
    function rpcAll(name, args) {
        let n = 0;
        for (const p of otherPlayers()) if (call(p, name, args)) n++;
        return n;
    }
    function rpcLaunch(p, dir, a, b, c, tag) {
        return call(p, "RPC_LaunchPlayer", [dir, a, b, c, str(tag || ""), 0], 6);
    }
    function aimTarget(coneDeg) {
        const h = hands();
        if (!h) return null;
        const origin = posOf(h[1]);
        const f = fwdOf(h[1]);
        if (!origin || !f) return null;
        const minCos = Math.cos(coneDeg * Math.PI / 180.0);
        let best = null, bestCos = minCos;
        for (const p of otherPlayers()) {
            const pos = playerPos(p);
            if (!pos) continue;
            const dx = pos[0] - origin[0], dy = pos[1] - origin[1], dz = pos[2] - origin[2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < 0.01 || dist > AIM_RANGE) continue;
            const cosine = (dx * f[0] + dy * f[1] + dz * f[2]) / dist;
            if (cosine > bestCos) { bestCos = cosine; best = p; }
        }
        return best;
    }

    // ---------------------------------------------------------------- input
    let leftTrigger = false, rightTrigger = false, leftGrip = false, rightGrip = false;
    let rightSecondary = false;
    let leftStick = [0, 0], rightStick = [0, 0];
    function readBool(device, usage) {
        try {
            inputBool.writeU8(0);
            const ok = device.method("TryGetFeatureValue", 2)
                .overload("UnityEngine.XR.InputFeatureUsage<System.Boolean>", "System.Boolean&")
                .invoke(usage, inputBool);
            return !!ok && inputBool.readU8() !== 0;
        } catch (_) { return false; }
    }
    function readVec2(device, usage) {
        try {
            inputVec2.writeFloat(0.0);
            inputVec2.add(4).writeFloat(0.0);
            const ok = device.method("TryGetFeatureValue", 2)
                .overload("UnityEngine.XR.InputFeatureUsage<UnityEngine.Vector2>", "UnityEngine.Vector2&")
                .invoke(usage, inputVec2);
            if (!ok) return [0, 0];
            const x = inputVec2.readFloat(), y = inputVec2.add(4).readFloat();
            return [Math.abs(x) < 0.08 ? 0 : x, Math.abs(y) < 0.08 ? 0 : y];
        } catch (_) { return [0, 0]; }
    }
    function updateInput() {
        // use the menu's own input helpers (OVRInput first), the raw XR reads below don't work in this game
        try {
            if (ui && ui.input) {
                const dz = (v) => [Math.abs(v[0]) < 0.08 ? 0 : v[0], Math.abs(v[1]) < 0.08 ? 0 : v[1]];
                leftTrigger = ui.input.trigger(0) > 0.5;
                rightTrigger = ui.input.trigger(1) > 0.5;
                leftGrip = !!ui.input.grip(0);
                rightGrip = !!ui.input.grip(1);
                rightSecondary = !!ui.input.secondary(1);
                leftStick = dz(ui.input.stick(0));
                rightStick = dz(ui.input.stick(1));
                return;
            }
        } catch (_) { }
        try {
            const left = InputDevices.method("GetDeviceAtXRNode", 1).invoke(4);
            const right = InputDevices.method("GetDeviceAtXRNode", 1).invoke(5);
            leftTrigger = readBool(left, CommonUsages.field("triggerButton").value);
            rightTrigger = readBool(right, CommonUsages.field("triggerButton").value);
            leftGrip = readBool(left, CommonUsages.field("gripButton").value);
            rightGrip = readBool(right, CommonUsages.field("gripButton").value);
            rightSecondary = readBool(right, CommonUsages.field("secondaryButton").value);
            leftStick = readVec2(left, CommonUsages.field("primary2DAxis").value);
            rightStick = readVec2(right, CommonUsages.field("primary2DAxis").value);
        } catch (_) { }
    }

    // ---------------------------------------------------------------- movement mods
    let flySpeed = 20;
    let noclipState = null;
    function bodyColliders(g) {
        const result = [];
        for (const f of ["headCollider", "bodyCollider"]) {
            try {
                const c = g.field(f).value;
                if (alive(c)) result.push(c);
            } catch (_) { }
        }
        if (result.length === 0) {
            try {
                const go = g.method("get_gameObject", 0).invoke();
                const arr = go.method("GetComponentsInChildren", 2)
                    .overload("System.Type", "System.Boolean")
                    .invoke(Collider.type.object, true);
                for (const c of arrayValues(arr)) result.push(c);
            } catch (_) { }
        }
        return result;
    }
    function startNoclip() {
        const g = localController();
        if (!g) return false;
        const colliders = bodyColliders(g);
        const layerFields = ["_currentLocomotionEnabledLayers", "_currentLocomotionLeftHandEnabledLayers",
            "_currentLocomotionRightHandEnabledLayers"];
        const savedLayers = [];
        for (const f of layerFields) {
            try {
                const field = g.field(f);
                savedLayers.push({ field, value: field.value });
                field.value = 0;
            } catch (_) { }
        }
        for (const c of colliders) {
            try { c.method("set_enabled", 1).invoke(false); } catch (_) { }
        }
        noclipState = { colliders, savedLayers };
        return true;
    }
    function stopNoclip() {
        if (!noclipState) return;
        for (const c of noclipState.colliders) {
            if (!alive(c)) continue;
            try { c.method("set_enabled", 1).invoke(true); } catch (_) { }
        }
        for (const s of noclipState.savedLayers) {
            try { s.field.value = s.value; } catch (_) { }
        }
        noclipState = null;
        const rb = playerRigidbody();
        if (rb && !PZS.zeroGravity) {
            try { rb.method("set_useGravity", 1).invoke(true); } catch (_) { }
        }
    }
    function tickNoclip(dt) {
        if (!noclipState && !startNoclip()) return;
        const rb = playerRigidbody();
        if (!rb) return;
        try { rb.method("set_useGravity", 1).invoke(false); } catch (_) { }
        const h = hands();
        if (!h || menuOpen()) return;
        const push = (hand) => {
            const f = fwdOf(hand);
            if (!f) return;
            const s = flySpeed * dt;
            try { rb.method("AddForce", 2).invoke([f[0] * s, f[1] * s, f[2] * s], 2); } catch (_) { }
        };
        if (rightTrigger) push(h[1]);
        if (leftTrigger) push(h[0]);
    }

    let freecamObject = null, freecamPitch = 0, freecamYaw = 0;
    function stopFreecam() {
        if (alive(freecamObject)) destroy(freecamObject);
        freecamObject = null;
    }
    function tickFreecam(dt) {
        if (!alive(freecamObject)) {
            const head = headTransform();
            const start = posOf(head) || [0, 1.5, 0];
            let obj = null;
            try {
                obj = GameObject.alloc();
                obj.method(".ctor", 1).invoke(str("PizzaFreecam"));
            } catch (_) { return; }
            const cam = addComp(obj, Camera);
            if (!alive(cam)) { destroy(obj); return; }
            tf(obj).method("set_position", 1).invoke(start);
            try {
                const rot = head ? head.method("get_rotation", 0).invoke() : identityQuaternion;
                const e = vec(rot.method("get_eulerAngles", 0).invoke());
                if (e) { freecamPitch = 0; freecamYaw = e[1]; }
            } catch (_) { freecamPitch = 0; freecamYaw = 0; }
            freecamObject = obj;
            return;
        }
        const cam = getComp(freecamObject, Camera);
        const t = tf(freecamObject);
        if (!alive(cam) || !alive(t)) return;
        const step = Math.min(dt, 0.02);
        const speed = rightTrigger ? 10 : 3;
        try { cam.method("set_depth", 1).invoke(rightGrip ? 1 : -10); } catch (_) { }
        const f = fwdOf(t);
        let r = null;
        try { r = vec(t.method("get_right", 0).invoke()); } catch (_) { }
        const p = posOf(t);
        if (f && r && p) {
            t.method("set_position", 1).invoke([
                p[0] + f[0] * leftStick[1] * speed * step + r[0] * leftStick[0] * speed * step,
                p[1] + f[1] * leftStick[1] * speed * step + r[1] * leftStick[0] * speed * step,
                p[2] + f[2] * leftStick[1] * speed * step + r[2] * leftStick[0] * speed * step,
            ]);
        }
        if (rightStick[0] !== 0) freecamYaw += rightStick[0] * 240.0 * step;
        if (rightStick[1] !== 0) freecamPitch = Math.max(-89, Math.min(89, freecamPitch - rightStick[1] * 180.0 * step));
        try {
            t.method("set_rotation", 1).invoke(Quaternion.method("Euler", 3).invoke(freecamPitch, freecamYaw, 0));
        } catch (_) { }
    }

    function applyZeroGravity(enabled) {
        const rb = playerRigidbody();
        if (!rb) return;
        try { rb.method("set_useGravity", 1).invoke(!enabled); } catch (_) { }
    }
    function teleportLocal(offset) {
        const g = localController();
        if (!g) return false;
        try {
            const t = tf(g);
            const p = posOf(t);
            if (!p) return false;
            t.method("set_position", 1).invoke([p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]]);
            return true;
        } catch (_) { return false; }
    }
    function headForwardFlat() {
        const f = fwdOf(headTransform());
        if (!f) return [0, 0, 1];
        const m = Math.sqrt(f[0] * f[0] + f[2] * f[2]) || 1;
        return [f[0] / m, 0, f[2] / m];
    }
    const movement = {
        superJump: () => addForce([0, 300, 0]),
        megaJump: () => addForce([0, 600, 0]),
        groundSlam: () => addForce([0, -800, 0]),
        dash: () => { const f = headForwardFlat(); return addForce([f[0] * 500, 0, f[2] * 500]); },
        backTeleport: () => { const f = headForwardFlat(); return teleportLocal([-f[0] * 10, 0, -f[2] * 10]); },
        upTeleport: () => teleportLocal([0, 15, 0]),
        rocketJump: () => call(localNetworkPlayer(), "RPC_LaunchPlayer", [[0, 1, 0], 80.0, 200.0, 10.0, str("Rocket"), 0], 6),
        speedBoost: () => call(localNetworkPlayer(), "RPC_ApplyMovementModifier", [5]),
        slomo: () => call(localNetworkPlayer(), "RPC_ApplyMovementModifier", [-3]),
        rank: () => call(localNetworkPlayer(), "set_XP", [9999999]),
    };

    // ---------------------------------------------------------------- player mods
    function localHeadPos() {
        return posOf(headTransform()) || [0, 1.5, 0];
    }
    const player = {
        healSelf: () => call(localNetworkPlayer(), "RPC_ReportHealthUsed", [-100]),
        healEveryone: () => {
            let n = call(localNetworkPlayer(), "RPC_ReportHealthUsed", [-100]) ? 1 : 0;
            n += rpcAll("RPC_ReportHealthUsed", [-100]);
            return n;
        },
        bigHealth: () => {
            const me = localNetworkPlayer();
            call(me, "RPC_ReportMaxHealthGained");
            return call(me, "RPC_ReportHealthUsed", [-1000]);
        },
        shield: () => call(localNetworkPlayer(), "RPC_ReportShieldUsed", [1000]),
        maxHealthGained: () => call(localNetworkPlayer(), "RPC_ReportMaxHealthGained"),
        streak: (n) => call(localNetworkPlayer(), "SetConsecutiveKillsInRound", [n]),
        showBodyParts: () => { const me = localNetworkPlayer(); return call(me, "RPC_ShowBodyParts", [me]); },
        cleanGrabs: () => {
            const me = localNetworkPlayer();
            return call(me, "RPC_CleanFakeGrabItem", [0]) && call(me, "RPC_CleanFakeGrabItem", [1]);
        },
        reviveSelf: () => call(localNetworkPlayer(), "RPC_ClientRevive", [localHeadPos(), 0.0]),
        reviveEveryone: () => {
            let n = call(localNetworkPlayer(), "RPC_ClientRevive", [localHeadPos(), 0.0]) ? 1 : 0;
            for (const p of otherPlayers()) {
                const pos = posOf(tf(p));
                if (pos && call(p, "RPC_ClientRevive", [pos, 0.0])) n++;
            }
            return n;
        },
        ragdollFollow: () => call(localNetworkPlayer(), "RPC_SetRagdollFollowProjectile", [str("Rocket")]),
    };
    function setGhostMonkey(enabled) {
        const me = localNetworkPlayer();
        if (!live(me)) return;
        try { me.method("get_gameObject", 0).invoke().method("SetActive", 1).invoke(!enabled); } catch (_) { }
    }

    // name changer: the visible name is PlayerNameTagFusion._OculusName (NetworkString<_64>, ~63 chars max)
    let originalName = "";
    let nameTagClass = null;
    let localNameTag = null;
    function findLocalNameTag() {
        if (alive(localNameTag)) return localNameTag;
        localNameTag = null;
        if (!nameTagClass) nameTagClass = anyClass("Meta.XR.MultiplayerBlocks.Fusion.PlayerNameTagFusion");
        if (!nameTagClass) return null;
        const tags = objects(nameTagClass);
        for (const t of tags) {
            if (hasAuthority(t)) { localNameTag = t; return t; }
        }
        if (tags.length === 1) { localNameTag = tags[0]; return localNameTag; }
        return null;
    }
    function netStringText(value) {
        if (!value) return "";
        try { if (typeof value.content === "string") return value.content; } catch (_) { }
        let boxed = null;
        try { boxed = value.box(); } catch (_) { }
        for (const c of [value, boxed]) {
            if (!c) continue;
            try {
                const r = c.method("ToString", 0).invoke();
                if (r && typeof r.content === "string") return r.content;
            } catch (_) { }
        }
        return "";
    }
    function readName(tag) {
        try { return netStringText(tag.method("get_OculusName", 0).invoke()); } catch (_) { return ""; }
    }
    // ---------------------------------------------------------------- other players
    const lobby = {
        killAll: () => {
            let n = 0;
            for (const p of otherPlayers()) if (call(p, "RPC_ReportKill", [p, p, str(KILL_REASON), 0.1])) n++;
            return n;
        },
        knockbackWave: () => { let n = 0; for (const p of otherPlayers()) if (rpcLaunch(p, [0, 1.5, 0], 45.0, 60.0, 1.0)) n++; return n; },
        launchAll: () => { let n = 0; for (const p of otherPlayers()) if (rpcLaunch(p, [0, 1, 0], 70.0, 150.0, 8.0, "Rocket")) n++; return n; },
        freezeAll: () => { let n = 0; for (const p of otherPlayers()) if (rpcLaunch(p, [0, 0, 0], 0.0, 0.0, 0.01)) n++; return n; },
        pullAll: () => {
            const h = hands();
            const mine = h ? posOf(h[1]) : null;
            if (!mine) return 0;
            let n = 0;
            for (const p of otherPlayers()) {
                const pos = posOf(tf(p));
                if (!pos) continue;
                const d = [mine[0] - pos[0], mine[1] - pos[1], mine[2] - pos[2]];
                const m = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]) || 1;
                if (rpcLaunch(p, [d[0] / m, d[1] / m, d[2] / m], 35.0, 35.0, 1.0)) n++;
            }
            return n;
        },
        teleportAllToMe: () => {
            const h = hands();
            const mine = h ? posOf(h[1]) : null;
            if (!mine) return 0;
            let n = 0;
            for (const p of otherPlayers()) {
                try { tf(p).method("set_position", 1).invoke(mine); n++; } catch (_) { }
            }
            return n;
        },
    };

    function applyTargetAction(mode, target) {
        const pos = posOf(tf(target));
        if (mode === 0) return call(target, "RPC_InformPlayerDamage", [50]);
        if (mode === 1) return call(target, "RPC_InformPlayerDamage", [150]);
        if (mode === 2) return call(target, "RPC_ReportHealthUsed", [-100]);
        if (mode === 3) return pos ? call(target, "RPC_ClientRevive", [pos, 1.0]) : false;
        if (mode === 4) return rpcLaunch(target, [0, 1, 0], 80.0, 150.0, 8.0, "Rocket");
        if (mode === 5) return rpcLaunch(target, [0, 0, 0], 0.0, 0.0, 0.01);
        if (mode === 6) {
            const h = hands();
            const mine = h ? posOf(h[1]) : null;
            if (!mine) return false;
            try { tf(target).method("set_position", 1).invoke(mine); return true; } catch (_) { return false; }
        }
        if (mode === 7) return call(target, "RPC_ReportKill", [target, target, str(KILL_REASON), 0.1]);
        return false;
    }

    // ---------------------------------------------------------------- weapons / loadout
    function applyZeroSpread() {
        for (const w of objects(WeaponBase)) {
            try { w.field("directionOffsetAccuracy").value = 0.0; } catch (_) { }
            try { w.field("<accuracyAccumalator>k__BackingField").value = 0.0; } catch (_) { }
        }
    }
    const weapons = {
        refillAmmo: () => { let n = 0; for (const w of objects(WeaponBase)) if (call(w, "SetMaxAmmo")) n++; return n; },
        fullReload: () => { let n = 0; for (const w of objects(WeaponBase)) if (call(w, "ForceFullReload")) n++; return n; },
        freeLoadout: () => {
            try { UIPanelLoadout.field("_wasIgnoringLoadoutCost").value = true; return true; } catch (_) { return false; }
        },
        addCoins: () => {
            const panel = findOne([UIPanelLoadout]);
            return call(panel, "AddCoins", [999999]);
        },
    };

    // ---------------------------------------------------------------- gamemodes
    function duels() { return findOne(DuelsClasses); }
    function ctf() { return findOne(CtfClasses); }
    const modes = {
        duelsCall: (name, args = []) => call(duels(), name, args),
        ctfCall: (name, args = []) => call(ctf(), name, args),
        ctfTeleportFlags: () => {
            const game = ctf();
            const h = hands();
            const mine = h ? posOf(h[1]) : null;
            if (!game || !mine) return false;
            let moved = false;
            for (const f of ["_blueFlag", "_redFlag"]) {
                try {
                    const flag = game.field(f).value;
                    if (alive(flag)) { tf(flag).method("set_position", 1).invoke(mine); moved = true; }
                } catch (_) { }
            }
            return moved;
        },
        forceStart: () => {
            const a = call(localNetworkPlayer(), "RPC_StartPartyMatch", [str("MATCH_ROYALE"), true, str("STATE"), str("START")]);
            const b = call(duels(), "RPC_StartMatch");
            return a || b;
        },
        infectSelf: () => { const me = localNetworkPlayer(); return call(me, "RPC_MoveToTaggedTeam", [me, false]); },
        cureSelf: () => { const me = localNetworkPlayer(); return call(me, "RPC_MoveToSurviveTeam", [me]); },
        infectAll: () => { let n = 0; for (const p of otherPlayers()) if (call(p, "RPC_MoveToTaggedTeam", [p, false])) n++; return n; },
        cureAll: () => { let n = 0; for (const p of otherPlayers()) if (call(p, "RPC_MoveToSurviveTeam", [p])) n++; return n; },
        setTeam: (team) => {
            try {
                const manager = TeamManager.method("get_Instance", 0).invoke();
                return call(manager, "RPC_AskMasterClientToChangePlayerTeam", [localNetworkPlayer(), team]);
            } catch (_) { return false; }
        },
        removeTeam: () => {
            try {
                const manager = TeamManager.method("get_Instance", 0).invoke();
                return call(manager, "RPC_AskMasterClientToCleanPlayerFromTeams", [localNetworkPlayer()]);
            } catch (_) { return false; }
        },
    };

    // ---------------------------------------------------------------- vfx
    function handPose() {
        const h = hands();
        if (!h) return null;
        const pos = h[1].method("get_position", 0).invoke();
        const rot = h[1].method("get_rotation", 0).invoke();
        return { pos, rot };
    }
    const fx = {
        worldExplosion: () => {
            const pose = handPose();
            return pose ? call(localNetworkPlayer(), "RPC_PlayWorldVFXProxy", [0, pose.pos, pose.rot]) : false;
        },
        gliderTrail: () => call(localNetworkPlayer(), "RPC_PlayPlayerGliderBoostVFXProxy", [0, 1]),
        shootRight: () => call(localNetworkPlayer(), "RPC_PlayShootVFXProxy", [0, 0, 0.0]),
        shootLeft: () => call(localNetworkPlayer(), "RPC_PlayShootVFXProxy", [1, 0, 0.0]),
        sunset: () => call(localNetworkPlayer(), "RPC_SunsetRoom"),
        flagEffects: (team) => modes.ctfCall("RPC_PlayCapturedFlagEffects", [team]),
    };

    // ---------------------------------------------------------------- spawning
    function spawnItemAt(item, pos, scale = 1.0) {
        let pool = null;
        try { pool = PoolManager.method("get_Instance", 0).invoke(); }
        catch (e) { pzLog("item spawn failed: " + e); return false; }
        if (item.index !== undefined) {
            try {
                pool.method("RPC_Spawn")
                    .overload("System.Int32", "UnityEngine.Vector3", "System.Single")
                    .invoke(item.index, pos, scale);
                return true;
            } catch (e) {
                if (item.legacy === undefined) { pzLog("item spawn failed: " + e); return false; }
            }
        }
        if (item.legacy !== undefined) {
            try {
                pool.method("RPC_LegacySpawn", 4).invoke(item.legacy, pos, makeVec3(0, 0, 1), scale);
                return true;
            } catch (e) {
                pzLog("legacy item spawn failed (" + item.name + "): " + e);
                return false;
            }
        }
        return false;
    }
    const prefabCache = new Map();
    function spawnNetworkPrefab(prefabName, pos, rot) {
        try {
            const NetworkRunner = Il2Cpp.domain.assembly("Fusion.Runtime").image.class("Fusion.NetworkRunner");
            const instances = NetworkRunner.field("_instances").value;
            if (!live(instances)) return null;
            if (Number(instances.method("get_Count").invoke()) === 0) return null;
            const runner = instances.method("get_Item").invoke(0);

            let no = prefabCache.get(prefabName);
            if (no === undefined) {
                no = null;
                const sources = runner.field("_config").value.field("PrefabTable").value.field("_sources").value;
                const count = sources.method("get_Count").invoke();
                for (let i = 0; i < count; i++) {
                    try {
                        const source = sources.method("get_Item").invoke(i);
                        const desc = source.method("get_Description").invoke().toString();
                        if (desc.includes(prefabName)) {
                            source.method("Acquire").invoke(true);
                            const result = source.method("WaitForResult").invoke();
                            if (live(result)) { no = result; break; }
                        }
                    } catch (_) { }
                }
                prefabCache.set(prefabName, no);
            }
            if (!live(no)) return null;

            const makeZero = (type) => {
                if (type.class.isEnum || type.isPrimitive) return 0;
                if (!type.class.isValueType) return NULL;
                const fields = type.class.fields.filter(f => !f.isStatic);
                if (fields.length === 0) return 0;
                return fields.map(f => makeZero(f.type));
            };
            const nullableArg = (nullableType, hasValue, value) => {
                const fields = nullableType.class.fields.filter(f => !f.isStatic);
                return fields.map(f => {
                    const lname = f.name.toLowerCase();
                    if (lname.includes("hasvalue")) return hasValue ? 1 : 0;
                    if (lname === "value") return hasValue ? value : makeZero(f.type);
                    return makeZero(f.type);
                });
            };
            const normalize = (type, value) => {
                if (typeof value === "boolean") return value ? 1 : 0;
                if (value instanceof Il2Cpp.ValueType) {
                    const fields = type.class.fields.filter(f => !f.isStatic);
                    if (fields.length === 0) return 0;
                    return fields.map(f => normalize(f.type, f.bind(value).value));
                }
                if (Array.isArray(value)) return value.map(v => normalize(type, v));
                return value;
            };

            let spawnMethod = null;
            for (const m of runner.method("Spawn").overloads()) {
                if (m.parameterCount !== 6 || m.isGeneric) continue;
                if (m.parameters[0].type.name.includes("NetworkObject")) { spawnMethod = m; break; }
            }
            if (!spawnMethod) return null;

            const posArg = nullableArg(spawnMethod.parameters[1].type, true, normalize(pos.type, pos));
            const rotArg = nullableArg(spawnMethod.parameters[2].type, true, normalize(rot.type, rot));
            const authArg = nullableArg(spawnMethod.parameters[3].type, false, makeZero(spawnMethod.parameters[3].type));
            const beforeArg = spawnMethod.parameters[4].type.class.isValueType
                ? makeZero(spawnMethod.parameters[4].type) : NULL;
            return spawnMethod.bind(runner).invoke(no, posArg, rotArg, authArg, beforeArg, 0);
        } catch (e) {
            pzLog("prefab spawn failed: " + e);
            return null;
        }
    }
    let spawnKind = 0, spawnItemIndex = 0, spawnPrefabIndex = 0;
    // ---------------------------------------------------------------- scale / amount / pattern, and undo
    // Everything that spawns the selected thing (2m in front, grip + B, the spawn gun) goes through spawnAtPoints.
    let spawnScalePct = 100, spawnAmount = 1, spawnSpacingCm = 50, spawnPattern = 0;
    const spawnedBatches = [];   // network objects from the spawner, one array per press, so they can be removed again
    function spawnedCount() {
        let n = 0;
        for (const b of spawnedBatches) n += b.length;
        return n;
    }
    // c = centre [x,y,z], dir = which way you are aiming. Returns the [x,y,z] of every thing to spawn.
    function patternPoints(c, dir) {
        const n = Math.max(1, Math.min(SPAWN_MAX_AMOUNT, Math.round(spawnAmount)));
        if (n === 1 || spawnPattern === 0) return [c];
        const gap = Math.max(0.05, spawnSpacingCm / 100);
        let fx = dir[0], fz = dir[2];
        const fl = Math.hypot(fx, fz);
        if (fl < 0.05) { fx = 0; fz = 1; } else { fx /= fl; fz /= fl; }
        const rx = fz, rz = -fx;                    // horizontal "right" of the aim direction
        const out = [];
        if (spawnPattern === 1) {                   // line, centred on the aim point, left to right
            for (let i = 0; i < n; i++) {
                const o = (i - (n - 1) / 2) * gap;
                out.push([c[0] + rx * o, c[1], c[2] + rz * o]);
            }
        } else if (spawnPattern === 2) {            // ring, spacing is the distance between neighbours
            const radius = Math.max(0.3, n * gap / (Math.PI * 2));
            for (let i = 0; i < n; i++) {
                const a = Math.PI * 2 * i / n;
                out.push([c[0] + rx * Math.cos(a) * radius + fx * Math.sin(a) * radius, c[1],
                    c[2] + rz * Math.cos(a) * radius + fz * Math.sin(a) * radius]);
            }
        } else {                                    // stack, straight up
            for (let i = 0; i < n; i++) out.push([c[0], c[1] + i * gap, c[2]]);
        }
        return out;
    }
    // Items take the scale in the spawn call (everyone sees it). A spawned prefab can only be scaled on your side.
    function applyPrefabScale(no) {
        const sc = spawnScalePct / 100;
        if (Math.abs(sc - 1) < 0.01) return;
        try {
            const t = no.method("get_transform", 0).invoke();
            t.method("set_localScale", 1).invoke(makeVec3(sc, sc, sc));
        } catch (_) { }
    }
    function spawnAtPoints(points, rot) {
        let any = false;
        const batch = [];
        for (const pt of points) {
            const v = makeVec3(pt[0], pt[1], pt[2]);
            if (!v) continue;
            if (spawnKind === 0) {
                if (spawnItemAt(ITEM_LIST[spawnItemIndex], v, spawnScalePct / 100)) any = true;
            } else {
                const res = spawnNetworkPrefab(PREFAB_LIST[spawnPrefabIndex], v, rot);
                if (res) {
                    any = true;
                    if (live(res)) { applyPrefabScale(res); batch.push(res); }
                }
            }
        }
        if (batch.length) {
            spawnedBatches.push(batch);
            while (spawnedBatches.length > 100) spawnedBatches.shift();
        }
        return any;
    }
    function undoLastSpawn() {
        const batch = spawnedBatches.pop();
        if (!batch) return false;
        for (const o of batch) despawnOne(o);
        return true;
    }
    // Removes every prefab the spawner put down, plus what the Text and Cage features placed.
    // Spawned items are short effects the game cleans up by itself, there is nothing to remove for those.
    function eraseAllSpawned() {
        let n = spawnedCount() + textObjects.length + ringObjects.length;
        while (spawnedBatches.length) {
            for (const o of spawnedBatches.pop()) despawnOne(o);
        }
        clearText();
        ringClear();
        return n;
    }
    function spawnSelected(atHand) {
        let center = null, dir = null, rot = identityQuaternion;
        if (atHand) {
            const h = hands();
            const pose = handPose();
            if (!h || !pose) return false;
            center = vec(pose.pos); dir = fwdOf(h[1]); rot = pose.rot;
        } else {
            const head = headTransform();
            const p = posOf(head);
            const f = fwdOf(head);
            if (!p || !f) return false;
            center = [p[0] + f[0] * 2.0, p[1] + f[1] * 2.0, p[2] + f[2] * 2.0]; dir = f;
        }
        if (!center || !dir) return false;
        return spawnAtPoints(patternPoints(center, dir), rot);
    }

    // ---------------------------------------------------------------- spawn gun
    // Hold right grip + pull right trigger: spawns the selected item / prefab where your right hand points.
    // Ray = Physics.RaycastAll from the right hand (same way the menu's own spawngun does it), nearest hit wins.
    const GunPhysics = PhysicsImage.class("UnityEngine.Physics");
    let gunRayAll = null, gunRayOut = null, gunRayMode = "none", gunRayReady = false, gunRayBuf = null, gunRayWarned = false;
    function gunRayInit() {
        if (gunRayReady) return;
        gunRayReady = true;
        try {
            for (const m of GunPhysics.methods) {
                if (m.parameterCount === 3 && m.name === "RaycastAll" && !gunRayAll && m.parameters[0].type.name === "UnityEngine.Vector3")
                    gunRayAll = m;
                else if (m.parameterCount === 4 && m.name === "Raycast" && !gunRayOut &&
                    m.parameters[0].type.name === "UnityEngine.Vector3" && m.parameters[2].type.name.includes("RaycastHit"))
                    gunRayOut = m;
            }
        } catch (_) { }
        gunRayMode = gunRayAll ? "all" : gunRayOut ? "out" : "none";
        pzLog("spawn gun raycast: " + gunRayMode);
    }
    function aimHit(o, d) {
        gunRayInit();
        const ov = makeVec3(o[0], o[1], o[2]), dv = makeVec3(d[0], d[1], d[2]);
        if (!ov || !dv) return null;
        if (gunRayMode === "all") {
            try {
                const hits = gunRayAll.invoke(ov, dv, SPAWN_GUN_RANGE);
                const n = hits ? Number(hits.length) : 0;
                let best = null, bestDist = Infinity;
                for (let i = 0; i < n && i < 64; i++) {
                    const hit = hits.get(i);
                    const dist = Number(hit.field("m_Distance").value);
                    if (!(dist >= 0.25) || dist >= bestDist) continue;   // skips the player's own hand / body colliders
                    const pt = vec(hit.field("m_Point").value);
                    if (!pt) continue;
                    best = pt; bestDist = dist;
                }
                return best;
            } catch (e) {
                gunRayMode = gunRayOut ? "out" : "none";
                pzLog("spawn gun: RaycastAll failed, now using " + gunRayMode + " (" + e + ")");
            }
        }
        if (gunRayMode === "out") {
            try {
                if (!gunRayBuf) gunRayBuf = Memory.alloc(0xa0);
                const hit = gunRayOut.invoke(ov, dv, gunRayBuf, SPAWN_GUN_RANGE);
                const dist = hit ? gunRayBuf.add(0x1c).readFloat() : 0;
                if (hit && dist >= 0.25)
                    return [gunRayBuf.readFloat(), gunRayBuf.add(4).readFloat(), gunRayBuf.add(8).readFloat()];
                return null;
            } catch (e) {
                gunRayMode = "none";
                pzLog("spawn gun: Raycast failed, no physics (" + e + ")");
            }
        }
        return null;
    }
    // one ray roughly every 30 ms, shared by the beam, the spawn gun and the teleport gun
    let aimCache = null;
    function aimNow() {
        const t = Date.now();
        if (aimCache && t - aimCache.at < 33) return aimCache;
        const h = hands();
        const o = h ? posOf(h[1]) : null, d = h ? fwdOf(h[1]) : null;
        if (!o || !d) return null;
        aimCache = { at: t, o, d, hit: aimHit(o, d) };
        return aimCache;
    }
    function spawnAtAim() {
        const a = aimNow();
        if (!a) return false;
        let p = a.hit;
        if (!p) {
            if (gunRayMode !== "none") {
                if (!gunRayWarned) { gunRayWarned = true; pzLog("spawn gun: nothing in range (" + SPAWN_GUN_RANGE + "m)"); }
                return false;
            }
            p = [a.o[0] + a.d[0] * SPAWN_GUN_FALLBACK, a.o[1] + a.d[1] * SPAWN_GUN_FALLBACK, a.o[2] + a.d[2] * SPAWN_GUN_FALLBACK];
        }
        gunRayWarned = false;
        return spawnAtPoints(patternPoints([p[0], p[1] + SPAWN_GUN_LIFT, p[2]], a.d), identityQuaternion);
    }
    let spawnGunAt = 0;

    // ---------------------------------------------------------------- teleport gun
    // Hold right grip + press A: teleports you to where your right hand points (the game's own PlayerController.TeleportRig).
    let tpGunAt = 0;
    function teleportToAim() {
        const a = aimNow();
        if (!a || !a.hit) return false;
        const p = [a.hit[0], a.hit[1] + TP_GUN_LIFT, a.hit[2]];
        try {
            const PC = gameClass("PlayerController");
            if (PC) { PC.method("TeleportRig", 3).invoke(makeVec3(p[0], p[1], p[2]), false, 0.0); return true; }
        } catch (e) { pzLog("teleport gun: TeleportRig failed, moving the rig directly (" + e + ")"); }
        const g = localController();
        const cur = g ? posOf(tf(g)) : null;
        return cur ? teleportLocal([p[0] - cur[0], p[1] - cur[1], p[2] - cur[2]]) : false;
    }

    // ---------------------------------------------------------------- aim beam (spawn gun / teleport gun)
    // Shown while you hold right grip with either gun on: gold = spawn gun, purple = teleport gun, red = nothing in range.
    let beamShown = false;
    function tickAimBeam() {
        const api = globalThis.__pluginBeam;
        const spawnOn = PZS.spawnGun && !PZS.targetGun, tpOn = PZS.tpGun;
        if (!api || menuOpen() || !(spawnOn || tpOn) || !rightGrip) {
            if (beamShown) { beamShown = false; try { if (api) api.hide(); } catch (_) { } }
            return;
        }
        const a = aimNow();
        if (!a) return;
        const color = !a.hit ? [1.0, 0.25, 0.25, 0.9] : spawnOn ? [1.0, 0.84, 0.0, 0.95] : [0.7, 0.35, 1.0, 0.95];
        const end = a.hit || [a.o[0] + a.d[0] * 8, a.o[1] + a.d[1] * 8, a.o[2] + a.d[2] * 8];
        beamShown = !!api.show(a.o, end, color, a.hit);
    }

    // ---------------------------------------------------------------- scan the running game for items / prefabs
    // The lists above are a snapshot. This reads what the game really has right now: pool items (with their real
    // indexes, which move when the game updates) and every network prefab in the Fusion prefab table. New things are
    // appended to the end of the lists, so a selection you already made never shifts.
    let scanAt = 0, scanDone = false, scanSampled = false;
    function scanSpawnables() {
        const out = { items: 0, itemsNew: 0, itemsFixed: 0, prefabs: 0, prefabsNew: 0 };
        try {
            const pool = PoolManager.method("get_Instance", 0).invoke();
            const arr = live(pool) ? pool.field("prefabs").value : null;
            const n = arr ? Number(arr.length) : 0;
            const seen = new Set();
            for (let i = 0; i < n; i++) {
                let name = "";
                try {
                    const go = arr.get(i);
                    if (!live(go)) continue;
                    name = managedString(go.method("get_name", 0).invoke());
                } catch (_) { continue; }
                if (!name || seen.has(name)) continue;
                seen.add(name);
                out.items++;
                const known = ITEM_LIST.find((e) => e.name === name);
                if (known) {
                    if (known.index !== i) { known.index = i; out.itemsFixed++; }
                } else {
                    ITEM_LIST.push({ name, index: i });
                    out.itemsNew++;
                }
            }
        } catch (e) { pzLog("scan: pool items failed: " + e); }
        try {
            const runner = getRunner();
            if (runner) {
                const sources = runner.field("_config").value.field("PrefabTable").value.field("_sources").value;
                const count = Number(sources.method("get_Count").invoke());
                const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const known = PREFAB_LIST.map((nm) => new RegExp("(^|[^A-Za-z0-9_])" + esc(nm) + "([^A-Za-z0-9_]|$)"));
                const added = new Set(PREFAB_LIST);
                const samples = [];
                for (let i = 0; i < count; i++) {
                    let desc = "";
                    try { desc = managedString(sources.method("get_Item").invoke(i).method("get_Description").invoke()); }
                    catch (_) { continue; }
                    if (!desc) continue;
                    out.prefabs++;
                    if (samples.length < 3) samples.push(desc);
                    if (added.has(desc) || known.some((re) => re.test(desc))) continue;
                    added.add(desc);
                    PREFAB_LIST.push(desc);
                    out.prefabsNew++;
                }
                if (!scanSampled && samples.length) { scanSampled = true; pzLog("scan: sample prefab descriptions: " + samples.join(" | ")); }
            }
        } catch (e) { pzLog("scan: prefab table failed: " + e); }
        if (out.itemsNew || out.itemsFixed || out.prefabsNew) {
            for (const k of Object.keys(textItemCache)) delete textItemCache[k];
        }
        pzLog("scan: " + out.items + " pool items (" + out.itemsNew + " new, " + out.itemsFixed + " re-indexed), " +
            out.prefabs + " network prefabs (" + out.prefabsNew + " new)");
        return out;
    }
    function tickScan(now) {
        if (scanDone || now < scanAt) return;
        scanAt = now + 5.0;
        const r = scanSpawnables();
        if (r.items > 0 || r.prefabs > 0) scanDone = true;
    }

    // ---------------------------------------------------------------- tick
    // ---------------------------------------------------------------- clones (fake players that follow you)
    const FAKE_NAMES = ["Luna", "Kai", "Mochi", "Ziggy", "Nova", "Pixel", "Ember", "Rook", "Juno", "Echo", "Sprout", "Blip"];
    const CLONE_SETUP_DELAYS = [0.4, 1.2, 2.5];
    const clones = []; // { no, np, name, born, stage }
    const cloneCfg = { count: 4, radius: 2, speed: 60, height: 0, mode: 0, nameStyle: 0 };
    let cloneAngle = 0;

    function getRunner() {
        try {
            const NetworkRunner = Il2Cpp.domain.assembly("Fusion.Runtime").image.class("Fusion.NetworkRunner");
            const instances = NetworkRunner.field("_instances").value;
            if (!live(instances) || Number(instances.method("get_Count").invoke()) === 0) return null;
            return instances.method("get_Item").invoke(0);
        } catch (_) { return null; }
    }
    function makeVec3(x, y, z) {
        try {
            const v = headTransform().method("get_position", 0).invoke();
            v.field("x").value = x;
            v.field("y").value = y;
            v.field("z").value = z;
            return v;
        } catch (_) { return null; }
    }
    function myBaseName() {
        if (originalName) return originalName;
        const tag = findLocalNameTag();
        const n = tag ? readName(tag).replace(/<[^>]*>/g, "").trim() : "";
        return n || "Player";
    }
    function cloneNameFor(i) {
        const s = cloneCfg.nameStyle;
        if (s === 1) return FAKE_NAMES[i % FAKE_NAMES.length];
        if (s === 2) return myBaseName() + " " + (i + 1);
        if (s === 3) return myBaseName();
        return "Clone " + (i + 1);
    }
    function cloneComponent(c) {
        if (alive(c.np)) return c.np;
        let np = getComp(c.no, NetworkPlayer);
        if (!alive(np)) {
            try {
                np = c.no.method("GetComponentInChildren", 2)
                    .overload("System.Type", "System.Boolean")
                    .invoke(NetworkPlayer.type.object, true);
            } catch (_) { np = null; }
        }
        c.np = alive(np) ? np : null;
        return c.np;
    }
    function runCloneSetup(c) {
        const np = cloneComponent(c);
        if (!np) return false;
        const p = posOf(tf(np)) || [0, 0, 0];
        call(np, "set_PlayerName", [str(c.name)]);
        call(np, "set_DLAR_Player_Health", [200]);
        call(np, "RPC_ClientRevive", [p, 0.0]);
        call(np, "RPC_SetPlayerAvatarLayer", [str("MyNetworkAvatar")]);
        call(np, "RPC_ShowBodyParts", [np]);
        return true;
    }
    function despawnClones() {
        const runner = getRunner();
        for (const c of clones) {
            try {
                if (!live(c.no)) continue;
                call(c.no, "RequestStateAuthority");
                if (runner) runner.method("Despawn").invoke(c.no);
            } catch (_) { }
        }
        clones.length = 0;
    }
    function spawnClones() {
        despawnClones();
        const me = localController();
        const c0 = me ? posOf(tf(me)) : null;
        if (!c0) return 0;
        const n = Math.max(1, Math.min(8, cloneCfg.count));
        const now = Number(Time.method("get_time", 0).invoke());
        for (let i = 0; i < n; i++) {
            const pos = makeVec3(c0[0], c0[1], c0[2]);
            if (!pos) break;
            const result = spawnNetworkPrefab("NetworkPlayer", pos, identityQuaternion);
            if (!live(result)) {
                pzLog("clone " + (i + 1) + " did not spawn (no runner, or the prefab was not found)");
                continue;
            }
            clones.push({ no: result, np: null, name: cloneNameFor(i), born: now, stage: 0 });
        }
        pzLog("spawned " + clones.length + " clone(s), setup runs over the next few seconds");
        return clones.length;
    }
    function renameClones() {
        let n = 0;
        clones.forEach((c, i) => {
            c.name = cloneNameFor(i);
            const np = cloneComponent(c);
            if (np && call(np, "set_PlayerName", [str(c.name)])) n++;
        });
        return n;
    }
    function dumpClones() {
        const RendererClass = Core.class("UnityEngine.Renderer");
        const ComponentClass = Core.class("UnityEngine.Component");
        const me = localController();
        const mine = me ? posOf(tf(me)) : null;
        pzLog("dump: " + clones.length + " clone(s), my position " + (mine ? mine.map(v => v.toFixed(1)).join(",") : "unknown"));
        clones.forEach((c, i) => {
            const parts = [];
            parts.push("#" + (i + 1) + " " + c.name);
            parts.push("objectAlive=" + alive(c.no));
            const np = cloneComponent(c);
            parts.push("networkPlayerFound=" + !!np);
            const root = alive(np) ? np : c.no;
            try {
                const go = root.method("get_gameObject", 0).invoke();
                parts.push("active=" + !!go.method("get_activeInHierarchy", 0).invoke());
                parts.push("layer=" + Number(go.method("get_layer", 0).invoke()));
                const pos = posOf(tf(root));
                parts.push("pos=" + (pos ? pos.map(v => v.toFixed(1)).join(",") : "?"));
                if (pos && mine) {
                    const d = Math.sqrt((pos[0] - mine[0]) ** 2 + (pos[1] - mine[1]) ** 2 + (pos[2] - mine[2]) ** 2);
                    parts.push("distanceFromMe=" + d.toFixed(1));
                }
                parts.push("children=" + Number(tf(root).method("get_childCount", 0).invoke()));
                try {
                    const rs = go.method("GetComponentsInChildren", 2).overload("System.Type", "System.Boolean")
                        .invoke(RendererClass.type.object, true);
                    parts.push("renderers=" + arrayValues(rs).length);
                } catch (_) { parts.push("renderers=?"); }
                try {
                    const comps = go.method("GetComponents", 1).overload("System.Type").invoke(ComponentClass.type.object);
                    parts.push("components=[" + arrayValues(comps).map(x => String(x.class.name)).join(", ") + "]");
                } catch (_) { }
            } catch (e) { parts.push("error=" + e); }
            const auth = (t) => {
                const a = methodBool(t, ["get_HasStateAuthority"]);
                const b = methodBool(t, ["get_HasInputAuthority"]);
                return "state=" + a + " input=" + b;
            };
            parts.push("authority(object): " + auth(c.no));
            pzLog(parts.join(" | "));
        });
    }
    function tickClones(now, dt) {
        if (clones.length === 0) return;
        const me = localController();
        const c = me ? posOf(tf(me)) : null;
        if (!c) return;
        const n = clones.length;
        cloneAngle = (cloneAngle + cloneCfg.speed * dt) % 360;
        const r = cloneCfg.radius, h = cloneCfg.height, mode = cloneCfg.mode;
        const f = headForwardFlat();
        const rad = Math.PI / 180.0;
        for (let i = n - 1; i >= 0; i--) {
            const clone = clones[i];
            if (!alive(clone.no)) { clones.splice(i, 1); continue; }
            if (clone.stage < CLONE_SETUP_DELAYS.length && now - clone.born > CLONE_SETUP_DELAYS[clone.stage]) {
                const ok = runCloneSetup(clone);
                if (clone.stage === 0 && !ok) pzLog("clone " + clone.name + ": no DLARX_NetworkPlayer component found on it yet");
                clone.stage++;
            }
            let x, y, z, yaw;
            if (mode === 2) { // conga line behind you
                const dist = Math.max(0.6, r * 0.5) * (i + 1);
                x = c[0] - f[0] * dist; z = c[2] - f[2] * dist; y = c[1] + h;
                yaw = Math.atan2(f[0], f[2]) / rad;
            } else if (mode === 4) { // wall in front, facing you
                const off = (i - (n - 1) / 2) * 0.9;
                x = c[0] + f[0] * r + f[2] * off; z = c[2] + f[2] * r - f[0] * off; y = c[1] + h;
                yaw = Math.atan2(-f[0], -f[2]) / rad;
            } else {
                const spin = (mode === 1 || mode === 5) ? 0 : cloneAngle;
                const a = (spin + (i * 360) / n) * rad;
                const rr = mode === 3 ? r * (0.5 + (i / n) * 1.5) : r;
                x = c[0] + Math.cos(a) * rr; z = c[2] + Math.sin(a) * rr; y = c[1] + h;
                if (mode === 3) y += (i / n) * 3.0;
                if (mode === 5) y += Math.abs(Math.sin(now * 3.0 + i)) * 1.5;
                yaw = Math.atan2(c[0] - x, c[2] - z) / rad;
            }
            try {
                const t = tf(alive(clone.np) ? clone.np : clone.no);
                t.method("set_position", 1).invoke([x, y, z]);
                t.method("set_rotation", 1).invoke(Quaternion.method("Euler", 3).invoke(0, yaw, 0));
            } catch (_) { }
        }
    }

    // ---------------------------------------------------------------- text (words made out of spawned things)
    // 3x5 dot font. every lit dot is one spawn, so the length is capped to keep the lobby sane.
    const GLYPHS3 = {
        A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110",
        E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101",
        I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111",
        M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100",
        Q: "010101101111011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
        U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
        Y: "101101010010010", Z: "111001010100111",
        "0": "111101101101111", "1": "010110010010111", "2": "110001010100111", "3": "110001010001110",
        "4": "101101111001001", "5": "111100110001110", "6": "011100111101111", "7": "111001010010010",
        "8": "111101111101111", "9": "111101111001110",
        "!": "010010010000010", "?": "110001010000010", ".": "000000000000010", "-": "000000111000000",
        " ": "000000000000000",
    };
    const TEXT_MAX_DOTS = 120;
    const textCfg = { group: 0, perItem: 10, drawKey: 0, drawStep: 0.12 };
    const textItemCache = {};
    let dotCounter = 0;
    // each item type only has so many live instances, so dots are spread over several item types
    function itemsForGroup(g) {
        if (g === 0) return [ITEM_LIST[spawnItemIndex]];
        if (textItemCache[g]) return textItemCache[g];
        const prefix = [null, "VFX_BulletTrail", "VFX_MuzzleFlash", "VFX_Impact_"][g];
        const list = g === 4
            ? ITEM_LIST.filter(i => !/^(PRFB_Casing|UIDamage)/.test(i.name))
            : ITEM_LIST.filter(i => i.name.indexOf(prefix) === 0);
        return (textItemCache[g] = list.length ? list : [ITEM_LIST[spawnItemIndex]]);
    }
    function textCapacity() {
        if (spawnKind !== 0) return TEXT_MAX_DOTS;
        return Math.min(240, itemsForGroup(textCfg.group).length * textCfg.perItem);
    }
    function despawnOne(o) {
        const runner = getRunner();
        try {
            if (!live(o)) return;
            call(o, "RequestStateAuthority");
            if (runner) runner.method("Despawn").invoke(o);
        } catch (_) { }
    }
    const TEXT_PER_FRAME = 2;
    const textJobs = [];    // pending dot positions [x,y,z]
    const textObjects = []; // spawned network objects (prefab mode), so they can be removed again
    function crossV(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    function placeText(str, opts) {
        textJobs.length = 0;
        const clean = String(str || "").toUpperCase().split("").filter(ch => GLYPHS3[ch] !== undefined);
        if (clean.length === 0) return 0;
        const head = headTransform();
        const hp = posOf(head);
        if (!hp) return 0;
        const f = headForwardFlat();
        const right = crossV([0, 1, 0], f);
        const rm = Math.sqrt(right[0] * right[0] + right[1] * right[1] + right[2] * right[2]) || 1;
        const r = [right[0] / rm, right[1] / rm, right[2] / rm];
        const spacing = Math.max(0.05, opts.spacing || 0.25);
        const center = [hp[0] + f[0] * opts.dist, hp[1] + (opts.height || 0), hp[2] + f[2] * opts.dist];
        const cols = clean.length * 4 - 1;
        const dots = [];
        clean.forEach((ch, ci) => {
            const g = GLYPHS3[ch];
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 3; col++) {
                    if (g[row * 3 + col] !== "1") continue;
                    const cx = ci * 4 + col - (cols - 1) / 2;
                    const cy = 2 - row;
                    dots.push([
                        center[0] + r[0] * cx * spacing,
                        center[1] + cy * spacing,
                        center[2] + r[2] * cx * spacing,
                    ]);
                }
            }
        });
        const cap = textCapacity();
        if (dots.length > cap) {
            pzLog("text too long: " + dots.length + " dots, the limit with this setup is " + cap + ". spread over more item types or raise Max Per Item");
            return -1;
        }
        for (const d of dots) textJobs.push(d);
        pzLog("placing \"" + clean.join("") + "\" with " + dots.length + " " + (spawnKind === 0 ? "items" : "prefabs"));
        return dots.length;
    }
    function tickText() {
        for (let n = 0; n < TEXT_PER_FRAME && textJobs.length > 0; n++) {
            const d = textJobs.shift();
            if (spawnKind === 0) {
                const pool = itemsForGroup(textCfg.group);
                spawnItemAt(pool[dotCounter++ % pool.length], d);
            } else {
                const v = makeVec3(d[0], d[1], d[2]);
                if (!v) continue;
                const res = spawnNetworkPrefab(PREFAB_LIST[spawnPrefabIndex], v, identityQuaternion);
                if (live(res)) textObjects.push(res);
                while (textObjects.length > 80) despawnOne(textObjects.shift());
            }
        }
    }
    function clearText() {
        textJobs.length = 0;
        const runner = getRunner();
        for (const o of textObjects) {
            try {
                if (!live(o)) continue;
                call(o, "RequestStateAuthority");
                if (runner) runner.method("Despawn").invoke(o);
            } catch (_) { }
        }
        textObjects.length = 0;
    }


    // ---------------------------------------------------------------- cannon ring
    // Pick a player (list or the one you point at) and wall them in with a cage of spawned cannons:
    // stacked rings (every other ring shifted half a step so the gaps line up like bricks), plus a lid and a floor.
    const ringCfg = { kind: 1, prefab: Math.max(0, PREFAB_LIST.indexOf("CannonWorldItem")), item: 0, radius: 1.8, size: 0.9, height: 2.2, caps: true, perFrame: 3, maxTotal: 170 };
    let ringTarget = null, ringList = [];
    const ringJobs = [];     // { p: [x,y,z], d: [x,y,z] }  position and the direction it should face (towards the player)
    const ringObjects = [];  // spawned network objects (prefab mode), so Clear can remove them again
    function ringTargetName() {
        if (!ringTarget || !alive(ringTarget)) return "(none)";
        try { return playerNameOf(ringTarget) || "player"; } catch (_) { return "player"; }
    }
    function ringRefresh() {
        ringList = otherPlayers();
        return ringList.map((p, i) => { let n = ""; try { n = playerNameOf(p); } catch (_) { } return (i + 1) + ". " + (n || "player"); });
    }
    function ringSelectIndex(i) {
        const p = ringList[i];
        if (!p || !alive(p)) return false;
        ringTarget = p; return true;
    }
    function ringPickAimed() {
        const t = aimTarget(30);
        if (!t) return false;
        ringTarget = t; return true;
    }
    function ringPoints(c) {
        const R = Math.max(0.6, ringCfg.radius), S = Math.max(0.3, ringCfg.size), H = Math.max(S, ringCfg.height);
        const pts = [];
        const layers = Math.max(1, Math.round(H / S));
        const ringAt = (y, rad, phase) => {
            const n = Math.max(6, Math.ceil(2 * Math.PI * rad / S));
            for (let k = 0; k < n; k++) {
                const a = phase * (2 * Math.PI / n) + k * 2 * Math.PI / n;
                pts.push([c[0] + rad * Math.cos(a), y, c[2] + rad * Math.sin(a)]);
            }
        };
        for (let l = 0; l < layers; l++) ringAt(c[1] - H / 2 + (l + 0.5) * (H / layers), R, (l % 2) * 0.5);
        if (ringCfg.caps) {
            for (const y of [c[1] + H / 2 + S * 0.5, c[1] - H / 2 - S * 0.5]) {
                pts.push([c[0], y, c[2]]);
                for (let rr = S; rr <= R - S * 0.4; rr += S) ringAt(y, rr, 0);
            }
        }
        return pts;
    }
    function ringBuild() {
        if (!ringTarget || !alive(ringTarget)) { pzLog("cannon ring: pick a player first"); return -2; }
        const c = playerPos(ringTarget);
        if (!c) return -2;
        const pts = ringPoints(c);
        if (pts.length > ringCfg.maxTotal) {
            pzLog("cannon ring: that needs " + pts.length + " cannons (limit " + ringCfg.maxTotal + "). make the cannons bigger or the ring smaller");
            return -1;
        }
        ringJobs.length = 0;
        for (const p of pts) {
            const dx = c[0] - p[0], dy = c[1] - p[1], dz = c[2] - p[2], len = Math.hypot(dx, dy, dz) || 1;
            ringJobs.push({ p, d: [dx / len, dy / len, dz / len] });
        }
        pzLog("cannon ring: placing " + pts.length + " around " + ringTargetName());
        return pts.length;
    }
    function tickRing() {
        for (let n = 0; n < ringCfg.perFrame && ringJobs.length > 0; n++) {
            const j = ringJobs.shift();
            const v = makeVec3(j.p[0], j.p[1], j.p[2]);
            if (!v) continue;
            if (ringCfg.kind === 0) { spawnItemAt(ITEM_LIST[ringCfg.item], v); continue; }
            let rot = identityQuaternion;
            try {
                const dv = makeVec3(j.d[0], j.d[1], j.d[2]);
                if (dv) rot = Quaternion.method("LookRotation", 1).invoke(dv);
            } catch (_) { rot = identityQuaternion; }
            const res = spawnNetworkPrefab(PREFAB_LIST[ringCfg.prefab], v, rot);
            if (live(res)) ringObjects.push(res);
        }
    }
    function ringClear() {
        ringJobs.length = 0;
        for (const o of ringObjects) despawnOne(o);
        ringObjects.length = 0;
    }

    // ---------------------------------------------------------------- air drawing
    let drawPrev = null;
    function drawKeyDown() {
        try {
            if (textCfg.drawKey === 0) return !!ui.input.primary(1);
            if (textCfg.drawKey === 1) return !!ui.input.primary(0);
            return !!ui.input.trigger(1) && ui.input.trigger(1) > 0.5;
        } catch (_) { return false; }
    }
    function tickDraw() {
        if (!PZS.airDraw) { drawPrev = null; return; }
        if (menuOpen() || !drawKeyDown()) { drawPrev = null; return; }
        const h = hands();
        const p = h ? posOf(h[1]) : null;
        if (!p) return;
        if (!drawPrev || Math.hypot(p[0] - drawPrev[0], p[1] - drawPrev[1], p[2] - drawPrev[2]) >= textCfg.drawStep) {
            if (textJobs.length < 40) { textJobs.push(p); drawPrev = p; }
        }
    }

    // ---------------------------------------------------------------- nametags (menu theme colours)
    const TextRenderImage = Il2Cpp.domain.assembly("UnityEngine.TextRenderingModule").image;
    const TextMeshCls = TextRenderImage.class("UnityEngine.TextMesh");
    const FontCls = TextRenderImage.class("UnityEngine.Font");
    const RendererCls2 = Core.class("UnityEngine.Renderer");
    const ResourcesCls = Core.class("UnityEngine.Resources");
    const MaterialCls2 = Core.class("UnityEngine.Material");
    const PhysicsCls2 = PhysicsImage.class("UnityEngine.Physics");
    const CameraCls2 = Camera;
    const ClipboardWeaponCls = gameClass("ClipboardWeapon");
    const tagCfg = { name: true, health: true, dist: true, id: false, maxDist: 60, size: 100, walls: true, shadow: true };
    const tags = new Map();
    let tagFont = null, tagMat = null;

    function themeCol(key, fallback) {
        try { const c = ui.style.colors[key]; if (c && c.length >= 3) return c; } catch (_) { }
        return fallback;
    }
    function toNum(v, depth) {
        depth = depth || 0;
        if (v === null || v === undefined || depth > 3) return NaN;
        if (typeof v === "number") return v;
        if (typeof v === "bigint") return Number(v);
        try { const n = Number(v); if (isFinite(n)) return n; } catch (_) { }
        for (const f of ["value__", "value", "_value", "Value", "<Value>k__BackingField"]) {
            try { const n = toNum(v.field(f).value, depth + 1); if (isFinite(n)) return n; } catch (_) { }
        }
        for (const m of ["get_Value", "get_CurrentValue", "get_RawValue"]) {
            try { const n = toNum(v.method(m, 0).invoke(), depth + 1); if (isFinite(n)) return n; } catch (_) { }
        }
        return NaN;
    }
    function playerNameOf(p) {
        try {
            const r = NetworkPlayer.method("GetKillFeedPlayerName", 2).invoke(p, str("Player"));
            const t = managedString(r).replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
            if (t) return t.slice(0, 24);
        } catch (_) { }
        return "Player";
    }
    function playerIdOf(p) {
        try {
            const v = p.method("get_DeadeyeAccountID", 0).invoke();
            const t = String(v);
            if (t && t !== "0" && t !== "null") return "acct " + t;
        } catch (_) { }
        try {
            const o = p.method("get_Object", 0).invoke();
            const id = o.field("Id").value;
            let t = "";
            try { t = managedString(id.box().method("ToString", 0).invoke()); } catch (_) { t = String(id); }
            if (t) return "net " + t;
        } catch (_) { }
        return "";
    }
    function playerHealthOf(p) {
        try { return toNum(p.method("get_DLAR_Player_Health", 0).invoke()); } catch (_) { return NaN; }
    }
    function playerHeadOf(p) {
        try {
            if (ClipboardWeaponCls) {
                const a = vec(ClipboardWeaponCls.method("GetPlayerBodyHeadCenter", 1).invoke(p));
                if (a) return a;
            }
        } catch (_) { }
        const b = posOf(tf(p));
        return b ? [b[0], b[1] + 1.7, b[2]] : null;
    }
    let tagFontLogged = false;
    function nameOfFontObj(f) { try { return managedString(f.method("get_name", 0).invoke()); } catch (_) { return ""; } }
    function loadedFonts() {
        try {
            return arrayValues(ResourcesCls.method("FindObjectsOfTypeAll", 1).overload("System.Type").invoke(FontCls.type.object));
        } catch (_) { return []; }
    }
    // try to borrow the menu's own font if the menu exposes one (object or font name)
    function menuFontFromUi() {
        const objs = [], names = [];
        const keys = ["font", "fontObject", "unityFont", "fontName"];
        try { const st = ui.style || {}; for (const k of keys) if (st[k]) (typeof st[k] === "string" ? names : objs).push(st[k]); } catch (_) { }
        try { for (const k of keys) if (ui[k]) (typeof ui[k] === "string" ? names : objs).push(ui[k]); } catch (_) { }
        for (const o of objs) { try { if (alive(o) && o.class && o.class.name === "Font") return o; } catch (_) { } }
        if (names.length) {
            const fonts = loadedFonts();
            for (const n of names) {
                const f = fonts.find(x => nameOfFontObj(x).toLowerCase() === String(n).toLowerCase());
                if (f) return f;
            }
        }
        return null;
    }
    function getTagFont() {
        if (alive(tagFont)) return tagFont;
        tagFont = null;
        if (!tagFontLogged) {
            tagFontLogged = true;
            try { pzLog("nametags: ui.style keys = " + Object.keys(ui.style || {}).join(",")); } catch (_) { }
            try { pzLog("nametags: loaded fonts = " + loadedFonts().slice(0, 25).map(nameOfFontObj).join(" | ")); } catch (_) { }
        }
        const mf = menuFontFromUi();
        if (mf) { tagFont = mf; pzLog("nametags: using the menu font (" + nameOfFontObj(mf) + ")"); return tagFont; }
        // builtin font next, same as the HP labels (named fonts from the game can be icon/symbol fonts)
        for (const n of ["LegacyRuntime.ttf", "Arial.ttf"]) {
            try {
                const f = ResourcesCls.method("GetBuiltinResource", 2).overload("System.Type", "System.String")
                    .invoke(FontCls.type.object, str(n));
                if (live(f)) { tagFont = f; return tagFont; }
            } catch (_) { }
        }
        const fonts = loadedFonts();
        for (const pref of ["Arial", "Roboto-Regular", "LiberationSans", "NotoSans"]) {
            const f = fonts.find(x => nameOfFontObj(x).toLowerCase() === pref.toLowerCase());
            if (f) { tagFont = f; break; }
        }
        if (!tagFont) {
            for (const f of fonts) {
                if (/arial|roboto|liberation|noto|sans/.test(nameOfFontObj(f).toLowerCase())) { tagFont = f; break; }
            }
        }
        return tagFont;
    }
    function tagMatFloat(m, name, v) {
        try { m.method("SetFloat", 2).overload("System.String", "System.Single").invoke(str(name), v); } catch (_) { }
        try { m.method("SetInt", 2).overload("System.String", "System.Int32").invoke(str(name), Math.trunc(v)); } catch (_) { }
    }
    function getTagMaterial() {
        // Private copy of the font material: ignores depth, doesn't write depth, draws on top.
        // The shared font material stays untouched.
        if (alive(tagMat)) return tagMat;
        tagMat = null;
        try {
            const font = getTagFont();
            if (!alive(font)) return null;
            const fontMat = font.method("get_material", 0).invoke();
            if (!alive(fontMat)) return null;
            try {
                const m = MaterialCls2.alloc();
                m.method(".ctor", 1).overload("UnityEngine.Material").invoke(fontMat);
                for (const n of ["_ZTest", "_ZTestMode", "unity_GUIZTestMode"]) tagMatFloat(m, n, 8);
                tagMatFloat(m, "_ZWrite", 0);
                tagMatFloat(m, "_Cull", 0);
                try { m.method("set_renderQueue", 1).invoke(5000); } catch (_) { }
                if (alive(m)) {
                    tagMat = m;
                    try {
                        const sh = managedString(m.method("get_shader", 0).invoke().method("get_name", 0).invoke());
                        let zt = "?";
                        try { zt = String(m.method("GetFloat", 1).overload("System.String").invoke(str("unity_GUIZTestMode"))); } catch (_) { }
                        pzLog("nametags: see-through material ready, shader=" + sh + " unity_GUIZTestMode=" + zt);
                    } catch (_) { }
                    return tagMat;
                }
            } catch (_) { }
            tagMat = fontMat; // fallback: shared material (the wall pull-forward still covers walls)
            pzLog("nametags: could not clone the font material, using the shared one");
            return tagMat;
        } catch (_) { return null; }
    }
    function makeTextMesh(name) {
        let go = null;
        try {
            go = GameObject.alloc();
            go.method(".ctor", 1).invoke(str(name));
        } catch (_) { return null; }
        const tm = addComp(go, TextMeshCls);
        if (!alive(tm)) { destroy(go); return null; }
        const font = getTagFont();
        if (alive(font)) { try { tm.method("set_font", 1).invoke(font); } catch (_) { } }
        try { tm.method("set_fontSize", 1).invoke(64); } catch (_) { }
        try { tm.method("set_characterSize", 1).invoke(0.032); } catch (_) { }
        try { tm.method("set_fontStyle", 1).invoke(1); } catch (_) { }
        try { tm.method("set_anchor", 1).invoke(4); } catch (_) { }
        try { tm.method("set_alignment", 1).invoke(1); } catch (_) { }
        try { tm.method("set_richText", 1).invoke(true); } catch (_) { }
        const ren = getComp(go, RendererCls2);
        return { go, tm, tr: tf(go), ren };
    }
    // TextMesh resets its renderer to the font's material whenever the text or font is rebuilt,
    // which is what put the tags back behind walls. Re-apply ours after every text change.
    function applyTagMat(m, order) {
        if (!m || !alive(m.ren)) return;
        const mat = getTagMaterial();
        if (alive(mat)) { try { m.ren.method("set_sharedMaterial", 1).invoke(mat); } catch (_) { } }
        try { m.ren.method("set_sortingOrder", 1).invoke(order); } catch (_) { }
        try { m.ren.method("set_enabled", 1).invoke(true); } catch (_) { }
    }
    function setTagText(m, text, order) {
        try { m.tm.method("set_text", 1).invoke(str(text)); } catch (_) { }
        applyTagMat(m, order);
    }
    function ensureTag(key) {
        let t = tags.get(key);
        if (t && alive(t.main.go) && (!!t.shadow === !!tagCfg.shadow)) return t;
        if (t) { destroyTag(t); tags.delete(key); }
        const main = makeTextMesh("PizzaTag");
        if (!main) return null;
        let shadow = null;
        if (tagCfg.shadow) {
            shadow = makeTextMesh("PizzaTagShadow");
            if (shadow) {
                try {
                    shadow.tr.method("SetParent", 2).invoke(main.tr, false);
                    shadow.tr.method("set_localPosition", 1).invoke([0.012, -0.012, 0.012]);
                    shadow.tr.method("set_localScale", 1).invoke([1, 1, 1]);
                    shadow.tm.method("set_color", 1).invoke([0, 0, 0, 0.85]);
                } catch (_) { }
            }
        }
        t = { main, shadow, label: "", colorKey: "", at: -999, blocked: false, seed: tags.size, mul: 1, maxHp: 100 };
        applyTagMat(main, 32767);
        if (shadow) applyTagMat(shadow, 32766);
        tags.set(key, t);
        return t;
    }
    function destroyTag(t) {
        if (t && t.main && alive(t.main.go)) destroy(t.main.go); // shadow is a child, goes with it
    }
    function clearTags() {
        for (const t of tags.values()) destroyTag(t);
        tags.clear();
    }
    function hex2(v) { const n = Math.max(0, Math.min(255, Math.round(v * 255))); return (n < 16 ? "0" : "") + n.toString(16); }
    function hpHex(r) {
        r = Math.max(0, Math.min(1, r));
        let a, b, f;
        if (r >= 0.5) { a = [1, 0.85, 0.25]; b = [0.3, 0.95, 0.45]; f = (r - 0.5) / 0.5; }
        else { a = [1, 0.3, 0.3]; b = [1, 0.85, 0.25]; f = r / 0.5; }
        return hex2(a[0] + (b[0] - a[0]) * f) + hex2(a[1] + (b[1] - a[1]) * f) + hex2(a[2] + (b[2] - a[2]) * f);
    }
    let linecastFailed = false;
    function lineBlocked(a, b) {
        if (linecastFailed) return false;
        try {
            return !!PhysicsCls2.method("Linecast", 2).overload("UnityEngine.Vector3", "UnityEngine.Vector3").invoke(a, b);
        } catch (_) { linecastFailed = true; pzLog("nametags: Physics.Linecast unavailable, wall pull-forward off"); return false; }
    }
    function tickTags(frame) {
        if (!PZS.nametags) { if (tags.size) clearTags(); return; }
        const cam = headTransform();
        const camPos = posOf(cam);
        if (!camPos) return;
        let camRot = null;
        try { camRot = cam.method("get_rotation", 0).invoke(); } catch (_) { return; }
        const textColor = themeCol("Text", [1, 1, 1, 1]);
        const colorKey = textColor.slice(0, 4).map(v => Number(v).toFixed(3)).join(",");
        const seen = new Set();
        const list = otherPlayers().slice(0, 20);
        for (const p of list) {
            let key = "";
            try { key = String(p.handle); } catch (_) { continue; }
            const head = playerHeadOf(p);
            if (!head) continue;
            const tagPos = [head[0], head[1] + 0.35, head[2]];
            const dx = tagPos[0] - camPos[0], dy = tagPos[1] - camPos[1], dz = tagPos[2] - camPos[2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
            if (dist > tagCfg.maxDist) continue;
            const t = ensureTag(key);
            if (!t) continue;
            seen.add(key);
            if (t.colorKey !== colorKey) {
                try { t.main.tm.method("set_color", 1).invoke(textColor); } catch (_) { }
                t.colorKey = colorKey;
            }
            if (frame - t.at >= 10) {
                t.at = frame;
                const nameTxt = tagCfg.name ? playerNameOf(p).replace(/[<>]/g, "") : "";
                let hpTxt = "", hpCol = "ffffff";
                if (tagCfg.health) {
                    const hp = playerHealthOf(p);
                    if (isFinite(hp)) {
                        t.maxHp = Math.max(t.maxHp, hp);
                        hpTxt = "HP " + Math.round(hp);
                        hpCol = hpHex(hp / t.maxHp);
                    }
                }
                const distTxt = tagCfg.dist ? Math.round(dist) + " m" : "";
                const idTxt = tagCfg.id ? playerIdOf(p).replace(/[<>]/g, "") : "";
                const mk = (colored) => {
                    const lines = [];
                    if (nameTxt) lines.push(nameTxt);
                    const info = [];
                    if (hpTxt) info.push(colored ? "<color=#" + hpCol + ">" + hpTxt + "</color>" : hpTxt);
                    if (distTxt) info.push(colored ? "<color=#c8c8c8>" + distTxt + "</color>" : distTxt);
                    if (info.length) lines.push("<size=44>" + info.join("  \u00b7  ") + "</size>");
                    if (idTxt) lines.push("<size=36>" + (colored ? "<color=#9a9a9a>" + idTxt + "</color>" : idTxt) + "</size>");
                    return lines.join("\n");
                };
                const label = mk(true);
                if (label !== t.label) {
                    t.label = label;
                    setTagText(t.main, label, 32767);
                    if (t.shadow) setTagText(t.shadow, mk(false), 32766);
                }
            }
            // through walls: if something solid is between the camera and the tag, pull the tag
            // forward along the same line of sight and shrink it so it looks the same size
            const ux = dx / dist, uy = dy / dist, uz = dz / dist;
            let place = tagPos, mul = 1;
            if (tagCfg.walls && dist > 2.5) {
                if ((frame + t.seed) % 3 === 0) {
                    t.blocked = lineBlocked(camPos, [tagPos[0] - ux * 1.0, tagPos[1] - uy * 1.0, tagPos[2] - uz * 1.0]);
                }
                if (t.blocked) {
                    const R = Math.min(2.0, dist * 0.5);
                    place = [camPos[0] + ux * R, camPos[1] + uy * R, camPos[2] + uz * R];
                    mul = R / dist;
                }
            }
            try {
                t.main.tr.method("set_position", 1).invoke(place);
                t.main.tr.method("set_rotation", 1).invoke(camRot);
                if (frame % 5 === 0 || !t.scaled || t.mul !== mul) {
                    const sc = Math.max(0.8, Math.min(16, dist * 0.04)) * (tagCfg.size / 100) * mul;
                    t.main.tr.method("set_localScale", 1).invoke([sc, sc, sc]);
                    t.scaled = true;
                    t.mul = mul;
                }
            } catch (_) { }
        }
        for (const [key, t] of Array.from(tags.entries())) {
            if (!seen.has(key)) { destroyTag(t); tags.delete(key); }
        }
    }

    // ---------------------------------------------------------------- panic
    const panicCfg = { chord: 0, plugins: true, presets: true, close: true };
    let panicHeld = 0, panicLatched = false, panicLastAt = 0;
    function runPanic() {
        for (const k of Object.keys(PZS)) { if (PZS[k]) setToggle(k, false); }
        despawnClones();
        clearText();
        clearTags();
        if (panicCfg.plugins) {
            try { if (globalThis.plugins && globalThis.plugins.off) globalThis.plugins.off("animal_rivals"); } catch (_) { }
        }
        if (panicCfg.presets) { try { if (ui && ui.presetsOff) ui.presetsOff(); } catch (_) { } }
        if (panicCfg.close) { try { if (ui && ui.closeMenu) ui.closeMenu("panic"); } catch (_) { } }
        try { ui.notify("Everything is off.", 4, "warning", "Panic"); } catch (_) { }
        pzLog("panic ran");
        return true;
    }
    function panicChordDown() {
        const i = ui.input;
        if (panicCfg.chord === 0) return i.primary(0) && i.primary(1) && i.secondary(1);
        if (panicCfg.chord === 1) return i.grip(0) && i.grip(1) && i.primary(1);
        return i.stickClick(0) && i.primary(1) && i.secondary(1);
    }
    function panicCheck() {
        const now = Date.now();
        const dt = Math.min(0.2, Math.max(0, (now - panicLastAt) / 1000));
        panicLastAt = now;
        let down = false;
        try { down = !!panicChordDown(); } catch (_) { }
        if (!down) { panicHeld = 0; panicLatched = false; return; }
        panicHeld += dt;
        if (panicHeld >= 0.5 && !panicLatched) { panicLatched = true; runPanic(); }
    }

    let lastFrame = -1;
    let killAuraAt = 0, reviveAt = 0, silentAt = 0, gunAt = 0, spawnAt = 0, spreadFrame = 0;
    let prevNoclip = false, prevFreecam = false;
    let ticking = false;
    function tick() {
        const frame = Number(Time.method("get_frameCount", 0).invoke());
        if (frame === lastFrame) return;
        lastFrame = frame;
        const now = Number(Time.method("get_time", 0).invoke());
        const dt = Number(Time.method("get_deltaTime", 0).invoke());
        if (!live(localController())) return;
        updateInput();

        if (PZS.noclip) { tickNoclip(dt); prevNoclip = true; }
        else if (prevNoclip) { stopNoclip(); prevNoclip = false; }

        if (PZS.freecam) { tickFreecam(dt); prevFreecam = true; }
        else if (prevFreecam) { stopFreecam(); prevFreecam = false; }

        if (PZS.killAura && now > killAuraAt) {
            killAuraAt = now + KILL_AURA_INTERVAL;
            const origin = localHeadPos();
            for (const p of otherPlayers()) {
                const pos = posOf(tf(p));
                if (!pos) continue;
                const dx = pos[0] - origin[0], dy = pos[1] - origin[1], dz = pos[2] - origin[2];
                if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= KILL_AURA_RANGE)
                    call(p, "RPC_ReportKill", [p, p, str(KILL_REASON), 0.1]);
            }
        }

        if (PZS.autoRevive && now > reviveAt) {
            reviveAt = now + AUTO_REVIVE_INTERVAL;
            call(localNetworkPlayer(), "RPC_ClientRevive", [localHeadPos(), 0.0]);
        }

        if (PZS.silentAim && rightTrigger && !menuOpen() && now > silentAt) {
            const target = aimTarget(AIM_CONE_DEGREES * 2.0);
            if (target) {
                silentAt = now + SILENT_AIM_COOLDOWN;
                call(target, "RPC_ReportKill", [target, target, str(KILL_REASON), 0.1]);
            }
        }

        if (PZS.targetGun && rightGrip && rightTrigger && !menuOpen() && now > gunAt) {
            const target = aimTarget(AIM_CONE_DEGREES);
            if (target) {
                gunAt = now + TARGET_GUN_COOLDOWN;
                applyTargetAction(gunMode, target);
            }
        }

        if (PZS.zeroSpread && frame - spreadFrame >= 30) {
            spreadFrame = frame;
            applyZeroSpread();
        }

        if (PZS.handSpawn && rightGrip && rightSecondary && !menuOpen() && now > spawnAt) {
            spawnAt = now + SPAWN_COOLDOWN;
            spawnSelected(true);
        }

        // spawn gun shares grip + trigger with Target Gun, so it stands down while that one is on
        if (PZS.spawnGun && !PZS.targetGun && rightGrip && rightTrigger && !menuOpen() && now > spawnGunAt) {
            spawnGunAt = now + SPAWN_GUN_COOLDOWN;
            spawnAtAim();
        }
        if (PZS.tpGun && rightGrip && rightPrimary && !menuOpen() && now > tpGunAt) {
            tpGunAt = now + TP_GUN_COOLDOWN;
            teleportToAim();
        }
        try { tickAimBeam(); } catch (e) { if (!tickAimBeam.warned) { tickAimBeam.warned = true; pzLog("aim beam error: " + e); } }
        try { tickScan(now); } catch (e) { if (!tickScan.warned) { tickScan.warned = true; pzLog("scan error: " + e); } }

        tickClones(now, dt);
        tickText();
        tickRing();
        tickDraw();
        try { tickTags(frame); } catch (e) {
            if (!tickTags.warned) { tickTags.warned = true; pzLog("nametags error: " + e); }
        }
    }
    let gunMode = 0;

    function installTick() {
        if (!PlayerController) { pzLog("PlayerController missing, per-frame mods unavailable."); return; }
        for (const name of ["Update", "FixedUpdate", "LateUpdate"]) {
            try {
                const method = PlayerController.method(name, 0);
                if (method.virtualAddress.isNull()) continue;
                Interceptor.attach(method.virtualAddress, {
                    onEnter() {
                        if (ticking) return;
                        ticking = true;
                        try { tick(); } catch (_) { } finally { ticking = false; }
                    },
                });
                pzLog("per-frame tick attached to PlayerController." + name);
                return;
            } catch (_) { }
        }
        pzLog("could not find a PlayerController update method to attach to.");
    }
    installTick();

    // forced hooks (gated by toggles, original behaviour when off)
    function gatedHook(klass, name, count, flag, value) {
        if (!klass) return;
        try {
            const method = count === null ? klass.method(name) : klass.method(name, count);
            if (method.virtualAddress.isNull()) return;
            void method.nativeFunction;
            method.implementation = function (...args) {
                if (PZS[flag]) return value;
                return method.invokeRaw(this, ...args);
            };
            pzLog("hooked " + klass.name + "." + name);
        } catch (e) {
            pzLog("skipped hook " + name + ": " + e);
        }
    }
    gatedHook(UIPanelLoadout, "ShouldIgnoreLoadoutCostInCurrentMode", 0, "ignoreLoadoutCost", true);
    gatedHook(ProgressionManager, "GetWeaponLevel", null, "maxWeaponLevel", 50);

    // ---------------------------------------------------------------- bridge for the ui
    function setToggle(key, enabled) {
        PZS[key] = enabled;
        if (key === "zeroGravity") applyZeroGravity(enabled);
        if (key === "noclip" && !enabled) { stopNoclip(); prevNoclip = false; }
        if (key === "freecam" && !enabled) { stopFreecam(); prevFreecam = false; }
        if (key === "ghostMonkey") setGhostMonkey(enabled);
        if (key === "nametags" && !enabled) clearTags();
    }
    PZ = {
        setToggle, movement, player, lobby, weapons, modes, fx,
        setGunMode: (i) => { gunMode = i; },
        setFlySpeed: (v) => { flySpeed = v; },
        setSpawnKind: (i) => { spawnKind = i; },
        setSpawnItem: (i) => { spawnItemIndex = i; },
        setSpawnPrefab: (i) => { spawnPrefabIndex = i; },
        spawnSelected,
        scan: scanSpawnables,
        setSpawnOpts: (scalePct, amount, spacingCm, pattern) => {
            spawnScalePct = scalePct; spawnAmount = amount; spawnSpacingCm = spacingCm; spawnPattern = pattern;
        },
        undoSpawn: undoLastSpawn,
        eraseSpawned: eraseAllSpawned,
        spawnedCount,
        textCfg, tagCfg,
        panic: { cfg: panicCfg, run: runPanic, check: panicCheck },
        text: {
            place: placeText,
            clear: clearText,
            queued: () => textJobs.length,
            spawned: () => textObjects.length,
        },
        ring: {
            cfg: ringCfg,
            targetName: ringTargetName,
            refresh: ringRefresh,
            selectIndex: ringSelectIndex,
            pickAimed: ringPickAimed,
            build: ringBuild,
            clear: ringClear,
            queued: () => ringJobs.length,
            spawned: () => ringObjects.length,
        },
        clones: {
            cfg: cloneCfg,
            spawn: spawnClones,
            despawn: despawnClones,
            rename: renameClones,
            count: () => clones.length,
            dump: () => { dumpClones(); return true; },
        },
        hasPlayer: () => live(localController()),
    };
    pzLog("Ready. Mods that need the local player wait until you are in a lobby.");
});

// ============================================================================
// Plugins-tab UI
// ============================================================================
const PZTG = {};
const PZG = {
    flySpeed: ref(20), gunMode: ref(0),
    spawnKind: ref(0), spawnItem: ref(0), spawnPrefab: ref(0), streak: ref(10),
    spawnScale: ref(100), spawnAmount: ref(5), spawnSpacing: ref(50), spawnPattern: ref(0),
    cloneCount: ref(4), cloneRadius: ref(2), cloneSpeed: ref(60), cloneHeight: ref(0),
    cloneMode: ref(0), cloneNames: ref(0),
    textSpacing: ref(25), textDist: ref(4), textHeight: ref(1),
    textGroup: ref(0), textPerItem: ref(10), drawKey: ref(0), drawStep: ref(12),
    tagName: ref(true), tagHealth: ref(true), tagDist: ref(true), tagId: ref(false), tagMax: ref(60), tagSize: ref(100), tagWalls: ref(true), tagShadow: ref(true),
    ringNames: [], ringPlayer: ref(0), ringKind: ref(1), ringPrefab: ref(Math.max(0, PREFAB_LIST.indexOf("CannonWorldItem"))), ringItem: ref(0),
    ringRadius: ref(180), ringSize: ref(90), ringHeight: ref(220), ringCaps: ref(true),
    panicChord: ref(0), panicPlugins: ref(true), panicPresets: ref(true), panicClose: ref(true),
};
let pzTextBuf = "";
const pzTextRef = { v: "" };
const PZ_CLONE_MODES = ["Orbit", "Ring (no spin)", "Conga line behind me", "Spiral", "Wall in front", "Bouncing ring"];
const PZ_TEXT_GROUPS = ["Only the selected item", "Bullet trails", "Muzzle flashes", "Blood / impacts", "Every item (cycle)"];
const PZ_DRAW_KEYS = ["Hold A (right)", "Hold X (left)", "Hold right trigger"];
const PZ_PANIC_CHORDS = ["Hold X + A + B", "Hold both grips + A", "Left stick click + A + B"];
const PZ_CLONE_NAME_STYLES = ["Clone 1, Clone 2...", "Random fake names", "My name + number", "My exact name"];
const ITEM_NAMES = ITEM_LIST.map((i) => i.name);

function pzTgl(ui, label, key, desc) {
    const r = PZTG[key] || (PZTG[key] = ref(false));
    r.v = !!PZS[key];
    if (ui.checkbox(label, r, desc)) {
        if (PZ) PZ.setToggle(key, r.v);
        else PZS[key] = r.v;
        ui.notify(label + (r.v ? " on" : " off"));
    }
}
function pzAct(ui, label, fn, desc) {
    if (ui.button(label)) {
        let ok = false;
        try { ok = fn(); } catch (e) { console.log("[" + MENU_NAME + "] " + label + " failed: " + e); }
        ui.notify(label + (ok ? "" : " (nothing happened)"));
    }
    if (desc && ui.textDisabled) { /* description shown via notify only to keep the tab compact */ }
}

__arCategory("pizza_mods", function (ui) {
    if (!PZ) {
        ui.textDisabled("Waiting for the game to finish loading");
        return;
    }
    if (ui.collapsingHeader("Movement+", true)) {
        pzTgl(ui, "Noclip Fly", "noclip", "Triggers push you where each hand points, you pass through walls");
        if (ui.sliderInt("Noclip Speed", PZG.flySpeed, 5, 100)) PZ.setFlySpeed(PZG.flySpeed.v);
        pzTgl(ui, "Freecam", "freecam", "Left stick moves, right stick looks, right trigger is faster, right grip switches to the view");
        pzTgl(ui, "Zero Gravity", "zeroGravity");
        ui.separator();
        pzAct(ui, "Super Jump", PZ.movement.superJump);
        ui.sameLine();
        pzAct(ui, "Mega Jump", PZ.movement.megaJump);
        pzAct(ui, "Dash Forward", PZ.movement.dash);
        ui.sameLine();
        pzAct(ui, "Ground Slam", PZ.movement.groundSlam);
        pzAct(ui, "Teleport Back 10m", PZ.movement.backTeleport);
        ui.sameLine();
        pzAct(ui, "Teleport Up 15m", PZ.movement.upTeleport);
        pzAct(ui, "Rocket Jump", PZ.movement.rocketJump);
        pzAct(ui, "Speed Boost +5", PZ.movement.speedBoost);
        ui.sameLine();
        pzAct(ui, "Slow Motion -3", PZ.movement.slomo);
        pzAct(ui, "Rank Yourself (9999999 XP)", PZ.movement.rank);
    }
    if (ui.collapsingHeader("Player+", false)) {
        pzTgl(ui, "Auto Revive", "autoRevive", "Keeps reviving you so you never stay downed");
        pzTgl(ui, "Ghost Monkey", "ghostMonkey", "Hides your network rig from everyone else");
        ui.separator();
        pzAct(ui, "Heal Self +100", PZ.player.healSelf);
        pzAct(ui, "Heal Everyone +100", PZ.player.healEveryone);
        pzAct(ui, "Health +1000", PZ.player.bigHealth);
        pzAct(ui, "Shield +1000", PZ.player.shield);
        pzAct(ui, "Max Health Gained", PZ.player.maxHealthGained);
        pzAct(ui, "Revive Me", PZ.player.reviveSelf);
        ui.sameLine();
        pzAct(ui, "Revive Everyone", PZ.player.reviveEveryone);
        ui.separator();
        ui.sliderInt("Kill Streak", PZG.streak, 0, 100);
        pzAct(ui, "Set Kill Streak", () => PZ.player.streak(PZG.streak.v));
        ui.separator();
        pzAct(ui, "Show All Body Parts", PZ.player.showBodyParts);
        pzAct(ui, "Clean Fake Grabs", PZ.player.cleanGrabs);
        pzAct(ui, "Ragdoll Follows Projectiles", PZ.player.ragdollFollow);
        ui.separator();
    }
    if (ui.collapsingHeader("Combat+", false)) {
        pzTgl(ui, "Kill Aura", "killAura", "Kills any enemy within 40m, repeating");
        pzTgl(ui, "Silent Aim", "silentAim", "Right trigger kills the enemy closest to where your right hand points");
        pzTgl(ui, "Target Gun", "targetGun", "Hold right grip, pull right trigger at someone to apply the mode below");
        ui.combo("Target Gun Mode", PZG.gunMode, GUN_MODES);
        PZ.setGunMode(PZG.gunMode.v);
        pzTgl(ui, "Zero Spread", "zeroSpread", "Removes bullet spread on every weapon");
        ui.separator();
        pzAct(ui, "Refill Max Ammo", PZ.weapons.refillAmmo);
        ui.sameLine();
        pzAct(ui, "Instant Full Reload", PZ.weapons.fullReload);
        ui.separator();
        pzTgl(ui, "Ignore Loadout Cost", "ignoreLoadoutCost");
        pzTgl(ui, "Max Weapon Level (50)", "maxWeaponLevel");
        pzAct(ui, "Free Loadout (no weight limit)", PZ.weapons.freeLoadout);
        pzAct(ui, "Give 999k Coins", PZ.weapons.addCoins);
    }
    if (ui.collapsingHeader("Lobby", false)) {
        pzAct(ui, "Kill All", PZ.lobby.killAll);
        pzAct(ui, "Knockback Wave", PZ.lobby.knockbackWave);
        pzAct(ui, "Launch All Into The Sky", PZ.lobby.launchAll);
        pzAct(ui, "Freeze All", PZ.lobby.freezeAll);
        pzAct(ui, "Pull All To Me", PZ.lobby.pullAll);
        pzAct(ui, "Teleport All To My Hand", PZ.lobby.teleportAllToMe);
    }
    if (ui.collapsingHeader("Gamemodes", false)) {
        ui.text("Duels");
        pzAct(ui, "Bypass Barriers", () => PZ.modes.duelsCall("DisableBarriers"));
        ui.sameLine();
        pzAct(ui, "Enable Barriers", () => PZ.modes.duelsCall("EnableBarriers"));
        pzAct(ui, "Start Match", () => PZ.modes.duelsCall("RPC_StartMatch"));
        ui.sameLine();
        pzAct(ui, "End Match Early", () => PZ.modes.duelsCall("RPC_EndMatchEarly"));
        pzAct(ui, "Force Start (Royale / Party)", PZ.modes.forceStart);
        pzAct(ui, "Set Game State 1", () => PZ.modes.duelsCall("RPC_SetGameStateForEveryone", [1]));
        pzAct(ui, "Start Solo Walkaround", () => PZ.modes.duelsCall("RPC_SetSoloWalkaroundTimer"));
        ui.sameLine();
        pzAct(ui, "End Solo Walkaround", () => PZ.modes.duelsCall("RPC_EndSoloWalkaround"));
        pzAct(ui, "Clean All World Weapons", () => PZ.modes.duelsCall("CleanAllWeapons"));
        pzAct(ui, "Reset My Position", () => PZ.modes.duelsCall("ResetPlayer"));
        pzAct(ui, "Master Client Team Setup", () => PZ.modes.duelsCall("MCCheckNoTeamPlayersAndSetTeamToThem"));
        ui.separator();
        ui.text("Capture The Flag");
        pzAct(ui, "Score Blue Flag", () => PZ.modes.ctfCall("RPC_SetAsFlagCaptured", [0]));
        ui.sameLine();
        pzAct(ui, "Score Red Flag", () => PZ.modes.ctfCall("RPC_SetAsFlagCaptured", [1]));
        pzAct(ui, "Teleport Flags To My Hand", PZ.modes.ctfTeleportFlags);
        pzAct(ui, "Wave Respawn", () => PZ.modes.ctfCall("RPC_WaveRespawn"));
        pzAct(ui, "Exit Match When Over", () => PZ.modes.ctfCall("RPC_ExitMatchWhenMatchIsOver"));
        ui.separator();
        ui.text("Infection / Teams");
        pzAct(ui, "Infect Me", PZ.modes.infectSelf);
        ui.sameLine();
        pzAct(ui, "Cure Me", PZ.modes.cureSelf);
        pzAct(ui, "Infect Everyone", PZ.modes.infectAll);
        ui.sameLine();
        pzAct(ui, "Cure Everyone", PZ.modes.cureAll);
        pzAct(ui, "Team Blue", () => PZ.modes.setTeam(0));
        ui.sameLine();
        pzAct(ui, "Team Red", () => PZ.modes.setTeam(1));
        ui.sameLine();
        pzAct(ui, "No Team", PZ.modes.removeTeam);
    }
    if (ui.collapsingHeader("Effects", false)) {
        pzAct(ui, "World Explosion At Hand", PZ.fx.worldExplosion);
        pzAct(ui, "Glider Flame Trail", PZ.fx.gliderTrail);
        pzAct(ui, "Muzzle VFX Right", PZ.fx.shootRight);
        ui.sameLine();
        pzAct(ui, "Muzzle VFX Left", PZ.fx.shootLeft);
        pzAct(ui, "Blue Flag Effects", () => PZ.fx.flagEffects(0));
        ui.sameLine();
        pzAct(ui, "Red Flag Effects", () => PZ.fx.flagEffects(1));
        pzAct(ui, "Sunset / Night Room", PZ.fx.sunset);
    }
    if (ui.collapsingHeader("Clones", false)) {
        ui.text("Spawns fake players that move around you.");
        ui.sliderInt("Count", PZG.cloneCount, 1, 8);
        ui.combo("Movement", PZG.cloneMode, PZ_CLONE_MODES);
        ui.sliderInt("Distance (m)", PZG.cloneRadius, 1, 10);
        ui.sliderInt("Spin Speed", PZG.cloneSpeed, 0, 300);
        ui.sliderInt("Height (m)", PZG.cloneHeight, -1, 5);
        ui.combo("Names", PZG.cloneNames, PZ_CLONE_NAME_STYLES);
        const cc = PZ.clones.cfg;
        cc.count = PZG.cloneCount.v;
        cc.mode = PZG.cloneMode.v;
        cc.radius = PZG.cloneRadius.v;
        cc.speed = PZG.cloneSpeed.v;
        cc.height = PZG.cloneHeight.v;
        cc.nameStyle = PZG.cloneNames.v;
        pzAct(ui, "Spawn Clones", PZ.clones.spawn);
        ui.sameLine();
        pzAct(ui, "Despawn Clones", () => { PZ.clones.despawn(); return true; });
        pzAct(ui, "Apply Names Again", PZ.clones.rename);
        pzAct(ui, "Dump Clone Info (console)", PZ.clones.dump);
        ui.textDisabled("Active clones: " + PZ.clones.count());
    }
    if (ui.collapsingHeader("Text", false)) {
        ui.text("Spells words out of whatever is picked in Spawner (item or prefab).");
        if (pzTextRef.v !== pzTextBuf) { pzTextBuf = String(pzTextRef.v).slice(0, 12); pzTextRef.v = pzTextBuf; }
        ui.inputText("Text to place", pzTextRef);
        ui.text("Text: " + (pzTextBuf || "(empty)"));
        if (ui.button("Clear Text###pzkeyclear")) { pzTextBuf = ""; pzTextRef.v = ""; }
        ui.sliderInt("Dot Spacing (cm)", PZG.textSpacing, 10, 80);
        ui.sliderInt("Distance (m)", PZG.textDist, 2, 15);
        ui.sliderInt("Height (m)", PZG.textHeight, -2, 6);
        ui.combo("Item Spread", PZG.textGroup, PZ_TEXT_GROUPS);
        ui.sliderInt("Max Per Item Type", PZG.textPerItem, 1, 40);
        PZ.textCfg.group = PZG.textGroup.v;
        PZ.textCfg.perItem = PZG.textPerItem.v;
        pzAct(ui, "Place Text", () => PZ.text.place(pzTextBuf, {
            spacing: PZG.textSpacing.v / 100, dist: PZG.textDist.v, height: PZG.textHeight.v,
        }) > 0);
        pzAct(ui, "Remove Placed Text", () => { PZ.text.clear(); return true; });
        ui.textDisabled("queued: " + PZ.text.queued() + "   placed objects: " + PZ.text.spawned());
        ui.separator();
        pzTgl(ui, "Air Drawing", "airDraw", "Hold the draw button and your right hand leaves a trail of the selected thing");
        ui.combo("Draw With", PZG.drawKey, PZ_DRAW_KEYS);
        ui.sliderInt("Draw Spacing (cm)", PZG.drawStep, 5, 60);
        PZ.textCfg.drawKey = PZG.drawKey.v;
        PZ.textCfg.drawStep = PZG.drawStep.v / 100;
    }
    if (ui.collapsingHeader("Nametags", false)) {
        pzTgl(ui, "Nametags", "nametags", "Floating name / health / distance tags in the menu's colours");
        ui.checkbox("Name", PZG.tagName);
        ui.checkbox("Health", PZG.tagHealth);
        ui.checkbox("Distance", PZG.tagDist);
        ui.checkbox("Player ID", PZG.tagId, "account id if the game has one, otherwise the network id");
        ui.checkbox("Show through walls", PZG.tagWalls, "if something solid is in the way the tag is pulled in front of it so you can always read it");
        ui.checkbox("Drop shadow", PZG.tagShadow);
        ui.sliderInt("Max Distance (m)", PZG.tagMax, 10, 500);
        ui.sliderInt("Size %", PZG.tagSize, 30, 300);
        const tc = PZ.tagCfg;
        tc.name = PZG.tagName.v; tc.health = PZG.tagHealth.v; tc.dist = PZG.tagDist.v; tc.id = PZG.tagId.v;
        tc.maxDist = PZG.tagMax.v; tc.size = PZG.tagSize.v; tc.walls = PZG.tagWalls.v; tc.shadow = PZG.tagShadow.v;
    }
    if (ui.collapsingHeader("Panic", false)) {
        ui.text("Works with the menu closed. Hold the buttons for half a second.");
        ui.combo("Panic Buttons", PZG.panicChord, PZ_PANIC_CHORDS);
        ui.checkbox("Also switch off animal_rivals", PZG.panicPlugins);
        ui.checkbox("Also turn off the universal mods", PZG.panicPresets);
        ui.checkbox("Close the menu", PZG.panicClose);
        const pc = PZ.panic.cfg;
        pc.chord = PZG.panicChord.v; pc.plugins = PZG.panicPlugins.v; pc.presets = PZG.panicPresets.v; pc.close = PZG.panicClose.v;
        pzAct(ui, "Panic Now", PZ.panic.run);
    }
    if (ui.collapsingHeader("Cannon Ring", false)) {
        ui.text("Target: " + PZ.ring.targetName());
        pzAct(ui, "Refresh Player List", () => { PZG.ringNames = PZ.ring.refresh(); return PZG.ringNames.length > 0; });
        if (PZG.ringNames.length > 0) {
            ui.combo("Player", PZG.ringPlayer, PZG.ringNames);
            pzAct(ui, "Select Player From List", () => PZ.ring.selectIndex(PZG.ringPlayer.v));
        }
        pzAct(ui, "Select Player I'm Pointing At", () => PZ.ring.pickAimed());
        ui.combo("Spawn Type", PZG.ringKind, SPAWN_KINDS);
        if (PZG.ringKind.v === 0) ui.combo("Item", PZG.ringItem, ITEM_NAMES);
        else ui.combo("Prefab", PZG.ringPrefab, PREFAB_LIST);
        ui.sliderInt("Ring Radius (cm)", PZG.ringRadius, 60, 600);
        ui.sliderInt("Cannon Size (cm)", PZG.ringSize, 30, 200);
        ui.sliderInt("Cage Height (cm)", PZG.ringHeight, 100, 400);
        ui.checkbox("Lid and floor", PZG.ringCaps, "closes the top and bottom too");
        const rc = PZ.ring.cfg;
        rc.kind = PZG.ringKind.v; rc.prefab = PZG.ringPrefab.v; rc.item = PZG.ringItem.v;
        rc.radius = PZG.ringRadius.v / 100; rc.size = PZG.ringSize.v / 100; rc.height = PZG.ringHeight.v / 100; rc.caps = PZG.ringCaps.v;
        pzAct(ui, "Build Cage Around Target", () => PZ.ring.build() > 0);
        pzAct(ui, "Remove Cage", () => { PZ.ring.clear(); return true; });
        ui.text("Placed: " + PZ.ring.spawned() + "   Waiting: " + PZ.ring.queued());
    }
    if (ui.collapsingHeader("Spawner", false)) {
        ui.combo("Spawn Type", PZG.spawnKind, SPAWN_KINDS);
        PZ.setSpawnKind(PZG.spawnKind.v);
        if (PZG.spawnKind.v === 0) {
            ui.combo("Item", PZG.spawnItem, ITEM_NAMES);
            PZ.setSpawnItem(PZG.spawnItem.v);
        } else {
            ui.combo("Prefab", PZG.spawnPrefab, PREFAB_LIST);
            PZ.setSpawnPrefab(PZG.spawnPrefab.v);
        }
        ui.sliderInt("Scale (%)", PZG.spawnScale, 10, 500);
        ui.combo("Pattern", PZG.spawnPattern, SPAWN_PATTERNS);
        if (PZG.spawnPattern.v !== 0) {
            ui.sliderInt("Amount", PZG.spawnAmount, 2, SPAWN_MAX_AMOUNT);
            ui.sliderInt("Spacing (cm)", PZG.spawnSpacing, 5, 300);
        }
        PZ.setSpawnOpts(PZG.spawnScale.v, PZG.spawnPattern.v === 0 ? 1 : PZG.spawnAmount.v, PZG.spawnSpacing.v, PZG.spawnPattern.v);
        ui.textDisabled("Scale shows for everyone on items, but prefabs only look bigger on your side.");
        pzAct(ui, "Spawn 2m In Front Of Me", () => PZ.spawnSelected(false));
        pzTgl(ui, "Hold Grip + B To Spawn", "handSpawn", "Spawns the selected thing at your right hand while you hold right grip and B");
        pzTgl(ui, "Spawn Gun", "spawnGun", "Hold right grip and pull right trigger: spawns the selected thing where your right hand points. Uses the same buttons as Target Gun, so that one stands down while this is on");
        if (PZS.spawnGun && PZS.targetGun) ui.textDisabled("Target Gun is on, it uses the same buttons. Turn it off to use the Spawn Gun.");
        pzAct(ui, "Scan Game For Items / Prefabs", () => {
            const r = PZ.scan();
            ITEM_NAMES.splice(0, ITEM_NAMES.length, ...ITEM_LIST.map((i) => i.name));
            ui.notify("Scan: " + r.itemsNew + " new items, " + r.prefabsNew + " new prefabs");
            return r.items > 0 || r.prefabs > 0;
        }, "Reads the running game for items and prefabs that are not in the lists yet (new ones go to the end of each list). It also runs by itself once you are in a lobby.");
        ui.textDisabled(ITEM_LIST.length + " items, " + PREFAB_LIST.length + " prefabs listed");
        pzTgl(ui, "Teleport Gun", "tpGun", "Hold right grip and press A: teleports you to where your right hand points. A beam shows where it will land (purple)");
        pzAct(ui, "Undo Last Spawn", () => PZ.undoSpawn(), "Removes the last prefab(s) you spawned. Spawned items are short effects that clean themselves up");
        pzAct(ui, "Erase All Spawned", () => PZ.eraseSpawned() > 0, "Removes every prefab the spawner put down, plus what the Text and Cage features placed");
        ui.textDisabled(PZ.spawnedCount() + " spawned prefabs tracked");
    }
});

// panic keybind: runs every frame from the menu itself, so it works with the menu closed
__arFrame(function () {
    try { if (PZ) PZ.panic.check(); } catch (e) { }
});

// switching the plugin off: turn every toggle off first so game values get restored
onDisable(function () {
    try {
        if (PZ) for (const k of Object.keys(PZS)) { if (PZS[k]) PZ.setToggle(k, false); }
        if (PZ) PZ.clones.despawn();
        if (PZ) PZ.text.clear();
        if (PZ) PZ.ring.clear();
    } catch (e) { console.log("cleanup: " + e); }
});

})();

; (function () {
// ---- module: deadeye_profile.js ----
// game: com.dogelabs.deadeye
/*
 * deadeye_profile.js - profile pictures only.
 *
 * The old module mixed this with display names, backend renames, incognito and an image-request logger that
 * collected other players' IP / User-Agent / name. All of that is gone. What is left:
 *   - pick one of the game's anonymous pictures, or a direct image URL from pfp_links.txt
 *   - working previews: each link is downloaded with the game's own ProfileImageProvider, so the thumbnail is
 *     the same image other players see. The old preview read pfp/pfp_N.png files that nothing ever created.
 *   - "Test link" uses the same downloader and reports the decoded image size.
 *
 * pfp_links.txt: one direct .png/.jpg URL per line, optionally "name = url". Keep images small (<=256 px).
 */

var GAME_ASM = "DL.Animals.Core2025";
var PIP_CLASS = "Infected.UI.ProfileImageProvider";
var PPM_CLASS = "Infected.UI.PlayersListMenu.PlayersPanelManager";
var PFP_MODES = ["Leave alone", "Anonymous (random)", "Anonymous (pick one)", "My own link (pfp_links.txt)"];

var p = __arModuleProps("deadeye_names", [
    { type: "select", key: "pfpMode", label: "Profile picture", options: PFP_MODES, default: "Anonymous (random)" },
    { type: "int", key: "pfpIndex", label: "Picture number (for 'pick one')", min: 0, max: 40, default: 0 },
]);

var st = {
    linkIdx: 0, status: "not applied yet", applied: false, appliedUrl: "", orig: null,
    lastCheck: 0, lastApply: 0, pickedUrl: null, verifyAt: 0, test: null, testMsg: "",
};

function img() { return Il2Cpp.domain.assembly(GAME_ASM).image; }
function cls(n) { try { return img().class(n); } catch (e) { return null; } }
function strOf(v) { try { return v && !v.isNull() ? String(v.content) : ""; } catch (e) { return ""; } }
function sameObj(a, b) { try { return a.handle.equals(b.handle); } catch (e) { return false; } }

var _uObj = null;
function unityObj() { if (!_uObj) _uObj = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image.class("UnityEngine.Object"); return _uObj; }
function objectsOf(klass, inactive) {
    var out = [];
    if (!klass) return out;
    function push(arr) {
        for (var i = 0; arr && i < arr.length; i++) {
            var v = arr.get(i);
            if (v && !v.isNull() && !out.some(function (x) { return sameObj(x, v); })) out.push(v);
        }
    }
    try {
        try { push(unityObj().method("FindObjectsByType", 2).overload("System.Type", "UnityEngine.FindObjectsSortMode").invoke(klass.type.object, 0)); }
        catch (e) { push(unityObj().method("FindObjectsOfType", 1).overload("System.Type").invoke(klass.type.object)); }
        if (inactive) push(unityObj().method("FindObjectsByType", 3).overload("System.Type", "UnityEngine.FindObjectsInactive", "UnityEngine.FindObjectsSortMode").invoke(klass.type.object, 1, 0));
    } catch (e) { }
    return out;
}
function firstBool(o, names) { for (var i = 0; i < names.length; i++) { try { return !!o.method(names[i], 0).invoke(); } catch (e) { } } return null; }

// ---- links -------------------------------------------------------------------
var links = [];
function linksPath() { return "/storage/emulated/0/Android/data/" + ui.appId() + "/files/imgui_plugins/pfp_links.txt"; }
function loadLinks() {
    links = [];
    try {
        File.readAllText(linksPath()).split(/\r?\n/).forEach(function (line) {
            line = String(line || "").trim();
            if (!line || line[0] === "#") return;
            var name = "Link " + (links.length + 1), url = line, eq = line.indexOf("=");
            if (eq > 0 && !/^https?:/i.test(line.slice(0, eq).trim())) { name = line.slice(0, eq).trim(); url = line.slice(eq + 1).trim(); }
            if (/^https?:\/\//i.test(url)) links.push({ name: name.slice(0, 40), url: url });
        });
    } catch (e) { }
    if (st.linkIdx >= links.length) st.linkIdx = 0;
    clearPreviews();
}

// ---- the local player's picture ----------------------------------------------
var localNP = null, npNextTry = 0;
function findLocalNP() {
    try {
        var pmK = cls("DLAR_PlayersManager");
        if (pmK) { var mine = pmK.method("GetMyNetworkPlayer", 0).invoke(); if (mine && !mine.isNull()) { localNP = mine; return localNP; } }
    } catch (e) { }
    localNP = null;
    var now = Date.now();
    if (now < npNextTry) return null;
    npNextTry = now + 1500;
    var k = cls("DLARX_NetworkPlayer");
    if (!k) return null;
    var all = objectsOf(k, false);
    for (var i = 0; i < all.length; i++) if (firstBool(all[i], ["get_HasInputAuthority"]) === true) { localNP = all[i]; return localNP; }
    return null;
}
function npPfp(np) { try { return strOf(np.method("get_ProfileImageURL", 0).invoke()); } catch (e) { return ""; } }
function ppm() {
    var k = cls(PPM_CLASS);
    if (!k) return null;
    try { var inst = k.method("get_Instance", 0).invoke(); return inst && !inst.isNull() ? inst : null; } catch (e) { return null; }
}

// ---- picture URLs ------------------------------------------------------------
var pfpHooks = [], pfpStr = null, pfpStrFor = "";
function customMode() { return p.pfpMode === PFP_MODES[3]; }
function customUrl() {
    if (!customMode() || !st.applied) return "";
    var L = links[Math.max(0, Math.min(links.length - 1, st.linkIdx | 0))];
    return L ? L.url : "";
}
function hookPfp() {
    if (pfpHooks.length) return;
    var k = cls(PPM_CLASS);
    if (!k) return;
    ["GetPublicProfileImageURL", "GetRandomAnonymousProfileImageURL"].forEach(function (n) {
        try {
            var mm = k.method(n, 0);
            if (!mm || mm.virtualAddress.isNull()) return;
            pfpHooks.push(Interceptor.attach(mm.virtualAddress, {
                onLeave: function (ret) {
                    try {
                        var u = customUrl();
                        if (!u) return;
                        if (!pfpStr || pfpStrFor !== u) {
                            pfpStr = Il2Cpp.string(u);
                            try { pfpStr.ref(false); } catch (e) { }
                            pfpStrFor = u;
                        }
                        ret.replace(pfpStr.handle);
                    } catch (e) { }
                },
            }));
        } catch (e) { log("pfp hook " + n + ": " + e); }
    });
}
function unhookPfp() { pfpHooks.forEach(function (h) { try { h.detach(); } catch (e) { } }); pfpHooks = []; }

function pfpUrl(m) {
    var mode = p.pfpMode;
    if (mode === PFP_MODES[0]) return null;
    if (mode === PFP_MODES[3]) { var L = links[Math.max(0, Math.min(links.length - 1, st.linkIdx | 0))]; return L ? L.url : null; }
    var pip = cls(PIP_CLASS), n = 1, idx = Math.max(0, p.pfpIndex | 0);
    if (!pip) return null;
    try { n = Number(pip.method("get_AnonymousProfileImageCount", 0).invoke()) || 1; } catch (e) { }
    idx = Math.max(0, Math.min(n - 1, idx));
    if (mode === PFP_MODES[1] && st.pickedUrl) return st.pickedUrl;
    try { return strOf(pip.method("GetAnonymousProfileImageURL", 1).invoke(idx)); } catch (e) { return null; }
}
function refreshLocalPlayer(url) {
    var o = findLocalNP();
    if (!o) return 0;
    if (url) { try { o.method("set_ProfileImageURL", 1).invoke(Il2Cpp.string(url)); } catch (e) { log("picture url: " + e); } }
    try { o.method("UpdateDisplayName", 0).invoke(); } catch (e) { }
    return 1;
}
function describePfpReadback(np, url) {
    var got = npPfp(np);
    if (got === url) return "picture field holds the full link (" + url.length + " chars)";
    if (!got) return "picture field is EMPTY after setting it";
    if (url.indexOf(got) === 0) return "picture field was CUT to " + got.length + " of " + url.length + " characters - use a shorter link";
    return "picture field holds a DIFFERENT value: " + got.slice(0, 60);
}
function applyAll(quiet) {
    var m = ppm();
    var np = (npNextTry = 0, findLocalNP());
    if (!m && !np) { st.status = "not in a lobby yet"; if (!quiet) notify("Picture: not in the lobby yet"); return false; }
    if (!m) m = { field: function () { throw 0; }, method: function () { throw 0; } };
    if (!st.orig) {
        st.orig = {};
        try { st.orig.pfp = strOf(m.field("anonymousProfileImageURL").value); } catch (e) { }
    }
    var url = pfpUrl(m);
    if (!url) { st.status = "choose a picture mode first"; return false; }
    try {
        try { m.field("anonymousProfileImageURL").value = Il2Cpp.string(url); } catch (e) { }
        st.applied = true;                       // the getters only answer while applied
        if (customMode()) hookPfp(); else unhookPfp();
        try { m.method("RefreshAnonymousProfileImage", 0).invoke(); } catch (e) { }
        try { m.method("NotifyLocalPlayerDisplayChanged", 0).invoke(); } catch (e) { }
        refreshLocalPlayer(url);
        if (customMode() && np) { try { np.method("set_ProfileImageURL", 1).invoke(Il2Cpp.string(url)); } catch (e) { } }
        st.applied = true; st.appliedUrl = url; st.lastApply = Date.now();
        st.verifyAt = customMode() ? Date.now() + 1500 : 0;
        st.status = "picture set: " + url.slice(0, 70) + (np ? " | " + describePfpReadback(np, url) : "");
        if (!quiet) notify("Picture: applied");
        log(st.status);
        return true;
    } catch (e) {
        st.status = "failed: " + e;
        log("picture apply failed: " + e);
        if (!quiet) notify("Picture: apply failed (see log)");
        return false;
    }
}
function restore() {
    unhookPfp();
    var m = ppm();
    try { if (m && st.orig && st.orig.pfp !== undefined) m.field("anonymousProfileImageURL").value = Il2Cpp.string(st.orig.pfp); } catch (e) { }
    try { if (m) m.method("RefreshAnonymousProfileImage", 0).invoke(); } catch (e) { }
    try { if (m) m.method("NotifyLocalPlayerDisplayChanged", 0).invoke(); } catch (e) { }
    refreshLocalPlayer(null);
    st.applied = false; st.appliedUrl = ""; st.orig = null; st.pickedUrl = null; st.verifyAt = 0;
    st.status = "restored";
    log("restored your original picture");
}

// ---- previews: download with the game's own loader ---------------------------
var previewCache = Object.create(null);          // url -> { state, tex, task, inst, at, msg }
function clearPreviews() { previewCache = Object.create(null); }
function zeroToken() {
    var ctK = Il2Cpp.corlib.class("System.Threading.CancellationToken");
    var mem = Memory.alloc(16);
    mem.writeU64(0); mem.add(8).writeU64(0);
    return new Il2Cpp.ValueType(mem, ctK.type);
}
function startLoad(url) {
    if (!url || previewCache[url]) return;
    var e = { state: "loading", tex: null, task: null, inst: null, at: Date.now(), msg: "" };
    previewCache[url] = e;
    try {
        var pip = cls(PIP_CLASS);
        var inst = pip.method("get_Instance", 0).invoke();
        if (!inst || inst.isNull()) { e.state = "error"; e.msg = "downloader not ready"; return; }
        e.inst = inst;
        e.task = inst.method("GetSpriteAsync", 2).invoke(Il2Cpp.string(url), zeroToken());
    } catch (err) { e.state = "error"; e.msg = String(err); e.inst = null; }
}
function isPlaceholder(inst, sprite) {
    try { var def = inst.field("defaultProfileImage").value; return !!def && !def.isNull() && sprite.handle.equals(def.handle); } catch (e) { return false; }
}
function pollPreviews() {
    Object.keys(previewCache).forEach(function (url) {
        var e = previewCache[url];
        if (!e || e.state !== "loading" || !e.task) return;
        try {
            if (!e.task.method("get_IsCompleted", 0).invoke()) {
                if (Date.now() - e.at > 20000) { e.state = "error"; e.msg = "timed out"; e.task = null; e.inst = null; }
                return;
            }
            if (e.task.method("get_IsFaulted", 0).invoke()) { e.state = "error"; e.msg = "download failed"; }
            else {
                var sprite = e.task.method("get_Result", 0).invoke();
                if (!sprite || sprite.isNull() || isPlaceholder(e.inst, sprite)) { e.state = "error"; e.msg = "not a supported image"; }
                else {
                    var tex = sprite.method("get_texture", 0).invoke();
                    if (!tex || tex.isNull()) { e.state = "error"; e.msg = "no texture"; }
                    else { e.tex = tex; e.state = "done"; }
                }
            }
        } catch (err) { e.state = "error"; e.msg = String(err); }
        e.task = null; e.inst = null;
    });
}
function previewTex(ui, i) {
    var L = links[i];
    if (!L) return null;
    var e = previewCache[L.url];
    if (!e) { startLoad(L.url); return null; }     // thumbnails appear on the next frames
    return e.state === "done" ? e.tex : null;
}
function previewStatus() {
    var done = 0, loading = 0;
    links.forEach(function (L) { var e = previewCache[L.url]; if (!e) return; if (e.state === "done") done++; else if (e.state === "loading") loading++; });
    return done + "/" + links.length + " loaded" + (loading ? ", " + loading + " downloading" : "");
}
function testLink(url) {
    if (!url) return;
    startLoad(url);
    st.test = previewCache[url];
    st.testMsg = "downloading with the game's own loader...";
}
function pollTest() {
    var e = st.test;
    if (!e || e.state === "loading") return;
    st.test = null;
    if (e.state === "done") {
        try {
            var t = e.tex;
            st.testMsg = "OK: game loaded it (" + Number(t.method("get_width", 0).invoke()) + " x " + Number(t.method("get_height", 0).invoke()) + ")";
        } catch (err) { st.testMsg = "loaded, but size unknown"; }
    } else st.testMsg = "could not load: " + (e.msg || "unknown error");
    log("link test: " + st.testMsg);
}

// ---- menu --------------------------------------------------------------------
__arCategory("deadeye_names", function (ui) {
    ui.text("Profile picture only - names, privacy and image-request logging were removed.", [0.65, 0.72, 0.8, 1]);
    if (p.pfpMode === PFP_MODES[3]) {
        if (!links.length) ui.text("No links: put direct .png/.jpg URLs in pfp_links.txt, run vrfrida.py, then press Reload Links", [1, 0.7, 0.4, 1]);
        for (var i = 0; i < links.length; i++) {
            ui.image(previewTex(ui, i), 72, 72);
            ui.sameLine();
            if (ui.button((st.linkIdx === i ? "[selected] " : "Use ") + links[i].name + "###nkuse" + i, 330)) { st.linkIdx = i; notify("Picture: " + links[i].name); }
            var e = previewCache[links[i].url];
            if (e && e.state === "error") ui.text("  " + (e.msg || "could not load"), [0.9, 0.6, 0.5, 1]);
        }
        if (links.length) {
            ui.text("Previews: " + previewStatus(), [0.6, 0.7, 0.8, 1]);
            if (ui.button("Reload previews###nkprev", 190)) clearPreviews();
            ui.sameLine();
            if (ui.button("Test selected link###nktest", 210)) testLink(links[Math.min(st.linkIdx, links.length - 1)].url);
            if (st.testMsg) ui.text("Link test: " + st.testMsg, [0.6, 0.6, 0.6, 1]);
        }
        if (ui.button("Reload Links###nkreload", 150)) { loadLinks(); notify("Picture: " + links.length + " link(s) loaded"); }
        ui.separator();
    }
    if (ui.button("Apply picture###nkapply", 150)) { st.pickedUrl = null; applyAll(false); }
    ui.sameLine();
    if (ui.button("New random picture###nkpic", 220)) { st.pickedUrl = null; applyAll(false); }
    ui.sameLine();
    if (ui.button("Original picture###nkrestore", 200)) restore();
    ui.text("Status: " + st.status, [0.6, 0.6, 0.6, 1]);
});

__arFrame(function () {
    pollPreviews();
    pollTest();
    if (st.verifyAt && Date.now() > st.verifyAt) {
        st.verifyAt = 0;
        try {
            var np = findLocalNP(), u = customUrl();
            if (np && u) { var s = describePfpReadback(np, u); st.status += " | after 1.5 s: " + s; log("after 1.5 s: " + s); }
        } catch (e) { }
    }
    if (!st.applied || p.pfpMode === PFP_MODES[0]) return;
    var now = Date.now();
    if (now - st.lastCheck < 3000) return;
    st.lastCheck = now;
    var np2 = findLocalNP();
    if (!np2) return;
    var want = customMode() ? customUrl() : st.appliedUrl;
    if (want && npPfp(np2) !== want) applyAll(true);
});

onDisable(function () { restore(); });

loadLinks();
log("profile picture module ready - " + links.length + " link(s) loaded");

})();

; (function () {
// ---- module: deadeye_cosmetics.js ----
// game: com.dogelabs.deadeye
/*
 * deadeye_cosmetics.js - cosmetic picker and cosmetic changer for Animal Rivals.
 *
 * Picker:  choose a slot type and an item from the game's own catalog, press Equip.
 * Spammer: swaps random cosmetics on a timer so your look keeps changing.
 *
 * Everything goes through MannequinLockerManager.SetEquippedItemInternal with "save" turned OFF, so nothing
 * is written to your account's saved outfit. "Back to saved outfit" (or switching the plugin off) puts your real
 * outfit back. Other players should see the changes live because it publishes the equip like normal.
 * Items you don't own only work if your unlock hooks (animal_rivals) are on, and whether the server or other
 * players accept them is untested. The spam speed has a floor so it doesn't flood the network.
 */

var GAME_ASM = "DL.Animals.Core2025";
var MIN_SPAM_MS = 400;

var p = __arModuleProps("deadeye_cosmetics", [
    { type: "label", label: "Picker and changer for your outfit. Nothing is saved to your account." },
]);

var st = {
    items: [],            // { type, id, name }
    types: [],            // content types that have items
    typeIdx: 0, itemIdx: 0,
    status: "press Refresh Catalog (you need to be signed in, in the lobby)",
    spam: false, spamMs: 900, spamSlots: 0, lastSpam: 0, spamCount: 0,
};

function img() { return Il2Cpp.domain.assembly(GAME_ASM).image; }
function cls(n) { try { return img().class(n); } catch (e) { return null; } }
function sOf(v) { try { return v && !v.isNull() ? String(v.content) : ""; } catch (e) { return ""; } }

function locker() {
    var k = cls("MannequinLockerManager");
    if (!k) return null;
    try {
        var inst = k.field("Instance").value;
        return inst && !inst.isNull() ? inst : null;
    } catch (e) { return null; }
}

function lockerTypes(m) {
    var out = [];
    try {
        var list = m.method("GetContentTypes", 0).invoke();
        var n = Number(list.method("get_Count", 0).invoke());
        for (var i = 0; i < n; i++) out.push(sOf(list.method("get_Item", 1).invoke(i)));
    } catch (e) { }
    return out;
}

function refreshCatalog() {
    var m = locker();
    if (!m) { st.status = "locker isn't loaded yet (get into the game first)"; return false; }
    var k = cls("DLCatalogItem");
    if (!k) { st.status = "catalog class not found"; return false; }
    var allowed = lockerTypes(m);
    var all = [];
    try { all = Il2Cpp.gc.choose(k); } catch (e) { st.status = "catalog scan failed: " + e; return false; }
    var items = [], seen = {};
    for (var i = 0; i < all.length; i++) {
        var o = all[i];
        try {
            if (o.method("IsBundle", 0).invoke()) continue;
            var type = sOf(o.method("GetContentType", 0).invoke());
            var id = sOf(o.method("GetID", 0).invoke());
            if (!type || !id || seen[id]) continue;
            if (allowed.length && allowed.indexOf(type) < 0) continue;
            var name = sOf(o.method("GetName", 0).invoke()) || id.slice(0, 8);
            seen[id] = 1;
            items.push({ type: type, id: id, name: name });
        } catch (e) { }
    }
    items.sort(function (a, b) { return a.type === b.type ? (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) : (a.type < b.type ? -1 : 1); });
    var types = [];
    items.forEach(function (it) { if (types.indexOf(it.type) < 0) types.push(it.type); });
    st.items = items; st.types = types;
    st.typeIdx = Math.min(st.typeIdx, Math.max(0, types.length - 1));
    st.itemIdx = 0;
    st.status = items.length + " items in " + types.length + " slot types";
    log(st.status + " (locker slot types: " + allowed.join(", ") + ")");
    return items.length > 0;
}

function itemsOfType(type) { return st.items.filter(function (it) { return it.type === type; }); }

function equip(it) {
    var m = locker();
    if (!m || !it) return false;
    try {
        // scheduleSave=false (no account save), publishNetworkChange=true (others see it), notifyListeners=true (UI updates)
        var ok = m.method("SetEquippedItemInternal", 5).invoke(Il2Cpp.string(it.type), Il2Cpp.string(it.id), false, true, true);
        return !!ok;
    } catch (e) { log("equip failed: " + e); return false; }
}

function backToSaved() {
    var m = locker();
    if (!m) return false;
    try {
        var slot = Number(m.method("get_CurrentLockerSaveSlotIndex", 0).invoke());
        m.method("SelectLockerOutfit", 1).invoke(slot);
        st.status = "back to your saved outfit";
        return true;
    } catch (e) { log("restore failed: " + e); return false; }
}

function spamOnce() {
    if (!st.items.length) { if (!refreshCatalog()) { st.spam = false; return; } }
    var type;
    if (st.spamSlots === 1 && st.types.length) type = st.types[st.typeIdx];   // only the slot picked above
    else type = st.types[Math.floor(Math.random() * st.types.length)];
    var pool = itemsOfType(type);
    if (!pool.length) return;
    var it = pool[Math.floor(Math.random() * pool.length)];
    if (equip(it)) st.spamCount++;
}

var SPAM_SCOPES = ["Every slot", "Only the slot picked above"];

__arCategory("deadeye_cosmetics", function (ui) {
    ui.text("Status: " + st.status, [0.6, 0.6, 0.6, 1]);
    if (ui.button("Refresh Catalog###cosrefresh", 200)) { refreshCatalog(); notify("Cosmetics: " + st.status); }
    ui.sameLine();
    if (ui.button("Back To Saved Outfit###cosback", 240)) { st.spam = false; notify(backToSaved() ? "Cosmetics: saved outfit restored" : "Cosmetics: couldn't restore"); }
    if (!st.items.length) return;

    ui.separator();
    var tr = ref(st.typeIdx);
    if (ui.combo("Slot", tr, st.types)) { st.typeIdx = tr.v; st.itemIdx = 0; }
    var list = itemsOfType(st.types[st.typeIdx]);
    if (st.itemIdx >= list.length) st.itemIdx = 0;
    var ir = ref(st.itemIdx);
    if (ui.combo("Item", ir, list.map(function (it) { return it.name.slice(0, 42); }))) st.itemIdx = ir.v;
    if (ui.button("<###cosprev", 60)) st.itemIdx = (st.itemIdx - 1 + list.length) % list.length;
    ui.sameLine();
    if (ui.button(">###cosnext", 60)) st.itemIdx = (st.itemIdx + 1) % list.length;
    ui.sameLine();
    if (ui.button("Equip###cosequip", 150)) notify(equip(list[st.itemIdx]) ? "Equipped " + list[st.itemIdx].name : "Equip failed (see log)");
    ui.sameLine();
    if (ui.button("Random One###cosrand", 170)) { var r = list[Math.floor(Math.random() * list.length)]; notify(equip(r) ? "Equipped " + r.name : "Equip failed"); }

    ui.separator();
    ui.text("Changer (swaps cosmetics on a timer)");
    var sr = ref(st.spam);
    if (ui.checkbox("Spam random cosmetics", sr, "keeps changing your look; nothing is saved")) { st.spam = sr.v; st.spamCount = 0; if (!st.spam) backToSaved(); }
    var mr = ref(st.spamMs);
    if (ui.sliderInt("Change every (ms)", mr, MIN_SPAM_MS, 5000)) st.spamMs = mr.v;
    var cr = ref(st.spamSlots);
    if (ui.combo("Which slots", cr, SPAM_SCOPES)) st.spamSlots = cr.v;
    ui.text("Changes so far: " + st.spamCount, [0.6, 0.6, 0.6, 1]);
});

__arFrame(function () {
    if (!st.spam) return;
    var now = Date.now();
    if (now - st.lastSpam < Math.max(MIN_SPAM_MS, st.spamMs)) return;
    st.lastSpam = now;
    try { spamOnce(); } catch (e) { log("spam: " + e); st.spam = false; }
});

onDisable(function () { if (st.spam || st.spamCount > 0) backToSaved(); st.spam = false; });

log("cosmetics plugin ready - open its section in the Plugins tab and press Refresh Catalog");

})();

; (function () {
// ---- module: deadeye_join.js ----
// game: com.dogelabs.deadeye
/*
 * deadeye_join.js - "Random Server" and "Join Code" buttons at the top of the menu, next to Close.
 *
 * Random Server: asks the game's matchmaking for a different random public lobby
 *                (NetworkMatchmaking.JoinRandomLobbyRoom, avoiding the room you are in).
 * Join Code:     opens a room-code text field; the universal menu keyboard types the code, then join it through the same
 *                code-entry tab the in-game computer uses, so the game does its own checks.
 *                (needs the computer's room-code tab to exist in the scene, so use it from the lobby)
 *
 * The first press of Random Server only arms it (the button changes), the second press within 4 seconds joins.
 */

var GAME_ASM = "DL.Animals.Core2025";
var PRIV_TAB = "ComputerTerminal.ComputerTerminalUIScripts.Computer.SubTabs.SubTabEnterPrivateRoom";
var PUB_TAB = "ComputerTerminal.ComputerTerminalUIScripts.Computer.SubTabs.SubTabEnterRandomPublicRoom";
var MAX_CODE = 12;

var st = { open: false, code: "", codeRef: { v: "" }, armedAt: 0, status: "" };

function img() { return Il2Cpp.domain.assembly(GAME_ASM).image; }
function cls(n) { try { return img().class(n); } catch (e) { return null; } }
function anyClass(name) {
    var k = cls(name);
    if (k) return k;
    try {
        var asms = Il2Cpp.domain.assemblies;
        for (var i = 0; i < asms.length; i++) { try { var c = asms[i].image.class(name); if (c) return c; } catch (e) { } }
    } catch (e) { }
    return null;
}
function sOf(v) { try { return v && !v.isNull() ? String(v.content) : ""; } catch (e) { return ""; } }

var unityObj = null;
function objectsOf(klass) {
    var out = [];
    if (!klass) return out;
    try {
        if (!unityObj) unityObj = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image.class("UnityEngine.Object");
        function push(arr) { for (var i = 0; arr && i < arr.length; i++) { var v = arr.get(i); if (v && !v.isNull()) out.push(v); } }
        try { push(unityObj.method("FindObjectsByType", 3).overload("System.Type", "UnityEngine.FindObjectsInactive", "UnityEngine.FindObjectsSortMode").invoke(klass.type.object, 1, 0)); }
        catch (e) { push(unityObj.method("FindObjectsByType", 2).overload("System.Type", "UnityEngine.FindObjectsSortMode").invoke(klass.type.object, 0)); }
    } catch (e) { }
    return out;
}

function note(msg) { st.status = msg; log(msg); try { notify(msg); } catch (e) { } }

function joinRandom() {
    var mm = cls("NetworkMatchmaking");
    var current = "";
    try { current = sOf(mm.method("GetCurrentSessionName", 0).invoke()); } catch (e) { }
    try {
        mm.method("JoinRandomLobbyRoom", 2).invoke(false, Il2Cpp.string(current || ""));
        note("Joining a random server...");
        return true;
    } catch (e) { log("matchmaking call failed: " + e); }
    // fallback: the computer's own "random public room" button
    var tab = objectsOf(anyClass(PUB_TAB))[0];
    if (tab) {
        try { tab.method("EnterRandomLobby", 0).invoke(); note("Joining a random server (computer tab)..."); return true; } catch (e) { log("computer tab call failed: " + e); }
    }
    note("Couldn't start the join (see log). Try from the lobby.");
    return false;
}

function joinCode(code) {
    code = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!code) { note("Type a room code first"); return false; }
    var tab = objectsOf(anyClass(PRIV_TAB))[0];
    if (!tab) { note("No room-code tab found. Go to the lobby (the computer must be loaded) and try again."); return false; }
    try {
        tab.method("OnEnterPressed", 1).invoke(Il2Cpp.string(code));
        note("Joining room " + code + "...");
        return true;
    } catch (e) { log("room code call failed: " + e); note("Join failed (see log)"); return false; }
}

// ---- top bar ---------------------------------------------------------------------------------------------
__arCategory("deadeye_join", function (ui) {
    var armed = Date.now() - st.armedAt < 4000;
    if (ui.button((armed ? "Really join random?" : "Random Server") + "###joinrand")) {
        if (armed) { st.armedAt = 0; joinRandom(); } else st.armedAt = Date.now();
    }
    ui.sameLine();
    if (ui.button((st.open ? "Close Code Entry" : "Join Code") + "###joincode")) st.open = !st.open;
});

__arCategory("deadeye_join", function (ui) {
    if (st.status) ui.text(st.status, [0.6, 0.6, 0.6, 1]);
    if (!st.open) return;
    ui.separator();
    if (st.codeRef.v !== st.code) { st.code = String(st.codeRef.v).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, MAX_CODE); st.codeRef.v = st.code; }
    ui.inputText("Room code", st.codeRef);
    ui.text("Code: " + (st.code || "(empty)") + "   [" + st.code.length + "/" + MAX_CODE + "]");
    ui.sameLine();
    if (ui.button("Join###jkjoin", 120)) { if (joinCode(st.code)) st.open = false; }
    ui.separator();
});

__arCategory("deadeye_join", function (ui) {
    ui.text("The Random Server and Join Code buttons are at the top of the menu, next to Close.");
    ui.text("Status: " + (st.status || "idle"), [0.6, 0.6, 0.6, 1]);
});

log("join buttons ready (top of the menu)");

})();

; (function () {
// ---- module: map_loader.js ----
// game: com.dogelabs.deadeye
"use strict";
/*
 * map_loader.js - local custom map / model loader for Animal Rivals (com.dogelabs.deadeye)
 *
 * Put .obj files (exported from Blender) in  <files>/imgui_plugins/maps/  next to an optional texture
 * with the same name (mymap.obj + mymap.png). Open this plugin's tab, pick the map, press Go.
 *
 * What Go does:
 *   1. saves your return point (position + yaw)
 *   2. loads the model (mesh + MeshCollider) far away from the real map
 *   3. noclip on          (player colliders off so nothing can shove you during the jump)
 *   4. teleports the rig to the map's spawn point (PlayerController.TeleportRig, the game's own teleport)
 *   5. freezes you        (kinematic rigidbody + locomotion off + position re-applied every frame)
 *   6. noclip off, unfreeze so you can walk / climb on the model
 * Return does the same jump back to the saved point and deletes the map.
 *
 * Spawn point: add a small object named "spawn" (any mesh, even one triangle) in Blender. Its centre is
 * used as the spawn and it is NOT rendered or solid. No spawn object = centre of the model, a bit above it.
 *
 * Blender export: Wavefront (.obj), Forward -Z, Up Y, Triangulate faces on, UVs on. Apply scale first.
 * Optional second path: put an AssetBundle (.bundle / .assetbundle / .unity3d) in the same folder. It is
 * loaded with AssetBundle.LoadFromFile, first GameObject in it is instantiated. It must be built with the
 * same Unity version as the game. Colliders are added to any mesh that has none.
 *
 * Everything is LOCAL. Other players see you standing still or in the void, so use private rooms.
 * The game has an AntiCheatManager (value watches, rpc checks). Nothing in the dump watches rig position,
 * but if you get snapped back the status line says so.
 */

var APP_ID = "com.dogelabs.deadeye";
try { var _a = ui.appId(); if (_a) APP_ID = String(_a); } catch (e) {}

var PREF_SHADERS = ["Universal Render Pipeline/Unlit", "Unlit/Texture", "Sprites/Default", "Unlit/Color", "UI/Default",
	"Mobile/Unlit (Supports Lightmap)", "Universal Render Pipeline/Simple Lit", "Universal Render Pipeline/Lit", "Standard"];
var FRAME_BUDGET_MS = 6;       // parsing never takes longer than this per frame, so the headset keeps rendering
var MAX_FILE_BYTES = 120 * 1024 * 1024;

var p = __arModuleProps("map_loader", [
	{ type: "int",   key: "distance", label: "Map distance (units)", min: 200, max: 6000, default: 2000, desc: "how far from your current spot the map is spawned" },
	{ type: "float", key: "height",   label: "Map height offset",    min: -200, max: 200, default: 0, decimals: 0, desc: "added to your current height" },
	{ type: "float", key: "scale",    label: "Map scale",            min: 0.05, max: 20, default: 1, decimals: 2 },
	{ type: "bool",  key: "flipx",    label: "Flip X (Blender to Unity)", default: true, desc: "OBJ is right handed, Unity is left handed. Turn off if your map comes out mirrored" },
	{ type: "bool",  key: "yaw",      label: "Restore facing on Return", default: true },
	{ type: "int",   key: "layer",    label: "Map layer (-1 = auto)", min: -1, max: 31, default: -1, desc: "auto picks a layer the game's locomotion collides with" },
	{ type: "int",   key: "settle",   label: "Settle frames", min: 2, max: 60, default: 12, desc: "frames to hold you frozen after the teleport before unfreezing" },
]);

// ---------------------------------------------------------------------------------------------
// state
// ---------------------------------------------------------------------------------------------
var S = {
	maps: [], mapSel: ref(0), dir: "", scanned: false,
	status: "idle", statusKind: 0,        // 0 info, 1 good, 2 warn, 3 bad
	job: null, jobName: "", frameStart: 0,
	saved: null,                          // { pos:[x,y,z], yaw }
	map: null,                            // { go, mesh, mat, tex, origin, spawn, name, bundle }
	frozen: null,                         // { pos, rb, wasKin, g, gWasDisabled, until }
	noclip: null,                         // { list:[{c,was}], rb, wasDetect }
	lastWatch: 0, watchWarned: false,
	frames: 0,
};

function setStatus(s, kind) { S.status = String(s); S.statusKind = kind || 0; log(S.status); }

// ---------------------------------------------------------------------------------------------
// il2cpp helpers (every one of them is allowed to fail)
// ---------------------------------------------------------------------------------------------
var _clsCache = {};
function cls(name) {
	if (_clsCache[name] !== undefined) return _clsCache[name];
	var found = null;
	try {
		var asms = Il2Cpp.domain.assemblies;
		for (var i = 0; i < asms.length && !found; i++) {
			try { var c = asms[i].image.tryClass(name); if (c) found = c; } catch (e) {}
		}
	} catch (e) {}
	_clsCache[name] = found;
	return found;
}
function must(name) { var k = cls(name); if (!k) throw new Error("class " + name + " not in this game (stripped?)"); return k; }

function bindTo(m, obj) {
	if (typeof m.bind === "function") return m.bind(obj);
	if (typeof m.withHolder === "function") return m.withHolder(obj);
	return null;
}
function pickOverload(obj, klass, name, count, ok) {
	try { var m = obj.method(name, count); if (ok(m.parameters)) return m; } catch (e) {}
	var ms = klass.methods;
	for (var i = 0; i < ms.length; i++) {
		var m2 = ms[i];
		if (m2.name !== name || m2.parameterCount !== count || !ok(m2.parameters)) continue;
		var b = bindTo(m2, obj);
		if (b) return b;
	}
	throw new Error(name + "/" + count + " overload not found");
}
function vt(klass, floats) {
	var mem = Memory.alloc(Math.max(16, floats.length * 4));
	for (var i = 0; i < floats.length; i++) mem.add(i * 4).writeFloat(floats[i]);
	return new Il2Cpp.ValueType(mem, klass.type);
}
function v3(a) { return vt(must("UnityEngine.Vector3"), a); }
function xyz(v) { return [v.handle.readFloat(), v.handle.add(4).readFloat(), v.handle.add(8).readFloat()]; }
function rawArray(klass, count, data) {
	var arr = Il2Cpp.array(klass, count);
	var base = null;
	try { base = arr.elements.handle; } catch (e) {}
	if (!base) base = arr.handle.add(Process.pointerSize * 4);
	base.writeByteArray(data);
	return arr;
}
var _ptrOff = -2;
function alive(o) {
	if (!o) return false;
	try { if (o.isNull()) return false; } catch (e) { return false; }
	if (_ptrOff === -2) { try { _ptrOff = must("UnityEngine.Object").field("m_CachedPtr").offset; } catch (e) { _ptrOff = -1; } }
	if (_ptrOff < 0) return true;
	try { return !o.handle.add(_ptrOff).readPointer().isNull(); } catch (e) { return false; }
}
function destroyObj(o) { try { if (o && !o.isNull()) must("UnityEngine.Object").method("Destroy", 1).invoke(o); } catch (e) {} }
function str(s) { return Il2Cpp.string(s); }

function typeObj(klass) { return klass.type.object; }
function componentCall(name, go, klass) {
	var strategies = [
		function () { var m = go.method(name, 1); if (m.parameters[0].type.name !== "System.Type") throw 0; return m.invoke(typeObj(klass)); },
		function () { var m = pickOverload(go, must("UnityEngine.GameObject"), name, 1, function (ps) { return ps[0].type.name === "System.Type"; }); return m.invoke(typeObj(klass)); },
		function () { return go.method(name, 0).inflate(klass).invoke(); },
	];
	for (var i = 0; i < strategies.length; i++) {
		try { var r = strategies[i](); if (r && !r.isNull()) return r; } catch (e) {}
	}
	return null;
}
function getComp(go, klass) { return componentCall("GetComponent", go, klass); }
function addComp(go, klass) { return componentCall("AddComponent", go, klass); }

// ---------------------------------------------------------------------------------------------
// player rig: PlayerController (dump: static Instance, Rigidbody, Colliders, ActiveGorillaPlayer,
// static TeleportRig(Vector3 pos, bool applyRotation, float rotY))
// ---------------------------------------------------------------------------------------------
function getPC() {
	var K = must("PlayerController");
	var inst = K.field("Instance").value;
	if (!inst || inst.isNull() || !alive(inst)) return null;
	return inst;
}
function fieldObj(o, name) {
	try { var v = o.field(name).value; if (v && !v.isNull() && alive(v)) return v; } catch (e) {}
	return null;
}
function rbOf(pc) { return fieldObj(pc, "Rigidbody"); }
function gorillaOf(pc) { return fieldObj(pc, "ActiveGorillaPlayer"); }
function readPos(pc) {
	var rb = rbOf(pc);
	if (rb) { try { return xyz(rb.method("get_position", 0).invoke()); } catch (e) {} }
	var t = pc.method("get_transform", 0).invoke();
	return xyz(t.method("get_position", 0).invoke());
}
function readYaw(pc) {
	try { var t = pc.method("get_transform", 0).invoke(); return xyz(t.method("get_eulerAngles", 0).invoke())[1]; } catch (e) { return 0; }
}
function readHead(pc) {
	try { var cam = fieldObj(pc, "playerCamera"); if (cam) { var t = cam.method("get_transform", 0).invoke(); return xyz(t.method("get_position", 0).invoke()); } } catch (e) {}
	return null;
}
function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

// set position directly (fallback when TeleportRig does not do the job)
function forceSetPos(pc, pos) {
	var did = [];
	var rb = rbOf(pc);
	if (rb) { try { rb.method("set_position", 1).invoke(v3(pos)); did.push("rb"); } catch (e) {} }
	try { var t = pc.method("get_transform", 0).invoke(); t.method("set_position", 1).invoke(v3(pos)); did.push("transform"); } catch (e) {}
	try { must("UnityEngine.Physics").method("SyncTransforms", 0).invoke(); } catch (e) {}
	return did.join("+");
}
function zeroVelocity(rb) {
	var z = v3([0, 0, 0]);
	var ok = false;
	try { rb.method("set_velocity", 1).invoke(z); ok = true; } catch (e) {}
	try { rb.method("set_linearVelocity", 1).invoke(z); ok = true; } catch (e) {}
	try { rb.method("set_angularVelocity", 1).invoke(z); } catch (e) {}
	return ok;
}
// returns a short text of how it was done
function teleport(pos, yaw) {
	var pc = getPC();
	if (!pc) throw new Error("no PlayerController (not in a scene with a player?)");
	var K = must("PlayerController");
	var how = "";
	try {
		K.method("TeleportRig", 3).invoke(v3(pos), yaw !== null && yaw !== undefined, yaw || 0);
		how = "TeleportRig";
	} catch (e) {
		how = "TeleportRig failed (" + e + "), ";
		how += "set position: " + forceSetPos(pc, pos);
	}
	return how;
}

// ---------------------------------------------------------------------------------------------
// noclip / freeze
// ---------------------------------------------------------------------------------------------
function listItems(list) {
	var out = [];
	try {
		var n = list.method("get_Count", 0).invoke();
		for (var i = 0; i < n; i++) { try { var o = list.method("get_Item", 1).invoke(i); if (o && !o.isNull()) out.push(o); } catch (e) {} }
	} catch (e) {}
	return out;
}
function noclipOn() {
	if (S.noclip) return;
	var pc = getPC();
	if (!pc) return;
	var st = { list: [], rb: null, wasDetect: true };
	var seen = {};
	function add(c) {
		if (!c || c.isNull() || !alive(c)) return;
		var key = String(c.handle);
		if (seen[key]) return; seen[key] = 1;
		try { var was = c.method("get_enabled", 0).invoke(); st.list.push({ c: c, was: !!was }); c.method("set_enabled", 1).invoke(false); } catch (e) {}
	}
	try { var cl = fieldObj(pc, "Colliders"); if (cl) listItems(cl).forEach(add); } catch (e) {}
	var g = gorillaOf(pc);
	if (g) { add(fieldObj(g, "headCollider")); add(fieldObj(g, "bodyCollider")); }
	var rb = rbOf(pc);
	if (rb) { st.rb = rb; try { st.wasDetect = !!rb.method("get_detectCollisions", 0).invoke(); rb.method("set_detectCollisions", 1).invoke(false); } catch (e) {} }
	S.noclip = st;
}
function noclipOff() {
	var st = S.noclip;
	if (!st) return;
	S.noclip = null;
	for (var i = 0; i < st.list.length; i++) {
		var e = st.list[i];
		try { if (alive(e.c)) e.c.method("set_enabled", 1).invoke(e.was); } catch (err) {}
	}
	try { if (st.rb && alive(st.rb)) st.rb.method("set_detectCollisions", 1).invoke(st.wasDetect); } catch (err) {}
}
function freezeOn() {
	if (S.frozen) return;
	var pc = getPC();
	if (!pc) return;
	var rb = rbOf(pc), g = gorillaOf(pc);
	var st = { pos: readPos(pc), rb: rb, wasKin: false, g: g, gWas: false };
	if (rb) {
		try { st.wasKin = !!rb.method("get_isKinematic", 0).invoke(); } catch (e) {}
		zeroVelocity(rb);
		try { rb.method("set_isKinematic", 1).invoke(true); } catch (e) {}
	}
	if (g) { try { st.gWas = !!g.field("disableMovement").value; g.field("disableMovement").value = true; } catch (e) {} }
	S.frozen = st;
}
function freezeSetPos(pos) { if (S.frozen) S.frozen.pos = pos.slice(); }
function freezeOff() {
	var st = S.frozen;
	if (!st) return;
	S.frozen = null;
	try { if (st.rb && alive(st.rb)) { st.rb.method("set_isKinematic", 1).invoke(st.wasKin); zeroVelocity(st.rb); } } catch (e) {}
	try { if (st.g && alive(st.g)) st.g.field("disableMovement").value = st.gWas; } catch (e) {}
}
// every frame while frozen: if anything moved us, put us back
function holdFrozen() {
	var st = S.frozen;
	if (!st) return;
	var pc = getPC();
	if (!pc) return;
	var now = readPos(pc);
	if (dist(now, st.pos) > 0.05) {
		forceSetPos(pc, st.pos);
		if (st.rb && alive(st.rb)) zeroVelocity(st.rb);
	}
}
function restoreAll() { noclipOff(); freezeOff(); }

// ---------------------------------------------------------------------------------------------
// layer choice: the game's gorilla locomotion sphere-casts only against its LayerMask
// ---------------------------------------------------------------------------------------------
function maskOf(g, fname) {
	try { var v = g.field(fname).value; if (v && v.handle) return v.handle.readS32(); } catch (e) {}
	return null;
}
function lowestBit(mask) { for (var i = 0; i < 32; i++) if (mask & (1 << i)) return i; return -1; }
function pickLayer() {
	if (p.layer >= 0) return { layer: p.layer, why: "set by you" };
	try {
		var pc = getPC(), g = pc ? gorillaOf(pc) : null;
		if (g) {
			var names = ["_currentLocomotionEnabledLayers", "defaultLocomotionLayers", "_currentLocomotionLeftHandEnabledLayers", "_currentLocomotionRightHandEnabledLayers"];
			var masks = names.map(function (n) { return maskOf(g, n); }).filter(function (m) { return m !== null && m !== 0; });
			if (masks.length) {
				var all = masks.reduce(function (a, b) { return a & b; }, -1);
				if (all & 1) return { layer: 0, why: "Default is in every locomotion mask" };
				var b = lowestBit(all);
				if (b >= 0) return { layer: b, why: "first layer shared by all locomotion masks" };
				if (masks[0] & 1) return { layer: 0, why: "Default is in the current mask" };
				b = lowestBit(masks[0]);
				if (b >= 0) return { layer: b, why: "first layer of the current mask (hands may differ)" };
			}
		}
	} catch (e) {}
	return { layer: 0, why: "fallback Default (could not read the masks)" };
}
function setLayerDeep(go, layer) {
	try {
		go.method("set_layer", 1).invoke(layer);
		var t = go.method("get_transform", 0).invoke();
		var n = t.method("get_childCount", 0).invoke();
		for (var i = 0; i < n; i++) {
			try { var ch = t.method("GetChild", 1).invoke(i); setLayerDeep(ch.method("get_gameObject", 0).invoke(), layer); } catch (e) {}
		}
	} catch (e) {}
}

// ---------------------------------------------------------------------------------------------
// materials
// ---------------------------------------------------------------------------------------------
var _shader = null, _shaderName = "";
function findShader() {
	if (_shader && alive(_shader)) return _shader;
	_shader = null;
	var Shader = must("UnityEngine.Shader");
	for (var i = 0; i < PREF_SHADERS.length; i++) {
		try {
			var s = Shader.method("Find").invoke(str(PREF_SHADERS[i]));
			if (s && !s.isNull()) { _shader = s; _shaderName = PREF_SHADERS[i]; return s; }
		} catch (e) {}
	}
	// stripped from the build: borrow one from a material that is already loaded (always works in VR)
	try {
		var MatK = must("UnityEngine.Material");
		var arr = must("UnityEngine.Resources").method("FindObjectsOfTypeAll", 1).invoke(typeObj(MatK));
		var best = null, bestScore = -1, bestName = "";
		var lim = Math.min(arr.length, 600);
		for (var j = 0; j < lim; j++) {
			try {
				var m = arr.get(j);
				if (!m || m.isNull()) continue;
				var sh = m.method("get_shader", 0).invoke();
				if (!sh || sh.isNull()) continue;
				var nm = String(sh.method("get_name", 0).invoke().content);
				var sc = /unlit/i.test(nm) && !/(lit)/i.test(nm.replace(/unlit/ig, "")) ? 5 : /unlit|sprites\/default|ui\/default/i.test(nm) ? 4 : /simple ?lit/i.test(nm) ? 3 : /\blit\b/i.test(nm) ? 2 : /standard/i.test(nm) ? 1 : 0;
				if (sc > bestScore) { best = sh; bestScore = sc; bestName = nm; if (sc === 5) break; }
			} catch (e) {}
		}
		if (best) { _shader = best; _shaderName = bestName + " (borrowed)"; return best; }
	} catch (e) {}
	throw new Error("no usable shader found (tried Shader.Find and loaded materials)");
}
function makeMaterial(tex) {
	var Mat = must("UnityEngine.Material");
	var sh = findShader();
	var mat = Mat.alloc();
	pickOverload(mat, Mat, ".ctor", 1, function (ps) { return ps[0].type.name === "UnityEngine.Shader"; }).invoke(sh);
	var Color = must("UnityEngine.Color");
	if (tex) {
		try { mat.method("set_mainTexture", 1).invoke(tex); } catch (e) {}
		try { mat.method("set_color", 1).invoke(vt(Color, [1, 1, 1, 1])); } catch (e) {}
	} else {
		try { mat.method("set_color", 1).invoke(vt(Color, [0.78, 0.8, 0.84, 1])); } catch (e) {}
	}
	try { mat.method("SetFloat", 2).invoke(str("_Cull"), 0); } catch (e) {}       // double sided, in case the winding came out flipped
	return mat;
}

// ---------------------------------------------------------------------------------------------
// texture loading (ImageConversion.LoadImage, same recipe as the menu's ui.loadImage)
// ---------------------------------------------------------------------------------------------
function loadTexture(path) {
	var buf = File.readAllBytes(path);
	if (!buf || buf.byteLength < 16) return null;
	var Tex2D = must("UnityEngine.Texture2D");
	var IC = must("UnityEngine.ImageConversion");
	var tex = Tex2D.alloc();
	pickOverload(tex, Tex2D, ".ctor", 4, function (ps) { return ps[2].type.name.indexOf("TextureFormat") >= 0 && ps[3].type.name === "System.Boolean"; }).invoke(2, 2, 4, true);
	var ByteK = cls("System.Byte") || Il2Cpp.corlib.class("System.Byte");
	var arr = rawArray(ByteK, buf.byteLength, buf);
	var ok = pickOverload(IC, IC, "LoadImage", 2, function (ps) { return /Byte\[\]$/.test(ps[1].type.name); }).invoke(tex, arr);
	if (!ok) { destroyObj(tex); throw new Error("could not decode " + path + " (png / jpg only)"); }
	try { tex.method("set_wrapMode", 1).invoke(0); } catch (e) {}
	try { tex.method("set_anisoLevel", 1).invoke(4); } catch (e) {}
	return tex;
}

// ---------------------------------------------------------------------------------------------
// folder / file listing
// ---------------------------------------------------------------------------------------------
function libc(name, ret, args) {
	var addr = null;
	try { addr = Module.findGlobalExportByName(name); } catch (e) {}
	if (!addr) { try { addr = Module.findExportByName(null, name); } catch (e) {} }
	return addr ? new NativeFunction(addr, ret, args) : null;
}
var c_opendir = libc("opendir", "pointer", ["pointer"]), c_readdir = libc("readdir", "pointer", ["pointer"]);
var c_closedir = libc("closedir", "int", ["pointer"]), c_mkdir = libc("mkdir", "int", ["pointer", "int"]);
function listDir(dir) {
	if (!c_opendir || !c_readdir) return null;
	var d = c_opendir(Memory.allocUtf8String(dir));
	if (d.isNull()) return null;
	var out = [];
	try {
		for (var i = 0; i < 2000; i++) {
			var ent = c_readdir(d);
			if (ent.isNull()) break;
			var type = ent.add(18).readU8(), name = ent.add(19).readUtf8String() || "";
			if (type === 8 || type === 0) out.push(name);
		}
	} finally { if (c_closedir) c_closedir(d); }
	return out.sort();
}
function resolveDir() {
	var cands = [
		"/storage/emulated/0/Android/data/" + APP_ID + "/files/imgui_plugins",
		"/sdcard/Android/data/" + APP_ID + "/files/imgui_plugins",
		"/storage/emulated/0/Android/data/" + APP_ID + "/files",
	];
	for (var i = 0; i < cands.length; i++) { if (listDir(cands[i]) !== null) return cands[i]; }
	return cands[0];
}
function scanMaps() {
	S.scanned = true;
	if (!S.dir) S.dir = resolveDir();
	var mapDir = S.dir + "/maps";
	if (c_mkdir) { try { c_mkdir(Memory.allocUtf8String(mapDir), 511); } catch (e) {} }
	var files = listDir(mapDir);
	var prev = S.maps[S.mapSel.v] ? S.maps[S.mapSel.v].file : "";
	S.maps = [];
	if (files === null) { setStatus("can't read " + mapDir, 3); return; }
	var set = {};
	files.forEach(function (f) { set[f.toLowerCase()] = f; });
	files.forEach(function (f) {
		var lower = f.toLowerCase(), base = f.replace(/\.[^.]+$/, ""), b = base.toLowerCase();
		var kind = /\.obj$/.test(lower) ? "obj" : /\.(bundle|assetbundle|unity3d)$/.test(lower) ? "bundle" : "";
		if (!kind) return;
		var tex = "";
		var exts = [".png", ".jpg", ".jpeg"];
		for (var i = 0; i < exts.length; i++) { if (set[b + exts[i]]) { tex = mapDir + "/" + set[b + exts[i]]; break; } }
		S.maps.push({ file: f, path: mapDir + "/" + f, kind: kind, tex: tex, name: base });
	});
	var idx = S.maps.findIndex(function (m) { return m.file === prev; });
	S.mapSel.v = idx >= 0 ? idx : 0;
	log("maps: " + S.maps.length + " in " + mapDir);
}

// ---------------------------------------------------------------------------------------------
// OBJ parser, chunked over frames (generator). returns { pos, uv, tris, count, spawn, bounds }
// ---------------------------------------------------------------------------------------------
function* parseObj(text, flipX) {
	var lines = text.split("\n");
	var vx = [], vy = [], vz = [], tu = [], tv = [];
	var outPos = [], outUv = [], tris = [];
	var keyMap = new Map();
	var curSpawn = false, spawnSum = [0, 0, 0], spawnN = 0;
	var mn = [1e30, 1e30, 1e30], mx = [-1e30, -1e30, -1e30];
	var nOut = 0;
	var sx = flipX ? -1 : 1;
	var fi = [], fvt = [];
	var totalLines = lines.length;

	for (var li = 0; li < totalLines; li++) {
		if ((li & 511) === 0) {
			if (Date.now() - S.frameStart > FRAME_BUDGET_MS) {
				S.statusKind = 0; S.status = "parsing " + S.jobName + " " + Math.floor(li * 100 / totalLines) + "%";
				yield;
			}
		}
		var line = lines[li];
		if (line.length < 2) continue;
		var c0 = line.charCodeAt(0), c1 = line.charCodeAt(1);
		if (c0 === 118 /* v */) {
			if (c1 === 32) {
				var t = line.trim().split(/\s+/);
				vx.push(parseFloat(t[1]) * sx); vy.push(parseFloat(t[2])); vz.push(parseFloat(t[3]));
			} else if (c1 === 116 /* vt */) {
				var t2 = line.trim().split(/\s+/);
				tu.push(parseFloat(t2[1])); tv.push(parseFloat(t2[2]));
			}
		} else if (c0 === 102 /* f */ && c1 === 32) {
			var tk = line.trim().split(/\s+/);
			var n = tk.length - 1;
			if (n < 3) continue;
			fi.length = 0; fvt.length = 0;
			for (var k = 1; k <= n; k++) {
				var parts = tk[k].split("/");
				var vi = parseInt(parts[0], 10);
				vi = vi < 0 ? vx.length + vi : vi - 1;
				var ti = -1;
				if (parts.length > 1 && parts[1] !== "") { ti = parseInt(parts[1], 10); ti = ti < 0 ? tu.length + ti : ti - 1; }
				fi.push(vi); fvt.push(ti);
			}
			if (curSpawn) {
				for (var s = 0; s < fi.length; s++) {
					var q = fi[s];
					if (q >= 0 && q < vx.length) { spawnSum[0] += vx[q]; spawnSum[1] += vy[q]; spawnSum[2] += vz[q]; spawnN++; }
				}
				continue;
			}
			var idx = [];
			for (var m = 0; m < fi.length; m++) {
				var vi2 = fi[m], ti2 = fvt[m];
				if (!(vi2 >= 0 && vi2 < vx.length)) { idx.push(-1); continue; }
				var key = vi2 * 8388608 + (ti2 + 1);
				var o = keyMap.get(key);
				if (o === undefined) {
					o = nOut++;
					keyMap.set(key, o);
					var x = vx[vi2], y = vy[vi2], z = vz[vi2];
					outPos.push(x, y, z);
					if (ti2 >= 0 && ti2 < tu.length) outUv.push(tu[ti2], tv[ti2]); else outUv.push(0, 0);
					if (x < mn[0]) mn[0] = x; if (y < mn[1]) mn[1] = y; if (z < mn[2]) mn[2] = z;
					if (x > mx[0]) mx[0] = x; if (y > mx[1]) mx[1] = y; if (z > mx[2]) mx[2] = z;
				}
				idx.push(o);
			}
			for (var f = 1; f + 1 < idx.length; f++) {
				var a = idx[0], b = idx[f], c = idx[f + 1];
				if (a < 0 || b < 0 || c < 0) continue;
				if (flipX) tris.push(a, c, b); else tris.push(a, b, c);
			}
		} else if ((c0 === 111 /* o */ || c0 === 103 /* g */) && c1 === 32) {
			curSpawn = /^spawn/i.test(line.substring(2).trim());
		}
	}
	if (!nOut || !tris.length) throw new Error("no geometry in the OBJ (need v and f lines; triangulate faces on export)");
	var spawn = spawnN ? [spawnSum[0] / spawnN, spawnSum[1] / spawnN, spawnSum[2] / spawnN] : null;
	return {
		pos: new Float32Array(outPos), uv: new Float32Array(outUv), tris: new Int32Array(tris), count: nOut,
		spawn: spawn, min: mn, max: mx,
	};
}

// ---------------------------------------------------------------------------------------------
// map building (generator, a heavy step per frame)
// ---------------------------------------------------------------------------------------------
function newGO(name) {
	var GO = must("UnityEngine.GameObject");
	var go = GO.new();
	try { go.method("set_name", 1).invoke(str(name)); } catch (e) {}
	return go;
}
function* buildObjMap(entry) {
	S.jobName = entry.name;
	setStatus("reading " + entry.file + "...", 0);
	yield;
	var text = File.readAllText(entry.path);
	if (!text || text.length < 10) throw new Error("file is empty");
	if (text.length > MAX_FILE_BYTES) throw new Error("file too big (" + Math.round(text.length / 1048576) + " MB)");
	var data = yield* parseObj(text, p.flipx);
	text = null;
	setStatus("building mesh (" + data.count + " vertices, " + (data.tris.length / 3) + " triangles)...", 0);
	yield;

	var Mesh = must("UnityEngine.Mesh");
	var mesh = Mesh.new();
	if (data.count > 65000) {
		try { mesh.method("set_indexFormat", 1).invoke(1); } catch (e) { throw new Error("32-bit mesh indices not supported here: " + e); }
	}
	try { mesh.method("set_name", 1).invoke(str(entry.name)); } catch (e) {}
	mesh.method("set_vertices", 1).invoke(rawArray(must("UnityEngine.Vector3"), data.count, data.pos.buffer));
	mesh.method("set_uv", 1).invoke(rawArray(must("UnityEngine.Vector2"), data.count, data.uv.buffer));
	var ia = rawArray(Il2Cpp.corlib.class("System.Int32"), data.tris.length, data.tris.buffer);
	try { mesh.method("set_triangles", 1).invoke(ia); }
	catch (e) { mesh.method("SetTriangles", 2).invoke(ia, 0); }
	try { mesh.method("RecalculateBounds", 0).invoke(); } catch (e) {}
	try { mesh.method("RecalculateNormals", 0).invoke(); } catch (e) {}
	yield;

	var tex = null, texNote = "no texture";
	if (entry.tex) {
		try { tex = loadTexture(entry.tex); texNote = "texture " + entry.tex.split("/").pop(); }
		catch (e) { log("texture failed: " + e); texNote = "texture failed"; }
	}
	var mat = makeMaterial(tex);

	var go = newGO("ML_Map_" + entry.name);
	var lay = pickLayer();
	var mf = addComp(go, must("UnityEngine.MeshFilter"));
	if (!mf) throw new Error("AddComponent(MeshFilter) failed");
	mf.method("set_sharedMesh", 1).invoke(mesh);
	var mr = addComp(go, must("UnityEngine.MeshRenderer"));
	if (!mr) throw new Error("AddComponent(MeshRenderer) failed");
	try { mr.method("set_sharedMaterial", 1).invoke(mat); } catch (e) { mr.method("set_material", 1).invoke(mat); }
	try { mr.method("set_shadowCastingMode", 1).invoke(0); } catch (e) {}
	try { mr.method("set_receiveShadows", 1).invoke(false); } catch (e) {}
	setLayerDeep(go, lay.layer);
	yield;

	setStatus("cooking collider...", 0);
	yield;
	var t0 = Date.now();
	var mc = addComp(go, must("UnityEngine.MeshCollider"));
	if (!mc) throw new Error("AddComponent(MeshCollider) failed");
	try { mc.method("set_convex", 1).invoke(false); } catch (e) {}
	mc.method("set_sharedMesh", 1).invoke(mesh);
	log("collider cooked in " + (Date.now() - t0) + " ms, layer " + lay.layer + " (" + lay.why + "), shader " + _shaderName + ", " + texNote);

	var cx = (data.min[0] + data.max[0]) / 2, cz = (data.min[2] + data.max[2]) / 2;
	var spawn = data.spawn ? data.spawn : [cx, data.max[1] + 1.2, cz];
	return { go: go, mesh: mesh, mat: mat, tex: tex, spawnLocal: spawn, hadSpawn: !!data.spawn, name: entry.name, layer: lay.layer, bundle: null,
		size: [data.max[0] - data.min[0], data.max[1] - data.min[1], data.max[2] - data.min[2]] };
}

function* buildBundleMap(entry) {
	S.jobName = entry.name;
	setStatus("loading bundle " + entry.file + "...", 0);
	yield;
	var AB = must("UnityEngine.AssetBundle");
	var UO = must("UnityEngine.Object");
	var bundle = AB.method("LoadFromFile", 1).invoke(str(entry.path));
	if (!bundle || bundle.isNull()) throw new Error("AssetBundle.LoadFromFile returned null (wrong Unity version or not a bundle?)");
	var assets = bundle.method("LoadAllAssets", 0).invoke();
	var GOK = must("UnityEngine.GameObject");
	var prefab = null;
	for (var i = 0; i < assets.length; i++) {
		try { var a = assets.get(i); if (a && !a.isNull() && String(a.class.name) === "GameObject") { prefab = a; break; } } catch (e) {}
	}
	if (!prefab) { try { bundle.method("Unload", 1).invoke(true); } catch (e) {} throw new Error("no GameObject prefab inside the bundle"); }
	yield;
	var inst = pickOverload(UO, UO, "Instantiate", 1, function (ps) { return ps[0].type.name === "UnityEngine.Object"; }).invoke(prefab);
	var tr = inst.method("get_transform", 0).invoke();
	var lay = pickLayer();
	setLayerDeep(inst, lay.layer);
	// add colliders to meshes that have none, find a child called spawn
	var spawnLocal = null, added = 0;
	try {
		var mfs = pickOverload(inst, GOK, "GetComponentsInChildren", 2, function (ps) { return ps[0].type.name === "System.Type"; })
			.invoke(typeObj(must("UnityEngine.MeshFilter")), true);
		for (var j = 0; j < mfs.length; j++) {
			try {
				var mfc = mfs.get(j);
				var cgo = mfc.method("get_gameObject", 0).invoke();
				var nm = String(cgo.method("get_name", 0).invoke().content);
				if (/^spawn/i.test(nm)) {
					var ct = cgo.method("get_transform", 0).invoke();
					spawnLocal = xyz(ct.method("get_localPosition", 0).invoke());
					try { var rr = getComp(cgo, must("UnityEngine.MeshRenderer")); if (rr) rr.method("set_enabled", 1).invoke(false); } catch (e) {}
					continue;
				}
				if (!getComp(cgo, must("UnityEngine.Collider"))) {
					var mcc = addComp(cgo, must("UnityEngine.MeshCollider"));
					if (mcc) { mcc.method("set_sharedMesh", 1).invoke(mfc.method("get_sharedMesh", 0).invoke()); added++; }
				}
			} catch (e) {}
			if (j % 50 === 49) yield;
		}
	} catch (e) { log("bundle collider pass: " + e); }
	log("bundle: instantiated, " + added + " colliders added, layer " + lay.layer + " (" + lay.why + ")");
	return { go: inst, mesh: null, mat: null, tex: null, spawnLocal: spawnLocal || [0, 2, 0], hadSpawn: !!spawnLocal, name: entry.name, layer: lay.layer, bundle: bundle,
		size: [0, 0, 0], _tr: tr };
}

function destroyMap() {
	var m = S.map;
	S.map = null;
	if (!m) return;
	try { destroyObj(m.go); } catch (e) {}
	try { destroyObj(m.mesh); } catch (e) {}
	try { destroyObj(m.mat); } catch (e) {}
	try { destroyObj(m.tex); } catch (e) {}
	if (m.bundle) { try { m.bundle.method("Unload", 1).invoke(true); } catch (e) {} }
}

// ---------------------------------------------------------------------------------------------
// jobs
// ---------------------------------------------------------------------------------------------
function* wait(n) { for (var i = 0; i < n; i++) yield; }

// teleport with the noclip -> teleport -> freeze -> settle -> noclip off -> unfreeze dance
function* jump(pos, yaw, label) {
	var pc = getPC();
	if (!pc) throw new Error("no PlayerController");
	setStatus(label + ": noclip on", 0);
	noclipOn();
	yield;
	setStatus(label + ": teleporting", 0);
	var how = teleport(pos, yaw);
	yield;
	var pc2 = getPC();
	var now = pc2 ? readPos(pc2) : null;
	var off = now ? dist(now, pos) : -1;
	if (off > 4) {
		// the game's teleport did not land (or something pulled us back): force it
		log("teleport landed " + off.toFixed(1) + " units off (" + how + "), forcing position");
		if (pc2) how += " + forced " + forceSetPos(pc2, pos);
		yield;
		now = pc2 ? readPos(pc2) : null;
		off = now ? dist(now, pos) : -1;
	}
	setStatus(label + ": freezing", 0);
	freezeOn();
	freezeSetPos(now && off >= 0 && off < 4 ? now : pos);     // hold where we actually are, if close enough
	yield* wait(Math.max(2, p.settle));
	setStatus(label + ": noclip off, unfreezing", 0);
	noclipOff();
	yield;
	freezeOff();
	yield* wait(3);
	var pc3 = getPC();
	var fin = pc3 ? readPos(pc3) : null;
	return { how: how, off: fin ? dist(fin, pos) : -1, final: fin };
}

function* goJob(entry) {
	if (S.map) throw new Error("a map is already loaded, press Return first");
	var pc = getPC();
	if (!pc) throw new Error("no local player yet (join a room first)");
	S.saved = { pos: readPos(pc), yaw: readYaw(pc) };
	log("return point saved: " + S.saved.pos.map(function (n) { return n.toFixed(2); }).join(", ") + " yaw " + S.saved.yaw.toFixed(1));

	var map = entry.kind === "bundle" ? yield* buildBundleMap(entry) : yield* buildObjMap(entry);
	var s = p.scale;
	var origin = [S.saved.pos[0] + p.distance, S.saved.pos[1] + p.height, S.saved.pos[2] + p.distance];
	var tr = map.go.method("get_transform", 0).invoke();
	tr.method("set_position", 1).invoke(v3(origin));
	tr.method("set_localScale", 1).invoke(v3([s, s, s]));
	try { must("UnityEngine.Physics").method("SyncTransforms", 0).invoke(); } catch (e) {}
	map.origin = origin;
	map.spawn = [origin[0] + map.spawnLocal[0] * s, origin[1] + map.spawnLocal[1] * s + 0.1, origin[2] + map.spawnLocal[2] * s];
	S.map = map;
	yield* wait(3);                 // let physics register the new collider before we arrive

	var r = yield* jump(map.spawn, null, "Go");
	if (r.off < 0) setStatus("on the map, but couldn't read your position back", 2);
	else if (r.off > 25) setStatus("snapped back? you are " + r.off.toFixed(0) + " units from the spawn. The game may be pulling you back (respawn / anti-cheat). Press Return.", 3);
	else setStatus("on map '" + map.name + "' (" + r.how + (map.hadSpawn ? "" : ", no spawn object so dropped from above the centre") + "). Return brings you back.", 1);
}

function* returnJob() {
	if (!S.saved) { destroyMap(); throw new Error("no saved return point"); }
	var r = yield* jump(S.saved.pos, p.yaw ? S.saved.yaw : null, "Return");
	destroyMap();
	if (r.off > 25) setStatus("returned, but you're " + r.off.toFixed(0) + " units from the saved point", 2);
	else setStatus("back at the saved point, map deleted", 1);
	S.saved = null;
}

function startJob(name, gen) {
	if (S.job) { notify("busy: " + S.jobName); return; }
	S.jobName = name;
	S.job = (function* () {
		try { yield* gen; }
		catch (e) {
			log("job '" + name + "' failed: " + e + (e && e.stack ? "\n" + e.stack : ""));
			restoreAll();
			setStatus(name + " failed: " + e, 3);
			if (name === "Go") {
				// leave the player where they are; if we already teleported out, bring them home
				try { if (S.map && S.saved) { var pc = getPC(); if (pc && dist(readPos(pc), S.saved.pos) > 100) { teleport(S.saved.pos, S.saved.yaw); } } } catch (e2) {}
				destroyMap();
			}
		}
	})();
}

// ---------------------------------------------------------------------------------------------
// diagnostics (button): logs how this game's rig is built
// ---------------------------------------------------------------------------------------------
function diagnose() {
	var L = function (s) { log("[rig] " + s); };
	try {
		var pc = getPC();
		if (!pc) { L("PlayerController.Instance is null (not in a scene yet)"); return; }
		var pos = readPos(pc), head = readHead(pc);
		L("rig position " + pos.map(function (n) { return n.toFixed(2); }).join(", ") + (head ? "   head " + head.map(function (n) { return n.toFixed(2); }).join(", ") : "") + "   yaw " + readYaw(pc).toFixed(1));
		var rb = rbOf(pc);
		if (rb) {
			var kin = "?", det = "?";
			try { kin = rb.method("get_isKinematic", 0).invoke(); det = rb.method("get_detectCollisions", 0).invoke(); } catch (e) {}
			L("Rigidbody: kinematic=" + kin + " detectCollisions=" + det);
		} else L("no Rigidbody on PlayerController");
		var cl = fieldObj(pc, "Colliders");
		if (cl) listItems(cl).forEach(function (c) {
			try { L("collider " + c.class.name + " on " + c.method("get_gameObject", 0).invoke().method("get_name", 0).invoke().content + " enabled=" + c.method("get_enabled", 0).invoke() + " layer=" + c.method("get_gameObject", 0).invoke().method("get_layer", 0).invoke()); } catch (e) {}
		});
		try { var cc = getComp(pc.method("get_gameObject", 0).invoke(), must("UnityEngine.CharacterController")); L("CharacterController on rig: " + (cc ? "yes" : "no")); } catch (e) { L("CharacterController: n/a"); }
		var g = gorillaOf(pc);
		if (g) {
			var dm = "?"; try { dm = g.field("disableMovement").value; } catch (e) {}
			L("gorilla locomotion: " + g.class.name + " disableMovement=" + dm);
			["_currentLocomotionEnabledLayers", "defaultLocomotionLayers", "_currentLocomotionLeftHandEnabledLayers", "_currentLocomotionRightHandEnabledLayers"].forEach(function (n) {
				var m = maskOf(g, n);
				if (m === null) { L(n + ": unreadable"); return; }
				var names = [];
				for (var i = 0; i < 32; i++) if (m & (1 << i)) { var nm = i + ""; try { nm += ":" + must("UnityEngine.LayerMask").method("LayerToName", 1).invoke(i).content; } catch (e) {} names.push(nm); }
				L(n + " = 0x" + (m >>> 0).toString(16) + " [" + names.join(" ") + "]");
			});
		} else L("no ActiveGorillaPlayer");
		var lay = pickLayer();
		L("map layer would be " + lay.layer + " (" + lay.why + ")");
		try { var sh = findShader(); L("shader: " + _shaderName); } catch (e) { L("shader: " + e); }
		L("maps folder: " + S.dir + "/maps   (" + S.maps.length + " found)");
	} catch (e) { L("diagnose failed: " + e); }
}

// ---------------------------------------------------------------------------------------------
// frame loop + tab
// ---------------------------------------------------------------------------------------------
__arFrame(function () {
	S.frames++;
	S.frameStart = Date.now();
	try {
		if (S.job) {
			var r = S.job.next();
			if (r.done) S.job = null;
		}
		holdFrozen();
		// light watchdog, twice a second: did the game pull us off the map?
		if (S.map && !S.job && S.map.origin && S.frames % 30 === 0) {
			if (!alive(S.map.go)) { setStatus("the map object is gone (scene change?). Press Return to get back.", 2); }
			else {
				var pc = getPC();
				if (pc) {
					var d = dist(readPos(pc), S.map.origin);
					if (d > p.distance * 0.6 + 400 && !S.watchWarned) { S.watchWarned = true; setStatus("you left the map area (" + d.toFixed(0) + " units from it). Respawn or snap-back? Press Return to clean up.", 2); }
					if (d <= p.distance * 0.6 + 400) S.watchWarned = false;
				}
			}
		}
	} catch (e) {
		log("frame error: " + e);
		S.job = null;
		restoreAll();
		setStatus("error: " + e, 3);
	}
});

var COLORS = [[0.75, 0.78, 0.85, 1], [0.45, 1, 0.55, 1], [1, 0.85, 0.35, 1], [1, 0.45, 0.45, 1]];

__arCategory("map_loader", function (ui) {
	try {
		if (!S.scanned) scanMaps();
		ui.text(S.status, COLORS[S.statusKind] || COLORS[0]);
		ui.text("Folder: " + S.dir + "/maps", [0.6, 0.6, 0.65, 1]);
		var names = S.maps.map(function (m) { return (m.kind === "bundle" ? "[bundle] " : "") + m.name + (m.tex ? " (tex)" : ""); });
		if (!names.length) {
			ui.text("No maps yet. Put .obj files (+ optional .png) in the folder above, then Refresh.", [0.6, 0.6, 0.65, 1]);
		} else {
			ui.combo("Map", S.mapSel, names);
		}
		if (ui.button("Refresh list")) scanMaps();
		ui.sameLine();
		var busy = !!S.job;
		if (!S.map) {
			if (ui.button(busy ? "Working..." : "Go") && !busy && S.maps[S.mapSel.v]) startJob("Go", goJob(S.maps[S.mapSel.v]));
		} else {
			if (ui.button(busy ? "Working..." : "Return") && !busy) startJob("Return", returnJob());
			ui.sameLine();
			if (ui.button("Rescue to spawn") && !busy && S.map) {
				startJob("Rescue", (function* () { var r = yield* jump(S.map.spawn, null, "Rescue"); setStatus("rescued to spawn (" + r.how + ")", 1); })());
			}
		}
		if (ui.button("Panic: unfreeze + noclip off")) { restoreAll(); setStatus("unfroze and turned collisions back on", 2); }
		ui.sameLine();
		if (ui.button("Log rig info")) diagnose();
		if (S.saved) ui.text("Return point: " + S.saved.pos.map(function (n) { return n.toFixed(1); }).join(", "), [0.6, 0.6, 0.65, 1]);
		if (S.map) ui.text("Map: " + S.map.name + "  layer " + S.map.layer + "  spawn " + S.map.spawn.map(function (n) { return n.toFixed(0); }).join(", "), [0.6, 0.6, 0.65, 1]);
	} catch (e) {
		ui.text("tab error: " + e, COLORS[3]);
	}
});

onDisable(function () {
	S.job = null;
	try {
		restoreAll();
		// if we are standing on the map, take the player home before the map is deleted
		if (S.map && S.saved) {
			try { var pc = getPC(); if (pc && dist(readPos(pc), S.saved.pos) > 100) teleport(S.saved.pos, p.yaw ? S.saved.yaw : null); } catch (e) {}
		}
	} catch (e) {}
	destroyMap();
	S.saved = null;
});

log("map_loader loaded. Maps folder: <files>/imgui_plugins/maps  (open the tab, Refresh list, pick a map, Go)");

})();

; (function () {
// ---- module: deadeye_computer.js ----
// game: com.dogelabs.deadeye
/*
 * deadeye_computer.js - adds your own tabs to the in-game computer.
 *
 *   MODS    browses the WHOLE menu (needs the updated UniversalMenu.ts): preset mods (Fly, Speed, Noclip...) with
 *           their settings, every plugin with each of its own options and buttons, patcher patches, HUD toggles.
 *   ACTIVE  everything that is switched on right now, one key turns the selected one off.
 *   INFO    fps, battery, session time, how many mods are on, and the key help.
 *   pages   one extra tab for every page in computer_pages.txt (next to this plugin). Format:
 *               == TITLE ==
 *               any text, one line per line
 *               == ANOTHER TITLE ==
 *               more text
 *           W / S scrolls a long page. Titles are best kept short (the tab header is small).
 *
 * Keys on the computer's keyboard (the arrow keys still switch tabs, that is the game's own, so W and S
 * are used to move; on these tabs Enter / Space / Backspace / W / S are taken before the computer sees them):
 *   W / S       move          ENTER   open a folder, switch on/off, run a button, value up / next option
 *   SPACE       value down / previous option, or open a mod's settings          BACKSPACE   back one level
 *
 * How it works: the computer keeps a list of Tab objects. This clones one of the game's own tabs (the
 * feedback / promo-code one), swaps its script for a plain base Tab so pressing Enter can't submit
 * anything to the server, adds it to the computer's tab list with a header, and listens to the on-screen
 * keyboard presses for those tabs. Only you see any of this, it is all local.
 *
 * UNTESTED LAYOUT: the text box is the clone's own, so the amount of text that fits is a guess. If text is
 * cut off or too big, use "Log Layout" in this plugin's tab and send me the log. The game only has the
 * computer in some scenes, the plugin keeps looking for it and adds the tabs when it shows up.
 */

var GAME_ASM = "DL.Animals.Core2025";
var PAGES_FILE_NAME = "computer_pages.txt";
var VISIBLE_LINES = 7;
var MAX_PAGES = 3;
var SELF_FILE = "deadeye_computer.js";

var st = { status: "waiting for the computer (it only exists in some scenes)", tabs: [], lastScan: 0, installed: 0 };

function img() { return Il2Cpp.domain.assembly(GAME_ASM).image; }
function cls(n) { try { return img().class(n); } catch (e) { return null; } }
function anyClass(name) {
    var k = cls(name);
    if (k) return k;
    try {
        var asms = Il2Cpp.domain.assemblies;
        for (var i = 0; i < asms.length; i++) { try { var c = asms[i].image.class(name); if (c) return c; } catch (e) { } }
    } catch (e) { }
    return null;
}
function sameObj(a, b) { try { return a.handle.equals(b.handle); } catch (e) { return false; } }
function aliveObj(o) {
    try { if (!o || o.isNull()) return false; var u = unityObj(); return !!u.method("op_Implicit", 1).invoke(o); } catch (e) { return false; }
}
var uObj = null;
function unityObj() { if (!uObj) uObj = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image.class("UnityEngine.Object"); return uObj; }

function objectsOf(klass) {
    var out = [];
    if (!klass) return out;
    try {
        var u = unityObj();
        function push(arr) { for (var i = 0; arr && i < arr.length; i++) { var v = arr.get(i); if (v && !v.isNull()) out.push(v); } }
        try { push(u.method("FindObjectsByType", 3).overload("System.Type", "UnityEngine.FindObjectsInactive", "UnityEngine.FindObjectsSortMode").invoke(klass.type.object, 1, 0)); }
        catch (e) { push(u.method("FindObjectsByType", 2).overload("System.Type", "UnityEngine.FindObjectsSortMode").invoke(klass.type.object, 0)); }
    } catch (e) { }
    return out;
}

// ---- pages file -------------------------------------------------------------------------------------------
function pagesPath() { return "/storage/emulated/0/Android/data/" + ui.appId() + "/files/imgui_plugins/" + PAGES_FILE_NAME; }
function loadPages() {
    var pages = [];
    try {
        var raw = File.readAllText(pagesPath()), cur = null;
        raw.split(/\r?\n/).forEach(function (line) {
            var m = /^==\s*(.+?)\s*==\s*$/.exec(line);
            if (m) { cur = { title: m[1].slice(0, 14), lines: [] }; pages.push(cur); }
            else if (cur) cur.lines.push(line);
        });
    } catch (e) { }
    return pages.slice(0, MAX_PAGES);
}

// ---- content of each tab ----------------------------------------------------------------------------------
function modsApi() { return globalThis.__imguiModsApi || null; }
function fmtNum(v) { var r = Math.round(v * 100) / 100; return String(r); }
function nodeRow(n) {
    var name = String(n.label).slice(0, 17);
    try {
        if (n.kind === "folder") return name + " /";
        if (n.kind === "bool") return (n.get() ? "[x] " : "[ ] ") + name + (n.children ? " +" : "");
        if (n.kind === "num") return name + ": " + fmtNum(n.get());
        if (n.kind === "select") return name + ": " + String((n.options || [])[n.get()] || "?").slice(0, 12);
        if (n.kind === "action") return "* " + name;
    } catch (e) { }
    return name;
}
function curNodes(t) {
    var api = modsApi();
    if (!api) return [];
    var list;
    if (!t.stack.length) list = api.root();
    else { var top = t.stack[t.stack.length - 1]; list = top.node.children ? top.node.children() : []; }
    return list || [];
}
function modsLines(t) {
    if (!modsApi()) return ["needs the updated", "UniversalMenu.ts", "(it adds __imguiModsApi)"];
    var list = [];
    try { list = curNodes(t); } catch (e) { log("mods tree: " + e); }
    t.items = list;
    var crumb = ["MODS"].concat(t.stack.map(function (f) { return String(f.node.label).slice(0, 12); })).join(" > ");
    var out = [crumb];
    if (!list.length) { out.push(t.stack.length ? "(nothing here)  BKSP back" : "(no mods found)"); return out; }
    if (t.sel >= list.length) t.sel = list.length - 1;
    var rows = VISIBLE_LINES - 1;
    var first = Math.max(0, Math.min(t.sel - 2, list.length - rows));
    for (var i = first; i < Math.min(list.length, first + rows); i++) out.push((i === t.sel ? "> " : "  ") + nodeRow(list[i]));
    return out;
}
function activeLines(t) {
    var api = modsApi();
    if (!api) return ["needs the updated", "UniversalMenu.ts"];
    var list = [];
    try { list = api.active(); } catch (e) { }
    t.items = list;
    if (t.sel > list.length) t.sel = list.length;
    var rows = [{ label: "[ turn all off ]" }].concat(list);
    var out = ["ACTIVE (" + list.length + ")  ENTER = off"];
    var n = VISIBLE_LINES - 1;
    var first = Math.max(0, Math.min(t.sel - 2, rows.length - n));
    for (var i = first; i < Math.min(rows.length, first + n); i++) out.push((i === t.sel ? "> " : "  ") + String(rows[i].label).slice(0, 22));
    if (!list.length) out.push("(nothing is on)");
    return out;
}
function infoLines(t) {
    var api = modsApi(), out = [];
    try { out = api ? api.info() : ["(menu info needs the updated UniversalMenu.ts)"]; } catch (e) { out = ["info: " + e]; }
    out = out.slice(0, 4);
    out.push("W/S move  ENTER pick/on/up");
    out.push("SPACE down/settings  BKSP back");
    return out;
}

function pageLines(t) {
    var all = t.page.lines, max = Math.max(0, all.length - VISIBLE_LINES);
    if (t.scroll > max) t.scroll = max;
    var out = all.slice(t.scroll, t.scroll + VISIBLE_LINES);
    if (max > 0) out.push("(" + (t.scroll + 1) + "-" + Math.min(all.length, t.scroll + VISIBLE_LINES) + " of " + all.length + ", UP/DOWN scrolls)");
    return out;
}
function render(t) {
    if (!t || !t.text) return;
    try {
        var lines = t.kind === "mods" ? modsLines(t) : t.kind === "active" ? activeLines(t) : t.kind === "info" ? infoLines(t) : pageLines(t);
        t.text.method("set_text", 1).invoke(Il2Cpp.string(lines.join("\n")));
    } catch (e) { log("render: " + e); }
}

// ---- keyboard handling (called from the hooks below) -----------------------------------------------------
function ourTab(thisObj) {
    for (var i = 0; i < st.tabs.length; i++) if (sameObj(st.tabs[i].tab, thisObj)) return st.tabs[i];
    return null;
}
function keyType(data) {
    try {
        var v = data.field("Type").value;
        if (typeof v === "number") return v;
        try { return Number(v.field("value__").value); } catch (e) { return Number(v); }
    } catch (e) { return -1; }
}
function nudge(n, dir) {
    // value up (dir 1) or down (dir -1); wraps around at the ends
    try {
        if (n.kind === "num") {
            var v = n.get() + dir * (n.step || 1);
            if (v > n.max + 1e-9) v = n.min; else if (v < n.min - 1e-9) v = n.max;
            n.set(v);
        } else if (n.kind === "select") n.set(n.get() + dir);
    } catch (e) { log("nudge: " + e); }
}
function keySymbol(data) {
    try { var v = data.field("Symbol").value; return v && !v.isNull() ? String(v.content).toLowerCase() : ""; } catch (e) { return ""; }
}
function onKey(t, type) {
    // KeyboardButtonType: 1 Backspace, 2 Enter, 3 ArrowUp, 4 ArrowDown, 8 Space
    if (t.kind === "mods") {
        var list = t.items || [], n = list[t.sel];
        if (type === 3) t.sel = Math.max(0, t.sel - 1);
        else if (type === 4) t.sel = Math.min(Math.max(0, list.length - 1), t.sel + 1);
        else if (type === 1) { if (t.stack.length) { var f = t.stack.pop(); t.sel = f.sel; } }
        else if (type === 2 && n) {
            if (n.kind === "folder") { t.stack.push({ node: n, sel: t.sel }); t.sel = 0; }
            else if (n.kind === "bool") { try { n.set(!n.get()); } catch (e) { log("toggle: " + e); } }
            else if (n.kind === "action") { try { n.run(); } catch (e) { log("run: " + e); } }
            else nudge(n, 1);
        }
        else if (type === 8 && n) {
            if (n.kind === "bool" && n.children) { t.stack.push({ node: n, sel: t.sel }); t.sel = 0; }
            else nudge(n, -1);
        }
        else return;
    } else if (t.kind === "active") {
        var items = t.items || [], total = items.length + 1;
        if (type === 3) t.sel = Math.max(0, t.sel - 1);
        else if (type === 4) t.sel = Math.min(total - 1, t.sel + 1);
        else if (type === 2) {
            try {
                if (t.sel === 0) modsApi().allOff();
                else if (items[t.sel - 1]) items[t.sel - 1].off();
            } catch (e) { log("active: " + e); }
        }
        else return;
    } else if (t.kind === "info") {
        return;
    } else {
        if (type === 3) t.scroll = Math.max(0, t.scroll - 1);
        else if (type === 4) t.scroll = t.scroll + 1;
        else return;
        render(t);
        return;
    }
    // the menu switches plugins on its own thread a moment later, so draw now and again shortly after
    render(t);
    mainThread(function () { try { render(t); } catch (e) { } }, 400);
}

// The cloned tab keeps the game's own script (FeedbackTab / WeaponStatsTab), because adding the base Tab class
// directly is not possible (it returned null, which is what broke the first version). So instead the methods of
// those two classes are hooked: for OUR clone they do our thing, for the game's real tabs they run unchanged.
var hooked = {};
function hookClass(name) {
    var K = cls(name);
    if (!K) return false;
    var n = 0;
    try {
        var mPress = K.method("NotifyButtonPressed", 1);
        void mPress.nativeFunction;
        mPress.implementation = function (data) {
            var t = ourTab(this);
            if (!t) return mPress.invokeRaw(this, data);
            // keys for our tabs are handled in the Computer hook (W / S / Enter / Space / Backspace); the clone itself does nothing
            // left / right (changing tab) etc: the game's own Computer handles those, nothing for the clone to do
        };
        n++;
    } catch (e) { log("couldn't hook " + name + ".NotifyButtonPressed: " + e); }
    try {
        var mVis = K.method("NotifyVisible", 2);
        void mVis.nativeFunction;
        mVis.implementation = function (visible, reverse) {
            var t = ourTab(this);
            if (!t) return mVis.invokeRaw(this, visible, reverse);
            try {
                t.go.method("SetActive", 1).invoke(!!visible);
                t.visible = !!visible;
                if (visible) render(t);
            } catch (e) { log("visible: " + e); }
        };
        n++;
    } catch (e) { log("couldn't hook " + name + ".NotifyVisible: " + e); }
    try {
        var mName = K.method("get_tabName", 0);
        void mName.nativeFunction;
        mName.implementation = function () {
            var t = ourTab(this);
            if (!t) return mName.invokeRaw(this);
            return Il2Cpp.string(t.title);
        };
        n++;
    } catch (e) { log("couldn't hook " + name + ".get_tabName: " + e); }
    try {
        var mSub = K.method("Submit", 0);
        void mSub.nativeFunction;
        mSub.implementation = function () {
            if (ourTab(this)) return;                               // never let the clone submit anything
            return mSub.invokeRaw(this);
        };
        n++;
    } catch (e) { /* not every tab class has Submit */ }
    hooked[name] = n;
    return n >= 2;
}
function installHooks() { return hookClass("FeedbackTab") | hookClass("WeaponStatsTab"); }

// If the game's own tab switching throws because of one of our tabs, redo it tab by tab so one bad tab can never
// lock the computer. The game's own code runs first and only if it fails do we step in.
function safeDisplay(comp, idx, reverse) {
    var tabs = comp.field("_tabs").value, n = Number(tabs.method("get_Count", 0).invoke());
    if (idx < 0 || idx >= n) return;
    var hdrs = comp.field("_tabHeaders").value, hn = Number(hdrs.method("get_Count", 0).invoke());
    for (var i = 0; i < n; i++) {
        try { tabs.method("get_Item", 1).invoke(i).method("NotifyVisible", 2).invoke(i === idx, !!reverse); }
        catch (e) { log("tab " + i + " NotifyVisible: " + e); }
        if (i < hn) { try { hdrs.method("get_Item", 1).invoke(i).method("SetIsCurrentTab", 1).invoke(i === idx); } catch (e) { } }
    }
    comp.field("_currentTabIndex").value = idx;
}
function installDisplayHook() {
    var Comp = cls("Computer");
    if (!Comp) return false;
    try {
        var mDisp = Comp.method("DisplayTabIndex", 2);
        void mDisp.nativeFunction;
        mDisp.implementation = function (newIndex, reverse) {
            var mine = false;
            for (var i = 0; i < st.tabs.length; i++) if (sameObj(st.tabs[i].comp, this)) { mine = true; break; }
            if (!mine) return mDisp.invokeRaw(this, newIndex, reverse);
            try { return mDisp.invokeRaw(this, newIndex, reverse); }
            catch (e) {
                log("the computer's own tab switch failed (" + e + "), using the safe version");
                try { safeDisplay(this, newIndex, reverse); } catch (e2) { log("safe tab switch failed: " + e2); }
            }
        };
        return true;
    } catch (e) { log("couldn't hook Computer.DisplayTabIndex: " + e); return false; }
}

// The computer's own key handler gets every key first and uses Up / Down itself for its real pages, so hooking only
// the cloned tab never saw them. This hook sits on Computer.NotifyButtonPressed: when one of OUR tabs is the open
// one, Backspace / Enter / Up / Down / Space are ours and are not passed on. Left / Right (changing tab) and
// everything on the game's own tabs go through untouched.
function currentOurTab(comp) {
    try {
        var idx = Number(comp.field("_currentTabIndex").value);
        var list = comp.field("_tabs").value, n = Number(list.method("get_Count", 0).invoke());
        if (idx < 0 || idx >= n) return null;
        return ourTab(list.method("get_Item", 1).invoke(idx));
    } catch (e) { return null; }
}
function installKeyHook() {
    var Comp = cls("Computer");
    if (!Comp) return false;
    try {
        var mKey = Comp.method("NotifyButtonPressed", 1);
        void mKey.nativeFunction;
        mKey.implementation = function (data) {
            try {
                var t = currentOurTab(this);
                if (t) {
                    var type = keyType(data), act = 0;
                    if (type === 1 || type === 2 || type === 8) act = type;                 // Backspace / Enter / Space
                    else if (type === 0) { var sym = keySymbol(data); act = sym === "w" ? 3 : sym === "s" ? 4 : 0; }   // W up, S down
                    if (act) { onKey(t, act); return; }
                }
            } catch (e) { log("computer key: " + e); }
            return mKey.invokeRaw(this, data);
        };
        return true;
    } catch (e) { log("couldn't hook Computer.NotifyButtonPressed: " + e); return false; }
}

// ---- building a tab ---------------------------------------------------------------------------------------
function relPath(root, node) {
    var path = [];
    var cur = node.method("get_transform", 0).invoke();
    var rootT = root.method("get_transform", 0).invoke();
    for (var guard = 0; guard < 20 && !sameObj(cur, rootT); guard++) {
        path.unshift(Number(cur.method("GetSiblingIndex", 0).invoke()));
        cur = cur.method("get_parent", 0).invoke();
        if (!cur || cur.isNull()) return null;
    }
    return path;
}
function followPath(root, path) {
    var cur = root.method("get_transform", 0).invoke();
    for (var i = 0; i < path.length; i++) cur = cur.method("GetChild", 1).invoke(path[i]);
    return cur;
}
function findTemplate(comp) {
    var list = comp.field("_tabs").value, n = Number(list.method("get_Count", 0).invoke());
    var pref = ["FeedbackTab", "WeaponStatsTab"];
    for (var p = 0; p < pref.length; p++) {
        for (var i = 0; i < n; i++) {
            var tab = list.method("get_Item", 1).invoke(i);
            if (String(tab.class.name) !== pref[p]) continue;
            var f = null;
            try { f = tab.field("_responseText").value; } catch (e) { }
            if (!f) { try { f = tab.field("_redeemCodeResponseText").value; } catch (e) { } }
            if (f && !f.isNull()) return { tab: tab, text: f };
        }
    }
    return null;
}
function addTab(comp, tmpl, kind, title, page) {
    var u = unityObj();
    var tmplGo = tmpl.tab.method("get_gameObject", 0).invoke();
    var parent = tmplGo.method("get_transform", 0).invoke().method("get_parent", 0).invoke();
    var clone = u.method("Instantiate", 2).overload("UnityEngine.Object", "UnityEngine.Transform").invoke(tmplGo, parent);
    var cloneGo = clone;
    try { cloneGo.method("get_transform", 0); } catch (e) { cloneGo = clone.method("get_gameObject", 0).invoke(); }
    cloneGo.method("set_name", 1).invoke(Il2Cpp.string("ModTab_" + title));

    // the clone's text box (same place in the hierarchy as the template's response text)
    var path = relPath(tmplGo, tmpl.text);
    var textObj = null;
    if (path) { var tr = followPath(cloneGo, path); textObj = tr.method("get_gameObject", 0).invoke(); }
    var textComp = null;
    if (textObj) {
        var tmpCls = anyClass("TMPro.TMP_Text");
        var arr = textObj.method("GetComponents", 1).overload("System.Type").invoke(tmpCls.type.object);
        if (arr && arr.length > 0) textComp = arr.get(0);
    }
    if (!textComp) throw new Error("couldn't find the text box in the cloned tab");

    // hide everything else the clone had (input box, labels) and make sure the text box stays on
    try {
        var tmpCls2 = anyClass("TMPro.TMP_Text"), all = cloneGo.method("GetComponentsInChildren", 2).overload("System.Type", "System.Boolean").invoke(tmpCls2.type.object, true);
        for (var i = 0; i < all.length; i++) { var c = all.get(i); if (!sameObj(c, textComp)) { try { c.method("set_text", 1).invoke(Il2Cpp.string("")); } catch (e) { } } }
    } catch (e) { }
    try {
        var inCls = anyClass("TMPro.TMP_InputField"), ins = cloneGo.method("GetComponentsInChildren", 2).overload("System.Type", "System.Boolean").invoke(inCls.type.object, true);
        for (var j = 0; j < ins.length; j++) { try { ins.get(j).method("set_enabled", 1).invoke(false); } catch (e) { } }
    } catch (e) { }
    // the game's text box is one line tall (224 x 24, font 10), so grow it downwards to fit a page of lines
    try {
        var rt = textComp.method("get_rectTransform", 0).invoke();
        var sz = rt.method("get_sizeDelta", 0).invoke();
        var oldH = Number(sz.field("y").value), newH = 112;
        sz.field("x").value = Math.max(Number(sz.field("x").value), 224);
        sz.field("y").value = newH;
        rt.method("set_sizeDelta", 1).invoke(sz);
        var ap = rt.method("get_anchoredPosition", 0).invoke();
        ap.field("y").value = Number(ap.field("y").value) - (newH - oldH) / 2;   // keep the top edge where it was
        rt.method("set_anchoredPosition", 1).invoke(ap);
    } catch (e) { log("resize text box: " + e); }
    try { textComp.method("set_alignment", 1).invoke(257); } catch (e) { }       // top left
    try { textComp.method("set_enableWordWrapping", 1).invoke(false); } catch (e) { }
    try { textComp.method("set_overflowMode", 1).invoke(0); } catch (e) { }

    // the clone still carries the game's own tab script. Its methods are hooked above, so for this object they
    // do nothing harmful (no feedback / promo code can be sent).
    var newTab = null;
    try {
        var comps = cloneGo.method("GetComponents", 1).overload("System.Type").invoke(tmpl.tab.class.type.object);
        if (comps && comps.length) newTab = comps.get(0);
    } catch (e) { log("clone script: " + e); }
    if (!newTab || newTab.isNull()) throw new Error("the cloned tab has no script to use");
    try { newTab.method("set_computer", 1).invoke(comp); } catch (e) { }

    // header
    var prefab = comp.field("_tabHeaderPrefab").value, container = comp.field("_tabHeadersContainer").value;
    var cT = container.method("get_transform", 0).invoke();
    var hdr = u.method("Instantiate", 2).overload("UnityEngine.Object", "UnityEngine.Transform").invoke(prefab, cT);
    try { hdr.method("Initialize", 1).invoke(newTab); } catch (e) { }
    try { var lab = hdr.field("_label").value; lab.method("set_text", 1).invoke(Il2Cpp.string(title)); } catch (e) { log("header label: " + e); }

    comp.field("_tabs").value.method("Add", 1).invoke(newTab);
    comp.field("_tabHeaders").value.method("Add", 1).invoke(hdr);
    cloneGo.method("SetActive", 1).invoke(false);

    var t = { kind: kind, title: title, page: page || null, go: cloneGo, tab: newTab, hdr: hdr, text: textComp, comp: comp, sel: 0, scroll: 0, items: [], stack: [], visible: false };
    st.tabs.push(t);
    return t;
}

function purgeNulls(comp) {
    var removed = 0;
    try {
        var list = comp.field("_tabs").value;
        for (var i = Number(list.method("get_Count", 0).invoke()) - 1; i >= 0; i--) {
            var it = list.method("get_Item", 1).invoke(i);
            if (!it || it.isNull()) { list.method("RemoveAt", 1).invoke(i); removed++; }
        }
        var hl = comp.field("_tabHeaders").value;
        for (var k = Number(hl.method("get_Count", 0).invoke()) - 1; k >= 0; k--) {
            var h = hl.method("get_Item", 1).invoke(k);
            var dead = !h || h.isNull();
            if (!dead) { try { dead = !aliveObj(h); } catch (e) { } }
            if (dead) { hl.method("RemoveAt", 1).invoke(k); }
        }
    } catch (e) { log("purge: " + e); }
    if (removed) log("removed " + removed + " broken tab entr" + (removed === 1 ? "y" : "ies") + " left by an earlier version");
    return removed;
}

function installOn(comp) {
    purgeNulls(comp);
    var tmpl = findTemplate(comp);
    if (!tmpl) throw new Error("no template tab found on the computer");
    var made = [];
    made.push(addTab(comp, tmpl, "mods", "MODS", null).title);
    made.push(addTab(comp, tmpl, "active", "ACTIVE", null).title);
    made.push(addTab(comp, tmpl, "info", "INFO", null).title);
    var pages = loadPages();
    for (var i = 0; i < pages.length; i++) made.push(addTab(comp, tmpl, "page", pages[i].title, pages[i]).title);
    st.installed++;
    st.status = "added tabs: " + made.join(", ") + " (use the computer's left/right arrows)";
    log(st.status);
}

function hasOurs(comp) { return st.tabs.some(function (t) { return sameObj(t.comp, comp); }); }

function scan(force) {
    var now = Date.now();
    if (!force && now - st.lastScan < 2500) return;
    st.lastScan = now;
    // forget tabs whose computer went away (scene change)
    st.tabs = st.tabs.filter(function (t) { return aliveObj(t.go); });
    var k = cls("Computer");
    if (!k) return;
    var comps = objectsOf(k);
    for (var i = 0; i < comps.length; i++) {
        if (hasOurs(comps[i])) continue;
        try { installOn(comps[i]); } catch (e) { st.status = "couldn't add tabs: " + e; log(st.status); }
    }
}

function removeAll() {
    var u = null;
    try { u = unityObj(); } catch (e) { }
    for (var i = 0; i < st.tabs.length; i++) {
        var t = st.tabs[i];
        try { t.comp.field("_tabs").value.method("Remove", 1).invoke(t.tab); } catch (e) { }
        try { t.comp.field("_tabHeaders").value.method("Remove", 1).invoke(t.hdr); } catch (e) { }
        try { var hg = t.hdr.method("get_gameObject", 0).invoke(); u.method("Destroy", 1).overload("UnityEngine.Object").invoke(hg); } catch (e) { }
        try { u.method("Destroy", 1).overload("UnityEngine.Object").invoke(t.go); } catch (e) { }
        try { t.comp.field("_currentTabIndex").value = 0; t.comp.method("DisplayTabIndex", 2).invoke(0, false); } catch (e) { }
    }
    st.tabs = [];
    try { objectsOf(cls("Computer")).forEach(function (c) { purgeNulls(c); try { c.field("_currentTabIndex").value = 0; c.method("DisplayTabIndex", 2).invoke(0, false); } catch (e) { } }); } catch (e) { }
}

installHooks();
installDisplayHook();
installKeyHook();

__arCategory("deadeye_computer", function (ui) {
    ui.text("Status: " + st.status, [0.6, 0.6, 0.6, 1]);
    ui.text("Tabs added: " + st.tabs.map(function (t) { return t.title; }).join(", ") + (st.tabs.length ? "" : "(none yet)"));
    if (ui.button("Add Tabs Now###compadd", 200)) { scan(true); notify("Computer: " + st.status); }
    ui.sameLine();
    if (ui.button("Reload Pages File###comppages", 230)) { removeAll(); scan(true); notify("Computer: " + st.status); }
    if (ui.button("Log Layout###complayout", 180)) {
        try {
            st.tabs.forEach(function (t) {
                var rt = t.text.method("get_rectTransform", 0).invoke();
                var sz = rt.method("get_sizeDelta", 0).invoke();
                var shown = ""; try { shown = String(t.text.method("get_text", 0).invoke().content).replace(/\n/g, " | ").slice(0, 80); } catch (e) { }
                var act = "?"; try { act = String(t.text.method("get_isActiveAndEnabled", 0).invoke()); } catch (e) { }
                log(t.title + ": box " + Number(sz.field("x").value).toFixed(1) + " x " + Number(sz.field("y").value).toFixed(1) +
                    ", font " + Number(t.text.method("get_fontSize", 0).invoke()).toFixed(1) + ", active " + act + ", text: " + shown);
            });
        } catch (e) { log("layout: " + e); }
    }
    ui.sameLine();
    if (ui.button("Log Tabs###comptabs", 160)) {
        try {
            st.tabs.forEach(function (t) {
                var list = t.comp.field("_tabs").value, n = Number(list.method("get_Count", 0).invoke());
                var cur = Number(t.comp.field("_currentTabIndex").value);
                var names = [];
                for (var i = 0; i < n; i++) { var tb = list.method("get_Item", 1).invoke(i); names.push(String(tb.class.name)); }
                log("computer tabs (current " + cur + "): " + names.join(", "));
            });
        } catch (e) { log("tabs: " + e); }
    }
});

var lastLive = 0;
__arFrame(function () {
    scan(false);
    var now = Date.now();
    if (now - lastLive < 1000) return;
    lastLive = now;
    for (var i = 0; i < st.tabs.length; i++) {
        var t = st.tabs[i];
        if (t.visible && (t.kind === "info" || t.kind === "active" || t.kind === "mods")) render(t);
    }
});
onDisable(function () { removeAll(); });

log("computer tabs ready (they appear when you are near the computer; pages come from " + PAGES_FILE_NAME + ")");

})();

// Finalize the shared settings bag and dispatch bundled callbacks through this plugin.
__arFinalizeProps();
if (__arFrameCallbacks.length) __arOriginalFrame(function () {
    __arFrameCallbacks.forEach(function (fn) { try { fn(); } catch (e) { console.log("[AnimalRivals] bundled frame callback: " + e); } });
});
