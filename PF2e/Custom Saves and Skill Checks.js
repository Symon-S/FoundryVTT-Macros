/* This is a modded version of the Custom Saves macro originally created by Tik.
This version adds the ability to create a skill check aside from just saves.
It also handles level based saves and skill checks as well as difficulty adjustements for skill check.
You can either enter a level between 0 and 25 for an appropriate level based DC for saves and skills,
or you can set a custom DC. The difficulty adjustment changes the difficulty by the appropriate amount as per RAW.
Setting a difficulty adjustement will also change the custom DC that is set.
If no values are entered, the macro defaults to DC 10.
If the custom value and the level based DC are used simultaniously, the larger DC is used (before adjustment for skill checks)
Add whatever text you would like to post along with the check to chat in the flavor section.
Add traits to ensure applicable mods will trigger if needed.
*/

let lvl = "";
if (canvas.tokens.controlled.length === 1) { lvl = token.actor.level; }
if (canvas.tokens.controlled.length > 1) { lvl = Math.max(...canvas.tokens.controlled.map(l => l.actor.level)); }

const ldc = [14,15,16,18,19,20,22,23,24,26,27,28,30,31,32,34,35,36,38,39,40,42,44,46,48,50];

let answer = "";
async function Answers(){
    answer = await new Promise((resolve) => {
        new Dialog({
            title: "To Journal or Message?",
            buttons:{
                message: {
                label: "Message",
                callback: async() => { resolve('message') }
                },
                journal: {
                label: "Journal",
                callback: async() => { resolve('journal') }
                },
            },
            default:'message'
        }).render(true);
    })
}

const check = new Dialog({
    title: "Save or Skill Check?",
    buttons: {
        yes: {
            label: 'Custom Saves',
            callback: customSaves,
        },
        no: {
            label: 'Skill Checks',
            callback: skillCheck,
        },
        cancel: {
            label: 'Cancel',
        },
    },
    default: 'yes',
});

check.render(true);

