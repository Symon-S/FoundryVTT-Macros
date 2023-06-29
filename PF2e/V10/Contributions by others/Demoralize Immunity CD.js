/*
Based on the macro Contributed by ArthurTrumpet
modified by darkim

Uses the a new effect to track who has demoralized whom.
Immunity duration is set depending on several factors. Default is 10 minutes. 

To remove an effect, right click it in the effect tracker (top right of the screen) as per normal
*/

const demEffect = {
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

async function main() {
    const message = game.messages.contents.reverse().find( m => m.flags.demoralize?.id === token.id);

    if (message === undefined) {
        ui.notifications.info("Wrong token selected!");
    } else {
        const applicator = game.actors.get(message.flags.demoralize.demoId);

        demEffect.name = `Demoralize by ${message.flags.demoralize.demoName}`;
        demEffect.img = applicator.prototypeToken.texture.src;

        if ( message.flags.demoralize.dos == 3 ) {
            if (!token.actor.hasCondition("frightened") ) {
                await token.actor.toggleCondition("frightened");
            }
            if (token.actor.getCondition("frightened").value < 2 ) {
                await token.actor.increaseCondition("frightened");
            }
            if (message.flags.demoralize.tr && !token.actor.hasCondition("fleeing")) { 
                await token.actor.toggleCondition("fleeing");
            }
        } else if (message.flags.demoralize.dos == 2) {
            if (!token.actor.hasCondition("frightened") ) { 
                await token.actor.toggleCondition("frightened");
            }
        }

        await token.actor.createEmbeddedDocuments("Item", [demEffect]);
        ui.notifications.info(`${token.name} is now immune to Demoralize by ${message.flags.demoralize.demoName}`);
    }
}
