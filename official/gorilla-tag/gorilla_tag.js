// gorilla_tag.js - Gorilla Tag plugin for the universal menu (v3.3).
// game: com.AnotherAxiom.GorillaTag
// Ported from the J0ker Client source plus the il2cpp dump. v3.2 adds mods ported from the
// Seralyth Menu and hamburbur sources (self-only movement, rig poses, ESP styles, visuals). Drop it in Mods/imgui_plugins,
// turn the plugin on in the Plugins tab, tick what you want. The Status block at the bottom
// of the page shows whether setup worked and the first error of each feature.
//
// Inputs: [G] = right grip, [G + T] = aim with right grip and fire with right trigger.
// Mods that need their own button have a button picker next to them.
// Left out on purpose: lag, kick, destroy, tag all, vibrate/slow all, big lobbies, anti report /
// anti staff / auto mod bypass, report all, fling/freeze/grab all, spam mods, master-only chaos,
// currency / badge / level spoofing.

var input = ui.input;
var X = ui.read3;

var PROJ = {
    "Slingshot": { k: "sling", n: "SlingshotProjectile", c: [1, 1, 1, 1] },
    "Cloud": { k: "sling", n: "CloudSlingshot_Projectile", c: [1, 1, 1, 1] },
    "Horns": { k: "sling", n: "HornsSlingshotProjectile_PrefabV", c: [0, 1, 0, 1] },
    "Cupid Arrow": { k: "sling", n: "CupidArrow_Projectile", c: [1, 1, 1, 1] },
    "Ice": { k: "sling", n: "IceSlingshotProjectile_PrefabV Variant", c: [1, 1, 1, 1] },
    "Elf Bow": { k: "sling", n: "ElfBow_Projectile", c: [0, 1, 0, 1] },
    "Spider Bow": { k: "sling", n: "SpiderBowProjectile Variant", c: [1, 1, 1, 1] },
    "Devil Bow": { k: "sling", n: "DevilBowProjectile Variant", c: [1, 1, 1, 1] },
    "Yumi Bow": { k: "sling", n: "YumiBow_Projectile Variant", c: [1, 1, 1, 1] },
    "Dragon": { k: "sling", n: "DragonSlingshotProjectile_PrefabV Variant", c: [1, 1, 1, 1] },
    "Molten Rock": { k: "sling", n: "MoltenRockSlingshot_Projectile", c: [1, 1, 1, 1] },
    "Pillow": { k: "sling", n: "PillowProjectile_Projectile", c: [1, 1, 1, 1] },
    "Gnome": { k: "sling", n: "CrossbowGnome_Projectile", c: [1, 1, 1, 1] },
    "Spore": { k: "sling", n: "SporeSling_Projectile", c: [1, 1, 1, 1] },
    "Paper Plane": { k: "plane", n: "PaperAirplane_Projectile" },
    "Paper Plane Square": { k: "plane", n: "PaperAirplaneSquare_Projectile" },
    "Heart": { k: "plane", n: "ThrowableHeart_Projectile Variant" },
    "Rotten Pumpkin": { k: "plane", n: "RottenPumpkin_Projectile" },
    "Playing Card": { k: "plane", n: "PlayingCard_Projectile Variant" },
    "Cyber Ninja Star": { k: "plane", n: "CyberNinjaStar_Projectile Variant" },
    "Fireball": { k: "plane", n: "Fireball_Projectile" },
    "CreatorFest Fireball": { k: "plane", n: "CreatorFest2026Fireball_Projectile" },
    "Leaf Ninja Star": { k: "plane", n: "LeafNinjaStar_Projectile" },
    "Leaf Ninja Star 1": { k: "plane", n: "LeafNinjaStarColor1_Projectile Variant" },
    "Leaf Ninja Star 2": { k: "plane", n: "LeafNinjaStarColor2_Projectile Variant" },
    "Fire Cracker": { k: "crack", n: "FireCrackers_Projectile" },
    "Pomegranate": { k: "crack", n: "PomegranateEdible_Projectile" },
    "Cupcake": { k: "crack", n: "BirthdayCupcake5_Projectile" },
    "Pine Cone Grenade": { k: "crack", n: "GrenadePineCone_Projectile_NoPin" },
    "Smoke Bomb": { k: "crack", n: "SmokeBomb_Projectile" },
    "Thorn": { k: "sticky", n: "Thorn_StickyProjectile" },
    "Dino Spit": { k: "sticky", n: "DinoSpit_StickyProjectile" },
    "Marshmallow": { k: "sticky", n: "MarshmallowShooter_StickyProjectile" },
};
var COMP_COLORS = { "White": "#ffffff", "Purple": "#b36bff", "Green": "#4dff88", "Cyan": "#4dd9ff", "Pink": "#ff7ac8", "Red": "#ff5a5a", "Yellow": "#ffe45c" };
var COMP_COLOR_NAMES = Object.keys(COMP_COLORS);
var ESP_PAL = { "Cyan": [0.35, 0.8, 0.95], "Green": [0.4, 0.9, 0.5], "Pink": [1, 0.5, 0.75], "Purple": [0.7, 0.5, 1], "White": [0.95, 0.95, 0.95], "Orange": [1, 0.65, 0.3], "Yellow": [0.95, 0.9, 0.4], "Soft Red": [0.95, 0.4, 0.42] };
var ESP_PAL_NAMES = Object.keys(ESP_PAL);
var BTNS = ["Right Trigger", "Left Trigger", "A", "B", "X", "Y"];
var TAG_SOUNDS = ["Badop", "Tag", "Whoosh", "Bonk", "Bloop", "Timer", "Start", "Ice Pop", "Ice Crack", "Ice Break", "Ice Tagged", "Ice Break Loop"];
var GR_ITEMS = { "Orb": -298662477, "ID Card": 931983585, "Flower": -20887423, "Crate": 373410214, "Barrel": -1724683316, "Super Core": -398809473, "Ranged Projectile": 168735332, "Ice Projectile": -1727388710, "Random Tool": 0 };
var SI_ITEMS = { "Vibrating Spring": 1618940484, "Strange Wood": -894667703, "Monke Idol": 1880272606, "Stilt": 1447779317, "YoYo": 1799386883, "Bouncy Sand": -1111610567, "Floppy Metal": -1409076879, "Weird Gear": 1573124711, "Stilt Extendo": 683567723, "Stilt Long": -1906115882, "Stilt Short": -827046453, "Stilt Motorized 2": 1428761418, "Stilt Motorized 3": 1996041101, "Stilt Turkey": 686793174, "Tentacle Arm": 621310034 };
var THROW = [
    { l: "Big Snowball", n: "LMAVR. RIGHT.", g: 1 }, { l: "Snowball", n: "LMACF. RIGHT." },
    { l: "Water Balloon", n: "LMAEY. RIGHT." }, { l: "Halloween Candy", n: "LMAMO. RIGHT." },
    { l: "Apple", n: "LMAMV." }, { l: "Mento", n: "LMAIF. RIGHT." }, { l: "Gift", n: "LMAHR. RIGHT." },
    { l: "Vote Rock", n: "LMAMT. RIGHT." }, { l: "Fish Food", n: "LMAIP. RIGHT." }, { l: "Lava Rock", n: "LMAGE. RIGHT." },
    { l: "Book", n: "LMAQA. RIGHT." }, { l: "Coin", n: "LMAQC." }, { l: "Egg", n: "LMAPS. RIGHT." },
    { l: "Ice Cream", n: "LMARA. LEFT." }, { l: "Hot Dog", n: "LMARC." }, { l: "Fireworks", n: "LMAQU. LEFT." },
    { l: "Chips", n: "LMAUC. RIGHT." }, { l: "Salsa", n: "LMAUD. RIGHT." }, { l: "Apple Pie", n: "LMAUJ. RIGHT." },
    { l: "Mashed Potato", n: "LMAUH. RIGHT.", g: 1 }, { l: "Berry Pie", n: "LMAUL. RIGHT." }, { l: "Layer Dip", n: "LMAUF. RIGHT." },
    { l: "Pumpkin Pie", n: "LMAUN." }, { l: "Stuffing", n: "LMAUP. RIGHT.", g: 1 }, { l: "Corn", n: "LMAUT. RIGHT." },
    { l: "Turkey Leg", n: "LMAUR. RIGHT." }, { l: "Football", n: "LMATL." }, { l: "Popcorn Ball", n: "LMATP." },
    { l: "Cracked Plate", n: "LMAUA." }, { l: "Bonfire Sticks", n: "LMATY." }, { l: "Walnut", n: "LMAVT." },
    { l: "Hot Cocoa", n: "LMAWE." }, { l: "Papers", n: "LMASG. RIGHT." }, { l: "Balloon Animal", n: "LMAXI. RIGHT." },
    { l: "Cake", n: "LMAXG. RIGHT." }, { l: "Pillow", n: "LMAWB. RIGHT." }, { l: "Wafer", n: "LMAYC." },
    { l: "Pinecone", n: "LMAZJ." }, { l: "Baseball", n: "LMBBD." },
];
var SOUNDS = { "Hand Tap": 1, "Pop": 84, "Eat": 86, "Duck": 75, "Crystal": 20, "JMAN Okay": 336, "JMAN AHH": 337 };

var DEFS = [
    { type: "label", label: "Movement" },
    { type: "bool", key: "fly", label: "Fly", default: false, desc: "hold the chosen button to fly where you look" },
    { type: "select", key: "flyBtn", label: "Fly Button", options: BTNS, default: "B" },
    { type: "bool", key: "handFly", label: "Hand Fly", default: false, desc: "fly where your right hand points instead of where you look" },
    { type: "float", key: "flySpeed", label: "Fly Speed", min: 1, max: 40, default: 10, decimals: 1 },
    { type: "bool", key: "ironMonke", label: "Iron Monke [G]", default: false, desc: "grip pushes you off the side of that hand" },
    { type: "bool", key: "longArms", label: "Long Arms", default: false, desc: "scales the player" },
    { type: "float", key: "longArmSize", label: "Long Arm Size", min: 0.5, max: 20, default: 1.5, decimals: 1 },
    { type: "bool", key: "platforms", label: "Platforms", default: false, desc: "hold grip (or trigger) to drop a platform under that hand" },
    { type: "bool", key: "platTrigger", label: "Platforms Use Trigger", default: false },
    { type: "bool", key: "handNoclip", label: "Hand Noclip", default: false, desc: "your hands stop colliding with the map" },
    { type: "select", key: "platColor", label: "Platform Color", options: ["Black", "White", "Red", "Green", "Blue", "Yellow", "Magenta"], default: "Black" },
    { type: "bool", key: "noclip", label: "No Clip", default: false, desc: "hold the chosen button to turn the map colliders off" },
    { type: "select", key: "clipBtn", label: "No Clip Button", options: BTNS, default: "Left Trigger" },
    { type: "select", key: "gravity", label: "Gravity", options: ["Normal", "Zero", "Low", "High", "Invert"], default: "Normal" },
    { type: "bool", key: "speed", label: "Speed Boost", default: false },
    { type: "float", key: "maxJumpSpeed", label: "Max Jump Speed", min: 6.5, max: 20, default: 9, decimals: 1 },
    { type: "float", key: "jumpMult", label: "Jump Multiplier", min: 1.1, max: 20, default: 1.6, decimals: 1 },
    { type: "bool", key: "noVelLimit", label: "No Velocity Limit", default: false },
    { type: "bool", key: "wallWalk", label: "Wall Walk [G]", default: false, desc: "grip sticks you to whatever your hand last touched" },
    { type: "bool", key: "funnyRun", label: "Auto Funny Run", default: false, desc: "hold the chosen button" },
    { type: "select", key: "funnyBtn", label: "Funny Run Button", options: BTNS, default: "Left Trigger" },
    { type: "bool", key: "spamTaps", label: "Spam Hand Taps", default: false, desc: "removes the hand tap cooldown" },
    { type: "bool", key: "sizeOn", label: "Size Changer", default: false, desc: "uses the game's own scale multiplier" },
    { type: "float", key: "size", label: "Size", min: 0.2, max: 3, default: 1, decimals: 2 },
    { type: "select", key: "timeWarp", label: "Time Warp", options: ["Normal", "Slow", "Quick"], default: "Normal", desc: "slows down or speeds up your own physics" },
    { type: "bool", key: "upDown", label: "Up And Down [T / G]", default: false, desc: "right trigger goes up, right grip goes down, both together freeze you" },
    { type: "bool", key: "noTagFreeze", label: "No Tag Freeze", default: false },
    { type: "bool", key: "slideControl", label: "Slide Control", default: false, desc: "full control on ice" },
    { type: "bool", key: "dash", label: "Dash", default: false, desc: "the chosen button flings you forward" },
    { type: "select", key: "dashBtn", label: "Dash Button", options: BTNS, default: "A" },
    { type: "bool", key: "checkpoint", label: "Checkpoint [G]", default: false, desc: "hold right grip to place it, the chosen button teleports you back" },
    { type: "select", key: "cpBtn", label: "Checkpoint Button", options: BTNS, default: "A" },
    { type: "bool", key: "rewind", label: "Rewind", default: false, desc: "hold the chosen button to run back through where you've been" },
    { type: "select", key: "rewindBtn", label: "Rewind Button", options: BTNS, default: "Y" },
    { type: "label", label: "Movement+  (ported from Seralyth / hamburbur)" },
    { type: "select", key: "flyStyle", label: "Fly Style", options: ["Teleport", "Slingshot", "Zero-G Slingshot"], default: "Teleport", desc: "teleport is the classic fly. slingshot adds velocity instead, so it feels elastic. zero-g also cancels gravity while you hold the button" },
    { type: "bool", key: "joyFly", label: "Joystick Fly [J]", default: false, desc: "left stick moves you relative to where you look, no button needed" },
    { type: "bool", key: "barkFly", label: "Bark Fly [J]", default: false, desc: "left stick moves, right stick goes up and down, gravity is off. the fly from the Bark menu" },
    { type: "bool", key: "drive", label: "Drive [J]", default: false, desc: "left stick drives you along the ground like an invisible car" },
    { type: "float", key: "driveSpeed", label: "Drive Speed", min: 1, max: 30, default: 8, decimals: 1 },
    { type: "bool", key: "drStrange", label: "Dr Strange Fly [G + G]", default: false, desc: "hold both grips, you fly along the line from your left hand to your right hand" },
    { type: "bool", key: "grapple", label: "Grappling Hooks [G]", default: false, desc: "grip shoots a hook out of that hand and pulls you towards it" },
    { type: "bool", key: "enderPearl", label: "Ender Pearl [G]", default: false, desc: "hold grip to hold a pearl in that hand, let go to throw it, you teleport to where it lands" },
    { type: "bool", key: "reverseVel", label: "Reverse Velocity", default: false, desc: "the chosen button flips your velocity (half a second cooldown)" },
    { type: "select", key: "reverseBtn", label: "Reverse Velocity Button", options: BTNS, default: "A" },
    { type: "float", key: "dashPower", label: "Dash Power", min: 2, max: 40, default: 10, decimals: 0 },
    { type: "bool", key: "longJump", label: "Long Jump", default: false, desc: "hold the chosen button in the air to keep sliding forward, looks like a legit long jump" },
    { type: "select", key: "longJumpBtn", label: "Long Jump Button", options: BTNS, default: "A" },
    { type: "bool", key: "flickJump", label: "Flick Jump", default: false, desc: "the chosen button snaps your right hand 1.5m down for a huge push" },
    { type: "select", key: "flickBtn", label: "Flick Jump Button", options: BTNS, default: "A" },
    { type: "bool", key: "bunnyHop", label: "Bunny Hop", default: false, desc: "you jump again every time you touch the ground" },
    { type: "bool", key: "strafe", label: "Strafe", default: false, desc: "keeps you moving forward at max jump speed while you are in the air" },
    { type: "bool", key: "featherFall", label: "Feather Falling", default: false, desc: "you drift down slowly instead of dropping" },
    { type: "bool", key: "bouncy", label: "Bouncy", default: false, desc: "your body bounces off the ground" },
    { type: "bool", key: "gripSpeed", label: "Speed Boost: Right Grip Only", default: false, desc: "the speed boost above only applies while right grip is held" },
    { type: "bool", key: "alwaysMax", label: "Always Max Velocity", default: false, desc: "every touch sends you off at the velocity limit" },
    { type: "bool", key: "pullMod", label: "Pull Mod [G]", default: false, desc: "a small pull forward every time a gripped hand leaves the ground, speed without touching the speed values" },
    { type: "float", key: "pullPower", label: "Pull Power", min: 0.01, max: 0.5, default: 0.1, decimals: 2 },
    { type: "bool", key: "groundHelper", label: "Ground Helper [G]", default: false, desc: "right grip kills upward velocity so you stay on the ground while running" },
    { type: "bool", key: "wallAssist", label: "Wall Assist [G]", default: false, desc: "left grip pulls you into the last wall you touched" },
    { type: "float", key: "wallAssistPow", label: "Wall Assist Strength", min: 1, max: 10, default: 3, decimals: 1 },
    { type: "bool", key: "frozone", label: "Frozone [G]", default: false, desc: "grip leaves a trail of slippery ice platforms under that hand" },
    { type: "bool", key: "airSwim", label: "Air Swim", default: false, desc: "puts a water volume around you so you swim through the air (copies the cave water, load the beach side first)" },
    { type: "bool", key: "noBodyCol", label: "No Body Collider", default: false },
    { type: "bool", key: "noHeadCol", label: "No Head Collider", default: false },
    { type: "select", key: "autoClimb", label: "Auto Climb [G]", options: ["Off", "Pinch Climb", "Elevator Climb"], default: "Off", desc: "hold right grip and your hands do the climbing animation for you" },
    { type: "bool", key: "autoWalk", label: "Auto Walk [J]", default: false, desc: "push the left stick and your hands walk for you. click the stick to go faster" },
    { type: "bool", key: "leftRight", label: "Left And Right [T / G]", default: false, desc: "right trigger slides you left, right grip slides you right, gravity is off while held" },
    { type: "bool", key: "fwdBack", label: "Forwards And Backwards [T / G]", default: false, desc: "right trigger pushes you forward, right grip pulls you back, gravity is off while held" },
    { type: "select", key: "armStyle", label: "Arm Style", options: ["Normal", "Vertical", "Horizontal", "Velocity"], default: "Normal", desc: "other long arm flavours. vertical and horizontal use the Long Arm Size slider, velocity stretches your arms the faster you swing them" },
    { type: "float", key: "velArmPow", label: "Velocity Arm Power", min: 0.02, max: 0.5, default: 0.15, decimals: 2 },
    { type: "bool", key: "noclipFly", label: "Noclip Fly", default: false, desc: "hold the chosen button to fly where you look through everything, you keep the speed when you let go" },
    { type: "select", key: "noclipFlyBtn", label: "Noclip Fly Button", options: BTNS, default: "X" },
    { type: "bool", key: "safetyBubble", label: "Safety Bubble", default: false, desc: "teleports you 2m away from anyone who gets within 2m of you" },
    { type: "bool", key: "solidPlayers", label: "Solid Players", default: false, desc: "invisible colliders on every other player so you can stand on them (only on your side)" },
    { type: "bool", key: "throwCtrl", label: "Throw Controllers [X / A]", default: false, desc: "X throws your left hand, A throws your right hand, let go to get it back" },
    { type: "float", key: "gameSpeed", label: "Game Speed", min: 0.25, max: 2, default: 1, decimals: 2, desc: "your own time scale, 1 is normal. only you see it" },
    { type: "select", key: "teleGun", label: "Teleport Gun [G + T]", options: ["Off", "Teleport", "Airstrike", "Fly Towards"], default: "Off", desc: "hold right grip to aim (line + dot), right trigger teleports you there. airstrike drops you from 30m up, fly towards flies you at the dot while you hold the trigger" },
    { type: "button", label: "Teleport To Random Player", onClick: function () { run(function () { tpRandom(0); }); } },
    { type: "button", label: "Airstrike Random Player", onClick: function () { run(function () { tpRandom(30); }); } },
    { type: "bool", key: "punch", label: "Punch Mod", default: false, desc: "other players can punch you across the map" },
    { type: "float", key: "punchPower", label: "Punch Power", min: 2, max: 15, default: 5, decimals: 1 },
    { type: "select", key: "hitSound", label: "Hit Sound [G]", options: ["Off", "Hand Tap", "Pop", "Eat", "Duck", "Crystal", "JMAN Okay", "JMAN AHH", "Random"], default: "Off", desc: "plays a hand tap sound while you hold right grip" },
    { type: "bool", key: "hitNet", label: "Hit Sound: Networked", default: false, desc: "send it over the network so other players hear it too (slower rate so it doesn't trip the rpc limiter)" },
    { type: "float", key: "hitVol", label: "Hit Sound Volume", min: 0.05, max: 1, default: 0.5, decimals: 2 },
    { type: "bool", key: "splash", label: "Water Splash Hands [G]", default: false, desc: "networked splash effect at the hand whose grip you hold" },
    { type: "bool", key: "splashWalk", label: "Water Splash Walk", default: false, desc: "a splash every time a hand touches the ground" },
    { type: "select", key: "splashWhere", label: "Water Splash From", options: ["Hands", "Body", "Head (Vomit)", "Aura"], default: "Hands", desc: "where the splash above comes out of. aura sprays randomly around you" },
    { type: "bool", key: "impactHands", label: "Impact Effect Hands [G]", default: false, desc: "the snowball-hit impact effect at the hand whose grip you hold, in your color" },

    { type: "label", label: "Rig" },
    { type: "bool", key: "ghost", label: "Ghost [B]", default: false, desc: "B toggles your rig on/off for other players" },
    { type: "bool", key: "invisible", label: "Invisible [B]", default: false, desc: "B toggles, also parks your rig far away" },
    { type: "bool", key: "grabRig", label: "Grab Rig [G]", default: false, desc: "grip pulls your rig to that hand" },
    { type: "bool", key: "spaz", label: "Spaz Rig", default: false },
    { type: "select", key: "head", label: "Head", options: ["Normal", "Spin X", "Spin Y", "Spin Z", "Upside Down", "Broken Neck", "Backwards", "Sideways", "Head Bang"], default: "Normal" },
    { type: "float", key: "bangBpm", label: "Head Bang BPM", min: 40, max: 240, default: 120, decimals: 0 },
    { type: "select", key: "rigMode", label: "Rig Mode", options: ["Normal", "Freeze", "Upside Down", "T-Pose", "Helicopter", "Beyblade", "Still Beyblade", "Fan", "Dance", "Griddy", "Chicken", "Paralyze", "Minecraft", "Ghost Animations", "Bees"], default: "Normal", desc: "the chosen button toggles the mode on and off. minecraft: right trigger swings the arms, B points the right arm" },
    { type: "select", key: "rigBtn", label: "Rig Mode Button", options: BTNS, default: "Y" },
    { type: "bool", key: "rigGun", label: "Rig Gun [G + T]", default: false, desc: "hold right grip to aim, hold right trigger to put your rig where the dot is" },
    { type: "select", key: "playerGun", label: "Player Gun [G + T]", options: ["Off", "Orbit", "Follow", "Piggyback", "Stare", "Copy", "Vomit"], default: "Off", desc: "hold right grip to aim at a player, right trigger locks on. orbit and follow move your rig around them, piggyback teleports you onto their head, stare turns your rig's head towards them, copy mirrors their rig, vomit stands your rig on them and sprays water from your head. keep the other guns off" },

    { type: "label", label: "Player" },
    { type: "select", key: "body", label: "Body", options: ["Default", "No Head", "Skeleton", "Invisible"], default: "Default" },
    { type: "bool", key: "matRandom", label: "Material Changer", default: false },
    { type: "bool", key: "rgbBody", label: "RGB Body", default: false, desc: "cycles your color, shown locally" },
    { type: "select", key: "tapVol", label: "Hand Tap Volume", options: ["Normal", "Loud", "Silent"], default: "Normal" },
    { type: "select", key: "colorFx", label: "Color Effect", options: ["Off", "Flash", "Strobe"], default: "Off", desc: "flash blinks black and white, strobe cycles random colors. your real color comes back when you turn it off" },
    { type: "bool", key: "flipHands", label: "Flip Hands", default: false, desc: "your left hand goes where your right one is and the other way round" },
    { type: "bool", key: "autoClick", label: "Auto Clicker [T]", default: false, desc: "hold a trigger to spam that trigger" },

    { type: "label", label: "Board" },
    { type: "button", label: "Spawn Hoverboard", onClick: function () { run(spawnHoverboard); } },
    { type: "select", key: "boardColor", label: "Board Color", options: ["Normal", "RGB", "Strobe"], default: "Normal" },
    { type: "select", key: "boardSpeed", label: "Board Speed", options: ["Normal", "Fast", "Slow"], default: "Normal" },

    { type: "label", label: "ESP (through walls)" },
    { type: "bool", key: "espBoxes", label: "Box ESP", default: false, desc: "infected color vs normal color (infection modes)" },
    { type: "select", key: "espRenderer", label: "ESP Renderer", options: ["Classic", "Text Shader"], default: "Classic", desc: "classic is the original look, text shader is the flat one" },
    { type: "select", key: "espColor", label: "ESP Color", options: ESP_PAL_NAMES, default: "Cyan" },
    { type: "select", key: "espInfColor", label: "ESP Infected Color", options: ESP_PAL_NAMES, default: "Orange", desc: "softer than pure red on purpose, change it if you like" },
    { type: "float", key: "espAlpha", label: "ESP Opacity", min: 0.05, max: 0.8, default: 0.25, decimals: 2, desc: "lower is easier on the eyes" },
    { type: "select", key: "espFilter", label: "ESP Who", options: ["Everyone", "Infected Only", "Not Infected Only", "Auto"], default: "Everyone", desc: "auto = the other team in infection modes, your target and whoever hunts you in hunt" },
    { type: "bool", key: "espHeads", label: "Head Dots", default: false, desc: "a small dot on every head" },
    { type: "bool", key: "espSkeleton", label: "Skeleton", default: false, desc: "thin lines from the body to the head and both hands" },
    { type: "bool", key: "espLines", label: "Tracers", default: false, desc: "a line from your right hand to every other player" },
    { type: "bool", key: "espNearest", label: "Tracers: Nearest Only", default: false },
    { type: "select", key: "espShape", label: "Box ESP Shape", options: ["Cuboid", "Cube", "Sphere", "Capsule"], default: "Cuboid" },
    { type: "bool", key: "espHollow", label: "Hollow Box ESP", default: false, desc: "a square outline on every player that always faces you" },
    { type: "bool", key: "espBeacons", label: "Beacons", default: false, desc: "a tall vertical line through every player" },
    { type: "bool", key: "espTrails", label: "Breadcrumbs", default: false, desc: "a fading trail behind every player's head" },
    { type: "bool", key: "espJump", label: "Jump Predictions", default: false, desc: "draws the arc every moving player is about to fly along" },
    { type: "bool", key: "espHitbox", label: "Hitbox Predictions", default: false, desc: "a capsule where each moving player will be in half a second" },
    { type: "bool", key: "espBones", label: "Bone ESP", default: false, desc: "turns on the game's own x-ray skeleton on every player" },
    { type: "bool", key: "voiceEsp", label: "Voice ESP", default: false, desc: "a dot above anyone talking that grows with how loud they are" },
    { type: "bool", key: "xray", label: "X-Ray", default: false, desc: "hold the chosen button to hide the map. heavy: it touches every renderer in the scene, expect a hitch on press and release" },
    { type: "select", key: "xrayBtn", label: "X-Ray Button", options: BTNS, default: "Left Trigger" },
    { type: "bool", key: "creatureEsp", label: "Creature ESP", default: false, desc: "dots on every bug, bat and firefly that is loaded" },
    { type: "bool", key: "lavaPing", label: "Tagger Ping", default: false, desc: "a notification when a tagger gets within the distance below (infection modes, while you are not tagged)" },
    { type: "float", key: "lavaDist", label: "Tagger Ping Distance", min: 3, max: 40, default: 12, decimals: 0 },
    { type: "bool", key: "nameTags", label: "Name Tags", default: false, desc: "a name label above every other player" },
    { type: "select", key: "nameMode", label: "Name Tag Info", options: ["Name", "Name + Distance", "Name + Infected", "Name + FPS", "Name + Platform", "Compact"], default: "Name + Distance", desc: "compact = platform | fps | distance | master on one line" },
    { type: "float", key: "nameSize", label: "Name Tag Size", min: 0.5, max: 8, default: 2, decimals: 1 },
    { type: "bool", key: "chams", label: "Player ESP (chams)", default: false, desc: "recolors every other rig and draws it on top of everything" },

    { type: "label", label: "Tag" },
    { type: "bool", key: "tagGun", label: "Tag Gun [G + T]", default: false, desc: "hold right grip to aim (line + dot), right trigger tags the target. share the grip with platforms, so keep those off" },
    { type: "float", key: "gunAngle", label: "Gun Aim Angle", min: 2, max: 20, default: 8, decimals: 0, desc: "how close to the line a player has to be to get picked" },
    { type: "bool", key: "tagAura", label: "Tag Aura", default: false, desc: "while you are infected, tags uninfected players inside the range" },
    { type: "float", key: "auraRange", label: "Aura Range", min: 1, max: 6, default: 3, decimals: 1 },
    { type: "bool", key: "auraInView", label: "Tag Aura: In View Only", default: false, desc: "only tags players you are roughly looking at, looks a lot more natural" },
    { type: "bool", key: "tagSelf", label: "Tag Self", default: false, desc: "hold the chosen button to get tagged by an infected player" },
    { type: "select", key: "selfBtn", label: "Tag Self Button", options: BTNS, default: "X" },
    { type: "bool", key: "tagReach", label: "Tag Reach", default: false, desc: "raises GorillaTagger.maxTagDistance" },
    { type: "float", key: "tagReachDist", label: "Reach Distance", min: 0.5, max: 6, default: 2, decimals: 1 },
    { type: "bool", key: "noCooldown", label: "No Tag Cooldown", default: false },
    { type: "select", key: "tagSound", label: "Tag Sound", options: TAG_SOUNDS, default: "Tag" },
    { type: "button", label: "Play Tag Sound [master]", desc: "plays the chosen game sound for the whole room, the game only accepts it from the master client", onClick: function () { run(playTagSound); } },
    { type: "bool", key: "rockGun", label: "Rock Gun [G + T] [master]", default: false, desc: "aim at a player and pull the trigger to make them it, works when you are the master client in infection" },

    { type: "label", label: "Projectiles (client side, only you see them)" },
    { type: "select", key: "projType", label: "Projectile [G]", options: ["Off"].concat(Object.keys(PROJ)), default: "Off", desc: "hold right grip to fire from your right hand" },
    { type: "float", key: "projSpeed", label: "Launch Speed", min: 5, max: 60, default: 15.3, decimals: 1 },
    { type: "float", key: "projRate", label: "Seconds Between Shots", min: 0.05, max: 1, default: 0.15, decimals: 2 },

    { type: "label", label: "Throwables (networked, everyone sees them)" },
    { type: "button", label: "Preload Throwables", onClick: function () { run(preloadThrowables); } },
    { type: "select", key: "throwType", label: "Throwable", options: ["Off"].concat(THROW.map(function (t) { return t.l; })).concat(["Random"]), default: "Off", desc: "hold the chosen button to throw from in front of your right hand. press Preload first and wait a few seconds. random picks a different item every throw" },
    { type: "bool", key: "throwShow", label: "Show Thrown Items Locally", default: true, desc: "J0ker's trick: wakes up the game's own projectile objects so you see what you throw, and puts away any other item left active in your hand" },
    { type: "bool", key: "throwHide", label: "Hide Item In Hand", default: true, desc: "puts the held item away right after each throw instead of leaving it stuck to your hand while the button is held" },
    { type: "select", key: "throwBtn", label: "Throw Button", options: ["Right Trigger", "B", "A", "Right Grip"], default: "Right Trigger", desc: "grip makes your hand grab the item, so trigger is the default" },
    { type: "float", key: "throwDist", label: "Throw Spawn Distance", min: 0.1, max: 1.5, default: 0.5, decimals: 2, desc: "how far in front of your hand the item starts" },
    { type: "float", key: "throwSpeed", label: "Throw Speed", min: 5, max: 40, default: 20, decimals: 1 },
    { type: "float", key: "throwRate", label: "Seconds Between Throws", min: 0.2, max: 2, default: 0.3, decimals: 2 },

    { type: "label", label: "Cosmetics (client side, only you see them)" },
    { type: "button", label: "Unlock All Cosmetics", onClick: function () { run(startUnlock); } },
    { type: "button", label: "Fix Cosmetics Not Showing", desc: "run this if an equipped cosmetic doesn't appear on you", onClick: function () { run(function () {
        var ctrl = cosmeticsCtrl(); if (!ctrl) throw new Error("cosmetics not loaded");
        var list = ctrl.method("get_allCosmetics").invoke(), n = list.method("get_Count").invoke(), names = [];
        for (var i = 0; i < n; i++) { var nm = str(list.method("get_Item").invoke(i).field("itemName").value); if (nm && nm !== "null") names.push(nm); }
        showCosmetics(names); notify("Re-applied " + names.length + " cosmetics to your rig");
    }); } },
    { type: "bool", key: "keepUnlocked", label: "Re-apply Every 15s", default: false, desc: "the game can reset the list when it refreshes your inventory" },

    { type: "label", label: "World" },
    { type: "button", label: "Cycle Time of Day", onClick: function () { run(cycleTime); } },
    { type: "select", key: "timeOfDay", label: "Time Of Day", options: ["Game", "Morning", "Day", "Evening", "Night"], default: "Game" },
    { type: "bool", key: "fullbright", label: "Fullbright", default: false, desc: "turns off the dynamic lighting in maps that use it" },
    { type: "bool", key: "noBlindfold", label: "Remove Blindfold [Prop Hunt]", default: false },
    { type: "bool", key: "nearClip", label: "Near Clip", default: false, desc: "face cosmetics stop blocking your view" },
    { type: "select", key: "fpsCap", label: "FPS Cap", options: ["Game", "72", "90", "120", "Unlocked"], default: "Game", desc: "sets the target frame rate. the headset may still clamp it to the display rate" },
    { type: "bool", key: "rain", label: "Always Rain", default: false },
    { type: "select", key: "water", label: "Beach Water", options: ["Normal", "Walk On Water", "No Water"], default: "Normal" },
    { type: "bool", key: "noWind", label: "Disable Wind [Forest]", default: false },
    { type: "button", label: "Mega Diving Board [Beach]", onClick: function () { run(megaBoard); } },

    { type: "label", label: "Misc" },
    { type: "bool", key: "noFingers", label: "No Finger Movement", default: false, desc: "zeroes your finger and button input" },
    { type: "bool", key: "antiAfk", label: "Anti AFK Kick", default: false },
    { type: "bool", key: "smoothRig", label: "Smooth Rig", default: false, desc: "sends your rig position 3x as often (30/s), you look smoother to everyone else" },
    { type: "bool", key: "noRigLerp", label: "Disable Rig Smoothing", default: false, desc: "other players snap to their real position instead of gliding there" },
    { type: "bool", key: "ropeReach", label: "Rope Grab Reach", default: false, desc: "grab ropes and vines from further away" },
    { type: "bool", key: "handLabels", label: "Hand Labels", default: false, desc: "text on your left hand: your speed and the distance to the nearest player on the other team" },

    { type: "label", label: "Notifications" },
    { type: "bool", key: "joinNotes", label: "Join Notifications", default: true, desc: "a normal notification with the name, platform and master status when someone joins" },
    { type: "bool", key: "leaveNotes", label: "Leave Notifications", default: true },
    { type: "bool", key: "joinIds", label: "Show User IDs", default: false, desc: "adds the start of their user id to the join notification" },

    { type: "label", label: "Gorilla Computer" },
    { type: "bool", key: "compOn", label: "Computer Mods", default: false, desc: "custom start screen plus MODS and STATS pages (they replace the Credits and Support pages in the up/down list)" },
    { type: "bool", key: "compBlack", label: "Black Screen", default: true },
    { type: "select", key: "compColor", label: "Screen Color", options: COMP_COLOR_NAMES, default: "Purple", desc: "accent color for the custom pages. key 0 on the MODS page cycles it" },
    { type: "text", key: "compTitle", label: "Start Screen Title", default: "GORILLA TAG // MODDED" },
    { type: "text", key: "compMsg", label: "Start Screen Message", default: "have fun out there" },
    { type: "button", label: "Join Random Room", onClick: function () { run(function () { photonNet().method("JoinRandomRoom", 0).invoke(); }); } },
    { type: "button", label: "Connect: US", onClick: function () { run(function () { photonNet().method("ConnectToRegion").invoke(Il2Cpp.string("us")); }); } },
    { type: "button", label: "Connect: US West", onClick: function () { run(function () { photonNet().method("ConnectToRegion").invoke(Il2Cpp.string("usw")); }); } },
    { type: "button", label: "Connect: EU", onClick: function () { run(function () { photonNet().method("ConnectToRegion").invoke(Il2Cpp.string("eu")); }); } },
    { type: "button", label: "Disconnect", onClick: function () { run(function () { photonNet().method("Disconnect", 0).invoke(); }); } },
    { type: "text", key: "roomCode", label: "Room Code", default: "" },
    { type: "button", label: "Join Room Code", desc: "joins the private room typed above", onClick: function () { run(joinRoomCode); } },
    { type: "button", label: "Rejoin Last Room", onClick: function () { run(rejoinLast); } },

    { type: "label", label: "Paintbrawl  (from J0ker)" },
    { type: "bool", key: "pbAimbot", label: "Paintbrawl Aimbot [G]", default: false, desc: "while you hold grip, your own paintballs get moved onto a random other player" },
    { type: "bool", key: "pbAutoFire", label: "Paintbrawl Auto Fire [G]", default: false, desc: "hold grip and the slingshot fires itself" },
    { type: "button", label: "Revive All [master]", onClick: function () { run(reviveAll); } },
    { type: "bool", key: "reviveGun", label: "Revive Gun [G + T] [master]", default: false, desc: "aim at a player and pull the trigger to give them their 3 lives back" },

    { type: "label", label: "Party" },
    { type: "bool", key: "braceletBoth", label: "Bracelet: Both Hands", default: false },
    { type: "button", label: "Bracelet On", onClick: function () { run(function () { bracelet(true); }); } },
    { type: "button", label: "Bracelet Off", onClick: function () { run(function () { bracelet(false); }); } },
    { type: "button", label: "Leave Party", onClick: function () { run(leaveParty); } },

    { type: "label", label: "Ghost Reactor  (master only, in the reactor)" },
    { type: "select", key: "grSpawn", label: "GR Spawn At Hand [G]", options: ["Off"].concat(Object.keys(GR_ITEMS)), default: "Off", desc: "hold right grip to drop the item out of your right hand, 4 a second" },
    { type: "select", key: "grGun", label: "GR Gun [G + T]", options: ["Off", "Items", "Monsters", "Door", "Kiosks"], default: "Off", desc: "aim, pull the trigger, a random one from that list appears at the dot" },

    { type: "label", label: "Super Infection  (master only)" },
    { type: "select", key: "siSpawn", label: "SI Gadget At Hand [G]", options: ["Off"].concat(Object.keys(SI_ITEMS)), default: "Off", desc: "hold right grip to drop the gadget out of your right hand" },

    { type: "label", label: "Critters & Beach  (from J0ker)" },
    { type: "bool", key: "rideBug", label: "Ride Bug [G]", default: false, desc: "hold right grip to sit on the floating bug (map colliders off while riding)" },
    { type: "bool", key: "rideBat", label: "Ride Bat [G]", default: false, desc: "same for the cave bat" },
    { type: "select", key: "bugSpeed", label: "Bug & Bat Speed", options: ["Game", "Normal", "Fast"], default: "Game" },
    { type: "select", key: "critterGun", label: "Critter Gun [G + T]", options: ["Off", "Bugs", "Bat", "Beach Ball"], default: "Off", desc: "aim and pull the trigger to move that thing to the dot" },
    { type: "bool", key: "grabBall", label: "Grab Beach Ball [G]", default: false, desc: "hold right grip and the beach ball sits in your hand" },

    { type: "label", label: "Guardian  (master only)" },
    { type: "button", label: "Become Guardian", onClick: function () { run(function () { setGuardian(false); }); } },
    { type: "button", label: "Random Guardian", onClick: function () { run(function () { setGuardian(true); }); } },

    { type: "label", label: "Cosmetics+" },
    { type: "button", label: "Buy All Free Items", desc: "buys every cosmetic the shop lists at 0 shiny rocks that you don't own yet", onClick: function () { run(buyAllFree); } },
    { type: "button", label: "Unlimited Shiny Rocks (display)", desc: "only changes the number on the boards, nothing is really added", onClick: function () { run(unlimitedRocks); } },
    { type: "button", label: "Unlock Competitive Queue", onClick: function () { run(unlockComp); } },
    { type: "button", label: "Disable Block Colliders", desc: "removes the colliders from placed monke blocks on your side", onClick: function () { run(disableBlockColliders); } },
    { type: "label", label: "Defensive" },
    { type: "bool", key: "rpcLimit", label: "RPC Rate Limiter", default: true, desc: "drops a player's events once they send more than the limit in one second. a shield against lag and crash mods aimed at you. never touches rig movement or Photon's own room events" },
    { type: "int", key: "rpcMax", label: "Max Events Per Second Per Player", min: 20, max: 400, default: 120 },
    { type: "bool", key: "crashWatch", label: "Freeze Watchdog", default: true, desc: "when the game freezes for over 1.5s, tells you who sent the last events right before it (also in the log)" },
    { type: "bool", key: "antiTp", label: "Anti Teleport (snap back)", default: false, desc: "undoes a jump bigger than physics could do in one frame. ignores your own teleports for 1.5s and room joins for 8s. turn off if Rewind fights it" },
    { type: "float", key: "antiTpDist", label: "Anti Teleport Distance", min: 5, max: 60, default: 15, decimals: 0 },
    { type: "label", label: "Player Volumes" },
    { type: "bool", key: "voiceCtl", label: "Player Volumes", default: false, desc: "the sliders below get named after the players in the room, by join order. 1 = normal, 0 = mute, up to 3x" },
    { type: "float", key: "voiceBoost", label: "Everyone Volume", min: 0, max: 3, default: 1, decimals: 2 },
    { type: "bool", key: "muteAll", label: "Mute Everyone", default: false },
    { type: "button", label: "Reset Volumes", onClick: function () { run(resetVolumes); } },
    { type: "float", key: "vol1", label: "Vol 1: (empty)", min: 0, max: 3, default: 1, decimals: 2 },
    { type: "float", key: "vol2", label: "Vol 2: (empty)", min: 0, max: 3, default: 1, decimals: 2 },
    { type: "float", key: "vol3", label: "Vol 3: (empty)", min: 0, max: 3, default: 1, decimals: 2 },
    { type: "float", key: "vol4", label: "Vol 4: (empty)", min: 0, max: 3, default: 1, decimals: 2 },
    { type: "float", key: "vol5", label: "Vol 5: (empty)", min: 0, max: 3, default: 1, decimals: 2 },
    { type: "float", key: "vol6", label: "Vol 6: (empty)", min: 0, max: 3, default: 1, decimals: 2 },
    { type: "float", key: "vol7", label: "Vol 7: (empty)", min: 0, max: 3, default: 1, decimals: 2 },
    { type: "float", key: "vol8", label: "Vol 8: (empty)", min: 0, max: 3, default: 1, decimals: 2 },
    { type: "label", label: "Info" },
    { type: "bool", key: "roomInfo", label: "Room Info On Wrist", default: false, desc: "room code, region, player count, game mode, host, ping and fps above your left hand (stacks above Hand Labels)" },
    { type: "bool", key: "tagFeed", label: "Tag Feed", default: true, desc: "a notification for every tag: who tagged who, and how far away they were when they got you" },
    { type: "bool", key: "tagFeedMe", label: "Tag Feed: Only Mine", default: false, desc: "only tags you gave or got" },
    { type: "bool", key: "tagFeedBuzz", label: "Tag Feed: Buzz When Tagged", default: true },
    { type: "bool", key: "ambushReveal", label: "Ambush Reveal", default: false, desc: "shows the hidden taggers in Ambush mode by turning their rig back on with the normal tagger material" },
    { type: "bool", key: "reportAlert", label: "Report Board Alert", default: true, desc: "tells you when another player's hand is on the report button next to your name on a scoreboard. only a notification, it does not stop anything" },
    { type: "float", key: "reportRange", label: "Report Alert Hand Range", min: 0.15, max: 1, default: 0.5, decimals: 2 },
    { type: "label", label: "Follow / Orbit" },
    { type: "select", key: "targetSel", label: "Target Player", options: ["Nearest", "Nearest Tagger", "Nearest Runner", "Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5", "Slot 6", "Slot 7", "Slot 8"], default: "Nearest", desc: "slots are players by join order. the chosen player's name shows in this label while follow or orbit is on" },
    { type: "bool", key: "follow", label: "Follow Target", default: false, desc: "flies you along behind the target at the distance below" },
    { type: "float", key: "followDist", label: "Follow Distance", min: 0.5, max: 8, default: 2, decimals: 1 },
    { type: "bool", key: "orbit", label: "Orbit Target", default: false, desc: "circles around the target. wins over follow" },
    { type: "float", key: "orbitRadius", label: "Orbit Radius", min: 0.5, max: 8, default: 2, decimals: 1 },
    { type: "float", key: "orbitSpeed", label: "Orbit Speed (deg/s)", min: 10, max: 360, default: 90, decimals: 0 },
    { type: "select", key: "followBtn", label: "Follow / Orbit Button", options: ["Always", "Left Grip", "Right Grip", "Left Trigger", "Right Trigger", "A", "B", "X", "Y"], default: "Always" },
    { type: "float", key: "followMax", label: "Follow Max Speed", min: 5, max: 60, default: 25, decimals: 0 },
];
var p = props(DEFS);

