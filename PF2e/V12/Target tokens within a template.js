/*
This macro targets tokens within a template with some borrowed code from Idle's Toolbelt module.
- Hover over template
- Choose tokens' alliance to target
- Tokens with the chosen alliance will be targeted
*/

if ( canvas.templates.hover === null ) { return ui.notifications.info("Please hover mouse over template before executing macro. Must be in Measurement Controls to do this"); }
const template = canvas.templates.hover;
const hlId = template.highlightId;
const hL = canvas.grid.getHighlightLayer(hlId);

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
    const ids = [];
    let tokens = [];
    if ( type === "all" ) {
        tokens = canvas.tokens.placeables.filter( t => t.bounds.overlaps(template.bounds) );
    }
    else if ( type === "!party" ) {
        tokens = canvas.tokens.placeables.filter( t => t.bounds.overlaps(template.bounds) && t.actor.alliance !== "party" );
    }
    else {
        tokens = canvas.tokens.placeables.filter( t => t.bounds.overlaps(template.bounds) && t.actor.alliance === type );
    }
    for ( const tk of tokens ) {
        const gs = canvas.grid.size;
        const ds = canvas.dimensions.size;
        const tpos = [];
        for (let h = 0; h < tk.document.height; h++) {
            const tx = Math.floor(tk.x / gs) * gs;
            const ty = Math.floor(tk.y / gs) * gs;
            const y = ty + h * gs;
            tpos.push(`${tx}.${y}`);
            if (tk.document.width > 1) {
                for (let w = 1; w < tk.document.width; w++) {
                    tpos.push(`${tx + w * gs}.${y}`)
                }
            }
        }

        for (const p of tpos) {
            if (!hL.positions.has(p)) {
                continue
            }
            const [gx, gy] = p.split('.').map(s => Number(s));
            const destination = {
                x: gx + ds * 0.5,
                y: gy + ds * 0.5,
            }
            if (destination.x < 0 || destination.y < 0) continue;

            if ( template.document.flags.pf2e?.origin?.traits.includes("auditory") && !template.document.flags.pf2e?.origin?.traits.includes("visual") && !CONFIG.Canvas.polygonBackends["sound"].testCollision(template.center, destination,{type:"sound",mode:"any"})) {
                ids.push(tk.id);
                break;
            }
            else if ( template.document.flags.pf2e?.origin?.traits.includes("visual") && template.document.flags.pf2e?.origin?.traits.includes("auditory") && !CONFIG.Canvas.polygonBackends["sight"].testCollision(template.center, destination,{type:"sight",mode:"any"}) && !CONFIG.Canvas.polygonBackends["sound"].testCollision(template.center, destination,{type:"sound",mode:"any"})) {
                ids.push(tk.id);
                break;
            }
            else if ( template.document.flags.pf2e?.origin?.traits.includes("visual") && !template.document.flags.pf2e?.origin?.traits.includes("auditory") && !CONFIG.Canvas.polygonBackends["sight"].testCollision(template.center, destination,{type:"sight",mode:"any"})) {
                ids.push(tk.id);
                break;
            }
            else  if ( !CONFIG.Canvas.polygonBackends["move"].testCollision(template.center, destination,{type:"move",mode:"any"})) {
                ids.push(tk.id);
                break;
            }
        }
    }
    return ids;
}
