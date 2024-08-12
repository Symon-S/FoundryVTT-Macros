/*
Automates Marshal Stances
Does not work without workbench module.
*/

if (!game.modules.get('xdy-pf2e-workbench')?.active) { return ui.notifications.error('This macro requires workbench module to be installed!'); }
if (!actor || token.actor.type !== 'character') { return ui.notifications.warn("You must have a PC token selected"); }
if (canvas.tokens.controlled.length > 1) { return ui.notifications.warn("Please select the token with the Marshal Dedication"); }
if (!token.actor.itemTypes.feat.some(ms => ms.slug === "dread-marshal-stance" || ms.slug === "inspiring-marshal-stance" || ms.slug === "devrins-cunning-stance")) { return ui.notifications.warn("The actor does not possess a Marshal Stance feat"); }
const modifiers = [];
const level = token.actor.level;
let skillName,skillKey,actionSlug,actionName,choice,notes;
let buttons = {};
if (token.actor.itemTypes.feat.some(ms => ms.slug === "inspiring-marshal-stance")) { 
  buttons.ims = { label: 'Inspiring Marshal Stance', callback: () => { return 'ims' } };
}
if (token.actor.itemTypes.feat.some(ms => ms.slug === "dread-marshal-stance")) {
  buttons.dms = { label: 'Dread Marshal Stance', callback: () => { return 'dms' } };
}
if (token.actor.itemTypes.feat.some(ms => ms.slug === "devrins-cunning-stance")) { 
  buttons.dcs = { label: `Devrin's Cunning Stance`, callback: () => { return 'dcs' } };
}

if (Object.keys(buttons).length > 1) {
  let width = 400;
  if (Object.keys(buttons).length > 2 ) { width = 600 }
  choice = await Dialog.wait({
    title: 'Which Stance?',
    buttons,
    close: () => { return "close" }
  },{width});
}

if ( choice === "close" ) { return ui.notifications.warn("You did not select a stance"); }

let img = 'systems/pf2e/icons/features/feats/dread-marshal-stance.webp'
let stance = 'dmscf';
if (choice === "ims") {
  if (token.actor.itemTypes.effect.some(e => e.slug === 'imscf')) { return ui.notifications.warn('You cannot enter a marshal stance while in cooldown!'); }
  stance = 'imscf';
  img = 'systems/pf2e/icons/features/feats/inspiring-marshal-stance.webp'
  skillName = "Diplomacy";
  skillKey = "diplomacy";
  notes = [];
  actionSlug = "inspiring-marshal-stance";
  actionName = "Inspiring Marshal Stance";
  notes.push({"outcome":["success","criticalSuccess"], "selector":"diplomacy", "text":`<p>Your marshal’s aura grants you and your allies in the aura a +1 status bonus to damage rolls. When you or an ally in the aura critically hit an enemy with a Strike, that enemy is @UUID[Compendium.pf2e.conditionitems.Item.TBSHQspnbcqxsmjL]{Frightened 1}. If you’re wielding a weapon that has more than one damage die (typically due to a striking rune), you can have the status bonus equal the weapon’s number of damage dice instead of +1.</p>`});
  notes.push({"outcome":["failure"], "selector":"diplomacy", "text":`<p>You fail to enter the stance.</p>`});
  notes.push({"outcome":["criticalFailure"], "selector":"diplomacy", "text":`<p>You fail to enter the stance and can't take this action again for 1 minute.</p>`});
}
if (choice === "dms") {
  if (token.actor.itemTypes.effect.some(e => e.slug === 'dmscf')) { return ui.notifications.warn('You cannot enter a marshal stance while in cooldown!'); }
  skillName = "Intimidation";
  skillKey = "intimidation"
  notes = [];
  actionSlug = "dread-marshal-stance";
  actionName = "Dread Marshal Stance";
  notes.push({"outcome":["success","criticalSuccess"], "selector":"intimidation", "text":`<p>Your marshal’s aura grants you and your allies in the aura a +1 status bonus to damage rolls. When you or an ally in the aura critically hit an enemy with a Strike, that enemy is @UUID[Compendium.pf2e.conditionitems.Item.TBSHQspnbcqxsmjL]{Frightened 1}. If you’re wielding a weapon that has more than one damage die (typically due to a striking rune), you can have the status bonus equal the weapon’s number of damage dice instead of +1.</p>`});
  notes.push({"outcome":["failure"], "selector":"intimidation", "text":`<p>You fail to enter the stance.</p>`});
  notes.push({"outcome":["criticalFailure"], "selector":"intimidation", "text":`<p>You fail to enter the stance and can't take this action again for 1 minute.</p>`});
}
if (choice === "dcs") {
  if (token.actor.itemTypes.effect.some(e => e.slug === 'dcscf')) { return ui.notifications.warn('You cannot enter a marshal stance while in cooldown!'); }
  stance = "dcscf"
  img = "systems/pf2e/icons/spells/anticipate-peril.webp"
  skillName = "Deception";
  skillKey = "deception"
  notes = [];
  actionSlug = "devrins-cunning-stance";
  actionName = "Devrin's Cunning Stance";
  notes.push({"outcome":["success"], "selector":"deception", "text":`<p>Your @Compendium[pf2e.feat-effects.jACKRmVfr9ATsmwg]{Marshal's Aura} grants you and your allies a +1 status bonus to skill checks. When you or an ally in the aura Strike an @UUID[Compendium.pf2e.conditionitems.Item.AJh5ex99aV6VTggg] enemy, that enemy can’t use reactions until the beginning of its next turn.</p>`});
  notes.push({"outcome":["criticalSuccess"], "selector":"deception", "text":`<p>Your @Compendium[pf2e.feat-effects.jACKRmVfr9ATsmwg]{Marshal's Aura} increases to a 20-foot emanation, and it grants you and your allies a +1 status bonus to skill checks. When you or an ally in the aura Strike an @UUID[Compendium.pf2e.conditionitems.Item.AJh5ex99aV6VTggg] enemy, that enemy can’t use reactions until the beginning of its next turn.</p>`});
  notes.push({"outcome":["failure"], "selector":"deception", "text":`<p>You fail to enter the stance.</p>`});
  notes.push({"outcome":["criticalFailure"], "selector":"deception", "text":`<p>You fail to enter the stance and can't take this action again for 1 minute.</p>`});
}

