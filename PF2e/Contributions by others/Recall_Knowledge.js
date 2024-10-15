/*
Based on the macro by bipedalshark and WesBelmont and Allalinor.
updated by darkim, Dalvyn, julie.winchester, and xyzzy42

Recall Knowledge
This macro will roll several knowledge checks if no target is selected.
If one ore more targets are selected it will only roll the relevant knowledge skills and compare the result to the DC.
Handles lore skills (as far as possible)
Handles Cognitive Mutagen and other Bonus effects
Should pick up most single target trait based mods automatically now if predicates are set properly.

Limitations:
* Does not handle assurance.
* Does not handle things like bardic knowledge.
*/

actor = token?.actor ?? actor;
if (!actor) {
    return ui.notifications.error("No selected token or assigned character");
}

/**
 * Check wether the current actor has a feature.
 *
 * @param {string} slug
 * @returns {boolean} true if the feature exists, false otherwise
 */
const checkFeat = (slug) => actor.itemTypes.feat.some((item) => item.slug === slug);

// Get breakdown display mode from settings, if workbench is not present, uses default "all"
// That default can changed to "extra" or "none" here.
const breakdownMode = (() => {
    try { return game.settings.get("xdy-pf2e-workbench", "rkBreakdown"); } catch { return "all"; }
})();

const HAS_DUBIOUS_KNOWLEDGE = checkFeat('dubious-knowledge');
const SKILL_OPTIONS = ["arcana", "crafting", "medicine", "nature", "occultism", "religion", "society"];

const IDENTIFY_SKILLS = {
    aberration: ["occultism"],
    astral: ["occultism"],
    animal: ["nature"],
    beast: ["arcana", "nature"],
    celestial: ["religion"],
    construct: ["arcana", "crafting"],
    dragon: ["arcana"],
    elemental: ["arcana", "nature"],
    ethereal: ["occultism"],
    fey: ["nature"],
    fiend: ["religion"],
    fungus: ["nature"],
    giant: ["society"],
    humanoid: ["society"],
    monitor: ["religion"],
    ooze: ["occultism"],
    plant: ["nature"],
    spirit: ["occultism"],
    undead: ["religion"],
};
const RANK_COLORS = ["#443730", "#171f69", "#3c005e", "#5e4000", "#5e0000"];
const RANK_NAMES = ["UNTRAINED", "TRAINED", "EXPERT", "MASTER", "LEGENDARY"];
const OUTCOMES = [
    "<span style='color:red'>CrFail</span>",
    "<span style='color:orange'>Fail</span>",
    "<span style='color:royalblue'>Suc</span>",
    "<span style='color:green'>CrSuc</span>",
];
const DC_MODS = [-5, -2, 0, 2, 5, 10, "-", "-", "-"];
const FIRST_DC_INDEX = {
    common: 2,
    uncommon: 3,
    rare: 4,
    unique: 5,
};

// Get token skills infos by simulating fake rolls
// ===============================================

/**
 * Do a skill check for RK, using the skill supplied.  The value of the D20 roll can be injected using rollResult.
 * There is no message generated.
 *
 * @param {string} skillSlug    The skill to use. Can be a lore.
 * @param {Number} rollResult   Value to use as d20 result.
 * @param {Actor} target        The target actor/hazard to RK about, optional.
 */
async function getSkillResult(skillSlug, rollResult = undefined, target = undefined) {
    const skill = actor.skills[skillSlug];
    const rank = skill.rank;
    const extraRollOptions = [
        "action:recall-knowledge",
        `action:recall-knowledge:${skillSlug}`,
        `skill:rank:${rank}`,
    ];
    if (target) {
        extraRollOptions.push(...target.getSelfRollOptions('target'));
    }

    const [fakeRoll, fakeMsg ] = await new Promise((resolve) =>
        skill.roll({
            callback: (roll, outcome, msg) => resolve([roll, msg]),
            createMessage: false,
            rollMode: CONST.DICE_ROLL_MODES.BLIND,
            skipDialog: true,
            extraRollOptions,
        })
    );

    // Get the actual options the pf2e system roll code came up with
    const rollOptions = fakeMsg.getFlag('pf2e','context.options');

    // Extract tags text from roll, but possibly remove ability and proficiency
    let breakdown = null;
    if (breakdownMode !== 'none') {
        const div = document.createElement('div');
        div.innerHTML = fakeMsg.flavor;
        breakdown = div.querySelector("div.modifiers");
        if (breakdownMode === "extra") {
            // Drop the ability and proficiency modifiers, possibly less interesting since they are always there.
            const uninteresting = new Set([...Object.keys(CONFIG.PF2E.abilities), "proficiency"]);
            breakdown?.querySelectorAll("[data-slug]").forEach((e) => { if (uninteresting.has(e.dataset.slug)) e.remove(); });
        }
    }

    // find conditional RK modifiers
    const appliedModifiers = [], unappliedModifiers = [];
    const recallKnowledgeModifiers = skill.modifiers.filter((mod) => Array.from(predicateRollOptions(mod.predicate)).some(r => r === "action:recall-knowledge"));
    for (const mod of recallKnowledgeModifiers) {
        (mod.predicate.test(rollOptions) ? appliedModifiers : unappliedModifiers).push(mod);
    }

    return {
        label: skill.label,
        modifier: fakeRoll.options.totalModifier,
        total: fakeRoll.total,
        unappliedModifiers,
        appliedModifiers,
        breakdown,
        rank,
    };
}

