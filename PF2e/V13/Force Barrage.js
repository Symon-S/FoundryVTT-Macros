/*
This version of the Force Barrage Macro Automatically expends slots(prepared), spell uses(spontaneous), charges(wands), and consumes scrolls.
When Wand of Shardstorm is used, it places an effect on the character that allows it to tell if you are using the lingering effect of those wands. This adds the option to terminate the effect from within the dialog box through a checkbox (nothing else happens), or select the effect and have it shoot a Force Barrage as per the wand's description.
Do not make spellcasting entries for your wands or scrolls.
For staves please use a spellcasting entry due to the nature of how staves work.
The macro will not prompt for trick magic item due to DCs being variable. May change this in the future.

This macro was modified slightly by Syven to include jb2a's animations.
Further modified by MrVauxs to be usable with and without animations.

And again by MrVauxs to include PF2e Target Damage compatibility.

Modified once again by Maximus to add compatibility with Unleash Psyche
*/

if (!token) { return ui.notifications.warn("You must have a token selected") }

const mani = ["wand-of-shardstorm-1st-rank-spell", "wand-of-shardstorm-3rd-rank-spell", "wand-of-shardstorm-5th-rank-spell", "wand-of-shardstorm-7th-rank-spell"]
if (!token.actor.itemTypes.spell.some(s => s.slug === 'force-barrage') && !token.actor.itemTypes.consumable.some(s => s.system.spell?.system?.slug === 'force-barrage') && !token.actor.itemTypes.equipment.some(s => mani.includes(s.slug))) { 
	return ui.notifications.error('You do not have Force Barrage') 
}
if (game.user.targets.ids === undefined || game.user.targets.ids.length === 0) { return ui.notifications.error('At least 1 target is required'); }

const DamageRoll = CONFIG.Dice.rolls.find(((R) => R.name === "DamageRoll"));
const mmE = token.actor.itemTypes.spellcastingEntry.filter(m => m.spells?.some(x => x.slug === 'force-barrage'));

const mmIds = [];
for (const id of token.actor.itemTypes.spell) {
	if (id.slug === 'force-barrage') { mmIds.push(id.id); }
};

const mm = [];

for (const e of mmE) {
	const spellData = await e.getSheetData();
	for (const sp of spellData.groups) {
		if (sp.uses !== undefined && sp.id !== "cantrips" && sp.uses?.value < 1) { continue; }
		let i = 0;
		for (const spa of sp.active) {
			const index = i++
			if (spa === null) { continue; }
			if (spa.spell.slug !== "force-barrage") { continue; }
			if (spa.expended) { continue; }
			if (spellData.isFocusPool && !spa.spell.isCantrip && token.actor.system.resources.focus.value === 0) { continue; }
			const level = sp.id === "cantrips" ? `Cantrip ${sp.maxRank}` : `Rank ${sp.maxRank}`;
			const lvl = sp.id === "cantrips" ? 0 : sp.maxRank;
			const rank = sp.maxRank;
			const name = spa.spell.name;
			const sname = `${name} ${level} (${e.name})`;
			mm.push({ name: sname, entryId: spellData.id, rank, lvl, spId: spa.spell.id, slug: spa.spell.slug, spell: spa.spell, index, link:spa.spell.link });
		};
	};
};

mm.sort((a, b) => {
    if (a.lvl === b.lvl)
    	return a.name
      	.toUpperCase()
      	.localeCompare(b.name.toUpperCase(), undefined, {
        	sensitivity: "base",
      	});
    return a.lvl - b.lvl;
});

for (const s of token.actor.itemTypes.consumable) {
	if (!s.system.traits.value.includes("wand") && !s.system.traits.value.includes("scroll")) { continue; }
	if (s.system.spell?.system?.slug === 'force-barrage') {
		if (s.system.traits.value.includes("wand") && s.system.uses?.value > 0) {
			mm.push({ name: `${s.name}`, rank: s.system.spell.system.location.heightenedLevel, prepared: false, entryId: s.id, wand: true, scroll: false, spont: false, link: s.link})
		}
		if (s.system.traits.value.includes("scroll")) {
			mm.push({ name: `${s.name}`, rank: s.system.spell.system.location.heightenedLevel, prepared: false, entryId: s.id, wand: false, scroll: true, spont: false, link: s.link })
		}
	}
};
for (const s of token.actor.itemTypes.equipment) {
	if (mani.includes(s.slug)) {
		mm.push({ name: `${s.name}`, rank: parseInt(s.slug.substr(19, 1)), prepared: false, entryId: s.slug, wand: true, scroll: false, spont: false, link: s.link });
	}
};

