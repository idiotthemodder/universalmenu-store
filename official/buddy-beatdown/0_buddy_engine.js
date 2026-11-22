// game: com.armoredpigstudios.beathimup
// soundboard: __RASP_SOUNDBOARD (vrfrida pushes Mods/sounds for plugins that mention it here)
"use strict";
/*
 * buddy_beatdown.js - Buddy Beatdown (com.armoredpigstudios.beathimup) mods as a plugin for the universal menu.
 *
 * v9 (players, powers, enemies, vehicles, the 6.7.9 lobby, maps) on top of
 * v8 (grab anything, vacuum, rain money, camera, score changer). Every class, field and method name was checked against the game's il2cpp dump.
 *
 * Player / combat (from v2):
 *   God Mode, Speed, Infinite Ammo, Rapid Fire, No Recoil, Infinite Damage, Add Money.
 *   Infinite Damage boosts YOUR hits (AIDamage.TryDamage, WeaponInfo, PlayerValues.punchDamage), not damage you take.
 *
 * New in v3:
 *   Unlock Everything - makes the game think you own every weapon, NPC, vehicle and power, and skips the level gates:
 *     InventoryManager.OwnsItem / OwnsPower, WeaponLevelRequirements.IsUnlocked / GetRequiredLevel, AnimePackGate.OwnsAnimePack.
 *   Spawn menu (bottom of the plugin page) - Refresh Item List reads every ItemBtn the game has (name, price, power,
 *     store or spawn list), pick one in the dropdown (it has a search box) or type a name, then:
 *       Click Game Button   runs the item button's own OnClick, so the game spawns it exactly like the tablet does
 *       Spawn Item          PlayerMultiplayer.Spawn(name)
 *       Spawn NPC           PlayerMultiplayer.SpawnNPCAt(name, GetNPCSpawnPosition())
 *       Spawn Vehicle       PlayerMultiplayer.SpawnVehicleAt(name, GetVehicleSpawnPosition())
 *     Which of the last three fits which kind of item isn't in the dump, so if one does nothing try the next.
 *     The log prints every item name it found so we can sort them into weapons / NPCs / vehicles.
 *
 * New in v4:
 *   Stat Tweaker - multipliers on the game's PlayerValues (max health, walk, sprint, jump, gravity, punch knockback,
 *     regen, money, damage resistance, knockback resistance). The originals are remembered and put back when you turn it
 *     off, and printed in the log the first time so we can see the real numbers. A stat whose original is 0 gets
 *     (multiplier - 1) instead, since 0 times anything is 0.
 *   Fly - left stick moves where you look, right stick up / down. Turns off gravity and the locomotion height PID.
 *   Teleport - Save Position, Teleport To Saved, Teleport Up (uses PlayerMultiplayer.Teleport).
 *   Enemy tools - Kill All Enemies (button), Freeze Enemies and Weak Enemies (toggles, run on AIBase.RequiredUpdate).
 *
 * New in v5:
 *   Vehicles are an in-app purchase in this game (IAPManager.ownsVehicles / OwnsItemIAP), separate from the item
 *   ownership checks, so Unlock Everything now also hooks IAPManager.OwnsItemIAP and sets ownsVehicles +
 *   allWeaponsOwned on IAPManager.Instance (the originals are put back when it's turned off).
 *   Refresh Vehicle Page runs Menu.LoadVehicleIAP so the tablet's vehicle page updates without reopening it.
 *   The spawn menu now tags items [vehicle] / [npc] using the game's own WeaponInfo.IsVehicle / IsNPC lists, and
 *   Smart Spawn picks the right spawn call for you (vehicle -> SpawnVehicleAt, npc -> SpawnNPCAt, else Spawn).
 *   Spawn Vehicle goes straight to SpawnVehicleAt, which skips the purchase screen, so it works with or without unlock.
 *
 * New in v6:
 *   Unlock Skins & Hats - IAPManager.OwnsSkin / OwnsHatCash and DisplayPlayer.OwnsHat always say yes, and
 *   IAPManager.GetUnlockedSkinIndices gets every skin index added to the list the game returns (indices come from
 *   the SkinHolder's skins array plus every CosmeticPack's skinIndex, and are printed in the log once).
 *   Refresh Skin Page re-runs the skin page setup (DisplayPlayer.InitSkin) so it picks up the new list.
 *
 * New in v8 (this plugin stays separate from thooms_buddy_beatdown.js):
 *   Grab Anything - widens MultiplayerHand's grabableMask / ragdollMask / crawlMask to every layer, so the game's own grip
 *     code can pick up enemies, cars, props and other players, and climb anything. Reach and Hand Strength sliders.
 *     Originals are put back when it's turned off.
 *   Vacuum - Vacuum Enemies keeps every enemy parked on a ring around you (NavMeshAgent.Warp). Pull Ring Now does it once,
 *     Pop Enemies kills them. Vacuum Players is EXPERIMENTAL: it sends the game's own PlayerInfoSync.AddPlayerHit towards you.
 *   Rain Money - MoneySpawner.SpawnPopUp makes the +$ popups fall around you and LocalGameManager.AddMoney pays them. The game
 *     has no pickup objects, so the popups are visual and the money is added directly.
 *   Camera - FOV slider (Camera.fieldOfView on the player camera, a headset usually ignores it) and an EXPERIMENTAL third person
 *     that pushes the camera back and up each frame.
 *   Score Changer - sets kills, deaths and buddy (ragdoll) kills for everyone, only you, or everyone but you
 *     (GameSync.model playerKills / playerDeaths / ragdollKills). Lock Scores re-applies it every second.
 *     Leaderboard.SubmitMatchScores exists in the game, so fake scores may reach the online leaderboard. Private rooms only.
 *
 * New in v7.3:
 *   Smart Spawn now also lists every spawnable name from thooms_buddy_beatdown.js (weapons, zombies, Truck, UFO,
 *   Nimbus, GoKart, Helicopter) next to whatever the tablet's ItemBtn objects give, tagged [prefab]. The list works
 *   right away without opening the tablet, and Refresh Item List only adds the tablet's own entries on top.
 *
 * New in v7:
 *   No Recoil also zeroes WeaponInfo.Pushback, the force that shoves YOU backwards when a gun fires.
 *   Kill buttons: Kill All Enemies (already there), Kill All Players (other players, not you), Kill All Dummies
 *   (other players' ragdoll dummies, plus EvilDummy objects which are only removed on your side), Kill Everything.
 *   ESP: Box (3D wireframe), Bones (skeleton), Chams (see-through solid colour), Snaplines. Red = enemy,
 *   cyan = player, yellow = dummy. Targets are picked up from the game's own Update calls (no heap scans), so
 *   turning ESP on does not hitch. Needs Hidden/Internal-Colored and LineRenderer; if either is missing the log says so.
 *   Kill All Players and Kill All Dummies hit real people, so use them in your own private rooms.
 *
 * Put it in the imgui_plugins folder (vrfrida.py pushes it for this game because of the "// game:" line above).
 * Test in an offline / private mode first: Normcore multiplayer is in this game.
 */

var DEFS = [
    { type: "label", label: "Player" },
    { type: "bool", key: "god", label: "God Mode", default: false, desc: "blocks damage and death at the source (DoDamage, Death, remote hits, the synced PlayerInfoSync health) and keeps health full, so you never go invisible to others. turning it on also brings you back if you're already stuck invisible. hooks install the first time it is turned on" },
    { type: "bool", key: "speed", label: "Speed", default: false, desc: "sets your move speed to the value below (the game's own speed is put back when you turn it off)" },
    { type: "float", key: "speedValue", label: "Speed Value", min: 1, max: 60, default: 15, decimals: 1 },
    { type: "label", label: "Combat" },
    { type: "bool", key: "infAmmo", label: "Infinite Ammo", default: false },
    { type: "bool", key: "rapidFire", label: "Rapid Fire", default: false, desc: "edits the weapon you hold: full auto, tiny fire delay, no cooldown (put back when off)" },
    { type: "bool", key: "noRecoil", label: "No Recoil", default: false },
    { type: "bool", key: "bigDamage", label: "Infinite Damage", default: false, desc: "your hits, weapons and fists deal 99999 damage (weapon values are put back when off)" },
    { type: "bool", key: "punchLaunch", label: "Punch = Launch", default: false, desc: "any hit that damages an enemy also sends it flying (uses Launch Force). hooks install on first use" },
    { type: "label", label: "Movement" },
    { type: "bool", key: "fly", label: "Fly", default: false, desc: "left stick moves where you look, right stick goes up and down. let go to hover" },
    { type: "float", key: "flySpeed", label: "Fly Speed", min: 1, max: 30, default: 8, decimals: 1 },
    { type: "button", label: "Save Position", onClick: function () { savePos(); } },
    { type: "button", label: "Teleport To Saved", onClick: function () { tpSaved(); } },
    { type: "button", label: "Teleport Up", onClick: function () { tpUp(); } },
    { type: "bool", key: "noclip", label: "Noclip", default: false, desc: "turns your body collider off so you pass through walls. use with Fly so you don't fall" },
    { type: "bool", key: "hover", label: "Anti-Gravity Hover", default: false, desc: "float in place with no gravity. turn Fly off to use it" },
    { type: "label", label: "Enemies" },
    { type: "button", label: "Kill All Enemies", onClick: function () { killAll(); } },
    { type: "button", label: "Kill All Players", onClick: function () { killPlayers(); } },
    { type: "button", label: "Kill All Dummies", onClick: function () { killDummies(); } },
    { type: "button", label: "Kill Everything", onClick: function () { killAll(); killPlayers(); killDummies(); } },
    { type: "bool", key: "freezeEnemies", label: "Freeze Enemies", default: false, desc: "stops every enemy's navigation agent" },
    { type: "bool", key: "weakEnemies", label: "Weak Enemies", default: false, desc: "keeps enemy health at 1 so anything kills them" },
    { type: "button", label: "Launch All Enemies", onClick: function () { launchEnemies(); } },
    { type: "button", label: "Launch All Players", onClick: function () { launchPlayers(); } },
    { type: "float", key: "launchForce", label: "Launch Force", min: 5, max: 150, default: 50, decimals: 0 },
    { type: "label", label: "ESP" },
    { type: "bool", key: "espBox", label: "Box ESP", default: false, desc: "3D wireframe box around each target, through walls" },
    { type: "bool", key: "espBones", label: "Bone ESP", default: false, desc: "skeleton lines (humanoid bones, falls back to the mesh bones)" },
    { type: "bool", key: "espChams", label: "Chams", default: false, desc: "paints targets a solid colour that shows through walls (original materials put back when off)" },
    { type: "bool", key: "espSnap", label: "Snaplines", default: false, desc: "a line from in front of you to each target" },
    { type: "bool", key: "espEnemies", label: "ESP Enemies", default: true },
    { type: "bool", key: "espPlayers", label: "ESP Players", default: true },
    { type: "bool", key: "espDummies", label: "ESP Dummies", default: true },
    { type: "float", key: "espDist", label: "ESP Max Distance", min: 5, max: 300, default: 80, decimals: 0 },
    { type: "int", key: "espMax", label: "ESP Max Targets", min: 1, max: 20, default: 8 },
    { type: "int", key: "espEvery", label: "ESP Update Every N Frames", min: 1, max: 6, default: 2 },
    { type: "int", key: "espBoneMax", label: "Bone ESP Max Targets", min: 1, max: 10, default: 3 },
    { type: "int", key: "espBoneEvery", label: "Bone ESP Update Every N Frames", min: 1, max: 8, default: 3 },
    { type: "label", label: "Stat Tweaker (multipliers, 1 = normal)" },
    { type: "bool", key: "tweakStats", label: "Stat Tweaker", default: false, desc: "scales the game's own player stats, put back when off" },
    { type: "float", key: "statHealth", label: "Max Health x", min: 0.1, max: 20, default: 1, decimals: 2 },
    { type: "float", key: "statWalk", label: "Walk Speed x", min: 0.1, max: 10, default: 1, decimals: 2 },
    { type: "float", key: "statSprint", label: "Sprint Speed x", min: 0.1, max: 10, default: 1, decimals: 2 },
    { type: "float", key: "statJump", label: "Jump Force x", min: 0.1, max: 10, default: 1, decimals: 2 },
    { type: "float", key: "statGravity", label: "Gravity x", min: 0, max: 5, default: 1, decimals: 2 },
    { type: "float", key: "statKnock", label: "Punch Knockback x", min: 0, max: 20, default: 1, decimals: 2 },
    { type: "float", key: "statRegen", label: "Regen Speed x", min: 0, max: 50, default: 1, decimals: 2 },
    { type: "float", key: "statMoney", label: "Money Multiplier x", min: 0, max: 100, default: 1, decimals: 1 },
    { type: "float", key: "statResist", label: "Damage Resistance x", min: 0, max: 20, default: 1, decimals: 2 },
    { type: "float", key: "statKnockResist", label: "Knockback Resistance x", min: 0, max: 20, default: 1, decimals: 2 },
    { type: "label", label: "Unlocks" },
    { type: "bool", key: "unlockAll", label: "Unlock Everything", default: false, desc: "own every weapon, NPC, vehicle and power, no level gates. press Refresh Item List after turning it on" },
    { type: "button", label: "Refresh Vehicle Page", onClick: function () { refreshVehiclePage(); } },
    { type: "bool", key: "unlockSkins", label: "Unlock Skins & Hats", default: false, desc: "own every skin and hat, press Refresh Skin Page after turning it on" },
    { type: "button", label: "Refresh Skin Page", onClick: function () { refreshSkinPage(); } },
    { type: "label", label: "Economy" },
    { type: "int", key: "money", label: "Money Amount", min: 100, max: 1000000, default: 10000 },
    { type: "button", label: "Add Money", onClick: function () { addMoney(p.money); } },
    { type: "label", label: "Rain Money" },
    { type: "button", label: "Rain Money Now", onClick: function () { rainOnce(); } },
    { type: "bool", key: "moneyRain", label: "Keep Raining", default: false, desc: "drops popups around you on a timer and pays for them. the game has no pickups, so the popups are visual and the money goes straight to your balance" },
    { type: "int", key: "rainCount", label: "Drops Per Burst", min: 1, max: 60, default: 12 },
    { type: "int", key: "rainAmount", label: "Money Per Drop", min: 1, max: 100000, default: 100 },
    { type: "float", key: "rainRadius", label: "Rain Radius", min: 0.5, max: 15, default: 4, decimals: 1 },
    { type: "float", key: "rainHeight", label: "Rain Height", min: 0.5, max: 10, default: 3, decimals: 1 },
    { type: "float", key: "rainEvery", label: "Seconds Between Bursts", min: 0.1, max: 5, default: 0.5, decimals: 1 },
    { type: "label", label: "Grab Anything" },
    { type: "bool", key: "grabAnything", label: "Grab Anything", default: false, desc: "your grip can pick up enemies, cars, props and players, and climb anything. if you grab yourself, turn it off" },
    { type: "float", key: "grabReach", label: "Grab Reach (m)", min: 0.5, max: 10, default: 2, decimals: 1 },
    { type: "float", key: "grabStrength", label: "Hand Strength x", min: 1, max: 10, default: 1, decimals: 1 },
    { type: "label", label: "Vacuum" },
    { type: "bool", key: "vacEnemies", label: "Vacuum Enemies", default: false, desc: "parks every enemy on a ring around you" },
    { type: "bool", key: "vacPlayers", label: "Vacuum Players (experimental)", default: false, desc: "sends the game's own hit event pulling other players towards you. private rooms only, may do nothing" },
    { type: "float", key: "vacRadius", label: "Ring Radius", min: 1, max: 20, default: 4, decimals: 1 },
    { type: "float", key: "vacForce", label: "Player Pull Force", min: 1, max: 200, default: 30, decimals: 0 },
    { type: "button", label: "Pull Ring Now", onClick: function () { pullEnemiesNow(); } },
    { type: "button", label: "Pop Enemies", onClick: function () { killAll(); } },
    { type: "label", label: "Camera" },
    { type: "bool", key: "fovOn", label: "Custom FOV", default: false, desc: "sets Camera.fieldOfView on the player camera. a headset normally ignores this, so it may do nothing on Quest" },
    { type: "float", key: "fov", label: "FOV", min: 30, max: 150, default: 100, decimals: 0 },
    { type: "bool", key: "thirdPerson", label: "Third Person (experimental)", default: false, desc: "pushes the camera back and up every frame. if it flickers or does nothing, turn it off" },
    { type: "float", key: "tpDist", label: "Third Person Distance", min: 0.5, max: 8, default: 2.5, decimals: 1 },
    { type: "float", key: "tpHeight", label: "Third Person Height", min: -1, max: 4, default: 0.8, decimals: 1 },
    { type: "label", label: "Score Changer" },
    { type: "select", key: "scoreTarget", label: "Apply To", options: ["Everyone", "Only Me", "Everyone Except Me"], default: "Everyone" },
    { type: "int", key: "scoreKills", label: "Kills", min: 0, max: 99999, default: 100 },
    { type: "int", key: "scoreDeaths", label: "Deaths", min: 0, max: 99999, default: 0 },
    { type: "int", key: "scoreBuddy", label: "Buddy Kills", min: 0, max: 99999, default: 50 },
    { type: "button", label: "Set Kills", onClick: function () { setScore("kills", p.scoreKills); } },
    { type: "button", label: "Set Deaths", onClick: function () { setScore("deaths", p.scoreDeaths); } },
    { type: "button", label: "Set Buddy Kills", onClick: function () { setScore("buddy", p.scoreBuddy); } },
    { type: "button", label: "Set All Three", onClick: function () { setAllScores(); } },
    { type: "bool", key: "scoreLock", label: "Lock Scores", default: false, desc: "re-applies all three values every second so the game cannot change them" },
    { type: "label", label: "Player+ (v9)" },
    { type: "button", label: "Heal Now", onClick: function () { try { heal9(); } catch (e) { notify("Heal failed: " + e); } } },
    { type: "button", label: "Respawn", onClick: function () { var i = needPlayer9(); if (i) i.method("Respawn").invoke(false); } },
    { type: "bool", key: "instantRespawn", label: "Instant Respawn", default: false, desc: "no wait after dying. hooks the respawn delay the first time it is turned on" },
    { type: "bool", key: "infJump", label: "Infinite Jump", default: false, desc: "the double jump never gets used up" },
    { type: "bool", key: "alwaysSprint", label: "Always Sprint", default: false },
    { type: "button", label: "Mute Everyone", onClick: function () { var i = needPlayer9(); if (i) i.method("MuteAllPlayers").invoke(); } },
    { type: "button", label: "Unmute Everyone", onClick: function () { var i = needPlayer9(); if (i) i.method("UnmuteAllPlayers").invoke(); } },
    { type: "int", key: "tpSlot", label: "Player Slot", min: 1, max: 12, default: 1, desc: "other players, in the order the game lists them" },
    { type: "button", label: "Teleport To Player Slot", onClick: function () { try { tpToPlayer(); } catch (e) { notify("Teleport failed: " + e); } } },
    { type: "select", key: "myFace", label: "My Face", options: ["(pick)"], default: "(pick)", desc: "your own networked expression. the list fills in once you are in game" },
    { type: "button", label: "Apply Face", onClick: function () { try { applyFace(); } catch (e) { notify("Face failed: " + e); } } },
    { type: "label", label: "Powers+ (v9)" },
    { type: "bool", key: "kameMax", label: "Kamehameha: Instant + Max Damage", default: false },
    { type: "bool", key: "smashMax", label: "Smash: No Cooldown + Huge", default: false },
    { type: "bool", key: "fistMax", label: "Fire Fist: Max Damage", default: false },
    { type: "bool", key: "itMax", label: "Instant Transmission: Long Range, No Cooldown", default: false },
    { type: "bool", key: "laserInf", label: "Laser: Infinite Charge", default: false },
    { type: "label", label: "Enemies+ (v9)" },
    { type: "float", key: "enHp", label: "Enemy Health x", min: 0.1, max: 50, default: 1, decimals: 1 },
    { type: "float", key: "enDmg", label: "Enemy Damage x", min: 0, max: 50, default: 1, decimals: 1 },
    { type: "float", key: "enSpd", label: "Enemy Speed x", min: 0.1, max: 20, default: 1, decimals: 1 },
    { type: "button", label: "Apply To Current Enemies", onClick: function () { try { applyEnemyMults(); } catch (e) { notify("Failed: " + e); } } },
    { type: "bool", key: "ignoreMe", label: "Enemies Ignore Me (experimental)", default: false, desc: "enemies pick no player to chase. hook installs on first use" },
    { type: "bool", key: "noNpcLimit", label: "Unlimited NPC Spawns", default: false, desc: "stops the game removing old NPCs when you spawn more" },
    { type: "label", label: "Vehicles+ (v9)" },
    { type: "bool", key: "keepVehicles", label: "Keep Previous Vehicles", default: false, desc: "spawning a vehicle no longer deletes the last one" },
    { type: "bool", key: "vehSpeed", label: "Vehicle Speed Multiplier", default: false, desc: "cars, planes, helicopters and the Nimbus. originals restored when off" },
    { type: "float", key: "vehMul", label: "Vehicle Speed x", min: 0.2, max: 10, default: 2, decimals: 1 },
    { type: "bool", key: "carTune", label: "Car Tuning (exact values)", default: false, desc: "the car you are driving gets the values below (checked every second). its own values come back when off" },
    { type: "float", key: "carTop", label: "Car Top Speed", min: 1, max: 500, default: 42, decimals: 1 },
    { type: "float", key: "carAccel", label: "Car Acceleration", min: 1, max: 500, default: 17, decimals: 1 },
    { type: "float", key: "carBrake", label: "Car Brake Deceleration", min: 1, max: 500, default: 14, decimals: 1 },
    { type: "float", key: "carFalloff", label: "Car Acceleration Falloff", min: 0, max: 20, default: 1.7, decimals: 1 },
    { type: "label", label: "♦ OP STATS (your skill point stats, maxed only while on)" },
    { type: "bool", key: "opDamage", label: "OP Damage", default: false },
    { type: "bool", key: "opResist", label: "OP Resistance", default: false, desc: "you take almost no damage" },
    { type: "bool", key: "opReload", label: "OP Reload Speed", default: false },
    { type: "bool", key: "opCrit", label: "100% Critical Chance", default: false },
    { type: "bool", key: "opCritDmg", label: "OP Critical Damage", default: false },
    { type: "bool", key: "opRegen", label: "OP HP Regeneration", default: false },
    { type: "bool", key: "opKnock", label: "OP Knockback", default: false },
    { type: "bool", key: "opTurbo", label: "100% Turbo Chance", default: false },
    { type: "bool", key: "opLifeSteal", label: "Full Life Steal", default: false },
    { type: "bool", key: "opBurn", label: "Full Burn Damage", default: false },
    { type: "bool", key: "opBuddyHP", label: "Huge Bonus Buddy HP", default: false },
    { type: "label", label: "Lobby (v9, the 6.7.9 lobby)" },
    { type: "button", label: "Buddy: Teleport To Me", onClick: function () { try { buddyToMe(); } catch (e) { notify("Failed: " + e); } } },
    { type: "float", key: "buddyPower", label: "Buddy Launch Power", min: 5, max: 100, default: 25, decimals: 0 },
    { type: "button", label: "Buddy: Launch", onClick: function () { try { buddyLaunch(); } catch (e) { notify("Failed: " + e); } } },
    { type: "bool", key: "buddyFarm", label: "Buddy Cash Farm", default: false, desc: "hurts your lobby buddy 3x a second with the multiplier below and the game pays you for it" },
    { type: "int", key: "buddyMult", label: "Buddy Cash Multiplier", min: 1, max: 1000, default: 10 },
    { type: "bool", key: "noRewardCd", label: "No Reward Pad Cooldown", default: false },
    { type: "button", label: "Ring The High Striker", onClick: function () { try { ringBell(); } catch (e) { notify("Failed: " + e); } } },
    { type: "button", label: "Put My Buddy On The Wheel", onClick: function () { try { wheelBuddy(); } catch (e) { notify("Failed: " + e); } } },
    { type: "button", label: "Spawn Buddy In Front", onClick: function () { try { lobbyAct("SpawnBuddyInFront"); } catch (e) { notify("Failed: " + e); } } },
    { type: "button", label: "Return To Spawn", onClick: function () { try { lobbyAct("ReturnToSpawn"); } catch (e) { notify("Failed: " + e); } } },
    { type: "label", label: "Maps (v9)" },
    { type: "bool", key: "mapHidden", label: "Include Hidden Maps", default: false, desc: "also lists maps the game hides from its own selector" },
    { type: "button", label: "Refresh Map List", onClick: function () { try { refreshMaps(); } catch (e) { notify("Failed: " + e); } } },
    { type: "select", key: "mapSel", label: "Map", options: ["(refresh first)"], default: "(refresh first)" },
    { type: "button", label: "Travel To Map", onClick: function () { try { travelMap(); } catch (e) { notify("Travel failed: " + e); } } },
    { type: "button", label: "Return To Lobby", onClick: function () { try { returnLobby(); } catch (e) { notify("Failed: " + e); } } },
    { type: "button", label: "Unlock All Maps (level gate)", onClick: function () { try { unlockMaps(); } catch (e) { notify("Failed: " + e); } } },
    { type: "label", label: "Rooms & Feed (v9.2)" },
    { type: "bool", key: "killFeed", label: "Kill Feed", default: true, desc: "a notification for every death the game records: who killed who" },
    { type: "text", key: "roomCode", label: "Room Code", default: "" },
    { type: "button", label: "Join Room Code", onClick: function () { try { joinCode(); } catch (e) { log("join: " + e); notify("Join failed: " + e); } } },
    { type: "button", label: "Leave Private Room", onClick: function () { try { leaveCode(); } catch (e) { notify("Failed: " + e); } } },
    { type: "label", label: "Lobby Games+ (v9.2)" },
    { type: "select", key: "wheelFate", label: "Wheel Fate", options: ["Random", "Taze", "Freeze", "Burn", "Launch", "Behead", "Kaboom", "Jackpot", "MegaLaunch"], default: "Random", desc: "what the Wheel of Misfortune lands on when you spin it" },
    { type: "button", label: "Score Goal: Blue", onClick: function () { try { scoreGoal(0); } catch (e) { notify("Failed: " + e); } } },
    { type: "button", label: "Score Goal: Orange", onClick: function () { try { scoreGoal(1); } catch (e) { notify("Failed: " + e); } } },
    { type: "bool", key: "noBoundary", label: "Remove Lobby Boundary", default: false, desc: "no invisible wall or ceiling push-back, fly anywhere around the lobby" },
    { type: "int", key: "buddyStateId", label: "Buddy State Number", min: 0, max: 8, default: 1, desc: "the game's ragdoll state id (taze / fire / freeze etc). try numbers, the log shows what was sent" },
    { type: "button", label: "Buddy State: My Buddy", onClick: function () { try { buddyState(false); } catch (e) { log("state: " + e); notify("Failed: " + e); } } },
    { type: "button", label: "Buddy State: Every Buddy", onClick: function () { try { buddyState(true); } catch (e) { log("state: " + e); notify("Failed: " + e); } } },
    { type: "label", label: "Weapons+ (v9.2)" },
    { type: "bool", key: "instantReload", label: "Instant Reload", default: false },
    { type: "bool", key: "instantFuse", label: "Instant Grenades", default: false, desc: "grenades, sticky grenades and hit grenades blow almost right away" },
    { type: "button", label: "Max All SP Upgrades", desc: "lifesteal, crit, berserk, titan shield, laser eye, auras... the game may save this to your cloud profile", onClick: function () { try { maxSP(); } catch (e) { log("sp: " + e); notify("Failed: " + e); } } },
    { type: "label", label: "Bulk Spawner (networked, uses the item picked in the Spawn menu)" },
    { type: "int", key: "bulkCount", label: "How Many", min: 1, max: 60, default: 15 },
    { type: "float", key: "bulkScale", label: "Size x", min: 0.5, max: 25, default: 10, decimals: 1, desc: "synced scale, everyone sees the size" },
    { type: "float", key: "bulkRadius", label: "Ring Radius (m)", min: 1, max: 40, default: 8, decimals: 0 },
    { type: "button", label: "Spawn Bunch", onClick: function () { try { bulkSpawn(); } catch (e) { log("bulk: " + e); notify("Bulk spawn failed: " + e); } } },
    { type: "bool", key: "bulkAuto", label: "Auto Respawn", default: false, desc: "every second, tops the pile back up to How Many when items get destroyed or despawn" },
    { type: "button", label: "Remove Spawned Items", onClick: function () { try { bulkClear(); } catch (e) { notify("Failed: " + e); } } },
    { type: "label", label: "Clone Rigs (networked player avatars that copy you)" },
    { type: "int", key: "cloneCount", label: "Clones", min: 1, max: 12, default: 4 },
    { type: "float", key: "cloneRadius", label: "Clone Ring Radius (m)", min: 0.5, max: 10, default: 2, decimals: 1 },
    { type: "bool", key: "cloneFollow", label: "Clones Copy Movement", default: true },
    { type: "select", key: "cloneMode", label: "Formation", options: ["Ring", "Orbit", "Line Behind", "Wall", "Cluster", "Tower", "Swarm", "Echo Trail"], default: "Ring", desc: "echo trail: every clone replays your moves a bit later than the one before" },
    { type: "float", key: "cloneSpin", label: "Orbit Speed (deg/s)", min: 10, max: 360, default: 60, decimals: 0 },
    { type: "float", key: "cloneDelay", label: "Echo Delay (s)", min: 0.1, max: 1.5, default: 0.3, decimals: 2 },
    { type: "bool", key: "cloneHideMe", label: "Hide Me In The Clones", default: true, desc: "you become one slot of the formation instead of its centre, so nobody can tell which one is you (clones following Me only)" },
    { type: "float", key: "cloneShuffle", label: "Shuffle My Spot Every (s, 0 = off)", min: 0, max: 30, default: 6, decimals: 0 },
    { type: "select", key: "cloneLook", label: "Clones Look Like", options: ["Me", "Followed Player", "Each Other Player", "Random Skins"], default: "Me", desc: "avatar skin, colour, hat, face, level. each other player: clone 1 copies the first other player, clone 2 the next, and so on. skins, hats and faces update live for everyone" },
    { type: "select", key: "cloneNames", label: "Clone Names", options: ["Same As Look", "Custom List", "Numbered", "Random"], default: "Same As Look", desc: "custom list: one name per clone from the box below, comma separated (cycles if there are more clones than names). numbered: first name in the box (or the look's name) + 1, 2, 3. random: a different made-up name per clone" },
    { type: "text", key: "cloneName", label: "Clone Names (comma separated)", default: "" },
    { type: "bool", key: "cloneShowMe", label: "See My Own Clones", default: true, desc: "the game hides every body you own on your own screen. this shows the clones to you too. others always see them" },
    { type: "button", label: "Re-apply Clone Looks", onClick: function () { try { reapplyLooks(); } catch (e) { log("clones: " + e); notify("Failed: " + e); } } },
    { type: "button", label: "Respawn Clones (pushes new names to everyone)", onClick: function () { try { var n = clones.list.length || p.cloneCount; clonesClear(); p.cloneCount = Math.max(1, Math.min(12, n)); cloneSpawn(); } catch (e) { log("clones: " + e); notify("Failed: " + e); } } },
    { type: "select", key: "cloneTarget", label: "Clones Follow", options: ["Me", "Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5", "Slot 6", "Slot 7", "Slot 8"], default: "Me", desc: "slots are the other players in the room, by join order. the clones ring them and copy their head and hands. the label shows who" },
    { type: "button", label: "Spawn Clones", onClick: function () { try { cloneSpawn(); } catch (e) { log("clones: " + e); notify("Clone spawn failed: " + e); } } },
    { type: "button", label: "Remove Clones", onClick: function () { try { clonesClear(); } catch (e) { notify("Failed: " + e); } } },
    { type: "bool", key: "cloneCopyFace", label: "Clones Copy My Face", default: true, desc: "every clone makes the same face as you, live (synced, everyone sees it)" },
    { type: "select", key: "cloneAnim", label: "Clone Animation", options: ["None", "Wave", "Dance", "Jumping Jacks", "Flap", "Spin", "Headbang", "Zombie"], default: "None", desc: "the clones move their head and hands on their own (on top of copying you)" },
    { type: "bool", key: "cloneAnimSync", label: "Animate In Sync", default: false, desc: "off: each clone is a little behind the one before, like a wave" },
    { type: "float", key: "cloneAnimSpeed", label: "Animation Speed", min: 0.3, max: 3, default: 1, decimals: 1 },
    { type: "bool", key: "cloneAutoRespawn", label: "Auto Respawn Clones", default: false, desc: "a clone that gets destroyed is spawned again (checked every 3 s)" },
    { type: "label", label: "♦ PUNCHING BAG (the lobby bag is synced: everyone sees the hits, the swing and the record)" },
    { type: "label", label: "Bag: not found yet (go near the punching bag in the lobby)", key: "__bagInfo" },
    { type: "float", key: "bagPower", label: "Hit Power", min: 1, max: 100000, default: 9999, decimals: 0 },
    { type: "text", key: "bagName", label: "Record Holder Name (empty = you)", default: "" },
    { type: "button", label: "Hit The Bag", onClick: function () { try { bagHit(p.bagPower, 1); } catch (e) { log("bag: " + e); notify("Failed: " + e); } } },
    { type: "button", label: "Beat The Record (+1)", onClick: function () { try { bagBeat(); } catch (e) { log("bag: " + e); notify("Failed: " + e); } }, desc: "a hit just over the record: you take the record and the game pays its record reward" },
    { type: "button", label: "Set Record Exactly", onClick: function () { try { bagSetRecord(p.bagPower); } catch (e) { log("bag: " + e); notify("Failed: " + e); } }, desc: "sets the record to Hit Power with your (or the custom) name, even lower than now. no reward" },
    { type: "button", label: "Reset Record", onClick: function () { try { bagSetRecord(0, ""); } catch (e) { log("bag: " + e); notify("Failed: " + e); } } },
    { type: "bool", key: "bagAuto", label: "Auto Record Farm", default: false, desc: "keeps beating the record by +1: each new record pays the game's record reward" },
    { type: "float", key: "bagEvery", label: "Farm Every (s)", min: 1, max: 30, default: 2, decimals: 1 },
    { type: "float", key: "bagLaunch", label: "Launch Force", min: 100, max: 50000, default: 4000, decimals: 0 },
    { type: "button", label: "Launch The Bag", onClick: function () { try { bagLaunch(); } catch (e) { log("bag: " + e); notify("Failed: " + e); } }, desc: "a hit with a huge upward push: the bag flies on everyone's screen" },
    { type: "bool", key: "bagChaos", label: "Bag Chaos", default: false, desc: "random hard hits from every direction, about once a second" },
    { type: "label", label: "Mic Soundboard (your own sounds, sent through your voice chat)" },
    { type: "button", label: "Reload Sound Files", desc: "files from Mods/sounds, pushed by vrfrida", onClick: function () { try { micRefresh(); } catch (e) { log("mic: " + e); notify("Failed: " + e); } } },
    { type: "select", key: "micSound", label: "Sound File", options: ["(reload first)"], default: "(reload first)" },
    { type: "button", label: "Play Through Mic", onClick: function () { try { micPlay(); } catch (e) { log("mic: " + e); notify("Failed: " + e); } } },
    { type: "button", label: "Stop", onClick: function () { mic.pcm = null; localStop(); } },
    { type: "bool", key: "micHear", label: "Hear It Myself", default: true, desc: "also plays the sound on your own headset, so you know it is going out" },
    { type: "float", key: "micVol", label: "Sound Volume", min: 0, max: 3, default: 1, decimals: 2 },
    { type: "bool", key: "micMuteReal", label: "Mute My Real Voice While Playing", default: false },
    { type: "bool", key: "micLoop", label: "Loop Sound", default: false },
    { type: "label", label: "Soundboard (networked game sounds, everyone hears them)" },
    { type: "button", label: "Refresh Sound List", desc: "reads the Megaphone's sound list. if it finds nothing, spawn a Megaphone once and press again", onClick: function () { try { refreshSounds(); } catch (e) { log("sounds: " + e); notify("Failed: " + e); } } },
    { type: "select", key: "soundSel", label: "Sound", options: ["(refresh first)"], default: "(refresh first)" },
    { type: "select", key: "soundFrom", label: "Play From", options: ["Me", "Every Clone", "Followed Player"], default: "Every Clone" },
    { type: "button", label: "Play Sound", onClick: function () { try { playSound(); } catch (e) { log("sounds: " + e); notify("Failed: " + e); } } },
    { type: "bool", key: "soundLoop", label: "Repeat Sound", default: false },
    { type: "float", key: "soundEvery", label: "Repeat Every (s)", min: 0.5, max: 10, default: 2, decimals: 1 },
];

