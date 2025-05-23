/* eslint-disable no-undef */
/*
Originally contributed by Mother of God.
Updated and maintained by darkim.
This Macro works just like the system's Treat Wounds macro, except for the following additions:
- Adds Battle Medicine integration
- Checks for targets and immunities of targets
- Provides option for applying the immunity effect to the healed target
- Adds the ability to roll with assurance
- Shows the assurance roll result during option selection
- Adds automated godless healing integration
- Adds Forensic Medicine integration
- Shows the Medic Dedication healing bonus during option selection
- Shows tooltips for many of the options during option selection
- Removes any skill that is not applicable if you have Chirurgeon and/or Natural Medicine (if you don't have medicine trained)
- Fires off a warning notification if Medicine is not trained and you do not possess a feat/feature that allows you to roll a different skill.
- Adds the ability to use the macro with clever improviser.
- Checks if the Healer is having healer's tools in the inventory.
- Provide information to the user that Expanded Healer's Tools have to be held with 2h to gain it's bonus.
- Supports the Spell Stitcher feat from Magus+.
- Adds automated robust health integration
- Fix for Foundry 6.7.2 (removes alternate dc support)
- Makes sure circumstance bonuses for robust health and medic dedication do not stack
- Improved support for Chirurgeon, Natural Medicine and Spellstitcher
- Add support for Proficiency Without Level
- Add support for Right-Hand Blood
- Removed use of non-existant 'apply immunity' macros
- Re-enabled enforcing that healing toolkit etc is held
- Disallow Treat Wounds in combat
*/

/**
 * Check wether the current actor has a feature.
 *
 * @param {string} slug
 * @returns {boolean} true if the feature exists, false otherwise
 */
const checkFeat = (slug) => token.actor.items.filter((item) => item.type === "feat").some((item) => item.slug === slug);

/**
 * Check if any itemType feat of the actor matches a slug (and optionally a name)
 *
 * @param {string} slug Slug of the feature to search
 * @param {string} name Optional name of the feature
 * @returns {boolean} true if the actor has a matching item feat
 */
const checkItemTypeFeat = (slug, name) =>
    token.actor.itemTypes.feat.some((feat) => feat.slug === slug && (!name || feat.name === name));

/**
 * Check if any itemType equipment of the actor matches a slug (and optionally checks in how many hands it is held)
 *
 * @param {string} slug Slug of the equipment to search
 * @param {int} hands Number of hands the item shall be held
 * @returns {boolean} true if the actor has a matching item equipment
 */
const checkItemPresent = (slug, hands) =>
    token.actor.itemTypes.equipment.some(
        (equipment) => equipment.slug === slug && (!hands || equipment.handsHeld === hands),
    );

/**
 * Wrapper for the DSN Hook. It will only use the hook if the non-buggy setting is not enabled.
 *
 * @param {Object} code code which will be executed
 */
function dsnHook(code) {
    if (
        game.modules.get("dice-so-nice")?.active &&
        !game.settings.get("dice-so-nice", "immediatelyDisplayChatMessages") &&
        game.user.getFlag("dice-so-nice", "settings.enabled") &&
        !game.modules.get("df-manual-rolls")?.active
    ) {
        Hooks.once("diceSoNiceRollComplete", code);
    } else {
        code();
    }
}

/**
 * Retrieve roll options for treating wounds.
 *
 * @param {Object} options - Options for determining the roll.
 * @param {boolean} options.isRiskySurgery - Whether risky surgery applies.
 * @param {boolean} options.isRightHandBlood - Whether right-hand blood applies.
 *
 * @returns {string[]} - Array of roll options.
 */
function getRollOptions({ isRiskySurgery, isRightHandBlood } = {}) {
    const options = [...token.actor.getRollOptions(["all", "skill-check", "medicine"]), "action:treat-wounds"];

    if (isRiskySurgery) {
        options.push("risky-surgery");
    }
    if (isRightHandBlood) {
        options.push("right-hand-blood");
    }
    return options;
}

/* Get DamageRoll */
const DamageRoll = CONFIG.Dice.rolls.find((R) => R.name === "DamageRoll");
const CheckRoll = CONFIG.Dice.rolls.find((R) => R.name === "CheckRoll");

/* Set DCs */
const normalDC = 15;
const expertDC = 20;
const masterDC = game.pf2e?.settings?.variants?.pwol?.enabled ? 25 : 30;
const legendaryDC = game.pf2e?.settings?.variants?.pwol?.enabled ? 30 : 40;

/**
 * Get the formula for healing and the success label
 *
 * @param {Object} options
 * @param {0|1|2|3} options.success Level of success
 * @param {boolean} options.useMagicHands Actor uses the feat magic-hands
 * @param {boolean} options.useMortalHealing Actor uses the feat mortal healing
 * @param {boolean} options.isRiskySurgery Actor uses the feat risky surgery
 * @param {boolean} options.isRightHandBlood Actor uses the feat right-hand blood
 * @param {string} options.bonusString Bonus String for this throw
 * @param {number} options.spellStitcherBonus Extra healing received from Spell Stitcher (Magus+)
 * @returns {{healFormula: string, successLabel: string}} Dice heal formula and success label
 */
