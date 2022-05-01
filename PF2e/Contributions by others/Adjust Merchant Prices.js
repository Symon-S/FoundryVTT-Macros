/*
Contributed by Cerapter
*/

if (token?.actor?.type !== "loot") {
  ui.notifications.error(`You must select at least one Merchant actor!`);
} else if (token.actor.data.data.lootSheetType !== "Merchant") {
  ui.notifications.error(`The selected actor must be a Merchant!`);
} else {
  showPopup();
}

function showPopup() {
  new Dialog({
    title: "Adjust Prices",
    content: formatPopup(),
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

          for (let input of inputs) {
            let item = actor.items.find((i) => i.id === input.name);
            if (!!item) {
              const newValue = multiplyCoinValue(
                input.value,
                percentChange / 100
              );
              item.update({ "data.price.value": newValue });
            }
          }
        },
      },
    },
    default: "yes",
  }).render(true);
}

function formatPopup() {
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
          <tr><td>${item.name}</td><td><input name="${item.id}" type="text" value="${item.price}" /></td></tr>`
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

/// This is literally just a reimplementation of half the coin helper functions from item/treasure/helpers.ts.
function multiplyCoinValue(coins, factor) {
  // Grab whatever coins we can from the price field.
  let finalCoins = [...coins.matchAll(/(\d+)\s*([pgsc]p)/g)]
    .map((match) => {
      const [value, denomination] = match.slice(1, 3);
      let finalValue = parseFloat(value) ?? 0.0;

      return `"${denomination}": ${finalValue}`;
    })
    .join(",");
  finalCoins = JSON.parse("{" + finalCoins + "}"); // Lord forgive me.

  // Ensure we have every coin possible.
  finalCoins["pp"] = finalCoins["pp"] ?? 0.0;
  finalCoins["gp"] = finalCoins["gp"] ?? 0.0;
  finalCoins["sp"] = finalCoins["sp"] ?? 0.0;
  finalCoins["cp"] = finalCoins["cp"] ?? 0.0;

  // Multiply.
  if (factor % 1 === 0) {
    finalCoins["pp"] = finalCoins["pp"] * factor;
    finalCoins["gp"] = finalCoins["gp"] * factor;
    finalCoins["sp"] = finalCoins["sp"] * factor;
    finalCoins["cp"] = finalCoins["cp"] * factor;
  } else {
    finalCoins["pp"] = finalCoins["pp"] * factor;
    finalCoins["gp"] = finalCoins["gp"] * factor + (finalCoins["pp"] % 1) * 10;
    finalCoins["sp"] = finalCoins["sp"] * factor + (finalCoins["gp"] % 1) * 10;
    finalCoins["cp"] = finalCoins["cp"] * factor + (finalCoins["sp"] % 1) * 10;
  }

  // In the previous step, we potentially got some coins in fractions.
  // Since those were "converted" one step below already, we can freely floor here.
  finalCoins["pp"] = Math.floor(finalCoins["pp"]);
  finalCoins["gp"] = Math.floor(finalCoins["gp"]);
  finalCoins["sp"] = Math.floor(finalCoins["sp"]);
  finalCoins["cp"] = Math.floor(finalCoins["cp"]);

  // This is purely a "prettying" step -- only add the coins that actually exist.
  let finalString = [];
  if (Math.sign(finalCoins["pp"]) === 1) {finalString.push(finalCoins["pp"] + " pp")};
  if (Math.sign(finalCoins["gp"]) === 1) {finalString.push(finalCoins["gp"] + " gp")};
  if (Math.sign(finalCoins["sp"]) === 1) {finalString.push(finalCoins["sp"] + " sp")};
  if (Math.sign(finalCoins["cp"]) === 1) {finalString.push(finalCoins["cp"] + " cp")};

  return finalString.join(" ");
}
