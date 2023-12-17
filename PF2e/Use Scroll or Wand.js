//This macro allows you to send scrolls and wands directly to chat as if you had clicked on them in your character sheet.
//Handles overcharging wands

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
  if (chosen.quantity > 1) { return ui.notifications.warn("Stacked wands are not compatible with this macro.") }
  if (chosen.quantity === 0 && actor.system.resources.heroPoints.value === 0) { return ui.notifications.warn("You have no hero points left"); }
  if (overcharge) {
    const roll = await (new actor.perception.constructor(actor, { slug: 'flat', label: `Attempting to overcharge ${chosen.name}`, check: { type: 'flat-check' },})).roll({ dc: { value: 10, visible: true }, actor, token, showDC: "all",});
    if (roll.options.degreeOfSuccess > 1) {
      let content = `${chosen.name} is broken and needs to be repaired. If anyone tries to overcharge a wand when it's already been overcharged that day, the wand is automatically destroyed (even if it had been repaired) and no spell is cast.`;
      if ( chosen.quantity === 0 ) {
        await chosen.update({"system.quantity": 1});
        content = `${chosen.name} is broken and needs to be repaired. If anyone tries to overcharge a wand when it's already been overcharged that day, the wand is automatically destroyed (even if it had been repaired) and no spell is cast. A hero point has been deducted and the item quantity has been increased to one.`;
      }
      await chosen.consume();
      await new Promise(async (resolve) => { setTimeout(resolve,200) });
      await ChatMessage.create({
        speaker:ChatMessage.getSpeaker(),
        whisper: [game.users.activeGM],
        content
      });
      const effect = {
        "name": `${chosen.name} is Broken`,
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
            "value": 1,
            "unit": "days",
            "sustained": false,
            "expiry":"turn-start"
          },
          "tokenIcon": {
            "show": false
          }
        },
      };
      return await actor.createEmbeddedDocuments("Item", [effect]);
    }
    else {
      let content = `${chosen.name} has been destroyed and the quantity has been reduced to zero in case you would like to try using a hero point on the flat check. You can reuse the macro to try again, this will consume a hero point. If not, you or the GM can remove the destroyed wand from your inventory.`
      if (chosen.quantity === 0) {
        await actor.update({"system.resources.heroPoints.value": actor.system.resources.heroPoints.value-1})
        content = `${chosen.name} has been destroyed and a hero point has been deducted. You or the GM can remove the destroyed wand from your inventory.`
      }
      if (chosen.quantity === 1) { await chosen.update({"system.quantity": 0}); }
        await chosen.consume();
        await new Promise(async (resolve) => { setTimeout(resolve,200) });
        return await ChatMessage.create({
          speaker: ChatMessage.getSpeaker(),
          content,
          whisper: [game.users.activeGM]
        });
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