const getHealSuccess = ({
    success,
    useMagicHands,
    useMortalHealing,
    isRiskySurgery,
    isRightHandBlood,
    bonusString,
    spellStitcherBonus,
}) => {
    let healFormula;
    let successLabel;
    switch (success) {
        case 0:
            healFormula = "1d8";
            successLabel = "Critical Failure";
            break;
        case 1:
            successLabel = "Failure";
            break;
        case 2:
            if (isRiskySurgery) {
                healFormula = useMagicHands ? `4d10${bonusString}` : `4d8${bonusString}`;
                successLabel = "Success with risky surgery";
            } else if (useMortalHealing) {
                // Mortal Healing (can't have a deity) + Magic Hands (must have a deity) is not possible.
                healFormula = `4d8${bonusString}`;
                successLabel = "Success with mortal healing";
            } else {
                healFormula = useMagicHands ? `2d10${bonusString}` : `2d8${bonusString}`;
                successLabel = "Success";
            }
            if (spellStitcherBonus > 0) {
                healFormula += `+${spellStitcherBonus}`;
            }
            break;
        case 3:
            healFormula = useMagicHands ? `4d10${bonusString}` : `4d8${bonusString}`;
            if (spellStitcherBonus > 0) {
                healFormula += `+${2 * spellStitcherBonus}`;
            }
            successLabel = "Critical Success";
            break;
        default:
            ui.notifications.warn(`Success value of ${success} is not defined.`);
    }
    return {
        healFormula,
        successLabel,
    };
};

/**
 * Perform a roll on treating wounds
 *
 * @param {Object} options
 * @param {number} options.DC
 * @param {number} options.bonus Bonus on this roll
 * @param {number} options.med Medical skill
 * @param {boolean} options.isRiskySurgery Is a risky surgery
 * @param {boolean} options.useMortalHealing Uses mortal healing
 * @param {boolean} options.assurance Has assurance
 * @param {number} options.bmtw bmtw
 * @param {Object} options.target current target
 * @param {Object} options.immunityEffect the immunity effect
 * @param {number} options.spellStitcherBonus The bonus healing received from Spell Stitcher (Magus+)
 */
