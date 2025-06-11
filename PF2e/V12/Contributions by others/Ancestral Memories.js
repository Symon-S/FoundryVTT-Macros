/* Based on a macro by Author: ArthurTrumpet and Symon S.
created by darkim

Ancestral Memories Macro
 This Macro gives you an easy way to add a new Ancestral Memories effect for a chosen skill to actors.
 Choose the desired skill and it will be applied to the selected actor.
*/

if (canvas.tokens.controlled.length !== 1){
  ui.notifications.warn('You need to select exactly one token to cast Ancestral Memories.');
} else 
{

const effect = {
    type: 'effect',
    name: 'Ancestral Memories',
    img: 'systems/pf2e/icons/spells/ancestral-memories.webp',
    system: {
      tokenIcon: {
          show: true
      },       
      duration: {
          value: 1,
          unit: 'minutes',
          sustained: false,
          expiry: 'turn-start'
      },
      rules: [
        {
            key: 'ActiveEffectLike',
            mode: 'override',
            path: 'system.skills.acr.rank',
            value: {
                brackets: [
                    {
                        end: 10,
                        start: 1,
                        value: 1,
                    },
                    {
                        start: 11,
                        value: 2,
                    },
                ],
            },
            slug: null,
            priority: 100,
            ignored: false,
            predicate: [],
            phase: 'applyAEs',
        },
      ],
    },
  };

const SKILL_OPTIONS = [
  {value: "acr", name: "Acrobatics"},
  {value: "arc", name: "Arcana"},
  {value: "ath", name: "Athletics"},
  {value: "cra", name: "Crafting"},
  {value: "dec", name: "Deception"},
  {value: "dip", name: "Diplomacy"},
  {value: "itm", name: "Intimidation"},
  {value: "med", name: "Medicine"},
  {value: "nat", name: "Nature"},
  {value: "occ", name: "Occultism"},
  {value: "prf", name: "Performance"},
  {value: "rel", name: "Religion"},
  {value: "soc", name: "Society"},
  {value: "ste", name: "Stealth"},
  {value: "sur", name: "Survival"},
  {value: "thi", name: "Thievery"},
];

countdownEffect();

function countdownEffect() {

  let skills = '';
  SKILL_OPTIONS.forEach(u => { skills += `<option value="${u.value}">${u.name}</option>`; });
  let template = `
  <p>
    Select a skill to gain proficiency in: <select id="selected_skill">${skills}</select>
  </p>
  `;

  new Dialog({
    title: "Ancestral Memories",
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

    const skill = html.find("#selected_skill")[0].value;
    let selected_skill = SKILL_OPTIONS.filter(result => {
      return result.value === skill;
    })[0];
    effect.name = effect.name + " (" + selected_skill.name + ")";

    effect.system.rules[0].path = "system.skills." + skill + ".rank";

    await token.actor.createEmbeddedDocuments("Item", [effect]);
}
}