// Global d20 roll used for all skills
// ===================================

const rollD20 = new Roll("1d20");
const globalRoll = (await rollD20.roll({allowInteractive: false})).total;
const rollColor = globalRoll == 20 ? "green" : globalRoll == 1 ? "red" : "royalblue";

// Skill list output
// =================

const skillListOutput = (title, skillResults) => {
    let output = `<table><tr><th>${title}</th><th>Prof</th><th>Mod</th><th>Result</th></tr>`;
    for (const skillResult of skillResults) {
        const { label, modifier, rank, breakdown } = skillResult;
        const adjustedResult = globalRoll + modifier;
        output += `<tr><th>${label}</th>
            <td class="tags"><div class="tag" style="background-color: ${RANK_COLORS[rank]}; white-space:nowrap">${
            RANK_NAMES[rank]
        }</td>
            <td>${modifier >= 0 ? "+" : ""}${modifier}</td>
            <td><span style="color: ${rollColor}">${adjustedResult}</span></td></tr>`;
        if (breakdown?.childElementCount > 0) {
            output += `<tr><td colspan="7">${breakdown.outerHTML}</td></tr>`;
        }
    }
    output += "</table>";
    return output;
};

// Conditional modifier output
// ==========================

const conditionalModifiersOutput = (skillResults) => {
    // Find unique modifiers that are never successfully applied for any skill or lore to inform user
    const allAppliedSlugs = new Set(skillResults.flatMap((r) => r.appliedModifiers.map((m) => m.slug)));
    const allUnappliedModifiers = new Map(skillResults.flatMap((r) => r.unappliedModifiers.filter((m) => !allAppliedSlugs.has(m.slug)).map((m) => [m.slug, m])));
    if (allUnappliedModifiers.length === 0) return "";

    let output = `<table style="font-size: 12px"><tr><th>Potential Modifiers</th><th>Mod</th></tr>`;
    for (const mod of allUnappliedModifiers.values()) {
        const { label, signedValue, source } = mod;
        output += `<tr><td><a class="content-link" draggable="true" data-uuid="${source}"><i class="fas fa-suitcase"></i>${label}</a></td><td>${signedValue}</td></tr>`;
    }
    output += "</table>";
    return output;
};

// Creating output
// ===============

let output = `<strong>Recall Knowledge</strong> (Roll: <span style="color: ${rollColor}">${globalRoll}</span>)`;

