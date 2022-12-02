/* Original Author: ArthurTrumpet Modded by Symon S., volfied and alatar224.
 This Macro gives you an easy way to add new named cooldown effects to actors.
 Enter your desired duration in either a numerical value or a roll, like 1d4(default).
 Choose your unit type from the drop down menu. I added minutes, hours, and days for things like abilities with hourly cooldowns, spells with 1 minute durations, and afflictions that do things in x days.
 Choose a preset from the drop-down and it will automatically set the appropriate values and icon.
 Click the plus button to add or remove presets.
 
# source "https://gitlab.com/symonsch/my-foundryvtt-macros/-/tree/main/PF2e/Modded Countdown Cooldown.js" - Fetched on 2022-08-14T18:39:42.877Z
*/

const effect = {
    type: 'effect',
    name: 'Countdown',
    img: 'systems/pf2e/icons/spells/time-beacon.webp',
    data: {
      tokenIcon: {
          show: true
      },       
      duration: {
          value: 1,
          unit: 'rounds',
          sustained: false,
          expiry: 'turn-start'
      }
    },
  };

function pickIcon(event) {
    const currentTarget = event.currentTarget;
    console.log(currentTarget);
    const fp = new FilePicker({
        type: "image",
        current: currentTarget.src,
        button: "image-picker",
        callback: (url) => {
            document.getElementById(currentTarget.id).src = url;
        },
    });
    fp.browse();
}

function onMainRender(html) {
  console.log("On render", html);
  document.getElementById("effect-icon").addEventListener("click", pickIcon);
  document.getElementById("save-preset").addEventListener("click", presetDialog);
}

function rewriteSelect(html) {
  let presetsn = game.user.flags.world.countdownPresets;
  let presets = '';
  Object.values(presetsn).forEach(p => { presets += `<option value="${p.slug}">${p.name}</option>`; });
  document.getElementById("presets").innerHTML = presets;
}

async function countdownEffect() {
  await initializePresets();
  let presetsn = game.user.flags.world.countdownPresets;
  let presets = '';
  Object.values(presetsn).forEach(p => { presets += `<option value="${p.slug}">${p.name}</option>`; });
  const defPairs = Object.entries(presetsn)[0][1];
  const defVals = { "duration":defPairs.duration, "units":defPairs.units, "name":defPairs.name, "icon":defPairs.icon, "cooldown":defPairs.cooldown };
  const unitsn = [{value: "rounds", name: "Rounds"}, {value: "minutes", name: "Minutes"}, {value: "hours", name: "Hours"}, {value: "days", name: "Days"}];
  let units = '';
  unitsn.forEach(u => { units += `<option value="${u.value}"${defVals.units === u.value ? ' selected' : ''}>${u.name}</option>`; });
  console.log(defVals.cooldown);
  let template = `
  <script>
    function assignValues(e) {
      let presets = game.user.flags.world.countdownPresets;
      let p = e.target.value
      const insertDuration = presets[p].duration;
      document.getElementById("countdowninput").value = insertDuration;
      const insertUnits = presets[p].units;
      document.getElementById("countdownunits").value = insertUnits;
      const insertName = presets[p].name;
      document.getElementById("countdownname").value = insertName;
      const insertIcon = presets[p].icon;
      document.getElementById("effect-icon").src = insertIcon;
      const insertCooldown = presets[p].cooldown;
      document.getElementById("cooldown").checked = insertCooldown;
    }
  </script>
  <div style="float: right">
    <p align="right">Presets:<br>
      <button id="save-preset" type="button" style="width:35px">
          <i class="fas fa-plus-square"></i>
        </button>
      <select id="presets" onchange="assignValues(event)">${presets}</select>
    </p>
    <p align="right">
      <img id="effect-icon" src="${defVals.icon}" data-edit="img" title="icon" height="48" width="48">
    </p>
  </div>
  <p>
    Duration: <input id="countdowninput" type="string" style="width: 50px;" value="${defVals.duration}">
  </p>
  <p>
    Units: <select id="countdownunits">${units}</select>
  </p>
  <p>
    Name: <input id="countdownname" type="string" style="width: 150px;" value="${defVals.name}">
  </p> 
  <p>
    <input type="checkbox" id="cooldown"${defVals.cooldown ? ' checked' : ''}/>Cooldown (+1 round)
    </p>
  `;

  new Dialog(
    {
      title: "Countdown Effect",
      content: template,
      buttons: {
        ok: {
          label: "Apply",
          callback: (html) => {
            clickOk(html);
          },
        },
        cancel: {
          label: "Cancel",
        },
      }, 
      render: onMainRender,
    }, 
    { width: 400 }
  ).render(true);
}

