/*
Simple Scroll/Wand Generator
Input Type, Level, Quantity, Rarity, Output Type, and Mystification.
Hit Ok and it will generate output.
When Loot Actor is selected it will create a loot actor named Generated Loot if not available then populate this actor. If the actor is already available, it will populate the actor.
When Party Stash is selected, the first party actor found will be populated.
*/
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

const scrollIds = {
    1: 'RjuupS9xyXDLgyIr', // Compendium.pf2e.equipment-srd.Item.RjuupS9xyXDLgyIr
    2: 'Y7UD64foDbDMV9sx',
    3: 'ZmefGBXGJF3CFDbn',
    4: 'QSQZJ5BC3DeHv153',
    5: 'tjLvRWklAylFhBHQ',
    6: '4sGIy77COooxhQuC',
    7: 'fomEZZ4MxVVK3uVu',
    8: 'iPki3yuoucnj7bIt',
    9: 'cFHomF3tty8Wi1e5',
    10: 'o1XIHJ4MJyroAHfF',
};

const picks = await Dialog.wait({
    title: "Wand and Scroll Generator",
    content: `
        <table>
            <tr>
                <th style="text-align:center">Type:</th>
                <td width="20%"><select id="type" autofocus>
                    <option value="scroll">Scroll</option>
                    <option value="wand">Wand</option>
                </select></td>
            </tr>
            <tr>
                <th style="text-align:center">Spell Level (Scrolls 0-10, Wands 0-9):</th>
                <td>
                    <input style="text-align:center" type="number" id="level" value=1 />
                </td>
            </tr>
            <tr>
                <th style="text-align:center">Quantity:</th>
                <td><input style="text-align:center" type="number" id="quantity" value=1 /></td>
            </tr>
            <tr>
                <th style="text-align:center">Rarity:</th>
                <td><select id="rarity">
                    <option value="any">Any</option>
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                </select></td>
            </tr>
            <tr>
                <th style="text-align:center">Output Type:</th>
                <td><select id="outtype">
                    <option>Party Stash</option>
                    <option>Loot Actor</option>
                    <option>Message</option>
                </select></td>
            </tr>
            <tr>
                <th style="text-align:center">Mystify?</th>
                <td><input type="checkbox" id="mystify" checked /></td>
            </tr>
        </table>    
    `,
    buttons: {
        ok: {
            label: "Ok",
            callback: (html) => { 
                game.macros.getName("Wand and Scroll Generator").execute();
                return [ html[0].querySelector("#type").value, html[0].querySelector("#level").valueAsNumber, html[0].querySelector("#quantity").valueAsNumber, html[0].querySelector("#rarity").value, html[0].querySelector("#outtype").value, html[0].querySelector("#mystify").checked ] },
        },
        close: {
            label: "Close",
        }
    },
    default: "ok",
});
if (picks === "close") { return }
if ( picks[1] > 10 ) { return ui.notifications.info("There are no spells above level 10") }
if ( picks[0] === "wand" && picks[1] > 9 ) { return ui.notifications.info("There are no wands for spells above level 9") }
if (picks[1] === NaN || picks[2] === NaN || picks[1] < 1 || picks[2] < 1) { return ui.notifications.warn("Level must be a value between 1 and 10 and Quantity must be a value greater than 1!")}

const quantity = new Array.fromRange(picks[2]);
let spells = [];
const compendiums = ["pf2e.spells-srd","pf2e-expansion-pack.Expansion-Spells","pf2e-wayfinder.wayfinder-spells"];
const aCSpells = game.packs.filter(c => compendiums.includes(c.collection));
for (const s of aCSpells) {
    const index = (await s.getIndex({fields: ["system.level.value","system.slug","system.traits","system.category","uuid"]})).filter(f => !f.system.traits.value.includes("cantrip") && f.system.category.value !== "ritual" && f.system.category.value !== "focus" && f.system.level.value === picks[1] );
    index.forEach( x => {
        x.compendium = s.collection;
        spells.push(x);
    });
    if (picks[3] !== "any") { spells = spells.filter(r => r.system.traits.rarity === picks[3]) }
}

if ( spells.length < 1 ) { return ui.notifications.info(`There are no ${picks[3]} spells at level ${picks[1]}`)}

const output = [];
for ( const q of quantity ) {
    const randomSpell = spells[Math.floor(Math.random() * spells.length)];
    if ( picks[0] === "scroll" ){
	    output.push({ compendium: randomSpell.compendium, id: randomSpell._id, name: `Scroll of ${randomSpell.name} (Level ${picks[1]})`, uuid: randomSpell.uuid, sid: scrollIds[picks[1]], sc: "pf2e.equipment-srd", level: picks[1], scrollUUID: `Compendium.pf2e.equipment-srd.Item.${scrollIds[picks[1]]}`});
    }
    if ( picks[0] === "wand" ){
	    output.push({ compendium: randomSpell.compendium, id: randomSpell._id, name: `Wand of ${randomSpell.name} (Level ${picks[1]})`, uuid: randomSpell.uuid, sid: wandIds[picks[1]], sc: "pf2e.equipment-srd", level: picks[1], scrollUUID: `Compendium.pf2e.equipment-srd.Item.${wandIds[picks[1]]}`});
    }
}

if ( picks[4] === "Message" ) {
		let content = "";
		for ( const o of output ) {
			content += `<p>@Compendium[${o.compendium}.${o.id}]{${o.name}}</p>`
		}
		await ChatMessage.create({flavor: `<strong>Random ${picks[0]}</strong><br>`,content, speaker: {alias:'GM'}, whisper:[game.user.id]});
		ui.notifications.info("Check chat message. Hold alt when dragging and dropping to mystify items");
}
else {
	let a = game.actors.find( a => a.type === "party" );
	if ( picks[4] === "Loot Actor" ) {
	    if (!game.actors.some( n => n.name === "Generated Loot")) {
		    await Actor.create({name:"Generated Loot",type:"loot",img:"icons/containers/chest/chest-reinforced-steel-red.webp"});
	    }
	    a = game.actors.getName("Generated Loot");
    }
    const stuff = [];
	for ( const o of output ) {
		stuff.push(await createSpellScrollWand(o.compendium, o.id, o.scrollUUID, o.uuid, o.level, o.name))
	}
	const updates = await a.createEmbeddedDocuments("Item",stuff);
	if ( picks[5] ) { await a.updateEmbeddedDocuments("Item", updates.map(u => ({_id: u.id, "system.identification.status": "unidentified" }))); }
	a.sheet.render(true);
}

async function createSpellScrollWand(compendium, id, scrollUUID, uuid, level, name, temp = false) {
    const spell = (await fromUuid(uuid))?.toObject();
    if (!spell) return null;

    if (level === false) level = spell.system.level.value;

    scrolls = await fromUuid(scrollUUID);

    const scroll = scrolls?.toObject();
    if (!scroll) return null;

    spell.system.location.heightenedLevel = level;

    scroll.name = name;
    scroll.system.temporary = temp;
    scroll.system.spell = spell;
	scroll.system.traits.rarity = spell.system.traits.rarity;
    scroll.system.traits.value.push(...spell.system.traditions.value);

    const sourceId = spell.flags.core?.sourceId;
    if (sourceId) scroll.system.description.value = `@Compendium[${compendium}.${id}]{${spell.name}}\n<hr />${scroll.system.description.value}`;

    return scroll;
}
