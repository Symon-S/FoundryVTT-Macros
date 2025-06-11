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

// Every TD and TH needs this in V13, which has huge padding by default
const tPadding = "padding: 0.25em 0;";
const tBorder = "border-top: 1px solid var(--color-border-medium); border-bottom: 1px solid var(--color-border-medium);"
const tdStyle = `style="${tPadding}"`;
const tdCStyle = `style="text-align: center; ${tPadding}"`;

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
const DOS_LABELS = ["CrFail", "Fail", "Suc", "CrSuc"];
const DOS_COLORS = ["red", "orange", "royalblue", "green"];
const DOS = ["criticalFailure", "failure", "success", "criticalSuccess"];
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
        rollOptions,
        domains: fakeMsg.getFlag('pf2e', 'context.domains'),
    };
}

/* Apply degree of success adjustments to roll.
 * @param {Object}        roll        The total, die, dos, and delta values of the roll.
 * @param {Array<string>} domains     The domains of the roll.
 * @param {Array<string>} rollOptions The roll options for the roll.
 *
 * Returns {Numeric}          dos     New (or old) DoS (0…3) value.
 *         {string|undefined} label   Why dos was changed, but only present if it was.
 */
function adjustDoS(roll, domains, rollOptions) {
    // Roll options for DoS adjustments includes these extra one based on the unadjusted result
    const options = [
        ...rollOptions,
        `check:total:${roll.total}`,
        `check:total:natural:${roll.die}`,
        `check:total:delta:${roll.delta}`,
    ];
    // Extract adjustments that apply to the domains of the roll, it's DoS, and have true predicates
    const adjustments = domains.flatMap(
        (domain) =>
            actor.synthetics.degreeOfSuccessAdjustments[domain]?.flatMap((a) =>
                a.predicate.test(options) ? [a.adjustments.all ?? [], a.adjustments[DOS[roll.dos]] ?? []].flat() : [],
            ) ?? [],
    );
    if (adjustments.length == 0) return { dos: roll.dos };

    const results = adjustments.map((a) => {
        const specificDoS = DOS.indexOf(a.amount);
        return {
            dos: specificDoS !== -1 ? specificDoS : Math.clamp(roll.dos + a.amount, 0, 3),
            label: a.label,
        };
    });
    // There's no rule about what to do with multiple adjustments applying to the same roll.
    // Take the best one?
    return results.reduce((acc, r) => r.dos < acc?.dos ? acc : r);
}

// Global d20 roll used for all skills
// ===================================

const rollD20 = new Roll("1d20");
const globalRoll = (await rollD20.roll({allowInteractive: false})).total;
const rollColor = globalRoll == 20 ? "green" : globalRoll == 1 ? "red" : "royalblue";

// Skill list output
// =================

