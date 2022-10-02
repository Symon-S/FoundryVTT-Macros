// After starting the encounter and rolling initiative, GM selects TOKENS who were avoiding notice
// Macro automatically assigns visibility based on stealth initiative and perception DCs.
// Find the person who is observing in the 1st column, then move across to see what they can see.
// Once combat has started you can manually alter the visibility.
// Click any visibility state to increase, and control click to decrease (observed, hidden, unnoticed, undetected)
// Please change the variable 'colourScheme' to select which colours are displayed.
// CURRENT LIMITATIONS: Eidolons & Animal Companions are not tracked as they dont appear in the combat tracker.
// If run after the combat has started, dont select any tokens and just manually adjust visibility

const colourScheme = "alternate"; //Choices are standard, alternate, none. alternate MIGHT be colourblind compatible.
const visibility = ["observed", "hidden", "undetected", "unnoticed"]; // Change these if using non-English language
const notStartedError = `You must start the encounter first`; // Change this if using non-English language

let visColours = ["", "", "", ""];
switch (colourScheme) {
    case "alternate":
        visColours = ["", "#ccbb44", "#66ccee", "#ee6677"]; // Feel free to change these hexcodes to your preference
        break;
    case "standard":
        visColours = ["", "#ccbb44", "#228833", "#ee6677"];
}

const combatants = game.combat.combatants.contents.map(i => ({
    actorId: i.actorId,
    initiative: i.initiative,
    isNPC: i.isNPC,
    name: i.name,
    perceptionDC: i.actor.perception.dc.value,
    avoidingNotice: false
}));

const tokens = canvas.tokens.controlled;

if (combatants.length === 0) {
    ui.notifications.error(notStartedError);
} else {

    let buttonId = 1;

    for (let element of tokens) { //selected tokens are avoidingNotice
        let thisPlayer = combatants.find(c => c.actorId == element.actorId);
        if (thisPlayer) { // Eidolons and Animal companions dont appear in the combat tracker.
            thisPlayer.avoidingNotice = true;
        }
    }

    let template = `
      <head>
      <style>
      table, th, td {
        border: 1px solid black;
      }
      </style>
      </head>
    `;

    template = template + `
    <script>
      function changeVisibility (btn, visibilityStr, visColoursStr) {
//this is awful. Had to pass in as strings instead of arrays. It works, but needs fixing
        let visibility = visibilityStr.split(',');
        let visColours = visColoursStr.split(',');
        let label = document.getElementById(btn).innerHTML;
        let currentVis = visibility.indexOf(label);
        if (event.ctrlKey){
            if (currentVis != 0) { 
                currentVis = currentVis - 1;
            }
        }
        else {
            if (currentVis != visibility.length-1) { 
                currentVis = currentVis + 1;
            }
        }
        document.getElementById(btn).innerHTML = visibility[currentVis];
        document.getElementById(btn).style.backgroundColor = visColours[currentVis];
      }
    </script>
    `;

    template = template + `<table>`;

    //set up 1st row, which is empty then the names of the combatants in each subsequent column.
    template = template + `<tr>`;
    template = template + '<th> </th>' //empty first cell. Can this have a description of the columns/rows?
    for (var i = 0; i < combatants.length; i++) {
        template = template + '<th>' + combatants[i].name + '</th>';
    }
    template = template + '</tr>';


    //go through each combatant one at a time, and do the stealth/perception comparisons
    for (var j = 0; j < combatants.length; j++) {
        template = template + '<tr>';
        template = template + '<td>' + combatants[j].name + '</td>';
        for (var k = 0; k < combatants.length; k++) {
            if (j === k) {
                template = template + '<td> </td>'; //combatant doesnt need to observe themself
            } else if (combatants[k].avoidingNotice === true) {
                if (combatants[k].initiative < combatants[j].perceptionDC) {
                    template = addVisButton(template, 1, buttonId); //hidden                 
                    buttonId = buttonId + 1;
                } else {
                    if (combatants[k].initiative > combatants[j].initiative) {
                        template = addVisButton(template, 3, buttonId); //unnoticed
                        buttonId = buttonId + 1;
                    } else {
                        template = addVisButton(template, 2, buttonId); //undetected
                        buttonId = buttonId + 1;
                    }
                }
            } else {
                template = addVisButton(template, 0, buttonId); //observed
                buttonId = buttonId + 1;
            }
        }
        template = template + '</tr>';
    }

    template = template + '</table>';

    new Dialog({
        title: "Relative Visibility",
        content: template,
        buttons: {
            cancel: {
                label: "Close",
            },
        },
    }, {
        width: 'auto',
        height: 'auto'
    }).render(true);


}


function addVisButton(template, visState, buttonId) {
    template = template + '<td><button style="background-color:';
    template = template + visColours[visState] + ';" id=';
    template = template + buttonId + ' onclick="changeVisibility(this.id, \'' + visibility + '\', \'' + visColours + '\')">' + visibility[visState] + '</button></td>';
    return template;
}
