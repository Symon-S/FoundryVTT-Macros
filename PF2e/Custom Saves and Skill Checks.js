/* This is a modded version of the Custom Saves macro originally created by Tik.
This version adds the ability to create a skill check aside from just saves.
It also handles level based saves and skill checks as well as difficulty adjustements for skill check.
You can either enter a level between 0 and 25 for an appropriate level based DC for saves and skills,
or you can set a custom DC. The difficulty adjustment changes the difficulty by the appropriate amount as per RAW.
Setting a difficulty adjustement will also change the custom DC that is set.
If no values are entered, the macro defaults to DC 10.
If the custom value and the level based DC are used simultaniously, the larger DC is used (before adjustment for skill checks)
Add whatever text you would like to post along with the check to chat in the flavor section.
Add traits to ensure applicable mods will trigger if needed.
*/
function _prepareTraits(){
  const traits = Object.entries(CONFIG.PF2E.actionTraits).map(([value,label])=>({value,label}));
  return traits;
}
function createMessage(data){
  const dc = data.dc + data.diff;
  if("check" in data) return `@Check[type:${data.check}|traits:${data.traits.join(",")}|dc:${dc}]${data.flavor !==""  ?`{${data.flavor}}`:""}`
  if("save" in data) return `@Check[type:${data.save}|traits:${data.traits.join(",")}|dc:${dc}|${data.basic ? "basic" : ""}]${data.flavor !==""  ?`{${data.flavor}}`:""}`
}
function render(event, app){
  const input = app.element.querySelector("[name=dc]");
  const select = app.element.querySelector("[name=level]");
  select.addEventListener("change",()=>{
    input.value = ldc.get(Number(select.value))
  })
}

const {Dialog} = foundry.applications.api;
const {NumberField, StringField, BooleanField, SetField} = foundry.data.fields;
const adjustments = {"incredibly-easy": -10, "very-easy": -5, "easy": -2, "normal": 0, "hard": 2, "very-hard": 5, "incredibly-hard": 10};
const optionsDiff = Object.entries(adjustments).map(([k,v]) => ({label:CONFIG.PF2E.dcAdjustments[k], value: v, selected: v === 0}));
const ldc = new Map([[0,14],[1,15],[2,16],[3,18],[4,19],[5,20],[6,22],[7,23],[8,24],[9,26],[10,27],[11,28],[12,30],[13,31],[14,32],[15,34],[16,35],[17,36],[18,38],[19,39],[20,40],[21,42],[22,44],[23,46],[24,48],[25,50]]);
const actorLevel = canvas.tokens.controlled.length === 1 ? canvas.tokens.controlled[0].actor.level :
                   game.actors.party.members.length > 0 ? game.actors.party.level : 0;

const mode = await Dialog.wait({
  window: {title: "Save or Skill Check"},
  buttons: [{
    action: "save",
    label: "Custom Saves"
  },{
    action: "check",
    label: "Skill Checks",
    default: true
  },{
    action: "cancel",
    label: "Cancel",
    icon: "fa-solid fa-xmark"
  }]
});
if(mode === "cancel") return;

const optionsLevel = Array.fromRange(26,0).map(e => ({value: e, label: e, selected: e === actorLevel}))
const levelField = new NumberField({
  label: "PF2E.LevelLabel"
}).toFormGroup({localize: true}, {name: "level", options: optionsLevel}).outerHTML;
const dcField = new NumberField({
  label: "DC:"
}).toFormGroup({},{name: "dc", value: ldc.get(actorLevel)}).outerHTML;
const adjustField = new NumberField({
  label: "Adjust Difficulty:"
}).toFormGroup({}, {localize: true, options: optionsDiff, name: "diff"}).outerHTML;
const flavorField = new StringField({
  label: "Flavor"
}).toFormGroup({},{elementType: "textarea", name: "flavor"}).outerHTML;
const traitsField = new SetField(new StringField(), {
  label: "PF2E.Traits",
}).toFormGroup({localize: true}, {localize: true, name: "traits", options: _prepareTraits()}).outerHTML
const content = levelField + dcField + adjustField + flavorField + traitsField;
let data;
if(mode === "save"){ 
  const savesField = new StringField({
    label: "PF2E.SavingThrow",
    choices: CONFIG.PF2E.saves,
    required: true
  }).toFormGroup({localize: true}, {localize:true, name: "save"}).outerHTML;
  const basicField =  new BooleanField({
    label: "Basic Save"
  }).toFormGroup({rootId: "custom-save-basic-save-option"}, {name: "basic"}).outerHTML;
  data = await Dialog.input({
    window: {title: "New Save"},
    content: savesField+basicField+content,
    render
  });
  
}
if(mode === "check"){
  const checkField = new StringField({
    label: "PF2E.SkillLabel",
    choices: CONFIG.PF2E.skills,
    required: true
  }).toFormGroup({localize: true}, {localize:true, name: "check"}).outerHTML;
  data = await Dialog.input({
    window: {title: "New Save"},
    content: checkField+content,
    render
  });
}
const msg = createMessage(data);

const answer = await Dialog.wait({
  window: {title: "To Journal or Message"},
  buttons: [{
    label: "Journal",
    action: "journal"
  },{
    label: "Message",
    action: "message",
    default: true
  }]
});
if(!answer) return;
if(answer === "message") ChatMessage.create({content: msg});
if(answer === "journal"){
  const journal = game.journal.getName("Custom Saves and Skill Checks") ?? await JournalEntry.create({
    name: "Custom Saves and Skill Checks"
  });
  const page = journal.pages.getName("To Send to Chat") ?? await JournalEntryPage.create({
    name: "To Send to Chat"
  }, {parent: journal});
  await page.update({"text.content": msg});
  ui.notifications.info('New entry created in Journal "Custom Saves and Skill Checks"');
}