// ---- category split: the controls live in the 1_buddy_*.js plugins, this engine reads them through `p` ----
var p = (function (defs, ns, engine) {
    var B = globalThis.__BB;
    // the main engine loads first (file order) and starts a fresh registry on every load
    if (!B || engine === "main") {
        B = globalThis.__BB = { cats: {}, bags: {}, defs: {}, local: {}, tabs: {}, engines: [] };
        B.register = function (cat, bag) {
            (B.cats[cat] || []).forEach(function (d) {
                if (!d.key) return;
                B.bags[d.key] = bag;
                if (d.key in B.local) { try { bag[d.key] = B.local[d.key]; } catch (e) { } }
            });
        };
    }
    if (B.engines.indexOf(engine) >= 0) for (var c in B.cats) B.cats[c] = B.cats[c].filter(function (d) { return d.__eng !== engine; });
    else B.engines.push(engine);
    var CATS = [
        [/^(Player\b|Movement|Stat Tweaker|Player\+|Powers\+|♦ PLAYER)/, "player"],
        [/^(Combat|Enemies|Weapons\+|Grab Anything|Vacuum|♦ COMBAT|♦ ZOMBIES|♦ OP TOOLS|♦ OP STATS)/, "combat"],
        [/^(ESP|Camera)/, "visuals"],
        [/^(Lobby|Maps|Rooms|Vehicles\+|Bulk Spawner|♦ SPAWN|♦ NETWORKED FUN|♦ PUNCHING BAG)/, "world"],
        [/^(Clone Rigs|Mic Soundboard|Soundboard|♦ NAME|♦ FACES|♦ HATS|♦ ITEM SIZE)/, "fun"],
        [/^(Unlocks|Economy|Rain Money|Score Changer|♦ WIPES|♦ PROGRESSION|♦ ECONOMY)/, "account"],
        [/^♦ DEV TOOLS/, "dev"],
    ];
    var cat = null;
    defs.forEach(function (d) {
        if (d.type === "label") for (var i = 0; i < CATS.length; i++) if (CATS[i][0].test(d.label)) { cat = CATS[i][1]; break; }
        d.__eng = engine;
        if (d.key) { d.key = ns + d.key; B.defs[d.key] = d; }
        if (cat) (B.cats[cat] = B.cats[cat] || []).push(d);
    });
    function dflt(d) {
        if (d.default !== undefined) return d.default;
        return d.type === "bool" ? false : d.type === "select" ? (d.options || [])[0] || "" : d.type === "text" ? "" : (d.min || 0);
    }
    return new Proxy({}, {
        get: function (_, k) {
            if (typeof k !== "string") return undefined;
            var kk = ns + k, b = B.bags[kk];
            if (b) return b[kk];
            if (kk in B.local) return B.local[kk];
            var d = B.defs[kk];
            return d ? dflt(d) : undefined;
        },
        set: function (_, k, v) { var kk = ns + k, b = B.bags[kk]; if (b) b[kk] = v; else B.local[kk] = v; return true; },
    });
})(DEFS, "", "main");
props([{ type: "label", label: "engine: the controls are in the buddy_player / combat / visuals / world / fun / account / dev plugins" }]);

var HandCls = null, GameSyncCls = null, MoneyCls = null;
var PlayerMP = null, GrabableCls = null, RecoilCls = null, GameMgrCls = null, AIDamageCls = null;
var ItemBtnCls = null, InvCls = null, WLRCls = null, AnimeCls = null;
var IAPCls = null, WeaponInfoCls = null, MenuCls = null, DisplayCls = null, SkinHolderCls = null, PackRegCls = null;
var skinIdx = null;
var NetPlayerCls = null, NetRagCls = null, DummyCls = null, SyncCls = null, NetEnemyCls = null, EnemyMgrCls = null;
var iapOrig = null, iapTick = 0;
var originalSpeed = null;
var originalPunch = null;
var noclipApplied = false;
var AIBaseCls = null, AIKinds = [];
var originalStats = null, statTick = 0;
var flyState = null;
var savedPos = null;
var prevFreeze = false, unfreezeUntil = 0;
var STAT_FIELDS = [["maxHealth", "statHealth"], ["walkSpeed", "statWalk"], ["sprintSpeed", "statSprint"], ["jumpForce", "statJump"],
    ["gravityMultiplier", "statGravity"], ["punchKnockback", "statKnock"], ["regenSpeed", "statRegen"], ["moneyMultiplier", "statMoney"],
    ["damageResistance", "statResist"], ["knockbackResistance", "statKnockResist"]];
var savedWeapons = {};
var failures = {};
var liveLogged = {};

// spawn menu state
var entries = [];            // { name, price, isPower, inStore, btn }
var itemLabels = [];
var sel = ref(0);
var typed = { v: "" };
var WEAPON_FALLBACK = ["Pistol", "SilencedPistol", "MAC10", "TommyGun", "Hammer", "Bat", "Dumbell", "AK47", "AssaultRifle",
    "Shotgun", "Revolver", "BrassKnuckles", "Colt", "UMP", "HeavyPistol", "SawedOff", "Deagle", "MiniGun", "HuntRifle",
    "AKU", "CrappyGun", "BasicSword", "Katana", "GodHammer", "Sniper", "Superminigun"];

// every spawnable name from thooms_buddy_beatdown.js, so Smart Spawn works without opening the tablet
var PREFAB_NAMES = [
    "EnergyBlast", "CrappyGun", "Silenced", "Shotgun", "FlameThrow", "Pinner", "Puncher",
    "Shield", "Dash", "Grapple", "Sprayer", "Taser", "Megaphone", "RPG", "StickGrenade",
    "Grenade", "HitMortar", "Mine", "Hammer", "Baseball", "Bat", "Pan", "Dumbell", "Guitar",
    "BasicSword", "Roller", "Shovel", "Claws", "Buzzsaw", "BrassKnuckles", "GreatAxe", "Katana",
    "Halberg", "BigClub", "Sledge", "Pipe", "Zanza", "GodHammer", "Pistol", "Revolver", "TommyGun",
    "Skorpion", "HeavyPistol", "FoamGun", "G18", "Sniper", "Minigun", "AKU", "SawedOff", "M249",
    "AR", "Crossbow", "HuntRifle", "AutoShotgun", "GrenadeLauncher", "Zombie", "ZombieFriend",
    "ZombieRifle", "ZombiePistol", "Truck", "UFO", "Nimbus", "GoKart", "Helicopter"
];
// used only when the game's own WeaponInfo.IsVehicle / IsNPC lists say "item" for these names
var PREFAB_VEHICLES = { Truck: 1, UFO: 1, Nimbus: 1, GoKart: 1, Helicopter: 1 };
var PREFAB_NPCS = { Zombie: 1, ZombieFriend: 1, ZombieRifle: 1, ZombiePistol: 1 };

function prefabKind(name) {
    var k = kindOf(name);
    if (k !== "item") return k;
    if (PREFAB_VEHICLES[name]) return "vehicle";
    if (PREFAB_NPCS[name]) return "npc";
    return "item";
}

function entryLabel(e) {
    return e.name + (e.kind === "vehicle" ? "  [vehicle]" : e.kind === "npc" ? "  [npc]" : "") + (e.isPower ? "  [power]" : "") +
        (e.prefab ? "  [prefab]" : "") + (e.inStore ? "  (store)" : "") + (e.price ? "  $" + e.price : "");
}

// fills the list from PREFAB_NAMES alone (no tablet needed, no scene scan)
function seedPrefabEntries() {
    entries = PREFAB_NAMES.slice().sort().map(function (n) {
        return { name: n, price: 0, isPower: false, inStore: false, btn: null, kind: prefabKind(n), prefab: true };
    });
    itemLabels = entries.map(entryLabel);
    if (sel.v >= entries.length) sel.v = 0;
}

// returns true once a feature has failed 5 times, so the caller can switch it off
function fail(name, e) {
    failures[name] = (failures[name] || 0) + 1;
    if (failures[name] === 1) log(name + " error: " + e);
    if (failures[name] === 5) log(name + " keeps failing, switching it off");
    if (failures[name] >= 5) return true;
    return false;
}

function live(name) {
    if (liveLogged[name]) return;
    liveLogged[name] = true;
    log("hook live: " + name);
}

function setup() {
    var asm = Il2Cpp.domain.tryAssembly("Assembly-CSharp");
    var image = asm ? asm.image : null;
    if (!image) { log("Assembly-CSharp not found, nothing to do"); return false; }
    PlayerMP = image.tryClass("PlayerMultiplayer");
    GrabableCls = image.tryClass("MultiplayerGrabable");
    HandCls = image.tryClass("MultiplayerHand");
    GameSyncCls = image.tryClass("GameSync");
    MoneyCls = image.tryClass("MoneySpawner");
    RecoilCls = image.tryClass("RecoilAnimation");
    GameMgrCls = image.tryClass("LocalGameManager");
    AIDamageCls = image.tryClass("AIDamage");
    ItemBtnCls = image.tryClass("ItemBtn");
    InvCls = image.tryClass("InventoryManager");
    WLRCls = image.tryClass("WeaponLevelRequirements");
    AnimeCls = image.tryClass("AnimePackGate");
    IAPCls = image.tryClass("IAPManager");
    WeaponInfoCls = image.tryClass("WeaponInfo");
    MenuCls = image.tryClass("Menu");
    DisplayCls = image.tryClass("DisplayPlayer");
    SkinHolderCls = image.tryClass("SkinHolder");
    PackRegCls = image.tryClass("CosmeticPackRegistry");
    NetPlayerCls = image.tryClass("NetworkPlayer");
    NetRagCls = image.tryClass("NetworkRagdoll");
    DummyCls = image.tryClass("EvilDummyBehaviour");
    SyncCls = image.tryClass("PlayerInfoSync");
    AIBaseCls = image.tryClass("AIBase");
    // AIBase plus every class that inherits from it (found by walking parents, so no names are guessed)
    AIKinds = [];
    if (AIBaseCls) {
        AIKinds.push(AIBaseCls);
        try {
            image.classes.forEach(function (c) {
                try {
                    var pr = c.parent;
                    while (pr) {
                        if (pr.handle.equals(AIBaseCls.handle)) { AIKinds.push(c); break; }
                        pr = pr.parent;
                    }
                } catch (e) { }
            });
        } catch (e) { }
        log("enemy classes: " + AIKinds.map(function (c) { return c.name; }).join(", "));
    }
    NetEnemyCls = image.tryClass("NetworkEnemy");
    EnemyMgrCls = image.tryClass("EnemyManager");
    return true;
}

// Wraps one instance method. before() runs first, after() runs once the original is done.
// Passive hook: the game runs its own method natively and our code only runs before / after it.
// A full replacement ran the original from inside JS, and any C# exception it threw (a destroyed object, say)
// could not unwind through the JS frames, which aborted the game. Errors in our own code are swallowed here too.
// ---- is a Unity object still alive? ----
// Calling any Unity method on a destroyed object throws inside the game. Frida turns that into "abort was called",
// but the half-unwound exception leaves the main thread damaged and the next GC crashes the game. So read
// UnityEngine.Object.m_CachedPtr (offset 0x10 in this build) instead: null means the native object is gone.
function uAlive(o) {
    try { return !!o && !o.isNull() && !o.handle.add(0x10).readPointer().isNull(); } catch (e) { return false; }
}

// heap scans also return objects Unity already destroyed (not yet garbage collected), so every scan drops those
// Unity's own object index (FindObjectsOfType, inactive included) instead of walking the whole managed heap:
// a heap walk takes tens of ms and the timed features ran it several times a second, which showed up as stutter.
var findOT = null;
function choose(cls) {
    try {
        if (!findOT) findOT = coreCls("UnityEngine.Object").method("FindObjectsOfType", 2).overload("System.Type", "System.Boolean");
        var arr = findOT.invoke(cls.type.object, true), out = [];
        for (var i = 0; arr && !arr.isNull() && i < arr.length; i++) { var o = arr.get(i); if (uAlive(o)) out.push(o); }
        return out;
    } catch (e) { return Il2Cpp.gc.choose(cls).filter(uAlive); }
}
// prefabs / assets are not in the scene, so the few lookups that need them still walk the heap
function chooseHeap(cls) { return Il2Cpp.gc.choose(cls).filter(uAlive); }

// ---- stall tracer: names the step the game's main thread froze in ----
// Each step writes its name before running. If frames stop for 3s, a timer on Frida's own thread logs that name.
var ST = { step: "idle", frameAt: Date.now(), told: 0, inFrame: false };
function step(name) { ST.step = name; }
setInterval(function () {
    var gap = Date.now() - ST.frameAt;
    if (gap > 3000 && ST.told !== ST.frameAt) { ST.told = ST.frameAt; log("STALL: no frame for " + (gap / 1000).toFixed(1) + "s, " + (ST.inFrame || /^(hook|replaced|install|revert)/.test(ST.step) ? "the engine was in: " + ST.step : "the engine frame had finished (last step: " + ST.step + "), so the game froze in its own code or in another plugin's hook")); }
}, 1000);

