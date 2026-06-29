
/*
Bard Songs
Authored by Theroxenes
Tested on Foundry v14.361, PF2e v8.1.2
This macro is an alternative to the "Lingering Fortissimo" macro and other Bard composition automations with greater rules fidelity.

* Prompts for a Performance type and injects appropriate traits into the composition
* Applies effects instantaneously to targets within range instead of using an aura
* Rallying Anthem has automated physical resistance when used with Fortissimo Composition
* Enemies affected by Dirge of Doom keep the Frightened condition if they leave the aura, until it expires as normal at the end of their turn
* Lingering Compositions and Fortissimo Composition DCs utilize line-of-sight/line-of-effect/immunity checks to determine who will be affected
* AppV2 support

* LIMITATIONS:
* Does not account for darkvision or other special senses
* May not play nice with Foundry levels

* CURRENTLY SUPPORTED COMPOSITIONS:
* - Courageous Anthem
* - Song of Strength
* - Dirge of Doom
* - Rallying Anthem
* 
* CURRENTLY SUPPORTED SPELLSHAPES/MODIFIERS:
* - Lingering Composition
* - Fortissimo Composition
*
* TO BE ADDED:
* - Martial Performance
* - Directed Audience (maybe)
* - In Tune
* - Triple Time
* - Unusual Composition (maybe)
* - Chorus Companion
* - Allegro
* - Vigorous Anthem
* - 
*/

// Initial check and set up script vars
if (canvas.tokens.controlled.length != 1) {
  return void ui.notifications.warn('Must select exactly 1 token.');
}

const token = _token
const actor = token.actor
const dcByLevel = [14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40, 42, 44, 46, 48, 50]

const supportedCompositions = [
  "courageous-anthem",
  "song-of-strength",
  "dirge-of-doom",
  "rallying-anthem"
]
const supportedSpellshapes = [
  "lingering-composition",
  "fortissimo-composition"
]

/**
 * Wrapper for the DSN Hook. If DSN is enabled, waits for the physical dice to stop rolling (unless the roll has assurance)
 *
 * @param {Promise<Object>} rollPromise Promise of roll results
 */
async function dsnHook(rollPromise) {
  if (game.modules.get("dice-so-nice")?.active) {
    return rollPromise.then(async (results) => {
      await Promise.all(
        results.map((r) => {
          // Check if we are using assurance
          if (
            r.message
            .getFlag("pf2e", "context.options")
            ?.includes("substitute:assurance")
          )
            return Promise.resolve(true);
          return game.dice3d.waitFor3DAnimationByMessageID(
            r.message.id
          );
        })
      );
      return results;
    });
  } else {
    return rollPromise;
  }
}

/**
 * AppV2 Dialog Generator for the macro.
 *
 * @param {string} windowTitle - Title for the dialog window.
 * @param {Object} compositionInput - Object containing the composition spells and selector labels.
 * @param {Object} spellshapeInput - Object containing the spellshapes and selector labels.
 * @returns {Object} Object containing the dialog window selections and event.
 */
