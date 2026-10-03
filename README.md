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
- **A guided first run.** On your first hunt, coach marks walk you through the map, the first town (questions, contradictions, the Veil) and the first fight (Grit, the cylinder and which round fires next, intents, Reload), one at a time. Skip them any time; turn them back on in Settings.
- **The Daily Hunt.** One seeded run a day, the same for everyone: the same hunter, towns, fights and card offers, plus one twist (Blind Faith, Blood Moon, Hot Lead, Glass Jaw, Gold Rush, Heavy Heart, Tight Lips, Quick Draw). It has its own save slot, nothing unlocks, and the first finish counts. You get a result line to share, like `Slinger Daily #41 · Blood Moon · Martha · Ch III · 3 clean solves · ☠ Silk Widow`.
- **The Casebook.** Detective work with no fighting: a file of three cases, each with **two** demons among four or five strangers. The last case adds a human who lies about where they were. Each case has a par (the fewest questions that can crack it, computed by brute force), and you score 100 per case, minus 10 per question over par, 40 for using the Veil and 50 per wrong draw. Tap the ? on a stranger to keep notes. The test suite proves every case has exactly one explanation.
- **The Long Ride.** An endless mode: after the Gentleman falls, the three chapters start again with no story stops or letters, and every lap the demons have 25% more health and hit 15% harder. Your score is the total bounty you collect, and it has its own save slot.
- **Showdown.** A boss rush with a ready-made deck (Gunslinger, Preacher, Brawler or Veil-seer): each chapter's wanted demon and then its boss, six fights back to back. You start with 10 extra health, and between fights you heal a third, pick a card, and take a tonic from a wanted demon or a keepsake from a boss. The score is how few turns you take.
- **Wanted challenges.** The story with one rule changed (Bare Knuckles, Tampered Iron, Wanted Man, Blind Justice, Glass Cannon, Second Sight). A different one is featured each week, and finished ones are marked in Records.
- **Leaderboards.** On the published page, results post to a board shared by everyone who can open it: today's Daily Hunt, best Long Ride bounty, and best Casebook file. Each player has one record that only they can write. Names come from their claude.ai profile.
- **More to hunt.** Each chapter has four kinds of town demon and two wanted demons: the Dowser, the Pale Clerk (who audits your deck mid-fight), the Mesmerist, the Bone Wagon, the Dust Devil and the Starving Man, plus four more trail events (a wrecked stagecoach, a town with no name, an old prospector, a duel at noon).
- **Records.** Hunts ridden and won per hunter, the hardest Ledger page you've beaten, endings seen, demons sent back, clean solves and your clean-solve streak, recent Daily results and your best Casebook file.
- **Settings.** Motion (Full, Fast, or Still for no movement; Still is also used when the device asks for reduced motion), four text sizes, voice autoplay, vibration on hits, and letters on rounds (L, S, H, ✝, ∴, ✕) for players who can't rely on colour.
- **Fits the screen.** On a laptop (1280×720 and up) no screen scrolls: towns and Casebook cases are a case ledger with one row per stranger, the trading post lays its wares out in a grid, boss and finale screens put the art beside the words, and the fight scales its art to the window. On a phone every fight fits on one screen, and the header folds into a ☰ menu.
- **Touch.** Drag a card up out of your hand to play it; hold a card to read it up close; hold anything with a tooltip to see it. Phones buzz on hits, kills and wrong accusations.
- **Keyboard and screen readers.** Everything can be reached with Tab and pressed with Enter or Space, focus survives re-renders, number keys choose on the map, rewards and events, and cards, demons, the cylinder and health bars have spoken labels. The fight log is announced as it changes.
- **Combat.** You get **Grit** (energy) every turn to spend on cards. **Rounds** are bullets in a six-shooter. Shot cards spend them, and they only come back when you play **Reload**. **Cover** blocks damage. The icons over each demon show what it will do next.
- **Statuses.** Wrath adds damage to every hit, Exposed takes +50% damage, Shaken deals −25%, and Hellfire burns every turn.
- **Keepsakes** (relics). You start with your old Tin Star and Clara's Locket. Beating a boss gives you a keepsake of the sibling you avenged.

Sound starts after your first click or tap (browsers require that). The ♫, ✹ and ❝ buttons toggle music, sound effects and voices.

Keys in combat: `1`–`9` play a card, `E` ends your turn, `Esc` cancels targeting.

## Code

| File | What's in it |
| --- | --- |
| `js/cards.js` | Every card, and the rounds they fire |
| `js/data.js` | Hunters, keepsakes, demons, encounters, townsfolk, and the rules for each mode |
| `js/story.js` | Trail events, letters, story stops, bosses' words, endings, and each hunter's own telling |
| `js/game.js` | Rules engine (`Combat`, `Run`). No DOM, so it runs in Node |
| `js/art.js` | Painted character art (`art/*.webp`), with inline SVG silhouettes as a fallback |
| `art/` | Painted art generated with Higgsfield (GPT Image 2.5): Jonah, 20 demons, 6 townsfolk portraits, the town by day and in the Between, and an illustration for every card (`art/cards/`) |
| `js/audio.js` | Sound effects and music, all synthesized with Web Audio (no audio files): plucked guitar, whistle, drones, bells, gunshots with canyon echo |
| `art/voice/` | Voiced lines (Higgsfield, ElevenLabs voices): the three chapter letters, each boss's taunt and last words, and the finale |
| `js/ui.js` | Screens, input (mouse, touch and keyboard), settings, saving, and art preloading |
| `js/combat-ui.js` | The fight: its screen, animation (card flights, gunfire tracers, slashes, demon lunges, death burns) and controls |
| `js/modes.js` | Settings, Records, the guided first run, the Daily Hunt, and the Casebook |
| `css/style.css` | Styling for daylight and for the Between |
| `tests/sim.js` | Headless simulation. A greedy bot plays hundreds of full runs, checking invariants and reporting win rate |

To add a card, add an entry to `CARDS` in `data.js`. Its `play(c, v, target)` callback uses the combat API: `hit`, `hitAll`, `hitRandom`, `cover`, `apply`, `applyAll`, `applySelf`, `draw`, `reload`, `heal`, `gainGrit`, `power`. To add a demon, add it to `ENEMIES`, then reference it from `ENCOUNTERS`.

```
npm test   # plays 300 simulated runs
```
