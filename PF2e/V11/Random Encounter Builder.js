/*
    This Macro creates random encounters using a folder in the actor's tab named "Random Encounter".
    Simply Populate the folder with actors, run the macro and select the NPCs.
    Or create subfolders and populate those with NPCs.
    Place the enemies where you want to spawn them as groups.
    This Macro requires the WarpGate Module.
    It is recommended to only use this with lower level enemies than the party.
    Double check your XP budget before starting an encounter.
*/

if (!game.modules.has("warpgate") || !game.modules.getName("warpgate")?.active) { return void ui.notifications.warn("This macro requires the Warpgate Module"); }

if ( game.folders.filter(x => x.name ==="Random Encounter" && x.type === "Actor").length > 1 ) { return void ui.notifications.warn("You have multiple folders named Random Encounter in the Actors tab"); }

if ( game.folders.filter(x => x.name ==="Random Encounter" && x.type === "Actor").length < 1 ) { return void ui.notifications.warn("You don't have a folder named Random Encounter in the Actors tab"); }

let folder = game.folders.find(x => x.name ==="Random Encounter" && x.type === "Actor");
if (folder.children.length > 0) {
    const folders = folder.children;
    if ( folders.length > 1 ) {
        let content = `<div class="form-group">
            <label for="exampleSelect">Choose subfolder containing NPCs:&nbsp</label>
            <select id="exampleSelect" autofocus>
        `;
        for ( const f of folders ) {
            content += `<option value=${(f.folder.id)}>${f.folder.name}</option>`
        }
        content += "</select></div>"
        folder = await Dialog.prompt({
            title: "Select Folder with NPCs",
            content,
            callback: (html) => { return game.folders.get(html.find("#exampleSelect").val()); },
            rejectClose: false
        },{width:"auto"});
    }
    else {
        folder = folders[0].folder;
    }
}

let npcs = game.actors.filter(f => f.folder?.id === folder.id);
if (folder.name === "Random Encounter" && npcs.length < 1) { return void ui.notifications.warn("You have no actors in the Random Ecnounter Folder")}
if (folder.name !== "Random Encounter" && npcs.length < 1) { return void ui.notifications.warn(`You have no actors in the subfolder ${folder.name} within the Random Ecnounter Folder`)}

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
    acn.push(npc.name);
    if (npcs.length === 1 || acn.length === npcs.length) { random = amount }
    amount = amount - random;
    await warpgate.spawn(npc.name, {token: {height: size[npc.size], width: size[npc.size]}}, {}, {duplicates:random});
}