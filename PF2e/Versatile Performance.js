const options = [
    {name: "Demoralize", value: "demoralize"},
    {name: "Make an Impression", value: "makeAnImpression"},
    {name: "Impersonate", value: "impersonate"}
];

let myContent = `
        <div class="form-group">
          <label for="exampleSelect">Action being used</label>
          <select id="exampleSelect">`

for (i = 0; i < options.length; i++){
  myContent += `
                <option value="${options[i].value}">${options[i].name}</option>`
};

myContent += `
          </select>
        </div>`

const select = await Dialog.prompt({
    title: 'Versatile Performance',
    content: myContent,
        callback: async(html) => {
          return html.find('#exampleSelect').val();
    },
    rejectClose: false,
});
if ( select === null ) { return }
game.pf2e.actions[select]({skill:"performance"});
