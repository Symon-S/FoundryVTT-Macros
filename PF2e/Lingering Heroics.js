/*
To use this macro, you need to have the lingering composition feat on your character sheet.
To use inspire heroics, you must have the inspire heroics feat on your character sheet.
If you are using PF2e Workbench, the macro will automatically use the effects in the workbench compendium.
If you are not using workbench, ask your DM to import spell effects for the following spells if you have them:
Inspire Courage, Inspire Defense, Triple Time, and Song of Strength
The DM should then duplicate each imported entry.
Have the DM edit the duration of one of the effects to 3 rounds and the other to 4, the DM can rename them to illustrate success or critical success
*/

if (!actor || token.actor.type !== 'character') { return ui.notifications.warn("You must have a PC token selected"); }
if (!token.actor.itemTypes.feat.some(lc => lc.slug === "lingering-composition")) { return ui.notifications.warn("The actor does not possess the Lingering Composition feat"); }
if (actor.data.data.resources.focus.value === 0 || actor.data.data.resources.focus.value === undefined) { return ui.notifications.warn("You have no focus points"); }
	
const skillName = "Performance";
var actionSlug = "lingering-composition"
var actionName = "Lingering Composition"
      
const modifiers = []
	// list custom modifiers for a single roll here
	//const modifiers = [
	//new game.pf2e.Modifier('Expanded Healer\'s Tools', 1, 'item')
	//];
      
let cantrips = token.actor.itemTypes.spell.filter(s=> s.isFocusSpell === true && s.isCantrip === true && s.data.data.traits.value.includes('composition') && s.data.data.duration.value === '1 round');
            
let label;
if (cantrips.find(f => f.slug === 'dirge-of-doom') !== undefined) { label = `Choose a Spell : <br>(Target all affected enemies for Dirge of Doom)` }
else { label = `Choose a Spell : ` }
      
let lc_data = [
	{ label: label, type: `select`, options: cantrips.map(p=> p.name) },
	{ label: `Custom DC : `, type: `number` }
];
      
if (token.actor.itemTypes.feat.some(s => s.slug === 'inspire-heroics')) { lc_data.push( { label: `Inspire Heroics (Defense, Courage, and Song of Strength Only) : `, type: `checkbox` } ) }     

const choice = await quickDialog({data: lc_data, title: `Lingering Composition`});
      
const cast_spell = token.actor.itemTypes.spell.find(n => n.name === choice[0]);
      
const com_id = cast_spell.sourceId.substr(27);
let effectcom = game.packs.find(sp => sp.collection === "pf2e.spell-effects");
      
let effects = await effectcom.getDocuments();
      
let effect = effects.find(e => e.data.name.includes(choice[0]));
      
const notes = [...token.actor.skills.performance.data.notes];
      
if (choice[2] === true) {
  if ( choice[0] === 'Inspire Courage' || choice[0] === 'Inspire Defense' || choice[0] === 'Song of Strength') {  
    var actionSlug = "inspire-heroics";
    var actionName = "Inspire Heroics";
    let ihc = effects.find(e => e.data.name.includes(`${choice[0].substr(8)}, +3`));
    let ihs = effects.find(e => e.data.name.includes(`${choice[0].substr(8)}, +2`));
    notes.push({"outcome":["success"], "selector":"performance", "text":`<p><a class="entity-link content-link" draggable="true" data-pack="pf2e.spell-effects" data-id="${ihs.id}">${ihs.name}</a></p>`});
    notes.push({"outcome":["criticalSuccess"], "selector":"performance", "text":`<p><a class="entity-link content-link" draggable="true" data-pack="pf2e.spell-effects" data-id="${ihc.id}">${ihc.name}</a></p>`});
    notes.push({"outcome":["failure"], "selector":"performance", "text":`<p><a class="entity-link content-link" draggable="true" data-pack="pf2e.spell-effects" data-id="${effect.id}">${effect.name}</a> You don't spend the Focus Point for casting the spell</p>`});
  }
  else { ui.notifications.warn('Inspire Heroics is only applicable to Inspire Courage, Inspire Defense, or Song of Strength'); return; }
}

