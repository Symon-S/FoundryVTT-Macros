/* Little Loot Genrator written for the PF2e system. The values for Treasures are in Silver 1GP = 10SP

When using rarity:
**No filter = completely random loot**
**Uncommon/Rare = Uncommon and rare items only, scrolls and wands will have uncommon/rare spells if randomly generated
and available (rare spells not available at each level), if not available another item will be generated in its place.**
**Unique = There are no unique spells in the game, so this will only push unique items if available.**

Modded by LebombJames to use getIndex for faster loading.
*/

//Limit Macro use to GM
if (!game.user.isGM) { return ui.notifications.error("You are unable to use this macro!"); }

//Dialog Inputs
const dialogs = [	
	{ label : `What type of item?`, type: `select`, options: ["Permanents","Consumables","Treasures"]},
	{ label : `Level? (Only Permanents and Consumables)`, type: `number`, options: [0]},
	{ label : `Center range value in Silver (Only Treasures)<br>(50% in either direction will be evaluated)`, type: `number`},
	{ label : `Quantity?`, type: `number`, options: [1]},
        { label: `Rarity? (Only Permanents and Consumables)`, type: `select`, options: ["No filter", "Common", "Uncommon", "Rare", "Unique"] }
];

//Run Dialog and gather Data
const picks = await quickDialog({title: 'Loot Generator', data: dialogs});

//Throw Error if quantity is below 1
if ( Noan(picks[3]) || picks[3] < 1) { return ui.notifications.error("A quantity of at least 1 is required!");}

//Pre-prep a counter array
let itemArray = [...Array(Math.round(picks[3])).keys()];
let randomItems = [];

//Populate items
const iC = ["battlezoo-ancestries-dragons-pf2e.pf2e-battlezoo-dragon-equipment","pf2e.equipment-srd","battlezoo-bestiary-pf2e.pf2e-battlezoo-equipment","pf2e-expansion-pack.Expansion-Equipment","pf2e-wayfinder.wayfinder-equipment"];
const item = game.packs.filter(c => iC.includes(c.collection));
const items = [];
for (const i of item) {
    const index = await i.getIndex({fields: ["data.level.value", "data.slug", "data.price.value", "data.traits.value", "data.traits.rarity"]});
    index.forEach( x => {
        items.push(x);
    });
};
//Populate Spells
let spellz;
let spellS = [];

if (picks[0] !== "Treasures") {
  const iS = ["pf2e.spells-srd","pf2e-expansion-pack.Expansion-Spells","pf2e-wayfinder.wayfinder-spells"];
  spellz = game.packs.filter(c => iS.includes(c.collection));
  for (const s of spellz) {
    const index = (await s.getIndex({fields: ["data.level.value","data.slug","data.traits","data._id","data.category"]})).filter(f => !f.data.traits.value.includes("cantrip") && f.data.category.value !== "ritual" && f.data.category.value !== "focus");
    index.forEach( x => {
        spellS.push(x);
    });
  }
  if ( picks[4] !== "No filter" ) { spellS = spellS.filter(s => s.data.traits.rarity === picks[4].toLowerCase()); }
}


