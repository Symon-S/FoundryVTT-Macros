/**
 * Simple mass initiative roller that rolls initiative on the currently selected scene and current combat.
 * This mass roller will also create a combat, if there isn't a current one.
 * Select all tokens you want to roll initiative for with a specific skill, then click on the applicable skill.
 * This macro was created for use with NPCs, but can be used with any actors with initiative.
 */

if (canvas.tokens.controlled.length === 0) return void ui.notifications.warn("You must select at least one token");
const skills = Object.keys(CONFIG.PF2E.skills);
const buttons = {}
for ( const s of skills ) {
	buttons[s] = { label: s.capitalize(), callback: async () => await Initiative(s) }
}

await new Promise(async (resolve) => {
    setTimeout(resolve,50);
	await new Dialog ({
		title: "Mass Initiative Roller",
		buttons,
		close: () => { return }
	}).render(true);
});

async function Initiative(statistic) {
	if (!game.combat) await Combat.create();
	for ( const c of canvas.tokens.controlled ) {
		if (!c.actor) { 
			ui.notifications.warn(`Token ${c.id} does not have a valid actor`);
			continue;	
		}
		if (!c.actor.system.initiative) {
			ui.notifications.info(`Token ${c.id} does not have an initiative`);
			continue;
		}
		await new c.actor.initiative.constructor(c.actor,{statistic, tiebreakPriority: c.actor.initiative.tiebreakPriority}).roll();
	}
}

let myElem = [...document.getElementsByClassName("dialog-buttons")].pop();
if (myElem?.style === undefined) { myElem = [...document.getElementsByClassName("dialog-buttons")].pop(); }
myElem.style.display = "inline-block";
myElem.style.columns = 4;
myElem.style["column-gap"] = "5px";