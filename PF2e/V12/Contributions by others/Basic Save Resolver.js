//Contributed by LebombJames
//This macro lets you quickly apply damage to many tokens after rolling reflex saves, for use with an AoE spell for example.

function main() {
    if (!game.user.isGM) {
        ui.notifications.warn("You must be a GM in order to run this macro");
        return;
    };
    if (canvas.tokens.controlled.length < 1) {
        ui.notifications.warn("Please select at least 1 token.");
        return;
    };

    const tokens = canvas.tokens.controlled;
    let applyChanges = false;
    let tokenCount = 0;

    let content = `
    <form>
        <body>Select the result of each token's saving throw. You can also add a modifier to account for things like resistances or weaknesses.</body>
        <div class="form-group">
            <label for="damage">Damage</label>
            <input type="number" id="damage" name="damage" placeholder=0>
        </div>
        <hr>
    `;

    for (const token of tokens) {
        content += `<div class="form-group">
            <label for="${tokenCount}-result" style="min-width:100%;padding-right:7px">${token.name}</label>
            <select name="${tokenCount}-result" id="${tokenCount}-result">
                <option value="no-damage">No Damage</option>
                <option value="half-damage">Half Damage</option>
                <option value="full-damage">Full Damage</option>
                <option value="double-damage">Double Damage</option>
            </select>
            <label for=${tokenCount}-modifier style="text-align:right;padding-right:7px;">Modifier</label>
            <input type="number" id="${tokenCount}-modifier" name="${tokenCount}-modifier" placeholder=0>
        </div>
        <hr>
       `;

        tokenCount += 1;
    };

    content += `</form>`;

    function callback(html) {
        const damage = parseInt(html.find(`[id="damage"]`)[0].value);

        tokens.forEach( (currentValue, index) => {
            const token = tokens[index];
            
            const result = html.find(`[id="${index}-result"]`)[0].options.selectedIndex;
            const modifier = parseInt(html.find(`[id="${index}-modifier"]`)[0].value) || 0;

            switch (result) {
                case 0: //no damage
                    ui.notifications.info(`Applied no damage to ${currentValue.name}.`);
                    break;
                case 1: // half damage
                    token.actor.applyDamage(((damage/2)+modifier), token);
                    break;
                case 2: // full damage
                    token.actor.applyDamage(((damage)+modifier), token);
                    break;
                case 3: // double damage
                    token.actor.applyDamage(((damage*2)+modifier), token);
                    break;
            };
        }
    )};

    new Dialog({
        title: "Basic Save Resolver",
        content: content,
        buttons: {
            yes: {
                icon: "<i class='fas fa-check'></i>",
                label: `Apply Damage`,
                callback: () => applyChanges = true
            },
        },
        close: async html => {
            if (!applyChanges) return;
            callback(html);
        }
    }).render(true);
};
main();
