/** 
 * Simple Fate roller, select 2 or more tokens and execute macro.
 * It is recommended to import this macro if you would like to modify it.
 * You can add custom backgrounds to your fate messages by adding the links as strings to the bacgrounds array or use it without backgrounds.
 * You can change the alias to whatever you like.
 * You can modify the styling to suite your needs.
*/

if (canvas.tokens.controlled.length < 2) { return ui.notifications.info("Please select 2 or more tokens")}
const tokens = canvas.tokens.controlled;
const r = Math.floor(Math.random() * (tokens.length));
let content = `<p>Fate has been decided!<br><strong>${tokens[r].name}</strong> has been chosen!</p>`
const backgrounds = []; //array of links to backgrounds as strings
if (backgrounds.length > 0) {
    const background = backgrounds[Math.floor(Math.random() * (backgrounds.length))];
    content = `<p style='background-image: url(${background});background-size: cover;max-width: 100%;height:140px ;font-size:16px;color:yellow;text-shadow:1px 1px 1px black,2px 2px 2px red,3px 3px 3px white;'>Fate has been decided!<br><strong>${tokens[r].name}</strong> has been chosen!</p>`
}
const message = await ChatMessage.create({
	speaker: {alias:"The will of the Gods"},
    content,
});