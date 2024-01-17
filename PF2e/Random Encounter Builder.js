/*
    This Macro creates random encounters using a folder in the actor's tab named "Random Encounter".
    Simply Populate the folder with actors, run the macro and select the amount of enemies.
    Place the enemies where you want to spawn them as groups.
    This Macro requires the WarpGate Module.
    It is recommended to only use this with lower level enemies than the party.
    Double check your XP budget before starting an encounter.
*/

if (!game.modules.has("warpgate") || !game.modules.getName("warpgate")?.active) { return void ui.notifications.warn("This macro requires the Warpgate Module"); }

if ( game.folders.filter(x => x.name ==="Random Encounter" && x.type === "Actor").length > 1 ) { return void ui.notifications.warn("You have multiple folders named Random Encounter in the Actors tab"); }

if ( game.folders.filter(x => x.name ==="Random Encounter" && x.type === "Actor").length < 1 ) { return void ui.notifications.warn("You don't have a folder named Random Encounter in the Actors tab"); }

let npcs = game.actors.filter(f => f.folder?.name === "Random Encounter");
if (npcs.length < 1) { return void ui.notifications.warn("You have no actors in the Random Ecnounter Folder")}

let amount = await Dialog.prompt({
    title: "Random Encounter Builder",
    content: `<strong>Total Number of Random Enemies:&nbsp</strong> <input id="dcinput" type="number" autofocus style="width: 25px;text-align: center;" value=''>`,
    rejectClose: false,
    callback: (html) => { return html.find("#dcinput")[0].valueAsNumber }
});
const size = {
    tiny: 1,
    sm: 1,
    med: 1,
    lg: 2,
    huge: 3,
    grg: 4
}

const acn = [];
while (amount > 0 && acn.length < npcs.length) {
    const npc = npcs[Math.floor(Math.random() * npcs.length)]
    if ( acn.includes(npc.name) ) { continue }
    if ( amount <= 0 ) { break }
    let random = Math.floor(Math.random() * (amount - 1) + 1);
    if (npcs.length === 1 || npcs.length - acn.length === 1) { random = amount }
    acn.push(npc.name);
    amount = amount - random;
    await warpgate.spawn(npc.name, {token: {height: size[npc.size], width: size[npc.size]}}, {}, {duplicates:random});
}