//Treasures
if (picks[0] === "Treasures") {
	const treasure = items.filter(t => t.type === "treasure");
	if ( Noan(picks[2]) ) { 
		ui.notifications.info("No center range was entered, random treasures selected");
		itemArray.forEach( r => {
			let random = Math.floor(Math.random() * treasure.length);
			randomItems.push({name: treasure[random].name, id: treasure[random]._id});
		});
		let output;
		randomItems.forEach( r => {
			if (output === undefined) { output = `<p>@Compendium[pf2e.equipment-srd.${r.id}]{${r.name}}</p>` }
			
			else { output += `<p>@Compendium[pf2e.equipment-srd.${r.id}]{${r.name}}</p>` }
		});
                return ChatMessage.create({flavor: `<strong>Random ${picks[0]}</strong><br>`, content: output, speaker: {alias:'GM'}, whisper:[game.user.id]});
	}
	if (picks[2] < 1) { return ui.notifications.error("A value greater than 1 needs to be entered for range")}
	else {
		let denomination = "sp";
		let value = Math.round(picks[2]);
		let treasures = [];
                const range = await Ranges(Math.round(picks[2]));
		if (Math.round(picks[2]) >= 10) { 
			denomination = "gp";
			value = Math.round(picks[2] / 10);
                } 
	        treasures = treasure.filter(f => range.includes(f.data.price.value.sp) || range.includes(f.data.price.value.gp*10) );
                
		if (treasures.length === 0) { return ui.notifications.warn(`There are no treasures within 50% of ${value}${denomination}`); }
		
		itemArray.forEach( r => {
			let random = Math.floor(Math.random() * treasures.length);
			randomItems.push({name: treasures[random].name, id: treasures[random]._id})
		});
		let output;
		randomItems.forEach( r => {
			if (output === undefined) { output = `<p>@Compendium[pf2e.equipment-srd.${r.id}]{${r.name}}</p>` }
			else { output += `<p>@Compendium[pf2e.equipment-srd.${r.id}]{${r.name}}</p>` }
		});
                ChatMessage.create({flavor: `<strong>Random ${picks[0]}</strong><br>`,content: output, speaker: {alias:'GM'}, whisper:[game.user.id]});
	}
}

// Permanents
if (picks[0] === "Permanents") {
	if(Noan(picks[1])) { return ui.notifications.error("Level of at least 0 must be entered");}

	const treasure = items.filter(t => t.type === "armor" || t.type === "weapon" || t.type === "equipment" || t.type === "backpack" || t.data.traits.value.includes("wand"));
	let treasures = treasure.filter( l => l.data.level.value === picks[1] );
        if ( picks[4] !== "No filter" ) { treasures = treasures.filter( r => r.data.traits.rarity === picks[4].toLowerCase() || (r.data.slug.includes("magic-wand") && picks[4] !== "Unique")); }
        if (treasures.length === 0) { return ui.notifications.info(`There are no ${picks[4].toLowerCase()} ${picks[0].toLowerCase()} at level ${picks[1]}`); }
	itemArray.forEach( r => {
		let random = Math.floor(Math.random() * treasures.length);
		randomItems.push({name: treasures[random].name, id: treasures[random]._id, slug:treasures[random].data.slug})
	});
	let output;
	randomItems.forEach( r => {
	    console.log(r);
		let slug = r.slug;
		if (output === undefined) { 
			if(slug !== null && slug.includes("magic-wand")){
				const level = parseInt(slug.substr(11,1));   
				const spells = spellS.filter(l => l.data.level.value === level);
                                if (spells.length === 0) { 
                                  const random = Math.floor(Math.random() * treasures.length);
                                  const tr = treasures.filter(n => !n.data.slug.includes("scroll-of-"));
		                  return output = `<p>@Compendium[pf2e.equipment-srd.${tr[random]._id}]{${tr[random].name}}</p>`;
                                }
				const randomSpell = spells[Math.floor(Math.random() * spells.length)];
				output = `<p>@Compendium[pf2e.spells-srd.${randomSpell._id}]{${r.name} of ${randomSpell.name}}</p>`
			}
			else { output = `<p>@Compendium[pf2e.equipment-srd.${r.id}]{${r.name}}</p>` }
		}
		else { 
			if(slug !== null && slug.includes("magic-wand")){
				const level = parseInt(r.slug.substr(11,1));
				const spells = spellS.filter(l => l.data.level.value === level);
                                if (spells.length === 0) { 
                                  const random = Math.floor(Math.random() * treasures.length);
                                  const tr = treasures.filter(n => !n.data.slug.includes("scroll-of-"));
		                  return output += `<p>@Compendium[pf2e.equipment-srd.${tr[random]._id}]{${tr[random].name}}</p>`
                                }
				const randomSpell = spells[Math.floor(Math.random() * spells.length)];
				output += `<p>@Compendium[pf2e.spells-srd.${randomSpell._id}]{${r.name} of ${randomSpell.name}}</p>`
			}

			else { output += `<p>@Compendium[pf2e.equipment-srd.${r.id}]{${r.name}}</p>` }
		}
	});
        ChatMessage.create({flavor: `<strong>Random ${picks[0]}</strong><br>`,content: output, speaker: {alias:'GM'}, whisper:[game.user.id]});
}

