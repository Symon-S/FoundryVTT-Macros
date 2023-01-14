if (canvas.tokens.controlled.length !== 1) { return ui.notifications.info("Please select 1 token") }

if ( !token.actor.itemTypes.feat.some(f => f.slug === "double-slice") ) { return ui.notifications.warn(`${token.name} does not have the Double Slice feat!`) }

if ( token.actor.itemTypes.weapon.filter( h => h.isMelee && h.isHeld && h.hands === "1" && h.handsHeld === 1 && !h.system.traits.value.includes("unarmed") ).length > 2 ) { return ui.notifications.info("To use the double slice macro, only 2 one-handed melee weapons can be equipped at a time.") }

if ( token.actor.itemTypes.weapon.filter( h => h.isMelee && h.isHeld && h.hands === "1" && h.handsHeld === 1 && !h.system.traits.value.includes("unarmed") ).length < 2 ) { return ui.notifications.info("Please equip/draw 2 one-handed melee weapons.") }

const DamageRoll = CONFIG.Dice.rolls.find( r => r.name === "DamageRoll" );

let weapons = token.actor.system.actions.filter( h => h.item?.isMelee && h.item?.isHeld && h.item?.hands === "1" && h.item?.handsHeld === 1 && !h.item?.system?.traits?.value?.includes("unarmed") );

let options = ["double-slice-second"];
let primary = weapons[0];
let secondary = weapons[1];
if ( weapons.filter( a => a.item.system.traits.value.includes("agile") ).length === 1 ) {
    primary = weapons.find( a => !a.item.system.traits.value.includes("agile") );
    secondary = weapons.find( a => a.item.system.traits.value.includes("agile") );
}

const map = await Dialog.wait({
    title:"Current MAP",
    content: `
        <select>
            <option value=0>${primary.variants[0].label}</option>
            <option value=1>${primary.variants[1].label}</option>
            <option value=2>${primary.variants[2].label}</option>
        </select>
    `,
    buttons: {
            ok: {
                label: "Double Slice",
                icon: "<i class='fa-solid fa-swords'></i>",
                callback: (html) => { return parseInt(html[0].querySelector("select").value) }
            },
            cancel: {
                label: "Cancel",
                icon: "<i class='fa-solid fa-ban'></i>",
            }
    }
},{width:250});

if ( map === "cancel" ) { return; }

let pdos;
function PDOS(cm) {
    if (cm.user.id === game.userId && cm.isCheckRoll) { pdos = cm.flags.pf2e.context.outcome; }
}

let sdos;
function SDOS(cm) {
    if (cm.user.id === game.userId && cm.isCheckRoll) { sdos = cm.flags.pf2e.context.outcome; }
}

let pd,sd,cm1,cm2;
function PD(cm) {
    if ( cm.user.id === game.userId && cm.isDamageRoll && cm.item === primary.item ) {
        pd = cm.rolls[0];
        cm1 = cm;
        cm.delete();
    }
}

function SD(cm) {
    if ( cm.user.id === game.userId && cm.isDamageRoll && cm.item === secondary.item ) {
        sd = cm.rolls[0];
        cm2 = cm;
        cm.delete();
    }
}

Hooks.on('renderChatMessage', PD);
Hooks.on('renderChatMessage', SD);

Hooks.once('renderChatMessage', PDOS);
await primary.variants[map].roll({skipDialog:true, event });

Hooks.once('renderChatMessage', SDOS);
await secondary.variants[map].roll({skipDialog:true, options, event});

if ( (!game.modules.has('xdy-pf2e-workbench') || !game.modules.get('xdy-pf2e-workbench')?.active ) || ( game.modules.get('xdy-pf2e-workbench')?.active && !game.settings.get("xdy-pf2e-workbench","autoRollDamageForStrike")) ) {
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
        await primary.damage({event})
    }
    
    if ( pdos === "criticalSuccess" ) {
        await primary.critical({event})
    }
    
    if ( sdos === "success" ) {
        await secondary.damage({event})
    }
    
    if ( sdos === "criticalSuccess" ) {
        await secondary.critical({event})
    }

    else { return }
}

await new Promise(async (resolve) => {
    setTimeout(resolve,200);
});

Hooks.off('renderChatMessage', PD);
Hooks.off('renderChatMessage', SD);

if ( cm2 === undefined ) { 
    if ( pdos === "success") {
        return await primary.damage({event})
    }
    if ( pdos === "criticalSuccess" ) {
        return await primary.critical({event})
    } 
}

if ( cm1 === undefined ) { 
    if ( sdos === "success") {
        return await secondary.damage({event})
    }
    if ( sdos === "criticalSuccess" ) {
        return await secondary.critical({event})
    } 
}


