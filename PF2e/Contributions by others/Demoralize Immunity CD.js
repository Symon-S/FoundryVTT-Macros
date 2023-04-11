/*
Based on the macro Contributed by ArthurTrumpet
modified by darkim

Uses the a new effect to track who has demoralized whom.
Immunity duration is set depending on several factors. Default is 10 minutes. 

To remove an effect, right click it in the effect tracker (top right of the screen) as per normal
*/

const bmEffect = {
    type: 'effect',
    name: 'Demoralize Immunity',
    img: 'systems/pf2e/icons/spells/blind-ambition.webp',
    system: {
      tokenIcon: {
          show: true
      },       
      duration: {
          value: 10,
          unit: 'minutes',
          sustained: false,
          expiry: 'turn-start'
      },
      rules: [],
    },
  };


if (!token) {
    ui.notifications.error("No token selected!");
} else {
    main();
}

function CheckFeat(slug, healer) {
    return healer.itemTypes.feat.some((i) => i.slug === slug);
}

async function main() {
    const message = game.messages.contents.reverse().find( m => m.flags.demoralize?.id === token.id);

    if (message === undefined) {
        ui.notifications.info("Wrong token selected!");
    } else {
        const applicator = game.actors.get(message.flags.demoralize.demoId);

        bmEffect.name = `Demoralize by ${applicator.name}`;
        bmEffect.img = applicator.prototypeToken.texture.src;

        await token.actor.createEmbeddedDocuments("Item", [bmEffect]);
        ui.notifications.info(`${token.actor.name} is now immune to Demoralize by ${applicator.name}`);
    }
}
