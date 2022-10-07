/* 
Contributed by Uprooted Grunt (steev@2d12.com)

Usage: A token with a melee weapon in inventory must be selected to run this macro.  Select the weapon to be shifted (by default, only includes melee weapons with Shifting runes, but select Blade Ally to show all melee weapons), then choose the weapon you wish to shift the weapon into.  Click OK to shift.
Note that if the selected token doesn't have any weapons with Shifting runes, Blade Ally will be automatically checked and disabled, under the assumption that this is what is happening.
The macro will create a new instance of that weapon, copy all materials and runes onto it, delete the original weapon, and make a chat message showing the action taken.
Filters exist for rarity/complexity of the weapons chosen.  You can default those choices by updating the six variables below to be "" or "checked" accordingly.

Slightly modified to work with findIndex by the macro fairies.
*/

if (!actor){ return ui.notifications.warn("No PC Token Selected"); }
if (!token.actor.itemTypes.weapon.some(a => a.isMelee && a.system.runes.property.includes("shifting")) && !token.actor.itemTypes.feat.some(s => s.slug === "divine-ally")) { return ui.notifications.warn("You do not possess a shifting weapon and do not have a Divine Ally"); }

let defaultSimple="checked";
let defaultMartial="checked";
let defaultAdvanced="";
let defaultCommon="checked";
let defaultUncommon="";
let defaultRare="";

const macroActor = token.actor;

const CompendiumID = "pf2e.equipment-srd";
const pack = game.packs.get(CompendiumID);
const docs = (await pack.getIndex({fields:["system"]})).filter(t => t.type === "weapon" && !t.system.traits.value.includes("bomb") && !t.system.traits.value.includes("ranged") && !t.system.traits.value.includes("magical") && t.system.reload.value === '');

let weapons = macroActor.itemTypes.weapon.filter(a => a.isMelee && a.system.runes.property.includes("shifting"));

let allWeapons = macroActor.itemTypes.weapon.filter(a => a.isMelee);

if (allWeapons.length === 0) { return ui.notifications.warn("A valid token with a melee weapon must be selected for this macro to function.")}

let weaponList = "";
weapons.forEach((item)=> {
	weaponList += '<option value="' + item.name + '">' + item.name + '</option>';
});

let allWeaponList = "";
allWeapons.forEach((item)=> {
	allWeaponList += '<option value="' + item.name + '">' + item.name + '</option>';
});

const formContent = `
<input type="checkbox" id="usingBladeAlly" name="usingBladeAlly"><label for="usingBladeAlly">Blade Ally Weapon</label><br />
<div align="center">FROM: <select name="weapon" id="weapon">` + weaponList + `</select></div>
<table border=0"><tr>
<td><input type="checkbox" id="simpleWeapons" name="simpleWeapons" `+defaultSimple+`><label for="simpleWeapons">Simple</label></td>
<td><input type="checkbox" id="martialWeapons" name="martialWeapons" `+defaultMartial+`><label for="martialWeapons">Martial</label></td>
<td><input type="checkbox" id="advancedWeapons" name="advancedWeapons" `+defaultAdvanced+`><label for="advancedWeapons">Advanced</label></td></tr>
<tr><td><input type="checkbox" id="commonWeapons" name="commonWeapons" `+defaultCommon+`><label for="commonWeapons">Common</label></td>
<td><input type="checkbox" id="uncommonWeapons" name="uncommonWeapons" `+defaultUncommon+`><label for="uncommonWeapons">Uncommon</label></td>
<td><input type="checkbox" id="rareWeapons" name="rareWeapons" `+defaultRare+`><label for="rareWeapons">Rare</label></td></tr></table>
<div align="center">TO: <select name="shifting" id="shifting"><option value="default">TBD</option></select></div><br />
`;

