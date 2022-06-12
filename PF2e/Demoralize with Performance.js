const targetIds = game.user.targets.ids;

targetIds.forEach( async t => { game.pf2e.actions.demoralize({ event: event, skill: "performance" }); });
