/* Author ArthurTrumpet
This allows you to quickly roll a skill action using the built in system macros.
It lists 4 buttons to make it quicker than selecting from a drop down. Simply click the one you want.
Edit the first four lines to customise the skill actions you wish to perform (always use lower case).
type game.pf2e.actions in your browser console (F12 usually) to see a list of all available options.
You can shift click to modify the roll, or ctrl-click to make it a secret check.
*/

let skill1 = 'demoralize';
let skill2 = 'hide';
let skill3 = 'sneak';
let skill4 = 'trip';

async function buttonDialog(data)
{
  return await new Promise(async (resolve) => {
    let buttons = {}, dialog;

    data.buttons.forEach(([str, callback])=>{
      buttons[str] = {
        label : str,
        callback
      }
    });
  
    dialog = new Dialog({
      title : data.title , 
      buttons, 
      close : () => resolve(true) 
    },{
      width : 300, height : ( 50 * data.buttons.length)
    });

    await dialog._render(true);
    dialog.element.find('.dialog-buttons').css({'flex-direction':'column'});
  });
}


let data = {
    buttons : [
           [`${skill1}`, () => rollMySkill(`${skill1}`)],
           [`${skill2}`, () => rollMySkill(`${skill2}`)],
           [`${skill3}`, () => rollMySkill(`${skill3}`)],
           [`${skill4}`, () => rollMySkill(`${skill4}`)],
    ],
    title : `Skill Action`
}

await buttonDialog(data);


async function rollMySkill(selectedSkill) {
    console.log(selectedSkill);
    game.pf2e.actions[selectedSkill]({ event: event });
}