//Consumbales
if (picks[0] === "Consumables") {
	if(Noan(picks[1])) { return ui.notifications.error("Level of at least 0 must be entered");}
	const treasure = items.filter(t => t.type === "consumable" && !t.data.traits.value.includes("wand"));
	let treasures = treasure.filter( l => l.data.level.value === picks[1] );
        if ( picks[4] !== "No filter" ) { treasures = treasures.filter( r => r.data.traits.rarity === picks[4].toLowerCase() || (r.data.slug.includes("scroll-of-") && picks[4] !== "Unique")); }
        if (treasures.length === 0) { return ui.notifications.info(`There are no ${picks[4].toLowerCase()} ${picks[0].toLowerCase()} at level ${picks[1]}`); }        
	itemArray.forEach( r => {
		const random = Math.floor(Math.random() * treasures.length);
		randomItems.push({name: treasures[random].name, id: treasures[random]._id, slug:treasures[random].data.slug})
	});
	let output;
	randomItems.forEach( r => {
	    console.log(r);
		let slug = r.slug;
		if (output === undefined) { 
			if(slug !== null && slug.includes("scroll-of-")){
				const level = parseInt(r.slug.substr(10,1));
				const spells = spellS.filter(l => l.data.level.value === level);
                                if (spells.length === 0) { 
                                  const random = Math.floor(Math.random() * treasures.length);
                                  const tr = treasures.filter(n => !n.data.slug.includes("scroll-of-"));
		                  return output = `<p>@Compendium[pf2e.equipment-srd.${tr[random]._id}]{${tr[random].name}}</p>`
                                }
				const randomSpell = spells[Math.floor(Math.random() * spells.length)];
				output = `<p>@Compendium[pf2e.spells-srd.${randomSpell._id}]{${r.name} of ${randomSpell.name}}</p>`
			}
			else { output = `<p>@Compendium[pf2e.equipment-srd.${r.id}]{${r.name}}</p>` }
		}
		else { 
			if(slug !== null && slug.includes("scroll-of-")){
				const level = parseInt(r.slug.substr(10,1));
				const spells = spellS.filter(l => l.data.level.value === level);
                                if (spells.length === 0) { 
                                  const random = Math.floor(Math.random() * treasures.length);
                                  const tr = treasures.filter(n => !n.data.slug.includes("scroll-of-"));
		                  return output += `<p>@Compendium[pf2e.equipment-srd.${tr[random]._id}]{${tr[random].name}}</p>`
                                }
				const randomSpell = spells[Math.floor(Math.random() * spells.length)];
				output += `<p>@Compendium[pf2e.spells-srd.${randomSpell._id}]{${r.name} of ${randomSpell.name}}</p>`
			}

			else { output += `<p>@Compendium[pf2e.equipment-srd.${r.id}]{${r.name}}</p>` }
		}
	});
        ChatMessage.create({flavor: `<strong>Random ${picks[0]}</strong><br>`, content: output, speaker: {alias:'GM'}, whisper:[game.user.id]});

}

async function Ranges(x) {
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
	    ${data.map(({type, label, options}, i) => {
	    if(type.toLowerCase() === `select`)
	    {
	      return `<tr><th style="width:80%;font-size:13px"><label>${label}</label></th><td style="width:20%"><select id="${i}qd">${options.map((e,i)=> `<option value="${e}">${e}</option>`).join(``)}</td></tr>`;
	     }else if (type.toLowerCase() === `checkbox`){
	      return `<tr><th style="width:80%;font-size:13px"><label>${label}</label></th><td style="width:20%"><input type="${type}" id="${i}qd" ${options || ``}/></td></tr>`;
	    } else {
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
		 if (type.toLowerCase() === `select`)
		 {
		   return html.find(`select#${i}qd`).val();
		 } else {
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
