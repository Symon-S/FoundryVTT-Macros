/*
Contributed by Mark Pearce.
This Macro is an easy way to use Skill Actions.
Simply choose your Skill and the associated Action.
*/

// dialog constructor
class SkillActionDialog extends Dialog {
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      height: "auto",
    };
  }

  activateListeners($html) {
    super.activateListeners($html);
    const $app = $html.closest(".window-app.dialog");
    let $content = $app.children(".window-content");
    const $buttons = $content.children(".dialog-buttons");
  }
}

// start of macro
const standardSkills = [
  "acrobatics",
  "arcana",
  "athletics",
  "crafting",
  "deception",
  "diplomacy",
  "intimidation",
  "medicine",
  "nature",
  "occultism",
  "performance",
  "religion",
  "society",
  "stealth",
  "survival",
  "thievery"
]

// get token and actor
const actors = canvas.tokens.controlled
  .flatMap((token) => (token.actor ? token.actor : []))
  .filter((actor) => actor.isOwner)
  .filter((actor) => actor.type == "character" || actor.type == "npc");

if (actors.length === 0 && game.user.character) {
  actors.push(game.user.character);
}

// do nothing if we couldn't find the player's character
if (actors.length === 0) {
  new Dialog({
    title: `Problem with auto-detection`,
    content: `Unfortunately, this macro wasn't able to automatically detect which token is yours.<br/><br/>Please manually select your token and try again.`,
    buttons: {}
  }).render(true);
  return; // this is illegal, but I don't know how else to make processing stop
}

// simplify, make global
const actor = actors[0];

let selectedToken = token;
// let tokenSkills = token.actor.data.data.skills;
let tokenSkills = actor.skills;
let SelectedActor = selectedToken.actor;
let selectedActorFeats = Array.from(SelectedActor.items).filter(
  (item) => item.type === "feat"
);

// lore variables
let tokenSkillKeys = Object.keys(tokenSkills);
let loreKeys = [];
let loreListForHTML = [];
let selectedLore = "";

tokenSkillKeys.forEach((skillKey) => {
  if (!standardSkills.includes(skillKey)) {
    loreKeys.push(skillKey);
  }
});

// make lore dialog
selectedLore = loreKeys[0];
loreKeys.forEach((lore) => {
  loreListForHTML.push(
    `<option value="${lore}">${tokenSkills[lore].label}</option>`
  );
});

let loreContent = `<form name="select lore">
      <div class="form-group">
        <label>Action:</label>
        <select name="lore-selector">${loreListForHTML}</select>
      </div>
    </form>`;

let loreDialog = new SkillActionDialog({
  title: "Lore selector",
  content: loreContent,
  buttons: {
    performAction: {
      label: "Select lore",
      callback: () => unspecifiedActivity(selectedLore, true),
    },
    cancel: {
      label: "Cancel",
    },
  },
  default: "cancel",
  render: ([loreContent]) => {
    loreContent
      .querySelector("[name=lore-selector]")
      .addEventListener("change", changeLore);
  },
}).render(false);

// skill data model
const skillActionDirectory = getSkillActionDirectory();

// Make skill list
let skillList = [];
skillActionDirectory.forEach((skill) => {
  skillList.push(skill.skillName);
});
const skillListForHTML = []; // array of skills formatted for HTML options - one gets tagged as selected = "selected"

// default selection values
let selectedSkill = skillList[0];
let selectedAction = skillActionDirectory[0].actions[0].actionName;

// initialize skill strings for HTML
let skillsTextForHTML = "";
let actionsTextForHTML = "";
updateSkills();

// initialize actions for skill
let actionList = [];
let actionListForHTML = [];
updateActions();

let dialogContent = `<form name="skill-action-dialog">
    <div class="form-group">
        <label>Skill:</label>
        <select name="skill-selector">${skillsTextForHTML}</select>
    </div>
     <div class="form-group">
        <label>Action:</label>
        <select name="action-selector">${actionsTextForHTML}</select>
    </div>
</form>`;

// create the actions dialog
let actionsDialog = new SkillActionDialog({
  title: "Action Selector",
  content: dialogContent,
  buttons: {
    performAction: {
      label: "Use Action",
      callback: () => performAction(),
    },
    cancel: {
      label: "Cancel",
    },
  },
  default: "cancel",
  render: ([dialogContent]) => {
    dialogContent
      .querySelector("[name=skill-selector]")
      .addEventListener("change", changeSkill);
    dialogContent
      .querySelector("[name=action-selector]")
      .addEventListener("change", changeAction);
  },
}).render(true);

// end of macro - functions are below

