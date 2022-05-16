/* A quick Macro to pop up a notification with the DCs for spells based on level and rarity.
These DCs are used for counteract checks, learning a spell, etc.
These are NOT DCs for saves against these spells.*/

const rarity = await new Promise((resolve) => {
 new Dialog({
 title: 'Rarity?',
 buttons: {
  com: { label: 'Common', callback: async(rar) => { resolve(0); } },
  unc: { label: 'Uncommon', callback: async(rar) => { resolve(2); } },
  rar: { label: 'Rare', callback: async(rar) => { resolve(5); } },
  uni: { label: 'Unique', callback: async(rar) => { resolve(10); } },
  },
 default: 'com',
 }).render(true);
});

const level = await new Promise((resolve) => {
 new Dialog({
 title: 'Level?',
 buttons: {
  1: { label: '1', callback: async(rar) => { resolve(0); } },
  2: { label: '2', callback: async(rar) => { resolve(1); } },
  3: { label: '3', callback: async(rar) => { resolve(2); } },
  4: { label: '4', callback: async(rar) => { resolve(3); } },
  5: { label: '5', callback: async(rar) => { resolve(4); } },
  6: { label: '6', callback: async(rar) => { resolve(5); } },
  7: { label: '7', callback: async(rar) => { resolve(6); } },
  8: { label: '8', callback: async(rar) => { resolve(7); } },
  9: { label: '9', callback: async(rar) => { resolve(8); } },
  10: { label: '10', callback: async(rar) => { resolve(9); } },
  },
 }).render(true);
});

const sDCs = [15,18,20,23,26,28,31,34,36,39];
const bDC = sDCs[level] + rarity;
ui.notifications.info(`The Spell DC is ${bDC}`);