if (game.user.targets.size < 1) {
    // No target - roll all Recall Knowledge and lore skills
    const lores = Object.values(actor.skills).filter((s) => s.lore).map((s) => s.slug);
    const skillResults = await Promise.all([...SKILL_OPTIONS, ...lores].map((s) => getSkillResult(s, globalRoll)));

    output += skillListOutput("Skill", skillResults);
    output += conditionalModifiersOutput(skillResults);
} else {
    // Target - roll corresponding Recall Knowledge skills and lore skills

    for (const target of game.user.targets) {
        const targetActor = target.actor;
        if (!targetActor?.isOfType("creature", "hazard")) continue;

        const level = targetActor.level;
        const targetTraits = targetActor.traits;
        const rarity = targetActor.rarity;

        let levelDC;
        if (level > 20) {
            levelDC = level * 2;
        } else {
            levelDC = 14 + level + (level < 0 ? 0 : Math.floor(level / 3));
        }

        output += `<br/><strong>vs. ${targetActor.name}</strong>`;

        // Primary skills

        const dcIndex = FIRST_DC_INDEX[rarity];
        const DCs = DC_MODS.slice(dcIndex, dcIndex + 4).map((dc) => (typeof dc === "number" ? dc + levelDC : "-"));

        output += "<table><tr><td></td><td></td><td>";
        output +=
            "<th style='text-align:center'>1st</th><th style='text-align:center'>2nd</th><th style='text-align:center'>3rd</th><th style='text-align:center'>4th</th></tr>";
        output += "<tr><th>Skill</th><td></td><td></td>";
        DCs.forEach(
            (dc) => (output += `<th style='text-align:center'>${typeof dc === "number" ? "DC " + dc : "-"}</th>`)
        );
        output += "</tr>";

        let primarySkills = new Set();
        for (const trait in IDENTIFY_SKILLS) {
            if (targetTraits.has(trait)) {
                for (const primarySkill of IDENTIFY_SKILLS[trait]) {
                    primarySkills.add(primarySkill);
                }
            }
        }
        if (actor.itemTypes.feat.some(x => x.slug === "unified-theory") && ( primarySkills.size > 1 || !primarySkills.has("society"))) primarySkills.add("arcana");

        const tokenSkills = [];
        for (const skill of primarySkills) {
            const skillResult = await getSkillResult(skill, globalRoll, targetActor);
            tokenSkills.push(skillResult);
            const { label, modifier, rank, breakdown } = skillResult;
            const adjustedResult = globalRoll + modifier;

            output += `<tr><th>${label}
                </th><td class="tags"><div class="tag" style="background-color: ${RANK_COLORS[rank]}; white-space:nowrap">${RANK_NAMES[rank]?.[0]}</td>
                <td><span style="color: ${rollColor}; text-align: center">${adjustedResult}</span></td>`;

            for (const dc of DCs) {
                if (typeof dc !== "number") {
                    output += "<td style='text-align:center'>-</td>";
                    continue;
                }
                const diff = adjustedResult - dc;
                let success = diff >= 10 ? 3 : diff >= 0 ? 2 : diff <= -10 ? 0 : 1;
                if (globalRoll == 20 && success < 3) success++;
                else if (globalRoll == 1 && success > 0) success--;
                output += `<td style="text-align:center; vertical-align:middle">${OUTCOMES[success]}</td>`;
            }
            output += "</tr>";
            if (breakdown?.childElementCount > 0) {
                output += `<tr><td colspan="7">${breakdown.outerHTML}</td></tr>`;
            }
        }
        output += "</table>";

        // Lore skill DCs

        const loreDCs = DC_MODS.slice(dcIndex - 2, dcIndex + 4).map((dc) =>
            typeof dc === "number" ? dc + levelDC : "-"
        );

        output += "<table><tr><th>Lore Skill DCs</th>";
        output += "<th>1st</th><th>2nd</th><th>3rd</th><th>4th</th><th>5th</th><th>6th</th></tr>";
        output += "<tr><th>Unspecific</th>";
        loreDCs.slice(1).forEach((dc) => (output += `<td style="text-align:center">${dc}</td>`));
        output += "<td>-</td></tr><tr><th>Specific</th>";
        loreDCs.forEach((dc) => (output += `<td style="text-align:center">${dc}</td>`));
        output += "</tr></table>";

        // Lore skills
        const loreSkills = await Promise.all(Object.values(actor.skills).filter((s) => s.lore).map(
            (s) => getSkillResult(s.slug, globalRoll, targetActor)
        ));
        output += skillListOutput("Lore Skill", loreSkills);
        output += conditionalModifiersOutput([...loreSkills, ...tokenSkills]);
        if (HAS_DUBIOUS_KNOWLEDGE) {
            output += `<br>${token?.name ?? actor.name} has @UUID[Compendium.pf2e.feats-srd.Item.1Bt7uCW2WI4sM84P]{Dubious Knowledge}`
        }
    }
}

// Notification and chat card
// ==========================

ui.notifications.info(`${token?.name ?? actor.name} tries to remember if they've heard something related to this.`);
await ChatMessage.create({
    user: game.userId,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    content: output,
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    visible: false,
    blind: true,
    speaker: ChatMessage.getSpeaker(),
    rolls: [rollD20],
});

// Recursively return every roll option in a predicate expression tree
function* predicateRollOptions(predicate) {
    for (const t of predicate) {
        if (typeof t === 'object') {
            for (const v of Object.values(t)) {
                yield *predicateRollOptions(v);
            }
        } else {
            yield t;
        }
    }
}