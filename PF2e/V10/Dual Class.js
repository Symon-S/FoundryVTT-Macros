/*
This is a macro designed to facilitate building a dual class item for the Dual Class Variant Rule.
Simply select your 2 classes and the macro will create an item you can drag and drop onto your character sheet.
This will need to be run by a GM or someone with the ability to create items in the system.
Look for the created class item in the items tab.
*/

const classesPack = game.packs.find(n => n.collection === "pf2e.classes");
const classes = classesPack.index.contents.map(n => n.name);
const qDData = [
  { label : `Choose your 1st Class : `, type : `select`, options: classes },
  { label : `Choose your 2nd Class : `, type : `select`, options: classes }
];

const chosenClasses = await quickDialog({data : qDData, title: `Dual Class item creator`});

const class1 = await classesPack.getDocument(classesPack.index.find(n => n.name === chosenClasses[0])._id);
const class2 = await classesPack.getDocument(classesPack.index.find(n => n.name === chosenClasses[1])._id);

if ( class1 === class2 ) { return ui.notifications.warn("You cannot select the same class twice"); }

const dClassObj = Object.assign({}, class1);
Object.defineProperty(dClassObj, 'system', {
   value: duplicate(class1.system),
   configurable: true,
   writeable: true
});

const rE = {
    "domain": "all",
    "key": "RollOption",
    "option": `class:${class2.system.slug}`
};

const dClass = dClassObj;

dClass.name = `${class1.name} - ${class2.name}`;

//Attacks
if (class2.system.attacks.avanced > class1.system.attacks.avanced) { dClass.system.attacks.advanced = class2.system.attacks.avanced }
if (class2.system.attacks.martial > class1.system.attacks.martial) { dClass.system.attacks.martial = class2.system.attacks.martial }
if (class2.system.attacks.simple > class1.system.attacks.simple) { dClass.system.attacks.advanced = class2.system.attacks.simple }
if (class2.system.attacks.unarmed > class1.system.attacks.unarmed) { dClass.system.attacks.advanced = class2.system.attacks.unarmed }
if (dClass.system.attacks.martial <= class2.system.attacks.other.rank) { 
  if ( class2.system.attacks.other.rank === class1.system.attacks.other.rank ) {
    let mashed = `${dClass.system.attacks.other.name}, ${class2.system.attacks.other.name}`
    mashed = mashed.replace("and ", "")
    dClass.system.attacks.other.name = [...new Set(mashed.split(','))].join(',');
  }
  if ( class2.system.attacks.other.rank > class1.system.attacks.other.rank ) { dClass.system.attacks.other.name = class2.system.attacks.other.name; dClass.system.attacks.other.rank = class2.system.attacks.other.rank; }
}
if (dClass.system.attacks.martial >= class2.system.attacks.other.rank && dClass.system.attacks.martial >= dClass.system.attacks.other.rank) { dClass.system.attacks.other.rank = 0; dClass.system.attacks.other.name = ""; }

//Class DC
if (class2.system.classDC > dClass.system.classDC) { dClass.system.classDC = class2.system.classDC }

//Defenses
if (class2.system.defenses.heavy > dClass.system.defenses.heavy) { dClass.system.defenses.heavy = class2.system.defenses.heavy }
if (class2.system.defenses.light > dClass.system.defenses.light) { dClass.system.defenses.light = class2.system.defenses.light }
if (class2.system.defenses.heavy > dClass.system.defenses.medium) { dClass.system.defenses.medium = class2.system.defenses.medium }
if (class2.system.defenses.heavy > dClass.system.defenses.unarmored) { dClass.system.defenses.unarmored = class2.system.defenses.unarmored }

//Description
dClass.system.description.value = `${dClass.system.description.value} ${class2.system.description.value}`;

//HP
if (class2.system.hp > dClass.system.hp) { dClass.system.hp = class2.system.hp }