async function generateSelectorDialog(windowTitle, compositionInput, spellshapeInput) {

  const compositionHead = `<label for="${compositionInput.selectorName}">${compositionInput.label}</label><select name="${compositionInput.selectorName}" id="compositionChoice">`;
  let compositionOptions = [];
  for (const option of compositionInput.options) {
    compositionOptions.push(`<option value="${option.uuid}">${option.name}</option>`);
  }

  const spellshapeHead = `<label for="${spellshapeInput.selectorName}">${spellshapeInput.label}</label><select name="${spellshapeInput.selectorName}" id="spellshapeChoice">`;
  let spellshapeOptions = ['<option value="">None</option>'];
  for (const option of spellshapeInput.options) {
    spellshapeOptions.push(`<option value="${option.uuid}">${option.name}</option>`);
  }

  const compositionSelector = `${compositionHead}${compositionOptions.join("")}</select>`
  const spellshapeSelector = `${spellshapeHead}${spellshapeOptions.join("")}</select>`
  const performanceTypeSelector = `<label for="performanceChoice">Choose the type of Performance:</label>
    <select name="Performance Type" id="performanceChoice">
    <option value="acting">Acting (Auditory, Linguistic, Visual)</option>
    <option value="comedy">Comedy (Auditory, Linguistic, Visual)</option>
    <option value="dance">Dance (Move, Visual)</option>
    <option value="keyboards">Keyboard (Auditory, Manipulate)</option>
    <option value="oratory">Oratory (Auditory, Linguistic)</option>
    <option value="percussion">Percussion (Auditory, Manipulate)</option>
    <option value="singing">Singing (Auditory, Linguistic)</option>
    <option value="strings">Stringed Instrument (Auditory, Manipulate)</option>
    <option value="winds">Wind Instrument (Auditory, Manipulate)</option>
    </select>`
  const customDcInput = `<label for="customDcChoice">Custom DC:</label><input type="number" id="customDcChoice" placeholder="Enter custom DC.">`

  const result = await foundry.applications.api.DialogV2.prompt({
    window: {
      title: windowTitle
    },
    content: `${compositionSelector}\n${spellshapeSelector}\n${performanceTypeSelector}\n${customDcInput}`,
    rejectClose: false,
    closeOnSubmit: true,
    ok: {
      label: "Submit Items",
      callback: (event, button, dialog) => ({
        compositionUuid: button.form.elements.compositionChoice.value,
        spellshapeUuid: button.form.elements.spellshapeChoice.value,
        performanceType: button.form.elements.performanceChoice.value,
        customDc: button.form.elements.customDcChoice.value,
        initialEvent: event
      })
    }
  });
  return result;
}

/**
 * Generates traits for a given Performance type.
 *
 * @param {Array} originalTraits - Array of traits to combine with
 * @param {string} performanceTypeString - String name of the Performance type
 * @returns {string[]} Array of combined and sorted traits
 */
function generateTraits(originalTraits, performanceTypeString) {

  const traitMap = {
    acting: ["auditory", "linguistic", "visual"],
    comedy: ["auditory", "linguistic", "visual"],
    dance: ["move", "visual"],
    keyboards: ["auditory", "manipulate"],
    oratory: ["auditory", "linguistic"],
    percussion: ["auditory", "manipulate"],
    singing: ["auditory", "linguistic"],
    strings: ["auditory", "manipulate"],
    winds: ["auditory", "manipulate"]
  };

  let outputTraits = [];

  const newTraits = traitMap?.[performanceTypeString] ?? [];
  if (!originalTraits) {
    outputTraits = newTraits;
  } else {
    outputTraits = [...new Set([...originalTraits, ...newTraits])];
  };

  return outputTraits.sort();
}

/**
 * Generates the data for spellshape Performance checks.
 *
 * @param {string} performanceTypeString - String name of the Performance type
 * @param {Object} outcomes - Container for success/failure/etc. result text
 * @param {number} dcValue - The target DC for the check
 * @param {string} subtitle - Subtitle to append to the base "Perform" action
 * @returns {Object} The action data for rolling the check
 */
function generatePerformanceCheck(performanceTypeString, outcomes, dcValue, subtitle) {

  /* TODO find some way to make the DC publicly visible*/

  const baseAction = game.pf2e.actions.get("perform");
  const actionOptions = {
    traits: generateTraits(baseAction?.traits, performanceTypeString),
    modifiers: baseAction.modifiers,
    statistic: baseAction.skill,
    difficultyClass: {
      value: dcValue
    },
    name: `${subtitle}`,
    description: "",
    slug: "",
    rollOptions: [`action:perform:${performanceTypeString}`],
    notes: outcomes
  }
  return baseAction.toActionVariant({
    traits: actionOptions.traits,
    modifiers: actionOptions.modifiers,
    statistic: actionOptions.statistic,
    difficultyClass: actionOptions.difficultyClass,
    name: actionOptions.name,
    description: actionOptions.description,
    slug: actionOptions.slug,
    notes: actionOptions.notes,
    rollOptions: [
      ...new Set([
        ...baseAction.rollOptions,
        ...actionOptions.rollOptions,
      ]),
    ],
  });
}

/**
 * Creates roll result text for generatePerformanceCheck
 *
 * @param {string} spellshapeSlug - The spellshape to generate text for
 * @returns {Object} Formatted data to pass to generatePerformanceCheck
 */