const rollTreatWounds = async ({
    DC,
    bonus,
    skillUsed,
    isRiskySurgery,
    isRightHandBlood,
    useMortalHealing,
    useMagicHands,
    assurance,
    bmtw,
    target,
    immunityEffect,
    usedBattleMedicsBaton,
    spellStitcherBonus,
    immunityMacroLink,
}) => {
    const dc = {
        value: DC,
        visibility: "all",
    };
    if (isRiskySurgery || useMortalHealing) {
        dc.modifiers = {
            success: "one-degree-better",
        };
    }
    const bonusString = bonus > 0 ? ` + ${bonus}` : "";
    const immunityMessage = `<strong>${target.name}</strong> is now immune to ${immunityEffect.name} for ${immunityEffect.system.duration.value} ${immunityEffect.system.duration.unit}.<br>${immunityMacroLink}`;

    if (assurance) {
        const aroll = await new CheckRoll(
            `10 + ${skillUsed.modifiers.find((m) => m.type === "proficiency").modifier} + ${isRightHandBlood ? 1 : 0}`,
        ).roll();
        ChatMessage.create({
            user: game.user.id,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            flavor: `<strong>Assurance Roll: ${
                skillUsed.label[0].toUpperCase() + skillUsed.label.substring(1)
            }</strong> vs DC ${DC}<br><small>Do not apply any other bonuses, penalties, or modifiers</small><br>`,
            roll: aroll,
            speaker: ChatMessage.getSpeaker(),
        });

        const atot = aroll.total - DC;

        const success = atot >= 10 ? 3 : atot >= 0 ? 2 : atot <= -10 ? 0 : 1;

        const { healFormula, successLabel } = getHealSuccess({
            success,
            useMagicHands,
            useMortalHealing,
            isRiskySurgery,
            isRightHandBlood,
            bonusString,
            spellStitcherBonus,
        });

        if (isRiskySurgery) {
            await new DamageRoll("1d8[slashing]").toMessage({
                speaker: ChatMessage.getSpeaker(),
                flavor: `<strong>Damage Roll: Risky Surgery</strong>`,
            });
        }
        if (isRightHandBlood) {
            await new DamageRoll("2d8").toMessage({
                speaker: ChatMessage.getSpeaker(),
                flavor: `<strong>Damage Roll: Right-Hand Blood</strong>`,
            });
        }
        let healRoll = 0;
        if (healFormula !== undefined) {
            const rollType = success > 1 ? "Healing" : "Damage";
            healRoll = await new DamageRoll(`(${healFormula})[${rollType.toLowerCase()}]`).roll();
            my_message = `<strong>${rollType} Roll: ${bmtw}</strong> (${successLabel})`;

            healRoll.toMessage({
                flavor: `${my_message}<br>${immunityMessage}`,
                speaker: ChatMessage.getSpeaker(),
                flags: {
                    treat_wounds_battle_medicine: {
                        id: target.id,
                        dos: success,
                        healerId: token.actor.id,
                        healing: healRoll._total,
                        bmBatonUsed: usedBattleMedicsBaton,
                    },
                },
            });
        } else {
            ChatMessage.create({
                user: game.user.id,
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                flavor: `No healing done.<br>${immunityMessage}`,
                speaker: ChatMessage.getSpeaker(),
                flags: {
                    treat_wounds_battle_medicine: {
                        id: target.id,
                        dos: success,
                        healerId: token.actor.id,
                        healing: healRoll._total,
                        bmBatonUsed: usedBattleMedicsBaton,
                    },
                },
            });
        }
    } else {
        if (isRiskySurgery) {
            await actor.toggleRollOption(
                "medicine",
                "risky-surgery",
                actor.items.find((x) => x.slug === "risky-surgery").id,
                true,
            );
        }
        if (isRightHandBlood) {
            await actor.toggleRollOption(
                "medicine",
                "right-hand-blood",
                actor.items.find((x) => x.slug === "right-hand-blood").id,
                true,
            );
        }
        const extraRollOptions = getRollOptions({ isRiskySurgery, isRightHandBlood });
        await skillUsed.roll({
            dc: dc,
            event: event,
            extraRollOptions,
            callback: async (roll) => {
                const { healFormula, successLabel } = getHealSuccess({
                    success: roll.options.degreeOfSuccess,
                    useMagicHands,
                    useMortalHealing,
                    isRiskySurgery,
                    bonusString,
                    spellStitcherBonus,
                });
                if (isRiskySurgery) {
                    await new DamageRoll("1d8[slashing]").toMessage({
                        speaker: ChatMessage.getSpeaker(),
                        flavor: `<strong>Damage Roll: Risky Surgery</strong>`,
                    });
                }
                if (isRightHandBlood) {
                    await new DamageRoll("2d8").toMessage({
                        speaker: ChatMessage.getSpeaker(),
                        flavor: `<strong>Damage Roll: Right-Hand Blood</strong>`,
                    });
                }
                let healRoll = 0;
                if (healFormula !== undefined) {
                    const rollType = roll.options.degreeOfSuccess > 1 ? "Healing" : "Damage";
                    const my_message = `<strong>${rollType} Roll: ${bmtw}</strong> (${successLabel})`;
                    healRoll = await new DamageRoll(`(${healFormula})[${rollType.toLowerCase()}]`).roll();

                    dsnHook(() => {
                        healRoll.toMessage({
                            flavor: `${my_message}<br>${immunityMessage}`,
                            speaker: ChatMessage.getSpeaker(),
                            flags: {
                                treat_wounds_battle_medicine: {
                                    id: target.id,
                                    dos: roll.options.degreeOfSuccess,
                                    healerId: token.actor.id,
                                    healing: healRoll._total,
                                    bmBatonUsed: usedBattleMedicsBaton,
                                },
                            },
                        });
                    });
                } else {
                    dsnHook(() => {
                        ChatMessage.create({
                            user: game.user.id,
                            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                            flavor: `No healing done.<br>${immunityMessage}`,
                            speaker: ChatMessage.getSpeaker(),
                            flags: {
                                treat_wounds_battle_medicine: {
                                    id: target.id,
                                    dos: roll.options.degreeOfSuccess,
                                    healerId: token.actor.id,
                                    healing: healRoll._total,
                                    bmBatonUsed: usedBattleMedicsBaton,
                                },
                            },
                        });
                    });
                }
            },
        });
        if (isRiskySurgery) {
            await actor.toggleRollOption(
                "medicine",
                "risky-surgery",
                actor.items.find((x) => x.slug === "risky-surgery").id,
                false,
            );
        }
        if (isRightHandBlood) {
            await actor.toggleRollOption(
                "medicine",
                "right-hand-blood",
                actor.items.find((x) => x.slug === "right-hand-blood").id,
                false,
            );
        }
    }
};

