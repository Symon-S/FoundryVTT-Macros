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

const dClassObj = Object.create(Object.getPrototypeOf(class1));
Object.defineProperty(dClassObj, 'data', {
   value: duplicate(class1),
   configurable: true,
   writeable: true
});

const rE = {
    "domain": "all",
    "key": "RollOption",
    "option": `class:${class2.data.data.slug}`
};

const dClass = dClassObj.data;
dClass.name = `${class1.data.name} - ${class2.data.name}`;

//Attacks
if (class2.data.data.attacks.avanced > class1.data.data.attacks.avanced) { dClass.data.attacks.advanced = class2.data.data.attacks.avanced }
if (class2.data.data.attacks.martial > class1.data.data.attacks.martial) { dClass.data.attacks.martial = class2.data.data.attacks.martial }
if (class2.data.data.attacks.simple > class1.data.data.attacks.simple) { dClass.data.attacks.advanced = class2.data.data.attacks.simple }
if (class2.data.data.attacks.unarmed > class1.data.data.attacks.unarmed) { dClass.data.attacks.advanced = class2.data.data.attacks.unarmed }
if (dClass.data.attacks.martial <= class2.data.data.attacks.other.rank) { 
  if ( class2.data.data.attacks.other.rank === class1.data.data.attacks.other.rank ) {
    let mashed = `${dClass.data.attacks.other.name}, ${class2.data.data.attacks.other.name}`
    mashed = mashed.replace("and ", "")
    dClass.data.attacks.other.name = [...new Set(mashed.split(','))].join(',');
  }
  if ( class2.data.data.attacks.other.rank > class1.data.data.attacks.other.rank ) { dClass.data.attacks.other.name = class2.data.data.attacks.other.name; dClass.data.attacks.other.rank = class2.data.data.attacks.other.rank; }
}
if (dClass.data.attacks.martial >= class2.data.data.attacks.other.rank && dClass.data.attacks.martial >= dClass.data.attacks.other.rank) { dClass.data.attacks.other.rank = 0; dClass.data.attacks.other.name = ""; }

//Class DC
if (class2.data.data.classDC > dClass.data.classDC) { dClass.data.classDC = class2.data.data.classDC }

//Defenses
if (class2.data.data.defenses.heavy > dClass.data.defenses.heavy) { dClass.data.defenses.heavy = class2.data.data.defenses.heavy }
if (class2.data.data.defenses.light > dClass.data.defenses.light) { dClass.data.defenses.light = class2.data.data.defenses.light }
if (class2.data.data.defenses.heavy > dClass.data.defenses.medium) { dClass.data.defenses.medium = class2.data.data.defenses.medium }
if (class2.data.data.defenses.heavy > dClass.data.defenses.unarmored) { dClass.data.defenses.unarmored = class2.data.data.defenses.unarmored }

//Description
dClass.data.description.value = `${dClass.data.description.value} ${class2.data.data.description.value}`;

//HP
if (class2.data.data.hp > dClass.data.hp) { dClass.data.hp = class2.data.data.hp }

//Items
Object.entries(class2.data.data.items).forEach( i => {
  if(Object.values(dClass.data.items).some(x => x.id === i[1].id)) { return }
  dClass.data.items[i[0]] = i[1];
});

//Key Ability
class2.data.data.keyAbility.value.forEach( v => {
  if (dClass.data.keyAbility.value.includes(v)) { return }
  dClass.data.keyAbility.value.push(v);
});

//Perception
if (class2.data.data.perception > dClass.data.perception) { dClass.data.perception = class2.data.data.perception }

//Rules
dClass.data.rules.push(rE);
class2.data.data.rules.forEach( r => {
  if (dClass.data.rules.includes(r)) { return }
  dClass.data.rules.push(r);
});
dClass.data.rules.forEach( (r,i) => {
  if(r.path === undefined) { return }
  const check = r.path.split('.');
  if(check.includes("data") && check.includes("martial") && check.includes("rank") && dClass.data.attacks.martial >= r.value) {
   dClass.data.rules.splice(i,1);
  }
});

//Saving Throws
if (class2.data.data.savingThrows.fortitude > dClass.data.savingThrows.fortitude) { dClass.data.savingThrows.fortitude = class2.data.data.savingThrows.fortitude }
if (class2.data.data.savingThrows.reflex > dClass.data.savingThrows.reflex) { dClass.data.savingThrows.reflex = class2.data.data.savingThrows.reflex }
if (class2.data.data.savingThrows.will > dClass.data.savingThrows.will) { dClass.data.savingThrows.will = class2.data.data.savingThrows.will }

//Skill Feat Levels
class2.data.data.skillFeatLevels.value.forEach( v => { dClass.data.skillFeatLevels.value.push(v) });
dClass.data.skillFeatLevels.value = [...new Set(dClass.data.skillFeatLevels.value)].sort((a, b) => { return a - b; });

//Skill Increase Levels
class2.data.data.skillIncreaseLevels.value.forEach( v => { dClass.data.skillIncreaseLevels.value.push(v) });
dClass.data.skillIncreaseLevels.value = [...new Set(dClass.data.skillIncreaseLevels.value)].sort((a, b) => { return a - b; });

//Trained Skills
if ( class2.data.data.trainedSkills.additional > dClass.data.trainedSkills.additional ) { dClass.data.trainedSkills.additional = class2.data.data.trainedSkills.additional }
class2.data.data.trainedSkills.value.forEach( v => {
  if (dClass.data.trainedSkills.value.includes(v)) { return }
  dClass.data.trainedSkills.value.push(v);
});

//Set the image of the Class
dClass.img = "systems/pf2e/icons/spells/guidance.webp"

Item.create(dClass);

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
