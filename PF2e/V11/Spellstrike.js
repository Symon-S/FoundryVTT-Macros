/*
To use this macro, you just have to target someone and use it.
Added ability to reroll using a hero point when available.
Standby Spell now supported, if you have the feat it will:
1. Set a Standby Spell by calling to the Standby Spell macro, if one hasn't been set yet.
2. Dynamically filter the drop down list to only include spells you can substitute or spells you can spellstrike with,
depending on the current state of the use standby spell toggle.
*/

/* Throw warning if token is not selected*/
if (canvas.tokens.controlled.length < 1) { return void ui.notifications.warn('No token is selected.'); }
if (canvas.tokens.controlled.length > 1) { return void ui.notifications.warn('Only 1 token should be selected'); }
if (game.user.targets.size < 1) { return void ui.notifications.warn('Please target a token'); }
if (game.user.targets.size > 1) { return void ui.notifications.warn('Spellstrike can only affect 1 target'); }

/* Check for eldritch archer dedication and warn if not present */
if (!token.actor.itemTypes.feat.some(e => ["spellstriker","spellstrike"].includes(e.slug))) {
  return void ui.notifications.warn('Does not have Spellstrike.');
}
const ess = token.actor.itemTypes.feat.some(f => f.slug === 'expansive-spellstrike');

const DamageRoll = CONFIG.Dice.rolls.find(((R) => R.name === "DamageRoll"));

/* Standby Spells */
let sbs = null;
if (token.actor.itemTypes.feat.some(f => f.slug === 'standby-spell')) {
  sbs = actor.itemTypes.spell.find(s => s.flags.pf2e.standbySpell);
  if (!sbs) {
    // Have feat, spell not set, use macro to set it
    let macro = game.macros.find(n => n.name === "Assign Standby Spell");
    if (!macro && game.modules.get('xdy-pf2e-workbench')?.active) {
      macro = (await game.packs.get("xdy-pf2e-workbench.asymonous-benefactor-macros-internal")?.getDocuments({name: 'XDY DO_NOT_IMPORT Assign Standby Spell'}))?.[0]?.toObject();
      if (macro) {
        macro = new Macro(macro);
        macro.ownership.default = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
      }
    }
    if (macro) {
      await macro.execute();
      sbs = actor.itemTypes.spell.find(s => s.flags.pf2e.standbySpell);
    }
    else {
      // They won't be able to use standby spell, but the rest of spellstrike works fine
      ui.notifications.warn("You have not chosen your Standby Spell and will not be able to cast it.");
      ui.notifications.warn("Cannot choose a Standby Spell. You do not have the latest workbench version or it is not active, or the Assign Standby Spell macro is not available.");
    }
  }
}

let spells = await spellList(actor, sbs, ess);
spells = spells.filter(s => !s.isExpended && !s.isUseless);
if (spells.length === 0) { return void ui.notifications.info("You have no spells available"); }

const choices = await SSDialog(actor, spells, sbs);

let last, mes;
if (choices.reroll) {
  mes = game.messages.contents.findLast( lus => lus.getFlag("world","macro.spellUsed") !== undefined && lus.token.id === token.id);
  if (mes === undefined) return void ui.notifications.warn("There are no previously cast spells or strike has already been rerolled");
  if (actor.system.resources.heroPoints.value === 0) { return void ui.notifications.warn("You have no hero points left")}
  last = mes.getFlag("world","macro.spellUsed");
  last.spell = actor.itemTypes.spell.find(s => s.slug === last.slug);
}

/* Get the strike actions */
let spc = last ?? choices.spell;

// Combine spell slot from dialog with standby spell's spell data. Reroll data from a message has already had this done, skip for rerolls.
if (choices.standby && !choices.reroll) {
  const {isAttack, isSave, description, save, slug, traits, hasDamage} = await sbs.getChatData({},{castRank: spc.castRank});
  spc = mergeObject(spc, {
    name: sbs.name, spId: sbs.id, slug, description, DC: save.value, spell: sbs, isSave, isAttack,
    basic: sbs.system.defense?.save?.basic ?? false, traits, save: save.type ?? "", hasDamage
  }, {recursive: false});
}
const s_entry = token.actor.itemTypes.spellcastingEntry.find(e => e.id === spc.sEId);