async function applyChanges($html) {
    for (const token of canvas.tokens.controlled) {
        const dropdown = $html.find('[name="useBattleMedicine"]');
        const useBattleMedicine = parseInt(dropdown[0]?.value) === 1;
        // the dropdown for skills isn't shown if you only have medicine trained, so we default to that.
        const skill = $html.find('[name="skill"]')[0]?.value ?? "med"; 
        const requestedProf = parseInt($html.find('[name="dc-type"]')[0].value) || 1;

        let usedProf = 0;
        let skillUsed = null;
        if (skill === "med")
        {
            skillUsed = token.actor.skills.medicine;
            usedProf = requestedProf <= skillUsed.rank ? requestedProf : skillUsed.rank;
        }
        else if (skill === "cra") {
            skillUsed = token.actor.skills.crafting;
            usedProf = requestedProf <= skillUsed.rank ? requestedProf : skillUsed.rank;
        }
        else if (skill === "arc") {
            skillUsed = token.actor.skills.arcana;
            usedProf = requestedProf <= skillUsed.rank ? requestedProf : skillUsed.rank;
            if (usedProf === 0) {
                usedProf = 1;
            }
        }
        else if (skill === "nat") {
            skillUsed = token.actor.skills.nature;
            usedProf = requestedProf <= skillUsed.rank ? requestedProf : skillUsed.rank;
            if (usedProf === 0) {
                usedProf = 1;
            }
        }

        if (!skillUsed) {
            ui.notifications.warn(`Token ${token.name} does not have the medicine skill`);
            continue;
        }
        const hasWardMedic = checkFeat("ward-medic");
        const bmtw = useBattleMedicine ? "Battle Medicine" : "Treat Wounds";

        const maxTargets = useBattleMedicine ? 1 : hasWardMedic ? 2 ** (skillUsed.rank - 1) : 1;
        if (game.user.targets.size > maxTargets) {
            ui.notifications.warn(
                `Too many targets (${game.user.targets.size}) for ${bmtw}. You can select a maximum of ${maxTargets} targets.`,
            );
            continue;
        }

        const useHealingPlaster = $html.find('[name="useHealingPlaster"]')[0]?.checked;
        const useBuiltInTools = $html.find('[name="useBuiltInTools"]')[0]?.checked;
        const useRightHandBlood = $html.find('[name="right_hand_blood_bool"]')[0]?.checked;
        if (!useBuiltInTools) {
            const twWithoutTools = !useBattleMedicine && (useHealingPlaster === false || useRightHandBlood === true);
            const bmWithoutTools = useBattleMedicine && useHealingPlaster !== undefined;
            console.log(
                `Twt: ${twWithoutTools}, BMt: ${bmWithoutTools}, HP: ${useHealingPlaster}, RB: ${useRightHandBlood}, BM: ${useBattleMedicine}`,
            );
            if (twWithoutTools) {
                ui.notifications.warn(
                    `You can't Treat Wounds without a Healer's Toolkit, a Healing Plaster, or having used Right-Hand Blood.`,
                );
                continue;
            } else {
                if (bmWithoutTools) {
                    ui.notifications.warn(`You can't use Battle Medicine without a Healer's Toolkit.`);
                    continue;
                }
            }
        }
        const { name } = token;
        const level = token.actor.system.details.level.value;
        const mod = parseInt($html.find('[name="modifier"]').val()) || 0;
        const assurance = $html.find('[name="assurance_bool"]')[0]?.checked;
        const hasMedicDedication = checkFeat("medic-dedication");
        // Risky Surgery does not apply when Battle Medicine is used.
        const isRiskySurgery = !useBattleMedicine && $html.find('[name="risky_surgery_bool"]')[0]?.checked;
        const isRightHandBlood = !useBattleMedicine && $html.find('[name="right_hand_blood_bool"]')[0]?.checked;
        // Mortal Healing does not apply when Battle Medicine is used.
        const useMortalHealing = !useBattleMedicine && $html.find('[name="mortal_healing_bool"]')[0]?.checked;
        // Magic Hands do not apply when Battle Medicine is used.
        const useMagicHands = !useBattleMedicine && checkFeat("magic-hands");
        const useContinualRecovery = !useBattleMedicine && checkFeat("continual-recovery");
        const usedBattleMedicsBaton =
            useBattleMedicine && $html.find('[name="battle_medics_baton_held_bool"]')[0]?.checked;
        const bmUUID = "Compendium.pf2e.feat-effects.2XEYQNZTCGpdkyR6";
        const twUUID = "Compendium.pf2e.feat-effects.Lb4q2bBAgxamtix5";
        const immunityEffectUUID = useBattleMedicine ? bmUUID : twUUID;
        const forensicMedicine = checkFeat("forensic-medicine-methodology");

        let immunityMacroLink = ``;
        if (game.modules.has("xdy-pf2e-workbench") && game.modules.get("xdy-pf2e-workbench").active) {
            // Extract the Macro ID from the asynomous benefactor macro compendium.
            const macroName = useBattleMedicine ? `BM Immunity CD` : `TW Immunity CD`;
            const macroId = game.packs
                .get("xdy-pf2e-workbench.asymonous-benefactor-macros")
                .index.find((n) => n.name === macroName)?._id;
            immunityMacroLink = `@Compendium[xdy-pf2e-workbench.asymonous-benefactor-macros.${macroId}]{Apply ${bmtw} Immunity}`;
        } else {
            ui.notifications.warn(`Workbench Module not active! Linking Immunity effect Macro not possible.`);
        }

        let spellStitcherUntypedBonus = 0;
        if (checkFeat("spell-stitcher") && useBattleMedicine) {
            if (
                token.actor.itemTypes.effect.some((obj) => {
                    return obj.slug === "stance-arcane-cascade";
                })
            ) {
                spellStitcherUntypedBonus = 1;
                if (token.actor.class.slug === "magus" && checkFeat("weapon-specialization")) {
                    spellStitcherUntypedBonus = 2;
                }
                if (token.actor.class.slug === "magus" && checkFeat("greater-weapon-specialization")) {
                    spellStitcherUntypedBonus = 3;
                }
            }
        }
        if (checkItemTypeFeat("clever-improviser") && usedProf === 0) {
            usedProf = 1;
        }
        const medicCircumstanceBonus = hasMedicDedication ? (usedProf - 1) * 5 : 0;
        const forensicUsesBattleMedicineUntypedBonus = useBattleMedicine * level * forensicMedicine;
        const magicHandsStatusBonus = useMagicHands * level;

        const showIcons = true;
        const immunityEffect = (await fromUuid(immunityEffectUUID)).toObject();
        immunityEffect.system.tokenIcon.show = showIcons; // Potential for lots of effects to be on a token. Don't show icon to avoid clutter
        immunityEffect.flags.core ??= {};
        immunityEffect.flags.core.sourceId = immunityEffectUUID;

        for (let target of game.user.targets) {
            let targetActor = target.actor;

            immunityEffect.name = useBattleMedicine ? `${bmtw} by ${name}` : `${bmtw}`;
            const hasGodlessHealing = targetActor.items
                .filter((item) => item.type === "feat")
                .some((item) => item.system.slug === "godless-healing");
            const godlessHealingUntypedBonus = hasGodlessHealing ? 5 : 0;
            const hasRobustHealth = targetActor.items
                .filter((item) => item.type === "feat")
                .some((item) => item.system.slug === "robust-health");
            const robustHealthCircumstanceBonus = hasRobustHealth ? target.actor.level : 0;

            // check if the person being healed is currently immune. If so, check if healer is a medic
            var isImmune = targetActor.itemTypes.effect.find((obj) => {
                return obj.name === immunityEffect.name;
            });
            if (isImmune) {
                if (useBattleMedicine && hasMedicDedication) {
                    var medicCooldown = token.actor.itemTypes.effect.find((obj) => {
                        return obj.name === "Medic dedication used";
                    });
                    if (medicCooldown) {
                        ui.notifications.warn(targetActor.name + ` is currently immune to ${bmtw} by ` + token.name);
                        continue;
                    } else {
                        const applicatorImmunityEffect = (await fromUuid(immunityEffectUUID)).toObject();
                        applicatorImmunityEffect.system.tokenIcon.show = showIcons;
                        applicatorImmunityEffect.flags.core ??= {};
                        applicatorImmunityEffect.flags.core.sourceId = immunityEffectUUID;
                        if (token.actor.skills.medicine.rank > 2) {
                            applicatorImmunityEffect.system.duration.unit = "hours"; // Cooldown of Medic Dedication depends on medicine skill rank
                        }

                        applicatorImmunityEffect.name = "Medic dedication used";
                        await token.actor.createEmbeddedDocuments("Item", [applicatorImmunityEffect]);
                        ui.notifications.info(
                            token.name + ` has now used their Medic Dedication to apply ${bmtw} to ` + targetActor.name,
                        );
                    }
                } else {
                    ui.notifications.warn(targetActor.name + ` is currently immune to ${bmtw} by ` + token.name);
                    continue;
                }
            }

            if (forensicMedicine || hasGodlessHealing || hasRobustHealth) {
                immunityEffect.system.duration.unit = "hours";
            }
            if (useContinualRecovery) {
                immunityEffect.system.duration.unit = "minutes";
                immunityEffect.system.duration.value = 10;
            }
            if (usedBattleMedicsBaton) {
                immunityEffect.system.duration.unit = "minutes";
                immunityEffect.system.duration.value = 60;
                const applicatorImmunityEffect = (await fromUuid(immunityEffectUUID)).toObject();
                applicatorImmunityEffect.system.tokenIcon.show = showIcons;
                applicatorImmunityEffect.flags.core ??= {};
                applicatorImmunityEffect.flags.core.sourceId = immunityEffectUUID;
                applicatorImmunityEffect.system.duration.unit = "minutes";
                applicatorImmunityEffect.system.duration.value = 60;
                applicatorImmunityEffect.name = "Battle Medic's Baton used";
                await token.actor.createEmbeddedDocuments("Item", [applicatorImmunityEffect]);
                ui.notifications.info(
                    token.name + ` has now used their Battle Medic's Baton to apply ${bmtw} to ` + targetActor.name,
                );
            }
            // does only work if both tokens have the same owner.
            // await targetActor.createEmbeddedDocuments("Item", [immunityEffect]);
            // ui.notifications.info(targetActor.name + ` is now immune to ${bmtw} by ` + token.name);

            // Roll for Treat Wounds/Battle Med
            switch (usedProf) {
                case 0:
                    ui.notifications.warn(`${name} is not trained in Medicine and doesn't know how to ${bmtw}.`);
                    break;
                case 1:
                    rollTreatWounds({
                        DC: normalDC + mod,
                        bonus:
                            Math.max(robustHealthCircumstanceBonus, medicCircumstanceBonus) +
                            godlessHealingUntypedBonus +
                            forensicUsesBattleMedicineUntypedBonus +
                            magicHandsStatusBonus,
                        skillUsed,
                        isRiskySurgery,
                        isRightHandBlood,
                        useMortalHealing,
                        useMagicHands,
                        assurance,
                        bmtw,
                        target,
                        immunityEffect,
                        usedBattleMedicsBaton,
                        spellStitcherBonus: spellStitcherUntypedBonus,
                        immunityMacroLink
                    });
                    break;
                case 2:
                    rollTreatWounds({
                        DC: expertDC + mod,
                        bonus:
                            10 +
                            Math.max(robustHealthCircumstanceBonus, medicCircumstanceBonus) +
                            godlessHealingUntypedBonus +
                            forensicUsesBattleMedicineUntypedBonus +
                            magicHandsStatusBonus,
                        skillUsed,
                        isRiskySurgery,
                        isRightHandBlood,
                        useMortalHealing,
                        useMagicHands,
                        assurance,
                        bmtw,
                        target,
                        immunityEffect,
                        usedBattleMedicsBaton,
                        spellStitcherBonus: spellStitcherUntypedBonus,
                        immunityMacroLink
                    });
                    break;
                case 3:
                    rollTreatWounds({
                        DC: masterDC + mod,
                        bonus:
                            30 +
                            Math.max(robustHealthCircumstanceBonus, medicCircumstanceBonus) +
                            godlessHealingUntypedBonus +
                            forensicUsesBattleMedicineUntypedBonus +
                            magicHandsStatusBonus,
                        skillUsed,
                        isRiskySurgery,
                        isRightHandBlood,
                        useMortalHealing,
                        useMagicHands,
                        assurance,
                        bmtw,
                        target,
                        immunityEffect,
                        usedBattleMedicsBaton,
                        spellStitcherBonus: spellStitcherUntypedBonus,
                        immunityMacroLink
                    });
                    break;
                case 4:
                    rollTreatWounds({
                        DC: legendaryDC + mod,
                        bonus:
                            50 +
                            Math.max(robustHealthCircumstanceBonus, medicCircumstanceBonus) +
                            godlessHealingUntypedBonus +
                            forensicUsesBattleMedicineUntypedBonus +
                            magicHandsStatusBonus,
                        skillUsed,
                        isRiskySurgery,
                        isRightHandBlood,
                        useMortalHealing,
                        useMagicHands,
                        assurance,
                        bmtw,
                        target,
                        immunityEffect,
                        usedBattleMedicsBaton,
                        spellStitcherBonus: spellStitcherUntypedBonus,
                    });
                    break;
                default:
                    ui.notifications.warn(`${name} has an invalid usedProf value of ${usedProf}.`);
            }
        }
    }
}

