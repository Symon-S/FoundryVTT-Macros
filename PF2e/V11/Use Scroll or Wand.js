//This macro allows you to send scrolls and wands directly to chat as if you had clicked on them in your character sheet.
//Also handles overcharging.

new Dialog({
  title: "Wand or Scroll?",
  buttons: {
   w: {
    label: "Wand",
    callback: Wand,
   },
   s: {
    label: "Scroll",
    callback: Scroll,
   },
  },
  default: "s",
}).render(true);

let title;

async function Scroll() {  
 
  title = `Cast a Scroll`
 
  const scroll = actor.itemTypes.consumable.filter(s => s.system.category === "scroll" && s.isIdentified);
  scroll.sort((a, b) => {
    if (a.level === b.level)
      return a.name
      .toUpperCase()
      .localeCompare(b.name.toUpperCase(), undefined, {
        sensitivity: "base",
      });
    return a.level - b.level;
  });
 
  if (scroll.length === 0) { return ui.notifications.warn("You do don't have scrolls to cast from.");}
  const choiceS = await choose(scroll.flatMap(n => [[n.uuid, n.name]]),`Pick a Scroll`);
  const chosen = scroll.find(x => x.uuid === choiceS);
  await chosen.consume();
}
 
async function Wand(){
  let overcharge = false;
  if (actor.itemTypes.consumable.some(s => s.system.category === "wand" && s.isIdentified && s.system.uses?.value === 0 && !actor.itemTypes.effect.some(e => e.slug === s.uuid))) {
    overcharge = await Dialog.confirm({
      title: "Overcharge a wand?",
      yes: () => { return true },
      no: () => { return false },
      defaultYes: false
    })
  }
  
  title = `Cast a Wand`
  let wand = [];
  if (!overcharge) {
    wand = actor.itemTypes.consumable.filter(s => s.system.category === "wand" && s.isIdentified && s.system.uses?.value > 0);
    if (wand.length === 0) { return ui.notifications.warn("You do don't have wands to cast from.");}
  }
  else {
    wand = actor.itemTypes.consumable.filter(s => s.system.category === "wand" && s.isIdentified && s.system.uses?.value === 0 && !actor.itemTypes.effect.some(e => e.slug === s.uuid));
    if (wand.length === 0) { return ui.notifications.warn("You do don't have wands to overcharge.");}
  }
  wand.sort((a, b) => {
    if (a.level === b.level)
      return a.name
      .toUpperCase()
      .localeCompare(b.name.toUpperCase(), undefined, {
        sensitivity: "base",
      });
    return a.level - b.level;
  });
  
  const choiceW = await choose(wand.flatMap(n => [[n.uuid, n.name]]),`Pick a Wand`);
  const chosen = await wand.find(x => x.uuid === choiceW);
  const quantity = chosen.quantity;
  if (chosen.quantity === 0 && actor.system.resources.heroPoints.value === 0) { return ui.notifications.warn("You have no hero points left"); }
  let fail = `${chosen.name} has been destroyed and the quantity has been reduced to zero in case you would like to try using a hero point on the flat check.<br><strong>Please remove the destroyed wand from your inventory or reuse the macro for proper reroll automation.</strong>`;
  let success = `${chosen.name} is @UUID[Compendium.pf2e.conditionitems.Item.6dNUvdb1dhToNDj3] and needs to be repaired. If anyone tries to overcharge a wand when it's already been overcharged that day, the wand is automatically destroyed (even if it had been repaired) and no spell is cast.`;
  if ( quantity === 0 && actor.system.resources.heroPoints.value > 0 ) {
    fail = `Rerolled Flat Check and hero point deducted.<br>${chosen.name} has been destroyed and the quantity has been reduced to zero in case you would like to try using a hero point on the flat check.<br><strong>Please remove the destroyed wand from your inventory.</strong>`;
    success = `Rerolled Flat Check and hero point deducted.<br>${chosen.name} is @UUID[Compendium.pf2e.conditionitems.Item.6dNUvdb1dhToNDj3] and needs to be repaired. If anyone tries to overcharge a wand when it's already been overcharged that day, the wand is automatically destroyed (even if it had been repaired) and no spell is cast.`;
  }
  if (quantity > 1) { return ui.notifications.warn("Stacked wands are not compatible with this macro.") }
  if (overcharge) {
    const notes = [
      {"outcome":["success","criticalSuccess"], "selector":"flat-check", "text":success},
      {"outcome":["failure","criticalFailure"], "selector":"flat-check", "text":fail}
    ];
    const roll = await game.pf2e.Check.roll(new game.pf2e.StatisticModifier(`Attempting to overcharge ${chosen.name}`, []), {actor, options:["flat-check"], type: 'flat-check', dc: { value: 10 }, notes});
    if (roll.options.degreeOfSuccess > 1) {
      const effect = {
        "name": `${chosen.name} is Broken and Overcharged`,
        "type": "effect",
        "img": "systems/pf2e/icons/conditions/broken.webp",
        "system": {
          "description": {
            "value":`${chosen.name} is broken and needs to be repaired. If anyone tries to overcharge a wand when it's already been overcharged that day, the wand is automatically destroyed (even if it had been repaired) and no spell is cast.`
          },
          "slug": chosen.uuid,
          "level": {
            "value": chosen.level
          },
          "duration": {
            "value": -1,
            "unit": "unlimited",
            "sustained": false,
            "expiry":"turn-start"
          },
          "tokenIcon": {
            "show": false
          }
        },
      };
      await actor.createEmbeddedDocuments("Item", [effect]);
      if ( quantity === 0 ) { await chosen.update({"system.quantity": 1}); }
    }
    else {
        await chosen.update({"system.quantity": 0});
    }
    if ( quantity === 0) {
        await actor.update({"system.resources.heroPoints.value": actor.system.resources.heroPoints.value-1});
    }
  }
  await chosen.consume();
}

async function choose(options = [], prompt = ``){
  return new Promise((resolve) => {
    let dialog_options = (options[0] instanceof Array)
      ? options.map(o => `<option value="${o[0]}">${o[1]}</option>`).join(``)
      : options.map(o => `<option value="${o}">${o}</option>`).join(``);
    let content = `
      <table style="width=100%">
        <tr><th>${prompt}</th></tr>
        <tr><td><select id="choice">${dialog_options}</select></td></tr>
      </table>`;
   
    new Dialog({
      content, title, 
      buttons : { OK : {label : `${title}`, callback : async (html) => { resolve(html.find('#choice').val()); } } },
      default: 'OK',
    }).render(true);
  });
}
