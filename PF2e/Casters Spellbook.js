/*
Welcome to the Caster's Spellbook.
This macro was designed to facilitate casting spells from a
character with a large list of spells, like a dual class double caster
build, or a caster with multiple spellcasting entries.
This macro will sort by the spellcasting entries, available spell levels,
and finally the spells you have at those levels
Left clicking on the spell expends the slot/uses/focus point and
posts the spell to the Chat Log.
Right clicking on the spell pops open the spell edit sheet same as if you had edited
the spell from within your character sheet.
*/

if(canvas.tokens.controlled.length === 0) { return ui.notifications.warn("Please select a token"); }
if (canvas.tokens.controlled.length > 1) { return ui.notifications.warn("Please select only 1 token"); }
if (!token.actor.isSpellcaster) { return ui.notifications.warn(`${token.actor.name} is not a Spellcaster`); }

const script = async function Spells(id){
  for (const token of canvas.tokens.controlled) {
		let spells = [];
		let buttons = {};
		const spellData = await (token.actor.itemTypes.spellcastingEntry.find( i => i.id === id)).getSpellData();
				spellData.levels.forEach(sp => {
					if(!spellData.isRitual && !spellData.isPrepared && !spellData.isInnate && !spellData.isFocusPool && !spellData.isFlexible && !sp.isCantrip && sp.uses.value < 1) { return; }
                                        if (sp.uses?.value !== undefined && sp.uses?.value === 0 ) { return; }
					sp.active.forEach((spa,index) => {
						if(spa === null) { return; }
						if(spa.expended) { return; }
						if(spa.spell.isFocusSpell && !spa.spell.isCantrip && token.actor.system.resources.focus.value === 0) { return; }
						let type = '';
						if (spellData.isRitual) { type = 'ritual'}
						spells.push({name: spa.spell.name, spell: spa, lvl: sp.level, type: type, index: index, sEId: spellData.id});
					});
				});
			
			spells.sort((a, b) => {
				if (a.lvl === b.lvl)
				return a.name
				.toUpperCase()
				.localeCompare(b.name.toUpperCase(), undefined, {
					sensitivity: "base",
				});
				return a.lvl - b.lvl;
			});

			if(spells.length === 0) { return ui.notifications.info("You have no spells available or are out of focus points"); }

		await Levels();

		async function Levels() {
			buttons = {};
			let levels = [...new Set(spells.map(l => l.lvl))];
			levels.forEach((index,value)=> {
					if (index === 0) { index = 'Cantrip'}
				async function Filter(){
					if (index === 'Cantrip') { spells = spells.filter(c => c.spell.spell.isCantrip); }
					else{ spells = spells.filter(l => l.lvl === index); }
				}
				buttons[value] = {label: index, callback: async () => { await Filter(); await Spell(); }}
			});
			await Diag({title: "Spell Level?", buttons});
		}

		async function Spell() {
			buttons = {};
			spells.forEach((value,index) => {
		          async function Consume(){
			    const s_entry = token.actor.itemTypes.spellcastingEntry.find(e => e.id === value.sEId);
			    await s_entry.cast(value.spell.spell,{slot: value.index,level: value.lvl,message: true})
			    };
				buttons[index] = {label: value.name, value: value.spell.spell ,callback: async () => {  await Consume(); }}
			});
			await Diag({title: "Pick a Spell to Cast", buttons});
			spells.forEach( async s => {
        const elements = await document.getElementsByClassName("dialog-button");
        let myElem1 = [...document.getElementsByClassName("app window-app dialog")].pop();
        myElem1.style.display = "flex";
        myElem1.style.flexWrap = "wrap";
        myElem1.style.height = "auto";
        myElem1.style.width = "200px";
        myElem1.style.gap = "5px 5px";
        let myElem2 = [...document.getElementsByClassName("dialog-buttons")].pop();
        myElem2.style.display = "flex";
        myElem2.style.flexFlow = "column wrap";
        let element;
				for (var i = 0; i < elements.length; i++) {
          if (elements[i].innerText === s.name) {
            element = elements[i];

						element.style.lineHeight = "normal";
						await $(element).bind("contextmenu", function () { 
        		s.spell.spell.sheet.render(true);
						});
          }
      	}
			});
		};
	}
	async function Diag({title,buttons,content} = {}) {
		await new Promise((resolve) => {
			new Dialog({
				title,
				buttons,
			}).render(true);
      setTimeout(resolve,10);
		});
	}
 }

  
let content = `
<style>
  .psya-buttons {
    margin: 0 auto;
  }

  .psya-buttons:hover {
    background-color:#44c767;
  }
</style>
<div><strong>Choose a Spellcasting Entry:</strong></div><script>${script}
</script>`;
token.actor.itemTypes.spellcastingEntry.forEach((value,index) => {
  const test = value.getSpellData();
  if (test.isFocusPool && !test.levels.some(x => x.isCantrip) && token.actor.system.resources.focus.value === 0){ return; }
  content = content + `<button name="button${index}" class="psya-buttons ${index}" type="button" value="${value.name}" onclick="Spells('${value.id}')">${value.name}</button>`
});  

await new Promise(async (resolve) => {
    setTimeout(resolve,200);
 await new Dialog({
    title:"Spellbook",
    content,
    buttons:{ Close: { label: "Close" } },
    },{width: 210}).render(true);
});


let myElem = [...document.getElementsByClassName("app window-app dialog")].pop();
if (myElem.style === undefined) { myElem = [...document.getElementsByClassName("app window-app dialog")].pop(); }
myElem.style.resize = "both";
myElem.style.overflow = "auto";
