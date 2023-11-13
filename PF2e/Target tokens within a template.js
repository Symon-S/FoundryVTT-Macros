/*
This macro target tokens within a template
- Hover over template
- Choose tokens' alliance to target
- Tokens with the chosen alliance will be targeted
*/

if ( canvas.templates.hover === null ) { return ui.notifications.info("Please hover mouse over template before executing macro. Must be in Measurement Controls to do this"); }
const hlId = canvas.templates.hover.highlightId;
const tx = canvas.templates.hover.x;
const ty = canvas.templates.hover.y;
const coords = [...canvas.grid.getHighlightLayer(hlId).positions];
const toks = await Dialog.wait({
    title:"Tokens to select:",
    buttons: {
        all: {
            label: "All",
            callback: () => { return canvas.tokens.placeables.filter( c => coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["move"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"move",mode:"any"})).map( i => i.id ) },   
        },
        opp: {
            label: "Opposition",
            callback: () => { return canvas.tokens.placeables.filter( c => c.actor.alliance === "opposition" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["move"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"move",mode:"any"})).map( i => i.id ) },
        },
        nopp: {
            label: `Opposition/Neutral`,
            callback: () => { return canvas.tokens.placeables.filter( c => c.actor.alliance !== "party" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["move"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"move",mode:"any"})).map( i => i.id ) },
        },
        party: {
            label: "Party",
            callback: () => { return canvas.tokens.placeables.filter( c => c.actor.alliance === "party" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["move"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"move",mode:"any"})).map( i => i.id ) },
        }
    },
    close: () => { return "close" }
});
if (toks === "close") { return }
await game.user.updateTokenTargets(toks);
