Eldritch_shot();

async function Eldritch_shot()
{
  /* Throw warning if token is not selected*/
  if (token === undefined) {
    ui.notifications.warn('No token is selected.');
  }
  else {
    for (let token of canvas.tokens.controlled) {
      /* Check for eldritch archer dedication and warn if not present */
      const eldritch_archer = CheckFeat('eldritch-archer-dedication');
      if (eldritch_archer === false) {
        ui.notifications.warn('Does not have Eldritch Archer Dedication.');
      }
      else{

        //Going to rewrite this section whole soon
        let spells_items =[];
        /* Filter Spells Spontaneous, Focus, and Innate Spells*/
  let spon_entries = actor.itemTypes.spellcastingEntry.filter(item => item.isSpontaneous === true || item.isFocusPool === true || item.isInnate === true || item.isFlexible === true);
  let spon_spells=[];
  spon_entries.forEach(item => {
    item.spells.contents.forEach(spell => {
        if (spell.data.data.spellType.value !== 'attack') { return; }
        if (item.isFlexible === true && spell.isCantrip === true && Object.entries(item.data.data.slots.slot0.prepared).some(i => i[1].id === spell.id) !== true){ return; }
        spon_spells.push(spell);
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
    if(spell.isCantrip && !spells_items.includes(spell) ) {spells_items.push(spell)}
    }
    
	});
        
	/* Add Prepared spells at different levels */
  let prep_entries = actor.itemTypes.spellcastingEntry.filter(item => item.isPrepared === true && item.isFlexible === false);

  let prep_spells = [];
  prep_entries.forEach(item => {
    item.spells.contents.forEach(spell => {
        if (spell.data.data.spellType.value !== 'attack') { return; }
        prep_spells.push(spell);
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


	/* Get them bows baby */
        let weapons = token.actor.itemTypes.weapon.filter(i => i.isEquipped && i.data.data.group === 'bow');
        let map_weap = weapons.map(p => p.data.name);


        /* Build dialog data */
        let es_data = [
          { label : `Choose a Spell : `, type : `select`, options : spells.map(p=> p.name) },
          { label : `Critical Hit?`, type : `checkbox` },
          { label : `Bows : `, type : `select`, options : map_weap },
        ];

	/* Run dialog and alot data */
        let spell_choice = await quickDialog({data : es_data, title : `Eldritch Shot`});
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
	console.log(await strike.damage);
	/* Grab the specific spell chosen */
        let spellp = await spells.filter(p=> p.name === sp_choice);

        let ndspell = spellp.find(sl=>sl.slug);
  
        let location = ndspell.data.data.location.value;

        /*Spell Casting Entry chosen spell*/
        const s_entry = await token.actor.data.items.find(k => k.id === location);
       
        /* Spell Description */
        const desc_sp = ndspell.description;
      

        /* Does it do damage? */
        const dam = Object.entries(ndspell.data.data.damage.value).length;
        console.log(dam);

	/* Compendium Link for spell */
        const comp_id = ndspell.sourceId.substr(27);

        /* Expend slots */
        /* Spontaneous, Innate, and Flexible */
        if (s_entry.isSpontaneous === true || s_entry.isInnate === true || s_entry.isFlexible === true && ndspell.isCantrip === false) {
          let data = duplicate(s_entry.data);
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
            var flav0 = `<strong>Eldritch Shot</strong><br><strong>${sp_choice}</strong>`;
            }
          else { 
            var traits = ndspell.data.data.traits.value.join();
            var flav0 = `<strong>Eldritch Shot</strong><br><a class="entity-link" data-pack="pf2e.spells-srd" data-id="${comp_id}"><strong>${sp_choice}</strong></a><br><span data-pf2-saving-throw='${ndspell.data.data.save.value}' data-pf2-dc='${s_entry.data.data.spelldc.dc}' data-pf2-traits='${traits}' data-pf2-label='${ndspell.name} DC'><strong>DC ${s_entry.data.data.spelldc.dc} </strong>${ndspell.data.data.save.basic} ${ndspell.data.data.save.value} save</span>`;}
          let message = ChatMessage.applyRollMode({ flavor: flav0, content: desc_sp, speaker: ChatMessage.getSpeaker() }, game.settings.get("core", "rollMode"));
          ChatMessage.create(message);
        }
        /* Damage, oh the sweet sweet damage */
        else {
          const d_sorc = CheckFeat('dangerous-sorcery');
          var dstype = status;
          if (d_sorc && dam === 1){ var dstype = `status,${ndspell.data.data.damage.value[0].type.value}`; }
          if (d_sorc && dam > 1 ){ 
             let types = [];
             Object.entries(ndspell.data.data.damage.value).forEach( t => {
               types.push(t[1].type.value);
             });             
             var dstype = `status,${await choose(types,'Which type of damage?')}`;
          }
              
          const dd_sorc = d_sorc ? ` + {${ndspell.heightenedLevel}}[${dstype}]` : '';
          const c_sorc = d_sorc ? ` + {${ndspell.heightenedLevel * 2}}[${dstype}]` : '';
          
          let key = s_entry.ability;
          const s_mod = ndspell.data.data.damage.value[0].applyMod ? ` + ${token.actor.data.data.abilities[key].mod}` : '';
          const critmod = ndspell.data.data.damage.value[0].applyMod ? ` + ${token.actor.data.data.abilities[key].mod*2}` : ''; 
          var dtype;

          if (ndspell.slug === 'telekinetic-projectile') {
            let options = ["piercing","bludgeoning","slashing"];
            let prompt = `Which type of damage?`
            var dtype = await choose(options,prompt);
          }

          var damage,tdamage;
          var multiplier = 0;
          if (ndspell.data.data.scaling != undefined && ndspell.slug !== `acid-splash`) {
            if (ndspell.heightenedLevel > ndspell.level) { var multiplier = Math.ceil((ndspell.heightenedLevel - ndspell.level) / ndspell.data.data.scaling.interval);
            }
            if (ndspell.isCantrip === true || ndspell.isFocusSpell === true) {
              let castlevel = Math.ceil(actor.level / 2);
              var multiplier = Math.ceil((castlevel - ndspell.level) / ndspell.data.data.scaling.interval);
            }

            console.log(Object.keys(ndspell.data.data.damage.value));
		        Object.keys(ndspell.data.data.damage.value).forEach( index => {
              let ind = parseInt(index);
              console.log(ind);
		         if (ndspell.isCantrip !== true && ndspell.isFocusSpell !== true) {
			        if (ind === 0) { 
                let dicenum = multiplier * parseInt(ndspell.data.data.scaling.damage[ind].replace(/(^\d+)(.+$)/i,'$1')) + parseInt(ndspell.data.data.damage.value[ind].value.replace(/(^\d+)(.+$)/i,'$1'));
                if (ndspell.slug === 'scorching-ray') { dicenum = multiplier * (2 * parseInt(ndspell.data.data.scaling.damage[ind].replace(/(^\d+)(.+$)/i,'$1'))) + (2 * parseInt(ndspell.data.data.damage.value[ind].value.replace(/(^\d+)(.+$)/i,'$1')));}
                dtype = ndspell.data.data.damage.value[ind].type.value;
                damage = "{" + dicenum + ndspell.data.data.scaling.damage[ind].substr(1) + s_mod + "}" + `[${ndspell.data.data.damage.value[ind].type.value}]` + dd_sorc ;
                if (game.settings.get("pf2e","critRule") === 'doubledamage') { tdamage = "{" + "2*" + dicenum + ndspell.data.data.scaling.damage[ind].substr(1) + critmod + "}" + `[${ndspell.data.data.damage.value[ind].type.value}]` + c_sorc;  }
                else { tdamage = "{" + 2*dicenum + ndspell.data.data.scaling.damage[ind].substr(1) + critmod + "}" + `[${ndspell.data.data.damage.value[ind].type.value}]` + c_sorc;}
              }
		          else {
                let dicenum = multiplier * parseInt(ndspell.data.data.scaling.damage[ind].replace(/(^\d+)(.+$)/i,'$1')) + parseInt(ndspell.data.data.damage.value[ind].value.replace(/(^\d+)(.+$)/i,'$1'));
                damage = damage + "+" + "{" + dicenum + ndspell.data.data.scaling.damage[ind].substr(1) + "}" + `[${ndspell.data.data.damage.value[ind].type.value}]`;
                dtype = dtype + "+" + ndspell.data.data.damage.value[ind].type.value;
				        if (critt && game.settings.get("pf2e","critRule") === 'doubledamage') { tdamage = tdamage + "+" + "{" + "2*" + dicenum + ndspell.data.data.scaling.damage[ind].substr(1) + "}" + `[${ndspell.data.data.damage.value[ind].type.value}]`;  }
			     	    else { tdamage = tdamage + "+" + "{" + 2*dicenum + ndspell.data.data.scaling.damage[ind].substr(1) + critmod + "}" + `[${ndspell.data.data.damage.value[ind].type.value}]` + c_sorc;}
			        }
			       } 
		         else{
			        if (ind === 0) { 
                if (ndspell.slug === 'telekinetic-projectile') {
                  let dicenum = multiplier * parseInt(ndspell.data.data.scaling.damage[ind].replace(/(^\d+)(.+$)/i,'$1')) + parseInt(ndspell.data.data.damage.value[ind].value.replace(/(^\d+)(.+$)/i,'$1'));
                  damage = "{" + dicenum + ndspell.data.data.scaling.damage[ind].substr(1) + s_mod + "}" + "[" + dtype + "]";
                  if (critt && game.settings.get("pf2e","critRule") === 'doubledamage') { tdamage = "{" + "2*" + dicenum + ndspell.data.data.scaling.damage[ind].substr(1) + critmod + "}" + "[" + dtype + "]"; }
                  else { tdamage = "{" + 2*dicenum + ndspell.data.data.scaling.damage[ind].substr(1) + critmod + "}" + "[" + dtype + "]"; }
                }
                else{
                  let dicenum = multiplier * parseInt(ndspell.data.data.scaling.damage[ind].replace(/(^\d+)(.+$)/i,'$1')) + parseInt(ndspell.data.data.damage.value[ind].value.replace(/(^\d+)(.+$)/i,'$1'));
                  damage = "{" + dicenum + ndspell.data.data.scaling.damage[ind].substr(1) + s_mod + "}" + "[" + ndspell.data.data.damage.value[ind].type.value + "]";
                  dtype = ndspell.data.data.damage.value[ind].type.value;
                  if (critt && game.settings.get("pf2e","critRule") === 'doubledamage') { tdamage = "{" + "2*" + dicenum + ndspell.data.data.scaling.damage[ind].substr(1) + critmod + "}" + "[" + ndspell.data.data.damage.value[ind].type.value + "]";} 
                  else{ tdamage = "{" + 2*dicenum + ndspell.data.data.scaling.damage[ind].substr(1) + critmod + "}" + "[" + ndspell.data.data.damage.value[ind].type.value + "]";}
                }
              }
			        else {
               let dicenum = multiplier * parseInt(ndspell.data.data.scaling.damage[ind].replace(/(^\d+)(.+$)/i,'$1')) + parseInt(ndspell.data.data.damage.value[ind].value.replace(/(^\d+)(.+$)/i,'$1'));
				       damage = damage + "+" + "{" + dicenum + ndspell.data.data.scaling.damage[ind].substr(1) + "}" + "[" + ndspell.data.data.damage.value[ind].type.value + "]";
				       dtype = dtype + "+" + ndspell.data.data.damage.value[ind].type.value;
               if (critt && game.settings.get("pf2e","critRule") === 'doubledamage') { tdamage = tdamage + "+" + "{" + "2*" + dicenum + ndspell.data.data.scaling.damage[ind].substr(1) + "}" + "[" + ndspell.data.data.damage.value[ind].type.value + "]";}
               else{ tdamage = tdamage + "+" + "{" + 2*dicenum + ndspell.data.data.scaling.damage[ind].substr(1) + critmod + "}" + "[" + ndspell.data.data.damage.value[ind].type.value + "]";}
			        }
             } 
          });
        }
        console.log(damage,tdamage);
          if (ndspell.slug === 'acid-splash') {
            var dtype = 'acid'
            if (actor.level < 5) {
              var damage = `{1d6}[acid] + {1}[splash,acid]`
              if (critt && game.settings.get("pf2e","critRule") === 'doubledamage') { tdamage = `{2*1d6}[acid] + {1}[splash,acid]`;}
              else { tdamage = `{2d6}[acid] + {1}[splash,acid]`}
            }
            else if (actor.level >= 5 && actor.level < 9) {
              var damage = `{1d6${s_mod}}[acid] + {1}[splash,acid]`;
              if (critt && game.settings.get("pf2e","critRule") === 'doubledamage') { tdamage = `{2*1d6${critmod}}[acid] + {1}[splash,acid]`;}
              else { tdamage = `{2d6${critmod}}[acid] + {1}[splash,acid]`}
            }
            else if (actor.level >= 9 && actor.level < 13) {
              var damage = `{2d6${s_mod}}[acid] + {2}[splash,acid]`;
              if (critt && game.settings.get("pf2e","critRule") === 'doubledamage') { tdamage = `{2*2d6${critmod}}[acid] + {2}[splash,acid]`;}
              else { tdamage = `{4d6${critmod}}[acid] + {2}[splash,acid]`}
            }
            else if (actor.level >= 13 && actor.level < 18) {
              var damage = `{3d6${s_mod}}[acid] + {3}[splash,acid]`;
              if (critt && game.settings.get("pf2e","critRule") === 'doubledamage') { tdamage = `{2*3d6${critmod}}[acid] + {3}[splash,acid]`;} 
              else { tdamage = `{6d6${critmod}}[acid] + {3}[splash,acid]`}
            }
            else { 
              var damage = `{4d6${s_mod}}[acid] + {4}[splash,acid]`;
              if (critt && game.settings.get("pf2e","critRule") === 'doubledamage') { tdamage = `{2*4d6${critmod}}[acid] + {4}[splash,acid]`;}
              else { tdamage = `{8d6${critmod}}[acid] + {4}[splash,acid]`}
            }
            
          }

          if (ndspell.data.data.save.value !== ''){
            var flavor = `<strong>Eldritch Shot</strong><br><a class="entity-link" data-pack="pf2e.spells-srd" data-id="${comp_id}"><strong>${sp_choice}</strong></a> (Success) (${dtype} damage)<br><span data-pf2-saving-throw='${ndspell.data.data.save.value}' data-pf2-dc='${s_entry.data.data.spelldc.dc}' data-pf2-traits='${traits}, damaging-effect' data-pf2-label='${ndspell.name} DC'><strong>DC ${s_entry.data.data.spelldc.dc} </strong>${ndspell.data.data.save.basic} ${ndspell.data.data.save.value} save</span>`;
            var critt_flav = `<strong>Eldritch Shot</strong><br><a class="entity-link" data-pack="pf2e.spells-srd" data-id="${comp_id}"><strong>${sp_choice}</strong></a> (Critical Success) (${dtype} damage)<br><span data-pf2-saving-throw='${ndspell.data.data.save.value}' data-pf2-dc='${s_entry.data.data.spelldc.dc}' data-pf2-traits='${traits}, damaging-effect' data-pf2-label='${ndspell.name} DC'><strong>DC ${s_entry.data.data.spelldc.dc} </strong>${ndspell.data.data.save.basic} ${ndspell.data.data.save.value} save</span>`;
          }
        else{
        var flavor = `<strong>Eldritch Shot</strong><br><a class="entity-link" data-pack="pf2e.spells-srd" data-id="${comp_id}"><strong>${sp_choice}</strong></a> (Success) (${dtype} damage)`;
        var critt_flav = `<strong>Eldritch Shot</strong><br><a class="entity-link" data-pack="pf2e.spells-srd" data-id="${comp_id}"><strong>${sp_choice}</strong></a> (Critical Success) (${dtype} damage)`;
        }

          if (critt){
            var droll = new Roll(tdamage);
            console.log(droll);
            droll.toMessage({ flavor: critt_flav, speaker: ChatMessage.getSpeaker() });   
          }
          else {
            var droll = new Roll(damage);
            console.log(droll);
            droll.toMessage({ flavor: flavor, speaker: ChatMessage.getSpeaker() });
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
          buttons : { OK : {label : `OK`, callback : async (html) => { resolve(html.find('#choice').val()); } } },
          default : 'OK'
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
        },
        default : 'Ok'
        })._render(true);
        document.getElementById("0qd").focus();
      });
    }
  }
 }
}
