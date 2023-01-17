if (canvas.tokens.controlled.length !== 1) { return ui.notifications.info("Please select 1 token") }

if ( !token.actor.itemTypes.action.some(f => f.slug === "flurry-of-blows") ) { return ui.notifications.warn(`${token.name} does not have Flurry of Blows action!`) }

const DamageRoll = CONFIG.Dice.rolls.find( r => r.name === "DamageRoll" );

let weapons = token.actor.system.actions.filter( h => h.visible && h.item?.isMelee && h.item?.system?.traits?.value?.includes("unarmed") );

if ( token.actor.itemTypes.effect.some( s => s.slug === "stance-monastic-archer-stance" ) && token.actor.system.actions.some( h => h.item?.isHeld && h.item?.group === "bow" )) { weapons.unshift(token.actor.system.actions.find( h => h.item?.isHeld && h.item?.group === "bow" )) }

let wtcf = '';
for ( const w of weapons ) {
    wtcf += `<option value=${w.item.id}>${w.item.name}</option>`
}

let cWeapon = await Dialog.wait({
    title:"Flurry of Blows",
    content: `
        <select id="fob1" autofocus>
            ${wtcf}
        </select><br>
        <select id="fob2">
            ${wtcf}
        </select><hr>
    `,
    buttons: {
            ok: {
                label: "FoB",
                icon: "<i class='fa-solid fa-hand-fist'></i>",
                callback: (html) => { return [html[0].querySelector("#fob1").value,html[0].querySelector("#fob2").value] }
            },
            cancel: {
                label: "Cancel",
                icon: "<i class='fa-solid fa-ban'></i>",
            }
    },
    default: "ok"
},{width:250});

if ( cWeapon === "cancel" ) { return; }

let primary = weapons.find( w => w.item.id === cWeapon[0] );
let secondary = weapons.find( w => w.item.id === cWeapon[1] );

let options = [""];

const map = await Dialog.wait({
    title:"Current MAP",
    content: `
        <select autofocus>
            <option value=0>No MAP</option>
            <option value=1>MAP 1</option>
            <option value=2>MAP 2</option>
        </select><hr>
    `,
    buttons: {
            ok: {
                label: "MAP",
                icon: "<i class='fa-solid fa-plus-minus'></i>",
                callback: (html) => { return parseInt(html[0].querySelector("select").value) }
            },
            cancel: {
                label: "Cancel",
                icon: "<i class='fa-solid fa-ban'></i>",
            }
    },
    default: 'ok'
},{width:250});

if ( map === "cancel" ) { return; }

const cM = [];
function PD(cm) {
    if ( cm.user.id === game.userId && cm.isDamageRoll ) {
        if ( !cM.map(f => f.flavor).includes(cm.flavor) ) {
            cM.push(cm);
        }
        return false;
    }
}

Hooks.on('preCreateChatMessage', PD);

let map2 = map + 1;
if( map === 2 ) { map2 = map }

const pdos = (await primary.variants[map].roll({skipDialog:true, event })).degreeOfSuccess;

const sdos = (await secondary.variants[map2].roll({skipDialog:true, options, event})).degreeOfSuccess;

let pd,sd;
if ( pdos === 2 ) { pd = await primary.damage({event}); }
if ( pdos === 3 ) { pd = await primary.critical({event}); }
if ( sdos === 2 ) { sd = await secondary.damage({event}); }
if ( sdos === 3 ) { sd = await secondary.critical({event}); }

Hooks.off('preCreateChatMessage', PD);

if ( sdos <= 1 ) { 
    if ( pdos === 2) {
        await primary.damage({event});
        return;
    }
    if ( pdos === 3 ) {
        await primary.critical({event});
        return;
    } 
}

if ( pdos <= 1 ) { 
    if ( sdos === 2) {
        await secondary.damage({event});
        return;
    }
    if ( sdos === 3 ) {
        await secondary.critical({event});
        return;
    } 
}

if ( pdos <=0 && sdos <= 1 ) { return }

else {

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
                    <select autofocus>
                        <option value=1>${instances[1].dice.find( f => f.options.flavor === "precision" ).formula} ${p1.type}</option>
                        <option value=0>${instances[0].dice.find( f => f.options.flavor === "precision" ).formula} ${p0.type}</option>
                    </select><hr>
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
    let flavor = `<strong>Flurry of Blows Total Damage</strong>`
    flavor += `<hr>${cM[0].flavor}<hr>${cM[1].flavor}`
    if ( pdos === 3 || sdos === 3 ) {
        flavor += `<hr><strong>TOP DAMAGE USED FOR CREATURES IMMUNE TO CRITICALS`
        rolls.unshift(ncCombinedDamage = await new DamageRoll(combinedDamage.replaceAll("2 * ", "")).evaluate({ async: true }));
    }
    
    options = [...new Set(cM[0].flags.pf2e.context.options.concat(cM[1].flags.pf2e.context.options))];
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
}
