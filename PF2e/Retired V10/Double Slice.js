if (canvas.tokens.controlled.length !== 1) { return ui.notifications.info("Please select 1 token") }

if ( !token.actor.itemTypes.feat.some(f => f.slug === "double-slice") ) { return ui.notifications.warn(`${token.name} does not have the Double Slice feat!`) }

if ( token.actor.itemTypes.weapon.filter( h => h.isMelee && h.isHeld && h.hands === "1" && h.handsHeld === 1 && !h.system.traits.value.includes("unarmed") ).length > 2 ) { return ui.notifications.info("To use the double slice macro, only 2 one-handed melee weapons can be equipped at a time.") }

if ( token.actor.itemTypes.weapon.filter( h => h.isMelee && h.isHeld && h.hands === "1" && h.handsHeld === 1 && !h.system.traits.value.includes("unarmed") ).length < 2 ) { return ui.notifications.info("Please equip/draw 2 one-handed melee weapons.") }

const DamageRoll = CONFIG.Dice.rolls.find( r => r.name === "DamageRoll" );
const critRule = game.settings.get("pf2e", "critRule");

let weapons = token.actor.system.actions.filter( h => h.item?.isMelee && h.item?.isHeld && h.item?.hands === "1" && h.item?.handsHeld === 1 && !h.item?.system?.traits?.value?.includes("unarmed") );

let options = ["double-slice-second"];
let primary = weapons[0];
let secondary = weapons[1];
if ( weapons.filter( a => a.item.system.traits.value.includes("agile") ).length === 1 ) {
    primary = weapons.find( a => !a.item.system.traits.value.includes("agile") );
    secondary = weapons.find( a => a.item.system.traits.value.includes("agile") );
}

