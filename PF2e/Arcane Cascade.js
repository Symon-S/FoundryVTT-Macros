// Arcane Cascade
if (!actor) { ui.notifications.warn("Please select a token"); return; }
if (!token.actor.itemTypes.feat.some(ac => ac.slug === 'arcane-cascade' )) { ui.notifications.warn("This actor does not possess the Arcane Cascade class feature"); return; }

const studies = ['inexorable-iron','laughing-shadow','sparkling-targe','starlit-span','twisting-tree']
const acFeats = ['starlit-eyes','resounding-cascade','student-of-the-staff','arcane-shroud','sustaining-steel','inexorable-iron','laughing-shadow','sparkling-targe','starlit-span','twisting-tree'];

const acFeatsOwned = [];
let count = 0;
acFeats.forEach ( a => {
 	if (token.actor.itemTypes.feat.some(c => c.slug === a) && count <= 1) { 
		if (studies.includes(a)){ count++ }
	acFeatsOwned.push(a)
  	}
});

const existing = actor.itemTypes.effect.find(e => e.name === "Arcane Cascade");
if (existing){
	await existing.delete();
}

else{

 /* Error Messages */
if (count > 1) { ui.notifications.error("You cannot have more than 1 hybrid study"); return; } 
if (acFeatsOwned.includes('sustaining-steel') && !acFeatsOwned.includes('inexorable-iron')) { ui.notifications.error("Sustaining Steel requires Inexorable Iron Hybrid Study!"); return; }
if (acFeatsOwned.includes('starlit-eyes') && !acFeatsOwned.includes('starlit-span')) { ui.notifications.error("Starlit Eyes requires Starlit Span Hybrid Study!"); return; }
if (acFeatsOwned.includes('student-of-the-staff') && !acFeatsOwned.includes('twisting-tree')) { ui.notifications.error("Student of the Staff requires Twisting Tree Hybrid Study!"); return; }


const spellTypes = ["Abjuration","Conjuration","Divination","Enchantment","Evocation","Illusion","Necromancy","Transmutation"]
const dialogData = [
  	{ label : `What type of spell was used last?`, type : `select`, options : spellTypes }
];
 if (acFeatsOwned.includes('arcane-shroud')) { dialogData.push({ label : `Arcane Shroud? (Only with slotted spells)`, type : `checkbox` }); }

 const chosenSpellType = await quickDialog({title : `Arcane Cascade`, data : dialogData});
 let damageType;
 if (chosenSpellType[0] === "Abjuration" || chosenSpellType[0] === "Evocation") { damageType = "force" }
 if (chosenSpellType[0] === "Divination" || chosenSpellType[0] === "Enchantment" || chosenSpellType[0] === "Illusion")  { damageType = "mental" }
 if (chosenSpellType[0] === "Necromancy")  { damageType = "negative" }
		
 const ArcaneCascade = {
  "name": "Arcane Cascade",
  "type": "effect",
  "img": "systems/pf2e/icons/features/classes/arcane-cascade.webp",
  "data": {
    "description": {
      "value": "<p><strong>Requirements</strong> You used your most recent action to Cast a Spell or make a Spellstrike.</p>\n<hr />\n<p>You divert a portion of the spell's magical power and keep it cycling through your body and weapon using specialized forms, breathing, or footwork. While you're in the stance, your melee Strikes deal [[/r 1 #damage]]{1 extra damage}. This damage increases to 2 if you have weapon specialization and 3 if you have greater weapon specialization. Any Strike that benefits from this damage gains the arcane trait, making it magical.</p>\n<p>If your most recent spell before entering the stance was one that can deal damage, the damage from the stance is the same type that spell could deal (or one type of your choice if the spell could deal multiple types of damage). If the spell couldn't deal damage, this stance's bonus damage depends on the spell's school.</p>\n<ul>\n<li><strong>Abjuration</strong> or <strong>Evocation</strong> force</li>\n<li><strong>Conjuration</strong> or <strong>Transmutation</strong> same type as your weapon or unarmed attack</li>\n<li><strong>Divination</strong>, <strong>Enchantment</strong>, or <strong>Illusion</strong> mental</li>\n<li><strong>Necromancy</strong> negative</li>\n</ul>"
    },
    "source": {
      "value": ""
    },
    "traits": {
      "value": [],
      "rarity": {
        "value": "common"
      },
      "custom": ""
    },
    "rules": [
      {
        "key": "FlatModifier",
        "selector": "damage",
        "value": {
          "brackets": [
            {
              "end": 6,
              "value": 1
            },
            {
              "end": 14,
              "start": 7,
              "value": 2
            },
            {
              "start": 15,
              "value": 3
            }
          ]
        },damageType
      }
    ],
    "slug": null,
    "schema": {
      "version": 0.665,
      "lastMigration": null
    },
    "level": {
      "value": 1
    },
    "duration": {
      "value": -1,
      "unit": "unlimited",
      "sustained": false,
      "expiry": "turn-start"
    },
    "start": {
      "value": 0,
      "initiative": null
    },
    "target": null,
    "tokenIcon": {
      "show": true
    }
  },
  "effects": [],
  "sort": 0
 };
 
 /* Twisting Tree */
 if (acFeatsOwned.includes('twisting-tree')) {
  //Comment the next line out to prevent the annoying reminder message from popping up.
  ui.notifications.info("Use the Twisted Tree Two Handed Toggle during Arcane Cascade to switch between 1 and 2 handed use of a staff");
  const ttRule = [{"key": "ToggleProperty","property": "flags.pf2e.rollOptions.damage-roll.twohanded","property": "flags.pf2e.rollOptions.attack-roll.twohanded","label":"Twisting Tree Two Handed"},
  {"key":"DamageDice","label":"Twisting Tree Arcane Cascade","selector":"damage","predicate":{"all":["staff"],"not":["twohanded"]},"diceNumber":0,"override":{"dieSize":"d6"}},
  {"key":"DamageDice","label":"Twisting Tree Arcane Cascade","selector":"damage","predicate":{"all":["staff","twohanded"]},"traits":["parry","reach","trip"],"diceNumber":0,"override":{"dieSize":"d8"}},
  {"key":"MultipleAttackPenalty","predicate":{"all":["staff"],"not":["twohanded"]},"roll-options": ["all"],"selector":"attack","value":-4}
  ];

  //Student of the Staff 
  if(acFeatsOwned.includes('student-of-the-staff')) { ttRule.push({"critical":true,"key":"DamageDice","label":"Student of the Staff","selector":"damage","predicate":{"all":["staff"]},"diceNumber":1,"dieSize":"d6"},{"key":"Note","outcome":["criticalSuccess"],"predicate":{"all":["staff"]},"selector":"damage","text":"<p class='compact-text'><strong>Critical Specialization</strong> You knock the target away from you up to 10 feet (you choose the distance). This is forced movement.</p>"},{"key":"DamageDice","selector":"damage","predicate":{"all":["staff"]},"traits":["deadly-d6"]}); }
   ttRule.forEach( r => { ArcaneCascade.data.rules.push(r); });
 }

 /*Starlit-span*/
 if (acFeatsOwned.includes('starlit-span')) {
	ArcaneCascade.data.rules.push({"key":"Note","selector":"damage","predicate":{"any":["ranged","thrown","bow","dart","sling"],"all":["magus"]},"text":"<p class='compact-text'><strong>Starlit Span:</strong> Lower the DC to 3 instead of 5 against a concealed creature and to 9 instead of 11 against a hidden one. When using shooting star you don't have to attempt the flat check for targeting a hidden creature with a ranged Strike.</p>"});
	if(acFeatsOwned.includes('starlit-eyes')){
		ArcaneCascade.data.rules.push({"key":"Note","selector":"damage","predicate":{"any":["ranged","thrown","bow","dart","sling"],"not":["magus"]},"text":"<p class='compact-text'><strong>Starlit Eyes:</strong> Lower the DC to 3 instead of 5 against a concealed creature and to 9 instead of 11 against a hidden one. When using shooting star you don't have to attempt the flat check for targeting a hidden creature with a ranged Strike.</p>"});
	}
 }
 
 /*Inexorable Iron*/
 if(acFeatsOwned.includes('inexorable-iron')) {
	 let value;
	 if (token.actor.level === 1) { value = 1;}
	 else { value = Math.floor(token.actor.level / 2);}
	 if (game.modules.has("pf2e-persistent-damage")) {
		ArcaneCascade.data.rules.push({"key":"PF2E.RuleElement.Healing","selector":"fast-healing","predicate":{"any":["greatsword","greataxe","polearm"]}, value });
	 }
	 ArcaneCascade.data.rules.push({"key":"TempHP",value})
	 const message = ChatMessage.applyRollMode({ flavor: `<strong>Inexorable Iron</strong><br> <p class='compact-text'>When you enter Arcane Cascade stance and at the start of each of your turns while you're in that stance, if you're wielding a melee weapon in two hands, you gain temporary Hit Points equal to half your level (minimum 1 temporary HP).</p>`, speaker: ChatMessage.getSpeaker() }, game.settings.get("core", "rollMode"));
	 ChatMessage.create(message);

 }

 /*Laughing Shadow*/
 if(acFeatsOwned.includes('laughing-shadow')) {
	if (token.actor.data.data.attributes.ac.dexCap.value === Infinity || token.actor.data.data.attributes.ac.dexCap.value === 5){
		ArcaneCascade.data.rules.push({"key":"FlatModifier","selector":"speed","type":"status","value":10});
	}
	else { ArcaneCascade.data.rules.push({"key":"FlatModifier","selector":"speed","type":"status","value":5}); }
	ArcaneCascade.data.rules.push({"key":"ToggleProperty","property":"flags.pf2e.rollOptions.damage-roll.nofreehand","label":"Does not have a hand free"})
	ArcaneCascade.data.rules.push({"key":"FlatModifier","selector":"damage","predicate":{"not":["nofreehand"]},"value": {"brackets": [{"end": 6,"value": 2},{"end": 14,"start": 7,"value": 3},{"start": 15,"value": 4}]},damageType,"label":"Laughing Shadow"});
 }

 /*Sparkling Targe*/
 if(acFeatsOwned.includes('sparkling-targe')) {
        const shields = token.actor.itemTypes.armor.filter(s => s.isShield && s.isEquipped);
        const value = Math.max(...shields.map(v => v.acBonus));
	const stRule = [{"key":"FlatModifier","selector":"saving-throw","predicate":{"all":["self:shield:raised","damaging-effect"]},"label":"Sparkling Targe","type":"circumstance",value}];
	if (shields.some(s => s.slug === "tower-shield" || s.slug === "darkwood-tower-shield-high-grade" || s.slug === "darkwood-tower-shield-standard-grade")) {
		stRule = [{"key":"FlatModifier","selector":"saving-throw","predicate":{"all":["self:shield:raised","damaging-effect"], "not":["self:cover:greater"]},"label":"Sparkling Targe","type":"circumstance","value":2}/*,{"key":"FlatModifier","selector":"saving-throw","predicate":{"all":["self:shield:raised","damaging-effect","self:cover:greater"]},"label":"Sparkling Targe","type":"circumstance","value":4}*/];
	}
	stRule.forEach( r => ArcaneCascade.data.rules.push(r));

 }
 

  
 await actor.createEmbeddedDocuments('Item', [ArcaneCascade]);
		
 //Arcane Shroud
 if(chosenSpellType[1]) {
 	const spellcom = game.packs.find(sp => sp.collection === "pf2e.spells-srd");
  	const spells = await spellcom.getDocuments();

  	let spell,effect;
  	if(chosenSpellType[0] === "Abjuration") { spell = spells.find(sp => sp.slug === 'stoneskin'); }
  
  	if(chosenSpellType[0] === "Conjuration") { spell = spells.find(sp => sp.slug === 'blink'); }

  	if(chosenSpellType[0] === "Divination") { spell = spells.find(sp => sp.slug === 'see-invisibility'); }

  	if(chosenSpellType[0] === "Enchantment") { spell = spells.find(sp => sp.slug === 'heroism'); }

  	if(chosenSpellType[0] === "Evocation") {  spell = spells.find(sp => sp.slug === 'fire-shield'); }

  	if(chosenSpellType[0] === "Illusion") { spell = spells.find(sp => sp.slug === 'invisibility'); }

  	if(chosenSpellType[0] === "Necromancy") { spell = spells.find(sp => sp.slug === 'false-life'); }
  
  	if(chosenSpellType[0] === "Transmutation") { spell = spells.find(sp => sp.slug === 'fleet-step'); }

  	const message = ChatMessage.applyRollMode({ flavor: `<strong>Arcane Shroud</strong><br><p class='compact-text'>Your spell has a powerful aftereffect, briefly granting you a certain spell depending on the spell you cast. You use Arcane Cascade and are subject to an additional aftereffect spell depending on the school of your most recent spell. This aftereffect spell's duration lasts until the end of your next turn or its normal duration, whichever is longer. Using Arcane Shroud again ends any existing spell you gained from Arcane Shroud.<br>(You can drag spell effects from within the link to tokens if available)<\p>${chosenSpellType[0]} : <a class="entity-link" data-pack="pf2e.spells-srd" data-id="${spell.id}"><strong>${spell.name}</strong></a>`, speaker: ChatMessage.getSpeaker() }, game.settings.get("core", "rollMode"));
  	ChatMessage.create(message);

 }
 		//Resounding Cascade
 if (acFeatsOwned.includes('resounding-cascade')){
	const message = ChatMessage.applyRollMode({ flavor: `<strong>Resounding Cascade</strong><br> <p class='compact-text'>When you enter your Arcane Cascade, you disperse the magical reinforcement to nearby allies. You grant the extra damage of Arcane Cascade in an aura affecting all allies in a 5-foot emanation. This uses only the base damage of the stance, based on the ally's weapon specialization; it doesn't use any increase you get from bonuses, the laughing shadow hybrid study, or the like. As normal for duplicate effects, multiple Arcane Cascades affecting the same creature aren't cumulative.</p><br><span data-pf2-effect-area="emanation" data-pf2-distance="5">5-foot emanation</span>`, speaker: ChatMessage.getSpeaker() }, game.settings.get("core", "rollMode"));
        ChatMessage.create(message);
 }
}


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
