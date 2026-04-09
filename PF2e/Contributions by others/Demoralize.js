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
* Support for Intimidating Prowess

original implementation by darkium
rework by kromko 
and freeze2689 (appV2 rewrite)
*/

const system = game.system.id;

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
                if (r.message.getFlag(system, "context.options").includes("substitute:assurance"))
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
function handleChecks(html){
  const glare = html.querySelector("[name=useVisual]");
  if(!glare) return;
  glare.addEventListener("change",(ev)=>{
    html.querySelector("[name=lang]").disabled = ev.target.checked
  })
}
function isImmune(actor, trait){
    return actor.system.attributes.immunities.some(i => i.type === trait);
}

if (canvas.tokens.controlled.length != 1){
    return ui.notifications.warn("You need to select exactly one token to perform Demoralize.");
}
function createContent(){
  let content = "";
  if(performanceDemoralizeFeat) content += foundry.applications.fields.createFormGroup({
    label: "Use Performance?",
    hint: `Option available because of ${performanceDemoralizeFeat.name} feat.`,
    rootId: "xdy-pf2e-workbench-macros-demoralize-use-performance",
    input: foundry.applications.fields.createCheckboxInput({
      value: true,
      name: "usePerformance"
    })
  }).outerHTML;
  if(visualIntimidationFeat) content += foundry.applications.fields.createFormGroup({
    label: "Visually Intimidate?",
    hint: `Option available because of ${visualIntimidationFeat.name} feat.`,
    rootId: "xdy-pf2e-workbench-macros-demoralize-use-visual",
    input: foundry.applications.fields.createCheckboxInput({
      value: true,
      name: "useVisual"
    })
  }).outerHTML;
  if(intimidatingProwessFeat) content += foundry.applications.fields.createFormGroup({
    label: "Physically Menaced?",
    hint: `Option available because of ${intimidatingProwessFeat.name} feat.`,
    rootId: "xdy-pf2e-workbench-macros-demoralize-use-prowess",
    input: foundry.applications.fields.createCheckboxInput({
      value: false,
      name: "useProwess"
    })
  }).outerHTML;
  content += foundry.applications.fields.createFormGroup({
    label: "Select Language",
    input: foundry.applications.fields.createSelectInput({
      options: languages,
      disabled: !!visualIntimidationFeat,
      name: "lang"
    })
  }).outerHTML;
  return content;
}

// Ignoring Reach for the Sky / Tut-Tu / Beast Dynamo Howl / Deimatic Display as they use a single check for all targets
const multitargetFeats = ["dazzling-display", "frightening-appearance", "terrifying-howl", "flash-your-badge", "terrible-transformation", "menacing-prowess", "terrifying-transformation"];
const demoralizeMultitarget = token.actor.items.find(item => multitargetFeats.includes(item.slug));

if (game.user.targets.size == 0){
    return ui.notifications.warn("You must target at least one token.");
}
else if (game.user.targets.size > 1 && !demoralizeMultitarget){
    return ui.notifications.warn(`You don't have an ability that lets you target more than one token, or the macro doesn't recognize it`);
}

const actor = token.actor;
const targets = game.user.targets;

const respectHiddenNames = game.settings.get(system, "metagame_tokenSetsNameVisibility");
const hideActorName = respectHiddenNames && !token.document.playersCanSeeName;
const actorName = !hideActorName ? token.name : "Unknown";

const actorChatName = !hideActorName ? actorName : `Unknown <span data-visibility="gm">(${token.name})</span>`;

const visualIntimidationFeatSlugs = ["intimidating-glare", "dark-fields-kitsune", "elemental-embellish", "frilled-lizardfolk", "intimidating-prowess"];
const visualIntimidationFeat = token.actor.items.find(item => visualIntimidationFeatSlugs.includes(item.slug));

const performanceDemoralizeFeatSlugs = ["versatile-performance", "fancy-moves"];
const performanceDemoralizeFeat = token.actor.items.find(item => performanceDemoralizeFeatSlugs.includes(item.slug));

const likeIntimidatingProwessSlug = ["intimidating-prowess"];
const intimidatingProwessFeat = token.actor.items.find(item => likeIntimidatingProwessSlug.includes(item.slug));

