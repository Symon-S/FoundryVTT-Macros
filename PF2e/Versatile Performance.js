options = ["Demoralize", "Make and Impression", "Impersonate"]; 

const c = await choose(options, `Versatile Performance:`)

const targetIds = game.user.targets.ids;

if (c === "Demoralize") { targetIds.forEach( t => { game.pf2e.actions.demoralize({ event: event, skill: "performance" }); }); }
if (c === "Make and Impression") { targetIds.forEach( t => {game.pf2e.actions.makeAnImpression({ event: event, skill: "performance" });}); }
if (c === "Impersonate") { targetIds.forEach( t => { game.pf2e.actions.impersonate({ event: event, skill: "performance" }); }); }

async function choose(options = [], prompt = ``){
  return new Promise((resolve) => {
    let dialog_options = (options[0] instanceof Array)
      ? options.map(o => `<option value="${o[0]}">${o[1]}</option>`).join(``)
      : options.map(o => `<option value="${o}">${o}</option>`).join(``);
  
    let content = `
    <table style="width=100%">
      <tr><th>${prompt}</th></tr>
      <tr><td><select id="choice">${dialog_options}</select></td></tr>
    </table>`;
  
    new Dialog({
      content, 
      buttons : { OK : {label : `OK`, callback : async (html) => { resolve(html.find('#choice').val()); } } }
    }).render(true);
  });
}
