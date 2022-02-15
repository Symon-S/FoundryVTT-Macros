if (!token.actor.itemTypes.spell.some(h => h.slug === 'harm')) { return ui.notifications.error('You do not possess the harm spell') }

if (token === undefined) {
	return ui.notifications.warn('No token is selected.');
}

async function CheckFeat(slug) {
	if (token.actor.items.find((i) => i.slug === slug && i.type === 'feat')) {
		return true;
	}
	return false;
}

async function CheckSpell(slug) {
	if (token.actor.items.find((i) => i.slug === slug && i.type === 'spell')) {
	    	return true;
	}
	return false;
}

async function CheckStaff(slug) {
	if (token.actor.items.find((i) => i.slug === slug && i.type === 'weapon' && i.isEquipped === true)) {
	    	return true;
	}
	return false;
}

async function CheckEffect(slug) {
	if (token.actor.items.find((i) => i.slug === slug && i.type === 'effect')) {
	    	return true;
	}
	return false;
}
    
async function CheckEquip(slug) {
        if (token.actor.items.find((i) => i.slug === slug && i.type === 'equipment' && i.isEquipped === true)) {
            	return true;
        }
        return false;
}

for (const token of canvas.tokens.controlled) {

	const hE = token.actor.itemTypes.spellcastingEntry.filter(m => m.spells.some(x => x.slug === 'harm') === true);

	const hIds = [];
	token.actor.itemTypes.spell.forEach(id => {
	if(id.slug === 'harm') { hIds.push(id.id); }
	});

	const h = [];

	hE.forEach(e => {
		if (e.isPrepared && !e.isFlexible) {
			Object.entries(e.data.data.slots).forEach(sl => {
				let lv = parseInt(sl[0].substr(4));
				Object.entries(sl[1].prepared).forEach(p => {
					if(hIds.includes(p[1].id) && !p[1].expended) {
						h.push({name: `Harm lv${lv} (${e.name})`, level: lv, prepared: true, slot: sl[0], prepkey: p[0], entryId: e.id })
					}
				})
			});
		}
		else {
			const spellData = e.getSpellData();
			spellData.levels.forEach(sp => {
				if(sp.isCantrip || sp.uses.value === 0 || sp.uses.max === 0 ) { return; }
				sp.active.forEach(spa => {
					if(spa.chatData.slug === 'harm'){ h.push({name: `Harm lv${sp.level} (${e.name})`, level: sp.level, prepared: false, entryId: e.id })}
				})
			});
		}
	});

token.actor.itemTypes.consumable.forEach(s => {
	if (!s.data.data.traits.value.includes("wand") && !s.data.data.traits.value.includes("scroll")) { return; }
	if (s.data.data.spell.data.data.slug === 'harm') { 
		if (s.data.data.traits.value.includes("wand") && s.data.data.charges.value > 0) {
			h.push({name: `${s.name}`, level: parseInt(s.slug.substr(11,1)), prepared: false, entryId: s.id , wand: true, scroll: false, spont: false,  }) 
		}
		if (s.data.data.traits.value.includes("scroll")) {
			h.push({name: `${s.name}`, level: s.data.data.spell.heightenedLevel, prepared: false, entryId: s.id, wand: false, scroll: true, spont: false })
		}
	}
});

        if(h.length === 0) { return ui.notifications.warn('You currently have no means of casting the harm spell') }
	const hdd = [{label: 'Which spell?', type: 'select', options: h.map(n => n.name)}];

	const harms = await CheckSpell('harm');
	/*Informs the player that they do not possess the heal spell in their character sheet*/
    	if (harms === false && token.actor.data.type !== 'npc') {  return ui.notifications.warn('Actor does not possess the harm spell'); }
    	if (game.user.targets.size < 1) { return ui.notifications.warn('Please target a token'); }
    	if (game.user.targets.size > 1) { return ui.notifications.warn('2-Action Harm can only affect 1 target per cast'); }

    	const target = game.user.targets.ids[0];
    	const metok = token.id;
    	const tname = canvas.tokens.placeables.find((t) => t.id === target).name;
    	if(canvas.tokens.placeables.find((t) => t.id === target).actor.data.data.traits.traits.value.find((t) => t === 'undead' || t === 'dhampir')) { var tt = true; }
    	else { var tt = false; }


       const harmingHands = await CheckFeat('harming-hands');

       const hdice = harmingHands ? 'd10' : 'd8';

       const hdiag = await quickDialog({data : hdd, title : `2-Action Harm`});

       const hch = h.find(n => n.name === hdiag[0]);
 
       const hlvl = hch.level;

       const harm1 = hlvl + hdice;
       const harm2 = hlvl * 8;
       var harmt = `${harm1} + ${harm2}`
       if (!tt) { var harmt = `${harm1}` }
       let roll = new Roll(`{${harmt}}[negative]`);
       if (token.actor.itemTypes.equipment.some((i) => i.slug === 'emerald-fulcrum-lens' && i.type === 'equipment' && i.isEquipped && i.isInvested) && target === metok && tt) { roll = new Roll(`{${harmt}}[negative] + {4}[status,negative]`); }
       const harmf = `2-Action Lv ${hlvl} Harm spell targeting ${tname}`;
       await roll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor: `<strong>${harmf}</strong>`});

	const s_entry = hE.find(e => e.id === hch.entryId);

	/* Expend slots */
	/* Spontaneous, Innate, and Flexible */
	if (!hch.prepared && !hch.wand && !hch.scroll) {
		let data = duplicate(s_entry.data);
        	Object.entries(data.data.slots).forEach(slot => {
            		if (parseInt(slot[0].substr(4)) === hch.level && slot[1].value > 0) { 
              			slot[1].value-=1;
              			s_entry.update(data);
            		}
        	})
	}
      
	/* Prepared */
	if (hch.prepared && !hch.wand && !hch.scroll) { 
		let data = duplicate(s_entry.data);
        	Object.entries(data.data.slots).forEach(slot => {
            		if (slot[0] === hch.slot) {
              			slot[1].prepared[hch.prepkey].expended = true;
              			s_entry.update(data);
            		}
        	})

	}

	/* Wand */
	if (hch.wand) {
		const w = token.actor.itemTypes.consumable.find(id => id.id === hch.entryId);
		const wData = duplicate(w.data);
		wData.data.charges.value --;
		w.update(wData);
	}

	/* Scroll */
	if(hch.scroll){
		const s = token.actor.itemTypes.consumable.find(id => id.id === hch.entryId);
		if (s.data.data.quantity.value > 1) {
			const sData = duplicate(s.data);
			sData.data.quantity.value --;
			s.update(sData);
		}
		else { await s.delete(); }
	}

}