/**
 * Render the content for the dialog
 *
 * @param {Object} options
 * @param {boolean} options.hasChirurgeon Is the actor a chirurgeon
 * @param {boolean} options.hasNaturalMedicine Does the actor have natural medicine
 * @param {boolean} options.hasBattleMedicine Does the actor have battle medicine
 * @param {boolean} options.hasSpellStitcher Does the actor have Spell Stitcher (Magus+ feat)
 * @param {boolean} options.tmed Does the actor have medicine
 * @param {number} options.totalAssurance Assurance of the actor
 * @returns {string} The Dialog content
 */
const renderDialogContent = ({
    hasChirurgeon,
    hasNaturalMedicine,
    hasBattleMedicine,
    hasSpellStitcher,
    tmed,
    totalAssurance,
    hasHealersToolkit,
    hasHealersToolkitHeld,
    batonUsed,
    hasBattleMedicsBatonHeld,
    inCombat,
}) => `
 <div>
   Attempt to heal the target by 2d8 hp.<br>You have to hold healer's toolkit, or you are wearing them and have a hand free!<br>
   <small>Hover the options for more information.</small>
 </div>
 <hr/>
 ${
     !hasHealersToolkit
         ? `<b>You don't have healer's toolkit on your character!</b>
       ${
           checkItemTypeFeat("built-in-tools")
               ? `<form>
             <div class="form-group">
               <label title="Are you wielding, wearing, or adjacent to your innovation?">Is Healer's Toolkit one of your Built-In Tools?</label>
               <input type="checkbox" id="useBuiltInTools" name="useBuiltInTools" checked></input>
             </div>
           </form>`
               : ``
       }
       <form>
         <div class="form-group">
          <label title="Healing Plaster is a cantrip which can can replace healer's toolkit for Treat Wounds.">Are you using Healing Plaster? <small>(only for Treat wounds)</small></label>
           <input type="checkbox" id="useHealingPlaster" name="useHealingPlaster"></input>
         </div>
       </form>`
         : ``
 }
 ${
     hasChirurgeon || hasNaturalMedicine || hasSpellStitcher
         ? `<form>
         <div class="form-group">
         <label title="Select the skill you want to use.">Treat Wounds Skill:</label>
           <select id="skill" name="skill">
             ${hasChirurgeon ? `<option value="cra">Crafting</option>` : ``}
             ${hasNaturalMedicine ? `<option value="nat">Nature</option>` : ``}
             ${hasSpellStitcher ? `<option value="arc">Arcana</option>` : ``}
             ${tmed ? `<option value="med">Medicine</option>` : ``}
           </select>
         </div>
       </form>`
         : ""
 }
 <form>
     <div class="form-group">
         <select id="useBattleMedicine" name="useBattleMedicine">
             ${!inCombat ? `<option value="0">Treat Wounds</option>` : ""}
             ${hasBattleMedicine ? `<option value="1" ${inCombat ? "selected" : ""}>Battle Medicine</option>` : ""}
         </select>
     </div>
 </form>
 ${
     checkFeat("forensic-medicine-methodology")
         ? `<form>
         <div class="form-group">
             <label title="When you use Battle Medicine, on a success the target recovers additional Hit Points equal to your level.">Forensic Medicine Bonus applies when selecting Battle Medicine.</label>
         </div>
       </form>`
         : ``
 }
 ${
     (hasChirurgeon &&
         (checkItemTypeFeat("assurance", "Assurance (Crafting)") || checkItemTypeFeat("assurance-crafting"))) ||
     (hasNaturalMedicine &&
         (checkItemTypeFeat("assurance", "Assurance (Nature)") || checkItemTypeFeat("assurance-nature"))) ||
     (hasSpellStitcher &&
         (checkItemTypeFeat("assurance", "Assurance (Arcana)") || checkItemTypeFeat("assurance-arcana"))) ||
     checkItemTypeFeat("assurance", "Assurance (Medicine)") ||
     checkItemTypeFeat("assurance-medicine")
         ? `<form>
     <div class="form-group">
         <label>Use Assurance? <small>This will beat DC ${totalAssurance}</small></label>
         <input type="checkbox" id="assurance_bool" name="assurance_bool"></input>
     </div>
 </form>`
         : ``
 }
 <form>
     <div class="form-group">
         <label title="Select a target DC. Remember that you can't attempt a heal above your proficiency. Attempting to do so will downgrade the DC and amount healed to the highest you're capable of.">Medicine DC:</label>
         <select id="dc-type" name="dc-type">
             <option value="1" selected>Trained DC ${normalDC}</option>
         ${
             checkFeat("medic-dedication")
                 ? ` <option value="2">Expert DC ${expertDC}, +15 Healing</option>
                 <option value="3">Master DC ${masterDC}, +40 Healing</option>
                 <option value="4">Legendary DC ${legendaryDC}, +65 Healing</option>`
                 : ` <option value="2">Expert DC ${expertDC}, +10 Healing</option>
                 <option value="3">Master DC ${masterDC}, +30 Healing</option>
                 <option value="4">Legendary DC ${legendaryDC}, +50 Healing</option>`
         }
         </select>
     </div>
 </form>
 <form>
     <div class="form-group">
         <label title="Any circumstance or other dc modifiers at your GMs decission.">DC Modifier:</label>
         <input id="modifier" name="modifier" type="number"/>
     </div>
 </form>
 ${
     checkFeat("risky-surgery")
         ? `<form>
         <div class="form-group">
           <label title"Will not be applied when using Battle Medicine.">Risky Surgery</label>
           <input type="checkbox" id="risky_surgery_bool" name="risky_surgery_bool"></input>
         </div>
       </form>`
         : ``
 }
 ${
     checkFeat("mortal-healing")
         ? `<form>
         <div class="form-group">
           <label title="Target creature must not have regained Hit Points from divine magic in the past 24 hours.
                         Will not be applied when using Battle Medicine.">Mortal Healing</label>
           <input type="checkbox" id="mortal_healing_bool" name="mortal_healing_bool" checked></input>
         </div>
       </form>`
         : ``
 }
 ${
     checkFeat("right-hand-blood")
         ? `<form>
         <div class="form-group">
           <label title"Will not be applied when using Battle Medicine.">Right-Hand Blood</label>
           <input type="checkbox" id="right_hand_bool" name="right_hand_blood_bool"></input>
         </div>
       </form>`
         : ``
 }
 ${
     game.user.isGM
         ? `<form>
         <div class="form-group">
         </div>
       </form>`
         : ``
 }
 ${
     !batonUsed && hasBattleMedicsBatonHeld
         ? `<form>
        <div class="form-group">
          <label title="(Battle Medicine only) Target creature will only be immune for one hour instead of 24 hours to your Battle Medicine.">Use Battle Medic's Baton:</label>
          <input type="checkbox" id="battle_medics_baton_held_bool" name="battle_medics_baton_held_bool"></input>
        </div>
      </form>`
         : ``
 }
 ${
     !hasHealersToolkitHeld
         ? `<b>Note: To gain the bonus of Healer's toolkit (if any), you have to set the Healer's toolkit to be WORN, due to how the item is implemented in the pf2e core system.</b>`
         : ``
 }
 </form>
`;