async function customSaves() {
async function postSave($html) {
    const adjDif = parseInt($html.find('[name="adj"]')[0].value);
    const lbdc = parseInt($html.find('[name="lbdc"]')[0].value);
    const bst = $html.find('[name="bst"]')[0].checked;
console.log(bst);
    if (lbdc > 25 || lbdc < 0) { return ui.notifications.warn("Level Based DC's are between level 0 and 25"); }
    let DC;
    if (lbdc !== NaN) { DC = ldc[lbdc]; }
    const dc = parseInt($html.find('[name="dc"]')[0].value) || '';
    if (DC === undefined && (dc === '' || dc < 0)) { DC = 10; }
    if (dc !== '' && (dc > DC || DC === undefined)) { DC = dc; }
    DC += adjDif;
    const save = $html.find('[name="save"]')[0].value || 'fortitude';
    const traits = $html.find('[name="traits"]')[0].value || '';
    const flavor = $html.find('[name="flavor"]')[0].value || '';
    let content = `@Check[type:${save}|traits:${traits}|dc:${DC}|basic:${bst}]`;
    content += (flavor) ? `{${flavor}}` : "";
    await Answers();
    if (answer === 'message') {
        ChatMessage.create({
            user: game.user.id,
            content: content
        });
    }
    if (answer === 'journal') {
        if (!game.journal.some(j => j.name === "Custom Saves and Skill Checks")) {
            await JournalEntry.create(new JournalEntry({_id:randomID(),name:"Custom Saves and Skill Checks", pages: [await(new JournalEntryPage({_id:randomID(),name:"To Send to Chat",text:{content}})).toObject()]}));
            ui.notifications.info('New Jounral "Custom Saves and Skill Checks" created');
        }
        else { 
            const page = game.journal.find(x => x.name === "Custom Saves and Skill Checks").pages.contents[0];
            page.text.content += "<br>" + content;
            await game.journal.find(x => x.name === "Custom Saves and Skill Checks").updateEmbeddedDocuments("JournalEntryPage",[page]);
            await game.journal.find(x => x.name === "Custom Saves and Skill Checks").render();
            ui.notifications.info(`New Entry ${content} added to Custom Saves and Skill Checks journal`);
        }
    }
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
        <label>Basic Saving Throw?</label>
        <input id="bst" name="bst" type="checkbox" checked="checked">
        </div>
        </form>
        <form>
        <div class="form-group">
        <label>Level based DC:</label>
        <input id="lbdc" name="lbdc" type="number" value="${lvl}">
        </div>
        </form>
        <form>
        <div class="form-group">
        <label>Custom DC:</label>
        <input id="dc" name="dc" type="number"/>
        </div>
        </form>
        <form>
        <div class="form-group">
        <label>Adjust Difficulty:</label>
        <select id="adj" name="adj">
        <option value=0>None</option>
        <option value=-10>Incredibly Easy</option>
        <option value=-5>Very Easy</option>
        <option value=-2>Easy</option>
        <option value=2>Hard</option>
        <option value=5>Very Hard</option>
        <option value=10>Incredibly Hard</option>
        </select>
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
        <label>Traits (poison,fire,damaging-effect...):</label>
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
}
async function skillCheck() {

const skillType = await new Promise((resolve) => {
new Dialog({
    title: "Which Skill?",
    buttons: {
     acr: {
      label: 'Acrobatics',
      callback: async() => { resolve('acrobatics'); }
     },
     arc: {
      label: 'Arcana',
      callback: async() => { resolve('arcana'); },
     },
     ath: {
      label: 'Athletics',
      callback: async() => { resolve('athletics'); },
     },
     crf: {
      label: 'Crafting',
      callback: async() => { resolve('crafting'); },
     },
     dcp: {
      label: 'Deception',
      callback: async() => { resolve('deception'); },
     },
     dip: {
      label: 'Diplomacy',
      callback: async() => { resolve('diplomacy'); },
     },
     int: {
      label: 'Intimidation',
      callback: async() => { resolve('intimidation'); },
     },
     med: {
      label: 'Medicine',
      callback: async() => { resolve('medicine'); },
     },
     nat: {
      label: 'Nature',
      callback: async() => { resolve('nature'); },
     },
     occ: {
      label: 'Occultism',
      callback: async() => { resolve('occultism'); },
     },
     per: {
      label: 'Performance',
      callback: async() => { resolve('performance'); },
     },
     rel: {
      label: 'Religion',
      callback: async() => { resolve('religion'); },
     },
     soc: {
      label: 'Society',
      callback: async() => { resolve('society'); },
     },
     sth: {
      label: 'Stealth',
      callback: async() => { resolve('stealth'); },
     },
     sur: {
      label: 'Survival',
      callback: async() => { resolve('survival'); },
     },
     thi: {
      label: 'Thievery',
      callback: async() => { resolve('thievery'); },
     },
    },
 }).render(true);
});

async function postSkill($html) {
    const adjDif = parseInt($html.find('[name="adj"]')[0].value);
    const lbdc = parseInt($html.find('[name="lbdc"]')[0].value);
    if (lbdc > 25 || lbdc < 0) { return ui.notifications.warn("Level Based DC's are between level 0 and 25"); }
    let DC;
    if (lbdc !== NaN) { DC = ldc[lbdc]; }
    const dc = parseInt($html.find('[name="dc"]')[0].value) || '';
    if (DC === undefined && (dc === '' || dc < 0)) { DC = 10; }
    if (dc !== '' && (dc > DC || DC === undefined)) { DC = dc; }
    const traits = $html.find('[name="traits"]')[0].value || '';
    const flavor = $html.find('[name="flavor"]')[0].value || '';
    DC += adjDif;
    let content = `@Check[type:${skillType}|traits:${traits}|dc:${DC}]`;
    content += (flavor) ? `{${flavor}}` : "";

    await Answers();
    if (answer === 'message') {
        ChatMessage.create({
            user: game.user.id,
            content: content
        });
    }
    if (answer === 'journal') {
        if (!game.journal.some(j => j.name === "Custom Saves and Skill Checks")) {
            await JournalEntry.create(new JournalEntry({_id:randomID(),name:"Custom Saves and Skill Checks", pages: [await(new JournalEntryPage({_id:randomID(),name:"To Send to Chat",text:{content}})).toObject()]}));
            ui.notifications.info('New Jounral "Custom Saves and Skill Checks" created');
        }
        else { 
            const page = game.journal.find(x => x.name === "Custom Saves and Skill Checks").pages.contents[0];
            page.text.content += "<br>" + content;
            await game.journal.find(x => x.name === "Custom Saves and Skill Checks").updateEmbeddedDocuments("JournalEntryPage",[page]);
            await game.journal.find(x => x.name === "Custom Saves and Skill Checks").render();
            ui.notifications.info(`New Entry ${content} added to Custom Saves and Skill Checks journal`);
        }
    }
}

const dialog = new Dialog({
    title: 'New Skill Check',
    content: `
        <form>
        <div class="form-group">
        <label>Level based DC:</label>
        <input id="lbdc" name="lbdc" type="number" value="${lvl}">
        </div>
        </form>
        <form>
        <div class="form-group">
        <label>Custom DC:</label>
        <input id="dc" name="dc" type="number"/>
        </div>
        </form>
        <form>
        <div class="form-group">
        <label>Adjust Difficulty:</label>
        <select id="adj" name="adj">
        <option value=0>None</option>
        <option value=-10>Incredibly Easy</option>
        <option value=-5>Very Easy</option>
        <option value=-2>Easy</option>
        <option value=2>Hard</option>
        <option value=5>Very Hard</option>
        <option value=10>Incredibly Hard</option>
        </select>
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
            label: 'Post Check',
            callback: postSkill,
        },
        no: {
            label: 'Cancel',
        },
    },
    default: 'yes',
});

dialog.render(true);
}