// spc.spell is the base spell, turn it into the exact variant spell here.
// This includes both heightening (always) and selecting an action cost, damage type, etc. variant (sometimes)
const variantParams = {castRank: spc.castRank};
if (spc.spell.hasVariants) {
  let toName = spc.spell.overlays.contents[0].system?.time !== undefined ?
    (vs) => `${vs.name} (${vs.actionGlyph} actions)` :
    (vs) => vs.name;

  const spell_variants = spc.spell.overlays.overrideVariants.map((spell) => ({name: toName(spell), spell}))
  spell_variants.sort((a, b) => a.spell.sort - b.spell.sort);

  // Build dialog data
  const ovr_data = [
    { label: "Choose a Spell Variant: ", type: "select", options: spell_variants.map(p => p.name) }
  ];

  // Query user for variant choice
  const variant_choice = await quickDialog({data : ovr_data, title : `Variants Detected`});

  // Get the overlayIds value for the selected variant
  const variantId = spell_variants.find(x => x.name === variant_choice[0]).spell.variantId;
  variantParams.overlayIds = [variantId];
}
// Both castRank and overlayIds (if used) must be specified in one call to loadVariant()
spc.spell = spc.spell.loadVariant(variantParams) ?? spc.spell;
spc.hasDamage = !!await spc.spell.getDamage(); // May have changed due to variant selected

// Roll Strike and set/get applicable data
let pers, critt;
if (!choices.reroll) {
  const roll = await choices.action.variants[choices.variant].roll({
    event: choices.event,
    callback: async (roll, res, msg) => {
      msg.setFlag("world","macro.spellUsed", spc);
      await msg.update({flavor: msg.flavor + "Chosen Spell: " + spc.spell.link});
    }
  });
  critt = roll.degreeOfSuccess;
}
else {
  await game.pf2e.Check.rerollFromMessage(mes,{heroPoint:1});
  critt = game.messages.contents.findLast(r => r.isReroll && r.speaker.token === mes.speaker.token).rolls[0].degreeOfSuccess;
}
let ttags = '';
for (const t of spc.traits) {
  ttags += `<span class="tag" data-trait data-tooltip=${t.description}>${t.value[0].toUpperCase() + t.value.substring(1)}</span>`
}
let dos;
let hit = false

if (critt === 2) { dos = 'Success'; hit = true }
if (critt === 3) { dos = 'Critical Success'; hit = true}

// Automated Animations insertion by MrVauxs
if (game.modules.get("autoanimations")?.active) {
  AutomatedAnimations.playAnimation(token, {name: spc.name}, { targets: [Array.from(game.user.targets)[0]], hitTargets: hit ? [Array.from(game.user.targets)[0]] : []})
}

let flavName = ` cast at Rank ${spc.castRank}`;
if (spc.isCantrip) { flavName = ` Cantrip ${spc.castRank}`; }
if (spc.isFocus) { flavName = ` Focus ${spc.castRank}`; }
let flavor = `<strong>Spellstrike</strong><br>${spc.spell.link}${flavName} (${dos})`;
if (spc.slug === null) { flavor = `<div class="tags">${ttags}<br><hr><strong>Spellstrike</strong><br>${flavName} [Custom Spell] (${dos})`; }
if (spc.isSave) {
  flavor += `<br>@Check[type:${spc.save}|dc:${spc.DC}|traits:damaging-effect,${spc.traits.map(v => v.value).join()}|basic:${spc.basic}]`;
}

