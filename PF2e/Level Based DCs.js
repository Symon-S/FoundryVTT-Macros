/*
Simple Macro to check for level based DCs.
Either select a token, multiple tokens, or no token at all.
You will be prompted for an adjustment.
When multiple tokens or no tokens are selected you will be prompted for a level as well.
*/

const diff = await new Promise((resolve) => {
 new Dialog({
 title: 'Difficulty?',
 buttons: {
  ineasy: { label: 'Incredibly Easy', callback: () => { resolve(-10); } },
  veasy: { label: 'Very Easy', callback: () => { resolve(-5); } },
  easy: { label: 'Easy', callback: () => { resolve(-2); } },
  norm: { label: 'Normal', callback: () => { resolve(0); } },
  hard: { label: 'Hard', callback: () => { resolve(2); } },
  vhard: { label: 'Very Hard', callback: () => { resolve(5); } },
  inhard: { label: 'Incredibly Hard', callback: () => { resolve(10); } },
  },
 default: 'norm',
 },{width:600}).render(true);
});

let level;
if (canvas.tokens.controlled.length === 1) { level = canvas.tokens.controlled[0].actor.level + 1 }

else {
  level = await new Promise((resolve) => {
    new Dialog({
      title: 'Level?',
      buttons: {
        0: { label: '-1', callback: () => { resolve(0); } },
        1: { label: '0', callback: () => { resolve(1); } },
        2: { label: '1', callback: () => { resolve(2); } },
        3: { label: '2', callback: () => { resolve(3); } },
        4: { label: '3', callback: () => { resolve(4); } },
        5: { label: '4', callback: () => { resolve(5); } },
        6: { label: '5', callback: () => { resolve(6); } },
        7: { label: '6', callback: () => { resolve(7); } },
        8: { label: '7', callback: () => { resolve(8); } },
        9: { label: '8', callback: () => { resolve(9); } },
        10: { label: '9', callback: () => { resolve(10); } },
        11: { label: '10', callback: () => { resolve(11); } },
        12: { label: '11', callback: () => { resolve(12); } },
        13: { label: '12', callback: () => { resolve(13); } },
        14: { label: '13', callback: () => { resolve(14); } },
        15: { label: '14', callback: () => { resolve(15); } },
        16: { label: '15', callback: () => { resolve(16); } },
        17: { label: '16', callback: () => { resolve(17); } },
        18: { label: '17', callback: () => { resolve(18); } },
        19: { label: '18', callback: () => { resolve(19); } },
        20: { label: '19', callback: () => { resolve(20); } },
        21: { label: '20', callback: () => { resolve(21); } },
        22: { label: '21', callback: () => { resolve(22); } },
        22: { label: '22', callback: () => { resolve(23); } },
        23: { label: '23', callback: () => { resolve(24); } },
        24: { label: '24', callback: () => { resolve(25); } },
        25: { label: '25', callback: () => { resolve(26); } },
      },
      render: () => {
        let myElem = [...document.getElementsByClassName("dialog-buttons")].pop();
        if (myElem.style === undefined) { myElem = [...document.getElementsByClassName("dialog-buttons")].pop(); }
        myElem.style.display = "grid";
        myElem.style.gridTemplateColumns = "repeat(13,1fr)";
        myElem.style.gap = "1px 1px";
      }
    },{width:500}).render(true);
  });
}

const lDCs = [13,14,15,16,18,19,20,22,23,24,26,27,28,30,31,32,34,35,36,38,39,40,42,44,46,48,50];
const bDC = lDCs[level] + diff;
ui.notifications.info(`Level based DC is ${bDC}`);