/*
Evangelize
This macro will make an diplomacy check vs the target.

This Macro works similar the system's Demoralize macro, except for the following additions:
* Check if the actor has the skill
* Link the 24 hours Evangelize immunity
* Check if the target is immune
* Immune if no Language is shared

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

if (!token.actor.itemTypes.feat.some(ms => ms.slug === "evangelize")) { return ui.notifications.warn("The actor does not possess the Evangelize feat"); }
if (canvas.tokens.controlled.length !== 1){
    ui.notifications.warn('You need to select exactly one token to perform Evangelize.');
} else if (game.user.targets.size < 1){
    ui.notifications.warn(`You must target at least one token.`);
} else {
    const skillName = "Diplomacy";
    const skillKey = "diplomacy";
    const actionSlug = "evangelize"
    const actionName = "Evangelize"
    
    const modifiers = []

    // notes are not working for the roll currently. 
    // const notes = [...token.actor.system.skills[skillKey].notes]; // add more notes if necessary
    const notes = [];

    const options = actor.getRollOptions(['all', 'skill-check', 'action:' + actionSlug]);
    const traits = ['auditory', 'general', 'linguistic', 'mental', 'skill'];
    traits.forEach(traits => {
        options.push(traits);
    });

    const languages = token.actor.system.traits.languages.value;

    const immunityEffect = {
        type: 'effect',
        name: 'Evangelize Immunity',
        img: 'systems/pf2e/icons/spells/blind-ambition.webp',
        system: {
          tokenIcon: {
              show: true
          },       
          duration: {
              value: '24',
              unit: 'hours',
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

        const targetLanguages = targetActor.system.traits.languages.value;
        if (!targetLanguages.some((lang) => languages.includes(lang))) {
            ui.notifications.warn(`${nameForNotifications} doesn't understand your language.`);
            continue;
        } else {

            immunityEffect.name = `${actionName} by ${token.name}`;
            console.log(immunityEffect.name);

            // check if the person being evangelized is currently immune.
            var isImmune = targetActor.itemTypes.effect.find(obj => {
                return obj.name === immunityEffect.name
            });
            if (isImmune) {
                ui.notifications.warn(nameForNotifications + ` is currently immune to ${actionName} by ` + token.name);
                continue;
            }

            if (game.modules.has('xdy-pf2e-workbench') && game.modules.get('xdy-pf2e-workbench').active) { 
                // Extract the Macro ID from the asynomous benefactor macro compendium.
                const macroName = `Evangelize Immunity CD`;
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
                                flavor: `<strong>Critical Success</strong><br> <strong>${nameForChatMessage}</strong> becomes @UUID[Compendium.pf2e.conditionitems.Item.e1XGnhKNSQIm5IXg]{Stupefied 2} for 1 round and ${immunityMessage}`,
                                speaker: ChatMessage.getSpeaker(),
                                flags: {
                                    "evangelize": {
                                        id: target.id,
                                        dos: roll.degreeOfSuccess,
                                        evangelizeId: token.actor.id,
                                        evangelizeName: token.name,
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
                                flavor: `<strong>Success</strong><br> <strong>${nameForChatMessage}</strong> becomes @UUID[Compendium.pf2e.conditionitems.Item.e1XGnhKNSQIm5IXg]{Stupefied 2} for 1 round and ${immunityMessage}`,
                                speaker: ChatMessage.getSpeaker(),
                                flags: {
                                    "evangelize": {
                                        id: target.id,
                                        dos: roll.degreeOfSuccess,
                                        evangelizeId: token.actor.id,
                                        evangelizeName: token.name,
                                    }
                                }
                            });
                        });
                    } else if (roll.degreeOfSuccess === 1 || roll.degreeOfSuccess === 0) {
                        // Fail message
                        dsnHook(() => {
                            ChatMessage.create({
                                user: game.user.id,
                                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                                flavor: `<strong>Success</strong><br> <strong>${nameForChatMessage}</strong> is unaffected.${immunityMessage}`,
                                speaker: ChatMessage.getSpeaker(),
                                flags: {
                                    "evangelize": {
                                        id: target.id,
                                        dos: roll.degreeOfSuccess,
                                        evangelizeId: token.actor.id,
                                        evangelizeName: token.name,
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
