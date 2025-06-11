/*
To use this macro, you just have to target someone with a token selected and use it.
*/


Spellsling();

async function Spellsling() {
  /* Throw warning if token is not selected*/
  if (canvas.tokens.controlled.length < 1) { return ui.notifications.warn('No token is selected.'); }
  if (canvas.tokens.controlled.length > 1) { return ui.notifications.warn('Only 1 token should be selected'); }
  if (game.user.targets.size < 1) { return ui.notifications.warn('Please target a token'); }
  if (game.user.targets.size > 1) { return ui.notifications.warn('Spellsling can only affect 1 target'); }

 const DamageRoll = CONFIG.Dice.rolls.find(((R) => R.name === "DamageRoll"));

  /* New Spell getter*/
  const spells = [];
  for (const e of token.actor.itemTypes.spellcastingEntry) {
    if (e.isRitual) { continue; }
    if (e.system.prepared.value === "items") { continue }
		const spellData = await e.getSheetData();
    for(const group of spellData.groups) {
      const isCantrip = group.id === "cantrips" ? true : false;
      let i = 0;
      for (const active of group.active) {
        const index = i++;
        if(active === null) { continue; }
        let spell = active.spell;
        if(!spell.system.traits.value.includes("attack") || spell === null) { continue; }
        const castRank = active.castRank ?? (await spell.getChatData()).castRank;
        const {isAttack, isSave, description, save, slug, traits, formula} = await spell.getChatData({},{castRank});
        let rank = `Rank ${castRank}`
        if(spellData.isPrepared) {
          rank += ` |Slot: ${index + 1}|`
        }
        let lvl = castRank+1;
        const name = spell.name;
        if(isCantrip) { 
          rank = `Cantrip ${castRank}`
          lvl = 0;
        }
        if(spellData.isFocusPool) { 
          rank = `Focus ${castRank}`
          lvl = 1;
        }
				const sname = `${name} ${rank} (${e.name})`;
        spells.push({name: sname, castRank, sEId: spellData.id, slug, description, DC: save.value, spell, index, isSave, isAttack, basic: spell.system.defense.save?.basic ?? false, isCantrip, isFocus: spellData.isFocusPool, traits, save: save.type ?? "", lvl, formula, isExpended: active.expended ? true : false , isUseless: group.uses?.value < 1 ? true : false});
      }
    }
	};
	spells.sort((a, b) => {
    if (a.lvl === b.lvl)
      return a.name
      .toUpperCase()
      .localeCompare(b.name.toUpperCase(), undefined, {
        sensitivity: "base",
      });
    return a.lvl - b.lvl;
  });


  if (spells.length === 0) { return void ui.notifications.info("You have no spells available"); }

  /* Get them guns baby */
  const weapons = token.actor.itemTypes.weapon.filter(i => i.isEquipped && i.system.group === 'firearm');
  const map_weap = weapons.map(p => p.name);


  /* Build dialog data */
  const es_data = [
    { label : `Choose a Spell : `, type : `select`, options : spells.filter(s => !s.isExpended && !s.isUseless).map(p => p.name) },
    { label: `Beast Gun : `, type: `select`, options: map_weap },
    { label: `Reroll using hero point?`, type: `checkbox` }
  ];

  /* Run dialog and alot data */
  const spell_choice = await quickDialog({ data: es_data, title: `Spellsling` });

  let last, mes;
  if (spell_choice[2]) {
    mes = game.messages.contents.findLast( lus => lus.getFlag("world","macro.spellUsed") !== undefined && lus.token.id === token.id);
    if (mes === undefined) return void ui.notifications.warn("There are no previously cast spells or strike has already been rerolled");
    if (actor.system.resources.heroPoints.value === 0) { return void ui.notifications.warn("You have no hero points left")}
    last = mes.getFlag("world","macro.spellUsed");
    last.spell = actor.itemTypes.spell.find(s => s.slug === last.slug);
  }

  /* Get the strike actions and roll strike */
  const strike = token.actor.system.actions.find(a => a.type === 'strike' && a.label === spell_choice[1]);
  const spc = last ?? spells.find(sp => sp.name === spell_choice[0]);
  const s_entry = token.actor.itemTypes.spellcastingEntry.find(e => e.id === spc.sEId);

  // Check for spell variants
  if (spc.spell.hasVariants && spc.isAttack) {
    let spell_variants;
    if (spc.spell.overlays.contents[0].system?.time !== undefined) {
      spell_variants = Array.from(spc.spell.overlays.entries(), ([id, ovl]) => ({name: spc.name + ovl.system.time.value, id: id, castRank: spc.castRank}));
    }
    else {
      spell_variants = Array.from(spc.spell.overlays.entries(), ([id, ovl]) => ({name: ovl.name ?? spc.name, id: id, castRank: spc.castRank}));
    }

    spell_variants.sort((a, b) => {
      if (a.lvl === b.lvl)
        return a.name
          .toUpperCase()
          .localeCompare(b.name.toUpperCase(), undefined, {
            sensitivity: "base",
          });
      return a.lvl - b.lvl;
    });


    // Build dialog data
    const ovr_data = [
      { label: `Choose a Spell Variant : `, type: `select`, options: spell_variants.map(p => p.name) }
    ];

    // Query user for variant choice
    const variant_choice = await quickDialog({ data: ovr_data, title: `Variants Detected` });

    // Obtain the ID of the chosen variant, then use that ID to fetch the modified spell
    const vrId = spell_variants.find(x => x.name === variant_choice[0]).id;
    const variant = spc.spell.loadVariant({ castRank: spc.castRank, overlayIds: [vrId] });
    spc.spell = variant;
  }
  
  let pers, critt;
  if ( !spell_choice[2] ) {
    critt = (await strike.attack({ event, callback: async(x) =>  { await(game.messages.contents.findLast(m => m.speaker.token === _token.id)).setFlag("world","macro.spellUsed", spc); }})).degreeOfSuccess;
  }
  else {
    await game.pf2e.Check.rerollFromMessage(mes,{heroPoint:1});
    critt = game.messages.contents.findLast(r => r.isReroll).rolls[0].degreeOfSuccess;
  }

  let ttags = '';
  for (const t of spc.traits) {
    ttags += `<span class="tag" data-trait data-tooltip=${t.description}>${t.value[0].toUpperCase() + t.value.substring(1)}</span>`
  }

  let dos;
  let hit = false

  if (critt === 2) { dos = 'Success'; hit = true }
  if (critt === 3) { dos = 'Critical Success'; hit = true }

  // Automated Animations insertion by MrVauxs
  if (game.modules.get("autoanimations")?.active) {
    AutomatedAnimations.playAnimation(token, {name: spc.name}, { targets: [Array.from(game.user.targets)[0]], hitTargets: hit ? [Array.from(game.user.targets)[0]] : [] })
  }

  let flavName = ` cast at Rank ${spc.castRank}`;
  if (spc.isCantrip) { flavName = ` Cantrip ${spc.castRank}`; }
  if (spc.isFocus) { flavName = ` Focus ${spc.castRank}`; }
  let flavor = `<strong>Spellsling</strong><br>${spc.spell.link}${flavName} (${dos})`;
  if (spc.slug === null) { flavor = `<div class="tags">${ttags}<br><hr><strong>Spellsling</strong><br>${flavName} [Custom Spell] (${dos})`; }
  if (spc.isSave) {
    flavor += `<br>@Check[type:${spc.save}|dc:${spc.DC}|traits:damaging-effect,${spc.traits.map(v => v.value).join()}|basic:${spc.basic}]`;
  }

  if (spc.slug === "acid-splash" && critt === 3) {
    if (spc.castRank < 3) { flavor += `[[/r 1[persistent,acid]]]` }
    else if (spc.castRank > 2 && spc.castRank < 5) { flavor += `[[/r 2[persistent,acid]]]` }
    else if (spc.castRank > 4 && spc.castRank < 7) { flavor += `[[/r 3[persistent,acid]]]` }
    else if (spc.castRank > 6 && spc.castRank < 9) { flavor += `[[/r 4[persistent,acid]]]` }
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
  if (spc.slug === 'gouging-claw' && critt === 3) {
    pers = Math.ceil(actor.level / 2) + "d4";
    flavor += `[[/r ${pers}[persistent,bleed]]]`
  }
  if (spc.slug === 'holy-light' || spc.slug === 'moonlight-ray') {
    if (game.user.targets.first().actor.traits.has('undead') || game.user.targets.first().actor.traits.has('fiend')) {
      const spRD = spc.spell.getRollData({ castRank: spc.castRank });
      spc.roll = (await spRD.item.getDamage()).template.damage.roll;
      spc.roll = new DamageRoll(`{(${spc.roll.terms[0].rolls[0]._formula})[${spc.roll.terms[0].rolls[0].type}],(${(spc.castRank - 3) * 2 + 5}d6)[spirit]}`);
      flavor = `<div class="tags">${ttags}<br><hr><strong>Spellsling</strong><br>${spc.spell.link}${flavName} (${dos})`;
    }
  }
  if (spc.slug === 'chilling-darkness') {
    if (game.user.targets.first().actor.traits.has('holy')) {
      const spRD = spc.spell.getRollData({ castRank: spc.castRank });
      spc.roll = (await spRD.item.getDamage()).template.damage.roll;
      spc.roll = new DamageRoll(`{(${spc.roll.terms[0].rolls[0]._formula})[${spc.roll.terms[0].rolls[0].type}],(${(spc.castRank - 3) * 2 + 5}d6)[spirit]}`);
      flavor = `<div class="tags">${ttags}<br><hr><strong>Spellsling</strong><br>${spc.spell.link}${flavName} (${dos})`;
    }
  }

  if (game.modules.get('xdy-pf2e-workbench')?.active && !game.settings.get("xdy-pf2e-workbench", "autoRollDamageForStrike")) {
    if (critt === 2) { await strike.damage({ event }); }
    if (critt === 3) { await strike.critical({ event }); }
  }
  if (!game.modules.has('xdy-pf2e-workbench') || !game.modules.get('xdy-pf2e-workbench')?.active) {
    if (critt === 2) { await strike.damage({ event }); }
    if (critt === 3) { await strike.critical({ event }); }
  }

  /* Chromatic Ray */
  if (spc.slug === 'chromatic-ray' && critt >= 2) {
    flavor = `<div class="tags">${ttags}`;
    let ds = '';
    let dsc = '';
    if (token.actor.itemTypes.feat.some(s => s.slug === 'dangerous-sorcery')) {
      ds = ` + ${spc.castRank}`;
      dsc = ` + ${spc.castRank * 2}`
    }
    const chroma = [
      { d: `{30${ds}}[fire]`, f: `<span class="tag" data-trait data-description="PF2E.TraitDescriptionFire">Fire</span></div><hr><strong>Spellsling</strong><br>${spc.spell.link}${flavName} (${dos})<br><p class='compact-text'>1.<strong>Red</strong> (fire) The ray deals 30 fire damage to the target. Double on a Critical.</p>`, dd: `(60${dsc})[fire]` },
      { d: `{40${ds}}[acid]`, f: `<span class="tag" data-trait="acid" data-description="PF2E.TraitDescriptionAcid">Acid</span></div><hr><strong>Spellsling</strong><br>${spc.spell.link}${flavName} (${dos})<br><p class='compact-text'>2.<strong>Orange</strong> (acid) The ray deals 40 acid damage to the target. Double on a Critical.</p>`, dd: `(80${dsc})[acid]` },
      { d: `(50${ds})[electricity]`, f: `<span class="tag" data-trait data-description="PF2E.TraitDescriptionElectricity">Electricity</span></div><hr><strong>Spellsling</strong><br>${spc.spell.link}${flavName} (${dos})<br><p class='compact-text'>3.<strong>Yellow</strong> <br>(electricity) The ray deals 50 electricity damage to the target. Double on a Critical.</p>`, dd: `(100${dsc})[electricity]` },
      { d: `(25${ds})[poison]`, f: `<span class="tag" data-trait data-description="PF2E.TraitDescriptionPoison">Poison</span></div><hr><strong>Spellsling</strong><br>${spc.spell.link}${flavName} (${dos})<br><p class='compact-text'>4.<strong>Green</strong> (poison) The ray deals 25 poison damage to the target, double on a Critical, and the target must succeed at a @Check[type:fortitude|dc:${spc.DC}|traits:arcane,attack,evocation,light,poison] or be @Compendium[pf2e.conditionitems.Enfeebled]{Enfeebled 1} for 1 minute (@Compendium[pf2e.conditionitems.Enfeebled]{Enfeebled 2} on a critical failure).</p>`, dd: `(50${dsc})[poison]` },
      { f: `</div><strong><hr>Spellsling</strong><br>${spc.spell.link}${flavName} (${dos})<br><p class='compact-text'>5.<strong>Blue</strong> The ray has the effect of the @Compendium[pf2e.spells-srd.Petrify]{Petrify} spell. On a critical hit, the target is @Compendium[pf2e.conditionitems.Clumsy]{Clumsy 1} as long as it’s slowed by the petrify effect.<br>@Check[type:fortitude|dc:${spc.DC}|traits:arcane,attack,evocation,light]</p>` },
      { f: `<span class="tag" data-trait data-description="PF2E.TraitDescriptionEmotion">Emotion</span><span class="tag" data-trait data-description="PF2E.TraitDescriptionIncapacitation">Incapacitation</span><span class="tag" data-trait data-description="PF2E.TraitDescriptionMental">Mental</span></div><hr><strong>Spellsling</strong><br>${spc.spell.link}${flavName} (${dos})<br><p class='compact-text'>6.<strong>Indigo</strong> (emotion, incapacitation, mental) The ray has the effect of the @Compendium[pf2e.spells-srd.Confusion]{Confusion} spell. On a critical hit, it has the effect of @Compendium[pf2e.spells-srd.Warp Mind]{Warp Mind} instead.<br>@Check[type:will|dc:${spc.DC}|traits:arcane,attack,evocation,light,emotion,incapacitation,mental]</p>` },
      { f: `</div><hr><strong>Spellsling</strong><br>${spc.spell.link}${flavName} (${dos})<br><p class='compact-text'>7.<strong>Violet</strong> <br>The target is @Compendium[pf2e.conditionitems.Slowed]{Slowed} for 1 minute. It must also succeed at a @Check[type:will|dc:${spc.DC}|traits:arcane,attack,evocation,light] or be teleported 120 feet directly away from you (if there isn’t room for it to appear there, it appears in the nearest open space); this is a teleportation effect.</p>` },
      { f: `</div><hr><strong>Spellsling</strong><br>${spc.spell.link}${flavName} (${dos})<br><p class='compact-text'>8.<strong>Intense Color</strong> The target is @Compendium[pf2e.conditionitems.Dazzled]{Dazzled} until the end of your next turn, or @Compendium[pf2e.conditionitems.Blinded]{Blinded} if your attack roll was a critical hit. Roll again and add the effects of another color (rerolling results of 8).</p>` },
    ];
    let chromaD = '1d4';
    if (spc.castRank > 5) {
      chromaD = '1d8';
      chroma[0].d = `(40${ds})[fire]`;
      chroma[0].dd = `(80${dsc})[fire]`;
      chroma[0].f = chroma[0].f.replace('30', '40');
      chroma[1].d = `(50${ds})[acid]`;
      chroma[1].dd = `(100${dsc})[acid]`;
      chroma[1].f = chroma[1].f.replace('40', '50');
      chroma[2].d = `(60${ds})[electricity]`;
      chroma[2].dd = `(120${dsc})[electricity]`;
      chroma[2].f = chroma[2].f.replace('50', '60');
      chroma[3].d = `(35${ds})[poison]`;
      chroma[3].dd = `(70${dsc})[poison]`;
      chroma[3].f = chroma[3].f.replace('25', '35');
    }
    const chromaR = new Roll(chromaD).evaluate({ async: false }).total;
    if (chromaR < 5) {
      ddice = chroma[chromaR - 1].dd;
      flavor = flavor + chroma[chromaR - 1].f;
      spc.roll = new DamageRoll(chroma[chromaR - 1].d);
      if (critt === 3) {
        spc.roll = new DamageRoll(chroma[chromaR - 1].dd);
      }
    }
    if (chromaR > 4 && chromaR <= 7) { flavor = flavor + chroma[chromaR - 1].f; await ChatMessage.create({ speaker: ChatMessage.getSpeaker(), content: flavor, flags: { "world.macro.spellUsed": spc } }); }
    if (chromaR === 8) {
      const flavor2 = flavor + chroma[chromaR - 1].f;
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker(), content: flavor2, flags: { "world.macro.spellUsed": spc } });
      if (critt === 3) {
        const chromaRR = new Roll('1d7').evaluate({ async: false }).total;
        if (chromaRR < 5) { flavor = flavor + chroma[chromaRR - 1].f; spc.roll = new DamageRoll(chroma[chromaRR - 1].dd); }
        if (chromaRR > 4) { flavor = flavor + chroma[chromaRR - 1].f; await ChatMessage.create({ speaker: ChatMessage.getSpeaker(), content: flavor, flags: { "world.macro.spellUsed": spc } }); }
      }
    }
  }

  const { item } = await spc.spell.getRollData({ castRank: spc.castRank });
  if (critt >= 2) {
    if (spc.slug !== "chromatic-ray" && spc.roll === undefined && spc.formula === undefined) {
      await item.toMessage(null, { speaker: ChatMessage.getSpeaker(), flags: { "world.macro.spellUsed": spc } })
    }
    if (critt === 3 && spc.slug !== "chromatic-ray") { ui.notifications.info('Spell damage will need to be doubled when applied'); }
    if (spc.roll !== undefined) {
      await spc.roll.toMessage({ flavor: flavor, speaker: ChatMessage.getSpeaker(), flags: { "world.macro.spellUsed": spc } });
    }
    else {
      await item.rollDamage({ event });
    }
  }

  /* Expend slots */
  if (spc.isCantrip || spell_choice[2]) { return; }
  await s_entry.cast(spc.spell, { slotId: spc.index, rank: spc.castRank, message: false });
}
/* Dialog box */
async function quickDialog({ data, title = `Quick Dialog` } = {}) {
  data = data instanceof Array ? data : [data];

  return await new Promise(async (resolve) => {
    let content = `
      <table style="width:100%">
      ${data.map(({ type, label, options }, i) => {
      if (type.toLowerCase() === `select`) {
        return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><select style="font-size:12px" id="${i}qd">${options.map((e, i) => `<option value="${e}">${e}</option>`).join(``)}</td></tr>`;
      }
      else if (type.toLowerCase() === `checkbox`) {
        return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" id="${i}qd" ${options || ``}/></td></tr>`;
      }
      else {
        return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" id="${i}qd" value="${options instanceof Array ? options[0] : options}"/></td></tr>`;
      }
    }).join(``)}
      </table>`;

    await new Dialog({
      title, content,
      buttons: {
        Ok: {
          label: `Ok`, callback: (html) => {
            resolve(Array(data.length).fill().map((e, i) => {
              let { type } = data[i];
              if (type.toLowerCase() === `select`) {
                return html.find(`select#${i}qd`).val();
              }
              else {
                switch (type.toLowerCase()) {
                  case `text`:
                  case `password`:
                  case `radio`:
                    return html.find(`input#${i}qd`)[0].value;
                  case `checkbox`:
                    return html.find(`input#${i}qd`)[0].checked;
                  case `number`:
                    return html.find(`input#${i}qd`)[0].valueAsNumber;
                }
              }
            }));
          }
        }
      },
      default: 'Ok'
    }, { width: "auto" })._render(true);
    document.getElementById("0qd").focus();
  });
}