// need(): the hook is only attached while it returns true, so per-object Update hooks cost nothing while their features are off
var LAZY = [], lazyAt = 0;
function hookMethod(cls, clsName, name, before, after, need) {
    var m = cls ? cls.tryMethod(name) : null;
    if (!m) return clsName + "." + name;
    var cb = {
        onEnter: function (args) {
            this.self = args[0];
            ST.step = "hook " + clsName + "." + name;
            if (before) { try { before(new Il2Cpp.Object(args[0]), args); } catch (e) { fail(clsName + "." + name + " before", e); } }
        },
        onLeave: function () {
            ST.step = "game code (after hook " + clsName + "." + name + ")";
            if (after) { try { after(new Il2Cpp.Object(this.self)); } catch (e) { fail(clsName + "." + name + " after", e); } }
        },
    };
    if (need) LAZY.push({ addr: m.virtualAddress, cb: cb, need: need, h: null, name: clsName + "." + name });
    else Interceptor.attach(m.virtualAddress, cb);
    return null;
}
function lazySync() {
    var now = Date.now();
    if (now - lazyAt < 250) return;
    lazyAt = now;
    LAZY.forEach(function (l) {
        var want = false;
        try { want = !!l.need(); } catch (e) { }
        if (want && !l.h) { try { l.h = Interceptor.attach(l.addr, l.cb); } catch (e) { fail("hook " + l.name, e); } }
        else if (!want && l.h) { try { l.h.detach(); } catch (e) { } l.h = null; }
    });
}
function lazyOff() { LAZY.forEach(function (l) { if (l.h) { try { l.h.detach(); } catch (e) { } l.h = null; } }); }

// Full replacements only exist while their feature is on, and the game's method is restored the moment it is off.
// A replacement that runs the original from JS aborts the game if the original throws a C# exception (a player
// mid-respawn, a destroyed object), so keeping them out of the call path while unused removes most of that risk.
var REPL = [], replAt = 0;
function replace(m, name, make, need) { REPL.push({ m: m, name: name, make: make, need: need, on: false }); }
function replSync(force) {
    var now = Date.now();
    if (!force && now - replAt < 250) return;
    replAt = now;
    REPL.forEach(function (r) {
        var want = false;
        try { want = !!r.need(); } catch (e) { }
        if (want && !r.on) { try { step("install " + r.name);
            var impl = r.make(r.m);
            r.m.implementation = function () { ST.step = "replaced " + r.name; var v = impl.apply(this, arguments); ST.step = "game code (after " + r.name + ")"; return v; };
            r.on = true; log("hook on: " + r.name); } catch (e) { fail("hook " + r.name, e); } }
        else if (!want && r.on) { try { step("revert " + r.name); r.m.revert(); } catch (e) { } r.on = false; log("hook off: " + r.name); }
    });
}
function replOff() { REPL.forEach(function (r) { if (r.on) { try { r.m.revert(); } catch (e) { } r.on = false; } }); }

// Wraps one static method (no instance to bind). before() can change args[] in place.
function hookStatic(cls, clsName, name, before, need) {
    var m = cls ? cls.tryMethod(name) : null;
    if (!m) return clsName + "." + name;
    replace(m, clsName + "." + name, function (m) {
        return function () {
            var args = arguments;
            if (before) before(args);
            return m.invoke.apply(m, args);
        };
    }, need || function () { return true; });
    return null;
}

// Replaces the return value of a method while Unlock Everything is on, otherwise runs the original.
function hookUnlock(cls, clsName, name, fake, flagKey) {
    var m = cls ? cls.tryMethod(name) : null;
    if (!m) return clsName + "." + name;
    // only installed while unlocked, and then it never calls the original
    replace(m, clsName + "." + name, function () {
        return function () { live("unlock " + clsName + "." + name); return fake; };
    }, function () { return p.unlockAll || (flagKey && p[flagKey]); });
    return null;
}

function num(obj, fieldName) {
    return Number(obj.field(fieldName).value);
}

function str(v) {
    try { return v && !v.isNull() ? String(v.content) : ""; } catch (e) { return ""; }
}

// the WeaponInfo ScriptableObject of a weapon (MultiplayerGrabable.weaponInfo), or null
function weaponInfoOf(self) {
    try {
        var w = self.field("weaponInfo").value;
        return w && !w.isNull() ? w : null;
    } catch (e) { return null; }
}

// WeaponInfo is shared by every copy of that weapon, so remember the original numbers and restore them later
function tuneWeapon(self) {
    var w = weaponInfoOf(self);
    if (!w) return;
    var key = w.handle.toString();
    var rec = savedWeapons[key];
    if (!rec) {
        rec = savedWeapons[key] = {
            obj: w,
            FireRate: num(w, "FireRate"),
            FullyAuto: !!w.field("FullyAuto").value,
            WeaponCooldown: num(w, "WeaponCooldown"),
            Damage: num(w, "Damage"),
            HitDamage: num(w, "HitDamage"),
            Pushback: num(w, "Pushback"),
        };
    }
    // the force that shoves you backwards when the gun fires
    w.field("Pushback").value = p.noRecoil ? 0.0 : rec.Pushback;
    if (p.rapidFire) {
        w.field("FireRate").value = 0.02;
        w.field("FullyAuto").value = true;
        w.field("WeaponCooldown").value = 0.0;
    } else {
        w.field("FireRate").value = rec.FireRate;
        w.field("FullyAuto").value = rec.FullyAuto;
        w.field("WeaponCooldown").value = rec.WeaponCooldown;
    }
    if (p.bigDamage) {
        w.field("Damage").value = 99999.0;
        w.field("HitDamage").value = 99999.0;
    } else {
        w.field("Damage").value = rec.Damage;
        w.field("HitDamage").value = rec.HitDamage;
    }
}

function restoreWeapons() {
    for (var key in savedWeapons) {
        var rec = savedWeapons[key];
        try {
            rec.obj.field("FireRate").value = rec.FireRate;
            rec.obj.field("FullyAuto").value = rec.FullyAuto;
            rec.obj.field("WeaponCooldown").value = rec.WeaponCooldown;
            rec.obj.field("Damage").value = rec.Damage;
            rec.obj.field("HitDamage").value = rec.HitDamage;
            rec.obj.field("Pushback").value = rec.Pushback;
        } catch (e) { }
    }
    savedWeapons = {};
}

function installHooks() {
    var missing = [];
    var miss;

    // ammo + per-weapon tweaks, runs for every grabbable (pistols inherit this Update)
    miss = hookMethod(GrabableCls, "MultiplayerGrabable", "Update", null, function (self) {
        if (p.infAmmo) {
            try { self.field("CurrentAmmo").value = 999.0; live("infAmmo"); }
            catch (e) { if (fail("infAmmo", e)) p.infAmmo = false; }
        }
        if (p.rapidFire || p.bigDamage || p.noRecoil || Object.keys(savedWeapons).length) {
            try {
                tuneWeapon(self);
                live("weaponInfo");
            } catch (e) {
                if (fail("weaponInfo", e)) { p.rapidFire = false; p.bigDamage = false; }
            }
        }
    }, function () { return p.infAmmo || p.rapidFire || p.bigDamage || p.noRecoil || Object.keys(savedWeapons).length; });
    if (miss) missing.push(miss);

    // No Recoil: zero RecoilAnimation's recoil values straight in memory. (Assigning Vector3 fields through the
    // bridge was throwing, which is what switched the toggle back off after a few frames.)
    resolveRecoilFields();
    miss = hookMethod(RecoilCls, "RecoilAnimation", "Update", function (self) {
        if (p.noRecoil) zeroRecoil(self);
    }, function (self) {
        if (p.noRecoil) { zeroRecoil(self); live("noRecoil"); }
    }, function () { return p.noRecoil; });
    if (miss) missing.push(miss);

    // static AIDamage.TryDamage(Collider, float damage, Vector3 hitPoint, Vector3 impulse, int earningMultiplier)
    miss = hookStatic(AIDamageCls, "AIDamage", "TryDamage", function (args) {
        if (!p.bigDamage) return;
        try {
            if (Number(args[1]) > 0) { args[1] = 99999.0; live("AIDamage.TryDamage"); }
        } catch (e) { if (fail("tryDamage", e)) p.bigDamage = false; }
    }, function () { return p.bigDamage; });
    if (miss) missing.push(miss);

    // enemy tools: runs for each enemy every frame, only does work while a toggle is on (or just turned off)
    miss = hookMethod(AIBaseCls, "AIBase", "RequiredUpdate", null, function (self) {
        if (espAny() && p.espEnemies) track("enemy", self);
        if (p.vacEnemies) { try { vacEnemy(self, false); live("vacEnemies"); } catch (e) { if (fail("vacEnemies", e)) p.vacEnemies = false; } }
        var wantFreeze = p.freezeEnemies, wantThaw = !wantFreeze && Date.now() < unfreezeUntil;
        if (wantFreeze || wantThaw) {
            try {
                var agent = self.field("agent").value;
                if (agent && !agent.isNull()) { agent.method("set_isStopped").invoke(wantFreeze); live("freezeEnemies"); }
            } catch (e) { if (fail("freezeEnemies", e)) p.freezeEnemies = false; }
        }
        if (p.weakEnemies) {
            try {
                if (Number(self.field("health").value) > 1) self.field("health").value = 1.0;
                live("weakEnemies");
            } catch (e) { if (fail("weakEnemies", e)) p.weakEnemies = false; }
        }
    }, function () { return (espAny() && p.espEnemies) || p.vacEnemies || p.freezeEnemies || Date.now() < unfreezeUntil || p.weakEnemies; });
    if (miss) missing.push(miss);

    // ESP target tracking: the game's own Update calls tell us what is alive right now
    miss = hookMethod(NetPlayerCls, "NetworkPlayer", "Update", null, function (self) {
        if (espAny() && p.espPlayers) track("player", self);
        if (p.vacPlayers) { try { vacPlayer(self); } catch (e) { if (fail("vacPlayers", e)) p.vacPlayers = false; } }
    }, function () { return (espAny() && p.espPlayers) || p.vacPlayers; });
    if (miss) missing.push(miss);
    miss = hookMethod(NetRagCls, "NetworkRagdoll", "Update", null, function (self) { if (espAny() && p.espDummies) track("dummy", self); }, function () { return espAny() && p.espDummies; });
    if (miss) missing.push(miss);
    miss = hookMethod(DummyCls, "EvilDummyBehaviour", "Update", null, function (self) { if (espAny() && p.espDummies) track("dummy", self); }, function () { return espAny() && p.espDummies; });
    if (miss) missing.push(miss);

    // Grab Anything: every hand tells us it is alive through its own Update, no heap scan needed
    miss = hookMethod(HandCls, "MultiplayerHand", "Update", null, function (self) {
        if (p.grabAnything || Object.keys(handRecs).length) {
            try { tuneHand(self); } catch (e) { if (fail("grabAnything", e)) { p.grabAnything = false; restoreHands(); } }
        }
    }, function () { return p.grabAnything || Object.keys(handRecs).length; });
    if (miss) missing.push(miss);

    // unlocks: ownership checks and level gates
    miss = hookUnlock(InvCls, "InventoryManager", "OwnsItem", true);
    if (miss) missing.push(miss);
    miss = hookUnlock(InvCls, "InventoryManager", "OwnsPower", true);
    if (miss) missing.push(miss);
    miss = hookUnlock(WLRCls, "WeaponLevelRequirements", "IsUnlocked", true);
    if (miss) missing.push(miss);
    miss = hookUnlock(WLRCls, "WeaponLevelRequirements", "GetRequiredLevel", 0);
    if (miss) missing.push(miss);
    miss = hookUnlock(AnimeCls, "AnimePackGate", "OwnsAnimePack", true);
    if (miss) missing.push(miss);
    miss = hookUnlock(IAPCls, "IAPManager", "OwnsItemIAP", true);
    if (miss) missing.push(miss);

    // skins and hats
    miss = hookUnlock(IAPCls, "IAPManager", "OwnsSkin", true, "unlockSkins");
    if (miss) missing.push(miss);
    miss = hookUnlock(IAPCls, "IAPManager", "OwnsHatCash", true, "unlockSkins");
    if (miss) missing.push(miss);
    miss = hookUnlock(DisplayCls, "DisplayPlayer", "OwnsHat", true, "unlockSkins");
    if (miss) missing.push(miss);
    var gm = IAPCls ? IAPCls.tryMethod("GetUnlockedSkinIndices") : null;
    if (!gm) {
        missing.push("IAPManager.GetUnlockedSkinIndices");
    } else {
        // hookMethod can't change the return value, so wrap it by hand
        replace(gm, "IAPManager.GetUnlockedSkinIndices", function () {
            return function () {
                var bound = gm.bind(this);
                var list = bound.invoke();
                try { addAllSkins(list); live("skinList"); }
                catch (e) { if (fail("skinList", e)) p.unlockSkins = false; }
                return list;
            };
        }, function () { return p.unlockSkins; });
    }

    if (!GameMgrCls) missing.push("LocalGameManager");
    if (!PlayerMP) missing.push("PlayerMultiplayer");
    if (!ItemBtnCls) missing.push("ItemBtn");
    log(missing.length ? "skipped (not found in this build): " + missing.join(", ") : "all hooks installed");
}

function addMoney(amount) {
    try {
        if (!GameMgrCls) throw new Error("LocalGameManager not found");
        // static Task AddMoney(int toadd)
        GameMgrCls.method("AddMoney").invoke(amount | 0);
        notify("Added " + amount + " money");
    } catch (e) {
        notify("Add money failed: " + e);
        log("AddMoney failed: " + e);
    }
}

function currentPlayer() {
    try {
        var inst = PlayerMP.field("instance").value;
        return inst && !inst.isNull() ? inst : null;
    } catch (e) { return null; }
}

function restoreSpeed(inst) {
    if (originalSpeed === null) return;
    try {
        var loco = inst.field("movementController").value;
        if (loco && !loco.isNull()) loco.field("moveSpeed").value = originalSpeed;
    } catch (e) { }
    originalSpeed = null;
}

// fists: PlayerValues.punchDamage (a shared ScriptableObject, reached through PlayerMultiplayer.playerStats)
function syncPunch(inst) {
    try {
        var stats = inst.field("playerStats").value;
        if (!stats || stats.isNull()) return;
        if (p.bigDamage) {
            if (originalPunch === null) originalPunch = Number(stats.field("punchDamage").value);
            stats.field("punchDamage").value = 99999.0;
            live("punchDamage");
        } else if (originalPunch !== null) {
            stats.field("punchDamage").value = originalPunch;
            originalPunch = null;
        }
    } catch (e) { if (fail("punchDamage", e)) p.bigDamage = false; }
}


// ---------------------------------------------------------------- vehicles (in-app purchase flags)

function syncIap() {
    try {
        if (!IAPCls) return;
        var inst = IAPCls.field("Instance").value;
        if (!inst || inst.isNull()) return;
        if (p.unlockAll) {
            if (iapOrig === null) {
                iapOrig = { vehicles: !!inst.field("ownsVehicles").value, weapons: !!inst.field("allWeaponsOwned").value };
                log("IAP flags before unlock: ownsVehicles=" + iapOrig.vehicles + " allWeaponsOwned=" + iapOrig.weapons);
            }
            inst.field("ownsVehicles").value = true;
            inst.field("allWeaponsOwned").value = true;
            live("iapFlags");
        } else if (iapOrig !== null) {
            inst.field("ownsVehicles").value = iapOrig.vehicles;
            inst.field("allWeaponsOwned").value = iapOrig.weapons;
            iapOrig = null;
        }
    } catch (e) { if (fail("iapFlags", e)) p.unlockAll = false; }
}

function refreshVehiclePage() {
    try {
        syncIap();
        var menu = MenuCls ? MenuCls.field("instance").value : null;
        if (!menu || menu.isNull()) return notify("Tablet menu not found yet");
        menu.method("LoadVehicleIAP").invoke();
        notify("Vehicle page refreshed");
    } catch (e) { notify("Refresh failed: " + e); log("LoadVehicleIAP failed: " + e); }
}

function kindOf(name) {
    try {
        if (WeaponInfoCls) {
            var n = Il2Cpp.string(name);
            if (WeaponInfoCls.method("IsVehicle").invoke(n)) return "vehicle";
            if (WeaponInfoCls.method("IsNPC").invoke(n)) return "npc";
        }
    } catch (e) { }
    return "item";
}

// ---------------------------------------------------------------- no recoil helpers

var recoilOffs = null;   // { f: [byte offsets of floats to zero] }

// byte offset + float count of every RecoilAnimation field that holds recoil movement
function resolveRecoilFields() {
    recoilOffs = [];
    if (!RecoilCls) return;
    var wanted = [["<OutRot>k__BackingField", 3], ["<OutLoc>k__BackingField", 3], ["_targetRot", 3], ["_targetLoc", 3],
        ["_rawRotOut", 3], ["_rawLocOut", 3], ["_smoothRotOut", 3], ["_smoothLocOut", 3],
        ["_noiseTarget", 2], ["_noiseOut", 2], ["_pushTarget", 1], ["_pushOut", 1]];
    var missing = [];
    wanted.forEach(function (w) {
        var f = null;
        try { f = RecoilCls.tryField(w[0]); } catch (e) { }
        if (f) recoilOffs.push({ off: f.offset, n: w[1] });
        else missing.push(w[0]);
    });
    log("noRecoil: " + recoilOffs.length + " of " + wanted.length + " fields found" + (missing.length ? " (missing: " + missing.join(", ") + ")" : ""));
}

function zeroRecoil(self) {
    if (!recoilOffs) return;
    var base = self.handle;
    for (var i = 0; i < recoilOffs.length; i++) {
        var r = recoilOffs[i];
        for (var k = 0; k < r.n; k++) base.add(r.off + k * 4).writeFloat(0);
    }
}

// ---------------------------------------------------------------- kill players / dummies

function ownerInfo(comp) {
    try {
        var rv = comp.method("get_realtimeView").invoke();
        if (!rv || rv.isNull()) return null;
        var id;
        try { id = Number(rv.method("get_ownerIDSelf").invoke()); } catch (e) { id = Number(rv.method("get_ownerID").invoke()); }
        return { id: id, local: !!rv.method("get_isOwnedLocally").invoke() };
    } catch (e) { return null; }
}

function killPlayers() {
    var n = 0, seen = {};
    try {
        if (!NetPlayerCls || !SyncCls) throw new Error("NetworkPlayer / PlayerInfoSync not found");
        var sync = SyncCls.field("instance").value;
        if (!sync || sync.isNull()) throw new Error("PlayerInfoSync not ready (get into a room first)");
        try { log("killPlayers: pvpDisabled=" + sync.field("pvpDisabled").value); } catch (e) { }
        choose(NetPlayerCls).forEach(function (o) {
            var info = ownerInfo(o);
            if (!info || info.local || seen[info.id]) return;
            seen[info.id] = 1;
            n++;
            var hp = function () { try { return Number(sync.method("GetPlayerHealth").invoke(info.id)); } catch (e) { return NaN; } };
            var h0 = hp(), steps = [];
            try { steps.push("DamagePlayer=" + sync.method("DamagePlayer").invoke(info.id, 99999.0, ui.vec3(0, 0, 0))); }
            catch (e) { steps.push("DamagePlayer failed: " + e); }
            if (!(hp() <= 0)) {
                try { sync.method("SetPlayerHealth").invoke(info.id, 0.0); steps.push("SetPlayerHealth"); }
                catch (e) { steps.push("SetPlayerHealth failed: " + e); }
            }
            if (!(hp() <= 0)) {
                try { sync.method("KillPlayer").invoke(info.id); steps.push("KillPlayer"); }
                catch (e) { steps.push("KillPlayer failed: " + e); }
            }
            if (!(hp() <= 0)) {
                try { o.method("RequestDamage").invoke(99999.0); steps.push("RequestDamage"); }
                catch (e) { steps.push("RequestDamage failed: " + e); }
            }
            log("player " + info.id + ": health " + h0 + " -> " + hp() + " (" + steps.join(", ") + ")");
        });
    } catch (e3) { notify("Kill players failed: " + e3); log("killPlayers failed: " + e3); return; }
    notify("Tried " + n + " players, see the log for what the game did");
}

function killDummies() {
    var n = 0, bad = 0, seen = {}, local = 0;
    try {
        var sync = SyncCls ? SyncCls.field("instance").value : null;
        if (NetRagCls && sync && !sync.isNull()) {
            choose(NetRagCls).forEach(function (o) {
                var info = ownerInfo(o);
                if (!info || info.local || seen[info.id]) return;
                seen[info.id] = 1;
                n++;
                var hp = function () { try { return Number(sync.method("GetRagdollHealth").invoke(info.id)); } catch (e) { return NaN; } };
                var h0 = hp(), steps = [];
                try { steps.push("DamageRagdoll=" + sync.method("DamageRagdoll").invoke(info.id, 99999.0)); }
                catch (e) { steps.push("DamageRagdoll failed: " + e); }
                if (!(hp() <= 0)) {
                    try { sync.method("SetRagdollHealth").invoke(info.id, 0.0); steps.push("SetRagdollHealth"); }
                    catch (e) { steps.push("SetRagdollHealth failed: " + e); }
                }
                log("dummy " + info.id + ": health " + h0 + " -> " + hp() + " (" + steps.join(", ") + ")");
            });
        }
        if (DummyCls) {
            var ObjCls = findClassAny("UnityEngine.Object");
            var destroy = ObjCls ? methodWith(ObjCls, "Destroy", 1, "UnityEngine.Object") : null;
            choose(DummyCls).forEach(function (d) {
                try {
                    if (!destroy) throw new Error("Object.Destroy not found");
                    destroy.invoke(d.method("get_gameObject").invoke());
                    local++;
                } catch (e) { bad++; if (bad === 1) log("remove evil dummy failed: " + e); }
            });
        }
    } catch (e2) { notify("Kill dummies failed: " + e2); log("killDummies failed: " + e2); return; }
    notify("Dummies: tried " + n + ", removed " + local + " evil dummies locally");
    log("killDummies: tried " + n + " ragdolls, removed " + local + " evil dummies locally, " + bad + " failed");
}

// ---------------------------------------------------------------- ESP

var gfx = null;                 // null = not tried yet, false = unavailable, object = ready
var espTargets = {};
var frameNo = 0, espIdx = 0;
var pins = [];
var KIND_COLOR = { enemy: [1, 0.2, 0.2, 1], player: [0.2, 0.9, 1, 1], dummy: [1, 0.85, 0.2, 1] };
// HumanBodyBones id, parent id
var HB_LIST = [[0, -1], [7, 0], [8, 7], [9, 8], [10, 9], [13, 8], [15, 13], [17, 15], [14, 8], [16, 14], [18, 16],
    [1, 0], [3, 1], [5, 3], [2, 0], [4, 2], [6, 4]];

function espAny() { return p.espBox || p.espBones || p.espChams || p.espSnap; }
function kindOn(k) { return k === "enemy" ? p.espEnemies : k === "player" ? p.espPlayers : p.espDummies; }

function findClassAny(name) {
    var asms = Il2Cpp.domain.assemblies;
    for (var i = 0; i < asms.length; i++) {
        try { var c = asms[i].image.tryClass(name); if (c) return c; } catch (e) { }
    }
    return null;
}

// first declared method with this name / parameter count (and first parameter type, to pick between overloads)
function methodWith(cls, name, count, firstType) {
    var ms = cls.methods;
    for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.name !== name || m.parameterCount !== count) continue;
        if (firstType && (!m.parameters[0] || m.parameters[0].type.name !== firstType)) continue;
        return m;
    }
    return null;
}

function bindTo(m, obj) { try { return m.bind(obj); } catch (e) { return m; } }

function pin(o) {
    // A GC handle keeps the object alive while only JS holds it. The old code called Il2Cpp.gc.handle, which this
    // bridge does not have, so nothing was ever pinned: the GC reclaimed ESP's position arrays while setPts kept
    // writing into them every frame, which corrupted the game's heap (random freezes / crashes, garbage pointers).
    pins.push(new Il2Cpp.Object(o.handle).ref(true));
    return o;
}

function makeOverlayMat(g, c) {
    var sh = g.Shader.method("Find").invoke(Il2Cpp.string("Hidden/Internal-Colored"));
    if (!sh || sh.isNull()) throw new Error("Hidden/Internal-Colored shader not found");
    var m = g.Mat.alloc();
    var ctor = methodWith(g.Mat, ".ctor", 1, "UnityEngine.Shader");
    if (!ctor) throw new Error("Material(Shader) constructor not found");
    bindTo(ctor, m).invoke(sh);
    var setInt = methodWith(g.Mat, "SetInt", 2, "System.String");
    [["_ZTest", 8], ["_ZWrite", 0], ["_Cull", 0], ["_SrcBlend", 5], ["_DstBlend", 10]].forEach(function (kv) {
        try { bindTo(setInt, m).invoke(Il2Cpp.string(kv[0]), kv[1]); } catch (e) { }
    });
    m.method("set_color").invoke(c);
    try { m.method("set_renderQueue").invoke(4000); } catch (e) { }
    try { m.method("set_hideFlags").invoke(61); } catch (e) { }
    return pin(m);
}

