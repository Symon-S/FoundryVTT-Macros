/*
One for All
Macro rolls diplomacy as an Aid check and checks against both DCs - the one for
gaining Panache, and the actual Aid check (DC 20)

The macro should take into account any bonuses the actor has to Aid checks, such
as cooperative nature, as long as those are set up with rules to target the aid Slug

It will also bump the crit success bonus to +3 if the actor has the Cooperative blade
held in one hand.

Limitations:
* Always checks Aid DC 20
* Does not bother with targeting the ally who is being aided, effect should
just be dragged and dropped to that player
* It would be nice if this could have an inline macro that applied panache instead
of just a drag + drop. I've done this on my personal version of the macro, but it
was simple to do because I already had a Panache macro to reference. None exists by default
*Ideally, Aid would also be an inline macro, and would automatically apply the correct bonus based
on the level of success. I would consider this a nice-to-have, but not necessary for the core function

created with the questionable help of chatgpt and by chazpls, and by referencing
the Demoralize macro by darkium
*/


/**
* Wrapper for the DSN Hook. It will only use the hook if the non-buggy setting is not enabled.
*
* @param {Object} code code which will be executed
*/
function dsnHook(code) {
    if (game.modules.get("dice-so-nice")?.active && !game.settings.get("dice-so-nice", "immediatelyDisplayChatMessages") && !game.modules.get("df-manual-rolls")?.active) {
      Hooks.once('diceSoNiceRollComplete', code);
    } else {
      code();
    }
  }


