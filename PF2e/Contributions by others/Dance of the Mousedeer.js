/*
Dance of the Mousedeer
Authored by Theroxenes
Tested on Foundry v13.350, pf2e v7.6.2
This macro automates relative cover and immunity for the Wayang Dance of the Mousedeer ancestry feat.

* Validates target count
* Checks if the target is immune and applies immunity on critical failure
* Checks if the target is immune to any traits
* Checks the 30ft range limit
* Applies adjusted relative cover effect for each target on (crit) success
* Effect is suppressed when unconscious.
*
* DOES NOT remove cover effect on movement or attack action.
* If running the macro directly i.e. not running it through Workbench,
* applying immunity will need to be done manually by an owner.

Functionality largely lifted from the Demoralize macros by ArthurTrumpet, darkium, and kromko
*/

// jQuery handling was based on the example in Community wiki
// https://foundryvtt.wiki/en/development/api/dialog#fruitpromptjs

// Save event macro invoked with, e.g. shift click for the slow roll dialog
const initialEvent = event;

// Set up token/actor variables.
const actor = _token.actor;
const scriptActorId = actor.id;
const tokenId = _token.id;
const targets = game.user.targets;
let maxTargets = 1;

// Check if 1 token is active and has the feat.
if (canvas.tokens.controlled.length != 1) {
  return ui.notifications.warn(
    "You need to select exactly one token to perform Dance of the Mousedeer."
  );
} else if (
  !actor.items.some((dotmd) => dotmd.slug === "dance-of-the-mousedeer")
) {
  return void ui.notifications.warn(
    `${token.name} does not have Dance of the Mousedeer.`
  );
}

// Check active actor's performance proficiency and generate target limit
const performanceRank = actor.skills.performance.rank;
if (performanceRank > 0) {
  maxTargets = 2 ** (performanceRank - 1);
}

// Then check targeting parameters.
if (game.user.targets.size == 0) {
  return ui.notifications.warn("You must target at least one token.");
} else if (game.user.targets.size > maxTargets) {
  return ui.notifications.warn(
    `Your Performance proficiency allows a maximum of ${maxTargets} target(s).`
  );
}

// Set up metagame name hiding
const respectHiddenNames = game.settings.get(
  "pf2e",
  "metagame_tokenSetsNameVisibility"
);
const hideActorName = respectHiddenNames && !_token.document.playersCanSeeName;
const actorName = !hideActorName ? _token.name : "Unknown";
const actorChatName = !hideActorName
  ? actorName
  : `Unknown <span data-visibility="gm">(${_token.name})</span>`;

/**
 * Wrapper for the DSN Hook. If DSN is enabled, waits for the physical dice to stop rolling (unless the roll has assurance)
 *
 * @param {Promise<Object>} rollPromise Promise of roll results
 */
