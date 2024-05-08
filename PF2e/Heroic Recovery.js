/*
This Macro removes all remaining hero points and removes the dying condition as per Heroic Recovery
https://2e.aonprd.com/Rules.aspx?ID=382
It does not set hitpoints to 0, since if you are dying your hitpoints should already be 0
*/

if ( !actor || !actor.system.resources?.heroPoints?.value ) { ui.notifications.warn("You have not selected a Player character's token"); }
if ( actor.system.resources.heroPoints.value < 1 ) { return void ui.notifications.info(`${token.name} is out of hero points`) }
if ( !actor.hasCondition("dying") ) { return void ui.notifications.info(`${token.name} is not dying`) }
await actor.update({"system.resources.heroPoints.value": 0});
await actor.toggleCondition("dying");
await ChatMessage.create({
    content: `${token.name} performs a heroic recovery, expending all remaining hero points, and is no longer dying`,
    type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
    speaker: ChatMessage.getSpeaker()
});