const languages = actor.system.details.languages.value
    .map(l => ({value:l, label: game.i18n.localize(`PF2E.Actor.Creature.Language.${l}`), selected: l === "common"})).sort((a,b) => a.label.localeCompare(b.label));

const response = await foundry.applications.api.Dialog.wait({
  window: {title: "How would you like to demoralize your targets?"},
  content: createContent() + `<br/><p class="hint">Shift Click Button to Fast Forward the roll(s)</p>`,
  buttons: [{
    label: "Boo!",
    action: "demoralize",
    callback: (event, button) => {
      return {event, ...new foundry.applications.ux.FormDataExtended(button.form).object}
    }
  }],
  position:{width: 450},
  render: (_event, app) => handleChecks(app.element)
});
if(!response) return;

const baseAction = game.pf2e.actions.get("demoralize");
let actionOptions = {traits:baseAction.traits, modifiers:baseAction.modifiers, statistic: response.usePerformance ? 'performance' : 'intimidation'};
if(response.useVisual){
  actionOptions.traits = [...actionOptions.traits.filter(t=> t!='auditory'), 'visual'];
    actionOptions.modifiers = actionOptions.modifiers.filter(m=> !m.label.includes("Unintelligible"));
  if(response.useProwess) {
    const prowessBonus = (token.actor.skills.intimidation.rank >= 3 && token.actor.abilities.str.mod >= 5) ? 2 : 1
  const prowessModifier = new game.pf2e.Modifier("Inimidating Prowess", prowessBonus, "circumstance", true, false);
    actionOptions.modifiers.push(prowessModifier);
  }
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
    if(target.distanceTo(token) > 30){
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
    let flavor = "";
    if(response.useVisual){
        action = baseAction.toActionVariant({
            traits: actionOptions.traits,
            modifiers: actionOptions.modifiers,
            statistic: actionOptions.statistic
        });
    } else {
        if (!target.actor.system.details.languages.value.includes(response.lang)){
            action = baseAction.toActionVariant({
                rollOptions: [...baseAction.rollOptions, 'action:demoralize:unintelligible'],
                statistic: actionOptions.statistic
            });
            flavor = " (doesn't speak the language)";
        } else {
            action = baseAction.toActionVariant({statistic: actionOptions.statistic});
            flavor = " (speaks the language)";
        }
    }
    return dsnHook(action.use({event: response.event, actor, target})).then(r => ({
        ...baseResult,
        outcome: r?.[0].outcome,
        flavor: `${targetChatName}: ${game.i18n.localize(`PF2E.Check.Result.Degree.Check.${r?.[0].outcome}`)}${flavor}`
    }));
})

rollResults = await Promise.all(rollResults);

let summary = '';
if(rollResults.length == 1){
    summary = response.useVisual ?
        `${actorChatName} tries to demoralize ${rollResults[0].targetChatName} with ${visualIntimidationFeat.name}.` :
        `${actorChatName} tries to demoralize ${rollResults[0].targetChatName} in ${languages.find(l=>l.value == response.lang).label}.`;
    summary += `<hr>${rollResults[0].flavor.split(': ').pop()}`
} else {
    summary = response.useVisual ?
    `${actorChatName} tries to demoralize targets with ${visualIntimidationFeat.name}.` :
    `${actorChatName} tries to demoralize targets in ${languages.find(l=>l.value == response.lang).label}.`;
    summary += '<hr>';
    summary += rollResults.map(r=>r.flavor).join('<br>');
}
if (game.modules.get('xdy-pf2e-workbench')?.active) {
    // Extract the Macro ID from the asynomous benefactor macro compendium.
    const macroName = `Demoralize Immunity CD`;
    const macroId = (await game.packs.get('xdy-pf2e-workbench.asymonous-benefactor-macros')).index.find(n => n.name === macroName)?._id;
    summary += `<hr>@Compendium[xdy-pf2e-workbench.asymonous-benefactor-macros.${macroId}]{Click to apply effects and immunity}`;
} else {
    summary += `<hr>Workbench Module not active! Effects have to be applied manually.`;
}

ChatMessage.create({
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    content: summary,
    speaker: ChatMessage.getSpeaker(),
    flags: {demoralize:{
        sourceTokenId:token.id,
        sourceName: actorName,
        results: rollResults.map(r => ({
            outcome:r.outcome,
            targetTokenId:r.targetTokenId,
            targetName:r.targetName
        })),
    }}
});
