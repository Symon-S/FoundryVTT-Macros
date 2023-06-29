/*
This Macro is to be used in conjunction with the Spellstrike Macro.
You simply run this macro with the token selected and it will prompt you for your magus spellcasting entry if more than one prepared
intelligence, and arcane, based spellcasting entry is available and flag that entry as your magus spellcasting entry.
It will then prompt you for a spell in that entry to be your Standby Spell.
If you would like to change the Standby Spell, simply run the macro again.
You can clear your Standby Spell and Entry by choosing 'Clear Standby Spell' entry in the dropdown.
*/

if (canvas.tokens.controlled.length !== 1) { return ui.notifications.warn("You must select 1 token that's a Magus or has the Magus Dedication!"); }
if (token.actor.class.slug !== "magus" && token.actor.flags.pf2e.rollOptions.all["class:magus"] === undefined && !token.actor.itemTypes.feat.some(f => f.slug === "magus-dedication")) { return ui.notifications.warn("The selected token is not a Magus or does not possess the Magus Dedication!"); }
if (token.actor.itemTypes.feat.some(f => f.slug === "magus-dedication") && !token.actor.itemTypes.feat.some(f => f.slug === "spellstriker")) { return ui.notifications.warn("Token with Magus Dedication does not possess the Spellstriker feat!"); }
if (!token.actor.itemTypes.feat.some(f => f.slug === "standby-spell")) { return ui.notifications.warn("Selected token does not possess the Standby Spell feat!"); }


let entry = token.actor.itemTypes.spellcastingEntry.find(sce => sce.flags.pf2e.magusSE);

//If you accidentally chose the wrong spellcasting entry just remove the comments from the following lines, then add the comments back after switching your spellcasting entry:
//entry.unsetFlag(("pf2e","magusSE");
//entry = undefined;

if (entry === undefined) {
  if (token.actor.itemTypes.spellcastingEntry.filter(sce => sce.ability === 'int' && sce.isPrepared && sce.tradition === 'arcane').length > 1) {
    const options = token.actor.itemTypes.spellcastingEntry.filter(sce => sce.ability === 'int' && sce.isPrepared && sce.tradition === 'arcane').map(n => n.name);
    const choice1 = await choose(options, prompt = `Choose your Magus Spellcasting entry:`);
    entry = token.actor.itemTypes.spellcastingEntry.find(n => n.name === choice1);
    await entry.setFlag("pf2e","magusSE",true);
  }
  else {
    entry = token.actor.itemTypes.spellcastingEntry.find(sce => sce.ability === 'int' && sce.isPrepared && sce.tradition === 'arcane');
    await entry.setFlag("pf2e","magusSE",true);
  }
}

const spells = [];
entry.spells.contents.forEach( sp => {
  const exceptions = ['magic-missile','force-fang','heal'];
  if (!sp.system.traits.value.includes("attack") && !token.actor.itemTypes.feat.some(f => f.slug === 'expansive-spellstrike')) { return; }
  if (sp.system.spellType.value === 'utility' || sp.system.spellType.value === 'heal') { 
    if (!exceptions.includes(sp.slug)) { return; }
  }
  spells.push(sp);
});


if (spells.some(s => s.flags.pf2e.standbySpell === true)) {
  const options = spells.filter(c => !c.isCantrip && c.flags.standbySpell !== true).map(n => n.name);
  options.sort();
  options.push(`Clear Standby Spell`);
  const flagged = spells.find(s => s.flags.pf2e.standbySpell === true);
  const choice3 = await choose( options, prompt = `Replace your Standby Spell (${flagged.name}):`);
  if (choice3 === `Clear Standby Spell`) {
    const flagged1 = token.actor.itemTypes.spell.find(s => s.flags.pf2e.standbySpell === true);
    await flagged1.unsetFlag("pf2e","standbySpell");
    await entry.unsetFlag("pf2e","magusSE");
    return ui.notifications.info(`Standby Spell and Standby Spell Entry cleared`);
  }
  const spell = spells.find(f => f.name === choice3);
  await flagged.unsetFlag("pf2e","standbySpell");
  await spell.setFlag("pf2e","standbySpell",true);
}

else {
  const options = spells.filter(c => !c.isCantrip).map(n => n.name);
  options.sort();
  const choice2 = await choose( options, prompt = `Choose your Standby Spell:`);
  const spell = spells.find(f => f.name === choice2);
  await spell.setFlag("pf2e","standbySpell",true);
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
  
    let content = `
    <table style="width=100%">
      <tr><th>${prompt}</th></tr>
      <tr><td><select id="choice">${dialog_options}</select></td></tr>
    </table>`;
  
    new Dialog({
      content, 
      buttons : { OK : {label : `OK`, callback : async (html) => { resolve(html.find('#choice').val()); } } }
    },{width:"auto"}).render(true);
  });
}
