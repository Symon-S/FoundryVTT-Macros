/* Little Loot Genrator written for the PF2e system. The values for Treasures are in Silver 1GP = 10SP

When using rarity:
**No filter = completely random loot**
**Uncommon/Rare = Uncommon and rare items only, scrolls and wands will have uncommon/rare spells if randomly generated
and available (rare spells not available at each rank), if not available another item will be generated in its place.**
**Unique = There are no unique spells in the game, so this will only push unique items if available.**

When Generated Loot Actor is selected it will create a loot actor named Generated Loot if not available then populate this actor. If the actor is already available, it will populate the actor.
When Party Actor or Existing Loot Actor are selected, if only one actor of that type is available, it will populate that actor. If more are available another dialog will prompt for an actor choice.

Modded by LebombJames to use getIndex for faster loading.
Special thanks to Idle for scroll/wand creation function.
*/

LootGenerator();

async function LootGenerator() {
	const wandIds = {
        1: "UJWiN0K3jqVjxvKk",
        2: "vJZ49cgi8szuQXAD",
        3: "wrDmWkGxmwzYtfiA",
        4: "Sn7v9SsbEDMUIwrO",
        5: "5BF7zMnrPYzyigCs",
        6: "kiXh4SUWKr166ZeM",
        7: "nmXPj9zuMRQBNT60",
        8: "Qs8RgNH6thRPv2jt",
        9: "Fgv722039TVM5JTc"
    };

	//Limit Macro use to GM
	if (!game.user.isGM) { return ui.notifications.warn("You are unable to use this macro!"); }

	//Dialog Inputs
	const dialogs = [	
		{ label : `What type of item?`, type: `select`, options: ["Permanents","Consumables","Treasures"]},
		{ label : `Level? (Only Permanents and Consumables)`, type: `select`, options: Array.fromRange(21)},
		{ label : `Center range value in Silver (Only Treasures)<br>(50% in either direction will be evaluated)`, type: `number`},
		{ label : `Quantity?`, type: `number`, options: [1]},
		{ label : `Rarity? (Only Permanents and Consumables)`, type: `select`, options: ["No filter", "Common", "Uncommon", "Rare", "Unique"] },
		{ label : `Distribution type?`, type: `select`, options: ["Party Actor","Existing Loot Actor","Generated Loot Actor","Message"]},
		{ label : `Mystify?`, type: `checkbox`, options: "checked"}
	];

	//Run Dialog and gather Data
	const picks = await quickDialog({title: 'Loot Generator', data: dialogs});
	picks[1] = parseInt(picks[1]);

	//Throw warn if quantity is below 1
	if ( Noan(picks[3]) || picks[3] < 1) { return ui.notifications.warn("A quantity of at least 1 is required!");}

	//Pre-prep a counter array
	let itemArray = [...Array(Math.round(picks[3])).keys()];
	let randomItems = [];

	//Populate items
	const iC = ["pf2e.equipment-srd","battlezoo-bestiary-pf2e.pf2e-battlezoo-equipment",/*"pf2e-expansion-pack.Expansion-Equipment","pf2e-wayfinder.wayfinder-equipment"*/,"battlezoo-bestiary-su-pf2e.pf2e-battlezoo-su-equipment","battlezoo-world-of-indigo-isles-pf2e.indigo-isles-equipment",];
	const item = game.packs.filter(c => iC.includes(c.collection));
	let items = [];
	for (const i of item) {
		const index = await i.getIndex({fields: ["system.level.value", "system.slug", "system.price.value", "system.traits.value", "system.traits.rarity","uuid"]});
		index.forEach( x => {
			x.compendium = i.collection;
			items.push(x);
		});
	};

	//Populate Spells
	let spellz;
	let spellS = [];
	let treasures = [];
	const output = [];

	if (picks[0] !== "Treasures") {
		const iS = ["pf2e.spells-srd",/*"pf2e-expansion-pack.Expansion-Spells"*/]; 
		spellz = game.packs.filter(c => iS.includes(c.collection));
		for (const s of spellz) {
			const index = (await s.getIndex({fields: ["system.level.value","system.slug","system.traits","system.ritual","uuid","system.area","system.duration","system.range","system.time"]})).filter(f => !f.system.traits.value.includes("cantrip") && !(f.system.ritual ??= false) && !f.system.traits.value.includes("focus"));
			index.forEach( x => {
				x.compendium = s.collection;
				spellS.push(x);
			});
		}
		if ( picks[4] !== "No filter" ) { spellS = spellS.filter(s => s.system.traits.rarity === picks[4].toLowerCase()); }
	}

	//Treasures
	if (picks[0] === "Treasures") {
		const type = "treasure";
		await RRI(type,false);
		await Loot(type);
	}

	// Permanents
	if (picks[0] === "Permanents") {
		const type = "permanent";
		await RRI(type,false);
		await Loot(type);
	}

	//Consumbales
	if (picks[0] === "Consumables") {
		const type = "consumable";
		await RRI(type,false);
		await Loot(type);
	}

	async function RRI(type,exclude) {
		if (exclude) {
			treasures = treasures.filter(m => !m.system.slug.includes("scroll-of-") && !m.system.slug.includes("wand-of-continuation-") && !m.system.slug.includes("wand-of-legerdemain-") && !m.system.slug.includes("wand-of-reaching-") && !m.system.slug.includes("wand-of-widening-") && !m.system.slug.includes("magic-wand-"));
			const random = Math.floor(Math.random() * treasures.length);
			ouput.push({name: treasures[random].name, id: treasures[random]._id, slug:treasures[random].system.slug, compendium: treasures[random].compendium, uuid: treasures[random].uuid});
		}
		else if ( type === "permanent" ) {
			if(Noan(picks[1])) { return ui.notifications.warn("Level of at least 0 must be entered");}
			const treasure = items.filter(t => t.type === "armor" || t.type === "weapon" || t.type === "equipment" || t.type === "backpack" || t.system.traits.value.includes("wand") );
			treasures = treasure.filter( l => l.system.level.value === picks[1] && !l.system.traits.value.includes("consumable") );
			if ( picks[4] !== "No filter" ) { treasures = treasures.filter( r => r.system.traits.rarity === picks[4].toLowerCase() || (r.system.slug?.includes("magic-wand") && picks[4] !== "Unique")); }
			if (treasures.length === 0) { return ui.notifications.info(`There are no ${picks[4].toLowerCase()} ${picks[0].toLowerCase()} at level ${picks[1]}`); }
			itemArray.forEach( () => {
				const random = Math.floor(Math.random() * treasures.length);
				randomItems.push({name: treasures[random].name, id: treasures[random]._id, slug:treasures[random].system.slug, compendium: treasures[random].compendium, uuid: treasures[random].uuid})
			});
		}
		else if ( type === "consumable") {
			if(Noan(picks[1])) { return ui.notifications.warn("Level of at least 0 must be entered");}
			const treasure = items.filter(t => ( t.type === "consumable" || t.system.traits.value.includes("consumable") ) && !t.system.traits.value.includes("wand"));
			treasures = treasure.filter( l => l.system.level.value === picks[1] );
			if ( picks[4] !== "No filter" ) { treasures = treasures.filter( r => r.system.traits.rarity === picks[4].toLowerCase() || (r.system.slug?.includes("scroll-of-") && picks[4] !== "Unique")); }
			if (treasures.length === 0) { return ui.notifications.info(`There are no ${picks[4].toLowerCase()} ${picks[0].toLowerCase()} at level ${picks[1]}`); }        
			itemArray.forEach( () => {
				const random = Math.floor(Math.random() * treasures.length);
				randomItems.push({name: treasures[random].name, id: treasures[random]._id, slug:treasures[random].system.slug, compendium: treasures[random].compendium, uuid: treasures[random].uuid})
			});
		}
		else if ( type === "treasure" ) {
			treasures = items.filter(t => t.type === "treasure");
			if ( Noan(picks[2]) ) { 
				ui.notifications.info("No center range was entered, random treasures selected");
				itemArray.forEach( () => {
					let random = Math.floor(Math.random() * treasures.length);
					randomItems.push({name: treasures[random].name, slug: treasures[random].system.slug, id: treasures[random]._id, compendium: treasures[random].compendium, uuid: treasures[random].uuid});
				});
			}
			else if (picks[2] < 1 && !Noan(picks[2] ) ) { return ui.notifications.warn("A value greater than 1 needs to be entered for range")}
			else {
				let denomination = "sp";
				let value = Math.round(picks[2]);;
				const range = await Ranges(Math.round(picks[2]));
				if (Math.round(picks[2]) >= 10) { 
					denomination = "gp";
					value = Math.round(picks[2] / 10);
				} 
				treasures = treasures.filter(f => range.includes(f.system.price.value.sp) || range.includes(f.system.price.value.gp*10) );		
				if (treasures.length === 0) { return ui.notifications.warn(`There are no treasures within 50% of ${value}${denomination}`); }
				
				itemArray.forEach( () => {
					let random = Math.floor(Math.random() * treasures.length);
					randomItems.push({name: treasures[random].name, id: treasures[random]._id, slug:treasures[random].system.slug, compendium: treasures[random].compendium, uuid: treasures[random].uuid})
				});
			}
		}
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

	async function Loot(type) {
		for ( const r of randomItems ) {
			const slug = r.slug;
			if(slug !== null && slug.includes("magic-wand")){
				const level = parseInt(slug.substr(11,1));
				const spells = spellS.filter(l => l.system.level.value === level);
				const randomSpell = spells[Math.floor(Math.random() * spells.length)] ?? spells[Math.floor(Math.random() * spells.length)];
				output.push({ compendium: randomSpell.compendium, id: randomSpell._id, name: `Wand of ${randomSpell.name} (Rank ${level})`, uuid: randomSpell.uuid, sid: r.id, sc: r.compendium, level, scrollUUID: r.uuid});
			}
			else if(slug !== null && slug.includes("scroll-of-")){
				let level = parseInt(r.slug.substr(10,1));
				if (r.slug.length === 25) {
					level = parseInt(r.slug.substr(10,2));
				}
				const spells = spellS.filter(l => l.system.level.value === level);
				const randomSpell = spells[Math.floor(Math.random() * spells.length)] ?? spells[Math.floor(Math.random() * spells.length)];
				output.push({ compendium: randomSpell.compendium, id: randomSpell._id, name: `Scroll of ${randomSpell.name} (Rank ${level})`, uuid: randomSpell.uuid, sid: r.id, sc: r.compendium, level, scrollUUID: r.uuid});
			}
			else if (slug !== null && slug.includes("wand-of-continuation-")) {
				const level = parseInt(r.slug.substr(21,1));
				const spells = spellS.filter( f => f.system.level.value === level && (f.system.duration.value === "10 minutes" || f.system.duration.value === "1 hour") && (f.system.time?.value === "1" || f.system.time?.value === "2") );
            	if ( spells.length === 0 ) { 
					await RRI(type,true);
				}
				else {
					const specWand = "cont";
					const rSpell = spells[Math.floor(Math.random() * spells.length)];
            		output.push({ compendium: rSpell.compendium, id: rSpell._id, name: `Wand of Continuation ${rSpell.name} (Rank ${level})`, uuid: rSpell.uuid, sid: wandIds[level], sc: "pf2e.equipment-srd", level, scrollUUID: `Compendium.pf2e.equipment-srd.Item.${wandIds[level]}`, sWUUID: r.uuid, specWand });
				}
			}

			else if (slug !== null && slug.includes("wand-of-legerdemain-")) {
				const level = parseInt(r.slug.substr(20,1));
				const specWand = "leger";
				const spells = spellS.filter(l => l.system.level.value === level);
				const rSpell = spells[Math.floor(Math.random() * spells.length)];
            	output.push({ compendium: rSpell.compendium, id: rSpell._id, name: `Wand of Legerdemain ${rSpell.name} (Rank ${level})`, uuid: rSpell.uuid, sid: wandIds[level], sc: "pf2e.equipment-srd", level, scrollUUID: `Compendium.pf2e.equipment-srd.Item.${wandIds[level]}`, sWUUID: r.uuid, specWand });
			}

			else if (slug !== null && slug.includes("wand-of-reaching-")) {
				const level = parseInt(r.slug.substr(17,1));
				const spells = spellS.filter( f => f.system.level.value === level && (f.system.range?.value.includes("feet") || f.system.range?.value.includes("touch")) && (f.system.time?.value === "1" || f.system.time?.value === "2") );
            	if ( spells.length === 0 ) { 
					await RRI(type,true);
				}
				else {
					const specWand = "reach";
					const rSpell = spells[Math.floor(Math.random() * spells.length)];
            		output.push({ compendium: rSpell.compendium, id: rSpell._id, name: `Wand of Reaching ${rSpell.name} (Rank ${level})`, uuid: rSpell.uuid, sid: wandIds[level], sc: "pf2e.equipment-srd", level, scrollUUID: `Compendium.pf2e.equipment-srd.Item.${wandIds[level]}`, sWUUID: r.uuid, specWand });
				}
			}

			else if (slug !== null && slug.includes("wand-of-widening-")) {
				const level = parseInt(r.slug.substr(17,1));
				const spells = spellS.filter( f => f.system.level.value === level && f.system.duration.value === "" && ((f.system.area?.value > 10 && f.system.area?.type === "burst") || (f.system.area?.type === "cone" || f.system.area?.type === "line")) && (f.system.time.value === "1" || f.system.time.value === "2") );
            	if ( spells.length === 0 ) { 
					await RRI(type,true);
				}
				else {
					const specWand = "wide";
					const rSpell = spells[Math.floor(Math.random() * spells.length)];
            		output.push({ compendium: rSpell.compendium, id: rSpell._id, name: `Wand of Widening ${rSpell.name} (Rank ${level})`, uuid: rSpell.uuid, sid: wandIds[level], sc: "pf2e.equipment-srd", level, scrollUUID: `Compendium.pf2e.equipment-srd.Item.${wandIds[level]}`, sWUUID: r.uuid, specWand });
				}
			}
			else { output.push(r) }
		}
	}

	if ( picks[5] === "Message" ) {
		let content = "";
		for ( const o of output ) {
			content += `<p>@Compendium[${o.compendium}.${o.id}]{${o.name}}</p>`
		}
		await ChatMessage.create({flavor: `<strong>Random ${picks[0]}</strong><br>`,content, speaker: {alias:'GM'}, whisper:[game.user.id]});
		ui.notifications.info("Check chat message. Hold alt when dragging and dropping to mystify items");
	}
	else {
		let a;
		if ( picks[5] === "Generated Loot Actor" ) {
			if (!game.actors.some( n => n.name === "Generated Loot")) {
				await Actor.create({name:"Generated Loot",type:"loot",img:"icons/containers/chest/chest-reinforced-steel-red.webp"});
			}
			a = game.actors.getName("Generated Loot");
		}
		
		if ( picks[5] === "Party Actor" ) {
			if ( game.actors.filter( p => p.type === "party" ).length > 1 ) {
				a = await MyDialog("party");
			}
			else { 
				a = game.actors.find(p => p.type === "party" );
			}
		}

		if ( picks[5] === "Existing Loot Actor" ) {
			if ( game.actors.filter( p => p.type === "loot" ).length > 1 ) {
				a = await MyDialog("loot");
			}
			else { 
				a = game.actors.find(p => p.type === "loot" );
			}
		}
		if ( a === undefined ) { return }
		const stuff = [];
		for ( const o of output ) {
			if ( o.sid === undefined ) {
				const rI = (await fromUuid(o.uuid)).toObject()
				stuff.push(rI);
			}
			else {
				stuff.push(await createSpellScrollWand(o.compendium, o.id, o.scrollUUID, o.uuid, o.level, o.name, o.sWUUID, o.specWand));
			}
		}
		if (stuff.length > 0) {
			const updates = await a.createEmbeddedDocuments("Item",stuff);
			if ( picks[6] ) { await a.updateEmbeddedDocuments("Item", updates.map(u => ({_id: u.id, "system.identification.status": "unidentified" }))); }
		}
		await a.sheet.render(true);
	}

	async function MyDialog(type) {
		let options = "";
		for (const plac of game.actors.filter( f => f.type === type )) {
			options += `<option value=${plac.id}>${plac.name}</option>`
		}
		const myac = await Dialog.prompt({
			title: `Select ${type} actor`,
			content:`
				<table>
					<tr>
						<th width="70%" style="text-align:center">Please select an actor : </th>
						<td width="30%"><select>${options}</select></td>
					</tr>
				</table>
			`,
			callback: (html) => { return html[0].querySelector("select").value },
			rejectClose:false,
		},{width:"200px"});
		return game.actors.get(myac);
	}

	async function createSpellScrollWand(compendium, id, scrollUUID, uuid, level, name, sWUUID, specWand, temp = false ) {
        const spell = (await fromUuid(uuid))?.toObject();
        if (!spell) return null;
        if ( specWand === "reach" ) {
            if ( spell.system.range.value !== "touch" ) {
                const split = spell.system.range.value.split(" ");
                split[0] = `${parseInt(split[0]) + 30}`;
                spell.system.range.value = split.join(" ");
            }
            else {
                spell.system.range.value === "30 feet";
            }
        }
        if ( specWand === "wide" ) {
            if ( spell.system.area.type === "burst" ) {
                spell.system.area.value += 5;
            }
            if ( spell.system.area.type !== "burst") {
                if ( spell.system.area.value > 15 ) {
                    spell.system.area.value += 10;
                }
                else { spell.system.area.value += 5; }
            }
        }
        if ( specWand === "cont" ) {
            const split = spell.system.duration.value.split(" ");
            split[0] = `${parseInt(split[0]) * 1.5}`;
            spell.system.duration.value = split.join(" ");
        }

        if (level === false) level = spell.system.level.value;

        scrolls = await fromUuid(scrollUUID);

        const scroll = scrolls?.toObject();
        if (!scroll) return null;

        spell.system.location.heightenedLevel = level;

        scroll.name = name;
        scroll.system.temporary = temp;
        scroll.system.spell = spell;
        scroll.system.traits.rarity = spell.system.traits.rarity;
        scroll.system.traits.value = [...new Set(scroll.system.traits.value.concat(spell.system.traits.traditions).concat(spell.system.traits.value))];
            
        const sourceId = spell.flags.core?.sourceId;
        if (sourceId && sWUUID === undefined) scroll.system.description.value = `@Compendium[${compendium}.${id}]{${spell.name}}\n<hr />${scroll.system.description.value}`;
        if ( sWUUID !== undefined ) {
            const w = (await fromUuid(sWUUID)).toObject();
			scroll.system.price = w.system.price;
			if ( specWand !== "leger" ) {
				scroll.system.description.value = `@Compendium[${compendium}.${id}]{${spell.name}}\n<hr />${w.system.description.value}`;
				if ( scroll.system.spell.system.time.value === "2" ) { scroll.system.spell.system.time.value = "3" }
				if ( scroll.system.spell.system.time.value === "1" ) { scroll.system.spell.system.time.value = "2" }
			}
        }
        return scroll;
    }

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
				LootGenerator();
				resolve(Array(data.length).fill().map((e,i)=>{
				let {type} = data[i];
				if (type.toLowerCase() === `select`)
				{
				return html.find(`select#${i}qd`).val();
				} 
				else {
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
			}},
			Close: { 
				label: "Close",
			}
		},
		close: () => {},
		default : 'Ok',
		},{width:"auto"})._render(true);
		document.getElementById("0qd").focus();
		});
	}
}
