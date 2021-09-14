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
    async function applyChanges($html) {
	for (const token of canvas.tokens.controlled) {
    const heals = await CheckSpell('heal');
    /*Informs the player that they do not possess the heal spell in their character sheet*/
    if (heals === false && token.actor.data.type != 'npc') { ui.notifications.warn('Actor does not possess the heal spell'); }
    else if (game.user.targets.size < 1) { ui.notifications.warn('Please target a token'); }
    else if (game.user.targets.size > 1) { ui.notifications.warn('2-Action Heal can only affect 1 target per cast'); }
    else{
    const target = game.user.targets.ids[0];
    const metok = token.id;
    const tname = canvas.tokens.placeables.find((t) => t.id === target).name;
    if(canvas.tokens.placeables.find((t) => t.id === target).actor.data.data.traits.traits.value.find((t) => t === 'undead' || t=== 'construct')) {
     var tt = true; }
    else { var tt = false; }
    /*Staff of Healing*/
    const staff = await CheckStaff('staff-of-healing');
    const gstaff = await CheckStaff('staff-of-healing-greater');
    const mstaff = await CheckStaff('staff-of-healing-major');
    const tstaff = await CheckStaff('staff-of-healing-true');
    
    /*Oracle Effects must be placed on character to function properly*/
    const minc = await CheckEffect('effect-minor-life-curse');
    const modc = await CheckEffect('effect-moderate-life-curse');
    const majc = await CheckEffect('effect-major-life-curse');
    
    /*Overflowing Life Relic ability. Must have an action named Overflowing Life in character sheet to be selectable.
    This will be fixed to work with Relic abilities when integrated into system*/
    const o_life = await CheckAction('Overflowing Life');
    
    /*Angelic Halo Focus Spell*/
    const a_halo = $html.find('[name="a_h_bool"]')[0]?.checked;
    
    /*Healer's Halo Ancestry Feat*/
    const h_halo = $html.find('[name="h_h_bool"]')[0]?.checked;
    
    /*Holy Prayer Beads*/
    const hpbeads = await CheckEquip('holy-prayer-beads');
    const ghpbeads = await CheckEquip('holy-prayer-beads-greater');
    if (hpbeads === true) { var bbeads = '1'}
    if (ghpbeads === true) { var bbeads = '1d4'}
    const plevel = token.actor.level;
    const healingHands = await CheckFeat('healing-hands');
    var hdice = healingHands ? 'd10' : 'd8';
    if (tt === false )  {
    var hdice = modc ? 'd12' : hdice;
    var hdice = majc ? 'd12' : hdice;
    }
    const hlvl = parseInt($html.find('[name="modifier"]').val()) || 1;
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
    
    if(h_halo === true) { 
    let h_heal = '1d6';
    let h_roll = new Roll(h_heal);
    h_roll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor:`<strong> Extra healing from Healer's Halo </strong>` });
    }

    if ( await CheckFeat('life-mystery') === true) {
     if ((minc === true || modc === true || majc === true) && target === metok) { 
      if (Math.floor(plevel / 2) === 0) { var hpenal = 1; }
      else { var hpenal = Math.floor(plevel / 2); }
     var healt = healt + "-" + hpenal;
     }
    }
    if (target === metok && (hpbeads === true || ghpbeads === true)) { var healt = healt + "+" + bbeads;}
    else if (hpbeads === true || ghpbeads === true) { let beadroll = new Roll(bbeads); beadroll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor: `<strong> Prayer Beads recovery that either you or targeted player get`});}
    const roll = new Roll(healt);
    let healf = `2-Action Lv ${hlvl} Heal spell targeting ${tname}`;
    roll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor: `<strong> ${healf} </strong>`});
    
    if (modc === true) {  
      let broll = new Roll(hlvl.toString());
      broll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor: `<strong> Hit Points equal to the spell level to your choice of either one target of the spell or the creature nearest to you. You can't heal yourself in this way.</strong> This healing has the healing, necromancy, and positive traits, as well as the tradition trait of the spell.`});}
    else if (majc === true && hlvl > 4) {
      let nlvl = hlvl - 4;
      var healmt = nlvl + hdice + "+" + nlvl;
      if (staffb > 0) { var healmt = healmt + "+" + staffb; }
      var healmt = a_halo ? healmt + "+" + nlvl * 2 : healmt;
      let croll = new Roll(healmt)
      croll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor: `<strong> You disperse positive energy in a 30-foot burst with the effects of a 3-action heal spell with a level 4 lower than that of the spell you cast. This healing occurs immediately after you finish Casting the Spell. You don't benefit from this healing. Instead, you lose double the number of Hit Points rolled for the heal spell. </strong>`});
    
    }
    }
    }
    }
	if (token === undefined) {
	ui.notifications.warn('No token is selected.');
    } 
    
	else {
    let math_temp = Math.ceil(token.actor.level / 2);
	const dialog = new Dialog({
    title: '2-Action Heal',
    content: `
    <div>Spell Level cast?</div>
    <hr/>
    <form>
    <div class="form-group">
    <label>Level:</label>
    <input id="modifier" name="modifier" type="number" min="1" max="10"></input>
    </div>
    </form>
    ${    await CheckSpell('angelic-halo')
	    ? `<form><div class="form-group">
    <label>Angelic Halo</label>
    <input type="checkbox" id="a_h_bool" name="a_h_bool"></input>
    </div></form>`
	    : ``
    }
    ${    await CheckFeat('healers-halo')
	    ? `<form><div class="form-group">
    <label>Healer's Halo</label>
    <input type="checkbox" id="h_h_bool" name="h_h_bool"></input>
    </div></form>`
	    : ``
    }
    </form>`,
    buttons: {
		yes: {
		    icon: `<i class="fas fa-hand-holding-medical"></i>`,
		    label: '2-Action Heal',
		    callback: applyChanges,
		},
		no: {
		    icon: `<i class="fas fa-times"></i>`,
		    label: 'Cancel',
		},
	    },
	    default: 'yes',
	});
	dialog.render(true);
    }