function updateSkills() {
  skillListForHTML.splice(0, skillListForHTML.length); // clear skill list for HTML
  skillActionDirectory.forEach((skill) => {
    if (skill.skillName !== selectedSkill) {
      skillListForHTML.push(
        `<option value="${skill.skillName}">${skill.skillName}</option>`
      );
    } else {
      skillListForHTML.push(
        `<option value="${skill.skillName}" selected = "selected">${skill.skillName}</option>`
      );
    }
    skillsTextForHTML = skillListForHTML.toString();
  });
}

function updateActions() {
  // empty action arrays
  actionList.splice(0, actionList.length);
  actionListForHTML.splice(0, actionListForHTML.length);
  // get actions from selected skill
  actionList = [
    ...skillActionDirectory[skillList.indexOf(selectedSkill)].actions,
  ];
  // build html version;
  actionList
    .filter(
      (x) =>
        !x.prerequisite ||
        selectedActorFeats.map((x) => x.data.data.slug).includes(x.prerequisite)
    )
    .sort((a, b) =>
      a.actionName > b.actionName ? 1 : b.actionName > a.actionName ? -1 : 0
    )
    .forEach((action) => {
      let costString = "";
      if (action.actionCost != null) {
        costString = " (" + action.actionCost.toString() + ")";
      }
      if (action.actionName !== selectedAction) {
        actionListForHTML.push(
          `<option value="${action.actionName}">${action.actionName + costString
          }</option>`
        );
      } else {
        actionListForHTML.push(
          `<option value="${action.actionName}" selected = "selected">${action.actionName + costString
          }</option>`
        );
      }
    });
  actionsTextForHTML = actionListForHTML.toString();
}

function changeSkill(event) {
  let selectElement = event.target;
  selectedSkill = selectElement.value;
  selectedAction =
    skillActionDirectory[skillList.indexOf(selectedSkill)].actions[0]
      .actionName;
  updateSkills();
  updateActions();
  updateDialogContent();
}

function changeAction(event) {
  let selectElement = event.target;
  selectedAction = selectElement.value;
  updateActions();
  updateDialogContent();
}

function updateDialogContent() {
  $("select[name='action-selector']").empty();
  $("select[name='action-selector']").append(actionsTextForHTML);
  $("select[name='skill-selector']").empty();
  $("select[name='skill-selector']").append(skillsTextForHTML);
}

function performAction() {
  let pActionsFromSkill =
    skillActionDirectory[skillList.indexOf(selectedSkill)].actions;
  pActionsFromSkill.forEach((action) => {
    if (action.actionName === selectedAction) {
      action.command();
    }
  });
}

function coreAction(whatAction, skill = "") {
  let actionProperties = { event: event }
  if (skill.length > 0) {
    actionProperties["skill"] = skill;
  }
  game.pf2e.actions[whatAction](actionProperties);
}

function loreSkill(whatAction) {
  if (loreKeys.length < 1) {
    return ui.notifications.error("Selected token does not have a lore skill");
  }

  if (loreKeys.length > 0) {
    loreDialog.render(true);
  }
}

function changeLore(event) {
  let selectElement = event.target;
  selectedLore = selectElement.value;
}

function createADiversion(whatVariant) {
  game.pf2e.actions.createADiversion({ event: event, variant: whatVariant });
}

function treatWounds() {
  async function _executeMacroByName(name) {
    let pack = game.packs.get("pf2e.pf2e-macros");
    pack.getIndex().then((index) => {
      let id = index.find((e) => e.name === name)?._id;
      if (id) pack.getDocument(id).then((e) => e.execute());
    });
  }
  _executeMacroByName("Treat Wounds");
}

function earnIncome() {
  async function _executeMacroByName(name) {
    let pack = game.packs.get("pf2e.pf2e-macros");
    pack.getIndex().then((index) => {
      let id = index.find((e) => e.name === name)?._id;
      if (id) pack.getDocument(id).then((e) => e.execute());
    });
  }
  _executeMacroByName("Earn Income");
}

function unspecifiedActivity(skillName, secret = false) {
  let _title = skillName.charAt(0).toUpperCase() + skillName.slice(1) + " Check"; // uppercase first letter
  let _skill;
  if (skillName == "perception") {
    _skill = actor.perception;
  } else {
    _skill = actor.skills[skillName];
  }
  let checkData = {
    actor,
    type: "skill-check",
    createMessage: true,
  }
  if (secret) {
    checkData["options"] = ["secret"];
  }
  game.pf2e.Check.roll(new game.pf2e.CheckModifier(_title, _skill), checkData);
}

