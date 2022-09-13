/*
This is complete rewrite of the Spellstrike macro.
To use this macro, you just have to target someone and use it.
It will automatically roll damage based on degree of success.
At the moment critical hits will only double dice if that setting is applied.
I may integrate double damage again in the future, for now, just apply damage with the double button when applying.
Standby Spell now supported, if you have the feat it will:
1. Ask if you are using Standby Spell.
2. Set a Standby Spell by calling to the Standby Spell macro, if one hasn't been set yet.
3. Filter the drop down list to only include spells you can substitute
*/

Spellstrike();

async function Spellstrike()
{
	/* Throw warning if token is not selected*/
  if (canvas.tokens.controlled.length < 1) { return ui.notifications.warn('No token is selected.'); }
  if (canvas.tokens.controlled.length > 1) { return ui.notifications.warn('Only 1 token should be selected'); }
  if (game.user.targets.size < 1) { return ui.notifications.warn('Please target a token'); }
  if (game.user.targets.size > 1) { return ui.notifications.warn('Spellstrike can only affect 1 target'); }

  for (let token of canvas.tokens.controlled) {
    /* Check for eldritch archer dedication and warn if not present */
    if (!token.actor.itemTypes.feat.some(e => e.slug === 'spellstrike')) {
    return ui.notifications.warn('Does not have Spellstrike.');
    }

    let entries = token.actor.itemTypes.spellcastingEntry.filter(r => !r.isRitual);

    /*Standby Spells*/
    let standby = false;
    if (token.actor.itemTypes.feat.some(f => f.slug === 'standby-spell')) {
      standby = await new Promise((resolve) => {
        new Dialog({
          title: 'Use Standby Spell?',
          buttons: {
            yes: { label: 'Yes', callback: async(rar) => { resolve(true); } },
            no: { label: 'No', callback: async(rar) => { resolve(false); } },
          },
          default: 'no',
        },{width:"auto"}).render(true);
      });
      if(standby) {
        if(token.actor.itemTypes.spellcastingEntry.some(sb => sb.flags.pf2e.magusSE) && token.actor.itemTypes.spell.some(s => s.flags.pf2e.standbySpell === true)) {
        entries = token.actor.itemTypes.spellcastingEntry.filter(sb => sb.flags.pf2e.magusSE);
        }
        else {
          if ( game.modules.get('xdy-pf2e-workbench')?.active && (await game.packs.get("xdy-pf2e-workbench.asymonous-benefactor-macros-internal").getDocuments()).some(x => x.name === 'XDY DO_NOT_IMPORT Assign Standby Spell')) {
          const temp_macro = new Macro((await game.packs.get("xdy-pf2e-workbench.asymonous-benefactor-macros-internal").getDocuments()).find(x => x.name === 'XDY DO_NOT_IMPORT Assign Standby Spell')?.toObject());
          temp_macro.data.permission.default = CONST.DOCUMENT_PERMISSION_LEVELS.OWNER;
          await temp_macro.execute();
          }
          else if ( game.macros.some(n => n.name === "Assign Standby Spell") ) { await game.macros.find(n => n.name === "Assign Standby Spell").execute();  }
          else { return ui.notifications.warn("You do not have the latest workbench version or it is not active, or the Assign Standby Spell macro"); }
          entries = token.actor.itemTypes.spellcastingEntry.filter(sb => sb.flags.pf2e.magusSE);
        }
      }
    }

    /* New Spell getter*/
    const exceptions = ['magic-missile','force-fang'];
    let ttraits = [];
    if (game.user.targets.ids.length === 1) { canvas.tokens.placeables.find(t => t.id === game.user.targets.ids[0]).actor.system.traits.value.forEach(p => {ttraits.push(p)}); }
    if (ttraits.includes('undead')) { exceptions.push('heal'); }

    let spells = [];
    for (const e of entries) {
			const spellData = await e.getSpellData();
			spellData.levels.forEach(sp => {
        if (standby && sp.level < token.actor.itemTypes.spell.find(s => s.flags.pf2e.standbySpell === true).baseLevel) { return; }
        if(sp.isCantrip && standby) { return; }
        if(sp.uses !== undefined && !sp.isCantrip && sp.uses.value < 1) { return; }
				sp.active.forEach((spa,index) => {
					if(spa === null) { return; }
					if(!spa.chatData.isAttack && !token.actor.itemTypes.feat.some(f => f.slug === 'expansive-spellstrike') && !standby) { return; }
          if (spa.spell.system.spellType.value === 'utility' || spa.spell.system.spellType.value === 'heal') { 
            if (!exceptions.includes(spa.spell.slug) && !standby) { return; }
          }
          if(spa.expended) { return; }
          if(spellData.isFocusPool && !spa.spell.isCantrip && token.actor.system.resources.focus.value === 0){ return; }
          let level = `lv${sp.level}`
          const name = spa.spell.name;
          const spRD = spa.spell.getRollData({spellLvl: sp.level});
          const formula = spa.spell.getDamageFormula(sp.level, spRD);
		      if(sp.isCantrip) { level = `[Cantrip]`}
				  const sname = `${name} ${level} (${e.name})`;
          spells.push({name: sname, formula:formula, lvl: sp.level, slug: spa.spell.slug, sEId: spellData.id, desc: spa.spell.description, DC: e.system.statisticData.dc.value, data: spRD, spell: spa, index: index, isSave: spa.chatData.isSave});
				});
			});
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
    /* Get them weapons baby */
    let weapons = [];
    if (token.actor.itemTypes.feat.some(f => f.slug === 'starlit-span')) { 
      weapons = actor.system.actions.filter(i => i.type === "strike" && i.item.isEquipped);
      weapons.forEach( (w,index) => {
        if ( w.name.includes("Thrown") || w.item.isRanged) { return; }
        if (w.item.system.traits.value.some(v => v.includes("thrown"))) {
          let tw = deepClone(w.altUsages[0]);
          if (!tw.name.includes("Thrown")) {
            tw.name = `Thrown ${tw.name}`
          }
          weapons.splice(index+1,0,tw);
        }
      });
    }
    else { 
      weapons = token.actor.system.actions.filter(i => i.type === "strike" && !i.item.isRanged && i.item.isEquipped && !i.item.system.traits.value.includes("ranged"));
    }
    const map_weap = weapons.map(p => p.name);
    
    /* Build dialog data */
    const es_data = [
      { label : `Choose a Spell:`, type : `select`, options : spells.map(p=> p.name) },
      { label : `Weapon:`, type : `select`, options : map_weap },
    ];
        	 
    /* Run dialog and alot data */
    const spell_choice = await quickDialog({data : es_data, title : `Spellstrike`});
		
    /* Get the strike actions and roll strike */
    const strike = weapons.find(a => a.name === spell_choice[1]);
    let spc = spells.find(sp => sp.name === spell_choice[0]);
    const spcBack = spc;
    let sbsp;
    if(standby) {
      const sbs = token.actor.itemTypes.spell.find(sb => sb.flags.pf2e.standbySpell);
      sbsp = {name: `${sbs.name} (Standby)`, formula:``, sEId: ``, lvl: sbs.level, spId: sbs.id, slug: sbs.slug, desc: sbs.description, DC: sbs.spellcasting.statistic.dc.value, data: ``, spell: { chatData: sbs.getChatData(), spell: sbs }, index: ``, isSave: sbs.getChatData().isSave}
      if ( sbsp.lvl > spc.lvl ) { return ui.notifications.warn(`The chosen spell level is below the base level of your standby spell ${sbsp.name}, please try again.`); }
      sbsp.lvl = spc.lvl;
      sbsp.data = sbsp.spell.spell.getRollData({spellLvl: sbsp.lvl});
      sbsp.formula = sbsp.spell.spell.getDamageFormula(sbsp.lvl, sbsp.data);
      sbsp.sEId = spc.sEId;
      sbsp.index = spc.index;
      spc = sbsp;
    }

    let s_entry = token.actor.itemTypes.spellcastingEntry.find(e => e.id === spc.sEId);     

    let pers;
    const key = s_entry.ability;
    const s_mod = ` + ${token.actor.system.abilities[key].mod}`
    const c_mod = ` + ${token.actor.system.abilities[key].mod *2}`
    if (spc.slug === 'telekinetic-projectile') {
      const type = await quickDialog({data: {label:'Choose Damage Type:', type: 'select', options:["bludgeoning","piercing","slashing"]}, title: `Choose a damage type`});
      spc.formula = spc.formula.replace("untyped",type);
    }
    if (spc.slug === 'gouging-claw') {
      const type = await quickDialog({data: {label:'Choose Damage Type:', type: 'select', options:["piercing","slashing"]}, title: `Choose a damage type`});
      spc.formula = spc.formula.replace("untyped",type);
    }
    if (spc.slug === 'magnetic-acceleration' && token.actor.itemTypes.feat.some(s => s.slug === 'dangerous-sorcery')) {
      const type = await quickDialog({data: {label:'Choose Damage Type:', type: 'select', options:["bludgeoning","piercing"]}, title: `Choose a damage type`});
      spc.formula = spc.formula + `[${type}]`;
    }
    if (spc.slug === 'searing-light'){
      if (!game.user.targets.first().actor.traits.has('undead') && !game.user.targets.first().actor.traits.has('fiend')) { 
        spc.formula = token.actor.itemTypes.feat.some(s => s.slug === 'dangerous-sorcery') ? `${(spc.lvl-3)*2 + 5}d6 + ${spc.lvl}[fire]` : `${(spc.lvl-3)*2 + 5}d6`;
      }
      else {
        const type = token.actor.itemTypes.feat.some(s => s.slug === 'dangerous-sorcery') ? await quickDialog({data: {label:'Choose Damage Type:', type: 'select', options:["fire","good"]}, title: `Choose a damage type`}) : '';
        spc.formula = token.actor.itemTypes.feat.some(s => s.slug === 'dangerous-sorcery') ? `${(spc.lvl-3)*2 + 5}d6[fire] + ${(spc.lvl-3)*2 + 5}d6[good] + ${spc.lvl}[${type}]` : `${(spc.lvl-3)*2 + 5}d6[fire] + ${(spc.lvl-3)*2 + 5}d6[good]`;
      }
    }
    if (spc.slug === 'moonlight-ray'){
      if (!game.user.targets.first().actor.traits.has('undead') && !game.user.targets.first().actor.traits.has('fiend')) { 
        spc.formula = token.actor.itemTypes.feat.some(s => s.slug === 'dangerous-sorcery') ? `${(spc.lvl-3)*2 + 5}d6 + ${spc.lvl}[cold]` : `${(spc.lvl-3)*2 + 5}d6`;
      }
      else {
        const type = token.actor.itemTypes.feat.some(s => s.slug === 'dangerous-sorcery') ? await quickDialog({data: {label:'Choose Damage Type:', type: 'select', options:["cold","good"]}, title: `Choose a damage type`}) : '';
        spc.formula = token.actor.itemTypes.feat.some(s => s.slug === 'dangerous-sorcery') ? `${(spc.lvl-3)*2 + 5}d6[cold] + ${(spc.lvl-3)*2 + 5}d6[good] + ${spc.lvl}[${type}]` : `${(spc.lvl-3)*2 + 5}d6[cold] + ${(spc.lvl-3)*2 + 5}d6[good]`;
      }
    }

    if (token.actor.itemTypes.feat.some(s => s.slug === 'dangerous-sorcery') && spc.slug !== 'magnetic-acceleration' && spc.slug !== 'moonlight-ray' && spc.slug !== 'searing-light' && Object.entries(spc.data.item.system.damage.value).length !== 0 && !spc.data.item.isCantrip ) {
        let dt;
        Object.entries(spc.data.item.system.damage.value).forEach((t,i) => {
            if (i !== 0) { return }
            dt = t[1].type.value;
        });
        spc.formula = spc.formula + `[${dt}]`;
    }


    const fsplit = spc.formula.split(" ");
    let ddam,ddice = '';
    if (spc.spell.chatData.isAttack){
      fsplit.forEach(f => {
        if (f.match((/\d+\.\d+|\d+\b|\d+(?=\w)/g) || []) === null) { return ddice = ddice + f; }
        const double = `${parseInt(f.match((/\d+\.\d+|\d+\b|\d+(?=\w)/g) || [])[0]) * 2}`;
        ddice = ddice + f.replace(f.match((/\d+\.\d+|\d+\b|\d+(?=\w)/g) || [])[0], double)
      });
    }

    /* Acid Splash */
    let splash = 0;
    if (spc.slug === 'acid-splash') {
      const dtype = 'acid';
      if (actor.level < 5) {
        pers = 1;
        spc.formula = `{1d6}[acid]`;
        ddice = `{2d6}[acid]`;
        splash = '{1}[acid]'
      }
      else if (actor.level >= 5 && actor.level < 9) {
        pers = 2;
        spc.formula = `{1d6${s_mod}}[acid]`;
        ddice = `{2d6${c_mod}}[acid]`;
        splash = '{1}[acid]'
      }
      else if (actor.level >= 9 && actor.level < 13) {
        pers = 3;
        spc.formula = `{2d6${s_mod}}[acid]`;
        ddice = `{4d6${c_mod}}[acid]`;
        splash = '{2}[acid]'
      }
      else if (actor.level >= 13 && actor.level < 18) {
        pers = 4;
        spc.formula = `{3d6${s_mod}}[acid]`;
        ddice = `{6d6${c_mod}}[acid]`;
        splash = '{3}[acid]'
      }
      else { 
        pers = 5;
        spc.formula = `{4d6${s_mod}}[acid]`;
        ddice = `{8d6${c_mod}}[acid]`;
        splash = `{4}[acid]`
      }
            
    }

    let critt;
    function SSDOS(cm, jq) {
      if (cm.user.id === game.userId && cm.isCheckRoll) { critt = cm.flags.pf2e.context.outcome; }
    }

    Hooks.on('renderChatMessage', SSDOS);

    await strike.attack({ event });
      
    Hooks.off('renderChatMessage', SSDOS);

    let traits = spc.data.item.system.traits.value.join();
    let ttags = '';
    spc.data.item.system.traits.value.forEach( t => {
      ttags = ttags + `<span class="tag tooltipstered" data-trait="${t}" data-description="PF2E.TraitDescription${t[0].toUpperCase() + t.substring(1)}">${t[0].toUpperCase() + t.substring(1)}</span>`
    });
    let dos;
    if (critt === 'success') { dos = 'Success' }
    if (critt === 'criticalSuccess') { dos = 'Critical Success' }
    if (spc.data.item.system.damage.value !== '' || spc.data.item.system.damage.value !== undefined || Object.entries(spc.spell.chatData.damage.value).length > 0){ traits = traits + `,damaging-effect`; }
    let flavName = `${spc.data.item.name} cast at Lv${spc.lvl}`;
    if (spc.data.item.isCantrip) { flavName = `${spc.data.item.name} (Cantrip)`; }
    let flavor = `<strong>Spellstrike</strong><br>@Compendium[pf2e.spells-srd.${spc.data.item.name}]{${flavName}} (${dos})<div class="tags">${ttags}</div><hr>`;
    if (spc.slug === null) { flavor = `<strong>Spellstrike</strong><br>${flavName} [Custom Spell] (${dos})<div class="tags">${ttags}</div><hr>`; }
    if (spc.slug === 'acid-splash') { flavor = `<strong>Spellstrike</strong>@Compendium[pf2e.spells-srd.Acid Splash]{${flavName}} (${dos})<div class="tags">${ttags}</div>` }
    if (spc.isSave && spc.slug !== 'chromatic-ray') {
      let basic = true;
      if (spc.data.item.system.save.basic === '') { basic = false; }
      flavor = flavor + `<span data-pf2-check='${spc.data.item.system.save.value}' data-pf2-dc='${spc.DC}' data-pf2-traits='${traits}' data-pf2-label='${spc.data.item.name} DC'><strong>DC ${spc.DC} </strong>${spc.data.item.system.save.basic} ${spc.data.item.system.save.value} save</span>`;
    }

    if(spc.slug === 'chromatic-ray' && (critt === 'success' || critt === 'criticalSuccess')) {
      flavor = `<strong>Spellstrike</strong><br>@Compendium[pf2e.spells-srd.${spc.data.item.name}]{${flavName}} (${dos})<div class="tags">${ttags}`;
      spc.formula = '';
      ddice = '';
      let ds = '';
      let dsc = '';
      if (token.actor.itemTypes.feat.some(s => s.slug === 'dangerous-sorcery')) { 
        ds = ` + ${spc.lvl}`; 
        dsc = ` + ${spc.lvl * 2}`
      }
      const chroma = [
        {d:`{30${ds}}[fire]`,f:`<span class="tag tooltipstered" data-trait="fire" data-description="PF2E.TraitDescriptionFire">Fire</span></div><hr><p class='compact-text'>1.<strong>Red</strong> (fire) The ray deals 30 fire damage to the target. Double on a Critical.</p>`,dd:`{60${dsc}}[fire]`},
        {d:`{40${ds}}[acid]`,f:`<span class="tag tooltipstered" data-trait="acid" data-description="PF2E.TraitDescriptionAcid">Acid</span></div><hr><p class='compact-text'>2.<strong>Orange</strong> (acid) The ray deals 40 acid damage to the target. Double on a Critical.</p>`,dd:`{80${dsc}}[acid]`},
        {d:`{50${ds}}[electricity]`,f:`<span class="tag tooltipstered" data-trait="electricity" data-description="PF2E.TraitDescriptionElectricity">Electricity</span></div><hr><p class='compact-text'>3.<strong>Yellow</strong> <br>(electricity) The ray deals 50 electricity damage to the target. Double on a Critical.</p>`,dd:`{100${dsc}}[electricity]`},
        {d:`{25${ds}}[poison]`,f:`<span class="tag tooltipstered" data-trait="poison" data-description="PF2E.TraitDescriptionPoison">Poison</span></div><hr><p class='compact-text'>4.<strong>Green</strong> (poison) The ray deals 25 poison damage to the target, double on a Critical, and the target must succeed at a <span data-pf2-check='fortitude' data-pf2-dc='${spc.DC}' data-pf2-traits='${traits},poison' data-pf2-label='${spc.data.item.name} DC'><strong>DC ${spc.DC} </strong>Fortitude save</span> or be @Compendium[pf2e.conditionitems.Enfeebled]{Enfeebled 1} for 1 minute (@Compendium[pf2e.conditionitems.Enfeebled]{Enfeebled 2} on a critical failure).</p>`,dd:`{50${dsc}}[poison]`},
        {f:`</div><hr><p class='compact-text'>5.<strong>Blue</strong> The ray has the effect of the @Compendium[pf2e.spells-srd.Flesh to Stone]{Flesh to Stone} spell. On a critical hit, the target is @Compendium[pf2e.conditionitems.Clumsy]{Clumsy 1} as long as it’s slowed by the flesh to stone effect.<br><span data-pf2-check='fortitude' data-pf2-dc='${spc.DC}' data-pf2-traits='${traits}' data-pf2-label='${spc.data.item.name} DC'><strong>DC ${spc.DC} </strong>Fortitude save</span></p>`},
        {f:`<span class="tag tooltipstered" data-trait="emotion" data-description="PF2E.TraitDescriptionEmotion">Emotion</span><span class="tag tooltipstered" data-trait="incapacitation" data-description="PF2E.TraitDescriptionIncapacitation">Incapacitation</span><span class="tag tooltipstered" data-trait="mental" data-description="PF2E.TraitDescriptionMental">Mental</span></div><hr><p class='compact-text'>6.<strong>Indigo</strong> (emotion, incapacitation, mental) The ray has the effect of the @Compendium[pf2e.spells-srd.Confusion]{Confusion} spell. On a critical hit, it has the effect of @Compendium[pf2e.spells-srd.Warp Mind]{Warp Mind} instead.<br><span data-pf2-check='will' data-pf2-dc='${spc.DC}' data-pf2-traits='${traits},emotion,incapacitation,mental' data-pf2-label='Indigo DC'><strong>DC ${spc.DC} </strong>Will save</span></p>`},
        {f:`</div><hr><p class='compact-text'>7.<strong>Violet</strong> <br>The target is @Compendium[pf2e.conditionitems.Slowed]{Slowed} for 1 minute. It must also succeed at a <span data-pf2-check='will' data-pf2-dc='${spc.DC}' data-pf2-traits='${traits}' data-pf2-label='Violet DC'><strong>DC ${spc.DC} </strong>Will save</span> or be teleported 120 feet directly away from you (if there isn’t room for it to appear there, it appears in the nearest open space); this is a teleportation effect.</p>`},
        {f:`</div><hr><p class='compact-text'>8.<strong>Intense Color</strong> The target is @Compendium[pf2e.conditionitems.Dazzled]{Dazzled} until the end of your next turn, or @Compendium[pf2e.conditionitems.Blinded]{Blinded} if your attack roll was a critical hit. Roll again and add the effects of another color (rerolling results of 8).</p>`},
      ];
      let chromaD = '1d4';
      if (spc.lvl > 5) { 
        chromaD = '1d8';
        chroma[0].d = `{40${ds}}[fire]`;
        chroma[0].dd = `{80${dsc}}[fire]`;
        chroma[0].f = chroma[0].f.replace('30','40');
        chroma[1].d = `{50${ds}}[acid]`;
        chroma[1].dd = `{100${dsc}}[acid]`;
        chroma[1].f = chroma[1].f.replace('40','50');
        chroma[2].d = `{60${ds}}[electricity]`;
        chroma[2].dd = `{120${dsc}}[electricity]`;
        chroma[2].f = chroma[2].f.replace('50','60');
        chroma[3].d = `{35${ds}}[poison]`;
        chroma[3].dd = `{70${dsc}}[poison]`;
        chroma[3].f = chroma[3].f.replace('25','35');
      }
      const chromaR = new Roll(chromaD).roll({ async : false }).total;
      if (chromaR < 5) { ddice = chroma[chromaR-1].dd; flavor = flavor + chroma[chromaR-1].f; spc.formula = chroma[chromaR-1].d}
      if (chromaR > 4 && chromaR <= 7) { flavor = flavor + chroma[chromaR-1].f; await ChatMessage.create({speaker: ChatMessage.getSpeaker(), content: flavor});}
      if (chromaR === 8) {
        const flavor2 = flavor + chroma[chromaR-1].f;
        await ChatMessage.create({speaker: ChatMessage.getSpeaker(), content: flavor2});
        if (critt === 'criticalSuccess') {
          const chromaRR = new Roll('1d7').roll({ async : false }).total;
          if (chromaRR < 5) { ddice = chroma[chromaRR-1].dd; flavor = flavor + chroma[chromaRR-1].f; spc.formula = chroma[chromaRR-1].d }
          if (chromaRR > 4) { flavor = flavor + chroma[chromaRR-1].f; await ChatMessage.create({speaker: ChatMessage.getSpeaker(), content: flavor}); spc.formula = ''}
	      }
      }
    }

    if(spc.slug === 'acid-splash' && critt === 'criticalSuccess') {
      flavor = flavor + `<hr>[[/r {${pers}}[persistent,acid]]] @Compendium[pf2e.conditionitems.Persistent Damage]{Persistent Acid Damage}`
    }
    if(spc.slug === 'produce-flame' && critt === 'criticalSuccess') {
      pers = Math.ceil(token.actor.level / 2) + "d4";
      flavor = flavor + `<br>[[/r {${pers}}[persistent,fire]]] @Compendium[pf2e.conditionitems.Persistent Damage]{Persistent Fire Damage}`
    }
    if(spc.slug === 'gouging-claw' && critt === 'criticalSuccess') {
      pers = Math.ceil(actor.level / 2) + "d4";
      flavor = flavor + `<br>[[/r {${pers}}[persistent,bleed]]] @Compendium[pf2e.conditionitems.Persistent Damage]{Persistent Bleed Damage}`
    }

    if (game.modules.get('xdy-pf2e-workbench')?.active && !game.settings.get("xdy-pf2e-workbench","autoRollDamageForStrike")) { 
      if (critt === 'success') { await strike.damage({ event }); }
      if (critt === 'criticalSuccess'){ await strike.critical({ event }); }
    }
    if(!game.modules.has('xdy-pf2e-workbench')) { 
      if (critt === 'success') { await strike.damage({ event }); }
      if (critt === 'criticalSuccess'){ await strike.critical({ event }); }
    }
    if (critt === 'success' || critt === 'criticalSuccess') {
      if (spc.slug !== 'chromatic-ray' && ( spc.data.item.system.damage.value === '' || spc.data.item.system.damage.value === undefined || Object.entries(spc.spell.chatData.damage.value).length === 0 || !spc.spell.chatData.isAttack) ){
        return s_entry.cast(spc.spell.spell,{slot: spc.index,level: spc.lvl,message: true});
      }
      else {
        if (critt === 'criticalSuccess' && (game.settings.get("pf2e","critRule") === 'doubledice')) { spc.formula = ddice; } 
        if (critt === 'criticalSuccess' && (game.settings.get("pf2e","critRule") === 'doubledamage')) {  ui.notifications.info('Spell damage will need to be doubled when applied'); }   
        if ( Object.entries(spc.spell.chatData.damage.value).length > 0 || (spc.slug === 'chromatic-ray' && spc.formula !== '')){
            const droll = new Roll(spc.formula);
            await droll.toMessage({ flavor: flavor, speaker: ChatMessage.getSpeaker() });
        }
        if ( spc.slug === 'acid-splash' ) {
          const sroll = new Roll(splash);
          await sroll.toMessage({flavor: `<strong>${spc.data.item.name} Splash Damage</strong><div class="tags">${ttags}</div><hr>`, speaker: ChatMessage.getSpeaker() });
        }
      }
    }

    if ( critt === 'failure' && !spc.spell.chatData.isAttack) { 
      return s_entry.cast(spc.spell.spell,{slot: spc.index,level: spc.lvl,message: true}); 
    }
      
    /* Expend slots */
    if ( spc.data.item.isCantrip ) { return; }
    if ( spell_choice[2] ) { spc = spcBack; }
    await s_entry.cast(spc.spell.spell,{slot: spc.index,level: spc.lvl,message: false});
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
      },{width:"auto"})._render(true);
        document.getElementById("0qd").focus();
    });
}
