/*
Based on the macro Contributed by ArthurTrumpet
modified by darkim

Uses the built in Battle medicine immunity effect to track who has healed whom.
Player selects the token being healed, and chooses the healer from the drop down.
The effect icon won't appear on the token, as you can potentially be battle medicined several times, and it would just clutter up the token. 
If you want to show the icons, update the variable showIcons on line #2 to true.
Immunity duration is set depending on several factors. Default is 24 hours. 
If healed by an Investigator with the Forensic Medicine methodology, it is 1 hour. 
A character with godless healing feat will get a 1 hour immunity.
The macro will set an effect on the medic to indicate if they have used this ability (or whether it is not currently available). 
The duration is automatically set depending on the Medicine skill level of the medic.

To remove an effect, right click it in the effect tracker (top right of the screen) as per normal
*/

const bm_UUID = 'Compendium.pf2e.feat-effects.2XEYQNZTCGpdkyR6'; //Battle medicine Immunity effect
const showIcons = true;

if (!token) {
    ui.notifications.error("No token selected!");
} else {
    main();
}

function CheckFeat(slug, healer) {
    return healer.itemTypes.feat.some((i) => i.slug === slug);
}

async function main(html) {
    const message = game.messages.contents.reverse().find( m => m.flags.treat_wounds_battle_medicine?.id === token.id);
    if (message === undefined) {
        ui.notifications.info("Wrong token selected!");
    } else {
        const bmEffect = (await fromUuid(bm_UUID)).toObject();
        bmEffect.system.tokenIcon.show = showIcons; //Potential for lots of effects to be on a token. Don't show icon to avoid clutter
        bmEffect.flags.core ??= {};
        bmEffect.flags.core.sourceId = bm_UUID;

        const applicator = game.actors.get(message.flags.treat_wounds_battle_medicine.healerId);

        bmEffect.name = "Battle Medicine by " + applicator.name;
        bmEffect.img = applicator.img;
        const isgodless = CheckFeat('godless-healing', token.actor); //godless healing affects the patient, not the healer
        const isForensic = CheckFeat('forensic-medicine-methodology', applicator);

        if (isForensic || isgodless) {
            bmEffect.system.duration.unit = "hours";
        }

        let healMessage = '';
        if ( message.flags.treat_wounds_battle_medicine.dos >= 2 ) {
            healMessage = `<i>${token.actor.name} is healed for ${Math.min(message.flags.treat_wounds_battle_medicine.healing, token.actor.system.attributes.hp.max - token.actor.system.attributes.hp.value)} damage.</i>`;
            await token.actor.update({system: { attributes: { hp: { value: token.actor.system.attributes.hp.value + message.flags.treat_wounds_battle_medicine.healing} } } });

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

        await token.actor.createEmbeddedDocuments("Item", [bmEffect]);
        ui.notifications.info(token.actor.name + " is now immune to Battle Medicine by " + applicator.name);
    }
}
