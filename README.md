# Slinger

A small deckbuilding RPG set on a haunted frontier.

You play **Jonah Crane**, who used to be a marshal. In a single week, demons wearing human skins killed his brother **Amos**, his sister **Ruth**, and his wife **Clara**. At the last funeral something tore open inside him, and now he can see through the **Veil**. He left his star on Clara's headstone. Now he hunts.

## The story

Jonah thinks he is hunting three demons. He is really paying a debt. Six years ago, as marshal, he could not catch the Cinder County Butcher. A polite stranger in grey gave him a name, and Jonah hanged that man, Eli Wheeler, without a trial. The killings stopped. "Consider it a favor. I'll collect someday."

Each chapter opens with a letter: from Amos, from Ruth, and finally from the Gentleman himself. Each chapter's trail also has one story encounter (the stockyard boy who knew Amos, the nun Ruth confided in, Eli Wheeler's widow) where your choices shape what Jonah admits to himself. Bosses taunt you before the fight and leave last words. Campfires bring back memories, and everything you learn goes in the **Journal**. After the final fight, there are three endings to choose from, and one is only open to a Jonah who has faced what he did.

## Play

No build step and no dependencies. Open `index.html` in a browser.

To serve it locally instead: `npm start`, or run any static file server in this folder.

## How it works

- **Three chapters.** Each one ends with the demon who killed one of Jonah's family: the Hollow Steer (Amos), the Silk Widow (Ruth), and the Gentleman in Grey (Clara). Along the trail you choose between towns, wanted posters, campfires, trading posts, and trail events.
- **Towns are a small whodunit.** Each town shows three strangers, and one of them is a demon. Every stranger has tells, and some innocent tells are red herrings. You can read the tells, or spend **Veil Sight** to look through someone's skin and know for sure.
  - Draw on the demon and you get the drop on it: it starts **Exposed**.
  - Draw on an innocent and you gain a *Blood on Your Hands* curse, and the real demon strikes first.
  - Ride on without choosing and the demon follows you out and ambushes you.
- **The Between.** Every fight takes place in the Between. It's the same town, but wrong: the buildings lean, the cross hangs upside down, and the sun is black.
- **Combat.** You get **Grit** (energy) every turn to spend on cards. **Rounds** are bullets in a six-shooter. Shot cards spend them, and they only come back when you play **Reload**. **Cover** blocks damage. The icons over each demon show what it will do next.
- **Statuses.** Wrath adds damage to every hit, Exposed takes +50% damage, Shaken deals −25%, and Hellfire burns every turn.
- **Keepsakes** (relics). You start with your old Tin Star and Clara's Locket. Beating a boss gives you a keepsake of the sibling you avenged.

Sound starts after your first click or tap (browsers require that). The ♫ and ✹ buttons toggle music and sound effects.

Keys in combat: `1`–`9` play a card, `E` ends your turn, `Esc` cancels targeting.

## Code

| File | What's in it |
| --- | --- |
| `js/data.js` | All content: cards, keepsakes, demons, encounters, townsfolk tells, trail events, story text |
| `js/game.js` | Rules engine (`Combat`, `Run`). No DOM, so it runs in Node |
| `js/art.js` | Painted character art (`art/*.webp`), with inline SVG silhouettes as a fallback |
| `art/` | Painted art generated with Higgsfield (GPT Image 2.5): Jonah, 20 demons, 6 townsfolk portraits, the town by day and in the Between, and an illustration for every card (`art/cards/`) |
| `js/audio.js` | Sound effects and music, all synthesized with Web Audio (no audio files): plucked guitar, whistle, drones, bells, gunshots with canyon echo |
| `js/ui.js` | Screens, input handling, and combat animation (card flights, gunfire tracers, slashes, demon lunges, death burns) |
| `css/style.css` | Styling for daylight and for the Between |
| `tests/sim.js` | Headless simulation. A greedy bot plays hundreds of full runs, checking invariants and reporting win rate |

To add a card, add an entry to `CARDS` in `data.js`. Its `play(c, v, target)` callback uses the combat API: `hit`, `hitAll`, `hitRandom`, `cover`, `apply`, `applyAll`, `applySelf`, `draw`, `reload`, `heal`, `gainGrit`, `power`. To add a demon, add it to `ENEMIES`, then reference it from `ENCOUNTERS`.

```
npm test   # plays 300 simulated runs
```
