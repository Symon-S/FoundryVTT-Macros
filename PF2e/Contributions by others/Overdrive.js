/*Overdrive Macro by redeux
tested V9 / pf2 3.2.2.10109
Based off of PF2 wiki's generic customizable macro
Major thanks to stwlam for the massive legs crashing through some barriers I ran into (async roll after updating to V9 and sending dmg to chat)

updated to v10 by darkim
also did a few improvements
*/

function dsnHook(code) {
    if (game.modules.get("dice-so-nice")?.active && !game.settings.get("dice-so-nice", "immediatelyDisplayChatMessages") && !game.modules.get("df-manual-rolls")?.active) {
        Hooks.once('diceSoNiceRollComplete', code);
    } else {
        code();
    }
}

if (canvas.tokens.controlled.length < 1){
    ui.notifications.warn('You need to select at least one token to perform Overdrive.');
  } else {
    const actors = canvas.tokens.controlled.flatMap((token) => token.actor ?? []);
    const token_options = actors.reduce((acc, actor) => acc +=`<option value="${actor.id}">${actor.name}</option>`, "");
    
    const overdrive = async ({
        inventorTokenActor,
       }) => {
    
        const skillName = "Overdrive";
        const skillKey = "cra";
        const actionSlug = "Overdrive"
        const actionName = "Overdrive"
        
        const modifiers = []
        const OD_Succ_ITEM_UUID = 'Compendium.pf2e.feat-effects.MZDh3170EFIfOwTO'; // Effect: Overdrive (Success)
        const OD_CrSu_ITEM_UUID = 'Compendium.pf2e.feat-effects.1XlJ9xLzL19GHoOL'; // Effect: Overdrive (Critical Success)
        // get Main Actor

        const notes = [...inventorTokenActor.system.skills[skillKey].notes]; // add more notes if necessary
        const options = inventorTokenActor.getRollOptions(['all', 'skill-check', skillName.toLowerCase()]);
        options.push(`action:${actionSlug}`);

        let DCbyLevel = [14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40, 42, 44, 46, 48, 50]
        let DC = DCbyLevel[inventorTokenActor.system.details.level.value]
        
        game.pf2e.Check.roll(
            new game.pf2e.CheckModifier(
                `<span class="pf2-icon">A</span> <b>${actionName}</b> - <p class="compact-text">${skillName} Skill Check</p>`,
                inventorTokenActor.system.skills[skillKey], modifiers),
            { actor: inventorTokenActor, type: 'skill-check', options, notes, dc: { value: DC } }, //for DC insert: , dc: {value: 30}
            event,
            async (roll) => {
                if (roll.degreeOfSuccess === 3) {
                    //apply crit effect
                    const source = (await fromUuid(OD_CrSu_ITEM_UUID)).toObject();
                    source.flags.core ??= {};
                    source.flags.core.sourceId = OD_CrSu_ITEM_UUID;
                    for await (const actor of actors) {
                        const success_effect = actor.itemTypes.effect.find((effect) => effect.getFlag('core', 'sourceId') === OD_Succ_ITEM_UUID);
                        const cr_success_effect = actor.itemTypes.effect.find((effect) => effect.getFlag('core', 'sourceId') === OD_CrSu_ITEM_UUID);
                        if (cr_success_effect) {
                            // nothing happens.
                        } else if (success_effect) {
                            source.system.start.initiative = success_effect.system.start.initiative;
                            source.system.start.value = success_effect.system.start.value;
                            source.system.duration.unit = "rounds";
                            // yes, this is hacky but I found no other way.
                            source.system.duration.value = Math.floor(success_effect.remainingDuration.remaining / 6);
                            await success_effect.delete();
                            await actor.createEmbeddedDocuments('Item', [source]);
                        } else {
                            await actor.createEmbeddedDocuments('Item', [source]);
                        }
                    };
                    dsnHook(() => {
                        ChatMessage.create({
                            user: game.user.id,
                            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                            flavor: `<strong>Critical Success</strong><br>Your gizmos go into a state of incredible efficiency called critical overdrive, adding great power to your attacks. Your Strikes deal additional damage equal to your Intelligence modifier for 1 minute. After the Overdrive ends, your gizmos become unusable as they cool down or reset, and you can't use Overdrive for 1 minute.`,
                            speaker: ChatMessage.getSpeaker(),
                        });
                    });
            
                } else if (roll.degreeOfSuccess === 2) {
                    //apply success effect
                    const source = (await fromUuid(OD_Succ_ITEM_UUID)).toObject();
                    source.flags.core ??= {};
                    source.flags.core.sourceId = OD_Succ_ITEM_UUID;
                    for await (const actor of actors) {
                        const success_effect = actor.itemTypes.effect.find((effect) => effect.getFlag('core', 'sourceId') === OD_Succ_ITEM_UUID);
                        const cr_success_effect = actor.itemTypes.effect.find((effect) => effect.getFlag('core', 'sourceId') === OD_CrSu_ITEM_UUID);
                        if (success_effect || cr_success_effect) {
                            // nothing happens.
                        } else {
                            await actor.createEmbeddedDocuments('Item', [source]);
                        }
                    };
                    dsnHook(() => {
                        ChatMessage.create({
                            user: game.user.id,
                            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                            flavor: `<strong>Success</strong><br>Your gizmos go into overdrive, adding power to your attacks.Your Strikes deal additional damage equal to half your Intelligence modifier for 1 minute. After the Overdrive ends, your gizmos become unusable as they cool down or reset, and you can't use Overdrive for 1 minute.<br><br>
                            <small><strong>Special</strong> When under the effects of Overdrive, you can still use the Overdrive action. You can't extend your Overdrive's duration this way, but you can turn an overdrive into a critical overdrive if you critically succeed. A failure has no effect on your current Overdrive, and you end your Overdrive on a critical failure.</small>
                            `,
                            speaker: ChatMessage.getSpeaker(),
                        });
                    });
                } else if (roll.degreeOfSuccess === 1) {
                    dsnHook(() => {
                        ChatMessage.create({
                            user: game.user.id,
                            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                            flavor: `<strong>Failure</strong><br>You make a miscalculation and nothing happens.`,
                            speaker: ChatMessage.getSpeaker(),
                        });
                    });
                } else if (roll.degreeOfSuccess === 0) {
                    //crit fail damage
                    let actorLevel = inventorTokenActor.system.details.level.value
                    let DamageRoll = CONFIG.Dice.rolls.find((r) => r.name == "DamageRoll");
                    dsnHook(() => {
                        new DamageRoll(actorLevel + "[fire]").toMessage({ 
                            flavor: "<strong>Overdrive Critical Malfunction 🔥!!</strong><br>Whoops! Something explodes.<br>You take fire damage equal to your level, and you can't use Overdrive again for 1 minute as your gizmos cool down and reset.",
                            speaker: ChatMessage.getSpeaker(),
                        });
                    });
                    for await (const actor of actors) {
                        const success_effect = actor.itemTypes.effect.find((effect) => effect.getFlag('core', 'sourceId') === OD_Succ_ITEM_UUID);
                        const cr_success_effect = actor.itemTypes.effect.find((effect) => effect.getFlag('core', 'sourceId') === OD_CrSu_ITEM_UUID);
                        if (success_effect) {
                            await success_effect.delete();
                        } else if (cr_success_effect) {
                            await cr_success_effect.delete();
                        }
                    };
                }
            },
        );
    }

async function applyChanges($html) {
    const inventorTokenActor = actors.filter((actor) => actor.id === $html.find('[name="inventor"]')[0].value)[0];
    overdrive({inventorTokenActor});
}

/* Dialog box */
const renderDialogContent = ({
    token_options,
   }) => `
    <div>
      Temporarily cranking the gizmos on your body into overdrive, you try to add greater power to your attacks. Attempt a Crafting check that has a standard DC for your level.<br>
    </div>
    <hr/>
    <form>
      <div class="form-group">
        <label title="Select the Inventor">Select Inventor:</label>
        <select id="inventor" name="inventor">${token_options}</select>
        </select>
      </div>
    </form>
    `;

const dialog = new Dialog({
    title: 'Overdrive',
    content: renderDialogContent({
        token_options,
    }),
    buttons: {
        yes: {
        icon: `<i class="fas fa-hand-holding-medical"></i>`,
        label: 'Confirm',
        callback: applyChanges,
        },
        no: {
        icon: `<i class="fas fa-times"></i>`,
        label: 'Cancel',
        },
    },
    default: 'yes',
    });
await dialog.render(true);

}
