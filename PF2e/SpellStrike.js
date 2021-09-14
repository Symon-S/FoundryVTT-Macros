Spellstrike();

async function Spellstrike()
{
  /* Throw warning if token is not selected*/
  if (token === undefined) {
    ui.notifications.warn('No token is selected.');
  }
  else {
    for (let token of canvas.tokens.controlled) {
      /* Check for spellstrike and warn if not present */
      const spellstrike = CheckFeat('spellstrike');
      if (spellstrike === false) {
        ui.notifications.warn('Does not have Spellstrike.');
      }
      else{
  	let spells_items =[];
        /* Filter Spells Spontaneous, Flexible, Focus, and Innate Spells*/
  	let spon_entries = actor.itemTypes.spellcastingEntry.filter(item => item.isSpontaneous === true || item.isFocusPool === true || item.isInnate === true || item.isFlexible === true);
  	let spon_spells=[];
  	spon_entries.forEach(item => {
    	item.spells.contents.forEach(spell => {
      	if (CheckFeat('expansive-spellstrike') === true) {
        if (spell.data.data.spellType.value === 'utility' || spell.data.data.spellType.value === 'healing') { return; }
        if (item.isFlexible === true && spell.isCantrip === true && Object.entries(item.data.data.slots.slot0.prepared).some(i => i[1].id === spell.id) !== true){ return; }
        spon_spells.push(spell);
      }
      else { 
        if (spell.data.data.spellType.value !== 'attack') { return; }
        if (item.isFlexible === true && spell.isCantrip === true && Object.entries(item.data.data.slots.slot0.prepared).some(i => i[1].id === spell.id) !== true){ return; }
        spon_spells.push(spell);
      }
    })
  })
	/* Add list of signature spells if available */
  let signatureSpellIds = [];
  spon_spells.forEach(item => {
    signatureSpellIds = signatureSpellIds.concat(item.spellcasting.data.data.signatureSpells.value);
  });
         
  spon_spells.forEach(spell => {
            if (signatureSpellIds.includes(spell.id)) {
	      const baseLevel = spell.level; 
              let highestSpellSlot = [];
              Object.entries(spell.spellcasting.data.data.slots).forEach(slot => {
               if (slot[1].max <= 0 || slot[1].value <=0) return;
               highestSpellSlot.push(slot[0].substr(4));
              })
	      highestSpellSlot.forEach(level => {
		if (parseInt(level) > baseLevel) {
			let heightenedSpell = Object.create(Object.getPrototypeOf(spell));
                    	Object.defineProperty(heightenedSpell, 'data', {
                        	value: duplicate(spell),
                        	configurable: true,
                        	writable: true
                    	});
                    heightenedSpell.data.data.heightenedLevel = {value:parseInt(level)};
                    heightenedSpell.data.name = `${heightenedSpell.data.name} LV ${level}`;
                    heightenedSpell.data.isCantrip = false;
                    spells_items.push(heightenedSpell);
	      }
	    })
    }
    if(spell.level === spell.heightenedLevel) {
      Object.entries(spell.spellcasting.data.data.slots).forEach(slot => {
               if (slot[1].value > 0 && parseInt(slot[0].substr(4)) === spell.level) { spells_items.push(spell)}
              })
    }
	});
        
	/* Add Prepared spells at different levels */
  let prep_entries = actor.itemTypes.spellcastingEntry.filter(item => item.isPrepared === true && item.isFlexible === false);

  let prep_spells = [];
  prep_entries.forEach(item => {
    item.spells.contents.forEach(spell => {
      if (CheckFeat('expansive-spellstrike') === true) {
        if (spell.data.data.spellType.value === 'utility') { return; }
        prep_spells.push(spell);
      }
      else { 
        if (spell.data.data.spellType.value !== 'attack') { return; }
        prep_spells.push(spell);
      }
    })
  })

	let slottedSpells = [];
	prep_entries.forEach(item => {
         Object.entries(item.data.data.slots).forEach(slot => {
		if (slot[1].max <= 0) return;
		let slots = parseInt(slot[0].substr(4));
		Object.entries(slot[1].prepared).forEach(id => {
                        
			if(id[1].expended === true) return;
                        slottedSpells.push( {id: id[1].id, level: slots } );
		});
	 });
	});

	prep_spells.forEach(spell => {
		let baseLevel = spell.level;
		let ids = spell.id;
		slottedSpells.forEach(id => {
			if (id.id === ids) {
				if (spell.isCantrip === true || baseLevel === id.level) { spells_items.push(spell) }
        else{
					let heightenedSpell = Object.create(Object.getPrototypeOf(spell));
                    			Object.defineProperty(heightenedSpell, 'data', {
                        			value: duplicate(spell),
                        			configurable: true,
                        			writable: true
                    			});
                    			heightenedSpell.data.data.heightenedLevel = {value:id.level};
                    			heightenedSpell.data.name = `${heightenedSpell.data.name} LV ${id.level}`;
                    			heightenedSpell.data.isCantrip = false;
                    			spells_items.push(heightenedSpell);
        }

			}
			 
		})
		


	})
	
        /* Sort spells by level and name */
        let spells = sortSpellsByLevel(spells_items);

	/* Get them weapons baby */
	var weapons = [];
	if (CheckFeat('starlit-span') === true) {  var weapons = actor.data.data.actions.filter(i => i.type === "strike"); }
	else { 
	 var weapons = actor.itemTypes.weapon.filter(i => i.isRanged !== true);
	 let melee = weapons;
	 let names = [];
	 melee.forEach(a => { names.push(a.name); });
	 let ranged = actor.itemTypes.weapon.filter(i => i.isRanged === true);
	 ranged.forEach(r => { names.push(r.name); });
	 actor.data.data.actions.forEach(gus => {
	  if ( names.includes(gus.name) ) return;
	  let traits = [];
	  if ( !names.includes(gus.name) ) {
	  Object.entries(gus.traits).forEach(t => { traits.push(t[1].name); });
	  if ( traits.includes('unarmed') && !traits.includes('ranged') ) weapons.push(gus); 
	  }
	 })
	}

	const map_weap = weapons.map(p => p.name);
        /* Build dialog data */
        let es_data = [
          { label : `Choose a Spell : `, type : `select`, options : spells.map(p=> p.name) },
          { label : `Critical Hit?`, type : `checkbox` },
          { label : `Weapons : `, type : `select`, options : map_weap },
        ];

	/* Run dialog and alot data */
        let spell_choice = await quickDialog({data : es_data, title : `Spellstrike`});
        const sp_choice = spell_choice[0];
        let critt = spell_choice[1];
        let wp_choice = spell_choice[2];

	/* Get the strike actions and roll strike */
        let strike = token.actor.data.data.actions.find(a => a.type === 'strike' && a.name === wp_choice);
        if (critt === true) {
          strike.critical({ event });
        }
        else {
          strike.damage({ event });
        }
	
	/* Grab the specific spell chosen */
        let spellp = await spells.filter(p=> p.name === sp_choice);
        let ndspell = spellp.find(sl=>sl.slug);
        let location = ndspell.data.data.location.value;
       
        
/* Spell entry */
        const s_entry = await token.actor.data.items.find(k => k.id == location);


        /* Spell Description */
        const desc_sp = ndspell.description;
       

        /* Does it do damage? */
        const dam = ndspell.damage.length;

	      /* Compendium Link for spell */
        const comp_id = ndspell.sourceId.substr(27);
      
        
         
        /* Expend slots */
        /* Spontaneous, Innate, and Flexible */
        if (s_entry.isSpontaneous === true || s_entry.isInnate === true || s_entry.isFlexible === true && ndspell.isCantrip === false) {
          let data = duplicate(s_entry.data);
          if (ndspell.isCantrip === true) return;
          Object.entries(data.data.slots).forEach(slot => {
            if (parseInt(slot[0].substr(4)) === ndspell.heightenedLevel && slot[1].value > 0) { 
              slot[1].value-=1;
              s_entry.update(data);
            }
          })
        }
        
        /* Focus */
        if (s_entry.isFocusPool === true && ndspell.isCantrip === false && actor.data.data.resources.focus.value > 0) {
         const currentpoints = actor.data.data.resources.focus.value-1;
         actor.update({"data.resources.focus.value":currentpoints});
        }
      
        /* Prepared */
        if (s_entry.isPrepared === true && s_entry.isFlexible === false && ndspell.isCantrip === false) {
          if (ndspell.isCantrip === true) return;
          let data = duplicate(s_entry.data);
          Object.entries(data.data.slots).forEach(slot => {
            if (parseInt(slot[0].substr(4)) === ndspell.heightenedLevel) {
              let entry = Object.entries(slot[1].prepared).find(id => id[1].id === ndspell.id && id[1].expended !== true);
              let index = parseInt(entry[0]);
              slot[1].prepared[index].expended = true;
              s_entry.update(data);
            }
          })
        }
        

	      /* Create chat message if it is not a damage spell */
        if (dam === 0) {
          if (ndspell.data.data.save.value === '' || ndspell.data.data.save.value === null || ndspell.data.data.save.value === undefined) {
          var flav0 = `<strong>Spellstrike</strong><br><strong>${sp_choice}</strong>`;
          }
          else { 
var traits = ndspell.data.data.traits.value.join();
var flav0 = `<strong>Spellstrike</strong><br><a class="entity-link" data-pack="pf2e.spells-srd" data-id="${comp_id}"><strong>${sp_choice}</strong></a><br><span data-pf2-saving-throw='${ndspell.data.data.save.value}' data-pf2-dc='${s_entry.data.data.dc.value}' data-pf2-traits='${traits}' data-pf2-label='${ndspell.name} DC'><strong>DC ${s_entry.data.data.dc.value} </strong>${ndspell.data.data.save.basic} ${ndspell.data.data.save.value} save</span>`;}
          let message = ChatMessage.applyRollMode({ flavor: flav0, content: desc_sp, speaker: ChatMessage.getSpeaker() }, game.settings.get("core", "rollMode"));
          ChatMessage.create(message);
        }
        /* Damage, oh the sweet sweet damage */
        else { 
          var multiplier = 0;
          if (ndspell.data.data.scaling != undefined && ndspell.slug !== `acid-splash`) {
            if (ndspell.heightenedLevel > ndspell.level) { var multiplier = Math.ceil((ndspell.heightenedLevel - ndspell.level) / ndspell.data.data.scaling.interval);
            }
            if (ndspell.isCantrip === true || ndspell.isFocusSpell === true) {
              let castlevel = Math.ceil(actor.level / 2);
              var multiplier = Math.ceil((castlevel - ndspell.level) / ndspell.data.data.scaling.interval);
            }

		        for (let [index] of ndspell.damage.entries())
		        if (ndspell.heightenedLevel === ndspell.level && ndspell.isCantrip !==true && ndspell.isFocusSpell !== true) {
			        if (index === 0) { var damage = ndspell.damage[index].value; var dtype = ndspell.damage[index].type.value; }
		     	    else {
				        var damage = damage + "+" + ndspell.damage[index].value;
			     	    var dtype = dtype + "+" + ndspell.damage[index].type.value;
			        }
			     
		        } 
		        else{
			        if (index === 0) { var damage = ndspell.damage[index].value + "+" + multiplier * ndspell.data.data.scaling.damage[index].substr(0,1) + ndspell.data.data.scaling.damage[index].substr(1); var dtype = ndspell.damage[index].type.value; }
			        else {
				        var damage = damage + "+" + ndspell.damage[index].value + "+" + multiplier * ndspell.data.data.scaling.damage[index].substr(0,1) + ndspell.data.data.scaling.damage[index].substr(1);
				        var dtype = dtype + "+" + ndspell.damage[index].type.value;
			        }
		        }
          }
          var traits = ndspell.data.data.traits.value.join();
          const d_sorc = CheckFeat('dangerous-sorcery');
          const dd_sorc = d_sorc ? `+ ${ndspell.heightenedLevel}` : '';
          let key = s_entry.ability;
          const s_mod = ndspell.damage[0].applyMod ? token.actor.data.data.abilities[key].mod : 0;
          let critmod = s_mod * 2;
          if (ndspell.slug === 'telekinetic-projectile') {
            let options = ["piercing","bludgeoning","slashing"];
            let prompt = `Which type of damage?`
            var dtype = await choose(options,prompt);
            var traits = traits + "," + dtype;
          }

           
          if (ndspell.data.data.spellType.value === 'save') {
            var flavor = `<strong>Spellstrike</strong><br><a class="entity-link" data-pack="pf2e.spells-srd" data-id="${comp_id}"><strong>${sp_choice}</strong></a> (${dtype} damage)<br><span data-pf2-saving-throw='${ndspell.data.data.save.value}' data-pf2-dc='${s_entry.data.data.dc.value}' data-pf2-traits='${traits}' data-pf2-label='${ndspell.name} DC'><strong>DC ${s_entry.data.data.dc.value} </strong>${ndspell.data.data.save.basic} ${ndspell.data.data.save.value} save</span>`;
            var critt_flav = flavor;
          }
          else{
            var flavor = `<strong>Spellstrike</strong><br><a class="entity-link" data-pack="pf2e.spells-srd" data-id="${comp_id}"><strong>${sp_choice}</strong></a> (Success) (${dtype} damage)`;
            var critt_flav = `<strong>Spellstrike</strong><br><a class="entity-link" data-pack="pf2e.spells-srd" data-id="${comp_id}"><strong>${sp_choice}</strong></a> (Critical Success) (${dtype} damage)`;
          }

          if (ndspell.isCantrip === false) { 
            if (critt === true && game.settings.get("pf2e","critRule") === 'doubledice' && ndspell.data.data.spellType.value !== 'save') { 
               let tdamage = ndspell.damage[0].applyMod ? `damage + critmod ${dd_sorc}` : `${damage} ${dd_sorc}`;
               const droll = new Roll(tdamage).alter(2, 0, {multiplyNumeric: true});
               droll.toMessage({ flavor: critt_flav, speaker: ChatMessage.getSpeaker() }); 
            
            }
            

            else if (critt === true && game.settings.get("pf2e","critRule") === 'doubledamage' && ndspell.data.data.spellType.value !== 'save') { let tdamage = ndspell.damage[0].applyMod ? `2 * (${damage} + ${s_mod} ${dd_sorc})` : `2 * (${damage} ${dd_sorc})`;
                       const droll = new Roll(tdamage);
                       droll.toMessage({ flavor: critt_flav, speaker: ChatMessage.getSpeaker() });
            }

            else{ let tdamage = ndspell.damage[0].applyMod ? damage + "+" + s_mod + dd_sorc : damage + dd_sorc; 
               const droll = new Roll(tdamage);
               droll.toMessage({ flavor: flavor, speaker: ChatMessage.getSpeaker() });        
            }
          }

          else {
            if (critt === true && game.settings.get("pf2e","critRule") === 'doubledice' && ndspell.data.data.spellType.value !== 'save' ) { 
              if (ndspell.slug === 'acid-splash') {
                if ( actor.level < 5 ) {
                let tdamage = `1d6 + 1`;
                const droll = new Roll(tdamage).alter(2);
                droll.toMessage({ flavor: critt_flav, speaker: ChatMessage.getSpeaker() });
                }
                else if (actor.level >= 5 && actor.level < 9 ) {
                  let tdamage = `1d6 + ${critmod} + 1`;
                  const droll = new Roll(tdamage).alter(2);
                  droll.toMessage({ flavor: critt_flav, speaker: ChatMessage.getSpeaker() });
                }
                else if (actor.level >= 9 && actor.level < 13 ) {
                  let tdamage = `2d6 + ${critmod} + 2`;
                  const droll = new Roll(tdamage).alter(2);
                  droll.toMessage({ flavor: critt_flav, speaker: ChatMessage.getSpeaker() });
                }
                else if (actor.level >= 13 && actor.level < 17 ) {
                  let tdamage = `3d6 + ${critmod} + 3`;
                  const droll = new Roll(tdamage).alter(2);
                  droll.toMessage({ flavor: critt_flav, speaker: ChatMessage.getSpeaker() });
                }
                else {
                  let tdamage = `2d6 + ${critmod} + 2`;
                  const droll = new Roll(tdamage).alter(2);
                  droll.toMessage({ flavor: critt_flav, speaker: ChatMessage.getSpeaker() });
                }  
              }
              else{  
              let tdamage = ndspell.damage[0].applyMod ? damage + "+" + critmod : damage; 
              const droll = new Roll(tdamage).alter(2);
              droll.toMessage({ flavor: critt_flav, speaker: ChatMessage.getSpeaker() });
              }
            }
            else if (critt === true && game.settings.get("pf2e","critRule") === 'doubledamage' && ndspell.data.data.spellType.value !== 'save') {
              if (ndspell.slug === 'acid-splash') {
                if (actor.level < 5 ) {
                let tdamage = `2*(1d6) + 1`;
                const droll = new Roll(tdamage);
                droll.toMessage({ flavor: critt_flav, speaker: ChatMessage.getSpeaker() });
                }
                else if (actor.level >= 5 && actor.level < 9 ) {
                  let tdamage = `2*(1d6 + ${s_mod}) + 1`; 
                  const droll = new Roll(tdamage);
                  droll.toMessage({ flavor: critt_flav, speaker: ChatMessage.getSpeaker() });
                }
                else if (actor.level >= 9 && actor.level < 13 ) {
                  let tdamage = `2*(2d6 + ${s_mod}) + 2`;
                  const droll = new Roll(tdamage);
                  droll.toMessage({ flavor: critt_flav, speaker: ChatMessage.getSpeaker() });
                }
                else if (actor.level >= 13 && actor.level < 17 ) {
                  let tdamage = `2*(3d6 + ${s_mod}) + 3`;
                  const droll = new Roll(tdamage);
                  droll.toMessage({ flavor: critt_flav, speaker: ChatMessage.getSpeaker() });
                }
                else {
                  let tdamage = `2*(4d6 + ${s_mod}) + 4`
                  const droll = new Roll(tdamage);
                  droll.toMessage({ flavor: critt_flav, speaker: ChatMessage.getSpeaker() });
                }  
              }
              else{
              let tdamage = ndspell.damage[0].applyMod ? 2 + "*" + "(" + damage + "+" + s_mod + ")" : 2 + "*" + "(" + damage + ")"; 
              const droll = new Roll(tdamage);
              droll.toMessage({ flavor: critt_flav, speaker: ChatMessage.getSpeaker() });
              }
            }
            else{ 
              if (ndspell.slug === 'acid-splash') {
                if (actor.level < 5 ) {
                let tdamage = `1d6 + 1`;
                const droll = new Roll(tdamage);
                droll.toMessage({ flavor: flavor, speaker: ChatMessage.getSpeaker() });
                }
                else if (actor.level >= 5 && actor.level < 9 ) {
                  let tdamage = `1d6 + ${s_mod} + 1`;
                  const droll = new Roll(tdamage);
                  droll.toMessage({ flavor: flavor, speaker: ChatMessage.getSpeaker() });
                }
                else if (actor.level >= 9 && actor.level < 13 ) {
                  let tdamage = `2d6 + ${s_mod} + 2`;
                  const droll = new Roll(tdamage);
                  droll.toMessage({ flavor: flavor, speaker: ChatMessage.getSpeaker() });
                }
                else if (actor.level >= 13 && actor.level < 17 ) {
                  let tdamage = `3d6 + ${s_mod} + 3`;
                  const droll = new Roll(tdamage);
                  droll.toMessage({ flavor: flavor, speaker: ChatMessage.getSpeaker() });
                }
                else {
                  let tdamage = `4d6 + ${s_mod} + 4`;
                  const droll = new Roll(tdamage);
                  droll.toMessage({ flavor: flavor, speaker: ChatMessage.getSpeaker() });
                }  
              }
              else{
              let tdamage = ndspell.damage[0].applyMod ? damage + "+" + s_mod : damage;
              const droll = new Roll(tdamage);
              droll.toMessage({ flavor: flavor, speaker: ChatMessage.getSpeaker() });
              }
            }
          }
        }
      }
    }

    async function choose(options = [], prompt = ``)
    {
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
        }).render(true);
      });
    } 

    /* Check for specific feats */
    function CheckFeat(slug) {
      if (actor.itemTypes.feat.find((i) => i.slug === slug)) {
        return true;
      }
      return false;
    }


    function sortSpellsByLevel(spells) {
    let result = Object.values(spells);

    result.sort((a, b) => {
      if (getSpellLevel(a) === getSpellLevel(b))
        return a.name
          .toUpperCase()
          .localeCompare(b.name.toUpperCase(), undefined, {
            sensitivity: "base",
          });
      return getSpellLevel(a) - getSpellLevel(b);
    });

    return result;
  }

    
    function getSpellLevel(spellItem) {
    if (spellItem.isCantrip) {
      return 0;
    }
    return !!spellItem.heightenedLevel
      ? parseInt(spellItem.heightenedLevel)
      : parseInt(spellItem.level);
    }

    /* Dialog box */
    async function quickDialog({data, title = `Quick Dialog`} = {}) {
      data = data instanceof Array ? data : [data];

      return await new Promise(async (resolve) => {
        let content = `
          <table style="width:100%">
          ${data.map(({type, label, options}, i)=> {
          if(type.toLowerCase() === `select`)
          {
            return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><select id="${i}qd">${options.map((e,i)=> `<option value="${e}">${e}</option>`).join(``)}</td></tr>`;
          }else if(type.toLowerCase() === `checkbox`){
            return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" id="${i}qd" ${options || ``}/></td></tr>`;
          }else{
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
               if(type.toLowerCase() === `select`)
               {
                 return html.find(`select#${i}qd`).val();
               }else{
                 switch(type.toLowerCase())
                 {
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
        }
        })._render(true);
        document.getElementById("0qd").focus();
      });
    }
  }
}