if (effect !== undefined && (choice[2] === undefined || !choice[2])) {
  if(game.items.some(i => i.slug === effect.slug) && !game.packs.some(s => s.collection === "xdy-pf2e-workbench.asymonous-benefactor-effects")) {
    const success = game.items.find(s => s.slug === effect.slug && s.data.data.duration.value === 3);
    const cs = game.items.find(s => s.slug === effect.slug && s.data.data.duration.value === 4);
    notes.push({"outcome":["success"], "selector":"performance", "text":`<p><a class="entity-link content-link" draggable="true" data-type="Item" data-entity="Item" data-id="${success.id}">${success.name}</a> lasts 3 rounds</p>`});
    notes.push({"outcome":["criticalSuccess"], "selector":"performance", "text":`<p><a class="entity-link content-link" draggable="true" data-type="Item" data-entity="Item" data-id="${cs.id}">${cs.name}</a> lasts 4 rounds</p>`});
    notes.push({"outcome":["failure"], "selector":"performance", "text":`<p><a class="entity-link content-link" draggable="true" data-pack="pf2e.spell-effects" data-id="${effect.id}">${effect.name}</a> lasts 1 round, but you don't spend the Focus Point for casting the spell</p>`});
  }
  
	if ( game.packs.some(s => s.collection === "xdy-pf2e-workbench.asymonous-benefactor-effects") ) {
    const pack = game.packs.find(s => s.collection === "xdy-pf2e-workbench.asymonous-benefactor-effects");
    const wbef = await pack.getDocuments();
    const success = wbef.find( s => s.slug === effect.slug && s.data.data.duration.value === 3 );
    const cs = wbef.find( s => s.slug === effect.slug && s.data.data.duration.value === 4 );
    notes.push({"outcome":["success"], "selector":"performance", "text":`<p><a class="entity-link content-link" draggable="true" data-pack="xdy-pf2e-workbench.asymonous-benefactor-effects" data-id="${success.id}">${success.name}</a> lasts 3 rounds</p>`});
    notes.push({"outcome":["criticalSuccess"], "selector":"performance", "text":`<p><a class="entity-link content-link" draggable="true" data-pack="xdy-pf2e-workbench.asymonous-benefactor-effects" data-id="${cs.id}">${cs.name}</a> lasts 4 rounds</p>`});
    notes.push({"outcome":["failure"], "selector":"performance", "text":`<p><a class="entity-link content-link" draggable="true" data-pack="pf2e.spell-effects" data-id="${effect.id}">${effect.name}</a> lasts 1 round, but you don't spend the Focus Point for casting the spell</p>`});
  }
  
	if(!game.items.some(i => i.slug === effect.slug) && !game.packs.some(s => s.collection === "xdy-pf2e-workbench.asymonous-benefactor-effects")) {
    notes.push({"outcome":["success"], "selector":"performance", "text":`<p><a class="entity-link content-link" draggable="true" data-pack="pf2e.spell-effects" data-id="${effect.id}">${effect.name}</a> lasts 3 rounds</p>`});
    notes.push({"outcome":["criticalSuccess"], "selector":"performance", "text":`<p><a class="entity-link content-link" draggable="true" data-pack="pf2e.spell-effects" data-id="${effect.id}">${effect.name}</a> lasts 4 rounds</p>`});
    notes.push({"outcome":["failure"], "selector":"performance", "text":`<p><a class="entity-link content-link" draggable="true" data-pack="pf2e.spell-effects" data-id="${effect.id}">${effect.name}</a> lasts 1 round, but you don't spend the Focus Point for casting the spell</p>`});
  }
}

// add more notes if necessary
// Syntax for a note: {"outcome":["success"], "selector":"performance", "text":'<p><a class="entity-link content-link" draggable="true" data-entity="Item" data-id="TSxkmgfLWwNQnAnA"> Overdrive II</a><strong>Critical Success</strong></p><p><a class="entity-link" draggable="true" data-entity="Item" data-id="MDGROvBFqiOFm8Iv"> Overdrive I</a><strong>Success</strong></p>'}//
	
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
	canvas.tokens.placeables.filter(pc => pc?.actor?.hasPlayerOwner && pc?.actor?.type === "character").forEach(x => { levels.push(x.actor.level) });
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
			if(type.toLowerCase() === `select`) {
		  	return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><select id="${i}qd">${options.map((e,i)=> `<option value="${e}">${e}</option>`).join(``)}</td></tr>`;
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
		     		if(type.toLowerCase() === `select`) {
		       		return html.find(`select#${i}qd`).val();
		     		}
						else{
		       		switch(type.toLowerCase()) {
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
	  `<span class="pf2-icon">A</span> <b>${actionName}</b><br><i>${choice[0]}</i> - <p class="compact-text">${skillName } Skill Check</p>`,
	  token.actor.skills.performance, modifiers 
	),
	{ actor: token.actor, type: 'skill-check', options, notes, dc: { value: DC }, skipDialog: true }, // add dc: { value: 25 } in the object to roll against a dc
	null
	//for callback: ,(Roll) => {console.log(Roll);}
);
if (roll.data.degreeOfSuccess !== 1) { 
  const currentpoints = actor.data.data.resources.focus.value-1;
  actor.update({"data.resources.focus.value":currentpoints});
}
