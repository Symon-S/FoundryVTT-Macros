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
      slug: 'demoralize-immunity',
      tokenIcon: {
          show: true
      },       
      duration: {
          value: 10,
          unit: 'minutes',
          sustained: false,
          expiry: 'turn-end'
      },
      rules: [],
    },
  };
/*
const retreatEffect = {
    type: 'effect',
    name: 'Terrified Retreat',
    slug: 'terrified-retreat-effect',
    img: 'systems/pf2e/icons/conditions/fleeing.webp',
    system: {
      tokenIcon: {
          show: true
      },       
      duration: {
          value: 1,
          unit: 'rounds',
          sustained: false,
          expiry: 'turn-end'
      },
      rules: [
        {
          "key": "GrantItem",
          "uuid": "Compendium.pf2e.conditionitems.Item.sDPxOjQ9kx2RZE8D",
          "onDeleteActions": {
            "grantee": "restrict"
          }
        }
      ],
    },
  };
*/
main();


async function main() {
    const message = game.messages.contents.reverse().find( m => m.flags.demoralize);

    let {sourceTokenId, sourceName, targetTokenId, targetName, degreeOfSuccess} = message.flags.demoralize;

    let source = canvas.tokens.get(sourceTokenId);
    let target = canvas.tokens.get(targetTokenId);
    
    // Check if we have permissions to edit the target actor
    if(!target.actor.isOwner)
        return ui.notification.warn("You don't have permissions to edit the target token");

    demEffect.name = `Demoralize Immunity from ${sourceName}`;
    demEffect.img = source.actor.prototypeToken.texture.src;
    demEffect.flags = {demoralize: {source: source.actor.id}};

    if(['success', 'criticalSuccess'].includes(degreeOfSuccess)){
        let frightened = target.actor.getCondition('frightened')?.value ?? 0;
        let newFrightened = Math.max(frightened, degreeOfSuccess == 'success' ? 1 : 2);
        target.actor.increaseCondition('frightened', {value:newFrightened, max:newFrightened});
    }
    await target.actor.createEmbeddedDocuments("Item", [demEffect]);

    ui.notifications.info(`${targetName} is now immune to Demoralize by ${sourceName}`);
}

