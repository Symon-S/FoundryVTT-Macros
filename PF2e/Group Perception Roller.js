//GM Group Perception Roller

if ( !game.user.isGM ) { return ui.notifications.info("This is a GM only macro") }

const exceptions = [
	"vehicle",
	"loot",
	"hazard",
	"party",
];
let content = `<strong>Group Perception Roller</strong>
		<table>
		<tr>
			<th style="text-align:left">Name</th>
			<th style="text-align:center">Roll + Mod</th>
			<th style="text-align:center">Total</th>
		</tr>`;
for ( const t of canvas.tokens.placeables) {
	if ( !exceptions.includes(t.actor.type) && t.actor.hasPlayerOwner ) {
		const {result,total,dice} = await new Roll(`1d20 + ${t.actor.perception.mod}`).evaluate();
		const userId = Object.keys(t.actor.ownership).find(f => f !== "default" && !game.users.get(f).isGM);
		const userColor = game.users.get(userId)?.color ?? "grey";
		let color = "";
		if ( dice[0].total === 1 ) {
			color = `;font-size:115%;color:red`;
		}
		else if ( dice[0].total === 20 ) {
			color = `;font-size:115%;color:green`;
		}
		else {
			color = `;color:blue`;
		}
		content += `
			<tr>
			<th style="color:${userColor};text-shadow: 1px 1px 1px black">${t.actor.name}</th>
			<td style="text-align:center">${result}</td>
			<th style="text-align:center${color}">${total}</th>
			</tr>`;
	}
}
content += `</table>`;

await ChatMessage.create({
	content,
	type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
	whisper: [game.userId]
});
