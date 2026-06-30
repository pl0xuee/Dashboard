    const SAVE_KEY = 'middleEarthRpgSaveV1';
    const MUSIC_PREF_KEY = 'middleEarthRpgMusicEnabledV1';
    const MUSIC_VOLUME_KEY = 'middleEarthRpgMusicVolumeV1';
    const ZOOM_PREF_KEY = 'middleEarthRpgZoomV1';
    const SCENE_IMAGE_BASE_URL = 'https://image.pollinations.ai/prompt/';
    const SCENE_GENERATION_WIDTH = 2560;
    const SCENE_GENERATION_HEIGHT = 480;
    const ENABLE_SCENE_AI_ART = false;
    const ENABLE_MINIMAP_AI_ART = true;
    const MINIMAP_GENERATION_LONG_EDGE = 1792;
    const COMBAT_TURN_PACE_MS = 1900;
    const COMBAT_RESULT_PACE_MS = 1200;
    const LOCAL_SCENE_ART_SOURCES = [
      './Canvas Pictures/Gemini_Generated_Image_4a61454a61454a61.png',
      './Canvas Pictures/Gemini_Generated_Image_4a61454a61454a61 (1).png',
      './Canvas Pictures/Gemini_Generated_Image_4a61454a61454a61 (2).png',
      './Canvas Pictures/Gemini_Generated_Image_4a61454a61454a61 (3).png',
      './Canvas Pictures/Gemini_Generated_Image_4a61454a61454a61 (4).png',
      './Canvas Pictures/Gemini_Generated_Image_4a61454a61454a61 (5).png',
      './Canvas Pictures/Gemini_Generated_Image_4a61454a61454a61 (6).png',
      './Canvas Pictures/Gemini_Generated_Image_4a61454a61454a61 (7).png',
      './Canvas Pictures/rpg.png',
      './rpg.png'
    ];
    const YOUTUBE_SOUNDTRACK_ID = 'stgT4hOG8lU';
    const VERSION = 1;
    const SKILL_TO_ABILITY = {
      Athletics: 'str',
      Stealth: 'dex',
      Perception: 'wis',
      Survival: 'wis',
      Lore: 'int',
      Persuasion: 'cha',
      Insight: 'wis',
      Medicine: 'wis',
      Investigation: 'int',
      Acrobatics: 'dex'
    };

    const BESTIARY = {
      orcSkirmisher: {
        name: 'Orc Skirmisher', role: 'raider', ac: 12, hp: 18, maxHp: 18, attackBonus: 4, damageDie: '1d8', damageBonus: 2,
        flavor: 'A sharp-eyed tracker from Dol Guldur with a notched falchion.'
      },
      spiderHunter: {
        name: 'Great Forest Spider', role: 'lurker', ac: 13, hp: 22, maxHp: 22, attackBonus: 5, damageDie: '1d6', damageBonus: 3,
        flavor: 'A venomous hunter dropping from the high webbed canopy.'
      },
      wargRunner: {
        name: 'Warg Runner', role: 'charger', ac: 13, hp: 20, maxHp: 20, attackBonus: 5, damageDie: '1d8', damageBonus: 3,
        flavor: 'A lean warg bred for brutal speed.'
      },
      easterlingBlade: {
        name: 'Easterling Blade', role: 'soldier', ac: 14, hp: 24, maxHp: 24, attackBonus: 5, damageDie: '1d8', damageBonus: 3,
        flavor: 'A mailed outrider carrying a curved sword and red pennon.'
      },
      tombWight: {
        name: 'Barrow Wight', role: 'undead', ac: 14, hp: 26, maxHp: 26, attackBonus: 6, damageDie: '1d10', damageBonus: 2,
        flavor: 'A cold spirit clothed in forgotten grave-cloth.'
      },
      blackUruk: {
        name: 'Black Uruk Captain', role: 'captain', ac: 15, hp: 36, maxHp: 36, attackBonus: 6, damageDie: '1d10', damageBonus: 4,
        flavor: 'A brutal field commander sent north from Dol Guldur.'
      },
      fellCaptain: {
        name: 'Fell Captain of the East Bight', role: 'boss', ac: 16, hp: 58, maxHp: 58, attackBonus: 7, damageDie: '2d6', damageBonus: 4,
        flavor: 'A ruthless war-leader commanding the shadow war in the North.'
      }
    };

    const STORY_POOL = {
      act1: {
        scenes: [
          (world) => challengeScene(
            'Ash on the East Road',
            `A spray of black ash drifts across the East Road outside ${world.outpost}. The patrol must decide whether the cinders are windblown from old hearths or a sign that ${world.threatName.toLowerCase()} has begun to burn the hidden waystations used by the Woodmen.`,
            [
              choice('Read the sign in the ash', 'Survival', 13, 'Calenhir kneels among the ruts and tracks the ash back to a hidden camp trail.', 'The ash leads the company into a false turn and wasted daylight.', { supplies: 1, hope: 1 }, { shadow: 1 }),
              choice('Send eyes into the treeline', 'Perception', 14, `${world.scoutContact} slips under the firs and spots a watching pair of orcs before they can signal.`, 'The watchers vanish into brush and the patrol knows it has been marked.', { hope: 1 }, { shadow: 1, encounterKey: 'orcPickets' }),
              choice('Appeal to frightened wayfarers', 'Persuasion', 12, 'A soot-streaked charcoal family shares word of torchlight moving by night.', 'Panic spreads faster than reason and the trail of rumor clouds the truth.', { lore: 1 }, { shadow: 1 })
            ]
          ),
          (world) => challengeScene(
            'Broken Beacon Post',
            `At a ruined beacon post above the Narrows, the party finds a coded strip of Gondorian cloth nailed beneath a raven mark. The message likely concerns ${world.relicName.toLowerCase()} and the hidden path toward ${world.targetSite}.`,
            [
              choice('Break the cipher with lore', 'Lore', 14, `${world.scholarContact} unravels the field code and reveals a warning about scouts moving in pairs.`, 'The code resists haste, and a vital line is misread.', { hope: 1, supplies: 1 }, { shadow: 1 }),
              choice('Search for the courier’s spoor', 'Investigation', 13, 'A snapped buckle and boot nails reveal where the courier was dragged into the pines.', 'Rain and boot churn muddle the ground before the story is whole.', { lore: 1 }, { encounterKey: 'spiderNest' }),
              choice('Call the local watch to the hill', 'Persuasion', 12, 'Woodmen wardens emerge from concealment and confirm the signal lines are failing.', 'No answer comes, and silence weighs on the company.', { hope: 1 }, { shadow: 1 })
            ]
          ),
          (world) => challengeScene(
            'The Fen of Whisper Roots',
            `A drowned path through alder fen offers a day’s advantage, but the roots murmur with old dread. Somewhere beneath the waterline, something has carried off a supply barge bearing lantern oil bound for ${world.outpost}.`,
            [
              choice('Leap the bog run on instinct', 'Acrobatics', 13, 'Light feet and rope discipline pull the whole company across before dusk swallows the pools.', 'A misstep drowns precious time and two satchels of food.', { supplies: 1 }, { supplies: -1, shadow: 1 }),
              choice('Trace the barge path by memory of the reeds', 'Survival', 15, 'The party recovers the lamp oil and a hidden ford besides.', 'The reeds twist every path toward deeper water.', { supplies: 1, hope: 1 }, { shadow: 1, damageParty: 2 }),
              choice('Sound the fen with old boatman songs', 'Persuasion', 13, 'An anxious ferryman reveals a hunter’s cove still used by the Woodmen.', 'The singing rouses only echo and carrion birds.', { lore: 1 }, { encounterKey: 'wargShadow' })
            ]
          ),
          (world) => socialScene(
            'The Hall at Talan Tinnu',
            `Back within the hidden hall of ${world.outpost}, the company must decide what to do with the trail it has gathered. A wrong report could scatter the few defenders still holding the marches between the Anduin vale and ${world.targetSite}.`,
            [
              branch('Send swift riders to warn the Woodsmen', 'The Woodmen kindle three hill-fires and begin to evacuate their furthest watch-camps.', { hope: 1, renown: 1 }),
              branch('Keep the trail quiet and bait the hunters', 'The company sets a false trail and lures the enemy toward a chosen glade.', { shadow: 1, renown: 1 }),
              branch('Share the burden among every ally at hand', `${world.scoutContact}, ${world.scholarContact}, and the local thane each commit what aid they can spare.`, { hope: 1, supplies: 1 })
            ]
          ),
          (world) => challengeScene(
            'Ravens at Fen Bridge',
            `At a moss-dark bridge west of ${world.outpost}, ravens circle and cry as if driving travelers away. Under the stones, someone has hidden fresh arrow bundles stamped with the mark of ${world.threatName.toLowerCase()}.`,
            [
              choice('Read the birds and wind', 'Insight', 13, 'The company catches the warning pattern in the raven calls and finds the hidden cache untouched.', 'A false omen sends the patrol searching the wrong bank until dusk.', { supplies: 1, hope: 1 }, { shadow: 1 }),
              choice('Sweep the bridge supports', 'Investigation', 14, `${world.scoutContact} uncovers a twine bell-trap and cuts it before it can ring out.`, 'The trap sounds and enemy lookouts are stirred in the marsh haze.', { lore: 1 }, { encounterKey: 'orcPickets', shadow: 1 }),
              choice('Move the cache to safer ground', 'Athletics', 12, 'The party hauls the bundles to a hidden store and denies the enemy easy resupply.', 'Mud and weight slow the work, and half the shafts are lost to black water.', { supplies: 1 }, { supplies: -1, shadow: 1 })
            ]
          ),
          (world) => challengeScene(
            'Charcoal Kiln Smoke',
            `A derelict charcoal kiln near ${world.targetSite} burns again in the night, though no charcoalers remain in these woods. The smoke could be a signal line for raiders, or bait for patrols.`,
            [
              choice('Shadow the smoke trail', 'Stealth', 14, 'The company tracks the smoke to a hidden signal pit and maps the route back to camp.', 'An ember flare betrays the patrol and sends scouts scattering into the dark.', { lore: 1, renown: 1 }, { encounterKey: 'wargShadow' }),
              choice('Quench the kiln quickly', 'Survival', 13, `${world.healerContact} mixes wet clay and moss, smothering the fire before dawn can carry the plume.`, 'The kiln collapses mid-quench, burning hands and wasting precious waterskins.', { hope: 1 }, { shadow: 1, damageParty: 2 }),
              choice('Question nearby trappers', 'Persuasion', 12, 'A wary trapper admits he was forced to tend the fire by armed strangers from the east.', 'No one speaks, and fear closes every door in the hamlet clearing.', { lore: 1 }, { shadow: 1 })
            ]
          ),
          (world) => socialScene(
            'Watchfire Oath at Dusk',
            `As dusk settles over ${world.outpost}, the watch captains gather around a low flame to decide how to hold the line through the coming moonless nights.`,
            [
              branch('Spread sentries across every ridge', 'The wider net catches more movement, though each watcher now stands farther from aid.', { renown: 1, shadow: 1 }),
              branch('Concentrate the guard near the hidden road', 'The narrow defense is stronger, and the first relay remains unbroken.', { hope: 1, supplies: -1 }),
              branch('Share the oath with local families', 'Villagers and wardens alike keep the same watchword, making surprise far harder for enemy scouts.', { hope: 1, lore: 1 })
            ]
          )
        ],
        combatIntro: (world) => combatScene(
          'Raiders Beneath the Eaves',
          `Before dawn, ${world.outpost} is tested by a probing strike. The company must hold the gate while horn calls echo from the eaves of Mirkwood.`,
          'orcRaid',
          'The first true clash comes hard and fast at the hidden gate.'
        ),
        finale: (world) => combatScene(
          'The Bridge of Seregon Ford',
          `At the weathered bridge near ${world.targetSite}, the party catches the enemy vanguard carrying word of ${world.relicName}. If the messenger crosses, all of Act II will begin with the North already outflanked.`,
          'fordStand',
          'Steel answers secrecy on the narrow bridge.'
        )
      },
      act2: {
        scenes: [
          (world) => challengeScene(
            'Under the Greenwood Canopy',
            `The deeper road beneath the Greenwood is older than the kingdoms that now fear it. Somewhere among the dark trunks waits ${world.hiddenAlly}, a watcher who alone knows where ${world.relicName} was last seen.`,
            [
              choice('Read the old rune cuts', 'Lore', 15, `${world.scholarContact} matches the rune cuts to an outcast Silvan way-mark and turns the company east.`, 'A decayed sign sends the party toward webbed hollows first.', { lore: 1 }, { encounterKey: 'spiderNest', shadow: 1 }),
              choice('Move by silence and starlight', 'Stealth', 14, `${world.scoutContact} threads the company between two hunting bands without a twig out of place.`, 'A snapped branch brings distant answering horns.', { hope: 1 }, { encounterKey: 'orcPickets' }),
              choice('Ask the trees with elder courtesy', 'Insight', 13, 'The hush of the forest shifts, guiding the company toward a spring untouched by corruption.', 'The woods offer no comfort and every rustle becomes suspicion.', { hope: 1 }, { shadow: 1 })
            ]
          ),
          (world) => challengeScene(
            'Hall of Thorned Glass',
            `A half-sunken Elven hall stands wrapped in thorn and mirrored dew. The clue to ${world.relicName.toLowerCase()} may lie within, but the place is touched by the old fear that lingers around Dol Guldur.`,
            [
              choice('Search the fallen library', 'Investigation', 14, 'A silvered map case survives in dry stone beneath the roots.', 'Collapsed shelves trap the company long enough for the dark to gather.', { lore: 1, supplies: 1 }, { shadow: 1 }),
              choice('Invoke forgotten healing songs', 'Medicine', 13, `${world.healerContact} stills the panic that grips the hall and reveals a hidden reliquary latch.`, 'The old songs fall flat and the air itself fights the company.', { hope: 1 }, { damageParty: 2, shadow: 1 }),
              choice('Press onward before the fear deepens', 'Athletics', 15, 'With sheer resolve the fellowship clears a passage and finds the relic trail before sunset.', 'The rush leaves shields askew and tempers frayed.', { renown: 1 }, { encounterKey: 'tombAwakens' })
            ]
          ),
          (world) => socialScene(
            'Parley at the Moon Pool',
            `${world.hiddenAlly} agrees to speak only if the company proves it is not yet swallowed by the same haste that ruins Men and Orc alike. The meeting at the moon pool will decide whether the Silvan scouts open their hidden paths.`,
            [
              branch('Offer the truth plainly', 'The truth carries weight; the hidden ally shares a moonlit path through the lower boughs.', { hope: 1, renown: 1 }),
              branch('Offer to shoulder the heaviest watch', 'Duty earns respect, and the scouts commit two wardens to the company’s cause.', { supplies: 1, renown: 1 }),
              branch('Press for aid with hard urgency', 'The ally yields, but trust thins to a dangerous thread.', { shadow: 1, lore: 1 })
            ]
          ),
          (world) => challengeScene(
            'The Black Stair of Roots',
            `Great roots knot into a natural stair descending toward ${world.targetSite}. The steps are slick with night dew, and old spear points jut from the earth where prior companies made their stand.`,
            [
              choice('Descend with shield discipline', 'Athletics', 14, 'The formation holds and the company reaches the lower glade in good order.', 'One slip becomes many, and the party arrives bruised and breathless.', { hope: 1 }, { damageParty: 2, shadow: 1 }),
              choice('Mark each turn with hidden signs', 'Investigation', 13, `${world.scholarContact} leaves coded root-marks so no one is lost in retreat.`, 'The marks are misread in haste and a side route becomes a dead end.', { lore: 1, supplies: 1 }, { shadow: 1 }),
              choice('Scout the floor before descending', 'Perception', 15, `${world.scoutContact} spots waiting shapes among fern shadows and guides the party around them.`, 'The wait runs long, and hunters close from above.', { renown: 1 }, { encounterKey: 'spiderNest' })
            ]
          ),
          (world) => challengeScene(
            'Lanterns in the Webdark',
            `Cold blue lantern-glow hangs between webbed trees, though no hand holds the lights. The glow points toward a half-buried causeway said to lead to records of ${world.relicName}.`,
            [
              choice('Follow the lantern line', 'Lore', 14, 'The ghost-lights reveal old waystones and a safe corridor through the webdark.', 'The light bends in circles, draining time and resolve.', { lore: 1, hope: 1 }, { shadow: 1 }),
              choice('Cut a direct path through silk', 'Athletics', 13, 'Axes and blades clear a lane before the web can close again.', 'The torn strands tremble, and hungry movement answers from above.', { supplies: 1 }, { encounterKey: 'spiderNest' }),
              choice('Smother the glow with covered mirrors', 'Stealth', 15, 'The unnatural glow is dimmed, denying hunters their lure and line of sight.', 'A mirror slips and flashes, betraying the company in a white flare.', { hope: 1 }, { encounterKey: 'orcPickets' })
            ]
          ),
          (world) => socialScene(
            'Silent Ford of Eryn Galen',
            `At a moonlit ford, Silvan wardens bar passage until the company proves its purpose on the road to ${world.targetSite}.`,
            [
              branch('Offer maps and observations', 'Practical counsel wins measured trust, and a quiet crossing is granted.', { lore: 1, renown: 1 }),
              branch('Trade provisions for guidance', 'Rations change hands and the wardens assign a guide through root-choked paths.', { supplies: -1, hope: 1 }),
              branch('Invoke old alliance oaths', 'Ancient names carry enough weight to open the ford before first light.', { renown: 1, shadow: 1 })
            ]
          ),
          (world) => challengeScene(
            'Stone Circle of the Old Road',
            `A weathered stone circle stands where the forest thins. Runes carved long ago now name both ${world.relicName} and ${world.villainName}, as if the present struggle was foreseen.`,
            [
              choice('Interpret the rune sequence', 'Lore', 15, `${world.scholarContact} deciphers a warning that reveals the enemy’s likely march route.`, 'One broken rune is guessed wrong, and the warning points west instead of east.', { lore: 1, renown: 1 }, { shadow: 1 }),
              choice('Search for hidden offerings', 'Investigation', 13, 'A sealed bronze tube is found beneath lichen, preserving a useful field chart.', 'The search disturbs old stones and triggers a minor collapse.', { supplies: 1 }, { damageParty: 2 }),
              choice('Keep watch while others read', 'Perception', 14, `${world.scoutContact} catches movement beyond the ring and drives off approaching spies before they close.`, 'The watchers are seen too late and escape with news of the company.', { hope: 1 }, { encounterKey: 'orcPickets' })
            ]
          )
        ],
        combatIntro: (world) => combatScene(
          'Webs Across the Moon Path',
          `The moon path opens only to reveal it has already been marked by hunters. Vast webs and snarling shapes block the company’s advance toward ${world.relicName}.`,
          'moonPath',
          'The Greenwood itself seems to close its teeth.'
        ),
        finale: (world) => combatScene(
          'The Vault at Nindalf Hollow',
          `Within a root-choked vault beneath the hollow, the company reaches the last known resting place of ${world.relicName}. Shadow has arrived first.`,
          'vaultHold',
          'If the relic falls here, the northern watchfires go dark.'
        )
      },
      act3: {
        scenes: [
          (world) => challengeScene(
            'The Frozen March',
            `With ${world.relicName} secured, the fellowship rides north through frost-bitten marches toward ${world.finalHold}. The war in the North is no longer rumor.`,
            [
              choice('Ride hard and cut the enemy off', 'Athletics', 14, 'The company reaches the ridge line ahead of the war-band and sees the whole field.', 'Spent mounts and frozen tack slow the charge at the worst hour.', { renown: 1 }, { shadow: 1, damageParty: 2 }),
              choice('Scout every ridge before dawn', 'Perception', 15, 'Frost prints reveal an eastern flanking path no captain below has yet seen.', 'Mist and snow hide the shapes in the low country.', { lore: 1, hope: 1 }, { shadow: 1 }),
              choice('Keep the company warm and sure-footed', 'Medicine', 13, `${world.healerContact} keeps frostbite at bay and steadies the whole march.`, 'Exhaustion still bites and tempers shorten in the wind.', { hope: 1 }, { supplies: -1, shadow: 1 })
            ]
          ),
          (world) => socialScene(
            'Council at ${world.finalHold}',
            `Inside the wind-hammered hall of ${world.finalHold}, the company must decide how to spend its dwindling strength before the last clash begins.`,
            [
              branch('Fortify the walls and hold the gate', 'Stone and discipline turn the hold into a killing ground.', { renown: 1, supplies: -1 }),
              branch('Lead a night raid against the siege camp', 'The bold plan unsettles the enemy and buys a narrow edge.', { hope: 1, shadow: 1 }),
              branch('Spread the burden among every free hand', 'Common folk, scouts, and soldiers alike become part of the defense.', { hope: 1, supplies: 1 })
            ]
          ),
          (world) => challengeScene(
            'Signal Fires of the North',
            `Three cold beacons stand silent above ${world.finalHold}. If lit before midnight, the northern allies will know where to rally.`,
            [
              choice('Scale the cliff path with rope and grit', 'Athletics', 15, 'The first beacon blooms and the valley answers in red gold.', 'Ice shears beneath boots and the climb costs blood and time.', { hope: 1 }, { damageParty: 3 }),
              choice('Rebuild the beacon braziers by lore', 'Investigation', 14, 'Ancient fittings and spare oil are set in order with practiced hands.', 'The ruined braziers drink fuel too greedily and sputter out once.', { supplies: -1, shadow: 1 }),
              choice('Call in the hidden scouts', 'Persuasion', 13, `${world.hiddenAlly} sends swift climbers and the beacons wake together.`, 'The scouts come late and only one beacon catches in time.', { renown: 1 }, { shadow: 1 })
            ]
          ),
          (world) => challengeScene(
            'Snowblind Messenger',
            `A rider from ${world.finalHold} vanishes in a whiteout carrying tally marks for the last reserve companies. Without that count, the defense will commit its strength blindly.`,
            [
              choice('Track by hoof fractures in ice', 'Survival', 14, 'The messenger is found alive in a drift hollow and the tally reaches the gate in time.', 'Wind erases the sign before the trail is complete.', { hope: 1, renown: 1 }, { shadow: 1 }),
              choice('Signal with shield flashes', 'Perception', 13, 'A distant reply answers through the storm and guides rescuers to the rider.', 'The signal is mistaken for enemy scouts and draws hostile archers.', { lore: 1 }, { encounterKey: 'wargShadow' }),
              choice('Push through at full pace', 'Athletics', 15, 'The company breaks the storm edge and reaches the rider before frost claims him.', 'The charge exhausts the party and leaves wounds under armor.', { renown: 1 }, { damageParty: 2, shadow: 1 })
            ]
          ),
          (world) => challengeScene(
            'The Broken Ram',
            `Siege carpenters report a shattered ram left outside bow range of ${world.finalHold}. It may be trap, salvage, or both.`,
            [
              choice('Salvage iron bands for the gate', 'Athletics', 13, 'The team strips useful iron and reinforces the inner braces before dusk.', 'The haul takes too long and enemy arrows harry the workers.', { supplies: 1 }, { damageParty: 2 }),
              choice('Inspect for hidden charges', 'Investigation', 14, `${world.scholarContact} finds black powder flasks buried in the axle timber and neutralizes them.`, 'A missed flask bursts, sowing panic along the wall.', { renown: 1 }, { shadow: 1, damageParty: 2 }),
              choice('Burn it where it lies', 'Survival', 12, 'Pitch catches fast, and the smoke screen buys precious minutes for the defenders.', 'The smoke turns with the wind and blinds friendly archers instead.', { hope: 1 }, { shadow: 1 })
            ]
          ),
          (world) => socialScene(
            'Mustering the Hillfolk',
            `Before the final horn, outlying hillfolk clans arrive at ${world.finalHold} demanding clear terms before they commit spears to the line.`,
            [
              branch('Promise shared stores after the siege', 'The clans accept and post two spear groups at the eastern breach.', { supplies: -1, renown: 1 }),
              branch('Honor their elders before the host', 'Public respect seals the pact, and morale rises across the wall.', { hope: 1, renown: 1 }),
              branch('Assign them to mobile reserve', 'They keep freedom of movement and strike where pressure is greatest.', { lore: 1, shadow: 1 })
            ]
          )
        ],
        combatIntro: (world) => combatScene(
          'The Outer Breach',
          `The enemy reaches the outer stones of ${world.finalHold} before the full host can gather. The fellowship must break the breach itself.`,
          'breachHold',
          'There is no room left for silence.'
        ),
        finale: (world) => combatScene(
          'The Last Horn at ${world.finalHold}',
          `When the last horn sounds, ${world.villainName} steps through smoke and snow to claim ${world.relicName}. The fellowship makes its final stand beneath the battered northern banner.`,
          'finalHorn',
          'The North will remember what happens here.'
        )
      }
    };

    const dom = {
      menuScreen: document.getElementById('menuScreen'),
      newGameBtn: document.getElementById('newGameBtn'),
      loadGameBtn: document.getElementById('loadGameBtn'),
      loadLabel: document.getElementById('loadLabel'),
      clearSaveBtn: document.getElementById('clearSaveBtn'),
      playerCharacterSelect: document.getElementById('playerCharacterSelect'),
      seedPreview: document.getElementById('seedPreview'),
      campaignSummary: document.getElementById('campaignSummary'),
      overlayScreen: document.getElementById('overlayScreen'),
      overlayTitle: document.getElementById('overlayTitle'),
      overlayBody: document.getElementById('overlayBody'),
      overlayActions: document.getElementById('overlayActions'),
      actBadge: document.getElementById('actBadge'),
      chapterBadge: document.getElementById('chapterBadge'),
      resourceBadge: document.getElementById('resourceBadge'),
      soundtrackToggle: document.getElementById('soundtrackToggle'),
      soundtrackVolume: document.getElementById('soundtrackVolume'),
      gameZoom: document.getElementById('gameZoom'),
      gameZoomValue: document.getElementById('gameZoomValue'),
      sceneTitle: document.getElementById('sceneTitle'),
      sceneSubtitle: document.getElementById('sceneSubtitle'),
      progressRow: document.getElementById('progressRow'),
      sceneArtCanvas: document.getElementById('sceneArtCanvas'),
      sceneMapCanvas: document.getElementById('sceneMapCanvas'),
      sceneVisualCaption: document.getElementById('sceneVisualCaption'),
      sceneMapCaption: document.getElementById('sceneMapCaption'),
      encounterBoard: document.getElementById('encounterBoard'),
      narrativeLog: document.getElementById('narrativeLog'),
      storyPanel: document.querySelector('.story-panel'),
      choicesWrap: document.querySelector('.choices-wrap'),
      choicesLabel: document.getElementById('choicesLabel'),
      choicesGrid: document.getElementById('choicesGrid'),
      partyList: document.getElementById('partyList'),
      dieValue: document.getElementById('dieValue'),
      dieCaption: document.getElementById('dieCaption'),
      rollBreakdown: document.getElementById('rollBreakdown'),
      rollLog: document.getElementById('rollLog'),
      actionLog: document.getElementById('actionLog'),
      saveStatus: document.getElementById('saveStatus')
    };

    let state = null;
    let busy = false;
    let soundtrackEnabled = localStorage.getItem(MUSIC_PREF_KEY) !== 'off';
    let soundtrackVolume = clamp(Number(localStorage.getItem(MUSIC_VOLUME_KEY) || 35), 0, 100);
    let gameZoom = clamp(Number(localStorage.getItem(ZOOM_PREF_KEY) || 115), 100, 125);
    let selectedPlayerCharacterId = 'player';
    let youtubeApiReady = false;
    let youtubePlayer = null;
    let youtubePlayerReady = false;
    let youtubePlayerPromise = null;
    let localSceneImage = null;
    let localSceneImageStatus = 'idle';
    let localSceneArtAttemptQueue = [];
    let lastStoryEntryKey = '';
    let lastActionEntryText = '';
    let lastRollEntryText = '';
    const generatedSceneCache = new Map();
    const generatedMapCache = new Map();

    function resetLocalSceneArtState() {
      localSceneImage = null;
      localSceneImageStatus = 'idle';
      localSceneArtAttemptQueue = [];
    }

    function buildLocalSceneArtAttemptQueue() {
      const total = LOCAL_SCENE_ART_SOURCES.length;
      if (!total) return [];
      const seedBase = state?.seed ? String(state.seed) : String(Date.now());
      const startIndex = hashSeed(`${seedBase}:scene-art`) % total;
      const ordered = [];
      for (let offset = 0; offset < total; offset += 1) {
        ordered.push(LOCAL_SCENE_ART_SOURCES[(startIndex + offset) % total]);
      }
      return ordered;
    }

    function nextLocalSceneArtSource() {
      if (!localSceneArtAttemptQueue.length) {
        localSceneArtAttemptQueue = buildLocalSceneArtAttemptQueue();
      }
      return localSceneArtAttemptQueue.shift() || null;
    }

    function hashSeed(text) {
      let hash = 2166136261;
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    }

    function nextRngValue(seedState) {
      let t = seedState + 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      const next = ((t ^ (t >>> 14)) >>> 0);
      return [next, next / 4294967296];
    }

    function random() {
      const [nextState, value] = nextRngValue(state.rngState);
      state.rngState = nextState;
      return value;
    }

    function randomInt(min, max) {
      return Math.floor(random() * (max - min + 1)) + min;
    }

    function pick(list) {
      return list[Math.floor(random() * list.length)];
    }

    function shuffle(list) {
      const copy = list.slice();
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
      }
      return copy;
    }

    function abilityMod(score) {
      return Math.floor((score - 10) / 2);
    }

    function formatModifier(value) {
      return value >= 0 ? `+${value}` : String(value);
    }

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function deepClone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function updateSoundtrackToggle() {
      dom.soundtrackToggle.textContent = soundtrackEnabled ? 'Music On' : 'Music Off';
      dom.soundtrackToggle.setAttribute('aria-pressed', soundtrackEnabled ? 'true' : 'false');
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function updateSoundtrackVolumeUi() {
      dom.soundtrackVolume.value = String(soundtrackVolume);
    }

    function applyGameZoom() {
      const zoomFactor = gameZoom / 100;
      document.documentElement.style.setProperty('--game-zoom', String(zoomFactor));
    }

    function updateGameZoomUi() {
      if (dom.gameZoom) dom.gameZoom.value = String(gameZoom);
      if (dom.gameZoomValue) dom.gameZoomValue.textContent = `${gameZoom}%`;
    }

    function updateGameZoom(value) {
      gameZoom = clamp(Number(value), 100, 125);
      localStorage.setItem(ZOOM_PREF_KEY, String(gameZoom));
      updateGameZoomUi();
      applyGameZoom();
    }

    function applyYoutubeVolume() {
      if (youtubePlayerReady && youtubePlayer && typeof youtubePlayer.setVolume === 'function') {
        youtubePlayer.setVolume(soundtrackVolume);
      }
    }

    function loadYoutubeApi() {
      if (youtubePlayerPromise) return youtubePlayerPromise;
      youtubePlayerPromise = new Promise((resolve) => {
        if (window.YT && window.YT.Player) {
          youtubeApiReady = true;
          resolve();
          return;
        }
        const previousReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          youtubeApiReady = true;
          if (typeof previousReady === 'function') previousReady();
          resolve();
        };
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
      });
      return youtubePlayerPromise;
    }

    async function ensureYoutubePlayer() {
      if (youtubePlayerReady && youtubePlayer) return youtubePlayer;
      await loadYoutubeApi();
      return new Promise((resolve) => {
        if (youtubePlayerReady && youtubePlayer) {
          resolve(youtubePlayer);
          return;
        }
        youtubePlayer = new window.YT.Player('youtubeSoundtrackPlayer', {
          width: '1',
          height: '1',
          videoId: YOUTUBE_SOUNDTRACK_ID,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            loop: 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            playlist: YOUTUBE_SOUNDTRACK_ID
          },
          events: {
            onReady: () => {
              youtubePlayerReady = true;
              applyYoutubeVolume();
              resolve(youtubePlayer);
            },
            onStateChange: (event) => {
              if (!soundtrackEnabled || !window.YT) return;
              if (event.data === window.YT.PlayerState.ENDED) {
                youtubePlayer.seekTo(0);
                youtubePlayer.playVideo();
              }
            }
          }
        });
      });
    }

    async function ensureSoundtrackRunning() {
      if (!soundtrackEnabled) return;
      const player = await ensureYoutubePlayer();
      applyYoutubeVolume();
      if (player && typeof player.playVideo === 'function') {
        player.playVideo();
      }
    }

    async function stopSoundtrackPlayback() {
      if (youtubePlayerReady && youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
        youtubePlayer.pauseVideo();
      }
    }

    async function toggleSoundtrack() {
      soundtrackEnabled = !soundtrackEnabled;
      localStorage.setItem(MUSIC_PREF_KEY, soundtrackEnabled ? 'on' : 'off');
      updateSoundtrackToggle();
      if (soundtrackEnabled) {
        await ensureSoundtrackRunning();
      } else {
        await stopSoundtrackPlayback();
      }
    }

    function updateSoundtrackVolume(value) {
      soundtrackVolume = clamp(Number(value), 0, 100);
      localStorage.setItem(MUSIC_VOLUME_KEY, String(soundtrackVolume));
      updateSoundtrackVolumeUi();
      applyYoutubeVolume();
    }

    function describeSkill(skill) {
      const ability = SKILL_TO_ABILITY[skill] || 'wis';
      const label = ability.toUpperCase();
      return `${skill} (${label})`;
    }

    function diceRoll(dieSize) {
      return randomInt(1, dieSize);
    }

    async function animateDie(label, finalValue) {
      dom.dieCaption.textContent = label;
      for (let index = 0; index < 10; index += 1) {
        dom.dieValue.textContent = String(randomInt(1, 20));
        await sleep(42 + index * 6);
      }
      dom.dieValue.textContent = String(finalValue);
    }

    function getSaveSummary(saveData) {
      if (!saveData) return 'No saved journey has been found in localStorage.';
      return `${saveData.world.title}, ${saveData.actLabel}, scene ${saveData.currentSceneIndex + 1} of ${saveData.campaign.length}.`;
    }

    function updateMenuState() {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        dom.loadGameBtn.disabled = true;
        dom.loadLabel.textContent = 'No saved journey has been found in localStorage.';
        return;
      }
      try {
        const saveData = JSON.parse(raw);
        dom.loadGameBtn.disabled = false;
        dom.loadLabel.textContent = getSaveSummary(saveData);
      } catch (error) {
        dom.loadGameBtn.disabled = true;
        dom.loadLabel.textContent = 'Saved data is unreadable.';
      }
    }

    function setSaveStatus(text) {
      dom.saveStatus.textContent = text;
    }

    function createCharacter(config) {
      const member = {
        id: config.id,
        name: config.name,
        race: config.race,
        className: config.className,
        background: config.background,
        personality: config.personality,
        automation: config.automation,
        level: config.level || 1,
        proficiency: config.proficiency || 2,
        abilities: config.abilities,
        proficientSkills: config.proficientSkills,
        maxHp: config.maxHp,
        hp: config.maxHp,
        ac: config.ac,
        role: config.role,
        blurb: config.blurb,
        playerControlled: Boolean(config.playerControlled),
        limitedPowerReady: true
      };
      return member;
    }

    function getSelectedHeroId() {
      const stored = localStorage.getItem('middleEarthRpgHeroIdV1');
      if (stored) selectedPlayerCharacterId = stored;
      return selectedPlayerCharacterId || 'player';
    }

    function setSelectedHeroId(heroId) {
      selectedPlayerCharacterId = heroId || 'player';
      localStorage.setItem('middleEarthRpgHeroIdV1', selectedPlayerCharacterId);
      if (dom.playerCharacterSelect) {
        dom.playerCharacterSelect.value = selectedPlayerCharacterId;
      }
    }

    function renderHeroPicker() {
      if (!dom.heroPickerGrid) return;
      const heroes = [
        { id: 'player', name: 'Calenhir Ardhorion', race: 'Dunedain', className: 'Ranger', role: 'Skirmisher', blurb: 'A northern ranger who has spent years keeping forgotten roads alive for those fleeing the Shadow.' },
        { id: 'hildi', name: 'Hildi Ironbraid', race: 'Dwarf of the Blue Mountains', className: 'Guardian', role: 'Frontline', blurb: 'A veteran road-guard from the Blue Mountains who keeps count of debts, roads, and blows alike.' },
        { id: 'menelwen', name: 'Menelwen Tinnuiel', race: 'Silvan Elf', className: 'Warden Archer', role: 'Archer', blurb: 'A hidden watcher of Mirkwood’s eastern edges who trusts tracks more than titles.' },
        { id: 'borin', name: 'Borin Valewalker', race: 'Northman', className: 'Spearhand', role: 'Vanguard', blurb: 'A Woodman captain from the Anduin vales who knows every ford, campfire, and warning tale from the narrows to the eaves.' },
        { id: 'seredh', name: 'Seredh Vanyar', race: 'Gondorian', className: 'Lorekeeper', role: 'Support', blurb: 'A lore-keeper sent north with sealed archives and a dangerous memory for old places.' }
      ];
      const activeHeroId = getSelectedHeroId();
      dom.heroPickerGrid.innerHTML = '';
      heroes.forEach((hero) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `hero-btn${hero.id === activeHeroId ? ' selected' : ''}`;
        button.innerHTML = `<strong>${hero.name}</strong><small>${hero.race} ${hero.className} · ${hero.role}</small><small>${hero.blurb}</small>`;
        button.addEventListener('click', () => setSelectedHeroId(hero.id));
        dom.heroPickerGrid.appendChild(button);
      });
    }

    function buildParty(playerCharacterId = 'player') {
      const party = [
        createCharacter({
          id: 'player',
          name: 'Calenhir Ardhorion',
          race: 'Dunedain',
          className: 'Ranger',
          background: 'Warden of the East Road',
          personality: 'Measured, patient, and stubbornly hopeful.',
          automation: 'The player decides Calenhir’s narrative choices and combat actions.',
          abilities: { str: 13, dex: 17, con: 14, int: 12, wis: 15, cha: 11 },
          proficientSkills: ['Survival', 'Perception', 'Stealth', 'Insight'],
          maxHp: 34,
          ac: 15,
          role: 'Skirmisher',
          blurb: 'A northern ranger who has spent years keeping forgotten roads alive for those fleeing the Shadow.'
        }),
        createCharacter({
          id: 'hildi',
          name: 'Hildi Ironbraid',
          race: 'Dwarf of the Blue Mountains',
          className: 'Guardian',
          background: 'Caravan Shield-Marshal',
          personality: 'Dry-witted, practical, and fearless in close quarters.',
          automation: 'Hildi protects the weakest ally and hammers the enemy line.',
          abilities: { str: 17, dex: 10, con: 16, int: 11, wis: 13, cha: 9 },
          proficientSkills: ['Athletics', 'Insight', 'Perception'],
          maxHp: 42,
          ac: 17,
          role: 'Frontline',
          blurb: 'A veteran road-guard from the Blue Mountains who keeps count of debts, roads, and blows alike.'
        }),
        createCharacter({
          id: 'menelwen',
          name: 'Menelwen Tinnuiel',
          race: 'Silvan Elf',
          className: 'Warden Archer',
          background: 'Night Scout of the Eastern Eaves',
          personality: 'Quiet, unsparing, and attuned to every shift in the woods.',
          automation: 'Menelwen strikes first from range and hunts wounded prey.',
          abilities: { str: 10, dex: 18, con: 13, int: 12, wis: 16, cha: 12 },
          proficientSkills: ['Stealth', 'Perception', 'Survival', 'Acrobatics'],
          maxHp: 30,
          ac: 15,
          role: 'Archer',
          blurb: 'A hidden watcher of Mirkwood’s eastern edges who trusts tracks more than titles.'
        }),
        createCharacter({
          id: 'borin',
          name: 'Borin Valewalker',
          race: 'Northman',
          className: 'Spearhand',
          background: 'Woodman Road-Captain',
          personality: 'Warm-hearted, fast to laugh, and faster to leap into danger.',
          automation: 'Borin presses momentum, finishes weak foes, and drives the line forward.',
          abilities: { str: 15, dex: 14, con: 15, int: 10, wis: 12, cha: 13 },
          proficientSkills: ['Athletics', 'Persuasion', 'Survival'],
          maxHp: 36,
          ac: 15,
          role: 'Vanguard',
          blurb: 'A Woodman captain from the Anduin vales who knows every ford, campfire, and warning tale from the narrows to the eaves.'
        }),
        createCharacter({
          id: 'seredh',
          name: 'Seredh Vanyar',
          race: 'Gondorian',
          className: 'Lorekeeper',
          background: 'Scholar of Minas Tirith',
          personality: 'Curious, composed, and willing to brave danger for truth.',
          automation: 'Seredh heals the faltering and punishes shadow with old craft.',
          abilities: { str: 9, dex: 12, con: 13, int: 17, wis: 16, cha: 14 },
          proficientSkills: ['Lore', 'Investigation', 'Medicine', 'Persuasion'],
          maxHp: 28,
          ac: 13,
          role: 'Support',
          blurb: 'A lore-keeper sent north with sealed archives and a dangerous memory for old places.'
        })
      ];
      const selectedMember = party.find((member) => member.id === playerCharacterId) || party[0];
      party.forEach((member) => {
        member.playerControlled = member.id === selectedMember.id;
      });
      party.sort((left, right) => Number(right.playerControlled) - Number(left.playerControlled));
      return party;
    }

    function skillBonus(member, skill) {
      const ability = SKILL_TO_ABILITY[skill] || 'wis';
      const proficiency = member.proficientSkills.includes(skill) ? member.proficiency : 0;
      return abilityMod(member.abilities[ability]) + proficiency;
    }

    function attackBonus(member) {
      if (member.className === 'Guardian' || member.className === 'Spearhand') {
        return abilityMod(member.abilities.str) + member.proficiency;
      }
      if (member.className === 'Lorekeeper') {
        return abilityMod(member.abilities.int) + member.proficiency;
      }
      return abilityMod(member.abilities.dex) + member.proficiency;
    }

    function damageProfile(member, special = false) {
      if (member.className === 'Guardian') return special ? ['1d10', 4] : ['1d8', 3];
      if (member.className === 'Warden Archer') return special ? ['1d10', 4] : ['1d8', 3];
      if (member.className === 'Spearhand') return special ? ['1d10', 3] : ['1d8', 3];
      if (member.className === 'Lorekeeper') return special ? ['1d8', 4] : ['1d6', 3];
      return special ? ['1d10', 4] : ['1d8', 3];
    }

    function rollFormula(formula) {
      const [countText, dieText] = formula.split('d');
      const count = Number(countText);
      const die = Number(dieText);
      let total = 0;
      const rolls = [];
      for (let index = 0; index < count; index += 1) {
        const value = diceRoll(die);
        rolls.push(value);
        total += value;
      }
      return { total, rolls };
    }

    function logAction(text) {
      if (text === lastActionEntryText) return;
      lastActionEntryText = text;
      state.actionLog.push(text);
      if (state.actionLog.length > 140) state.actionLog.shift();
      renderActionLog();
    }

    function logRoll(text) {
      if (text === lastRollEntryText) return;
      lastRollEntryText = text;
      state.rollLog.push(text);
      if (state.rollLog.length > 140) state.rollLog.shift();
      renderRollLog();
    }

    function addStoryEntry(title, text) {
      const entryKey = `${title}\n${text}`;
      if (entryKey === lastStoryEntryKey) return;
      lastStoryEntryKey = entryKey;
      state.storyLog.push({ title, text });
      if (state.storyLog.length > 80) state.storyLog.shift();
      renderNarrativeLog();
    }

    function applyResourceEffects(effects = {}) {
      state.resources.supplies = clamp(state.resources.supplies + (effects.supplies || 0), 0, 12);
      state.resources.hope = clamp(state.resources.hope + (effects.hope || 0), 0, 12);
      state.resources.shadow = clamp(state.resources.shadow + (effects.shadow || 0), 0, 12);
      if (effects.renown) state.resources.renown += effects.renown;
      if (effects.lore) state.resources.lore += effects.lore;
      if (effects.damageParty) {
        state.party.filter((member) => member.hp > 0).forEach((member) => {
          member.hp = Math.max(1, member.hp - effects.damageParty);
        });
      }
      if (effects.healParty) {
        state.party.forEach((member) => {
          member.hp = Math.min(member.maxHp, member.hp + effects.healParty);
        });
      }
    }

    function branch(label, outcomeText, effects) {
      return { type: 'branch', label, outcomeText, effects };
    }

    function choice(label, skill, dc, successText, failureText, successEffects, failureEffects) {
      return {
        type: 'skill',
        label,
        skill,
        dc,
        successText,
        failureText,
        successEffects,
        failureEffects
      };
    }

    function challengeScene(title, text, choices) {
      return { kind: 'challenge', title, text, choices, milestone: true };
    }

    function socialScene(title, text, branches) {
      return { kind: 'social', title, text, choices: branches, milestone: true };
    }

    function combatScene(title, text, encounterKey, leadIn) {
      return { kind: 'combat', title, text, encounterKey, leadIn, milestone: true };
    }

    function createWorld(seedNumber) {
      const worldRngState = hashSeed(String(seedNumber));
      const preview = { rngState: worldRngState };
      const useRandom = () => {
        const [nextState, value] = nextRngValue(preview.rngState);
        preview.rngState = nextState;
        return value;
      };
      const pickLocal = (items) => items[Math.floor(useRandom() * items.length)];
      const world = {
        seed: seedNumber,
        title: 'Shadows of the Greenwood March',
        era: 'Autumn, TA 3018',
        theater: 'The North and the East Bight of Mirkwood',
        outpost: pickLocal(['Talan Tinnu', 'Hearthpost of Fennas', 'The Hidden Hall of Caras Naurad']),
        targetSite: pickLocal(['Seregon Ford', 'The Hollow of Nindalf', 'The Narrows of Nen Dolen']),
        finalHold: pickLocal(['Dol Ringwest', 'The Frost Hall of Garthron', 'Echad Torath']),
        relicName: pickLocal(['the Lantern of Voros', 'the Moon-Sigil of Oropher', 'the Blackwood Seal']),
        threatName: pickLocal(['the Black Uruks of Dol Guldur', 'the East Bight war-band', 'the hunters of the Shadow Road']),
        villainName: pickLocal(['Maugrath One-Eye', 'Kharzug of the Ash Spears', 'Vorath the Fell Captain']),
        scoutContact: pickLocal(['Menelwen', 'Tathren of the Eaves', 'Rhevas the Silent']),
        scholarContact: pickLocal(['Seredh', 'Lindirion the Archivist', 'Berethor of the North Tower']),
        healerContact: pickLocal(['Seredh', 'Mira of the Vales', 'Faelwen the Herb-Singer']),
        hiddenAlly: pickLocal(['Aeradar of the Moon Paths', 'Gilneth the Oak Warden', 'Erynor of the Western Eaves'])
      };
      return world;
    }

    function getActCombatModifiers(actLabel) {
      const actTier = { 'Act I': 0, 'Act II': 1, 'Act III': 2, 'Act IV': 3 }[actLabel] ?? 0;
      return {
        attackBonus: [0, 1, 1, 2][actTier] || 0,
        damageBonus: [0, 1, 1, 2][actTier] || 0,
        hpMultiplier: [0.96, 1.02, 1.08, 1.14][actTier] || 1,
        acBonus: [0, 0, 1, 1][actTier] || 0
      };
    }

    function createEncounter(key, actLabel = 'Act I') {
      const packs = {
        orcPickets: ['orcSkirmisher', 'orcSkirmisher', 'wargRunner'],
        spiderNest: ['spiderHunter', 'spiderHunter'],
        wargShadow: ['wargRunner', 'wargRunner'],
        tombAwakens: ['tombWight', 'orcSkirmisher'],
        orcRaid: ['orcSkirmisher', 'orcSkirmisher', 'wargRunner', 'easterlingBlade'],
        fordStand: ['easterlingBlade', 'easterlingBlade', 'blackUruk'],
        moonPath: ['spiderHunter', 'spiderHunter', 'orcSkirmisher'],
        vaultHold: ['tombWight', 'blackUruk', 'orcSkirmisher'],
        breachHold: ['easterlingBlade', 'easterlingBlade', 'blackUruk'],
        finalHorn: ['blackUruk', 'easterlingBlade', 'fellCaptain']
      };
      const modifiers = getActCombatModifiers(actLabel);
      return packs[key].map((enemyId, index) => {
        const template = BESTIARY[enemyId];
        const scaledHp = Math.max(1, Math.round(template.maxHp * modifiers.hpMultiplier));
        return {
          id: `${enemyId}-${key}-${index}`,
          name: template.name,
          role: template.role,
          ac: template.ac + modifiers.acBonus,
          hp: scaledHp,
          maxHp: scaledHp,
          attackBonus: template.attackBonus + modifiers.attackBonus,
          damageDie: template.damageDie,
          damageBonus: template.damageBonus + modifiers.damageBonus,
          flavor: template.flavor,
          alive: true
        };
      });
    }

    function buildCampaign(world) {
      const scenes = [];
      const act4Pools = [STORY_POOL.act1, STORY_POOL.act2, STORY_POOL.act3];
      const act4Pool = act4Pools[hashSeed(`${world.seed}:act4`) % act4Pools.length];
      const actOrder = [
        { id: 'Act I', subtitle: 'The Ashen Narrows', pool: STORY_POOL.act1 },
        { id: 'Act II', subtitle: 'Roots Beneath the Greenwood', pool: STORY_POOL.act2 },
        { id: 'Act III', subtitle: 'The Last Horn of the North', pool: STORY_POOL.act3 },
        { id: 'Act IV', subtitle: 'Embers After Midnight', pool: act4Pool }
      ];

      const actIntroTitles = [
        'The Watch Begins',
        'Into the Greenwood',
        'The Northern Call',
        'The Long Night Deepens'
      ];

      const actIntroTexts = [
        `The hidden outpost of ${world.outpost} has heard too many quiet alarms. Calenhir Ardhorion and four companions ride at first light to discover whether ${world.threatName.toLowerCase()} truly marches in the North. Their first charge: keep the hidden roads alive, find ${world.relicName}, and deny ${world.villainName} any chance to claim it.`,
        `With the first road-lines shaken but not broken, the fellowship turns inward beneath the Greenwood. There, the trail of ${world.relicName} narrows toward old halls, hidden moon paths, and the watchers who still remember the forest before the shadow came.`,
        `The relic is found, but the war it warns against has already begun. Frost, smoke, and horns of battle carry the company toward ${world.finalHold}, where the North itself may either rally or break.`,
        `The horns have not yet fallen silent. In the black hours after midnight, scattered fires, hidden roads, and desperate vows decide whether victory can be held or slips back into shadow before dawn.`
      ];

      actOrder.forEach((act, actIndex) => {
        const sceneFunctions = shuffle(act.pool.scenes);
        scenes.push({
          act: act.id,
          subtitle: act.subtitle,
          chapter: scenes.length + 1,
          kind: 'story',
          title: actIntroTitles[actIndex] || `Act ${actIndex + 1}`,
          text: actIntroTexts[actIndex] || actIntroTexts[actIntroTexts.length - 1],
          choices: [branch('Ride onward', 'The company tightens straps, checks lamplight, and pushes into the next stretch of the campaign.', { hope: 1 })],
          milestone: true
        });
        sceneFunctions.slice(0, 3).forEach((factory) => {
          const scene = factory(world);
          scene.act = act.id;
          scene.subtitle = act.subtitle;
          scene.chapter = scenes.length + 1;
          scenes.push(scene);
        });
        const combatLead = act.pool.combatIntro(world);
        combatLead.act = act.id;
        combatLead.subtitle = act.subtitle;
        combatLead.chapter = scenes.length + 1;
        scenes.push(combatLead);
        const finale = act.pool.finale(world);
        finale.act = act.id;
        finale.subtitle = act.subtitle;
        finale.chapter = scenes.length + 1;
        scenes.push(finale);
      });
      return scenes;
    }

    function createNewState(playerCharacterId = selectedPlayerCharacterId) {
      const seedNumber = Date.now();
      const world = createWorld(seedNumber);
      const newState = {
        version: VERSION,
        seed: seedNumber,
        rngState: hashSeed(`${seedNumber}:live`),
        world,
        party: buildParty(playerCharacterId),
        resources: { supplies: 4, hope: 3, shadow: 0, renown: 0, lore: 0 },
        campaign: [],
        currentSceneIndex: 0,
        sceneStarted: false,
        mode: 'story',
        storyLog: [],
        actionLog: [],
        rollLog: [],
        combat: null,
        awaitingPlayerAction: false,
        pendingCombatAdvance: false,
        lastAutoSaveReason: 'No save yet',
        ended: false
      };
      state = newState;
      resetLocalSceneArtState();
      state.campaign = buildCampaign(world);
      addStoryEntry('A New Patrol', `Seed ${seedNumber} has been spun into a fresh campaign through ${world.theater}.`);
      return newState;
    }

    function getCurrentScene() {
      return state.campaign[state.currentSceneIndex] || null;
    }

    function renderParty() {
      dom.partyList.innerHTML = '';
      const currentTurnRef = state?.combat ? state.combat.turnOrder[state.combat.turnIndex] : null;
      const currentActor = currentTurnRef ? getCombatActor(currentTurnRef) : null;
      const orderedParty = state.party.slice().sort((left, right) => Number(right.playerControlled) - Number(left.playerControlled));
      orderedParty.forEach((member) => {
        const card = document.createElement('article');
        const isActiveTurn = Boolean(currentActor && currentActor.id === member.id);
        const isDetailsOpen = Boolean(member.cardExpanded);
        card.className = `party-card${member.playerControlled ? ' player' : ''}${isActiveTurn ? ' active-turn' : ''}`;
        const hpPercent = (member.hp / member.maxHp) * 100;
        card.innerHTML = `
          <div class="party-topline">
            <div>
              <div class="party-name">${member.name}${member.playerControlled ? '<span class="player-id-badge">You</span>' : ''}</div>
              <div class="party-role">${member.race} ${member.className} · Level ${member.level}</div>
            </div>
            <div class="tag party-ac">AC ${member.ac}</div>
          </div>
          <div class="hp-row"><span>HP ${member.hp}/${member.maxHp}</span><span>${member.role}</span></div>
          <div class="hp-track"><div class="hp-fill" style="width:${hpPercent}%; background:${hpPercent < 34 ? 'linear-gradient(90deg,#c86563,#ef8d7c)' : 'linear-gradient(90deg,#74c77b,#bddf8e)'}"></div></div>
          <button class="party-toggle" type="button" aria-expanded="${isDetailsOpen ? 'true' : 'false'}">${isDetailsOpen ? 'Show less' : 'Show more'}</button>
          <div class="party-details${isDetailsOpen ? '' : ' is-collapsed'}">
            <div class="party-tags">
              <span class="tag">${member.background}</span>
              <span class="tag">${member.personality}</span>
            </div>
            <p class="party-blurb">${member.blurb}</p>
          </div>
        `;
        const toggleButton = card.querySelector('.party-toggle');
        const detailsWrap = card.querySelector('.party-details');
        toggleButton.addEventListener('click', () => {
          member.cardExpanded = !(member.cardExpanded ?? member.playerControlled);
          renderParty();
          const updatedCard = dom.partyList.querySelector(`.party-card${member.playerControlled ? '.player' : ''}`);
          if (updatedCard) {
            const updatedToggle = updatedCard.querySelector('.party-toggle');
            if (updatedToggle) updatedToggle.focus({ preventScroll: true });
          }
        });
        dom.partyList.appendChild(card);
      });
    }

    function renderNarrativeLog() {
      dom.narrativeLog.innerHTML = '';
      state.storyLog.forEach((entry) => {
        const wrapper = document.createElement('article');
        wrapper.className = 'story-entry';
        wrapper.innerHTML = `<h4>${entry.title}</h4><p>${entry.text}</p>`;
        dom.narrativeLog.appendChild(wrapper);
      });
      dom.narrativeLog.scrollTop = dom.narrativeLog.scrollHeight;
    }

    function renderActionLog() {
      dom.actionLog.innerHTML = '';
      state.actionLog.forEach((entry) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'action-entry';
        wrapper.innerHTML = entry;
        dom.actionLog.appendChild(wrapper);
      });
      dom.actionLog.scrollTop = dom.actionLog.scrollHeight;
    }

    function renderRollLog() {
      if (!dom.rollLog) return;
      dom.rollLog.innerHTML = '';
      state.rollLog.slice().reverse().forEach((entry) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'action-entry';
        wrapper.innerHTML = entry;
        dom.rollLog.appendChild(wrapper);
      });
    }

    function renderEncounterBoard() {
      if (!state.combat) {
        dom.encounterBoard.classList.remove('visible');
        dom.encounterBoard.innerHTML = '';
        return;
      }
      dom.encounterBoard.classList.add('visible');
      dom.encounterBoard.innerHTML = '';
      const turnText = getCombatTurnText();
      const currentTurnRef = state.combat.turnOrder[state.combat.turnIndex];
      const currentActor = currentTurnRef ? getCombatActor(currentTurnRef) : null;
      if (turnText) {
        const turnBanner = document.createElement('div');
        turnBanner.className = 'combat-turn-banner';
        turnBanner.textContent = turnText;
        dom.encounterBoard.appendChild(turnBanner);
      }
      state.combat.enemies.forEach((enemy) => {
        const card = document.createElement('article');
        const isActiveTurn = Boolean(currentActor && currentActor.id === enemy.id);
        card.className = `enemy-card${enemy.alive ? '' : ' defeated'}${isActiveTurn ? ' active-turn' : ''}`;
        const hpPercent = enemy.alive ? Math.max(0, (enemy.hp / enemy.maxHp) * 100) : 0;
        card.innerHTML = `
          <h4>${enemy.name}</h4>
          <p>${enemy.flavor}</p>
          <div class="hp-row" style="margin-top:10px;"><span>HP ${Math.max(0, enemy.hp)}/${enemy.maxHp}</span><span>AC ${enemy.ac}</span></div>
          <div class="hp-track"><div class="hp-fill" style="width:${hpPercent}%; background:linear-gradient(90deg,#d26b61,#ffb088);"></div></div>
        `;
        dom.encounterBoard.appendChild(card);
      });
    }

    function renderProgress() {
      dom.progressRow.innerHTML = '';
      const scene = getCurrentScene();
      const tags = [scene?.act || 'Act', scene?.subtitle || '', `Scene ${state.currentSceneIndex + 1}/${state.campaign.length}`];
      tags.filter(Boolean).forEach((text) => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = text;
        dom.progressRow.appendChild(tag);
      });
    }

    function getScenePalette(scene) {
      if (!scene) {
        return { skyTop: '#22304f', skyBottom: '#4c6b77', groundTop: '#3d4c35', groundBottom: '#1b2116', accent: '#d8bd84', danger: '#b56b5b' };
      }
      if (scene.act === 'Act I') {
        return scene.kind === 'combat'
          ? { skyTop: '#3a2230', skyBottom: '#7b4f39', groundTop: '#3d352e', groundBottom: '#18140f', accent: '#f0c77d', danger: '#d8715a' }
          : { skyTop: '#34435d', skyBottom: '#90a1aa', groundTop: '#46553f', groundBottom: '#20261b', accent: '#d4bb82', danger: '#b36b4d' };
      }
      if (scene.act === 'Act II') {
        return scene.kind === 'combat'
          ? { skyTop: '#1e2738', skyBottom: '#31444a', groundTop: '#273126', groundBottom: '#10150e', accent: '#8ecf94', danger: '#9e6b54' }
          : { skyTop: '#273447', skyBottom: '#536b68', groundTop: '#314230', groundBottom: '#131910', accent: '#89bf8e', danger: '#87624f' };
      }
      return scene.kind === 'combat'
        ? { skyTop: '#2d3047', skyBottom: '#93807a', groundTop: '#5c5a63', groundBottom: '#1c1b21', accent: '#f6d08a', danger: '#c86969' }
        : { skyTop: '#54607b', skyBottom: '#c2c7d1', groundTop: '#676763', groundBottom: '#272727', accent: '#f0d0a0', danger: '#9e7874' };
    }

    function drawPixelRect(ctx, x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }

    function drawCanvasStatusLabel(ctx, text, tone = 'info') {
      const x = 10;
      const y = 10;
      const padX = 9;
      const padY = 6;
      const fontSize = 12;
      const bg = tone === 'error' ? 'rgba(102, 40, 40, 0.78)' : 'rgba(20, 28, 42, 0.76)';
      const border = tone === 'error' ? 'rgba(214, 122, 122, 0.48)' : 'rgba(129, 175, 232, 0.42)';
      const fg = tone === 'error' ? '#ffd7d2' : '#d8e8ff';

      ctx.save();
      ctx.font = `600 ${fontSize}px Segoe UI`;
      ctx.textBaseline = 'top';
      const textWidth = Math.ceil(ctx.measureText(text).width);
      const w = textWidth + padX * 2;
      const h = fontSize + padY * 2;

      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = fg;
      ctx.fillText(text, x + padX, y + padY);
      ctx.restore();
    }

    function getGenerationDimensions(targetWidth, targetHeight, maxLongEdge) {
      const rawWidth = Math.max(1, Math.round(targetWidth || 1));
      const rawHeight = Math.max(1, Math.round(targetHeight || 1));
      const longEdge = Math.max(rawWidth, rawHeight);
      const scale = longEdge > maxLongEdge ? maxLongEdge / longEdge : 1;
      const width = Math.max(256, Math.round(rawWidth * scale));
      const height = Math.max(128, Math.round(rawHeight * scale));
      return { width, height };
    }

    function buildSceneImagePrompt(scene, compact = false) {
      if (!scene || !state?.world) return null;
      const storySnippet = (scene.text || '').replace(/\s+/g, ' ').trim().slice(0, compact ? 80 : 220);
      const mood = scene.kind === 'combat'
        ? 'battle atmosphere'
        : scene.kind === 'social'
          ? 'fellowship gathering atmosphere'
          : 'exploration atmosphere';
      if (compact) {
        return [
          'fantasy landscape concept art',
          'middle-earth inspired',
          `${scene.act || 'Act'} ${scene.subtitle || ''}`.trim(),
          scene.title || 'travel scene',
          mood,
          storySnippet,
          'wide cinematic shot, no text, no letters, no typography, no logo, no watermark, no signature'
        ].join(', ');
      }
      return [
        'detailed fantasy environment concept art',
        'middle-earth inspired wilderness, no modern elements',
        `${scene.act || 'Act'} ${scene.subtitle || ''}`.trim(),
        scene.title || 'Travel scene',
        mood,
        storySnippet,
        `location references: ${state.world.outpost}, ${state.world.targetSite}, ${state.world.finalHold}`,
        'dramatic lighting, painterly realism, wide landscape composition, no text, no letters, no typography, no captions, no logo, no watermark, no signature'
      ].join(', ');
    }

    function getLocalSceneArtImage() {
      if (localSceneImageStatus === 'loaded' && localSceneImage) return localSceneImage;
      if (localSceneImageStatus === 'loading') return null;
      const source = nextLocalSceneArtSource();
      if (!source) {
        localSceneImageStatus = 'error';
        return null;
      }
      localSceneImageStatus = 'loading';
      localSceneImage = new Image();
      localSceneImage.onload = () => {
        localSceneImageStatus = 'loaded';
        renderSceneVisuals();
      };
      localSceneImage.onerror = () => {
        const retrySource = nextLocalSceneArtSource();
        if (!retrySource) {
          localSceneImageStatus = 'error';
          return;
        }
        localSceneImage.src = encodeURI(retrySource);
      };
      localSceneImage.src = encodeURI(source);
      return null;
    }

    function getSceneImageUrl(scene, profile = 'full', targetWidth = 1600, targetHeight = 600) {
      const prompt = buildSceneImagePrompt(scene, profile === 'compact');
      if (!prompt) return null;
      const width = SCENE_GENERATION_WIDTH;
      const height = SCENE_GENERATION_HEIGHT;
      const seed = Math.max(1, hashSeed(`${state.seed}:${state.currentSceneIndex}:${scene.kind || 'story'}`));
      if (profile === 'minimal') {
        const minimalPrompt = `${scene.title || 'fantasy landscape'}, middle-earth style, cinematic, no text, no letters, no logo, no watermark`;
        return `${SCENE_IMAGE_BASE_URL}${encodeURIComponent(minimalPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
      }
      const query = profile === 'compact'
        ? `?width=${width}&height=${height}&seed=${seed}&nologo=true&model=sana`
        : `?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;
      return `${SCENE_IMAGE_BASE_URL}${encodeURIComponent(prompt)}${query}`;
    }

    function getGeneratedSceneImage(scene, targetWidth, targetHeight) {
      if (!scene) return null;
      const widthKey = SCENE_GENERATION_WIDTH;
      const heightKey = SCENE_GENERATION_HEIGHT;
      const key = `${state.seed}:${state.currentSceneIndex}:${scene.kind || 'story'}`;
      const cached = generatedSceneCache.get(key);
      if (cached) {
        if (cached.status !== 'error') return cached;
        const sinceFail = Date.now() - (cached.failedAt || 0);
        const retryDelay = Math.min(30000, 4000 * ((cached.retryCount || 0) + 1));
        if (sinceFail < retryDelay) return cached;
        generatedSceneCache.delete(key);
      }

      const profiles = ['full', 'compact', 'minimal'];
      const image = new Image();
      const entry = {
        status: 'loading',
        image,
        key,
        attempt: 0,
        timer: null,
        retryCount: (cached?.retryCount || 0),
        failedAt: 0
      };
      generatedSceneCache.set(key, entry);

      const queueNextAttempt = () => {
        entry.attempt += 1;
        if (entry.timer) {
          clearTimeout(entry.timer);
          entry.timer = null;
        }
        if (entry.attempt < profiles.length) {
          const retryUrl = getSceneImageUrl(scene, profiles[entry.attempt], widthKey, heightKey);
          if (retryUrl) {
            entry.status = 'loading';
            image.src = retryUrl;
            return;
          }
        }
        entry.status = 'error';
        entry.retryCount = (entry.retryCount || 0) + 1;
        entry.failedAt = Date.now();
        renderSceneVisuals();
      };

      const armTimeout = () => {
        if (entry.timer) clearTimeout(entry.timer);
        entry.timer = setTimeout(() => {
          if (entry.status !== 'loaded') queueNextAttempt();
          }, 20000);
      };

      image.onload = () => {
        if (entry.timer) {
          clearTimeout(entry.timer);
          entry.timer = null;
        }
        entry.status = 'loaded';
        renderSceneVisuals();
      };
      image.onerror = () => {
        queueNextAttempt();
      };
      const firstUrl = getSceneImageUrl(scene, profiles[0], widthKey, heightKey);
      if (!firstUrl) return null;
      armTimeout();
      image.src = firstUrl;
      return entry;
    }

    function buildMapImagePrompt(compact = false) {
      if (!state?.world) return null;
      const routeSummary = `${state.world.outpost}, ${state.world.targetSite}, ${state.world.finalHold}`;
      if (compact) {
        return [
          'high quality fantasy top-down map',
          'middle-earth inspired northern wilds',
          routeSummary,
          'campaign route planning map',
          'stone roads, forests, rivers, rich terrain detail, no labels, no text, no logo'
        ].join(', ');
      }
      return [
        'ultra detailed fantasy cartography illustration',
        'middle-earth inspired top-down terrain map',
        state.world.theater,
        `campaign route: ${routeSummary}`,
        'mixed woodland, marsh, and northern highland terrain',
        'stone roads, forests, rivers, contour-rich terrain shading, painterly realism, no modern elements, no text, no letters, no logo, no watermark'
      ].join(', ');
    }

    function getMapImageUrl(profile = 'full', targetWidth = 640, targetHeight = 240) {
      const prompt = buildMapImagePrompt(profile === 'compact');
      if (!prompt) return null;
      const dims = getGenerationDimensions(targetWidth || 640, targetHeight || 240, MINIMAP_GENERATION_LONG_EDGE);
      const width = dims.width;
      const height = dims.height;
      const seed = Math.max(1, hashSeed(`${state.seed}:campaign-map`));
      if (profile === 'minimal') {
        const minimalPrompt = `${state.world.theater}, fantasy campaign map, top-down map, stone roads and forests, no text, no letters, no logo, no watermark`;
        return `${SCENE_IMAGE_BASE_URL}${encodeURIComponent(minimalPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
      }
      const query = `?width=${width}&height=${height}&seed=${seed}&nologo=true`;
      return `${SCENE_IMAGE_BASE_URL}${encodeURIComponent(prompt)}${query}`;
    }

    function getGeneratedMapImage(scene, targetWidth, targetHeight) {
      if (!scene) return null;
      const dims = getGenerationDimensions(targetWidth || 640, targetHeight || 240, MINIMAP_GENERATION_LONG_EDGE);
      const widthKey = dims.width;
      const heightKey = dims.height;
      const key = `${state.seed}:campaign:map`;
      const cached = generatedMapCache.get(key);
      if (cached) {
        if (cached.status !== 'error') return cached;
        const sinceFail = Date.now() - (cached.failedAt || 0);
        const retryDelay = Math.min(30000, 4000 * ((cached.retryCount || 0) + 1));
        if (!cached.retryTimer) {
          cached.retryTimer = setTimeout(() => {
            if (generatedMapCache.get(key) === cached) {
              generatedMapCache.delete(key);
              renderSceneVisuals();
            }
          }, Math.max(500, retryDelay - sinceFail));
        }
        if (sinceFail < retryDelay) return cached;
        generatedMapCache.delete(key);
      }

      const profiles = ['full', 'compact', 'minimal'];
      const image = new Image();
      const entry = {
        status: 'loading',
        image,
        key,
        attempt: 0,
        timer: null,
        retryTimer: null,
        retryCount: (cached?.retryCount || 0),
        failedAt: 0
      };
      generatedMapCache.set(key, entry);

      const queueNextAttempt = () => {
        entry.attempt += 1;
        if (entry.timer) {
          clearTimeout(entry.timer);
          entry.timer = null;
        }
        if (entry.attempt < profiles.length) {
          const retryUrl = getMapImageUrl(profiles[entry.attempt], widthKey, heightKey);
          if (retryUrl) {
            entry.status = 'loading';
            image.src = retryUrl;
            return;
          }
        }
        entry.status = 'error';
        entry.retryCount = (entry.retryCount || 0) + 1;
        entry.failedAt = Date.now();
        const retryDelay = Math.min(30000, 4000 * (entry.retryCount + 1));
        if (entry.retryTimer) clearTimeout(entry.retryTimer);
        entry.retryTimer = setTimeout(() => {
          if (generatedMapCache.get(key) === entry) {
            generatedMapCache.delete(key);
            renderSceneVisuals();
          }
        }, retryDelay);
        renderSceneVisuals();
      };

      const armTimeout = () => {
        if (entry.timer) clearTimeout(entry.timer);
        entry.timer = setTimeout(() => {
          if (entry.status !== 'loaded') queueNextAttempt();
          }, 20000);
      };

      image.onload = () => {
        if (entry.timer) {
          clearTimeout(entry.timer);
          entry.timer = null;
        }
        if (entry.retryTimer) {
          clearTimeout(entry.retryTimer);
          entry.retryTimer = null;
        }
        entry.status = 'loaded';
        renderSceneVisuals();
      };
      image.onerror = () => {
        queueNextAttempt();
      };
      const firstUrl = getMapImageUrl(profiles[0], widthKey, heightKey);
      if (!firstUrl) return null;
      armTimeout();
      image.src = firstUrl;
      return entry;
    }

    function drawImageCover(ctx, image, width, height) {
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const canvasRatio = width / height;
      let drawWidth = width;
      let drawHeight = height;
      let drawX = 0;
      let drawY = 0;

      if (imageRatio > canvasRatio) {
        drawHeight = height;
        drawWidth = height * imageRatio;
        drawX = (width - drawWidth) / 2;
      } else {
        drawWidth = width;
        drawHeight = width / imageRatio;
        drawY = (height - drawHeight) / 2;
      }

      ctx.fillStyle = 'rgba(7, 10, 16, 0.26)';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    }

    function inferMapBiome(scene) {
      const text = `${scene?.title || ''} ${scene?.text || ''}`.toLowerCase();
      if (scene?.act === 'Act III' || /frost|snow|frozen|winter|ice/.test(text)) return 'frost';
      if (/marsh|fen|reed|bog|hollow/.test(text)) return 'marsh';
      if (scene?.act === 'Act I') return 'roadlands';
      return 'woodland';
    }

    function drawMiniTrees(ctx, points, size, colors) {
      points.forEach((point, index) => {
        const trunk = Math.max(1, Math.round(size * 0.35));
        const crown = Math.max(2, Math.round(size));
        drawPixelRect(ctx, point.x, point.y, trunk, trunk + 1, colors.trunk);
        drawPixelRect(ctx, point.x - crown + 1, point.y - crown, crown * 2, crown, index % 2 === 0 ? colors.leafA : colors.leafB);
        drawPixelRect(ctx, point.x - crown + 2, point.y - crown - 1, crown * 2 - 2, 1, colors.leafTop);
      });
    }

    function drawWaypointGlyph(ctx, waypointId, x, y, size, color) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(10, 14, 22, 0.9)';
      ctx.lineWidth = Math.max(1, size * 0.2);
      if (waypointId === 'outpost') {
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x - size * 0.9, y + size * 0.8);
        ctx.lineTo(x + size * 0.9, y + size * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (waypointId === 'target') {
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x - size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x + size, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (waypointId === 'hold') {
        drawPixelRect(ctx, x - size, y - size * 0.25, size * 2, size * 0.5, color);
        drawPixelRect(ctx, x - size * 0.25, y - size, size * 0.5, size * 2, color);
      } else if (waypointId === 'relic') {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.95, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        drawPixelRect(ctx, x - size * 0.85, y - size * 0.85, size * 1.7, size * 1.7, color);
      }
      ctx.restore();
    }

    function syncSceneCanvasResolution(canvas) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.round(width * dpr);
      const nextHeight = Math.round(height * dpr);
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
    }

    function renderSceneArt() {
      const canvas = dom.sceneArtCanvas;
      const ctx = canvas.getContext('2d');
      const scene = getCurrentScene();
      const palette = getScenePalette(scene);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const localArtImage = getLocalSceneArtImage();
      const hasLocalArtImage = Boolean(localArtImage && localSceneImageStatus === 'loaded');

      const generatedScene = ENABLE_SCENE_AI_ART ? getGeneratedSceneImage(scene, width, height) : null;
      const hasGeneratedImage = Boolean(
        generatedScene
        && generatedScene.status === 'loaded'
        && generatedScene.image
        && generatedScene.image.naturalWidth > 0
      );

      // Generated paintings should render smoothly; fallback pixel art stays crisp.
      canvas.style.imageRendering = hasGeneratedImage ? 'auto' : 'pixelated';
      ctx.imageSmoothingEnabled = hasGeneratedImage;
      ctx.imageSmoothingQuality = hasGeneratedImage ? 'high' : 'low';

      if (hasLocalArtImage) {
        drawImageCover(ctx, localArtImage, width, height);
        const topShade = ctx.createLinearGradient(0, 0, 0, height * 0.6);
        topShade.addColorStop(0, 'rgba(7, 11, 18, 0.28)');
        topShade.addColorStop(1, 'rgba(7, 11, 18, 0.08)');
        ctx.fillStyle = topShade;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(7, 10, 16, 0.18)';
        ctx.fillRect(0, height * 0.72, width, height * 0.28);
      } else if (hasGeneratedImage) {
        drawImageCover(ctx, generatedScene.image, width, height);
        const topShade = ctx.createLinearGradient(0, 0, 0, height * 0.6);
        topShade.addColorStop(0, 'rgba(7, 11, 18, 0.32)');
        topShade.addColorStop(1, 'rgba(7, 11, 18, 0.08)');
        ctx.fillStyle = topShade;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(7, 10, 16, 0.22)';
        ctx.fillRect(0, height * 0.72, width, height * 0.28);
      }

      if (!hasLocalArtImage && !hasGeneratedImage) {
        const sky = ctx.createLinearGradient(0, 0, 0, height * 0.58);
        sky.addColorStop(0, palette.skyTop);
        sky.addColorStop(1, palette.skyBottom);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height * 0.58);

        const ground = ctx.createLinearGradient(0, height * 0.58, 0, height);
        ground.addColorStop(0, palette.groundTop);
        ground.addColorStop(1, palette.groundBottom);
        ctx.fillStyle = ground;
        ctx.fillRect(0, height * 0.58, width, height * 0.42);

        for (let i = 0; i < 7; i += 1) {
          const ridgeX = i * 110 - 40;
          const ridgeW = 160;
          const ridgeH = 28 + ((i + state.currentSceneIndex) % 3) * 18;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(17, 23, 34, 0.55)' : 'rgba(35, 43, 55, 0.42)';
          ctx.beginPath();
          ctx.moveTo(ridgeX, height * 0.58);
          ctx.lineTo(ridgeX + ridgeW * 0.25, height * 0.58 - ridgeH);
          ctx.lineTo(ridgeX + ridgeW * 0.75, height * 0.58 - ridgeH * 0.8);
          ctx.lineTo(ridgeX + ridgeW, height * 0.58);
          ctx.closePath();
          ctx.fill();
        }

        const treeBaseY = Math.floor(height * 0.58);
        for (let i = 0; i < 13; i += 1) {
          const x = 18 + i * 48 + ((state.currentSceneIndex + i) % 3) * 4;
          const trunkH = 34 + (i % 4) * 10;
          drawPixelRect(ctx, x, treeBaseY - trunkH, 4, trunkH + 18, '#2d221b');
          drawPixelRect(ctx, x - 8, treeBaseY - trunkH - 12, 20, 12, i % 2 === 0 ? '#33402f' : '#42523d');
          drawPixelRect(ctx, x - 12, treeBaseY - trunkH, 28, 10, i % 3 === 0 ? '#476145' : '#374b37');
        }

        if (scene?.act === 'Act III') {
          ctx.fillStyle = 'rgba(235, 240, 255, 0.72)';
          for (let i = 0; i < 28; i += 1) {
            drawPixelRect(ctx, 18 + (i * 23) % width, 16 + (i * 31) % 86, 2, 2, i % 3 === 0 ? '#f7fbff' : '#dce7ff');
          }
        }

        if (scene?.kind === 'combat') {
          for (let i = 0; i < 4; i += 1) {
            const baseX = 110 + i * 42;
            const baseY = 170 + (i % 2) * 8;
            drawPixelRect(ctx, baseX, baseY, 6, 14, '#5e4634');
            drawPixelRect(ctx, baseX - 2, baseY - 6, 10, 8, palette.danger);
            drawPixelRect(ctx, baseX + 10, baseY - 4, 10, 2, '#f2d8a0');
          }
          for (let i = 0; i < 5; i += 1) {
            const baseX = 366 + i * 34;
            const baseY = 176 + (i % 3) * 5;
            drawPixelRect(ctx, baseX, baseY, 6, 14, '#465b6a');
            drawPixelRect(ctx, baseX - 2, baseY - 6, 10, 8, palette.accent);
            drawPixelRect(ctx, baseX - 10, baseY - 4, 10, 2, '#dfe8ff');
          }
        } else {
          const campX = 86;
          drawPixelRect(ctx, campX, 184, 20, 10, '#5e4734');
          drawPixelRect(ctx, campX + 4, 178, 4, 6, '#cf9c66');
          drawPixelRect(ctx, campX + 10, 176, 4, 8, '#f0d28c');
          drawPixelRect(ctx, campX + 8, 168, 8, 8, 'rgba(230, 200, 140, 0.3)');

          const riders = 3 + (state.currentSceneIndex % 3);
          for (let i = 0; i < riders; i += 1) {
            const baseX = 300 + i * 34;
            const baseY = 180 + (i % 2) * 5;
            drawPixelRect(ctx, baseX, baseY, 10, 6, '#3f3225');
            drawPixelRect(ctx, baseX + 2, baseY - 8, 6, 8, '#d2b47c');
            drawPixelRect(ctx, baseX - 6, baseY + 4, 20, 2, '#2f251d');
          }
        }
      }

      if (generatedScene && generatedScene.status === 'loading' && !hasGeneratedImage) {
        ctx.fillStyle = 'rgba(7, 9, 15, 0.42)';
        ctx.fillRect(0, 0, width, height);
      } else if (generatedScene && generatedScene.status === 'error' && !hasGeneratedImage) {
        ctx.fillStyle = 'rgba(7, 9, 15, 0.38)';
        ctx.fillRect(0, 0, width, height);
      }

      const caption = scene
        ? scene.kind === 'combat'
          ? `Steel meets shadow beneath ${state.world.targetSite}.`
          : `${state.world.theater} stretches out beneath the company’s next decision.`
        : 'The march is quiet for a breath.';
      dom.sceneVisualCaption.innerHTML = `<strong>Scene Tableau</strong>${caption}`;
    }

    function renderSceneMap() {
      const canvas = dom.sceneMapCanvas;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      const scene = getCurrentScene();
      const biome = inferMapBiome(scene);
      ctx.clearRect(0, 0, width, height);

      const generatedMap = ENABLE_MINIMAP_AI_ART ? getGeneratedMapImage(scene, width, height) : null;
      const hasGeneratedMap = Boolean(
        generatedMap
        && generatedMap.status === 'loaded'
        && generatedMap.image
        && generatedMap.image.naturalWidth > 0
      );

      ctx.imageSmoothingEnabled = hasGeneratedMap;
      ctx.imageSmoothingQuality = hasGeneratedMap ? 'high' : 'low';

      if (hasGeneratedMap) {
        drawImageCover(ctx, generatedMap.image, width, height);
        const shade = ctx.createLinearGradient(0, 0, 0, height);
        shade.addColorStop(0, 'rgba(9, 14, 22, 0.14)');
        shade.addColorStop(1, 'rgba(9, 14, 22, 0.2)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalAlpha = 1;

      const padX = width * 0.08;
      const padY = height * 0.12;
      const mapWidth = width - padX * 2;
      const mapHeight = height - padY * 2;
      const project = (xRatio, yRatio) => ({
        x: padX + mapWidth * xRatio,
        y: padY + mapHeight * yRatio
      });
      const nodes = [
        { id: 'outpost', ...project(0.34, 0.86), label: state.world.outpost },
        { id: 'target', ...project(0.46, 0.67), label: state.world.targetSite },
        { id: 'wood', ...project(0.62, 0.49), label: 'Greenwood Eaves' },
        { id: 'relic', ...project(0.44, 0.3), label: state.world.relicName },
        { id: 'hold', ...project(0.56, 0.12), label: state.world.finalHold }
      ];

      const biomePalette = {
        roadlands: {
          land: 'rgba(92, 106, 76, 0.18)',
          forestA: '#3d5f3f',
          forestB: '#2f4d34',
          forestTop: '#4f724a',
          trunk: '#3a2d1f',
          road: 'rgba(185, 176, 155, 0.8)',
          roadEdge: 'rgba(97, 89, 73, 0.58)'
        },
        woodland: {
          land: 'rgba(54, 86, 58, 0.22)',
          forestA: '#345a3b',
          forestB: '#264a32',
          forestTop: '#4f7a53',
          trunk: '#37281d',
          road: 'rgba(169, 164, 144, 0.72)',
          roadEdge: 'rgba(78, 74, 61, 0.56)'
        },
        marsh: {
          land: 'rgba(54, 86, 72, 0.24)',
          forestA: '#3e5f42',
          forestB: '#2e4b34',
          forestTop: '#557a55',
          trunk: '#33271f',
          road: 'rgba(150, 153, 143, 0.62)',
          roadEdge: 'rgba(67, 73, 66, 0.56)'
        },
        frost: {
          land: 'rgba(114, 132, 148, 0.2)',
          forestA: '#5f7383',
          forestB: '#4b6070',
          forestTop: '#7e93a4',
          trunk: '#3a4048',
          road: 'rgba(202, 213, 224, 0.84)',
          roadEdge: 'rgba(102, 116, 132, 0.6)'
        }
      }[biome];

      ctx.save();
      ctx.globalAlpha = hasGeneratedMap ? 0.26 : 1;
      ctx.fillStyle = 'rgba(10, 16, 24, 0.16)';
      ctx.beginPath();
      ctx.moveTo(padX + mapWidth * 0.1, padY + mapHeight);
      ctx.quadraticCurveTo(padX + mapWidth * 0.2, padY + mapHeight * 0.7, padX + mapWidth * 0.16, padY + mapHeight * 0.46);
      ctx.quadraticCurveTo(padX + mapWidth * 0.18, padY + mapHeight * 0.22, padX + mapWidth * 0.08, padY);
      ctx.lineTo(padX + mapWidth * 0.64, padY);
      ctx.quadraticCurveTo(padX + mapWidth * 0.72, padY + mapHeight * 0.24, padX + mapWidth * 0.78, padY + mapHeight * 0.56);
      ctx.quadraticCurveTo(padX + mapWidth * 0.82, padY + mapHeight * 0.78, padX + mapWidth * 0.92, padY + mapHeight);
      ctx.lineTo(padX + mapWidth * 0.1, padY + mapHeight);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = biomePalette.land;
      ctx.beginPath();
      ctx.ellipse(padX + mapWidth * 0.48, padY + mapHeight * 0.42, mapWidth * 0.26, mapHeight * 0.22, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Draw a stone road spine so route detail reads clearly at a glance.
      ctx.strokeStyle = biomePalette.roadEdge;
      ctx.lineWidth = Math.max(5, width * 0.009);
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y + mapHeight * 0.03);
      for (let i = 1; i < nodes.length; i += 1) {
        const midX = (nodes[i - 1].x + nodes[i].x) / 2;
        const midY = (nodes[i - 1].y + nodes[i].y) / 2;
        const bendX = midX + (i % 2 === 0 ? mapWidth * 0.03 : -mapWidth * 0.03);
        const bendY = midY - mapHeight * 0.06;
        ctx.quadraticCurveTo(bendX, bendY, nodes[i].x, nodes[i].y);
      }
      ctx.stroke();

      ctx.strokeStyle = biomePalette.road;
      ctx.lineWidth = Math.max(3, width * 0.005);
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y + mapHeight * 0.03);
      for (let i = 1; i < nodes.length; i += 1) {
        const midX = (nodes[i - 1].x + nodes[i].x) / 2;
        const midY = (nodes[i - 1].y + nodes[i].y) / 2;
        const bendX = midX + (i % 2 === 0 ? mapWidth * 0.03 : -mapWidth * 0.03);
        const bendY = midY - mapHeight * 0.06;
        ctx.quadraticCurveTo(bendX, bendY, nodes[i].x, nodes[i].y);
      }
      ctx.stroke();

      // Place tree clusters that change with scene index and biome.
      const treeSeed = state.currentSceneIndex + (scene?.kind === 'combat' ? 7 : 0);
      const treePoints = [];
      const treeCount = biome === 'woodland' ? 16 : biome === 'marsh' ? 12 : biome === 'frost' ? 10 : 8;
      for (let i = 0; i < treeCount; i += 1) {
        const x = padX + ((i * 37 + treeSeed * 19) % Math.max(1, mapWidth - 18)) + 9;
        const y = padY + ((i * 29 + treeSeed * 13) % Math.max(1, mapHeight - 26)) + 13;
        if (y > nodes[0].y - 5 && y < nodes[0].y + 10) continue;
        treePoints.push({ x, y });
      }
      drawMiniTrees(ctx, treePoints, Math.max(3, width * 0.0055), {
        trunk: biomePalette.trunk,
        leafA: biomePalette.forestA,
        leafB: biomePalette.forestB,
        leafTop: biomePalette.forestTop
      });

      if (biome === 'marsh') {
        ctx.fillStyle = 'rgba(112, 154, 154, 0.24)';
        for (let i = 0; i < 6; i += 1) {
          const x = padX + mapWidth * (0.18 + i * 0.11);
          const y = padY + mapHeight * (0.56 + ((i % 2) * 0.09));
          ctx.beginPath();
          ctx.ellipse(x, y, mapWidth * 0.06, mapHeight * 0.035, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (biome === 'frost') {
        ctx.fillStyle = 'rgba(238, 246, 255, 0.58)';
        for (let i = 0; i < 22; i += 1) {
          drawPixelRect(
            ctx,
            padX + ((i * 31 + treeSeed * 7) % Math.max(1, mapWidth - 4)),
            padY + ((i * 17 + treeSeed * 11) % Math.max(1, mapHeight - 4)),
            2,
            2,
            i % 3 === 0 ? '#f8fbff' : 'rgba(220, 235, 255, 0.75)'
          );
        }
      }

      ctx.strokeStyle = 'rgba(4, 8, 14, 0.92)';
      ctx.lineWidth = Math.max(5, width * 0.009);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      for (let i = 1; i < nodes.length; i += 1) {
        const midX = (nodes[i - 1].x + nodes[i].x) / 2;
        const midY = (nodes[i - 1].y + nodes[i].y) / 2;
        const bendX = midX + (i % 2 === 0 ? mapWidth * 0.06 : -mapWidth * 0.05);
        const bendY = midY - mapHeight * 0.1;
        ctx.quadraticCurveTo(bendX, bendY, nodes[i].x, nodes[i].y);
      }
      ctx.stroke();

      ctx.shadowColor = 'rgba(112, 223, 255, 0.55)';
      ctx.shadowBlur = Math.max(8, width * 0.015);
      ctx.strokeStyle = 'rgba(120, 238, 255, 0.98)';
      ctx.lineWidth = Math.max(3, width * 0.0055);
      ctx.setLineDash([Math.max(12, width * 0.016), Math.max(6, width * 0.01)]);
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      for (let i = 1; i < nodes.length; i += 1) {
        const midX = (nodes[i - 1].x + nodes[i].x) / 2;
        const midY = (nodes[i - 1].y + nodes[i].y) / 2;
        const bendX = midX + (i % 2 === 0 ? mapWidth * 0.06 : -mapWidth * 0.05);
        const bendY = midY - mapHeight * 0.1;
        ctx.quadraticCurveTo(bendX, bendY, nodes[i].x, nodes[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(120, 238, 255, 0.38)';
      ctx.lineWidth = Math.max(1.5, width * 0.003);
      ctx.beginPath();
      ctx.moveTo(padX + mapWidth * 0.16, padY + mapHeight * 0.12);
      ctx.lineTo(padX + mapWidth * 0.28, padY + mapHeight * 0.26);
      ctx.lineTo(padX + mapWidth * 0.34, padY + mapHeight * 0.44);
      ctx.stroke();
      ctx.restore();

      const currentIndex = scene
        ? scene.act === 'Act I' ? Math.min(1, Math.floor(state.currentSceneIndex / 4))
          : scene.act === 'Act II' ? 2 + Math.min(1, Math.floor((state.currentSceneIndex - 6) / 4))
          : 4
        : 0;

      const waypointStyles = {
        outpost: { fill: '#8fd8a1', glyph: '#123722' },
        target: { fill: '#f4cf82', glyph: '#3f2a11' },
        wood: { fill: '#8ec4ff', glyph: '#132d49' },
        relic: { fill: '#dcb1ff', glyph: '#321847' },
        hold: { fill: '#ffaf9d', glyph: '#4d1a17' }
      };

      nodes.forEach((node, index) => {
        const active = index === currentIndex;
        const style = waypointStyles[node.id] || { fill: '#9cc8e8', glyph: '#1a2738' };
        const radius = active ? Math.max(10, width * 0.016) : Math.max(7, width * 0.011);
        ctx.save();
        ctx.shadowColor = active ? 'rgba(252, 234, 178, 0.6)' : 'rgba(12, 20, 30, 0.45)';
        ctx.shadowBlur = active ? Math.max(10, width * 0.02) : Math.max(5, width * 0.01);

        ctx.fillStyle = 'rgba(8, 12, 18, 0.85)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = active ? 'rgba(255, 246, 211, 0.98)' : 'rgba(199, 220, 239, 0.7)';
        ctx.lineWidth = Math.max(1.5, width * 0.0028);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = style.fill;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        drawWaypointGlyph(ctx, node.id, node.x, node.y, radius * (active ? 0.55 : 0.48), style.glyph);

        if (active) {
          ctx.strokeStyle = 'rgba(255, 237, 185, 0.95)';
          ctx.lineWidth = Math.max(1.5, width * 0.0028);
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      });

      if (scene?.kind === 'combat') {
        for (let i = 0; i < 3; i += 1) {
          const angle = -0.7 + i * 0.7;
          const offset = Math.max(18, width * 0.03);
          const markerSize = Math.max(6, width * 0.01);
          drawPixelRect(
            ctx,
            nodes[currentIndex].x + Math.cos(angle) * offset,
            nodes[currentIndex].y + Math.sin(angle) * offset,
            markerSize,
            markerSize,
            '#d56a62'
          );
        }
      }

      ctx.strokeStyle = 'rgba(239, 227, 197, 0.48)';
      ctx.lineWidth = Math.max(1.5, width * 0.0025);
      ctx.beginPath();
      ctx.moveTo(padX + 12, padY + 20);
      ctx.lineTo(padX + 12, padY + 44);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padX + 12, padY + 20);
      ctx.lineTo(padX + 7, padY + 28);
      ctx.moveTo(padX + 12, padY + 20);
      ctx.lineTo(padX + 17, padY + 28);
      ctx.stroke();

      const routeLabel = scene
        ? `${scene.act} · ${scene.subtitle} · ${scene.kind === 'combat' ? 'Engagement marker active' : 'Trail marker active'}`
        : 'The company has not yet set its course.';
      dom.sceneMapCaption.innerHTML = `<strong>Route Map</strong>${routeLabel}`;

      if (generatedMap && generatedMap.status === 'loading' && !hasGeneratedMap) {
        ctx.fillStyle = 'rgba(7, 9, 15, 0.36)';
        ctx.fillRect(0, 0, width, height);
        drawCanvasStatusLabel(ctx, 'Generating map...', 'info');
      } else if (generatedMap && generatedMap.status === 'error' && !hasGeneratedMap) {
        // Keep procedural minimap visible while retries are scheduled.
      }
    }

    function renderSceneVisuals() {
      syncSceneCanvasResolution(dom.sceneArtCanvas);
      syncSceneCanvasResolution(dom.sceneMapCanvas);
      renderSceneArt();
      renderSceneMap();
    }

    function updateTopbar() {
      const scene = getCurrentScene();
      dom.actBadge.textContent = scene ? scene.act : 'Act';
      dom.chapterBadge.textContent = scene ? `Chapter ${scene.chapter}` : 'Chapter';
      dom.resourceBadge.textContent = `Supplies ${state.resources.supplies} | Hope ${state.resources.hope} | Shadow ${state.resources.shadow}`;
      dom.sceneTitle.textContent = scene ? scene.title : 'The road waits.';
      dom.sceneSubtitle.textContent = scene ? scene.text : 'A procedural campaign of patrols, intrigue, and skirmishes on the shadowed borders of Mirkwood.';
      renderProgress();
      renderSceneVisuals();
    }

    function showOverlay(title, body, actions) {
      dom.overlayTitle.textContent = title;
      dom.overlayBody.textContent = body;
      dom.overlayActions.innerHTML = '';
      actions.forEach((action) => {
        const button = document.createElement('button');
        button.className = action.className || 'menu-btn';
        button.textContent = action.label;
        button.addEventListener('click', action.onClick);
        dom.overlayActions.appendChild(button);
      });
      dom.overlayScreen.classList.remove('hidden');
    }

    function hideOverlay() {
      dom.overlayScreen.classList.add('hidden');
    }

    function autoSave(reason) {
      const payload = deepClone(state);
      payload.actLabel = getCurrentScene()?.act || 'Act';
      payload.lastAutoSaveReason = reason;
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      setSaveStatus(`Saved · ${reason}`);
      updateMenuState();
    }

    function loadSavedGame() {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      try {
        const saveData = JSON.parse(raw);
        if (saveData.version !== VERSION) {
          localStorage.removeItem(SAVE_KEY);
          updateMenuState();
          return false;
        }
        if (!Array.isArray(saveData.rollLog)) saveData.rollLog = [];
        state = saveData;
        resetLocalSceneArtState();
        setSaveStatus(`Loaded · ${state.lastAutoSaveReason || 'continuing journey'}`);
        return true;
      } catch (error) {
        localStorage.removeItem(SAVE_KEY);
        updateMenuState();
        return false;
      }
    }

    function clearSave() {
      localStorage.removeItem(SAVE_KEY);
      updateMenuState();
      setSaveStatus('Save removed');
    }

    async function performRoll(label, bonus, explanation) {
      const raw = diceRoll(20);
      await animateDie(label, raw);
      const total = raw + bonus;
      dom.rollBreakdown.textContent = `${label}: ${raw} ${formatModifier(bonus)} = ${total}${explanation ? ` · ${explanation}` : ''}`;
      return { raw, total };
    }

    function getLivingParty() {
      return state.party.filter((member) => member.hp > 0);
    }

    function applyHealing(member, amount, sourceText) {
      const previous = member.hp;
      member.hp = clamp(member.hp + amount, 0, member.maxHp);
      logAction(`<strong>${member.name}</strong> recovers ${member.hp - previous} HP from ${sourceText}.`);
    }

    async function resolveSkillChoice(scene, option) {
      busy = true;
      logAction(`<strong>Player Chosen Action:</strong> ${scene.title} · ${option.label}`);
      addStoryEntry(scene.title, scene.text);
      const living = getLivingParty();
      let successes = 0;
      for (const member of living) {
        const bonus = skillBonus(member, option.skill);
        const roll = await performRoll(`${member.name} · ${describeSkill(option.skill)}`, bonus, `DC ${option.dc}`);
        const success = roll.total >= option.dc;
        if (success) successes += 1;
        logRoll(`<strong>${member.name}</strong> rolled ${roll.raw} ${formatModifier(bonus)} = ${roll.total} on ${option.skill}. ${success ? 'Success.' : 'Failure.'}`);
      }

      const threshold = Math.max(2, Math.min(4, Math.ceil(living.length * 0.6)));
      const passed = successes >= threshold;
      const outcomeText = passed ? option.successText : option.failureText;
      applyResourceEffects(passed ? option.successEffects : option.failureEffects);
      addStoryEntry(passed ? 'Success' : 'Setback', `${outcomeText}\n\nThe fellowship scored ${successes} successes against a threshold of ${threshold}.`);
      if ((passed ? option.successEffects : option.failureEffects)?.encounterKey) {
        state.pendingCombatAdvance = true;
        await startCombat((passed ? option.successEffects : option.failureEffects).encounterKey, scene.title, scene.act);
      } else {
        autoSave(`${scene.act} · ${scene.title}`);
        advanceScene();
      }
      busy = false;
      renderAll();
    }

    function resolveBranchChoice(scene, option) {
      busy = true;
      logAction(`<strong>Player Chosen Action:</strong> ${scene.title} · ${option.label}`);
      applyResourceEffects(option.effects || {});
      addStoryEntry(scene.title, option.outcomeText);
      autoSave(`${scene.act} · ${scene.title}`);
      advanceScene();
      busy = false;
      renderAll();
    }

    function getPlayerCombatProfile(member) {
      const profiles = {
        Ranger: {
          primary: {
            id: 'primary',
            label: 'Arrow Shot',
            help: 'A swift ranged strike against one foe.',
            hitBonus: 1,
            damageBonus: 0,
            special: false,
            logLabel: `${member.name} looses an arrow`
          },
          special: {
            id: 'special',
            label: "Hunter's Volley",
            help: 'Loose a flurry at one foe and press the line.',
            hitBonus: 2,
            damageBonus: 2,
            special: true,
            followUp: true,
            logLabel: `${member.name} unleashes a hunter's volley`
          }
        },
        Guardian: {
          primary: {
            id: 'primary',
            label: 'Shield Bash',
            help: 'A solid strike that favors armor and force.',
            hitBonus: 1,
            damageBonus: 1,
            special: false,
            logLabel: `${member.name} drives a shield bash`
          },
          special: {
            id: 'special',
            label: 'Shield Smash',
            help: 'A heavier blow with your shield to break the foe.',
            hitBonus: 2,
            damageBonus: 3,
            special: true,
            logLabel: `${member.name} crashes a shield smash`
          }
        },
        'Warden Archer': {
          primary: {
            id: 'primary',
            label: 'Keen Arrow',
            help: 'A careful shot aimed at weak points.',
            hitBonus: 1,
            damageBonus: 1,
            special: false,
            logLabel: `${member.name} fires a keen arrow`
          },
          special: {
            id: 'special',
            label: 'Twin Arrow',
            help: 'A fast double-shot at the chosen target.',
            hitBonus: 2,
            damageBonus: 2,
            special: true,
            followUp: true,
            logLabel: `${member.name} looses a twin arrow`
          }
        },
        Spearhand: {
          primary: {
            id: 'primary',
            label: 'Spear Thrust',
            help: 'A direct spear strike from the front line.',
            hitBonus: 1,
            damageBonus: 1,
            special: false,
            logLabel: `${member.name} thrusts their spear`
          },
          special: {
            id: 'special',
            label: 'Impaling Drive',
            help: 'Commit to a harder drive that hits with force.',
            hitBonus: 2,
            damageBonus: 3,
            special: true,
            logLabel: `${member.name} drives an impaling strike`
          }
        },
        Lorekeeper: {
          primary: {
            id: 'primary',
            label: 'Rune Strike',
            help: 'A measured magical cut of old craft and lore.',
            hitBonus: 1,
            damageBonus: 1,
            special: false,
            logLabel: `${member.name} shapes a rune strike`
          },
          special: {
            id: 'special',
            label: 'Ancient Sigil',
            help: 'Release a stronger rune-burst against a foe.',
            hitBonus: 2,
            damageBonus: 2,
            special: true,
            logLabel: `${member.name} invokes an ancient sigil`
          }
        }
      };
      return profiles[member.className] || profiles.Ranger;
    }

    function createTurnOrder(enemies) {
      const actors = [];
      state.party.forEach((member) => {
        if (member.hp > 0) actors.push({ side: 'party', id: member.id, initiative: diceRoll(20) + abilityMod(member.abilities.dex) });
      });
      enemies.forEach((enemy) => {
        if (enemy.alive) actors.push({ side: 'enemy', id: enemy.id, initiative: diceRoll(20) + 2 });
      });
      return actors.sort((a, b) => b.initiative - a.initiative);
    }

    function getCombatActor(ref) {
      if (!state.combat) return null;
      if (ref.side === 'party') return state.party.find((member) => member.id === ref.id) || null;
      return state.combat.enemies.find((enemy) => enemy.id === ref.id) || null;
    }

    function getLivingEnemies() {
      return state.combat ? state.combat.enemies.filter((enemy) => enemy.alive) : [];
    }

    function endCombat(victory, sourceTitle) {
      state.combat = null;
      state.awaitingPlayerAction = false;
      renderEncounterBoard();
      if (victory) {
        state.resources.hope = clamp(state.resources.hope + 1, 0, 12);
        addStoryEntry('Battle Won', `The company holds firm after ${sourceTitle}. Wounds ache, but the road lies open once more.`);
        autoSave(`Combat victory · ${sourceTitle}`);
        advanceScene();
      } else {
        state.ended = true;
        showOverlay(
          'The Company Falls',
          'The shadow war of the North claims the fellowship before the road can be secured. Load the last autosave or begin another seed of the campaign.',
          [
            { label: 'Load Last Save', className: 'menu-btn', onClick: () => { hideOverlay(); if (loadSavedGame()) { dom.menuScreen.classList.add('hidden'); resumeGame(); } } },
            { label: 'Return to Main Menu', className: 'menu-btn', onClick: () => { hideOverlay(); dom.menuScreen.classList.remove('hidden'); } }
          ]
        );
      }
    }

    async function startCombat(encounterKey, sourceTitle, actLabel = getCurrentScene()?.act || 'Act I') {
      state.mode = 'combat';
      const enemies = createEncounter(encounterKey, actLabel);
      state.combat = {
        sourceTitle,
        actLabel,
        enemies,
        round: 1,
        turnIndex: 0,
        turnOrder: createTurnOrder(enemies)
      };
      addStoryEntry('Combat', `${sourceTitle} erupts into open battle. The company braces and draws steel.`);
      renderAll();
      await runCombatLoop();
    }

    function applyDamageToEnemy(enemy, amount) {
      enemy.hp = Math.max(0, enemy.hp - amount);
      if (enemy.hp <= 0) enemy.alive = false;
    }

    function livingPartyMembers() {
      return state.party.filter((member) => member.hp > 0);
    }

    function chooseCompanionAction(member) {
      const livingAllies = livingPartyMembers();
      const livingEnemies = getLivingEnemies();
      const weakestAlly = livingAllies.slice().sort((a, b) => a.hp - b.hp)[0];
      const weakestEnemy = livingEnemies.slice().sort((a, b) => a.hp - b.hp)[0];
      if (member.className === 'Lorekeeper' && weakestAlly && weakestAlly.hp <= weakestAlly.maxHp * 0.5 && member.limitedPowerReady) {
        return { type: 'heal', target: weakestAlly };
      }
      if (member.className === 'Guardian' && member.limitedPowerReady && weakestEnemy && weakestEnemy.hp > 0) {
        return { type: 'smite', target: weakestEnemy };
      }
      if (member.className === 'Warden Archer' && member.limitedPowerReady && weakestEnemy && weakestEnemy.hp <= weakestEnemy.maxHp * 0.6) {
        return { type: 'special', target: weakestEnemy };
      }
      return { type: 'attack', target: weakestEnemy || livingEnemies[0] };
    }

    async function resolveAttack(attacker, target, options = {}) {
      const hitBonus = attackBonus(attacker) + (options.hitBonus || 0);
      const roll = await performRoll(`${attacker.name} to hit`, hitBonus, `vs AC ${target.ac}`);
      logRoll(`<strong>${attacker.name}</strong> rolled ${roll.raw} ${formatModifier(hitBonus)} = ${roll.total} to hit ${target.name}.`);
      if (roll.total < target.ac) {
        logRoll(`${attacker.name} misses ${target.name}.`);
        return false;
      }
      const [damageDie, damageBonus] = damageProfile(attacker, options.special);
      const damageRoll = rollFormula(damageDie);
      const damage = damageRoll.total + damageBonus + (options.damageBonus || 0);
      applyDamageToEnemy(target, damage);
      logRoll(`<strong>${attacker.name}</strong> deals ${damageRoll.rolls.join(' + ')} ${formatModifier(damageBonus + (options.damageBonus || 0))} = ${damage} damage to ${target.name}.`);
      return true;
    }

    async function resolveEnemyAttack(enemy, target) {
      const hitBonus = Math.max(0, enemy.attackBonus - 1);
      const roll = await performRoll(`${enemy.name} to hit`, hitBonus, `vs AC ${target.ac}`);
      logRoll(`<strong>${enemy.name}</strong> rolled ${roll.raw} ${formatModifier(hitBonus)} = ${roll.total} against ${target.name}.`);
      if (roll.total < target.ac) {
        logRoll(`${enemy.name} fails to land a telling blow on ${target.name}.`);
        return;
      }
      const damageRoll = rollFormula(enemy.damageDie);
      const damage = damageRoll.total + enemy.damageBonus;
      target.hp = Math.max(0, target.hp - damage);
      logRoll(`<strong>${enemy.name}</strong> deals ${damageRoll.rolls.join(' + ')} ${formatModifier(enemy.damageBonus)} = ${damage} damage to ${target.name}.`);
    }

    function chooseEnemyTarget() {
      const living = livingPartyMembers();
      return living.slice().sort((a, b) => a.hp - b.hp)[0];
    }

    function isCombatResolved() {
      const livingEnemies = getLivingEnemies().length;
      const livingAllies = livingPartyMembers().length;
      if (livingEnemies === 0) return { resolved: true, victory: true };
      if (livingAllies === 0) return { resolved: true, victory: false };
      return { resolved: false, victory: false };
    }

    function advanceCombatTurn() {
      if (!state.combat) return;
      state.combat.turnIndex += 1;
      if (state.combat.turnIndex >= state.combat.turnOrder.length) {
        state.combat.turnIndex = 0;
        state.combat.round += 1;
        state.combat.turnOrder = createTurnOrder(getLivingEnemies());
      }
    }

    function getCombatTurnText() {
      if (!state?.combat) return '';
      const turnRef = state.combat.turnOrder[state.combat.turnIndex];
      if (!turnRef) return `Round ${state.combat.round} · Reordering initiative`;
      const actor = getCombatActor(turnRef);
      if (!actor) return `Round ${state.combat.round} · Next combatant stepping in`;
      if (turnRef.side === 'party' && actor.playerControlled) {
        return `Round ${state.combat.round} · ${actor.name}'s turn (You)`;
      }
      return `Round ${state.combat.round} · ${actor.name}'s turn`;
    }

    async function runCompanionTurn(member) {
      const action = chooseCompanionAction(member);
      if (!action.target) return;
      if (action.type === 'heal') {
        const healRoll = rollFormula('1d8');
        const amount = healRoll.total + abilityMod(member.abilities.int);
        member.limitedPowerReady = false;
        applyHealing(action.target, amount, `${member.name}'s lore-song`);
        logRoll(`<strong>${member.name}</strong> rolled ${healRoll.rolls.join(' + ')} ${formatModifier(abilityMod(member.abilities.int))} = ${amount} healing for ${action.target.name}.`);
        return;
      }
      if (action.type === 'smite') {
        member.limitedPowerReady = false;
        await resolveAttack(member, action.target, { label: `${member.name} shield-smashes ${action.target.name}`, special: true, damageBonus: 2, hitBonus: 1 });
        return;
      }
      if (action.type === 'special') {
        member.limitedPowerReady = false;
        await resolveAttack(member, action.target, { label: `${member.name} looses a keen arrow`, special: true, hitBonus: 1, damageBonus: 1 });
        return;
      }
      await resolveAttack(member, action.target);
    }

    async function runCombatLoop() {
      if (!state.combat) return;
      while (state.combat) {
        const status = isCombatResolved();
        if (status.resolved) {
          endCombat(status.victory, state.combat.sourceTitle);
          return;
        }
        const turnRef = state.combat.turnOrder[state.combat.turnIndex];
        if (!turnRef) {
          state.combat.turnOrder = createTurnOrder(getLivingEnemies());
          state.combat.turnIndex = 0;
          continue;
        }
        const actor = getCombatActor(turnRef);
        if (!actor || (turnRef.side === 'party' && actor.hp <= 0) || (turnRef.side === 'enemy' && !actor.alive)) {
          advanceCombatTurn();
          continue;
        }
        if (turnRef.side === 'party' && actor.playerControlled) {
          state.awaitingPlayerAction = true;
          renderAll();
          return;
        }

        state.awaitingPlayerAction = false;
        renderAll();
        await sleep(COMBAT_TURN_PACE_MS);

        if (turnRef.side === 'party') {
          await runCompanionTurn(actor);
        } else {
          const target = chooseEnemyTarget();
          if (target) await resolveEnemyAttack(actor, target);
        }
        advanceCombatTurn();
        renderAll();
        await sleep(COMBAT_RESULT_PACE_MS);
      }
    }

    async function handlePlayerCombatAction(actionType, targetId) {
      if (!state.combat || !state.awaitingPlayerAction) return;
      busy = true;
      const player = state.party.find((member) => member.playerControlled);
      const target = getLivingEnemies().find((enemy) => enemy.id === targetId);
      const combatProfile = getPlayerCombatProfile(player);
      if (!player || !target) {
        busy = false;
        return;
      }
      if (actionType === 'guard') {
        player.ac += 2;
        logAction(`<strong>${player.name}</strong> takes a guarded stance and braces for the next blow.`);
      } else if (actionType === 'primary') {
        const attack = combatProfile.primary;
        logAction(`<strong>${player.name}</strong> uses <em>${attack.label}</em> against ${target.name}.`);
        await resolveAttack(player, target, { label: attack.logLabel, hitBonus: attack.hitBonus, damageBonus: attack.damageBonus, special: attack.special });
      } else if (actionType === 'special') {
        const attack = combatProfile.special;
        logAction(`<strong>${player.name}</strong> uses <em>${attack.label}</em> against ${target.name}.`);
        await resolveAttack(player, target, { label: attack.logLabel, hitBonus: attack.hitBonus, damageBonus: attack.damageBonus, special: attack.special });
        if (attack.followUp && target.alive) {
          const secondTarget = getLivingEnemies().find((enemy) => enemy.id !== target.id) || target;
          await resolveAttack(player, secondTarget, { label: `${player.name} follows through with a second strike`, hitBonus: 0, damageBonus: 1 });
        }
      }
      state.awaitingPlayerAction = false;
      advanceCombatTurn();
      renderAll();
      busy = false;
      await runCombatLoop();
    }

    function syncChoicesTrackHeight() {
      if (!dom.storyPanel || !dom.choicesWrap || !dom.choicesGrid) return;
      const panelHeight = Math.max(1, Math.floor(dom.storyPanel.getBoundingClientRect().height || window.innerHeight || 1));
      const wrapStyles = getComputedStyle(dom.choicesWrap);
      const gap = parseFloat(wrapStyles.rowGap || wrapStyles.gap || '0') || 0;
      const padTop = parseFloat(wrapStyles.paddingTop || '0') || 0;
      const padBottom = parseFloat(wrapStyles.paddingBottom || '0') || 0;
      const labelHeight = dom.choicesLabel ? Math.ceil(dom.choicesLabel.getBoundingClientRect().height) : 0;
      const gridHeight = Math.ceil(dom.choicesGrid.scrollHeight);
      const buttonCount = dom.choicesGrid.querySelectorAll('button').length;
      const desired = Math.ceil(labelHeight + gridHeight + padTop + padBottom + gap + 2);
      const minTrack = 54;
      const countCap = buttonCount <= 2
        ? 86
        : buttonCount <= 4
          ? 98
          : buttonCount <= 6
            ? 110
            : 124;
      const viewportCap = Math.max(minTrack, Math.floor(panelHeight * 0.24));
      const maxTrack = Math.max(minTrack, Math.min(countCap, viewportCap));
      const track = Math.max(minTrack, Math.min(desired, maxTrack));
      dom.storyPanel.style.setProperty('--choices-track-height', `${track}px`);
    }

    function renderChoices() {
      dom.choicesGrid.innerHTML = '';
      if (state.ended) {
        dom.choicesLabel.textContent = 'Journey ended';
        return;
      }
      if (state.combat && state.awaitingPlayerAction) {
        const player = state.party.find((member) => member.playerControlled);
        const combatProfile = getPlayerCombatProfile(player);
        dom.choicesLabel.textContent = `${player.name}'s turn · choose an action`;
        const actionWrap = document.createElement('div');
        actionWrap.className = 'combat-actions';
        const targetWrap = document.createElement('div');
        targetWrap.className = 'combat-targets';
        const targets = getLivingEnemies();
        let selectedAction = 'primary';
        const actions = [
          combatProfile.primary,
          combatProfile.special,
          { id: 'guard', label: 'Guard & End Turn', help: 'Take cover and conserve strength for the round.' }
        ];

        const getActionLabel = (actionId) => {
          const match = actions.find((action) => action.id === actionId);
          return match ? match.label : 'Attack';
        };

        const updateCombatPrompt = () => {
          dom.choicesLabel.textContent = `${player.name}'s turn · ${getActionLabel(selectedAction)} selected · choose a target`;
        };

        const applySelectedActionStyles = () => {
          Array.from(actionWrap.children).forEach((child) => {
            child.classList.toggle('is-selected', child.dataset.actionId === selectedAction);
          });
        };

        actions.forEach((action) => {
          const button = document.createElement('button');
          button.className = 'action-btn';
          button.dataset.actionId = action.id;
          button.innerHTML = `<strong>${action.label}</strong><small>${action.help}</small>`;
          button.addEventListener('click', async () => {
            if (busy) return;
            if (action.id === 'guard') {
              await handlePlayerCombatAction('guard', targets[0]?.id || '');
              return;
            }
            selectedAction = action.id;
            applySelectedActionStyles();
            updateCombatPrompt();
            Array.from(targetWrap.children).forEach((child) => child.classList.remove('active'));
          });
          actionWrap.appendChild(button);
        });

        applySelectedActionStyles();
        updateCombatPrompt();

        targets.forEach((target) => {
          const button = document.createElement('button');
          button.className = 'choice-btn';
          button.innerHTML = `<strong>${target.name}</strong><small>HP ${target.hp}/${target.maxHp} · AC ${target.ac}</small>`;
          button.addEventListener('click', async () => {
            if (busy) return;
            Array.from(targetWrap.children).forEach((child) => child.classList.remove('active'));
            button.classList.add('active');
            await handlePlayerCombatAction(selectedAction, target.id);
          });
          targetWrap.appendChild(button);
        });
        dom.choicesGrid.appendChild(actionWrap);
        dom.choicesGrid.appendChild(targetWrap);
        return;
      }

      if (state.combat) {
        const turnRef = state.combat.turnOrder[state.combat.turnIndex];
        const actor = turnRef ? getCombatActor(turnRef) : null;
        dom.choicesLabel.textContent = actor
          ? `${actor.name}'s turn · action resolving`
          : 'Battle in progress';
        return;
      }

      const scene = getCurrentScene();
      if (!scene) {
        dom.choicesLabel.textContent = 'Campaign complete';
        return;
      }

      if (scene.kind === 'combat' && !state.combat) {
        dom.choicesLabel.textContent = 'Battlefront';
        const button = document.createElement('button');
        button.className = 'choice-btn';
        button.innerHTML = `<strong>Begin Battle</strong><small>${scene.leadIn || 'The enemy closes. Ready the fellowship and engage.'}</small>`;
        button.addEventListener('click', async () => {
          if (busy) return;
          busy = true;
          await startCombat(scene.encounterKey, scene.title, scene.act);
          busy = false;
          renderAll();
        });
        dom.choicesGrid.appendChild(button);
        return;
      }

      const sceneChoices = Array.isArray(scene.choices) ? scene.choices : [];
      if (sceneChoices.length === 0) {
        dom.choicesLabel.textContent = 'Continue';
        const button = document.createElement('button');
        button.className = 'choice-btn';
        button.innerHTML = '<strong>Continue Journey</strong><small>Advance to the next chapter of the campaign.</small>';
        button.addEventListener('click', () => {
          if (busy) return;
          advanceScene();
          renderAll();
        });
        dom.choicesGrid.appendChild(button);
        return;
      }

      dom.choicesLabel.textContent = 'Choose your path';
      sceneChoices.forEach((option) => {
        const button = document.createElement('button');
        button.className = 'choice-btn';
        if (option.type === 'skill') {
          button.innerHTML = `<strong>${option.label}</strong><small>${describeSkill(option.skill)} · party check vs DC ${option.dc}</small>`;
          button.addEventListener('click', async () => {
            if (busy) return;
            await resolveSkillChoice(scene, option);
          });
        } else {
          button.innerHTML = `<strong>${option.label}</strong><small>Resolve this branch and advance the fellowship.</small>`;
          button.addEventListener('click', () => {
            if (busy) return;
            resolveBranchChoice(scene, option);
            renderAll();
          });
        }
        dom.choicesGrid.appendChild(button);
      });
    }

    function renderAll() {
      updateTopbar();
      renderParty();
      renderEncounterBoard();
      renderNarrativeLog();
      renderActionLog();
      renderRollLog();
      renderChoices();
      syncChoicesTrackHeight();
    }

    function applyLevelUp(level) {
      state.party.forEach((member) => {
        if (member.level >= level) return;
        member.level = level;
        member.proficiency = level >= 3 ? 3 : 2;
        member.maxHp += level === 2 ? 6 : 7;
        member.hp = member.maxHp;
        member.limitedPowerReady = true;
      });
      addStoryEntry('Fellowship Growth', `The road hardens the company. Each companion rises to level ${level}, steadies their nerves, and returns to full fighting strength.`);
    }

    function advanceScene() {
      state.sceneStarted = false;
      state.pendingCombatAdvance = false;
      state.awaitingPlayerAction = false;
      state.currentSceneIndex += 1;
      if (state.currentSceneIndex === 5) applyLevelUp(2);
      if (state.currentSceneIndex === 10) applyLevelUp(3);
      if (state.currentSceneIndex >= state.campaign.length) {
        state.ended = true;
        showOverlay(
          'Victory in the North',
          `${state.world.villainName} is broken, ${state.world.relicName} is kept from shadow, and the northern watchfires still answer one another. Your company’s deeds remain far from the great songs of the Ring, yet they mattered all the same.`,
          [
            { label: 'Return to Main Menu', className: 'menu-btn', onClick: () => { hideOverlay(); dom.menuScreen.classList.remove('hidden'); } },
            { label: 'Begin Another Seed', className: 'menu-btn', onClick: () => { hideOverlay(); startNewGame(); } }
          ]
        );
        autoSave('Campaign complete');
        renderAll();
        return;
      }
      showCurrentScene();
    }

    function showCurrentScene() {
      const scene = getCurrentScene();
      if (!scene) return;
      scene.chapter = state.currentSceneIndex + 1;
      if (!state.sceneStarted) {
        addStoryEntry(scene.title, scene.text);
        state.sceneStarted = true;
      }
      renderAll();
    }

    function resumeGame() {
      dom.menuScreen.classList.add('hidden');
      hideOverlay();
      renderAll();
      if (state.combat && !state.awaitingPlayerAction) {
        runCombatLoop();
      }
    }

    function beginGameFromState() {
      dom.menuScreen.classList.add('hidden');
      hideOverlay();
      showCurrentScene();
    }

    function startNewGame() {
      if (dom.playerCharacterSelect) {
        selectedPlayerCharacterId = dom.playerCharacterSelect.value || 'player';
      }
      createNewState(selectedPlayerCharacterId);
      autoSave('New campaign created');
      ensureSoundtrackRunning();
      beginGameFromState();
    }

    function handleMenuLoad() {
      if (!loadSavedGame()) return;
      ensureSoundtrackRunning();
      beginGameFromState();
      if (state.combat && !state.awaitingPlayerAction) runCombatLoop();
    }

    function updateSeedPreview() {
      dom.seedPreview.textContent = `Next seed preview: ${Date.now()}`;
    }

    dom.newGameBtn.addEventListener('click', startNewGame);
    if (dom.playerCharacterSelect) {
      dom.playerCharacterSelect.addEventListener('change', () => {
        selectedPlayerCharacterId = dom.playerCharacterSelect.value || 'player';
      });
    }
    dom.loadGameBtn.addEventListener('click', handleMenuLoad);
    dom.clearSaveBtn.addEventListener('click', clearSave);
    dom.soundtrackToggle.addEventListener('click', () => {
      toggleSoundtrack();
    });
    dom.soundtrackVolume.addEventListener('input', (event) => {
      updateSoundtrackVolume(event.target.value);
    });
    dom.gameZoom.addEventListener('input', (event) => {
      updateGameZoom(event.target.value);
    });
    window.addEventListener('resize', () => {
      if (!state) return;
      renderSceneVisuals();
      syncChoicesTrackHeight();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopSoundtrackPlayback();
      } else if (soundtrackEnabled) {
        ensureSoundtrackRunning();
      }
    });

    updateSeedPreview();
    if (dom.playerCharacterSelect) {
      dom.playerCharacterSelect.value = getSelectedHeroId();
    }
    updateMenuState();
    setSaveStatus('Awaiting a journey');
    updateSoundtrackToggle();
    updateSoundtrackVolumeUi();
    updateGameZoomUi();
    applyGameZoom();
