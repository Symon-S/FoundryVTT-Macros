if (!game.user.isGM) { ui.notifications.error("You are unable to use this macro!"); return; }

const item = game.packs.get('pf2e.equipment-srd');
const items = await item.getDocuments();
console.log(items);

const spellz = game.packs.get('pf2e.spells-srd');
const spellS = await spellz.getDocuments();
console.log(spellS);

const dialogs = [	
	{ label : `What type of item?`, type: `select`, options: ["Treasures","Permanents","Consumables"]},
	{ label : `Level?`, type: `number`, options: [0]},
	{ label : `Center range value if treasure<br>(20% in either direction will be evaluated)`, type: `number`},
        { label : `Denomination?`, type: `select`, options: ["Gold","Silver"]},
	{ label : `Quantity?`, type: `number`, options: [1]}
];

const picks = await quickDialog({title: 'Loot Generator', data: dialogs});
console.log(picks);

if ( Noan(picks[4]) || picks[4] === 0) { return ui.notifications.error("A quantity of at least 1 is required!");}

let itemArray = [...Array(picks[4]).keys()];
console.log(itemArray);
let randomItems = [];

if (picks[0] === "Treasures") {
	const treasure = items.filter(t => t.type === "treasure");
	console.log(treasure);
	if ( Noan(picks[2]) ) { 
		ui.notifications.info("No center range was inputted, random treasures selected");
		itemArray.forEach( r => {
			let random = Math.floor(Math.random() * treasure.length);
			randomItems.push({name: treasure[random].name, id: treasure[random].id});
		});
		let output;
		randomItems.forEach( r => {
			if (output === undefined) { output = `<p><a class="entity-link" draggable="true" data-pack="pf2e.equipment-srd" data-id="${r.id}">${r.name}</a></p>` }
			else { output = output + `<p><a class="entity-link" draggable="true" data-pack="pf2e.equipment-srd" data-id="${r.id}">${r.name}</a></p>` }
		});
		console.log(output);   
                return ChatMessage.create({flavor: `<strong>Random ${picks[0]}</strong><br>${output}`, speaker: ChatMessage.getSpeaker(), whisper:["Y3VAI2m6FxZptFGd"]});
	}
	if ( picks[2] < 1) { return ui.notifications.error("A value greater than 1 needs to be entered for range")}
	else {
		let denomination = "gp";
		let value = picks[2];
		let treasures = [];
		if (picks[3] === "Silver") { 
			if (Math.round(picks[2]) < 10) { 
				denomination = "sp"; 
				value = picks[2];
				if (Math.round(picks[2]) < 4 ) { value = 1 }
				treasures = treasure.filter(f => f.data.data.denomination.value === denomination && Ranges(value).includes(f.data.data.value.value)); }
			else { 
				denomination = "gp";
				value = Math.round(picks[2]) / 10; 
				treasures = treasure.filter(f => f.data.data.denomination.value === denomination && Ranges(value).includes(f.data.data.value.value) );
				let temp = treasure.filter(f => f.data.data.denomination.value === "sp" && Ranges(Math.round(picks[2])).includes(f.data.data.value.value));
				console.log(temp);
				if ( temp.length  > 0 ) { temp.forEach( t => treasures.push(t));}
			}
		}
		else { treasures = treasure.filter(f => f.data.data.denomination.value === denomination && Ranges(value).includes(f.data.data.value.value)); }
		console.log(treasures);

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
		console.log(output);   
                ChatMessage.create({flavor: `<strong>Random ${picks[0]}</strong><br>${output}`, speaker: ChatMessage.getSpeaker(), whisper:["Y3VAI2m6FxZptFGd"]});
	}
}


