/*
Welcome to the Conditions Manager.
This macro was designed to have a window that can be minimized when not needed or opened whenever to manage conditions.
It is mostly intended for those who want an easy to read condition manager without the need for modules.
All conditions are toggled on and off by having the tokens selected that you would apply the condition to and clicking the
name of the condition. If the condition can have a value, simply click the + to increase the value or the - to decrease.
The Clear a condition button is used to clear a specific condition off of a group of selected tokens.
This macro is loosely adapted from the Apply Conditions macro created by cepvep.
CSS design by websterguy
Added the ability to add Timed Effects that grant conditions for a specific amount of time.
Have the actor causing the effect selected and the ones the effect it being placed on targeted.
Added the ability to clear all conditions on selected tokens.
*/

const condition_list = CONFIG.PF2E.conditionTypes;

const wV = [
	"clumsy",
	"doomed",
	"drained",
	"dying",
	"enfeebled",
	"frightened",
	"sickened",
	"slowed",
	"stunned",
	"stupefied",
	"wounded",
];

const nF = [];
const script1 = async function CToggle(c) {
  for(const token of canvas.tokens.controlled) {
   if (token.actor === null) { ui.notifications.warn(`${token.name} does not have an actor or is broken`); continue; }
   if (token.actor.itemTypes.condition.some(p => p.slug === c && p.system.references.parent !== undefined)) { continue; }
   if (token.actor !== null) { await token.actor.toggleCondition(c); }
  }
};

const script2 = async function ICon(c) {
  for(const token of canvas.tokens.controlled) {
   if (token.actor === null) { ui.notifications.warn(`${token.name} does not have an actor or is broken`); continue; }
   if (token.actor !== null) { await token.actor.increaseCondition(c); }
  }
};

const script3 = async function DCon(c) {
  for(const token of canvas.tokens.controlled) {
   if (token.actor === null) { ui.notifications.warn(`${token.name} does not have an actor or is broken`); continue; }
   if (token.actor !== null) { await token.actor.decreaseCondition(c); }
  }
};

const script4 = async function CCon() {
  async function Clear(html) {
    const c = html.find("#condition")[0].value;
    for(const token of canvas.tokens.controlled) {
      if (token.actor === null) { ui.notifications.warn(`${token.name} does not have an actor or is broken`); continue; }
      if (!token.actor.itemTypes.condition.some(p => p.slug === c) || token.actor.itemTypes.condition.some(p => p.slug === c && p.system.references.parent !== undefined)) { continue; }
      if (token.actor !== null) { await token.actor.toggleCondition(c); }
    }
  }
  const cons = []; 
  for (const t of canvas.tokens.controlled) {
    for ( const c of t.actor.itemTypes.condition) {
      if (c.system.references.parent !== undefined) { return; }
      cons.push(c.slug);
    };
  };
  const ccon = [...new Set(cons)].sort();
  if (ccon.length === 0) { return ui.notifications.info("No conditions to clear at this time.") }
  if (ccon.length === 1) { 
    for(const token of canvas.tokens.controlled) {
      if(token.actor.hasCondition(ccon[0])) {
        await token.actor.toggleCondition(ccon[0]); 
      }
    }
  }
  else{
    let choices = '';
    ccon.forEach( cc => { choices += `<option value="${cc}">${cc[0].toUpperCase() + cc.substring(1)}</option>`; });
    new Dialog({
      title: "Condition to clear from tokens",
      content: `<p>Choose condition to clear from selected tokens: <select id="condition">${choices}</select>`,
      buttons: {
        ok: {
          label: "Ok",
          callback: (html) => {
            Clear(html);
          },
        },
        cancel: {
          label: "Cancel",
        },
      },
      default: "cancel",
    }).render(true);
  }
}

const script5 = async function CConAll() {
  for (const t of canvas.tokens.controlled) {
    for ( const c of t.actor.items ) {
      if ( c.type === "condition" ) {
        await c.delete();
      }
    }
  }
}

