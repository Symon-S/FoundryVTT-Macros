/*Author ArthurTrumpet
 This Macro gives you an easy way to add new named cooldown effects to actors.
 Enter your desired duration in either a numerical value or a roll, like 1d4(default).
*/
const effect = {
    type: 'effect',
    name: 'Countdown',
    img: this.data.img,
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
  let template = `
  <p>
    Rounds: <input id="countdowninput" type="string" style="width: 50px;" value="1d4">
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
    const isCooldown = html.find("#cooldown")[0].checked; 
    effect.name = html.find("#countdownname")[0].value;
    let countdownNumber = "";
    if (duration.includes("d")) {
        countdownNumber = new Roll(duration).roll({ async : false }).total;
    } else {
        countdownNumber = duration;
    }
    if (isCooldown) {countdownNumber = parseInt(countdownNumber) +1};
    
    effect.data.duration.value = countdownNumber;
    await token.actor.createEmbeddedDocuments("Item", [effect]);
}
