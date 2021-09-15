/* By Drental */

/* Macro can be used in combination with different actions to create potency effects for actions like trip, disarm, grapple, etc. This is a template and would need to be slightly modified to do the other actions*/

/* mods template*/
const modifiers = [
  new game.pf2e.Modifier('+1 Oversized Guisarme', 1, 'item')
];

/* perform action with mods */
game.pf2e.actions.trip({ 
  modifiers: modifiers,
  event: event 
});