function dsnHook(rollPromise) {
  if (game.modules.get("dice-so-nice")?.active) {
    return rollPromise.then(async (results) => {
      await Promise.all(
        results.map((r) => {
          // Check if we are using assurance
          if (
            r.message
              .getFlag("pf2e", "context.options")
              .includes("substitute:assurance")
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

// Immunity check function
function isImmune(targetActor, trait) {
  return (
    targetActor.system.attributes.immunities.some(
      (i) => i.type === trait
    ) ||
    targetActor.itemTypes.effect.some(
      (e) =>
        e.slug === "effect-danceofthemousedeer-immunity" &&
        e.flags?.dotmd?.source === scriptActorId
    )
  );
}

// Helper function to generate dynamic relative cover effect.
function generateCover(coverTargetMap, previous) {
  // Check if we are updating a previous effect and filter out the redundant values
  if (previous) {
    let newSignatures = coverTargetMap.map((t) => t.signature);
    let oldSignatures = previous.map((t) => t.signature);
    let toAdd = previous.filter(
      (add) => !newSignatures.includes(add.signature)
    );
    let upgradeDefinitely = coverTargetMap.filter((ud) =>
      oldSignatures.includes(
        previous.find(
          (t) => t.signature === ud.signature && t.level < ud.level
        )?.signature
      )
    );
    let higherPrevious = previous.filter((hp) =>
      newSignatures.includes(
        coverTargetMap.find(
          (t) => t.signature === hp.signature && t.level < hp.level
        )?.signature
      )
    );
    toRemove = upgradeDefinitely
      .map((t) => t.signature)
      .concat(higherPrevious.map((t) => t.signature));

    coverTargetMap = coverTargetMap
      .filter((t) => !toRemove.includes(t.signature))
      .concat(toAdd, upgradeDefinitely, higherPrevious);
  }

  // Set up filtered arrays for the predicates in the effect
  const standardCovers = coverTargetMap
    .filter((t) => t.level === 2)
    .map((t) => `origin:signature:${t.signature}`);
  const greaterCovers = coverTargetMap
    .filter((t) => t.level === 4)
    .map((t) => `origin:signature:${t.signature}`);
  const standardStealth = coverTargetMap
    .filter((t) => t.level === 2)
    .map((t) => `target:signature:${t.signature}`);
  const greaterStealth = coverTargetMap
    .filter((t) => t.level === 4)
    .map((t) => `target:signature:${t.signature}`);

  if (![standardCovers, greaterCovers].some((a) => a?.length > 0)) {
    return false;
  }

  // Define cover effect rules
  const dotmdCoverEffect = {
    type: "effect",
    name: "Dance of the Mousedeer",
    img: "systems/pf2e/icons/equipment/shields/steel-shield.webp",
    system: {
      slug: "effect-danceofthemousedeer-cover",
      tokenIcon: {
        show: true,
      },
      duration: {
        value: 1,
        unit: "rounds",
        sustained: false,
        expiry: "turn-start",
      },
      rules: [
        {
          label: "Dance of the Mousedeer Standard Cover",
          key: "FlatModifier",
          selector: "ac",
          type: "circumstance",
          value: 2,
          predicate: [
            { or: standardCovers },
            { not: "self:condition:unconscious" },
          ],
        },
        {
          label: "Dance of the Mousedeer Greater Cover",
          key: "FlatModifier",
          selector: "ac",
          type: "circumstance",
          value: 4,
          predicate: [
            { or: greaterCovers },
            { not: "self:condition:unconscious" },
          ],
        },
        {
          label: "Dance of the Mousedeer Standard Cover",
          key: "FlatModifier",
          selector: "stealth",
          type: "circumstance",
          value: 2,
          predicate: [
            {
              or: [
                "action:hide",
                "action:sneak",
                "avoid-detection",
              ],
            },
            { or: standardStealth },
            { not: "self:condition:unconscious" },
          ],
        },
        {
          label: "Dance of the Mousedeer Greater Cover",
          key: "FlatModifier",
          selector: "stealth",
          type: "circumstance",
          value: 4,
          predicate: [
            {
              or: [
                "action:hide",
                "action:sneak",
                "avoid-detection",
              ],
            },
            { or: greaterStealth },
            { not: "self:condition:unconscious" },
          ],
        },
      ],
    },
  };

  // And set flags for checking this effect if it is reapplied
  dotmdCoverEffect.flags = {
    dotmd: {
      targets: coverTargetMap,
    },
  };
  return dotmdCoverEffect;
}

// Function that handles effect application logic
async function applyDotmdEffects(results, sourceTokenId, sourceName) {
  // Set up function vars
  let source = canvas.tokens.get(sourceTokenId);
  let coverTargetMap = [];
  let previousEffect = source.actor.itemTypes.effect.find(
    (e) => e.slug === "effect-danceofthemousedeer-cover"
  );
  let previous = previousEffect?.flags?.dotmd?.targets;
  const successVals = {
    criticalSuccess: 4,
    success: 2,
  };
  const dotmdImmunityEffect = {
    type: "effect",
    name: `Dance of the Mousedeer Immunity: ${sourceName}`,
    img: `${source.actor.prototypeToken.texture.src}`,
    system: {
      slug: "effect-danceofthemousedeer-immunity",
      tokenIcon: {
        show: true,
      },
      duration: {
        value: 24,
        unit: "hours",
        sustained: false,
        expiry: "turn-end",
      },
      rules: [],
    },
  };
  dotmdImmunityEffect.flags = {
    dotmd: {
      source: `${source.actor.id}`,
    },
  };

  // If there are any (crit) successes send a reminder chat message for removing the effect on movement or attack
  if (
    results.some((r) => ["success", "criticalSuccess"].includes(r.outcome))
  ) {
    ChatMessage.create({
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content:
        "<strong>NOTE: Manually remove Dance of the Mousedeer effect on attack actions or movement.</strong>",
      speaker: ChatMessage.getSpeaker(),
    });
  }

  // Iterate through passed results, preparing effects and generating chat messages as appropriate.
  for (i in results) {
    // Set loop variables
    let res = results[i];
    let target = canvas.tokens.get(res.targetTokenId);
    let targetSignature = target.actor.signature;
    let level = successVals[res.outcome];

    // Crit fail logic
    if (["criticalFailure"].includes(res.outcome)) {
      // Temporary immunity
      // Check if we have permissions to edit all of the target actors
      if (!target?.actor.isOwner) {
        // If not, append a link to the effect in chat so the GM can apply it.
        // Slightly janky, also adds the effect to the active actor. Not sure if there's a better way to do this.
        let immunity = source.actor.itemTypes.effect.find(
          (e) =>
            e.slug === "effect-danceofthemousedeer-immunity" &&
            e.flags?.dotmd?.source === source.actor.id
        );

        // If an immunity on the active actor exists already, don't make a new one
        if (!immunity) {
          immunity = (
            await actor.createEmbeddedDocuments("Item", [
              dotmdImmunityEffect,
            ])
          )[0];
        }

        // Append the effect link to the output message.
        let summary = `${actorChatName} uses Dance of the Mousedeer on ${res.targetChatName} <span data-visibility="gm">@UUID[${target.actor.uuid}]{${target.name}}</span><hr/>Critical Failure`;
        summary += `<br/>Add the immunity effect manually:<br/>@UUID[Actor.${source.actor._id}.Item.${immunity._id}]`;
        summary += "{DotMD Immunity}";
        ChatMessage.create({
          user: game.user.id,
          type: CONST.CHAT_MESSAGE_STYLES.OTHER,
          content: summary,
          speaker: ChatMessage.getSpeaker(),
        });
      } else {
        // Otherwise apply the effect directly.
        await target.actor.createEmbeddedDocuments("Item", [
          dotmdImmunityEffect,
        ]);
      }

      // If the result is invalid targeting due to immunity or distance, also send a message.
    } else if (["too far", "immune"].includes(res.outcome)) {
      ChatMessage.create({
        user: game.user.id,
        type: CONST.CHAT_MESSAGE_STYLES.OTHER,
        content: `${res.targetChatName} is ${res.outcome}.`,
        speaker: ChatMessage.getSpeaker(),
      });
    } else {
      // Prepare value to be passed into generateCover
      let thisCoverMap = { signature: targetSignature, level: level };
      if (level) {
        coverTargetMap.push(thisCoverMap);
      }
    }

  }

  // Actually generate the cover effect, and apply it
  // But only if there is something to apply
  coverEffect = generateCover(coverTargetMap, previous);
  if (
    coverEffect &&
    results.some((r) => ["success", "criticalSuccess"].includes(r.outcome))
  ) {
    // And update the previous effect if it exists
    if (previousEffect) {
      await previousEffect.update(coverEffect);
    } else {
      await source.actor.createEmbeddedDocuments("Item", [coverEffect]);
    }
  }
  return undefined;
}

// Use Perform as a base action to build DotMD action.
const baseAction = game.pf2e.actions.get("perform");
// Prepare traits and modifiers.
let actionOptions = {
  traits: ["illusion", "occult", "shadow", "visual", "wayang"],
  modifiers: baseAction.modifiers,
  statistic: baseAction.skill,
  difficultyClass: "perception",
  name: "Dance of the Mousedeer",
  description: "",
  slug: "",
  rollOptions: ["action:perform:dance"],
  notes: [
    {
      outcome: ["criticalSuccess"],
      text: "<strong>Critical Success</strong> Imaginary shadows rise up in the target's vision, hiding you from sight. You gain greater cover against that enemy, which provides a +4 circumstance bonus to AC and to Stealth checks to @UUID[Compendium.pf2e.actionspf2e.Item.XMcnh4cSI32tljXa]{Hide}, @UUID[Compendium.pf2e.actionspf2e.Item.VMozDqMMuK5kpoX4]{Sneak}, or otherwise avoid detection. As the shadows are illusory, you don't gain the typical bonus to Reflex saves from greater cover. These benefits last until the beginning of your next turn, or until you move from your current space, use an attack action, or become @UUID[Compendium.pf2e.conditionitems.Item.fBnFDH2MTzgFijKf]{Unconscious}, whichever comes first.",
      selector: "",
    },
    {
      outcome: ["success"],
      text: "<strong>Success</strong> Imaginary shadows rise up in the target's vision, hiding you from sight. You gain standard cover against that enemy, which provides a +2 circumstance bonus to AC and to Stealth checks to @UUID[Compendium.pf2e.actionspf2e.Item.XMcnh4cSI32tljXa]{Hide}, @UUID[Compendium.pf2e.actionspf2e.Item.VMozDqMMuK5kpoX4]{Sneak}, or otherwise avoid detection. As the shadows are illusory, you don't gain the typical bonus to Reflex saves from standard cover. These benefits last until the beginning of your next turn, or until you move from your current space, use an attack action, or become @UUID[Compendium.pf2e.conditionitems.Item.fBnFDH2MTzgFijKf]{Unconscious}, whichever comes first.",
      selector: "",
    },
    {
      outcome: ["criticalFailure"],
      text: "<strong>Critical Failure</strong>The opponent grasps the movements of your dance, becoming temporarily immune to your Dance of the Mousedeer for 1 day.",
      selector: "",
    },
  ],
};

let rollResults = targets.map((target) => {
  const hideTargetName =
    respectHiddenNames && !target.document.playersCanSeeName;
  const targetName = !hideTargetName ? target.name : "Unknown";
  const targetChatName = !hideTargetName
    ? targetName
    : `Unknown <span data-visibility="gm">(${target.name})</span>`;

  let baseResult = {
    targetTokenId: target.id,
    targetName: targetName,
    targetChatName: targetChatName,
  };

  // Check for target distance.
  if (target.distanceTo(_token) > 30) {
    return new Promise((resolve) =>
      resolve({
        ...baseResult,
        outcome: "too far",
      })
    );
  }

  // Modify the base Perform action.
  let action = baseAction.toActionVariant({
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

  // Check for trait immunity.
  let immunity = actionOptions.traits.find((trait) =>
    isImmune(target.actor, trait)
  );
  if (immunity) {
    return new Promise((resolve) =>
      resolve({
        ...baseResult,
        outcome: "immune",
      })
    );
  }

  return dsnHook(action.use({ event: initialEvent, actor, target })).then(
    (r) => ({
      ...baseResult,
      outcome: r?.[0]?.outcome,
    })
  );
});

// Roll the results and pass them to the handler function if they exist.
rollResults = await Promise.all(rollResults);
if (rollResults.some((r) => r.outcome)) {
  await applyDotmdEffects(rollResults, tokenId, actorName);
}
