if (!token.actor.itemTypes.spell.some(h => h.slug === 'heal')) { return ui.notifications.error('You do not possess the heal spell') }

if (token === undefined) {
	return ui.notifications.warn('No token is selected.');
}

async function CheckFeat(slug) {
	if (token.actor.items.find((i) => i.slug === slug && i.type === 'feat')) {
		return true;
	}
	return false;
}

async function CheckAction(name) {
	if (token.actor.items.find((i) => i.name === name && i.type === 'action')) {
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

	const hE = token.actor.itemTypes.spellcastingEntry.filter(m => m.spells.some(x => x.slug === 'heal') === true);

	const hIds = [];
	token.actor.itemTypes.spell.forEach(id => {
	if(id.slug === 'heal') { hIds.push(id.id); }
	});

	const h = [];

	hE.forEach(e => {
          const spellData = e.getSpellData();
	  spellData.levels.forEach(sp => {
            if(sp.uses !== undefined && !sp.isCantrip && sp.uses.value < 1) { return; }
	    sp.active.forEach((spa,index) => {
	      if(spa === null) { return; }
              if(spa.spell.slug !== "heal") { return; }
              if(spa.expended) { return; }
              if(spellData.isFocusPool && !spa.spell.isCantrip && token.actor.data.data.resources.focus.value === 0){ return; }
              let level = `lv${sp.level}`
              const name = spa.spell.name;
	      const sname = `${name} ${level} (${e.name})`;
              h.push({name: sname, entryId: spellData.id, level: sp.level, spId: spa.spell.id, slug: spa.spell.slug, DC: e.data.data.statisticData.dc.value, spell: spa.spell, index: index});
	    });
	  });
	});	

token.actor.itemTypes.consumable.forEach(s => {
	if (!s.data.data.traits.value.includes("wand") && !s.data.data.traits.value.includes("scroll")) { return; }
	if (s.data.data.spell.data.data.slug === 'heal') { 
		if (s.data.data.traits.value.includes("wand") && s.data.data.charges.value > 0) {
			h.push({name: `${s.name}`, level: parseInt(s.slug.substr(11,1)), entryId: s.id , wand: true, scroll: false  }) 
		}
		if (s.data.data.traits.value.includes("scroll")) {
			h.push({name: `${s.name}`, level: s.data.data.spell.heightenedLevel, entryId: s.id, wand: false, scroll: true })
		}
	}
});




        if(h.length === 0) { return ui.notifications.warn('You currently have no means of casting the heal spell') }
	const hdd = [{label: 'Which spell?', type: 'select', options: h.map(n => n.name)}];

	const heals = await CheckSpell('heal');
	/*Informs the player that they do not possess the heal spell in their character sheet*/
    	if (heals === false && token.actor.data.type !== 'npc') {  return ui.notifications.warn('Actor does not possess the heal spell'); }
    	if (game.user.targets.size < 1) { return ui.notifications.warn('Please target a token'); }
    	if (game.user.targets.size > 1) { return ui.notifications.warn('2-Action Heal can only affect 1 target per cast'); }

    	const target = game.user.targets.ids[0];
    	const metok = token.id;
    	const tname = canvas.tokens.placeables.find((t) => t.id === target).name;
        let tt = false;
        let undead = false;
        if(canvas.tokens.placeables.find((t) => t.id === target).actor.data.data.traits.traits.value.some((t) => t === 'undead' || t === 'dhampir')) { undead = true; }
    	if(canvas.tokens.placeables.find((t) => t.id === target).actor.data.data.traits.traits.value.some((t) => t === 'undead' || t === 'construct')) { tt = true }

	let ahi,hhi,mhi,ddu;
        if (canvas.tokens.placeables.find((t) => t.id === target).actor.data.data.traits.traits.value.some((t) => t === 'dhampir')) {
           hdd.push({label: 'Does not affect Dhampir', type: 'checkbox'})
           ddu = hdd.findIndex(e => e.label === 'Does not affect Dhampir');
        }
	if (await CheckSpell('angelic-halo') && !undead) { 
		hdd.push({label: 'Angelic Halo', type: 'checkbox'});
		ahi = hdd.findIndex(e => e.label === 'Angelic Halo');
	}
	if (await CheckFeat('healers-halo') && !undead) { 
		hdd.push({label: `Healer's Halo`, type: 'checkbox'}) ;
		hhi = hdd.findIndex(e => e.label === `Healer's Halo`);
	}
        if(await CheckFeat('martyr') && target !== metok && !undead) { 
		hdd.push({label: `Martyr`, type: 'checkbox'}) ;
		mhi = hdd.findIndex(e => e.label === `Martyr`);
	}
	const hdiag = await quickDialog({data : hdd, title : `2-Action Heal`});
	const hch = h.find(n => n.name === hdiag[0]);

	const s_entry = hE.find(e => e.id === hch.entryId);

	/* Expend slots */
	if (!hch.wand && !hch.scroll) { 
	await s_entry.cast(hch.spell,{slot: hch.index,level: hch.level,message: false});
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
		if (s.data.data.quantity > 1) {
			const sData = duplicate(s.data);
			sData.data.quantity --;
			s.update(sData);
		}
		else { await s.delete(); }
	}


    	
	/*Staff of Healing*/
    	const staff = await CheckStaff('staff-of-healing');
    	const gstaff = await CheckStaff('staff-of-healing-greater');
    	const mstaff = await CheckStaff('staff-of-healing-major');
    	const tstaff = await CheckStaff('staff-of-healing-true');
    
    	/*Oracle Effects must be placed on character to function properly*/
        
    	let minc = await CheckEffect('effect-minor-life-curse');
    	let modc = await CheckEffect('effect-moderate-life-curse');
    	let majc = await CheckEffect('effect-major-life-curse');
        if (token.actor.itemTypes.effect.some(c => c.slug === "effect-life-curse")) {
          minc = token.actor.itemTypes.effect.some(c => c.slug === "effect-life-curse" && c.name.includes("Minor"));
          modc = token.actor.itemTypes.effect.some(c => c.slug === "effect-life-curse" && c.name.includes("Moderate"));
          majc = token.actor.itemTypes.effect.some(c => c.slug === "effect-life-curse" && c.name.includes("Major"));
        }
        console.log(minc,modc,majc);
    	/*Overflowing Life Relic ability. Must have an action named Overflowing Life in character sheet to be selectable.
    	This will be fixed to work with Relic abilities when integrated into system*/
    	const o_life = await CheckAction('Overflowing Life');
    
    	/*Angelic Halo Focus Spell*/
    	const a_halo = hdiag[ahi];
    
    	/*Healer's Halo Ancestry Feat*/
    	const h_halo = hdiag[hhi];

        /*Martyr*/
        const martyr = hdiag[mhi];

    	/*Holy Prayer Beads*/
    	const hpbeads = await CheckEquip('holy-prayer-beads');
    	const ghpbeads = await CheckEquip('holy-prayer-beads-greater');
    	if (hpbeads === true) { var bbeads = '1'}
    	if (ghpbeads === true) { var bbeads = '1d4'}
    	const plevel = token.actor.level;
    	const healingHands = await CheckFeat('healing-hands');
    	var hdice = healingHands ? 'd10' : 'd8';
    	if (!tt)  {
    	var hdice = modc ? 'd12' : hdice;
    	var hdice = majc ? 'd12' : hdice;
    	}
    	const hlvl = hch.level;
    	let heal1 = hlvl + hdice;
    	let heal2 = hlvl * 8;
    	var healt;

    	/*Staves of Life */
    	if (tstaff === true) { var staffb = 4; var healt = heal1 + "+" + heal2 + "+" + staffb; }
    	else if (mstaff === true) { var staffb = 3; var healt = heal1 + "+" + heal2 + "+" + staffb; }
    	else if (gstaff === true) { var staffb = 2; var healt = heal1 + "+" + heal2 + "+" + staffb; }
    	else if (staff === true) { var staffb = 1; var healt = heal1 + "+" + heal2 + "+" + staffb; }

	else { var healt = heal1 + "+" + heal2; }
    
 	/*Overflowing Life relic ability*/
    	if ( o_life === true && target === metok ) {
     	if ( Math.floor(plevel / 2) === 0 ) { var odice = 1; }
     	else { var odice = Math.floor(plevel / 2); }
     		var healt = healt + "+" + odice;
    	}	
    	var healt = a_halo ? healt + "+" + hlvl * 2 : healt;
        
    	if ( await CheckFeat('life-mystery') === true) {
     		if ((minc === true || modc === true || majc === true) && target === metok) { 
      		if (Math.floor(plevel / 2) === 0) { var hpenal = 1; }
      		else { var hpenal = Math.floor(plevel / 2); }
     		var healt = healt + "-" + hpenal;
     		}
    	}
    	if (target === metok && (hpbeads === true || ghpbeads === true)) { var healt = healt + "+" + bbeads;}
    	const roll = new Roll(`{${healt}}[positive]`);
    	let healf = `2-Action Lv ${hlvl} Heal spell targeting ${tname}`;
        if(canvas.tokens.placeables.find((t) => t.id === target).actor.data.data.traits.traits.value.some((t) => t === 'dhampir') && hdiag[ddu]) {
          const message = ChatMessage.applyRollMode({flavor: `<strong>${healf}</strong>`, speaker: ChatMessage.getSpeaker(), content: `You attempt to heal ${tname} but it does not appear to work`});
          return ChatMessage.create(message);
        }
        if (undead) {
         const uroll = new Roll(`{${heal1}}[positive]`);
         return await uroll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor: `<strong>${healf}</strong>`});
        }
    	await roll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor: `<strong>${healf}</strong>`});

        if(martyr) {
         const mroll = new Roll(`{${hlvl}d8}[positive]`);
         await mroll.toMessage({speaker: ChatMessage.getSpeaker(), flavor:`<strong>Martyr caused ${token.actor.name} to lose Hit Points and ${tname}to gain as many Hit Points</strong>`});
        }
        
        if(h_halo === true) { 
    		let h_heal = '1d6';
    		let h_roll = new Roll(`{${h_heal}}[positive]`);
    		await h_roll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor:`<strong>${tname} received extra healing from Healer's Halo and is immune to Healer's Halo for 10 minutes</a></strong>` });
    	}

        if (target !== metok && (hpbeads === true || ghpbeads === true)) { let beadroll = new Roll(`${bbeads}[positive]`); beadroll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor: `<strong> Prayer Beads recovery that either you or targeted player get`});}

    	if (modc === true) {  
    		let broll = new Roll(`{${hlvl}}[positive]`);
      		await broll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor: `<strong> Hit Points equal to the spell level to your choice of either one target of the spell or the creature nearest to you. You can't heal yourself in this way.</strong> This healing has the healing, necromancy, and positive traits, as well as the tradition trait of the spell.`});}
    	if (majc === true && hlvl > 4) {
      		let nlvl = hlvl - 4;
      		var healmt = nlvl + hdice + "+" + nlvl;
      		if (staffb > 0) { var healmt = healmt + "+" + staffb; }
      		var healmt = a_halo ? healmt + "+" + nlvl * 2 : healmt;
      		let croll = new Roll(`{${healmt}}[positive]`)
      		await croll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor: `<strong> You disperse positive energy in a 30-foot burst with the effects of a 3-action heal spell with a level 4 lower than that of the spell you cast. This healing occurs immediately after you finish Casting the Spell. You don't benefit from this healing. Instead, you lose double the number of Hit Points rolled for the heal spell. </strong>`});
    
    	}

	if ( await CheckFeat('communal-healing') ) {
          const c_roll = new Roll(`{${hlvl}}[positive]`);
          if (await CheckFeat('improved-communal-healing') && target === metok) { c_roll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor:`<strong>Extra healing from Improved Communal Healing to any one creature within the range of your heal spell other than yourself </strong>`});}
          if (await CheckFeat('improved-communal-healing') && target !== metok) { c_roll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor:`<strong>Extra healing from Improved Communal Healing to any one creature within the range of your heal spell</strong>`});}
          if (!await CheckFeat('improved-communal-healing') && target !== metok) { c_roll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor:`<strong>Extra healing from Communal Healing to ${token.actor.name} </strong>`});}
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