const custom = await new Promise((resolve) => {
  new Dialog({
  	title: 'Custom DC?',
    buttons: {
      yes: { label: 'Yes', callback: async() => { resolve(true); } },
      no: { label: 'No', callback: async() => { resolve(false); } },
    },
    default: 'no',
    close: () => { return; }
  }).render(true);
});

const DCbyLevel = [14,15,16,18,19,20,22,23,24,26,27,28,30,31,32,34,35,36,38,39,40,42,44,46,48,50]

let DC = choice === 'dcs' ? DCbyLevel[level] : DCbyLevel[level]-2;

const options = token.actor.getRollOptions(['all', 'skill-check', skillName.toLowerCase()]);
options.push(`action:${actionSlug}`);

if (custom) { await new Promise(() => {
    new Dialog({
      title: 'Enter a custom DC',
      content: `DC:&nbsp <input id="dcinput" type="number" autofocus style="width: 25px;text-align: center;" value=''>`,
      buttons: {
        enter: { label: 'Enter', callback: (html) => { main(html); } },
        cancel: { label: 'Cancel', callback: () => { return; } },
      },
      default: 'enter',
      close: () => { return; }
    }).render(true);
  });
}

else { await SRoll(); }

async function main(html) {
  DC = parseInt(html.find("#dcinput")[0].value);
  if ( isNaN(DC) ) { return ui.notifications.warn('Please enter a numerical value for your custom DC'); }
  await SRoll();
}

async function SRoll() {
  const roll = await game.pf2e.Check.roll(
    new game.pf2e.CheckModifier(
      `<span class="pf2-icon">A</span> <b>${actionName}</b><br><p class="compact-text">${skillName } Skill Check</p>`,
	  token.actor.skills[skillKey], modifiers
    ),
    { actor: token.actor, type: 'skill-check', options, notes, flag: 'marshal-stance', dc: { value: DC }, skipDialog: true },
	null,
  );
  if (roll.options.degreeOfSuccess > 1) {
      if (choice === 'ims') {
        const effect = (await fromUuid('Compendium.pf2e.feat-effects.Item.er5tvDNvpbcnlbHQ')).toObject();
        await token.actor.createEmbeddedDocuments("Item", [effect]);
      }
      if (choice === 'dms') {
        const effect = (await fromUuid('Compendium.pf2e.feat-effects.Item.qX62wJzDYtNxDbFv')).toObject();
        await token.actor.createEmbeddedDocuments("Item", [effect]);
      }
      if(choice === 'dcs'){
        const effect = (await fromUuid('Compendium.pf2e.feat-effects.Item.kyrvZfZfzKK1vx9b')).toObject();
        effect.img = img;
        effect.system.rules.shift();
        effect.system.rules[0].radius = 10;
        if (roll.options.degreeOfSuccess === 3) { effect.system.rules[0].radius = 20; }
        effect.system.rules[0].slug = "marshal-dcs-stance";
        await token.actor.createEmbeddedDocuments("Item", [effect]);
      }
  }
  if (roll.options.degreeOfSuccess === 0) {
    const effect = {     
      type: 'effect',
      name: 'Marshal Stance Critical Failure Cooldown',
      img: img,
      system: {
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