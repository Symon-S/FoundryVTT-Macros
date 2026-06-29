// Created by ArthurTrumpet
// Heart icon idea from the Discord. Please contact if you know who came up with it so can attribute here.
// Gives a health estimate and distance to the hovered token

if (canvas.tokens.controlled.length === 0) {
        ui.notifications.warn("You must select a token");
}
else if (canvas.tokens.hover?.actor.hitPoints.value == null) {
        ui.notifications.warn("Not hovering over a token");
}
else {
     let currentHealth = canvas.tokens.hover?.actor.hitPoints.value;
      let maxHealth = canvas.tokens.hover?.actor.hitPoints.max;
       let percentageHealth = (currentHealth/maxHealth)*100;
        let distance = token.distanceTo(canvas.tokens.hover);
         let distanceUI = (Math.ceil(distance)+ " ft to pointer");

          if (percentageHealth > 85.5) { ui.notifications.info("❤️❤️❤️❤️ - " + distanceUI) }
           else if (percentageHealth > 75) { ui.notifications.info("❤️❤️❤️💔 - " + distanceUI) }
            else if (percentageHealth > 62.5) { ui.notifications.info("❤️❤️❤️🤍 - " + distanceUI) }
             else if (percentageHealth > 50) { ui.notifications.info("❤️❤️💔🤍 - " + distanceUI) }
              else if (percentageHealth > 37.5) { ui.notifications.info("❤️❤️🤍🤍 - " + distanceUI) }
               else if (percentageHealth > 25) { ui.notifications.info("❤️💔🤍🤍 - " + distanceUI) }
                else if (percentageHealth > 12.5) { ui.notifications.info("❤️🤍🤍🤍 - " + distanceUI) }
                 else if (percentageHealth > 0) { ui.notifications.info("💔🤍🤍🤍 - " + distanceUI) }
                  else { ui.notifications.info("💀💀💀💀") }
}