const script6 = async function TCon() {
  if (canvas.tokens.controlled.length === 0) { return void ui.notification.warn("No token selected") }
  if (canvas.tokens.controlled.length > 1 && game.combats.active?.started ) { return void ui.notification.warn("Only one originating token can be selected at a time") }
  if (game.user.targets.size === 0 && game.combats.active?.started ) { return void ui.notification.warn("At least one target for timed condition is required") }
  const con_list = CONFIG.PF2E.conditionTypes;
  const w_V = [
	"clumsy",
	"doomed",
	"drained",
	"enfeebled",
	"frightened",
	"sickened",
	"slowed",
	"stunned",
	"stupefied",
  ];

  async function Xtml(html) { return [html.find("#condition")[0].value, html.find("#conval")[0].valueAsNumber, html.find("#time")[0].valueAsNumber, html.find("#times")[0].value, html.find("#check")[0].checked] }

  let conditions;
  for ( const l in con_list ) {
    conditions += `<option value=${l}>${game.i18n.localize(con_list[l])}</option>`;
  }
  const tcon = await Dialog.prompt({
      title: "Timed condition to place on tokens",
      content: `<div class="timetable1"><table>
                  <tr><td>Choose condition:</td> <td><select id="condition" autofocus>${conditions}</select></td> <td style="text-align:center">Value(If applicable)</td><td width="8%"><input id="conval" type="number" value=1 style="text-align:center"></input></td></tr></table>
                  <table><tr><td>Choose duration:</td> <td width="8%"><input id="time" type="number" style="text-align:center" value=1></input></td>
                      <td><select id="times">
                        <option value=rounds>Rounds</option>
                        <option value=minutes>Minutes</option>
                        <option value=hours>Hours</option>
                        <option value=days>Days</option>
                      </select></td>
                      <td style="text-align:center">End of Turn?</td><td><input id="check" type="checkbox"></td>
                  </tr>
                </table></div>`,
      callback: async html => await Xtml(html),
      rejectClose: true,
  });
  let name = `Effect: ${game.i18n.localize(con_list[tcon[0]])} for ${tcon[2]} ${tcon[3]}`;
  const pack = game.packs.get("pf2e.conditionitems");
  const index = await pack.getIndex({fields:["system.slug"]});
  const uuid = index.find(n => n.system.slug === tcon[0]).uuid;
  const initiative = game.combats.active?.started ? canvas.tokens.controlled[0].combatant.initiative : null;
  const actor = canvas.tokens.controlled[0].actor.uuid;
  
  let alterations;
  if ( w_V.includes(tcon[0]) ) {
    name = `Effect: ${game.i18n.localize(con_list[tcon[0]])} for ${tcon[2]} ${tcon[3]}`;
    alterations = [
    {
      "mode": "override",
      "property": "badge-value",
      "value": tcon[1]
    }
    ];
  }

  const effect = {
    type: 'effect',
    name,
    img: `systems/pf2e/icons/conditions/${tcon[0]}.webp`,
    system: {
      context: {
        origin: {
          actor,
        },
      },
      tokenIcon: {
          show: false
      },       
      duration: {
          value: tcon[2],
          unit: `${tcon[3]}`,
          sustained: false,
          expiry: 'turn-start'
      },
      rules: [
        {
          "key": "GrantItem",
          "onDeleteActions": {
              "grantee": "restrict"
          },
          uuid,
        }
      ],
      start: {
        initiative,
      }
    },
  };

  if ( alterations !== undefined ) {
    effect.system.rules[0].alterations = alterations;
  }
  if ( tcon[4] ) {
    effect.system.duration.expiry = "turn-end";
  }
  if (game.combats.active?.started) {
    for ( const t of game.user.targets.ids ) {
      const tok = canvas.tokens.placeables.find(i => i.id === t);
      await tok.actor.createEmbeddedDocuments("Item", [effect]);
    }
  }
  else { 
    for ( const t of canvas.tokens.controlled) {
      await t.actor.createEmbeddedDocuments("Item", [effect]);
    }
  }
}


let content = `
<style>
  .cond-cont {
   margin: 1px auto;
   column-count: 3;
   column-width: 100px;
   background: url(systems/pf2e/assets/sheet/background.webp);
  }

  .cond-buttons-pd, .cond-buttons-pd:focus {
    margin: 1px auto;
    width: 70%;
    height: fit-content;
    background: var(--secondary);
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 50%);
    border: #000;
    color: #fff;
  }

  .cond-buttons, .cond-buttons:focus {
    margin: 1px auto;
    width: 70%;
    height: fit-content;
    background: var(--secondary);
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 50%);
    text-shadow: none;
    border: #000;
    color: #fff;
  }

  .cond-buttons-small, .cond-buttons-small:focus {
    margin: 1px;
    width: 13%;
  }

  .cond-buttons:hover {
    background-color:var(--secondary);
    text-shadow: 0 0 2px #fff;
  }

  .cond-buttons-small:hover {
    background-color:var(--secondary);
    text-shadow: 0 0 2px #fff;
  }

  .cond-buttons-pd:hover {
    background-color:var(--secondary);
    text-shadow: 0 0 2px #fff;
  }



</style><script>${script1}${script2}${script3}${script4}${script5}${script6}</script><div class="cond-cont">`

Object.keys(condition_list).forEach((c,i) => {
    if (wV.includes(c)) {
     content += `<div class="cond-butt-set"><button name="button${i}" class="cond-buttons ${i}" type="button" onclick="CToggle('${c}')">${game.i18n.localize(condition_list[c])}</button><button name="button${i}+" class="cond-buttons cond-buttons-small ${i}+" type="button" onclick="ICon('${c}')">+</button><button name="button${i}-" class="cond-buttons cond-buttons-small ${i}-" type="button" onclick="DCon('${c}')">-</button></div> `;
    }
    else {
     if ( c === "persistent-damage" ) { 
	  content += `<button name="button${i}" class="cond-buttons-pd" type="button" onclick="game.pf2e.gm.editPersistent({actors:canvas.tokens.controlled?.map((t) => t.actor)})">Persistent Damage</button> `
     }
     else{
       content += `<button name="button${i}" class="cond-buttons ${i}" type="button" onclick="CToggle('${c}')">${game.i18n.localize(condition_list[c])}</button> `;
    }
  }
});

content += `<button name="button-timed" class="cond-buttons timed" type="button" onclick="TCon()">Timed Condition</button> 
<button name="button-clear" class="cond-buttons clear" type="button" onclick="CCon()">Clear a condition</button>
<button name="button-clear-all" class="cond-buttons clear-all" type="button" onclick="CConAll()">Clear all Conditions</button></div>`

await new Promise(async (resolve) => {
    setTimeout(resolve,200);
 await new Dialog({
    title:"Conditions Manager",
    content,
    buttons:{ Close: { label: "Close" } },
    },{width: 600}).render(true);
});