/* Dialog box */
async function quickDialog({data, title = `Quick Dialog`} = {}) {
	data = data instanceof Array ? data : [data];

	return await new Promise(async (resolve) => {
	        let content = `
        	<table style="width:100%">
          	${data.map(({type, label, options}, i)=> {
          		if(type.toLowerCase() === `select`)
          	{
          		return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><select id="${i}qd">${options.map((e,i)=> `<option value="${e}">${e}</option>`).join(``)}</td></tr>`;
          	}else if(type.toLowerCase() === `checkbox`){
            		return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" id="${i}qd" ${options || ``}/></td></tr>`;
          	}else{
            		return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" id="${i}qd" value="${options instanceof Array ? options[0] : options}"/></td></tr>`;
          	}
          	}).join(``)}
        	</table>`;

        await new Dialog({
         title, content,
         buttons : {
           Ok : { label : `Ok`, callback : (html) => {
             resolve(Array(data.length).fill().map((e,i)=>{
               let {type} = data[i];
               if(type.toLowerCase() === `select`)
               {
                 return html.find(`select#${i}qd`).val();
               }else{
                 switch(type.toLowerCase())
                 {
                   case `text` :
                   case `password` :
                   case `radio` :
                   return html.find(`input#${i}qd`)[0].value;
                  case `checkbox` :
                  return html.find(`input#${i}qd`)[0].checked;
                  case `number` :
                  return html.find(`input#${i}qd`)[0].valueAsNumber;
                }
              }
            }));
          }}
        },
        default : 'Ok'
        })._render(true);
        document.getElementById("0qd").focus();
      });
    }
