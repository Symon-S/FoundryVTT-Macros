/**
 * Simple mass initiative roller
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

async function Initiative(s) {
	for ( const c of canvas.tokens.controlled ) {
		if (!c.actor) { 
			ui.notifications.warn(`Token ${c.id} does not have a valid actor`);
			continue;	
		}
		if (!c.actor.system.initiative) {
			ui.notifications.info(`Token ${c.id} does not have an initiative`);
			continue;
		}
		const createCombatants = !game.combat?.combatants.some(x => x.tokenId === c.id) ?? true;
		await c.actor.update({"system.initiative.statistic": s});
		await c.actor.rollInitiative({createCombatants, rerollInitiative: true});
		await c.actor.update({"system.initiative.statistic": "perception"});
	}
}

let myElem = [...document.getElementsByClassName("dialog-buttons")].pop();
if (myElem?.style === undefined) { myElem = [...document.getElementsByClassName("dialog-buttons")].pop(); }
myElem.style.display = "inline-block";
myElem.style.columns = 4;
myElem.style["column-gap"] = "5px";