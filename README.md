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
- **The Between.** Every fight takes place in the Between. It's the same town, but wrong: the buildings lean, the cross hangs upside down, and the sun is black.
- **Your iron.** Each chamber of the revolver holds a round: Lead, Silver, Hellfire, Blessed or Buckshot, plus Duds that a certain card-sharp demon slips in. Shot cards fire the next loaded round, so the order matters. Your **gun belt** sets the starting load and what Reload puts back; buy rounds at trading posts and arrange them between fights.
- **Two card styles.** *Gunslinger* cards play with the cylinder (Load Silver, Hammer Back, Spin the Cylinder, The Last Bullet, Six-Shooter). *Preacher* cards stack and cash in Hellfire (Sermon of Fire, Brimstone Verse, Baptism by Fire, Exorcism).
- **Detective towns.** Each town lost someone last night. You get five questions: ask a stranger where they were, what they saw, or watch them. Humans tell the truth; the demon lies and tries to frame someone. Or spend **Veil Sight** to look through a stranger's skin and know for sure; solve it without the Veil for a bigger bounty. Draw on the demon and it starts **Exposed**; draw on an innocent and you gain a *Blood on Your Hands* curse and the real demon strikes first. The test suite checks that every generated town has exactly one consistent liar.
- **Tricky demons.** Some hide their next move behind the Veil (spend Sight in the fight to see it). Razorjaw and the False Shepherd hold hostages: one big hit kills the hostage too, but Exposing the demon frees them, so identifying the demon in town (which Exposes it) saves a life. Warded demons take half damage from anything but Silver and Blessed rounds. The Chalk Wraith recites your last attack back at you, and the Gentleman takes cards from your deck as payment.
- **Tonics.** Carry up to three (a miracle tonic, laudanum, dynamite, peyote tea, holy water, trail coffee, rattlesnake venom, a box of Silver) and use them mid-fight. Found after fights and sold at trading posts.
- **Infamy.** Wrong accusations (+3), running from a town (+1) and dead hostages (+2) raise it; clean solves, freed hostages and honesty lower it. Higher Infamy raises prices, costs you questions in towns, and sends posses after you.
- **The map.** Each chapter is a branching map you can see from the start. Choose your route stop by stop; one story stop per chapter and a campfire before the boss are always on offer.
- **Five card styles.** Gunslinger and Preacher from the start. Brawler (fists, Wrath, getting hurt on purpose: Haymaker, Red Mist, Scar Tissue, Last Stand) unlocks after beating the Hollow Steer; Veil-seer (Exposed and Sight: Glimpse, Tear the Veil, Peel the Skin, Its True Name, Clairvoyance) after beating the Silk Widow.
- **Three hunters.** *Jonah Crane* is the story as written. *Martha Wheeler*, the widow of the man Jonah hanged, unlocks when you finish the hunt: a shotgun, Buckshot rounds, less Veil Sight but extra questions, and her own story to clear Eli's name. *Sister Agnes*, Ruth's confidante, unlocks when you tell her the truth: frail, four Veil Sight, Blessed rounds and hotter Hellfire, and her own story. Each hunter has their own letters, boss dialogue, story stops, memories and three endings.
- **The Ledger.** Difficulty pages that stack: tougher demons, harder hits, fewer questions and weaker campfires, stronger elites and bosses, and a Grief in your deck. Winning on the highest page you've opened unlocks the next.
- **Saves.** The run is saved in your browser at every stop on the trail. Continue from the title screen.
- **Combat.** You get **Grit** (energy) every turn to spend on cards. **Rounds** are bullets in a six-shooter. Shot cards spend them, and they only come back when you play **Reload**. **Cover** blocks damage. The icons over each demon show what it will do next.
- **Statuses.** Wrath adds damage to every hit, Exposed takes +50% damage, Shaken deals −25%, and Hellfire burns every turn.
- **Keepsakes** (relics). You start with your old Tin Star and Clara's Locket. Beating a boss gives you a keepsake of the sibling you avenged.

Sound starts after your first click or tap (browsers require that). The ♫, ✹ and ❝ buttons toggle music, sound effects and voices.

Keys in combat: `1`–`9` play a card, `E` ends your turn, `Esc` cancels targeting.

## Code

| File | What's in it |
| --- | --- |
| `js/data.js` | All content: cards, keepsakes, demons, encounters, townsfolk tells, trail events, story text |
| `js/game.js` | Rules engine (`Combat`, `Run`). No DOM, so it runs in Node |
| `js/art.js` | Painted character art (`art/*.webp`), with inline SVG silhouettes as a fallback |
| `art/` | Painted art generated with Higgsfield (GPT Image 2.5): Jonah, 20 demons, 6 townsfolk portraits, the town by day and in the Between, and an illustration for every card (`art/cards/`) |
| `js/audio.js` | Sound effects and music, all synthesized with Web Audio (no audio files): plucked guitar, whistle, drones, bells, gunshots with canyon echo |
| `art/voice/` | Voiced lines (Higgsfield, ElevenLabs voices): the three chapter letters, each boss's taunt and last words, and the finale |
| `js/ui.js` | Screens, input handling, and combat animation (card flights, gunfire tracers, slashes, demon lunges, death burns) |
| `css/style.css` | Styling for daylight and for the Between |
| `tests/sim.js` | Headless simulation. A greedy bot plays hundreds of full runs, checking invariants and reporting win rate |

To add a card, add an entry to `CARDS` in `data.js`. Its `play(c, v, target)` callback uses the combat API: `hit`, `hitAll`, `hitRandom`, `cover`, `apply`, `applyAll`, `applySelf`, `draw`, `reload`, `heal`, `gainGrit`, `power`. To add a demon, add it to `ENEMIES`, then reference it from `ENCOUNTERS`.

```
npm test   # plays 300 simulated runs
```
