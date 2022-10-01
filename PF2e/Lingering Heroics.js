/*
To use this macro, you need to have the lingering composition feat on your character sheet.
To use inspire heroics, you must have the inspire heroics feat on your character sheet.
This macro requires Workbench module., the macro will automatically use the effects in the workbench compendium.
*/

if(!game.modules.get("xdy-pf2e-workbench")?.active) { return ui.notifications.error("This Macro requires PF2e Workbench module")}
if (!actor || token.actor.type !== 'character') { return ui.notifications.warn("You must have a PC token selected"); }
if (!token.actor.itemTypes.feat.some(lc => lc.slug === "lingering-composition")) { return ui.notifications.warn("The actor does not possess the Lingering Composition feat"); }
if (actor.system.resources.focus.value === 0 || actor.system.resources.focus.value === undefined) { return ui.notifications.warn("You have no focus points"); }
	
const skillName = "Performance";
const skillKey = "performance"
let actionSlug = "lingering-composition"
let actionName = "Lingering Composition"
      
let cantrips = token.actor.itemTypes.spell.filter(s=> s.isFocusSpell === true && s.isCantrip === true && s.system.traits.value.includes('composition') && s.system.duration.value === '1 round');
            
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
      
let effectcom = game.packs.find(sp => sp.collection === "pf2e.spell-effects");
      
let effects = await effectcom.getDocuments();
      
const effect = effects.find(e => e.name.includes(choice[0]));
let suc,cs;
      
if (choice[2]) {
	if (choice[0] === 'Inspire Courage' || choice[0] === 'Inspire Defense' || choice[0] === 'Song of Strength') {  
    actionSlug = "inspire-heroics";
    actionName = "Inspire Heroics";
    cs = effects.find(e => e.name.includes(`${choice[0].substr(8)}, +3`));
    suc = effects.find(e => e.name.includes(`${choice[0].substr(8)}, +2`));
	}
	else { 
		ui.notifications.warn('Inspire Heroics is only applicable to Inspire Courage, Inspire Defense, or Song of Strength'); return; 
	}
}

if (effect !== undefined && (choice[2] === undefined || !choice[2])) {
    const pack = game.packs.find(s => s.collection === "xdy-pf2e-workbench.asymonous-benefactor-effects");
    const wbef = await pack.getDocuments();
    suc = wbef.find( s => s.slug === effect.slug && s.system.duration.value === 3 );
    cs = wbef.find( s => s.slug === effect.slug && s.system.duration.value === 4 );
}
      
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
	    },
		default: "Ok",
	  })._render(true);
	  document.getElementById("0qd").focus();
	});
}

const aura = (await fromUuid("Compendium.xdy-pf2e-workbench.xdy-pf2e-workbench-items.MRmGlGAFd3tSJioo")).toObject();
aura.img = cast_spell.img;
aura.name = `Aura: ${actionName} (${choice[0]})`
aura.slug = `aura-${actionSlug}`
aura.system.duration.sustained = false;
if (effect === undefined) {
	aura.system.rules[0].effects[0].uuid = ""
}
if (cs !== undefined) {
	aura.img = cs.img;
}
const aroll = deepClone(token.actor.skills[skillKey]);
aroll.label = `${skillName} - ${actionName}</br>@Compendium[pf2e.spells-srd.${choice[0]}]`	
const roll = await aroll.check.roll({dc:{value:DC},skipDialog:true});
if (roll.data.degreeOfSuccess === 3) {
	if(choice[2] && effect !== undefined) {
		aura.system.rules[0].effects[0].uuid = cs.uuid;
	}
	else {
		aura.system.duration.value = 4
	}
}
if (roll.data.degreeOfSuccess ===2) {
	if(choice[2] && effect !== undefined) {
		aura.system.rules[0].effects[0].uuid = suc.uuid;
	}
	else {
		aura.system.duration.value = 3
	}
}
await token.actor.createEmbeddedDocuments("Item",[aura]);
if (roll.data.degreeOfSuccess !== 1) { 
  const currentpoints = actor.system.resources.focus.value-1;
  await actor.update({"system.resources.focus.value":currentpoints});
}
