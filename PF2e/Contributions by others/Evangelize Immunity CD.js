/*
Based on the macro Contributed by ArthurTrumpet
modified by darkim

Uses the a new effect to track who has demoralized whom.
Immunity duration is set depending on several factors. Default is 10 minutes. 

To remove an effect, right click it in the effect tracker (top right of the screen) as per normal
*/

const evangelizeEffect = {
    type: 'effect',
    name: 'Evangelize Immunity',
    img: 'systems/pf2e/icons/spells/blind-ambition.webp',
    system: {
      tokenIcon: {
          show: true
      },       
      duration: {
          value: 24,
          unit: 'hours',
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

async function main() {
    const message = game.messages.contents.reverse().find( m => m.flags.evangelize?.id === token.id);
    if (message === undefined) {
        ui.notifications.info("Wrong token selected!");
    } else {
        const applicator = game.actors.get(message.flags.evangelize.evangelizeId);

        evangelizeEffect.name = `Evangelize by ${message.flags.evangelize.evangelizeName}`;
        evangelizeEffect.img = applicator.prototypeToken.texture.src;

        if ( message.flags.evangelize.dos == 3 ) {
            if (!token.actor.hasCondition("stupefied") ) {
                await token.actor.toggleCondition("stupefied");
            }
            if (token.actor.getCondition("stupefied").value < 2 ) {
                await token.actor.increaseCondition("stupefied");
            }
        } else if (message.flags.evangelize.dos == 2) {
            if (!token.actor.hasCondition("stupefied") ) {
                await token.actor.toggleCondition("stupefied");
            }
        }

        await token.actor.createEmbeddedDocuments("Item", [evangelizeEffect]);
        ui.notifications.info(`${token.name} is now immune to Evangelize by ${message.flags.evangelize.evangelizeName}`);
    }
}