function gfxInit() {
    if (gfx !== null) return gfx;
    gfx = false;
    try {
        var g = {};
        var names = { GO: "UnityEngine.GameObject", Mat: "UnityEngine.Material", Shader: "UnityEngine.Shader", LR: "UnityEngine.LineRenderer",
            Rend: "UnityEngine.Renderer", SMR: "UnityEngine.SkinnedMeshRenderer", V3: "UnityEngine.Vector3", Comp: "UnityEngine.Component",
            Animator: "UnityEngine.Animator", Obj: "UnityEngine.Object", TR: "UnityEngine.Transform" };
        for (var k in names) {
            g[k] = findClassAny(names[k]);
            if (!g[k]) throw new Error(names[k] + " not found in this game");
        }
        g.addComp = methodWith(g.GO, "AddComponent", 0, null);
        g.compInChild = methodWith(g.Comp, "GetComponentInChildren", 2, "System.Type");
        g.compsInChildren = methodWith(g.Comp, "GetComponentsInChildren", 1, "System.Boolean");
        g.destroy = methodWith(g.Obj, "Destroy", 1, "UnityEngine.Object");
        g.getPos = g.TR.method("get_position");
        g.getFwd = g.TR.method("get_forward");
        g.getRight = g.TR.method("get_right");
        if (!g.addComp) throw new Error("GameObject.AddComponent<T>() not found");
        g.mats = {};
        for (var kind in KIND_COLOR) g.mats[kind] = makeOverlayMat(g, KIND_COLOR[kind]);
        gfx = g;
        log("esp: ready (LineRenderer + Hidden/Internal-Colored, always on top)");
    } catch (e) {
        gfx = false;
        log("esp unavailable: " + e);
        notify("ESP unavailable: " + e);
    }
    return gfx;
}

function mkLine(g, npts, mat) {
    var go = pin(g.GO.alloc());
    bindTo(methodWith(g.GO, ".ctor", 1, "System.String"), go).invoke(Il2Cpp.string("bb_esp"));
    var lr = bindTo(g.addComp.inflate(g.LR), go).invoke();
    lr.method("set_useWorldSpace").invoke(true);
    lr.method("set_positionCount").invoke(npts);
    lr.method("set_startWidth").invoke(0.012);
    lr.method("set_endWidth").invoke(0.012);
    lr.method("set_sharedMaterial").invoke(mat);
    var setActive = go.method("SetActive");
    setActive.invoke(false);
    // the bound methods are kept so each frame doesn't look them up by name again
    return { go: go, lr: lr, arr: pin(Il2Cpp.array(g.V3, npts)), n: npts, on: false, setActive: setActive, setPos: lr.method("SetPositions") };
}

function setPts(line, pts) {
    var base = line.arr.handle.add(0x20);
    for (var i = 0; i < pts.length && i < line.n; i++) {
        var q = base.add(i * 12), v = pts[i];
        q.writeFloat(v[0]); q.add(4).writeFloat(v[1]); q.add(8).writeFloat(v[2]);
    }
    line.setPos.invoke(line.arr);
}

function showLine(line, on) {
    if (line && line.on !== on) { line.setActive.invoke(on); line.on = on; }
}

function lineFor(t, name, npts) {
    t.lines = t.lines || {};
    if (!t.lines[name]) t.lines[name] = mkLine(gfx, npts, gfx.mats[t.kind]);
    return t.lines[name];
}

function shaderOf(mat) {
    try { return String(mat.method("get_shader").invoke().method("get_name").invoke().content); } catch (e) { return ""; }
}

function setChams(t, on) {
    var g = gfx;
    if (on && !t.cham) {
        t.cham = [];
        var arr = bindTo(g.compsInChildren.inflate(g.Rend), t.obj).invoke(true);
        for (var i = 0; i < arr.length; i++) {
            var r = arr.get(i);
            if (!r || r.isNull()) continue;
            var orig = r.method("get_sharedMaterials").invoke();
            if (!orig || orig.isNull() || !orig.length) continue;
            var mats = [];
            for (var j = 0; j < orig.length; j++) mats.push(orig.get(j));
            var sn = mats[0] && !mats[0].isNull() ? shaderOf(mats[0]) : "";
            if (sn.indexOf("TextMeshPro") >= 0 || sn.indexOf("UI/") === 0 || sn.indexOf("Particles") >= 0) continue;
            var na = Il2Cpp.array(g.Mat, mats.length);
            for (var k = 0; k < mats.length; k++) na.set(k, g.mats[t.kind]);
            r.method("set_sharedMaterials").invoke(na);
            t.cham.push({ r: r, mats: mats });
        }
    } else if (!on && t.cham) {
        var list = t.cham;
        t.cham = null;
        list.forEach(function (c) {
            try {
                var na2 = Il2Cpp.array(g.Mat, c.mats.length);
                for (var k2 = 0; k2 < c.mats.length; k2++) na2.set(k2, c.mats[k2]);
                c.r.method("set_sharedMaterials").invoke(na2);
            } catch (e) { }
        });
    }
}

// position / direction readers bound once per transform (no per-frame method lookup)
function fnVec(m, tr) {
    var b = bindTo(m, tr);
    return function () { return ui.read3(b.invoke()); };
}

function ensureFns(t) {
    if (t.gp) return;
    var tr = t.obj.method("get_transform").invoke();
    t.tr = tr;
    t.gp = fnVec(gfx.getPos, tr);
    t.gf = fnVec(gfx.getFwd, tr);
    t.gr = fnVec(gfx.getRight, tr);
}

function buildSkel(t) {
    var g = gfx, nodes = [], parent = [];
    try {
        var anim = bindTo(g.compInChild, t.obj).invoke(g.Animator.type.object, true);
        if (anim && !anim.isNull() && anim.method("get_isHuman").invoke()) {
            var idxOf = {};
            HB_LIST.forEach(function (e) {
                var tr = anim.method("GetBoneTransform").invoke(e[0]);
                if (tr && !tr.isNull()) {
                    idxOf[e[0]] = nodes.length;
                    nodes.push(tr);
                    parent.push(e[1] >= 0 && idxOf[e[1]] !== undefined ? idxOf[e[1]] : -1);
                }
            });
        }
    } catch (e) { }
    if (nodes.length < 5) {
        nodes = []; parent = [];
        try {
            var smr = bindTo(g.compInChild, t.obj).invoke(g.SMR.type.object, true);
            if (smr && !smr.isNull()) {
                var bones = smr.method("get_bones").invoke(), map = {};
                for (var i = 0; i < bones.length && nodes.length < 40; i++) {
                    var b = bones.get(i);
                    if (!b || b.isNull()) continue;
                    map[b.handle.toString()] = nodes.length;
                    nodes.push(b);
                }
                nodes.forEach(function (nd) {
                    var pr = nd.method("get_parent").invoke();
                    var key = pr && !pr.isNull() ? pr.handle.toString() : null;
                    parent.push(key !== null && map[key] !== undefined ? map[key] : -1);
                });
            }
        } catch (e2) { }
    }
    if (nodes.length < 3) return { bad: true };
    var kids = nodes.map(function () { return []; }), roots = [], path = [];
    parent.forEach(function (pi, i) { if (pi >= 0) kids[pi].push(i); else roots.push(i); });
    function dfs(n) { path.push(n); kids[n].forEach(function (c) { dfs(c); path.push(n); }); }
    roots.forEach(dfs);
    // one cached position reader per bone
    return { fns: nodes.map(function (nd) { return fnVec(g.getPos, nd); }), path: path, bad: path.length < 3 };
}

function hideTarget(t) {
    if (t.lines) for (var k in t.lines) showLine(t.lines[k], false);
    try { if (t.cham) setChams(t, false); } catch (e) { }
}

function dropTarget(t) {
    hideTarget(t);
    if (t.lines && gfx) {
        for (var k in t.lines) { try { gfx.destroy.invoke(t.lines[k].go); } catch (e) { } }
    }
    delete espTargets[t.key];
}

function dropAllTargets() {
    for (var key in espTargets) dropTarget(espTargets[key]);
}

function track(kind, self) {
    if (!uAlive(self)) return;
    try {
        var key = self.handle.toString();
        var t = espTargets[key];
        if (!t) {
            if (Object.keys(espTargets).length >= 64) return;
            t = espTargets[key] = { key: key, kind: kind, obj: self, seen: frameNo, local: false, errs: 0, idx: (espIdx++) };
            if (kind === "player" || (kind === "dummy" && NetRagCls && self.class.handle.equals(NetRagCls.handle))) {
                var info = ownerInfo(self);
                if (info && info.local) t.local = true;
            }
        }
        t.seen = frameNo;
        t.obj = self;
    } catch (e) { }
}

// hips / head / feet bones of a humanoid target, cached. The box is built from these so it sits on the body
// instead of wherever the object's pivot happens to be.
function anchorOf(t) {
    if (t.anc !== undefined) return t.anc;
    t.anc = null;
    try {
        var anim = bindTo(gfx.compInChild, t.obj).invoke(gfx.Animator.type.object, true);
        if (anim && !anim.isNull() && anim.method("get_isHuman").invoke()) {
            var bone = function (id) {
                var b = anim.method("GetBoneTransform").invoke(id);
                return b && !b.isNull() ? fnVec(gfx.getPos, b) : null;
            };
            var a = { hips: bone(0), head: bone(10), lf: bone(5), rf: bone(6) };
            if (a.hips && a.head) t.anc = a;
        }
    } catch (e) { }
    return t.anc;
}

// position, size and facing of a target. Only recomputed every few frames, the box / snapline reuse it in between.
function computeGeo(t) {
    var base = t.pos, ancHeight = 0;
    var anc = anchorOf(t);
    if (anc) {
        try {
            var hipsP = anc.hips(), headP = anc.head();
            var feetY = hipsP[1] - (headP[1] - hipsP[1]) * 1.15;
            if (anc.lf) feetY = Math.min(feetY, anc.lf()[1]);
            if (anc.rf) feetY = Math.min(feetY, anc.rf()[1]);
            var hh = headP[1] + 0.15 - feetY;
            if (hh > 0.5 && hh < 6) { base = [hipsP[0], feetY, hipsP[2]]; ancHeight = hh; }
        } catch (e) { }
    }
    var fwd = t.gf(), rgt = t.gr();
    var fl = Math.hypot(fwd[0], fwd[2]) || 1, rl = Math.hypot(rgt[0], rgt[2]) || 1;
    fwd = [fwd[0] / fl, 0, fwd[2] / fl];
    rgt = [rgt[0] / rl, 0, rgt[2] / rl];
    var height = ancHeight || 1.8;
    if (!ancHeight && t.kind === "player") {
        try {
            var ct = t.obj.field("cameraPos").value;
            if (ct && !ct.isNull()) {
                if (!t.camFn) t.camFn = fnVec(gfx.getPos, ct);
                var hy = t.camFn()[1] - base[1] + 0.15;
                if (hy > 0.6 && hy < 5) height = hy;
            }
        } catch (e) { }
    }
    return { base: base, height: height, fwd: fwd, rgt: rgt };
}

function drawTarget(t, hp, hf, rank) {
    if (t.refresh || !t.geo) t.geo = computeGeo(t);
    var geo = t.geo, base = geo.base, height = geo.height, fwd = geo.fwd, rgt = geo.rgt;

    if (p.espBox) {
        var boxLine = t.lines && t.lines.box;
        if (t.refresh || !boxLine || !boxLine.on) {
            var hw = Math.min(0.7, Math.max(0.25, height * 0.25)), hd = hw * 0.75;
            var c = function (sx, sz, y) {
                return [base[0] + rgt[0] * hw * sx + fwd[0] * hd * sz, base[1] + y, base[2] + rgt[2] * hw * sx + fwd[2] * hd * sz];
            };
            var b0 = c(1, 1, 0), b1 = c(-1, 1, 0), b2 = c(-1, -1, 0), b3 = c(1, -1, 0);
            var t0 = c(1, 1, height), t1 = c(-1, 1, height), t2 = c(-1, -1, height), t3 = c(1, -1, height);
            var line = lineFor(t, "box", 16);
            setPts(line, [b0, b1, b2, b3, b0, t0, t1, t2, t3, t0, t1, b1, b2, t2, t3, b3]);
            showLine(line, true);
        }
    } else if (t.lines && t.lines.box) showLine(t.lines.box, false);

    if (p.espSnap) {
        // the origin follows your head every frame, so this one is rewritten every frame
        var sline = lineFor(t, "snap", 2);
        setPts(sline, [[hp[0] + hf[0] * 0.5, hp[1] - 0.4 + hf[1] * 0.5, hp[2] + hf[2] * 0.5], [base[0], base[1] + height * 0.5, base[2]]]);
        showLine(sline, true);
    } else if (t.lines && t.lines.snap) showLine(t.lines.snap, false);

    // bones are the expensive one: only the closest few targets, and not every frame
    var wantBones = p.espBones && rank < p.espBoneMax && t.dist <= 30;
    if (wantBones) {
        if (!t.skel) t.skel = buildSkel(t);
        if (!t.skel.bad) {
            var bl = lineFor(t, "bones", t.skel.path.length);
            if (!bl.on || ((frameNo + t.idx) % Math.max(1, p.espBoneEvery | 0) === 0)) {
                var sk = t.skel, pos = sk.fns.map(function (fn) { return fn(); });
                setPts(bl, sk.path.map(function (i) { return pos[i]; }));
            }
            showLine(bl, true);
        }
    } else if (t.lines && t.lines.bones) showLine(t.lines.bones, false);

    if (p.espChams) { if (!t.cham) setChams(t, true); }
    else if (t.cham) setChams(t, false);
}

function espFrame() {
    frameNo++;
    var any = espAny();
    for (var key in espTargets) {
        var t0 = espTargets[key];
        if (!any || frameNo - t0.seen > 20) dropTarget(t0);
    }
    if (!any) return;
    if (!gfxInit()) { p.espBox = false; p.espBones = false; p.espChams = false; p.espSnap = false; return; }
    try {
        var head = ui.rig.head();
        if (!head) return;
        if (!gfx.headPos) {
            gfx.headPos = fnVec(gfx.getPos, head);
            gfx.headFwd = fnVec(gfx.getFwd, head);
        }
        var hp = gfx.headPos();
        var hf = gfx.headFwd();
        var every = Math.max(1, p.espEvery | 0);
        var list = [];
        for (var k in espTargets) {
            var t = espTargets[k];
            if (!uAlive(t.obj)) { dropTarget(t); continue; }
            if (t.local || !kindOn(t.kind)) { hideTarget(t); continue; }
            try {
                ensureFns(t);
                // position is only re-read every few frames per target (staggered so they don't all land on one frame)
                t.refresh = !t.pos || ((frameNo + t.idx) % every === 0);
                if (t.refresh) t.pos = t.gp();
                t.dist = Math.hypot(t.pos[0] - hp[0], t.pos[1] - hp[1], t.pos[2] - hp[2]);
                list.push(t);
            } catch (e) { if (++t.errs >= 3) dropTarget(t); }
        }
        list.sort(function (a, b) { return a.dist - b.dist; });
        for (var i = 0; i < list.length; i++) {
            var tg = list[i];
            if (!uAlive(tg.obj)) { dropTarget(tg); continue; }
            if (i >= p.espMax || tg.dist > p.espDist) { hideTarget(tg); continue; }
            try { drawTarget(tg, hp, hf, i); live("esp"); }
            catch (e2) {
                if (++tg.errs >= 3) { log("esp target dropped: " + e2); dropTarget(tg); }
            }
        }
    } catch (e3) {
        if (fail("esp", e3)) { p.espBox = false; p.espBones = false; p.espChams = false; p.espSnap = false; dropAllTargets(); }
    }
}

// ---------------------------------------------------------------- skins and hats

// every skin index we know about: 0..N-1 from the SkinHolder materials, plus every CosmeticPack's skinIndex
function allSkinIndices() {
    if (skinIdx) return skinIdx;
    var set = {}, fromHolder = 0, fromPacks = 0;
    try {
        if (SkinHolderCls) {
            choose(SkinHolderCls).forEach(function (h) {
                try {
                    var arr = h.field("skins").value;
                    if (arr && !arr.isNull() && arr.length > fromHolder) fromHolder = arr.length;
                } catch (e) { }
            });
        }
    } catch (e) { }
    for (var i = 0; i < fromHolder; i++) set[i] = 1;
    try {
        var reg = PackRegCls ? PackRegCls.method("get_Instance").invoke() : null;
        if (reg && !reg.isNull()) {
            var packs = reg.field("packs").value;
            for (var j = 0; j < packs.length; j++) {
                try { set[Number(packs.get(j).field("skinIndex").value)] = 1; fromPacks++; } catch (e) { }
            }
        }
    } catch (e) { }
    skinIdx = Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
    log("skin indices: " + fromHolder + " from SkinHolder, " + fromPacks + " packs, " + skinIdx.length + " total");
    if (!skinIdx.length) skinIdx = null;          // nothing found yet, try again next time
    return skinIdx || [];
}

function addAllSkins(list) {
    if (!list || list.isNull()) return;
    var idx = allSkinIndices();
    for (var i = 0; i < idx.length; i++) {
        if (!list.method("Contains").invoke(idx[i])) list.method("Add").invoke(idx[i]);
    }
}

function refreshSkinPage() {
    var n = 0;
    try {
        skinIdx = null;
        if (!DisplayCls) throw new Error("DisplayPlayer class not found");
        choose(DisplayCls).forEach(function (d) {
            try { d.method("InitSkin").invoke(); n++; } catch (e) { log("InitSkin failed: " + e); }
        });
        notify("Skin page refreshed (" + n + ")");
    } catch (e) { notify("Refresh failed: " + e); log("refreshSkinPage failed: " + e); }
}

// ---------------------------------------------------------------- stats, fly, teleport, enemies

function statsObject(inst) {
    try {
        var st = inst.field("playerStats").value;
        return st && !st.isNull() ? st : null;
    } catch (e) { return null; }
}

function syncStats(inst) {
    var st = statsObject(inst);
    if (!st) return;
    try {
        if (p.tweakStats) {
            if (originalStats === null) {
                originalStats = {};
                var parts = [];
                STAT_FIELDS.forEach(function (f) { originalStats[f[0]] = Number(st.field(f[0]).value); parts.push(f[0] + "=" + originalStats[f[0]]); });
                log("stats originals: " + parts.join(" "));
            }
            STAT_FIELDS.forEach(function (f) {
                var orig = originalStats[f[0]], mul = p[f[1]];
                st.field(f[0]).value = orig === 0 ? Math.max(0, mul - 1) : orig * mul;
            });
            live("statTweaker");
        } else if (originalStats !== null) {
            STAT_FIELDS.forEach(function (f) { st.field(f[0]).value = originalStats[f[0]]; });
            originalStats = null;
        }
    } catch (e) { if (fail("stats", e)) p.tweakStats = false; }
}

function dead(v) { return deadz(v, 0.12); }
function deadz(v, z) { return Math.abs(v) < z ? 0 : v; }

function flyFrame(inst) {
    var rb = inst.field("playerRigidBody").value;
    if (!rb || rb.isNull()) return;
    var loco = inst.field("movementController").value;
    var hasLoco = loco && !loco.isNull();
    if (!flyState) {
        flyState = { grav: !!rb.method("get_useGravity").invoke(), pid: hasLoco ? !!loco.field("PIDDisabled").value : false };
        rb.method("set_useGravity").invoke(false);
        if (hasLoco) loco.field("PIDDisabled").value = true;
        log("fly on");
    }
    var head = ui.rig.head();
    if (!head) return;
    var f = ui.read3(head.method("get_forward").invoke());
    var r = ui.read3(head.method("get_right").invoke());
    var l = ui.input.stick(0), rs = ui.input.stick(1);
    var lx = dead(l[0]), ly = dead(l[1]), up = dead(rs[1]), s = p.flySpeed;
    rb.method("set_linearVelocity").invoke(ui.vec3(
        (f[0] * ly + r[0] * lx) * s,
        (f[1] * ly + r[1] * lx + up) * s,
        (f[2] * ly + r[2] * lx) * s));
    live("fly");
}

function stopFly(inst) {
    if (!flyState) return;
    var st = flyState;
    flyState = null;
    try {
        var rb = inst.field("playerRigidBody").value;
        if (rb && !rb.isNull()) {
            rb.method("set_useGravity").invoke(st.grav);
            rb.method("set_linearVelocity").invoke(ui.vec3(0, 0, 0));
        }
        var loco = inst.field("movementController").value;
        if (loco && !loco.isNull()) loco.field("PIDDisabled").value = st.pid;
    } catch (e) { }
    log("fly off");
}

var hoverState = null;
function hoverFrame(inst) {
    if (p.fly) { if (hoverState) stopHover(inst); return; }   // fly owns the rigidbody
    var rb = inst.field("playerRigidBody").value;
    if (!rb || rb.isNull()) return;
    var loco = inst.field("movementController").value, hasLoco = loco && !loco.isNull();
    if (!hoverState) {
        hoverState = { grav: !!rb.method("get_useGravity").invoke(), pid: hasLoco ? !!loco.field("PIDDisabled").value : false };
        rb.method("set_useGravity").invoke(false);
        if (hasLoco) loco.field("PIDDisabled").value = true;
        log("hover on");
    }
    rb.method("set_linearVelocity").invoke(ui.vec3(0, 0, 0));
    live("hover");
}
function stopHover(inst) {
    if (!hoverState) return;
    var st = hoverState; hoverState = null;
    try {
        var rb = inst.field("playerRigidBody").value;
        if (rb && !rb.isNull()) rb.method("set_useGravity").invoke(st.grav);
        var loco = inst.field("movementController").value;
        if (loco && !loco.isNull()) loco.field("PIDDisabled").value = st.pid;
    } catch (e) { }
    log("hover off");
}

function playerPos(inst) {
    var rb = inst.field("playerRigidBody").value;
    return ui.read3(rb.method("get_position").invoke());
}

function savePos() {
    var inst = needPlayer();
    if (!inst) return;
    try { savedPos = playerPos(inst); notify("Position saved"); }
    catch (e) { notify("Save failed: " + e); log("savePos failed: " + e); }
}

function tpTo(inst, pos) {
    inst.method("Teleport").invoke(ui.vec3(pos[0], pos[1], pos[2]));
}

function tpSaved() {
    var inst = needPlayer();
    if (!inst) return;
    if (!savedPos) return notify("Save a position first");
    try { tpTo(inst, savedPos); notify("Teleported"); }
    catch (e) { notify("Teleport failed: " + e); log("tpSaved failed: " + e); }
}

function tpUp() {
    var inst = needPlayer();
    if (!inst) return;
    try { var pos = playerPos(inst); tpTo(inst, [pos[0], pos[1] + 10, pos[2]]); notify("Teleported up"); }
    catch (e) { notify("Teleport failed: " + e); log("tpUp failed: " + e); }
}

function launchEnemies() {
    var n = 0, bad = 0, f = Number(p.launchForce);
    try {
        AIKinds.forEach(function (cls) {
            choose(cls).forEach(function (o) {
                try { o.method("Knockback", 2).invoke([(Math.random() - 0.5) * 0.6, 1, (Math.random() - 0.5) * 0.6], f); n++; }
                catch (e) { bad++; if (bad === 1) log("launch failed: " + e); }
            });
        });
    } catch (e2) { notify("Launch failed: " + e2); return; }
    notify("Launched " + n + " enemies" + (bad ? " (" + bad + " failed)" : ""));
}
function launchPlayers() {
    var n = 0, f = Number(p.launchForce);
    try {
        if (!NetPlayerCls || !SyncCls) throw new Error("NetworkPlayer / PlayerInfoSync not found");
        var sync = SyncCls.field("instance").value;
        if (!sync || sync.isNull()) throw new Error("not in a room");
        choose(NetPlayerCls).forEach(function (o) {
            var info = ownerInfo(o);
            if (!info || info.local) return;
            try { sync.method("DamagePlayer").invoke(info.id, 0.0, ui.vec3((Math.random() - 0.5) * f, f, (Math.random() - 0.5) * f)); n++; } catch (e) { }
        });
    } catch (e2) { notify("Launch players failed: " + e2); return; }
    notify("Launched " + n + " player(s)");
}
function killAll() {
    var seen = {}, n = 0, bad = 0, net = 0;
    try {
        AIKinds.forEach(function (cls) {
            var objs = choose(cls);
            for (var i = 0; i < objs.length; i++) {
                var o = objs[i], k = o.handle.toString();
                if (seen[k]) continue;
                seen[k] = 1;
                try { o.method("DoDamage").invoke(99999.0); n++; }
                catch (e) { bad++; if (bad === 1) log("kill failed: " + e); }
            }
        });
        // enemies another player owns: go through the enemy manager like a real hit does
        var mgr = EnemyMgrCls ? EnemyMgrCls.field("instance").value : null;
        if (NetEnemyCls && mgr && !mgr.isNull()) {
            var me = PlayerMP ? currentPlayer() : null, myId = 0;
            try { var li = me ? ownerInfo(me.field("networkPlayer").value) : null; if (li) myId = li.id; } catch (e) { }
            choose(NetEnemyCls).forEach(function (ne) {
                try {
                    var rv = ne.method("get_realtimeView").invoke();
                    if (rv && !rv.isNull()) { mgr.method("DamageEnemy").invoke(rv, myId, 99999.0); net++; }
                } catch (e) { bad++; if (bad === 1) log("kill (network) failed: " + e); }
            });
        }
    } catch (e2) { log("killAll failed: " + e2); notify("Kill all failed: " + e2); return; }
    notify("Enemies: " + n + " hit locally, " + net + " through the manager" + (bad ? " (" + bad + " failed)" : ""));
    log("killAll: " + n + " hit, " + net + " via manager, " + bad + " failed");
}


