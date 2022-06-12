const skillName = "Performance";
const skillKey = "prf";
var actionSlug = "demoralize"
var actionName = "Demoralize"
     
const modifiers = []
	// list custom modifiers for a single roll here
	//const modifiers = [
	//new game.pf2e.Modifier('Expanded Healer\'s Tools', 1, 'item')
	//];
const options = token.actor.getRollOptions(['all', 'skill-check', skillName.toLowerCase()]);
options.push(`action:${actionSlug}`); // add more traits here in new lines
//options.push(`secret`); // <--- This is what I am talking about

const notes = [...token.actor.data.data.skills[skillKey].notes]; 
notes.push({"outcome":["success"], "selector":"performance", "text": "The target becomes @Compendium[pf2e.conditionitems.Frightened]{Frightened 1}"})
notes.push({"outcome":["criticalSuccess"], "selector":"performance", "text": "The target becomes @Compendium[pf2e.conditionitems.Frightened]{Frightened 2}"})

// add more notes if necessary
// Syntax for a note: {"outcome":["success"], "selector":"performance", "text":'<p><a class="entity-link content-link" draggable="true" data-entity="Item" data-id="TSxkmgfLWwNQnAnA"> Overdrive II</a><strong>Critical Success</strong></p><p><a class="entity-link" draggable="true" data-entity="Item" data-id="MDGROvBFqiOFm8Iv"> Overdrive I</a><strong>Success</strong></p>'}//

const targetIds = game.user.targets.ids;

targetIds.forEach( async t => {
  console.log(canvas.tokens.placeables.find(i => i.id === t).actor);
  const target = canvas.tokens.placeables.find(i => i.id === t).actor;
  const willDC = target.saves.will.dc.value; 
  const roll = await game.pf2e.Check.roll(
	new game.pf2e.CheckModifier(
	  `<span class="pf2-icon">A</span> <b>${actionName}</b><br> - <p class="compact-text">${skillName } Skill Check</p>`,
	  token.actor.data.data.skills[skillKey], modifiers 
	),
	{ actor: token.actor, type: 'skill-check', options, notes, dc: { value: willDC }, skipDialog: true }, // add dc: { value: 25 } in the object to roll against a dc
	null
	//for callback: ,(Roll) => {console.log(Roll);}
  );
});
