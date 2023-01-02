/*
To use this macro, you just have to target someone and use it.
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
            yes: { label: 'Yes', callback: async() => { resolve(true); } },
            no: { label: 'No', callback: async() => { resolve(false); } },
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
          temp_macro.ownership.default = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
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
			for (const sp of spellData.levels) {
        if (standby && sp.level < token.actor.itemTypes.spell.find(s => s.flags.pf2e.standbySpell === true).baseLevel) { continue; }
        if(sp.isCantrip && standby) { continue; }
        if(sp.uses !== undefined && !sp.isCantrip && sp.uses.value < 1) { continue; }
        let i = 0;
        for (const spa of sp.active) {
          const index = i++
          if(spa === null) { continue; }
					if(spa.spell.system.spellType.value !== 'attack' && !token.actor.itemTypes.feat.some(f => f.slug === 'expansive-spellstrike') && !standby) { continue; }
          if (spa.spell.system.spellType.value === 'utility' || spa.spell.system.spellType.value === 'heal') { 
            if (!exceptions.includes(spa.spell.slug) && !standby) { continue; }
          }
          if(spa.expended) { continue; }
          if(spellData.isFocusPool && !spa.spell.isCantrip && token.actor.system.resources.focus.value === 0){ continue; }
          let level = `lv${sp.level}`
          const name = spa.spell.name;
          const spRD = spa.spell.getRollData({castLevel: spa.spell.isCantrip ? Math.ceil(actor.level/2) : sp.level});
          const roll = spRD.item.damage?.roll;
          if(sp.isCantrip) { level = `[Cantrip]`}
	        const sname = `${name} ${level} (${e.name})`;
          let isAttack = false;
          if (spa.spell.system.spellType.value === 'attack') { isAttack = true; }
          let isSave = false;
          if (spa.spell.system.spellType.value === "save" || spa.spell.system.save?.value !== "") { isSave = true; }
          spells.push({name: sname, roll, sEId: spellData.id, lvl: sp.level, spId: spa.spell.id, slug: spa.spell.slug, desc: spa.spell.description, DC: e.statistic.dc.value, data: spRD, spell: spa.spell, index: index, isSave, isAttack});
				};
			};
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
        if ( w.label.includes("Thrown") || w.item.isRanged) { return; }
        if (w.item.system.traits.value.some(v => v.includes("thrown"))) {
          let tw = deepClone(w.altUsages[0]);
          if (!tw.label.includes("Thrown")) {
            tw.label = `Thrown ${tw.label}`
          }
          weapons.splice(index+1,0,tw);
        }
      });
    }
    else { 
      weapons = token.actor.system.actions.filter(i => i.type === "strike" && !i.item.isRanged && i.item.isEquipped && !i.item.system.traits.value.includes("ranged"));
    }
    const map_weap = weapons.map(p => p.label);
    
    /* Build dialog data */
    const es_data = [
      { label : `Choose a Spell:`, type : `select`, options : spells.map(p=> p.name) },
      { label : `Weapon:`, type : `select`, options : map_weap },
    ];
        	 
    /* Run dialog and alot data */
    const spell_choice = await quickDialog({data : es_data, title : `Spellstrike`});
		
    /* Get the strike actions and roll strike */
    const strike = weapons.find(a => a.label === spell_choice[1]);
    let spc = spells.find(sp => sp.name === spell_choice[0]);
    const spcBack = spc;
    let sbsp;
    if(standby) {
      const sbs = token.actor.itemTypes.spell.find(sb => sb.flags.pf2e.standbySpell);
      let isAttack = false;
      if (sbs.system.spellType.value === 'attack') { isAttack = true; }
      let isSave = false;
      if (sbs.system.spellType.value === "save") { isSave = true; }      
      sbsp = {name: `${sbs.name} (Standby)`, roll:``, sEId: ``, lvl: sbs.level, spId: sbs.id, slug: sbs.slug, desc: sbs.description, DC: sbs.spellcasting.statistic.dc.value, data: ``, spell: sbs, index: ``, isSave, isAttack}
      if ( sbsp.lvl > spc.lvl ) { return ui.notifications.warn(`The chosen spell level is below the base level of your standby spell ${sbsp.name}, please try again.`); }
      sbsp.lvl = spc.lvl;
      sbsp.data = sbsp.spell.getRollData({castLevel: sbsp.lvl});
      sbsp.roll = sbsp.data.item.damage?.roll;
      sbsp.sEId = spc.sEId;
      sbsp.index = spc.index;
      spc = sbsp;
    }

    let s_entry = token.actor.itemTypes.spellcastingEntry.find(e => e.id === spc.sEId);

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
      let spRD = await variant.getRollData({castLevel:spc.lvl});
      const roll = spRD.item.damage?.roll;
      // Overwrite the chosen spell's damage formula
      spc.roll = roll;
    }  

    let pers;
    let critt;
    function SSDOS(cm) {
      if (cm.user.id === game.userId && cm.isCheckRoll) { critt = cm.flags.pf2e.context.outcome; }
    }

    Hooks.once('renderChatMessage', SSDOS);

    await strike.attack({ event });

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

    if (critt === 'success') { dos = 'Success'; hit = true }
    if (critt === 'criticalSuccess') { dos = 'Critical Success'; hit = true}

    // Automated Animations insertion by MrVauxs
    if (game.modules.get("autoanimations")?.active) {
      AutomatedAnimations.playAnimation(token, spc.spell, { targets: [Array.from(game.user.targets)[0]], hitTargets: hit ? [Array.from(game.user.targets)[0]] : []})
    }
    let flavName = ` cast at Lv${spc.lvl}`;
    if (spc.spell.isCantrip) { flavName = ` (Cantrip)`; }
    if (standby) { flavName = `(Standby) cast at Lv${spc.lvl}`; }
    let flavor = `<strong>Spellstrike</strong><br>${spc.spell.link}${flavName} (${dos})<div class="tags">${ttags}</div><hr>`;
    if (spc.isSave) {
      let basic = false;
      if (spc.spell.system.save.basic === "basic") { basic = true }
      flavor += `@Check[type:${spc.spell.system.save.value}|dc:${spc.DC}|traits:damaging-effect,${spc.spell.system.traits.value.join()}|basic:${basic}]`;
    }

    /* Acid Splash */
    if(spc.slug === 'acid-splash') {
      let pers = 0;
      spc.roll = spc.spell.loadVariant({castLevel:Math.ceil(actor.level / 2)}).damage.roll;
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
      if (critt === 'criticalSuccess'){
        flavor += `<br>[[/r ${pers}[persistent,acid]]]`
      }
    }
    if(spc.slug === 'produce-flame' && critt === 'criticalSuccess') {
       pers = Math.ceil(actor.level / 2) + "d4";
      flavor += `[[/r ${pers}[persistent,fire]]]`
    }
    if(spc.slug === 'gouging-claw' && critt === 'criticalSuccess') {
      pers = Math.ceil(actor.level / 2) + "d4";
      flavor += `[[/r ${pers}[persistent,bleed]]]`
    }
    if(spc.slug === 'searing-light' || spc.slug === 'moonlight-ray'){
      if (game.user.targets.first().actor.traits.has('undead') || game.user.targets.first().actor.traits.has('fiend')) {
        flavor += `[[/r ${(spc.lvl-3)*2 + 5}d6[good]]]`
      }
    }

    if (game.modules.get('xdy-pf2e-workbench')?.active && !game.settings.get("xdy-pf2e-workbench","autoRollDamageForStrike")) { 
      if (critt === 'success') { await strike.damage({ event }); }
      if (critt === 'criticalSuccess'){ await strike.critical({ event }); }
    }
    if(!game.modules.has('xdy-pf2e-workbench') || !game.modules.get('xdy-pf2e-workbench')?.active) { 
      if (critt === 'success') { await strike.damage({ event }); }
      if (critt === 'criticalSuccess'){ await strike.critical({ event }); }
    }
    if (critt === 'success' || critt === 'criticalSuccess') {
      if (spc.roll === undefined) {
        return await s_entry.cast(spc.spell,{slot: spc.index,level: spc.lvl,message: true});
      }
      if (critt === 'criticalSuccess') {  ui.notifications.info('Spell damage will need to be doubled when applied'); }
      if ( spc.roll !== undefined) {
        await spc.roll.toMessage({ flavor: flavor, speaker: ChatMessage.getSpeaker() });
      }
    }

    if ( critt === 'failure' && !spc.isAttack) { 
      return s_entry.cast(spc.spell,{slot: spc.index,level: spc.lvl,message: true}); 
    }
      
    /* Expend slots */
    if ( spc.data.item.isCantrip ) { return; }
    if ( spell_choice[2] ) { spc = spcBack; }
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
      },{width:"auto"})._render(true);
        document.getElementById("0qd").focus();
    });
}
