/* Contributed by cepvep */

// Displayed in this order.
const condition_list = {
	// condition name: display name
	"blinded": "Blinded",
	"broken": "Broken",
	"clumsy": "Clumsy",
	"concealed": "Concealed",
	"confused": "Confused",
	"controlled": "Controlled",
	"dazzled": "Dazzled",
	"deafened": "Deafened",
	"doomed": "Doomed",
	"drained": "Drained",
	"dying": "Dying",
	"encumbered": "Encumbered",
	"enfeebled": "Enfeebled",
	"fascinated": "Fascinated",
	"fatigued": "Fatigued",
	"flat-footed": "Flat-Footed",
	"fleeing": "Fleeing",
	// "friendly": "Friendly",
	"frightened": "Frightened",
	"grabbed": "Grabbed",
	//"helpful": "Helpful",
	"hidden": "Hidden",
	//"hostile": "Hostile",
	"immobilized": "Immobilised",
	// "indifferent": "Indifferent",
	"invisible": "Invisible",
	// "observed": "Observed",
	"paralyzed": "Paralysed",
	"persistent-damage": "Persistent Damage",
	"petrified": "Petrified",
	"prone": "Prone",
	"quickened": "Quickened",
	"restrained": "Restrained",
	"sickened": "Sickened",
	"slowed": "Slowed",
	"stunned": "Stunned",
	"stupefied": "Stupefied",
	"unconscious": "Unconscious",
	// "undetected": "Undetected",
	// "unfriendly": "Unfriendly",
	// "unnoticed": "Unnoticed",
	"wounded": "Wounded",
	// Add more options to your hearts content here.
}

const options = Object.entries(condition_list)
    .map(([conditionName, displayName]) => [`<option value="${conditionName}">${displayName}</option>`])
    .join()

const content = `<form>
    <div class="form-group">
        <label>Condition:</label>
        <select name="condition-selector">${options}</select>
    </div>
</form>`

new Dialog({
    title: "Condition Selector",
    content,
    buttons: {
        ok: {
            label: "<span class='pf2-icon'>1</span> Add condition",
            callback: (html) => {
                const condition = html.find("[name=condition-selector]")[0].value;
	console.log(condition);			
                        token.actor.toggleCondition(condition);
                }
        },
        cancel: {
            label: "<span class='pf2-icon'>R</span> Cancel"
        }
    },
    default: "cancel",
}).render(true);
