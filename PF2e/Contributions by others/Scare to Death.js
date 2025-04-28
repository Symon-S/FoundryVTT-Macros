/*
Scare to Death
This macro will make an intimidation check vs the target.

This Macro works just like the system's Demoralize macro, except for the following additions:
* Check if the actor has the skill
* Link the 1 minutes Scare to Death immunity
* Check if the target is immune
* Check the 30ft range limit
* -4 if no Language is shared

Limitations:
* Does not handle assurance.
* Does not handle NOTES

created with the help of demoralize macro written by darkium
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

if (!token.actor.itemTypes.feat.some(ms => ms.slug === "scare-to-death")) { return ui.notifications.warn("The actor does not possess a Scare to Death feat"); }
if (canvas.tokens.controlled.length !== 1){
    ui.notifications.warn('You need to select exactly one token to perform Scare to Death.');
} else if (game.user.targets.size < 1){
    ui.notifications.warn(`You must target at least one token.`);
} else {
    const skillName = "Intimidation";
    const skillKey = "intimidation";
    const actionSlug = "scare-to-death"
    const actionName = "Scare to Death"
    
    const modifiers = []

    // notes are not working for the roll currently. 
    // const notes = [...token.actor.system.skills[skillKey].notes]; // add more notes if necessary
    const notes = [];

    const options = actor.getRollOptions(['all', 'skill-check', 'action:' + actionSlug]);
    const traits = ['general', 'emotion', 'fear', 'incapacitation', 'skill'];
    traits.forEach(traits => {
        options.push(traits);
    });
    //adding the auditory trait as you are speaking out loud to get the effect    
    options.push(`auditory`);

    const languages = token.actor.system.details.languages.value;

    const immunityEffect = {
        type: 'effect',
        name: 'Scare to Death Immunity',
        img: 'systems/pf2e/icons/spells/blind-ambition.webp',
        system: {
          tokenIcon: {
              show: true
          },       
          duration: {
              value: '10',
              unit: 'rounds',
              sustained: false,
              expiry: 'turn-start'
          },
          rules: [],
        },
      };

    const alwaysShowName = !game.settings.get("pf2e", "metagame_tokenSetsNameVisibility");
    for(let target of game.user.targets){
        let targetActor = target.actor;
        const showName = alwaysShowName || target.document.playersCanSeeName;

        const nameForNotifications = showName ? target.name : 'Unknown';
        const nameForChatMessage = showName ? target.name : `Unknown <span data-visibility="gm">(${target.name})</span>`;

        let distance = token.distanceTo(target);

        if (distance > 30) {
            ui.notifications.warn(`${nameForNotifications} is out of range.`);
            continue;
        } else {

            const targetLanguages = targetActor.system.details.languages.value;
            if (!targetLanguages.some((lang) => languages.includes(lang))) {
                langMod = new game.pf2e.Modifier({ label: "Language barrier", modifier: -4, type: "circumstance" })
                modifiers.push(langMod);
            }

            immunityEffect.name = `${actionName} by ${token.name}`;
            console.log(immunityEffect.name);

            // check if the person being demoralized is currently immune.
            var isImmune = targetActor.itemTypes.effect.find(obj => {
                return obj.name === immunityEffect.name
            });
            if (isImmune) {
                ui.notifications.warn(nameForNotifications + ` is currently immune to ${actionName} by ` + token.name);
                continue;
            }

            if (game.modules.has('xdy-pf2e-workbench') && game.modules.get('xdy-pf2e-workbench').active) { 
                // Extract the Macro ID from the asynomous benefactor macro compendium.
                const macroName = `StD Immunity CD`;
                const macroId = (await game.packs.get('xdy-pf2e-workbench.asymonous-benefactor-macros')).index.find(n => n.name === macroName)?._id;
                immunityMacroLink = `@Compendium[xdy-pf2e-workbench.asymonous-benefactor-macros.${macroId}]{Click to apply all effects}`
            } else {
                ui.notifications.warn(`Workbench Module not active! Linking Immunity effect Macro not possible.`);
            }
            const immunityMessage = `is now immune to ${immunityEffect.name} for ${immunityEffect.system.duration.value} ${immunityEffect.system.duration.unit}.<br>${immunityMacroLink}`;
            const targetWillDC = targetActor.system.saves.will.dc;
            
            // -----------------------

            game.pf2e.Check.roll(
                new game.pf2e.CheckModifier(
                    `<span class="pf2-icon">A</span> <b>${actionName}</b> - <p class="compact-text">${skillName} Skill Check</p>`,
                    token.actor.skills[skillKey], modifiers),
                { actor: token.actor, type: 'skill-check', options, notes, dc: { value: targetWillDC } }, //for DC insert: , dc: {value: 30}
                event,
                async (roll) => {
                    if (roll.degreeOfSuccess === 3) {
                        // crit success message
                        dsnHook(() => {
                            ChatMessage.create({
                                user: game.user.id,
                                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                                flavor: `<strong>Critical Success</strong><br> <strong>${nameForChatMessage}</strong> must make a @Check[type:fortitude|dc:resolve(@actor.skills.intimidation.dc.value)|traits:death,incapacitation], on a critical failure it dies. Otherwise it becomes @UUID[Compendium.pf2e.conditionitems.Item.TBSHQspnbcqxsmjL]{Frightened 2} and is @UUID[Compendium.pf2e.conditionitems.Item.sDPxOjQ9kx2RZE8D]{Fleeing} for 1 round; it suffers no effect on a critical success. <strong>${nameForChatMessage}</strong> ${immunityMessage}`,
                                speaker: ChatMessage.getSpeaker(),
                                flags: {
                                    "scaretodeath": {
                                        id: target.id,
                                        dos: roll.degreeOfSuccess,
                                        stdId: token.actor.id,
                                        stdName: token.name,
                                        fleeing: true
                                    }
                                }
                            });
                        });
                    } else if (roll.degreeOfSuccess === 2) {
                        // success message
                        dsnHook(() => {
                            ChatMessage.create({
                                user: game.user.id,
                                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                                flavor: `<strong>Success</strong><br> <strong>${nameForChatMessage}</strong> becomes @UUID[Compendium.pf2e.conditionitems.TBSHQspnbcqxsmjL]{Frightened 2} and ${immunityMessage}`,
                                speaker: ChatMessage.getSpeaker(),
                                flags: {
                                    "scaretodeath": {
                                        id: target.id,
                                        dos: roll.degreeOfSuccess,
                                        stdId: token.actor.id,
                                        stdName: token.name,
                                    }
                                }
                            });
                        });
                    } else if (roll.degreeOfSuccess === 1) {
                        // Fail message
                        dsnHook(() => {
                            ChatMessage.create({
                                user: game.user.id,
                                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                                flavor: `<strong>Success</strong><br> <strong>${nameForChatMessage}</strong> becomes @UUID[Compendium.pf2e.conditionitems.TBSHQspnbcqxsmjL]{Frightened 1} and ${immunityMessage}`,
                                speaker: ChatMessage.getSpeaker(),
                                flags: {
                                    "scaretodeath": {
                                        id: target.id,
                                        dos: roll.degreeOfSuccess,
                                        stdId: token.actor.id,
                                        stdName: token.name,
                                    }
                                }
                            });
                        });
                    } else if (roll.degreeOfSuccess === 0) {
                        // crit fail 
                        dsnHook(() => {
                            ChatMessage.create({
                                user: game.user.id,
                                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                                flavor: `<strong>Critical Failure</strong><br>You fail to scare ${nameForChatMessage} to death and nothing happens. <strong>${nameForChatMessage}</strong> ${immunityMessage}`,
                                speaker: ChatMessage.getSpeaker(),
                                flags: {
                                    "scaretodeath": {
                                        id: target.id,
                                        dos: roll.degreeOfSuccess,
                                        stdId: token.actor.id,
                                        stdName: token.name,
                                    }
                                }
                            });
                        });
                    }
                },
            );
        }
    }
}