// Little Loot Genrator written by me for the PF2e system. The values for Treasures are in Silver 1GP = 10SP
//Level is only for Permanents and Consumables. Value is only for treasures, since they don't have a level.

//Limit Macro use to GM
if (!game.user.isGM) { return ui.notifications.error("You are unable to use this macro!"); }

//Populate items
const item = game.packs.get('pf2e.equipment-srd');
const items = await item.getDocuments();

//Populate Spells
const spellz = game.packs.get('pf2e.spells-srd');
const spellS = await spellz.getDocuments();

//Dialog Inputs
const dialogs = [	
	{ label : `What type of item?`, type: `select`, options: ["Treasures","Permanents","Consumables"]},
	{ label : `Level? (Only Permanents and Consumables)`, type: `number`, options: [0]},
	{ label : `Center range value in Silver (Only Treasures)<br>(50% in either direction will be evaluated)`, type: `number`},
	{ label : `Quantity?`, type: `number`, options: [1]}
];

//Run Dialog and gather Data
const picks = await quickDialog({title: 'Loot Generator', data: dialogs});

//Throw Error if quantity is below 1
if ( Noan(picks[3]) || picks[3] < 1) { return ui.notifications.error("A quantity of at least 1 is required!");}

//Pre-prep a counter array
let itemArray = [...Array(Math.round(picks[3])).keys()];
let randomItems = [];

//Treasures
if (picks[0] === "Treasures") {
	const treasure = items.filter(t => t.type === "treasure");
	if ( Noan(picks[2]) ) { 
		ui.notifications.info("No center range was entered, random treasures selected");
		itemArray.forEach( r => {
			let random = Math.floor(Math.random() * treasure.length);
			randomItems.push({name: treasure[random].name, id: treasure[random].id});
		});
		let output;
		randomItems.forEach( r => {
			if (output === undefined) { output = `<p><a class="entity-link" draggable="true" data-pack="pf2e.equipment-srd" data-id="${r.id}">${r.name}</a></p>` }
			else { output = output + `<p><a class="entity-link" draggable="true" data-pack="pf2e.equipment-srd" data-id="${r.id}">${r.name}</a></p>` }
		});
                return ChatMessage.create({flavor: `<strong>Random ${picks[0]}</strong><br>${output}`, speaker: {alias:'GM'}, whisper:[game.user.id]});
	}
	if ( picks[2] < 1) { return ui.notifications.error("A value greater than 1 needs to be entered for range")}
	else {
		let denomination = "sp";
		let value = Math.round(picks[2]);
		let treasures = [];
		if (Math.round(picks[2]) < 3 ) { value = 1 }
		if (Math.round(picks[2]) >= 7) { 
			denomination = "gp";
			value = Math.round(picks[2] / 10); 
			treasures = treasure.filter(f => f.data.data.denomination.value === denomination && Ranges(value).includes(f.data.data.value.value) );
			let temp = treasure.filter(f => f.data.data.denomination.value === "sp" && Ranges(Math.round(picks[2])).includes(f.data.data.value.value));
			if ( temp.length  > 0 ) { temp.forEach( t => treasures.push(t));}
			}

		if (treasures.length === 0) { return ui.notifications.warn(`There are no treasures within 20% of ${value}${denomination}`); }
		
		itemArray.forEach( r => {
			let random = Math.floor(Math.random() * treasures.length);
			randomItems.push({name: treasures[random].name, id: treasures[random].id})
		});
		let output;
		randomItems.forEach( r => {
			if (output === undefined) { output = `<p><a class="entity-link" draggable="true" data-pack="pf2e.equipment-srd" data-id="${r.id}">${r.name}</a></p>` }
			else { output = output + `<p><a class="entity-link" draggable="true" data-pack="pf2e.equipment-srd" data-id="${r.id}">${r.name}</a></p>` }
		});
                ChatMessage.create({flavor: `<strong>Random ${picks[0]}</strong><br>${output}`, speaker: {alias:'GM'}, whisper:[game.user.id]});
	}
}

