// =============================================================================
// SECTOR 93 — Integration Patch
// Copy the marked blocks into your existing game file at the locations shown.
// This file is a reference guide — it is NOT imported directly.
// =============================================================================


// ─────────────────────────────────────────────────────────────────────────────
// [HTML] Add to your <head> or at the end of <body>, BEFORE your game script:
// ─────────────────────────────────────────────────────────────────────────────
//
//   <script src="sector93-polish.js"></script>
//
// And inside your HUD HTML (wherever you show health/ammo bars):
//
//   <div id="doom-face-container">
//     <div id="doom-face" class="face-normal face-look-center"></div>
//   </div>
//
// Copy the CSS block from the bottom of sector93-polish.js into your <style>.


// ─────────────────────────────────────────────────────────────────────────────
// [SETUP] After you create renderer, scene, camera and load level 1:
// ─────────────────────────────────────────────────────────────────────────────

function patchSetup() {
  // 1. Retro rendering + floor/ceiling
  S93Polish.initPolish(renderer, scene, camera, gameState, {
    retroPreset: '320x240',   // or '640x480' for sharper look
    mapWidth:    MAP[0].length,
    mapDepth:    MAP.length,
    tileSize:    TILE_SIZE,   // whatever constant you use for wall width
    wallHeight:  WALL_HEIGHT, // same
  });

  // 2. Register torches during level build.
  //    Wherever you currently do:  scene.add(torchLight);
  //    Also add:
  //      S93Polish.registerTorch(torchLight, torchLight.intensity);

  // 3. Register secret walls during level build.
  //    When you encounter map tile === 8:
  //
  //      const wallMesh = buildWallMesh(x, z);  // your existing wall builder
  //      S93Polish.registerSecretWall(
  //        wallMesh,
  //        new THREE.Vector3(worldX, WALL_HEIGHT / 2, worldZ),
  //        [
  //          { type: 'ammo',   value: 50, worldPos: new THREE.Vector3(worldX + 1, 0.5, worldZ) },
  //          { type: 'health', value: 25, worldPos: new THREE.Vector3(worldX - 1, 0.5, worldZ) },
  //        ],
  //        spawnPickup   // your existing pickup-spawn function
  //      );

  // 4. PERFORMANCE: replace individual wall boxes with instanced mesh.
  //    Collect positions during map scan:
  const wallPositions = [];
  for (let row = 0; row < MAP.length; row++) {
    for (let col = 0; col < MAP[row].length; col++) {
      const tile = MAP[row][col];
      if (tile === 1 || tile === 8) { // solid walls + secret walls
        wallPositions.push({
          x: col * TILE_SIZE + TILE_SIZE / 2,
          y: WALL_HEIGHT / 2,
          z: row * TILE_SIZE + TILE_SIZE / 2,
        });
      }
    }
  }
  //    Then ONE draw call for all walls:
  //      const instancedWalls = S93Polish.buildInstancedWalls(
  //          wallPositions, TILE_SIZE, WALL_HEIGHT, wallMaterial);
  //      scene.add(instancedWalls);
  //
  //    Remove all the old individual wall scene.add() calls.
}


// ─────────────────────────────────────────────────────────────────────────────
// [GAME LOOP] Inside your animate() / requestAnimationFrame callback:
// ─────────────────────────────────────────────────────────────────────────────

function patchGameLoop(delta, elapsedTime) {
  // Build the slim gameState snapshot that S93Polish needs each frame.
  // Map your existing variables to these names:
  const polishState = {
    enemies:      enemies,             // your enemies array
    playerHealth: playerHealth,        // number 0-100
    playerPos:    camera.position,     // THREE.Vector3 (camera IS the player)
    eKeyPressed:  keys['KeyE'] && !keys['_ePrev'], // true only on the PRESS frame
  };
  keys['_ePrev'] = keys['KeyE'];       // prevent hold-repeating secret walls

  S93Polish.updatePolish(delta, elapsedTime, polishState, scene);
}


// ─────────────────────────────────────────────────────────────────────────────
// [ENEMY HIT] In your bullet-hit / raycasting hit handler:
// ─────────────────────────────────────────────────────────────────────────────

function patchEnemyHit(enemy, damage) {
  enemy.health -= damage;

  if (enemy.health <= 0) {
    // Enemy dies
    S93Polish.spawnGibs(scene, enemy.mesh.position);
    scene.remove(enemy.mesh);
    enemies.splice(enemies.indexOf(enemy), 1);
  } else {
    // Enemy survives — pain flash
    S93Polish.triggerEnemyPain(enemy);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// [PLAYER DAMAGE] In your player-takes-damage handler:
// ─────────────────────────────────────────────────────────────────────────────

function patchPlayerDamage(amount) {
  playerHealth -= amount;
  if (playerHealth < 0) playerHealth = 0;

  // Update HUD health number as before, PLUS:
  S93Polish.facePlayerHurt();
  S93Polish.faceUpdateHealth(playerHealth);
}


// ─────────────────────────────────────────────────────────────────────────────
// [LEVEL RELOAD] When building a new level (multi-level loop):
// ─────────────────────────────────────────────────────────────────────────────
//
// The floor/ceiling planes are created once per initPolish call.
// If your multi-level system fully rebuilds the scene, call initPolish() again
// with the new map dimensions.
//
// If the scene is reused (objects cleared but scene retained), remove the old
// floor/ceiling first:
//
//   const oldFloor   = scene.getObjectByName('FLOOR');
//   const oldCeiling = scene.getObjectByName('CEILING');
//   if (oldFloor)   scene.remove(oldFloor);
//   if (oldCeiling) scene.remove(oldCeiling);
//
//   S93Polish.buildFloorAndCeiling(
//     scene, newMap[0].length, newMap.length, TILE_SIZE, WALL_HEIGHT
//   );
