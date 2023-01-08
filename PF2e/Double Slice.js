if ( canvas.tokens.controlled.length !== 1 ) { return ui.notifications.info( "Please select 1 token" ) }

if ( game.user.targets.first() === undefined ) { return ui.notifications.info( "Please target a token" )}

if ( !token.actor.itemTypes.feat.some(f => f.slug === "double-slice") ) { return ui.notifications.warn( `${token.name} does not have the Double Slice feat!` ) }

if ( token.actor.itemTypes.weapon.filter( h => h.isMelee && h.isHeld && h.hands === "1" && h.handsHeld === 1 ).length > 2 ) { return ui.notifications.info( "To use the double slice macro, only 2 one-handed melee weapons can be equipped at a time." ) }

if ( token.actor.itemTypes.weapon.filter( h => h.isMelee && h.isHeld && h.hands === "1" && h.handsHeld === 1  ).length < 2 ) { return ui.notifications.info( "Please equip/draw 2 one-handed melee weapons." ) }

const DamageRoll = CONFIG.Dice.rolls.find(( (R) => R.name === "DamageRoll" ));

let weapons = token.actor.system.actions.filter( h => h.item?.isMelee && h.item?.isHeld && h.item?.hands === "1" && h.item?.handsHeld === 1 );

let primary = weapons[0];
let secondary = weapons[1];
if ( weapons.filter( a => a.item.system.traits.value.includes("agile") ).length === 1 ) {
    primary = weapons.find( a => !a.item.system.traits.value.includes("agile") );
    secondary = weapons.find( a => a.item.system.traits.value.includes("agile") );
}

let pdos;
function PDOS(cm) {
    if (cm.user.id === game.userId && cm.isCheckRoll) { pdos = cm.flags.pf2e.context.outcome; }
}

let sdos;
function SDOS(cm) {
    if (cm.user.id === game.userId && cm.isCheckRoll) { sdos = cm.flags.pf2e.context.outcome; }
}

let pd,sd;

Hooks.once('renderChatMessage', PDOS);
await primary.attack({event});

Hooks.once('renderChatMessage', SDOS);
await secondary.attack({event});

if ( pdos === "failure" || pdos === "criticalFailure" ) {
    if ( sdos === "success" ) {
        return await secondary.damage({event})
    }
    if ( sdos === "criticalSuccess" ) { 
        return await secondary.critical({event})
    }
    else { return }
}

if ( sdos === "failure" || sdos === "criticalFailure" ) {
    if ( pdos === "success" ) {
        return await primary.damage({event})
    }
    if ( pdos === "criticalSuccess" ) { 
        return await primary.critical({event}) 
    }
    else { return }
}

if ( pdos === "success" ) {
    pd = await primary.damage({event})
}

if ( pdos === "criticalSuccess" ) {
    pd = await primary.critical({event})
}

if ( sdos === "success" ) {
    sd = await secondary.damage({event})
}

if ( sdos === "criticalSuccess" ) {
    sd = await secondary.critical({event})
}

const ft = `{${pd._formula.replace(/{/g, '').replace(/}/g, '')},${sd._formula.replace(/{/g, '').replace(/}/g, '')}}`;
const instances = pd.instances.concat(sd.instances);

const dam = new DamageRoll(ft);
dam._total = pd.total + sd.total;
dam._evaluated = true;

let n = 0;
for ( i of instances ) {
    const x = n++;
    dam.instances[x]._total = i.total;
    dam.instances[x]._evaluated = true;
}

await dam.toMessage({
    flavor: `<strong>Double Slice Total Damage</strong>`,
    speaker: ChatMessage.getSpeaker()
});
