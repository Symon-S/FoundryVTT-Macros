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

const bm_UUID = 'Compendium.pf2e.feature-effects.2XEYQNZTCGpdkyR6'; //Battle medicine Immunity effect
const showIcons = true;

if (!token) {
    ui.notifications.error("No token selected!");
} else {
    battlemedicineEffect();
}

function CheckFeat(slug, healer) {
    return healer.itemTypes.feat.some((i) => i.slug === slug);
}

function battlemedicineEffect() {
    let playersNames = canvas.tokens.placeables.filter(pc => pc.actor?.hasPlayerOwner && pc.actor.type === "character" && pc.actor.itemTypes.feat.some(x => x.slug === 'battle-medicine')).map(pc => pc.actor.data.name);
    let playerNameList = '';
    let immunityConferer = game.messages.contents.filter(m => m.data.flavor?.includes("immune to Battle Medicine")).pop().actor?.data.name;
    playersNames.map((el) => {
        playerNameList += `<option value="${el}"${immunityConferer===el?` selected`:``}>${el}</option>`;
    });

    let template = `
  <p>Character performing Battle Medicine: <select id="playerName">${playerNameList}</select></p> 
  `;

    new Dialog({
        title: "Battle Medicine Tracking",
        content: template,
        buttons: {
            ok: {
                label: "Apply",
                callback: (html) => {
                    main(html);
                },
            },
            cancel: {
                label: "Cancel",
            },
        },
    }).render(true);
}

async function main(html) {

    const bmEffect = (await fromUuid(bm_UUID)).toObject();
    bmEffect.data.tokenIcon.show = showIcons; //Potential for lots of effects to be on a token. Don't show icon to avoid clutter
    bmEffect.flags.core ??= {};
    bmEffect.flags.core.sourceId = bm_UUID;

    const applicator = game.actors.getName(html.find("#playerName")[0].value);
    bmEffect.name = "Battle Medicine by " + applicator.data.name;
    bmEffect.img = applicator.data.token.img;
    const isgodless = CheckFeat('godless-healing', token.actor); //godless healing affects the patient, not the healer
    const isForensic = CheckFeat('forensic-medicine-methodology', applicator);

    if (isForensic || isgodless) {
        bmEffect.data.duration.unit = "hours";
    }

    await token.actor.createEmbeddedDocuments("Item", [bmEffect]);
    ui.notifications.info(token.actor.name + " is now immune to Battle Medicine by " + applicator.name);
}
