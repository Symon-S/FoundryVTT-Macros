/*
This macro target tokens within a template
- Hover over template
- Choose tokens' alliance to target
- Tokens with the chosen alliance will be targeted
*/

if ( canvas.templates.hover === null ) { return ui.notifications.info("Please hover mouse over template before executing macro. Must be in Measurement Controls to do this"); }
const template = canvas.templates.hover;
const hlId = template.highlightId;
const tx = template.x;
const ty = template.y;
const coords = [...canvas.grid.getHighlightLayer(hlId).positions];
let col = "move";
if ( template.document.flags.pf2e?.origin?.traits.includes("light") && !template.document.flags.pf2e?.origin?.traits.includes("visual") ) { col = "light" }
if ( template.document.flags.pf2e?.origin?.traits.includes("visual") ) { col = "sight" }
if ( template.document.flags.pf2e?.origin?.traits.includes("auditory") ) { col = "sound" }
const toks = await Dialog.wait({
    title:"Tokens to select:",
    buttons: {
        all: {
            label: "All",
            callback: () => { return canvas.tokens.placeables.filter( c => coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends[col].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:col,mode:"any"})).map( i => i.id ) },   
        },
        opp: {
            label: "Opposition",
            callback: () => { return canvas.tokens.placeables.filter( c => c.actor.alliance === "opposition" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends[col].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:col,mode:"any"})).map( i => i.id ) },
        },
        nopp: {
            label: `Opposition/Neutral`,
            callback: () => { return canvas.tokens.placeables.filter( c => c.actor.alliance !== "party" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends[col].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:col,mode:"any"})).map( i => i.id ) },
        },
        party: {
            label: "Party",
            callback: () => { return canvas.tokens.placeables.filter( c => c.actor.alliance === "party" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends[col].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:col,mode:"any"})).map( i => i.id ) },
        }
    },
    close: () => { return "close" }
});
if (toks === "close") { return }
await game.user.updateTokenTargets(toks);
