//GM Group Perception Roller

if ( !game.user.isGM ) { return ui.notifications.info("This is a GM only macro") }

const exceptions = [
	"vehicle",
	"loot",
	"hazard",
	"party",
];
let content = "<table>";
for ( const t of canvas.tokens.placeables) {
	if ( !exceptions.includes(t.actor.type) && t.actor.hasPlayerOwner ) {
		const {result,total,dice} = await new Roll(`1d20 + ${t.actor.perception.mod}`).evaluate();
		let color = "";
		if ( dice[0].total === 1 ) {
			color = `style="color:red"`;
		}
		if ( dice[0].total === 20 ) {
			color = `style="color:green"`;
		}
		content += `
			<tr>
			<th>${t.actor.name}</th>
			<td>1d20 + ${t.actor.perception.mod}</td>
			<td>${result}</td>
			<th ${color}>${total}</th>
			</tr>`;
	}
}
content += `</table>`;

await ChatMessage.create({
	title:"Perception Rolls",
	content,
	type: CONST.CHAT_MESSAGE_TYPES.IC,
	whisper: [game.userId]
});
