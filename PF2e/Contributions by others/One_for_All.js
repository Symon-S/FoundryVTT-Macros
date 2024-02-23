/*
One for All
Macro rolls diplomacy as a normal Aid action (DC 15). 
Additionally, it checks if the character is a Wit Swashbuckler and the roll is sufficiently high to gain Panache.

Everything that affects the Aid action (for example, 'action:aid' predicate) or Diplomacy check, should affect this macro.

The roll is considered Panache-granting if the character is a Wit Swashbuckler 
(+1 circumstance bonus if the character has Panache already)

It will also bump the crit success bonus to +3 if the actor has the Cooperative blade held in one hand.

Respects Shift-clicking to skip roll dialog.
Automatically grants Panache.

Limitations:
* Always checks Aid DC 15
* Does not bother with targeting the ally who is being aided, effect should
just be dragged and dropped to that player
*Ideally, Aid would also be an inline macro, and would automatically apply the correct bonus based
on the level of success. I would consider this a nice-to-have, but not necessary for the core function


originally created by chazpls
rework by kromko
*/


/**
* Wrapper for the DSN Hook. If DSN is enabled, waits for the physical dice to stop rolling (unless the roll has assurance) 
*
* @param {Promise<Object>} rollPromise Promise of roll results
*/
function dsnHook(rollPromise) {
  if (game.modules.get("dice-so-nice")?.active) {
    return rollPromise.then(async results => {
      await Promise.all(results.map(r => {
        // Check if we are using assurance
        if (r.message.getFlag('pf2e', 'context.options').includes('substitute:assurance'))
          return Promise.resolve(true);
        return game.dice3d.waitFor3DAnimationByMessageID(r.message.id);
      }
      ));
      return results;
    });
  } else {
    return rollPromise;
  }
}


if (!actor) {
  return ui.notifications.warn("You must have an actor selected");
}
const oneForAll = token.actor.itemTypes.feat.find(f=>f.slug === 'one-for-all');
if (!oneForAll) {
  return ui.notifications.warn("Selected actor does not have the One for All feat");
}

const isWitSwashbuckler = actor.itemTypes.feat.some(f => f.slug === 'wit');

//The cooperative blade item bumps the crit bonus to +3 on a critical success, even if you're not a master
const holdingCooperativeBlade = token.actor.items.some((item) => { return item.slug === 'cooperative-blade' && item.system.equipped.handsHeld === 1 })


//sets the various crit bonuses for Aid, referenced in the chat output later
if (token.actor.system.skills.dip.rank === 2 && holdingCooperativeBlade) {
  critAidBonus = 3
} else if (token.actor.system.skills.dip.rank < 3) {
  critAidBonus = 2
} else {
  critAidBonus = token.actor.system.skills.dip.rank
}

let rollResult = await dsnHook(game.pf2e.actions.get('aid')
  .use({
    event,
    rollOptions: isWitSwashbuckler ? ['grants-panache'] : null,
    notes: holdingCooperativeBlade ?
      [{
        outcome: ['criticalSuccess'],
        title: 'Holding Cooperative Blade',
        text: 'You grant your ally a +3 circumstance bonus to the triggering check instead of a +2 bonus.'
      }] : null,
      statistic: 'diplomacy'
  })).then(r => r[0]);

const actorName = actor.name;
const targetName = game.user.targets.first()?.name ?? 'their ally';

let message = `<em>${actorName}</em> grants <em>${targetName}</em> `

if (rollResult.outcome === 'criticalFailure') {
  message += '<strong>-1</strong> circumstance penalty to the triggering check @UUID[Compendium.pf2e.other-effects.AHMUpMbaVkZ5A1KX].';
}
else if (rollResult.outcome === 'failure') {
  message += '<strong>no</strong> bonus to the triggering check.'
}
else {
  message += `<strong>+${rollResult.outcome === 'criticalSuccess' ? critAidBonus : 1}</strong> circumstance bonus to the triggering check @UUID[Compendium.pf2e.other-effects.AHMUpMbaVkZ5A1KX].`
}

// Check if viable for panache gain
if (isWitSwashbuckler) {
  const DCbyLevel = [14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40, 42, 44, 46, 48, 50];
  const hardDC = DCbyLevel[token.actor.system.details.level.value] + 5;

  if (rollResult.roll.total >= hardDC) {
    message += `<br><em>${actorName}</em> gets @UUID[Compendium.pf2e.feat-effects.Item.uBJsxCzNhje8m8jj].`;

    // Ownership should always be true, but just in case
    // We also check if there is a panache already, just to avoid duplicates
    if (actor.isOwner && !actor.itemTypes.effect.some(e=>e.slug ==='effect-panache')){
      let panache = await fromUuid('Compendium.pf2e.feat-effects.Item.uBJsxCzNhje8m8jj');
      await actor.createEmbeddedDocuments("Item", [panache]);
    }
  }
}

ChatMessage.create({
  user: game.user.id,
  type: CONST.CHAT_MESSAGE_TYPES.OTHER,
  content: `<strong>${oneForAll.name}</strong><hr /><p>${message}</p>`,
  speaker: ChatMessage.getSpeaker(),
});
