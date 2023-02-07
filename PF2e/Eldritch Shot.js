/*
This is complete rewrite of the Eldritch Shot macro.
To use this macro, you just have to target someone and use it.
*/


Eldritch_shot();

async function Eldritch_shot()
{
	/* Throw warning if token is not selected*/
	  if (canvas.tokens.controlled.length < 1) { return ui.notifications.warn('No token is selected.'); }
    if (canvas.tokens.controlled.length > 1) { return ui.notifications.warn('Only 1 token should be selected'); }
    if (game.user.targets.size < 1) { return ui.notifications.warn('Please target a token'); }
    if (game.user.targets.size > 1) { return ui.notifications.warn('Eldritch Shot can only affect 1 target'); }


    for (let token of canvas.tokens.controlled) {
      /* Check for eldritch archer dedication and warn if not present */
      if (!token.actor.itemTypes.feat.some(e => e.slug === "eldritch-archer-dedication")) {
      return ui.notifications.warn('Does not have Eldritch Archer Dedication.');
      }
      
      const DamageRoll = CONFIG.Dice.rolls.find(((R) => R.name === "DamageRoll"));

      /* New Spell getter*/
      const spells = [];
      for (const e of token.actor.itemTypes.spellcastingEntry) {
        if (e.isRitual) { continue; }
        if (e.system.prepared.value === "items") { continue }
			  const spellData = await e.getSpellData();
         for(const sp of spellData.levels) {
           if(sp.uses !== undefined && !sp.isCantrip && sp.uses.value < 1) { continue; }
           let i = 0;
           for (const spa of sp.active) {
            const index = i++
            if(spa === null) { continue; }
					  if(spa.spell.system.spellType.value !== 'attack') { continue; }
            if(spa.expended) { continue; }
            if(spellData.isFocusPool && !spa.spell.isCantrip && token.actor.system.resources.focus.value === 0){ continue; }
            let level = `lv${sp.level}`
            const name = spa.spell.name;
            const spRD = spa.spell.getRollData({castLevel: spa.spell.isCantrip ? Math.ceil(actor.level/2) : sp.level});
            const damage = await spRD.item.getDamage() ?? false;
            const roll = damage ? damage.template.damage.roll : undefined;
            if(sp.isCantrip) { level = `[Cantrip]`}
				    const sname = `${name} ${level} (${e.name})`;
            let isAttack = false;
            if (spa.spell.system.spellType.value === 'attack') { isAttack = true; }
            let isSave = false;
            if (spa.spell.system.spellType.value === "save" || spa.spell.system.save?.value !== "") { isSave = true; }
            spells.push({name: sname, roll, sEId: spellData.id, lvl: sp.level, spId: spa.spell.id, slug: spa.spell.slug, desc: spa.spell.description, DC: e.statistic.dc.value, data: spRD, spell: spa.spell, index: index, isSave, isAttack});
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

      if(spells.length === 0) { return ui.notifications.info("You have no spells available"); }

      /* Get them bows baby */
      const weapons = token.actor.itemTypes.weapon.filter(i => i.isEquipped && i.system.group === 'bow');
      const map_weap = weapons.map(p => p.name);


      /* Build dialog data */
      const es_data = [
        { label : `Choose a Spell : `, type : `select`, options : spells.map(p=> p.name) },
        { label : `Bows : `, type : `select`, options : map_weap },
      ]
        	
      /* Run dialog and alot data */
      const spell_choice = await quickDialog({data : es_data, title : `Eldritch Shot`});
		
      /* Get the strike actions and roll strike */
      const strike = token.actor.system.actions.find(a => a.type === 'strike' && a.label === spell_choice[1]);
      const spc = spells.find(sp => sp.name === spell_choice[0]);
      const s_entry = token.actor.itemTypes.spellcastingEntry.find(e => e.id === spc.sEId);

      // Check for spell variants
      if(spc.spell.hasVariants && spc.isAttack){
        let spell_variants;
        if (spc.spell.overlays.contents[0].system.time !== undefined){
          spell_variants = Array.from(spc.spell.overlays).map(ovr => ({name: spc.name + ovr.system.time.value, id: ovr._id, lvl:spc.lvl}));
        }
        else { 
          spell_variants = Array.from(spc.spell.overlays).map(ovr => ({name: ovr.name, id: ovr._id, lvl:spc.lvl}));
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
          { label : `Choose a Spell Variant:`, type : `select`, options : spell_variants.map(p=> p.name) }
        ];
                 
        // Query user for variant choice
        const variant_choice = await quickDialog({data : ovr_data, title : `Variants Detected`});
        
        // Obtain the ID of the chosen variant, then use that ID to fetch the modified spell
        const vrId = spell_variants.find(x => x.name === variant_choice[0]).id;
        let variant = spc.spell.loadVariant({castLevel:spc.lvl, overlayIds:[vrId]});
        spc.spell = variant;
        // Re-calculate the damage formula for the spell.
        const damage = await variant.getDamage() ?? false;
        const roll = damage ? damage.template.damage.roll : undefined;
        // Overwrite the chosen spell's damage formula
        spc.roll = roll;
      }

      let pers;      

      const critt = (await strike.attack({ event })).degreeOfSuccess;
      
      const { actionTraits, spellTraits} = await spc.spell.getChatData();
      let ttags = '';
      for (const a of actionTraits) {
        ttags += `<span class="tag" data-trait=${a.name} data-description=${a.description}>${a.name[0].toUpperCase() + a.name.substring(1)}</span>`
      }
      ttags += '<hr class="vr">';  
      for (const s of spellTraits) {
        ttags += `<span class="tag tag_alt" data-trait=${s.value} data-description=${s.description}>${s.value[0].toUpperCase() + s.value.substring(1)}</span>`
      }

      let dos;
      let hit = false

      if (critt === 2) { dos = 'Success'; hit = true }
      if (critt === 3) { dos = 'Critical Success'; hit = true}
      
      // Automated Animations insertion by MrVauxs
      if (game.modules.get("autoanimations")?.active) {
        AutomatedAnimations.playAnimation(token, spc.spell, { targets: [Array.from(game.user.targets)[0]], hitTargets: hit ? [Array.from(game.user.targets)[0]] : []})
      }
      let flavName = ` cast at Lv${spc.lvl}`;
      if (spc.spell.isCantrip) { flavName = ` (Cantrip)`; }
      let flavor = `<strong>Eldritch Shot</strong><br>${spc.spell.link}${flavName} (${dos})<div class="tags">${ttags}</div><hr>`;
      if (spc.slug === null) { flavor = `<strong>Eldritch Shot</strong><br>${flavName} [Custom Spell] (${dos})<div class="tags">${ttags}</div><hr>`; }
      if (spc.isSave) {
        let basic = false;
        if (spc.spell.system.save.basic === "basic") { basic = true }
        flavor += `@Check[type:${spc.spell.system.save.value}|dc:${spc.DC}|traits:damaging-effect,${spc.spell.system.traits.value.join()}|basic:${basic}]`;
      }

      /* Acid Splash */
      if(spc.slug === 'acid-splash') {
        let pers = 0;
        spc.roll = (await (await spc.spell.loadVariant({castLevel:Math.ceil(actor.level / 2)})).getDamage()).template.damage.roll;
        if (actor.level < 5) {
          pers = 1;
          splash = '1'
        }
        else if (actor.level >= 5 && actor.level < 9) {
          pers = 2;
          splash = '1'
        }
        else if (actor.level >= 9 && actor.level < 13) {
          pers = 3;
          splash = '2'
        }
        else if (actor.level >= 13 && actor.level < 18) {
          pers = 4;
          splash = '3'
        }
        else { 
          pers = 5;
          splash = `4`
        }     
        flavor += `[[/r ${splash}[splash,acid]]] splash`
        if (critt === 3){
          flavor += `<br>[[/r ${pers}[persistent,acid]]]`
        }
      }
      if(spc.slug === 'produce-flame' && critt === 3) {
        pers = Math.ceil(actor.level / 2) + "d4";
        flavor += `[[/r ${pers}[persistent,fire]]]`
      }
      if(spc.slug === 'gouging-claw' && critt === 3) {
        pers = Math.ceil(actor.level / 2) + "d4";
        flavor += `[[/r ${pers}[persistent,bleed]]]`
      }
      if(spc.slug === 'searing-light' || spc.slug === 'moonlight-ray'){
        if (game.user.targets.first().actor.traits.has('undead') || game.user.targets.first().actor.traits.has('fiend')) {
          spc.roll = await new DamageRoll(`{(${spc.roll.terms[0].rolls[0]._formula})[${spc.roll.terms[0].rolls[0].type}],(${(spc.lvl-3)*2 + 5}d6)[good]}`);
        }
      }

      if (game.modules.get('xdy-pf2e-workbench')?.active && !game.settings.get("xdy-pf2e-workbench","autoRollDamageForStrike")) { 
        if (critt === 2) { await strike.damage({ event }); }
        if (critt === 3){ await strike.critical({ event }); }
       }
      if(!game.modules.has('xdy-pf2e-workbench') || !game.modules.get('xdy-pf2e-workbench')?.active) { 
        if (critt === 2) { await strike.damage({ event }); }
        if (critt === 3){ await strike.critical({ event }); }
      }

      /* Chromatic Ray */
      if(spc.slug === 'chromatic-ray' && critt >= 2) {
      flavor = `<strong>Eldritch Shot</strong><br>${spc.spell.link}${flavName} (${dos})<div class="tags">${ttags}`;
      let ds = '';
      let dsc = '';
      if (token.actor.itemTypes.feat.some(s => s.slug === 'dangerous-sorcery')) { 
        ds = ` + ${spc.lvl}`; 
        dsc = ` + ${spc.lvl * 2}`
      }
    const chroma = [
        {d:`{30${ds}}[fire]`,f:`<span class="tag tag_alt" data-trait="fire" data-description="PF2E.TraitDescriptionFire">Fire</span></div><hr><p class='compact-text'>1.<strong>Red</strong> (fire) The ray deals 30 fire damage to the target. Double on a Critical.</p>`,dd:`(60${dsc})[fire]`},
        {d:`{40${ds}}[acid]`,f:`<span class="tag tag_alt" data-trait="acid" data-description="PF2E.TraitDescriptionAcid">Acid</span></div><hr><p class='compact-text'>2.<strong>Orange</strong> (acid) The ray deals 40 acid damage to the target. Double on a Critical.</p>`,dd:`(80${dsc})[acid]`},
        {d:`(50${ds})[electricity]`,f:`<span class="tag tag_alt" data-trait="electricity" data-description="PF2E.TraitDescriptionElectricity">Electricity</span></div><hr><p class='compact-text'>3.<strong>Yellow</strong> <br>(electricity) The ray deals 50 electricity damage to the target. Double on a Critical.</p>`,dd:`(100${dsc})[electricity]`},
        {d:`(25${ds})[poison]`,f:`<span class="tag tag_alt" data-trait="poison" data-description="PF2E.TraitDescriptionPoison">Poison</span></div><hr><p class='compact-text'>4.<strong>Green</strong> (poison) The ray deals 25 poison damage to the target, double on a Critical, and the target must succeed at a @Check[type:fortitude|dc:${spc.DC}|traits:arcane,attack,evocation,light,poison] or be @Compendium[pf2e.conditionitems.Enfeebled]{Enfeebled 1} for 1 minute (@Compendium[pf2e.conditionitems.Enfeebled]{Enfeebled 2} on a critical failure).</p>`,dd:`(50${dsc})[poison]`},
        {f:`</div><hr><p class='compact-text'>5.<strong>Blue</strong> The ray has the effect of the @Compendium[pf2e.spells-srd.Flesh to Stone]{Flesh to Stone} spell. On a critical hit, the target is @Compendium[pf2e.conditionitems.Clumsy]{Clumsy 1} as long as it’s slowed by the flesh to stone effect.<br>@Check[type:fortitude|dc:${spc.DC}|traits:arcane,attack,evocation,light]</p>`},
        {f:`<span class="tag tag_alt" data-trait="emotion" data-description="PF2E.TraitDescriptionEmotion">Emotion</span><span class="tag tag_alt" data-trait="incapacitation" data-description="PF2E.TraitDescriptionIncapacitation">Incapacitation</span><span class="tag tag_alt" data-trait="mental" data-description="PF2E.TraitDescriptionMental">Mental</span></div><hr><p class='compact-text'>6.<strong>Indigo</strong> (emotion, incapacitation, mental) The ray has the effect of the @Compendium[pf2e.spells-srd.Confusion]{Confusion} spell. On a critical hit, it has the effect of @Compendium[pf2e.spells-srd.Warp Mind]{Warp Mind} instead.<br>@Check[type:will|dc:${spc.DC}|traits:arcane,attack,evocation,light,emotion,incapacitation,mental]</p>`},
        {f:`</div><hr><p class='compact-text'>7.<strong>Violet</strong> <br>The target is @Compendium[pf2e.conditionitems.Slowed]{Slowed} for 1 minute. It must also succeed at a @Check[type:will|dc:${spc.DC}|traits:arcane,attack,evocation,light] or be teleported 120 feet directly away from you (if there isn’t room for it to appear there, it appears in the nearest open space); this is a teleportation effect.</p>`},
        {f:`</div><hr><p class='compact-text'>8.<strong>Intense Color</strong> The target is @Compendium[pf2e.conditionitems.Dazzled]{Dazzled} until the end of your next turn, or @Compendium[pf2e.conditionitems.Blinded]{Blinded} if your attack roll was a critical hit. Roll again and add the effects of another color (rerolling results of 8).</p>`},
      ];
      let chromaD = '1d4';
      if (spc.lvl > 5) { 
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
      if (chromaR < 5) { ddice = chroma[chromaR-1].dd; 
        flavor = flavor + chroma[chromaR-1].f; 
        spc.roll = await new DamageRoll(chroma[chromaR-1].d);
        if (critt === 3) {
            spc.roll = await new DamageRoll(chroma[chromaR-1].dd);
        }
      }
      if (chromaR > 4 && chromaR <= 7) { flavor = flavor + chroma[chromaR-1].f; await ChatMessage.create({speaker: ChatMessage.getSpeaker(), content: flavor});}
      if (chromaR === 8) {
        const flavor2 = flavor + chroma[chromaR-1].f;
        await ChatMessage.create({speaker: ChatMessage.getSpeaker(), content: flavor2});
        if (critt === 3) {
          const chromaRR = new Roll('1d7').evaluate({async:false}).total;
          if (chromaRR < 5) { flavor = flavor + chroma[chromaRR-1].f; spc.roll = await new DamageRoll(chroma[chromaRR-1].dd); }
          if (chromaRR > 4) { flavor = flavor + chroma[chromaRR-1].f; await ChatMessage.create({speaker: ChatMessage.getSpeaker(), content: flavor});}
	      }
      }
    }

      if (critt >= 2) {
        if (spc.slug !== "chromatic-ray" && spc.roll === undefined) {
          return await s_entry.cast(spc.spell,{slot: spc.index,level: spc.lvl,message: true});
        }
        if (critt === 3 && spc.slug !== "chromatic-ray") {  ui.notifications.info('Spell damage will need to be doubled when applied'); }
        if ( spc.roll !== undefined) {
          await spc.roll.toMessage({ flavor: flavor, speaker: ChatMessage.getSpeaker() });
        }
      }
      /* Expend slots */
      if ( spc.spell.isCantrip ) { return; }
      await s_entry.cast(spc.spell,{slot: spc.index,level: spc.lvl,message: false});
      }

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
      })._render(true);
        document.getElementById("0qd").focus();
    });
}