const { map, bypass, dos } = await Dialog.wait({
    title:"Current MAP",
    content: `
        <select id="map" autofocus>
            <option value=0>No MAP</option>
            <option value=1>MAP 1</option>
            <option value=2>MAP 2</option>
        </select><hr>
    `,
    buttons: {
            ok: {
                label: "Double Slice",
                icon: "<i class='fa-solid fa-swords'></i>",
                callback: (html) => { return { map: parseInt(html[0].querySelector("#map").value), bypass: false }  }
            },
            bypass: {
                label:"Bypass",
                icon: "<i class='fa-solid fa-forward'></i>",
                callback: async (html) => {
                    const map = parseInt(html[0].querySelector("#map").value);
                    const dos = await Dialog.wait({
                        title:"Degree of Success",
                        content: `
                            <table>
                                <tr>
                                    <td>${primary.label} (1st)</td>
                                    <td><select id="dos1" autofocus>
                                    <option value=2>Success</option>
                                    <option value=3>Critical Success</option>
                                    <option value=1>Failure</option>
                                    <option value=0>Critical Failure</option>
                                    </select></td></tr>
                                <tr>
                                    <td>${secondary.label} (2nd)</td>
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
                    return { map, bypass: true, dos }
                },
            },
            cancel: {
                label: "Cancel",
                icon: "<i class='fa-solid fa-ban'></i>",
            }
    },
    default: "ok"
},{width:"auto"});

if ( map === undefined ) { return; }

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

const sdos = bypass ? dos[1] : (await secondary.variants[map].roll({skipDialog:true, event, options})).degreeOfSuccess;

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

    const pOc = preCombinedDamage.filter( t => t.terms?.some( p => p.includes("[precision]") ) ).map( t => t.terms ).flat();
    if ( pOc.length > 1 ) {
        if ( pOc[0] === pOc[1] && critRule === "doubledice" ) {
            if ( pOc[1].includes("doubled") && pOc[0].includes("doubled") ) {
                preCombinedDamage[0].terms[1] = preCombinedDamage[0].terms[1].replace(/ \+ \(...\[doubled\]\)\[precision\]/, "" );
            }
            if ( pOc[0].includes("doubled") && !pOc[1].includes("doubled") ) {
                preCombinedDamage[0].terms[1] = preCombinedDamage[0].terms[1].replace(/ \+ ...\[precision\]/, "" );
            }
            if ( !pOc[0].includes("doubled") && pOc[1].includes("doubled") ) {
                preCombinedDamage[0].terms[0] = preCombinedDamage[0].terms[0].replace(/ \+ ...\[precision\]/, "" );
            }
            else {
                preCombinedDamage[0].terms[1] = preCombinedDamage[0].terms[1].replace(/ \+ ...\[precision\]/, "" );
            }
        }
        else {
            if ( pOc[0].includes("doubled") && !pOc[1].includes("doubled") ) {
                preCombinedDamage[1].terms[0] = preCombinedDamage[1].terms[0].replace(/ \+ ...\[precision\]/, "" );
            }
            else if ( !pOc[0].includes("doubled") && pOc[1].includes("doubled") ) {
                preCombinedDamage[0].terms[0] = preCombinedDamage[0].terms[0].replace(/ \+ ...\[precision\]/, "" );
            }
            else {
                const doubled = pOc[0].includes("doubled");
                if ( doubled ) {
                    pOc[0] = pOc[0].match(/\(...\[doubled\]\)\[precision\]\)\[\w+/)[0] + "]" + `(Critical Success)`;
                    pOc[1] = pOc[1].match(/\(...\[doubled\]\)\[precision\]\)\[\w+/)[0] + "]" + `(Critical Success)`;
                }
                else if ( critRule === "doubledamage" && pdos === 3 && sdos === 3 ) {
                    pOc[0] = (pOc[0].match(/...\[precision\]\)\)\[\w+/)[0] + "]").replaceAll(")","") + `(Critical Success)`;
                    pOc[1] = (pOc[1].match(/...\[precision\]\)\)\[\w+/)[0] + "]").replaceAll(")","") + `(Critical Success)`;;
                }
                else if ( critRule === "doubledamage" && pdos === 3 && sdos === 2 ) {
                    pOc[0] = (pOc[0].match(/...\[precision\]\)\)\[\w+/)[0] + "]").replaceAll(")","") + `(Critical Success)`;
                    pOc[1] = (pOc[1].match(/...\[precision\]\)\[\w+/)[0] + "]").replaceAll(")","") + `(Success)`;
                }
                else if ( critRule === "doubledamage" && sdos === 3 && pdos === 2 ) {
                    pOc[0] = (pOc[0].match(/...\[precision\]\)\[\w+/)[0] + "]").replaceAll(")","") + `(Success)`;
                    pOc[1] = (pOc[1].match(/...\[precision\]\)\)\[\w+/)[0] + "]").replaceAll(")","") + `(Critical Success)`;; 
                }
                else { 
                    pOc[0] = (pOc[0].match(/...\[precision\]\)\[\w+/)[0] + "]").replaceAll(")","") + `(Success)`;
                    pOc[1] = (pOc[1].match(/...\[precision\]\)\[\w+/)[0] + "]").replaceAll(")","") + `(Success)`;
                }
                const pD = await Dialog.wait( {
                    title: "Precision Damage to Remove",
                    content: `
                        <select>
                            <option value=0>${pOc[0]}</option>
                            <option value=1>${pOc[1]}</option>
                        </select>
                    `,
                    buttons: {
                        ok: {
                            label: "Remove",
                            icon: `<i class="fa-solid fa-eraser"></i>`,
                            callback: (html) => { 
                                return parseInt(html[0].querySelector("select").value);
                            },
                        },
                    },
                    default: "ok",
                },{width:"auto"});

                if ( pD === undefined ) { return ui.notifications.warn("You have not selected a precision damage to remove, rerun macro in bypass, set previously rolled degrees of success, and chose damage to remove") }
                if ( pD === 0 && doubled ) {
                    preCombinedDamage[0].terms[0] = preCombinedDamage[0].terms[0].replace(/ \+ \(...\[doubled\]\)\[precision\]/, "" );
                }
                if ( pD === 1 && doubled ) {
                    preCombinedDamage[1].terms[0] = preCombinedDamage[1].terms[0].replace(/ \+ \(...\[doubled\]\)\[precision\]/, "" );
                }
                if ( pD === 0 && !doubled ) {
                    preCombinedDamage[0].terms[0] = preCombinedDamage[0].terms[0].replace(/ \+ ...\[precision\]/, "" );
                }
                if ( pD === 1 && !doubled ) {
                    preCombinedDamage[1].terms[0] = preCombinedDamage[1].terms[0].replace(/ \+ ...\[precision\]/, "" );
                }
            }
        }
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
    let flavor = `<strong>Double Slice Total Damage</strong>`;
    const color = (pdos || sdos) === 2 ? `<span style="color:rgb(0, 0, 255)">Success</span>` : `<span style="color:rgb(0, 128, 0)">Critical Success</span>`
    if ( cM.length === 1 ) { flavor += `<p>Same Weapon (${color})<hr>${cM[0].flavor}</p><hr>`; }
    else { flavor += `<hr>${cM[0].flavor}<hr>${cM[1].flavor}`; }
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