if (spc.slug === "acid-splash" && critt === 3) {
  if(spc.castRank < 3) { flavor += `[[/r 1[persistent,acid]]]` }
  else if(spc.castRank > 2 && spc.castRank < 5) { flavor += `[[/r 2[persistent,acid]]]` }
  else if(spc.castRank > 4 && spc.castRank < 7) { flavor += `[[/r 3[persistent,acid]]]` }
  else if(spc.castRank > 6 && spc.castRank < 9) { flavor += `[[/r 4[persistent,acid]]]` }
  else { flavor += `[[/r 5[persistent,acid]]]` }
}
if (spc.slug === 'ignition' && critt === 3) {
  pers = Math.ceil(actor.level / 2);
  if (spc.spell.name.includes('Melee')) {
    pers += 'd6';
  }
  else {
    pers += 'd4';
  }
  flavor += `[[/r ${pers}[persistent,fire]]]`
}
if (spc.slug === 'produce-flame' && critt === 3) {
  pers = Math.ceil(actor.level / 2) + "d4";
  flavor += `[[/r ${pers}[persistent,fire]]]`
}
if (spc.slug === 'ray-of-frost' && critt === 3) {
  flavor += `@UUID[Compendium.pf2e.spell-effects.I4PsUAaYSUJ8pwKC]{Spell Effect: Ray of Frost}`
}

if(spc.slug === 'chilling-darkness'){
  if (game.user.targets.first().actor.traits.has('holy')) {
    const spRD = spc.spell.getRollData({castRank: spc.castRank});
    spc.roll = (await spRD.item.getDamage()).template.damage.roll;
    spc.roll = new DamageRoll(`{(${spc.roll.terms[0].rolls[0]._formula})[${spc.roll.terms[0].rolls[0].type}],(${(spc.castRank-3)*2 + 5}d6)[spirit]}`);
    flavor = `<div class="tags">${ttags}<br><hr><strong>Spellstrike</strong><br>${spc.spell.link}${flavName} (${dos})`;
  }
}

// Auto roll damage unless the workbench setting exists and is on, in which case workbench will do it
if (!(game.modules.get('xdy-pf2e-workbench')?.active && game.settings.get("xdy-pf2e-workbench","autoRollDamageForStrike"))) {
  if (critt === 2) await choices.action.damage({ event: choices.event });
  if (critt === 3) await choices.action.critical({ event: choices.event });
}

