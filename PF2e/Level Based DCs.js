/*
Simple Macro to check for level based DCs.
Either select a token, multiple tokens, or no token at all.
You will be prompted for selecting the level and adjustment.
If a single token is selected, it will pre-select its level.
*/
const adjustments = {"incredibly-easy": -10, "very-easy": -5, "easy": -2, "normal": 0, "hard": 2, "very-hard": 5, "incredibly-hard": 10};
const actorLevel = canvas.tokens.controlled.length === 1 ? canvas.tokens.controlled[0].actor.level :
                   game.actors.party.members.length > 0 ? game.actors.party.level : -1;

const optionsLevel = Array.fromRange(27, -1).map(e => ({value: e, label: e, selected: actorLevel === e}))
const optionsDiff = Object.entries(adjustments).map(([k,v]) => ({label: game.i18n.localize(CONFIG.PF2E.dcAdjustments[k]), value: v, selected: v === 0}));

const levelField = new foundry.data.fields.NumberField({
  label: game.i18n.localize("PF2E.CharacterLevelLabel"),
}).toFormGroup({},{name: "level", options: optionsLevel}).outerHTML;

const diffField = new foundry.data.fields.NumberField({
  label: "Difficulty"
}).toFormGroup({},{name: "diff", options:optionsDiff}).outerHTML;

const data = await foundry.applications.api.Dialog.input({
  window: {title: "Level Based DC"},
  content: levelField+diffField
});
if(!data) return;
const {level, diff} = data;
const lDCs = new Map([[-1,13],[0,14],[1,15],[2,16],[3,18],[4,19],[5,20],[6,22],[7,23],[8,24],[9,26],[10,27],[11,28],[12,30],[13,31],[14,32],[15,34],[16,35],[17,36],[18,38],[19,39],[20,40],[21,42],[22,44],[23,46],[24,48],[25,50]]);
const bDC = lDCs.get(level) + diff;
ui.notifications.info(`Level based DC is ${bDC} (${game.i18n.localize(CONFIG.PF2E.dcAdjustments[foundry.utils.invertObject(adjustments)[diff]])})`);