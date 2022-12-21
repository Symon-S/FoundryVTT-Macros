/*
Simple Macro that makes it look like the token is falling
*/

const height = await Dialog.wait({
    title: "Simulate Falling",
    content: `<table><tr><th>Height to set?</th> <th><input type="number" autofocus onfocus="this.select()" value=0></th></tr></table>`,
    buttons: {
        ok: {
            icon: '<i class="fa-solid fa-person-falling"></i>',
            label: "Fall",
            callback: (html) => {
                return html[0].querySelector("input").value;
            }
        },
        cancel: {
            label: "Cancel",
        }
    },
    default: "ok",
},{width:300});

if (height === "cancel") { return }

for (const t of canvas.tokens.controlled) {
    const proto = t.actor.prototypeToken.texture;
    const isReduced = t.document.texture.scaleX !== proto.scaleX;
    const isLinked = t.actor.prototypeToken.flags.pf2e.linkToActorSize;
    if (!isReduced && isLinked) {
        await t.document.setFlag("pf2e","linkToActorSize",false);
    }
    if (isReduced && isLinked) {
        await t.document.setFlag("pf2e","linkToActorSize",true)
    }

    await t.document.update({
        "texture.scaleX": isReduced ? proto.scaleX : (proto.scaleX * 0.6),
        "texture.scaleY": isReduced ? proto.scaleY : (proto.scaleY * 0.6),
        alpha: isReduced ? 1 : 0.3,
        elevation: parseInt(height)
    });
}
