/* Original Author: ArthurTrumpet Modded by Symon S.
 This Macro gives you an easy way to add new named cooldown effects to actors.
 Enter your desired duration in either a numerical value or a roll, like 1d4(default).
 Choose your unit type from the drop down menu. I added minutes, hours, and days for things like abilities with hourly cooldowns, spells with 1 minute durations, and afflictions that do things in x days.
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

countdownEffect();

function countdownEffect() {
  const unitsn = [{value: "rounds", name: "Rounds"},{value: "minutes", name: "Minutes"}, {value: "hours", name: "Hours"}, {value: "days", name: "Days"}];
  let units = '';
  unitsn.forEach(u => { units += `<option value="${u.value}">${u.name}</option>`; });
  let template = `
  <p>
    Duration: <input id="countdowninput" type="string" style="width: 50px;" value="1d4">
  </p>
  <p>
    Units: <select id="countdownunits">${units}</select>
  </p>
  <p>
    Name: <input id="countdownname" type="string" style="width: 100px;" value="Countdown">
  </p> 
  <p>
    <input type="checkbox" id="cooldown"/>
    Cooldown (adds 1 to duration)
  </p>
  `;

  new Dialog({
    title: "Countdown Effect",
    content: template,
    buttons: {
      ok: {
        label: "Apply",
        callback: (html) => {
          main(html);
        },
      },
      cancel: {
        label: "Cancel",
      },
    },
  }).render(true);
}

async function main(html) {
    let duration = html.find("#countdowninput")[0].value;
    const unit = html.find("#countdownunits")[0].value;  
    const isCooldown = html.find("#cooldown")[0].checked; 
    effect.name = html.find("#countdownname")[0].value;
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
