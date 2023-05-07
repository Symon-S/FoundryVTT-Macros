/*
Based on the macro by bipedalshark and WesBelmont and Allalinor.
updated by darkim, Dalvyn, and julie.winchester

Recall Knowledge
This macro will roll several knowledge checks if no target is selected.
If one ore more targets are selected it will only roll the relevant knowledge skills and compare the result to the DC.
Handles lore skills (as far as possible)
Handles Cognitive Mutagen and other Bonus effects


Limitations:
* Does not handle assurance.
* Does not handle things like bardic knowledge.
*/

if (!game.modules.get("xdy-pf2e-workbench")?.active) {
    return ui.notifications.error("This Macro requires PF2e Workbench module");
}

if (canvas.tokens.controlled.length !== 1) {
    return ui.notifications.warn('You need to select exactly one token to perform Recall Knowledge.');
}

const SKILL_OPTIONS = ["arcana", "crafting", "medicine", "nature", "occultism", "religion", "society"];
const SKILL_SHORTFORM = {
    acrobatics: "acr",
    arcana: "arc",
    athletics: "ath",
    crafting: "cra",
    deception: "dec",
    diplomacy: "dip",
    intimidation: "itm",
    medicine: "med",
    nature: "nat",
    occultism: "occ",
    performance: "prf",
    religion: "rel",
    society: "soc",
    stealth: "ste",
    survival: "sur",
    thievery: "thi",
};
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
    undead: ["religion"]
};
const RANK_COLORS = ["#443730", "#171f69", "#3c005e", "#5e4000", "#5e0000"];
const RANK_NAMES = ["UNTRAINED", "TRAINED", "EXPERT", "MASTER", "LEGENDARY"];
const OUTCOMES = [
    "<span style='color:red'>CrFail</span>",
    "<span style='color:orange'>Fail</span>",
    "<span style='color:royalblue'>Suc</span>",
    "<span style='color:green'>CrSuc</span>"
];
const DC_MODS = [-5, -2, 0, 2, 5, 10, "-", "-", "-"];
const FIRST_DC_INDEX = {
    "common" : 2,
    "uncommon" : 3,
    "rare" : 4,
    "unique" : 5,
}

// Get token skills infos by simulating fake rolls
// ===============================================

const tokenSkills = {};
const loreSkills = [];
const appliedModifiers = [];
for (const skill in token.actor.skills) {
    let fakeRoll;
    const rank = token.actor.skills[skill].rank;
    await token.actor.skills[skill].roll({
        callback: (res) => {fakeRoll = res;},
        createMessage: false,
        skipDialog: true,
        extraRollOptions: ["action:recall-knowledge", "skill-check", `skill:rank:${rank}`],
    });
    const fakeRollDieResult = fakeRoll.dice[0].values[0];

    // find conditional RK modifiers
    const conditionalModifiers = [];
    const rollOptions = [
        ...token.actor.getRollOptions([ "all", "skill-check" ]),
        "action:recall-knowledge", "skill-check", `skill:rank:${rank}`
    ];
    const coreSkill = token.actor.system.skills[SKILL_SHORTFORM[skill] || skill];
    const recallKnowledgeModifiers = coreSkill._modifiers.filter(
        mod => mod.predicate.includes("action:recall-knowledge")
    );
    for (const mod of recallKnowledgeModifiers) {
        mod.predicate.test(rollOptions) ? appliedModifiers.push(mod.slug) : conditionalModifiers.push(mod);
    }

    if (token.actor.skills[skill].lore) loreSkills.push(skill);
    tokenSkills[skill] = {
        conditionalModifiers: conditionalModifiers,
        label: token.actor.skills[skill].label,
        modifier: fakeRoll.total - fakeRollDieResult,
        rank
    };
}

// Global d20 roll used for all skills
// ===================================

const globalRoll = (await new Roll("1d20").roll({async: true })).total;
const rollColor = globalRoll == 20 ? "green" : globalRoll == 1 ? "red" : "royalblue";


// Skill list output
// =================

const skillListOutput = (title, skills) => {
    let output = `<table><tr><th>${title}</th><th>Prof</th><th>Mod</th><th>Result</th></tr>`;
    for (const skill of skills) {
        const {label, modifier, rank} = tokenSkills[skill];
        const adjustedResult = globalRoll + modifier;
        output += `<tr><th>${label}</th>
            <td class="tags"><div class="tag" style="background-color: ${RANK_COLORS[rank]}; white-space:nowrap">${RANK_NAMES[rank]}</td>
            <td>${modifier >= 0 ? "+" : ""}${modifier}</td>
            <td><span style="color: ${rollColor}">${adjustedResult}</span></td></tr>`;
    }
    output += "</table>";
    return output;
};

// Conditional modifier output
// ==========================

