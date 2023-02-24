/*
Based on the macro Contributed by ArthurTrumpet
modified by darkim

Uses the built in Treat Wounds immunity effect to track who has healed whom.
Player selects the token being healed, and chooses the healer from the drop down.
The effect icon won't appear on the token, as you can potentially be Treated Wounds several times, and it would just clutter up the token. 
If you want to show the icons, update the variable showIcons on line #2 to true.
Immunity duration is set depending on several factors. Default is 1 hour. 
A character with the Continual Recovery feat will only give a 10 minute cooldwon.

To remove an effect, right click it in the effect tracker (top right of the screen) as per normal
*/

const tw_UUID = 'Compendium.pf2e.feat-effects.Lb4q2bBAgxamtix5'; //Treat Wounds Immunity effect
const showIcons = true;

if (!token) {
    ui.notifications.error("No token selected!");
} else {
    main();
}

function CheckFeat(slug, healer) {
    return healer.itemTypes.feat.some((i) => i.slug === slug);
}

async function main() {
    const message = game.messages.contents.reverse().find( m => m.flags.treat_wounds_battle_medicine?.id === token.id);
    if (message === undefined) {
        ui.notifications.info("Wrong token selected!");
    } else {
        const twEffect = (await fromUuid(tw_UUID)).toObject();
        twEffect.data.tokenIcon.show = showIcons; //Potential for lots of effects to be on a token. Don't show icon to avoid clutter
        twEffect.flags.core ??= {};
        twEffect.flags.core.sourceId = tw_UUID;

        const applicator = game.actors.get(message.flags.treat_wounds_battle_medicine.healerId);

        twEffect.name = "Treat Wounds";
        const useContinualRecovery = CheckFeat('continual-recovery', applicator);

        if (useContinualRecovery) {
            twEffect.data.duration.unit = "minutes";
            twEffect.data.duration.value = 10;
        }
        let healMessage = '';
        if ( message.flags.treat_wounds_battle_medicine.dos >= 2 ) {
            healMessage = `<i>${token.actor.name} is healed for ${Math.min(message.flags.treat_wounds_battle_medicine.healing, token.actor.system.attributes.hp.max - token.actor.system.attributes.hp.value)} damage.</i>`;
            await token.actor.update({system: { attributes: { hp: { value: token.actor.system.attributes.hp.value + message.flags.treat_wounds_battle_medicine.healing} } } });

            if (token.actor.hasCondition("wounded") ) { 
                await token.actor.toggleCondition("wounded");
                healMessage += '<br>And the wounded condition is removed.'
            }
        } else if (message.flags.treat_wounds_battle_medicine.dos == 0) {
            healMessage = `<i>${token.actor.name} takes ${Math.min(message.flags.treat_wounds_battle_medicine.healing, token.actor.system.attributes.hp.value)} damage.</i>`;
            await token.actor.update({system: { attributes: { hp: { value: token.actor.system.attributes.hp.value - message.flags.treat_wounds_battle_medicine.healing} } } });
        }
        if (healMessage != '') {
            ChatMessage.create({
                user: game.user.id,
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                flavor: `${healMessage}`,
                speaker: ChatMessage.getSpeaker()
            });
        }

        await token.actor.createEmbeddedDocuments("Item", [twEffect]);
        ui.notifications.info(token.actor.name + " is now immune to Treat Wounds for " + twEffect.data.duration.value + " " + twEffect.data.duration.unit + ".");
    }
}
