if ( canvas.tokens.controlled.length !== 1 ) { return ui.notifications.info("Please select 1 token") }
if ( game.user.targets.size !== 1 ) { return ui.notifications.info("Please select 1 target for Flurry of Blows") }

if ( !token.actor.itemTypes.action.some( f => f.slug === "flurry-of-blows") && !token.actor.itemTypes.feat.some(f => f.slug === "flurry-of-blows" ) ) { return ui.notifications.warn(`${token.name} does not have Flurry of Blows!`) }

const DamageRoll = CONFIG.Dice.rolls.find( r => r.name === "DamageRoll" );
const critRule = game.settings.get("pf2e", "critRule");

let weapons = token.actor.system.actions.filter( h => h.visible && h.item?.isMelee && h.item?.system?.traits?.value?.includes("unarmed") );

if ( token.actor.itemTypes.feat.some( s => s.slug === "monastic-weaponry" ) && token.actor.system.actions.some( h => h.item?.isHeld && h.item?.system?.traits?.value.includes("monk") ) ) { weapons = token.actor.system.actions.filter( h => h.item?.isHeld && h.ready && h.item?.system?.traits?.value.includes("monk") ).concat(weapons) }

if ( token.actor.itemTypes.effect.some( s => s.slug === "stance-monastic-archer-stance" ) && token.actor.system.actions.some( h => h.item?.isHeld && h.item?.group === "bow" && h.item?.reload === "0" ) ) { weapons.unshift( token.actor.system.actions.find( h => h.item?.isHeld && h.item?.group === "bow" && h.item?.reload === "0" ) ) }

let wtcf = '';
for ( const w of weapons ) {
    wtcf += `<option value=${w.item.id}>${w.item.name}</option>`
}

const { cWeapon, map, bypass, dos} = await Dialog.wait({
    title:"Flurry of Blows",
    content: `
        <select id="fob1" autofocus>
            ${wtcf}
        </select><br>
        <select id="fob2">
            ${wtcf}
        </select><hr>
            <select id="map">
            <option value=0>No MAP</option>
            <option value=1>MAP 1</option>
            <option value=2>MAP 2</option>
        </select><hr>
    `,
    buttons: {
            ok: {
                label: "FoB",
                icon: "<i class='fa-solid fa-hand-fist'></i>",
                callback: (html) => { return { cWeapon: [html[0].querySelector("#fob1").value,html[0].querySelector("#fob2").value], map: parseInt(html[0].querySelector("#map").value), bypass: false } }
            },
            bypass: {
                label:"Bypass",
                icon: "<i class='fa-solid fa-forward'></i>",
                callback: async (html) => {
                    const cWeapon = [html[0].querySelector("#fob1").value,html[0].querySelector("#fob2").value];
                    const map = parseInt(html[0].querySelector("#map").value);
                    const dos = await Dialog.wait({
                        title:"Degree of Success",
                        content: `
                            <table>
                                <tr>
                                    <td>${weapons.find( w => w.item.id === cWeapon[0] ).label} (1st)</td>
                                    <td><select id="dos1" autofocus>
                                    <option value=2>Success</option>
                                    <option value=3>Critical Success</option>
                                    <option value=1>Failure</option>
                                    <option value=0>Critical Failure</option>
                                    </select></td></tr>
                                <tr>
                                    <td>${weapons.find( w => w.item.id === cWeapon[1] ).label} (2nd)</td>
                                    <td><select id="dos2">
                                        <option value=2>Success</option>
                                        <option value=3>Critical Success</option>
                                        <option value=1>Failure</option>
                                        <option value=0>Critical Failure</option>
                                    </select></td></tr>
                            </table><hr>
                        `,
                        buttons: {
                            ok: {
                                label: "Reroll",
                                icon: "<i class='fa-solid fa-dice'></i>",
                                callback: (html) => { return [parseInt(html[0].querySelector("#dos1").value), parseInt(html[0].querySelector("#dos2").value) ] }
                            },
                            cancel: {
                                label: "Cancel",
                                icon: "<i class='fa-solid fa-ban'></i>",
                            }
                        },
                        default: 'ok'
                    },{width:"auto"});
                    return { cWeapon, map, bypass: true, dos }
                },
            },
            cancel: {
                label: "Cancel",
                icon: "<i class='fa-solid fa-ban'></i>",
            }
    },
    default: "ok"
},{width:"auto"});

const map2 = map === 2 ? map : map + 1;
if ( cWeapon === undefined ) { return; }

const primary = weapons.find( w => w.item.id === cWeapon[0] );
const secondary = weapons.find( w => w.item.id === cWeapon[1] );

let options = token.actor.itemTypes.feat.some(s => s.slug === "stunning-fist") ? ["stunning-fist"] : [];

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


const pdos = bypass ? dos[0] : (await primary.variants[map].roll({skipDialog:true, event })).degreeOfSuccess;

const sdos = bypass ? dos[1] : (await secondary.variants[map2].roll({skipDialog:true, event})).degreeOfSuccess;