const skillListOutput = (title, skillResults) => {
    let output = `<table style="${tBorder}"><tr><th ${tdStyle}>${title}</th><th ${tdStyle}>Prof</th><th ${tdStyle}>Mod</th><th ${tdStyle}>Result</th></tr>`;
    for (const skillResult of skillResults) {
        const { label, modifier, rank, breakdown } = skillResult;
        const adjustedResult = globalRoll + modifier;
        output += `<tr><th ${tdStyle}>${label}</th>
            <td class="tags" ${tdStyle}><div class="tag" style="background-color: ${RANK_COLORS[rank]}; white-space:nowrap">
                ${RANK_NAMES[rank]}
            </td>
            <td ${tdStyle}>${modifier >= 0 ? "+" : ""}${modifier}</td>
            <td ${tdStyle}><span style="color: ${rollColor}">${adjustedResult}</span></td></tr>`;
        if (breakdown?.childElementCount > 0) {
            output += `<tr><td ${tdStyle} colspan="7">${breakdown.outerHTML}</td></tr>`;
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

    const modHtml = ({label, signedValue, source}) => `<tr><td ${tdStyle}>@UUID[${source}]{${label}}</a></td><td ${tdStyle}>${signedValue}</td></tr>`;
    return `<table style="font-size: 12px; ${tBorder}">
      <tr>
        <th ${tdStyle}>Potential Modifiers</th>
        <th ${tdStyle}>Mod</th>
      </tr>
      ${[...allUnappliedModifiers.values()].map(modHtml).join("")}
    </table>`;
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

        output += `<table style="${tBorder}">
          <tr>
            <td ${tdStyle}></td><td ${tdStyle}></td><td ${tdStyle}></td>
            <th ${tdCStyle}>1st</th><th ${tdCStyle}>2nd</th><th ${tdCStyle}>3rd</th><th ${tdCStyle}>4th</th>
          </tr>
          <tr>
            <th ${tdStyle}>Skill</th><td ${tdStyle}></td><td ${tdStyle}></td>
            ${DCs.map((dc) => `<th ${tdCStyle}>${typeof dc === "number" ? "DC " + dc : "-"}</th>`).join('')}
          </tr>`;

        let primarySkills = new Set();
        for (const trait in IDENTIFY_SKILLS) {
            if (targetTraits.has(trait)) {
                for (const primarySkill of IDENTIFY_SKILLS[trait]) {
                    primarySkills.add(primarySkill);
                }
            }
        }

        const uT = checkFeat("unified-theory") && !primarySkills.has('arcana') &&
            primarySkills.intersection(new Set(["religion", "occultism", "nature"])).size > 0;
        if (uT) primarySkills.add("arcana");

        const tokenSkills = [];
        for (const skill of primarySkills) {
            const skillResult = await getSkillResult(skill, globalRoll, targetActor);
            tokenSkills.push(skillResult);
            let { label, modifier, rank, breakdown } = skillResult;
            const adjustedResult = globalRoll + modifier;
            if (skill === "arcana" && uT) label = actor.itemTypes.feat.find(i => i.slug === 'unified-theory').name;
            output += `<tr style="vertical-align:middle;"><th ${tdStyle}>${label}</th>
                <td class="tags" style="display:revert; ${tPadding}">
                    <div class="tag" style="background-color: ${RANK_COLORS[rank]}; white-space:nowrap">${RANK_NAMES[rank]?.[0]}</div>
                </td>
                <td ${tdStyle}><span style="color: ${rollColor}; text-align: center">${adjustedResult}</span></td>`;

            for (const dc of DCs) {
                if (typeof dc !== "number") {
                    output += `<td ${tdCStyle}>-</td>`;
                    continue;
                }
                const diff = adjustedResult - dc;
                let success = diff >= 10 ? 3 : diff >= 0 ? 2 : diff <= -10 ? 0 : 1;
                if (globalRoll == 20 && success < 3) success++;
                else if (globalRoll == 1 && success > 0) success--;
                const { dos: successAdj, label: labelAdj } = adjustDoS(
                    { die: rollD20, total: adjustedResult, delta: diff, dos: success },
                    skillResult.domains,
                    skillResult.rollOptions,
                );
                const text = successAdj === success ?
                    `<span style="color:${DOS_COLORS[success]}">${DOS_LABELS[success]}</span>` :
                    `<span style="text-decoration:line-through;">${DOS_LABELS[success]}</span><br />
                     <span style="color:${DOS_COLORS[successAdj]}" data-tooltip="${labelAdj}">${DOS_LABELS[successAdj]}</span>`;
                output += `<td ${tdCStyle}">${text}</td>`;
            }
            output += "</tr>";
            if (breakdown?.childElementCount > 0) {
                output += `<tr><td ${tdStyle} colspan="7">${breakdown.outerHTML}</td></tr>`;
            }
        }
        output += "</table>";

        // Lore skill DCs

        const loreDCs = DC_MODS.slice(dcIndex - 2, dcIndex + 4).map((dc) =>
            typeof dc === "number" ? dc + levelDC : "-"
        );

        output += `<table style="${tBorder}">
          <tr>
            <th ${tdStyle}>Lore Skill DCs</th>
            ${["1st", "2nd", "3rd", "4th", "5th", "6th"].map(i => `<th ${tdStyle}>${i}</th>`).join("")}
          </tr>
          <tr>
            <th ${tdStyle}>Unspecific</th>
            ${loreDCs.slice(1).map((dc) => `<td ${tdCStyle}">${dc}</td>`).join('')}
            <td ${tdStyle}>-</td>
          </tr>
          <tr>
            <th ${tdStyle}>Specific</th>
            ${loreDCs.map((dc) => `<td ${tdCStyle}>${dc}</td>`).join('')}
          </tr>
        </table>`;

        // Lore skills
        const loreSkills = await Promise.all(Object.values(actor.skills).filter((s) => s.lore).map(
            (s) => getSkillResult(s.slug, globalRoll, targetActor)
        ));
        output += skillListOutput("Lore Skill", loreSkills);
        output += conditionalModifiersOutput([...loreSkills, ...tokenSkills]);
        if (checkFeat('dubious-knowledge')) {
            output += `<p>${token?.name ?? actor.name} has @UUID[Compendium.pf2e.feats-srd.Item.1Bt7uCW2WI4sM84P]</p>`;
        }
        if (checkFeat('unmistakable-lore')) {
            output += `<p>${token?.name ?? actor.name} has @UUID[Compendium.pf2e.feats-srd.Item.XvX1EyxWbbBF32NV]</p>`;
        }
    }
}

// Notification and chat card
// ==========================

const makeFlags = () => {
    const flags = {
        context: {
            options: [ "action:recall-knowledge", "check:type:skill", "secret" ],
            origin: {
                token: token?.document.uuid,
                actor: actor.uuid
            },
            rollMode: CONST.DICE_ROLL_MODES.BLIND,
            traits: [ "concentrate", "secret" ],
            type: "skill-check",
        }
    };
    if (game.user.targets.size == 1) {
        const target = game.user.targets.first();
        flags.context.target = {
            token: target.document.uuid,
            actor: target.actor?.uuid,
        };
    }
    return flags;
};

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
    flags: { pf2e: makeFlags() },
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
