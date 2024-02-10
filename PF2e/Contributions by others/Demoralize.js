/*
Demoralize
This macro will make an intimidation check vs the target.


This Macro works just like the system's Demoralize macro, except for the following additions:
* Checks if the target is temporarily immune
* Checks if the target is immune to any traits
* Checks the 30ft range limit
* Option to use Intimidating Glare or to select a language
* Uses base system action with modified traits and predicates
* Option to apply Frightened and Demoralize immunity
* Support for Intimidating Glare-like abilities

original implementation by darkium
rework by kromko

// jQuery handling was based on the example in Community wiki
// https://foundryvtt.wiki/en/development/api/dialog#fruitpromptjs

*/

/**
* Wrapper for the DSN Hook. If DSN is enabled, waits for the physical dice to stop rolling (unless the roll has assurance) 
*
* @param {Promise<Object>} rollPromise Promise of roll results
*/
function dsnHook(rollPromise) {
    if (game.modules.get("dice-so-nice")?.active){
        return rollPromise.then(async results=> {
            await Promise.all(results.map(r=> {
                // Check if we are using assurance
                if (r.message.getFlag('pf2e', 'context.options').includes('substitute:assurance'))
                    return Promise.resolve(true);
                return game.dice3d.waitFor3DAnimationByMessageID(r.message.id);
                }
            ));
            return results;
        });
    } else {
        return rollPromise;
    }
}
 
function isImmune(actor, trait){
    return actor.system.attributes.immunities.some(i => i.type === trait);
}

if (canvas.tokens.controlled.length != 1){
    return ui.notifications.warn('You need to select exactly one token to perform Demoralize.');
}

// Ignoring Reach for the Sky / Tut-Tu / Beast Dynamo Howl / Deimatic Display as they use a single check for all targets
const multitargetFeats = ['dazzling-display', 'frightening-appearance', 'terrifying-howl', 'flash-your-badge', 'terrible-transformation', 'menacing-prowess'];
const demoralizeMultitarget = _token.actor.items.find(item => multitargetFeats.includes(item.slug));

if (game.user.targets.size == 0){
    return ui.notifications.warn('You must target at least one token.');
} 
else if (game.user.targets.size > 1 && !demoralizeMultitarget){
    return ui.notifications.warn('You don\'t have an ability that lets you target more than one token, or the macro doesn\'t recognize it');
}
const actor = _token.actor;
const targets = game.user.targets;

const respectHiddenNames = !game.settings.get("pf2e", "metagame_tokenSetsNameVisibility");
const hideActorName = respectHiddenNames && !_token.document.playersCanSeeName;
const actorName = !hideActorName ? _token.name : 'Unknown';

const actorChatName = !hideActorName ? actorName : `Unknown <span data-visibility="gm">(${_token.name})</span>`;

const likeIntimidatingGlare = ['intimidating-glare', 'dark-fields-kitsune', 'elemental-embellish', 'frilled-lizardfolk'];
const intimidatingGlare = _token.actor.items.find(item => likeIntimidatingGlare.includes(item.slug));

const likeVersatilePerformance = ['versatile-performance', 'fancy-moves'];
const versatilePerformance = _token.actor.items.find(item => likeVersatilePerformance.includes(item.slug));

let languages = actor.system.details.languages.value
    .map(l => ({id:l, name:game.i18n.localize(`PF2E.Actor.Creature.Language.${l}`)}));
languages.sort((a,b) => a.name.localeCompare(b.name));

let selectedMode = await new Promise(resolve => {
    let content = `<form><table>`;
    if(versatilePerformance){
        content +=`
        <tr><td><label for="usePerformance">${versatilePerformance.name}</label></td>
        <td><input type="checkbox" name="usePerformance" checked /></td></tr>`;
    }
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
        title: `How would you like to demoralize your targets?`,
        content: content,
        buttons: {
            Select: {
                label: 'Boo!', 
                callback: (html) => {
                    let skill = html.find('[name="usePerformance"]')?.[0]?.checked ? 'performance' : 'intimidation';
                    let result = html.find('[name="useGlare"]')[0]?.checked ? 
                    ({mode:'visual', skill}) : ({mode:'auditory', skill, lang:html.find('[name="selectLanguage"]').val(), });
                    resolve(result)
                    }
                }
            },
            render: (html) => html.on('change', 'input[type="checkbox"]', handleCheckbox),close: () => resolve(undefined)
        }
    ).render(true)
});

if(!selectedMode)
    return ui.notifications.warn('Demoralize was interrupted');

const baseAction = game.pf2e.actions.get('demoralize');
// prepare traits and modifiers
let actionOptions = {traits:baseAction.traits, modifiers:baseAction.modifiers, statistic: selectedMode.skill};
;
if(selectedMode.mode == 'visual'){
    actionOptions.traits = [...actionOptions.traits.filter(t=> t!='auditory'), 'visual'];
    actionOptions.modifiers = actionOptions.modifiers.filter(m=> !m.label.includes("Unintelligible"));
}

