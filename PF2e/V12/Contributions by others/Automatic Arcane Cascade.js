/* Automatically get correct damage type for Arcane Cascade.

 By Trent#7043

 Looks for the most recent spell cast by the actor in the current scene and
 applies the Arcane Cascade effect to the actor with the damage type
 automatically selected based on the spell damage (remaster rules).  If the
 spell does multiple damage types, the choiceset dialog will still appear, but
 only the damage types from the spell will be present as choices.

 Remove an existing AC Effect when the new one is added.
*/

const ACEffectUuid = 'Compendium.pf2e.feat-effects.Item.fsjO5oTKttsbpaKl';

const msg = game.messages.contents.findLast(m =>
  m.speaker.actor === actor.id &&
  (m.flags.pf2e.origin?.type === 'spell' ||
    (m.flags.pf2e.context?.type === 'attack-roll' && m.flags.world?.macro?.spellUsed)) &&
  m.speaker.scene === game.scenes.active.id);

let spell;
if (msg) {
  spell = msg.flags.pf2e.origin.type === 'spell' ? msg.item : actor.items.get(msg.flags.world.macro.spellUsed.spell._id);
}
if (!spell) {
  ui.notifications.warn("You haven't cast a Spell or made a Spellstrike!");
  return;
}
const dtypes = Object.values(spell.system.damage).map(d => d.type);
const effect = (await fromUuid(ACEffectUuid)).toObject();
const re = effect.system.rules.find(r => r.flag === 'stanceArcaneCascade');
if (dtypes.length <= 1) {
  // One or no damage, we know the type.
  re.selection = dtypes[0] ?? 'force';
} else {
  // Multiple damage types, restrict choices to those done by spell.
  re.choices = re.choices.filter(c => dtypes.includes(c.value));
}
await actor.itemTypes.effect.find(e => e.sourceId === effect.sourceId)?.delete();
actor.createEmbeddedDocuments("Item", [effect]);
