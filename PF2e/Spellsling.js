/*
To use this macro, you just have to target someone and use it.
*/


Spellsling();

async function Spellsling()
{
    /* Throw warning if token is not selected*/
    if (canvas.tokens.controlled.length < 1) { return ui.notifications.warn('No token is selected.'); }
    if (canvas.tokens.controlled.length > 1) { return ui.notifications.warn('Only 1 token should be selected'); }
    if (game.user.targets.size < 1) { return ui.notifications.warn('Please target a token'); }
    if (game.user.targets.size > 1) { return ui.notifications.warn('Spellsling can only affect 1 target'); }


    for (let token of canvas.tokens.controlled) {
      /* Check for Beast Gunner dedication and warn if not present */
      if (!token.actor.itemTypes.feat.some(e => e.slug === "beast-gunner-dedication")) {
      return ui.notifications.warn('Does not have Beast Gunner Dedication.');
      }
      
      /* New Spell getter*/
      const spells = [];
      for (const e of token.actor.itemTypes.spellcastingEntry) {
        if (e.isRitual) { continue; }
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
            const roll = spRD.item.damage?.roll;
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
      const weapons = token.actor.itemTypes.weapon.filter(i => i.isEquipped && i.system.group === 'firearm');
      const map_weap = weapons.map(p => p.name);


      /* Build dialog data */
      const es_data = [
        { label : `Choose a Spell : `, type : `select`, options : spells.map(p=> p.name) },
        { label : `Beast Gun : `, type : `select`, options : map_weap },
      ]
        	
      /* Run dialog and alot data */
      const spell_choice = await quickDialog({data : es_data, title : `Spellsling`});
		
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
      let flavor = `<strong>Spellsling</strong><br>${spc.spell.link}${flavName} (${dos})<div class="tags">${ttags}</div><hr>`;
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
