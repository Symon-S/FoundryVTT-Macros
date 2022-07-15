//=================================================
//          Research Task Template
// Author: Zael, Variant Rules
// A simple macro for displaying Research Tasks
// for the Research Variant Rule.
//=================================================


//=================================================
//          Parameters (Edit this Section)
//=================================================

// Main Information
let reasearchName = `Research Title`;
let researchLevel = `1`;
let researchDescription = `Research Description.`;
let researchIcon = `icons/svg/d20-black.svg`;

// Traits (Leave a Trait Blank to Hide It)
let researchTraitA = `Trait`;
let researchTraitB = `Trait`;
let researchTraitC = `Trait`;
let researchTraitD = ``;
let researchTraitE = ``;

//Tasks (Leave a Task Name Blank to Hide It)
// Task One Information
let researchTaskOneName = `Task One`;
let researchTaskOneDesc = `Task One Description.`;
let researchTaskOneMaxRP = `15`;
let researchTaskOneCheckA = `skill`;
let researchTaskOneCheckB = `skill`;
let researchTaskOneCheckC = `skill`;
let researchTaskOneCheckD = `skill`;

// Task Two Information
let researchTaskTwoName = `Task Two`;
let researchTaskTwoDesc = `Task Two Description.`;
let researchTaskTwoMaxRP = `20`;
let researchTaskTwoCheckA = `skill`;
let researchTaskTwoCheckB = `skill`;
let researchTaskTwoCheckC = `skill`;
let researchTaskTwoCheckD = `skill`;

// Task Three Information
let researchTaskThreeName = `Task Three`;
let researchTaskThreeDesc = `Task Three Description.`;
let researchTaskThreeMaxRP = `10`;
let researchTaskThreeCheckA = `skill`;
let researchTaskThreeCheckB = `skill`;
let researchTaskThreeCheckC = `skill`;
let researchTaskThreeCheckD = `skill`;

// Task Four Information
let researchTaskFourName = ``;
let researchTaskFourDesc = `Task Four Description.`;
let researchTaskFourMaxRP = `5`;
let researchTaskFourCheckA = `skill`;
let researchTaskFourCheckB = `skill`;
let researchTaskFourCheckC = `skill`;
let researchTaskFourCheckD = `skill`;

// Research Points (Leave a Reward Blank to Hide It)
let fiveRPreward = `Event or Reward A.`;
let tenRPreward = `Event or Reward B.`;
let fifteenRPreward = `Event or Reward C.`;
let twentyRPreward = `Event or Reward D.`;
let twentyfiveRPreward = `Event or Reward E.`;
let thirtyRPreward = `Event or Reward F.`;
let fourtyRPreward = ``;
let fiftyRPreward = ``;

//=================================================
//
//                     WARNING!
//
//=================================================

//=================================================
//
//  Message Assembly (Do Not Edit This Section)
//
//=================================================

// Process Level and DC
let ProcessedDC = Math.round(14 + (1.3*researchLevel));
let ProcessedDCHard = Math.round(ProcessedDC + 2);
let ProcessedDCVeryHard = Math.round(ProcessedDC + 5);
let ProcessedDCIncrediblyHard = Math.round(ProcessedDC + 10);
let ProcessedDCEasy = Math.round(ProcessedDC - 2);
let ProcessedDCVeryEasy = Math.round(ProcessedDC - 5);
let ProcessedDCIncrediblyEasy = Math.round(ProcessedDC - 10);


// Correct Empty Traits
// Trait Correction A
if (researchTraitA ===""){
    traitA = ``;
    console.log('Trait A skipped.');
} else {
    traitA = `
    <span class="tag tooltipstered" data-trait="${researchTraitA}" data-description="PF2E.TraitDescription${researchTraitA}">${researchTraitA}</span>`;
}

// Trait Correction B
if (researchTraitB ===""){
    traitB = ``;
    console.log('Trait B skipped.');
} else {
    traitB = `
    <span class="tag tooltipstered" data-trait="${researchTraitB}" data-description="PF2E.TraitDescription${researchTraitB}">${researchTraitB}</span>`;
}

// Trait Correction C
if (researchTraitC ===""){
    traitC = ``;
    console.log('Trait C skipped.');
} else {
    traitC = `
    <span class="tag tooltipstered" data-trait="${researchTraitC}" data-description="PF2E.TraitDescription${researchTraitC}">${researchTraitC}</span>`;
}

