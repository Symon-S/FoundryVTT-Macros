/*Overdrive Macro by redeux
tested V9 / pf2 3.2.2.10109
Based off of PF2 wiki's generic customizable macro
Major thanks to stwlam for the massive legs crashing through some barriers I ran into (async roll after updating to V9 and sending dmg to chat)
*/

let DCbyLevel = [14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40, 42, 44, 46, 48, 50]

let DC = DCbyLevel[token.actor.data.data.details.level.value]

const actors = canvas.tokens.controlled.flatMap((token) => token.actor ?? []);
if (!actors.length && game.user.character) {
    actors.push(game.user.character);
}
const skillName = "Overdrive";
const skillKey = "cra";
const actionSlug = "Overdrive"
const actionName = "Overdrive"

const modifiers = []
// list custom modifiers for a single roll here
//const modifiers = [
//new game.pf2e.Modifier('Expanded Healer\'s Tools', 1, 'item')
//];

const notes = [...token.actor.data.data.skills[skillKey].notes]; // add more notes if necessary
const options = token.actor.getRollOptions(['all', 'skill-check', skillName.toLowerCase()]);
options.push(`action:${actionSlug}`);
game.pf2e.Check.roll(
    new game.pf2e.CheckModifier(
        `<span class="pf2-icon">A</span> <b>${actionName}</b> - <p class="compact-text">${skillName} Skill Check</p>`,
        token.actor.data.data.skills[skillKey], modifiers),
    { actor: token.actor, type: 'skill-check', options, notes, dc: { value: DC } }, //for DC insert: , dc: {value: 30}
    event,
    async (roll) => {
        //console.log(roll);
        const resultNum = roll._total;
        if (roll.data.degreeOfSuccess === 3) {
            //apply crit effect
            const ITEM_UUID = 'Compendium.pf2e.feat-effects.1XlJ9xLzL19GHoOL'; // Overdrive-Crit
            const source = (await fromUuid(ITEM_UUID)).toObject();
            source.flags.core ??= {};
            source.flags.core.sourceId = ITEM_UUID;
            for await (const actor of actors) {
                const existing = actor.itemTypes.effect.find((effect) => effect.getFlag('core', 'sourceId') === ITEM_UUID);
                if (existing) {
                    //await existing.delete();
                } else {
                    await actor.createEmbeddedDocuments('Item', [source]);
                }
            };
            } else if (roll.data.degreeOfSuccess === 2) {
            //apply success effect
            const ITEM_UUID = 'Compendium.pf2e.feat-effects.MZDh3170EFIfOwTO'; // Effect: Overdrive (Success)
            const source = (await fromUuid(ITEM_UUID)).toObject();
            source.flags.core ??= {};
            source.flags.core.sourceId = ITEM_UUID;
            for await (const actor of actors) {
                const existing = actor.itemTypes.effect.find((effect) => effect.getFlag('core', 'sourceId') === ITEM_UUID);
                if (existing) {
                    //await existing.delete();
                } else {
                    await actor.createEmbeddedDocuments('Item', [source]);
                }
            };
        } else if (roll.data.degreeOfSuccess === 0) {
            //crit fail damage
            let actorLevel = token.actor.data.data.details.level.value
            await new Roll("{" + actorLevel + "}[fire]").toMessage({ flavor: "Overdrive Critical Malfunction 🔥!!" });
        }
    },
);
