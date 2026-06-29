/** This macro generates a roll prompt for the Wizard Feat Explosive Arrival - It prompts the user for the used Spell Rank and Damage trait, then posts the roll to the chat. Feel free to make changes or improve as you see fit.*/

await Dialog.prompt({
    title: 'Explosive Arrival',
    content: `
	<div class="form-group">
          <label for="spellRank">Spell Rank</label>
          <select name="spellRank">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
	    <option value="6">6</option>
	    <option value="7">7</option>
	    <option value="8">8</option>
	    <option value="9">9</option>
	    <option value="10">10</option>
          </select>
        </div>
        <div class="form-group">
          <label for="damageTrait">Damage Trait</label>
          <select name="damageTrait">
            <option value="fire">Fire</option>
            <option value="cold">Cold</option>
            <option value="electricity">Electricity</option>
            <option value="sonic">Sonic</option>
            <option value="spirit">Spirit</option>
          </select>
        </div>
    `,
        callback: async(html) => {
          let sr = html.find('[name="spellRank"]').val();
	  let dt = html.find('[name="damageTrait"]').val();
          ChatMessage.create({
             content: `@Damage[` + sr + `d4[` + dt + `]]{Explosive Arrival (Spell Rank ` + sr + ' - ' + dt + `)}`
});
    }
})