// ---------------------------------------------------------------- rain money

var moneySpawner = null;

function getMoneySpawner() {
    try {
        if (moneySpawner && !moneySpawner.isNull()) return moneySpawner;
    } catch (e) { }
    moneySpawner = null;
    try {
        if (!MoneyCls) return null;
        var all = choose(MoneyCls);
        if (all.length) moneySpawner = all[0];
    } catch (e) { }
    return moneySpawner;
}

function rainOnce(quiet) {
    var inst = PlayerMP ? currentPlayer() : null;
    if (!inst) { if (!quiet) notify("Player not found yet (get into a level first)"); return !!quiet; }
    try {
        var pos = playerPos(inst);
        var sp = getMoneySpawner();
        var n = Math.max(1, Math.min(60, p.rainCount | 0)), amt = Math.max(1, p.rainAmount | 0), shown = 0;
        for (var i = 0; i < n; i++) {
            if (!sp) break;
            var ang = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * p.rainRadius;
            var y = pos[1] + p.rainHeight * (0.5 + Math.random() * 0.8);
            try { sp.method("SpawnPopUp").invoke(ui.vec3(pos[0] + Math.cos(ang) * r, y, pos[2] + Math.sin(ang) * r), amt); shown++; }
            catch (e) { if (!failures.rainPop) { failures.rainPop = 1; log("SpawnPopUp failed: " + e); } break; }
        }
        GameMgrCls.method("AddMoney").invoke((n * amt) | 0);
        live("rainMoney");
        if (!quiet) notify("Rained " + n * amt + " money" + (sp ? "" : " (no popup spawner found, money added only)"));
        return true;
    } catch (e) {
        if (!quiet) notify("Rain money failed: " + e);
        log("rainOnce failed: " + e);
        return false;
    }
}

// ---------------------------------------------------------------- grab anything

var handOffs = null;      // byte offsets of the three LayerMask fields
var handRecs = {};        // handle -> { obj, masks, reach, strength, seen }

function resolveHandOffs() {
    handOffs = {};
    ["grabableMask", "ragdollMask", "crawlMask"].forEach(function (n) {
        try { var f = HandCls.tryField(n); if (f) handOffs[n] = f.offset; } catch (e) { }
    });
    log("grab anything: mask fields found: " + Object.keys(handOffs).join(", "));
}

function writeMasks(rec, widen) {
    var base = rec.obj.handle;
    var k = 0;
    ["grabableMask", "ragdollMask", "crawlMask"].forEach(function (n) {
        if (handOffs[n] === undefined) return;
        base.add(handOffs[n]).writeS32(widen ? (-1 & ~(1 << 18)) : rec.masks[k]);
        k++;
    });
}

function tuneHand(self) {
    if (!handOffs) resolveHandOffs();
    var key = self.handle.toString(), rec = handRecs[key];
    if (p.grabAnything) {
        if (!rec) {
            var masks = [];
            ["grabableMask", "ragdollMask", "crawlMask"].forEach(function (n) {
                if (handOffs[n] !== undefined) masks.push(self.handle.add(handOffs[n]).readS32());
            });
            rec = handRecs[key] = { obj: self, masks: masks, reach: num(self, "maxGrabDistance"), strength: num(self, "Strength"), seen: 0 };
            log("grab anything on for a hand (reach " + rec.reach + ", strength " + rec.strength + ", masks " + masks.join("/") + ")");
        }
        rec.seen = Date.now();
        writeMasks(rec, true);
        self.field("maxGrabDistance").value = Math.max(rec.reach, p.grabReach);
        self.field("Strength").value = rec.strength * p.grabStrength;
        live("grabAnything");
    } else if (rec) {
        restoreHand(rec);
        delete handRecs[key];
    }
}

function restoreHand(rec) {
    try {
        writeMasks(rec, false);
        rec.obj.field("maxGrabDistance").value = rec.reach;
        rec.obj.field("Strength").value = rec.strength;
    } catch (e) { }
}

function restoreHands() {
    var now = Date.now();
    for (var k in handRecs) {
        // a hand that has not ticked for 5s is probably gone, do not touch freed memory
        if (now - handRecs[k].seen < 5000) restoreHand(handRecs[k]);
    }
    handRecs = {};
}

// ---------------------------------------------------------------- vacuum

var vac = { center: null, enemies: {}, nextIdx: 0, players: {}, rbName: {}, sync: null, lastLog: 0 };

function vacEnemy(self, force) {
    var c = vac.center;
    if (!c) return;
    var key = self.handle.toString(), now = Date.now();
    var rec = vac.enemies[key];
    if (!rec) {
        if (vac.nextIdx > 400) { vac.enemies = {}; vac.nextIdx = 0; }
        rec = vac.enemies[key] = { idx: vac.nextIdx++, last: 0 };
    }
    if (!force && now - rec.last < 150) return;
    rec.last = now;
    // golden angle spreads any number of enemies evenly round the ring
    var ang = rec.idx * 2.399963;
    var tx = c[0] + Math.cos(ang) * p.vacRadius, tz = c[2] + Math.sin(ang) * p.vacRadius;
    var agent = self.field("agent").value;
    if (!agent || agent.isNull()) return;
    agent.method("Warp").invoke(ui.vec3(tx, c[1], tz));
}

function pullEnemiesNow() {
    var inst = needPlayer();
    if (!inst) return;
    var n = 0, seen = {};
    try {
        vac.center = playerPos(inst);
        AIKinds.forEach(function (cls) {
            choose(cls).forEach(function (o) {
                var k = o.handle.toString();
                if (seen[k]) return;
                seen[k] = 1;
                try { vacEnemy(o, true); n++; } catch (e) { if (!failures.pullNow) { failures.pullNow = 1; log("pull enemy failed: " + e); } }
            });
        });
    } catch (e2) { notify("Pull failed: " + e2); log("pullEnemiesNow failed: " + e2); return; }
    notify("Pulled " + n + " enemies into the ring");
}

function firstBodyName(np) {
    var key = np.handle.toString();
    if (vac.rbName[key]) return vac.rbName[key];
    var name = "";
    try {
        var arr = np.field("rigidbodies").value;
        if (arr && !arr.isNull() && arr.length > 0) name = str(arr.get(0).method("get_name").invoke());
    } catch (e) { }
    vac.rbName[key] = name;
    return name;
}

// runs from NetworkPlayer.Update, only while Vacuum Players is on
function vacPlayer(self) {
    var c = vac.center;
    if (!c) return;
    var info = ownerInfo(self);
    if (!info || info.local) return;
    var now = Date.now();
    if (now - (vac.players[info.id] || 0) < 200) return;
    vac.players[info.id] = now;
    var pos = ui.read3(self.method("get_WorldPosition").invoke());
    var dx = c[0] - pos[0], dy = c[1] + 1 - pos[1], dz = c[2] - pos[2];
    var len = Math.hypot(dx, dy, dz);
    if (len < p.vacRadius) return;
    if (!vac.sync || vac.sync.isNull()) vac.sync = SyncCls ? SyncCls.field("instance").value : null;
    if (!vac.sync || vac.sync.isNull()) return;
    var f = p.vacForce / len;
    vac.sync.method("AddPlayerHit").invoke(ui.vec3(pos[0], pos[1], pos[2]), ui.vec3(dx * f, dy * f, dz * f),
        info.id >>> 0, Il2Cpp.string(firstBodyName(self)), 0);
    live("vacPlayers");
    if (now - vac.lastLog > 5000) { vac.lastLog = now; log("vacuum players: sent a pull hit at player " + info.id + " (distance " + len.toFixed(1) + ")"); }
}

// ---------------------------------------------------------------- camera

var camState = { origFov: null, camHandle: null, tpLast: null, tpBase: null, tick: 0 };

function playerCamera(inst) {
    try {
        var c = PlayerMP.field("playerCam").value;
        if (c && !c.isNull()) return c;
    } catch (e) { }
    try {
        var m = inst.field("mainCam").value;
        if (m && !m.isNull()) return m;
    } catch (e) { }
    return null;
}

function near3(a, b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 0.0005; }

function cameraFrame(inst) {
    var cam = playerCamera(inst);
    if (!cam) return;
    var h = cam.handle.toString();
    if (camState.camHandle !== h) { camState.camHandle = h; camState.origFov = null; camState.tpLast = null; }

    if (p.fovOn) {
        if (camState.origFov === null) { camState.origFov = Number(cam.method("get_fieldOfView").invoke()); log("camera fov before: " + camState.origFov); }
        cam.method("set_fieldOfView").invoke(p.fov);
        live("fov");
    } else if (camState.origFov !== null) {
        cam.method("set_fieldOfView").invoke(camState.origFov);
        camState.origFov = null;
    }

    var tr = cam.method("get_transform").invoke();
    if (p.thirdPerson) {
        var cur = ui.read3(tr.method("get_position").invoke());
        // if nothing overwrote our last position this frame, leave it where it is
        if (camState.tpLast && near3(cur, camState.tpLast)) return;
        var f = ui.read3(tr.method("get_forward").invoke());
        camState.tpBase = cur;
        var np = [cur[0] - f[0] * p.tpDist, cur[1] - f[1] * p.tpDist + p.tpHeight, cur[2] - f[2] * p.tpDist];
        tr.method("set_position").invoke(ui.vec3(np[0], np[1], np[2]));
        camState.tpLast = np;
        live("thirdPerson");
    } else if (camState.tpLast) {
        var now3 = ui.read3(tr.method("get_position").invoke());
        if (near3(now3, camState.tpLast) && camState.tpBase) tr.method("set_position").invoke(ui.vec3(camState.tpBase[0], camState.tpBase[1], camState.tpBase[2]));
        camState.tpLast = null; camState.tpBase = null;
    }
}

function cameraNeeded() { return p.fovOn || p.thirdPerson || camState.origFov !== null || camState.tpLast; }

// ---------------------------------------------------------------- score changer

var scoreLockAt = 0;

function gameSyncInst() {
    try {
        var g = GameSyncCls ? GameSyncCls.field("instance").value : null;
        return g && !g.isNull() ? g : null;
    } catch (e) { return null; }
}

function myNetId() {
    try {
        var me = currentPlayer();
        var li = me ? ownerInfo(me.field("networkPlayer").value) : null;
        return li ? li.id : null;
    } catch (e) { return null; }
}

function roomIds() {
    var ids = [], seen = {};
    try {
        var sync = SyncCls ? SyncCls.field("instance").value : null;
        if (sync && !sync.isNull()) {
            var arr = sync.method("GetPlayerList").invoke();
            for (var i = 0; i < arr.length; i++) { var id = Number(arr.get(i)); if (!seen[id]) { seen[id] = 1; ids.push(id); } }
        }
    } catch (e) { }
    var mine = myNetId();
    if (mine !== null && !seen[mine]) { seen[mine] = 1; ids.push(mine); }
    return ids;
}

function scoreTargets() {
    var ids = roomIds(), mine = myNetId();
    if (p.scoreTarget === "Only Me") return mine === null ? [] : [mine];
    if (p.scoreTarget === "Everyone Except Me") return ids.filter(function (i) { return i !== mine; });
    return ids;
}

// kind: "kills" | "deaths" | "buddy". returns how many players were changed, or -1 if the game was not ready
function setScore(kind, value, quiet) {
    var gs = gameSyncInst();
    if (!gs) { if (!quiet) notify("Game not ready (get into a room first)"); return -1; }
    var ok = 0, viaAdd = 0, bad = 0;
    try {
        var model = gs.method("get_model").invoke();
        if (!model || model.isNull()) { if (!quiet) notify("Score model not ready yet"); return -1; }
        var getter = kind === "kills" ? "get_playerKills" : kind === "deaths" ? "get_playerDeaths" : "get_ragdollKills";
        var dict = model.method(getter).invoke();
        var ids = scoreTargets();
        var v = value | 0;
        ids.forEach(function (id) {
            try { if (!gs.method("PlayerExistsInDict").invoke(id >>> 0)) gs.method("AddPlayerToDict").invoke(id >>> 0); } catch (e) { }
            try {
                var m = dict.method("get_Item").invoke(id >>> 0);
                m.method("set_score").invoke(v);
                ok++;
                return;
            } catch (e) {
                if (!failures.scoreSet) { failures.scoreSet = 1; log("set score directly failed (" + e + "), trying the game's own add calls"); }
            }
            // fallback: only can go up, uses the game's own counters
            try {
                var cur = kind === "kills" ? Number(gs.method("GetPlayerKills").invoke(id >>> 0)) : kind === "deaths" ? Number(gs.method("GetPlayerDeaths").invoke(id >>> 0)) : null;
                if (cur === null) { bad++; return; }
                var delta = Math.min(1000, v - cur);
                for (var i = 0; i < delta; i++) {
                    if (kind === "kills") gs.method("AddPlayerKill").invoke(id >>> 0, 0);
                    else gs.method("AddPlayerDeath").invoke(id >>> 0);
                }
                viaAdd++;
            } catch (e2) { bad++; if (bad === 1) log("score fallback failed: " + e2); }
        });
        live("scoreChanger");
        var line = "score " + kind + " = " + v + ": " + ok + " set directly, " + viaAdd + " via add calls, " + bad + " failed, of " + ids.length + " players";
        if (line !== scoreLastLog[kind]) { scoreLastLog[kind] = line; log(line); }   // Lock Scores repeats this every second
    } catch (e3) {
        log("setScore failed: " + e3);
        if (!quiet) notify("Score change failed: " + e3);
        return -1;
    }
    if (!quiet) notify(kind + ": " + (ok + viaAdd) + " players changed" + (bad ? ", " + bad + " failed (see log)" : ""));
    return ok + viaAdd;
}

function setAllScores(quiet) {
    var a = setScore("kills", p.scoreKills, true), b = setScore("deaths", p.scoreDeaths, true), c = setScore("buddy", p.scoreBuddy, true);
    if (!quiet) notify(a < 0 ? "Game not ready (get into a room first)" : "Scores set for " + Math.max(a, b, c) + " players");
}

// runs from onFrame: money rain, vacuum centre, camera, score lock
var rainAt = 0;
function extrasFrame() {
    var now = Date.now();
    if (p.moneyRain && now >= rainAt) {
        rainAt = now + Math.max(100, p.rainEvery * 1000);
        if (!rainOnce(true) && fail("moneyRain", "rainOnce returned false")) p.moneyRain = false;
    }
    if (p.vacEnemies || p.vacPlayers) {
        var inst = currentPlayer();
        if (inst) { try { vac.center = playerPos(inst); } catch (e) { vac.center = null; } }
    }
    if (cameraNeeded()) {
        var ci = currentPlayer();
        if (ci) {
            try { cameraFrame(ci); }
            catch (e) { if (fail("camera", e)) { p.thirdPerson = false; p.fovOn = false; camState.tpLast = null; } }
        }
    }
    if (p.scoreLock && now >= scoreLockAt) {
        scoreLockAt = now + 1000;
        try { setAllScores(true); } catch (e) { if (fail("scoreLock", e)) p.scoreLock = false; }
    }
}

// ---------------------------------------------------------------- spawn menu

function refreshItems() {
    var byName = {};
    try {
        if (!ItemBtnCls) throw new Error("ItemBtn class not found");
        var btns = choose(ItemBtnCls);
        for (var i = 0; i < btns.length; i++) {
            var b = btns[i];
            try {
                var name = str(b.field("Name").value);
                if (!name) continue;
                var e = {
                    name: name,
                    price: Number(b.field("Price").value),
                    isPower: !!b.field("isPower").value,
                    inStore: !!b.field("InStore").value,
                    btn: b,
                };
                e.kind = kindOf(name);
                var old = byName[name];
                // prefer the spawn-list button over the store button for the same item
                if (!old || (old.inStore && !e.inStore)) byName[name] = e;
                if (p.unlockAll) {
                    b.field("isLocked").value = false;
                    b.field("owned").value = true;
                }
            } catch (err) { }
        }
    } catch (e2) {
        log("item list failed: " + e2);
        notify("Item list failed: " + e2);
    }
    var tabletCount = Object.keys(byName).length;
    // add every prefab name the tablet did not give us
    PREFAB_NAMES.forEach(function (n) {
        if (!byName[n]) byName[n] = { name: n, price: 0, isPower: false, inStore: false, btn: null, kind: prefabKind(n), prefab: true };
    });
    entries = Object.keys(byName).sort().map(function (k) { return byName[k]; });
    if (!tabletCount) log("no ItemBtn objects found (open the tablet once, then refresh to add its entries), showing the prefab list only");
    itemLabels = entries.map(entryLabel);
    if (sel.v >= entries.length) sel.v = 0;
    log("item list: " + entries.length + " entries");
    for (var j = 0; j < entries.length; j += 8) {
        log("items: " + entries.slice(j, j + 8).map(function (e) { return e.name; }).join(", "));
    }
    notify(entries.length + " items found");
}

function chosen() {
    var t = (typed.v || "").trim();
    if (t) {
        for (var i = 0; i < entries.length; i++) if (entries[i].name === t) return entries[i];
        return { name: t, btn: null, kind: kindOf(t) };
    }
    return entries[sel.v] || null;
}

function needPlayer() {
    var inst = PlayerMP ? currentPlayer() : null;
    if (!inst) notify("Player not found yet (get into a level first)");
    return inst;
}

function clickGameButton() {
    var e = chosen();
    if (!e) return notify("Refresh the item list first");
    if (!e.btn) return notify("No game button for that name, use Spawn Item / NPC / Vehicle");
    try {
        e.btn.method("OnClick").invoke();
        notify("Clicked " + e.name);
        log("clicked ItemBtn " + e.name + (e.inStore ? " (store button, may try to buy)" : ""));
    } catch (err) {
        notify("Click failed: " + err);
        log("OnClick failed for " + e.name + ": " + err);
    }
}

function smartSpawn() {
    var e = chosen();
    if (!e) return notify("Refresh the item list first");
    if (e.kind === "vehicle") spawnVehicle();
    else if (e.kind === "npc") spawnNpc();
    else spawnItem();
}

function spawnItem() {
    var e = chosen(), inst = needPlayer();
    if (!e || !inst) return;
    try {
        inst.method("Spawn").invoke(Il2Cpp.string(e.name));
        notify("Spawn(" + e.name + ")");
    } catch (err) { notify("Spawn failed: " + err); log("Spawn failed for " + e.name + ": " + err); }
}

function spawnNpc() {
    var e = chosen(), inst = needPlayer();
    if (!e || !inst) return;
    try {
        var pos = inst.method("GetNPCSpawnPosition").invoke();
        inst.method("SpawnNPCAt").invoke(Il2Cpp.string(e.name), pos);
        notify("SpawnNPCAt(" + e.name + ")");
    } catch (err) { notify("Spawn NPC failed: " + err); log("SpawnNPCAt failed for " + e.name + ": " + err); }
}

function spawnVehicle() {
    var e = chosen(), inst = needPlayer();
    if (!e || !inst) return;
    try {
        var pos = inst.method("GetVehicleSpawnPosition").invoke();
        inst.method("SpawnVehicleAt").invoke(Il2Cpp.string(e.name), pos);
        notify("SpawnVehicleAt(" + e.name + ")");
    } catch (err) { notify("Spawn vehicle failed: " + err); log("SpawnVehicleAt failed for " + e.name + ": " + err); }
}

globalThis.__BB.tabs.world = (function (ui) {
    ui.separator();
    ui.text("Spawn menu");
    if (ui.button("Refresh Item List")) refreshItems();
    if (!entries.length) seedPrefabEntries();
    ui.combo("Item", sel, itemLabels);
    ui.inputText("Or type a name", typed);
    if (ui.button("Smart Spawn")) smartSpawn();
    ui.sameLine();
    if (ui.button("Click Game Button")) clickGameButton();
    if (ui.button("Spawn Item")) spawnItem();
    ui.sameLine();
    if (ui.button("Spawn NPC")) spawnNpc();
    ui.sameLine();
    if (ui.button("Spawn Vehicle")) spawnVehicle();
    ui.textDisabled("Smart Spawn picks item / npc / vehicle for you. [prefab] names work without the tablet");
    ui.textDisabled("open the tablet once and press Refresh Item List to add the tablet's own entries too");
    ui.textDisabled("typed name wins over the dropdown. clear it to use the dropdown again");
});

// ---------------------------------------------------------------- v9: players, powers, enemies, vehicles, lobby, maps
var V9_IMG = null;
function img9() { return V9_IMG || (V9_IMG = Il2Cpp.domain.assembly("Assembly-CSharp").image); }
function cls9(n) { return img9().class(n); }
function defOf(key) { for (var i = 0; i < DEFS.length; i++) if (DEFS[i].key === key) return DEFS[i]; return null; }
var v9t = {};
function every9(k, ms) { var now = Date.now(); if (now - (v9t[k] || 0) < ms) return false; v9t[k] = now; return true; }
function all9(n) { try { return choose(cls9(n)).filter(uAlive); } catch (e) { return []; } }
function v3(a) { return ui.vec3(a[0], a[1], a[2]); }
function needPlayer9() { var i = currentPlayer(); if (!i) notify("Not in game yet"); return i; }
function myNP() { var i = currentPlayer(); if (!i) return null; var np = i.field("networkPlayer").value; return (np && !np.isNull()) ? np : null; }
function npName(np) { try { return String(np.field("playerNameText").value.method("get_text").invoke().content).replace(/<[^>]*>/g, "") || "?"; } catch (e) { return "?"; } }
function npPos(np) { return ui.read3(np.method("get_transform").invoke().method("get_position").invoke()); }
function otherNPs() {
    var out = [], mine = myNP(), me = rtClientId(), list = cls9("NetworkPlayer").field("allPlayersInternal").value;
    if (!list || list.isNull()) return out;
    var n = list.method("get_Count").invoke();
    for (var i = 0; i < n; i++) {
        var np = list.method("get_Item").invoke(i);
        if (!np || np.isNull() || (mine && np.handle.equals(mine.handle))) continue;
        var id = npOwner(np);
        if (me >= 0 && id === me) continue;   // our own clones are NetworkPlayers too
        out.push(np);
    }
    out.sort(function (a, b) { return npOwner(a) - npOwner(b); });   // same order as the follow slots
    return out;
}
// Normcore client id of this game instance (the id PlayerInfoSync keys health by)
var rtId = { v: -1, at: 0 };
function rtClientId() {
    var now = Date.now();
    if (rtId.v >= 0 && now - rtId.at < 2000) return rtId.v;
    try { rtId.v = Number(cls9("SceneLoader").method("get_Realtime").invoke().method("get_clientID").invoke()); } catch (e) { rtId.v = -1; }
    rtId.at = now;
    return rtId.v;
}
function npOwner(np) { try { return Number(np.method("get_realtimeView").invoke().method("get_ownerIDSelf").invoke()); } catch (e) { return -1; } }

