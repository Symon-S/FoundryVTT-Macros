/*
This will generate all scrolls from the inputted criteria and place them into a generated(if not already generated) loot actor,
an existing loot actor, or in a party actor.
*/

const stuff = [];
const scrollUuids = {
  1: 'Compendium.pf2e.equipment-srd.Item.RjuupS9xyXDLgyIr',
  2: 'Compendium.pf2e.equipment-srd.Item.Y7UD64foDbDMV9sx',
  3: 'Compendium.pf2e.equipment-srd.Item.ZmefGBXGJF3CFDbn',
  4: 'Compendium.pf2e.equipment-srd.Item.QSQZJ5BC3DeHv153',
  5: 'Compendium.pf2e.equipment-srd.Item.tjLvRWklAylFhBHQ',
  6: 'Compendium.pf2e.equipment-srd.Item.4sGIy77COooxhQuC',
  7: 'Compendium.pf2e.equipment-srd.Item.fomEZZ4MxVVK3uVu',
  8: 'Compendium.pf2e.equipment-srd.Item.iPki3yuoucnj7bIt',
  9: 'Compendium.pf2e.equipment-srd.Item.cFHomF3tty8Wi1e5',
  10: 'Compendium.pf2e.equipment-srd.Item.o1XIHJ4MJyroAHfF',
};

const picks = await Dialog.wait(
  {
    title: "Scroll Generator",
    content: `<table>
      <tr>
        <th style="text-align:center">Spell Rank:</th>
        <td><select id="level">
          <option>1</option>
          <option>2</option>
          <option>3</option>
          <option>4</option>
          <option>5</option>
          <option>6</option>
          <option>7</option>
          <option>8</option>
          <option>9</option>
          <option>10</option>
          <option>All</option>
        </select></td>
      </tr>
      <tr>
        <th style="text-align:center">Tradition:</th>
        <td><select id="trad">
          <option value="arcane">Arcane</option>
          <option value="divine">Divine</option>
          <option value="occult">Occult</option>
          <option value="primal">Primal</option>
					<option value="all">All</option>
        </select></td>
      </tr>
      <tr>
        <th style="text-align:center">Quantity:</th>
        <td><input style="width:20%;text-align:center" type="number" id="quantity" value=1 /></td>
      </tr>
      <tr>
        <th style="text-align:center">Rarity:</th>
        <td><select id="rarity">
          <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
						<option value="any">Any</option>
        </select></td>
      </tr>
      <tr>
      <th style="text-align:center">Output Type:</th>
        <td><select id="outtype">
          <option>Party Actor</option>
          <option>Existing Loot Actor</option>
          <option>Generated Loot Actor</option>
        </select></td>
      </tr>
      <tr>
        <th style="text-align:center">Mystify?</th>
        <td><input type="checkbox" id="mystify" /></td>
      </tr>
</table>`,
  	buttons: {
      ok: {
        label: "Ok",
        callback: (html) => {
          return [
            html[0].querySelector("#level").value,
            html[0].querySelector("#quantity").valueAsNumber,
            html[0].querySelector("#rarity").value,
            html[0].querySelector("#outtype").value,
            html[0].querySelector("#mystify").checked,
            html[0].querySelector("#trad").value,
          ];
        },
      },
      close: {
        label: "Close",
      },
    },
    close: () => {
      return "close";
    },
    default: "ok",
  },
  { width: "auto" }
);
if (picks === "close") {
  return;
}

let spells = [];
  const compendiums = ["pf2e.spells-srd"];
  const aCSpells = game.packs.filter(c => compendiums.includes(c.collection));
  for (const s of aCSpells) {
    let index = (await s.getIndex({fields: ["system.level.value","system.slug","system.traits","system.ritual","uuid"]})).filter(f => !f.system.traits.value.includes("cantrip") && !(f.system.ritual ??= false) && !f.system.traits.value.includes("focus"));
    if ( picks[0] !== "All") { index = index.filter(r => r.system.level.value === parseInt(picks[0])) }
    if ( picks[2] !== "any" ) { index = index.filter(r => r.system.traits.rarity === picks[2]) }
		if ( picks[5] !== "all" ) { index = index.filter(r => r.system.traits.traditions.includes(picks[5])) }
    for (const x of index){
      spells.push({ level: x.system.level.value, name: `Scroll of ${x.name} (Rank ${x.system.level.value})`, uuid: x.uuid, suuid: scrollUuids[x.system.level.value]});
    };
}

if (spells.length === 0) { return void ui.notifications.warn("There are no spells that meet the criteria"); }

let a;
if ( picks[3] === "Generated Loot Actor" ) {
	if (!game.actors.some( n => n.name === "Generated Loot")) {
	await Actor.create({name:"Generated Loot",type:"loot",img:"icons/containers/chest/chest-reinforced-steel-red.webp"});
	}
	a = game.actors.getName("Generated Loot");
}
		
if ( picks[3] === "Party Actor" ) {
	if ( game.actors.filter( p => p.type === "party" ).length > 1 ) {
		a = await MyDialog("party");
	}
	else { 
		a = game.actors.find(p => p.type === "party" );
	}
}

if ( picks[3] === "Existing Loot Actor" ) {
	if ( game.actors.filter( p => p.type === "loot" ).length > 1 ) {
		a = await MyDialog("loot");
	}
	else { 
		a = game.actors.find(p => p.type === "loot" );
	}
}

for ( const s of spells ) {
  stuff.push(await createSpellScrollWand(s.suuid, s.uuid, s.level, s.name))
}
const updates = await a.createEmbeddedDocuments("Item",stuff);
if ( picks[4] ) { await a.updateEmbeddedDocuments("Item", updates.map(u => ({_id: u.id, "system.identification.status": "unidentified" }))); }
await a.sheet.render(true);

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

async function createSpellScrollWand(scrollUUID, uuid, level, name) {
  const spell = (await fromUuid(uuid))?.toObject();
  if (!spell) return null;
  if (level === false) level = spell.system.level.value;
	scrolls = await fromUuid(scrollUUID);
	const scroll = scrolls?.toObject();
  if (!scroll) return null;
	spell.system.location.heightenedLevel = level;
  scroll.name = name;
  scroll.system.description.value = `@UUID[${uuid}]\n<hr />${scroll.system.description.value}`;
  scroll.system.spell = spell;
  scroll.system.traits.rarity = spell.system.traits.rarity;
  scroll.system.quantity = picks[1];
  scroll.system.traits.value = [...new Set(scroll.system.traits.value.concat(spell.system.traits.traditions).concat(spell.system.traits.value))];
  return scroll;
}