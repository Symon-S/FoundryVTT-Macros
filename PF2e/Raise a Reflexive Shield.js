const actors = canvas.tokens.controlled.flatMap((token) => token.actor ?? []);
const ITEM_UUID = 'Compendium.pf2e.feat-effects.pwbFFD6NzDooobKo';
 // Effect: Reflexive Shield
const source = (await fromUuid(ITEM_UUID)).toObject();
source.flags.core ??= {};
source.flags.core.sourceId = ITEM_UUID;
source.data.rules.push({"key":"FlatModifier","label":"Raised Shield","selector":"ac","type":"circumstance","value":2},{"domain":"all","key":"RollOption","option":"self:shield:raised"});
console.log(source);
for await (const actor of actors) {
    const existing = token.actor.itemTypes.effect.find((effect) => effect.getFlag('core', 'sourceId') === ITEM_UUID);
    if (existing) {
        await existing.delete();
    } else {
                if (token.actor.itemTypes.armor.filter(s => s.isEquipped === true && s.data.data.category === "shield" && s.data.data.hp.value > s.data.data.brokenThreshold.value).length != 0) {
        await actor.createEmbeddedDocuments('Item', [source]);

        }
    }
}
