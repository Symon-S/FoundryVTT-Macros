//Simple Shared prey Macro that changes the Macro's image to that of the actor's image with whom the prey is being shared
//It will then publish a ChatMessage with that PC's token name and the effect.
//Needs to be used on a token and populates playerOwned PC tokens on the canvas to the droplist

if (!token.actor.items.some(s => s.slug === "hunters-edge")) return void ui.notifications.warn("This PC does not have the hunter's edge class feature");
if (!token.actor.items.some(s => s.slug === "shared-prey")) return void ui.notifications.warn("This PC does not have the shared prey feat");
if (!token ) return void ui.notifications.warn("Please select your token");
const tokens = canvas.tokens.placeables.filter(t => t.actor.type === "character" && t.actor.hasPlayerOwner);
tokens.sort((a, b) => {
  return a.name
      .toUpperCase()
      .localeCompare(b.name.toUpperCase(), undefined, {
        sensitivity: "base",
      });
});
let content = `
  <div class="form-group">
    <label for="exampleSelect">Choose PC to share prey with</label>
    <select id="exampleSelect">
`
for (const t of tokens) {
  content += `<option value="${t.id}">${t.name}</option>`
}
content += `</select></div>`
const sPTId = await Dialog.prompt({
  title: "Shared Prey",
  content,
  rejectClose: false,
  callback: (html) => { return html.find("#exampleSelect").val(); }
});

if (sPTId === null) { return }

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
const sPT = canvas.tokens.get(sPTId);
await ChatMessage.create({
  content:`Sharing Prey with ${sPT.name}<bR> ${uuid}`,
  speaker: ChatMessage.getSpeaker()
});
await this.update({img: sPT.actor.img});