function generateOutcomes(spellshapeSlug) {
  const outcomeMap = {
    "lingering-composition": [{
        outcome: ["criticalSuccess"],
        text: "<strong>Critical Success</strong> The composition lasts 4 rounds."
      },
      {
        outcome: ["success"],
        text: "<strong>Success</strong> The composition lasts 3 rounds."
      },
      {
        outcome: ["failure", "criticalFailure"],
        text: "<strong>Failure</strong> The composition lasts 1 round, but you don't spend the Focus Point for casting this spell."
      }
    ],
    "fortissimo-composition": [{
        outcome: ["criticalSuccess"],
        text: "<strong>Critical Success</strong> The status bonus from your composition increases to +3."
      },
      {
        outcome: ["success"],
        text: "<strong>Success</strong> The status bonus from your composition increases to +2."
      },
      {
        outcome: ["failure", "criticalFailure"],
        text: "<strong>Failure</strong> Your composition provides only its normal bonus of +1, but you don't spend the Focus Point for casting this spell."
      }
    ],
  }
  return outcomeMap?.[spellshapeSlug] ?? [];
}

/** 
 * Picks targets for a composition based on range, immunities, alliance, and line-of-sight/effect
 *
 * @param {Object} source - The "source" token the composition originates from
 * @param {Object} spell - The spell to select targets for
 * @returns {Object[]} A list of valid targets for the spell
 */
function generateTargets(source, spell) {

  const targetTypeMap = {
    "dirge-of-doom": "opposition",
    "courageous-anthem": "party",
    "rallying-anthem": "party",
    "song-of-strength": "party",
  };

  const range = spell?.system?.area?.value ?? 60;
  let _alliance = targetTypeMap?.[spell?.system?.slug] ?? "party"
  if (source.actor?.alliance === "opposition") {
    _alliance = _alliance === "party" ? "opposition" : "party";
  }
  const traits = spell?.system?.traits?.value ?? [];
  const tokens = canvas.tokens.placeables.filter((t) => source.distanceTo(t) <= range && t.actor?.alliance === _alliance && !t.actor?.system?.attributes?.immunities?.some((i) => traits.includes(i.type)));

  class Dummy {
    testCollision(_a, _b, _c) {
      return false;
    }
  }

  let losClass = new Dummy;
  let loaClass = new Dummy;
  let finalTargets = [];

  if (traits.includes("visual")) {
    losClass = CONFIG.Canvas.polygonBackends["sight"];
  }
  if (traits.includes("auditory")) {
    loaClass = CONFIG.Canvas.polygonBackends["sound"];
  }

  for (var target of tokens) {
    const ray = new foundry.canvas.geometry.Ray(source.center, target.center);
    const losResult = losClass.testCollision(ray.B, ray.A, {
      mode: "any",
      type: "sight"
    });
    const loeResult = loaClass.testCollision(ray.B, ray.A, {
      mode: "any",
      type: "sound"
    });
    if (!losResult && !loeResult) {
      finalTargets.push(target);
    }
  };
  return finalTargets;
}

/**
 * Simple helper function to pick the max level of a target list.
 *
 * @param {Object[]} targets - The targets generated by generateTargets
 * @returns {number} The maximum level of the targets
 */
function getMaxLevel(targets) {
  return Math.max(...targets.map((t) => t.actor.level), 0)
}
/**
 * Simple helper function to pick the max Will DC of a target list.
 *
 * @param {Object[]} targets - The targets generated by generateTargets
 * @returns {number} The maximum Will DC of the targets
 */
function getMaxWillDc(targets) {
  return Math.max(...targets.map((t) => t.actor.saves.will.dc.value), 0)
}

/**
 * Validates the AppV2 window selections of the user.
 *
 * @param {Object} source - The token source of the composition
 * @param {Object} composition - The composition spell to validate
 * @param {Object} spellshape - The spellshape to validate
 * @returns {string | boolean} Bool for validity or error message for the user
 */
