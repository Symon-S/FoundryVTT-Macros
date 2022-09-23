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
    treatWoundsEffect();
}

function CheckFeat(slug, healer) {
    return healer.itemTypes.feat.some((i) => i.slug === slug);
}

function treatWoundsEffect() {
    let playersNames = canvas.tokens.placeables.filter(pc => pc.actor?.hasPlayerOwner && pc.actor.type === "character" && (pc.actor.data.data.skills['med'].rank > 0 || pc.actor.itemTypes.feat.some(x => x.slug === 'natural-medicine'))).map(pc => pc.actor.data.name);
    let playerNameList = '';
    let immunityConferer = game.messages.contents.filter(m => m.data.flavor?.includes("immune to Treat Wounds")).pop().actor?.data.name;
    playersNames.map((el) => {
        playerNameList += `<option value="${el}"${immunityConferer===el?` selected`:``}>${el}</option>`;
    });

    let template = `
  <p>Character performing Treat Wounds: <select id="playerName">${playerNameList}</select></p> 
  `;

    new Dialog({
        title: "Treat Wounds Tracking",
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

    const twEffect = (await fromUuid(tw_UUID)).toObject();
    twEffect.data.tokenIcon.show = showIcons; //Potential for lots of effects to be on a token. Don't show icon to avoid clutter
    twEffect.flags.core ??= {};
    twEffect.flags.core.sourceId = tw_UUID;

    const applicator = game.actors.getName(html.find("#playerName")[0].value);
    twEffect.name = "Treat Wounds";
    const useContinualRecovery = CheckFeat('continual-recovery', applicator);

    if (useContinualRecovery) {
        twEffect.data.duration.unit = "minutes";
        twEffect.data.duration.value = 10;
    }

    await token.actor.createEmbeddedDocuments("Item", [twEffect]);
    ui.notifications.info(token.actor.name + " is now immune to Treat Wounds for " + twEffect.data.duration.value + " " + twEffect.data.duration.unit + ".");
}
