/*
Welcome to the Conditions Manager.
This macro was designed to have a window that can be minimized when not needed or opened whenever to manage conditions.
It is mostly intended for those who want an easy to read condition manager without the need for modules.
All conditions are toggled on and off by having the tokens selected that you would apply the condition to and clicking the
name of the condition. If the condition can have a value, simply click the + to increase the value or the - to decrease.
The Clear a condition button is used to clear a specific condition off of a group of selected tokens.
This macro is loosely adapted from the Apply Conditions macro created by cepvep.
CSS design by websterguy
*/

const condition_list = [
	"blinded",
	"broken",
	"clumsy",
	"concealed",
	"confused",
	"controlled",
	"dazzled",
	"deafened",
	"doomed",
	"drained",
	"dying",
	"encumbered",
	"enfeebled",
	"fascinated",
	"fatigued",
	"flat-footed",
	"fleeing",
	"frightened",
	"grabbed",
	"hidden",
	"immobilized",
	"invisible",
	"paralyzed",
	"persistent-damage",
	"petrified",
	"prone",
	"quickened",
	"restrained",
	"sickened",
	"slowed",
	"stunned",
	"stupefied",
	"unconscious",
	"wounded",
  "undetected"
];

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

const nF = [
];
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
      if ( token.actor.itemTypes.effect.some(f => f.name === c) ) { (await token.actor.itemTypes.effect.find(n => n.name === c)).delete(); continue; }
      if (!token.actor.itemTypes.condition.some(p => p.slug === c) || token.actor.itemTypes.condition.some(p => p.slug === c && p.system.references.parent !== undefined)) { continue; }
      if (token.actor !== null) { await token.actor.toggleCondition(c); }
    }
  }
  const cons = []; 
  canvas.tokens.controlled.forEach( t=> {
    if (game.modules.has("pf2e-persistent-damage") && game.modules.get("pf2e-persistent-damage").active) {
      t.actor.itemTypes.effect.forEach( e => {
        if (e.slug.includes("persistent-damage")) { cons.push(e.name) }
      });
    }
    t.actor.itemTypes.condition.forEach ( c => {
      if (c.system.references.parent !== undefined) { return; }
      cons.push(c.slug);
    });
  });
  const ccon = [...new Set(cons)].sort();
  if (ccon.length === 0) { return ui.notifications.info("No conditions to clear at this time.") }
  if (ccon.length === 1) { 
    for(const token of canvas.tokens.controlled) {
      if(token.actor.hasCondition(ccon[0])) {
        await token.actor.toggleCondition(ccon[0]); 
      }
      if(token.actor.itemTypes.effect.find(n => n.name === ccon[0]) && game.modules.has("pf2e-persistent-damage") && game.modules.get("pf2e-persistent-damage").active) { (await token.actor.itemTypes.effect.find(n => n.name === ccon[0])).delete(); }
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

let content = `
<style>
  .cond-cont {
   margin: 1px auto;
   column-count: 3;
   column-width: 100px;
   background: url(../assets/sheet/background.webp);
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

</style><script>${script1}${script2}${script3}${script4}</script><div class="cond-cont">`

condition_list.forEach((c,i) => {
    if (wV.includes(c)) {
     content += `<div class="cond-butt-set"><button name="button${i}" class="cond-buttons ${i}" type="button" onclick="CToggle('${c}')">${c[0].toUpperCase() + c.substring(1)}</button><button name="button${i}+" class="cond-buttons cond-buttons-small ${i}+" type="button" onclick="ICon('${c}')">+</button><button name="button${i}-" class="cond-buttons cond-buttons-small ${i}-" type="button" onclick="DCon('${c}')">-</button></div> `;
    }
    else {
     if ( c === "persistent-damage" ) { 
      	if (game.modules.has("pf2e-persistent-damage") && game.modules.get("pf2e-persistent-damage").active) {
	  content += `<button name="button${i}" class="cond-buttons-pd" type="button" onclick="PF2EPersistentDamage.showDialog()">Persistent Damage</button> `
	}
	else {
       	  content += `<button name="button${i}" class="cond-buttons-pd" type="button" onclick="CToggle('${c}')">Persistent Damage</button> ` 
	}
     }
     else{
       content += `<button name="button${i}" class="cond-buttons ${i}" type="button" onclick="CToggle('${c}')">${c[0].toUpperCase() + c.substring(1)}</button> `;
    }
  }
});

content +=  `<button name="button-clear" class="cond-buttons clear" type="button" onclick="CCon()">Clear a condition</button></div>`;

await new Promise(async (resolve) => {
    setTimeout(resolve,200);
 await new Dialog({
    title:"Conditions Manager",
    content,
    buttons:{ Close: { label: "Close" } },
    },{width: 600}).render(true);
});