/* Chromatic Ray */
if(spc.slug === 'chromatic-ray' && critt >= 2) {
  flavor = `<div class="tags">${ttags}`;
  let ds = '';
  let dsc = '';
  if (token.actor.itemTypes.feat.some(s => s.slug === 'dangerous-sorcery')) {
    ds = ` + ${spc.castRank}`;
    dsc = ` + ${spc.castRank * 2}`
  }
  const chroma = [
    {d:`{30${ds}}[fire]`,f:`<span class="tag" data-trait data-description="PF2E.TraitDescriptionFire">Fire</span></div><hr><strong>Spellstrike</strong><br>${spc.spell.link}${flavName} (${dos})<br><p class='compact-text'>1.<strong>Red</strong> (fire) The ray deals 30 fire damage to the target. Double on a Critical.</p>`,dd:`(60${dsc})[fire]`},
    {d:`{40${ds}}[acid]`,f:`<span class="tag" data-trait="acid" data-description="PF2E.TraitDescriptionAcid">Acid</span></div><hr><strong>Spellstrike</strong><br>${spc.spell.link}${flavName} (${dos})<br><p class='compact-text'>2.<strong>Orange</strong> (acid) The ray deals 40 acid damage to the target. Double on a Critical.</p>`,dd:`(80${dsc})[acid]`},
    {d:`(50${ds})[electricity]`,f:`<span class="tag" data-trait data-description="PF2E.TraitDescriptionElectricity">Electricity</span></div><hr><strong>Spellstrike</strong><br>${spc.spell.link}${flavName} (${dos})<br><p class='compact-text'>3.<strong>Yellow</strong> <br>(electricity) The ray deals 50 electricity damage to the target. Double on a Critical.</p>`,dd:`(100${dsc})[electricity]`},
    {d:`(25${ds})[poison]`,f:`<span class="tag" data-trait data-description="PF2E.TraitDescriptionPoison">Poison</span></div><hr><strong>Spellstrike</strong><br>${spc.spell.link}${flavName} (${dos})<br><p class='compact-text'>4.<strong>Green</strong> (poison) The ray deals 25 poison damage to the target, double on a Critical, and the target must succeed at a @Check[type:fortitude|dc:${spc.DC}|traits:arcane,attack,evocation,light,poison] or be @Compendium[pf2e.conditionitems.Enfeebled]{Enfeebled 1} for 1 minute (@Compendium[pf2e.conditionitems.Enfeebled]{Enfeebled 2} on a critical failure).</p>`,dd:`(50${dsc})[poison]`},
    {f:`</div><strong><hr>Spellstrike</strong><br>${spc.spell.link}${flavName} (${dos})<br><p class='compact-text'>5.<strong>Blue</strong> The ray has the effect of the @Compendium[pf2e.spells-srd.Petrify]{Petrify} spell. On a critical hit, the target is @Compendium[pf2e.conditionitems.Clumsy]{Clumsy 1} as long as it’s slowed by the petrify effect.<br>@Check[type:fortitude|dc:${spc.DC}|traits:arcane,attack,evocation,light]</p>`},
    {f:`<span class="tag" data-trait data-description="PF2E.TraitDescriptionEmotion">Emotion</span><span class="tag" data-trait data-description="PF2E.TraitDescriptionIncapacitation">Incapacitation</span><span class="tag" data-trait data-description="PF2E.TraitDescriptionMental">Mental</span></div><hr><strong>Spellstrike</strong><br>${spc.spell.link}${flavName} (${dos})<br><p class='compact-text'>6.<strong>Indigo</strong> (emotion, incapacitation, mental) The ray has the effect of the @Compendium[pf2e.spells-srd.Confusion]{Confusion} spell. On a critical hit, it has the effect of @Compendium[pf2e.spells-srd.Warp Mind]{Warp Mind} instead.<br>@Check[type:will|dc:${spc.DC}|traits:arcane,attack,evocation,light,emotion,incapacitation,mental]</p>`},
    {f:`</div><hr><strong>Spellstrike</strong><br>${spc.spell.link}${flavName} (${dos})<br><p class='compact-text'>7.<strong>Violet</strong> <br>The target is @Compendium[pf2e.conditionitems.Slowed]{Slowed} for 1 minute. It must also succeed at a @Check[type:will|dc:${spc.DC}|traits:arcane,attack,evocation,light] or be teleported 120 feet directly away from you (if there isn’t room for it to appear there, it appears in the nearest open space); this is a teleportation effect.</p>`},
    {f:`</div><hr><strong>Spellstrike</strong><br>${spc.spell.link}${flavName} (${dos})<br><p class='compact-text'>8.<strong>Intense Color</strong> The target is @Compendium[pf2e.conditionitems.Dazzled]{Dazzled} until the end of your next turn, or @Compendium[pf2e.conditionitems.Blinded]{Blinded} if your attack roll was a critical hit. Roll again and add the effects of another color (rerolling results of 8).</p>`},
  ];
  let chromaD = '1d4';
  if (spc.castRank > 5) {
    chromaD = '1d8';
    chroma[0].d = `(40${ds})[fire]`;
    chroma[0].dd = `(80${dsc})[fire]`;
    chroma[0].f = chroma[0].f.replace('30','40');
    chroma[1].d = `(50${ds})[acid]`;
    chroma[1].dd = `(100${dsc})[acid]`;
    chroma[1].f = chroma[1].f.replace('40','50');
    chroma[2].d = `(60${ds})[electricity]`;
    chroma[2].dd = `(120${dsc})[electricity]`;
    chroma[2].f = chroma[2].f.replace('50','60');
    chroma[3].d = `(35${ds})[poison]`;
    chroma[3].dd = `(70${dsc})[poison]`;
    chroma[3].f = chroma[3].f.replace('25','35');
  }
  const chromaR = new Roll(chromaD).evaluate({async:false}).total;
  if (chromaR < 5) {
    ddice = chroma[chromaR-1].dd;
    flavor = flavor + chroma[chromaR-1].f;
    spc.roll = new DamageRoll(chroma[chromaR-1].d);
    if (critt === 3) {
      spc.roll = new DamageRoll(chroma[chromaR-1].dd);
    }
  }
  if (chromaR > 4 && chromaR <= 7) { flavor = flavor + chroma[chromaR-1].f; await ChatMessage.create({speaker: ChatMessage.getSpeaker(), content: flavor, flags: { "world.macro.spellUsed": spc }}); }
  if (chromaR === 8) {
    const flavor2 = flavor + chroma[chromaR-1].f;
    await ChatMessage.create({speaker: ChatMessage.getSpeaker(), content: flavor2, flags: { "world.macro.spellUsed": spc }});
    if (critt === 3) {
      const chromaRR = new Roll('1d7').evaluate({async:false}).total;
      if (chromaRR < 5) { flavor = flavor + chroma[chromaRR-1].f; spc.roll = new DamageRoll(chroma[chromaRR-1].dd); }
      if (chromaRR > 4) { flavor = flavor + chroma[chromaRR-1].f; await ChatMessage.create({speaker: ChatMessage.getSpeaker(), content: flavor, flags: { "world.macro.spellUsed": spc }});}
  	}
  }
}

