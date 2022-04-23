/*
Welcome to the Conditions Manager.
This macro was designed to have a window that can be minimized when not needed or opened whenever to manage conditions.
It is mostly intended for those who want an easy to read condition manager without the need for modules.
All conditions are toggled on and off by having the tokens selected that you would apply the condition to and clicking the
name of the condition. If the condition can have a value, simply click the + to increase the value or the - to decrease.
This macro is loosely adapted from the Apply Conditions macro created by cepvep.
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

const script1 = async function CToggle(c) {
  for(const token of canvas.tokens.controlled) {
   await token.actor.toggleCondition(c);
  }
};

const script2 = async function ICon(c) {
  for(const token of canvas.tokens.controlled) {
   await token.actor.increaseCondition(c);
  }
};

const script3 = async function DCon(c) {
  for(const token of canvas.tokens.controlled) {
   await token.actor.decreaseCondition(c);
  }
};


let content = `
<style>
  .cond-cont {
   margin: 0 auto;
   column-count: 3;
   column-width: 100px;
  }

  .cond-buttons-pd {
    margin: 0 auto;
    width: fit-content;
    height: fit-content;
    line-height: normal;
  }

  .cond-buttons {
    margin: 0 auto;
    width: fit-content;
    height: fit-content;
  }

  .cond-buttons:hover {
    background-color:#44c767;
  }

  .cond-buttons-pd:hover {
    background-color:#44c767;
  }

</style><script>${script1}${script2}${script3}</script><div class="cond-cont">`

condition_list.forEach((c,i) => {
    if (wV.includes(c)) {
     content = content + `<div class="cond-butt-set"><button name="button${i}" class="cond-buttons ${i}" type="button" onclick="CToggle('${c}')">${c[0].toUpperCase() + c.substring(1)}</button><button name="button${i}+" class="cond-buttons ${i}+" type="button" onclick="ICon('${c}')">+</button><button name="button${i}-" class="cond-buttons ${i}-" type="button" onclick="DCon('${c}')">-</button></div> `;
    }
    else {
     if ( c === "persistent-damage" ) { content = content + `<button name="button${i}" class="cond-buttons-pd" type="button" onclick="CToggle('${c}')">Persistent Damage</button> ` }
     else{
     content = content + `<button name="button${i}" class="cond-buttons ${i}" type="button" onclick="CToggle('${c}')">${c[0].toUpperCase() + c.substring(1)}</button> `;
    }
  }
});

content = content + "</div>";

await new Promise(async (resolve) => {
    setTimeout(resolve,200);
 await new Dialog({
    title:"Conditions Manager",
    content,
    buttons:{ Close: { label: "Close" } },
    }).render(true);
});
