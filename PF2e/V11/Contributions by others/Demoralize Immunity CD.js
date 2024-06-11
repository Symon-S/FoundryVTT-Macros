/*
Based on the macro Contributed by ArthurTrumpet
modified by darkim
modified again by kromko

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

main();


async function main() {
  const message = game.messages.contents.findLast( m => m.flags.demoralize);

  let {sourceTokenId, sourceName, results} = message.flags.demoralize;

  let source = canvas.tokens.get(sourceTokenId);
  
  results = results.filter(r => r.outcome !== 'invalid');

  // Check if we have permissions to edit all of the target actors
  if(!results.every(r=>canvas.tokens.get(r.targetTokenId)?.actor.isOwner))
      return ui.notifications.warn("You don't have permissions to edit some of the tokens");

  demEffect.name = `Demoralize Immunity from ${sourceName}`;
  demEffect.img = source.actor.prototypeToken.texture.src;
  demEffect.flags = {demoralize: {source: source.actor.id}};

  for(let {targetTokenId, outcome} of results){
    let target = canvas.tokens.get(targetTokenId);

    // Frightened
    if(['success', 'criticalSuccess'].includes(outcome)){
      let frightened = target.actor.getCondition('frightened')?.value ?? 0;
      let newFrightened = Math.max(frightened, outcome == 'success' ? 1 : 2);
      target.actor.increaseCondition('frightened', {value:newFrightened, max:newFrightened});
    }

    // Terrified retreat
    if(source.actor.itemTypes.feat.some(f=>f.slug === 'terrified-retreat') && source.actor.level > target.actor.level && outcome === 'criticalSuccess'){
      target.actor.increaseCondition('fleeing', {max:1});
    }

    // Temporary immunity
    await target.actor.createEmbeddedDocuments("Item", [demEffect]);
  }
}