const instances = pd.terms.concat(sd.terms);

const terms = pd.terms[0].terms.concat(sd.terms[0].terms);
const type = pd.terms[0].rolls.map(t => t.type).concat(sd.terms[0].rolls.map(t => t.type));
const persistent = pd.terms[0].rolls.map(t => t.persistent).concat(sd.terms[0].rolls.map(t => t.persistent));

if ( instances.filter( i => i.dice.some( o => o.options?.flavor === "precision" ) ).length === 2 ) {
    const p0 = instances[0].rolls.find( o => o.dice.some( f => f.options.flavor === "precision" ) );
    const p1 = instances[1].rolls.find( o => o.dice.some( f => f.options.flavor === "precision" ) );
    
    if ( p0.type === p1.type && instances[0].dice.find( f => f.options?.flavor === "precision" ).formula === instances[1].dice.find( f => f.options.flavor === "precision" ).formula ) {
        const formula = instances[1].dice.find( f => f.options?.flavor === "precision" ).formula;
        terms.filter( f => f.includes(formula) )[1].replace(formula,'');
    }
    
    else {
        const trp = await Dialog.wait({
            title:"Precision to remove",
            content: `
                <select>
                    <option value=1>${instances[1].dice.find( f => f.options.flavor === "precision" ).formula} ${p1.type}</option>
                    <option value=0>${instances[0].dice.find( f => f.options.flavor === "precision" ).formula} ${p0.type}</option>
                </select>
            `,
            buttons: {
                ok: {
                    label: "Remove",
                    icon: "<i class='fa-solid fa-eraser'></i>",
                    callback: (html) => { return parseInt(html[0].querySelector("select").value) }
                },
                cancel: {
                label: "Cancel",
                icon: "<i class='fa-solid fa-ban'></i>",
                },
            },
            default: "ok"
        },{width:250});
        if ( trp === "cancel" ) { return; }
        const formula = ` + ${instances[trp].dice.find( f => f.options.flavor === "precision" ).formula}`;
        let index = 0;
        if ( trp === 1 ) {
            terms.reverse();
            for ( const t of terms ) {
                 const i = index++;
                if ( t.includes(formula) ) {
                    terms[i] = terms[i].replace(formula,'');
                    terms.reverse();
                    break;
                }
            }
        }
        else {
            for ( const t of terms ) {
                if ( t.includes(formula) ) {
                    const i = index++;
                    terms[i] = terms[i].replace(formula,'');
                    break;
                }
            }
        }
    }
}

let preCombinedDamage = []
let combinedDamage = '{'
let i = 0;
for ( const t of terms ) {
    if ( persistent[i] ) {
        preCombinedDamage.push({ terms: [t], type: type[i], persistent: persistent[i] });
    }
    if ( !preCombinedDamage.some(pre => pre.type === type[i]) && !persistent[i] ) {
        preCombinedDamage.push({ terms: [terms[i]], type: type[i], persistent: persistent[i] });
    }
    else if ( !persistent[i] ) {
        preCombinedDamage.find( pre => pre.type === type[i] ).terms.push(t);
    }
    i++;
}

for ( p of preCombinedDamage ) {    
    if ( p.persistent ) {
    combinedDamage += `,${p.terms.join(",")}`;
    }
    else{
        if ( combinedDamage === '{' ) {
            if ( p.terms.length > 1 ){
                combinedDamage += `(${p.terms.join(" + ")})[${p.type}]`;
            
            }
            else {
                combinedDamage += p.terms[0];
            }
        }
        else if ( p.terms.length === 1 ) {
            combinedDamage += `,${p.terms[0]}`
        }
        else {
            combinedDamage += `,(${p.terms.join(" + ")})[${p.type}]`;
        }
    }
}

combinedDamage += "}";
const rolls = [await new DamageRoll(combinedDamage).evaluate({ async: true })]
let ncCombinedDamage = ""
let flavor = `<strong>Double Slice Total Damage</strong>`
flavor += `<hr>${cm1.flavor}<hr>${cm2.flavor}`
if ( pdos === "criticalSuccess" || sdos === "criticalSuccess" ) {
    flavor += `<hr><strong>TOP DAMAGE USED FOR CREATURES IMMUNE TO CRITICALS`
    rolls.unshift(ncCombinedDamage = await new DamageRoll(combinedDamage.replaceAll("2 * ", "")).evaluate({ async: true }));
}

options = [...new Set(cm1.flags.pf2e.context.options.concat(cm1.flags.pf2e.context.options))];
await ChatMessage.create({
    flags: { 
        pf2e: {
            context: {
                options
            }
        }
    },
    rolls,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    flavor,
    speaker: ChatMessage.getSpeaker(),
});