function validateSelection(source, composition, spellshape) {

  const validMap = {
    "courageous-anthem": ["lingering-composition", "fortissimo-composition"],
    "song-of-strength": ["lingering-composition", "fortissimo-composition"],
    "dirge-of-doom": ["lingering-composition"],
    "rallying-anthem": ["lingering-composition", "fortissimo-composition"]
  };

  if (!spellshape && composition) {
    return true;
  } else if (composition && source.actor.system.resources.focus.value < 1) {
    return "Not enough focus points.";
  } else {
    return validMap?.[composition.slug]?.includes(spellshape.slug) ?? false;
  }
}

/**
 * Generates context to inject into the composition effects so they expire at the correct time.
 *
 * @param {Object} source - The token origin of the composition
 * @returns {Object} The context data to inject
 */
function generateContext(source) {

  const tokenSceneUuid = source.document.uuid;
  const actorUuid = source.actor.uuid;

  return {
    target: null,
    origin: {
      actor: actorUuid,
      token: tokenSceneUuid,
      item: null,
      spellcasting: null,
      rollOptions: []
    },
    roll: null
  };
}

/** 
 * Injects traits into a composition spell so they display in the chat and apply immunities.
 *
 * @param {Object} spell - The spell to modify in memory
 * @param {string} performanceTypeString - Name of the performance type to get the correct traits.
 */
function injectSpellTraits(spell, performanceTypeString) {
  const originalTraits = spell.system?.traits?.value ?? [];
  const outputTraits = generateTraits(originalTraits, performanceTypeString);
  spell.system.traits.value = outputTraits;
  return spell;
}

/** 
 * Generates the effect data for Courageous Anthem.
 *
 * @param {Object} source - The token origin of Courageous Anthem
 * @param {number} duration - Desired duration of the effect
 * @param {number} intensity - Value for the status bonus
 * @param {string[]} traits - Traits to add to the effect (unused)
 * @returns {Object} Effect data to add to actor
 */
async function createEffectCourageousAnthem(source, duration, intensity, traits, modifier) {

  const level = source.actor.level;

  const courageousAnthemSpellEffect = {
    type: "effect",
    name: "Spell Effect: Courageous Anthem",
    img: "systems/pf2e/icons/spells/inspire-courage.webp",
    system: {
      slug: `spell-effect-courageous-anthem${modifier}`,
      tokenIcon: {
        show: true
      },
      duration: {
        value: duration,
        unit: "rounds",
        sustained: false,
        expiry: "turn-start"
      },
      level: {
        value: level
      },
      rules: [{
          key: "FlatModifier",
          selector: [
            "attack-roll",
            "damage"
          ],
          type: "status",
          value: intensity
        },
        {
          key: "FlatModifier",
          predicate: ["fear"],
          selector: "saving-throw",
          type: "status",
          value: intensity
        },
        {
          "key": "DamageDice",
          "label": "PF2E.SpecificRule.Bard.DiscordantVoice.Label",
          "damageType": "sonic",
          "diceNumber": 1,
          "dieSize": "d6",
          "hideIfDisabled": true,
          "predicate": [
            "parent:origin:discordant-voice",
            {
              "not": "parent:origin:signature:{item|parent.signature}"
            }
          ],
          "selector": "strike-damage"
        }
      ],
      context: generateContext(source)
    }
  };

  return courageousAnthemSpellEffect;

}

/** 
 * Generates the effect data for Song of Strength.
 *
 * @param {Object} source - The token origin of Song of Strength
 * @param {number} duration - Desired duration of the effect
 * @param {number} intensity - Value for the status bonus
 * @param {string[]} traits - Traits to add to the effect (unused)
 * @returns {Object} Effect data to add to actor
 */
async function createEffectSongOfStrength(source, duration, intensity, traits, modifier) {

  let level = source.actor.level;

  const songOfStrengthSpellEffect = {
    type: "effect",
    name: "Spell Effect: Song of Strength",
    img: "systems/pf2e/icons/spells/song-of-strength.webp",
    system: {
      slug: `spell-effect-song-of-strength${modifier}`,
      tokenIcon: {
        show: true
      },
      duration: {
        value: duration,
        unit: "rounds",
        sustained: false,
        expiry: "turn-start"
      },
      level: {
        value: level
      },
      rules: [{
          key: "FlatModifier",
          selector: [
            "athletics"
          ],
          type: "status",
          value: intensity
        },
        {
          key: "FlatModifier",
          predicate: [{
            "or": [
              "action:disarm",
              "action:reposition",
              "action:trip",
              "action:shove"
            ]
          }],
          selector: [
            "fortitude",
            "reflex"
          ],
          type: "status",
          value: intensity
        }
      ],
      context: generateContext(source)
    }
  };

  return songOfStrengthSpellEffect;

}

