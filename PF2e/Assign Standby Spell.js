/*
This Macro is to be used in conjunction with the Spellstrike Macro.
You simply run this macro with the token selected.
It will then prompt you for a spell in a Spellcasting Entry based off of intelligence to be your Standby Spell.
Certain exceptions will need to be monitored.
If you would like to change the Standby Spell, simply run the macro again.
You can clear your Standby Spell and Entry by choosing 'Clear Standby Spell' entry in the dropdown.
*/

if (canvas.tokens.controlled.length !== 1) { return void ui.notifications.warn("You must select 1 token that's a Magus or has the Magus Dedication!"); }
if (token.actor.class.slug !== "magus" && token.actor.flags.pf2e.rollOptions.all["class:magus"] === undefined && !token.actor.itemTypes.feat.some(f => f.slug === "magus-dedication")) { return void ui.notifications.warn("The selected token is not a Magus or does not possess the Magus Dedication!"); }
if (token.actor.itemTypes.feat.some(f => f.slug === "magus-dedication") && !token.actor.itemTypes.feat.some(f => f.slug === "spellstriker")) { return void ui.notifications.warn("Token with Magus Dedication does not possess the Spellstriker feat!"); }
if (!token.actor.itemTypes.feat.some(f => f.slug === "standby-spell")) { return void ui.notifications.warn("Selected token does not possess the Standby Spell feat!"); }

const ess = token.actor.itemTypes.feat.some(f => f.slug === 'expansive-spellstrike');

const spells = await spellList(actor, ess);

if (spells.length === 0) { return void ui.notifications.warn("You have no spells that can be assigned as a standby spell.") }

if (spells.some(s => s.flags.pf2e.standbySpell)) {
  const options = spells.filter(c => !c.flags.standbySpell).map(n => [n.slug, `${n.name} (${n.spellcasting.name})`] );
  options.push(["clear", "Clear Standby Spell"]);
  const flagged = spells.find(s => s.flags.pf2e.standbySpell);
  const choice = await choose( options, prompt = `Replace your Standby Spell (${flagged.name}) : `);
  if (choice === "clear") {
    const flagged1 = token.actor.itemTypes.spell.find(s => s.flags.pf2e.standbySpell);
    await flagged1.unsetFlag("pf2e","standbySpell");
    return ui.notifications.info(`Standby Spell cleared`);
  }
  const spell = spells.find(f => f.slug === choice);
  await flagged.unsetFlag("pf2e","standbySpell");
  await spell.setFlag("pf2e","standbySpell",true);
}

else {
  const options = spells.map(n => [n.slug, `${n.name} (${n.spellcasting.name})`] );
  const choice1 = await choose( options, prompt = `Choose your Standby Spell : `);
  const spell = spells.find(f => f.slug === choice1);
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
      <tr><td><select id="choice" autofocus>${dialog_options}</select></td></tr>
    </table>`;
  
    new Dialog({
      content, 
      buttons : { OK : {label : `OK`, callback : async (html) => { resolve(html.find('#choice').val()); } } }
    },{width:"auto"}).render(true);
  });
}

async function spellList(actor, ess) {
  // A bunch of these should be excluded because they are not AoE spells, but there area bunch of AoE spells
  // with multiple area choices and the system encodes these as no area, so we consider no area as AoE and then
  // fix the mistakes with this list.
  const blacklist = new Set([
    "celestial-accord",
    "shattering-gem",
    "entangle-fate",
    "behold-the-weave",
    "compel-true-name",
    "foul-miasma",
    "invoke-the-harrow",
    "rewrite-memory",
    "subconscious-suggestion",
    "excise-lexicon",
    "enthrall",
    "mind-reading",
    "mirecloak",
    "mask-of-terror",
    "hallucination",
    "hyperfocus",
    "pact-broker",
    "death-knell",
    "sudden-recollection",
    "favorable-review",
    "litany-of-self-interest",
    "suggestion",
    "command",
    "déjà-vu",
    "charming-touch",
    "charm",
    "possession",
    "cornucopia",
    "delay-affliction",
    "heal-companion",
    "natures-bounty",
    "rebuke-death",
    "wholeness-of-body",
    "revival"
  ]);

  // ESS, in addition to AoE spells, extends "spell attacks" to "harmful spells that target a creature".
  // Most harmful spells that target a creature are attacks, but some aren't.  These are they:
  const harmfulNonAttacks = new Set(['force-barrage', 'force-fang']);
  const undead = [...game.user.targets.values()].some(t => t.actor.traits.has('undead'));
  if (undead) harmfulNonAttacks.add('heal');
  // Don't allow healing damage spells, unless they are also vitality and there is an undead target
  const healing = (spell, data) => data.damage?.[0]?.kinds.has('healing') &&
    !(undead && spell.traits.has('vitality'));

  // Spells that ESS allows us to use, beyond spell attacks
  const essAllowed = (spell, data) => harmfulNonAttacks.has(data.slug) || (
    !data.target.value.includes('willing') && !healing(spell, data) && (
      (data.target.value.includes("creature") && data.hasDamage) ||
      (["line", "cone", "burst", undefined].includes(data.area?.type) && (data.hasDamage || data.isSave))
    )
  );
  // "1", "2", "2 to 2 rounds", "1 or 2", etc.
  const actionsAllowed = /^[12]( (or|to) .*)?$/;

  const spells = [];
  for (const e of actor.itemTypes.spellcastingEntry.filter(r => r.system.prepared?.value !== "items" && r.isPrepared && r.attribute === "int")) {
    for (const spell of e.spells) {
      const spellChatData = await spell.getChatData();
      const isStrikeable = (spell.isAttack || (ess && essAllowed(spell, spellChatData))) && actionsAllowed.test(spell.system.time?.value) && !blacklist.has(spell.slug) && !spell.isCantrip;
      if (!isStrikeable) continue;
      spells.push(spell)
    }
  }
  spells.sort((a, b) => {
    if (a.lvl === b.lvl)
      return a.name.toUpperCase().localeCompare(b.name.toUpperCase(), undefined, {sensitivity: "base"});
      return a.lvl - b.lvl;
  });

  return spells;
};