let pd,sd;
if ( pdos === 2 ) { pd = await primary.damage({event}); }
if ( pdos === 3 ) { pd = await primary.critical({event}); }
if ( sdos === 2 ) { sd = await secondary.damage({event}); }
if ( sdos === 3 ) { sd = await secondary.critical({event}); }

Hooks.off('preCreateChatMessage', PD);

if ( sdos <= 1 ) { 
    if ( pdos === 2) {
        await primary.damage({event,options});
        return;
    }
    if ( pdos === 3 ) {
        await primary.critical({event,options});
        return;
    } 
}

if ( pdos <= 1 ) { 
    if ( sdos === 2) {
        await secondary.damage({event,options});
        return;
    }
    if ( sdos === 3 ) {
        await secondary.critical({event,options});
        return;
    } 
}

await new Promise( (resolve) => {
    setTimeout(resolve,0);
});

if ( pdos <=0 && sdos <= 1 ) { return }

else {    
    const terms = pd.terms[0].terms.concat(sd.terms[0].terms);
    const type = pd.terms[0].rolls.map(t => t.type).concat(sd.terms[0].rolls.map(t => t.type));
    const persistent = pd.terms[0].rolls.map(t => t.persistent).concat(sd.terms[0].rolls.map(t => t.persistent));
    
    let preCombinedDamage = [];
    let combinedDamage = '{';
    let i = 0;
    for ( const t of terms ) {
        if ( persistent[i] && !preCombinedDamage.find( p => p.persistent && p.terms.includes(t) ) ) {
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
        combinedDamage += `, ${p.terms.join(",")}`;
        }
        else{
            if ( combinedDamage === "{" ) {
                if ( p.terms.length > 1 ){
                    combinedDamage += `(${p.terms.join(" + ")})[${p.type}]`;
                
                }
                else {
                    combinedDamage += p.terms[0];
                }
            }
            else if ( p.terms.length === 1 ) {
                combinedDamage += `, ${p.terms[0]}`;
            }
            else {
                combinedDamage += `, (${p.terms.join(" + ")})[${p.type}]`;
            }
        }
    }
    
    combinedDamage += "}";
    
    const rolls = [await new DamageRoll(combinedDamage).evaluate({ async: true })]
    let flavor = `<strong>Flurry of Blows Total Damage</strong>`;
    const color = pdos === 2 ? `<span style="color:rgb(0, 0, 255)">Success</span>` : `<span style="color:rgb(0, 128, 0)">Critical Success</span>`
    if ( cM.length === 1 ) { flavor += `<p>Same Weapon (${color})<hr>${cM[0].flavor}</p><hr>`; }
    else { flavor += `<hr>${cM[0].flavor}<hr>${cM[1].flavor}`; }
    if ( options.includes("stunning-fist") ) {
       flavor += `<br><strong>Stunning Fist</strong> ${game.i18n.localize("PF2E.SpecificRule.Monk.StunningFist.Note")}`;
    }
    if ( pdos === 3 || sdos === 3 ) {
        flavor += `<hr><strong>TOP DAMAGE USED FOR CREATURES IMMUNE TO CRITICALS`;
        if ( critRule === "doubledamage" ) {
            rolls.unshift(await new DamageRoll(combinedDamage.replaceAll("2 * ", "")).evaluate({ async: true }));
        }
        else if ( critRule === "doubledice" ) {
            const splitValues = combinedDamage.replaceAll("2 * ", "").replaceAll(/([\{\}])/g,"").split(" ");
            const toJoinVAlues = [];
            for ( const sv of splitValues ) {
                if ( sv.includes("[doubled])") ) {
                    const sV = sv.replaceAll("[doubled])","");
                    if ( !sV.includes("d") ) {
                            toJoinVAlues.push("sV");
                            continue;
                    }
                    else {
                        const n = sV.split(/(d\d)/g);
                        if ( n[0].charAt(1) !== "(") {
                            n[0] = `${parseInt(n[0].charAt(1) / 2)}`;
                            toJoinVAlues.push(n.join(""));
                            continue;
                        }
                        else if ( n[0].charAt(2) !== "(") { 
                            n[0] = `(${parseInt(n[0].charAt(2)) / 2}`;
                            toJoinVAlues.push(n.join(""));
                            continue;
                        }
                        else { 
                            n[0] = `((${parseInt(n[0].charAt(3)) / 2}`;
                            toJoinVAlues.push(n.join(""));
                            continue;
                        }
                    }
                }
                else {
                toJoinVAlues.push(sv);
                continue;
                }
            }
            rolls.unshift(await new DamageRoll(`{${toJoinVAlues.join(" ")}}`).evaluate( {async: true} ));
        }
    }
    if ( cM.length === 1) {
        options = cM[0].flags.pf2e.context.options;
    }
    else { options = [...new Set(cM[0].flags.pf2e.context.options.concat(cM[1].flags.pf2e.context.options))]; }

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