let rollResults = targets.map(target =>{
    const hideTargetName = respectHiddenNames && !target.document.playersCanSeeName;
    const targetName = !hideTargetName ? target.name : 'Unknown';
    const targetChatName = !hideTargetName ? targetName : `Unknown <span data-visibility="gm">(${target.name})</span>`;

    let baseResult = {
        targetTokenId: target.id,
        targetName: targetName,
        targetChatName: targetChatName
    }

    // check for demoralize cooldown
    let cooldown = target.actor.itemTypes.effect.find(e=> e.slug === 'demoralize-immunity' && e.flags?.demoralize?.source === actor.id)
    if(cooldown){
        return new Promise(resolve => resolve({
            ...baseResult,
            outcome: 'invalid',
            flavor: `${targetChatName}: Immune (${cooldown.system.remaining ?? 'temporary'})`
        }));
    }

    // check for target distance
    if(target.distanceTo(_token) > 30){
        return new Promise(resolve => resolve({
            ...baseResult,
            outcome: 'invalid',
            flavor: `${targetChatName}: Too far`
        }));
    }

    // Check for trait immunity
    let immunity = actionOptions.traits.find(trait => isImmune(target.actor, trait));
    if(immunity){
        return new Promise(resolve => resolve({
            ...baseResult,
            outcome: 'immune',
            flavor: `${targetChatName}: Immune to <div class="tags" style="display:inline;"><div class="tag">${game.i18n.localize(`PF2E.Trait${immunity[0].toUpperCase()+immunity.slice(1)}`)}</div></div>.`
        }));
    }

    // We make a variant action.
    let action;
    if(selectedMode.mode == 'visual'){
        action = baseAction.toActionVariant({
            traits: actionOptions.traits,
            modifiers: actionOptions.modifiers,
            statistic: actionOptions.statistic
        });
        return dsnHook( action.use({actor: actor, target:target})).then(r=> ({
            ...baseResult,
            outcome:r?.[0].outcome,
            flavor: `${targetChatName}: ${game.i18n.localize(`PF2E.Check.Result.Degree.Check.${r?.[0].outcome}`)}`
        }));
        
    } else {
        if (!target.actor.system.details.languages.value.includes(selectedMode.lang)){
            action = baseAction.toActionVariant({
                rollOptions: [...baseAction.rollOptions, 'action:demoralize:unintelligible'],
                statistic: actionOptions.statistic
            }); 
            return dsnHook( action.use({actor: actor, target:target})).then(r=> ({
                ...baseResult,
                outcome:r?.[0].outcome,
                flavor: `${targetChatName}: ${game.i18n.localize(`PF2E.Check.Result.Degree.Check.${r?.[0].outcome}`)} (doesn't speak the language)`
            }));
        } else {
            action = baseAction.toActionVariant({statistic: actionOptions.statistic});
            return dsnHook( action.use({actor: actor, target:target})).then(r=> ({
                ...baseResult,
                outcome:r?.[0].outcome,
                flavor: `${targetChatName}: ${game.i18n.localize(`PF2E.Check.Result.Degree.Check.${r?.[0].outcome}`)} (speaks the language)`
            }));
        }
    }
})

rollResults = await Promise.all(rollResults);

let summary = '';
if(rollResults.length == 1){
    summary = selectedMode.mode === 'visual' ?
        `${actorChatName} tries to demoralize ${rollResults[0].targetChatName} with ${intimidatingGlare.name}.` :
        `${actorChatName} tries to demoralize ${rollResults[0].targetChatName} in ${languages.find(l=>l.id == selectedMode.lang).name}.`;
    summary += `<hr>${rollResults[0].flavor.split(': ').pop()}`
} else {
    summary = selectedMode.mode === 'visual' ?
    `${actorChatName} tries to demoralize targets with ${intimidatingGlare.name}.` :
    `${actorChatName} tries to demoralize targets in ${languages.find(l=>l.id == selectedMode.lang).name}.`;
    summary += '<hr>';
    summary += rollResults.map(r=>r.flavor).join('<br>');
}
if (game.modules.get('xdy-pf2e-workbench')?.active) { 
    // Extract the Macro ID from the asynomous benefactor macro compendium.
    const macroName = `Demoralize Immunity CD`;
    const macroId = (await game.packs.get('xdy-pf2e-workbench.asymonous-benefactor-macros')).index.find(n => n.name === macroName)?._id;
    summary += `<hr>@Compendium[xdy-pf2e-workbench.asymonous-benefactor-macros.${macroId}]{Click to apply effects and immunity}`;
} else {
    summary += `<hr>Workbench Module not active! Effects have to be applies manually.`;
}

ChatMessage.create({
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    content: summary,
    speaker: ChatMessage.getSpeaker(),
    flags: {demoralize:{
        sourceTokenId:_token.id,
        sourceName: actorName,
        results: rollResults.map(r => ({
            outcome:r.outcome, 
            targetTokenId:r.targetTokenId, 
            targetName:r.targetName
        })),
    }}
});
