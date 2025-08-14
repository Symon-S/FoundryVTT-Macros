/* A quick Macro to pop up a notification with the DCs for spells based on level and rarity.
These DCs are used for counteract checks, learning a spell, etc.
These are NOT DCs for saves against these spells.*/

const rarityMap = new Map([["common", 0],["uncommon", 2],["rare",5],["unique",10]]);
const sDCs = new Map([[1,15],[2,18],[3,20],[4,23],[5,26],[6,28],[7,31],[8,34],[9,36],[10,39]]);
const optionsRank = Array.fromRange(10,1).map(e => ({label: e, value:e}))

const rarityField = new foundry.data.fields.StringField({
  label: "PF2E.Rarity",
  choices: CONFIG.PF2E.rarityTraits,
  required: true
}).toFormGroup({localize: true}, {name: "rarity", localize: true}).outerHTML;
const rankField = new foundry.data.fields.NumberField({
  label: "PF2E.SpellLevelLabel"
}).toFormGroup({localize: true}, {name: "rank", options: optionsRank}).outerHTML;
const data = await foundry.applications.api.Dialog.input({
  window: {title: "Spell DC by Level"},
  content:rarityField + rankField
});
if(!data) return;

const {rank, rarity} = data;
const bDC = sDCs.get(rank) + rarityMap.get(rarity);
ui.notifications.info(`The Spell DC is ${bDC}`);