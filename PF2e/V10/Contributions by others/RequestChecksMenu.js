//=============================================
//              Request Checks Menu
//            by Zael, Variant Rules
// A utility to request a lot of checks in
// quick succession. Made at the request of
// TMun from the PF2e FoundryVTT Community
// Discord.
// CSS and Code Amendments by Symon S
//=============================================

const saves_list = [
    "fortitude",
    "reflex",
    "will",    
];

const checks_list = [
    "acrobatics",
    "arcana",
    "athletics",
    "crafting",
    "deception",
    "diplomacy",
    "intimidation",
    "medicine",
    "nature",
    "occultism",
    "performance",
    "religion",
    "society",
    "stealth",
    "survival",
    "thievery"
];

async function callCheckMenu() {
await new Promise(async (resolve) => {
                setTimeout(resolve,200);
            await new Dialog({
                title:"Request Checks Menu",
                content,
                buttons:{ Close: { label: "Close" } },
            },{width: 600}).render(true);
            });
}

const script1 = async function rollCheck(name) {
    await new Promise(async (resolve) => {
                setTimeout(resolve,200);
            let menuContent = `<p style="font-size:80%;text-align:center;">If the DC is invalid or left blank, then a Check with no listed DC will be posted.</p>
                <form><div class="form-group">
                <label><strong>DC:</strong></label>
                <input type='number' id='thisinputhere' name='DCValue' autofocus></input>
                </div></form>`;
            await new Dialog({
                title:"Enter DC",
                content: menuContent,
                buttons: {
                    one: {
                        icon: '<i class="fas fa-dice-d20"></i>',
                        label: "Confirm and Post",
                        callback: () => confirmed = true
                    },
                    two: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => confirmed = false
                    }
                },
                default: "one",
                render: () => document.getElementById("thisinputhere").focus(),
                close: html => {
                    if (confirmed) {
                        var DCValue = html.find('input[name=\'DCValue\']');
                        if (DCValue.val()== '') {
                            console.log("Error: DC Not Entered.");
                            return ui.notifications.error("Please input a number in the DC field.");
                        } else if (isNaN(DCValue.val())) {
                            console.log("Error: DC Not a Number.");
                            return ui.notifications.error("Please input a number in the DC field.");
                        } else if (DCValue.val()<= 0) {
                            console.log("Error: DC Not Valid.");
                            return ui.notifications.error("Please input a number greater than zero in the DC field.");
                        } else {
                            DCValue = parseInt(html.find('[name=DCValue]')[0].value);
                            DC = `dc:${DCValue}|`;
                        }
                        
                        
                        checkText = `@Check[type:${name}|${DC}traits:action]`;

                        ChatMessage.create({
                            user: game.user._id,
                            speaker: ChatMessage.getSpeaker(),
                            content: checkText
                        });
                        
                    }
                }
            },{width: 300}).render(true);
            });
    
};

const script2 = async function rollSecretCheck(name) {
    await new Promise(async (resolve) => {
                setTimeout(resolve,200);
            let menuContent = `<p style="font-size:80%;text-align:center;">If the DC is invalid or left blank, then a Check with no listed DC will be posted.</p>
                <form><div class="form-group">
                <label><strong>DC:</strong></label>
                <input type='number' id='thisinputhere' name='DCValue' autofocus></input>
                </div></form>`;
            await new Dialog({
                title:"Enter DC",
                content: menuContent,
                buttons: {
                    one: {
                        icon: '<i class="fas fa-dice-d20"></i>',
                        label: "Confirm and Post",
                        callback: () => confirmed = true
                    },
                    two: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => confirmed = false
                    }
                },
                default: "one",
                render: () => document.getElementById("thisinputhere").focus(),
                close: html => {
                    if (confirmed) {
                        var DCValue = html.find('input[name=\'DCValue\']');
                        if (DCValue.val()== '') {
                            console.log("Error: DC Not Entered.");
                            return ui.notifications.error("Please input a number in the DC field.");
                        } else if (isNaN(DCValue.val())) {
                            console.log("Error: DC Not a Number.");
                            return ui.notifications.error("Please input a number in the DC field.");
                        } else if (DCValue.val()<= 0) {
                            console.log("Error: DC Not Valid.");
                            return ui.notifications.error("Please input a number greater than zero in the DC field.");
                        } else {
                            DCValue = parseInt(html.find('[name=DCValue]')[0].value);
                            DC = `dc:${DCValue}|`;
                        }
                        
                        
                        checkText = `@Check[type:${name}|${DC}traits:action:search,secret]`;

                        ChatMessage.create({
                            user: game.user._id,
                            speaker: ChatMessage.getSpeaker(),
                            content: checkText
                        });
                        
                    }
                }
            },{width: 300}).render(true);
            });
};

let content = `<style>
.zmenumain {
    margin: 1px auto;
    background: url(systems/pf2e/assets/sheet/parchment.webp);
}
.zmenu {
    margin: 1px auto;
    column-count: 4;
    column-width: auto;
}
.zbutton {
    width: 100%;
    margin: 1px auto;
}
.pbutton {
    background: #93b7c9;
    margin: 1px auto;
    width: fit-content;
    height: fit-content;
}
.sbutton {
    background: #cfa1a1;
    margin: 1px auto;
    width: fit-content;
    height: fit-content;
}
</style><script>${script1}${script2}</script><div class="zmenumain">`;

content += `<p style="font-size:80%;text-align:center;">Upon selecting a check, you will be prompted for a DC.</p><p><h2><i class="fas fa-eye"></i>&nbsp;&nbsp;Perception Checks</h2></p>`;

content += `<button name="buttonPerception" class="pbutton" type="button" onclick="rollCheck('perception')">Perception</button><button name="buttonSecretPerception" class="sbutton" type="button" onclick="rollSecretCheck('perception')"><i class="fas fa-eye-slash"></i></button>`;

content += `<br><br><p><h2><i class="fas fa-fire-alt"></i>&nbsp;&nbsp;Saving Throws</h2></p><div class="zmenu">`;

saves_list.forEach((c,i) => {
    content += `<div class="zbutton"><button name="button${i}" class="pbutton" type="button" onclick="rollCheck('${c}')">${c[0].toUpperCase() + c.substring(1)}</button><button name="buttonSecret${i}" class="sbutton" type="button" onclick="rollSecretCheck('${c}')"><i class="fas fa-eye-slash"></i></button></div>`;
});

content += `</div><br><p><h2><i class="fas fa-balance-scale"></i>&nbsp;&nbsp;Skill Checks</h2></p><div class="zmenu">`;

checks_list.forEach((c,i) => {
    content += `<div class="zbutton"><button name="button${i}" class="pbutton" type="button" onclick="rollCheck('${c}')">${c[0].toUpperCase() + c.substring(1)}</button><button name="buttonSecret${i}" class="sbutton" type="button" onclick="rollSecretCheck('${c}')"><i class="fas fa-eye-slash"></i></button></div>`;
    
});
content += `</div><br></div>`;
callCheckMenu();