// Trait Correction D
if (researchTraitD ===""){
    traitD = ``;
    console.log('Trait D skipped.');
} else {
    traitD = `
    <span class="tag tooltipstered" data-trait="${researchTraitD}" data-description="PF2E.TraitDescription${researchTraitD}">${researchTraitD}</span>`;
}

// Trait Correction E
if (researchTraitE ===""){
    traitE = ``;
    console.log('Trait E skipped.');
} else {
    traitE = `
    <span class="tag tooltipstered" data-trait="${researchTraitE}" data-description="PF2E.TraitDescription${researchTraitE}">${researchTraitE}</span>`;
}

// Setup Traits
let researchTraits = `<div class="tags">` + traitA + traitB + traitC + traitD + traitE + `</div>`;

//Correct Research Point Rewards if absent
// 5 RP
if (fiveRPreward ===""){
    fiveReward = ``;
    console.log('Reward A skipped.');
} else {
    fiveReward = `<strong style="text-align:left;font-size:80%;">5 Research Points:</strong> </i>${fiveRPreward}</i></p>`;
}

// 10 RP
if (tenRPreward ===""){
    tenReward = ``;
    console.log('Reward B skipped.');
} else {
    tenReward = `<p><strong style="text-align:left;font-size:80%;">10 Research Points:</strong> </i>${tenRPreward}</i></p>`;
}

// 15 RP
if (fifteenRPreward ===""){
    fifteenReward = ``;
    console.log('Reward C skipped.');
} else {
    fifteenReward = `<p><strong style="text-align:left;font-size:80%;">15 Research Points:</strong> </i>${fifteenRPreward}</i></p>`;
}

// 20 RP
if (twentyRPreward ===""){
    twentyReward = ``;
    console.log('Reward D skipped.');
} else {
    twentyReward = `<p><strong style="text-align:left;font-size:80%;">20 Research Points:</strong> </i>${twentyRPreward}</i></p>`;
}

// 25 RP
if (twentyfiveRPreward ===""){
    twentyfiveReward = ``;
    console.log('Reward E skipped.');
} else {
    twentyfiveReward = `<p><strong style="text-align:left;font-size:80%;">25 Research Points:</strong> </i>${twentyfiveRPreward}</i></p>`;
}

// 30 RP
if (thirtyRPreward ===""){
    thirtyReward = ``;
    console.log('Reward F skipped.');
} else {
    thirtyReward = `<p><strong style="text-align:left;font-size:80%;">30 Research Points:</strong> </i>${thirtyRPreward}</i></p>`;
}

// 40 RP
if (fourtyRPreward ===""){
    fourtyReward = ``;
    console.log('Reward G skipped.');
} else {
    fourtyReward = `<p><strong style="text-align:left;font-size:80%;">40 Research Points:</strong> </i>${fourtyRPreward}</i></p>`;
}

// 50 RP
if (fiftyRPreward ===""){
    fiftyReward = ``;
    console.log('Reward H skipped.');
} else {
    fiftyReward = `<p><strong style="text-align:left;font-size:80%;">50 Research Points:</strong> </i>${fiftyRPreward}</i></p>`;
}

// Check Task Names and Hide the Task if Blank
if (researchTaskOneName ==="") {
    taskOne = ``;
    console.log('Task One skipped.');
} else {
    taskOne = `
    <hr>
    <p><strong style="text-align:left;font-size:120%;">${researchTaskOneName}</strong></p>
    <p><i style="padding:15px;text-align:left;font-size:80%;">${researchTaskOneDesc}</i></p>
    <br><div data-visibility="gm"><i style="padding:15px;text-align:left;font-size:80%;"><strong>Maximum RP:</strong> ${researchTaskOneMaxRP}</i></div>
    <p>@Check[type:${researchTaskOneCheckA}|dc:${ProcessedDCVeryEasy}|basic:true]</p>
    <p>@Check[type:${researchTaskOneCheckB}|dc:${ProcessedDCEasy}|basic:true]</p>
    <p>@Check[type:${researchTaskOneCheckC}|dc:${ProcessedDC}|basic:true]</p>
    <p>@Check[type:${researchTaskOneCheckD}|dc:${ProcessedDCHard}|basic:true]</p>
    `;
}

