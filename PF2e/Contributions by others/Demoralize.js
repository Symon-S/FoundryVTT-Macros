/*
Demoralize
This macro will make an intimidation check vs the target.


This Macro works just like the system's Demoralize macro, except for the following additions:
* Check if the target is immune
* Check the 30ft range limit
* Option to use Intimidating Glare or to select a language
* Uses base system action with modified traits and predicates
* Option to apply Frightened and Demoralize immnunity
* Support for Intimidating Glare-like abilities

Current known limitations or regressions
* Only 1 target can be selected
* Doesn't automatically apply non-standard effects (like Terrified Retreat)

original implementation by darkium
rework by kromko

// jQuery handling was based on the example in Community wiki
// https://foundryvtt.wiki/en/development/api/dialog#fruitpromptjs

*/

/**
* Wrapper for the DSN Hook. It will only use the hook if the non-buggy setting is not enabled.
*
* @param {Promise<Object>} rollPromise Promise of roll results
*/
function dsnHook(rollPromise) {
    
    if (game.modules.get("dice-so-nice")?.active){
        return rollPromise.then(async results=> {
            await Promise.all(results.map(r=> game.dice3d.waitFor3DAnimationByMessageID(r.message.id)));
            return results;
        });
    } else {
        rollPromise;
    }
  }


if (canvas.tokens.controlled.length !== 1){
    return ui.notifications.warn('You need to select exactly one token to perform Demoralize.');
} else if (game.user.targets.size != 1){
    return ui.notifications.warn(`You must target one token.`);
}
const actor = _token.actor;
const target = game.user.targets.first();

const respectHiddenNames = !game.settings.get("pf2e", "metagame_tokenSetsNameVisibility");
const hideActorName = respectHiddenNames && !_token.document.playersCanSeeName;
const hideTargetName = respectHiddenNames && !target.document.playersCanSeeName;
const actorName = !hideActorName ? _token.name : 'Unknown';
const targetName = !hideTargetName ? target.name : 'Unknown';

const actorChatName = !hideActorName ? actorName : `Unknown <span data-visibility="gm">(${_token.name})</span>`;
const targetChatName = !hideTargetName ? targetName : `Unknown <span data-visibility="gm">(${target.name})</span>`;

// check if the target has immunity
if (target.actor.itemTypes.effect.some(e=> e.slug === 'demoralize-immunity' && e.flags?.demoralize?.source === actor.id)) 
    return ui.notifications.warn(`${targetName} is currently immune to Demoralize by ${actorName}`);

// check if the target is close enough
// expects distance in ft
if (token.distanceTo(target) > 30)
        return ui.notifications.warn(`${targetName} is too far.`);
const itemsLikeIntimidatingGlare = ['intimidating-glare', 'dark-fields-kitsune', 'elemental-embellish', 'frilled-lizardfolk'];
const intimidatingGlare = _token.actor.items.find((item) => itemsLikeIntimidatingGlare.includes(item.slug));

let languages = actor.system.details.languages.value
    .map(l => ({id:l, name:game.i18n.localize(`PF2E.Actor.Creature.Language.${l}`)}));
languages.sort((a,b) => a.name.localeCompare(b.name));

let selectedMode = await new Promise(resolve => {
    let content = `<form><table>`;
    if(intimidatingGlare){
        content +=`
        <tr><td><label for="useGlare">${intimidatingGlare.name}</label></td>
        <td><input type="checkbox" name="useGlare" checked /></td></tr>`;
    }
    content += `<tr><td><label for="selectLanguage">Select Language</label></td>
          <td><select name="selectLanguage" ${intimidatingGlare ? "disabled" : ""}>`;

    for (let i = 0; i < languages.length; i++){
      content += `
      <option value="${languages[i].id}" ${languages[i].id == 'common' ? ' selected' : ''}>${languages[i].name}</option>`
    };

    content += `
          </select></td></tr></table>
        </form>`;

    const handleCheckbox = (event) => {
        const targetElement = event.currentTarget;
        const checked = targetElement.checked;
        const formElement = $(targetElement).parents('form');

        const selectLanguage = formElement?.find('[name="selectLanguage"]');
        selectLanguage.prop( "disabled", checked );
    }
    new Dialog({
        title: `How would you like to demoralize ${targetName}?`,
        content: content,
        buttons: {
            Select: {
                label: 'BOO!', 
                callback: (html) => {
                    let result = html.find('[name="useGlare"]')[0]?.checked ? 
                    ({mode:'visual'}) : ({mode:'auditory', lang:html.find('[name="selectLanguage"]').val()});
                    resolve(result)
                    }
                }
            },
            render: (html) => html.on('change', 'input[type="checkbox"]', handleCheckbox),close: () => resolve(undefined)
        }
    ).render(true)
});


if(!selectedMode)
    return ui.notifications.error('Demoralization was interrupted');

// We make a variant action.
const baseAction = game.pf2e.actions.get('demoralize');
let action;

let flavor = '';

if(selectedMode.mode == 'visual'){
    action = baseAction.toActionVariant({
        traits: [...baseAction.traits.filter(t=> t!='auditory'), 'visual'],
        modifiers: baseAction.modifiers.filter(m=> !m.label.includes("Unintelligible"))
    });
    flavor = `${actorChatName} tries to demoralize ${targetChatName} with ${intimidatingGlare.name}.`;
} else {
    if (!target.actor.system.details.languages.value.includes(selectedMode.lang)){
        action = baseAction.toActionVariant({
            rollOptions: [...baseAction.rollOptions, 'action:demoralize:unintelligible']
        });
        flavor = `${actorChatName} tries to demoralize ${targetChatName} in ${languages.find(l=>l.id == selectedMode.lang).name}, which they don't speak.`;
    } else {
        action = baseAction.toActionVariant();
        flavor = `${actorChatName} tries to demoralize ${targetChatName} in ${languages.find(l=>l.id == selectedMode.lang).name}, which they speak.`;
    }
}
let results = await dsnHook( action.use({actor: actor})).then(r=> r?.[0]);

console.log(results);

flavor += `<br>${targetChatName} has temporary immunity to Demoralize action by ${actorChatName}.`;

if (game.modules.get('xdy-pf2e-workbench')?.active) { 
    // Extract the Macro ID from the asynomous benefactor macro compendium.
    const macroName = `Demoralize Immunity CD`;
    const macroId = (await game.packs.get('xdy-pf2e-workbench.asymonous-benefactor-macros')).index.find(n => n.name === macroName)?._id;
    if(['success', 'criticalSuccess'].includes(results.outcome)){
        flavor += `<hr>@Compendium[xdy-pf2e-workbench.asymonous-benefactor-macros.${macroId}]{Click to apply Frightened and immunity}`;
    } else{
        flavor += `<hr>@Compendium[xdy-pf2e-workbench.asymonous-benefactor-macros.${macroId}]{Click to apply immunity}`;
    }
} else {
    ui.notifications.warn(`Workbench Module not active! Linking Immunity effect Macro not possible.`);
}

ChatMessage.create({
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    flavor: flavor,
    speaker: ChatMessage.getSpeaker(),
    flags: {demoralize:{
        sourceTokenId:_token.id,
        sourceName: actorName,
        targetTokenId:target.id,
        targetName: targetName,
        degreeOfSuccess: results.outcome
    }}
});

