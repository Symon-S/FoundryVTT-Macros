/**
 * This will generate all scrolls or wands from the inputted criteria and place them into a generated(if not already generated) loot actor,an existing loot actor, or in a party actor.
 * Dialog V2 modification and Wands added by Freeze.
*/
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
const wandUuids = {
  1: 'Compendium.pf2e.equipment-srd.Item.UJWiN0K3jqVjxvKk',
  2: 'Compendium.pf2e.equipment-srd.Item.vJZ49cgi8szuQXAD',
  3: 'Compendium.pf2e.equipment-srd.Item.wrDmWkGxmwzYtfiA',
  4: 'Compendium.pf2e.equipment-srd.Item.Sn7v9SsbEDMUIwrO',
  5: 'Compendium.pf2e.equipment-srd.Item.5BF7zMnrPYzyigCs',
  6: 'Compendium.pf2e.equipment-srd.Item.kiXh4SUWKr166ZeM',
  7: 'Compendium.pf2e.equipment-srd.Item.nmXPj9zuMRQBNT60',
  8: 'Compendium.pf2e.equipment-srd.Item.Qs8RgNH6thRPv2jt',
  9: 'Compendium.pf2e.equipment-srd.Item.Fgv722039TVM5JTc'
};

// establish choices for the dropdown selects.
const trads = CONFIG.PF2E.magicTraditions;
trads.all = "All"; // add an all option.
const rarityTraits = CONFIG.PF2E.rarityTraits;
rarityTraits.any = "Any"; // add an any option.
delete rarityTraits.unique; // comment out if you need unique spells.
const outputChoices = { "party": "Party", "loot": "Existing Loot Actor", "generate": "Generated Loot Actor" };

// establish the fields we need and a shorthand for DialogV2.
const {NumberField, StringField, BooleanField} = foundry.data.fields;
const {DialogV2} = foundry.applications.api;

// create the HTML groups for the content of the Dialog.
const itemGroup = new StringField({
  choices: {"scroll": "Scrolls", "wand": "Wands"},
  label: "Items to create:",
  required: true
}).toFormGroup({},{name: "sItem"}).outerHTML;

const spellRanksGroup = new NumberField({
  choices: Object.keys(scrollUuids).reduce((acc,e)=> {acc[e]= `Spell Rank ${e}`; return acc;},{"-1": "All"}),
  label: "Spell Rank:"
}).toFormGroup({},{dtype:"Number", name: "level"}).outerHTML;

const traditionsGroup = new StringField({
  choices: trads,
  label: "Tradition:",
  required: true
}).toFormGroup({},{name:"trad", localize: true}).outerHTML;

const raritiesGroup = new StringField({
  choices: rarityTraits,
  label: "Rarity:",
  required: true
}).toFormGroup({},{name:"rarity", localize: true}).outerHTML;

const outputGroup = new StringField({
  choices: outputChoices,
  label: "Output Type:",
  required: true
}).toFormGroup({},{name:"outtype"}).outerHTML;

const quantiyGroup = new NumberField({
  label: "Quantity:"
}).toFormGroup({},{name: "quantity", value: 1}).outerHTML;

const mystifyGroup = new BooleanField({
  label: "Mystify?"
}).toFormGroup({rootId: "scroll-wand-mystify-check"},{name: "mystify"}).outerHTML;

// DialogV2 that sets the picks values.
const picks = await DialogV2.wait({
  window: {title: "Scroll Generator"},
  content: itemGroup + spellRanksGroup + traditionsGroup + quantiyGroup + raritiesGroup + outputGroup + mystifyGroup,
  buttons:[{
    label: "Create",
    action: "create",
    icon: "fa-solid fa-check",
    callback: (_, button) => new FormDataExtended(button.form).object
  },{
    label: "Cancel",
    action: "cancel",
    icon: "fa-solid fa-xmark",
    callback: ()=> null
  }],
  render: onRender,
  rejectClose: false
});

if(!picks) return;

