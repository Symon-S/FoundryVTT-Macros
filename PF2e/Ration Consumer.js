/*
This Macro pulls all the PCs with player owners who are online and consumes x amount of rations
It uses the consume function from system, so it is a little spammy.
When finished it will output how many days of rations were consumed over the elapsed time.
It will also fire warnings to the GM when PCs have no more rations
*/

if (!game.user.isGM) { return ui.notifications.warn("This Macro can only be used by the GM");}
const uIds = game.users.filter(x => !x.isGM && x.active).map(i => i.id);
if (uIds.length < 1) { return ui.notifications.warn("This Macro requires players to be logged into the game to work.") }
const days = await Dialog.wait({
    title: "Ration Consumer",
    content: `<table><tr><th>How many days worth?</th> <th><input id ="days" type="number" autofocus onfocus="this.select()" value="1"></th></tr></table>`,
    buttons: {
        ok: {
            icon: '<i class="fas fa-meat"></i>',
            label: "Consume",
            callback: (html) => {
                return html[0].querySelector("#days").value;
            }
        },
        cancel: {
            label: "Cancel",
        }
    },
    default:"ok",
},{width:300});
if (days === "cancel") { return }
const consume = Array.fromRange(days,1);
let ate = [];
const comp = ["Construct Companion","Eidolon","Animal Companion"]
for (a of game.actors.contents) {
    let tof = false;
    for (ids of uIds) {
        if (a.ownership[ids] === 3) { tof = true; }
    }
    if (a.type !== "character" || !a.hasPlayerOwner || !tof || comp.includes(a.class.name)) {
        continue;
    }
    if (!a.itemTypes.consumable.some(r => r.slug === "rations")) { 
        ui.notifications.warn(`${a.name} has no rations left`);
        ate.push({name:a.name, xdays:0})
        continue;
    }
    let xdays = parseInt(days);

    for (c of consume) {
        if (!a.itemTypes.consumable.some(r => r.slug === "rations")) { 
            ui.notifications.warn(`${a.name} has no rations left`);
            xdays = c;
            break;
        }
        await a.itemTypes.consumable.find(r => r.slug === "rations").consume();
    }
    ate.push({name:a.name, xdays});
}

let content = ''
for (t of ate) {
    content += `<strong>${t.name}</strong> has consumed <strong>${t.xdays}</strong> of <strong>${days}</strong> days of rations<br><br>`
}
await ChatMessage.create({
    content,
    whisper: [game.userId]
});