function bmApply(html, html2) {
  const bmPC = html.find("#bmPC")[0].value;
  const img = canvas.tokens.placeables.filter(pc => pc.actor.name === bmPC)[0].data.texture.src;
  if (canvas.tokens.controlled.length === 0) {
    ui.notifications.warn("You must select a token before clicking Apply.");
    throw new Error('No token selected.')
  } else {
    main(html2, img)
  }
}

function battlemedicineEffect(html2) {
    let playersNames = canvas.tokens.placeables.filter(pc => pc.actor.type === "character").map(pc => pc.actor.name);
    let playerNameList = '';
    playersNames.map((pc) => {
        playerNameList += `<option value="${pc}"}>${pc}</option>`;
    });
    let template = `
  <p>Character performing Battle Medicine:<br><select id="bmPC">${playerNameList}</select></p> 
  `;

    new Dialog({
        title: "Battle Medicine Countdown",
        content: template,
        buttons: {
            ok: {
                label: "Apply",
                callback: (html) => {
                    bmApply(html, html2);
                },
            },
            cancel: {
                label: "Cancel",
            },
        }
    }, 
    { width: 300 }
  ).render(true);
}

async function clickOk(html) {
  effect.name = html.find("#countdownname")[0].value;
  if (effect.name === 'Battle Medicine') {
    if (canvas.tokens.controlled.length === 0) {
      ui.notifications.warn("You must select a token before clicking Apply.");
    }
    battlemedicineEffect(html);
  } else {
    main(html);
  }
}

async function main(html, bmImg = null) {
    let duration = html.find("#countdowninput")[0].value;
    const unit = html.find("#countdownunits")[0].value;  
    const isCooldown = html.find("#cooldown")[0].checked; 
    effect.name = html.find("#countdownname")[0].value;    
    if (effect.name === 'Battle Medicine') {
      effect.img = bmImg;
    } else {
      effect.img = html.find("#effect-icon")[0].src;  
    }
    let countdownNumber = "";
    if (duration.includes("d")) {
        countdownNumber = new Roll(duration).roll({ async : false }).total;
    } else {
        countdownNumber = duration;
    }
    if (isCooldown) {countdownNumber = parseInt(countdownNumber) +1};
    
    effect.data.duration.unit = unit;
    effect.data.duration.value = countdownNumber;
    await token.actor.createEmbeddedDocuments("Item", [effect]);
}

const defaultIcon = "systems/pf2e/icons/spells/time-beacon.webp";

const defaultPresets = [
  {slug: "battle_medicine", name: "Battle Medicine", duration: "24", units: "hours", icon: "icons/magic/symbols/question-stone-yellow.webp", cooldown: false},
  {slug: "treat_wounds", name: "Treat Wounds", duration: "50", units: "minutes", icon: "systems/pf2e/icons/conditions/wounded.webp", cooldown: false},
];

const defaultUnits = [
  {value: "rounds", name: "Rounds"},
  {value: "minutes", name: "Minutes"}, 
  {value: "hours", name: "Hours"},
  {value: "days", name: "Days"},
];

async function savePreset(preset) {
  console.log("Save preset", preset);
  return game.user.setFlag('world', 'countdownPresets', { [preset.slug]: preset });
}

async function removePreset(name) {
  console.log("Remove preset", name);
  return game.user.unsetFlag('world', `countdownPresets.${name}`);
}

function getPresets() {
  console.log("Get presets", game.user.flags.world?.countdownPresets);
  return game.user.flags.world?.countdownPresets || {};
}

async function clearPresets() {
  console.log("Clear presets");
  return await Promise.all(Object.keys(game.user.flags.world?.countdownPresets || {}).map(removePreset));
}

async function initializePresets(reset = false) {
  console.log("Initialize presets");
  if (reset) {
    await clearPresets();
    await Object.values(ui.windows).find(e => e.id === "preset-dialog").close();
    if (!hasPresets()) {
      await saveAllPresets(defaultPresets);
    }
    presetDialog();
  } else {
    if (!hasPresets()) {
      await saveAllPresets(defaultPresets);
    }
  }
  return getPresets();
}

async function saveAllPresets(presets) {
  console.log("Save all presets", presets);
  return Promise.all(presets.map(savePreset));
}

function hasPresets() {
  const ret = Object.keys(game.user.flags.world?.countdownPresets || {}).length > 0;
  console.log("Has presets", ret);
  return ret;
}

function getUnitsHtml(selected) {
  console.log("Get units HTML", selected);
  return defaultUnits.map(u => `<option value="${u.value}" ${u.value == selected ? "selected" : ""} >${u.name}</option>`).join("");
}