// ---- on-demand hooks: installed the first time a toggle needs them, gated by the toggle after that ----
var v9hooks = {};
function hook9(cn, mn, make, need) {
    try { var m = cls9(cn).method(mn); replace(m, cn + "." + mn, make, need); }
    catch (e) { log("v9: could not find " + cn + "." + mn + " (" + e + ")"); }
}
var v9hooksMade = false;
function hooksStep() {
    if (!v9hooksMade) {
        v9hooksMade = true;
        // god mode: while on, damage and death never reach the game, so nothing can throw
        hook9("PlayerMultiplayer", "DoDamage", function () { return function () { }; }, function () { return p.god; });
        hook9("PlayerMultiplayer", "NetworkPlayer_onDamaged", function () { return function () { }; }, function () { return p.god; });
        hook9("PlayerMultiplayer", "Death", function () { return function () { }; }, function () { return p.god; });
        // the health everyone sees (and that hides your body when it hits 0) lives in PlayerInfoSync, keyed by client id
        hook9("PlayerInfoSync", "DamagePlayer", function (m) { return function (id, dmg, pos) { if (p.god && Number(id) === rtClientId()) return false; return m.bind(this).invoke(id, dmg, pos); }; }, function () { return p.god; });
        hook9("PlayerInfoSync", "KillPlayer", function (m) { return function (id) { if (p.god && Number(id) === rtClientId()) return; m.bind(this).invoke(id); }; }, function () { return p.god; });
        // clones: the game copies YOUR saved name / skin / hat onto every player body you own as it spawns, so put the clone's look back right after
        // passive (the game runs its own InitializePlayer natively, we only run after it)
        var miss = hookMethod(cls9("NetworkPlayer"), "NetworkPlayer", "InitializePlayer", null, function (self) { cloneInit(self); }, function () { return clones.initHook || clones.list.length > 0; });
        if (miss) log("v9: could not find " + miss);
        // See My Own Clones: every frame NetworkPlayer.Update hides the hat / health bar and puts the body mesh on the hidden
        // layer for any body we own. Undo that right after each clone's Update, before the frame renders
        miss = hookMethod(cls9("NetworkPlayer"), "NetworkPlayer", "Update", null, function (self) { cloneShowFrame(self); }, function () { return p.cloneShowMe && clones.list.length > 0; });
        if (miss) log("v9: could not find " + miss);
        hook9("PlayerMultiplayer", "RespawnDelay", function (m) { return function (byGame, time) { return m.bind(this).invoke(byGame, 0.0); }; }, function () { return p.instantRespawn; });
        // Punch = Launch: after an enemy takes damage, knock it skyward
        hook9("AIBase", "DoDamage", function (m) { return function (dmg) { var r = m.bind(this).invoke(dmg); try { if (p.punchLaunch) this.method("Knockback", 2).invoke([0, 1, 0], Number(p.launchForce) || 50); } catch (e) { } return r; }; }, function () { return p.punchLaunch; });
        hook9("PlayerMultiplayer", "DespawnPreviousVehicle", function () { return function () { }; }, function () { return p.keepVehicles; });
        hook9("NPCSpawnLimit", "Prune", function () { return function () { }; }, function () { return p.noNpcLimit; });
        hook9("AIBase", "PickNetworkTarget", function () { return function () { return NULL; }; }, function () { return p.ignoreMe; });
        // OP stats: SPManager's stat getters return a huge value while their toggle is on, the real one otherwise
        OP_STATS.forEach(function (o) {
            hook9("SPManager", o[1], function (m) { return function () { return p[o[0]] ? o[2] : m.bind(this).invoke(); }; }, function () { return !!p[o[0]]; });
        });
    }
    replSync();
}

// ---- god mode: keep the synced health full. The game shows / hides your body for everyone from
// PlayerInfoSync's health, and only Respawn puts it back. God mode blocks Death, so without this a hit
// that got through (or one from before god was on) left you at 0 there forever = invisible to everyone.
function godNetStep(inst) {
    var np = inst.field("networkPlayer").value;
    if (!np || np.isNull()) return;
    var pis = cls9("PlayerInfoSync").field("instance").value;
    if (!pis || pis.isNull()) return;
    var id = rtClientId(); if (id < 0) return;
    var hp = Number(pis.method("GetPlayerHealth").invoke(id)), max = 100;
    try { var st = inst.field("playerStats").value; if (st && !st.isNull()) max = Number(st.field("maxHealth").value) || 100; } catch (e) { }
    if (hp >= max) return;
    np.method("SetHealth").invoke(max);
    if (hp <= 0) {
        log("god: synced health was " + hp + " (you were invisible), set back to " + max);
        try { inst.field("alive").value = true; inst.field("hasDied").value = false; } catch (e) { }
        try { var ds = inst.field("deathScreen").value; if (ds && !ds.isNull()) ds.method("SetActive").invoke(false); } catch (e) { }
    }
}

// ---- player ----
function heal9() { var g = cls9("LocalGameManager").field("instance").value; if (!g || g.isNull()) throw new Error("LocalGameManager not ready"); g.method("HealLocalPlayer").invoke(9999.0); }
function tpToPlayer() {
    var inst = needPlayer9(); if (!inst) return;
    var list = otherNPs(), np = list[p.tpSlot - 1];
    if (!np) { notify("No player in slot " + p.tpSlot + " (" + list.length + " others)"); return; }
    var pos = npPos(np); pos[1] += 0.3;
    tpTo(inst, pos);
    notify("Teleported to " + npName(np));
}
function playerStep9(inst) {
    if (!p.infJump && !p.alwaysSprint) return;
    var loco = inst.field("movementController").value;
    if (!loco || loco.isNull()) return;
    if (p.infJump) loco.field("hasDoubleJumped").value = false;
    if (p.alwaysSprint) loco.field("sprinting").value = true;
}
function faceStep() {
    var d = defOf("myFace");
    if (d && d.options.length === 1) {
        try {
            if (!myNP()) return;   // the static list is only filled once a player face exists
            var names = cls9("PlayerFace").field("Names").value;
            if (!names || names.isNull()) return;
            for (var i = 0; i < names.length; i++) d.options.push(String(names.get(i).content));
        } catch (e) { fail("faces", e); }
    }
}
function applyFace() {
    var np = myNP(); if (!np) { notify("Not in game yet"); return; }
    var idx = defOf("myFace").options.indexOf(p.myFace) - 1;
    if (idx < 0) { notify("Pick a face first"); return; }
    np.method("SetExpression").invoke(idx);
}

// ---- powers: the game keeps these as static numbers, so set them once and put them back when off ----
var POW = {
    kameMax: ["KamehamehaPoower", { Cooldown: 0, MinChargeToFire: 0, MaxChargeTime: 0.05, BaseDamage: 350, BeamRange: 200 }],
    smashMax: ["SmashPower", { Cooldown: 0, SmashRadius: 12, SmashDamage: 999, KnockbackForce: 200 }],
    fistMax: ["FireFistPower", { FireFistDamage: 9999, FireFistKnockback: 1000 }],
    itMax: ["InstantTransmissionPower", { Range: 500, Cooldown: 0 }],
};
var powOrig = {};
function powersStep() {
    for (var k in POW) {
        var on = !!p[k], c = POW[k][0], vals = POW[k][1];
        if (on && !powOrig[k]) {
            try {
                var o = {}, kls = cls9(c);
                for (var f in vals) { o[f] = kls.field(f).value; kls.field(f).value = vals[f]; }
                powOrig[k] = o;
            } catch (e) { if (fail(k, e)) p[k] = false; }
        } else if (!on && powOrig[k]) {
            try { for (var g in powOrig[k]) cls9(c).field(g).value = powOrig[k][g]; } catch (e) { }
            delete powOrig[k];
        }
    }
    if (p.laserInf && every9("laser", 200)) {
        var max = cls9("LaserPower").field("MaxCharge").value;
        all9("LaserPower").forEach(function (l) { try { l.field("charge").value = max; l.field("recharging").value = false; } catch (e) { } });
    }
}
function powersClear() { for (var k in POW) p[k] = false; powersStep(); }

// ---- enemies ----
function applyEnemyMults() {
    var n = 0;
    AIKinds.forEach(function (c) {
        choose(c).filter(uAlive).forEach(function (a) {
            try {
                a.method("ApplyHealthMultiplier").invoke(p.enHp);
                a.method("ApplyDamageMultiplier").invoke(p.enDmg);
                a.method("ApplySpeedMultiplier").invoke(p.enSpd);
                n++;
            } catch (e) { }
        });
    });
    notify("Applied to " + n + " enemies (multiplies their current values)");
}

// ---- vehicles ----
var VEH = { ArcadeCar: ["topSpeed", "acceleration"], ArcadeFlyer: ["forwardSpeed", "climbSpeed", "strafeSpeed"], Nimbus: ["forwardSpeed", "verticalSpeed"], PlaneController: ["maxSpeed", "acceleration"], CarController: ["topSpeed", "accelerationRate"] };
var vehOrig = {};
var scoreLastLog = {};
var OP_STATS = [["opDamage", "get_DamageMultiplier", 999999], ["opResist", "get_ResistanceMultiplier", 999999999], ["opReload", "get_ReloadSpeedMultiplier", 999999],
    ["opCritDmg", "get_CritDamageMultiplier", 999999], ["opRegen", "get_HPRegenMultiplier", 999999], ["opKnock", "get_KnockbackMultiplier", 999999],
    ["opBuddyHP", "get_BonusBuddyHP", 999999], ["opCrit", "get_CritChance", 1], ["opTurbo", "get_TurboChance", 1], ["opLifeSteal", "get_LifeStealFraction", 1],
    ["opBurn", "get_BurnDamageFraction", 1]];
// car tuning: exact values on the ArcadeCar of the vehicle we're driving (VehicleNetSync._localDriving)
var carOrig = {};
var CAR_FIELDS = [["topSpeed", "carTop"], ["acceleration", "carAccel"], ["brakeDeceleration", "carBrake"], ["accelerationFalloff", "carFalloff"]];
function carTuneStep() {
    if (!p.carTune) {
        for (var k in carOrig) { var o = carOrig[k]; if (uAlive(o.car)) CAR_FIELDS.forEach(function (f) { try { o.car.field(f[0]).value = o.f[f[0]]; } catch (e) { } }); }
        carOrig = {};
        return;
    }
    if (!every9("carTune", 1000)) return;
    all9("VehicleNetSync").forEach(function (sync) {
        try {
            if (sync.field("_localDriving").value !== true) return;
            var car = sync.field("car").value;
            if (!uAlive(car)) return;
            var key = car.handle.toString();
            if (!carOrig[key]) { var o = { car: car, f: {} }; CAR_FIELDS.forEach(function (f) { o.f[f[0]] = Number(car.field(f[0]).value); }); carOrig[key] = o; log("car tuning: applied to " + key + " (was top " + o.f.topSpeed + ")"); }
            CAR_FIELDS.forEach(function (f) { car.field(f[0]).value = Number(p[f[1]]); });
        } catch (e) { fail("car tuning", e); }
    });
}
function vehiclesStep() {
    carTuneStep();
    if (p.vehSpeed) {
        if (!every9("veh", 500)) return;
        for (var c in VEH) all9(c).forEach(function (v) {
            var key = v.handle.toString(), o = vehOrig[key];
            if (!o) { o = vehOrig[key] = { v: v, f: {} }; VEH[c].forEach(function (f) { try { o.f[f] = Number(v.field(f).value); } catch (e) { } }); }
            for (var f in o.f) { try { v.field(f).value = o.f[f] * p.vehMul; } catch (e) { } }
        });
    } else if (Object.keys(vehOrig).length) vehiclesClear();
}
function vehiclesClear() {
    for (var k in vehOrig) { var o = vehOrig[k]; for (var f in o.f) { try { o.v.field(f).value = o.f[f]; } catch (e) { } } }
    vehOrig = {};
}

// ---- lobby (the new 6.7.9 lobby: buddy, reward pads, high striker, wheel) ----
function buddy9(name) { return cls9("LobbyBuddy").method(name); }
function buddyToMe() { var i = needPlayer9(); if (!i) return; if (!buddy9("get_Exists").invoke()) { notify("No lobby buddy here"); return; } var pos = playerPos(i); pos[1] += 1; buddy9("TeleportTo").invoke(v3(pos)); }
function buddyLaunch() { if (!buddy9("get_Exists").invoke()) { notify("No lobby buddy here"); return; } buddy9("Launch").invoke(v3([0, p.buddyPower, 0]), 15.0); }
function buddyFarmStep() {
    if (!p.buddyFarm || !every9("farm", 300)) return;
    try {
        if (!buddy9("get_IsAlive").invoke()) return;
        var hip = buddy9("get_HipPosition").invoke();
        buddy9("Hurt").invoke(40.0, hip, p.buddyMult, false);
    } catch (e) { if (fail("buddyFarm", e)) p.buddyFarm = false; }
}
function rewardStep() {
    if (!p.noRewardCd || !every9("reward", 500)) return;
    all9("PlayerRewardZone").forEach(function (z) { try { z.field("cooldown").value = 0.0; z.field("_nextClaim").value = 0.0; } catch (e) { } });
}
function ringBell() { var n = 0; all9("HighStriker").forEach(function (h) { try { h.method("Strike").invoke(Number(h.field("fullSpeed").value) * 2); n++; } catch (e) { } }); notify(n ? "Struck " + n + " high striker(s)" : "No high striker here"); }
function wheelBuddy() { var w = all9("WheelOfMisfortune")[0]; if (!w) { notify("No wheel here"); return; } w.method("PutMyBuddyOnPad").invoke(); }
function lobbyAct(name) { var a = all9("LobbyActions")[0]; if (!a) { notify("Not in the lobby"); return; } a.method(name).invoke(); }

// ---- maps ----
var mapIds = [];
function refreshMaps() {
    var d = defOf("mapSel"), reg = cls9("MapRegistry").method("get_Instance").invoke();
    if (!reg || reg.isNull()) { notify("Map registry not loaded yet"); return; }
    var list = p.mapHidden ? reg.field("maps").value : reg.method("get_SelectableMaps").invoke(), n = list.method("get_Count").invoke();
    d.options.length = 0; mapIds = [];
    for (var i = 0; i < n; i++) {
        var m = list.method("get_Item").invoke(i);
        d.options.push(str(m.field("displayName").value) + " (lvl " + m.field("requiredLevel").value + ")");
        mapIds.push(str(m.field("id").value));
    }
    notify(n + " maps listed");
}
function travelMap() {
    var i = defOf("mapSel").options.indexOf(p.mapSel);
    if (i < 0 || !mapIds[i]) { notify("Press Refresh Map List first"); return; }
    cls9("SceneLoader").field("Instance").value.method("TravelTo", 1).overload("System.String").invoke(Il2Cpp.string(mapIds[i]));
}
function returnLobby() { cls9("SceneLoader").field("Instance").value.method("ReturnToLobby").invoke(); }
function unlockMaps() {
    var reg = cls9("MapRegistry").method("get_Instance").invoke(), list = reg.field("maps").value, n = list.method("get_Count").invoke();
    for (var i = 0; i < n; i++) list.method("get_Item").invoke(i).field("requiredLevel").value = 0;
    notify("Level requirement removed from " + n + " maps (until restart)");
}

// ---- v9.1: bulk spawner + clone rigs (both go through Normcore, so everyone sees them) ----
function nrCls(n) { return Il2Cpp.domain.assembly("Normal.Realtime").image.class(n); }
function nrsCls(n) { return Il2Cpp.domain.assembly("Normal.Realtime.Shared").image.class(n); }
function coreCls(n) { return Il2Cpp.domain.assembly("UnityEngine.CoreModule").image.class(n); }
function comp9(go, kls) { try { var c = go.method("GetComponent", 1).invoke(kls.type.object); return (c && !c.isNull()) ? c : null; } catch (e) { return null; } }
function qIdent() { return coreCls("UnityEngine.Quaternion").method("get_identity").invoke(); }
function alive9(go) { return uAlive(go); }
function ringPos(center, i, n, r) { var a = i / Math.max(1, n) * Math.PI * 2; return [center[0] + Math.cos(a) * r, center[1], center[2] + Math.sin(a) * r]; }

// bulk spawner: the game's own networked InstantiateAt, scaled through the synced RealtimeTransform
var bulk = { list: [], at: 0 };
function grabSet() { var o = {}; choose(GrabableCls).forEach(function (g) { o[g.handle.toString()] = g; }); return o; }
function placeItem(g, pos) {
    var go = g.method("get_gameObject").invoke(), tr = go.method("get_transform").invoke(), sc = p.bulkScale;
    var rt = comp9(go, nrCls("Normal.Realtime.RealtimeTransform"));
    if (rt) { try { rt.method("RequestOwnership").invoke(); } catch (e) { } try { rt.method("set_syncScale").invoke(true); } catch (e) { } }
    tr.method("set_position").invoke(v3(pos));
    tr.method("set_localScale").invoke(v3([sc, sc, sc]));
    try { var rb = g.field("rb").value; if (rb && !rb.isNull()) { rb.method("set_position").invoke(v3(pos)); rb.method("set_velocity").invoke(v3([0, 0, 0])); } } catch (e) { }
    return go;
}
function bulkSpawn() {
    var e = chosen(), inst = needPlayer();
    if (!e) { notify("Pick an item in the Spawn menu first"); return; }
    if (!inst) return;
    var c = playerPos(inst), n = 0, before = grabSet();
    for (var i = bulk.list.length; i < p.bulkCount; i++) {
        try { inst.method("Spawn").invoke(Il2Cpp.string(e.name)); n++; }
        catch (err) { log("bulk: Spawn(" + e.name + ") failed: " + err); p.bulkAuto = false; break; }
    }
    var fresh = [], after = grabSet();
    for (var k in after) if (!before[k]) fresh.push(after[k]);
    for (var j = 0; j < fresh.length; j++) {
        var pos = ringPos(c, bulk.list.length, p.bulkCount, p.bulkRadius); pos[1] += 1 + p.bulkScale * 0.3;
        try { bulk.list.push(placeItem(fresh[j], pos)); } catch (err) { log("bulk: place failed: " + err); }
    }
    log("bulk: asked for " + n + " x " + e.name + ", found " + fresh.length + " new item(s), " + bulk.list.length + " live");
    notify("Spawned " + fresh.length + " x " + e.name + " at " + p.bulkScale + "x");
    if (n && !fresh.length) { p.bulkAuto = false; notify("Spawn ran but no new item showed up, see log"); }
}
function bulkStep() {
    if (!p.bulkAuto || !every9("bulk", 1000)) return;
    bulk.list = bulk.list.filter(alive9);
    if (bulk.list.length < p.bulkCount) bulkSpawn();
}
function bulkClear() {
    var n = 0, R = nrCls("Normal.Realtime.Realtime");
    bulk.list.forEach(function (go) { try { if (alive9(go)) { R.method("Destroy", 1).overload("UnityEngine.GameObject").invoke(go); n++; } } catch (e) { } });
    bulk.list = [];
    notify("Removed " + n + " spawned items");
}