const conditionalModifiersOutput = (skills) => {
    // Find unique modifiers that are never successfully applied for any skill or lore to inform user
    const allModifiers = skills.map(s => tokenSkills[s].conditionalModifiers).flat();
    const uniqModifiers = [ ...new Map(allModifiers.map((mod) => [mod.slug, mod])).values() ];
    const exclModifiers = uniqModifiers.filter(mod => !appliedModifiers.includes(mod.slug));
    if (exclModifiers.length === 0) return "";

    let output = `<table style="font-size: 12px"><tr><th>Potential Modifiers</th><th>Mod</th></tr>`;
    for (const mod of exclModifiers) {
        const {label, signedValue, source} = mod;
        output += `<tr><td><a class="content-link" draggable="true" data-uuid="${source}"><i class="fas fa-suitcase"></i>${label}</a></td><td>${signedValue}</td></tr>`
    }
    output += "</table>";
    return output;
};


// Creating output
// ===============

let output = `<strong>Recall Knowledge</strong> (Roll: <span style="color: ${rollColor}">${globalRoll}</span>)`;

if (game.user.targets.size < 1){
// No target - roll all Recall Knowledge and lore skills

    const allRKSkills = [...SKILL_OPTIONS, ...loreSkills];
    output += skillListOutput("Skill", allRKSkills);
    output += conditionalModifiersOutput(allRKSkills);

} else {
// Target - roll corresponding Recall Knowledge skills and lore skills

    for (const target of game.user.targets){

        const targetActor = target.actor;

        const level = targetActor.system.details.level.value;
        const actortype = targetActor.system.traits.value;
        const rarity = targetActor.rarity;

        let levelDC;
        if (level > 20) {
            levelDC = level * 2;
        } else {
            levelDC = 14 + level + ((level < 0) ? 0 : Math.floor(level/3));
        }

        output += `<br/><strong>vs. ${targetActor.name}</strong>`;

        // Primary skills

        const dcIndex = FIRST_DC_INDEX[rarity];
        const DCs = DC_MODS.slice(dcIndex, dcIndex + 4).map(dc => typeof dc === "number" ? dc + levelDC : "-");

        output += "<table><tr><td></td><td></td><td>";
        output += "<th style='text-align:center'>1st</th><th style='text-align:center'>2nd</th><th style='text-align:center'>3rd</th><th style='text-align:center'>4th</th></tr>";
        output += "<tr><th>Skill</th><td></td><td></td>";
        DCs.forEach(dc => output += `<th style='text-align:center'>${typeof dc === "number" ? "DC " + dc : "-"}</th>`);
        output += "</tr>";

        let primarySkills = [];
        if (targetActor.type !== "character") {
            for (const trait in IDENTIFY_SKILLS) {
                if (actortype.includes(trait)){
                    primarySkills = primarySkills.concat(IDENTIFY_SKILLS[trait])
                }
            }
        }
        primarySkills = [...new Set(primarySkills)];

        for (const skill of primarySkills) {
            const {label, modifier, rank} = tokenSkills[skill];
            const adjustedResult = globalRoll + modifier;

            output += `<tr><th>${label}
                </th><td class="tags"><div class="tag" style="background-color: ${RANK_COLORS[rank]}; white-space:nowrap">${RANK_NAMES[rank][0]}</td>
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
        }
        output += "</table>";

        // Lore skill DCs

        const loreDCs = DC_MODS.slice(dcIndex - 2, dcIndex + 4).map(dc => typeof dc === "number" ? dc + levelDC : "-");

        output += "<table><tr><th>Lore Skill DCs</th>";
        output += "<th>1st</th><th>2nd</th><th>3rd</th><th>4th</th><th>5th</th><th>6th</th></tr>";
        output += "<tr><th>Unspecific</th>";
        loreDCs.slice(1).forEach(dc => output += `<td style="text-align:center">${dc}</td>`);
        output += "<td>-</td></tr><tr><th>Specific</th>";
        loreDCs.forEach(dc => output += `<td style="text-align:center">${dc}</td>`);
        output += "</tr></table>";

        // Lore skills

        output += skillListOutput("Lore Skill", loreSkills);
        output += conditionalModifiersOutput([...primarySkills, ...loreSkills]);

    }
}

// Notification and chat card
// ==========================

ui.notifications.info(`${token.name} tries to remember if they've heard something related to this.`)
await ChatMessage.create({
    user: game.userId,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    content: output,
    whisper: game.users.contents.flatMap((user) => (user.isGM ? user.id : [])),
    visible: false,
    blind: true,
    speaker: ChatMessage.getSpeaker(),
    flags: { "xdy-pf2e-workbench.minimumUserRole": CONST.USER_ROLES.GAMEMASTER },
});