if (critt === 1 && !spc.isAttack) {
  await spc.spell.toMessage(null);
}
if (critt >= 2) {
  if (spc.slug !== "chromatic-ray" && !spc.hasDamage && !spc.roll) {
    await spc.spell.toMessage(null);
  }
  if (critt === 3 && spc.slug !== "chromatic-ray" && spc.isAttack) {  ui.notifications.info('Spell damage will need to be doubled when applied'); }
  if ( spc.roll !== undefined ) {
    await spc.roll.toMessage({ flavor: flavor, speaker: ChatMessage.getSpeaker(), flags: { "world.macro.spellUsed": spc } });
  }
  else {
    await spc.spell.rollDamage(choices.event, choices.variant);
  }
}

/* Expend slots */
if (spc.isCantrip || choices.reroll) { return; }
await s_entry.cast(spc.spell, {slotId: spc.index, message: false});

// Show the SpellStrike dialog, return a promise of a result object:
// { spell: Entry of "spells" that was chosen
//   action: StatisticModifier, attack to use
//   variant: Integer, action's variant, i.e. MAP
//   reroll: Boolean, do a hero point reroll?
//   standby: Boolean, standby spell to be used
//   event: PointerEvent, from the attack button click (i.e. shift-click vs normal)
// }
async function SSDialog(actor, spells, sbs) {
  const starlit = actor.itemTypes.feat.some(f => f.slug === 'starlit-span');
  const template = "systems/pf2e/templates/actors/character/partials/strike.hbs";
  const base = await actor.sheet.getData();
  const filter = (a) => starlit || a.item.isMelee || a.altUsages.some(aa => aa.item.isMelee);
  // Need to perserve original index value from the actor action list
  const actions = new Map(base.data.actions.map((a, i) => [i, a]).filter(
    a => a[1].visible && a[1].type === "strike" && a[1].item.isEquipped && filter(a[1])));
  const attacksHtml = await Promise.all(Array.from(actions, ([index, action]) => renderTemplate(template, {...base, index, action})));

  // Build dialog data
  const label = (useSBS) => `Choose a Spell ${useSBS ? "Slot to expend" : " to Cast"}`;
  const spellOptions = spells.map((s, i) => `<option value="${i}">${s.name}</option>`);
  const content = `
  <style>
  .spellstrike-macro
  .actor.sheet.character section.window-content .attack-popout.actions {
    margin: 0 0 0 0;
  }
  .spellstrike-macro
  .actor.sheet.character section.window-content .attack-popout.actions ol.strikes-list li.strike
  .item-name {
    align-items: center;
  }
  .spellstrike-macro
  .actor.sheet.character section.window-content .attack-popout.actions ol.strikes-list li.strike
  div.auxiliary-actions {
    display: none;
  }
  .spellstrike-macro
  .actor.sheet.character section.window-content .attack-popout.actions ol.strikes-list li.strike
  button.damage.tag {
    display: none;
  }
  .spellstrike-macro
  .actor.sheet.character section.window-content .attack-popout.actions ol.strikes-list li.strike
  button.tag:disabled {
    background-color: var(--color-text-dark-inactive);
    cursor: not-allowed;
    pointer-events: initial;
  }
  ${starlit ? "" : `
  .spellstrike-macro
  ol.strikes-list li.strike div.alt-usage:has(button[data-alt-usage="thrown"]) {
    display: none;
  }`}
  </style>

  ${sbs ? `<p>Cast Standby Spell: <input type="checkbox" id="standby"> ${sbs.name}</p>` : ""}
  <p align="center"><label id="spell-choice-label">${label(false)}</label></p>
  <p><select style="width:100%; font-size:12px" id="spell">${spellOptions.join('')}</select></p>
  <div class="actor sheet character"><section class="window-content"><div class="tab actions active attack-popout">
  <ol class="actions-list item-list directory-list strikes-list" data-strikes>
    ${attacksHtml.join("\n")}
  </ol>
  </div></section></div>
  <p><label>Reroll using Hero Point:</label><input type="checkbox" id="reroll"/></p>
  `;

  const result = new Promise(async (resolve) => {
    const dialog = new Dialog({
      title: "Spellstrike",
      content,
      buttons : { },
      render: (html) => {
        const strikes = html.find("ol.strikes-list > li.strike.ready[data-strike]:not(.hidden)")
        // Disable ranged primary usage when !starlit.
        if (!starlit) {
          actions.forEach((a, i) => {
            if (!a.item.isMelee) {
              strikes.filter(`[data-action-index=${i}]`).find("div.item-name [data-action=strike-attack]").
                prop('disabled', true).click(e => e.stopImmediatePropagation()).
                attr("data-tooltip", "Ranged strikes not allowed");
            }
          });
        }
        // Handler for all the attack buttons to do a "submit" of the dialog
        strikes.find("[data-action=strike-attack]").on("click", (event) => {
          const button = $(event.delegateTarget);
          const index = Number(button.parents('[data-action-index]').data('action-index'));
          const variant = Number(button.data('variant-index'));
          const altp = ({thrown: "isThrown", melee: "isMelee"})[button.data('alt-usage')];
          const action = altp ? actions.get(index).altUsages.find(a => a.item?.[altp]) : actions.get(index);
          const spell = spells[Number(html.find('#spell :selected').val())];
          const reroll = html.find('#reroll')[0].checked;
          const standby = html.find("#standby")[0]?.checked ?? false;
          dialog.close();
          resolve({spell, action, variant, reroll, standby, event: event.originalEvent});
        });
        // Handler for toggle buttons, only versatile is supported
        strikes.find("[data-action=toggle-weapon-trait]").on("click", async (event) => {
          const button = $(event.delegateTarget);
          const index = Number(button.parents('[data-action-index]').data('action-index'));
          const action = actions.get(index);
          const trait = button.data('trait');
          if (trait === "versatile") {
            const selected = button.val() === action.item.system.damage.damageType ? null : button.val();
            await action.item.system.traits.toggles.update({trait, selected});
            const toggles = button.parents("div.toggles");
            // actions is the data the dialog was made with, it doesn't update, but the actor does
            actor.system.actions[index]?.versatileOptions.forEach(trait =>
              toggles.find(`button.${trait.value}`).toggleClass("selected", trait.selected).prop('disabled', trait.selected)
            );
          }
        });
        // Update spell choices for standby slot to expend vs casting for spellstrike
        const updateChoices = (useSBS) => {
          html.find("#spell-choice-label").text(label(useSBS));
          const choice = html.find("#spell");
          // Hide/unhide the spells that are standby expendable slots or strikeable spells
          spells.forEach((s, i) => choice.find(`option[value=${i}]`).prop("hidden", useSBS ? !s.standbyExpendable : !s.isStrikeable));
          // If non-legal slot was picked, switch to the first legal one
          const spell = spells[Number(choice.val())];
          if (useSBS && !spell?.standbyExpendable) choice.val(spells.findIndex(s => s.standbyExpendable)).change();
          if (!useSBS && !spell?.isStrikeable) choice.val(spells.findIndex(s => s.isStrikeable)).change();
        };
        updateChoices(false);
        // Handler for standby checkbox
        if (sbs) {
          html.find("#standby").on("click", (event) => updateChoices(html.find("#standby")[0].checked));
        }
      }
    }, { classes: ["dialog", "spellstrike-macro", "dui-limited-scope"]});
    await dialog.render(true);
  });
  return result;
};