// clone rigs: extra copies of the game's own player avatar, owned by you, following you in a ring
var clones = { list: [], real: null, at: 0, mgr: null, realFor: "", realAt: 0, name: "", initHook: false, pending: null, seed: 0, visAt: 0, job: null };
// the other players' avatars in join order, from the avatar manager's clientID -> avatar map
function otherAvatars() {
    var out = [], me = myClientId();
    var en = clones.mgr.method("get_avatars").invoke().method("GetEnumerator").invoke();
    while (en.method("MoveNext").invoke()) {
        var kv = en.method("get_Current").invoke(), id = Number(kv.method("get_Key").invoke());
        if (id !== me) out.push({ id: id, av: kv.method("get_Value").invoke() });
    }
    out.sort(function (a, b) { return a.id - b.id; });
    return out;
}
function targetNodes() {
    var d = defOf("cloneTarget");
    if (p.cloneTarget === "Me") { if (d) d.label = "Clones Follow"; return localPlayerNodes(clones.mgr); }
    var t = otherAvatars()[parseInt(p.cloneTarget.slice(5), 10) - 1];
    if (!t || !uAlive(t.av)) { if (d) d.label = "Clones Follow  (nobody in that slot)"; return null; }
    if (d) d.label = "Clones Follow  (" + pname(t.id) + ")";
    return [t.av.method("get_transform").invoke(), t.av.method("get_head").invoke(), t.av.method("get_leftHand").invoke(), t.av.method("get_rightHand").invoke()];
}   // { go, nodes: [root, head, left, right] }
function localPlayerNodes(mgr) {
    var lp = mgr.field("_localPlayer").value;
    return ["root", "head", "leftHand", "rightHand"].map(function (f) { return lp.field(f).value; });
}
// A clone is owned by this client, so its voice component would open the microphone too: 8 clones = 9 mic
// captures on one device, which froze / crashed the game inside the mic code. Remove them before they start.
function stripVoice(go) {
    var UO = coreCls("UnityEngine.Object"), n = 0;
    [nrsCls("Normal.Realtime.RealtimeAvatarVoice"), cls9("NetworkVoiceManager")].forEach(function (k) {
        try {
            var arr = go.method("GetComponentsInChildren", 2).invoke(k.type.object, true);
            for (var i = 0; arr && !arr.isNull() && i < arr.length; i++) { UO.method("DestroyImmediate", 1).invoke(arr.get(i)); n++; }
        } catch (e) { log("clones: voice strip " + k.name + ": " + e); }
    });
    if (!clones.voiceLogged) { clones.voiceLogged = true; log("clones: removed " + n + " voice component(s) per clone"); }
}
// Clones spawn one per frame. Spawning them all inside one call meant one native fault (seen on the 8th clone)
// left the main thread damaged, and the next GC crashed the game. One per frame also keeps each spawn's work small.
// ---- punching bag: PunchingBag.RegisterHit(power, point, impulse) is what a real punch calls. It writes the hit to
// the synced model (so the bag swings for everyone), and when power beats the record it makes us the record holder
// and pays the record reward (LocalGameManager.RewardCash)
function bagObj() { var b = all9("PunchingBag")[0]; if (!b) notify("No punching bag here (it's in the lobby)"); return b || null; }
function bagModel(b) { try { var m = b.method("get_model").invoke(); return m && !m.isNull() ? m : null; } catch (e) { return null; } }
function bagPoint(b) { try { var rb = b.field("bag").value; if (uAlive(rb)) return ui.read3(rb.method("get_position").invoke()); } catch (e) { } return ui.read3(b.method("get_transform").invoke().method("get_position").invoke()); }
function bagRename(b) {
    if (!p.bagName) return;
    var m = bagModel(b); if (!m) return;
    m.method("set_recordHolderName").invoke(Il2Cpp.string(p.bagName));
    try { b.method("RefreshRecord").invoke(); } catch (e) { }
}
function bagHit(power, push, dir) {
    var b = bagObj(); if (!b) return;
    var pt = bagPoint(b), inst = currentPlayer(), from = inst ? playerPos(inst) : pt;
    var d = dir || [pt[0] - from[0], 0, pt[2] - from[2]], l = Math.hypot(d[0], d[1], d[2]) || 1;
    var imp = [d[0] / l * push, d[1] / l * push, d[2] / l * push];
    var before = bagModel(b) ? Number(bagModel(b).method("get_record").invoke()) : 0;
    b.method("RegisterHit").invoke(power, v3(pt), v3(imp));
    if (power > before) bagRename(b);
    return power > before;
}
function bagBeat() {
    var b = bagObj(); if (!b) return;
    var m = bagModel(b), rec = m ? Number(m.method("get_record").invoke()) : 0;
    if (bagHit(Math.floor(rec) + 1, 300)) notify("New bag record: " + (Math.floor(rec) + 1));
}
function bagSetRecord(v, name) {
    var b = bagObj(); if (!b) return;
    var m = bagModel(b); if (!m) { notify("Bag isn't synced yet"); return; }
    m.method("set_record").invoke(v);
    m.method("set_recordHolderID").invoke(v > 0 ? rtClientId() : -1);
    var nm = name !== undefined ? name : (p.bagName || (function () { try { return String(cls9("LobbyNet").method("get_LocalPlayerName").invoke().content); } catch (e) { return ""; } })());
    m.method("set_recordHolderName").invoke(Il2Cpp.string(nm));
    try { b.method("RefreshRecord").invoke(); } catch (e) { }
    notify(v > 0 ? "Bag record set to " + v : "Bag record reset");
}
function bagLaunch() { bagHit(1, p.bagLaunch, [0.2 * (Math.random() - 0.5), 1, 0.2 * (Math.random() - 0.5)]); notify("Bag launched"); }
function bagStep() {
    if (!every9("bagInfo", 1000)) return;
    var d = defOf("__bagInfo"), b = all9("PunchingBag")[0], m = b ? bagModel(b) : null;
    if (d) {
        if (!m) d.label = "Bag: not found yet (go near the punching bag in the lobby)";
        else { var nm = ""; try { nm = String(m.method("get_recordHolderName").invoke().content || ""); } catch (e) { }
            d.label = "Bag: record " + Number(m.method("get_record").invoke()).toFixed(0) + (nm ? " by " + nm : "") + ", " + Number(m.method("get_hitCount").invoke()) + " hits"; }
    }
    if (!m) return;
    if (p.bagAuto && every9("bagFarm", p.bagEvery * 1000)) { try { bagBeat(); } catch (e) { if (fail("bag farm", e)) p.bagAuto = false; } }
    if (p.bagChaos) { try { var a = Math.random() * Math.PI * 2; bagHit(1, 2500 + Math.random() * 3500, [Math.cos(a), 0.3 + Math.random() * 0.6, Math.sin(a)]); } catch (e) { if (fail("bag chaos", e)) p.bagChaos = false; } }
}
// copy our current face expression onto every settled clone's synced model
function cloneFaceStep(now) {
    var me = myNP(), mm = me ? npModel(me) : null;
    if (!mm) return;
    var e = Number(mget(mm, "get_expression"));
    clones.list.forEach(function (cl) {
        if (now - (cl.born || 0) < 600) return;
        var np = cloneNP(cl), m = np ? npModel(np) : null;
        if (m && Number(mget(m, "get_expression")) !== e) m.method("set_expression").invoke(e);
    });
}
function cloneSpawn() {
    var inst = needPlayer(); if (!inst) return;
    clones.wanted = true;
    var mgr = choose(nrsCls("Normal.Realtime.RealtimeAvatarManager"))[0];
    if (!mgr) { notify("Not in a room yet"); log("clones: no RealtimeAvatarManager found"); return; }
    var AV = nrsCls("Normal.Realtime.RealtimeAvatar");
    var LP = AV.nestedClasses.filter(function (k) { return k.name === "LocalPlayer"; })[0];   // nested classes can't be looked up by dotted name
    if (!LP) throw new Error("RealtimeAvatar.LocalPlayer not found");
    var prefab = mgr.method("get_localAvatarPrefab").invoke();
    clones.job = {
        inst: inst, mgr: mgr, AV: AV, LP: LP, GO: coreCls("UnityEngine.GameObject"),
        name: str(prefab.method("get_name").invoke()), realtime: cls9("SceneLoader").method("get_Realtime").invoke(),
        keepNP: inst.field("networkPlayer").value, keepAv: mgr.method("get_localAvatar").invoke(),
        c: playerPos(inst), made: 0, at: 0
    };
    clones.initHook = true; clones.seed = Math.floor(Math.random() * 1000);
    try { hooksStep(); lazyAt = 0; lazySync(); } catch (e) { log("clones: init hook: " + e); }
    notify("Spawning " + Math.max(0, p.cloneCount - clones.list.length) + " clone(s)...");
}
function cloneJobStep() {
    var j = clones.job;
    if (!j) return;
    var now = Date.now();
    if (now - j.at < 150) return;
    j.at = now;
    if (clones.list.length >= p.cloneCount || !uAlive(j.inst)) { cloneJobEnd(j, null); return; }
    var i = clones.list.length, st = "look", go = null, nodes = [];
    try {
        var pos = ringPos(j.c, i, p.cloneCount, p.cloneRadius), look = null;
        try { look = lookFor(i); } catch (e) { log("clones: look " + i + ": " + e); }
        st = "instantiate";
        go = nrCls("Normal.Realtime.Realtime").method("Instantiate", 7).overload("System.String", "UnityEngine.Vector3", "UnityEngine.Quaternion", "System.Boolean", "System.Boolean", "System.Boolean", "Normal.Realtime.Realtime").invoke(Il2Cpp.string(j.name), v3(pos), qIdent(), true, true, true, j.realtime);
        if (!uAlive(go)) throw new Error("Instantiate returned nothing");
        // the voice component would open the mic for this clone: kill it before anything else can fail
        st = "strip voice"; stripVoice(go);
        st = "restore real player";
        cloneRestoreReal(j);
        // the clone copies head and hands from a LocalPlayer object, so give it our own offset nodes
        st = "nodes";
        for (var k = 0; k < 4; k++) { var n = j.GO.alloc(); n.method(".ctor", 1).invoke(Il2Cpp.string("Clone" + i + "_" + k)); nodes.push(n.method("get_transform").invoke()); }
        st = "local player";
        var lp = j.LP.new();
        ["root", "head", "leftHand", "rightHand"].forEach(function (f, k) { lp.field(f).value = nodes[k]; });
        var av = comp9(go, j.AV);
        if (!uAlive(av)) throw new Error("no RealtimeAvatar on the clone");
        av.method("SetLocalPlayer").invoke(lp);
        var cl = { go: go, nodes: nodes, idx: i, look: look, np: null, born: Date.now(), lookUntil: Date.now() + 4500 };
        st = "apply look";
        cloneNP(cl);
        // the name must be in the first copy other players get; the rest follows once the clone is set up
        try { applyLook(cl, true, true); } catch (e) { log("clones: look " + i + ": " + e); }
        clones.list.push(cl);
        j.made++;
    } catch (err) {
        log("clones: spawn " + i + " failed at '" + st + "': " + err);
        // don't leave a half-built clone (with its mic) in the room
        try { if (uAlive(go)) nrCls("Normal.Realtime.Realtime").method("Destroy", 1).overload("UnityEngine.GameObject").invoke(go); } catch (e) { }
        var UO = coreCls("UnityEngine.Object");
        nodes.forEach(function (t) { try { UO.method("Destroy", 1).invoke(t.method("get_gameObject").invoke()); } catch (e) { } });
        cloneJobEnd(j, st + ": " + err);
    }
}
// the game grabs the newest avatar as "yours", so hand it back the real one after every spawn
function cloneRestoreReal(j) {
    try { if (uAlive(j.keepNP)) j.inst.field("networkPlayer").value = j.keepNP; } catch (e) { }
    try { if (uAlive(j.keepAv)) j.mgr.method("set_localAvatar").invoke(j.keepAv); } catch (e) { }
}
function cloneJobEnd(j, err) {
    clones.job = null;
    cloneRestoreReal(j);
    try { cloneStep(true); } catch (e) { }
    log("clones: prefab " + j.name + ", spawned " + j.made + (err ? ", stopped: " + err : ""));
    if (err) notify("Spawned " + j.made + " clone(s), then one failed (" + err + "). If the game acts up, restart it", 6);
    else notify("Spawned " + j.made + " clone rig(s)");
}
// ---- clone formations, hide-me and looks ----
var FORMS = ["Ring", "Orbit", "Line Behind", "Wall", "Cluster", "Tower", "Swarm", "Echo Trail"];
var cloneHist = [];      // recent target poses for Echo Trail: { t, p: [4][3], r: [4][4] }
function read4(q) { var h = q.handle; return [h.readFloat(), h.add(4).readFloat(), h.add(8).readFloat(), h.add(12).readFloat()]; }
function flatDir(t) { var f = ui.read3(t.method("get_forward").invoke()); f[1] = 0; var l = Math.hypot(f[0], f[2]) || 1; return [f[0] / l, 0, f[2] / l]; }
// offset of formation slot s out of n, around the target
function slotOffset(s, n, real, now) {
    var R = p.cloneRadius, m = p.cloneMode;
    if (m === "Line Behind") { var f = flatDir(real[1]); var k = (s + 1) * R * 0.6; return [-f[0] * k, 0, -f[2] * k]; }
    if (m === "Wall") { var f2 = flatDir(real[1]), rt = [f2[2], 0, -f2[0]], w = (s - (n - 1) / 2) * R * 0.6; return [rt[0] * w, 0, rt[2] * w]; }
    if (m === "Tower") return [0, (s + 1) * 1.7, 0];
    if (m === "Cluster") { var a1 = s * 2.399963, r1 = R * 0.35 * Math.sqrt((s + 1) / n); return [Math.cos(a1) * r1, 0, Math.sin(a1) * r1]; }
    var a = s / Math.max(1, n) * Math.PI * 2, rr = R;
    if (m === "Orbit") a += now / 1000 * p.cloneSpin * Math.PI / 180;
    if (m === "Swarm") { a += Math.sin(now / 900 + s * 1.7) * 0.6; rr = R * (0.7 + 0.3 * Math.sin(now / 700 + s * 2.3)); }
    return [Math.cos(a) * rr, m === "Swarm" ? 0.3 * Math.sin(now / 500 + s) : 0, Math.sin(a) * rr];
}
function cloneStep(force) {
    if (!clones.list.length) return;
    if (!force && !p.cloneFollow) return;
    // the heap scan is slow, so find our real head/hand nodes once and only re-check dead clones twice a second
    if (!clones.mgr || force) {
        clones.mgr = choose(nrsCls("Normal.Realtime.RealtimeAvatarManager"))[0] || null;
        if (!clones.mgr) return;
        clones.real = null;
    }
    if (!clones.real || clones.realFor !== p.cloneTarget || Date.now() - clones.realAt > 1000) {
        clones.real = targetNodes(); clones.realFor = p.cloneTarget; clones.realAt = Date.now();
    }
    var real = clones.real;
    if (!real) return;
    var now = Date.now();
    // Normcore sends poses ~20 times a second, so moving the clones faster than 30 Hz only costs frame time
    if (!force && now - (clones.stepAt || 0) < 33) return;
    clones.stepAt = now;
    if (now - clones.at > 500) {
        clones.at = now; clones.list = clones.list.filter(function (cl) { return alive9(cl.go); }); looksStep(now);
        if (p.cloneCopyFace) { try { cloneFaceStep(now); } catch (e) { fail("clone face", e); } }
        if (p.cloneAutoRespawn && clones.wanted && !clones.job && clones.list.length < p.cloneCount && now - (clones.respawnAt || 0) > 3000) {
            clones.respawnAt = now; log("clones: auto respawn (" + clones.list.length + " of " + p.cloneCount + " alive)"); cloneSpawn();
        }
    }
    for (var k0 = 0; k0 < 4; k0++) if (!uAlive(real[k0])) { clones.real = null; return; }
    var P = [], Q = [];
    for (var k = 0; k < 4; k++) { P.push(ui.read3(real[k].method("get_position").invoke())); Q.push(read4(real[k].method("get_rotation").invoke())); }
    var echo = p.cloneMode === "Echo Trail";
    if (echo) { cloneHist.push({ t: now, p: P, r: Q }); while (cloneHist.length && now - cloneHist[0].t > 6000) cloneHist.shift(); }
    else if (cloneHist.length) cloneHist = [];
    // Hide Me: we take one slot of n+1, the formation is centred so our slot lands on us, and the clones fill the rest
    var hide = p.cloneHideMe && p.cloneTarget === "Me" && !echo, n = clones.list.length + (hide ? 1 : 0);
    if (hide && p.cloneShuffle > 0 && now - (clones.shuffleAt || 0) > p.cloneShuffle * 1000) { clones.shuffleAt = now; clones.mySlot = Math.floor(Math.random() * n); }
    var mine = hide ? Math.min(clones.mySlot || 0, n - 1) : -1;
    var base = hide ? slotOffset(mine, n, real, now) : [0, 0, 0];
    for (var i = 0; i < clones.list.length; i++) {
        var cl = clones.list[i], pp = P, qq = Q, d;
        if (echo) {
            var want = now - (i + 1) * p.cloneDelay * 1000, h = null;
            for (var j = cloneHist.length - 1; j >= 0; j--) if (cloneHist[j].t <= want) { h = cloneHist[j]; break; }
            if (h) { pp = h.p; qq = h.r; }
            d = [0, 0, 0];
        } else {
            var s = hide ? (i >= mine ? i + 1 : i) : i, o = slotOffset(s, n, real, now);
            d = [o[0] - base[0], o[1] - base[1], o[2] - base[2]];
        }
        var pos = [0, 1, 2, 3].map(function (k) { return [pp[k][0] + d[0], pp[k][1] + d[1], pp[k][2] + d[2]]; }), rot = qq.slice();
        if (p.cloneAnim !== "None") { try { cloneAnimate(pos, rot, now, i); } catch (e) { fail("clone animation", e); } }
        for (var k2 = 0; k2 < 4; k2++) {
            cl.nodes[k2].method("set_position").invoke(v3(pos[k2]));
            cl.nodes[k2].method("set_rotation").invoke(rot[k2]);
        }
    }
}
// ---- clone animations: offsets on the head / hand nodes each clone copies from (0 root, 1 head, 2 left, 3 right)
function qmul(a, b) {
    return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
        a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
}
function qrot(q, v) {   // rotate vector v by quaternion q ([x, y, z, w])
    var u = [q[0], q[1], q[2]], s = q[3];
    var dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2], uu = u[0] * u[0] + u[1] * u[1] + u[2] * u[2];
    var cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    return [0, 1, 2].map(function (k) { return 2 * dot * u[k] + (s * s - uu) * v[k] + 2 * s * cr[k]; });
}
function axisQ(ax, a) { var h = a / 2, sn = Math.sin(h); return [ax[0] * sn, ax[1] * sn, ax[2] * sn, Math.cos(h)]; }
function cloneAnimate(pos, rot, now, i) {
    var t = now / 1000 * p.cloneAnimSpeed + (p.cloneAnimSync ? 0 : i * 0.37), head = pos[1];
    var f = qrot(rot[1], [0, 0, 1]); f[1] = 0; var fl = Math.hypot(f[0], f[2]) || 1; f = [f[0] / fl, 0, f[2] / fl];
    var r = [f[2], 0, -f[0]];
    function at(o) { return [head[0] + r[0] * o[0] + f[0] * o[2], head[1] + o[1], head[2] + r[2] * o[0] + f[2] * o[2]]; }   // offset in the clone's own right / up / forward
    function shift(dx, dy, dz) { for (var k = 0; k < 4; k++) { pos[k] = [pos[k][0] + r[0] * dx + f[0] * dz, pos[k][1] + dy, pos[k][2] + r[2] * dx + f[2] * dz]; } }
    var S = Math.sin;
    switch (p.cloneAnim) {
        case "Wave": pos[3] = at([0.3 + 0.1 * S(t * 9), 0.12, 0.1]); break;
        case "Dance": {
            shift(0.07 * S(t * 3.5), 0.05 * Math.abs(S(t * 7)), 0); head = pos[1];
            pos[2] = at([-0.26, -0.25 + 0.5 * Math.max(0, S(t * 3.5)), 0.12]);
            pos[3] = at([0.26, -0.25 + 0.5 * Math.max(0, -S(t * 3.5)), 0.12]);
            break;
        }
        case "Jumping Jacks": {
            var ph = (S(t * 5) + 1) / 2;
            shift(0, 0.14 * ph, 0); head = pos[1];
            pos[2] = at([-(0.25 + 0.25 * ph), -0.5 + 0.8 * ph, 0]); pos[3] = at([0.25 + 0.25 * ph, -0.5 + 0.8 * ph, 0]);
            break;
        }
        case "Flap": { var fp = S(t * 10); pos[2] = at([-0.55, -0.15 + 0.22 * fp, 0]); pos[3] = at([0.55, -0.15 + 0.22 * fp, 0]); break; }
        case "Spin": {
            var a = t * 3, yq = axisQ([0, 1, 0], a);
            for (var k = 0; k < 4; k++) {
                var o = [pos[k][0] - head[0], pos[k][1] - head[1], pos[k][2] - head[2]], ro = qrot(yq, o);
                pos[k] = [head[0] + ro[0], head[1] + ro[1], head[2] + ro[2]];
                rot[k] = qmul(yq, rot[k]);
            }
            break;
        }
        case "Headbang": {
            var nod = 0.55 * Math.max(0, S(t * 12));
            rot[1] = qmul(rot[1], axisQ([1, 0, 0], nod)); pos[1] = [head[0] + f[0] * 0.06 * nod, head[1] - 0.06 * nod, head[2] + f[2] * 0.06 * nod];
            break;
        }
        case "Zombie": { var sw = 0.04 * S(t * 2); pos[2] = at([-0.18, -0.12 + sw, 0.55]); pos[3] = at([0.18, -0.12 - sw, 0.55]); shift(0.05 * S(t * 1.3), 0, 0); break; }
    }
}

// looks: avatar skin / colour / hat / face / level / name, written onto each clone's own synced player model
function npModel(np) {
    try { var g = np.method("get_model").invoke(); if (g && !g.isNull()) return g; } catch (e) { }
    var fs = ["<model>k__BackingField", "model", "_model"];
    for (var i = 0; i < fs.length; i++) { try { var m = np.field(fs[i]).value; if (m && !m.isNull()) return m; } catch (e) { } }
    return null;
}
function mget(m, n) { try { return m.method(n).invoke(); } catch (e) { return null; } }
function lookOf(np) {
    var m = np ? npModel(np) : null;
    if (!m) return null;
    var nm = mget(m, "get_playerName"), hat = mget(m, "get_hat");
    return {
        name: nm ? str(nm) : "", skin: mget(m, "get_skin"), hat: hat ? str(hat) : "",
        ik: mget(m, "get_ikSkinIndex"), expr: mget(m, "get_expression"), level: mget(m, "get_level"), prestige: mget(m, "get_prestige")
    };
}
function hsv(h, s, v) {
    var i = Math.floor(h * 6), f = h * 6 - i, p0 = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    return [[v, t, p0], [q, v, p0], [p0, v, t], [p0, q, v], [t, p0, v], [v, p0, q]][i % 6];
}
function randomLook(mine) {
    var me = myNP(), m = me ? npModel(me) : null, look = {};
    for (var k in mine) look[k] = mine[k];
    try { var n = me.field("IKPrefabs").value.length; if (n > 0) look.ik = Math.floor(Math.random() * n); } catch (e) { }
    try {   // a fresh Color struct from the game, then overwrite its r g b a
        var c = m.method("get_skin").invoke(), rgb = hsv(Math.random(), 0.5 + Math.random() * 0.5, 0.6 + Math.random() * 0.4);
        c.handle.writeFloat(rgb[0]); c.handle.add(4).writeFloat(rgb[1]); c.handle.add(8).writeFloat(rgb[2]); c.handle.add(12).writeFloat(1);
        look.skin = c;
    } catch (e) { }
    try { var fd = defOf("myFace"), nf = fd ? fd.options.length - 1 : 0; if (nf > 0) look.expr = Math.floor(Math.random() * nf); } catch (e) { }   // face names the faces menu read from the game
    return look;
}
var RAND_NAMES = ["Jaxon", "Milo", "ShadowFox", "Bean", "Ozzy", "Kai", "PixelPunch", "Nova", "Tater", "Ricky", "Zed", "Luna",
    "Bonk", "Leo", "Wren", "Gizmo", "Ash", "Toast", "Remy", "Juno", "Dex", "Pip", "Frosty", "Nico", "Sable", "Biscuit",
    "Rex", "Echo", "Waffles", "Finn", "Indie", "Quinn", "Moose", "Skye", "Taco", "Rowan", "Sprout", "Cosmo", "Blaze", "Pebble"];
function nameList() { return String(p.cloneName || "").split(/[,;\n]/).map(function (x) { return x.trim(); }).filter(Boolean); }
function nameFor(i, base) {
    var mode = p.cloneNames, list = nameList();
    if (p.cloneLook === "Custom Name") mode = "Custom List";   // setting saved by the old version
    if (mode === "Custom List") return list.length ? list[i % list.length] : base;
    if (mode === "Numbered") return (list[0] || base || "Buddy") + " " + (i + 1);
    if (mode === "Random") {
        var r = RAND_NAMES[((clones.seed || 0) + i * 7) % RAND_NAMES.length];
        return i >= RAND_NAMES.length ? r + (i + 1) : r;
    }
    return base;
}
function lookFor(i) {
    var mine = lookOf(myNP()), L = p.cloneLook, look = null;
    if (L === "Followed Player" && p.cloneTarget !== "Me") look = lookOf(otherNPs()[parseInt(p.cloneTarget.slice(5), 10) - 1]);
    else if (L === "Each Other Player") { var o = otherNPs(); if (o.length) look = lookOf(o[i % o.length]); }
    else if (L === "Random Skins" && mine) look = randomLook(mine);
    if (!look) look = mine;
    if (!look) return null;
    look.name = nameFor(i, look.name);
    return look;
}
// writes only the fields that differ, so re-applying doesn't spam the network or rebuild the avatar
// dataOnly: just name / level / prestige (plain synced values, no game code runs when they change). Skin, hat, avatar
// and face trigger the game's own rebuild code, which crashed (null access inside Instantiate) on a clone that wasn't
// finished setting up yet, so those wait until the clone is ~0.5 s old (looksStep)
function applyLookNP(np, look, withName, dataOnly) {
    var m = npModel(np);
    if (!m) return false;
    try {
        if (withName && look.name && str(mget(m, "get_playerName")) !== look.name) m.method("set_playerName").invoke(Il2Cpp.string(look.name));
        if (!dataOnly && look.skin) m.method("set_skin").invoke(look.skin);
        if (!dataOnly && look.hat !== null && look.hat !== undefined && str(mget(m, "get_hat")) !== look.hat) m.method("set_hat").invoke(Il2Cpp.string(look.hat));
        (dataOnly ? [["level", "Level"], ["prestige", "Prestige"]] : [["ik", "IkSkinIndex"], ["expr", "Expression"], ["level", "Level"], ["prestige", "Prestige"]]).forEach(function (f) {
            var v = look[f[0]], key = f[1].charAt(0).toLowerCase() + f[1].slice(1);
            if (v === null || v === undefined) return;
            try { if (Number(mget(m, "get_" + key)) !== Number(v)) m.method("set_" + key).invoke(Number(v)); } catch (e) { }
        });
        try { var t = np.field("playerNameText").value; if (uAlive(t)) { t.method("set_richText").invoke(true); t.method("set_text").invoke(Il2Cpp.string(look.name)); } } catch (e) { }
        return true;
    } catch (e) { fail("clone look", e); return false; }
}
function cloneNP(cl) {
    if (cl.np && uAlive(cl.np)) return cl.np;
    // only the (Type, bool) overload exists in this build: the 1-argument one is the generic <T>(bool), which silently failed
    try { var np = cl.go.method("GetComponentInChildren", 2).overload("System.Type", "System.Boolean").invoke(cls9("NetworkPlayer").type.object, true); if (uAlive(np)) return (cl.np = np); }
    catch (e) { if (!clones.npErr) { clones.npErr = true; log("clones: NetworkPlayer lookup: " + e); } }
    // fallback: a body we own that isn't our real player and isn't claimed by another clone
    try {
        var mine = myNP(), me = rtClientId(), list = cls9("NetworkPlayer").field("allPlayersInternal").value;
        var n = list.method("get_Count").invoke();
        for (var i = 0; i < n; i++) {
            var c = list.method("get_Item").invoke(i);
            if (!uAlive(c) || (mine && c.handle.equals(mine.handle)) || npOwner(c) !== me) continue;
            var taken = clones.list.some(function (o) { return o !== cl && o.np && o.np.handle.equals(c.handle); });
            if (!taken) { if (!clones.npFallbackLogged) { clones.npFallbackLogged = true; log("clones: NetworkPlayer isn't under the avatar object, matched by owner instead"); } return (cl.np = c); }
        }
    } catch (e) { }
    return null;
}
function applyLook(cl, withName, dataOnly) {
    if (!cl.look) return false;
    var np = cloneNP(cl);
    return np ? applyLookNP(np, cl.look, withName, dataOnly) : false;
}
// called right after the game's NetworkPlayer.InitializePlayer, which just overwrote the body with our saved look
function cloneInit(np) {
    var mine = myNP();
    if (mine && np.handle.equals(mine.handle)) return;
    // no game calls in here (we're inside the game's own setup): just have looksStep put the look back shortly
    for (var i = 0; i < clones.list.length; i++) { var c = clones.list[i]; if (c.np && c.np.handle.equals(np.handle)) { c.lookUntil = Date.now() + 4000; break; } }
}
// bodies you own are put on the hidden layer for your own camera (HideAll). ShowAll puts a clone's skin model back on the
// normal layer; the body mesh and hat are re-hidden by the game every frame, so cloneShowFrame handles those
var showSet = {}, GO_layer = null, GO_active = null;
function showClone(cl) {
    var np = cloneNP(cl); if (!np) return;
    try { np.method(p.cloneShowMe ? "ShowAll" : "HideAll").invoke(); } catch (e) { }
    if (cl.show) return;
    try {
        var body = np.field("bodyRenderer").value, hat = np.field("hatTransform").value, hb = np.field("healthBar").value;
        cl.show = {
            body: uAlive(body) ? body.method("get_gameObject").invoke() : null,
            hat: uAlive(hat) ? hat.method("get_gameObject").invoke() : null,
            bar: uAlive(hb) ? hb : null
        };
        showSet[np.handle.toString()] = cl.show;
    } catch (e) { log("clones: show setup: " + e); }
}
function cloneShowFrame(self) {
    var e = showSet[self.handle.toString()];
    if (!e) return;
    if (!GO_layer) { var G = coreCls("UnityEngine.GameObject"); GO_layer = G.method("set_layer"); GO_active = G.method("SetActive"); }
    if (e.body && uAlive(e.body)) GO_layer.bind(e.body).invoke(8);    // 8 = the layer remote players' bodies use
    if (e.hat && uAlive(e.hat)) GO_active.bind(e.hat).invoke(true);
    if (e.bar && uAlive(e.bar)) GO_active.bind(e.bar).invoke(true);
}
// the clone's own setup can reset its look right after spawning, so keep re-applying for a few seconds.
// a new avatar skin rebuilds the body on the hidden layer, so keep showing them too
function looksStep(now) {
    var vis = now - (clones.visAt || 0) > 2000;
    if (vis) clones.visAt = now;
    clones.list.forEach(function (cl) {
        var ready = now - (cl.born || 0) > 500, fresh = cl.look && now < cl.lookUntil;
        if (!ready) return;
        if (fresh) applyLook(cl, true);
        if (fresh || vis) showClone(cl);
        if (!fresh && !cl.lookLogged) { cl.lookLogged = true; try { lookReport(cl); } catch (e) { log("clones: look report " + cl.idx + ": " + e); } }
    });
}
// one line per clone once its look has settled: what we asked for vs what the game's synced model holds
function lookReport(cl) {
    var w = cl.look, np = cloneNP(cl), m = np ? npModel(np) : null;
    if (!w) { log("clones: #" + cl.idx + " has no look (lookFor returned nothing, cloneLook=" + p.cloneLook + ")"); return; }
    if (!np) { log("clones: #" + cl.idx + " no NetworkPlayer found on the clone"); return; }
    if (!m) { log("clones: #" + cl.idx + " NetworkPlayer has no model (get_model / backing field both failed)"); return; }
    var has = lookOf(np);
    function f(l) { return "name=" + JSON.stringify(l.name) + " hat=" + JSON.stringify(l.hat) + " ik=" + l.ik + " face=" + l.expr + " lvl=" + l.level; }
    log("clones: #" + cl.idx + " wanted " + f(w) + " | model has " + f(has) + " | look=" + p.cloneLook + " names=" + p.cloneNames);
}
function reapplyLooks() {
    var n = 0;
    clones.list.forEach(function (cl) { cl.lookLogged = false; });
    clones.seed = Math.floor(Math.random() * 1000);
    clones.list.forEach(function (cl, i) { cl.look = lookFor(i); cl.lookUntil = Date.now() + 4000; if (applyLook(cl, true)) n++; showClone(cl); });
    notify("Looks applied to " + n + " clone(s). Skins / hats show for everyone now, new names need Respawn Clones", 4);
}
function clonesClear() {
    var R = nrCls("Normal.Realtime.Realtime"), UO = coreCls("UnityEngine.Object"), n = 0;
    clones.list.forEach(function (cl) {
        try { if (alive9(cl.go)) { R.method("Destroy", 1).overload("UnityEngine.GameObject").invoke(cl.go); n++; } } catch (e) { }
        cl.nodes.forEach(function (t) { try { UO.method("Destroy", 1).invoke(t.method("get_gameObject").invoke()); } catch (e) { } });
    });
    showSet = {}; clones.wanted = false;
    clones.list = []; clones.real = null; clones.mgr = null; cloneHist = []; clones.initHook = false; clones.pending = null; clones.job = null;
    notify("Removed " + n + " clone rig(s)");
}

