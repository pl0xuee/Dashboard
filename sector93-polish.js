// =============================================================================
// SECTOR 93 — Polish & Juice Module
// Integrates with the main game via window.S93Polish.
// Call initPolish(renderer, scene, camera, gameState) once during setup.
// Call updatePolish(delta) every frame inside your animation loop.
// =============================================================================

'use strict';

(function (global) {

  // ---------------------------------------------------------------------------
  // 1. RETRO RENDERING — call this immediately after creating your renderer
  // ---------------------------------------------------------------------------

  /**
   * Drops the internal render resolution to classic retro sizes while the
   * CSS stretches the canvas pixel-perfect via `image-rendering: pixelated`.
   *
   * @param {THREE.WebGLRenderer} renderer
   * @param {'320x200'|'320x240'|'640x400'|'640x480'} preset
   */
  function applyRetroResolution(renderer, preset) {
    const resolutions = {
      '320x200': [320, 200],
      '320x240': [320, 240],
      '640x400': [640, 400],
      '640x480': [640, 480],
    };
    const [w, h] = resolutions[preset] || resolutions['320x240'];

    // Fix the GPU framebuffer to the retro size — no pixel ratio scaling.
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false); // false = do NOT touch CSS size

    // Stretch via CSS — the browser scales up the small framebuffer.
    const canvas = renderer.domElement;
    canvas.style.width  = '100vw';
    canvas.style.height = '100vh';
    canvas.style.imageRendering = 'pixelated'; // Chrome / Edge
    canvas.style.imageRendering = 'crisp-edges'; // Firefox fallback
    // Keep the canvas element itself from blocking CSS layout
    canvas.style.display = 'block';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';

    console.log(`[S93] Retro resolution: ${w}×${h} stretched to full viewport.`);
    return { width: w, height: h };
  }


  // ---------------------------------------------------------------------------
  // 2. CEILING & FLOOR TEXTURES
  // ---------------------------------------------------------------------------

  /**
   * Generates a canvas-based cobblestone texture for the floor.
   * Returns a THREE.CanvasTexture ready to assign to a material map.
   *
   * Math: each stone block is a rounded rect drawn with slight hue variation
   * using HSL so the pattern never tiles obviously.
   */
  function createCobblestoneTexture(tileSize = 128) {
    const canvas = document.createElement('canvas');
    canvas.width  = tileSize * 4;
    canvas.height = tileSize * 4;
    const ctx = canvas.getContext('2d');

    // Base fill — dark earth tone
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cols = 8, rows = 8;
    const bw = canvas.width  / cols;
    const bh = canvas.height / rows;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Offset every other row for classic cobblestone brick offset
        const offsetX = (row % 2 === 0) ? 0 : bw * 0.5;
        const x = col * bw + offsetX;
        const y = row * bh;

        // Slight random lightness variation per stone: 12%–22%
        const lightness = 12 + Math.floor(seededRandom(col * 31 + row * 97) * 10);
        const hue = 25 + Math.floor(seededRandom(col * 13 + row * 53) * 15); // warm brown
        ctx.fillStyle = `hsl(${hue}, 18%, ${lightness}%)`;

        const pad = 2;
        roundRect(ctx, x + pad, y + pad, bw - pad * 2, bh - pad * 2, 3);
        ctx.fill();

        // Highlight edge (top/left)
        ctx.strokeStyle = `hsl(${hue}, 12%, ${lightness + 6}%)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Moss patches — random dark green splotches
        if (seededRandom(col * 7 + row * 23 + 5) > 0.6) {
          ctx.fillStyle = `rgba(30, 55, 20, 0.4)`;
          const mx = x + pad + seededRandom(col + row * 3) * (bw - 20);
          const my = y + pad + seededRandom(col * 3 + row) * (bh - 10);
          ctx.beginPath();
          ctx.ellipse(mx, my, 6, 4, seededRandom(col + row) * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    // Tile the texture over the floor plane
    tex.repeat.set(8, 8);
    tex.magFilter = THREE.NearestFilter; // keep the retro pixel look
    tex.minFilter = THREE.NearestMipmapNearestFilter;
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Generates a dark wooden-beam ceiling texture.
   * Alternating dark planks with thin highlight seams.
   */
  function createCeilingTexture(tileSize = 128) {
    const canvas = document.createElement('canvas');
    canvas.width  = tileSize * 4;
    canvas.height = tileSize * 4;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#080608';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const beamCount = 6;
    const beamH = canvas.height / beamCount;

    for (let i = 0; i < beamCount; i++) {
      const y = i * beamH;
      const lightness = 6 + Math.floor(seededRandom(i * 37) * 5);
      ctx.fillStyle = `hsl(20, 15%, ${lightness}%)`;
      ctx.fillRect(0, y + 2, canvas.width, beamH - 4);

      // Grain lines along each plank
      ctx.strokeStyle = `hsl(20, 10%, ${lightness - 3}%)`;
      ctx.lineWidth = 1;
      for (let g = 0; g < 5; g++) {
        const gx = seededRandom(i * 7 + g * 13) * canvas.width;
        ctx.beginPath();
        ctx.moveTo(gx, y + 2);
        ctx.lineTo(gx + seededRandom(i + g) * 40 - 20, y + beamH - 4);
        ctx.stroke();
      }

      // Seam highlight
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, y, canvas.width, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestMipmapNearestFilter;
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Builds and adds the floor and ceiling mesh planes to the scene.
   * Call this once during level setup, remove old planes first if rebuilding.
   *
   * @param {THREE.Scene}  scene
   * @param {number}       mapWidth   total tile columns
   * @param {number}       mapDepth   total tile rows
   * @param {number}       tileSize   world-units per tile (match your wall scale)
   * @param {number}       wallHeight world-units tall per wall
   * @returns {{ floor: THREE.Mesh, ceiling: THREE.Mesh }}
   */
  function buildFloorAndCeiling(scene, mapWidth, mapDepth, tileSize, wallHeight) {
    const W = mapWidth  * tileSize;
    const D = mapDepth  * tileSize;

    // --- Floor ---
    const floorGeo = new THREE.PlaneGeometry(W, D);
    const floorMat = new THREE.MeshLambertMaterial({
      map: createCobblestoneTexture(),
      color: 0xffffff,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2; // lay flat
    floor.position.set(W / 2, 0, D / 2);
    floor.name = 'FLOOR';
    floor.receiveShadow = true;
    scene.add(floor);

    // --- Ceiling ---
    const ceilGeo = new THREE.PlaneGeometry(W, D);
    const ceilMat = new THREE.MeshLambertMaterial({
      map: createCeilingTexture(),
      color: 0xffffff,
    });
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.rotation.x = Math.PI / 2; // face downward
    ceiling.position.set(W / 2, wallHeight, D / 2);
    ceiling.name = 'CEILING';
    scene.add(ceiling);

    return { floor, ceiling };
  }


  // ---------------------------------------------------------------------------
  // 3a. ENEMY PAIN STATE — stun + white flash
  // ---------------------------------------------------------------------------

  /**
   * Trigger the pain reaction on an enemy object.
   * Expects enemy.mesh to be a THREE.Sprite or Mesh with a MeshBasicMaterial.
   * Stores the original color on the object so it can be restored.
   *
   * @param {object} enemy  Your enemy state object { mesh, isStunned, stunTimer }
   */
  function triggerEnemyPain(enemy) {
    if (!enemy || !enemy.mesh) return;
    enemy.isStunned  = true;
    enemy.stunTimer  = PAIN_FLASH_DURATION;
    // Save original colour if we haven't yet
    if (!enemy._origColor) {
      enemy._origColor = enemy.mesh.material.color.clone();
    }
    // Flash white — Doom-style
    enemy.mesh.material.color.set(0xffffff);
  }

  const PAIN_FLASH_DURATION = 0.12; // seconds

  /**
   * Called each frame. Counts down stun timers and restores material colour.
   * @param {object[]} enemies  Array of enemy state objects
   * @param {number}   delta    Seconds since last frame
   */
  function updateEnemyPainStates(enemies, delta) {
    for (const enemy of enemies) {
      if (!enemy.isStunned) continue;
      enemy.stunTimer -= delta;
      if (enemy.stunTimer <= 0) {
        enemy.isStunned = false;
        if (enemy._origColor && enemy.mesh) {
          enemy.mesh.material.color.copy(enemy._origColor);
        }
      }
    }
  }


  // ---------------------------------------------------------------------------
  // 3b. GIBS PARTICLE SYSTEM
  // ---------------------------------------------------------------------------

  const _activeGibs = [];
  const GRAV        = 18;   // world-units per second² (tweak to taste)
  const GIB_COUNT   = 12;
  const GIB_LIFE    = 0.9;  // seconds before removal

  // Shared geometry & material — never reallocated
  const _gibGeo = new THREE.PlaneGeometry(0.12, 0.12);
  const _gibMat = new THREE.MeshBasicMaterial({
    color: 0xcc0000,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  /**
   * Spawn a burst of gib particles at world position.
   * @param {THREE.Scene} scene
   * @param {THREE.Vector3} position  Centre of the death explosion
   */
  function spawnGibs(scene, position) {
    for (let i = 0; i < GIB_COUNT; i++) {
      const mesh = new THREE.Mesh(_gibGeo, _gibMat.clone());
      mesh.position.copy(position);
      mesh.position.y += 0.5; // spawn at waist height

      // Random outward velocity in the XZ plane + a small upward kick
      const angle  = Math.random() * Math.PI * 2;
      const speed  = 2 + Math.random() * 5;
      const vx = Math.cos(angle) * speed;
      const vz = Math.sin(angle) * speed;
      const vy = 1.5 + Math.random() * 4;

      // Slight random shade of red/dark-red
      const r = 150 + Math.floor(Math.random() * 105);
      mesh.material.color.setRGB(r / 255, 0, 0);

      scene.add(mesh);
      _activeGibs.push({ mesh, vx, vy, vz, life: GIB_LIFE });
    }
  }

  /**
   * Advance all live gib particles.
   * Physics: Euler integration with constant gravity.
   *   vy(t+dt) = vy(t) - g * dt
   *   y(t+dt)  = y(t)  + vy(t+dt) * dt
   *
   * @param {THREE.Scene} scene
   * @param {number}      delta  seconds
   */
  function updateGibs(scene, delta) {
    for (let i = _activeGibs.length - 1; i >= 0; i--) {
      const g = _activeGibs[i];
      g.life -= delta;

      if (g.life <= 0 || g.mesh.position.y < 0) {
        scene.remove(g.mesh);
        g.mesh.material.dispose();
        _activeGibs.splice(i, 1);
        continue;
      }

      // Euler gravity step
      g.vy -= GRAV * delta;
      g.mesh.position.x += g.vx * delta;
      g.mesh.position.y += g.vy * delta;
      g.mesh.position.z += g.vz * delta;

      // Fade out in last 0.3 s
      if (g.life < 0.3) {
        g.mesh.material.opacity = g.life / 0.3;
        g.mesh.material.transparent = true;
      }

      // Always face the camera (billboard)
      if (global.S93Polish && global.S93Polish._camera) {
        g.mesh.lookAt(global.S93Polish._camera.position);
      }
    }
  }


  // ---------------------------------------------------------------------------
  // 3c. DOOM-FACE HUD — pure CSS/HTML state machine
  // ---------------------------------------------------------------------------
  //
  // Add this HTML fragment to your HUD container:
  //   <div id="doom-face-container">
  //     <div id="doom-face" class="face-normal face-look-center"></div>
  //   </div>
  //
  // The JS below drives class changes. Combine with the CSS block at the bottom
  // of this file (see DOOM_FACE_CSS).

  const FACE_LOOK_INTERVAL_MIN = 1.2;
  const FACE_LOOK_INTERVAL_MAX = 3.5;
  const FACE_PAIN_DURATION     = 0.5;

  let _faceState = {
    el:          null,    // DOM element
    lookTimer:   0,       // seconds until next look direction change
    painTimer:   0,       // > 0 means currently in pain state
    currentLook: 'face-look-center',
    healthClass: 'face-normal',   // face-normal | face-hurt | face-bloody
  };

  /** Call once after DOM is ready. */
  function initDoomFace() {
    _faceState.el = document.getElementById('doom-face');
    if (!_faceState.el) {
      console.warn('[S93] #doom-face element not found. Add it to your HUD HTML.');
      return;
    }
    _scheduleLook();
  }

  function _scheduleLook() {
    const range = FACE_LOOK_INTERVAL_MAX - FACE_LOOK_INTERVAL_MIN;
    _faceState.lookTimer = FACE_LOOK_INTERVAL_MIN + Math.random() * range;
  }

  /**
   * Notify the face that the player was just hurt.
   * Call this from your player-damage handler.
   */
  function facePlayerHurt() {
    if (!_faceState.el) return;
    _faceState.painTimer = FACE_PAIN_DURATION;
    _applyFaceClasses();
  }

  /**
   * Notify the face of the current player health (0–100).
   * Call this whenever health changes.
   * @param {number} health
   */
  function faceUpdateHealth(health) {
    if (health > 50) {
      _faceState.healthClass = 'face-normal';
    } else if (health > 25) {
      _faceState.healthClass = 'face-hurt';
    } else {
      _faceState.healthClass = 'face-bloody';
    }
    if (_faceState.painTimer <= 0) _applyFaceClasses();
  }

  function _applyFaceClasses() {
    const el = _faceState.el;
    if (!el) return;
    // Remove all managed classes
    el.classList.remove(
      'face-normal', 'face-hurt', 'face-bloody', 'face-pain',
      'face-look-center', 'face-look-left', 'face-look-right'
    );
    if (_faceState.painTimer > 0) {
      el.classList.add('face-pain', _faceState.healthClass);
    } else {
      el.classList.add(_faceState.healthClass, _faceState.currentLook);
    }
  }

  /**
   * Update face timers. Call from the main animation loop.
   * @param {number} delta  seconds
   */
  function updateDoomFace(delta) {
    if (!_faceState.el) return;

    // Pain countdown
    if (_faceState.painTimer > 0) {
      _faceState.painTimer -= delta;
      if (_faceState.painTimer <= 0) {
        _faceState.painTimer = 0;
        _applyFaceClasses();
      }
      return; // don't process look while in pain
    }

    // Random look direction
    _faceState.lookTimer -= delta;
    if (_faceState.lookTimer <= 0) {
      const dirs = ['face-look-left', 'face-look-center', 'face-look-center', 'face-look-right'];
      _faceState.currentLook = dirs[Math.floor(Math.random() * dirs.length)];
      _applyFaceClasses();
      _scheduleLook();
    }
  }


  // ---------------------------------------------------------------------------
  // 4a. FLICKERING TORCHES
  // ---------------------------------------------------------------------------

  const _torchLights  = [];
  const _torchConfigs = [];

  /**
   * Register a torch PointLight to be flickered each frame.
   * @param {THREE.PointLight} light
   * @param {number} baseIntensity  The 'resting' intensity (e.g. 1.2)
   */
  function registerTorch(light, baseIntensity) {
    // Each torch gets a unique phase offset and frequency so they don't sync
    _torchLights.push(light);
    _torchConfigs.push({
      base:      baseIntensity,
      phase:     Math.random() * Math.PI * 2,
      freqA:     7.0  + Math.random() * 5.0,   // fast flicker Hz
      freqB:     1.3  + Math.random() * 1.5,   // slow undulation Hz
      ampA:      0.10 + Math.random() * 0.15,  // fast flicker amplitude
      ampB:      0.20 + Math.random() * 0.20,  // slow sway amplitude
    });
  }

  /**
   * Update all registered torch lights.
   * Intensity formula (two-frequency superposition):
   *
   *   I(t) = base
   *         + ampA * sin(freqA * t + phase)
   *         + ampB * sin(freqB * t + phase * 0.7)
   *         + noise * (random - 0.5)     ← random spike for organic feel
   *
   * @param {number} elapsedTime  renderer.clock value (total seconds)
   */
  function updateTorches(elapsedTime) {
    for (let i = 0; i < _torchLights.length; i++) {
      const cfg = _torchConfigs[i];
      const light = _torchLights[i];
      const noise = (Math.random() - 0.5) * 0.08;

      light.intensity =
        cfg.base
        + cfg.ampA * Math.sin(cfg.freqA * elapsedTime + cfg.phase)
        + cfg.ampB * Math.sin(cfg.freqB * elapsedTime + cfg.phase * 0.7)
        + noise;

      // Clamp to avoid negative intensity (physically impossible)
      if (light.intensity < 0.05) light.intensity = 0.05;
    }
  }


  // ---------------------------------------------------------------------------
  // 4b. SECRET WALLS (tile type 8)
  // ---------------------------------------------------------------------------

  const SECRET_OPEN_DISTANCE = 2.0; // world-units — how close the player must be
  const SECRET_SLIDE_SPEED   = 3.0; // units per second the wall slides down
  const SECRET_WALL_TYPE     = 8;

  const _secretWalls = [];

  /**
   * Register a secret wall mesh.
   * Call this during level load when you encounter tile type 8.
   *
   * @param {THREE.Mesh}    mesh         The wall mesh
   * @param {THREE.Vector3} worldPos     Centre of the wall in world space
   * @param {object[]}      lootItems    Array of loot descriptors to spawn on open
   *   Each: { type: 'ammo'|'health', value: number, worldPos: THREE.Vector3 }
   * @param {Function}      spawnLootFn  Your existing loot-spawn function
   */
  function registerSecretWall(mesh, worldPos, lootItems, spawnLootFn) {
    _secretWalls.push({
      mesh,
      worldPos:    worldPos.clone(),
      lootItems:   lootItems || [],
      spawnLootFn: spawnLootFn || null,
      state:       'closed',   // 'closed' | 'opening' | 'open'
      openY:       worldPos.y, // starting Y
      targetY:     worldPos.y - 2.5, // sink into floor (wall height)
    });
  }

  /**
   * Called each frame. Checks 'E' proximity trigger and slides open secret walls.
   *
   * @param {THREE.Vector3} playerPos
   * @param {boolean}       eKeyPressed  true on the frame the player pressed E
   * @param {number}        delta
   */
  function updateSecretWalls(playerPos, eKeyPressed, delta) {
    for (const sw of _secretWalls) {
      if (sw.state === 'open') continue;

      const dist = playerPos.distanceTo(sw.worldPos);

      // Glow/highlight hint: colour the wall subtly when in range
      if (dist < SECRET_OPEN_DISTANCE * 1.5) {
        if (sw.state === 'closed') {
          sw.mesh.material.emissive.setHex(0x221100);
          sw.mesh.material.emissiveIntensity = 0.4;
        }
      } else {
        if (sw.state === 'closed' && sw.mesh.material.emissive) {
          sw.mesh.material.emissive.setHex(0x000000);
        }
      }

      // Open on E key + proximity
      if (eKeyPressed && dist < SECRET_OPEN_DISTANCE && sw.state === 'closed') {
        sw.state = 'opening';
        // Spawn the loot inside
        if (sw.spawnLootFn && sw.lootItems) {
          for (const item of sw.lootItems) {
            sw.spawnLootFn(item.type, item.value, item.worldPos);
          }
        }
      }

      // Slide the wall mesh downward into the floor
      if (sw.state === 'opening') {
        sw.mesh.position.y -= SECRET_SLIDE_SPEED * delta;
        if (sw.mesh.position.y <= sw.targetY) {
          sw.mesh.position.y = sw.targetY;
          sw.state = 'open';
          sw.mesh.visible = false; // fully sunk — remove from rendering
        }
      }
    }
  }


  // ---------------------------------------------------------------------------
  // 5. PERFORMANCE — InstancedMesh wall builder
  // ---------------------------------------------------------------------------

  /**
   * Replaces individual wall Box meshes with a single InstancedMesh.
   * All walls sharing the same material tile get one draw call.
   *
   * Usage — in your level loader, instead of:
   *   scene.add(new THREE.Mesh(boxGeo, wallMat));  // × N walls
   *
   * Do:
   *   const wallPositions = [];  // collect { x, y, z } from map scan
   *   const instancedWall = buildInstancedWalls(wallPositions, tileSize,
   *                                              wallHeight, wallMaterial);
   *   scene.add(instancedWall);
   *
   * @param {{ x: number, y: number, z: number }[]} positions  World-space centres
   * @param {number}            tileSize    Width/depth of one tile
   * @param {number}            wallHeight  Height of wall box
   * @param {THREE.Material}    material
   * @returns {THREE.InstancedMesh}
   */
  function buildInstancedWalls(positions, tileSize, wallHeight, material) {
    const geo  = new THREE.BoxGeometry(tileSize, wallHeight, tileSize);
    const mesh = new THREE.InstancedMesh(geo, material, positions.length);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    mesh.name          = 'INSTANCED_WALLS';

    const matrix = new THREE.Matrix4();
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      matrix.makeTranslation(p.x, p.y, p.z);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  /**
   * Alternative: merge all wall geometries into ONE BufferGeometry
   * for a single non-instanced draw call (useful when wall count < ~500).
   *
   * Requires: import * as BufferGeometryUtils from
   *   'three/addons/utils/BufferGeometryUtils.js';
   *
   * @param {{ x: number, y: number, z: number }[]} positions
   * @param {number}            tileSize
   * @param {number}            wallHeight
   * @param {THREE.Material}    material
   * @param {object}            BufferGeometryUtils  the imported utils module
   * @returns {THREE.Mesh}
   */
  function buildMergedWalls(positions, tileSize, wallHeight, material, BufferGeometryUtils) {
    const baseGeo = new THREE.BoxGeometry(tileSize, wallHeight, tileSize);
    const geos    = [];
    const dummy   = new THREE.Object3D();

    for (const p of positions) {
      dummy.position.set(p.x, p.y, p.z);
      dummy.updateMatrix();
      const clone = baseGeo.clone();
      clone.applyMatrix4(dummy.matrix);
      geos.push(clone);
    }

    baseGeo.dispose(); // free the template
    const merged = BufferGeometryUtils.mergeGeometries(geos, false);
    geos.forEach(g => g.dispose());

    const mesh = new THREE.Mesh(merged, material);
    mesh.name  = 'MERGED_WALLS';
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    return mesh;
  }


  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  /** Deterministic pseudo-random from a seed (no side-effects on Math.random) */
  function seededRandom(seed) {
    const x = Math.sin(seed + 1) * 43758.5453123;
    return x - Math.floor(x);
  }

  /** Canvas 2D rounded-rectangle path helper (ctx.roundRect is not in all browsers) */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x,     y + h, x,     y + h - r, r);
    ctx.lineTo(x,     y + r);
    ctx.arcTo(x,     y,     x + r, y,         r);
    ctx.closePath();
  }


  // ---------------------------------------------------------------------------
  // MASTER INIT & UPDATE — wire everything together
  // ---------------------------------------------------------------------------

  let _scene, _camera;

  /**
   * SETUP — call once after your renderer, scene, and camera exist.
   *
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene}         scene
   * @param {THREE.PerspectiveCamera} camera
   * @param {object} gameState  Your existing game state object (for health etc.)
   * @param {object} [opts]
   * @param {string} [opts.retroPreset='320x240']
   * @param {number} [opts.mapWidth=20]
   * @param {number} [opts.mapDepth=20]
   * @param {number} [opts.tileSize=1]
   * @param {number} [opts.wallHeight=2]
   */
  function initPolish(renderer, scene, camera, gameState, opts) {
    opts = Object.assign({
      retroPreset: '320x240',
      mapWidth:    20,
      mapDepth:    20,
      tileSize:    1,
      wallHeight:  2,
    }, opts);

    _scene  = scene;
    _camera = camera;

    // 1. Retro resolution
    applyRetroResolution(renderer, opts.retroPreset);

    // 2. Floor & ceiling
    buildFloorAndCeiling(
      scene, opts.mapWidth, opts.mapDepth, opts.tileSize, opts.wallHeight
    );

    // 3c. Doom face HUD
    initDoomFace();

    // Store reference for gib billboarding
    global.S93Polish._camera = camera;

    console.log('[S93] Polish module initialised.');
  }

  /**
   * GAME LOOP — call every frame inside requestAnimationFrame.
   *
   * @param {number}  delta        Seconds since last frame (clock.getDelta())
   * @param {number}  elapsedTime  Total seconds since start (clock.getElapsedTime())
   * @param {object}  gameState    Must have: .enemies[], .playerHealth, .eKeyPressed, .playerPos
   * @param {THREE.Scene} scene
   */
  function updatePolish(delta, elapsedTime, gameState, scene) {
    // 3a. Enemy pain timers
    if (gameState.enemies) {
      updateEnemyPainStates(gameState.enemies, delta);
    }

    // 3b. Gibs physics
    updateGibs(scene || _scene, delta);

    // 3c. Doom face
    updateDoomFace(delta);

    // 4a. Torch flicker
    updateTorches(elapsedTime);

    // 4b. Secret walls
    if (gameState.playerPos) {
      updateSecretWalls(
        gameState.playerPos,
        gameState.eKeyPressed || false,
        delta
      );
    }
  }


  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  global.S93Polish = {
    // Setup
    initPolish,
    applyRetroResolution,
    buildFloorAndCeiling,
    buildInstancedWalls,
    buildMergedWalls,
    registerTorch,
    registerSecretWall,
    initDoomFace,

    // Game loop
    updatePolish,
    updateTorches,
    updateSecretWalls,
    updateEnemyPainStates,
    updateGibs,
    updateDoomFace,

    // Events (call from your game logic)
    triggerEnemyPain,
    spawnGibs,
    facePlayerHurt,
    faceUpdateHealth,

    // Internal (used by gibs billboard)
    _camera: null,
  };

}(window));


// =============================================================================
// DOOM_FACE_CSS — paste into your <style> block or .css file
// =============================================================================
/*

#doom-face-container {
  position: fixed;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  /* Pixel-art upscale — matches the retro renderer */
  image-rendering: pixelated;
}

#doom-face {
  width:  40px;
  height: 40px;
  background-image: url('doom-face-sheet.png');
  background-size: 200px 160px; /* 5 cols × 4 rows sprite sheet (40×40 px per frame) */
  image-rendering: pixelated;
}

/* ── Row 0 (y=0): Normal health faces ── */
#doom-face.face-normal.face-look-center { background-position:  -40px    0; }
#doom-face.face-normal.face-look-left   { background-position:    0px    0; }
#doom-face.face-normal.face-look-right  { background-position:  -80px    0; }

/* ── Row 1 (y=-40): Hurt faces (< 50% HP) ── */
#doom-face.face-hurt.face-look-center   { background-position:  -40px  -40px; }
#doom-face.face-hurt.face-look-left     { background-position:    0px  -40px; }
#doom-face.face-hurt.face-look-right    { background-position:  -80px  -40px; }

/* ── Row 2 (y=-80): Bloody faces (< 25% HP) ── */
#doom-face.face-bloody.face-look-center { background-position:  -40px  -80px; }
#doom-face.face-bloody.face-look-left   { background-position:    0px  -80px; }
#doom-face.face-bloody.face-look-right  { background-position:  -80px  -80px; }

/* ── Row 3 (y=-120): PAIN frames — shown on all health levels ── */
#doom-face.face-pain.face-normal        { background-position: -120px -120px; }
#doom-face.face-pain.face-hurt          { background-position: -160px -120px; }
#doom-face.face-pain.face-bloody        { background-position: -160px -120px; }

*/
