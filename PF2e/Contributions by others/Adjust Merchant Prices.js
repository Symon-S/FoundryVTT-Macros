/*
Contributed by Cerapter
*/

if (token?.actor?.type !== "loot") {
  ui.notifications.error(`You must select at least one Merchant actor!`);
} else if (token.actor.data.data.lootSheetType !== "Merchant") {
  ui.notifications.error(`The selected actor must be a Merchant!`);
} else {
  showPopup(token.actor);
}

function showPopup(actor) {
  new Dialog({
    title: "Adjust Prices",
    content: formatPopup(actor),
    buttons: {
      no: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel",
      },
      yes: {
        icon: '<i class="fas fa-coins"></i>',
        label: "Adjust",
        callback: ($html) => {
          const inputs = $html[0].querySelectorAll("input[name]");
          const percentChange =
            parseInt(
              $html[0].querySelector("input[name='merchantAdjust.Percent']")
                .value,
              10
            ) ?? 100;

          let updates = [];
          for (let input of inputs) {
            let item = actor.items.find((i) => i.id === input.name);
            if (!!item) {
              const newValue = game.pf2e.Coins.fromString(input.value);

              updates.push({
                _id: item.id,
                "data.price.value": newValue.scale(percentChange / 100),
              });
            }
          }
          actor.updateEmbeddedDocuments("Item", updates);
        },
      },
    },
    default: "yes",
  }).render(true);
}

function formatPopup(actor) {
  const weapon = gatherItems(actor.itemTypes.weapon);
  const armour = gatherItems(actor.itemTypes.armor);
  const equipment = gatherItems(actor.itemTypes.equipment);
  const consumable = gatherItems(actor.itemTypes.consumable);
  const treasure = gatherItems(actor.itemTypes.treasure);
  const backpack = gatherItems(actor.itemTypes.backpack);

  const generalSettings = generalSettingsToHTML();
  const weaponHTML = formatItemsToHTML("Weapon", weapon);
  const armourHTML = formatItemsToHTML("Armour", armour);
  const equipmentHTML = formatItemsToHTML("Equipment", equipment);
  const consumableHTML = formatItemsToHTML("Consumable", consumable);
  const treasureHTML = formatItemsToHTML("Treasure", treasure);
  const backpackHTML = formatItemsToHTML("Container", backpack);

  return `${generalSettings}
  <hr>
  ${weaponHTML}
  ${armourHTML}
  ${equipmentHTML}
  ${consumableHTML}
  ${treasureHTML}
  ${backpackHTML}
  `;
}

function gatherItems(items) {
  return items
    .filter((notcoins) => notcoins.data.data.stackGroup !== "coins")
    .map((item) => ({
      id: item.id,
      name: item.name,
      price: item.data.data.price.value,
    }));
}

function formatItemsToHTML(title, items) {
  if (items.length === 0) {
    return ``;
  }

  return `
    <h1>${title}</h1>
    <table class="pf2-table">
      <thead>
        <tr>
          <th>Name</th><th>New Price</th>
        </tr>
      </thead>
      <tbody>
      ${items
        .map(
          (item) => `
          <tr><td>${item.name}</td><td><input name="${
            item.id
          }" type="text" value="${item.price.toString()}" /></td></tr>`
        )
        .join("")}
      </tbody></table>`;
}

function generalSettingsToHTML() {
  return `<h1>All</h1>
  <form>
  <div class="form-group">
    <label>Changes All Prices By Percent</label>
    <div class="form-fields">
        <input type="number" name="merchantAdjust.Percent" value="100">
    </div>
    <p class="notes">
      Every price will be automatically adjusted to this percentage (the default 100% will keep prices as-is). 
      This happens after your changing the prices.
    </p>
  </div>
  </form>
  `;
}
