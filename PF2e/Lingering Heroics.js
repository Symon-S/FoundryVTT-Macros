if (!actor || token.actor.type !== 'character') {
	ui.notifications.warn("You must have a PC token selected"); return;}
if (token.actor.itemTypes.feat.find(lc => lc.slug === "lingering-composition") === undefined) { ui.notifications.warn("The actor does not possess the Lingering Composition feat"); return; }
if (actor.data.data.resources.focus.value === 0 || actor.data.data.resources.focus.value === undefined) { ui.notifications.warn("You have no focus points"); return; }
      else {
	const skillName = "Performance";
	const skillKey = "prf";
	var actionSlug = "lingering-composition"
	var actionName = "Lingering Composition"
      
	const modifiers = []
	// list custom modifiers for a single roll here
	//const modifiers = [
	//new game.pf2e.Modifier('Expanded Healer\'s Tools', 1, 'item')
	//];
      
      let cantrips = token.actor.itemTypes.spell.filter(s=> s.isFocusSpell === true && s.isCantrip === true && s.data.data.traits.value.includes('composition') && s.data.data.duration.value === '1 round');
      
      
      let label;
      if (cantrips.find(f => f.slug === 'dirge-of-doom') != undefined) { label = `Choose a Spell : <br>(Target all affected enemies for Dirge of Doom)` }
      else { label = `Choose a Spell : ` }
      
      let lc_data = [
	{ label: label, type: `select`, options: cantrips.map(p=> p.name) },
	{ label: `Custom DC : `, type: `number` }
      ];
      
      if (token.actor.itemTypes.spell.some(s => s.data.data.slug === 'inspire-heroics')) { lc_data.push( { label: `Inspire Heroics (Defense or Courage Only) : `, type: `checkbox` } ) }     

      const choice = await quickDialog({data: lc_data, title: `Lingering Composition`});
      
      const cast_spell = token.actor.itemTypes.spell.find(n => n.name === choice[0]);
      
      const com_id = cast_spell.sourceId.substr(27);
      let effectcom = game.packs.find(sp => sp.collection === "pf2e.spell-effects");
      
      let effects = await effectcom.getDocuments();
      
      let effect = effects.find(e => e.data.name.includes(choice[0]));
      
      const notes = [...token.actor.data.data.skills[skillKey].notes];
      
      if (choice[2] === true) {
       if ( choice[0] === 'Inspire Courage' || choice[0] === 'Inspire Defense') {  
         var actionSlug = "inspire-heroics";
         var actionName = "Inspire Heroics";
         let ihc = effects.find(e => e.data.name.includes(`${choice[0].substr(8)}, +3`));
         let ihs = effects.find(e => e.data.name.includes(`${choice[0].substr(8)}, +2`));
         notes.push({"outcome":["success"], "selector":"performance", "text":`<p><a class="entity-link" draggable="true" data-pack="pf2e.spell-effects" data-id="${ihs.id}">${ihs.name}</a></p>`});
         notes.push({"outcome":["criticalSuccess"], "selector":"performance", "text":`<p><a class="entity-link" draggable="true" data-pack="pf2e.spell-effects" data-id="${ihc.id}">${ihc.name}</a></p>`});
         notes.push({"outcome":["failure"], "selector":"performance", "text":`<p><a class="entity-link" draggable="true" data-pack="pf2e.spell-effects" data-id="${effect.id}">${effect.name}</a> You don't spend the Focus Point for casting the spell</p>`});
       }
      else { ui.notifications.warn('Inspire Heroics is only applicable to Inspire Courage or Defense'); return; }
      }
      else if (effect != undefined) {
 notes.push({"outcome":["success"], "selector":"performance", "text":`<p><a class="entity-link" draggable="true" data-pack="pf2e.spell-effects" data-id="${effect.id}">${effect.name}</a> lasts 3 rounds</p>`});
         notes.push({"outcome":["criticalSuccess"], "selector":"performance", "text":`<p><a class="entity-link" draggable="true" data-pack="pf2e.spell-effects" data-id="${effect.id}">${effect.name}</a> lasts 4 rounds</p>`});
         notes.push({"outcome":["failure"], "selector":"performance", "text":`<p><a class="entity-link" draggable="true" data-pack="pf2e.spell-effects" data-id="${effect.id}">${effect.name}</a> lasts 1 round, but you don't spend the Focus Point for casting the spell</p>`});
       }
      else{
        notes.push({"outcome":["success"], "selector":"performance", "text":`<p><a class="entity-link" data-pack="pf2e.spells-srd" data-id="${com_id}">${choice[0]}</a> lasts 3 rounds</p>`});
        notes.push({"outcome":["criticalSuccess"], "selector":"performance", "text":`<p><a class="entity-link" data-pack="pf2e.spells-srd" data-id="${com_id}">${choice[0]}</a> lasts 4 rounds</p>`});
        notes.push({"outcome":["failure"], "selector":"performance", "text":`<p><a class="entity-link" data-pack="pf2e.spells-srd" data-id="${com_id}">${choice[0]}</a> lasts 1 round, but you don't spend the Focus Point for casting the spell</p>`});
      }
 // add more notes if necessary
	  // Syntax for a note: {"outcome":["success"], "selector":"performance", "text":'<p><a class="entity-link" draggable="true" data-entity="Item" data-id="TSxkmgfLWwNQnAnA"> Overdrive II</a><strong>Critical Success</strong></p><p><a class="entity-link" draggable="true" data-entity="Item" data-id="MDGROvBFqiOFm8Iv"> Overdrive I</a><strong>Success</strong></p>'}//
	
	const options = token.actor.getRollOptions(['all', 'skill-check', skillName.toLowerCase()]);
	options.push(`action:${actionSlug}`); // add more traits here in new lines
	//options.push(`secret`); // <--- This is what I am talking about
      
	let DCbyLevel = [14,15,16,18,19,20,22,23,24,26,27,28,30,31,32,34,35,36,38,39,40,42,44,46,48,50]
      
      	let level;
	let levels = [];

      	if (choice[0] === 'Dirge of Doom') {
                options.push(`secret`)
      		const ids = game.user.targets.ids;
      		
      		ids.forEach(id => {
      		if (canvas.tokens.placeables.find((t) => t.id === id).actor.type === `npc`) { levels.push(canvas.tokens.placeables.find((t) => t.id === id).actor.level);}
		})
	        
   	        if (game.user.targets.size < 1 || levels.length === 0) { ui.notifications.warn('Please target at least 1 enemy'); return;}
                else { level = Math.max(...levels);}
	      }
        else { 
		canvas.tokens.placeables.filter(pc => pc.actor.hasPlayerOwner && pc.actor.type === "character").forEach(x => { levels.push(x.actor.level) });
		level = Math.max(...levels);
	}
      
      
        let DC;
	if ( isNaN(choice[1]) ) { 
	 if (choice[2] === true) {DC = DCbyLevel[level] + 5; }
	 else { DC = DCbyLevel[level]; }
	} 
        else { DC = choice[1]; }
      
      
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
	
	const roll = await game.pf2e.Check.roll(
	  new game.pf2e.CheckModifier(
	    `<span class="pf2-icon">A</span> <b>${actionName}</b> - <p class="compact-text">${skillName } Skill Check</p>`,
	    token.actor.data.data.skills[skillKey], modifiers ),
	    { actor: token.actor, type: 'skill-check', options, notes, dc: { value: DC } }, // add dc: { value: 25 } in the object to roll against a dc
	    event
	    //for callback: ,(Roll) => {console.log(Roll);}
	);
        if (roll.data.degreeOfSuccess != 1 && choice[2]) { 
          const currentpoints = actor.data.data.resources.focus.value-1;
         actor.update({"data.resources.focus.value":currentpoints});
        }
      }
