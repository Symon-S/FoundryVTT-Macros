/*
Borrows heavily from @symonsch's Spellstrike macro

Automates the Knockdown and Improved Knockdown feats.

Select a token with the Knockdown feat and target an enemy.
This macro will roll the attack, damage and trip rolls with the appropriate MAP.
If the selected token has Improved Knockdown, the macro will instead automatically roll
the bonus bludgeoning damage.
*/

Knockdown();

async function Knockdown() {
    /* Throw warning if token is not selected*/
    if (canvas.tokens.controlled.length < 1) { return ui.notifications.warn('No token is selected.'); }
    if (canvas.tokens.controlled.length > 1) { return ui.notifications.warn('Only 1 token should be selected'); }
    if (game.user.targets.size < 1) { return ui.notifications.warn('Please target a token'); }
    if (game.user.targets.size > 1) { return ui.notifications.warn('Knockdown can only affect 1 target'); }

    for (let token of canvas.tokens.controlled) {
        /* Check for Knockdown feat and warn if not present */
        if (!token.actor.itemTypes.feat.some(e => e.slug === 'knockdown')) {
            return ui.notifications.warn('Does not have Knockdown.');
        }

        /* Check for Improved Knockdown feat */
        const hasImproved = token.actor.itemTypes.feat.some(e => e.slug === 'improved-knockdown');

        const DamageRoll = CONFIG.Dice.rolls.find(((R) => R.name === "DamageRoll"));

        /* Gather weapons */
        let weapons = [];
        weapons = token.actor.system.actions.filter(i => i.visible && i.type === "strike" && !i.item.isRanged && i.item.isEquipped && !i.item.system.traits.value.includes("ranged"));
        const map_weap = weapons.map(p => p.label);

        /* Build dialog data */
        const es_data = [
            { label: `Weapon:`, type: `select`, options: map_weap },
            { label: `MAP`, type: `select`, options: [0, 1, 2] }
        ];

        /* Run dialog and alot data */
        const choice = await quickDialog({ data: es_data, title: `Knockdown` });

        /* Get the strike actions and roll strike */
        const strike = weapons.find(a => a.label === choice[0]);

        const critt = (await strike.variants[choice[1]].roll({ event })).degreeOfSuccess;

        let dos;
        let hit = false

        if (critt === 2) { dos = 'Success'; hit = true }
        if (critt === 3) { dos = 'Critical Success'; hit = true }

        if (game.modules.get('xdy-pf2e-workbench')?.active && !game.settings.get("xdy-pf2e-workbench", "autoRollDamageForStrike")) {
            if (critt === 2) { await strike.damage({ event }); }
            if (critt === 3) { await strike.critical({ event }); }
        }
        if (!game.modules.has('xdy-pf2e-workbench') || !game.modules.get('xdy-pf2e-workbench')?.active) {
            if (critt === 2) { await strike.damage({ event }); }
            if (critt === 3) { await strike.critical({ event }); }
        }

        /* Roll trip for regular Knockdown */
        if (!hasImproved) {
            const multipleAttackPenalty = parseInt(strike.variants[choice[1]].label.slice(4));
            game.pf2e.actions.trip({
                actors: [token.actor], modifiers: [
                    new game.pf2e.Modifier({
                        label: 'PF2E.MultipleAttackPenalty',
                        modifier: multipleAttackPenalty,
                    }),
                ],
            })
        }
        /* Roll bonus damage from Improved Knockdown */
        else {
             /* Choose largest possible damage die */
            let dieSize = strike.item.baseDamage.die;
            let damImp;
            if (strike.item.handsHeld == 1 || dieSize.slice(1) < 6) {
                dieSize = 'd6';
            }
            damImp = `(1${dieSize})[bludgeoning]`;

            const droll = new DamageRoll(damImp);
            let target = Array.from(game.user.targets)[0].actor
            if (critt === 2 || critt === 3) {
                droll.toMessage(
                    {
                        flavor: `<strong>Improved Knockdown:</strong> The target falls and lands @UUID[Compendium.pf2e.conditionitems.j91X7x0XSomq8d60]{Prone} and takes [[/roll 1${dieSize}]] bludgeoning damage.<br>`,
                        speaker: ChatMessage.getSpeaker(),

                        flags: {
                            "pf2e-target-damage": {
                                targets: game.user.targets.map((target) => {
                                    return {
                                        id: target.id,
                                        tokenUuid: target.document.uuid,
                                        actorUuid: target.actor.uuid,
                                    }
                                })
                            }
                        }
                    }
                );
            }
        }
    }
}

/* Dialog box */
async function quickDialog({ data, title = `Quick Dialog` } = {}) {
    data = data instanceof Array ? data : [data];

    return await new Promise(async (resolve) => {
        let content = `
      <table style="width:100%">
      ${data.map(({ type, label, options }, i) => {
            if (type.toLowerCase() === `select`) {
                return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><select style="font-size:12px" id="${i}qd">${options.map((e, i) => `<option value="${e}">${e}</option>`).join(``)}</td></tr>`;
            }
            else if (type.toLowerCase() === `checkbox`) {
                return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" id="${i}qd" ${options || ``}/></td></tr>`;
            }
            else {
                return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" id="${i}qd" value="${options instanceof Array ? options[0] : options}"/></td></tr>`;
            }
        }).join(``)}
      </table>`;

        await new Dialog({
            title, content,
            buttons: {
                Ok: {
                    label: `Ok`, callback: (html) => {
                        resolve(Array(data.length).fill().map((e, i) => {
                            let { type } = data[i];
                            if (type.toLowerCase() === `select`) {
                                return html.find(`select#${i}qd`).val();
                            }
                            else {
                                switch (type.toLowerCase()) {
                                    case `text`:
                                    case `password`:
                                    case `radio`:
                                        return html.find(`input#${i}qd`)[0].value;
                                    case `checkbox`:
                                        return html.find(`input#${i}qd`)[0].checked;
                                    case `number`:
                                        return html.find(`input#${i}qd`)[0].valueAsNumber;
                                }
                            }
                        }));
                    }
                }
            },
            default: 'Ok'
        }, { width: "auto" })._render(true);
        document.getElementById("0qd").focus();
    });
}
