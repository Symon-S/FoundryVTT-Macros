/*Author ArthurTrumpet
 This Macro gives you an easy way to add new named cooldown effects to actors.
 Enter your desired duration in either a numerical value or a roll, like 1d4(default).
*/

const current = this.img;
console.log(current);
function onRender(html) {
    html.find("#some-id").click((event) => someFunction(event, html));
}

const effect = {
    type: "effect",
    name: "Countdown",
    img: this.img,
    data: {
        tokenIcon: {
            show: true,
        },
        duration: {
            value: 1,
            unit: "rounds",
            sustained: false,
            expiry: "turn-start",
        },
    },
};

function someFunction(event, html) {
    const fp = new FilePicker({
        type: "image",
        current: current,
        button: "image-picker",
        callback: (url) => {
            html.find("#imagepath").val(url);
        },
    });
    fp.browse();
}

testFunction();

function testFunction() {
    const unitsn = [
        { value: "rounds", name: "Rounds" },
        { value: "minutes", name: "Minutes" },
        { value: "hours", name: "Hours" },
        { value: "days", name: "Days" },
    ];
    let units = "";
    unitsn.forEach((u) => {
        units += `<option value="${u.value}">${u.name}</option>`;
    });

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
 <form>
 <div class="form-group">
   <label>Image:</label>
   <div class="form-fields">
     <input type="text" id="imagepath" name="imagepath" value="">
     <button id="some-id" type="button"><i class="fas fa-file-import fa-fw"></i></button>
   </div>
 </div>
 </form>
  `;

    new Dialog({
        title: "Example",
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
        render: onRender,
    }).render(true);
}

async function main(html) {
    let duration = html.find("#countdowninput")[0].value;
    const unit = html.find("#countdownunits")[0].value;
    const isCooldown = html.find("#cooldown")[0].checked;
    effect.name = html.find("#countdownname")[0].value;
    let countdownNumber = "";
    let customImage = html.find("#imagepath")[0].value;
    if (duration.includes("d")) {
        countdownNumber = new Roll(duration).roll({ async: false }).total;
    } else {
        countdownNumber = duration;
    }
    if (isCooldown) {
        countdownNumber = parseInt(countdownNumber) + 1;
    }
    if (customImage) {
        effect.img = customImage;
    }
    effect.data.duration.unit = unit;
    effect.data.duration.value = countdownNumber;
    await token.actor.createEmbeddedDocuments("Item", [effect]);
}