if (token.actor.itemTypes.effect.some(e => e.slug === "mani-ef")) {
	const effect = token.actor.itemTypes.effect.find(e => e.slug === "mani-ef");
	mm.unshift({ name: `${effect.name}`, rank: effect.system.level.value, prepared: false, entryId: null, wand: false, scroll: false, spont: false, link: effect.link });
}

if (mm.length === 0) { return ui.notifications.warn("You currently have no available means of casting Force Barrage"); }

const mmdd = [{ label: 'Which spell?', type: 'select', options: mm.map(n => n.name) },
{ label: 'Number of Actions?', type: 'select', options: [3, 2, 1] }
];

if (token.actor.itemTypes.effect.some(e => e.slug === "mani-ef")) { mmdd.push({ label: `Remove Effect Instead?`, type: "checkbox" }) }

const mmdiag = await quickDialog({ data: mmdd, title: `Force Barrage` });

if (mmdiag[2] === true) {
	const effect = token.actor.itemTypes.effect.find(e => e.slug === "mani-ef")
	await effect.delete();
	return;
}

const mmch = mm.find(n => n.name === mmdiag[0]);
if (mmch.entryId === null) { mmdiag[1] = 1 }

const multi = parseInt(mmdiag[1]) * Math.floor((1 + mmch.rank) / 2);

const targetIds = game.user.targets.ids;
const targets = [...game.user.targets];

const script1 = function THoverIn(event) {
	const tok = game.user.targets.find(x => x.id === event.id);
	tok._onHoverIn(event)
}

const script2 = function THoverOut(event) {
	const tok = game.user.targets.find(x => x.id === event.id);
	tok._onHoverOut(event)
}

const tdata = [];
let i = 0;
for (const t of targets) {
	++i
	if (t.actor.hasPlayerOwner) { ui.notifications.info(`${t.name} is most likely an ally`); }
	const label = t.document.displayName <= 20 && !t.actor.isOwner && t.name.includes(t.actor.name) ? `<script>${script1}${script2}</script><img src=${t.document.texture.src} style="width:50px; height:50px" onmouseover="THoverIn(this)" onmouseout="THoverOut(this)" id=${t.id}><figcaption>Target #${i}</figcaption>` : t.name;
	tdata.push({ label, type: 'number', options: 1 });
};


if (targetIds.length === 1) { tdata[0].options = [multi]; }

const tdiag = await quickDialog({ data: tdata, title: `Distribute ${multi} Barrages` });

let tot = 0;
i = undefined;
let c = 1;
const fmm = [];
for (const m of tdiag) {
	tot = tot + m
	if (i !== undefined) { i++ }
	if (i === undefined) { i = 0 }
	const name = targets[i].document.displayName <= 20 && !targets[i].actor.isOwner && targets[i].name.includes(targets[i].actor.name) ? `<img src=${targets[i].document.texture.src} style="width:50px; height:50px"><figcaption>Target #${c}</figcaption>` : targets[i].name;
	c++
	fmm.push({ name, num: m , uuid: targets[i].document.uuid })
};

if (tot > multi) { return ui.notifications.warn(`You have entered ${tot - multi} too many missiles. Please try again`) }
if (tot < multi) { return ui.notifications.warn(`You have entered ${multi - tot} too few missiles. Please try again`) }

let expend = true;
let targetNum = 0;
for (const a of fmm) {
	if (a.num === 0 || a.num === undefined) { continue; }

	let dam;
	
	if(token.actor.itemTypes.feat.some(ds => ds.slug === 'sorcerous-potency')) {

		 dam = `(${a.num}d4 + ${a.num} + ${mmch.rank})[force]`;

	} else if(token.actor.itemTypes.effect.some(ef => ef.slug === "effect-unleash-psyche")) {

		 dam = `(${a.num}d4 + ${a.num} + ${2*(mmch.rank)})[force]`;

	} else {

		 dam = `(${a.num}d4 + ${a.num})[force]`;

	}
	
	const droll = new DamageRoll(dam);
	droll.toMessage(
		{
			flags: {"pf2e-toolbelt.targetHelper.targets": [a.uuid]},
			flavor: `<strong>${a.name} was targeted by ${a.num} Force Barrage(s)</strong><br>${mmch.link}`,
			speaker: ChatMessage.getSpeaker(),
		}
	);

	if (game.modules.get("sequencer")?.active && (game.modules.get("JB2A_DnD5e")?.active || game.modules.get("jb2a_patreon")?.active)) {
		new Sequence()
		.effect()
		.file(`jb2a.magic_missile`)
		.atLocation(canvas.tokens.controlled[0])
		.stretchTo(targets[targetNum])
		.repeats(a.num, 100, 300)
		.delay(300, 600)
		.play()
	}
	targetNum++
};