// ---- v9.2: kill feed, room codes, wheel fate, buddy states, soccer, lobby boundary, reload / fuse, SP upgrades ----
var b11 = { feed: null, wheel: null, bound: {}, reload: {}, fuse: {} };
function pname(id) { try { return String(cls9("LobbyNet").method("PlayerName").invoke(id).content) || ("#" + id); } catch (e) { return "#" + id; } }
function myClientId() { try { return Number(cls9("LobbyNet").method("get_LocalClientId").invoke()); } catch (e) { return -1; } }

// kill feed: passive hook on GameSync.AddDeath(id, inflictor)
function feedStep() {
    if (!p.killFeed || b11.feed) return;
    var m = cls9("GameSync").method("AddDeath");
    b11.feed = Interceptor.attach(m.virtualAddress, {
        onEnter: function (args) {
            if (!p.killFeed) return;
            try {
                var id = args[1].toInt32(), by = args[2].toInt32(), me = myClientId();
                var who = id === me ? "YOU" : pname(id), killer = by < 0 || by === id ? "" : (by === me ? "You" : pname(by));
                notify(killer ? killer + " killed " + who : who + " died", 3, id === me ? "warn" : "info", "Kill feed");
            } catch (e) { }
        },
    });
    log("v9.2: kill feed hooked");
}

// room codes
function joinCode() {
    if (!p.roomCode) { notify("Type a room code first"); return; }
    cls9("SceneLoader").field("Instance").value.method("JoinPrivateRoom").invoke(Il2Cpp.string(p.roomCode));
    notify("Joining " + p.roomCode);
}
function leaveCode() { cls9("SceneLoader").field("Instance").value.method("LeavePrivateRoom").invoke(); }

// wheel of misfortune: force the fate the wheel picks
var FATES = ["Taze", "Freeze", "Burn", "Launch", "Behead", "Kaboom", "Jackpot", "MegaLaunch"];
function wheelStep() {
    if (p.wheelFate === "Random" || b11.wheel) return;
    var m = cls9("WheelOfMisfortune").method("ChoosePayload");
    b11.wheel = Interceptor.attach(m.virtualAddress, {
        onLeave: function (ret) { var i = FATES.indexOf(p.wheelFate); if (i >= 0) ret.replace(ptr(i)); },
    });
    log("v9.2: wheel fate hooked");
}

// buddy states: the game's own networked ragdoll state call, for every buddy in the room
function buddyState(all) {
    var sync = cls9("PlayerInfoSync").field("instance").value;
    if (!sync || sync.isNull()) { notify("Not in a room"); return; }
    var ids = [];
    if (all) {
        var mgr = choose(cls9("RealtimeRagdollManager"))[0];
        if (!mgr) { notify("No ragdoll manager here"); return; }
        var keys = mgr.method("get_avatars").invoke().method("get_Keys").invoke().method("GetEnumerator").invoke();
        while (keys.method("MoveNext").invoke()) ids.push(Number(keys.method("get_Current").invoke()));
    } else ids.push(myClientId());
    ids.forEach(function (id) { sync.method("AddRagdollState").invoke(p.buddyStateId, id, true); });
    log("v9.2: ragdoll state " + p.buddyStateId + " sent to " + ids.length + " buddy(s): " + ids.join(","));
    notify("State " + p.buddyStateId + " sent to " + ids.length + " buddy(s)");
}

// soccer
function scoreGoal(team) {
    var m = all9("SoccerMatch")[0];
    if (!m) { notify("No soccer match here"); return; }
    m.method("RegisterGoal").invoke(team);
}

// lobby boundary: push every radius out of the way, put the originals back when off
var BOUND_F = ["softR0", "softR1", "clampR", "clampToR", "dampR", "ceilSoft0", "ceilSoft1", "ceilClamp", "ceilClampTo"];
function boundaryStep() {
    if (p.noBoundary) {
        if (!every9("bound", 2000)) return;
        all9("LobbyBoundary").forEach(function (b) {
            var k = b.handle.toString();
            if (!b11.bound[k]) { var o = { b: b, f: {} }; BOUND_F.forEach(function (f) { try { o.f[f] = Number(b.field(f).value); } catch (e) { } }); b11.bound[k] = o; }
            for (var f in b11.bound[k].f) { try { b.field(f).value = 100000.0; } catch (e) { } }
        });
        all9("LobbyFallGuard").forEach(function (g) { try { g.field("fallDepth").value = 100000.0; } catch (e) { } });
    } else if (Object.keys(b11.bound).length) {
        for (var k in b11.bound) { var o = b11.bound[k]; for (var f in o.f) { try { o.b.field(f).value = o.f[f]; } catch (e) { } } }
        b11.bound = {};
    }
}

// instant reload (WeaponInfo.ReloadTime) and instant grenades (waitTime), originals restored when off
function reloadStep() {
    if (p.instantReload) {
        if (!every9("reload", 1000)) return;
        choose(GrabableCls).forEach(function (g) {
            var w = weaponInfoOf(g); if (!w) return;
            var k = w.handle.toString();
            if (b11.reload[k] === undefined) b11.reload[k] = { w: w, v: Number(w.field("ReloadTime").value) };
            w.field("ReloadTime").value = 0.0;
        });
    } else if (Object.keys(b11.reload).length) {
        for (var k in b11.reload) { try { b11.reload[k].w.field("ReloadTime").value = b11.reload[k].v; } catch (e) { } }
        b11.reload = {};
    }
    if (p.instantFuse && every9("fuse", 1000)) {
        ["Grenade", "StickyGrenade", "HitGrenade"].forEach(function (c) { all9(c).forEach(function (g) { try { g.field("waitTime").value = 0.05; } catch (e) { } }); });
    }
}

// skill-point upgrades: every upgrade to its max tier
function maxSP() {
    var sp = cls9("SPManager").field("instance").value;
    if (!sp || sp.isNull()) { notify("SP manager not ready"); return; }
    var defs = cls9("SPManager").field("AllUpgrades").value, dict = sp.field("purchases").value, n = defs.method("get_Count").invoke(), done = [];
    for (var i = 0; i < n; i++) {
        var key = defs.method("get_Item").invoke(i).field("Key").value, max = sp.method("GetMaxTier").invoke(key);
        dict.method("set_Item").invoke(key, max);
        done.push(str(key) + "=" + max);
    }
    try { cls9("SPManager").field("onPurchaseChanged").value.method("Invoke").invoke(); } catch (e) { }
    log("v9.2: SP upgrades maxed: " + done.join(", "));
    notify("Maxed " + n + " upgrades");
}

function b11Frame() {
    try { feedStep(); } catch (e) { fail("killFeed", e); }
    try { wheelStep(); } catch (e) { fail("wheelFate", e); }
    try { boundaryStep(); } catch (e) { fail("boundary", e); }
    try { reloadStep(); } catch (e) { fail("reload", e); }
}
function b11Clear() {
    p.noBoundary = false; p.instantReload = false; p.instantFuse = false;
    try { boundaryStep(); reloadStep(); } catch (e) { }
}

// ---- mic soundboard: mix WAV samples into Normcore's outgoing voice ----
// RealtimeAvatarVoice.GetMicrophoneAudioData(float[] frame) fills a frame from the mic, then SendMicrophoneData encodes it.
// A passive hook adds our samples to the frame after the game fills it, so it goes out as your voice.
var mic = { hook: null, pcm: null, rate: 24000, cur: 0, outRate: 48000, outCh: 1, files: [] };
function micRefresh() {
    try { if (typeof globalThis.__RASP_SOUNDBOARD_RELOAD === "function") globalThis.__RASP_SOUNDBOARD_RELOAD(); } catch (e) { }
    var sb = globalThis.__RASP_SOUNDBOARD, d = defOf("micSound");
    mic.files = sb && sb.sounds ? sb.sounds : [];
    if (!mic.files.length) { notify("No sounds. Put files in Mods/sounds and relaunch with vrfrida"); return; }
    d.options.length = 0; mic.files.forEach(function (f) { d.options.push(f.label); });
    notify(mic.files.length + " sound files");
}
function wavToFloat(b) {
    var dv = new DataView(b.buffer, b.byteOffset, b.byteLength), off = 12, fmt = 1, ch = 1, rate = 24000, bits = 16, data = null;
    while (off + 8 <= b.length) {
        var id = String.fromCharCode(b[off], b[off + 1], b[off + 2], b[off + 3]), sz = dv.getUint32(off + 4, true);
        if (id === "fmt ") { fmt = dv.getUint16(off + 8, true); ch = dv.getUint16(off + 10, true); rate = dv.getUint32(off + 12, true); bits = dv.getUint16(off + 22, true); }
        else if (id === "data") { data = [off + 8, Math.min(sz, b.length - off - 8)]; break; }
        off += 8 + sz + (sz & 1);
    }
    if (!data) throw new Error("no data chunk");
    var bps = bits / 8, frames = Math.floor(data[1] / (bps * ch)), out = new Float32Array(frames);
    for (var i = 0; i < frames; i++) {
        var acc = 0;
        for (var c = 0; c < ch; c++) {
            var o = data[0] + (i * ch + c) * bps;
            acc += fmt === 3 ? dv.getFloat32(o, true) : bits === 16 ? dv.getInt16(o, true) / 32768 : bits === 8 ? (b[o] - 128) / 128 : dv.getInt32(o, true) / 2147483648;
        }
        out[i] = acc / ch;
    }
    return { pcm: out, rate: rate };
}
function micHookOn() {
    if (mic.hook) return;
    var m = nrsCls("Normal.Realtime.RealtimeAvatarVoice").method("GetMicrophoneAudioData");
    mic.hook = Interceptor.attach(m.virtualAddress, {
        onEnter: function (args) { this.self = args[0]; this.arr = args[1]; },
        onLeave: function (ret) {
            if (!mic.pcm || (ret.toInt32() & 0xff) === 0 || this.arr.isNull()) return;
            try {
                var n = this.arr.add(0x18).readU32(), data = this.arr.add(0x20);
                var self = new Il2Cpp.Object(this.self);
                var outRate = Number(self.field("_microphoneSampleRate").value) || 48000, ch = Number(self.field("_microphoneChannels").value) || 1;
                var buf = new Float32Array(data.readByteArray(n * 4)), step = mic.rate / outRate, src = mic.pcm, vol = p.micVol;
                for (var i = 0; i < n; i += ch) {
                    var pos = mic.cur, k = Math.floor(pos), s0 = 0;
                    if (k < src.length - 1) { var t = pos - k; s0 = src[k] * (1 - t) + src[k + 1] * t; }
                    else if (k < src.length) s0 = src[k];
                    for (var c = 0; c < ch; c++) {
                        var v = (p.micMuteReal ? 0 : buf[i + c]) + s0 * vol;
                        buf[i + c] = v > 1 ? 1 : v < -1 ? -1 : v;
                    }
                    mic.cur += step;
                }
                data.writeByteArray(buf.buffer);
                if (mic.cur >= src.length) { if (p.micLoop) mic.cur = 0; else mic.pcm = null; }
            } catch (e) { mic.pcm = null; log("mic: mix failed: " + e); }
        },
    });
    log("mic: hooked RealtimeAvatarVoice.GetMicrophoneAudioData");
}
// local copy: a 2D AudioSource playing an AudioClip built from the same samples (voice chat never plays you back to yourself)
var local = { go: null, src: null };
function audioCls(n) { return Il2Cpp.domain.assembly("UnityEngine.AudioModule").image.class(n); }
function localPlay(pcm, rate) {
    var AC = audioCls("UnityEngine.AudioClip");
    // this build only kept the 6 and 7 argument overloads, the 5 argument one was stripped
    var create = AC.methods.filter(function (m) { return m.name === "Create" && m.parameters.length === 6; })[0];
    var setData = AC.methods.filter(function (m) { return m.name === "SetData" && m.parameters.length === 2 && m.parameters[0].type.name === "System.Single[]"; })[0];
    if (!create || !setData) throw new Error("AudioClip.Create / SetData overload not found");
    var clip = create.invoke(Il2Cpp.string("bb_mic_local"), pcm.length, 1, rate, false, NULL);
    var arr = Il2Cpp.array(Il2Cpp.corlib.class("System.Single"), pcm.length);
    arr.handle.add(0x20).writeByteArray(pcm.buffer);
    setData.bind(clip).invoke(arr, 0);
    if (!local.src || local.src.isNull()) {
        var GO = coreCls("UnityEngine.GameObject");
        local.go = GO.alloc(); local.go.method(".ctor", 1).invoke(Il2Cpp.string("bb_mic_local"));
        local.src = local.go.method("AddComponent", 1).invoke(audioCls("UnityEngine.AudioSource").type.object);
    }
    local.src.method("Stop", 0).invoke();
    local.src.method("set_clip").invoke(clip);
    local.src.method("set_loop").invoke(!!p.micLoop);
    local.src.method("set_volume").invoke(Math.min(1, p.micVol));
    local.src.method("Play", 0).invoke();
}
function localStop() { try { if (local.src && !local.src.isNull()) local.src.method("Stop", 0).invoke(); } catch (e) { } }
function micPlay() {
    var f = mic.files[defOf("micSound").options.indexOf(p.micSound)];
    if (!f) { notify("Press Reload Sound Files first"); return; }
    var bytes = globalThis.__RASP_SOUNDBOARD_READ(f.fileName);
    if (!bytes) throw new Error("could not read " + f.fileName);
    var w = wavToFloat(bytes);
    micHookOn();
    mic.rate = w.rate; mic.cur = 0; mic.pcm = w.pcm;
    if (p.micHear) { try { localPlay(w.pcm, w.rate); } catch (e) { log("mic: local playback failed: " + e); } }
    log("mic: playing " + f.fileName + " (" + (w.pcm.length / w.rate).toFixed(1) + "s at " + w.rate + " Hz)");
}

// ---- soundboard: LobbyNet.PlayForEveryone(resourcePath, position) with the Megaphone's own sound names ----
var snd = { at: 0 };
function refreshSounds() {
    var d = defOf("soundSel"), seen = {}, names = [];
    chooseHeap(cls9("Megaphone")).forEach(function (m) {
        var arr = m.field("clips").value;
        for (var i = 0; arr && !arr.isNull() && i < arr.length; i++) { var n = str(arr.get(i)); if (n && !seen[n]) { seen[n] = 1; names.push(n); } }
    });
    if (!names.length) { notify("No Megaphone loaded, spawn one and press again"); return; }
    d.options.length = 0; names.forEach(function (n) { d.options.push(n); });
    log("sounds: " + names.join(", "));
    notify(names.length + " sounds listed");
}
function soundSpots() {
    if (p.soundFrom === "Every Clone" && clones.list.length) return clones.list.map(function (cl) { return ui.read3(cl.nodes[1].method("get_position").invoke()); });
    if (p.soundFrom === "Followed Player" && clones.real && p.cloneTarget !== "Me") return [ui.read3(clones.real[1].method("get_position").invoke())];
    var i = currentPlayer(); return i ? [playerPos(i)] : [];
}
function playSound() {
    if (defOf("soundSel").options.indexOf(p.soundSel) < 0 || p.soundSel === "(refresh first)") { notify("Press Refresh Sound List first"); return; }
    var spots = soundSpots(), m = cls9("LobbyNet").method("PlayForEveryone");
    spots.forEach(function (pos) { m.invoke(Il2Cpp.string(p.soundSel), v3(pos)); });
}
function soundStep() {
    if (!p.soundLoop || Date.now() - snd.at < p.soundEvery * 1000) return;
    snd.at = Date.now();
    try { playSound(); } catch (e) { if (fail("soundLoop", e)) p.soundLoop = false; }
}

function v9Frame() {
    step("soundboard loop"); soundStep();
    step("kill feed / wheel / boundary / reload"); b11Frame();
    step("bulk spawner"); try { bulkStep(); } catch (e) { fail("bulkAuto", e); }
    step("clone spawning"); try { cloneJobStep(); } catch (e) { log("clones: " + e); clones.job = null; }
    step("clones"); try { cloneStep(false); } catch (e) { fail("clones", e); }
    step("punching bag"); try { bagStep(); } catch (e) { fail("bag", e); }
    step("hook manager"); try { hooksStep(); } catch (e) { fail("v9hooks", e); }
    step("powers"); try { powersStep(); } catch (e) { fail("powers", e); }
    step("vehicles"); try { vehiclesStep(); } catch (e) { fail("vehicles", e); }
    step("lobby farm / reward pads"); try { buddyFarmStep(); rewardStep(); } catch (e) { fail("lobby", e); }
    step("faces / jump / sprint");
    if (every9("face", 2000)) { try { faceStep(); } catch (e) { } }
    var inst = currentPlayer();
    if (inst) { try { playerStep9(inst); } catch (e) { if (fail("player9", e)) { p.infJump = false; p.alwaysSprint = false; } } }
}
function v9Clear() {
    try { b11Clear(); } catch (e) { }
    p.bulkAuto = false;
    try { if (clones.list.length) clonesClear(); } catch (e) { }
    p.bagAuto = false; p.bagChaos = false;
    p.instantRespawn = false; p.keepVehicles = false; p.noNpcLimit = false; p.ignoreMe = false;
    p.carTune = false; try { carTuneStep(); } catch (e) { }
    OP_STATS.forEach(function (o) { p[o[0]] = false; });
    p.laserInf = false; p.vehSpeed = false; p.buddyFarm = false; p.noRewardCd = false; p.infJump = false; p.alwaysSprint = false;
    try { powersClear(); } catch (e) { }
    try { vehiclesClear(); } catch (e) { }
}

// ---------------------------------------------------------------- per frame

function engineFrame() {
    ST.frameAt = Date.now();
    step("lazySync"); lazySync();
    step("esp"); espFrame();
    if (!PlayerMP) return;
    step("extras (rain / vacuum / camera / score lock)"); extrasFrame();
    v9Frame();
    step("player stats / fly");

    // enemies just unfrozen: keep telling their agents to move for a few seconds
    if (prevFreeze && !p.freezeEnemies) unfreezeUntil = Date.now() + 4000;
    prevFreeze = p.freezeEnemies;

    // put weapon values back once both weapon toggles are off
    if (!p.rapidFire && !p.bigDamage && !p.noRecoil && Object.keys(savedWeapons).length) restoreWeapons();

    if ((p.unlockAll || iapOrig !== null) && ++iapTick % 20 === 0) syncIap();

    var idle = !p.god && !p.speed && !p.noclip && !noclipApplied && !p.bigDamage && !p.fly && !p.hover && !hoverState && !p.tweakStats &&
        originalSpeed === null && originalPunch === null && originalStats === null && !flyState;
    if (idle) return;
    var inst = currentPlayer();
    if (!inst) { originalSpeed = null; originalPunch = null; originalStats = null; flyState = null; noclipApplied = false; return; }

    if (p.god) {
        try { inst.field("health").value = 999.0; live("god"); }
        catch (e) { if (fail("god", e)) p.god = false; }
        if (every9("godNet", 250)) { try { godNetStep(inst); } catch (e) { fail("god net health", e); } }
    }

    if (p.speed) {
        try {
            var loco = inst.field("movementController").value;
            if (loco && !loco.isNull()) {
                if (originalSpeed === null) originalSpeed = Number(loco.field("moveSpeed").value);
                loco.field("moveSpeed").value = p.speedValue;
                live("speed");
            }
        } catch (e) { if (fail("speed", e)) p.speed = false; }
    } else if (originalSpeed !== null) {
        restoreSpeed(inst);
    }

    if (p.noclip) {
        try {
            var nl = inst.field("movementController").value;
            if (nl && !nl.isNull()) { var col = nl.field("playerCollider").value; if (col && !col.isNull()) { col.method("set_enabled").invoke(false); noclipApplied = true; live("noclip"); } }
        } catch (e) { if (fail("noclip", e)) p.noclip = false; }
    } else if (noclipApplied) {
        try {
            var nl2 = inst.field("movementController").value;
            if (nl2 && !nl2.isNull()) { var col2 = nl2.field("playerCollider").value; if (col2 && !col2.isNull()) col2.method("set_enabled").invoke(true); }
        } catch (e) { }
        noclipApplied = false;
    }

    if (p.bigDamage || originalPunch !== null) syncPunch(inst);

    // stats are shared ScriptableObject values, no need to write them every single frame
    if ((p.tweakStats || originalStats !== null) && (++statTick % 10 === 0 || (!p.tweakStats && originalStats !== null))) syncStats(inst);

    if (p.fly) {
        try { flyFrame(inst); }
        catch (e) { if (fail("fly", e)) { p.fly = false; stopFly(inst); } }
    } else if (flyState) {
        stopFly(inst);
    }

    if (p.hover) {
        try { hoverFrame(inst); }
        catch (e) { if (fail("hover", e)) { p.hover = false; stopHover(inst); } }
    } else if (hoverState) {
        stopHover(inst);
    }
}
onFrame(function () { ST.inFrame = true; try { engineFrame(); } finally { ST.inFrame = false; } });

onDisable(function () {
    try { p.espBox = false; p.espBones = false; p.espChams = false; p.espSnap = false; dropAllTargets(); } catch (e) { }
    var inst = PlayerMP ? currentPlayer() : null;
    if (inst) {
        restoreSpeed(inst);
        p.bigDamage = false; syncPunch(inst);
        p.tweakStats = false; syncStats(inst);
        stopFly(inst);
        p.hover = false; stopHover(inst);
    }
    restoreWeapons();
    try { v9Clear(); } catch (e) { }
    lazyOff();
    replOff();
    try { p.grabAnything = false; restoreHands(); } catch (e) { }
    try {
        var ci = inst || (PlayerMP ? currentPlayer() : null);
        p.fovOn = false; p.thirdPerson = false;
        if (ci && cameraNeeded()) cameraFrame(ci);
    } catch (e) { }
    p.moneyRain = false; p.vacEnemies = false; p.vacPlayers = false; p.scoreLock = false;
    p.unlockAll = false;
    p.unlockSkins = false;
    syncIap();
    // this plugin's hooks go away when it's switched off, so un-freeze the enemies right now
    if (p.freezeEnemies) {
        try {
            AIKinds.forEach(function (cls) {
                choose(cls).forEach(function (o) {
                    try { var a = o.field("agent").value; if (a && !a.isNull()) a.method("set_isStopped").invoke(false); } catch (e) { }
                });
            });
        } catch (e) { }
    }
    p.freezeEnemies = false; p.weakEnemies = false;
});

Il2Cpp.perform(function () {
    if (setup()) installHooks();
});
log("Buddy Beatdown plugin v9 loaded - open its section in the Plugins tab");
