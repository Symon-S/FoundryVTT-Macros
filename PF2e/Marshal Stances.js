/*
Automates Marshal Stances
Does not work without workbench module.
*/

if (!game.modules.get('xdy-pf2e-workbench')?.active) { return ui.notifications.error('This macro requires workbench module to be installed!'); }
if (!actor || token.actor.type !== 'character') { return ui.notifications.warn("You must have a PC token selected"); }
if (canvas.tokens.controlled.length > 1) { return ui.notifications.warn("Please select the token with the Marshal Dedication"); }
if (token.actor.itemTypes.effect.some(e => e.name === "Stance: Inspiring Marshal Stance" || e.name === "Stance: Dread Marshal Stance")) { return ui.notifications.warn("You must exit a stance to enter another");}
if (!token.actor.itemTypes.feat.some(ms => ms.slug === "dread-marshal-stance" || ms.slug === "inspiring-marshal-stance")) { return ui.notifications.warn("The actor does not possess a Marshal Stance feat"); }
const modifiers = [];
const level = token.actor.level;
let skillName,skillKey,actionSlug,actionName,choice;
if (token.actor.itemTypes.feat.some(ms => ms.slug === "dread-marshal-stance") && token.actor.itemTypes.feat.some(ms => ms.slug === "inspiring-marshal-stance")) {
  choice = await new Promise((resolve) => {
    new Dialog({
      title: 'Which Stance?',
      buttons: {
        ims: { label: 'Inspiring Marshal Stance', callback: async() => { resolve("ims"); } },
        dms: { label: 'Dread Marshal Stance', callback: async() => { resolve("dms"); } },
      }
    }).render(true);
  });
}
else if (token.actor.itemTypes.feat.some(ms => ms.slug === "dread-marshal-stance") && token.actor.itemTypes.feat.some(ms => ms.slug !== "inspiring-marshal-stance")) { choice = "dms"; }
else if (token.actor.itemTypes.feat.some(ms => ms.slug !== "dread-marshal-stance") && token.actor.itemTypes.feat.some(ms => ms.slug === "inspiring-marshal-stance")) { choice = "ims"; }

let img = 'systems/pf2e/icons/features/feats/dread-marshal-stance.webp'
let stance = 'dmscf';
if (choice === "ims") {
  if (token.actor.itemTypes.effect.some(e => e.slug === 'imscf')) { return ui.notifications.warn('You cannot enter inspiring marshal stance while in cooldown!'); }
  stance = 'imscf';
  img = 'systems/pf2e/icons/features/feats/inspiring-marshal-stance.webp'
  skillName = "Diplomacy";
  skillKey = "diplomacy";
  actionSlug = "inspiring-marshal-stance";
  actionName = "Inspiring Marshal Stance";
  if (!token.actor.itemTypes.feat.find(i => i.slug === actionSlug).system.rules.some(r => r.title === actionName)) {
    const rE1 = {"key":"PF2E.RuleElement.Note","title":`${actionName}`,"outcome":["success"], "selector":"diplomacy", "text":`<p>Your @Compendium[pf2e.feat-effects.kzEPq4aczYb6OD2h]{Marshal's Aura} grants you and allies a +1 status bonus to attack rolls and saves against mental effects.</p>`,"predicate":{"all":[`action:${actionSlug}`]}};
    const rE2 = {"key":"PF2E.RuleElement.Note","title":`${actionName}`,"outcome":["criticalSuccess"], "selector":"diplomacy", "text":`<p>Your @Compendium[pf2e.feat-effects.kzEPq4aczYb6OD2h]{Marshal's Aura} increases to 20 feet and grants you and allies a +1 status bonus to attack rolls and saves against mental effects.</p>`,"predicate":{"all":[`action:${actionSlug}`]}};
    const rE3 = {"key":"PF2E.RuleElement.Note","title":`${actionName}`,"outcome":["failure"], "selector":"diplomacy", "text":`<p>You fail to enter the stance.</p>`,"predicate":{"all":[`action:${actionSlug}`]}};
    const rE4 = {"key":"PF2E.RuleElement.Note","title":`${actionName}`,"outcome":["criticalFailure"], "selector":"diplomacy", "text":`<p>You fail to enter the stance and can't take this action again for 1 minute.</p>`,"predicate":{"all":[`action:${actionSlug}`]}};
    const data = (await fromUuid(`Actor.${token.actor.id}.Item.${token.actor.itemTypes.feat.find(x => x.slug === actionSlug).id}`)).toObject();
    data.system.rules.push(rE1,rE2,rE3,rE4);
    token.actor.updateEmbeddedDocuments("Item",[data]);
  }
}

