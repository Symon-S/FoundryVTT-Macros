/*
To use this macro, you need to have the lingering composition feat on your character sheet.
To use fortissimo composition, you must have the fortissimo composition feat on your character sheet.
This macro requires Workbench module., the macro will automatically use the effects in the workbench compendium.
*/

if(!game.modules.get("xdy-pf2e-workbench")?.active) { return ui.notifications.error("This Macro requires PF2e Workbench module")}
if (!actor || token.actor.type !== 'character') { return ui.notifications.warn("You must have a PC token selected"); }
if (!token.actor.itemTypes.feat.some(lc => lc.slug === "lingering-composition")) { return ui.notifications.warn("The actor does not possess the Lingering Composition feat"); }
if (actor.system.resources.focus.value === 0 || actor.system.resources.focus.value === undefined) { return ui.notifications.warn("You have no focus points"); }

const modifiers = [];
const notes = [];
const skillName = "Performance";
const skillKey = "prf";
let actionSlug = "lingering-composition";
let actionName = "Lingering Composition";
const options = token.actor.getRollOptions(['all', 'skill-check', skillName.toLowerCase()]);
      
let cantrips = token.actor.itemTypes.spell.filter(s=> s.isFocusSpell === true && s.isCantrip === true && s.traits.has('composition') && s.system.duration.value === '1 round');
            
      
const lc_data = [
	{ label: `Choose a Spell : `, type: `select`, options: cantrips.map(p=> p.name) },
	{ label: `Custom DC : `, type: `number`}
];
      
if (token.actor.itemTypes.feat.some(s => s.slug === 'fortissimo-composition')) { lc_data.push( { label: `Fortissimo Composition (Rallying Anthem, Courageous Anthem, and Song of Strength Only) : `, type: `checkbox`, options: `style="margin:auto;display:block"` } ) }     

const choice = await quickDialog({data: lc_data, title: `Lingering Composition`});
      
const cast_spell = token.actor.itemTypes.spell.find(e => e.name === choice[0]);
const slug = cast_spell.slug;

let cs,suc, csLink, sucLink;
const effectcom = game.packs.find(sp => sp.collection === "pf2e.spell-effects");
const effects = await effectcom.getIndex({fields:["system.slug"]});
let effect = effects.some(e => e.system.slug.includes(slug)) ? effects.find(e => e.system.slug.includes(slug)) : "";
if (choice[2]) {
	if (choice[0] === 'Courageous Anthem' || choice[0] === 'Rallying Anthem' || choice[0] === 'Song of Strength') {  
    	actionSlug = "fortissimo-composition";
    	actionName = "Fortissimo Composition";
		options.push(`action:${actionSlug}`);
		if (slug === "courageous-anthem") {
			cs = "Compendium.pf2e.spell-effects.Item.VFereWC1agrwgzPL";
			suc = "Compendium.pf2e.spell-effects.Item.kZ39XWJA3RBDTnqG";
		}
		if (slug === "rallying-anthem") {
			cs = "Compendium.pf2e.spell-effects.Item.BKam63zT98iWMJH7";
			suc = "Compendium.pf2e.spell-effects.Item.Chol7ExtoN2T36mP";
		}
		if (slug === "song-of-strength") {
			cs = "Compendium.pf2e.spell-effects.Item.8XaSpienzVXLmcfp";
			suc = "Compendium.pf2e.spell-effects.Item.Fjnm1l59KH5YJ7G9";
		}
		if (effect !== ''){
			notes.push({"outcome":["success"], "selector":"performance", "text":`<p>@UUID[${suc}]</p>`});
    		notes.push({"outcome":["criticalSuccess"], "selector":"performance", "text":`<p>@UUID[${cs}]</p>`});
    		notes.push({"outcome":["failure"], "selector":"performance", "text":`<p>${effect.link} You don't spend the Focus Point for casting the spell</p>`});
			notes.push({"outcome":["criticalFailure"], "selector":"performance", "text":`<p>${effect.link}</p>`});
		}
	}
	else { 
		ui.notifications.warn('Fortissimo Composition is only applicable to Inspire Courage, Rallying Anthem, or Song of Strength'); return; 
	}
}
      
let DCbyLevel = [14,15,16,18,19,20,22,23,24,26,27,28,30,31,32,34,35,36,38,39,40,42,44,46,48,50]
      