if (!actor) {
  ui.notifications.warn("You must have an actor selected");
} else if (!(token.actor.items.some((item) => { return item.slug === 'one-for-all' }))) {
  ui.notifications.warn("Selected actor does not have the One for All feat");
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

  let DC = DCbyLevel[token.actor.system.details.level.value] + 5

//The cooperative blade item bumps the crit bonus to +3 on a critical success, even if you're not a master
  const holdingCooperativeBlade = token.actor.items.some((item) => { return item.slug === 'cooperative-blade' && item.system.equipped.handsHeld === 1 })

//sets the various crit bonuses for Aid, referenced in the chat output later
  if (token.actor.system.skills[skillKey].rank === 2 && holdingCooperativeBlade) {
    critAidBonus = 3
  } else if (token.actor.system.skills[skillKey].rank < 3) {
    critAidBonus = 2
  } else {
    critAidBonus = token.actor.system.skills[skillKey].rank
  }

  //const notes = [...token.actor.system.skills[skillKey].notes]; // add more notes if necessary
    // Syntax for a note: {"outcome":[], "selector":"crafting", "text":'<p><a class="entity-link" draggable="true" data-entity="Item" data-id="TSxkmgfLWwNQnAnA"> Overdrive II</a><strong>Critical Success</strong></p><p><a class="entity-link" draggable="true" data-entity="Item" data-id="MDGROvBFqiOFm8Iv"> Overdrive I</a><strong>Success</strong></p>'}
  const options = token.actor.getRollOptions(['all', 'skill-check', skillName.toLowerCase()]);
  options.push(`action:${actionSlug}`); // add more traits here in new lines
  // options.push(`secret`); // <--- This is what I am talking about
  game.pf2e.Check.roll(
    new game.pf2e.CheckModifier(
      `<span class="pf2-icon">R</span> <b>${actionName}</b> - <p class="compact-text">${skillName } Skill Check</p>`,
      token.actor.system.skills[skillKey], modifiers ), {
        actor: token.actor,
        type: 'skill-check',
        options,
    //    notes,
        dc: {
          value: DC
            }
          }, // add dc: { value: 25 } in the object to roll against a dc
      event,
      async (roll) => {
        //First check vs DC 20 and 30 for success and crit success on Aid and set a flavor message for chat
          if (roll.total >= 30) {
            aidText = `<strong>@UUID[Compendium.pf2e.other-effects.AHMUpMbaVkZ5A1KX]{Effect: Aid}: Critical Success</strong><br> Your ally receives +${critAidBonus} to their next check </br></br> `
          } else if (roll.total >= 20) {
            aidText = `<strong>@UUID[Compendium.pf2e.other-effects.AHMUpMbaVkZ5A1KX]{Effect: Aid}: Success</strong><br> Your ally receives +1 to their next check </br></br> `
          } else if (roll.total < 20) {
            aidText = `<strong>@UUID[Compendium.pf2e.other-effects.AHMUpMbaVkZ5A1KX]{Effect: Aid}: Failure</strong><br> You have trouble communicating over the din of battle. </br></br>`
          }
          //On an actual nat 20 roll, this is handled separately since the bonus may not be above 30.
          //Since wit swashbucklers are automatically trained in Diplomacy, it is impossible for this check to be
          //anything other than a critical success on both the panache and the Aid
          if (roll.degreeOfSuccess === 3) {
              // crit success message
              dsnHook(() => {
                  ChatMessage.create({
                      user: game.user.id,
                      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                      flavor: `<strong>@UUID[Compendium.pf2e.other-effects.AHMUpMbaVkZ5A1KX]{Effect: Aid}: Critical Success</strong><br> Your ally receives +${critAidBonus} to their next check </br></br> You gain @UUID[Compendium.pf2e.feat-effects.uBJsxCzNhje8m8jj]{Panache} as your words inspire your allies!`,
                      speaker: ChatMessage.getSpeaker(),
                      flags: {
                          "aid": {
                          }
                      }
                  });
              });
          } else if (roll.degreeOfSuccess === 2) {
              // regular success message
              dsnHook(() => {
                  ChatMessage.create({
                      user: game.user.id,
                      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                      flavor: `${aidText}You gain @UUID[Compendium.pf2e.feat-effects.uBJsxCzNhje8m8jj]{Panache} as your words inspire your allies!`,
                      speaker: ChatMessage.getSpeaker(),
                      flags: {
                          "aid": {
                          }
                      }
                  });
              });
              //failure message
          } else if (roll.degreeOfSuccess === 1) {
            dsnHook(() => {
                ChatMessage.create({
                    user: game.user.id,
                    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                    speaker: ChatMessage.getSpeaker(),
                    flavor: `${aidText}Your ally appreciates the support, but your words lack a certain je ne sais quoi. <strong>You do not gain Panache.</strong>`,
                    flags: {
                        "aid": {
                        }
                    }
                });
            });

            //handling for Natural 1s separately, since with very high bonuses there are a few special use cases
          } else if (roll.degreeOfSuccess === 0 && roll.total >= 30) {
            dsnHook(() => {
                ChatMessage.create({
                    user: game.user.id,
                    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                    flavor: `<strong>@UUID[Compendium.pf2e.other-effects.AHMUpMbaVkZ5A1KX]{Effect: Aid}: Success</strong><br> Ally receives +1 to their next check </br></br> Your ally appreciates the support, but your words lack a certain je ne sais quoi. <strong>You do not gain Panache.</strong>`,
                    speaker: ChatMessage.getSpeaker(),
                    flags: {
                        "aid": {
                        }
                    }
                });
            });
          } else if (roll.degreeOfSuccess === 0 && roll.total >= 20) {
            dsnHook(() => {
                ChatMessage.create({
                    user: game.user.id,
                    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                    flavor: `<strong>Aid: Failure</strong><br> You have trouble communicating over the din of battle. </br></br> <strong>You do not gain Panache.</strong>`,
                    speaker: ChatMessage.getSpeaker(),
                    flags: {
                        "aid": {
                        }
                    }
                });
            });
          } else if (roll.degreeOfSuccess === 0 && roll.total < 20) {
            dsnHook(() => {
                ChatMessage.create({
                    user: game.user.id,
                    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                    flavor: `<strong>@UUID[Compendium.pf2e.other-effects.AHMUpMbaVkZ5A1KX]{Effect: Aid}: Critial Failure</strong><br> Your words of encouragement distract your ally. They take a -1 to the check. </br></br> <strong>You do not gain Panache.</strong>`,
                    speaker: ChatMessage.getSpeaker(),
                    flags: {
                        "aid": {
                        }
                    }
                });
            });
          }
      },
// ,(Roll) => {console.log(Roll);}
  );
}
