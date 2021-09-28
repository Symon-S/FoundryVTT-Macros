/* Posts custom save buttons to chat */
/* By Tik */

async function postSave($html) {
    const DC = parseInt($html.find('[name="dc"]')[0].value) || 10;
    const save = $html.find('[name="save"]')[0].value || 'fortitude';
    const traits = $html.find('[name="traits"]')[0].value || '';
    const flavor = $html.find('[name="flavor"]')[0].value || '';
    let flavorText = ''
    if (flavor) {
        flavorText = `<p>${flavor}</p>`
    }
    let content = `${flavorText}<p><span data-pf2-check="${save}" data-pf2-traits="${traits}" data-pf2-label="${save} DC" data-pf2-dc="${DC}" data-pf2-show-dc="gm">${save}</span></p>`
    ChatMessage.create(
    {
        user: game.user.id,
        content: content
    }
    );
}

const dialog = new Dialog({
    title: 'New Save',
    content: `
        <form>
        <div class="form-group">
        <label>Save type:</label>
        <select id="save" name="save">
        <option value="fortitude">Fortitude</option>
        <option value="reflex">Reflex</option>
        <option value="will">Will</option>
        </select>
        </div>
        </form>
        <form>
        <div class="form-group">
        <label>DC:</label>
        <input id="dc" name="dc" type="number"/>
        </div>
        </form>
        <form>
        <div class="form-group">
        <label>Flavor text:</label>
        <textarea id="flavor" name="flavor"></textarea>
        </div>
        </form>
        </form>
        <form>
        <div class="form-group">
        <label>Traits (poison,fire,...):</label>
        <input type="text" id="traits" name="traits"></textarea>
        </div>
        </form>
        `
        ,
    buttons: {
        yes: {
            label: 'Post Save',
            callback: postSave,
        },
        no: {
            label: 'Cancel',
        },
    },
    default: 'yes',
});

dialog.render(true);
