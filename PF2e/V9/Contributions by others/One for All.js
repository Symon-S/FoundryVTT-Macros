/* By Tikael with snippets of code by Drental */

if (!actor) {
  ui.notifications.warn("You must have an actor selected");
} else {
  const skillName = "Diplomacy";
  const skillKey = "dip";
  const actionSlug = "aid"
  const actionName = "One for All"

  const modifiers = []
  // list custom modifiers for a single roll here
  //const modifiers = [
  //new game.pf2e.Modifier('Expanded Healer\'s Tools', 1, 'item')
  //];
  
  let DCbyLevel = [14,15,16,18,19,20,22,23,24,26,27,28,30,31,32,34,35,36,38,39,40,42,44,46,48,50]

  let DC = DCbyLevel[token.actor.data.data.details.level.value] + 5

  const notes = [...token.actor.data.data.skills[skillKey].notes]; // add more notes if necessary
    
    // Syntax for a note: {"outcome":[], "selector":"crafting", "text":'<p><a class="entity-link" draggable="true" data-entity="Item" data-id="TSxkmgfLWwNQnAnA"> Overdrive II</a><strong>Critical Success</strong></p><p><a class="entity-link" draggable="true" data-entity="Item" data-id="MDGROvBFqiOFm8Iv"> Overdrive I</a><strong>Success</strong></p>'}

  const options = token.actor.getRollOptions(['all', 'skill-check', skillName.toLowerCase()]);
  options.push(`action:${actionSlug}`); // add more traits here in new lines
  // options.push(`secret`); // <--- This is what I am talking about
  
  game.pf2e.Check.roll(
    new game.pf2e.CheckModifier(
      `<span class="pf2-icon">A</span> <b>${actionName}</b> - <p class="compact-text">${skillName } Skill Check</p>`,
      token.actor.data.data.skills[skillKey], modifiers ),
      { actor: token.actor, type: 'skill-check', options, notes, dc: { value: DC } }, // add dc: { value: 25 } in the object to roll against a dc
      event
      //for callback: ,(Roll) => {console.log(Roll);}
  );
}
