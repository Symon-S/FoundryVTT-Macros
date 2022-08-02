/**
 * Contributed by JDCalvert
 * Allows the user to update the radius of an active aura effect. Useful for auras like Protective Ward
 */

/**
 * Find exactly one actor and token to update
 */
function getControlledActorAndToken() {
    const controlledTokens = canvas.tokens.controlled;
    if (controlledTokens.length) {
        if (controlledTokens.length === 1) {
            const token = controlledTokens[0];
            const actor = token?.actor;
            if (actor && token) {
                return { actor, token };
            }
        }
    } else {
        const actor = game.user.character;
        const tokens = actor?.getActiveTokens();
        const token = tokens?.length === 1 ? tokens[0] : null;
        if (actor && token) {
            return { actor, token };
        }
    }

    ui.notifications.warn("You must have a single character selected.");
    return { actor: null, token: null };
}

/**
 * Build the options to select an aura to update
 */
function buildAuraEffectOptions(auraEffects) {
    let options = ``;
    for (let aura of auraEffects) {
        const currentRadius = aura.rules
            .map(rule => rule.data)
            .find(rule => rule.key === "Aura")
            .radius;
        options += `<option value="${aura.id}">${aura.name} (${currentRadius} ft.)</option>`;
    }
    return options;
}

function applyChanges($html, auraEffects) {
    const auraId = $html.find(`[name="auraId"]`).val();
    const radius = Number($html.find(`[name="radius"]`).val());

    if (!(radius > 0 && radius % 5 === 0)) {
        ui.notifications.error("The aura's radius must be a positive multiple of 5 ft.");
        return;
    }

    const auraEffect = auraEffects.find(effect => effect.id === auraId);
    if (!auraEffect) {
        ui.notifications.error("Aura not found.");
        return;
    }

    const auraRule = auraEffect.data.data.rules.find(rule => rule.key === "Aura");
    if (!auraRule) {
        ui.notifications.error("Aura rule not found.");
        return;
    }

    auraRule.radius = radius;
    auraEffect.update({ "data.rules": auraEffect.data.data.rules });
}


const { actor, token } = getControlledActorAndToken();
if (!(actor && token)) {
    return;
}

const auraEffects = actor.itemTypes.effect.filter(effect =>
    effect.rules.find(rule => rule.data.key === "Aura")
);

if (!auraEffects.length) {
    ui.notifications.warn(`${token.name} has no aura effects.`);
    return;
}

new Dialog(
    {
        title: "Update Aura Radius",
        content: `
            <form>
                <div class="form-group">
                    <label>Aura:</label>
                    <select id="auraId" name="auraId">
                        ${buildAuraEffectOptions(auraEffects)}
                    </select>
                </div>
            </form>
            <form>
                <div class="form-group">
                    <label>Radius (ft.)</label>
                    <input type="number" id="radius" name="radius" title="The new radius for the aura. This must be a positive multiple of 5 ft."/>
                </div>
            </form>       
        `,
        buttons: {
            one: {
                icon: '<i class="fas fa-check"></i>',
                label: "Update",
                callback: ($html) => applyChanges($html, auraEffects)
            },
            two: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        }
    }
).render(true);