// Return list of actor's spells.  Each object has a bunch of fields, which include:
// isStrikeable: Can be used with spellstrike
// standbyExpendable: Slot can be expended when using StandbySpell
async function spellList(actor, sbs, ess) {
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
  for (const e of actor.itemTypes.spellcastingEntry.filter(r => r.system.prepared?.value !== "items")) {
    const spellData = await e.getSheetData();
    for(const group of spellData.groups) {
      let i = 0;
      for (const active of group.active) {
        const index = i++
        if (active === null) { continue; }
        const spell = active.spell;
        const spellChatData = await spell.getChatData({}, {groupId: group.id});
        const isStrikeable = (spell.isAttack || (ess && essAllowed(spell, spellChatData))) &&
          actionsAllowed.test(spell.system.time?.value) && !blacklist.has(spell.slug);
        const {castRank, isAttack, isSave, description, save, slug, traits, hasDamage} = spellChatData;

        let rank = `Rank ${castRank}`
        if(spellData.isPrepared) {
          rank += ` |Slot: ${index + 1}|`
        }
        let lvl = castRank+1;
        const name = spell.name;
        if (spell.isCantrip) {
          rank = `Cantrip ${castRank}`
          lvl = 0;
        }
        if (spellData.isFocusPool) {
          rank = `Focus ${castRank}`
          lvl = 1;
        }
        const sname = `${name} ${rank} (${e.name})`;
        spells.push({name: sname, castRank, sEId: spellData.id, slug, description, DC: save.value, spell, index, isSave, isAttack,
          basic: spell.system.defense?.save?.basic ?? false, isCantrip: spell.isCantrip, isFocus: spellData.isFocusPool, traits,
          save: save.type ?? "", lvl, hasDamage, isExpended: active.expended ?? false , isUseless: group.uses?.value < 1,
          isStrikeable, standbyExpendable: !spell.isCantrip && castRank >= sbs?.baseRank
        });
      }
    }
  };
  spells.sort((a, b) => {
    if (a.lvl === b.lvl)
      return a.name.toUpperCase().localeCompare(b.name.toUpperCase(), undefined, {sensitivity: "base"});
      return a.lvl - b.lvl;
  });

  return spells;
}