//lets make some scrolls.
let spells = [];
const compendiums = ["pf2e.spells-srd"];
const aCSpells = game.packs.filter(c => compendiums.includes(c.collection));
for (const s of aCSpells) {
  let index = (await s.getIndex({ fields: ["system.level.value", "system.slug", "system.traits", "system.ritual", "uuid"] })).filter(f => !f.system.traits.value.includes("cantrip") && !(f.system.ritual ??= false) && !f.system.traits.value.includes("focus"));
  if (picks.level > 0) index = index.filter(r => r.system.level.value === picks.level);
  if (picks.rarity !== "any") index = index.filter(r => r.system.traits.rarity === picks.rarity);
  if (picks.trad !== "all") index = index.filter(r => r.system.traits.traditions.includes(picks.trad));
  for (const x of index) {
    x.compendium = s.collection;
    const uuidList = picks.sItem === "wand" ? wandUuids : scrollUuids;
    spells.push({ level: x.system.level.value, name: `${picks.sItem.capitalize()} of ${x.name} (Rank ${x.system.level.value})`, uuid: x.uuid, suuid: uuidList[x.system.level.value] });
  }
}
// find the actor or create the actor to make the scrolls on.
let a;
if (picks.outtype === "generate") {
  a = game.actors.getName("Generated Loot");
  if (!a) a = await Actor.create({ name: "Generated Loot", type: "loot", img: "icons/containers/chest/chest-reinforced-steel-red.webp" });
}
else {
  if (game.actors.filter(p => p.type === picks.outtype).length > 1) {
    a = await MyDialog(picks.outtype);
  }
  else {
    a = game.actors.find(p => p.type === picks.outtype);
  }
}
if (!a) return;

const toCreate = [];
for (const s of spells) {
  toCreate.push(await createSpellScrollWand(s.suuid, s.uuid, s.level, s.name, picks.mystify));
}
const created = await a.createEmbeddedDocuments("Item", toCreate);
a.sheet.render(true);

//helper function to select a specific party actor or loot actor if multiple exist.
async function MyDialog(type) {
  const content = new StringField({
    choices: game.actors.reduce((acc,e)=>{
      if(e.type !== type) return acc;
      acc[e.id] = e.name;
      return acc;
    },{}),
    label: "Please Select an Actor:",
    required: true
  }).toFormGroup({classes:["stacked"]}, {name: "actor"}).outerHTML;
  const myact = await DialogV2.prompt({
    window: {title: `Select ${type} actor`},
    content,
    ok: {
      callback: (event,button) => new FormDataExtended(button.form).object.actor
    },
    rejectClose: false,
    position: { width: 375 }
  });
  return game.actors.get(myact);
}
// helper function to create the data for a scroll.
async function createSpellScrollWand(itemUuid, spellUuid, level, name, mystified) {
  const spell = (await fromUuid(spellUuid))?.toObject();
  if (!spell) return null;
  if (level === false) level = spell.system.level.value;
  const item = await fromUuid(itemUuid);
  const itemData = item?.toObject();
  if (!itemData) return null;
  spell.system.location.heightenedLevel = level;
  itemData.name = name;
  itemData.system.spell = spell;
  itemData.system.description.value = `@UUID[${spellUuid}]{${spell.name}}` + itemData.system.description.value;
  itemData.system.traits.rarity = spell.system.traits.rarity;
  itemData.system.quantity = picks.quantity;
  itemData.system.traits.value = [...new Set(itemData.system.traits.value.concat(spell.system.traits.traditions).concat(spell.system.traits.value))];
  if(mystified) itemData.system.identification.status = "unidentified";
  return itemData;
}

function onRender(event, html) {
  const itemSelect = html.querySelector("select[name=sItem]");
  const levelSelect = html.querySelector("select[name=level]");
  itemSelect.addEventListener("change", ()=>{
    const value = itemSelect.value;
    const uuidList = value === "wand" ? wandUuids : scrollUuids;
    const replacement = HandlebarsHelpers.selectOptions(Object.keys(uuidList).reduce((acc,e)=> {acc[e]= `Spell Rank ${e}`; return acc;},{"-1": "All"}), {hash:{}});
    levelSelect.innerHTML = replacement;
  });
}