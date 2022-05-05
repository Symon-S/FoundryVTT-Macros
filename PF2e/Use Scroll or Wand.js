//This macro allows you to send scrolls and wands directly to chat as if you had clicked on them in your character sheet.
//Also rolls the equipment item Wand of Smoldering Fireballs.

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
const sW = [{name:"wand-of-smoldering-fireballs-3rd-level-spell",level: 3},{name:"wand-of-smoldering-fireballs-5th-level-spell",level: 5},{name:"wand-of-smoldering-fireballs-7th-level-spell",level: 7},{name:"wand-of-smoldering-fireballs-9th-level-spell",level: 9},];

async function Scroll() {  
 
  title = `Cast a Scroll`
  const scroll = [];
 
  token.actor.itemTypes.consumable.forEach(s => {
   if(s.data.data.consumableType.value === "scroll") { scroll.push(s); }
  });
 
  if (scroll.length === 0) { return ui.notifications.warn("You do don't have scrolls to cast from.");}
  const choiceS = await choose(scroll.map(n => n.data.name),`Pick a Scroll`);
  const chosen = scroll.find(x => x.data.name === choiceS);
  await chosen.toMessage();
}
 
async function Wand(){
  
  title = `Cast a Wand`
  const wand = [];
 
  token.actor.itemTypes.consumable.forEach(s => {
   if (s.data.data.consumableType.value === "wand" && s.data.data.charges.value > 0) { wand.push(s); }
  });
  
  token.actor.itemTypes.equipment.forEach( e => {
    if (sW.map(n => n.name).includes(e.slug)) { wand.push(e); }
  });

  if (wand.length === 0) { return ui.notifications.warn("You do don't have wands to cast from.");}
  const choiceW = await choose(wand.map(n => n.data.name),`Pick a Wand`);
  const chosen = await wand.find(x => x.data.name === choiceW);
  if (sW.map(n => n.name).includes(chosen.slug)) {
    const spells = await game.packs.get('pf2e.spells-srd');
    const sFBall = await spells.getDocument("sxQZ6yqTn0czJxVd");
    const source = await (await fromUuid("Compendium.pf2e.equipment-srd.fomEZZ4MxVVK3uVu")).toObject();
    source.data.spell.data = sFBall.data;
    source.data.spell.heightenedLevel = sW.find(n => n.name === chosen.slug).level;
    source.data.slug = "temp-wosf-holder";
    await token.actor.createEmbeddedDocuments('Item', [source]);
    const sFB = token.actor.items.find(s => s.slug === "temp-wosf-holder");
    console.log(chosen);
    sFB.data.data.spell.data.name = chosen.name;
    sFB.data.data.spell.data.data.description.value = chosen.description;
    console.log(sFB);
    await sFB.castEmbeddedSpell();
    await sFB.delete();
  }
  else{ await chosen.toMessage(); }
}
/*
  Choose
    Send an array of options for a drop down choose menu. (Single)
      returns a promise (value is chosen element of array) 
    options = [`display_return_value`, ...] or [[return_value , `display`],...],
    prompt = `display_prompt_question` 
  */
async function choose(options = [], prompt = ``){
    return new Promise((resolve) => {
      let dialog_options = (options[0] instanceof Array)
        ? options.map(o => `<option value="${o[0]}">${o[1]}</option>`).join(``)
        : options.map(o => `<option value="${o}">${o}</option>`).join(``);
      console.log(dialog_options);
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