/* Dialog box */
async function quickDialog({data, title = `Quick Dialog`} = {}) {
  data = data instanceof Array ? data : [data];

  return await new Promise(async (resolve) => {
    let content = `
      <table style="width:100%">
      ${data.map(({type, label, options}, i)=> {
        if(type.toLowerCase() === `select`) {
          return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><select style="font-size:12px" id="${i}qd">${options.map((e,i)=> `<option value="${e}">${e}</option>`).join(``)}</td></tr>`;
        }
        else if(type.toLowerCase() === `checkbox`){
          return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" id="${i}qd" ${options || ``}/></td></tr>`;
        }
        else{
          return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" id="${i}qd" value="${options instanceof Array ? options[0] : options}"/></td></tr>`;
        }
      }).join(``)}
      </table>`;

    await new Dialog({
      title, content,
      buttons : {
        Ok : { label : `Ok`, callback : (html) => {
          resolve(Array(data.length).fill().map((e,i)=>{
            let {type} = data[i];
            if(type.toLowerCase() === `select`){
               return html.find(`select#${i}qd`).val();
            }
            else{
              switch(type.toLowerCase()){
                case `text` :
                case `password` :
                case `radio` :
                return html.find(`input#${i}qd`)[0].value;
                case `checkbox` :
                return html.find(`input#${i}qd`)[0].checked;
                case `number` :
              return html.find(`input#${i}qd`)[0].valueAsNumber;
              }
            }
          }));
        }}
      },
      default : 'Ok'
    },{width:"auto"})._render(true);
    document.getElementById("0qd").focus();
  });
}
