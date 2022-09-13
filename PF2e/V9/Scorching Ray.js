/*
Scorching Ray 1 to 3 action macro.
Target the appropriate amount of targets for the amount of actions spent.
*/

if (!token.actor.itemTypes.spell.some(s => s.slug === 'scorching-ray') && !token.actor.itemTypes.consumable.some(s => s.data.data.spell?.data?.data?.slug ==='scorching-ray')) { return ui.notifications.error('You do not have Scorching Ray') }
if (game.user.targets.ids === undefined || game.user.targets.ids.length === 0) { return ui.notifications.error('At least 1 target is required'); }

const srE = token.actor.itemTypes.spellcastingEntry.filter(m => m.spells.some(x => x.slug === 'scorching-ray') === true);

const sr = [];

srE.forEach(e => {
          const spellData = e.getSpellData();
	  spellData.levels.forEach(sp => {
            if(sp.uses !== undefined && !sp.isCantrip && sp.uses.value < 1) { return; }
	    sp.active.forEach((spa,index) => {
	      if(spa === null) { return; }
              if(spa.spell.slug !== 'scorching-ray') { return; }
              if(spa.expended) { return; }
              if(spellData.isFocusPool && !spa.spell.isCantrip && token.actor.data.data.resources.focus.value === 0){ return; }
              let level = `lv${sp.level}`
              const name = spa.spell.name;
	      const sname = `${name} ${level} (${e.name})`;
              sr.push({name: sname, entryId: spellData.id, level: sp.level, spId: spa.spell.id, slug: spa.spell.slug, DC: e.data.data.statisticData.dc.value, spell: spa.spell, index: index});
	    });
	  });
});	

token.actor.itemTypes.consumable.forEach(s => {
	if (!s.data.data.traits.value.includes("wand") && !s.data.data.traits.value.includes("scroll")) { return; }
	if (s.data.data.spell.data.data.slug === 'scorching-ray') { 
		if (s.data.data.traits.value.includes("wand") && s.data.data.charges.value > 0) {
			sr.push({name: `${s.name}`, level: parseInt(s.slug.substr(11,1)), prepared: false, entryId: s.id , wand: true, scroll: false, spont: false,  }) 
		}
		if (s.data.data.traits.value.includes("scroll")) {
			sr.push({name: `${s.name}`, level: s.data.data.spell.heightenedLevel, prepared: false, entryId: s.id, wand: false, scroll: true, spont: false })
		}
	}
});

if (sr.length === 0) { return ui.notifications.warn("You currently have no available means of casting Scorching Ray");}

const srdd = [{label: 'Which spell?', type: 'select', options: sr.map(n => n.name)},
	      {label: 'Number of Actions?', type: 'select', options: [3,2,1]}
	     ];


const srdiag = await quickDialog({data : srdd, title : `Scorching Ray`});

const srch = sr.find(n => n.name === srdiag[0]);

const targetIds = game.user.targets.ids;
const targets = canvas.tokens.placeables.filter(t => targetIds.includes(t.id));

if(parseInt(srdiag[1]) < targets.length) { return ui.notifications.warn('You need to target an amount of tokens less than or equal to the amount of actions chosen'); }

let ttags = '';
srch.spell.data.data.traits.value.forEach( t => {
      ttags = ttags + `<span class="tag tooltipstered" data-trait="${t}" data-description="PF2E.TraitDescription${t[0].toUpperCase() + t.substring(1)}">${t[0].toUpperCase() + t.substring(1)}</span>`
});

let dam = token.actor.itemTypes.feat.some(ds => ds.slug === 'dangerous-sorcery') ? `{${srch.level + 2}d6}[fire] + {${srch.level}}[status,force]` : `{${srch.level + 2}d6}[fire]`;
if ( srdiag[1] > 1 ) { dam = token.actor.itemTypes.feat.some(ds => ds.slug === 'dangerous-sorcery') ? `{${(2*srch.level) + 4}d6}[fire] + {${srch.level}}[status,force]` : `{${(2*srch.level) + 4}d6}[fire]`; }

let aRDSA = false;
if (game.modules.has('xdy-pf2e-workbench') && game.modules.get('xdy-pf2e-workbench').active && game.settings.get("xdy-pf2e-workbench","autoRollDamageForSpellAttack")) {
 aRDSA = true;
 await game.settings.set("xdy-pf2e-workbench","autoRollDamageForSpellAttack",false);
}

async function Aroll(a) {
            game.user.updateTokenTargets([a.id]);
            await srch.spell.rollAttack({event});
}

targets.forEach(async a => {
         await Aroll(a);
});

await new Promise((resolve) => { setTimeout(resolve, 300) });

targets.forEach(async a => {
              const suc = game.messages.contents.reverse().find(x => x.isCheckRoll && x.actor === token.actor && x.target.token.id === a.id).data.flags.pf2e.context.outcome;
            if ( suc === "success" || suc === "criticalSuccess" ) {
               let success = "(Success)"
               if (suc === "criticalSuccess") { success = "(Critical Success)"; }
	       const droll = new Roll(dam);
               await droll.toMessage({ flavor: `<strong>Scorching targeting ${a.name}</strong><br><a class="entity-link content-link" data-pack="pf2e.spells-srd" data-id="ZxHC7V7HtjUsB8zH"><strong>Scorching Ray</strong></a> ${success}<div class="tags">${ttags}</div>`, speaker: ChatMessage.getSpeaker() });
             }
});

game.user.updateTokenTargets(targetIds);

if (aRDSA) { await game.settings.set("xdy-pf2e-workbench","autoRollDamageForSpellAttack",true); }

const s_entry = srE.find(e => e.id === srch.entryId);

/* Expend slots */
if (!srch.wand && !srch.scroll) { 
  await s_entry.cast(srch.spell,{slot: srch.index,level: srch.level,message: false});
}


/* Wand */
if (srch.wand) {
		  const w = token.actor.itemTypes.consumable.find(id => id.id === srch.entryId);
		  const wData = duplicate(w.data);
		  wData.data.charges.value --;
		  w.update(wData);
}

/* Scroll */
if(srch.scroll){
	const s = token.actor.itemTypes.consumable.find(id => id.id === srch.entryId);
	if (s.data.data.quantity > 1) {
		const sData = duplicate(s.data);
		sData.data.quantity --;
		s.update(sData);
	}
	else { await s.delete(); }
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
          		return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><select style="font-size:12px" id="${i}qd">${options.map((e,i)=> `<option value="${e}">${e}</option>`).join(``)}</td></tr>`;
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