// TODO use exsiting action macros
// game.macros.getName(``).execute();

// An array of skills and all of thier actions
function getSkillActionDirectory() {
  return [
    {
      skillName: "Acrobatics",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("acrobatics");
          }
        },
        {
          actionName: "Balance",
          actionType: "enc",
          proficiency: "trained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("balance");
          },
        },
        {
          actionName: "Tumble Through",
          actionType: "enc",
          proficiency: "trained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("tumbleThrough");
          },
        },
        {
          actionName: "Maneuver in Flight",
          actionType: "enc",
          proficiency: "trained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("maneuverInFlight");
          },
        },
        {
          actionName: "Squeeze",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("squeeze");
          },
        },
      ],
    },
    {
      skillName: "Arcana",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("arcana");
          }
        },
        {
          actionName: "Recall Knowledge, Arcana",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            unspecifiedActivity("arcana");
          },
        },
        {
          actionName: "Borrow an Arcane Spell",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("arcana");
          },
        },
        {
          actionName: "Decipher Writing",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("decipherWriting", "arcana");
          },
        },
        {
          actionName: "Identify Magic",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("arcana");
          },
        },
        {
          actionName: "Learn a Spell",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("arcana");
          },
        },
      ],
    },
    {
      skillName: "Athletics",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("athletics");
          }
        },
        {
          actionName: "Climb",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("climb");
          },
        },
        {
          actionName: "Force Open",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("forceOpen");
          },
        },
        {
          actionName: "Grapple",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("grapple");
          },
        },
        {
          actionName: "High Jump",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("highJump");
          },
        },
        {
          actionName: "Long Jump",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("longJump");
          },
        },
        {
          actionName: "Shove",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("shove");
          },
        },
        {
          actionName: "Swim",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("swim");
          },
        },
        {
          actionName: "Trip",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("trip");
          },
        },
        {
          actionName: "Disarm",
          actionType: "enc",
          proficiency: "trained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("disarm");
          },
        },
        {
          actionName: "Whirling Throw",
          actionType: "enc",
          proficiency: "trained",
          prerequisite: "whirling-throw",
          actionCost: 1,
          command: () => {
            coreAction("whirlingThrow");
          },
        },
      ],
    },
    {
      skillName: "Crafting",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("crafting");
          }
        },
        {
          actionName: "Recall Knowledge",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            unspecifiedActivity("crafting");
          },
        },
        {
          actionName: "Repair",
          actionType: "exp",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("repair");
          },
        },
        {
          actionName: "Craft",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("craft");
          },
        },
        {
          actionName: "Earn Income",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            earnIncome();
          },
        },
        {
          actionName: "Identify Alchemy",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("crafting");
          },
        },
      ],
    },
    {
      skillName: "Deception",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("deception");
          }
        },
        {
          actionName: "Create a Diversion: Words",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            createADiversion("distracting-words");
          },
        },
        {
          actionName: "Create a Diversion: Gesture",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            createADiversion("gesture");
          },
        },
        {
          actionName: "Create a Diversion: Trick",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            createADiversion("trick");
          },
        },
        {
          actionName: "Impersonate",
          actionType: "exp",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("impersonate");
          },
        },
        {
          actionName: "Lie",
          actionType: "exp",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("lie");
          },
        },
        {
          actionName: "Feint",
          actionType: "enc",
          proficiency: "trained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("feint");
          },
        },
      ],
    },
    {
      skillName: "Diplomacy",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("diplomacy");
          }
        },
        {
          actionName: "Gather Information",
          actionType: "exp",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("gatherInformation");
          },
        },
        {
          actionName: "Make an Impression",
          actionType: "exp",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("makeAnImpression");
          },
        },
        {
          actionName: "Request",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("request");
          },
        },
      ],
    },
    {
      skillName: "Intimidation",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("intimidation");
          }
        },
        {
          actionName: "Coerce",
          actionType: "exp",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("coerce");
          },
        },
        {
          actionName: "Demoralize",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("demoralize");
          },
        },
      ],
    },
    {
      skillName: "Lore",
      actions: [
        {
          actionName: "Recall Knowledge",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            loreSkill("recallKnowledge");
          },
        },
        {
          actionName: "Earn Income",
          actionType: "exp",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            earnIncome();
          },
        },
      ],
    },
    {
      skillName: "Medicine",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("medicine");
          }
        },
        {
          actionName: "Administer First Aid",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 2,
          command: () => {
            coreAction("administerFirstAid");
          },
        },
        {
          actionName: "Recall Knowledge",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            unspecifiedActivity("medicine");
          },
        },
        {
          actionName: "Treat Disease",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("treatDisease");
          },
        },
        {
          actionName: "Treat Poison",
          actionType: "enc",
          proficiency: "trained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("treatPoison");
          },
        },
        {
          actionName: "Treat Wounds",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            treatWounds();
          },
        },
      ],
    },
    {
      skillName: "Nature",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("nature");
          }
        },
        {
          actionName: "Command an Animal",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("commandAnAnimal");
          },
        },
        {
          actionName: "Recall Knowledge",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            unspecifiedActivity("nature");
          },
        },
        {
          actionName: "Identify Magic",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("nature");
          },
        },
        {
          actionName: "Learn a Spell",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("nature");
          },
        },
      ],
    },
    {
      skillName: "Occultism",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("occultism");
          }
        },
        {
          actionName: "Recall Knowledge",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            unspecifiedActivity("occultism");
          },
        },
        {
          actionName: "Decipher Writing",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("decipherWriting", "occultism");
          },
        },
        {
          actionName: "Identify Magic",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("occultism");
          },
        },
        {
          actionName: "Learn a Spell",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("occultism");
          },
        },
      ],
    },
    {
      skillName: "Performance",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("performance");
          }
        },
        {
          actionName: "Perform",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("perform");
          },
        },
        {
          actionName: "Earn Income",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            earnIncome();
          },
        },
      ],
    },
    {
      skillName: "Perception",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("perception", true);
          }
        },
        {
          actionName: "Seek",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("seek");
          },
        },
        {
          actionName: "Sense Motive",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("senseMotive");
          },
        },
      ],
    },
    {
      skillName: "Religion",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("religion");
          }
        },
        {
          actionName: "Recall Knowledge",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            unspecifiedActivity("religion");
          },
        },
        {
          actionName: "Decipher Writing",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("decipherWriting", "religion");
          },
        },
        {
          actionName: "Identify Magic",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("religion");
          },
        },
        {
          actionName: "Learn a Spell",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("religion");
          },
        },
      ],
    },
    {
      skillName: "Society",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("society");
          }
        },
        {
          actionName: "Recall Knowledge",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            unspecifiedActivity("society");
          },
        },
        {
          actionName: "Subsist",
          actionType: "exp",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("subsist", "society");
          },
        },
        {
          actionName: "Create Forgery",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("createForgery");
          },
        },
        {
          actionName: "Decipher Writing",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("decipherWriting");
          },
        },
      ],
    },
    {
      skillName: "Stealth",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("stealth");
          }
        },
        {
          actionName: "Conceal an Object",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("concealAnObject");
          },
        },
        {
          actionName: "Hide",
          actionType: "exp",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("hide");
          },
        },
        {
          actionName: "Sneak",
          actionType: "exp",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("sneak");
          },
        },
        {
          actionName: "Create Forgery",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("createForgery");
          },
        },
      ],
    },
    {
      skillName: "Survival",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("survival");
          }
        },
        {
          actionName: "Sense Direction",
          actionType: "exp",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("senseDirection");
          },
        },
        {
          actionName: "Subsist",
          actionType: "exp",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("subsist", "survival");
          },
        },
        {
          actionName: "Cover Tracks",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("sur");
          },
        },
        {
          actionName: "Track",
          actionType: "exp",
          proficiency: "trained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            coreAction("track");
          },
        },
      ],
    },
    {
      skillName: "Thievery",
      actions: [
        {
          actionName: "Unspecified",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            unspecifiedActivity("theivery");
          }
        },
        {
          actionName: "Palm an Object",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("palmAnObject");
          },
        },
        {
          actionName: "Steal",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("steal");
          },
        },
        {
          actionName: "Disable Device",
          actionType: "enc",
          proficiency: "trained",
          prerequisite: null,
          actionCost: 2,
          command: () => {
            coreAction("disableDevice");
          },
        },
        {
          actionName: "Pick a Lock",
          actionType: "enc",
          proficiency: "trained",
          prerequisite: null,
          actionCost: 2,
          command: () => {
            coreAction("pickALock");
          },
        },
      ],
    },
    { skillName: "-----Special Activities-----", actions: [{ actionName: "", command: () => { } }] },
    {
      skillName: "Escape",
      actions: [
        {
          actionName: "Escape",
          actionType: "enc",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: 1,
          command: () => {
            coreAction("escape");
          },
        },
      ]
    },
    {
      skillName: "Earn Income",
      actions: [
        {
          actionName: "Earn Income",
          actionType: "exp",
          proficiency: "untrained",
          prerequisite: null,
          actionCost: null,
          command: () => {
            earnIncome();
          },
        },
      ],
    },
  ];
}
