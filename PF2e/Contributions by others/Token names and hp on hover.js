// Sets prototype tokens to show name and HP on hover
const actorUpdate = game.actors.map(e => ({
    _id: e.id,
    "token.displayBars": CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
    "token.displayName": CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
    "token.bar1": {attribute: "attributes.hp"},
    "token.bar2": {attribute: null}
}));
await Actor.updateDocuments(actorUpdate);
ui.notifications.info("PROTOTYPE TOKENS UPDATED");
// Sets scene tokens to show name and HP on hover
let scene = game.scenes.active;
let tokenUpdates = scene.data.tokens.map(e => ({
    _id: e.id,
    displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
    displayName: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
    bar1: {attribute: "attributes.hp"},
    bar2: {attribute: null}
}));
await scene.updateEmbeddedDocuments("Token", tokenUpdates);
ui.notifications.info(`TOKENS UPDATED on scene: ${scene.name}`);