// Task Two
if (researchTaskTwoName ==="") {
    taskTwo = ``;
    console.log('Task Two skipped.');
} else {
    taskTwo = `
    <hr>
    <p><strong style="text-align:left;font-size:120%;">${researchTaskTwoName}</strong></p>
    <p><i style="padding:15px;text-align:left;font-size:80%;">${researchTaskTwoDesc}</i></p>
    <br><div data-visibility="gm"><i style="padding:15px;text-align:left;font-size:80%;"><strong>Maximum RP:</strong> ${researchTaskTwoMaxRP}</i></div>
    <p>@Check[type:${researchTaskTwoCheckA}|dc:${ProcessedDCEasy}|basic:true]</p>
    <p>@Check[type:${researchTaskTwoCheckB}|dc:${ProcessedDC}|basic:true]</p>
    <p>@Check[type:${researchTaskTwoCheckC}|dc:${ProcessedDCHard}|basic:true]</p>
    <p>@Check[type:${researchTaskTwoCheckD}|dc:${ProcessedDCHard}|basic:true]</p>
    `;
}

// Task Three
if (researchTaskThreeName ==="") {
    taskThree = ``;
    console.log('Task Three skipped.');
} else {
    taskThree = `
    <hr>
    <p><strong style="text-align:left;font-size:120%;">${researchTaskThreeName}</strong></p>
    <p><i style="padding:15px;text-align:left;font-size:80%;">${researchTaskThreeDesc}</i></p>
    <br><div data-visibility="gm"><i style="padding:15px;text-align:left;font-size:80%;"><strong>Maximum RP:</strong> ${researchTaskThreeMaxRP}</i></div>
    <p>@Check[type:${researchTaskThreeCheckA}|dc:${ProcessedDC}|basic:true]</p>
    <p>@Check[type:${researchTaskThreeCheckB}|dc:${ProcessedDC}|basic:true]</p>
    <p>@Check[type:${researchTaskThreeCheckC}|dc:${ProcessedDCHard}|basic:true]</p>
    <p>@Check[type:${researchTaskThreeCheckD}|dc:${ProcessedDCVeryHard}|basic:true]</p>
    `;
}

// Task Four
if (researchTaskFourName ==="") {
    taskFour = ``;
    console.log('Task Four skipped.');
} else {
    taskFour = `
    <hr>
    <p><strong style="text-align:left;font-size:120%;">${researchTaskFourName}</strong></p>
    <p><i style="padding:15px;text-align:left;font-size:80%;">${researchTaskFourDesc}</i></p>
    <br><div data-visibility="gm"><i style="padding:15px;text-align:left;font-size:80%;"><strong>Maximum RP:</strong> ${researchTaskFourMaxRP}</i></div>
    <p>@Check[type:${researchTaskFourCheckA}|dc:${ProcessedDC}|basic:true]</p>
    <p>@Check[type:${researchTaskFourCheckB}|dc:${ProcessedDCHard}|basic:true]</p>
    <p>@Check[type:${researchTaskFourCheckC}|dc:${ProcessedDCVeryHard}|basic:true]</p>
    <p>@Check[type:${researchTaskFourCheckD}|dc:${ProcessedDCIncrediblyHard}|basic:true]</p>
    `;
}

// Complete Tasks
let completeTasks = taskOne + taskTwo + taskThree + taskFour;

// Establish Rewards List
let completeRewards = fiveReward + tenReward + fifteenReward + twentyReward + twentyfiveReward + thirtyReward + fourtyReward + fiftyReward;

// Create Message Text
let taskText = `
    <p><img src="${researchIcon}" alt="Research Icon" style="vertical-align:middle;border:0px;width:40px;height:40px;">&nbsp;&nbsp;<strong style="vertical-align:middle;text-align:center;font-size:140%;">${reasearchName}</strong></p>
    <div style="text-align: right;"><strong style="font-size:90%;">Library ${researchLevel}</strong></div>
    <hr>` + 
    researchTraits + `
    <p><i style="padding:15px;text-align:left;font-size:80%;">${researchDescription}</i></p>` +
    completeTasks + `
    <br>
    <div data-visibility="gm">
    <hr>` + completeRewards + `
    </div>
    `;


// Post Message to Chat
ChatMessage.create({
   user: game.user._id,
   speaker: ChatMessage.getSpeaker(),
   content: taskText
});