// Permanents
if (picks[0] === "Permanents") {
	if(Noan(picks[1])) { return ui.notifications.error("Level of at least 0 must be entered");}
	const treasure = items.filter(t => t.type === "armor" || t.type === "weapon" || t.type === "equipment" || t.slug.search("magic-wand") > -1);
	const treasures = treasure.filter( l => l.level === picks[1] );
	itemArray.forEach( r => {
		let random = Math.floor(Math.random() * treasures.length);
		randomItems.push({name: treasures[random].name, id: treasures[random].id, slug:treasures[random].slug})
	});
	let output;
	randomItems.forEach( r => {
		let slug = r.slug;
		if (output === undefined) { 
			if(slug.search("magic-wand") > -1){
				const level = parseInt(r.slug.substr(11,1));
				const spells = spellS.filter(l => l.level === level && !l.isFocusSpell && !l.isRitual && !l.isCantrip);
				const randomSpell = spells[Math.floor(Math.random() * spells.length)];
				output = `<p><a class="entity-link" draggable="true" data-pack="pf2e.spells-srd" data-id="${randomSpell.id}">${r.name} of ${randomSpell.name}</a></p>`
			}
			else { output = `<p><a class="entity-link" draggable="true" data-pack="pf2e.equipment-srd" data-id="${r.id}">${r.name}</a></p>` }
		}
		else { 
			if(slug.search("magic-wand") > -1){
				const level = parseInt(r.slug.substr(11,1));
				const spells = spellS.filter(l => l.level === level && !l.isFocusSpell && !l.isRitual && !l.isCantrip);
				const randomSpell = spells[Math.floor(Math.random() * spells.length)];
				output = output + `<p><a class="entity-link" draggable="true" data-pack="pf2e.spells-srd" data-id="${randomSpell.id}">${r.name} of ${randomSpell.name}</a></p>`
			}

			else {output = output + `<p><a class="entity-link" draggable="true" data-pack="pf2e.equipment-srd" data-id="${r.id}">${r.name}</a></p>` }
		}
	});
        ChatMessage.create({flavor: `<strong>Random ${picks[0]}</strong><br>${output}`, speaker: {alias:'GM'}, whisper:[game.user.id]});
}

//Consumbales
if (picks[0] === "Consumables") {
	if(Noan(picks[1])) { return ui.notifications.error("Level of at least 0 must be entered");}
	const treasure = items.filter(t => t.type === "consumable" && t.slug.search("magic-wand") === -1);
	const treasures = treasure.filter( l => l.level === picks[1] );
	itemArray.forEach( r => {
		let random = Math.floor(Math.random() * treasures.length);
		randomItems.push({name: treasures[random].name, id: treasures[random].id, slug:treasures[random].slug})
	});
	let output;
	randomItems.forEach( r => {
		let slug = r.slug;
		if (output === undefined) { 
			if(slug.search("scroll-of-") > -1){
				const level = parseInt(r.slug.substr(10,1));
				const spells = spellS.filter(l => l.level === level && !l.isFocusSpell && !l.isRitual && !l.isCantrip);
				const randomSpell = spells[Math.floor(Math.random() * spells.length)];
				output = `<p><a class="entity-link" draggable="true" data-pack="pf2e.spells-srd" data-id="${randomSpell.id}">${r.name} of ${randomSpell.name}</a></p>`
			}
			else { output = `<p><a class="entity-link" draggable="true" data-pack="pf2e.equipment-srd" data-id="${r.id}">${r.name}</a></p>` }
		}
		else { 
			if(slug.search("scroll-of-") > -1){
				const level = parseInt(r.slug.substr(10,1));
				const spells = spellS.filter(l => l.level === level && !l.isFocusSpell && !l.isRitual && !l.isCantrip);
				const randomSpell = spells[Math.floor(Math.random() * spells.length)];
				output = output + `<p><a class="entity-link" draggable="true" data-pack="pf2e.spells-srd" data-id="${randomSpell.id}">${r.name} of ${randomSpell.name}</a></p>`
			}

			else {output = output + `<p><a class="entity-link" draggable="true" data-pack="pf2e.equipment-srd" data-id="${r.id}">${r.name}</a></p>` }
		}
	});
        ChatMessage.create({flavor: `<strong>Random ${picks[0]}</strong><br>${output}`, speaker: {alias:'GM'}, whisper:[game.user.id]});

}

function Ranges(x) {
	const lowEnd = Math.round(x * 0.5);
	const highEnd = Math.round(x * 1.5);
	const range = [];
	for (let i = lowEnd; i <= highEnd; i++) {
		range.push(i);
	}
	return range;
}

function Noan(x) {
   return x !== x;
};

async function quickDialog({data, title = `Quick Dialog`} = {}) {
	data = data instanceof Array ? data : [data];
  
	return await new Promise(async (resolve) => {
	  let content = `
	    <table style="width:100%">
	    ${data.map(({type, label, options}, i)=> {
	    if(type.toLowerCase() === `select`)
	    {
	      return `<tr><th style="width:80%;font-size:13px"><label>${label}</label></th><td style="width:20%"><select id="${i}qd">${options.map((e,i)=> `<option value="${e}">${e}</option>`).join(``)}</td></tr>`;
	    }else if(type.toLowerCase() === `checkbox`){
	      return `<tr><th style="width:80%;font-size:13px"><label>${label}</label></th><td style="width:20%"><input type="${type}" id="${i}qd" ${options || ``}/></td></tr>`;
	    }else{
	      return `<tr><th style="width:80%;font-size:13px"><label>${label}</label></th><td style="width:20%"><input type="${type}" style="border:solid 1px black" id="${i}qd" value="${options instanceof Array ? options[0] : options}"/></td></tr>`;
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
