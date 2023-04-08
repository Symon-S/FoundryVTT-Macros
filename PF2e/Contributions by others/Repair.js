/*
updated by darkim

Repair a thing other than an item (for that there is an Macro in the pf2e System which works really great - use it)

Currently the system macro only works with items. Not with companions or not when you just want to repair something in the world.
Here is a small macro to just make a repair check and have a good output dependent on the result.

Limitations:
* Does not handle assurance.
* Does not (yet) check if you have an repair kit or a feat that allows to repair without one.
*/


/**
* Check if any itemType equipment of the actor matches a slug (and optionally checks in how many hands it is held)
*
* @param {string} slug Slug of the equipment to search
* @param {int} hands Number of hands the item shall be held
* @returns {boolean} true if the actor has a matching item equipment
*/
const checkItemPresent = (slug, hands) =>
token.actor.itemTypes.equipment.some(
 (equipment) => equipment.slug === slug && (!hands || equipment.handsHeld === hands)
);

/**
* Wrapper for the DSN Hook. It will only use the hook if the non-buggy setting is not enabled.
*
* @param {Object} code code which will be executed
*/
function dsnHook(code) {
    if (game.modules.get("dice-so-nice")?.active && !game.settings.get("dice-so-nice", "immediatelyDisplayChatMessages") && !game.modules.get("df-manual-rolls")?.active) {
        Hooks.once('diceSoNiceRollComplete', code);
    } else {
      code();
    }
}

/**
 * Check wether the current actor has a feature.
 *
 * @param {string} slug
 * @returns {boolean} true if the feature exists, false otherwise
 */
const checkFeat = (slug) =>
token.actor.items
  .filter((item) => item.type === 'feat')
  .some((item) => item.slug === slug);


if (canvas.tokens.controlled.length !== 1){
    ui.notifications.warn('You need to select exactly one token to perform repair.');
} else {
    const hasRepairKit = checkItemPresent('repair-kit') || checkItemPresent('repair-kit-superb');
    // const hasRepairFeat = checkFeat('tinkering-fingers');

    const skillName = "Repair";
    const skillKey = "cra";
    const actionSlug = "Repair"
    const actionName = "Repair"

    const modifiers = []

    let DCsByLevel = [14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40, 42, 44, 46, 48, 50]
    let DC = DCsByLevel[token.actor.system.details.level.value + 2]

    const notes = [...token.actor.system.skills[skillKey].notes]; // add more notes if necessary
    const options = token.actor.getRollOptions(['all', 'skill-check', skillName.toLowerCase()]);
    options.push(`action:${actionSlug}`);
    let DamageRoll = CONFIG.Dice.rolls.find((r) => r.name == "DamageRoll");
    game.pf2e.Check.roll(
        new game.pf2e.CheckModifier(
            `<span class="pf2-icon">A</span> <b>${actionName}</b> - <p class="compact-text">${skillName} Skill Check</p>`,
            token.actor.system.skills[skillKey], modifiers),
        { actor: token.actor, type: 'skill-check', options, notes, dc: { value: DC } }, //for DC insert: , dc: {value: 30}
        event,
        async (roll) => {
            if (roll.degreeOfSuccess === 3) {
                // crit success message
                dsnHook(() => {
                    new DamageRoll(`10 + ${token.actor.skills.crafting.rank} * 10`).toMessage({ 
                        flavor: `<strong>Critical Success</strong><br>You restore 10 Hit Points to the item, plus an additional 10 Hit Points per proficiency rank you have in Crafting (a total of 20 HP if you’re trained, 30 HP if you’re an expert, 40 HP if you’re a master, or 50 HP if you’re legendary).`,
                        speaker: ChatMessage.getSpeaker(),
                    });
                });
            } else if (roll.degreeOfSuccess === 2) {
                // success message
                dsnHook(() => {
                    new DamageRoll(`5 + ${token.actor.skills.crafting.rank} * 5`).toMessage({ 
                        flavor: `<strong>Success</strong><br>You restore 5 Hit Points to the item, plus an additional 5 per proficiency rank you have in Crafting (for a total of 10 HP if you are trained, 15 HP if you’re an expert, 20 HP if you’re a master, or 25 HP if you’re legendary).`,
                        speaker: ChatMessage.getSpeaker(),
                    });
                });
            } else if (roll.degreeOfSuccess === 1) {
                // Fail message
                dsnHook(() => {
                    ChatMessage.create({
                        user: game.user.id,
                        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                        flavor: `<strong>Failure</strong><br>You fail to make the repair and nothing happens.`,
                        speaker: ChatMessage.getSpeaker(),
                    });
                });
            } else if (roll.degreeOfSuccess === 0) {
                // crit fail damage
                dsnHook(() => {
                    new DamageRoll("2d6").toMessage({ 
                        flavor: "<strong>Critical Failure</strong><br>You deal 2d6 damage to the item. Apply the item’s Hardness to this damage.",
                        speaker: ChatMessage.getSpeaker(),
                    });
                });
            }
        },
    );
}