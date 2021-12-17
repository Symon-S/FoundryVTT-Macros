/*
In order to roll an attack from the strikes tab, a weapon must first be equipped.
Because it takes time to swap weapons, many players equip everything, which is faster but makes it hard to track which weapon is currently being wielded.
This macro lists all your available weapons, and equips the one you click (whilst unequipping all the others).
Meaning you can quickly swap whilst the GM can also track the currently wielded weapon.
Holding down control whilst clicking will also toggle the two-handed trait if available for that weapon.
Limitation: Dual wield builds will not work with this macro. 
*/
const weapons = actor.itemTypes.weapon;
let activeWeapons = {};
weapons.forEach(item => {
   activeWeapons[item.name] = {label : item.name, callback: () => updateWeapon(item)}
});
	
new Dialog({
	title: "Click wielded weapon. Ctrl click for 2 handed",    
	buttons:  activeWeapons,
	close: html => {}
}).render(true);

async function updateWeapon(myWeapon) {

   if (event.ctrlKey){
      token.actor.setFlag("pf2e", "rollOptions.damage-roll.two-handed", true);
   }
   else {
      token.actor.setFlag("pf2e", "rollOptions.damage-roll.two-handed", false);
    }

    const updates = weapons.map(w => 
      w.id === myWeapon.id
        ? { _id: w.id, "data.equipped.value": true }
        : { _id: w.id, "data.equipped.value": false }
    ); 
   await actor.updateEmbeddedDocuments("Item", updates);
}