let d = new Dialog ({
 title: "Select Weapon to Shift",
 content: formContent,
 buttons: {
	ok: {
		icon: '<i class="fa-solid fa-arrow-right-arrow-left"></i>',
		label: "Shift",
		callback: (html) => { 
			itemSelectedCallback(allWeapons.find(t=>t.name === html.find('[name="weapon"]')[0].value), (html.find('[name="shifting"]')[0].value), false);
			},
		},
    original: {
        icon: '<i class="fa-solid fa-arrow-rotate-left"></i>',
        label: "Original",
        callback: (html) => { 
			itemSelectedCallback(allWeapons.find(t=>t.name === html.find('[name="weapon"]')[0].value), (html.find('[name="shifting"]')[0].value), true);
			},
    },    
	cancel: {
		icon: '<i class="fas fa-times"></i>',
		label: "Cancel",
		}
	},
    default: "ok",
 render: (html) => {
	handleUpdates(html);
	CheckForShiftingWeapons(html);
	UpdateInventoryWeapons(html);
	UpdateAvailableOptions(html);},
 default: "cancel"
}).render(true);

/*
FUNCTION CheckForShiftingWeapons
This function checks to see if there are any weapons with a Shifting rune on the selected token.  If there is not, defaults the Blade Ally checkbox to checked and disabled.
*/
function CheckForShiftingWeapons(html)
{
	if (weaponList.length === 0 && token.actor.itemTypes.feat.some(s => s.slug === "divine-ally"))
		{
			html.find('[name="usingBladeAlly"]')[0].checked = true;
			html.find('[name="usingBladeAlly"]')[0].disabled = true;
		}
	if (weaponList.length !== 0 && !token.actor.itemTypes.feat.some(s => s.slug === "divine-ally")) {
		html.find('[name="usingBladeAlly"]')[0].disabled = true;
	}
}

/*
FUNCTION UpdateInventoryWeapons
This function updates the dropdown on the dialog to show all weapons or just those with Shifting runes, based on the status of the Blade Ally checkbox.
*/
async function UpdateInventoryWeapons(html)
{
	let useAllWeapons = html.find('[name="usingBladeAlly"]')[0].checked || weaponList.length === 0;
	if (useAllWeapons)
		html.find('[name="weapon"]')[0].innerHTML = allWeaponList;
	else
		html.find('[name="weapon"]')[0].innerHTML = weaponList;	
}

/*
FUNCTION handleUpdates
This function adds onChange handlers for the various checkboxes and dropdowns in the dialog box.
*/
async function handleUpdates(html)
{
	html.find('[name="usingBladeAlly"]').on("change", function(){UpdateInventoryWeapons(html)});
	html.find('[name="weapon"]').on("change",function(){UpdateAvailableOptions(html)});
	html.find('[name="simpleWeapons"]').on("change", function(){UpdateAvailableOptions(html)});
	html.find('[name="martialWeapons"]').on("change", function(){UpdateAvailableOptions(html)});
	html.find('[name="advancedWeapons"]').on("change", function(){UpdateAvailableOptions(html)});
	html.find('[name="commonWeapons"]').on("change", function(){UpdateAvailableOptions(html)});
	html.find('[name="uncommonWeapons"]').on("change", function(){UpdateAvailableOptions(html)});
	html.find('[name="rareWeapons"]').on("change", function(){UpdateAvailableOptions(html)});
}

/*
FUNCTION UpdateAvailableOptions
This function updates the lower dropdown based on the filters and selected weapon to shift from.
*/
function UpdateAvailableOptions(html)
{
	let selectedText = html.find('[name="weapon"]')[0].value; 
	let selected = allWeapons.find(t=>t.name === selectedText);
	let filterSimple = html.find('[name="simpleWeapons"]')[0].checked;
	let filterMartial = html.find('[name="martialWeapons"]')[0].checked;
	let filterAdvanced = html.find('[name="advancedWeapons"]')[0].checked;
	let filterCommon = html.find('[name="commonWeapons"]')[0].checked;
	let filterUncommon = html.find('[name="uncommonWeapons"]')[0].checked;
	let filterRare = html.find('[name="rareWeapons"]')[0].checked;
	
	let entries = docs.filter(i => i.system.usage.value === selected.system.usage.value && i.system.slug !== selected.system.slug);
	entries = entries.filter(i => (i.system.category === "simple" && filterSimple) || (i.system.category === "martial" && filterMartial) || (i.system.category === "advanced" && filterAdvanced === true));
	entries = entries.filter(i=> (i.system.traits.rarity === "common" && filterCommon) || (i.system.traits.rarity === "uncommon" && filterUncommon) || (i.system.traits.rarity === "rare" && filterRare));
	
	let newWeapons = "";
	entries.forEach((item)=> {
		newWeapons += '<option value="' + item._id + '">' + item.name + '</option>';
		});
	
	html.find('[name="shifting"]')[0].innerHTML = newWeapons;			
}

