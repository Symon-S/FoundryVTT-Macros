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
  ineasy: { label: 'Incredibly Easy', callback: async(rar) => { resolve(-10); } },
  veasy: { label: 'Very Easy', callback: async(rar) => { resolve(-5); } },
  easy: { label: 'Easy', callback: async(rar) => { resolve(-2); } },
  norm: { label: 'Normal', callback: async(rar) => { resolve(0); } },
  hard: { label: 'Hard', callback: async(rar) => { resolve(2); } },
  vhard: { label: 'Very Hard', callback: async(rar) => { resolve(5); } },
  inhard: { label: 'Incredibly Hard', callback: async(rar) => { resolve(0); } },
  },
 default: 'norm',
 },{width:600}).render(true);
});

let level;
if (canvas.tokens.controlled.length === 1) { level = canvas.tokens.controlled[0].actor.level }

else {
  level = await new Promise((resolve) => {
    new Dialog({
      title: 'Level?',
      buttons: {
        0: { label: '0', callback: async(rar) => { resolve(0); } },
        1: { label: '1', callback: async(rar) => { resolve(1); } },
        2: { label: '2', callback: async(rar) => { resolve(2); } },
        3: { label: '3', callback: async(rar) => { resolve(3); } },
        4: { label: '4', callback: async(rar) => { resolve(4); } },
        5: { label: '5', callback: async(rar) => { resolve(5); } },
        6: { label: '6', callback: async(rar) => { resolve(6); } },
        7: { label: '7', callback: async(rar) => { resolve(7); } },
        8: { label: '8', callback: async(rar) => { resolve(8); } },
        9: { label: '9', callback: async(rar) => { resolve(9); } },
        10: { label: '10', callback: async(rar) => { resolve(10); } },
        11: { label: '11', callback: async(rar) => { resolve(11); } },
        12: { label: '12', callback: async(rar) => { resolve(12); } },
        13: { label: '13', callback: async(rar) => { resolve(13); } },
        14: { label: '14', callback: async(rar) => { resolve(14); } },
        15: { label: '15', callback: async(rar) => { resolve(15); } },
        16: { label: '16', callback: async(rar) => { resolve(16); } },
        17: { label: '17', callback: async(rar) => { resolve(17); } },
        18: { label: '18', callback: async(rar) => { resolve(18); } },
        19: { label: '19', callback: async(rar) => { resolve(19); } },
        20: { label: '20', callback: async(rar) => { resolve(20); } },
        21: { label: '21', callback: async(rar) => { resolve(21); } },
        22: { label: '22', callback: async(rar) => { resolve(22); } },
        23: { label: '23', callback: async(rar) => { resolve(23); } },
        24: { label: '24', callback: async(rar) => { resolve(24); } },
        25: { label: '25', callback: async(rar) => { resolve(25); } },
      },
    },{width:300}).render(true);
  });
}
const lDCs = [14,15,16,18,19,20,22,23,24,26,27,28,30,31,32,34,35,36,38,39,40,42,44,46,48,50];
const bDC = lDCs[level] + diff;
ui.notifications.info(`Level based DC is ${bDC}`);