let level;
let levels = [];
const willDCs = [];
if (choice[0] === 'Dirge of Doom') {
  options.push(`secret`)
  const ids = [];
  for ( t of canvas.tokens.placeables) {
	  if (token.distanceTo(t) <= 60) {
		  ids.push(t.id);
	  }
  }
  ids.forEach(id => {
    if (canvas.tokens.placeables.find((t) => t.id === id).actor.type === `npc`) { levels.push(canvas.tokens.placeables.find((t) => t.id === id).actor.level);}
	})
	        
  if (ids.length < 1 || levels.length === 0) { return ui.notifications.warn('There are no enemies within range'); }
  else { level = Math.max(...levels);}
}
else { 
	canvas.tokens.placeables.filter(pc => pc?.actor?.hasPlayerOwner && pc?.actor?.type === "character").forEach(x => { 
    levels.push(x.actor.level);
    willDCs.push(x.actor.saves.will.dc.value);
  });
	level = Math.max(...levels);
}


if (level < 0) { level = 0 }      
let DC;
if ( isNaN(choice[1]) ) { 
	if (choice[2]) {
    DC = Math.max(...willDCs); 
  }
	else { DC = DCbyLevel[level]; }
}
else { DC = choice[1]; }
      
async function quickDialog({data, title = `Quick Dialog`} = {}) {
	data = data instanceof Array ? data : [data];
      
	return await new Promise(async (resolve) => {
	  let content = `
		<table style="width:100%">
		${data.map(({type, label, options, style}, i)=> {
			if(type.toLowerCase() === `select`) {
		  	return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><select id="${i}qd">${options.map((e,i)=> `<option value="${e}">${e}</option>`).join(``)}</td></tr>`;
			}
			else if(type.toLowerCase() === `checkbox`){
		  	return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" id="${i}qd" ${options || ``}/></td></tr>`;
			}
			else{
		  	return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" style="margin:auto;display:block;width:15%;text-align:center" id="${i}qd" value="${options instanceof Array ? options[0] : options} ${style || ""}"/></td></tr>`;
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
	  },{width:"400"})._render(true);
	  document.getElementById("0qd").focus();
	});
}
let aura = (await fromUuid("Compendium.xdy-pf2e-workbench.xdy-pf2e-workbench-items.Item.KIPV1TiPCzlhuAzo")).toObject();
if ( effect.slug === "spell-effect-rallying-anthem" ) {
	aura = (await fromUuid("Compendium.xdy-pf2e-workbench.xdy-pf2e-workbench-items.Item.tcnjhVxyRchqjt71")).toObject();
}
if (choice[0] === "Dirge of Doom") {
  aura = (await fromUuid("Compendium.xdy-pf2e-workbench.xdy-pf2e-workbench-items.Item.wOcAf3pf04cTM4Uk")).toObject();
}
if (effect === "" && choice[0] !== "Dirge of Doom") {
	aura.system.rules[0] = {key: "Aura", radius: 60, slug:"is-aura-effect" }
}
else if (choice[0] !== "Dirge of Doom") { aura.system.rules[0].effects[0].uuid = effect.uuid; }
aura.system.duration.value = 1;
aura.system.duration.unit = "rounds"
aura.img = cast_spell.img;
aura.name = `Aura: ${actionName} (${choice[0]})`
aura.slug = `aura-${actionSlug}`
aura.system.rules[0].level = Math.ceil(actor.level/2);
aura.system.level.value = Math.ceil(actor.level/2);
if (cs !== undefined) {
	aura.img = "systems/pf2e/icons/spells/inspire-heroics.webp"
}

const roll = await game.pf2e.Check.roll(
	new game.pf2e.CheckModifier(
	  `<span class="pf2-icon">A</span> <b>${actionName}</b><br><i>${choice[0]}</i> - <p class="compact-text">${skillName } Skill Check</p>`,
	  token.actor.skills.performance, modifiers 
	), { actor: token.actor, type: 'skill-check', options, notes, dc: { value: DC }, skipDialog: true }, null);

if (roll.options.degreeOfSuccess === 3) {
	if(choice[2] && effect !== undefined) {
		aura.system.rules[0].effects[0].uuid = cs;
	}
	else {
		aura.system.duration.value = 4
	}
}
if (roll.options.degreeOfSuccess === 2) {
	if(choice[2] && effect !== undefined) {
		aura.system.rules[0].effects[0].uuid = suc;
	}
	else {
		aura.system.duration.value = 3
	}
}
await token.actor.createEmbeddedDocuments("Item",[aura]);
if (roll.options.degreeOfSuccess > 1) { 
  const currentpoints = actor.system.resources.focus.value-1;
  await actor.update({"system.resources.focus.value":currentpoints});
}
