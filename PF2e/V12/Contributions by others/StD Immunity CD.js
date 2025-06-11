/*
Based on the macro Contributed by ArthurTrumpet
modified by darkim

Uses the a new effect to track who has demoralized whom.
Immunity duration is set depending on several factors. Default is 10 minutes. 

To remove an effect, right click it in the effect tracker (top right of the screen) as per normal
*/

const stdEffect = {
    type: 'effect',
    name: 'Scare to Death Immunity',
    img: 'systems/pf2e/icons/spells/blind-ambition.webp',
    system: {
      tokenIcon: {
          show: true
      },       
      duration: {
          value: 10,
          unit: 'rounds',
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
    const message = game.messages.contents.reverse().find( m => m.flags.scaretodeath?.id === token.id);
    if (message === undefined) {
        ui.notifications.info("Wrong token selected!");
    } else {
        const applicator = game.actors.get(message.flags.scaretodeath.stdId);

        stdEffect.name = `Scare to Death by ${message.flags.scaretodeath.stdName}`;
        stdEffect.img = applicator.prototypeToken.texture.src;

        if ( message.flags.scaretodeath.dos == 3 ) {
            if (!token.actor.hasCondition("frightened") ) {
                await token.actor.toggleCondition("frightened");
            }
            if (token.actor.getCondition("frightened").value < 2 ) {
                await token.actor.increaseCondition("frightened");
            }
            if (message.flags.scaretodeath.fleeing && !token.actor.hasCondition("fleeing")) { 
                await token.actor.toggleCondition("fleeing");
            }
        } else if (message.flags.scaretodeath.dos == 2) {
            if (!token.actor.hasCondition("frightened") ) {
                await token.actor.toggleCondition("frightened");
            }
            if (token.actor.getCondition("frightened").value < 2 ) {
                await token.actor.increaseCondition("frightened");
            }
        } else if (message.flags.scaretodeath.dos == 1) {
            if (!token.actor.hasCondition("frightened") ) { 
                await token.actor.toggleCondition("frightened");
            }
        }

        await token.actor.createEmbeddedDocuments("Item", [stdEffect]);
        ui.notifications.info(`${token.name} is now immune to Scare to Death by ${message.flags.scaretodeath.stdName}`);
    }
}
