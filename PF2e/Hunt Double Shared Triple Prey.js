/* 
Hunt Prey/Double Prey/Shared Prey/Triple Threat.
This macro covers all the above listed features/feats.
Simply target the appropriate amount of targets and fill out the Dialog if you have Triple Threat.
*/

if (!actor.items.some(hp => hp.slug === "hunt-prey")) return void ui.notifications.warn(`${token.name} does not have the hunt prey action`);
if (game.user.targets.size < 1) return void ui.notifications.warn(`Please target at least one token`);
if (game.user.targets.size > 1 && !actor.items.some(dp => dp.slug === "double-prey")) return void ui.notifications.warn("You can only target 1 creature");
if (game.user.targets.size > 2 && !actor.items.some(dp => dp.slug === "triple-threat")) return void ui.notifications.warn("You cannot target more than 2 targets.");
let hp = [], dp = false, sp = false, tt = false;
if (actor.items.some(sp => sp.slug === "triple-threat")) {
    tt = true;
    if (game.user.targets.size === 1) {
        hp.push(game.user.targets.first().name);
        sp = true;
        dp = true
    }
    else if (game.user.targets.size === 2) {
        hp = game.user.targets.values().toArray().map(x => x.name);
        sp = true;
    }
    else if (game.user.targets.size === 3) hp = game.user.targets.values().toArray().map(x => x.name);
    else { return void ui.notifications.warn("You cannot target more than 3 targets.") }
} 
else if (actor.items.some(sp => sp.slug === "shared-prey" && game.user.targets.size === 1)) {
    hp.push(game.user.targets.first().name);
    sp = true;
}
else if (actor.items.some(sp => sp.slug === "double-prey") && game.user.targets.size === 2 ){
    hp = game.user.targets.values().toArray().map(x => x.name);
}
else hp = hp.push(game.user.targets.first().name);
const spp = canvas.tokens.placeables.filter(x => ["character","npc"].includes(x.actor?.type) && x.actor?.alliance === actor.alliance && x.id !== token.id);

let spa = "";
for ( const p of spp ) {
  spa += `<option>${p.name}</option>`
}

let chosen;
if (sp) {
  const title = sp && tt ? "Triple Threat" : "Share Prey";
  const content = `<form>
    <div class="form-group">
      <label>Share Prey with:</label>
      <div class="form-fields">
        <select name="sp1">${spa}</select>
      </div>
    </div>
    ${sp && dp && tt ? `<div class="form-group">
        <label>Share Prey with:</label>
        <div class="form-fields">
          <select name="sp2">${spa}</select>
        </div>
      </div>` : ""}
    </form>`
    chosen = await Dialog.prompt({
      title,
      content,
      callback: ([html]) => new FormDataExtended(html.querySelector("form")).object,
      rejectClose: false,
    });
}

if (chosen === null) return;

const effect = {
  type: 'effect',
  name: `Hunted Prey: ${hp.join(" & ")}`,
  img: "icons/creatures/eyes/humanoid-single-red-brown.webp",
  system: {
    tokenIcon: {
      show: true
    },       
    duration: {
      value: -1,
      unit: 'unlimited',
      sustained: false,
      expiry: null
    },
    slug: "hunt-prey-macro"
  },
};

const sharing = sp ? Object.values(chosen).join(" & ") : "";
const effect2 = duplicate(effect);
foundry.utils.mergeObject(effect2, {name: `Sharing Prey with: ${sharing}`, img: "systems/pf2e/icons/spells/contact-friends.webp", "system.slug": "sharing-prey-macro"});

let updates = sp ? [effect, effect2] : [effect];
if (actor.itemTypes.effect.some(x => x.system.slug === "hunt-prey-macro")) {
  if (!sp && actor.itemTypes.effect.some(x => x.system.slug === "sharing-prey-macro")) {
    await actor.itemTypes.effect.find(x => x.system.slug === "sharing-prey-macro").delete();
  }
  effect._id = actor.itemTypes.effect.find(x => x.system.slug === "hunt-prey-macro").id;
  if (actor.itemTypes.effect.some(x => x.system.slug === "sharing-prey-macro")) {
    effect2._id = actor.itemTypes.effect.find(x => x.system.slug === "sharing-prey-macro").id;
  }
  updates = effect2._id ? [effect, effect2] : [effect];
  await actor.updateEmbeddedDocuments("Item", updates);
  if (sp && !effect2._id) await actor.createEmbeddedDocuments("Item", [effect2]);
}
else {
  await actor.createEmbeddedDocuments("Item", updates);
}

const uuids = [
  "@UUID[Compendium.pf2e.feat-effects.Item.uXCU8GgriUjuj5FV]", //flurry effect
  "@UUID[Compendium.pf2e.feat-effects.Item.4UNQfMrwfWirdwoV]", //masterful flurry effect
  "@UUID[Compendium.pf2e.feat-effects.Item.ltIvO9ZQlmqGD89Y]", //outwit effect
  "@UUID[Compendium.pf2e.feat-effects.Item.iqvurepX0zyu9OlI]", //masterful outwit efect
  "@UUID[Compendium.pf2e.feat-effects.Item.mNk0KxsZMFnDjUA0]", //precision effect
  "@UUID[Compendium.pf2e.feat-effects.Item.Lt5iSfx8fxHSdYXz]", //masterful precision effect
]; //add additional uuid's to effects of custom Hunter's Edge
let uuid = "";
if (actor.items.some(s => s.sourceId === "Compendium.pf2e.classfeatures.Item.6v4Rj7wWfOH1882r")) {
  uuid = uuids[0];
  if (actor.level > 16) { uuid = uuids[1] }
} //flurry
if (actor.items.some(s => s.sourceId === "Compendium.pf2e.classfeatures.Item.NBHyoTrI8q62uDsU")) {
  uuid = uuids[2];
  if (actor.level > 16) { uuid = uuids[3] }
} //outwit
if (actor.items.some(s => s.sourceId === "Compendium.pf2e.classfeatures.Item.u6cBjqz2fiRBadBt")) {
  uuid = uuids[4];
  if (actor.level > 16) { uuid = uuids[5] }
} //precision
if (uuid === "") { ui.notifications.warn("You may have a custom Hunter's Edge. If so, please modify the macro to accomodate your custom Hunter's Edge custom effect, if it has one")} // remove this line if your custom doesn't have an effect

await ChatMessage.create({
  speaker: ChatMessage.getSpeaker(),
  content: `${sp ? effect.name + "<br>" + effect2.name + "<br>" + uuid : effect.name}` 
});