if (canvas.tokens.controlled.length !== 1) {
    ui.notifications.warn("You need to select exactly one token as the healer.");
} else if (game.user.targets.size < 1) {
    ui.notifications.warn(`You must target at least one token.`);
} else {
    const hasChirurgeon = checkFeat("chirurgeon");
    const hasNaturalMedicine = checkFeat("natural-medicine");
    const hasBattleMedicine = checkFeat("battle-medicine");
    const hasSpellStitcher = checkFeat("spell-stitcher"); /// < From Magus+, allows using Arcana for actions that normally require Medicine
    let tmed = token.actor.skills.medicine.rank > 0;
    if (
        !tmed &&
        !hasChirurgeon &&
        !hasNaturalMedicine &&
        !hasSpellStitcher &&
        !checkItemTypeFeat("clever-improviser")
    ) {
        ui.notifications.warn("Medicine is not trained and you do not possess a feat or feature to use another skill");
    } else {
        let bmtw_skill = 0;
        if (
            tmed &&
            (checkItemTypeFeat("assurance", "Assurance (Medicine)") || checkItemTypeFeat("assurance-medicine"))
        ) {
            bmtw_skill = token.actor.skills.medicine;
        } else if (
            hasChirurgeon &&
            (checkItemTypeFeat("assurance", "Assurance (Crafting)") || checkItemTypeFeat("assurance-crafting"))
        ) {
            bmtw_skill = token.actor.skills.crafting;
        } else if (
            hasNaturalMedicine &&
            (checkItemTypeFeat("assurance", "Assurance (Nature)") || checkItemTypeFeat("assurance-nature"))
        ) {
            bmtw_skill = token.actor.skills.nature;
        } else if (
            hasSpellStitcher &&
            (checkItemTypeFeat("assurance", "Assurance (Arcana)") || checkItemTypeFeat("assurance-arcana"))
        ) {
            bmtw_skill = token.actor.skills.arcana;
        }
        const hasHealersToolkit =
            checkItemPresent("healer-s-toolkit") ||
            checkItemPresent("healers-toolkit") ||
            checkItemPresent("healers-toolkit-expanded") ||
            checkItemPresent("violet-ray") ||
            checkItemPresent("marvelous-medicines") ||
            checkItemPresent("marvelous-medicines-greater") ||
            checkItemPresent("medkit-commercial") ||
            checkItemPresent("medkit-tactical");
        const hasHealersToolkitHeld =
            !hasHealersToolkit ||
            checkItemPresent("healer-s-toolkit", 0) ||
            checkItemPresent("healers-toolkit", 0) ||
            checkItemPresent("healers-toolkit-expanded", 0) ||
            checkItemPresent("violet-ray", 2) ||
            checkItemPresent("marvelous-medicines", 2) ||
            checkItemPresent("marvelous-medicines-greater", 2) ||
            checkItemPresent("medkit-commercial", 0) ||
            checkItemPresent("medkit-tactical", 0);
        const hasBattleMedicsBatonHeld =
            checkItemPresent("battle-medic-s-baton", 1) || checkItemPresent("battle-medics-baton", 1);
        const batonUsed = token.actor.itemTypes.effect.find((obj) => {
            return obj.name === `Battle Medic's Baton used`;
        });
        const inCombat = game.combats.active?.started;
        const level = token.actor.system.details.level.value;
        const totalAssurance = 10 + (bmtw_skill.rank * 2 + level);
        const dialog = new Dialog({
            title: "Treat Wounds / Battle Medicine",
            content: renderDialogContent({
                hasChirurgeon,
                hasNaturalMedicine,
                hasBattleMedicine,
                hasSpellStitcher,
                tmed,
                totalAssurance,
                hasHealersToolkit,
                hasHealersToolkitHeld,
                batonUsed,
                hasBattleMedicsBatonHeld,
                inCombat,
            }),
            buttons: {
                yes: {
                    icon: `<i class="fas fa-hand-holding-medical"></i>`,
                    label: "Use selected action",
                    callback: applyChanges,
                },
                no: {
                    icon: `<i class="fas fa-times"></i>`,
                    label: "Cancel",
                },
            },
            render: (html) => {
                html.find("#useBattleMedicine").on("change", function () {
                    EnableDisable(html);
                });
                if (inCombat && !hasBattleMedicine) {
                    html.find("button:contains('Use selected action')")
                        .attr("disabled", true)
                        .text("Disabled as neither Treat Wounds nor Battle Medicine is available");
                    html.find("#useBattleMedicine").attr("disabled", true);
                }
            },
            default: "yes",
        });
        dialog.render(true);
    }
}

function EnableDisable(html) {
    if (html.find("#risky_surgery_bool").length !== 0) {
        if (html.find("#useBattleMedicine")[0].value === "1") {
            html.find("#risky_surgery_bool")[0].checked = false;
            html.find("#risky_surgery_bool")[0].disabled = true;
        } else {
            html.find("#risky_surgery_bool")[0].disabled = false;
        }
    }
    if (html.find("#right_hand_blood_bool").length !== 0) {
        if (html.find("#useBattleMedicine")[0].value === "1") {
            html.find("#right_hand_blood_bool")[0].checked = false;
            html.find("#right_hand_blood_bool")[0].disabled = true;
        } else {
            html.find("#right_hand_blood_bool")[0].disabled = false;
        }
    }
}