/*
FUNCTION itemSelectedCallback
This is where the magic happens.  Create a new object from the selected weapon to shift into, copy all runes, materials, and equipped status from the original weapon onto it.  Add the new object to the token's actor.  Delete the old object.  Display a message to the chat.
*/
async function itemSelectedCallback(weaponToShift, newWeaponID, revert)
{
    let originalItemName = weaponToShift.name;
    let itemObject;
    if (!revert) {
	    let itemToMove = await pack.getDocument(newWeaponID);
	    itemObject = await itemToMove.toObject();
        itemObject.system.potencyRune.value = weaponToShift.system.potencyRune.value;
	    itemObject.system.preciousMaterial.value = weaponToShift.system.preciousMaterial.value;
	    itemObject.system.preciousMaterialGrade.value = weaponToShift.system.preciousMaterialGrade.value;
	    itemObject.system.propertyRune1.value = weaponToShift.system.propertyRune1.value;
	    itemObject.system.propertyRune2.value = weaponToShift.system.propertyRune2.value;
	    itemObject.system.propertyRune3.value = weaponToShift.system.propertyRune3.value;
	    itemObject.system.propertyRune4.value = weaponToShift.system.propertyRune4.value;
	    itemObject.system.strikingRune.value = weaponToShift.system.strikingRune.value;
    }
    if (revert) { 
		if (weaponToShift.flags.pf2e.originalItemData !== undefined){
        itemObject = weaponToShift.flags.pf2e.originalItemData;
		}
		else{ return ui.notifications.warn("This is the original weapon");}
    }

	let equippedStatus = weaponToShift.system.equipped;

	let nw = await macroActor.createEmbeddedDocuments('Item',[itemObject]);
	if (weaponToShift.flags.pf2e.originalItemData === undefined && !revert){
		await nw[0].setFlag("pf2e","originalItemData",weaponToShift);
	}
	if (weaponToShift.flags.pf2e.originalItemData !== undefined && !revert) {
		await nw[0].setFlag("pf2e","originalItemData",weaponToShift.flags.pf2e.originalItemData);
	}
	// This line is needed as a separate call, because updating the equipped status on 
	// the createEmbeddedDocuments call was immediately overwritten somewhere else in the 
	// PF2E code
	await macroActor.updateEmbeddedDocuments('Item',[{_id:nw[0].id, 'system.equipped':equippedStatus}]);
					
	let nin = nw[0].name;
	await macroActor.deleteEmbeddedDocuments('Item', macroActor.items.filter(value=> (value.name === weaponToShift.name)).map(i=>i.id));	

// One possible improvement here is the card-content, which is a copy-paste from the Shifting rune's description.  Perhaps there's a way to bring that in directly?	
		let chatcontent = `
	<div class="pf2e chat-card item-card">
		<header class="card-header flexrow">
			<img src="systems/pf2e/icons/actions/OneAction.webp" title="Shifting Weapon" width="36" height="36">
			<h3>Shifting Weapon</h3>
		</header>
		<section class="item-properties tags">
			<span class="tag tooltipsered" data-trait="manipulate" data-description="PF2E.TraitDescriptionManipulate">Manipulate</span>
			<hr class="vr">
			<span class="tag tag_alt tooltipstered" data-slug="magical" data-description="PF2E.TraitDescriptionMagical">Magical</span>
			<span class="tag tag_alt tooltipstered" data-trait="" data-description="PF2E.TraitDescriptionTransmutation">Transmutation</span>
		</section>
		<section class="card-content">
			<p>
			The weapon takes the shape of another melee weapon that requires the same number of hands to wield. The weapon's runes and any precious material it's made of apply to the weapon's new shape. Any property runes that can't apply to the new form are suppressed until the item takes a shape to which they can apply.
			</p>
		</section>
		<hr>
		<p>
			`+originalItemName+` shifts into `+nin+`.
		</p>	
	</div>
	`;
	
	let user = ChatMessage.getSpeaker(token.actor);
	ChatMessage.create({
			speaker: user,
			type:0,
			content: chatcontent
		});
}
