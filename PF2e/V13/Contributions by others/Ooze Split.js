//Ooze Split Extended, by esheyw, last updated 05 Dec 2023
//creates duplicate ooze token in the space of the original. 
//automatically adds new token to tracker and rolls initiative if combat exists
//moving the generated token is left to the GM
//special handling for Pyronite Oozes (they get an effect applied forcing them to be Medium)
//only large Pyro oozes can split.

if (canvas.tokens.controlled.length !== 1) return ui.notifications.error("Please select only a single token.");
if (!actor.traits.has('ooze')) return ui.notifications.error("Selected token is not an ooze.");
const PYROSOURCE = 'Compendium.pf2e.outlaws-of-alkenstar-bestiary.Actor.aT6c5oEPV8U5zfRD';
if (actor.sourceId === PYROSOURCE && actor.size !== 'lg') return ui.notifications.error(`Only large Pyronite Oozes split.`);
const splitAbility = actor.itemTypes.action.find(a=>a.name.includes('Split'));
if (!splitAbility) return ui.notifications.error(`Selected ooze does not have a Split ability.`);
let sT = splitAbility.system.description.value.match(/(\d+) or more HP/);
if (!sT) sT = splitAbility.system.description.value.match(/at least (\d+) HP/);
if (!sT) ui.notifications.info(`Couldn't extract split threshold, defaulting to 10.`);
sT = parseInt(sT[1] ?? 10,10);

if (actor.hitPoints.value < sT) return ui.notifications.error("Selected ooze is too damaged to split.");
await actor.update({"system.attributes.hp.value": Math.floor(actor.hitPoints.value/2)});
const [created] = await canvas.scene.createEmbeddedDocuments("Token",[token.document.toObject()])

if (actor.sourceId === PYROSOURCE) {
  await splitAbility.toMessage(undefined, {rollMode:CONST.DICE_ROLL_MODES.BLIND});
  const effectString = `{"name":"Split Pyronite Ooze","type":"effect","system":{"rules":[{"key":"CreatureSize","value":"medium"}],"level":{"value":1},"duration":{"value":-1,"unit":"unlimited","expiry":null,"sustained":false},"tokenIcon":{"show":true}},"img":"systems/pf2e/icons/default-icons/alternatives/ancestries/halfling.svg"}`;
  const effectData = JSON.parse(effectString);
  await actor.createEmbeddedDocuments("Item", [effectData]);
  await created.actor.createEmbeddedDocuments("Item", [effectData]);
}
if (game.combat && token.inCombat) await created.actor.rollInitiative({createCombatants:true});