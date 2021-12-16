//Macro created by ArthurTrumpe with some help from Tik.
//Create an effect in the items section with a duration in rounds.
//Open the console by hitting the F12 key.
//Type in the console console.log(await.game.items); 
//Press the enter key.
//Look at the last entry key/id and replace "ddA2kj2MdCsoXzVe" with it, do not forget that the "" are a part of it.

const effect = await game.items.find(a => a.id == "ddA2kj2MdCsoXzVe").toObject();
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
