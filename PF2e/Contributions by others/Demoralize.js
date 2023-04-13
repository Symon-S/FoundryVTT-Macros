/*
Demoralize
This macro will make an intimidation check vs the target.

This Macro works just like the system's Demoralize macro, except for the following additions:
* Link the 10 minutes Demoralize immnunity
* Check if the target is immune
* Check the 30ft range limit
* -4 if no Language is shared
* Intimidating Glare support
* Terrified Retreat support (Base macro does that also)

Limitations:
* Does not handle assurance.
* Does not handle NOTES

created with the help of chatgpt by darkium
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
  

if (canvas.tokens.controlled.length !== 1){
    ui.notifications.warn('You need to select exactly one token to perform Demoralize.');
} else if (game.user.targets.size < 1){
    ui.notifications.warn(`You must target at least one token.`);
} else {
    
    /**
     * Check if any itemType equipment of the actor matches a slug (and optionally checks in how many hands it is held)
     *
     * @param {string} slug Slug of the equipment to search
     * @param {int} hands Number of hands the item shall be held
     * @returns {boolean} true if the actor has a matching item equipment
     */
    const checkItemPresent = (slug, hands) =>
        token.actor.itemTypes.equipment.some(
            (equipment) => equipment.slug === slug && (!hands || equipment.handsHeld === hands)
        );
    
    /**
     * Check wether the current actor has a feature.
     *
     * @param {string} slug
     * @returns {boolean} true if the feature exists, false otherwise
     */
    const checkFeat = (slug) =>
        token.actor.items
            .filter((item) => item.type === 'feat')
            .some((item) => item.slug === slug);
  

    const skillName = "Intimidation";
    const skillKey = "itm";
    const actionSlug = "Demoralize"
    const actionName = "Demoralize"
    
    const modifiers = []

    const hasIntimidatingGlare = checkFeat("intimidating-glare");
    const hasTerrifiedRetreat = checkFeat("terrified-retreat");

    const terrifiedRetreatMessage = hasTerrifiedRetreat ? ", is fleeing for 1 round" : "";
    // notes are not working for the roll currently. 
    // const notes = [...token.actor.system.skills[skillKey].notes]; // add more notes if necessary
    const notes = [];

    const options = actor.getRollOptions(['all', 'skill-check', 'demoralize', 'action:' + actionSlug]);
    const traits = ['concentrate', 'emotion', 'fear', 'mental'];
    traits.forEach(traits => {
        options.push(traits);
    });
    
    if (hasIntimidatingGlare) {
        options.push(`visual`);
    } else {
        options.push(`auditory`);
    }

    const languages = token.actor.system.traits.languages.value;

    const immunityEffect = {
        type: 'effect',
        name: 'Demoralize Immunity',
        img: 'systems/pf2e/icons/spells/blind-ambition.webp',
        system: {
          tokenIcon: {
              show: true
          },       
          duration: {
              value: 10,
              unit: 'minutes',
              sustained: false,
              expiry: 'turn-start'
          },
          rules: [],
        },
      };
    
    for(let target of game.user.targets){
        let targetActor = target.actor;
        
        let distance = canvas.grid.measureDistance(token, target);

        if (distance > 30) {
            ui.notifications.warn(`${targetActor.name} is out of range.`);
            continue;
        } else {

            const targetLanguages = targetActor.system.traits.languages.value;
            if (!hasIntimidatingGlare && !targetLanguages.some((lang) => languages.includes(lang))) {
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
                ui.notifications.warn(targetActor.name + ` is currently immune to ${actionName} by ` + token.name);
                continue;
            }

            if (game.modules.has('xdy-pf2e-workbench') && game.modules.get('xdy-pf2e-workbench').active) { 
                // Extract the Macro ID from the asynomous benefactor macro compendium.
                const macroName = `Demoralize Immunity CD`;
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
                    token.actor.system.skills[skillKey], modifiers),
                { actor: token.actor, type: 'skill-check', options, notes, dc: { value: targetWillDC } }, //for DC insert: , dc: {value: 30}
                event,
                async (roll) => {
                    if (roll.degreeOfSuccess === 3) {
                        // crit success message
                        dsnHook(() => {
                            ChatMessage.create({
                                user: game.user.id,
                                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                                flavor: `<strong>Critical Success</strong><br> <strong>${target.name}</strong> becomes @UUID[Compendium.pf2e.conditionitems.TBSHQspnbcqxsmjL]{Frightened 2}${terrifiedRetreatMessage} and ${immunityMessage}`,
                                speaker: ChatMessage.getSpeaker(),
                                flags: {
                                    "demoralize": {
                                        id: target.id,
                                        dos: roll.degreeOfSuccess,
                                        demoId: token.actor.id,
                                        tr: hasTerrifiedRetreat,
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
                                flavor: `<strong>Success</strong><br> <strong>${target.name}</strong> becomes @UUID[Compendium.pf2e.conditionitems.TBSHQspnbcqxsmjL]{Frightened 1} and ${immunityMessage}`,
                                speaker: ChatMessage.getSpeaker(),
                                flags: {
                                    "demoralize": {
                                        id: target.id,
                                        dos: roll.degreeOfSuccess,
                                        demoId: token.actor.id,
                                        tr: false,
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
                                flavor: `<strong>Failure</strong><br>You fail to demoralize ${target.name} and nothing happens. <strong>${target.name}</strong> ${immunityMessage}`,
                                speaker: ChatMessage.getSpeaker(),
                                flags: {
                                    "demoralize": {
                                        id: target.id,
                                        dos: roll.degreeOfSuccess,
                                        demoId: token.actor.id,
                                        tr: false,
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
                                flavor: `<strong>Critical Failure</strong><br>You fail to demoralize ${target.name} and nothing happens. <strong>${target.name}</strong> ${immunityMessage}`,
                                speaker: ChatMessage.getSpeaker(),
                                flags: {
                                    "demoralize": {
                                        id: target.id,
                                        dos: roll.degreeOfSuccess,
                                        demoId: token.actor.id,
                                        tr: false,
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