/*
This macro target tokens within a template
- Hover over template
- Choose tokens' alliance to target
- Tokens with the chosen alliance will be targeted
*/

if ( canvas.templates.hover === null ) { return ui.notifications.info("Please hover mouse over template before executing macro"); }
const hlId = canvas.templates.hover.highlightId;
const coords = [...canvas.grid.getHighlightLayer(hlId).positions];
const toks = await Dialog.wait({
    title:"Tokens to select:",
    buttons: {
        all: {
            label: "All",
            callback: () => { return canvas.tokens.placeables.filter( c => coords.includes(`${c.x}.${c.y}`)).map( i => i.id ) },   
        },
        opp: {
            label: "Opposition",
            callback: () => { return canvas.tokens.placeables.filter( c => c.actor.alliance === "opposition" && coords.includes(`${c.x}.${c.y}`)).map( i => i.id ) },
        },
        nopp: {
            label: `Opposition/Neutral`,
            callback: () => { return canvas.tokens.placeables.filter( c => c.actor.alliance !== "party" && coords.includes(`${c.x}.${c.y}`)).map( i => i.id ) },
        },
        party: {
            label: "Party",
            callback: () => { return canvas.tokens.placeables.filter( c => c.actor.alliance === "party" && coords.includes(`${c.x}.${c.y}`)).map( i => i.id ) },
        }
    }
});
await game.user.updateTokenTargets(toks);
