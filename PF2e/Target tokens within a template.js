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

const toks = await Dialog.wait({
    title:"Tokens to select:",
    buttons: {
        all: {
            label: "All",
            callback: () => { return FilterTargets("all") },   
        },
        opp: {
            label: "Opposition",
            callback: () => { return FilterTargets("opposition") },
        },
        nopp: {
            label: `Opposition/Neutral`,
            callback: () => { return FilterTargets("!party") },
        },
        party: {
            label: "Party",
            callback: () => { return FilterTargets("party") },
        }
    },
    close: () => { return "close" }
});
if (toks === "close") { return }
await game.user.updateTokenTargets(toks);

function FilterTargets (type) {
    let ids = [];
    if ( type === "all" ) {
        if ( template.document.flags.pf2e?.origin?.traits.includes("auditory") && !template.document.flags.pf2e?.origin?.traits.includes("visual") ) {
            ids = canvas.tokens.placeables.filter( c => coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["sound"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"sound",mode:"any"})).map( i => i.id );
        }
        else if ( template.document.flags.pf2e?.origin?.traits.includes("visual") && template.document.flags.pf2e?.origin?.traits.includes("auditory") ) {
            ids = canvas.tokens.placeables.filter( c => coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["sight"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"sight",mode:"any"}) && !CONFIG.Canvas.polygonBackends["sound"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"sound",mode:"any"})).map( i => i.id );
        }
        
        else if ( template.document.flags.pf2e?.origin?.traits.includes("visual") && !template.document.flags.pf2e?.origin?.traits.includes("auditory") ) {
            ids = canvas.tokens.placeables.filter( c => coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["sight"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"sight",mode:"any"})).map( i => i.id );
        }
        else {
            ids = canvas.tokens.placeables.filter( c => coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["move"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"move",mode:"any"})).map( i => i.id );
        }
    }
    if ( type === "opposition" ) {
        if ( template.document.flags.pf2e?.origin?.traits.includes("auditory") && !template.document.flags.pf2e?.origin?.traits.includes("visual") ) {
            ids = canvas.tokens.placeables.filter( c => c.actor.alliance === "opposition" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["sound"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"sound",mode:"any"})).map( i => i.id );
        }
        else if ( template.document.flags.pf2e?.origin?.traits.includes("visual") && template.document.flags.pf2e?.origin?.traits.includes("auditory") ) {
            ids = canvas.tokens.placeables.filter( c => c.actor.alliance === "opposition" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["sight"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"sight",mode:"any"}) && !CONFIG.Canvas.polygonBackends["sound"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"sound",mode:"any"})).map( i => i.id );
        }
        
        else if ( template.document.flags.pf2e?.origin?.traits.includes("visual") && !template.document.flags.pf2e?.origin?.traits.includes("auditory") ) {
            ids = canvas.tokens.placeables.filter( c => c.actor.alliance === "opposition" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["sight"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"sight",mode:"any"})).map( i => i.id );
        }
        else {
            ids = canvas.tokens.placeables.filter( c => c.actor.alliance === "opposition" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["move"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"move",mode:"any"})).map( i => i.id );
        }
    }
    if ( type === "party" ) {
        if ( template.document.flags.pf2e?.origin?.traits.includes("auditory") && !template.document.flags.pf2e?.origin?.traits.includes("visual") ) {
            ids = canvas.tokens.placeables.filter( c => c.actor.alliance === "party" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["sound"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"sound",mode:"any"})).map( i => i.id );
        }
        else if ( template.document.flags.pf2e?.origin?.traits.includes("visual") && template.document.flags.pf2e?.origin?.traits.includes("auditory") ) {
            ids = canvas.tokens.placeables.filter( c => c.actor.alliance === "party" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["sight"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"sight",mode:"any"}) && !CONFIG.Canvas.polygonBackends["sound"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"sound",mode:"any"})).map( i => i.id );
        }
        
        else if ( template.document.flags.pf2e?.origin?.traits.includes("visual") && !template.document.flags.pf2e?.origin?.traits.includes("auditory") ) {
            ids = canvas.tokens.placeables.filter( c => c.actor.alliance === "party" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["sight"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"sight",mode:"any"})).map( i => i.id );
        }
        else {
            ids = canvas.tokens.placeables.filter( c => c.actor.alliance === "party" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["move"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"move",mode:"any"})).map( i => i.id );
        }
    }
    if ( type === "!party" ) {
        if ( template.document.flags.pf2e?.origin?.traits.includes("auditory") && !template.document.flags.pf2e?.origin?.traits.includes("visual") ) {
            ids = canvas.tokens.placeables.filter( c => c.actor.alliance !== "party" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["sound"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"sound",mode:"any"})).map( i => i.id );
        }
        else if ( template.document.flags.pf2e?.origin?.traits.includes("visual") && template.document.flags.pf2e?.origin?.traits.includes("auditory") ) {
            ids = canvas.tokens.placeables.filter( c => c.actor.alliance !== "party" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["sight"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"sight",mode:"any"}) && !CONFIG.Canvas.polygonBackends["sound"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"sound",mode:"any"})).map( i => i.id );
        }
        
        else if ( template.document.flags.pf2e?.origin?.traits.includes("visual") && !template.document.flags.pf2e?.origin?.traits.includes("auditory") ) {
            ids = canvas.tokens.placeables.filter( c => c.actor.alliance !== "party" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["sight"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"sight",mode:"any"})).map( i => i.id );
        }
        else {
            ids = canvas.tokens.placeables.filter( c => c.actor.alliance !== "party" && coords.includes(`${c.x}.${c.y}`) && !CONFIG.Canvas.polygonBackends["move"].testCollision({x:tx,y:ty},{x:c.x,y:c.y},{type:"move",mode:"any"})).map( i => i.id );
        }
    }
    return ids;
}