if (picks[0] === "Permanents") {
	if(Noan(picks[1])) { return ui.notifications.error("Level of at least 0 must be entered");}
	const treasure = items.filter(t => t.type === "armor" || t.type === "weapon" || t.type === "equipment" || t.slug.search("magic-wand") > -1);
	console.log(treasure);
	const treasures = treasure.filter( l => l.level === picks[1] );
	console.log(treasures);
	itemArray.forEach( r => {
		let random = Math.floor(Math.random() * treasures.length);
		randomItems.push({name: treasures[random].name, id: treasures[random].id, slug:treasures[random].slug})
	});
	console.log(randomItems);
	let output;
	randomItems.forEach( r => {
		let slug = r.slug;
		if (output === undefined) { 
			if(slug.search("magic-wand") > -1){
				const level = parseInt(r.slug.substr(11,1));
				const spells = spellS.filter(l => l.level === level && !l.isFocusSpell && !l.isRitual && !l.isCantrip);
				console.log(spells);
				const randomSpell = spells[Math.floor(Math.random() * spells.length)];
				output = `<p><a class="entity-link" draggable="true" data-pack="pf2e.spells-srd" data-id="${randomSpell.id}">${r.name} of ${randomSpell.name}</a></p>`
			}
			else { output = `<p><a class="entity-link" draggable="true" data-pack="pf2e.equipment-srd" data-id="${r.id}">${r.name}</a></p>` }
		}
		else { 
			if(slug.search("magic-wand") > -1){
				const level = parseInt(r.slug.substr(11,1));
				const spells = spellS.filter(l => l.level === level && !l.isFocusSpell && !l.isRitual && !l.isCantrip);
				console.log(spells);
				const randomSpell = spells[Math.floor(Math.random() * spells.length)];
				output = output + `<p><a class="entity-link" draggable="true" data-pack="pf2e.spells-srd" data-id="${randomSpell.id}">${r.name} of ${randomSpell.name}</a></p>`
			}

			else {output = output + `<p><a class="entity-link" draggable="true" data-pack="pf2e.equipment-srd" data-id="${r.id}">${r.name}</a></p>` }
		}
	});
	console.log(output);   
        ChatMessage.create({flavor: `<strong>Random ${picks[0]}</strong><br>${output}`, speaker: ChatMessage.getSpeaker(), whisper:["Y3VAI2m6FxZptFGd"]});
}

if (picks[0] === "Consumables") {
	if(Noan(picks[1])) { return ui.notifications.error("Level of at least 0 must be entered");}
	const treasure = items.filter(t => t.type === "consumable" && t.slug.search("magic-wand") === -1);
	console.log(treasure);
	const treasures = treasure.filter( l => l.level === picks[1] );
	console.log(treasures);
	itemArray.forEach( r => {
		let random = Math.floor(Math.random() * treasures.length);
		randomItems.push({name: treasures[random].name, id: treasures[random].id, slug:treasures[random].slug})
	});
	console.log(randomItems);
	let output;
	randomItems.forEach( r => {
		let slug = r.slug;
		if (output === undefined) { 
			if(slug.search("scroll-of-") > -1){
				const level = parseInt(r.slug.substr(10,1));
				const spells = spellS.filter(l => l.level === level && !l.isFocusSpell && !l.isRitual && !l.isCantrip);
				console.log(spells);
				const randomSpell = spells[Math.floor(Math.random() * spells.length)];
				output = `<p><a class="entity-link" draggable="true" data-pack="pf2e.spells-srd" data-id="${randomSpell.id}">${r.name} of ${randomSpell.name}</a></p>`
			}
			else { output = `<p><a class="entity-link" draggable="true" data-pack="pf2e.equipment-srd" data-id="${r.id}">${r.name}</a></p>` }
		}
		else { 
			if(slug.search("scroll-of-") > -1){
				const level = parseInt(r.slug.substr(10,1));
				const spells = spellS.filter(l => l.level === level && !l.isFocusSpell && !l.isRitual && !l.isCantrip);
				console.log(spells);
				const randomSpell = spells[Math.floor(Math.random() * spells.length)];
				output = output + `<p><a class="entity-link" draggable="true" data-pack="pf2e.spells-srd" data-id="${randomSpell.id}">${r.name} of ${randomSpell.name}</a></p>`
			}

			else {output = output + `<p><a class="entity-link" draggable="true" data-pack="pf2e.equipment-srd" data-id="${r.id}">${r.name}</a></p>` }
		}
	});
	console.log(output);   
        ChatMessage.create({flavor: `<strong>Random ${picks[0]}</strong><br>${output}`, speaker: ChatMessage.getSpeaker(), whisper:["Y3VAI2m6FxZptFGd"]});

}

function Ranges(x) {
	const lowEnd = Math.round(x * 0.8);
	const highEnd = Math.round(x * 1.2);
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
