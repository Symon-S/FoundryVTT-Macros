/*
Simple Bless macro that applies the aura item in the workbench module on first click
On second click it will ask if it is sustained.
If yes (or press enter), the aura grows by 5 feet
If Dismiss, the bless aura will be dismissed
*/

if (!game.modules.get('xdy-pf2e-workbench')?.active) { return ui.notifications.error('This macro requires workbench module to be installed!'); }
if (!actor || token.actor.type !== 'character') { return ui.notifications.warn("You must have a PC token selected"); }
if (!token.actor.itemTypes.spell.some(x => x.slug === 'bless')) { return ui.notifications.warn('You do not possess the bless spell'); }
const effect = (await fromUuid('Compendium.xdy-pf2e-workbench.xdy-pf2e-workbench-items.BqkDxiAi0q6Uaar4')).toObject();
effect.data.slug = 'bless-aura';
let first = false;
if (!token.actor.itemTypes.effect.some(e => e.slug === 'bless-aura')) { 
    await token.actor.createEmbeddedDocuments("Item", [effect]);
    first = true;
}
if (token.actor.itemTypes.effect.some(e => e.slug === 'bless-aura') && !first) {
    await new Promise((resolve) => {
    new Dialog({
      title: 'Sustain?',
      buttons: {
        yes: { label: 'Yes', callback: async (html) => {
            const id = token.actor.itemTypes.effect.find(e => e.slug === 'bless-aura').id;
            const ef = token.actor.getEmbeddedDocument("Item",id).toObject();
            ef.data.rules[0].radius += 5;
            await token.actor.updateEmbeddedDocuments("Item", [ef],resolve);
            } 
        },
        no: { label: 'Dismiss', callback: async (html) => {
            await token.actor.itemTypes.effect.find(e => e.slug === 'bless-aura').delete(resolve);
          } 
            
        },
      },
      default: 'yes'
    }).render(true);
  });
}