/** 
 * Generates the effect data for Rallying Anthem.
 *
 * @param {Object} source - The token origin of Rallying Anthem
 * @param {number} duration - Desired duration of the effect
 * @param {number} intensity - Value for the status bonus
 * @param {string[]} traits - Traits to add to the effect (unused)
 * @returns {Object} Effect data to add to actor
 */
async function createEffectRallyingAnthem(source, duration, intensity, traits, modifier) {

  const level = source.actor.level;

  const rallyingAnthemSpellEffect = {
    type: "effect",
    name: "Spell Effect: Rallying Anthem",
    img: "systems/pf2e/icons/spells/inspire-defense.webp",
    system: {
      slug: `spell-effect-rallying-anthem${modifier}`,
      tokenIcon: {
        show: true
      },
      duration: {
        value: duration,
        unit: "rounds",
        sustained: false,
        expiry: "turn-start"
      },
      level: {
        value: level
      },
      rules: [{
          key: "FlatModifier",
          selector: [
            "ac",
            "saving-throw"
          ],
          type: "status",
          value: intensity,
        },
        {
          key: "Resistance",
          type: "physical",
          value: "floor(( @item.level ) / 2 )",
        },
      ],
      context: generateContext(source)
    }
  };

  return rallyingAnthemSpellEffect;

}

/**
 * Generate effect data and special aura for Dirge of Doom.
 *
 * @param {Object} source - The token origin of Dirge of Doom
 * @param {number} duration - Desired duration of the effect
 * @param {number} intensity - Value for the status bonus (unused)
 * @param {string[]} traits - Traits to add to the effect
 * @returns {Object} Effect data to add to actor
 */
async function dirgeOfDoomHandler(source, duration, intensity, traits, modifier) {

  const level = source.actor.level;
  const baseTraits = ["mental", "fear", "emotion"];
  const finalTraits = [...baseTraits, ...traits].sort();

  const dirgeOfDoomAura = {
    type: "effect",
    name: "Aura: Dirge of Doom",
    img: "systems/pf2e/icons/spells/dirge-of-doom.webp",
    system: {
      slug: `aura-dirge-of-doom${modifier}`,
      tokenIcon: {
        show: true
      },
      duration: {
        value: duration,
        unit: "rounds",
        sustained: false,
        expiry: "turn-start"
      },
      level: {
        value: level
      },
      rules: [{
        key: "Aura",
        radius: 30,
        traits: finalTraits,
        slug: `aura-dirge-of-doom${modifier}`,
        effects: [{
          uuid: "Compendium.xdy-pf2e-workbench.xdy-pf2e-workbench-items.Item.Er8NTtocbKcUpBAa",
          affects: "enemies",
          includesSelf: false
        }]
      }],
      context: generateContext(source)
    }
  };

  const result = await source.actor.createEmbeddedDocuments("Item", [dirgeOfDoomAura]);

  return game.pf2e.ConditionManager.getCondition("frightened")
}

// Filter active actor data for valid composition spells
const compositions = actor.itemTypes.spell.filter((s) => supportedCompositions.includes(s?.slug));
// Filter active actor data for valid spellshapes
const spellshapes = actor.itemTypes.spell.filter((s) => supportedSpellshapes.includes(s?.slug));

if (compositions.length === 0) {
  return void ui.notifications.warn('Selected token has no compositions.');
}

// Prepare data for generateSelectorDialog
const compositionsPrepared = {
  label: "Choose a Composition: ",
  selectorName: "Compositions",
  options: compositions
}

const spellshapesPrepared = {
  label: "Choose a Spellshape: ",
  selectorName: "Spellshapes",
  options: spellshapes
}

// Create AppV2 dialog and fetch the results
const selections = await generateSelectorDialog("Choose a Composition and optional Spellshape:", compositionsPrepared, spellshapesPrepared);