function getRowHtml(i, preset) {
  console.log("Get row HTML", i, preset);
  const unitsHtml = getUnitsHtml(preset?.units);
  return `<tr id="preset-row-${i}" class="preset-row">
      <td><input name="${i}.name" type="string" style="width: 200px;" value="${preset?.name || ""}" /></td>
      <td><input name="${i}.duration" type="string" style="width: 50px;" value="${preset?.duration || ""}" /></td>
      <td><select name="${i}.units">${unitsHtml}</select></td>
      <td><input name="${i}.cooldown" type="checkbox" ${preset?.cooldown ? "checked" : ""} /></td>
      <td><img class="effect-icon" id="icon-${i}" src="${preset?.icon || defaultIcon }" height="35" width="35" /></td>
      <td align="center"><button class="delete-me" value="${i}" type="button" style="width:27px;height:27px;padding:0;border:none;background:none"><i class="fas fa-minus-square"></i></button></td>
    </tr>`
}

function getTableHtml() {
  console.log("Get table HTML");
  const rowsHtml = Object.values(getPresets()).map((preset, i) => getRowHtml(i, preset)).join("");
  return `<h3>Countdown Presets
  <div style="float: right">
    <button id="reset-presets" type="button" style="width:27px;height:27px;padding:0;border:none;background:none"><i class="fas fa-book-arrow-up"></i></button>
  </div></h3>
    <form id="preset-form">
      <table id="preset-table" style="border-collapse: separate; border-spacing:5px">
        <thead>
          <tr>
            <th>Name</th>
            <th>Value</th>
            <th>Units</th>
            <th>Cool</th>
            <th>Icon</th>
            <th align="center"><button id="add-row" type="button" style="width:27px;height:27px;padding:0;border:none;background:none"><i class="fas fa-plus-square"></i></button></th>
          </tr>
        </thead>
        <tbody id="preset-table-body">
          ${rowsHtml}
        </tbody>
      </table>
    </form>`;
}

function addRow(i) {
  console.log("Add row", i);
  document.getElementById("preset-table-body").insertAdjacentHTML("beforeend", getRowHtml(i));
  const row = document.getElementById(`preset-row-${i}`);
  attachEvents(row);
}

function deleteRow(event) {
  const i = event.currentTarget.value;
  console.log("Delete row", i);
  const row = document.getElementById(`preset-row-${event.currentTarget.value}`)
  removeEvents(row);
  row.remove();
}

function attachEvents(row) {
  console.log("Attach events", row);
  row.querySelector(".effect-icon").addEventListener("click", pickIcon);
  row.querySelector(".delete-me").addEventListener("click", deleteRow);
}

function removeEvents(row) {
  console.log("Remove events", row);
  row.querySelector(".effect-icon").removeEventListener("click", pickIcon);
  row.querySelector(".delete-me").removeEventListener("click", deleteRow);
}

function onPreRender(html) {
  console.log("On preset render", html);
  let count = Object.keys(getPresets()).length;
  html[0].querySelector("#add-row").addEventListener("click", event => addRow(count++));
  html[0].querySelector("#reset-presets").addEventListener("click", event => initializePresets(true));
  html[0].querySelectorAll(".preset-row").forEach(attachEvents);
}

function getPresetData(formElement) {
  console.log("Get preset data", formElement);
  const formData = new FormData(formElement);
  const presets = {}
  for (const [name, value] of formData.entries()) {
    const [i, prop] = name.split(".");
    if (!presets[i]) {
      presets[i] = {};
    }
    presets[i][prop] = value;
  }
  // Now we need to iterate back through to populate the icon paths
  for (const [i, preset] of Object.entries(presets)) {
    // TODO Validate slug
    preset.slug = preset.name.toLowerCase().match(/^((?!\s\().)+/)[0].replace(/[^a-z0-9 ]/g,'').replace(/\s/,'_');;
    // TODO Validate other inputs
    // False values will be missing from FormData
    preset.cooldown = !!preset.cooldown;
    // Use getAttribute so we get back the relative URL
    preset.icon = formElement.querySelector(`#icon-${i}`).getAttribute("src");
  }
  return Object.values(presets);
}

async function saveCallback(html) {
  console.log("Save callback", html);
  const form = html[0].querySelector("#preset-form");
  await clearPresets();
  await saveAllPresets(getPresetData(form));
  rewriteSelect(html);
}

async function presetDialog() {
  console.log("Array test");
  // await initializePresets();

  new Dialog(
    {
      title: "Countdown Effect",
      content: getTableHtml(),
      buttons: {
        ok: {
          label: "Save",
          callback: saveCallback,
        },
        cancel: {
          label: "Cancel",
        },
      },
      render: onPreRender,
    },
    { id: 'preset-dialog',
      width: 500 }
  ).render(true);
}

// await presetDialog();

countdownEffect();
