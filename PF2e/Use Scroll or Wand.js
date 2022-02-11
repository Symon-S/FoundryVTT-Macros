//This macro allows you to send scrolls and wands directly to chat as if you had clicked on them in your character sheet.
new Dialog({
  title: "Wand or Scroll?",
  buttons: {
   w: {
    label: "Wand",
    callback: Wand,
   },
   s: {
    label: "Scroll",
    callback: Scroll,
   },
  },
  default: "s",
}).render(true);

let title;

async function Scroll() {  
 
  title = `Cast a Scroll`
  const scroll = [];
 
  token.actor.itemTypes.consumable.forEach(s => {
   if(s.data.data.consumableType.value === "scroll") { scroll.push(s); }
  });
 
  if (scroll.length === 0) { return ui.notifications.warn("You do don't have scrolls to cast from.");}
  const choiceS = await choose(scroll.map(n => n.data.name),`Pick a Scroll`);
  const chosen = scroll.find(x => x.data.name === choiceS);
  await chosen.toMessage();
}
 
async function Wand(){
  
  title = `Cast a Wand`
  const wand = [];
 
  token.actor.itemTypes.consumable.forEach(s => {
   if (s.data.data.consumableType.value === "wand") { wand.push(s); }
  });

  if (wand.length === 0) { return ui.notifications.warn("You do don't have wands to cast from.");}
  const choiceW = await choose(wand.map(n => n.data.name),`Pick a Wand`);
  const chosen = await wand.find(x => x.data.name === choiceW);
  chosen.toMessage();
}
/*
  Choose
    Send an array of options for a drop down choose menu. (Single)
      returns a promise (value is chosen element of array) 
    options = [`display_return_value`, ...] or [[return_value , `display`],...],
    prompt = `display_prompt_question` 
  */
async function choose(options = [], prompt = ``){
    return new Promise((resolve) => {
      let dialog_options = (options[0] instanceof Array)
        ? options.map(o => `<option value="${o[0]}">${o[1]}</option>`).join(``)
        : options.map(o => `<option value="${o}">${o}</option>`).join(``);
      console.log(dialog_options);
      let content = `
      <table style="width=100%">
        <tr><th>${prompt}</th></tr>
        <tr><td><select id="choice">${dialog_options}</select></td></tr>
      </table>`;
   
      new Dialog({
        content, title, 
        buttons : { OK : {label : `${title}`, callback : async (html) => { resolve(html.find('#choice').val()); } } },
        default: 'OK',
      }).render(true);
    });
  }