if (selections == null || !selections?.compositionUuid) {
  return void ui.notifications.warn("Invalid selections.");
}

// Then parse them out
const selectedComposition = actor.itemTypes.spell.find((s) => s.uuid === selections.compositionUuid);
const selectedSpellshape = actor.itemTypes.spell.find((s) => s.uuid === selections.spellshapeUuid);
const selectedPerformance = selections.performanceType;
const selectedDc = selections.customDc;
const validity = validateSelection(token, selectedComposition, selectedSpellshape);

// Check selection validity with validateSelection
if (validity === false) {
  return void ui.notifications.warn(`${selectedComposition?.name} cannot be used with ${selectedSpellshape.name}.`);
} else if (typeof validity === 'string') {
  return void ui.notifications.warn(validity)
}

// Inject spell traits and generate target list
let modifiedComposition = injectSpellTraits(selectedComposition, selectedPerformance)
const targets = generateTargets(token, modifiedComposition);

let defaultDc;
let intensity = 1;
let duration = 1;
let fpCost = 0;

// Set DCs
if (selectedSpellshape?.slug === "lingering-composition") {
  defaultDc = dcByLevel[getMaxLevel(targets)];
} else if (selectedSpellshape?.slug === "fortissimo-composition") {
  defaultDc = getMaxWillDc(targets);
}
const targetDc = parseInt(selectedDc, 10) || defaultDc;

// If a spellshape was selected create a roll prompt and get the results
if (selectedSpellshape) {

  const resultMap = {
    success: 2,
    criticalSuccess: 3
  };

  let rollResults;
  const outcomes = generateOutcomes(selectedSpellshape?.slug);
  const action = generatePerformanceCheck(selectedPerformance, outcomes, targetDc, selectedSpellshape.name);

  rollResults = await dsnHook(action.use({
    event: selections.initialEvent,
    actor
  })).then(
    (r) => ({
      outcome: r?.[0]?.outcome,
    })
  );
  
  const resultVal = resultMap?.[rollResults.outcome] ?? 0;

  // Set duration and FP cost
  if (selectedSpellshape.slug === "lingering-composition") {
    duration = resultVal + 1;
    fpCost += resultVal ? 1 : 0;
  } else if (selectedSpellshape.slug === "fortissimo-composition") {
    intensity = resultVal || 1;
    fpCost += resultVal ? 1 : 0;
  }
}

// Pick function for generating effect data
let effectGenerator;
switch (selectedComposition.slug) {
case "courageous-anthem":
  effectGenerator = createEffectCourageousAnthem;
  break;
case "song-of-strength":
  effectGenerator = createEffectSongOfStrength;
  break;
case "dirge-of-doom":
  effectGenerator = dirgeOfDoomHandler;
  break;
case "rallying-anthem":
  effectGenerator = createEffectRallyingAnthem;
  break;
}

// Generate the effect, send the spell card to chat, then apply the effects to the targets
const effectToApply = await effectGenerator(token, duration, intensity, generateTraits([], selectedPerformance), `-${selectedSpellshape?.slug}`);

let hasPermissions = true;
for (const target of targets) {
  if (!target.actor.testUserPermission(game.user, "OWNER")) {
    hasPermissions = false;
  };
}

if (hasPermissions) {
  await Promise.all(targets.map(async (t) => { return await t.actor.createEmbeddedDocuments("Item", [effectToApply]) }))
} else if (modifiedComposition.slug !== "dirge-of-doom") {
  const result = await actor.createEmbeddedDocuments("Item", [effectToApply])
  if (result) {
    const effectUuid = `${actor.uuid}.Item.${result?.[0]?._id}`;
    const prevDescription = modifiedComposition.system.description.value;
    modifiedComposition.system.duration.value = duration > 1 ? `${duration} rounds` : "1 round;"
    modifiedComposition.system.description.value = prevDescription.replace(/@UUID\[.*]{.*}/, `@UUID[${effectUuid}]{${effectToApply.name}}`).replace(/ \+1 /, ` +${intensity} `)
  }
}

await modifiedComposition.toMessage();

// Finally, decrement FP if necessary
if (fpCost) {
  await actor.update({
    "system.resources.focus.value": actor.system.resources.focus.value - fpCost
  });
}