if (choice === "dms") {
  if (token.actor.itemTypes.effect.some(e => e.slug === 'dmscf')) { return ui.notifications.warn('You cannot enter dread marshal stance while in cooldown!'); }
  skillName = "Intimidation";
  skillKey = "intimidation";
  actionSlug = "dread-marshal-stance";
  actionName = "Dread Marshal Stance";
  if (!token.actor.itemTypes.feat.find(i => i.slug === actionSlug).system.rules.some(r => r.title === actionName)) {
    const rE1 = {"title":`${actionName}`,"key":"PF2E.RuleElement.Note","outcome":["success"], "selector":"intimidation", "text":`<p>Your @Compendium[pf2e.feat-effects.KBEJVRrie2JTHWIK]{Marshal's Aura} grants you and allies a status bonus to damage rolls equal to the number of weapon damage dice of the unarmed attack or weapon you are wielding that has the most weapon damage dice. When you or an ally in the aura critically hits an enemy with a Strike, that enemy is @Compendium[pf2e.conditionitems.TBSHQspnbcqxsmjL]{Frightened 1}.</p>`,"predicate":{"all":[`action:${actionSlug}`]}};
    const rE2 = {"key":"PF2E.RuleElement.Note","title":`${actionName}`,"outcome":["criticalSuccess"], "selector":"intimidation", "text":`<p>Your @Compendium[pf2e.feat-effects.KBEJVRrie2JTHWIK]{Marshal's Aura} increases to 20 feet, and it grants you and allies a status bonus to damage rolls equal to the number of weapon damage dice of the unarmed attack or weapon you are wielding that has the most weapon damage dice. When you or an ally in the aura critically hits an enemy with a Strike, that enemy is @Compendium[pf2e.conditionitems.TBSHQspnbcqxsmjL]{Frightened 1}.</p>`,"predicate":{"all":[`action:${actionSlug}`]}};
    const rE3 = {"key":"PF2E.RuleElement.Note","title":`${actionName}`,"outcome":["failure"], "selector":"intimidation", "text":`<p>You fail to enter the stance.</p>`,"predicate":{"all":[`action:${actionSlug}`]}};
    const rE4 = {"key":"PF2E.RuleElement.Note","title":`${actionName}`,"outcome":["criticalFailure"], "selector":"intimidation", "text":`<p>You fail to enter the stance and can't take this action again for 1 minute.</p>`,"predicate":{"all":[`action:${actionSlug}`]}};
    const data = (await fromUuid(`Actor.${token.actor.id}.Item.${token.actor.itemTypes.feat.find(x => x.slug === actionSlug).id}`)).toObject();
    data.system.rules.push(rE1,rE2,rE3,rE4);
    token.actor.updateEmbeddedDocuments("Item",[data]);
  }
}

const custom = await new Promise((resolve) => {
  new Dialog({
  	title: 'Custom DC?',
    buttons: {
      yes: { label: 'Yes', callback: async() => { resolve(true); } },
      no: { label: 'No', callback: async() => { resolve(false); } },
    },
    default: 'no'
  }).render(true);
});

const DCbyLevel = [14,15,16,18,19,20,22,23,24,26,27,28,30,31,32,34,35,36,38,39,40,42,44,46,48,50]

let DC = DCbyLevel[level];

const options = `action:${actionSlug}`;

if (custom) { await new Promise((resolve) => {
    new Dialog({
      title: 'Enter a custom DC',
      content: `DC: <input id="dcinput" type="number" autofocus style="width: 50px;" value=''>`,
      buttons: {
        enter: { label: 'Enter', callback: (html) => { main(html,resolve); } },
        cancel: { label: 'Cancel', callback: () => { return; } },
      },
      default: 'enter'
    }).render(true);
  });
}

else { SRoll(); }
async function main(html) {
  DC = parseInt(html.find("#dcinput")[0].value);
  if ( isNaN(DC) ) { return ui.notifications.warn('Please enter a numerical value for your custom DC'); }
  await SRoll();
}

async function SRoll() {
  const aroll = deepClone(token.actor.skills[skillKey]);
  aroll.label = `${skillName} - ${actionName}`
  const roll = await aroll.check.roll({extraRollOptions:[options],dc:{value:DC}});
  if (roll.data.degreeOfSuccess === 2) {
    if(choice === 'dms'){
      const effect = (await fromUuid('Compendium.xdy-pf2e-workbench.xdy-pf2e-workbench-items.IkrhT9FMQDNALa8S')).toObject();
      effect.img = img;
      effect.data.rules.shift();
      effect.data.rules[0].radius = 10;
      await token.actor.createEmbeddedDocuments("Item", [effect]);
    }
    if (choice === 'ims'){
      const effect = (await fromUuid('Compendium.xdy-pf2e-workbench.xdy-pf2e-workbench-items.eGFBzz1oAd6w3GTz')).toObject();
      effect.img = img;
      effect.data.rules.shift();
      effect.data.rules[0].radius = 10;
      await token.actor.createEmbeddedDocuments("Item", [effect]);
    }
  }
  if (roll.data.degreeOfSuccess === 3) {
    if(choice === 'dms'){
      const effect = (await fromUuid('Compendium.xdy-pf2e-workbench.xdy-pf2e-workbench-items.IkrhT9FMQDNALa8S')).toObject();
      effect.img = img;
      effect.data.rules.shift();
      effect.data.rules[0].radius = 20;
      await token.actor.createEmbeddedDocuments("Item", [effect]);
    }
    if (choice === 'ims'){
      const effect = (await fromUuid('Compendium.xdy-pf2e-workbench.xdy-pf2e-workbench-items.eGFBzz1oAd6w3GTz')).toObject();
      effect.img = img;
      effect.data.rules.shift();
      effect.data.rules[0].radius = 20;
      await token.actor.createEmbeddedDocuments("Item", [effect]);
    }
  }
  if (roll.data.degreeOfSuccess === 0) {
    const effect = {     
      type: 'effect',
      name: 'Marshal Stance Critical Failure Cooldown',
      img: img,
      data: {
        slug: stance,
        tokenIcon: {
          show: true
        },       
        duration: {
          value: 1,
          unit: 'minutes',
          sustained: false,
          expiry: 'turn-end'
        }
      },
    };
    await token.actor.createEmbeddedDocuments("Item", [effect]);
  }
}
