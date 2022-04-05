/*
This is complete rewrite of the Eldritch Shot macro.
To use this macro, you just have to target someone and use it.
It will automatically roll damage based on degree of success.
At the moment critical hits will only double dice if that setting is applied.
I may integrate double damage again in the future, for now, just apply damage with the double button when applying.
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
      
      /* New Spell getter*/
      const spells = [];
      token.actor.itemTypes.spellcastingEntry.forEach( e => {
        if (e.isRitual) { return; }
			  const spellData = e.getSpellData();
			  spellData.levels.forEach(sp => {
          if(!e.isPrepared && !e.isFlexible && !e.isInnate && !e.isFocusPool && !sp.isCantrip && sp.uses.value < 1) { return; }
				  sp.active.forEach((spa,index) => {
					  if(spa === null) { return; }
					  if(!spa.chatData.isAttack) { return; }
            if(spa.expended) { return; }
            if(spellData.isFocusPool && !spa.spell.isCantrip && token.actor.data.data.resources.focus.value === 0){ return; }
            let level = `lv${sp.level}`
            const name = spa.spell.name;
            const spRD = spa.spell.getRollData({spellLvl: sp.level});
            const formula = spa.spell.getDamageFormula(sp.level, spRD);
            if(sp.isCantrip) { level = `[Cantrip]`}
				    const sname = `${name} ${level} (${e.name})`;
            spells.push({name: sname, formula:formula, sEId: spellData.id, lvl: sp.level, spId: spa.spell.id, slug: spa.spell.slug, desc: spa.spell.description, DC: e.data.data.statisticData.dc.value, data: spRD, spell: spa, index: index, isSave: spa.chatData.isSave, cId: spa.spell.sourceId.substr(27)});
					});
				});
		  });
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
      const weapons = token.actor.itemTypes.weapon.filter(i => i.isEquipped && i.data.data.group === 'bow');
      const map_weap = weapons.map(p => p.data.name);


      /* Build dialog data */
      const es_data = [
        { label : `Choose a Spell : `, type : `select`, options : spells.map(p=> p.name) },
        { label : `Bows : `, type : `select`, options : map_weap },
      ]
        	
		  /* Run dialog and alot data */
		  const spell_choice = await quickDialog({data : es_data, title : `Eldritch Shot`});
		
		  /* Get the strike actions and roll strike */
		  const strike = token.actor.data.data.actions.find(a => a.type === 'strike' && a.name === spell_choice[1]);
      const spc = spells.find(sp => sp.name === spell_choice[0]);
      const s_entry = token.actor.itemTypes.spellcastingEntry.find(e => e.id === spc.sEId);
      let pers;
      const key = s_entry.ability;
      const s_mod = ` + ${token.actor.data.data.abilities[key].mod}`
      const c_mod = ` + ${token.actor.data.data.abilities[key].mod *2}`

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
      if (token.actor.itemTypes.feat.some(s => s.slug === 'dangerous-sorcery') && spc.slug !== 'magnetic-acceleration' && Object.entries(spc.data.item.data.data.damage.value).length !== 0 && !spc.data.item.isCantrip) {
        spc.formula = spc.formula + `[${spc.data.item.data.data.damage.value[0].type.value}]`;
      }
      const fsplit = spc.formula.split(" ");
      let ddam,ddice = '';
      fsplit.forEach(f => {
        if (f.match((/\d+\.\d+|\d+\b|\d+(?=\w)/g) || []) === null ) { return ddice = ddice + f; }
        const double = `${parseInt(f.match((/\d+\.\d+|\d+\b|\d+(?=\w)/g) || [])[0]) * 2}`;
        ddice = ddice + f.replace(f.match((/\d+\.\d+|\d+\b|\d+(?=\w)/g) || [])[0], double)
      });

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


      await strike.attack({ event });
      const critt = game.messages.contents.reverse().find(x => x.isCheckRoll && x.actor === token.actor).data.flags.pf2e.context.outcome;
      let traits = spc.data.item.data.data.traits.value.join();
      let ttags = '';
      spc.data.item.data.data.traits.value.forEach( t => {
      ttags = ttags + `<span class="tag tooltipstered" data-trait="${t}" data-description="PF2E.TraitDescription${t[0].toUpperCase() + t.substring(1)}">${t[0].toUpperCase() + t.substring(1)}</span>`
      });
      let dos;
      if (critt === 'success') { dos = 'Success' }
      if (critt === 'criticalSuccess') { dos = 'Critical Success' }
      if (spc.data.item.data.data.damage.value !== '' || spc.data.item.data.data.damage.value !== undefined || Object.entries(spc.spell.chatData.damage.value).length > 0){ traits = traits + `,damaging-effect`; }
      let flavName = `${spc.data.item.name} cast at Lv${spc.lvl}`;
      if (spc.data.item.isCantrip) { flavName = `${spc.data.item.name} (Cantrip)`; }
      let flavor = `<strong>Eldritch Shot</strong><br><a class="entity-link content-link" data-pack="pf2e.spells-srd" data-id="${spc.cId}"><strong>${flavName}</strong></a> (${dos})<div class="tags">${ttags}</div><hr>`;
      if (spc.slug === 'acid-splash') { flavor = `<strong>Eldritch Shot</strong><br><a class="entity-link content-link" data-pack="pf2e.spells-srd" data-id="${spc.cId}"><strong>${spc.data.item.name} (Cantrip)</strong></a> (${dos})<div class="tags">${ttags}</div>` }
      if (spc.isSave) {
        flavor = flavor + `<span data-pf2-check='${spc.data.item.data.data.save.value}' data-pf2-dc='${spc.DC}' data-pf2-traits='${traits}' data-pf2-label='${spc.data.item.name} DC'><strong>DC ${spc.DC} </strong>${spc.data.item.data.data.save.basic} ${spc.data.item.data.data.save.value} save</span>`;
      }

      if(spc.slug === 'acid-splash' && critt === 'criticalSuccess') {
        flavor = flavor + `<hr><a class="inline-roll roll persistent-link" title="{${pers}}[persistent,acid]" data-mode="roll" data-flavor="" data-formula="{${pers}}[persistent,acid]" draggable="true" data-value="${pers}" data-damage-type="acid" ondragstart="PF2EPersistentDamage._startDrag(event)">Persistent Damage [Acid ${pers}]</a>`
      }
      if(spc.slug === 'produce-flame' && critt === 'criticalSuccess') {
        pers = Math.ceil(actor.level / 2) + "d4";
        flavor = flavor + `<br><a class="inline-roll roll persistent-link" title="{${pers}}[persistent,fire]" data-mode="roll" data-flavor="" data-formula="{${pers}}[persistent,fire]" draggable="true" data-value="${pers}" data-damage-type="fire" ondragstart="PF2EPersistentDamage._startDrag(event)">Persistent Damage [Fire ${pers}]</a>`
      }
      if(spc.slug === 'gouging-claw' && critt === 'criticalSuccess') {
        pers = Math.ceil(actor.level / 2) + "d4";
        flavor = flavor + `<br><a class="inline-roll roll persistent-link" title="{${pers}}[persistent,bleed]" data-mode="roll" data-flavor="" data-formula="{${pers}}[persistent,bleed]" draggable="true" data-value="${pers}" data-damage-type="bleed" ondragstart="PF2EPersistentDamage._startDrag(event)">Persistent Damage [Bleed ${pers}]</a>`
      }

      if (game.modules.has('xdy-pf2e-workbench')) {
       if (game.modules.get('xdy-pf2e-workbench').active && !game.settings.get("xdy-pf2e-workbench","autoRollDamageForStrike")) { 
        if (critt === 'success') { await strike.damage({ event }); }
        if (critt === 'criticalSuccess'){ await strike.critical({ event }); }
       }
      }
      if(!game.modules.has('xdy-pf2e-workbench')) { 
        if (critt === 'success') { await strike.damage({ event }); }
        if (critt === 'criticalSuccess'){ await strike.critical({ event }); }
      }
      if (critt === 'success' || critt === 'criticalSuccess') {
        if (spc.data.item.data.data.damage.value === '' || spc.data.item.data.data.damage.value === undefined || Object.entries(spc.spell.chatData.damage.value).length === 0 || !spc.spell.chatData.isAttack){
          if (spc.spell.spell.data.data.heightenedLevel === undefined) { spc.spell.spell.data.data.heightenedLevel = {value: spc.lvl}; }
          else {spc.spell.spell.data.data.heightenedLevel.value = spc.lvl;}
          await spc.spell.spell.toMessage();
        }
        if (critt === 'criticalSuccess' && (game.settings.get("pf2e","critRule") === 'doubledice')) { spc.formula = ddice; } 
        if (critt === 'criticalSuccess' && (game.settings.get("pf2e","critRule") === 'doubledamage')) {  ui.notifications.info('Spell damage will need to be doubled when applied'); }
         if ( Object.entries(spc.spell.chatData.damage.value).length > 0 ){
          const droll = new Roll(spc.formula);
          await droll.toMessage({ flavor: flavor, speaker: ChatMessage.getSpeaker() });
        }
        if ( spc.slug === 'acid-splash' ) {
         const sroll = new Roll(splash);
         await sroll.toMessage({flavor: `<strong>${spc.data.item.name} Splash Damage</strong><div class="tags">${ttags}</div><hr>`, speaker: ChatMessage.getSpeaker() });
        }
      }
      /* Expend slots */
			if ( spc.data.item.isCantrip ) { return; }
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
      })._render(true);
        document.getElementById("0qd").focus();
    });
}