// ------------------------------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------------------------------
var G = {};
var seenErr = {};
function run(fn) { try { fn(); } catch (e) { log("error: " + e); notify("Failed, see log"); } }
function safe(name, fn) { try { fn(); } catch (e) { if (!seenErr[name]) { seenErr[name] = String(e); log(name + ": " + e); } } }
function cs() { return Il2Cpp.domain.assembly("Assembly-CSharp").image; }
function core() { return Il2Cpp.domain.assembly("UnityEngine.CoreModule").image; }
function physics() { return Il2Cpp.domain.assembly("UnityEngine.PhysicsModule").image; }
function tr(o) { return o.method("get_transform").invoke(); }
function pos(o) { return tr(o).method("get_position").invoke(); }
function str(v) { try { return v.content; } catch (e) { return String(v); } }

// plain-array vector math (arrays are accepted anywhere a Vector3 is expected)
function pos3(o) { return X(pos(o)); }
function add3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function mul3(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function len3(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function hsv(h) {
    var i = Math.floor(h * 6), f = h * 6 - i, q = 1 - f, t = f;
    switch (((i % 6) + 6) % 6) {
        case 0: return [1, t, 0]; case 1: return [q, 1, 0]; case 2: return [0, 1, t];
        case 3: return [0, q, 1]; case 4: return [t, 0, 1]; default: return [1, 0, q];
    }
}

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
function findObjs(klass) {
    var arr = null;
    try { arr = G.UObject.method("FindObjectsOfType").inflate(klass).invoke(); } catch (e) {}
    if (!arr) { try { arr = pickM(G.UObject, G.UObject, "FindObjectsOfType", 1, function (ps) { return ps[0].type.name === "System.Type"; }).invoke(klass.type.object); } catch (e) {} }
    return arr;
}
function gfind(path) { return G.GameObject.method("Find").invoke(Il2Cpp.string(path)); }
function staticInstance(klass) {
    var names = ["get_Instance", "get_instance"];
    for (var i = 0; i < names.length; i++) { try { var v = klass.method(names[i]).invoke(); if (v && !v.isNull()) return v; } catch (e) {} }
    var fields = ["Instance", "instance", "_instance", "<Instance>k__BackingField"];
    for (var j = 0; j < fields.length; j++) { try { var f = klass.field(fields[j]).value; if (f && !f.isNull()) return f; } catch (e) {} }
    return null;
}
function qmul(a, b) {
    if (!G.qmulM) G.qmulM = pickM(G.Quaternion, G.Quaternion, "op_Multiply", 2, function (ps) { return ps[0].type.name === "UnityEngine.Quaternion" && ps[1].type.name === "UnityEngine.Quaternion"; });
    return G.qmulM.invoke(a, b);
}
function euler(x, y, z) { return G.Quaternion.method("Euler", 3).invoke(x, y, z); }
function opt(fn, fallback) { try { var v = fn(); return (v === undefined || v === null) ? fallback : v; } catch (e) { return fallback; } }

function init() {
    if (G.ok) return true;
    try {
        G.player = cs().class("GorillaLocomotion.GTPlayer").method("get_Instance").invoke();
        G.tagger = cs().class("GorillaTagger").field("_instance").value;
        if (!G.player || G.player.isNull() || !G.tagger || G.tagger.isNull()) { G.initErr = "game not ready yet (player or tagger is null)"; return false; }
        G.localRig = G.tagger.field("offlineVRRig").value;
        G.leftHand = G.tagger.field("leftHandTransform").value;
        G.rightHand = G.tagger.field("rightHandTransform").value;
        G.rb = opt(function () { return G.player.method("get_playerRigidBody").invoke(); }, null);
        if (!G.rb || G.rb.isNull()) {
            G.rb = null;
            G.player.class.fields.forEach(function (f) { if (f.type.name == "UnityEngine.Rigidbody" && !G.rb) G.rb = G.player.field(f.name).value; });
        }
        if (!G.rb) { G.initErr = "could not find the player rigidbody"; return false; }
        G.Vector3 = core().class("UnityEngine.Vector3");
        G.Quaternion = core().class("UnityEngine.Quaternion");
        G.GameObject = core().class("UnityEngine.GameObject");
        G.Renderer = core().class("UnityEngine.Renderer");
        G.UObject = core().class("UnityEngine.Object");
        G.Collider = opt(function () { return physics().class("UnityEngine.Collider"); }, null);
        G.base = {
            maxJump: opt(function () { return G.player.field("maxJumpSpeed").value; }, 6.5),
            jump: opt(function () { return G.player.method("get_jumpMultiplier").invoke(); }, 1.1),
            velLimit: opt(function () { return G.player.field("velocityLimit").value; }, 0.3),
            slideLimit: opt(function () { return G.player.field("slideVelocityLimit").value; }, 0.4),
            tagDist: opt(function () { return G.tagger.field("maxTagDistance").value; }, 0.2),
            tagCool: opt(function () { return G.tagger.field("tagCooldown").value; }, 0.5),
            tapCool: opt(function () { return G.tagger.field("tapCoolDown").value; }, 0.033),
            slide: opt(function () { return G.player.field("slideControl").value; }, 0.00475),
        };
        G.ok = true;
        G.initErr = "";
        log("init ok");
    } catch (e) {
        var msg = String(e);
        if (G.initErr !== msg) { G.initErr = msg; log("init failed: " + msg); }
        return false;
    }
    return true;
}

// ------------------------------------------------------------------------------------------
// network / game mode access
// ------------------------------------------------------------------------------------------
function localNet() { return cs().class("NetworkSystem").field("Instance").value.method("get_LocalPlayer").invoke(); }
var modeCache = { t: 0, m: null };
function tagManager() {
    var now = Date.now();
    if (now - modeCache.t < 1000) return modeCache.m;
    modeCache.t = now; modeCache.m = null;
    try {
        var m = cs().class("GorillaGameModes.GameMode").method("get_ActiveGameMode").invoke();
        if (m && !m.isNull() && m.class.name.indexOf("GorillaTagManager") >= 0) modeCache.m = m;
    } catch (e) {}
    return modeCache.m;
}
function isInfected(mgr, net) { try { return !!mgr.method("IsInfected").invoke(net); } catch (e) { return false; } }
function reportTag(net, times) {
    var GM = cs().class("GorillaGameModes.GameMode");
    for (var i = 0; i < times; i++) GM.method("ReportTag", 1).invoke(net);
}
function otherRigs() {
    var out = [];
    var list = cs().class("VRRigCache").field("m_activeRigs").value;
    if (!list || list.isNull()) return out;
    var n = list.method("get_Count").invoke();
    var mine = G.localRig.handle.toString();
    for (var i = 0; i < n; i++) {
        var r = list.method("get_Item").invoke(i);
        if (!r || r.isNull() || r.handle.toString() === mine) continue;
        out.push(r);
    }
    return out;
}
function rigPos(r) { return pos3(r.field("bodyTransform").value); }
function handState(left) { return G.player.method(left ? "get_LeftHand" : "get_RightHand").invoke(); }

// ------------------------------------------------------------------------------------------
// buttons
// ------------------------------------------------------------------------------------------
function spawnHoverboard() {
    G.player.method("set_isHoverAllowed").invoke(true);
    var m = cs().class("FreeHoverboardManager").method("get_instance").invoke();
    if (!m || m.isNull()) { notify("Hoverboard manager not loaded here"); return; }
    var at = add3(pos3(G.rightHand), [0, 0.1, 0]);
    m.method("SendDropBoardRPC").invoke(at, G.Quaternion.field("identityQuaternion").value, [0, 0, 0], [0, 0, 0], [1, 1, 1, 1], [1, 1, 1], 0);
}
var dayInt = 0;
function cycleTime() {
    dayInt = dayInt === 1 ? 4 : (dayInt === 4 ? 0 : 1);
    var m = cs().class("BetterDayNightManager").field("instance").value;
    m.method("SetOverrideIndex").invoke(dayInt);
    notify("Time: " + (dayInt === 1 ? "Dawn" : dayInt === 4 ? "Morning" : "Night"));
}
function megaBoard() {
    var go = gfind("Beach/Beach_Gameplay_V6/B_Divingboard_1/DivingBoard_board");
    if (!go || go.isNull()) { notify("Diving board not found, go to the beach"); return; }
    var so = getComp(go, cs().class("GorillaSurfaceOverride"));
    so.field("extraVelMaxMultiplier").value = 50;
    so.field("extraVelMultiplier").value = 50;
    notify("Mega diving board on");
}

// ---- cosmetics unlock (client side) ----
var unlockQ = null, unlockTotal = 0, lastReapply = 0, unlockOk = 0, unlockBad = [];
function cosmeticsCtrl() {
    var c = cs().class("GorillaNetworking.CosmeticsController").field("instance").value;
    return (c && !c.isNull()) ? c : null;
}
function startUnlock() {
    var ctrl = cosmeticsCtrl();
    if (!ctrl) { notify("Cosmetics not loaded yet, try in the lobby"); return; }
    var owned = opt(function () { return str(ctrl.field("concatStringCosmeticsAllowed").value); }, "");
    var list = ctrl.method("get_allCosmetics").invoke();
    var n = list.method("get_Count").invoke();
    unlockQ = [];
    for (var i = 0; i < n; i++) {
        var it = list.method("get_Item").invoke(i);
        var name = str(it.field("itemName").value);
        if (!name || name === "null" || name === "NOTHING") continue;
        if (owned && owned.indexOf(name) >= 0) continue;
        unlockQ.push(name);
    }
    unlockTotal = unlockQ.length; unlockOk = 0; unlockBad = [];
    allowNames = unlockQ.slice();
    notify("Unlocking " + unlockTotal + " cosmetics...");
}
function stepUnlock() {
    if (showPending && Date.now() > showAt) { var sp = showPending; showPending = null; showCosmetics(sp); }
    if (!unlockQ) return;
    var ctrl = cosmeticsCtrl();
    if (!ctrl) { unlockQ = null; return; }
    var n = Math.min(25, unlockQ.length);
    for (var i = 0; i < n; i++) {
        var id = unlockQ.shift();
        try { ctrl.method("UnlockItem").invoke(Il2Cpp.string(id), false); unlockOk++; }
        catch (e) { unlockBad.push(id); if (unlockBad.length <= 3) log("unlock: " + id + " failed (" + e + ")"); }
    }
    if (!unlockQ.length) {
        unlockQ = null;
        notify("Unlocked " + unlockOk + " of " + unlockTotal + (unlockBad.length ? " (" + unlockBad.length + " threw errors, skipped)" : ""), 6);
        if (unlockBad.length) log("unlock: " + unlockBad.length + " items threw, first ones: " + unlockBad.slice(0, 8).join(", "));
        safe("refresh wardrobes", function () { ctrl.method("RefreshWardrobesAfterUnlockChange").invoke(); });
        safe("update wardrobes", function () { ctrl.method("UpdateWardrobeModelsAndButtons").invoke(); });
        showPending = allowNames; showAt = Date.now() + 1500;
        notify("Cosmetics unlocked (only you can see them). re-equip anything that doesn't show");
    }
}
// the local rig only draws cosmetics it thinks you own, so after unlocking:
// 1) add every item to the rig's owned set, 2) make VRRig.IsItemAllowed say yes for the local rig only,
// 3) re-run the rig's cosmetic update so the worn set shows up.
var allowHook = null, allowNames = [];
function allowHookOn() {
    if (allowHook) return;
    var addr = cs().class("VRRig").method("IsItemAllowed").virtualAddress;
    var local = G.localRig.handle;
    allowHook = Interceptor.attach(addr, {
        onEnter: function (args) { this.mine = args[0].equals(local); },
        onLeave: function (ret) { if (this.mine) ret.replace(ptr(1)); },
    });
}
function allowHookOff() { if (allowHook) { try { allowHook.detach(); } catch (e) {} allowHook = null; } }
function showCosmetics(names) {
    safe("allow hook", allowHookOn);
    safe("owned set", function () {
        var set = G.localRig.field("_playerOwnedCosmetics").value;
        if (!set || set.isNull()) return;
        for (var i = 0; i < names.length; i++) { try { set.method("Add").invoke(Il2Cpp.string(names[i])); } catch (e) {} }
    });
}
var showPending = null, showAt = 0;
function needsReapply() {
    var ctrl = cosmeticsCtrl();
    if (!ctrl) return false;
    var all = ctrl.method("get_allCosmetics").invoke().method("get_Count").invoke();
    var have = ctrl.field("unlockedCosmetics").value.method("get_Count").invoke();
    return have < all;
}

// ------------------------------------------------------------------------------------------
// movement
// ------------------------------------------------------------------------------------------
var platL = null, platR = null, clipped = false, prevClipTrig = false;
var speedOn = false, velOn = false, armsOn = false, lastSize = 1, tapsOn = false, walkPos = null, walkNormal = null, frames = 0;
var PCOLORS = { Black: [0, 0, 0, 1], White: [9, 9, 9, 1], Red: [9, 0, 0, 1], Green: [0, 9, 0, 1], Blue: [0, 0, 9, 1], Yellow: [5, 5, 0, 1], Magenta: [9, 0.5, 9, 1] };

function makePlat(left) {
    var hf = handState(left).field("handFollower").value;
    var go = G.GameObject.method("CreatePrimitive").invoke(3);
    var t1 = tr(go);
    t1.method("set_position").invoke(add3(pos3(hf), [0, -0.05, 0]));
    t1.method("set_rotation").invoke(tr(hf).method("get_rotation").invoke());
    t1.method("set_localScale").invoke([0.03, 0.3, 0.3]);
    try { getComp(go, G.Renderer).method("get_material").invoke().method("set_color").invoke(PCOLORS[p.platColor] || PCOLORS.Black); } catch (e) {}
    return go;
}
function dropPlat(which) {
    if (which == "L" && platL) { G.UObject.method("Destroy", 1).invoke(platL); platL = null; }
    if (which == "R" && platR) { G.UObject.method("Destroy", 1).invoke(platR); platR = null; }
}
function setColliders(on) {
    var arr = findObjs(physics().class("UnityEngine.MeshCollider"));
    if (!arr) return;
    for (var i = 0; i < arr.length; i++) arr.get(i).method("set_enabled").invoke(on);
}

var handClip = false;
function movementStep(dt) {
    var pl = G.player;
    var spd = p.speed && (!p.gripSpeed || input.grip(1));
    if (spd || p.alwaysMax) {
        pl.field("maxJumpSpeed").value = spd ? p.maxJumpSpeed : G.base.maxJump;
        pl.method("set_jumpMultiplier").invoke(p.alwaysMax ? 99999 : (spd ? p.jumpMult : G.base.jump));
        speedOn = true;
    } else if (speedOn) {
        pl.field("maxJumpSpeed").value = G.base.maxJump;
        pl.method("set_jumpMultiplier").invoke(G.base.jump);
        speedOn = false;
    }
    if (p.noVelLimit) {
        pl.field("velocityLimit").value = G.base.velLimit * 4;
        pl.field("slideVelocityLimit").value = G.base.slideLimit * 4;
        velOn = true;
    } else if (velOn) {
        pl.field("velocityLimit").value = G.base.velLimit;
        pl.field("slideVelocityLimit").value = G.base.slideLimit;
        velOn = false;
    }
    if (p.fly && btnHeld(p.flyBtn)) {
        var fwd = p.handFly ? X(tr(G.rightHand).method("get_forward").invoke()) : X(tr(pl.field("headCollider").value).method("get_forward").invoke());
        if (p.flyStyle === "Teleport") {
            var t0 = tr(pl);
            t0.method("set_position").invoke(add3(pos3(pl), mul3(fwd, dt * p.flySpeed)));
            G.rb.method("set_velocity").invoke([0, 0, 0]);
        } else {
            // Seralyth SlingshotFly / ZeroGravitySlingshotFly: add velocity instead of moving the transform
            if (p.flyStyle === "Zero-G Slingshot") G.rb.method("AddForce", 2).invoke([0, 9.81, 0], 5);
            var cur0 = X(G.rb.method("get_velocity").invoke());
            G.rb.method("set_velocity").invoke(add3(cur0, mul3(fwd, dt * p.flySpeed * (p.flyStyle === "Slingshot" ? 2 : 1))));
        }
    }
    if (p.ironMonke) {
        if (input.grip(1)) {
            var r = X(handState(false).field("controllerTransform").value.method("get_right").invoke());
            G.rb.method("AddForce", 2).invoke(mul3(r, 15), 1);
        }
        if (input.grip(0)) {
            var l = X(handState(true).field("controllerTransform").value.method("get_right").invoke());
            G.rb.method("AddForce", 2).invoke(mul3(l, -15), 1);
        }
    }
    if (p.longArms) { var s = p.longArmSize; tr(pl).method("set_localScale").invoke([s, s, s]); armsOn = true; }
    else if (armsOn) { tr(pl).method("set_localScale").invoke([1, 1, 1]); armsOn = false; }

    if (p.platforms) {
        var pt = p.platTrigger;
        if (pt ? input.trigger(0) > 0.6 : input.grip(0)) { if (!platL) platL = makePlat(true); } else dropPlat("L");
        if (pt ? input.trigger(1) > 0.6 : input.grip(1)) { if (!platR) platR = makePlat(false); } else dropPlat("R");
    } else { dropPlat("L"); dropPlat("R"); }

    if (p.handNoclip) {
        handClip = true;
        // these fields vary by GT build: guard every write so a missing one can't abort the rest of movementStep.
        try { pl.field("leftHandHolding").value = true; pl.field("rightHandHolding").value = true; } catch (e) {}
        // verified in the dump: forcing hand-collision state off lets the hands pass through surfaces.
        try { pl.field("anyHandIsColliding").value = false; pl.field("anyHandWasColliding").value = false; } catch (e) {}
        try { pl.field("anyHandIsSticking").value = false; pl.field("anyHandWasSticking").value = false; } catch (e) {}
    } else if (handClip) {
        handClip = false;
        try { pl.field("leftHandHolding").value = false; pl.field("rightHandHolding").value = false; } catch (e) {}
    }

    if (p.noclip) {
        var tg = btnHeld(p.clipBtn);
        if (tg && !prevClipTrig) { setColliders(false); clipped = true; }
        if (!tg && prevClipTrig) { setColliders(true); clipped = false; }
        prevClipTrig = tg;
    } else if (clipped) { setColliders(true); clipped = false; }

    var up = [0, 1, 0];
    if (p.gravity == "Zero") G.rb.method("AddForce", 2).invoke(mul3(up, 9.81), 5);
    else if (p.gravity == "Low") G.rb.method("AddForce", 2).invoke(mul3(up, 6.66), 5);
    else if (p.gravity == "High") G.rb.method("AddForce", 2).invoke(mul3(up, -7.77), 5);
    else if (p.gravity == "Invert") G.rb.method("AddForce", 2).invoke(mul3(up, 19.62), 5);

    if (p.wallWalk) {
        if (pl.method("IsHandTouching").invoke(true) || pl.method("IsHandTouching").invoke(false)) {
            var ray = pl.field("lastHitInfoHand").value;
            walkPos = ray.method("get_point").invoke(); walkNormal = X(ray.method("get_normal").invoke());
        }
        if (walkPos && walkNormal && input.grip(1)) {
            G.rb.method("AddForce", 2).invoke(mul3(walkNormal, -9.81), 5);
            G.rb.method("AddForce", 2).invoke(mul3(up, 9.81), 5);
        }
    }
    if (p.funnyRun && btnHeld(p.funnyBtn)) {
        frames++;
        var hc = G.tagger.field("headCollider").value;
        var hp = pos3(hc);
        var f2 = X(tr(hc).method("get_forward").invoke());
        var rt = X(tr(hc).method("get_right").invoke());
        var rp = add3(add3(hp, mul3(f2, Math.cos(frames) / 10)), add3([0, -0.5 - Math.sin(frames) / 7, 0], mul3(rt, -0.05)));
        var lp = add3(add3(hp, mul3(f2, Math.cos(frames + 180) / 10)), add3([0, -0.5 - Math.sin(frames + 180) / 7, 0], mul3(rt, 0.05)));
        tr(G.rightHand).method("set_position").invoke(rp);
        tr(G.leftHand).method("set_position").invoke(lp);
    }
    if (p.spamTaps) { G.tagger.field("tapCoolDown").value = 0; tapsOn = true; }
    else if (tapsOn) { G.tagger.field("tapCoolDown").value = G.base.tapCool; tapsOn = false; }

    if (p.sizeOn) {
        if (Math.abs(p.size - lastSize) > 0.001) { pl.method("SetScaleMultiplier").invoke(p.size); lastSize = p.size; }
    } else if (lastSize !== 1) { pl.method("SetScaleMultiplier").invoke(1.0); lastSize = 1; }
}

var lastSnd = 0;
function soundStep(now) {
    if (p.hitSound === "Off" || !input.grip(1) || now - lastSnd < (p.hitNet ? 300 : 89)) return;
    lastSnd = now;
    var idx;
    if (p.hitSound === "Random") {
        var n = G.player.method("get_materialData").invoke().method("get_Count").invoke();
        idx = Math.floor(Math.random() * n);
    } else idx = SOUNDS[p.hitSound];
    if (p.hitNet) sendRPC("RPC_PlayHandTap", [{ i: idx }, { b: false }, { f: p.hitVol }]);
    else G.localRig.method("PlayHandTapLocal").invoke(idx, false, p.hitVol);
}

// ------------------------------------------------------------------------------------------
// rig
// ------------------------------------------------------------------------------------------
var prevGhost = false, headAng = 0, rigOff = false, rigModeOn = false, prevRigTrig = false, rigDelay = 0;
function headOffset() { return G.localRig.field("head").value.field("trackingRotationOffset").value; }
function setHead(x, y, z) { var o = headOffset(); if (x !== null) o.field("x").value = x; if (y !== null) o.field("y").value = y; if (z !== null) o.field("z").value = z; }

function rigStep() {
    var b = input.secondary(1);
    if (p.ghost && b && !prevGhost) G.localRig.method("set_enabled").invoke(!G.localRig.method("get_enabled").invoke());
    if (p.invisible) {
        if (b && !prevGhost) G.localRig.method("set_enabled").invoke(!G.localRig.method("get_enabled").invoke());
        if (!G.localRig.method("get_enabled").invoke()) tr(G.localRig).method("set_position").invoke([0, -99999, 0]);
    }
    prevGhost = b;
    if (p.grabRig) {
        var gh = input.grip(1) ? G.rightHand : (input.grip(0) ? G.leftHand : null);
        if (gh) {
            G.localRig.method("set_enabled").invoke(false);
            tr(G.localRig).method("set_position").invoke(pos(gh));
            tr(G.localRig).method("set_rotation").invoke(tr(gh).method("get_rotation").invoke());
        } else G.localRig.method("set_enabled").invoke(true);
    }
    if (p.spaz) setHead(Math.random() * 360, Math.random() * 360, Math.random() * 360);
    switch (p.head) {
        case "Spin X": headAng += 15; setHead(headAng, null, null); break;
        case "Spin Y": headAng += 15; setHead(null, headAng, null); break;
        case "Spin Z": headAng += 15; setHead(null, null, headAng); break;
        case "Upside Down": setHead(null, null, 180); break;
        case "Broken Neck": setHead(null, null, 90); break;
        case "Backwards": setHead(null, 180, null); break;
        case "Sideways": setHead(null, 90, null); break;
        case "Head Bang": {
            var nowB = Date.now();
            if (nowB > (port.bangAt || 0)) { setHead(50, null, null); port.bangAt = nowB + 60000 / Math.max(1, p.bangBpm); }
            else setHead(headOffset().field("x").value * 0.9, null, null);
            break;
        }
    }
}
function rigModeStep(now, dt) {
    var m = p.rigMode;
    if (m === "Normal") {
        if (rigModeOn) { G.localRig.method("set_enabled").invoke(true); rigModeOn = false; rigOff = false; }
        return;
    }
    rigModeOn = true;
    var tg = btnHeld(p.rigBtn);
    if (tg && !prevRigTrig && now - rigDelay > 300) { rigDelay = now; rigOff = !rigOff; }
    prevRigTrig = tg;
    G.localRig.method("set_enabled").invoke(!rigOff);
    var rt = tr(G.localRig);
    var bc = tr(G.tagger.field("bodyCollider").value);
    if (m === "Freeze") {
        rt.method("set_position").invoke(add3(X(bc.method("get_position").invoke()), [0, 0.1, 0]));
        rt.method("set_rotation").invoke(bc.method("get_rotation").invoke());
    } else if (m === "Upside Down" && rigOff) {
        rt.method("set_position").invoke(bc.method("get_position").invoke());
        rt.method("set_rotation").invoke(qmul(bc.method("get_rotation").invoke(), euler(180, 180, 0)));
    } else if (RIG_POSES[m]) {
        if (rigOff) rigPose(m, now, dt);
        else { port.ghost = null; port.stillPos = null; }
    } else if (m === "T-Pose" && rigOff) {
        var rp = X(rt.method("get_position").invoke());
        var right = X(rt.method("get_right").invoke());
        var base = rt.method("get_rotation").invoke();
        var lh = G.localRig.field("leftHand").value.field("rigTarget").value;
        var rh = G.localRig.field("rightHand").value.field("rigTarget").value;
        var hd = G.localRig.field("head").value.field("rigTarget").value;
        lh.method("set_position").invoke(add3(rp, mul3(right, -1)));
        rh.method("set_position").invoke(add3(rp, right));
        hd.method("set_rotation").invoke(base);
        lh.method("set_rotation").invoke(qmul(qmul(base, euler(0, -1, 0)), euler(0, 0, 80)));
        rh.method("set_rotation").invoke(qmul(qmul(base, euler(0, 1, 0)), euler(0, 0, -80)));
    }
}

// ------------------------------------------------------------------------------------------
// player body + board
// ------------------------------------------------------------------------------------------
var lastBody = "Default", matAt = 0, rgbAt = 0, matWasOn = false, lastBoardSpeed = "Normal", strobeAt = 0, strobeI = 0;
var BODY = { "Default": 0, "No Head": 1, "Skeleton": 2, "Invisible": -1 };
var BOARD = { "Normal": [0.1, 1, 10, 0.2], "Fast": [5, 0, 999, 1], "Slow": [0.025, 3, 3.5, 0.1] };
function bodyRenderer() { return getComp(G.localRig.method("get_gameObject").invoke(), cs().class("GorillaBodyRenderer")); }

function playerStep(now) {
    if (p.body !== lastBody) {
        var gbr = bodyRenderer();
        gbr.method("SetCosmeticBodyType").invoke(BODY[p.body]);
        if (p.body === "Default") gbr.method("SetMaterialIndex").invoke(0);
        lastBody = p.body;
    }
    if (p.matRandom) {
        matWasOn = true;
        if (now - matAt > 89) {
            matAt = now;
            var n = G.localRig.field("materialsToChangeTo").value.length;
            bodyRenderer().method("SetMaterialIndex").invoke(Math.floor(Math.random() * n));
        }
    } else if (matWasOn) { bodyRenderer().method("SetMaterialIndex").invoke(0); matWasOn = false; }
    if (p.rgbBody && now - rgbAt > 100) {
        rgbAt = now;
        var c = hsv((now / 6000) % 1);
        G.tagger.method("UpdateColor").invoke(c[0], c[1], c[2]);
        G.localRig.method("InitializeNoobMaterialLocal").invoke(c[0], c[1], c[2]);
    }
}
function boardStep(now) {
    if (p.boardSpeed !== lastBoardSpeed) {
        var v = BOARD[p.boardSpeed];
        G.player.field("hoverboardPaddleBoostMultiplier").value = v[0];
        G.player.field("hoverboardBoostGracePeriod").value = v[1];
        G.player.field("hoverboardPaddleBoostMax").value = v[2];
        G.player.field("hoverTiltAdjustsForwardFactor").value = v[3];
        lastBoardSpeed = p.boardSpeed;
    }
    if (p.boardColor === "Normal") return;
    var hv = G.localRig.field("hoverboardVisual").value;
    if (!hv || hv.isNull() || !hv.method("get_IsHeld").invoke()) return;
    var col;
    if (p.boardColor === "RGB") { var c = hsv((now / 3000) % 1); col = [c[0], c[1], c[2], 1]; }
    else {
        if (now - strobeAt > 100) { strobeAt = now; strobeI = (strobeI + 1) % 3; }
        col = [[1, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1, 1]][strobeI];
    }
    hv.method("SetIsHeld").invoke(hv.method("get_IsLeftHanded").invoke(), hv.method("get_NominalLocalPosition").invoke(), hv.method("get_NominalLocalRotation").invoke(), col, 0);
}

// ------------------------------------------------------------------------------------------
// esp
// ------------------------------------------------------------------------------------------
var espMats = null, espBoxPool = [], espLinePool = [], chamsOrig = {}, guiShader = null;
function setMatInt(m, Mat, name, val) {
    pickM(m, Mat, "SetInt", 2, function (ps) { return ps[0].type.name === "System.String"; }).invoke(Il2Cpp.string(name), val);
}
function overlayMat(c) {
    var Mat = core().class("UnityEngine.Material"), Sh = core().class("UnityEngine.Shader");
    // Classic = the original look (Hidden/Internal-Colored). Text Shader = GUI/Text Shader, flatter but always see-through.
    var names = p.espRenderer === "Text Shader"
        ? ["GUI/Text Shader", "Hidden/Internal-Colored", "Particles/Standard Unlit", "Sprites/Default"]
        : ["Hidden/Internal-Colored", "Particles/Standard Unlit", "Universal Render Pipeline/Unlit", "Sprites/Default", "GUI/Text Shader"];
    for (var i = 0; i < names.length; i++) {
        try {
            var sh = Sh.method("Find").invoke(Il2Cpp.string(names[i]));
            if (!sh || sh.isNull()) continue;
            var m = Mat.alloc();
            pickM(m, Mat, ".ctor", 1, function (ps) { return ps[0].type.name === "UnityEngine.Shader"; }).invoke(sh);
            if (names[i] !== "GUI/Text Shader") {
                var hasZ = !!pickM(m, Mat, "HasProperty", 1, function (ps) { return ps[0].type.name === "System.String"; }).invoke(Il2Cpp.string("_ZTest"));
                if (!hasZ) continue;
                var kv = [["_ZTest", 8], ["_ZWrite", 0], ["_Cull", 0], ["_SrcBlend", 5], ["_DstBlend", 10]];
                for (var k = 0; k < kv.length; k++) { try { setMatInt(m, Mat, kv[k][0], kv[k][1]); } catch (e) {} }
            }
            m.method("set_color").invoke(c);
            try { m.method("set_renderQueue").invoke(4000); } catch (e) {}
            return m;
        } catch (e) {}
    }
    return null;
}
var espMatKey = "", espMatAt = 0;
function palCol(name, a) { var c = ESP_PAL[name] || ESP_PAL.Cyan; return [c[0], c[1], c[2], a]; }
function espInit() {
    var key = p.espColor + "|" + p.espInfColor + "|" + p.espAlpha + "|" + p.espRenderer;
    if (espMats && key === espMatKey) return;
    var now = Date.now();
    if (espMats && now - espMatAt < 400) return;
    espMatAt = now; espMatKey = key;
    espMats = {
        boxNormal: overlayMat(palCol(p.espColor, p.espAlpha)),
        boxInfected: overlayMat(palCol(p.espInfColor, p.espAlpha)),
        lineNormal: overlayMat(palCol(p.espColor, 0.85)),
        lineInfected: overlayMat(palCol(p.espInfColor, 0.85)),
        softNormal: overlayMat(palCol(p.espColor, 0.6)),
        softInfected: overlayMat(palCol(p.espInfColor, 0.6)),
    };
    if (!espMats.boxNormal) log("esp: no through-wall shader found, esp will be depth tested");
}
function mkEspObj(mat, kind) {
    var go = G.GameObject.method("CreatePrimitive").invoke(kind === undefined ? 3 : kind);
    try { if (G.Collider) { var col = getComp(go, G.Collider); if (col) G.UObject.method("Destroy", 1).invoke(col); } } catch (e) {}
    if (mat) { try { getComp(go, G.Renderer).method("set_sharedMaterial").invoke(mat); } catch (e) {} }
    return { go: go, mat: mat };
}
function setActive(o, on) { o.go.method("SetActive", 1).invoke(on); }
function setLine(l, from, to) {
    var d = sub3(to, from), len = len3(d);
    var lt = tr(l.go);
    lt.method("set_position").invoke(add3(from, mul3(d, 0.5)));
    if (len > 0.01) lt.method("set_rotation").invoke(G.Quaternion.method("LookRotation", 1).invoke(d));
    lt.method("set_localScale").invoke([0.012, 0.012, len]);
}
var SHAPES = { "Cuboid": [3, [0.5, 0.9, 0.5]], "Cube": [3, [0.45, 0.45, 0.45]], "Sphere": [0, [0.5, 0.5, 0.5]], "Capsule": [1, [0.5, 0.45, 0.5]] };
var lastShape = "Cuboid";
function espClearBoxes() {
    for (var i = 0; i < espBoxPool.length; i++) { try { if (espBoxPool[i]) G.UObject.method("Destroy", 1).invoke(espBoxPool[i].go); } catch (e) {} }
    espBoxPool = [];
}
var espHeadPool = [], espSkelPool = [];
function espMatFor(o, mat) {
    if (mat && o.mat !== mat) { try { getComp(o.go, G.Renderer).method("set_sharedMaterial").invoke(mat); o.mat = mat; } catch (e) {} }
}
function rigPart(r, name) { return pos3(r.field(name).value.field("rigTarget").value); }
function espStep() {
    espInit();
    if (p.espShape !== lastShape) { espClearBoxes(); lastShape = p.espShape; }
    var any = p.espBoxes || p.espLines || p.espHeads || p.espSkeleton;
    var rigs = any ? otherRigs() : [];
    var ctx = rigs.length ? espCtx() : null;
    var from = pos3(G.rightHand);
    var nearest = -1;
    if (p.espLines && p.espNearest && rigs.length) {
        var head = pos3(G.tagger.field("headCollider").value), bd = Infinity;
        for (var j = 0; j < rigs.length && j < 12; j++) { var dd = len3(sub3(rigPos(rigs[j]), head)); if (dd < bd) { bd = dd; nearest = j; } }
    }
    var sh = SHAPES[p.espShape] || SHAPES.Cuboid;
    for (var i = 0; i < 12; i++) {
        var r = rigs[i];
        var es = r ? espShow(r, ctx) : { show: false, inf: false };
        var inf = es.inf, show = es.show;
        var bpos = show ? rigPos(r) : null;

        if (p.espBoxes && show) {
            var mat = inf ? espMats.boxInfected : espMats.boxNormal;
            if (!espBoxPool[i]) espBoxPool[i] = mkEspObj(mat, sh[0]);
            var b = espBoxPool[i];
            if (mat) espMatFor(b, mat);
            else { try { getComp(b.go, G.Renderer).method("get_material").invoke().method("set_color").invoke(palCol(inf ? p.espInfColor : p.espColor, 1)); } catch (e) {} }
            var bt = tr(b.go);
            bt.method("set_position").invoke(bpos);
            bt.method("set_localScale").invoke(sh[1]);
            setActive(b, true);
        } else if (espBoxPool[i]) setActive(espBoxPool[i], false);

        if (p.espLines && show && (!p.espNearest || i === nearest)) {
            var lmat = inf ? espMats.lineInfected : espMats.lineNormal;
            if (!espLinePool[i]) espLinePool[i] = mkEspObj(lmat);
            var l = espLinePool[i];
            espMatFor(l, lmat);
            setLine(l, from, bpos);
            setActive(l, true);
        } else if (espLinePool[i]) setActive(espLinePool[i], false);

        var smat = inf ? espMats.softInfected : espMats.softNormal;
        if (p.espHeads && show) {
            if (!espHeadPool[i]) espHeadPool[i] = mkEspObj(smat, 0);
            var h = espHeadPool[i];
            espMatFor(h, smat);
            var ht = tr(h.go);
            ht.method("set_position").invoke(rigPart(r, "head"));
            ht.method("set_localScale").invoke([0.2, 0.2, 0.2]);
            setActive(h, true);
        } else if (espHeadPool[i]) setActive(espHeadPool[i], false);

        for (var s2 = 0; s2 < 3; s2++) {
            var si = i * 3 + s2;
            if (p.espSkeleton && show) {
                if (!espSkelPool[si]) espSkelPool[si] = mkEspObj(smat);
                var sk = espSkelPool[si];
                espMatFor(sk, smat);
                var a = s2 === 0 ? rigPart(r, "head") : bpos;
                var z = s2 === 0 ? bpos : rigPart(r, s2 === 1 ? "leftHand" : "rightHand");
                setLine(sk, a, z);
                setActive(sk, true);
            } else if (espSkelPool[si]) setActive(espSkelPool[si], false);
        }
    }
}
function espClear() {
    var pools = [espBoxPool, espLinePool, espHeadPool, espSkelPool];
    for (var a = 0; a < pools.length; a++) {
        for (var i = 0; i < pools[a].length; i++) { try { if (pools[a][i]) G.UObject.method("Destroy", 1).invoke(pools[a][i].go); } catch (e) {} }
    }
    espBoxPool = []; espLinePool = []; espHeadPool = []; espSkelPool = [];
}
function chamsRestore() {
    for (var k in chamsOrig) { try { chamsOrig[k].mat.method("set_shader").invoke(chamsOrig[k].shader); } catch (e) {} }
    chamsOrig = {};
}
function chamsStep() {
    if (!p.chams) { chamsRestore(); return; }
    if (!guiShader) guiShader = core().class("UnityEngine.Shader").method("Find").invoke(Il2Cpp.string("GUI/Text Shader"));
    var rigs = otherRigs();
    var mgr = rigs.length ? tagManager() : null;
    for (var i = 0; i < rigs.length; i++) {
        var r = rigs[i], key = r.handle.toString();
        var mat = r.field("mainSkin").value.method("get_material").invoke();
        if (!chamsOrig[key]) chamsOrig[key] = { mat: mat, shader: mat.method("get_shader").invoke() };
        mat.method("set_shader").invoke(guiShader);
        var col = palCol(p.espColor, 0.9);
        if (mgr) col = palCol(isInfected(mgr, r.field("OwningNetPlayer").value) ? p.espInfColor : p.espColor, 0.9);
        mat.method("set_color").invoke(col);
    }
}

// ------------------------------------------------------------------------------------------
// tag
// ------------------------------------------------------------------------------------------
var gunLine = null, gunDot = null, gunMats = null, lastGunTag = 0, lastGunWarn = 0, gunRigMoved = false;
var auraAt = 0, auraHit = {}, selfMoved = false, reachOn = false, coolOn = false;

function gunHide() { if (gunLine) setActive(gunLine, false); if (gunDot) setActive(gunDot, false); }
function gunRigBack() { if (gunRigMoved) { G.localRig.method("set_enabled").invoke(true); gunRigMoved = false; } }
function gunStep(now) {
    if (!p.tagGun || !input.grip(1)) { gunHide(); gunRigBack(); return; }
    if (!gunMats) gunMats = { idle: overlayMat([1, 1, 1, 1]), hit: overlayMat([1, 0.2, 0.2, 1]) };
    if (!gunLine) gunLine = mkEspObj(gunMats.idle);
    if (!gunDot) gunDot = mkEspObj(gunMats.hit, 0);

    var from = pos3(G.rightHand);
    var fwd = X(tr(G.rightHand).method("get_forward").invoke());
    var best = null, bestPos = null, bestDot = Math.cos(p.gunAngle * Math.PI / 180);
    var rigs = otherRigs();
    for (var i = 0; i < rigs.length; i++) {
        var bp = rigPos(rigs[i]);
        var d = sub3(bp, from), len = len3(d);
        if (len < 0.2) continue;
        var dt = dot3(fwd, mul3(d, 1 / len));
        if (dt > bestDot) { bestDot = dt; best = rigs[i]; bestPos = bp; }
    }
    var to = bestPos ? bestPos : add3(from, mul3(fwd, 30));
    setLine(gunLine, from, to);
    var want = best ? gunMats.hit : gunMats.idle;
    if (want && gunLine.mat !== want) { try { getComp(gunLine.go, G.Renderer).method("set_sharedMaterial").invoke(want); gunLine.mat = want; } catch (e) {} }
    setActive(gunLine, true);
    if (best) {
        tr(gunDot.go).method("set_position").invoke(bestPos);
        tr(gunDot.go).method("set_localScale").invoke([0.22, 0.22, 0.22]);
        setActive(gunDot, true);
    } else setActive(gunDot, false);

    if (best && input.trigger(1) > 0.6) {
        var net = best.field("OwningNetPlayer").value;
        if (!net || net.isNull()) return;
        var mgr = tagManager();
        if (mgr && !isInfected(mgr, localNet())) {
            if (now - lastGunWarn > 2500) { lastGunWarn = now; notify("You're not infected, you can't tag"); }
            gunRigBack();
            return;
        }
        if (mgr && isInfected(mgr, net)) { gunRigBack(); return; }
        // the game checks that you are next to the target, so the rig rides over to them while firing
        G.localRig.method("set_enabled").invoke(false);
        tr(G.localRig).method("set_position").invoke(bestPos);
        gunRigMoved = true;
        if (now - lastGunTag > 150) { lastGunTag = now; reportTag(net, 4); }
    } else gunRigBack();
}
function gunClear() {
    try { if (gunLine) G.UObject.method("Destroy", 1).invoke(gunLine.go); } catch (e) {}
    try { if (gunDot) G.UObject.method("Destroy", 1).invoke(gunDot.go); } catch (e) {}
    gunLine = null; gunDot = null;
    try { gunRigBack(); } catch (e) {}
}

function tagStep(now) {
    if (p.tagReach) { G.tagger.field("maxTagDistance").value = p.tagReachDist; reachOn = true; }
    else if (reachOn) { G.tagger.field("maxTagDistance").value = G.base.tagDist; reachOn = false; }
    if (p.noCooldown) { G.tagger.field("tagCooldown").value = 0; coolOn = true; }
    else if (coolOn) { G.tagger.field("tagCooldown").value = G.base.tagCool; coolOn = false; }

    if (p.tagAura && now - auraAt > 250) {
        auraAt = now;
        var mgr = tagManager();
        if (!mgr) return;
        if (!isInfected(mgr, localNet())) return;
        var mine = rigPos(G.localRig);
        var rigs = otherRigs();
        for (var i = 0; i < rigs.length; i++) {
            var net = rigs[i].field("OwningNetPlayer").value;
            if (!net || net.isNull() || isInfected(mgr, net)) continue;
            if (len3(sub3(rigPos(rigs[i]), mine)) > p.auraRange) continue;
            if (p.auraInView && dot3(norm3(sub3(rigPos(rigs[i]), pos3(G.tagger.field("headCollider").value))), X(tr(G.tagger.field("headCollider").value).method("get_forward").invoke())) < 0.2) continue;
            var key = String(net.method("get_ActorNumber").invoke());
            if (auraHit[key] && now - auraHit[key] < 1200) continue;
            auraHit[key] = now;
            reportTag(net, 4);
        }
    }
}
function tagSelfStep() {
    if (!p.tagSelf) { if (selfMoved) { G.localRig.method("set_enabled").invoke(true); selfMoved = false; } return; }
    var mgr = tagManager();
    if (!mgr) return;
    var me = localNet();
    if (btnHeld(p.selfBtn) && !isInfected(mgr, me)) {
        var rigs = otherRigs();
        for (var i = 0; i < rigs.length; i++) {
            var net = rigs[i].field("OwningNetPlayer").value;
            if (!net || net.isNull() || !isInfected(mgr, net)) continue;
            G.localRig.method("set_enabled").invoke(false);
            tr(G.localRig).method("set_position").invoke(rigPos(rigs[i]));
            selfMoved = true;
            reportTag(me, 4);
            break;
        }
    } else if (selfMoved) { G.localRig.method("set_enabled").invoke(true); selfMoved = false; }
}

// ------------------------------------------------------------------------------------------
// projectiles (client side, pooled prefabs)
// ------------------------------------------------------------------------------------------
var projCache = {}, lastProj = 0;
function fireProj(def) {
    var pf = poolPrefab(def.n);
    if (!pf) throw new Error("pool prefab not found: " + def.n + " (not in the scene or the object pools)");
    var OP = cs().class("ObjectPools");
    var inst = pickM(OP.field("instance").value, OP, "Instantiate", 2, function (ps) { return ps[0].type.name === "UnityEngine.GameObject"; });
    var go = inst.invoke(pf, true);
    if (!go || go.isNull()) throw new Error("pool returned nothing");
    var sc = Math.abs(X(tr(go).method("get_lossyScale").invoke())[0]);
    tr(go).method("set_localScale").invoke([sc, sc, sc]);
    var hand = G.localRig.field("rightHandTransform").value;
    var at = pos(hand);
    var rot = tr(hand).method("get_rotation").invoke();
    var vel = mul3(X(tr(hand).method("get_up").invoke()), p.projSpeed);
    var comp;
    if (def.k === "sling") {
        comp = getComp(go, cs().class("SlingshotProjectile"));
        comp.method("Launch").invoke(at, vel, localNet(), false, false, -1, 1.0, true, def.c);
    } else if (def.k === "plane") {
        comp = getComp(go, cs().class("PaperPlaneProjectile"));
        comp.method("Launch").invoke(at, rot, vel);
    } else if (def.k === "crack") {
        comp = getComp(go, cs().class("GorillaTag.Shared.Scripts.FirecrackerProjectile"));
        comp.method("Launch").invoke(at, rot, vel, 0.0, G.localRig, 0);
        G.UObject.method("Destroy", 2).invoke(go, 3.0);
    } else {
        comp = getComp(go, cs().class("StickyProjectile"));
        comp.method("Launch").invoke(at, rot, vel, 0.0, G.localRig, 0);
    }
    if (!comp) throw new Error("spawned object has no " + def.k + " component");
}
function projStep(now) {
    if (p.projType === "Off" || !input.grip(1) || now - lastProj < p.projRate * 1000) return;
    lastProj = now;
    fireProj(PROJ[p.projType]);
}

// ------------------------------------------------------------------------------------------
// world + misc
// ------------------------------------------------------------------------------------------
var lastWater = "Normal", lastRain = false, afkOn = false;
function setWaterLayer(layerName) {
    var root = gfind("Beach/B_WaterVolumes");
    if (!root || root.isNull()) return false;
    var t = tr(root);
    var layer = core().class("UnityEngine.LayerMask").method("NameToLayer").invoke(Il2Cpp.string(layerName));
    var n = t.method("get_childCount").invoke();
    for (var i = 0; i < n; i++) t.method("GetChild").invoke(i).method("get_gameObject").invoke().method("set_layer").invoke(layer);
    return true;
}
function worldStep() {
    if (p.water !== lastWater) {
        var layer = p.water === "Walk On Water" ? "Default" : (p.water === "No Water" ? "TransparentFX" : "Water");
        if (setWaterLayer(layer)) lastWater = p.water;
        else if (!seenErr.water) { seenErr.water = "beach water not found, go to the beach"; notify("Go to the beach first"); lastWater = p.water; }
    }
    if (p.rain !== lastRain) {
        var mgr = cs().class("BetterDayNightManager").field("instance").value;
        var arr = mgr.field("weatherCycle").value;
        for (var i = 0; i < arr.length; i++) {
            try { arr.elements.add(i * arr.elementSize).writeS32(p.rain ? 1 : 0); }
            catch (e) { arr.set(i, p.rain ? 1 : 0); }
        }
        lastRain = p.rain;
    }
}
function miscStep() {
    if (p.noFingers) {
        var cp = cs().class("ControllerInputPoller").field("instance").value;
        var fl = ["leftControllerGripFloat", "rightControllerGripFloat", "leftControllerIndexFloat", "rightControllerIndexFloat"];
        var bl = ["leftControllerPrimaryButton", "leftControllerSecondaryButton", "rightControllerPrimaryButton", "rightControllerSecondaryButton",
            "leftControllerPrimaryButtonTouch", "leftControllerSecondaryButtonTouch", "rightControllerPrimaryButtonTouch", "rightControllerSecondaryButtonTouch"];
        fl.forEach(function (n) { try { cp.field(n).value = 0; } catch (e) {} });
        bl.forEach(function (n) { try { cp.field(n).value = false; } catch (e) {} });
    }
    if (p.antiAfk !== afkOn) {
        var pc = null;
        var names = ["GorillaNetworking.PhotonNetworkController", "PhotonNetworkController"];
        for (var i = 0; i < names.length && !pc; i++) { try { pc = staticInstance(cs().class(names[i])); } catch (e) {} }
        if (!pc) throw new Error("PhotonNetworkController instance not found");
        pc.field("disableAFKKick").value = p.antiAfk;
        afkOn = p.antiAfk;
    }
}

// ------------------------------------------------------------------------------------------
// v3.1 additions: buttons, name tags, networked calls, throwables, extra movement, aim guns
// ------------------------------------------------------------------------------------------
// which physical button a mod listens to (side 0 = left, 1 = right)
// ---------------------------------------------------------------------------
// Gorilla Computer: custom start screen, black screen, and two extra pages.
// Pages live in the Credits slot (MODS) and the Support slot (STATS) of the computer's
// up/down list. Key presses are read with a passive Interceptor.attach on PressButton,
// so the game's own handling is never replaced.
// ---------------------------------------------------------------------------
var ST_CREDITS = 10, ST_SUPPORT = 15, ST_STARTUP = 0;
var KEY_OPT = { 14: 1, 15: 2, 16: 3, 43: 4 };
var COMP_TOGGLES = [
    ["fly", "Fly"], ["noclip", "No Clip"], ["espBoxes", "Box ESP"], ["espLines", "Tracers"],
    ["nameTags", "Name Tags"], ["tagAura", "Tag Aura"], ["platforms", "Platforms"], ["longArms", "Long Arms"], ["invisible", "Invisible"],
];
var comp = { tickHook: null, inst: null, lastState: -1, logState: -2, applied: 0, hook: null, keys: [], cache: "", cacheKey: "", cacheAt: 0, matAt: 0, mats: null, matSaved: null, black: false, fps: 60, err: "" };

function cstr(v) { try { if (v === null || v === undefined) return ""; if (v.isNull && v.isNull()) return ""; return v.content !== undefined ? String(v.content) : String(v); } catch (e) { return ""; } }
function compInst() { var i = cs().class("GorillaNetworking.GorillaComputer").field("instance").value; return (i && !i.isNull()) ? i : null; }
var COMP_STATE_NAMES = ["Startup", "Color", "Name", "Turn", "Mic", "Room", "Queue", "Group", "Voice", "AutoMute", "Credits", "Visuals", "Time", "NameWarning", "Loading", "Support", "Troop", "KID", "Redemption", "Language", "Snake"];
// the bridge hands enums back as objects, so Number() on them is NaN; dig the int out instead
function enumNum(v) {
    if (typeof v === "number") return v;
    try { var f = v.field("value__").value; if (typeof f === "number") return f; } catch (e) {}
    var t = String(v), n = parseInt(t, 10);
    if (!isNaN(n)) return n;
    var i = COMP_STATE_NAMES.indexOf(t.replace(/^.*\./, "").trim());
    return i;
}
function compState(inst) { return enumNum(inst.method("get_currentState").invoke()); }
function compColor() { return COMP_COLORS[p.compColor] || "#ffffff"; }

function compHookOn(inst) {
    if (comp.hook) return;
    var addr = inst.class.method("PressButton").virtualAddress;
    comp.hook = Interceptor.attach(addr, {
        onEnter: function (args) {
            try { comp.keys.push({ k: args[1].toInt32(), s: comp.lastState }); if (comp.keys.length > 20) comp.keys.shift(); } catch (e) {}
        },
    });
}
function compTickHookOn() {
    if (comp.tickHook) return;
    var addr = cs().class("GorillaNetworking.GorillaTextManager").method("PostTick").virtualAddress;
    comp.tickHook = Interceptor.attach(addr, { onEnter: function () { try { compApply(); } catch (e) { comp.err = String(e); } } });
}
function compHookOff() {
    if (comp.hook) { try { comp.hook.detach(); } catch (e) {} comp.hook = null; }
    if (comp.tickHook) { try { comp.tickHook.detach(); } catch (e) {} comp.tickHook = null; }
    comp.keys = []; comp.inst = null;
}
// also runs inside GorillaTextManager.PostTick, after the game has written its own text for that tick
function compApply() {
    var inst = comp.inst;
    if (!inst || !p.compOn) return;
    if (comp.cache) {
        var gt = inst.field("screenText").value;
        if (cstr(gt.field("currentText").value) !== comp.cache) { gt.method("Set").invoke(Il2Cpp.string(comp.cache)); comp.applied++; }
    }
    var fs = inst.field("functionSelectText").value;
    var ft = cstr(fs.field("currentText").value);
    if (ft) {
        var nt = ft.replace(/CREDITS/gi, "MODS").replace(/SUPPORT/gi, "STATS");
        if (nt !== ft) fs.method("Set").invoke(Il2Cpp.string(nt));
    }
}

function netInfo() {
    var o = { room: "not in a room", n: 0, master: false };
    try {
        var ns = cs().class("NetworkSystem").field("Instance").value;
        if (ns.method("get_InRoom").invoke()) {
            o.room = cstr(ns.method("get_RoomName").invoke());
            o.n = Number(ns.method("get_RoomPlayerCount").invoke());
            o.master = !!ns.method("get_IsMasterClient").invoke();
        }
    } catch (e) {}
    return o;
}

function compPage(st) {
    var c = compColor(), hd = "<color=" + c + ">", e = "</color>", L = [];
    var ni = netInfo();
    if (st === ST_STARTUP) {
        L.push(hd + p.compTitle + e);
        L.push("");
        L.push("room: " + ni.room);
        L.push("players: " + ni.n + (ni.master ? "   (master)" : ""));
        L.push("");
        L.push(hd + p.compMsg + e);
        L.push("");
        L.push("press any key to begin");
        return L.join("\n");
    }
    if (st === ST_CREDITS) {
        L.push(hd + "MODS" + e + "  (press the number)");
        L.push("");
        for (var i = 0; i < COMP_TOGGLES.length; i++) {
            var t = COMP_TOGGLES[i];
            L.push((i + 1) + " " + t[1] + ": " + (p[t[0]] ? hd + "ON" + e : "off"));
        }
        L.push("");
        L.push("0 cycles the screen color");
        return L.join("\n");
    }
    if (st === ST_SUPPORT) {
        var bp = [0, 0, 0];
        try { bp = bodyPos(); } catch (er) {}
        var rigs = -1;
        try { rigs = otherRigs().length; } catch (er) {}
        L.push(hd + "STATS" + e);
        L.push("");
        L.push("fps: " + Math.round(comp.fps));
        L.push("room: " + ni.room);
        L.push("players: " + ni.n + "   others seen: " + rigs);
        L.push("pos: " + bp[0].toFixed(1) + " " + bp[1].toFixed(1) + " " + bp[2].toFixed(1));
        var on = 0; for (var k = 0; k < COMP_TOGGLES.length; k++) if (p[COMP_TOGGLES[k][0]]) on++;
        L.push("mods on: " + on);
        return L.join("\n");
    }
    return null;
}

function compKeys(inst) {
    var q = comp.keys; comp.keys = [];
    for (var i = 0; i < q.length; i++) {
        var st = q[i].s, k = q[i].k;
        if (st === ST_CREDITS) {
            if (k >= 1 && k <= COMP_TOGGLES.length) { var key = COMP_TOGGLES[k - 1][0]; p[key] = !p[key]; comp.cacheKey = ""; }
            else if (k === 0) { p.compColor = COMP_COLOR_NAMES[(COMP_COLOR_NAMES.indexOf(p.compColor) + 1) % COMP_COLOR_NAMES.length]; comp.cacheKey = ""; }
        }
    }
}

function compMaterials(inst, on) {
    var rend = inst.field("computerScreenRenderer").value;
    if (!rend || rend.isNull()) return;
    var arr = rend.method("get_sharedMaterials").invoke();
    var n = arr.length;
    if (on) {
        if (!comp.matSaved) {
            comp.matSaved = [];
            for (var i = 0; i < n; i++) {
                var m = arr.get(i), c = m.method("get_color").invoke();
                comp.matSaved.push({ r: c.field("r").value, g: c.field("g").value, b: c.field("b").value, a: c.field("a").value });
            }
        }
        for (var j = 0; j < n; j++) {
            var mm = arr.get(j);
            mm.method("set_color").invoke([0, 0, 0, 1]);
            try { mm.method("SetColor", 2).invoke(Il2Cpp.string("_BaseColor"), [0, 0, 0, 1]); } catch (e) {}
        }
        comp.black = true;
    } else if (comp.black && comp.matSaved) {
        for (var k = 0; k < n && k < comp.matSaved.length; k++) {
            var s = comp.matSaved[k];
            arr.get(k).method("set_color").invoke([s.r, s.g, s.b, s.a]);
        }
        comp.black = false; comp.matSaved = null;
    }
}

function compRestore() {
    compHookOff();
    try { var inst = compInst(); if (inst && comp.black) compMaterials(inst, false); } catch (e) {}
    comp.cache = ""; comp.cacheKey = "";
}

function computerStep(dt, now) {
    if (dt > 0) comp.fps = comp.fps * 0.9 + (1 / dt) * 0.1;
    if (!p.compOn) { if (comp.hook || comp.tickHook || comp.black) compRestore(); return; }
    var inst = compInst();
    if (!inst) return;
    compHookOn(inst);
    compKeys(inst);

    if (p.compBlack && now - comp.matAt > 500) { comp.matAt = now; compMaterials(inst, true); }
    else if (!p.compBlack && comp.black) compMaterials(inst, false);

    var st = compState(inst);
    comp.lastState = st; comp.inst = inst;
    if (String(st) !== String(comp.logState)) { comp.logState = st; log("computer: page " + st + " (" + (COMP_STATE_NAMES[st] || "?") + ")"); }
    try { compTickHookOn(); } catch (e) { if (!comp.err) { comp.err = "tick hook: " + e; log("computer: " + comp.err); } }
    var key = st + "|" + p.compColor + "|" + p.compTitle + "|" + p.compMsg;
    if (key !== comp.cacheKey || now - comp.cacheAt > 250) {
        comp.cache = compPage(st); comp.cacheKey = key; comp.cacheAt = now;
    }
    compApply();
}

// ---------------------------------------------------------------------------
// join / leave notifications
// ---------------------------------------------------------------------------
var joinSt = { at: 0, room: null, seen: {} };
function netPlayerInfo(np) {
    var o = { id: -1, name: "?", plat: "", master: false, uid: "" };
    o.id = Number(np.method("get_ActorNumber").invoke());
    try { o.name = cstr(np.method("get_SanitizedNickName").invoke()) || cstr(np.method("get_NickName").invoke()) || "?"; } catch (e) { try { o.name = cstr(np.method("get_NickName").invoke()); } catch (e2) {} }
    try { o.plat = cstr(np.method("get_Platform").invoke()); } catch (e) {}
    try { o.master = !!np.method("get_IsMasterClient").invoke(); } catch (e) {}
    try { o.uid = cstr(np.method("get_UserId").invoke()); } catch (e) {}
    return o;
}
function joinDesc(o, count) {
    var bits = [];
    if (o.plat) bits.push(o.plat.toLowerCase());
    if (o.master) bits.push("master");
    if (p.joinIds && o.uid) bits.push("id " + o.uid.slice(0, 10));
    bits.push(count + " in room");
    return bits.join(" | ");
}
function joinStep(now) {
    if (!p.joinNotes) { joinSt.room = null; joinSt.seen = {}; return; }
    if (now - joinSt.at < 1000) return;
    joinSt.at = now;
    var ns = cs().class("NetworkSystem").field("Instance").value;
    if (!ns.method("get_InRoom").invoke()) { joinSt.room = null; joinSt.seen = {}; return; }
    var room = cstr(ns.method("get_RoomName").invoke());
    var arr = ns.method("get_AllNetPlayers").invoke();
    var cur = {}, list = [];
    for (var i = 0; i < arr.length; i++) {
        var np = arr.get(i);
        if (!np || np.isNull()) continue;
        try { if (np.method("get_IsLocal").invoke()) continue; } catch (e) {}
        var o = netPlayerInfo(np);
        cur[o.id] = o; list.push(o);
    }
    var count = list.length + 1;
    if (room !== joinSt.room) {
        joinSt.room = room; joinSt.seen = cur;
        if (room) port.lastRoom = room;
        notify("room " + room + " | " + count + " players" + (list.length ? "\n" + list.map(function (x) { return x.name; }).join(", ") : ""), 6, "success", "Joined Room");
        return;
    }
    for (var id in cur) if (!joinSt.seen[id]) notify(cur[id].name + "\n" + joinDesc(cur[id], count), 5, "success", "Player Joined");
    if (p.leaveNotes) for (var id2 in joinSt.seen) if (!cur[id2]) notify(joinSt.seen[id2].name + "\n" + count + " in room", 4, "warning", "Player Left");
    joinSt.seen = cur;
}

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
    }
    return false;
}
function photonNet() { return Il2Cpp.domain.assembly("PhotonUnityNetworking").image.class("Photon.Pun.PhotonNetwork"); }
function norm3(a) { var l = len3(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function newGO(name) {
    var go = G.GameObject.alloc();
    pickM(go, G.GameObject, ".ctor", 1, function (ps) { return ps[0].type.name === "System.String"; }).invoke(Il2Cpp.string(name));
    return go;
}
function addComp(go, klass) {
    var tries = [
        function () { var m = go.method("AddComponent", 1); if (m.parameters[0].type.name !== "System.Type") throw 0; return m.invoke(klass.type.object); },
        function () { return go.method("AddComponent", 0).inflate(klass).invoke(); },
        function () { return go.method("AddComponent", 1).inflate(klass).invoke(); },
    ];
    var last = null;
    for (var i = 0; i < tries.length; i++) { try { var r = tries[i](); if (r && !r.isNull()) return r; } catch (e) { last = e; } }
    throw new Error("AddComponent failed for " + klass.name + (last ? " (" + last + ")" : ""));
}

// ---- networked calls through your rig's NetworkView (the same RPCs the game sends itself) ----
function boxPrim(className, v) {
    var o = Il2Cpp.corlib.class(className).alloc();
    o.field("m_value").value = v;
    return o;
}
function boxIt(a) {
    if (a && a.i !== undefined) return boxPrim("System.Int32", a.i);
    if (a && a.b !== undefined) return boxPrim("System.Boolean", a.b);
    if (a && a.f !== undefined) return boxPrim("System.Single", a.f);
    if (a && typeof a.box === "function") return a.box();
    return a;
}
function sendRPC(method, args) {
    var nv = G.tagger.method("get_myVRRig").invoke();
    if (!nv || nv.isNull()) throw new Error("not in a room (no networked rig)");
    var arr = Il2Cpp.array(Il2Cpp.corlib.class("System.Object"), args.map(boxIt));
    pickM(nv, nv.class, "SendRPC", 3, function (ps) { return ps[1].type.name === "Photon.Pun.RpcTarget"; }).invoke(Il2Cpp.string(method), 0, arr);
}
var lastSplash = 0;
function splashStep(now) {
    if (now - lastSplash < 300) return;
    var at = null, rot = null;
    var g = input.grip(1) ? G.rightHand : (input.grip(0) ? G.leftHand : null);
    if (p.splash && g) {
        var w = p.splashWhere;
        if (w === "Body") { var bt0 = G.localRig.field("bodyTransform").value; at = pos(bt0); rot = tr(bt0).method("get_rotation").invoke(); }
        else if (w === "Head (Vomit)") { var ht0 = rigTarget("head"); at = ht0.method("get_position").invoke(); rot = ht0.method("get_rotation").invoke(); }
        else if (w === "Aura") {
            at = pos(G.localRig);
            at.field("x").value = at.field("x").value + Math.random() * 3; at.field("y").value = at.field("y").value + Math.random() * 3; at.field("z").value = at.field("z").value + Math.random() * 3;
            rot = euler(Math.random() * 360, Math.random() * 360, Math.random() * 360);
        } else { at = pos(g); rot = tr(g).method("get_rotation").invoke(); }
    }
    if (!at && p.splashWalk) {
        var h = handTouching(false) ? G.rightHand : (handTouching(true) ? G.leftHand : null);
        if (h) { at = pos(h); rot = tr(h).method("get_rotation").invoke(); }
    }
    if (!at) return;
    lastSplash = now;
    sendRPC("RPC_PlaySplashEffect", [at, rot, { f: 1.0 }, { f: 0.5 }, { b: true }, { b: false }]);
}

// ---- teleport + aim helpers ----
function bodyPos() { return pos3(G.player.field("bodyCollider").value); }
function teleportTo(p3) {
    at.selfAt = Date.now();
    var target = add3(sub3(p3, bodyPos()), pos3(G.tagger));
    var m = pickM(G.player, G.player.class, "TeleportTo", 4, function (ps) { return ps[0].type.name === "UnityEngine.Vector3"; });
    m.invoke(target, tr(G.tagger).method("get_rotation").invoke(), false, false);
    G.rb.method("set_velocity").invoke([0, 0, 0]);
}
function tpRandom(up) {
    if (!init()) throw new Error("not ready");
    var rigs = otherRigs();
    if (!rigs.length) { notify("Nobody else here"); return; }
    teleportTo(add3(rigPos(rigs[Math.floor(Math.random() * rigs.length)]), [0, up, 0]));
}
var aim = null, aimRigMoved = false, prevTeleTrig = false;
function rayPoint() {
    var P = physics().class("UnityEngine.Physics");
    var start = pos3(G.rightHand), dir = X(tr(G.rightHand).method("get_forward").invoke());
    var hits = P.method("RaycastAll", 4).invoke(add3(start, mul3(dir, 0.25)), dir, 512.0, -129);
    var best = null, bd = Infinity;
    for (var i = 0; hits && i < hits.length; i++) {
        var pt = X(hits.get(i).method("get_point").invoke());
        var d = len3(sub3(pt, start));
        if (d > 0.01 && d < bd) { bd = d; best = pt; }
    }
    return best;
}
function aimShow(from, to) {
    if (!aim) aim = { line: mkEspObj(overlayMat([1, 1, 1, 1])), dot: mkEspObj(overlayMat([0.1, 0.4, 0.9, 1]), 0) };
    setLine(aim.line, from, to); setActive(aim.line, true);
    tr(aim.dot.go).method("set_position").invoke(to);
    tr(aim.dot.go).method("set_localScale").invoke([0.12, 0.12, 0.12]);
    setActive(aim.dot, true);
}
function aimHide() { if (aim) { setActive(aim.line, false); setActive(aim.dot, false); } }
function aimClear() {
    try { if (aim) { G.UObject.method("Destroy", 1).invoke(aim.line.go); G.UObject.method("Destroy", 1).invoke(aim.dot.go); } } catch (e) {}
    aim = null;
    try { if (aimRigMoved) { G.localRig.method("set_enabled").invoke(true); aimRigMoved = false; } } catch (e) {}
}
function gunsStep() {
    var any = (p.teleGun !== "Off" || p.rigGun) && input.grip(1);
    if (!any) {
        aimHide(); prevTeleTrig = false;
        if (aimRigMoved) { G.localRig.method("set_enabled").invoke(true); aimRigMoved = false; }
        return;
    }
    var pt = rayPoint();
    if (!pt) { aimHide(); return; }
    aimShow(pos3(G.rightHand), pt);
    var tg = input.trigger(1) > 0.6;
    if (p.teleGun === "Fly Towards") {
        if (tg) {
            var fd = sub3(pt, bodyPos());
            if (len3(fd) > 0.4) { tr(G.player).method("set_position").invoke(add3(pos3(G.player), mul3(norm3(fd), p.flySpeed * lastDt))); G.rb.method("set_velocity").invoke([0, 0, 0]); }
        }
    } else if (p.teleGun !== "Off" && tg && !prevTeleTrig) teleportTo(add3(pt, [0, p.teleGun === "Airstrike" ? 30 : 1, 0]));
    prevTeleTrig = tg;
    if (p.rigGun) {
        if (tg) {
            G.localRig.method("set_enabled").invoke(false);
            tr(G.localRig).method("set_position").invoke(add3(pt, [0, 1, 0]));
            aimRigMoved = true;
        } else if (aimRigMoved) { G.localRig.method("set_enabled").invoke(true); aimRigMoved = false; }
    }
}

// ---- extra movement (from the TS client) ----
var cpObj = null, cpPos = null, hist = [], prevDashBtn = false, slideOn = false, noWindOn = false, punchLast = {};
function extraStep(dt) {
    var pl = G.player;
    if (p.timeWarp !== "Normal") {
        var speed = p.timeWarp === "Slow" ? -0.15 : 0.15;
        var vel = X(G.rb.method("get_velocity").invoke());
        var disp = mul3(add3(vel, [0, -9.81, 0]), dt * speed);
        G.rb.method("MovePosition").invoke(add3(X(G.rb.method("get_position").invoke()), disp));
    }
    if (p.upDown) {
        var t = input.trigger(1) > 0.6, g = input.grip(1);
        if (t && g) G.rb.method("set_velocity").invoke([0, 0, 0]);
        else if (t) G.rb.method("AddForce", 2).invoke([0, 25, 0], 5);
        else if (g) G.rb.method("AddForce", 2).invoke([0, -25, 0], 5);
    }
    if (p.noTagFreeze) pl.field("disableMovement").value = false;
    if (p.slideControl) { pl.field("slideControl").value = 1; slideOn = true; }
    else if (slideOn) { pl.field("slideControl").value = G.base.slide; slideOn = false; }

    var d = btnHeld(p.dashBtn);
    if (p.dash && d && !prevDashBtn) {
        var f = X(tr(pl.field("headCollider").value).method("get_forward").invoke());
        G.rb.method("AddForce", 2).invoke(mul3(f, p.dashPower), 2);
    }
    prevDashBtn = d;

    if (p.checkpoint) {
        var cb = btnHeld(p.cpBtn);
        if (input.grip(1) && !cb) {
            cpPos = pos3(G.rightHand);
            if (!cpObj) {
                cpObj = G.GameObject.method("CreatePrimitive").invoke(3);
                try { if (G.Collider) G.UObject.method("Destroy", 1).invoke(getComp(cpObj, G.Collider)); } catch (e) {}
                try { getComp(cpObj, G.Renderer).method("get_material").invoke().method("set_color").invoke([0.5, 0.2, 0.9, 1]); } catch (e) {}
            }
            tr(cpObj).method("set_position").invoke(cpPos);
            tr(cpObj).method("set_localScale").invoke([0.2, 0.2, 0.2]);
        }
        if (cb && cpPos) teleportTo(cpPos);
    } else if (cpObj) { G.UObject.method("Destroy", 1).invoke(cpObj); cpObj = null; cpPos = null; }

    if (p.rewind) {
        var rb = btnHeld(p.rewindBtn);
        if (rb && hist.length) {
            var h = hist.pop();
            teleportTo(h.body);
            tr(G.leftHand).method("set_position").invoke(h.l);
            tr(G.rightHand).method("set_position").invoke(h.r);
            G.rb.method("set_velocity").invoke(h.v);
        } else if (!rb) {
            hist.push({ body: bodyPos(), l: pos3(G.leftHand), r: pos3(G.rightHand), v: X(G.rb.method("get_velocity").invoke()) });
            if (hist.length > 4320) hist.shift();
        }
    } else if (hist.length) hist = [];

    if (p.punch) {
        var head = pos3(pl.field("headCollider").value);
        var rigs = otherRigs();
        var hands = ["rightHandTransform", "leftHandTransform"];
        for (var i = 0; i < rigs.length; i++) {
            for (var j = 0; j < 2; j++) {
                var hp = pos3(rigs[i].field(hands[j]).value);
                var key = rigs[i].handle.toString() + j;
                var last = punchLast[key];
                if (last && len3(sub3(hp, head)) < 0.25 && len3(sub3(hp, last)) > 0.001) {
                    var cur = X(G.rb.method("get_velocity").invoke());
                    G.rb.method("set_velocity").invoke(add3(mul3(norm3(sub3(hp, last)), p.punchPower), cur));
                }
                punchLast[key] = hp;
            }
        }
    }

    if (p.noWind !== noWindOn) {
        noWindOn = p.noWind;
        var wo = gfind("Environment Objects/LocalObjects_Prefab/Forest/Environment/Forest_ForceVolumes/");
        if (wo && !wo.isNull()) wo.method("SetActive", 1).invoke(!p.noWind);
        else if (p.noWind) notify("Wind volumes not found here (forest only)");
    }
}

// ---- name tags (own text objects, font copied from the game's own name text) ----
var tagPool = {}, tagFont = null, tmpCls = null;
function tmpClass() { if (!tmpCls) tmpCls = Il2Cpp.domain.assembly("Unity.TextMeshPro").image.class("TMPro.TextMeshPro"); return tmpCls; }
function mkTag(sample) {
    var go = newGO("GTNameTag");
    var tmp = addComp(go, tmpClass());
    if (!tagFont && sample && !sample.isNull()) tagFont = sample.method("get_font").invoke();
    if (tagFont) tmp.method("set_font").invoke(tagFont);
    tmp.method("set_alignment").invoke(514);
    try { tmp.method("set_richText").invoke(false); } catch (e) {}
    try { tmp.method("set_enableWordWrapping").invoke(false); } catch (e) {}
    // draw on top of walls where the font shader allows it
    try {
        var fm = tmp.method("get_fontMaterial").invoke(), Mat = core().class("UnityEngine.Material");
        ["unity_GUIZTestMode", "_ZTestMode", "_ZTest"].forEach(function (n) { try { setMatInt(fm, Mat, n, 8); } catch (e) {} });
        try { fm.method("set_renderQueue").invoke(4000); } catch (e) {}
    } catch (e) {}
    return { go: go, tmp: tmp, txt: "" };
}
function tagsClear() {
    for (var k in tagPool) { try { G.UObject.method("Destroy", 1).invoke(tagPool[k].go); } catch (e) {} }
    tagPool = {};
}
function nameTagStep() {
    if (!p.nameTags) { if (Object.keys(tagPool).length) tagsClear(); return; }
    var rigs = otherRigs();
    var mgr = rigs.length ? tagManager() : null;
    var head = pos3(G.tagger.field("headCollider").value);
    var seen = {};
    for (var i = 0; i < rigs.length; i++) {
        var r = rigs[i], key = r.handle.toString();
        seen[key] = 1;
        var t = tagPool[key];
        if (!t) { t = mkTag(r.field("playerText1").value); tagPool[key] = t; }
        var net = r.field("OwningNetPlayer").value;
        var name = opt(function () { return str(r.field("playerNameVisible").value); }, "");
        if (!name || name === "null") name = opt(function () { return str(net.method("get_NickName").invoke()); }, "player");
        var rp = rigPos(r);
        var inf = mgr ? isInfected(mgr, net) : false;
        var txt = name;
        if (p.nameMode === "Name + Distance") txt += "\n" + len3(sub3(rp, head)).toFixed(0) + "m";
        else if (p.nameMode === "Name + Infected" && mgr) txt += inf ? "\n[INFECTED]" : "\n[clear]";
        else if (p.nameMode === "Name + FPS") txt += "\n" + rigFps(r) + " fps";
        else if (p.nameMode === "Name + Platform") txt += "\n" + netPlat(net);
        else if (p.nameMode === "Compact") {
            var bits = [netPlat(net), rigFps(r) + " fps", len3(sub3(rp, head)).toFixed(0) + "m"];
            if (opt(function () { return !!net.method("get_IsMasterClient").invoke(); }, false)) bits.push("master");
            txt += "\n" + bits.join(" | ");
        }
        if (txt !== t.txt) { t.tmp.method("set_text").invoke(Il2Cpp.string(txt)); t.txt = txt; }
        t.tmp.method("set_fontSize").invoke(p.nameSize);
        t.tmp.method("set_color").invoke(inf ? [1, 0.2, 0.2, 1] : [1, 1, 1, 1]);
        var at = add3(rp, [0, 0.6, 0]);
        var tt = tr(t.go);
        tt.method("set_position").invoke(at);
        tt.method("set_rotation").invoke(G.Quaternion.method("LookRotation", 1).invoke(sub3(at, head)));
    }
    for (var k in tagPool) { if (!seen[k]) { try { G.UObject.method("Destroy", 1).invoke(tagPool[k].go); } catch (e) {} delete tagPool[k]; } }
}

// ---- throwables (networked: this is the same throw call the game makes, so everyone sees them) ----
var thrCache = null, thrActive = null, thrAt = 0;
var HAND_ITEMS = "Player Objects/Local VRRig/Local Gorilla Player/rig/hand.R/palm.01.R/TransferrableItemRightHand";
function throwables() {
    var out = {};
    // same place J0ker takes them from: the anchors under the local rig's right hand
    try {
        var root = gfind(HAND_ITEMS);
        if (root && !root.isNull()) {
            var rt = tr(root), cls = cs().class("SnowballThrowable");
            var nA = rt.method("get_childCount").invoke();
            for (var a = 0; a < nA; a++) {
                var anc = rt.method("GetChild").invoke(a);
                var nC = anc.method("get_childCount").invoke();
                for (var c = 0; c < nC; c++) {
                    var ch = anc.method("GetChild").invoke(c);
                    var nm0 = str(ch.method("get_name").invoke());
                    if (out[nm0]) continue;
                    var comp0 = getComp(ch.method("get_gameObject").invoke(), cls);
                    if (comp0 && !comp0.isNull()) out[nm0] = comp0;
                }
            }
        }
    } catch (e) { safe("throwable lookup", function () { throw e; }); }
    ["get_rightHandInstance", "get_leftHandInstance"].forEach(function (g) {
        var inst = null;
        try { inst = cs().class("SnowballMaker").method(g).invoke(); } catch (e) {}
        if (!inst || inst.isNull()) return;
        var arr = inst.method("get_snowballs").invoke();
        for (var i = 0; arr && !arr.isNull() && i < arr.length; i++) {
            var t = arr.get(i);
            if (!t || t.isNull()) continue;
            var nm = str(t.method("get_gameObject").invoke().method("get_name").invoke());
            if (!out[nm]) out[nm] = t;
        }
    });
    return out;
}
function dictStrings(d) {
    var out = [];
    if (!d || d.isNull()) return out;
    var n = d.method("get_Count").invoke();
    if (!n) return out;
    var arr = Il2Cpp.array(Il2Cpp.corlib.class("System.String"), n);
    d.method("get_Values").invoke().method("CopyTo").invoke(arr, 0);
    for (var i = 0; i < n; i++) out.push(str(arr.get(i)));
    return out;
}
function preloadThrowables() {
    if (!init()) throw new Error("not ready");
    var reg = G.localRig.field("cosmeticsObjectRegistry").value;
    var ids = [];
    try {
        var sp = cs().class("CosmeticsV2Spawner_Dirty");
        ids = dictStrings(sp.field("materialIndexToSnowballThrowablePlayfabIdStringLeft").value)
            .concat(dictStrings(sp.field("materialIndexToSnowballThrowablePlayfabIdStringRight").value));
    } catch (e) { log("preload: could not read the game's throwable list (" + e + "), using the built-in one"); }
    if (!ids.length) ids = THROW.map(function (t) { return t.n.replace(/ (RIGHT|LEFT)\.$/, ""); });
    var n = 0, seen = {};
    ids.forEach(function (id) {
        if (!id || seen[id]) return;
        seen[id] = 1;
        try { reg.method("Cosmetic").invoke(Il2Cpp.string(id)); n++; } catch (e) { safe("preload", function () { throw e; }); }
    });
    thrCache = null;
    notify("Preloading " + n + " throwables, give it a few seconds");
}
function throwStep(now) {
    if (p.throwType === "Off" || !btnHeld(p.throwBtn)) {
        if (thrActive) { try { thrActive.method("SetSnowballActiveLocal").invoke(false); } catch (e) {} thrActive = null; }
        return;
    }
    if (now - thrAt < p.throwRate * 1000) return;
    thrAt = now;
    var def = null;
    if (p.throwType === "Random") def = THROW[Math.floor(Math.random() * THROW.length)];
    else THROW.forEach(function (t) { if (t.l === p.throwType) def = t; });
    if (!thrCache || now - thrCache.at > 1500) thrCache = { t: throwables(), at: now };
    var th = thrCache.t[def.n];
    if (!th) throw new Error("'" + def.l + "' is not loaded (" + Object.keys(thrCache.t).length + " loaded). press Preload Throwables and wait a few seconds");
    if (thrActive && !thrActive.handle.equals(th.handle)) { try { thrActive.method("SetSnowballActiveLocal").invoke(false); } catch (e) {} thrActive = null; }
    if (p.throwShow) holdablesStep(def, th, now);
    throwHookOn();
    if (!G.velEst) G.velEst = addComp(newGO("GTVelocityEstimator"), cs().class("GorillaVelocityEstimator"));
    var go = th.method("get_gameObject").invoke();
    var hand = G.localRig.field("rightHandTransform").value;
    if (!go.method("get_activeSelf").invoke()) {
        th.method("SetSnowballActiveLocal").invoke(true);
        th.field("randomizeColor").value = false;
        try { G.localRig.method("SetThrowableProjectileColor").invoke(false, [255, 255, 255, 255]); } catch (e) {}
        th.field("velocityEstimator").value = handEstimator() || G.velEst;
        tr(go).method("set_rotation").invoke(tr(hand).method("get_rotation").invoke());
    }
    // keep it out in front of the hand so the hand doesn't grab it
    var fwd = X(tr(hand).method("get_forward").invoke());
    var spawn = add3(pos3(hand), mul3(fwd, p.throwDist));
    tr(go).method("set_position").invoke(spawn);
    if (def.g) { try { th.method("IncreaseSize").invoke(0); } catch (e) {} }
    if (G.tagRb === undefined) G.tagRb = opt(function () { var r = getComp(G.tagger.method("get_gameObject").invoke(), physics().class("UnityEngine.Rigidbody")); return (r && !r.isNull()) ? r : null; }, null);
    var rb = G.tagRb || G.rb;
    var origV = rb.method("get_velocity").invoke();
    var origP = pos(go);
    var throwV = mul3(X(tr(hand).method("get_up").invoke()), -p.throwSpeed);
    rb.method("set_velocity").invoke(throwV);
    // the real throw code reads the hand's velocity estimator, so feed it our throw too
    var est = th.field("velocityEstimator").value;
    if (est && !est.isNull()) { try { est.method("set_linearVelocity").invoke(throwV); est.method("set_handPos").invoke(spawn); } catch (e) {} }
    try { G.localRig.method("SetThrowableProjectileColor").invoke(true, [255, 255, 255, 255]); } catch (e) {}
    var n0 = thrHook.n;
    try { th.method("PerformSnowballThrowAuthority").invoke(); }
    finally {
        rb.method("set_velocity").invoke(origV);
        tr(go).method("set_position").invoke(origP);
    }
    if (!thrHook.h || thrHook.n === n0) {
        // the game sent the throw to the room but did not spawn a projectile for us, so spawn one locally
        var scale = opt(function () { return X(tr(go).method("get_localScale").invoke())[0] || 1; }, 1);
        try { launchLocal(th, spawn, throwV, scale); }
        catch (e) { safe("throw local spawn", function () { throw e; }); }
        if (!thrHook.told) { thrHook.told = true; log("throw: the game did not spawn a local projectile, spawning our own copy from now on"); }
    } else if (!thrHook.told) { thrHook.told = true; log("throw: the game spawned the projectile locally, good"); }
    try { photonNet().method("SendAllOutgoingCommands").invoke(); } catch (e) {}
    if (p.throwHide) { try { th.method("SetSnowballActiveLocal").invoke(false); } catch (e) {} thrActive = null; }
    else thrActive = th;
}

// ---- projectile prefab lookup: scene path first, then the game's object pools themselves ----
function poolPrefab(n) {
    var c = projCache[n];
    if (c && !c.isNull()) return c;
    var pf = null;
    try { pf = gfind("Environment Objects/05Maze_PersistentObjects/GlobalObjectPools/" + n + "(PoolIndex=0)"); } catch (e) {}
    if (!pf || pf.isNull()) {
        pf = null;
        var list = cs().class("ObjectPools").field("instance").value.field("pools").value;
        var cnt = list.method("get_Count").invoke();
        for (var i = 0; i < cnt && !pf; i++) {
            var o = list.method("get_Item").invoke(i).field("objectToPool").value;
            if (!o || o.isNull()) continue;
            var nm = str(o.method("get_name").invoke());
            if (nm === n || nm.indexOf(n) === 0) pf = o;
        }
    }
    if (pf) projCache[n] = pf;
    return pf;
}

// ------------------------------------------------------------------------------------------
// v3.2: ports from the Seralyth Menu and hamburbur sources.
// Only self-affecting movement, rig poses, ESP styles and visuals were taken. Nothing here lags,
// crashes, kicks, reports or moves anybody else.
// ------------------------------------------------------------------------------------------
var FM = { force: 0, impulse: 1, velChange: 2, accel: 5 };
var port = { grap: {}, grapLine: {}, pullWas: {}, colOff: {}, bones: {}, lerpOrig: {} };
function vel() { return X(G.rb.method("get_velocity").invoke()); }
function setVel(v) { G.rb.method("set_velocity").invoke(v); }
function addForce(v, mode) { G.rb.method("AddForce", 2).invoke(v, mode); }
function headT() { return tr(G.tagger.field("headCollider").value); }
function bodyT() { return tr(G.tagger.field("bodyCollider").value); }
function fwdOf(t) { return X(t.method("get_forward").invoke()); }
function rightOf(t) { return X(t.method("get_right").invoke()); }
function upOf(t) { return X(t.method("get_up").invoke()); }
function flatNorm(v) { return norm3([v[0], 0, v[2]]); }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function rigT() { return tr(G.localRig); }
function rigTarget(name) { return G.localRig.field(name).value.field("rigTarget").value; }
function rigNet(r) { return r.field("OwningNetPlayer").value; }
function rigFps(r) { return opt(function () { return Number(r.field("fps").value); }, 0); }
function netPlat(net) { return opt(function () { return cstr(net.method("get_Platform").invoke()).toLowerCase(); }, "") || "?"; }
function actorOf(net) { return opt(function () { return Number(net.method("get_ActorNumber").invoke()); }, -1); }
function bodyScale() { return opt(function () { return Number(G.player.method("get_scale").invoke()) || 1; }, 1); }
function lookRot(dir) { return G.Quaternion.method("LookRotation", 1).invoke(dir); }
function destroyLater(go, s) { G.UObject.method("Destroy", 2).invoke(go, s); }
function destroyNow(go) { try { G.UObject.method("Destroy", 1).invoke(go); } catch (e) {} }
function asRuntime(o) { return (o && !o.isNull()) ? new Il2Cpp.Object(o.handle) : null; }
function locoMask() {
    if (G.locoMask === undefined) G.locoMask = opt(function () { return Number(G.player.field("locomotionEnabledLayers").value.field("m_Mask").value); }, -129);
    return G.locoMask;
}
// nearest hit along a ray: { point, normal, dist } or null
function rayHit(origin, dir, dist, mask) {
    var P = physics().class("UnityEngine.Physics");
    var hits = P.method("RaycastAll", 4).invoke(origin, dir, dist, mask === undefined ? locoMask() : mask);
    var best = null;
    for (var i = 0; hits && i < hits.length; i++) {
        var h = hits.get(i), d = Number(h.method("get_distance").invoke());
        if (!best || d < best.dist) best = { point: X(h.method("get_point").invoke()), normal: X(h.method("get_normal").invoke()), dist: d };
    }
    return best;
}
var gdCache = { t: 0, d: Infinity };
function groundDist() {
    var now = Date.now();
    if (now - gdCache.t < 16) return gdCache.d;
    gdCache.t = now;
    var h = rayHit(sub3(pos3(G.tagger.field("bodyCollider").value), [0, 0.2, 0]), [0, -1, 0], 512);
    gdCache.d = h ? h.dist : Infinity;
    return gdCache.d;
}
function handTouching(left) { return !!G.player.method("IsHandTouching").invoke(left); }
function lastHit() { var r = G.player.field("lastHitInfoHand").value; return { point: X(r.method("get_point").invoke()), normal: X(r.method("get_normal").invoke()) }; }
function handVel(left) {
    return opt(function () { return X(G.player.method("GetHandVelocityTracker").invoke(left).method("GetAverageVelocity").invoke(true, 0, false)); }, [0, 0, 0]);
}
function ctrlT(left) { return G.player.method("GetControllerTransform").invoke(left); }
function playTap(idx, left, vol) { try { G.localRig.method("PlayHandTapLocal").invoke(idx, left, vol); } catch (e) {} }

// ---- game mode context shared by the esp filters ----
var modeCache2 = { t: 0, m: null };
function activeMode() {
    var now = Date.now();
    if (now - modeCache2.t < 1000) return modeCache2.m;
    modeCache2.t = now;
    var o = { tag: null, hunt: null };
    try {
        var m = cs().class("GorillaGameModes.GameMode").method("get_ActiveGameMode").invoke();
        if (m && !m.isNull()) {
            var n = m.class.name;
            if (n.indexOf("GorillaTagManager") >= 0) o.tag = m;
            if (n.indexOf("GorillaHuntManager") >= 0) o.hunt = m;
        }
    } catch (e) {}
    modeCache2.m = o;
    return o;
}
function espCtx() {
    var mode = activeMode(), me = null, meInf = false, myTarget = -1;
    try { me = localNet(); } catch (e) {}
    if (me && mode.tag) meInf = isInfected(mode.tag, me);
    if (me && mode.hunt) { try { var t = mode.hunt.method("GetTargetOf").invoke(me); if (t && !t.isNull()) myTarget = actorOf(t); } catch (e) {} }
    return { tag: mode.tag, hunt: mode.hunt, me: me, meInf: meInf, myTarget: myTarget };
}
// who to draw and whether they count as "the other side" (red colour)
function espShow(r, ctx) {
    if (!ctx) return { show: false, inf: false };
    var net = rigNet(r);
    if (p.espFilter === "Auto" && ctx.hunt && ctx.me) {
        var isT = ctx.myTarget >= 0 && actorOf(net) === ctx.myTarget;
        var huntsMe = !!opt(function () { return ctx.hunt.method("IsTargetOf").invoke(net, ctx.me); }, false);
        return { show: isT || huntsMe, inf: huntsMe };
    }
    var inf = ctx.tag ? isInfected(ctx.tag, net) : false;
    if (p.espFilter === "Everyone" || !ctx.tag) return { show: true, inf: inf };
    if (p.espFilter === "Infected Only") return { show: inf, inf: inf };
    if (p.espFilter === "Not Infected Only") return { show: !inf, inf: inf };
    return { show: inf !== ctx.meInf, inf: inf };   // Auto in an infection mode: the other team
}

// ------------------------------------------------------------------------------------------
// movement ports
// ------------------------------------------------------------------------------------------
function grappleHand(left, dt) {
    var key = left ? "L" : "R", hand = left ? G.leftHand : G.rightHand;
    if (input.grip(left ? 0 : 1)) {
        var hp = pos3(hand), hf = fwdOf(tr(hand));
        if (!port.grap[key]) {
            port.grap[key] = add3(hp, mul3(hf, 16));
            setVel(add3(vel(), mul3(hf, 5)));
            playTap(89, left, 0.5);
        } else setVel(add3(vel(), mul3(norm3(sub3(port.grap[key], hp)), 45 * dt)));
        if (!port.grapLine[key]) port.grapLine[key] = mkEspObj(overlayMat([1, 0.25, 0.25, 1]));
        setLine(port.grapLine[key], hp, port.grap[key]);
        setActive(port.grapLine[key], true);
    } else {
        port.grap[key] = null;
        if (port.grapLine[key]) setActive(port.grapLine[key], false);
    }
}
function grappleClear() {
    for (var k in port.grapLine) { if (port.grapLine[k]) destroyNow(port.grapLine[k].go); }
    port.grapLine = {}; port.grap = {};
}
function pearlClear() {
    if (port.pearl) destroyNow(port.pearl.go);
    port.pearl = null; port.pearlRb = null;
}
function pearlStep(now) {
    var held = input.grip(1) ? 1 : (input.grip(0) ? 0 : -1);
    if (held >= 0) {
        if (!port.pearl) {
            port.pearl = mkEspObj(overlayMat([0.1, 0.35, 0.3, 1]), 0);
            tr(port.pearl.go).method("set_localScale").invoke([0.08, 0.08, 0.08]);
        }
        if (port.pearlRb) { destroyNow(port.pearlRb); port.pearlRb = null; }
        port.pearlLeft = held === 0;
        tr(port.pearl.go).method("set_position").invoke(pos3(held === 0 ? G.leftHand : G.rightHand));
        return;
    }
    if (!port.pearl) return;
    if (!port.pearlRb) {
        port.pearlRb = addComp(port.pearl.go, physics().class("UnityEngine.Rigidbody"));
        port.pearlRb.method("set_velocity").invoke(handVel(port.pearlLeft));
        port.pearlAt = now;
    }
    var pv = X(port.pearlRb.method("get_velocity").invoke());
    var pp = pos3(port.pearl.go);
    var hit = len3(pv) > 0.01 ? rayHit(pp, norm3(pv), 0.25) : null;
    if (hit || now - port.pearlAt > 8000 || pp[1] < -500) {
        if (hit) { teleportTo(pp); playTap(84, port.pearlLeft, 1); }
        pearlClear();
        return;
    }
    port.pearlRb.method("AddForce", 2).invoke([0, 6.66, 0], FM.accel);   // Seralyth: the pearl falls slower than a rock
}
function frozPlat(left) {
    var ct = ctrlT(left);
    var go = G.GameObject.method("CreatePrimitive").invoke(3);
    var t = tr(go);
    t.method("set_position").invoke(add3(pos3(ct), mul3(rightOf(ct), left ? 0.05 : -0.05)));
    t.method("set_rotation").invoke(ct.method("get_rotation").invoke());
    t.method("set_localScale").invoke([0.015, 0.28, 0.28]);
    try { getComp(go, G.Renderer).method("get_material").invoke().method("set_color").invoke([0.6, 0.85, 1, 1]); } catch (e) {}
    addComp(go, cs().class("GorillaSurfaceOverride")).field("overrideIndex").value = 61;   // 61 = ice
    destroyLater(go, 1.0);
}
function pullHand(left) {
    if (!input.grip(left ? 0 : 1)) return;
    var touching = handTouching(left), was = !!port.pullWas[left];
    if (!touching && was) {
        var n = lastHit().normal, d = vel(); d = [d[0], 0, d[2]];
        var mag = len3(d);
        if (mag > 0.01) {
            var proj = sub3(d, mul3(n, dot3(d, n)));
            var amt = mag / (G.player.field("maxJumpSpeed").value || 6.5) * (p.pullPower * 5) * bodyScale();
            tr(G.player).method("set_position").invoke(add3(pos3(G.player), mul3(norm3(proj), amt)));
        }
    }
    port.pullWas[left] = touching;
}
function colToggle(name, off) {
    var was = !!port.colOff[name];
    if (off === was) return;
    G.tagger.field(name).value.method("set_enabled").invoke(!off);
    port.colOff[name] = off;
}
function bouncySet(on) {
    var mat = G.tagger.field("bodyCollider").value.method("get_material").invoke();
    if (on) {
        if (!port.bouncyOrig) port.bouncyOrig = { b: mat.method("get_bounciness").invoke(), c: mat.method("get_bounceCombine").invoke(), f: mat.method("get_dynamicFriction").invoke() };
        mat.method("set_bounciness").invoke(1); mat.method("set_bounceCombine").invoke(3); mat.method("set_dynamicFriction").invoke(0);
    } else if (port.bouncyOrig) {
        var o = port.bouncyOrig; port.bouncyOrig = null;
        mat.method("set_bounciness").invoke(o.b); mat.method("set_bounceCombine").invoke(o.c); mat.method("set_dynamicFriction").invoke(o.f);
    }
    port.bouncyOn = on;
}
function airSwimStep() {
    if (!p.airSwim) { if (port.swim) { destroyNow(port.swim); port.swim = null; } return; }
    if (!port.swim) {
        var src = gfind("Environment Objects/LocalObjects_Prefab/ForestToBeach/ForestToBeach_Prefab_V4/ForestToBeach_Geo/CaveWaterVolume");
        if (!src || src.isNull()) {
            if (!seenErr.airswim) { seenErr.airswim = "cave water volume not found"; notify("Air Swim: cave water not found, walk towards the beach once and try again"); }
            return;
        }
        var inst = pickM(G.UObject, G.UObject, "Instantiate", 1, function (ps) { return ps[0].type.name === "UnityEngine.Object"; }).invoke(src);
        var go = asRuntime(inst);
        if (!go) throw new Error("Instantiate returned nothing");
        tr(go).method("set_localScale").invoke([5, 5, 5]);
        try { var rd = getComp(go, G.Renderer); if (rd) rd.method("set_enabled").invoke(false); } catch (e) {}
        port.swim = go;
    }
    tr(port.swim).method("set_position").invoke(add3(pos3(G.tagger.field("headCollider").value), [0, 2.5, 0]));
}

function portMovementStep(dt, now) {
    var pl = G.player, head = headT();

    if (p.joyFly) {   // Seralyth JoystickFly
        var js = input.stick(0);
        if (Math.abs(js[0]) > 0.3 || Math.abs(js[1]) > 0.3) {
            var mv = add3(mul3(fwdOf(head), dt * js[1] * p.flySpeed), mul3(rightOf(head), dt * js[0] * p.flySpeed));
            tr(pl).method("set_position").invoke(add3(pos3(pl), mv));
            setVel([0, 0, 0]);
        }
    }
    if (p.barkFly) {   // hamburbur BarkFly
        addForce([0, 9.81, 0], FM.accel);
        var xz = input.stick(0), ry = input.stick(1)[1];
        var bt = bodyT(), bf = flatNorm(fwdOf(bt)), br = flatNorm(rightOf(bt));
        var bob = (Math.abs(xz[0]) < 0.05 && Math.abs(xz[1]) < 0.05) ? Math.sin(now / 400) * 0.03 : 0;
        var want = mul3(add3(add3(mul3(br, xz[0]), [0, ry + bob, 0]), mul3(bf, xz[1])), p.flySpeed);
        var cur = vel();
        setVel(add3(cur, mul3(sub3(want, cur), 0.125)));
    }
    if (p.drive) {   // Seralyth Drive / hamburbur Car
        var j = input.stick(0), dd = port.driveDir || [0, 0];
        dd = [dd[0] + (j[0] - dd[0]) * 0.05, dd[1] + (j[1] - dd[1]) * 0.05];
        port.driveDir = dd;
        if ((Math.abs(dd[0]) > 0.05 || Math.abs(dd[1]) > 0.05) && groundDist() < 0.2) {
            var bt2 = bodyT();
            var tv = mul3(add3(mul3(fwdOf(bt2), dd[1]), mul3(rightOf(bt2), dd[0])), p.driveSpeed), cv = vel();
            setVel([tv[0], cv[1], tv[2]]);
        }
    } else port.driveDir = null;
    if (p.drStrange && input.grip(0) && input.grip(1)) {   // hamburbur DrStrangeFly
        addForce(mul3(sub3(pos3(G.rightHand), pos3(G.leftHand)), p.flySpeed / 20), FM.velChange);
        addForce([0, 9.81, 0], FM.accel);
    }
    if (p.grapple) { grappleHand(true, dt); grappleHand(false, dt); }
    else if (port.grap.L || port.grap.R || port.grapLine.L || port.grapLine.R) grappleClear();
    if (p.enderPearl) pearlStep(now); else if (port.pearl) pearlClear();

    if (p.reverseVel) {
        var rv = btnHeld(p.reverseBtn);
        if (rv && !port.revPrev && now - (port.revAt || 0) > 500) { port.revAt = now; setVel(mul3(vel(), -1)); }
        port.revPrev = rv;
    }
    if (p.longJump && btnHeld(p.longJumpBtn)) {   // Seralyth PlayspaceAbuse
        if (!port.lj) { var v0 = vel(); port.lj = { until: now + 500, v: v0, step: [v0[0] * 0.004, 0, v0[2] * 0.004] }; }
        if (now < port.lj.until) setVel(port.lj.v);
        tr(pl).method("set_position").invoke(add3(pos3(pl), mul3(port.lj.step, dt * 90)));
    } else port.lj = null;
    if (p.flickJump && btnHeld(p.flickBtn)) ctrlT(false).method("set_position").invoke(add3(pos3(G.rightHand), [0, -1.5, 0]));
    if (p.bunnyHop && groundDist() < 0.15) {
        var cb = vel();
        setVel([cb[0], Number(pl.method("get_jumpMultiplier").invoke()) * 2.727272727, cb[2]]);
    }
    if (p.strafe && groundDist() > 0.3) {
        var sv = mul3(flatNorm(fwdOf(bodyT())), pl.field("maxJumpSpeed").value), cs2 = vel();
        setVel([sv[0], cs2[1], sv[2]]);
    }
    if (p.featherFall) {
        var fv = vel();
        if (len3(fv) > 0.1 || groundDist() > 0.2) {
            fv = sub3(fv, mul3(fv, 4 * dt));
            if (groundDist() < 0.15 && fv[1] < 0) fv[1] = Math.max(fv[1], -2);
            setVel(fv);
        }
    }
    if (p.bouncy !== !!port.bouncyOn) bouncySet(p.bouncy);
    if (p.pullMod) { pullHand(true); pullHand(false); } else port.pullWas = {};
    if (p.groundHelper && input.grip(1)) { var gv = vel(); if (gv[1] > 0) setVel([gv[0], 0, gv[2]]); }
    if (p.wallAssist) {   // hamburbur WallAssist
        if (handTouching(true) || handTouching(false)) port.wallHit = lastHit();
        if (port.wallHit && input.grip(0)) addForce(mul3(port.wallHit.normal, -p.wallAssistPow), FM.accel);
    } else port.wallHit = null;
    if (p.frozone && now - (port.frozAt || 0) > 50) {
        port.frozAt = now;
        if (input.grip(1)) frozPlat(false);
        if (input.grip(0)) frozPlat(true);
    }
    airSwimStep();
    colToggle("bodyCollider", !!p.noBodyCol);
    colToggle("headCollider", !!p.noHeadCol);
}

// ------------------------------------------------------------------------------------------
// rig poses (the rig is switched off and posed by hand, like Seralyth's Movement.*Rig mods)
// ------------------------------------------------------------------------------------------
var RIG_POSES = { "Helicopter": 1, "Beyblade": 1, "Still Beyblade": 1, "Fan": 1, "Dance": 1, "Griddy": 1, "Chicken": 1, "Paralyze": 1, "Minecraft": 1, "Ghost Animations": 1, "Bees": 1 };
function setP(t, v) { t.method("set_position").invoke(v); }
function setR(t, q) { t.method("set_rotation").invoke(q); }
function getP(t) { return X(t.method("get_position").invoke()); }
function getR(t) { return t.method("get_rotation").invoke(); }
function rigPose(m, now, dt) {
    var rt = rigT(), bc = bodyT();
    var bpos = getP(bc), brot = getR(bc), bup = upOf(bc), bright = rightOf(bc), bfwd = fwdOf(bc);
    var lh = rigTarget("leftHand"), rh = rigTarget("rightHand"), hd = rigTarget("head");
    var t = now / 1000;
    function wideArms(spread) {
        var rp = getP(rt), rr = rightOf(rt), rrot = getR(rt);
        setP(lh, add3(rp, mul3(rr, -spread))); setP(rh, add3(rp, mul3(rr, spread)));
        setR(hd, rrot); setR(lh, rrot); setR(rh, rrot);
    }
    function spinY(deg) { setR(rt, qmul(getR(rt), euler(0, deg, 0))); }
    switch (m) {
        case "Helicopter":
            setP(rt, add3(getP(rt), [0, 3 * dt, 0])); spinY(600 * dt); wideArms(1); break;
        case "Beyblade":
            setP(rt, add3(bpos, [0, 0.15, 0])); spinY(600 * dt); wideArms(1); break;
        case "Still Beyblade":
            if (!port.stillPos) port.stillPos = add3(bpos, [0, 0.15, 0]);
            setP(rt, port.stillPos); spinY(600 * dt); wideArms(1); break;
        case "Fan": {
            setP(rt, add3(bpos, [0, 0.15, 0])); setR(rt, brot);
            var rp = getP(rt), rr = rightOf(rt), ru = upOf(rt), rrot = getR(rt);
            var sw = add3(mul3(ru, Math.cos(t * 15) * 2), mul3(rr, Math.sin(t * 15) * 2));
            setP(lh, add3(rp, sw)); setP(rh, sub3(rp, sw));
            setR(hd, rrot); setR(lh, rrot); setR(rh, rrot);
            break;
        }
        case "Dance": {
            var ph = t * 4.5;
            var off = add3(mul3(bright, Math.cos(ph) * 0.3), [0, Math.abs(Math.sin(ph) * 0.2), 0]);
            setP(rt, add3(add3(bpos, [0, 0.15, 0]), off)); setR(rt, brot); setR(hd, brot);
            var rp2 = getP(rt), rf = fwdOf(rt), rr2 = rightOf(rt), ru2 = upOf(rt);
            setP(lh, add3(add3(add3(rp2, mul3(rf, 0.2)), mul3(rr2, -0.4)), mul3(ru2, 0.3 + Math.sin(ph) * 0.2)));
            setP(rh, add3(add3(add3(rp2, mul3(rf, 0.2)), mul3(rr2, 0.4)), mul3(ru2, 0.3 - Math.sin(ph) * 0.2)));
            setR(lh, brot); setR(rh, brot);
            break;
        }
        case "Griddy": {
            var ph2 = t * 9;
            setP(rt, add3(getP(rt), mul3(fwdOf(rt), 5 * dt)));
            var rrot3 = getR(rt), rp3 = getP(rt), rf3 = fwdOf(rt), rr3 = rightOf(rt), ru3 = upOf(rt);
            setR(hd, rrot3);
            var swing = add3(mul3(rf3, 0.5 * Math.cos(ph2)), mul3(ru3, -0.5 * Math.abs(Math.sin(ph2))));
            setP(lh, add3(add3(rp3, mul3(rr3, -0.33)), swing)); setP(rh, add3(add3(rp3, mul3(rr3, 0.33)), swing));
            setR(lh, rrot3); setR(rh, rrot3);
            break;
        }
        case "Chicken":
            setP(rt, add3(bpos, [0, 0.15, 0])); setR(rt, brot); setR(hd, getR(headT()));
            setP(lh, add3(add3(bpos, mul3(bright, 0.2)), mul3(bup, -0.2)));
            setP(rh, add3(add3(bpos, mul3(bright, -0.2)), mul3(bup, -0.2)));
            setR(lh, brot); setR(rh, brot);
            break;
        case "Paralyze": {
            setP(rt, add3(bpos, [0, 0.15, 0])); setR(rt, brot); setR(hd, getR(headT()));
            setP(lh, add3(add3(bpos, mul3(bright, -0.08)), mul3(bup, 0.12)));
            setP(rh, add3(add3(bpos, mul3(bright, 0.08)), mul3(bup, 0.12)));
            var flip = qmul(brot, euler(0, 180, 180));
            setR(lh, flip); setR(rh, flip);
            break;
        }
        case "Minecraft": {
            setP(rt, add3(bpos, [0, 0.15, 0])); setR(rt, brot); setR(hd, brot); setR(lh, brot); setR(rh, brot);
            var down = mul3(bup, -1), sw2 = input.trigger(1) > 0.6 ? Math.sin(t * 9) : 0;
            setP(lh, add3(add3(add3(bpos, mul3(bright, -0.25)), down), mul3(bfwd, sw2)));
            setP(rh, add3(add3(add3(bpos, mul3(bright, 0.25)), down), mul3(bfwd, -sw2)));
            if (input.secondary(1)) {
                var rhT = tr(G.rightHand), aim = norm3(add3(fwdOf(rhT), mul3(upOf(rhT), -1)));
                setP(rh, add3(add3(bpos, mul3(bright, 0.25)), mul3(aim, 2)));
                setR(rh, getR(rhT));
            }
            break;
        }
        case "Ghost Animations": ghostAnim(dt); break;
        case "Bees": {   // J0ker Bees: your rig hops between random players like the bees ghost
            if (now - (port.beesAt || 0) < 777) break;
            port.beesAt = now;
            var others = otherRigs();
            if (!others.length) break;
            var tp = rigPos(others[Math.floor(Math.random() * others.length)]);
            setP(rt, add3(tp, [0, 1, 0])); setP(lh, tp); setP(rh, tp);
            break;
        }
    }
}
// the rig trails behind your real head and hands, snappy and slow like the ghost
function ghostAnim(dt) {
    var hc = headT(), lt = tr(G.leftHand), rtT = tr(G.rightHand);
    var cur = { hp: getP(hc), hr: getR(hc), lp: getP(lt), lr: getR(lt), rp: getP(rtT), rr: getR(rtT) };
    var g = port.ghost;
    if (!g) { g = port.ghost = cur; return; }
    var Q = G.Quaternion, posStep = 0.9 * dt, rotStep = 180 * dt;
    function chasePos(k) { var d = sub3(cur[k], g[k]); if (len3(d) > 0.05) g[k] = add3(g[k], mul3(norm3(d), Math.min(posStep, len3(d)))); }
    function chaseRot(k) {
        var ang = Number(Q.method("Angle").invoke(g[k], cur[k]));
        if (ang > 11.5) g[k] = Q.method("RotateTowards").invoke(g[k], cur[k], rotStep);
    }
    chasePos("hp"); chasePos("lp"); chasePos("rp"); chaseRot("hr"); chaseRot("lr"); chaseRot("rr");
    var rt = rigT();
    var yaw = X(g.hr.method("get_eulerAngles").invoke())[1];
    setP(rt, sub3(g.hp, [0, 0.15, 0])); setR(rt, euler(0, yaw, 0));
    setR(rigTarget("head"), g.hr);
    setP(rigTarget("leftHand"), g.lp); setP(rigTarget("rightHand"), g.rp);
    setR(rigTarget("leftHand"), g.lr); setR(rigTarget("rightHand"), g.rr);
}

// ------------------------------------------------------------------------------------------
// player gun: orbit / follow / piggyback a player you aim at
// ------------------------------------------------------------------------------------------
var pg = { target: null, line: null, dot: null, mats: null, moved: false };
function pgHide() { if (pg.line) setActive(pg.line, false); if (pg.dot) setActive(pg.dot, false); }
function pgRelease() { if (pg.moved) { G.localRig.method("set_enabled").invoke(true); pg.moved = false; } }
function pgClear() {
    try { if (pg.line) destroyNow(pg.line.go); if (pg.dot) destroyNow(pg.dot.go); } catch (e) {}
    pg.line = null; pg.dot = null; pg.target = null;
    try { pgRelease(); } catch (e) {}
}
function aimPick(rigs) {
    var from = pos3(G.rightHand), dir = fwdOf(tr(G.rightHand));
    var best = null, bestPos = null, bestDot = Math.cos(p.gunAngle * Math.PI / 180);
    for (var i = 0; i < rigs.length; i++) {
        var bp = rigPos(rigs[i]), d = sub3(bp, from), len = len3(d);
        if (len < 0.2) continue;
        var dt = dot3(dir, mul3(d, 1 / len));
        if (dt > bestDot) { bestDot = dt; best = rigs[i]; bestPos = bp; }
    }
    return { rig: best, pos: bestPos, from: from, dir: dir };
}
function playerGunStep(now, dt) {
    if (p.playerGun === "Off" || !input.grip(1)) { pgHide(); pgRelease(); pg.target = null; return; }
    if (!pg.mats) pg.mats = { idle: overlayMat([1, 1, 1, 1]), hit: overlayMat([0.3, 1, 0.4, 1]) };
    if (!pg.line) pg.line = mkEspObj(pg.mats.idle);
    if (!pg.dot) pg.dot = mkEspObj(pg.mats.hit, 0);
    var rigs = otherRigs(), a = aimPick(rigs);
    setLine(pg.line, a.from, a.pos ? a.pos : add3(a.from, mul3(a.dir, 30)));
    espMatFor(pg.line, a.rig ? pg.mats.hit : pg.mats.idle);
    setActive(pg.line, true);
    if (a.rig) { tr(pg.dot.go).method("set_position").invoke(a.pos); tr(pg.dot.go).method("set_localScale").invoke([0.22, 0.22, 0.22]); setActive(pg.dot, true); }
    else setActive(pg.dot, false);
    if (a.rig && input.trigger(1) > 0.6) pg.target = a.rig;
    if (!pg.target) return;
    var still = false;
    for (var i = 0; i < rigs.length; i++) if (rigs[i].handle.equals(pg.target.handle)) still = true;
    if (!still) { pg.target = null; pgRelease(); return; }
    var tpos = rigPos(pg.target);
    if (p.playerGun === "Piggyback") { teleportTo(add3(tpos, [0, 0.5, 0])); return; }
    if (p.playerGun === "Stare") {
        pgRelease();
        var hd = rigTarget("head");
        pickM(hd, hd.class, "LookAt", 1, function (ps) { return ps[0].type.name === "UnityEngine.Vector3"; }).invoke(rigPart(pg.target, "head"));
        return;
    }
    if (p.playerGun === "Copy") {   // J0ker CopyMovementGun: your rig mirrors theirs
        G.localRig.method("set_enabled").invoke(false); pg.moved = true;
        var trt = tr(pg.target), th2 = pg.target.field("head").value.field("rigTarget").value;
        setP(rigT(), getP(trt)); setR(rigT(), getR(trt));
        setP(rigTarget("head"), getP(th2)); setR(rigTarget("head"), getR(th2));
        var tl = tr(pg.target.field("leftHandTransform").value), trh = tr(pg.target.field("rightHandTransform").value);
        setP(rigTarget("leftHand"), getP(tl)); setR(rigTarget("leftHand"), getR(tl));
        setP(rigTarget("rightHand"), getP(trh)); setR(rigTarget("rightHand"), getR(trh));
        return;
    }
    if (p.playerGun === "Vomit") {   // J0ker VomitGun
        G.localRig.method("set_enabled").invoke(false); pg.moved = true;
        setP(rigT(), tpos); setR(rigT(), getR(tr(pg.target)));
        if (now - lastSplash > 300) {
            lastSplash = now;
            var hh = rigTarget("head");
            sendRPC("RPC_PlaySplashEffect", [hh.method("get_position").invoke(), hh.method("get_rotation").invoke(), { f: 1.0 }, { f: 0.5 }, { b: true }, { b: false }]);
        }
        return;
    }
    G.localRig.method("set_enabled").invoke(false); pg.moved = true;
    var rt = rigT();
    if (p.playerGun === "Orbit") {
        var ang = now / 1000 * 4.5;
        setP(rt, add3(tpos, [Math.cos(ang), 0.5, Math.sin(ang)]));
        setR(rt, lookRot(sub3(tpos, getP(rt))));
        var rp = getP(rt), rr = rightOf(rt), rrot = getR(rt);
        setP(rigTarget("leftHand"), add3(rp, mul3(rr, -1))); setP(rigTarget("rightHand"), add3(rp, rr));
        setR(rigTarget("head"), rrot); setR(rigTarget("leftHand"), rrot); setR(rigTarget("rightHand"), rrot);
    } else {   // Follow: the rig flies over to them and hovers at their side
        var goal = add3(tpos, [0, 0.3, 0]), rp2 = getP(rt), d = sub3(goal, rp2), L = len3(d);
        if (L > 0.6) setP(rt, add3(rp2, mul3(norm3(d), Math.min(L - 0.5, 6 * dt))));
        var face = flatNorm(sub3(tpos, getP(rt)));
        if (len3(face) > 0.01) setR(rt, lookRot(face));
        var rp3 = getP(rt), rrot3 = getR(rt), rf = fwdOf(rt), rr3 = rightOf(rt);
        setR(rigTarget("head"), rrot3);
        setP(rigTarget("leftHand"), add3(add3(rp3, mul3(rf, 0.3)), mul3(rr3, -0.2))); setP(rigTarget("rightHand"), add3(add3(rp3, mul3(rf, 0.3)), mul3(rr3, 0.2)));
        setR(rigTarget("leftHand"), rrot3); setR(rigTarget("rightHand"), rrot3);
    }
}

// ------------------------------------------------------------------------------------------
// player ports: tap volume, flip hands, auto clicker
// ------------------------------------------------------------------------------------------
function portPlayerStep(now) {
    if (p.tapVol !== (port.tapMode || "Normal")) {
        if (port.tapBase === undefined) port.tapBase = G.tagger.field("handTapVolume").value;
        G.tagger.field("handTapVolume").value = p.tapVol === "Loud" ? 99999 : (p.tapVol === "Silent" ? 0 : port.tapBase);
        port.tapMode = p.tapVol;
    }
    if (p.flipHands) {
        var lp = pos3(G.leftHand), rp = pos3(G.rightHand), lr = getR(tr(G.leftHand)), rr = getR(tr(G.rightHand));
        var cl = ctrlT(true), cr = ctrlT(false);
        setP(cr, lp); setP(cl, rp); setR(cr, lr); setR(cl, rr);
    }
    if (p.autoClick) {
        port.click = !port.click;
        var cp = cs().class("ControllerInputPoller").field("instance").value, v = port.click ? 1 : 0;
        if (input.trigger(0) > 0.5) { cp.field("leftControllerIndexFloat").value = v; var lm = G.localRig.field("leftHand").value; lm.field("calcT").value = v; lm.method("MapMyFinger").invoke(1); }
        if (input.trigger(1) > 0.5) { cp.field("rightControllerIndexFloat").value = v; var rm = G.localRig.field("rightHand").value; rm.field("calcT").value = v; rm.method("MapMyFinger").invoke(1); }
    }
}

// ------------------------------------------------------------------------------------------
// extra esp: hollow boxes, beacons, breadcrumbs, jump + hitbox predictions, bone esp, voice esp
// ------------------------------------------------------------------------------------------
var ex = { hollow: {}, beacon: {}, trail: {}, jump: {}, hit: {}, voice: {}, live: false };
function exObj(map, key, make) { var o = map[key]; if (!o) { o = make(); map[key] = o; } return o; }
function exPrune(map, seen, kill) {
    for (var k in map) if (!seen[k]) { try { kill(map[k]); } catch (e) {} delete map[k]; }
}
function killEsp(o) { destroyNow(o.go); }
function mkHollow(mat) { var ls = []; for (var i = 0; i < 4; i++) ls.push(mkEspObj(mat)); return { lines: ls }; }
function killHollow(h) { for (var i = 0; i < h.lines.length; i++) destroyNow(h.lines[i].go); }
function mkTrail(r, mat) {
    var go = newGO("GTTrail");
    var ht = r.field("head").value.field("rigTarget").value;
    tr(go).method("SetParent", 2).invoke(ht, false);
    tr(go).method("set_localPosition").invoke([0, 0, 0]);
    var tl = addComp(go, core().class("UnityEngine.TrailRenderer"));
    tl.method("set_time").invoke(5.0);
    tl.method("set_minVertexDistance").invoke(0.05);
    tl.method("set_startWidth").invoke(0.025); tl.method("set_endWidth").invoke(0.01);
    if (mat) tl.method("set_sharedMaterial").invoke(mat);
    return { go: go, tl: tl, mat: mat };
}
function mkArc(mat) {
    var go = newGO("GTArc");
    var lr = addComp(go, core().class("UnityEngine.LineRenderer"));
    lr.method("set_useWorldSpace").invoke(true);
    lr.method("set_positionCount").invoke(12);
    lr.method("set_startWidth").invoke(0.02); lr.method("set_endWidth").invoke(0.02);
    if (mat) lr.method("set_sharedMaterial").invoke(mat);
    return { go: go, lr: lr, mat: mat, at: 0 };
}
function trailColor(o, mat) { if (mat && o.mat !== mat) { try { o.tl.method("set_sharedMaterial").invoke(mat); } catch (e) {} o.mat = mat; } }
function arcColor(o, mat) { if (mat && o.mat !== mat) { try { o.lr.method("set_sharedMaterial").invoke(mat); } catch (e) {} o.mat = mat; } }
function bonesSet(r, on, col) {
    var key = r.handle.toString();
    var sk = r.field("skeleton").value;
    if (!sk || sk.isNull()) return;
    var rend = sk.field("renderer").value;
    if (!rend || rend.isNull()) return;
    if (on) {
        if (!port.bones[key]) {
            if (!guiShader) guiShader = core().class("UnityEngine.Shader").method("Find").invoke(Il2Cpp.string("GUI/Text Shader"));
            var mat = rend.method("get_material").invoke();
            port.bones[key] = { sk: sk, rend: rend, mat: mat, shader: mat.method("get_shader").invoke(), en: !!sk.method("get_enabled").invoke(), ren: !!rend.method("get_enabled").invoke() };
            mat.method("set_shader").invoke(guiShader);
            sk.method("set_enabled").invoke(true); rend.method("set_enabled").invoke(true);
        }
        port.bones[key].mat.method("set_color").invoke(col);
    } else if (port.bones[key]) {
        var b = port.bones[key]; delete port.bones[key];
        try { b.mat.method("set_shader").invoke(b.shader); b.sk.method("set_enabled").invoke(b.en); b.rend.method("set_enabled").invoke(b.ren); } catch (e) {}
    }
}
function bonesClear() { for (var k in port.bones) { var b = port.bones[k]; try { b.mat.method("set_shader").invoke(b.shader); b.sk.method("set_enabled").invoke(b.en); b.rend.method("set_enabled").invoke(b.ren); } catch (e) {} } port.bones = {}; }
function exClear() {
    exPrune(ex.hollow, {}, killHollow); exPrune(ex.beacon, {}, killEsp); exPrune(ex.trail, {}, killEsp);
    exPrune(ex.jump, {}, killEsp); exPrune(ex.hit, {}, killEsp); exPrune(ex.voice, {}, killEsp);
    bonesClear();
    ex.live = false;
}
function espExtraStep(now, dt) {
    var any = p.espHollow || p.espBeacons || p.espTrails || p.espJump || p.espHitbox || p.espBones || p.voiceEsp;
    if (!any) { if (ex.live) exClear(); return; }
    ex.live = true;
    espInit();
    var rigs = otherRigs(), ctx = espCtx(), head = pos3(G.tagger.field("headCollider").value);
    var seen = { hollow: {}, beacon: {}, trail: {}, jump: {}, hit: {}, voice: {} };
    for (var i = 0; i < rigs.length && i < 12; i++) {
        var r = rigs[i], key = r.handle.toString();
        var es = espShow(r, ctx);
        if (p.espBones) bonesSet(r, true, palCol(es.inf ? p.espInfColor : p.espColor, 1));
        if (!es.show) continue;
        var bpos = rigPos(r);
        var line = es.inf ? espMats.lineInfected : espMats.lineNormal, soft = es.inf ? espMats.softInfected : espMats.softNormal;

        if (p.espHollow) {
            seen.hollow[key] = 1;
            var hb = exObj(ex.hollow, key, function () { return mkHollow(line); });
            var toHead = norm3(sub3(head, bpos)), rgt = norm3(cross3([0, 1, 0], toHead)), up = norm3(cross3(toHead, rgt));
            if (len3(rgt) < 0.01) rgt = [1, 0, 0];
            var c = [add3(add3(bpos, mul3(rgt, -0.25)), mul3(up, 0.3)), add3(add3(bpos, mul3(rgt, 0.25)), mul3(up, 0.3)),
                     add3(add3(bpos, mul3(rgt, 0.25)), mul3(up, -0.3)), add3(add3(bpos, mul3(rgt, -0.25)), mul3(up, -0.3))];
            for (var e = 0; e < 4; e++) { espMatFor(hb.lines[e], line); setLine(hb.lines[e], c[e], c[(e + 1) % 4]); setActive(hb.lines[e], true); }
        }
        if (p.espBeacons) {
            seen.beacon[key] = 1;
            var bc = exObj(ex.beacon, key, function () { return mkEspObj(line); });
            espMatFor(bc, line); setLine(bc, sub3(bpos, [0, 60, 0]), add3(bpos, [0, 60, 0])); setActive(bc, true);
        }
        if (p.espTrails) {
            seen.trail[key] = 1;
            var tl = exObj(ex.trail, key, function () { return mkTrail(r, soft); });
            trailColor(tl, soft);
        }
        if (p.espJump || p.espHitbox) {
            var v = opt(function () { return X(r.method("LatestVelocity").invoke()); }, [0, 0, 0]), spd = len3(v);
            if (p.espJump) {
                seen.jump[key] = 1;
                var arc = exObj(ex.jump, key, function () { return mkArc(line); });
                arcColor(arc, line);
                if (spd < 1.5) arc.lr.method("set_enabled").invoke(false);
                else if (now - arc.at > 50) {
                    arc.at = now;
                    arc.lr.method("set_enabled").invoke(true);
                    var pp = opt(function () { return X(r.method("get_syncPos").invoke()); }, bpos), pv = v.slice();
                    for (var k = 0; k < 12; k++) {
                        arc.lr.method("SetPosition").invoke(k, pp);
                        pp = add3(pp, mul3(pv, 0.08)); pv = add3(pv, [0, -9.81 * 0.08, 0]);
                    }
                }
            }
            if (p.espHitbox) {
                seen.hit[key] = 1;
                var hx = exObj(ex.hit, key, function () { return mkEspObj(soft, 1); });
                espMatFor(hx, soft);
                if (spd > 1) {
                    tr(hx.go).method("set_position").invoke(add3(bpos, mul3(v, 0.5)));
                    tr(hx.go).method("set_localScale").invoke([0.4, 0.45, 0.4]);
                    setActive(hx, true);
                } else setActive(hx, false);
            }
        }
        if (p.voiceEsp) {
            var loud = opt(function () { return Number(r.field("mySpeakerLoudness").value.field("loudness").value); }, 0);
            var size = clamp(loud * 3, 0, 0.5);
            if (size > 0.03) {
                seen.voice[key] = 1;
                var vo = exObj(ex.voice, key, function () { return mkEspObj(soft, 0); });
                espMatFor(vo, soft);
                tr(vo.go).method("set_position").invoke(add3(rigPart(r, "head"), [0, 0.3, 0]));
                tr(vo.go).method("set_localScale").invoke([size, size, size]);
                setActive(vo, true);
            }
        }
    }
    exPrune(ex.hollow, seen.hollow, killHollow); exPrune(ex.beacon, seen.beacon, killEsp); exPrune(ex.trail, seen.trail, killEsp);
    exPrune(ex.jump, seen.jump, killEsp); exPrune(ex.hit, seen.hit, killEsp); exPrune(ex.voice, seen.voice, killEsp);
    if (!p.espBones && Object.keys(port.bones).length) bonesClear();
    else if (p.espBones) { var live = {}; for (var j = 0; j < rigs.length; j++) live[rigs[j].handle.toString()] = 1; for (var bk in port.bones) if (!live[bk]) delete port.bones[bk]; }
}

// ---- x-ray: hide every scene renderer while the button is held ----
var xr = { off: [], held: false };
function xrayStep() {
    var want = p.xray && btnHeld(p.xrayBtn);
    if (want === xr.held) return;
    xr.held = want;
    if (want) {
        var arr = findObjs(G.Renderer);
        if (!arr) return;
        xr.off = [];
        for (var i = 0; i < arr.length; i++) {
            var rd = arr.get(i);
            try {
                if (rd.class.name === "SkinnedMeshRenderer") continue;
                if (!rd.method("get_enabled").invoke()) continue;
                var m = rd.method("get_sharedMaterial").invoke();
                if (m && !m.isNull() && Number(m.method("get_renderQueue").invoke()) >= 4000) continue;   // our own esp objects
                rd.method("set_enabled").invoke(false);
                xr.off.push(rd);
            } catch (e) {}
        }
        log("x-ray: hid " + xr.off.length + " renderers");
    } else xrayRestore();
}
function xrayRestore() {
    for (var i = 0; i < xr.off.length; i++) { try { xr.off[i].method("set_enabled").invoke(true); } catch (e) {} }
    xr.off = []; xr.held = false;
}

// ------------------------------------------------------------------------------------------
// world + misc ports: time of day, fullbright, smooth rig, no rig lerp, rope reach
// ------------------------------------------------------------------------------------------
var TOD = { "Morning": 1, "Day": 3, "Evening": 7, "Night": 0 };
function portWorldStep(now) {
    if (p.timeOfDay !== (port.tod || "Game")) {
        var m = cs().class("BetterDayNightManager").field("instance").value;
        if (p.timeOfDay === "Game") { try { m.method("SetOverrideIndex").invoke(-1); } catch (e) {} }
        else m.method("SetTimeOfDay").invoke(TOD[p.timeOfDay], true);
        port.tod = p.timeOfDay;
    }
    if (!!p.fullbright !== !!port.fullbright) {
        var lm = cs().class("GameLightingManager").field("instance").value;
        if (lm && !lm.isNull()) {
            if (p.fullbright) { port.fbPrev = !!lm.field("customVertexLightingEnabled").value; lm.method("SetCustomDynamicLightingEnabled").invoke(false); }
            else if (port.fbPrev) lm.method("SetCustomDynamicLightingEnabled").invoke(true);
        }
        port.fullbright = !!p.fullbright;
    }
    if (!!p.smoothRig !== !!port.smooth) {
        var PN = photonNet();
        if (p.smoothRig) { port.serRate = Number(PN.method("get_SerializationRate").invoke()); PN.method("set_SerializationRate").invoke(30); }
        else if (port.serRate) PN.method("set_SerializationRate").invoke(port.serRate);
        port.smooth = !!p.smoothRig;
    }
    if (p.noRigLerp) {
        if (now - (port.lerpAt || 0) > 1000) {
            port.lerpAt = now;
            var rigs = otherRigs();
            for (var i = 0; i < rigs.length; i++) {
                var r = rigs[i], k = r.handle.toString();
                if (!port.lerpOrig[k]) port.lerpOrig[k] = { r: r, b: r.field("lerpValueBody").value, f: r.field("lerpValueFingers").value };
                r.field("lerpValueBody").value = 2; r.field("lerpValueFingers").value = 1;
            }
        }
    } else if (Object.keys(port.lerpOrig).length) lerpRestore();
    if (!!p.ropeReach !== !!port.rope) {
        var ei = cs().class("EquipmentInteractor").field("instance").value;
        if (ei && !ei.isNull()) {
            ["leftClimber", "rightClimber"].forEach(function (n) {
                var cl = ei.field(n).value; if (!cl || cl.isNull()) return;
                var col = asRuntime(cl.field("col").value); if (!col) return;
                if (p.ropeReach) { if (port.ropeOrig === undefined) port.ropeOrig = col.method("get_radius").invoke(); col.method("set_radius").invoke(0.5); }
                else if (port.ropeOrig !== undefined) col.method("set_radius").invoke(port.ropeOrig);
            });
        }
        port.rope = !!p.ropeReach;
    }
}
function lerpRestore() {
    for (var k in port.lerpOrig) { var o = port.lerpOrig[k]; try { o.r.field("lerpValueBody").value = o.b; o.r.field("lerpValueFingers").value = o.f; } catch (e) {} }
    port.lerpOrig = {};
}

// ---- hand labels: your speed + distance to the nearest player on the other side ----
var hl = { tag: null, at: 0 };
function handLabelStep(now) {
    if (!p.handLabels) { if (hl.tag) { destroyNow(hl.tag.go); hl.tag = null; } return; }
    if (!hl.tag) hl.tag = mkTag(G.localRig.field("playerText1").value);
    var lt = tr(G.leftHand), at = add3(pos3(G.leftHand), mul3(upOf(lt), 0.08));
    tr(hl.tag.go).method("set_position").invoke(at);
    tr(hl.tag.go).method("set_rotation").invoke(lookRot(sub3(at, pos3(G.tagger.field("headCollider").value))));
    if (now - hl.at < 100) return;
    hl.at = now;
    var spd = len3(vel());
    var txt = spd.toFixed(1) + " m/s";
    var ctx = espCtx(), rigs = otherRigs(), head = pos3(G.tagger.field("headCollider").value), best = Infinity;
    for (var i = 0; i < rigs.length; i++) {
        var es = espShow(rigs[i], ctx);
        var other = ctx.tag ? (es.inf !== ctx.meInf) : true;
        if (!other) continue;
        var d = len3(sub3(rigPos(rigs[i]), head));
        if (d < best) best = d;
    }
    if (best < Infinity) txt += "\n" + best.toFixed(1) + "m " + (ctx.tag ? (ctx.meInf ? "to a runner" : "to a tagger") : "to nearest");
    if (txt !== hl.tag.txt) { hl.tag.tmp.method("set_text").invoke(Il2Cpp.string(txt)); hl.tag.txt = txt; }
    hl.tag.tmp.method("set_fontSize").invoke(1.2);
    hl.tag.tmp.method("set_color").invoke(spd >= (G.player.field("maxJumpSpeed").value || 6.5) ? [0.4, 1, 0.5, 1] : [1, 1, 1, 1]);
}

// ---- put everything from this block back ----
function portClear() {
    grappleClear(); pearlClear(); exClear(); pgClear(); xrayRestore(); lerpRestore();
    if (port.swim) { destroyNow(port.swim); port.swim = null; }
    if (hl.tag) { destroyNow(hl.tag.go); hl.tag = null; }
    if (port.bouncyOn) { try { bouncySet(false); } catch (e) {} }
    for (var n in port.colOff) if (port.colOff[n]) { try { G.tagger.field(n).value.method("set_enabled").invoke(true); } catch (e) {} }
    port.colOff = {};
    if (port.tapBase !== undefined && port.tapMode && port.tapMode !== "Normal") { try { G.tagger.field("handTapVolume").value = port.tapBase; } catch (e) {} }
    port.tapMode = "Normal";
    if (port.fullbright && port.fbPrev) { try { cs().class("GameLightingManager").field("instance").value.method("SetCustomDynamicLightingEnabled").invoke(true); } catch (e) {} }
    port.fullbright = false;
    if (port.smooth && port.serRate) { try { photonNet().method("set_SerializationRate").invoke(port.serRate); } catch (e) {} }
    port.smooth = false;
    if (port.rope && port.ropeOrig !== undefined) {
        try {
            var ei = cs().class("EquipmentInteractor").field("instance").value;
            ["leftClimber", "rightClimber"].forEach(function (n) { var col = asRuntime(ei.field(n).value.field("col").value); if (col) col.method("set_radius").invoke(port.ropeOrig); });
        } catch (e) {}
    }
    port.rope = false;
    port.ghost = null; port.stillPos = null; port.lj = null; port.wallHit = null; port.driveDir = null;
}

// ------------------------------------------------------------------------------------------
// v3.2 batch 2: more Seralyth / hamburbur ports (auto climb, auto walk, arm styles, noclip fly,
// safety bubble, solid players, throw controllers, game speed, color fx, creature esp, tagger ping,
// blindfold, near clip, fps cap, room code)
// ------------------------------------------------------------------------------------------
var lastDt = 0.016;
var p2 = { solid: {}, thrown: {}, creatures: [], nc: false, ts: 1, fps: "Game", color: "Off", lavaAt: 0, blindAt: 0, creatAt: 0 };

function setHandPos(left, v) { tr(left ? G.leftHand : G.rightHand).method("set_position").invoke(v); }
function headBasis() { var h = headT(); return { p: getP(h), f: fwdOf(h), r: rightOf(h), u: upOf(h) }; }

function autoClimbStep(now) {
    if (p.autoClimb === "Off" || !input.grip(1)) return;
    var t = now / 1000 * 30, h = headBasis();
    var swing = 0.4 + Math.cos(t) * 0.4, lift = Math.sin(t) * 0.6;
    setHandPos(false, add3(add3(add3(h.p, mul3(h.r, swing)), mul3(h.u, lift)), mul3(h.f, 0.75)));
    if (p.autoClimb === "Pinch Climb") setHandPos(true, add3(add3(add3(h.p, mul3(h.r, -swing)), mul3(h.u, lift)), mul3(h.f, 0.75)));
}
function autoWalkStep(now) {
    if (!p.autoWalk) return;
    var joy = input.stick(0);
    if (Math.abs(joy[0]) < 0.05 && Math.abs(joy[1]) < 0.05) return;
    var speed = input.stickClick(0) ? 13.5 : 9, T = now / 1000 * speed, arm = 0.45;
    var bt = bodyT(), bp = getP(bt), bf = fwdOf(bt), br = rightOf(bt), s = Math.sin(T), c = Math.cos(T);
    setHandPos(true, add3(add3(add3(bp, mul3(bf, s * joy[1] * arm)), mul3(br, s * joy[0] * arm - 0.2)), [0, -0.3 + c * 0.2, 0]));
    setHandPos(false, add3(add3(add3(bp, mul3(bf, -s * joy[1] * arm)), mul3(br, -s * joy[0] * arm + 0.2)), [0, -0.3 - c * 0.2, 0]));
}
function axisFlyStep(dt) {
    var t = input.trigger(1) > 0.5, g = input.grip(1);
    if (!(t || g)) return;
    var bt = bodyT();
    if (p.leftRight) {
        addForce([0, 9.81, 0], FM.accel);
        var r = rightOf(bt);
        if (t) setVel(add3(vel(), mul3(r, dt * p.flySpeed * -3)));
        if (g) setVel(add3(vel(), mul3(r, dt * p.flySpeed * 3)));
    }
    if (p.fwdBack) {
        addForce([0, 9.81, 0], FM.accel);
        var f = fwdOf(bt);
        if (t) setVel(add3(vel(), mul3(f, dt * p.flySpeed * 3)));
        if (g) setVel(add3(vel(), mul3(f, dt * p.flySpeed * -3)));
    }
}
function armStyleStep() {
    if (p.armStyle === "Normal") return;
    var hp = pos3(G.tagger.field("headCollider").value), s = p.longArmSize;
    [true, false].forEach(function (left) {
        var ct = ctrlT(left);
        if (p.armStyle === "Velocity") { setP(ct, add3(getP(ct), mul3(handVel(left), p.velArmPow))); return; }
        var d = sub3(hp, pos3(left ? G.leftHand : G.rightHand));
        if (p.armStyle === "Vertical") d = [d[0], d[1] * s, d[2]];
        else d = [d[0] * s, d[1], d[2] * s];
        setP(ct, sub3(hp, d));
    });
}
function noclipFlyStep(dt) {
    var on = p.noclipFly && btnHeld(p.noclipFlyBtn);
    if (on) {
        if (!p2.ncOn) { setColliders(false); p2.ncOn = true; }
        p2.ncDir = fwdOf(headT());
        tr(G.player).method("set_position").invoke(add3(pos3(G.player), mul3(p2.ncDir, p.flySpeed * dt)));
        setVel([0, 0, 0]);
    } else if (p2.ncOn) {
        setColliders(true); p2.ncOn = false;
        if (p2.ncDir) setVel(mul3(p2.ncDir, p.flySpeed));
    }
}
function safetyBubbleStep() {
    if (!p.safetyBubble) return;
    var me = bodyPos(), rigs = otherRigs(), best = null, bd = 2;
    for (var i = 0; i < rigs.length; i++) { var d = len3(sub3(rigPos(rigs[i]), me)); if (d < bd) { bd = d; best = rigs[i]; } }
    if (!best) return;
    var dir = flatNorm(sub3(me, rigPos(best)));
    if (len3(dir) < 0.01) dir = [1, 0, 0];
    teleportTo(add3(me, mul3(dir, 2)));
}
// ---- solid players: hidden cubes with colliders on every other rig ----
function mkSolid(scale) {
    var go = G.GameObject.method("CreatePrimitive").invoke(3);
    try { getComp(go, G.Renderer).method("set_enabled").invoke(false); } catch (e) {}
    tr(go).method("set_localScale").invoke(scale);
    return go;
}
function solidStep() {
    if (!p.solidPlayers) { if (Object.keys(p2.solid).length) solidClear(); return; }
    var rigs = otherRigs(), seen = {};
    for (var i = 0; i < rigs.length && i < 12; i++) {
        var r = rigs[i], key = r.handle.toString();
        seen[key] = 1;
        var s = p2.solid[key];
        if (!s) s = p2.solid[key] = { body: mkSolid([0.3, 0.55, 0.3]), head: mkSolid([0.25, 0.25, 0.25]), lh: mkSolid([0.15, 0.15, 0.15]), rh: mkSolid([0.15, 0.15, 0.15]) };
        var hp = rigPart(r, "head");
        var bt = tr(s.body);
        bt.method("set_position").invoke(sub3(hp, [0, 0.12, 0]));
        bt.method("set_rotation").invoke(getR(rigT()));
        tr(s.head).method("set_position").invoke(hp);
        tr(s.lh).method("set_position").invoke(rigPart(r, "leftHand"));
        tr(s.rh).method("set_position").invoke(rigPart(r, "rightHand"));
    }
    for (var k in p2.solid) if (!seen[k]) { solidKill(p2.solid[k]); delete p2.solid[k]; }
}
function solidKill(s) { destroyNow(s.body); destroyNow(s.head); destroyNow(s.lh); destroyNow(s.rh); }
function solidClear() { for (var k in p2.solid) solidKill(p2.solid[k]); p2.solid = {}; }
// ---- throw controllers ----
function throwHand(left) {
    var key = left ? "L" : "R", held = input.primary(left ? 0 : 1), ct = ctrlT(left);
    if (held) {
        var t = p2.thrown[key];
        if (!t) {
            var go = G.GameObject.method("CreatePrimitive").invoke(3);
            try { getComp(go, G.Renderer).method("set_enabled").invoke(false); } catch (e) {}
            try { if (G.Collider) destroyNow(getComp(go, G.Collider)); } catch (e) {}
            tr(go).method("set_position").invoke(getP(ct)); tr(go).method("set_rotation").invoke(getR(ct));
            var rb = addComp(go, physics().class("UnityEngine.Rigidbody"));
            rb.method("set_velocity").invoke(handVel(left));
            rb.method("set_angularVelocity").invoke([Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 6 - 3]);
            p2.thrown[key] = t = { go: go };
        }
        setP(ct, getP(tr(t.go))); setR(ct, getR(tr(t.go)));
    } else if (p2.thrown[key]) { destroyNow(p2.thrown[key].go); delete p2.thrown[key]; }
}
function throwClear() { for (var k in p2.thrown) destroyNow(p2.thrown[k].go); p2.thrown = {}; }
// Time.set_timeScale is stripped from the managed side in this build, so the engine's icall is called directly
function timeScaleFn() {
    if (p2.tsFn !== undefined) return p2.tsFn;
    p2.tsFn = null;
    try {
        var exp = findExport("libil2cpp.so", "il2cpp_resolve_icall");
        if (!exp) throw new Error("il2cpp_resolve_icall export not found");
        var resolve = new NativeFunction(exp, "pointer", ["pointer"]);
        var addr = resolve(Memory.allocUtf8String("UnityEngine.Time::set_timeScale"));
        if (!addr.isNull()) p2.tsFn = new NativeFunction(addr, "void", ["float"]);
    } catch (e) { log("game speed: " + e); }
    if (!p2.tsFn) log("game speed: Time.set_timeScale icall not found, the slider does nothing");
    return p2.tsFn;
}
function setTimeScale(v) { var fn = timeScaleFn(); if (fn) fn(v); }
function gameSpeedStep() {
    var want = p.gameSpeed || 1;
    if (Math.abs(want - p2.ts) < 0.001) return;
    setTimeScale(want);
    try { G.player.field("debugMovement").value = Math.abs(want - 1) > 0.001; } catch (e) {}
    p2.ts = want;
}
// ---- colour effects (flash / strobe), real colour restored when turned off ----
function setMyColor(r, g, b) {
    G.tagger.method("UpdateColor").invoke(r, g, b);
    G.localRig.method("InitializeNoobMaterialLocal").invoke(r, g, b);
}
function colorFxStep(now) {
    if (p.colorFx === "Off") {
        if (p2.color !== "Off") { if (p2.origColor) setMyColor(p2.origColor[0], p2.origColor[1], p2.origColor[2]); p2.color = "Off"; }
        return;
    }
    if (p2.color === "Off") {
        var c = G.localRig.field("playerColor").value;
        p2.origColor = [c.field("r").value, c.field("g").value, c.field("b").value];
    }
    p2.color = p.colorFx;
    if (now - (p2.colorAt || 0) < 50) return;
    p2.colorAt = now;
    if (p.colorFx === "Flash") { p2.flash = !p2.flash; var v = p2.flash ? 1 : 0; setMyColor(v, v, v); }
    else setMyColor(Math.random(), Math.random(), Math.random());
}
// ---- creature esp: bugs, bats, fireflies ----
function creatureStep(now) {
    if (!p.creatureEsp) { if (p2.creatures.length) creatureClear(); return; }
    if (now - p2.creatAt < 150) return;
    p2.creatAt = now;
    espInit();
    var arr = findObjs(cs().class("ThrowableBug"));
    var n = arr ? Math.min(arr.length, 16) : 0;
    for (var i = 0; i < 16; i++) {
        if (i < n) {
            var bug = arr.get(i);
            if (!p2.creatures[i]) p2.creatures[i] = mkEspObj(espMats.softNormal, 0);
            var o = p2.creatures[i];
            espMatFor(o, espMats.softNormal);
            tr(o.go).method("set_position").invoke(pos3(bug));
            tr(o.go).method("set_localScale").invoke([0.25, 0.25, 0.25]);
            setActive(o, true);
        } else if (p2.creatures[i]) setActive(p2.creatures[i], false);
    }
}
function creatureClear() { for (var i = 0; i < p2.creatures.length; i++) if (p2.creatures[i]) destroyNow(p2.creatures[i].go); p2.creatures = []; }
// ---- tagger ping ----
function lavaPingStep(now) {
    if (!p.lavaPing || now - p2.lavaAt < 2500) return;
    var ctx = espCtx();
    if (!ctx.tag || ctx.meInf) return;
    var rigs = otherRigs(), me = bodyPos(), best = Infinity;
    for (var i = 0; i < rigs.length; i++) {
        if (!isInfected(ctx.tag, rigNet(rigs[i]))) continue;
        var d = len3(sub3(rigPos(rigs[i]), me));
        if (d < best) best = d;
    }
    if (best <= p.lavaDist) { p2.lavaAt = now; notify("tagger " + best.toFixed(1) + "m away", 2, best <= p.lavaDist / 3 ? "error" : "warning", "Tagger Nearby"); }
}
function blindfoldStep(now) {
    if (!p.noBlindfold || now - p2.blindAt < 500) return;
    p2.blindAt = now;
    var cam = G.player.field("mainCamera").value;
    if (!cam || cam.isNull()) return;
    var ct = tr(cam), n = ct.method("get_childCount").invoke();
    for (var i = n - 1; i >= 0; i--) {
        var ch = ct.method("GetChild").invoke(i).method("get_gameObject").invoke();
        if (str(ch.method("get_name").invoke()).indexOf("Blindfold") >= 0) destroyNow(ch);
    }
}
function nearClipStep() {
    if (!!p.nearClip === p2.nc) return;
    var cam = core().class("UnityEngine.Camera").method("get_main").invoke();
    if (!cam || cam.isNull()) return;
    if (p.nearClip) { p2.ncOrig = cam.method("get_nearClipPlane").invoke(); cam.method("set_nearClipPlane").invoke(0.1); }
    else if (p2.ncOrig !== undefined) cam.method("set_nearClipPlane").invoke(p2.ncOrig);
    p2.nc = !!p.nearClip;
}
function fpsCapStep() {
    if (p.fpsCap === p2.fps) return;
    var A = core().class("UnityEngine.Application");
    if (p2.fpsOrig === undefined) p2.fpsOrig = Number(A.method("get_targetFrameRate").invoke());
    var v = p.fpsCap === "Game" ? p2.fpsOrig : (p.fpsCap === "Unlocked" ? -1 : parseInt(p.fpsCap, 10));
    A.method("set_targetFrameRate").invoke(v);
    p2.fps = p.fpsCap;
}
// ---- rooms ----
function pnc() { return cs().class("GorillaNetworking.PhotonNetworkController").field("Instance").value; }
function joinRoomCode() {
    var code = String(p.roomCode || "").trim().toUpperCase();
    if (!code) { notify("Type a room code first"); return; }
    pnc().method("AttemptToJoinSpecificRoom").invoke(Il2Cpp.string(code), 0);
    notify("Joining " + code);
}
function rejoinLast() {
    if (!port.lastRoom) { notify("No room remembered yet"); return; }
    pnc().method("AttemptToJoinSpecificRoom").invoke(Il2Cpp.string(port.lastRoom), 0);
    notify("Rejoining " + port.lastRoom);
}

function port2Step(dt, now) {
    autoClimbStep(now);
    autoWalkStep(now);
    axisFlyStep(dt);
    armStyleStep();
    noclipFlyStep(dt);
    safetyBubbleStep();
    solidStep();
    if (p.throwCtrl) { throwHand(true); throwHand(false); } else if (Object.keys(p2.thrown).length) throwClear();
    gameSpeedStep();
    colorFxStep(now);
    creatureStep(now);
    lavaPingStep(now);
    blindfoldStep(now);
    nearClipStep();
    fpsCapStep();
}
function port2Clear() {
    solidClear(); throwClear(); creatureClear();
    if (p2.ncOn) { try { setColliders(true); } catch (e) {} p2.ncOn = false; }
    if (Math.abs(p2.ts - 1) > 0.001) { try { setTimeScale(1); G.player.field("debugMovement").value = false; } catch (e) {} p2.ts = 1; }
    if (p2.color !== "Off" && p2.origColor) { try { setMyColor(p2.origColor[0], p2.origColor[1], p2.origColor[2]); } catch (e) {} p2.color = "Off"; }
    if (p2.nc && p2.ncOrig !== undefined) { try { core().class("UnityEngine.Camera").method("get_main").invoke().method("set_nearClipPlane").invoke(p2.ncOrig); } catch (e) {} p2.nc = false; }
    if (p2.fps !== "Game" && p2.fpsOrig !== undefined) { try { core().class("UnityEngine.Application").method("set_targetFrameRate").invoke(p2.fpsOrig); } catch (e) {} p2.fps = "Game"; }
}

// ------------------------------------------------------------------------------------------
// v3.2 batch 3: J0ker Client ports. Throwable visibility, effects, master-only spawns, critters,
// paintbrawl helpers, party bracelet, guardian, cosmetics extras. Kick / lag / destroy mods left out.
// ------------------------------------------------------------------------------------------
var jk = { holdAt: 0, impactAt: 0, rockAt: 0, pbAt: 0, pbFire: false, spawnAt: 0, bugs: null, bugsAt: 0, bat: null, ride: false, bugSpeed: "Game", prevTrig: false };
// the anchor each throwable lives under (J0ker's EnableAllProjs list)
var ANCHOR = {
    "LMAVR. RIGHT.": "GrowingSnowballRightAnchor(Clone)", "LMACF. RIGHT.": "SnowballRightAnchor(Clone)", "LMAEY. RIGHT.": "WaterBalloonRightAnchor(Clone)",
    "LMAMO. RIGHT.": "TrickTreatFunctionalAnchorRIGHT Variant(Clone)", "LMAMV.": "AppleRightAnchor(Clone)", "LMAIF. RIGHT.": "ScienceCandyRightAnchor(Clone)",
    "LMAHR. RIGHT.": "BucketGiftFunctionalAnchor_Right(Clone)", "LMAMT. RIGHT.": "VotingRockAnchor_RIGHT(Clone)", "LMAIP. RIGHT.": "FishFoodRightAnchor(Clone)",
    "LMAGE. RIGHT.": "LavaRockAnchor(Clone)", "LMAQA. RIGHT.": "BookRightAnchor(Clone)", "LMAQC.": "CoinRightAnchor(Clone)", "LMAPS. RIGHT.": "EggRightHand_Anchor Variant(Clone)",
    "LMARA. LEFT.": "IceCreamRightAnchor(Clone)", "LMARC.": "HotDogRightAnchor(Clone)", "LMAQU. LEFT.": "Fireworks_Anchor Variant_Right Hand(Clone)",
    "LMAUC. RIGHT.": "ChipsRightAnchor(Clone)", "LMAUD. RIGHT.": "SalsaRightAnchor(Clone)", "LMAUJ. RIGHT.": "ApplePieRightAnchor(Clone)",
    "LMAUH. RIGHT.": "GrowingMashedPotatoRightAnchor(Clone)", "LMAUL. RIGHT.": "BerryPieRightAnchor(Clone)", "LMAUF. RIGHT.": "LayerDipRightAnchor(Clone)",
    "LMAUN.": "PumpkinPieRightAnchor(Clone)", "LMAUP. RIGHT.": "GrowingStuffingRightAnchor(Clone)", "LMAUT. RIGHT.": "CornRightAnchor(Clone)",
    "LMAUR. RIGHT.": "TurkeyLegRightAnchor(Clone)", "LMATL.": "GoalpostFootball_Anchor_RightHand(Clone)", "LMATP.": "PopcornBall_Anchor_Right(Clone)",
    "LMAUA.": "CrackedPlate_Lump_Projectile_Anchor_RIGHT(Clone)", "LMATY.": "PortableBonfire_Sticks_Anchor_RightHand(Clone)", "LMAVT.": "Walnut_Anchor_Right(Clone)",
    "LMAWE.": "HotCocoaCup_Anchor_RIGHT(Clone)", "LMASG. RIGHT.": "Papers_Anchor Variant_Right Hand(Clone)", "LMAXI. RIGHT.": "BalloonAnimalProjectile_Anchor_RIGHT(Clone)",
    "LMAXG. RIGHT.": "CakePieces_Anchor_RIGHT(Clone)", "LMAWB. RIGHT.": "PillowProjectile_Anchor_RIGHT(Clone)", "LMAYC.": "EnergyWafer_Anchor_RIGHT(Clone)",
    "LMAZJ.": "PineconeGrenadePin_Anchor_RIGHT(Clone)", "LMBBD.": "PlaceableStrikezone_Baseball_Projectile_Anchor_RIGHT(Clone)",
};
var HOLDABLES = "Player Objects/Local VRRig/Local Gorilla Player/Holdables/";
// J0ker EnableAllProjs: wake the game's own projectile object for this item so you can see it fly,
// and put away every other throwable still sitting active in the hand
function holdablesStep(def, th, now) {
    if (now - jk.holdAt < 1000) return;
    jk.holdAt = now;
    var anchor = ANCHOR[def.n];
    if (anchor) {
        var go = gfind(HOLDABLES + anchor + "/" + def.n);
        if (go && !go.isNull() && !go.method("get_activeInHierarchy").invoke()) go.method("SetActive", 1).invoke(true);
    }
    for (var k in thrCache.t) {
        var o = thrCache.t[k];
        if (o === th) continue;
        try { if (o.method("get_gameObject").invoke().method("get_activeSelf").invoke()) o.method("SetSnowballActiveLocal").invoke(false); } catch (e) {}
    }
}

function roomSys() { return cs().class("RoomSystem"); }
function myColor() { var c = G.localRig.field("playerColor").value; return [c.field("r").value, c.field("g").value, c.field("b").value]; }
function isMaster() { return !!opt(function () { return cs().class("NetworkSystem").field("Instance").value.method("get_IsMasterClient").invoke(); }, false); }
function needMaster() { if (isMaster()) return true; notify("You are not the master client"); return false; }

function playTagSound() {
    if (!needMaster()) return;
    var idx = TAG_SOUNDS.indexOf(p.tagSound) + 1;
    roomSys().method("SendSoundEffectAll", 3).invoke(idx, 0.25, false);
}
function impactStep(now) {
    if (!p.impactHands || now - jk.impactAt < 100) return;
    var h = input.grip(1) ? G.rightHand : (input.grip(0) ? G.leftHand : null);
    if (!h) return;
    jk.impactAt = now;
    var c = myColor();
    roomSys().method("SendImpactEffect").invoke(pos3(h), c[0], c[1], c[2], 1.0, 1);
}

// ---- aim guns that share one picker: rock gun, revive gun, critter gun, GR gun ----
var jg = { line: null, dot: null, mats: null, prev: false };
function jgHide() { if (jg.line) setActive(jg.line, false); if (jg.dot) setActive(jg.dot, false); }
function jgClear() { try { if (jg.line) destroyNow(jg.line.go); if (jg.dot) destroyNow(jg.dot.go); } catch (e) {} jg.line = null; jg.dot = null; }
function jgShow(from, to, hot) {
    if (!jg.mats) jg.mats = { idle: overlayMat([1, 1, 1, 1]), hit: overlayMat([1, 0.8, 0.2, 1]) };
    if (!jg.line) jg.line = mkEspObj(jg.mats.idle);
    if (!jg.dot) jg.dot = mkEspObj(jg.mats.hit, 0);
    setLine(jg.line, from, to); espMatFor(jg.line, hot ? jg.mats.hit : jg.mats.idle); setActive(jg.line, true);
    tr(jg.dot.go).method("set_position").invoke(to); tr(jg.dot.go).method("set_localScale").invoke([0.15, 0.15, 0.15]); setActive(jg.dot, true);
}
function paintbrawlMgr() {
    var m = opt(function () { return cs().class("GorillaGameModes.GameMode").method("get_ActiveGameMode").invoke(); }, null);
    return (m && !m.isNull() && m.class.name.indexOf("GorillaPaintbrawlManager") >= 0) ? m : null;
}
function reviveAll() {
    if (!needMaster()) return;
    var pb = paintbrawlMgr();
    if (!pb) { notify("Not in a paintbrawl room"); return; }
    var lives = pb.field("playerLives").value;
    var arr = cs().class("NetworkSystem").field("Instance").value.method("get_AllNetPlayers").invoke();
    var n = 0;
    for (var i = 0; i < arr.length; i++) { var np = arr.get(i); if (!np || np.isNull()) continue; lives.method("set_Item").invoke(actorOf(np), 3); n++; }
    notify("Revived " + n + " players");
}
function playerGunsStep(now) {
    var any = p.rockGun || p.reviveGun;
    var grGun = p.grGun !== "Off", critter = p.critterGun !== "Off";
    if (!(any || grGun || critter) || !input.grip(1)) { jgHide(); jg.prev = false; return; }
    var trig = input.trigger(1) > 0.6, fired = trig && !jg.prev;
    jg.prev = trig;
    if (any) {
        var rigs = otherRigs(), a = aimPick(rigs);
        jgShow(a.from, a.pos ? a.pos : add3(a.from, mul3(a.dir, 30)), !!a.rig);
        if (a.rig && fired) {
            var net = rigNet(a.rig);
            if (p.rockGun) {   // J0ker RockGun
                if (!needMaster()) return;
                var ctx = espCtx();
                if (!ctx.tag) { notify("Not an infection room"); return; }
                ctx.tag.method("ChangeCurrentIt").invoke(net, true);
                notify("Made " + opt(function () { return cstr(net.method("get_NickName").invoke()); }, "them") + " it");
            }
            if (p.reviveGun) {
                if (!needMaster()) return;
                var pb = paintbrawlMgr();
                if (!pb) { notify("Not in a paintbrawl room"); return; }
                pb.field("playerLives").value.method("set_Item").invoke(actorOf(net), 3);
                notify("Revived");
            }
        }
        return;
    }
    var pt = rayPoint();
    if (!pt) { jgHide(); return; }
    jgShow(pos3(G.rightHand), pt, trig);
    if (!trig) return;
    if (critter && now - jk.spawnAt > 150) {
        jk.spawnAt = now;
        if (p.critterGun === "Beach Ball") moveBall(pt);
        else { bugCache(now); var list = p.critterGun === "Bat" ? (jk.bat ? [jk.bat] : []) : (jk.bugs || []); for (var i = 0; i < list.length; i++) tr(list[i]).method("set_position").invoke(pt); }
    }
    if (grGun && now - jk.spawnAt > 250) {
        jk.spawnAt = now;
        var pool = GR_GUN[p.grGun];
        grCreate(pool[Math.floor(Math.random() * pool.length)], pt, G.Quaternion.field("identityQuaternion").value, false);
    }
}

// ---- paintbrawl ----
function paintbrawlStep(now) {
    if (!(p.pbAimbot || p.pbAutoFire) || !input.grip(1)) return;
    if (!paintbrawlMgr()) return;
    if (p.pbAutoFire) {   // J0ker AutoFire: flicker the grip and pulse the trigger so the slingshot fires itself
        var cp = cs().class("ControllerInputPoller").field("instance").value;
        cp.field("rightControllerGripFloat").value = jk.pbFire ? 1 : 0;
        jk.pbFire = !jk.pbFire;
        if (now - jk.pbAt > 200) { jk.pbAt = now; cp.field("rightControllerIndexFloat").value = 0; }
        else cp.field("rightControllerIndexFloat").value = 1;
    }
    if (p.pbAimbot && now - (jk.aimAt || 0) > 100) {   // J0ker Aimbot: your own paintballs land on a random other player
        jk.aimAt = now;
        var rigs = otherRigs();
        if (!rigs.length) return;
        var me = actorOf(localNet());
        var arr = findObjs(cs().class("SlingshotProjectile"));
        for (var i = 0; arr && i < arr.length; i++) {
            var pr = arr.get(i);
            var own = opt(function () { return pr.field("projectileOwner").value; }, null);
            if (!own || own.isNull() || actorOf(own) !== me) continue;
            if (!pr.method("get_gameObject").invoke().method("get_activeSelf").invoke()) continue;
            tr(pr).method("set_position").invoke(rigPos(rigs[Math.floor(Math.random() * rigs.length)]));
        }
    }
}

// ---- party ----
function bracelet(on) {
    sendRPC("EnableNonCosmeticHandItemRPC", [{ b: on }, { b: false }]);
    if (p.braceletBoth) sendRPC("EnableNonCosmeticHandItemRPC", [{ b: on }, { b: true }]);
    notify(on ? "Bracelet on" : "Bracelet off");
}
function leaveParty() {
    var f = staticInstance(cs().class("GorillaTagScripts.FriendshipGroupDetection"));
    if (!f) { notify("Party system not found"); return; }
    if (!f.method("get_IsInParty").invoke()) { notify("You are not in a party"); return; }
    f.method("LeaveParty").invoke();
    notify("Left the party");
}

// ---- ghost reactor / super infection item spawning (the game's own RequestCreateItem) ----
var GR_TOOLS = [-175001459, -298662477, 1115277044, 1989693521, 1165678479, -1495476618, -531028875, 166197108, -2120233750, -1949194188, 418765863, -830469733, -1235906457, 225241881, 400631847, 252997812, -502169320];
var GR_GUN = {
    "Items": GR_TOOLS,
    "Monsters": [-2080328249, 838042303, 233456889, 46876848, 1664696841, -1539148131, 1348009914, 1534537551, 48354877, 2048125970, 1359966940, 1766079971, 1360328403, -719315317, -1330344804, 644438574, 544609760, -1716223397, -144412770, 2125246458, 1328155875, -412173355, -509453360, 1173205218, 618507822],
    "Door": [-735557236],
    "Kiosks": [57788176, -423281236, 804105887, 1748938408, 1567140275, -474777485, 1673949486, 148123282],
};
function entityManager(si) {
    var key = si ? "siMgr" : "grMgr";
    if (jk[key] && !jk[key].isNull()) return jk[key];
    var arr = findObjs(cs().class(si ? "SuperInfectionManager" : "GhostReactorManager"));
    if (!arr || !arr.length) return null;
    var gem = arr.get(0).field("gameEntityManager").value;
    if (!gem || gem.isNull()) return null;
    jk[key] = gem;
    return gem;
}
function grCreate(hash, at, rot, si) {
    if (!needMaster()) return;
    var gem = entityManager(si);
    if (!gem) { notify(si ? "Not in a super infection room" : "Ghost Reactor not loaded, go down there first"); return; }
    gem.method("RequestCreateItem", 4).invoke(hash, at, rot, int64(0));
}
function randRot() { return euler(Math.random() * 360, Math.random() * 360, Math.random() * 360); }
function spawnStep(now) {
    if (!input.grip(1) || now - jk.spawnAt < 250) return;
    if (p.grSpawn !== "Off") {
        jk.spawnAt = now;
        var h = GR_ITEMS[p.grSpawn];
        if (!h) h = GR_TOOLS[Math.floor(Math.random() * GR_TOOLS.length)];
        grCreate(h, pos3(G.rightHand), randRot(), false);
    }
    if (p.siSpawn !== "Off") {
        jk.spawnAt = now;
        grCreate(SI_ITEMS[p.siSpawn], pos3(G.rightHand), randRot(), true);
    }
}

// ---- critters + beach ball ----
function bugCache(now) {
    if (jk.bugs && now - jk.bugsAt < 5000) return;
    jk.bugsAt = now;
    var out = [], arr = findObjs(cs().class("ThrowableBug"));
    jk.bat = null;
    for (var i = 0; arr && i < arr.length; i++) {
        var b = arr.get(i), nm = str(b.method("get_gameObject").invoke().method("get_name").invoke());
        if (nm.indexOf("Floating Bug Holdable") >= 0) out.push(b);
        else if (nm.indexOf("Cave Bat Holdable") >= 0) jk.bat = b;
    }
    jk.bugs = out;
}
function moveBall(at) {
    ["BeachBall", "Ball"].forEach(function (n) { var go = gfind(n); if (go && !go.isNull()) tr(go).method("set_position").invoke(at); });
}
function critterStep(now) {
    var ride = (p.rideBug || p.rideBat) && input.grip(1);
    if (ride) {
        bugCache(now);
        var target = p.rideBat ? jk.bat : (jk.bugs && jk.bugs[0]);
        if (target) {
            if (!jk.ride) { setColliders(false); jk.ride = true; }
            tr(G.player).method("set_position").invoke(add3(pos3(target), [0, 0.1, 0]));
        }
    } else if (jk.ride) { setColliders(true); jk.ride = false; }
    if (p.bugSpeed !== jk.bugSpeed) {
        bugCache(now);
        var all = (jk.bugs || []).slice(); if (jk.bat) all.push(jk.bat);
        if (p.bugSpeed === "Game") {
            for (var i = 0; i < all.length; i++) { var o = jk.bugOrig && jk.bugOrig[all[i].handle.toString()]; if (o) { all[i].field("bobingSpeed").value = o[0]; all[i].field("maxNaturalSpeed").value = o[1]; all[i].field("startingSpeed").value = o[2]; } }
        } else {
            var v = p.bugSpeed === "Fast" ? 9 : 2;
            jk.bugOrig = jk.bugOrig || {};
            for (var j = 0; j < all.length; j++) {
                var b = all[j], k = b.handle.toString();
                if (!jk.bugOrig[k]) jk.bugOrig[k] = [b.field("bobingSpeed").value, b.field("maxNaturalSpeed").value, b.field("startingSpeed").value];
                b.field("bobingSpeed").value = v; b.field("maxNaturalSpeed").value = v; b.field("startingSpeed").value = v;
            }
        }
        jk.bugSpeed = p.bugSpeed;
    }
    if (p.grabBall && input.grip(1)) moveBall(pos3(G.rightHand));
}

// ---- guardian ----
function setGuardian(random) {
    if (!needMaster()) return;
    var list = cs().class("GorillaGuardianZoneManager").field("zoneManagers").value;
    if (!list || list.isNull()) { notify("No guardian zones loaded"); return; }
    var who = null;
    if (random) {
        var rigs = otherRigs();
        if (!rigs.length) { notify("Nobody else here"); return; }
        who = rigNet(rigs[Math.floor(Math.random() * rigs.length)]);
    } else who = localNet();
    var n = list.method("get_Count").invoke(), done = 0;
    for (var i = 0; i < n; i++) {
        var zm = list.method("get_Item").invoke(i);
        if (!zm || zm.isNull() || !zm.method("get_enabled").invoke()) continue;
        zm.method("SetGuardian").invoke(who); done++;
    }
    notify(done ? "Guardian set" : "No active guardian zone, are you in the guardian game mode?");
}

// ---- cosmetics + misc buttons ----
function buyAllFree() {
    var ctrl = cosmeticsCtrl();
    if (!ctrl) { notify("Cosmetics not loaded yet"); return; }
    var list = ctrl.method("get_allCosmetics").invoke(), owned = ctrl.field("unlockedCosmetics").value;
    var n = list.method("get_Count").invoke(), bought = 0;
    for (var i = 0; i < n && bought < 40; i++) {
        var it = list.method("get_Item").invoke(i);
        if (!it.field("canTryOn").value || Number(it.field("cost").value) !== 0) continue;
        if (owned.method("Contains").invoke(it)) continue;
        ctrl.field("itemToBuy").value = it;
        ctrl.method("PurchaseItem").invoke();
        bought++;
    }
    notify(bought ? "Bought " + bought + " free items" : "Nothing free left to buy");
}
function unlimitedRocks() {
    var ctrl = cosmeticsCtrl();
    if (!ctrl) { notify("Cosmetics not loaded yet"); return; }
    ctrl.field("currencyBalance").value = 2147483647;
    ctrl.method("UpdateCurrencyBoards").invoke();
    notify("Boards now show unlimited shiny rocks (display only)");
}
function unlockComp() {
    var gc = compInst();
    if (!gc) { notify("Computer not loaded"); return; }
    gc.field("allowedInCompetitive").value = true;
    try { var PP = core().class("UnityEngine.PlayerPrefs"); PP.method("SetInt").invoke(Il2Cpp.string("allowedInCompetitive"), 1); PP.method("Save").invoke(); } catch (e) {}
    notify("Competitive queue unlocked");
}
function disableBlockColliders() {
    var arr = findObjs(physics().class("UnityEngine.MeshCollider")), n = 0;
    for (var i = 0; arr && i < arr.length; i++) {
        var c = arr.get(i);
        try { if (str(c.method("get_gameObject").invoke().method("get_name").invoke()) === "SnapPieceRock2x2") { destroyNow(c); n++; } } catch (e) {}
    }
    notify("Removed " + n + " block colliders");
}

function jokerStep(dt, now) {
    impactStep(now);
    playerGunsStep(now);
    paintbrawlStep(now);
    spawnStep(now);
    critterStep(now);
}
function jokerClear() {
    jgClear();
    if (jk.ride) { try { setColliders(true); } catch (e) {} jk.ride = false; }
    if (jk.bugSpeed !== "Game" && jk.bugOrig) {
        var all = (jk.bugs || []).slice(); if (jk.bat) all.push(jk.bat);
        for (var i = 0; i < all.length; i++) { var o = jk.bugOrig[all[i].handle.toString()]; if (o) { try { all[i].field("bobingSpeed").value = o[0]; all[i].field("maxNaturalSpeed").value = o[1]; all[i].field("startingSpeed").value = o[2]; } catch (e) {} } }
        jk.bugSpeed = "Game";
    }
}

// ------------------------------------------------------------------------------------------
// v3.3: throw fix, defensive mods, player volumes, wrist room info, tag feed, ambush reveal,
// follow / orbit
// ------------------------------------------------------------------------------------------
var d4 = { at: 0 };
function defOf(key) { for (var i = 0; i < DEFS.length; i++) if (DEFS[i].key === key) return DEFS[i]; return null; }
// an export lookup that works on both old and new Frida
function findExport(modName, name) {
    var tries = [
        function () { return Process.getModuleByName(modName).findExportByName(name); },
        function () { return Module.findExportByName(modName, name); },
        function () { return Module.findGlobalExportByName(name); },
        function () { return Il2Cpp.module.findExportByName(name); },
        function () { return Il2Cpp.module.getExportByName(name); },
    ];
    for (var i = 0; i < tries.length; i++) { try { var r = tries[i](); if (r && !r.isNull()) return r; } catch (e) {} }
    return null;
}
// find a class in any loaded assembly
function anyClass(name) {
    var asms = Il2Cpp.domain.assemblies;
    for (var i = 0; i < asms.length; i++) { try { var c = asms[i].image.tryClass(name); if (c) return c; } catch (e) {} }
    throw new Error("class not found: " + name);
}
function netSys() { return cs().class("NetworkSystem").field("Instance").value; }
function netName(np) {
    if (!np || np.isNull()) return "?";
    return opt(function () { return cstr(np.method("get_SanitizedNickName").invoke()); }, "") || opt(function () { return cstr(np.method("get_NickName").invoke()); }, "") || "?";
}
function rigName(r) { return opt(function () { var n = str(r.field("playerNameVisible").value); return (n && n !== "null") ? n : ""; }, "") || netName(rigNet(r)); }
function byActor(a, b) { return actorOf(rigNet(a)) - actorOf(rigNet(b)); }
function myHead() { return pos3(G.tagger.field("headCollider").value); }

// ---- throw: watch the game's projectile launcher so we know whether a throw spawned locally ----
var thrHook = { h: null, n: 0, told: false };
function throwHookOn() {
    if (thrHook.h || thrHook.failed) return;
    try {
        var addr = cs().class("SlingshotProjectile").method("Launch").virtualAddress;
        thrHook.h = Interceptor.attach(addr, { onEnter: function () { thrHook.n++; } });
    } catch (e) { thrHook.failed = true; log("throw: cannot watch SlingshotProjectile.Launch (" + e + "), will always spawn a local copy"); }
}
// LaunchSnowballLocal's parameter list differs between game builds, so build the call from the live signature
function launchLocal(th, spawn, vel, scale) {
    var m = th.method("LaunchSnowballLocal"), ps = m.parameters, args = [], nv = 0;
    for (var i = 0; i < ps.length; i++) {
        var t = ps[i].type.name;
        if (t === "UnityEngine.Vector3") args.push(nv++ === 0 ? spawn : vel);
        else if (t === "System.Single") args.push(scale);
        else if (t === "System.Boolean") args.push(false);
        else if (t === "UnityEngine.Color") args.push([1, 1, 1, 1]);
        else if (t === "UnityEngine.Color32") args.push([255, 255, 255, 255]);
        else if (t === "System.Int32") args.push(0);
        else args.push(NULL);
    }
    if (!thrHook.sig) { thrHook.sig = 1; log("throw: LaunchSnowballLocal(" + ps.map(function (q) { return q.type.name; }).join(", ") + ")"); }
    return m.invoke.apply(m, args);
}
function throwHookOff() { if (thrHook.h) { try { thrHook.h.detach(); } catch (e) {} thrHook.h = null; } }
// the game's own right-hand velocity estimator, the one the real snowball code reads
function handEstimator() {
    return opt(function () {
        var mk = cs().class("SnowballMaker").method("get_rightHandInstance").invoke();
        if (!mk || mk.isNull()) return null;
        var est = mk.field("velocityEstimator").value;
        return (est && !est.isNull()) ? est : null;
    }, null);
}

// ---- defensive: event rate limiter + freeze watchdog + snap-back ----
var rl = { on: false, m: null, cnt: {}, win: 0, dropped: 0, droppedBy: {}, ring: [], ringN: 0, me: -1, lastTold: 0, told: 0 };
function rpcHookOn() {
    if (rl.on || rl.failed) return;
    var tries = [
        { n: "PhotonNetwork.OnEvent", m: function () { return photonNet().method("OnEvent"); } },
        { n: "LoadBalancingClient.OnEvent", m: function () { return anyClass("Photon.Realtime.LoadBalancingClient").method("OnEvent"); } },
    ];
    var errs = [];
    for (var i = 0; i < tries.length && !rl.on; i++) {
        try { rpcHookInstall(tries[i].m()); log("rate limiter: hooked " + tries[i].n); }
        catch (e) { errs.push(tries[i].n + ": " + e); }
    }
    if (!rl.on) { rl.failed = true; log("rate limiter + watchdog unavailable, cannot hook the event handler (" + errs.join(" | ") + ")"); }
}
function rpcHookInstall(m) {
    m.implementation = function (ev) {
        var drop = false;
        try {
            var code = Number(ev.field("Code").value), sender = Number(ev.field("sender").value), now = Date.now();
            if (p.crashWatch) { rl.ring[rl.ringN % 16] = { c: code, s: sender, t: now }; rl.ringN++; }
            // 201 / 206 are rig serialization and >= 220 are Photon's own room events: never touch those
            if (p.rpcLimit && sender > 0 && sender !== rl.me && code !== 201 && code !== 206 && code < 220) {
                if (now - rl.win > 1000) { rl.win = now; rl.cnt = {}; }
                var n = (rl.cnt[sender] || 0) + 1; rl.cnt[sender] = n;
                if (n > p.rpcMax) { drop = true; rl.dropped++; rl.droppedBy[sender] = (rl.droppedBy[sender] || 0) + 1; }
            }
        } catch (e) {}
        if (drop) return;
        return this.method("OnEvent").invoke(ev);
    };
    rl.on = true; rl.m = m;
}
function rpcHookOff() { if (rl.on) { try { rl.m.revert(); } catch (e) {} rl.on = false; rl.m = null; } }
function actorName(actor) {
    return opt(function () { return netName(netSys().method("GetNetPlayerByID").invoke(actor)); }, "") || ("#" + actor);
}
var wd = { lastNow: 0 };
var at = { last: null, selfAt: 0, inRoom: false, joinAt: 0 };
function defenseStep(dt, now) {
    var want = !!(p.rpcLimit || p.crashWatch);
    if (want !== rl.on) { if (want) rpcHookOn(); else rpcHookOff(); }
    if (rl.on && now - d4.at > 1000) { d4.at = now; rl.me = opt(function () { return Number(netSys().method("get_LocalPlayerID").invoke()); }, -1); }
    if (p.rpcLimit && rl.dropped > rl.told && now - rl.lastTold > 5000) {
        var who = [];
        for (var k in rl.droppedBy) who.push(actorName(Number(k)) + " x" + rl.droppedBy[k]);
        notify("Blocked " + (rl.dropped - rl.told) + " flooded events: " + who.join(", "), 4, "warn", "Rate limiter");
        rl.told = rl.dropped; rl.lastTold = now; rl.droppedBy = {};
    }
    // watchdog: a frame that took way too long means the game froze. say who was talking to us right before
    if (p.crashWatch) {
        if (wd.lastNow && now - wd.lastNow > 1500) {
            var secs = ((now - wd.lastNow) / 1000).toFixed(1), by = {}, n = Math.min(rl.ring.length, 16);
            for (var i = 0; i < n; i++) { var e = rl.ring[i]; if (!e) continue; var key = e.s; by[key] = by[key] || {}; by[key][e.c] = (by[key][e.c] || 0) + 1; }
            var parts = [];
            for (var s in by) { var codes = []; for (var c in by[s]) codes.push("ev" + c + "x" + by[s][c]); parts.push(actorName(Number(s)) + " (" + codes.join(" ") + ")"); }
            var msg = "froze " + secs + "s. last events from: " + (parts.join("; ") || "nobody");
            log("watchdog: " + msg);
            notify(msg, 8, "warn", "Watchdog");
        }
        wd.lastNow = now;
    } else wd.lastNow = 0;
    // snap-back: a jump bigger than anything physics could do in one frame gets undone
    if (p.antiTp) {
        var inRoom = opt(function () { return !!netSys().method("get_InRoom").invoke(); }, false);
        if (inRoom !== at.inRoom) { at.inRoom = inRoom; at.joinAt = now; }
        var b = bodyPos();
        if (at.last && now - at.selfAt > 1500 && now - at.joinAt > 8000) {
            var jump = len3(sub3(b, at.last)), could = len3(vel()) * Math.max(dt, 0.05) * 3 + 4;
            if (jump > Math.max(p.antiTpDist, could)) {
                teleportTo(at.last);
                try { G.rb.method("set_velocity").invoke([0, 0, 0]); } catch (e) {}
                notify("Snapped back from a " + jump.toFixed(0) + "m jump", 3, "warn", "Anti teleport");
                at.selfAt = now; b = at.last;
            }
        }
        at.last = b;
    } else at.last = null;
}

// ---- per-player voice volumes ----
var VOL_SLOTS = 8;
var vc = { at: 0, touched: {}, names: [] };
function volumeStep(now) {
    if (!p.voiceCtl) { if (Object.keys(vc.touched).length) volumeClear(); return; }
    if (now - vc.at < 500) return;
    vc.at = now;
    var rigs = otherRigs().sort(byActor), seen = {};
    for (var i = 0; i < VOL_SLOTS; i++) {
        var d = defOf("vol" + (i + 1)), r = rigs[i];
        var nm = r ? rigName(r) : "(empty)";
        var lbl = "Vol " + (i + 1) + ": " + nm;
        if (d && d.label !== lbl) d.label = lbl;
        if (!r) continue;
        var key = r.handle.toString(); seen[key] = 1;
        var v = p.muteAll ? 0 : Math.max(0, p["vol" + (i + 1)] * p.voiceBoost);
        var cur = vc.touched[key];
        if (cur && cur.v === v) continue;
        if (setVoiceVolume(r, v)) vc.touched[key] = { r: r, v: v };
    }
    for (var k in vc.touched) if (!seen[k]) { try { setVoiceVolume(vc.touched[k].r, 1); } catch (e) {} delete vc.touched[k]; }
}
function setVoiceVolume(r, v) {
    var ok = false;
    ["voiceAudio"].forEach(function (f) { try { var a = r.field(f).value; if (a && !a.isNull()) { a.method("set_volume").invoke(v); ok = true; } } catch (e) {} });
    try { var rc = r.field("rigContainer").value; if (rc && !rc.isNull()) { var a2 = rc.field("replacementVoiceSource").value; if (a2 && !a2.isNull()) a2.method("set_volume").invoke(v); } } catch (e) {}
    return ok;
}
function volumeClear() {
    for (var k in vc.touched) { try { setVoiceVolume(vc.touched[k].r, 1); } catch (e) {} }
    vc.touched = {};
    for (var i = 0; i < VOL_SLOTS; i++) { var d = defOf("vol" + (i + 1)); if (d) d.label = "Vol " + (i + 1) + ": (empty)"; }
}
function resetVolumes() { for (var i = 0; i < VOL_SLOTS; i++) p["vol" + (i + 1)] = 1; p.voiceBoost = 1; p.muteAll = false; vc.at = 0; }

// ---- room info on the wrist ----
var ri = { tag: null, at: 0, fps: 0 };
function roomInfoStep(now, dt) {
    if (!p.roomInfo) { if (ri.tag) { destroyNow(ri.tag.go); ri.tag = null; } return; }
    if (!ri.tag) ri.tag = mkTag(G.localRig.field("playerText1").value);
    if (dt > 0) ri.fps = ri.fps ? ri.fps * 0.95 + (1 / dt) * 0.05 : 1 / dt;
    var lt = tr(G.leftHand), lift = 0.08 + (p.handLabels ? 0.075 : 0);
    var atp = add3(pos3(G.leftHand), mul3(upOf(lt), lift));
    tr(ri.tag.go).method("set_position").invoke(atp);
    tr(ri.tag.go).method("set_rotation").invoke(lookRot(sub3(atp, myHead())));
    if (now - ri.at < 500) return;
    ri.at = now;
    var ns = netSys(), lines = [];
    var inRoom = opt(function () { return !!ns.method("get_InRoom").invoke(); }, false);
    if (!inRoom) lines.push("not in a room");
    else {
        var code = opt(function () { return cstr(ns.method("get_RoomName").invoke()); }, "?");
        var region = opt(function () { return cstr(ns.method("get_CurrentRegion").invoke()); }, "?");
        var mode = opt(function () { return cstr(ns.method("get_GameModeString").invoke()); }, "");
        var cnt = opt(function () { return Number(ns.method("get_RoomPlayerCount").invoke()); }, 0);
        var master = opt(function () { return netName(ns.method("get_MasterClient").invoke()); }, "?");
        var ping = opt(function () { return Number(photonNet().method("GetPing").invoke()); }, -1);
        lines.push(code + "  " + region.toUpperCase() + "  " + cnt + "p");
        if (mode) lines.push(mode.replace(/^DEFAULT/i, "").replace(/^(.{14}).+/, "$1"));
        lines.push("host " + master.replace(/^(.{12}).+/, "$1…"));
        lines.push((ping >= 0 ? ping + "ms  " : "") + Math.round(ri.fps) + "fps");
    }
    var txt = lines.join("\n");
    if (txt !== ri.tag.txt) { ri.tag.tmp.method("set_text").invoke(Il2Cpp.string(txt)); ri.tag.txt = txt; }
    ri.tag.tmp.method("set_fontSize").invoke(0.9);
    ri.tag.tmp.method("set_color").invoke([0.8, 0.9, 1, 1]);
}

// ---- tag feed: who tagged who, straight from the game's tag broadcast handler ----
var tf = { hooks: [], q: [], on: false, lastKey: "", lastAt: 0 };
function netInfoPtr(ptr) {
    if (!ptr || ptr.isNull()) return null;
    var o = new Il2Cpp.Object(ptr);
    return { name: netName(o), actor: actorOf(o), local: !!opt(function () { return o.method("get_IsLocal").invoke(); }, false) };
}
function tagFeedOn() {
    if (tf.on) return;
    tf.on = true;
    var done = {}, errs = [];
    ["GorillaGameManager", "GorillaTagManager"].forEach(function (cn) {
        var cls = opt(function () { return cs().class(cn); }, null);
        if (!cls) return;
        cls.methods.forEach(function (m) {
            if (m.name !== "HandleTagBroadcast" || m.parameters.length < 2) return;
            var key = m.virtualAddress.toString();
            if (done[key]) return;
            done[key] = 1;
            try {
                tf.hooks.push(Interceptor.attach(m.virtualAddress, {
                    onEnter: function (args) {
                        try { tf.q.push({ tagged: netInfoPtr(args[1]), tagger: netInfoPtr(args[2]), at: Date.now() }); } catch (e) {}
                    },
                }));
            } catch (e) { errs.push(cn + "." + m.name + "/" + m.parameters.length + ": " + e); }
        });
    });
    if (!tf.hooks.length) log("tag feed unavailable, no tag handler could be hooked (" + errs.join(" | ") + ")");
    else if (errs.length) log("tag feed: hooked " + tf.hooks.length + " handler(s), skipped " + errs.join(" | "));
}
function tagFeedOff() { tf.hooks.forEach(function (h) { try { h.detach(); } catch (e) {} }); tf.hooks = []; tf.on = false; tf.q = []; }
function tagFeedStep(now) {
    if (!!p.tagFeed !== tf.on) { if (p.tagFeed) tagFeedOn(); else tagFeedOff(); }
    if (!tf.on || !tf.q.length) return;
    var q = tf.q; tf.q = [];
    for (var i = 0; i < q.length; i++) {
        var e = q[i];
        if (!e.tagged || !e.tagger) continue;
        var key = e.tagger.actor + ">" + e.tagged.actor;
        if (key === tf.lastKey && now - tf.lastAt < 500) continue;   // both overloads fire for one tag
        tf.lastKey = key; tf.lastAt = now;
        var me = e.tagged.local, byMe = e.tagger.local;
        if (p.tagFeedMe && !me && !byMe) continue;
        var dist = "";
        if (me) {
            var rigs = otherRigs();
            for (var j = 0; j < rigs.length; j++) if (actorOf(rigNet(rigs[j])) === e.tagger.actor) { dist = " from " + len3(sub3(rigPos(rigs[j]), myHead())).toFixed(1) + "m"; break; }
        }
        var who = (byMe ? "You" : e.tagger.name) + " tagged " + (me ? "YOU" : e.tagged.name) + dist;
        notify(who, 3, me ? "warn" : "info", "Tag");
        if (me && p.tagFeedBuzz) { try { G.tagger.method("StartVibration").invoke(true, 0.8, 0.3); G.tagger.method("StartVibration").invoke(false, 0.8, 0.3); } catch (e2) {} }
    }
}

// ---- ambush reveal: taggers in Ambush are hidden client side, so un-hide them ----
var am = { at: 0, fixed: {} };
function ambushStep(now) {
    if (!p.ambushReveal) { if (Object.keys(am.fixed).length) ambushClear(); return; }
    if (now - am.at < 250) return;
    am.at = now;
    var rigs = otherRigs(), seen = {};
    for (var i = 0; i < rigs.length; i++) {
        var r = rigs[i], key = r.handle.toString();
        var invis = !!opt(function () { return r.field("IsInvisibleToLocalPlayer").value; }, false);
        var mat = opt(function () { return Number(r.field("setMatIndex").value); }, 0);
        if (!invis && mat !== 13) { if (am.fixed[key]) { ambushRestore(r); delete am.fixed[key]; } continue; }
        seen[key] = 1;
        if (invis) { try { r.method("SetInvisibleToLocalPlayer").invoke(false); } catch (e) {} }
        var skin = r.field("mainSkin").value;
        if (skin && !skin.isNull()) {
            try { if (!skin.method("get_enabled").invoke()) skin.method("set_enabled").invoke(true); } catch (e) {}
            if (mat === 13) {
                var mats = r.field("materialsToChangeTo").value;
                var m = (mats && !mats.isNull() && mats.length > 2) ? mats.get(2) : null;
                if (m && !m.isNull()) {
                    var cur = skin.method("get_sharedMaterial").invoke();
                    if (!cur || cur.isNull() || !cur.handle.equals(m.handle)) skin.method("set_material").invoke(m);
                }
            }
        }
        am.fixed[key] = r;
    }
    for (var k in am.fixed) if (!seen[k]) { ambushRestore(am.fixed[k]); delete am.fixed[k]; }
}
function ambushRestore(r) { try { r.method("ChangeMaterialLocal").invoke(Number(r.field("setMatIndex").value)); } catch (e) {} }
function ambushClear() { for (var k in am.fixed) ambushRestore(am.fixed[k]); am.fixed = {}; }

// ---- follow / orbit a chosen player ----
var fo = { ang: 0, at: 0, name: "" };
function targetRig() {
    var rigs = otherRigs();
    if (!rigs.length) return null;
    var sel = p.targetSel;
    if (sel.indexOf("Slot ") === 0) { rigs.sort(byActor); return rigs[parseInt(sel.slice(5), 10) - 1] || null; }
    var ctx = espCtx(), head = myHead(), best = null, bd = Infinity;
    for (var i = 0; i < rigs.length; i++) {
        var r = rigs[i];
        if (sel !== "Nearest") {
            var inf = ctx.tag ? isInfected(ctx.tag, rigNet(r)) : false;
            if (sel === "Nearest Tagger" && !inf) continue;
            if (sel === "Nearest Runner" && inf) continue;
        }
        var d = len3(sub3(rigPos(r), head));
        if (d < bd) { bd = d; best = r; }
    }
    return best;
}
function steerTo(desired) {
    var d = sub3(desired, bodyPos());
    var v = mul3(d, 6), m = len3(v), max = p.followMax;
    if (m > max) v = mul3(v, max / m);
    G.rb.method("set_velocity").invoke(v);
}
function followStep(dt, now) {
    var want = p.follow || p.orbit;
    var d = defOf("targetSel");
    if (!want) { if (d && fo.name) { d.label = "Target Player"; fo.name = ""; } return; }
    var r = targetRig();
    if (now - fo.at > 1000) {
        fo.at = now;
        var nm = r ? rigName(r) : "none";
        if (nm !== fo.name && d) { d.label = "Target Player  (" + nm + ")"; fo.name = nm; }
    }
    if (!r) return;
    if (p.followBtn !== "Always" && !btnHeld(p.followBtn)) return;
    var tp = rigPos(r), desired;
    if (p.orbit) {
        fo.ang += p.orbitSpeed * Math.PI / 180 * dt;
        desired = add3(tp, [Math.cos(fo.ang) * p.orbitRadius, 0.3, Math.sin(fo.ang) * p.orbitRadius]);
    } else {
        var fwd = opt(function () { return fwdOf(r.field("head").value.field("rigTarget").value); }, null) || [0, 0, 1];
        fwd[1] = 0; var l = len3(fwd) || 1; fwd = mul3(fwd, 1 / l);
        desired = add3(sub3(tp, mul3(fwd, p.followDist)), [0, 0.3, 0]);
    }
    steerTo(desired);
}

// ---- report board alert: someone's hand on the report button next to your name (hamburbur's check, notify only) ----
var ra = { at: 0, seen: {} };
function reportStep(now) {
    if (!p.reportAlert || now - ra.at < 100) return;
    ra.at = now;
    var lines = cs().class("GorillaScoreboardTotalUpdater").field("allScoreboardLines").value;
    if (!lines || lines.isNull()) return;
    var me = opt(function () { return Number(netSys().method("get_LocalPlayerID").invoke()); }, -1);
    if (me < 0) return;
    var n = lines.method("get_Count").invoke(), buttons = [];
    for (var i = 0; i < n; i++) {
        var line = lines.method("get_Item").invoke(i);
        if (!line || line.isNull()) continue;
        var lp = line.field("linePlayer").value;
        if (!lp || lp.isNull() || actorOf(lp) !== me) continue;
        var btn = line.field("reportButton").value;
        if (!btn || btn.isNull()) continue;
        try { if (!btn.method("get_gameObject").invoke().method("get_activeInHierarchy").invoke()) continue; } catch (e) {}
        buttons.push(pos3(btn));
    }
    if (!buttons.length) return;
    var rigs = otherRigs();
    for (var r = 0; r < rigs.length; r++) {
        var rig = rigs[r], key = rig.handle.toString();
        if (ra.seen[key] && now - ra.seen[key] < 2500) continue;
        var hands = [];
        try { hands.push(pos3(rig.field("leftHandTransform").value)); } catch (e) {}
        try { hands.push(pos3(rig.field("rightHandTransform").value)); } catch (e) {}
        var hit = false;
        for (var b = 0; b < buttons.length && !hit; b++)
            for (var h = 0; h < hands.length; h++) if (len3(sub3(hands[h], buttons[b])) < p.reportRange) { hit = true; break; }
        if (!hit) continue;
        ra.seen[key] = now;
        notify(rigName(rig) + " has a hand on your report button", 5, "warn", "Report board");
    }
}

function port4Step(dt, now) {
    safe("defense", function () { defenseStep(dt, now); });
    safe("report alert", function () { reportStep(now); });
    safe("volumes", function () { volumeStep(now); });
    safe("room info", function () { roomInfoStep(now, dt); });
    safe("tag feed", function () { tagFeedStep(now); });
    safe("ambush", function () { ambushStep(now); });
    safe("follow", function () { followStep(dt, now); });
}
function port4Clear() {
    rpcHookOff(); throwHookOff(); tagFeedOff(); volumeClear(); ambushClear();
    if (ri.tag) { destroyNow(ri.tag.go); ri.tag = null; }
    var d = defOf("targetSel"); if (d) d.label = "Target Player";
    at.last = null; wd.lastNow = 0;
}

// ------------------------------------------------------------------------------------------
// frame loop
// ------------------------------------------------------------------------------------------
var last = Date.now();
onFrame(function () {
    var now = Date.now(); var dt = Math.min(0.1, (now - last) / 1000); last = now; lastDt = dt;
    if (!init()) return;

    safe("movement", function () { movementStep(dt); });
    safe("sound", function () { soundStep(now); });
    safe("rig", rigStep);
    safe("rigmode", function () { rigModeStep(now, dt); });
    safe("player", function () { playerStep(now); });
    safe("board", function () { boardStep(now); });
    safe("esp", espStep);
    safe("chams", chamsStep);
    safe("tag", function () { tagStep(now); });
    safe("taggun", function () { gunStep(now); });
    safe("tagself", tagSelfStep);
    safe("projectile", function () { projStep(now); });
    safe("throwable", function () { throwStep(now); });
    safe("guns", gunsStep);
    safe("extra", function () { extraStep(dt); });
    safe("splash", function () { splashStep(now); });
    safe("nametags", nameTagStep);
    safe("computer", function () { computerStep(dt, now); });
    safe("joins", function () { joinStep(now); });
    safe("world", worldStep);
    safe("misc", miscStep);
    safe("port-move", function () { portMovementStep(dt, now); });
    safe("port-player", function () { portPlayerStep(now); });
    safe("playergun", function () { playerGunStep(now, dt); });
    safe("esp+", function () { espExtraStep(now, dt); });
    safe("xray", xrayStep);
    safe("port-world", function () { portWorldStep(now); });
    safe("handlabels", function () { handLabelStep(now); });
    safe("port2", function () { port2Step(dt, now); });
    safe("joker", function () { jokerStep(dt, now); });
    safe("port4", function () { port4Step(dt, now); });
    safe("cosmetics", function () {
        stepUnlock();
        if (p.keepUnlocked && !unlockQ && now - lastReapply > 15000) {
            lastReapply = now;
            if (needsReapply()) startUnlock();
        }
    });
});

onDisable(function () {
    try {
        if (!G.ok) return;
        var pl = G.player;
        dropPlat("L"); dropPlat("R");
        if (clipped) setColliders(true);
        espClear(); gunClear(); chamsRestore(); aimClear(); tagsClear(); compRestore(); allowHookOff();
        try { portClear(); } catch (e) { log("port cleanup: " + e); }
        try { port2Clear(); } catch (e) { log("port2 cleanup: " + e); }
        try { jokerClear(); } catch (e) { log("joker cleanup: " + e); }
        try { port4Clear(); } catch (e) { log("port4 cleanup: " + e); }
        if (handClip) { pl.field("leftHandHolding").value = false; pl.field("rightHandHolding").value = false; handClip = false; }
        if (cpObj) { G.UObject.method("Destroy", 1).invoke(cpObj); cpObj = null; }
        if (slideOn) pl.field("slideControl").value = G.base.slide;
        if (noWindOn) { var wo = gfind("Environment Objects/LocalObjects_Prefab/Forest/Environment/Forest_ForceVolumes/"); if (wo && !wo.isNull()) wo.method("SetActive", 1).invoke(true); }
        if (thrActive) { try { thrActive.method("SetSnowballActiveLocal").invoke(false); } catch (e) {} thrActive = null; }
        if (speedOn) { pl.field("maxJumpSpeed").value = G.base.maxJump; pl.method("set_jumpMultiplier").invoke(G.base.jump); }
        if (velOn) { pl.field("velocityLimit").value = G.base.velLimit; pl.field("slideVelocityLimit").value = G.base.slideLimit; }
        if (armsOn) tr(pl).method("set_localScale").invoke([1, 1, 1]);
        if (lastSize !== 1) pl.method("SetScaleMultiplier").invoke(1.0);
        if (tapsOn) G.tagger.field("tapCoolDown").value = G.base.tapCool;
        if (reachOn) G.tagger.field("maxTagDistance").value = G.base.tagDist;
        if (coolOn) G.tagger.field("tagCooldown").value = G.base.tagCool;
        if (lastBoardSpeed !== "Normal") {
            var v = BOARD.Normal;
            pl.field("hoverboardPaddleBoostMultiplier").value = v[0]; pl.field("hoverboardBoostGracePeriod").value = v[1];
            pl.field("hoverboardPaddleBoostMax").value = v[2]; pl.field("hoverTiltAdjustsForwardFactor").value = v[3];
        }
        if (lastBody !== "Default") { var g = bodyRenderer(); g.method("SetCosmeticBodyType").invoke(0); g.method("SetMaterialIndex").invoke(0); }
        if (afkOn) { try { var pc = staticInstance(cs().class("GorillaNetworking.PhotonNetworkController")); pc.field("disableAFKKick").value = false; } catch (e) {} }
        G.localRig.method("set_enabled").invoke(true);
        setHead(0, 0, 0);
    } catch (e) {}
});

tab(function (ui) {
    ui.separator();
    ui.text("Status");
    ui.text("init: " + (G.ok ? "ok" : ("not ready" + (G.initErr ? " - " + G.initErr : ""))));
    if (G.ok) {
        var mgr = null, rigsN = -1;
        try { mgr = tagManager(); } catch (e) {}
        try { rigsN = otherRigs().length; } catch (e) {}
        ui.text("tag manager: " + (mgr ? mgr.class.name : "none (not an infection room)") + "   other rigs: " + rigsN);
    }
    var keys = Object.keys(seenErr);
    if (keys.length) { ui.text("errors (first time each):"); keys.slice(0, 8).forEach(function (k) { ui.text(" " + k + ": " + String(seenErr[k]).slice(0, 70)); }); }
    else ui.text("errors: none so far");
    if (p.compOn) ui.text("computer: page " + comp.lastState + "  text writes " + comp.applied + "  hooks " + (comp.hook ? "keys " : "") + (comp.tickHook ? "tick" : "") + (comp.err ? "  err " + comp.err.slice(0, 50) : ""));
});

log("gorilla tag plugin v3.3 loaded");