//Items
Object.entries(class2.system.items).forEach( i => {
  if(Object.values(dClass.system.items).some(x => x.uuid === i[1].uuid && x.level <= i[1].level)) { return }
  if (Object.values(dClass.system.items).some(x => x.uuid === i[1].uuid && x.level > i[1].level)) { return Object.values(dClass.system.items).find(x => x.uuid === i[1].uuid).level = i[1].level }
  else { dClass.system.items[i[0]] = i[1]; }
});

//Key Ability
class2.system.keyAbility.value.forEach( v => {
  if (dClass.system.keyAbility.value.includes(v)) { return }
  dClass.system.keyAbility.value.push(v);
});

//Perception
if (class2.system.perception > dClass.system.perception) { dClass.system.perception = class2.system.perception }

//Rules
dClass.system.rules.push(rE);
class2.system.rules.forEach( r => {
  if (dClass.system.rules.includes(r)) { return }
  dClass.system.rules.push(r);
});
dClass.system.rules.forEach( (r,i) => {
  if(r.path === undefined) { return }
  const check = r.path.split('.');
  if(check.includes("data") && check.includes("martial") && check.includes("rank") && dClass.system.attacks.martial >= r.value) {
   dClass.system.rules.splice(i,1);
  }
});

//Saving Throws
if (class2.system.savingThrows.fortitude > dClass.system.savingThrows.fortitude) { dClass.system.savingThrows.fortitude = class2.system.savingThrows.fortitude }
if (class2.system.savingThrows.reflex > dClass.system.savingThrows.reflex) { dClass.system.savingThrows.reflex = class2.system.savingThrows.reflex }
if (class2.system.savingThrows.will > dClass.system.savingThrows.will) { dClass.system.savingThrows.will = class2.system.savingThrows.will }

//Skill Feat Levels
class2.system.skillFeatLevels.value.forEach( v => { dClass.system.skillFeatLevels.value.push(v) });
dClass.system.skillFeatLevels.value = [...new Set(dClass.system.skillFeatLevels.value)].sort((a, b) => { return a - b; });

//Skill Increase Levels
class2.system.skillIncreaseLevels.value.forEach( v => { dClass.system.skillIncreaseLevels.value.push(v) });
dClass.system.skillIncreaseLevels.value = [...new Set(dClass.system.skillIncreaseLevels.value)].sort((a, b) => { return a - b; });

//Trained Skills
if ( class2.system.trainedSkills.additional > dClass.system.trainedSkills.additional ) { dClass.system.trainedSkills.additional = class2.system.trainedSkills.additional }
class2.system.trainedSkills.value.forEach( v => {
  if (dClass.system.trainedSkills.value.includes(v)) { return }
  dClass.system.trainedSkills.value.push(v);
});

//Set the image of the Class
dClass.img = "systems/pf2e/icons/spells/guidance.webp";

await Item.create(dClass);

async function quickDialog({data, title = `Quick Dialog`} = {}) {
  data = data instanceof Array ? data : [data];

  return await new Promise(async (resolve) => {
    let content = `
      <table style="width:100%">
      ${data.map(({type, label, options}, i)=> {
        if(type.toLowerCase() === `select`) {
          return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><select style="font-size:12px" id="${i}qd">${options.map((e,i)=> `<option value="${e}">${e}</option>`).join(``)}</td></tr>`;
        }
        else if(type.toLowerCase() === `checkbox`){
          return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" id="${i}qd" ${options || ``}/></td></tr>`;
        }
        else{
          return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" id="${i}qd" value="${options instanceof Array ? options[0] : options}"/></td></tr>`;
        }
      }).join(``)}
      </table>`;

      await new Dialog({
        title, content,
        buttons : {
          Ok : { label : `Ok`, callback : (html) => {
            resolve(Array(data.length).fill().map((e,i)=>{
              let {type} = data[i];
              if(type.toLowerCase() === `select`){
                 return html.find(`select#${i}qd`).val();
              }
              else{
                switch(type.toLowerCase()){
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