const s_entry = mmE.find(e => e.id === mmch.entryId);

/* Expend slots */
if (!mmch.wand && !mmch.scroll && expend) {
	await s_entry.cast(mmch.spell, { slotId: mmch.index, rank: mmch.rank, message: false });
}


/* Wand */
if (mmch.wand) {
	if (mani.includes(mmch.entryId)) {
		if (token.actor.itemTypes.effect.some(e => e.slug === "mani-ef")) {
			const effect = token.actor.itemTypes.effect.find(e => e.slug === "mani-ef")
			await effect.delete();
		}
		if (!token.actor.itemTypes.effect.some(e => e.slug === "mani-ef")) {
			const maniEF = {
				"name": `${mmch.name} Effect`,
				"type": "effect",
				"img": "systems/pf2e/icons/equipment/wands/specialty-wands/wand-of-manifold-missiles.webp",
				"system": {
					"description": {
						"value": `<p><strong>Requirements</strong> You used Wand of Shardstorm to cast Force Barrage.</p>\n<hr />\n<p>After you cast the spell, an additional barrage or barrages are released from the wand at the start of each of your turns, as though you cast the 1-action version of force barrage. Choose targets each time. This lasts for 1 minute, until you are no longer wielding the wand, or until you try to activate the wand again.</p>`
					},
					"slug": "mani-ef",
					"level": {
						"value": mmch.rank
					},
					"duration": {
						"value": 1,
						"unit": "minutes",
						"sustained": false,
						"expiry":"turn-start"
					},
					"tokenIcon": {
						"show": true
					}
				},
			};
			await actor.createEmbeddedDocuments('Item', [maniEF]);
		}
	}
	else {
		const w = token.actor.itemTypes.consumable.find(id => id.id === mmch.entryId);
		const wData = duplicate(w);
		wData.system.uses.value--;
		await actor.updateEmbeddedDocuments('Item', [wData]);
	}
}

/* Scroll */
if (mmch.scroll) {
	const s = token.actor.itemTypes.consumable.find(id => id.id === mmch.entryId);
	if (s.system.quantity > 1) {
		const sData = duplicate(s);
		sData.system.quantity--;
		await actor.updateEmbeddedDocuments('Item', [sData]);
	}
	else { await s.delete(); }
}


/* Dialog box */
async function quickDialog({ data, title = `Quick Dialog` } = {}) {
	data = data instanceof Array ? data : [data];

	return await new Promise(async (resolve) => {
		let content = `
			<table style="width:100%">
		  	${data.map(({ type, label, options }, i) => {
			if (type.toLowerCase() === `select`) {
				return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><select style="font-size:12px" id="${i}qd">${options.map((e, i) => `<option value="${e}">${e}</option>`).join(``)}</td></tr>`;
			} else if (type.toLowerCase() === `checkbox`) {
				return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" id="${i}qd" ${options || ``}/></td></tr>`;
			} else {
				return `<tr><th style="width:90%"><label>${label}</label></th><td style="width:10%"><input type="${type}" style="text-align:center" id="${i}qd" value="${options instanceof Array ? options[0] : options}"/></td></tr>`;
			}
		}).join(``)}
			</table>`;

		await new Dialog({
			title, content,
			buttons: {
				Ok: {
					label: `Ok`, callback: (html) => {
						resolve(Array(data.length).fill().map((e, i) => {
							let { type } = data[i];
							if (type.toLowerCase() === `select`) {
								return html.find(`select#${i}qd`).val();
							} else {
								switch (type.toLowerCase()) {
									case `text`:
									case `password`:
									case `radio`:
										return html.find(`input#${i}qd`)[0].value;
									case `checkbox`:
										return html.find(`input#${i}qd`)[0].checked;
									case `number`:
										return html.find(`input#${i}qd`)[0].valueAsNumber;
								}
							}
						}));
					}
				}
			},
			default: 'Ok'
		})._render(true);
		document.getElementById("0qd").focus();
	},{width:"auto",height:"auto"});
}