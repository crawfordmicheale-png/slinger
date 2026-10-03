'use strict';
// ---------------------------------------------------------------------------
// SLINGER — the story: trail events, letters, bosses' words, endings, and each
// hunter's own telling. Loaded after data.js.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// TRAIL EVENTS
// Each option: { label, req?(run), run(run, api) -> string (result text) }
// api exposes: gainCard, addCurse, removeCardPrompt, gainKeepsake, rand
// ---------------------------------------------------------------------------
const EVENTS = [
  {
    id: 'hanged_man',
    title: 'The Hanging Tree',
    text: 'A cottonwood by the creek. A man hangs from it, boots twitching. Still alive. Somebody wrote LIAR on a board and nailed it to the trunk.',
    options: [
      {
        label: 'Look through the Veil first. (1 Sight)', req: r => r.sight > 0,
        run: (r, api) => { r.sight--; api.gainCard('steady_hand'); r.gold += 25; return 'Human. Just a man who told the wrong truth to the wrong people. You cut him down. He presses 25 gold and his lucky playing card into your hand. (Gain 25 gold and Steady Hand.)'; },
      },
      {
        label: 'Cut him down.',
        run: (r, api) => {
          if (api.rand() < 0.5) { r.gold += 25; return 'He gasps, weeps, thanks you. Presses 25 gold into your hand and runs.'; }
          r.hp = Math.max(1, r.hp - 10); return 'The moment his feet touch dirt he is on you, teeth first. You put him down, but not before he takes a piece of your arm. (Lose 10 HP.)';
        },
      },
      { label: 'Ride on. Not your business anymore.', run: () => 'His boots stop twitching before you reach the ridge.' },
    ],
  },
  {
    id: 'chapel',
    title: 'Abandoned Chapel',
    text: 'Adobe walls, no roof. Somebody still lights candles at the altar. There is a silver collection plate, and it is full.',
    options: [
      { label: 'Kneel and pray. (Heal 18 HP)', run: r => { r.hp = Math.min(r.maxHp, r.hp + 18); return 'You don\'t remember the words, so you just talk to Clara instead. You feel lighter.'; } },
      { label: 'Melt down the silver. (Gain Silver Bullet, lose 5 max HP)', run: (r, api) => { r.maxHp -= 5; r.hp = Math.min(r.hp, r.maxHp); api.gainCard('silver_bullet'); return 'You cast six bullets over the candles. The flames lean away from you the whole time.'; } },
      { label: 'Leave it be.', run: () => 'You tip your hat to the altar and go.' },
    ],
  },
  {
    id: 'clara_dream', jonahOnly: true,
    title: 'Campfire Dream',
    text: 'You doze by the fire and Clara is sitting across from you, mending your shirt like she used to. "Jonah," she says. "You could stop. You could just stop."',
    options: [
      { label: '"Not till it\'s done." (Gain Say Her Name)', run: (r, api) => { api.gainCard('say_her_name'); return 'She sighs the way she always did when you were being stubborn. When you wake, the fire has burned down to her initials.'; } },
      { label: 'Sit with her a while. (Heal 20 HP, restore Sight)', run: r => { r.hp = Math.min(r.maxHp, r.hp + 20); r.sight = r.maxSight; return 'You talk till dawn about nothing at all. It is the best night\'s sleep you have had in two years.'; } },
    ],
  },
  {
    id: 'snake_oil',
    title: 'Doctor Pettibone\'s Miracle Tonic',
    text: 'A painted wagon. A man in a stovepipe hat. "Cures grief, gout, and gunshot! Just 30 dollars, friend."',
    options: [
      {
        label: 'Buy a bottle and drink it. (30 gold)', req: r => r.gold >= 30,
        run: (r, api) => {
          r.gold -= 30;
          if (api.rand() < 0.6) { r.maxHp += 8; r.hp += 8; return 'Tastes like turpentine and licorice. Your scars stop aching. (+8 max HP)'; }
          r.hp = Math.max(1, r.hp - 8); return 'You spend the afternoon behind a rock. (Lose 8 HP)';
        },
      },
      {
        label: 'Look through the Veil at him. (1 Sight)', req: r => r.sight > 0,
        run: (r, api) => { r.sight--; api.gainCard('whiskey'); r.gold += 20; return 'Just a con man. Human as they come. You tell him what you saw, and he turns pale and pays you 20 dollars and a bottle of the real stuff to keep quiet. (Gain 20 gold and Rotgut Whiskey.)'; },
      },
      { label: 'Keep riding.', run: () => '"Your loss, friend!"' },
    ],
  },
  {
    id: 'crossroads',
    title: 'The Crossroads',
    text: 'Four roads meet in the dark. A man in a black coat sits on a fence rail, whittling. "Evening, Marshal. I could make your road a lot shorter. Everything costs, of course."',
    options: [
      { label: 'Offer blood. (Lose 10 max HP, gain a keepsake)', req: r => r.maxHp > 30, run: (r, api) => { r.maxHp -= 10; r.hp = Math.min(r.hp, r.maxHp); const k = api.gainKeepsake(); return `He nicks your thumb with the whittling knife and hands you something wrapped in cloth: ${k ? KEEPSAKES[k].name : 'nothing, and he laughs'}.`; } },
      { label: 'Offer a memory. (Remove a card from your deck)', run: (r, api) => { api.removeCardPrompt(); return 'He takes it. You can\'t quite recall what it was. That\'s the point.'; } },
      { label: 'Draw on him.', run: (r, api) => { api.addCurse('grief'); r.gold += 50; return 'He is gone before you clear leather. Only a sack of 50 gold on the fence rail and a sound like a woman crying. (Gain 50 gold and a Grief.)'; } },
      { label: 'Tip your hat and take the long way.', run: () => '"Suit yourself, Marshal. I\'ll see you at the end."' },
    ],
  },
  {
    id: 'homestead',
    title: 'Burned Homestead',
    text: 'A cabin burned to the stone chimney. A little girl is hiding in the root cellar. She says the man who did it had "a face like a candle."',
    options: [
      { label: 'Take her to the next town. (Gain Pierce the Veil)', run: (r, api) => { api.gainCard('pierce_veil'); return 'She rides in front of you the whole way. At the church she gives you a charm made from a bird skull. "So you can see them," she says. She can see them too.'; } },
      { label: 'Give her your rations and gold. (Lose 30 gold, +1 max Sight)', req: r => r.gold >= 30, run: r => { r.gold -= 30; r.maxSight += 1; r.sight += 1; return 'You tell her where the church is. Later that night, the veil feels thinner, as if someone is praying for you.'; } },
    ],
  },
  {
    id: 'gunsmith',
    title: 'A Traveling Gunsmith',
    text: 'An old Chinese gunsmith named Wen has a workbench set up on the back of his cart. "That iron of yours has seen things," he says. "Let me look."',
    options: [
      { label: 'Let him work on it. (Upgrade a card)', run: (r, api) => { api.upgradeCardPrompt(); return 'He hands it back without a word. It sits in your hand like it grew there.'; } },
      { label: 'Buy a box of special rounds. (40 gold, gain Hellfire Round)', req: r => r.gold >= 40, run: (r, api) => { r.gold -= 40; api.gainCard('hellfire_round'); return 'The cartridges are warm to the touch and smell like Sunday.'; } },
      { label: 'Nod and move along.', run: () => 'Wen nods back.' },
    ],
  },
  {
    id: 'stagecoach',
    title: 'The Overturned Stagecoach',
    text: 'A stagecoach on its side in a dry wash, wheels still turning. No horses, no passengers. The strongbox is chained to the seat, and it is heavy.',
    options: [
      { label: 'Break it open. (Gain 60 gold, more Infamy)', run: r => { r.gold += 60; r.addInfamy(2); return 'Sixty dollars in Wells Fargo scrip. Somebody will come looking for it, and they will know your face. (+60 gold, +2 Infamy)'; } },
      { label: 'Haul it to the next town. (Less Infamy, gain a tonic)', run: r => { r.addInfamy(-2); const t = r.randomTonic(); const got = r.gainTonic(t); return `The express agent nearly weeps. He gives you a reward from the company stores${got ? `: ${TONICS[t].name}` : ', but your satchel is full'}. Word gets around. (-2 Infamy)`; } },
      { label: 'Look through the Veil at the wreck. (1 Sight)', req: r => r.sight > 0, run: (r, api) => { r.sight--; api.gainCard('pierce_veil'); return 'The passengers are still inside, just on the other side of the Veil, sitting politely and waiting for a stop that will never come. You tell them they can get off now. They thank you. (Gain Pierce the Veil.)'; } },
    ],
  },
  {
    id: 'ghost_town',
    title: 'A Town With No Name',
    text: 'The sign has weathered blank. Every door hangs open. In the saloon, a player piano is working through "Camptown Races" for nobody at all.',
    options: [
      { label: 'Search the general store. (Gain a tonic)', run: r => { const t = r.randomTonic(); return r.gainTonic(t) ? `Behind the counter, under an inch of dust: ${TONICS[t].name}. You leave a dollar on the counter out of habit.` : 'You find a tonic, but your satchel is full.'; } },
      { label: 'Sit at the bar and let the piano finish. (Heal 12, remove a card)', run: (r, api) => { r.hp = Math.min(r.maxHp, r.hp + 12); api.removeCardPrompt(); return 'When the song ends, the piano plays one more bar, slowly, like a question. You find you have let go of something. (Heal 12. Remove a card.)'; } },
      { label: 'Ride through without stopping.', run: () => 'The piano stops the moment you pass the town limits.' },
    ],
  },
  {
    id: 'prospector',
    title: 'The Old Prospector',
    text: 'A prospector with one tooth and one mule is panning a creek that has never held gold. "Found me some silver, though," he says, and shows you a lump of ore as big as a fist. "Real silver. The kind that burns them."',
    options: [
      { label: 'Buy it and have a round cast. (35 gold, Silver in your belt)', req: r => r.gold >= 35, run: r => { r.gold -= 35; const i = r.belt.indexOf('lead'); if (i >= 0) r.belt[i] = 'silver'; return i >= 0 ? `He watches you pour it by the campfire. The round comes out bright as a dime. (A Lead chamber in your gun belt is now Silver.)` : 'You have no Lead chambers left to fill. He keeps the money anyway.'; } },
      { label: 'Help him dig. (Lose 8 HP, gain 40 gold)', run: r => { r.hp = Math.max(1, r.hp - 8); r.gold += 40; return 'The creek bank gives way and you spend an hour in cold water, but the old man was right about one thing: there is a second lump. He splits it fair. (Lose 8 HP. Gain 40 gold.)'; } },
      { label: 'Wish him luck.', run: () => '"Don\'t need luck," he says. "Need a bigger pan."' },
    ],
  },
  {
    id: 'duel',
    title: 'A Duel at Noon',
    text: 'A kid with two pearl-handled pistols and no beard steps into the street. "You\'re the demon hunter. I\'m faster than you." Half the town is watching from the boardwalk.',
    options: [
      { label: 'Accept the duel. (Lose 6 HP, upgrade a card)', run: (r, api) => { r.hp = Math.max(1, r.hp - 6); api.upgradeCardPrompt(); return 'He is fast. You are faster, just barely, and you shoot the pistol out of his hand instead of his heart. He grazes your arm on the way down. He asks you to teach him. You teach him one thing. (Lose 6 HP. Upgrade a card.)'; } },
      { label: 'Look through the Veil at him first. (1 Sight)', req: r => r.sight > 0, run: (r, api) => { r.sight--; api.gainCard('warning_shot'); r.addInfamy(-1); return 'Just a boy. Human, scared, and trying hard not to show it. You put a warning shot through his hat. He goes home. The town decides you are a decent sort. (Gain Warning Shot. -1 Infamy.)'; } },
      { label: 'Walk away.', run: r => { r.addInfamy(1); return 'The kid crows about it in every saloon from here to Coldwater. (+1 Infamy)'; } },
    ],
  },
];

const STORY = {
  intro: [
    'They called you Marshal once. Marshal Jonah Crane, of Cinder County.',
    'Then came the week of three funerals. Your brother Amos, trampled in a stockyard. Your sister Ruth, gone from a saloon in Coldwater. And Clara, your wife, in your own house, while you were out chasing a horse thief.',
    'At the last graveside something in you tore open, and you saw them: the demons that walk the frontier in borrowed skins. Barbers. Bankers. Preachers. You can see through the Veil now. Nobody else can.',
    'You left your star on Clara\'s headstone. Now you hunt.',
    'You do not think about the hanging. You have gotten very good at not thinking about the hanging.',
  ],
  between: 'When you draw iron on a demon, the world slips into the Between: the same street, the same sky, only wrong. Out there they cannot hide their faces. Neither can you.',
  death: 'Another nameless grave on the prairie. The demons of the frontier sleep a little easier tonight.',
};

// ---------------------------------------------------------------------------
// THE LONGER STORY
// Six years ago the Cinder County Butcher was killing children and Marshal
// Crane could not catch him. A polite stranger in grey gave him a name, Eli
// Wheeler, and Jonah hanged Eli without a trial. The killings stopped, because
// the stranger was the Butcher. "Consider it a favor. I'll collect someday."
// Amos, Ruth and Clara were the collection. Jonah learns this a piece at a time.
// ---------------------------------------------------------------------------
const CHAPTER_INTROS = {
  1: {
    letter: {
      from: 'Amos Crane',
      text: "Jonah. Pike's herd don't graze and they don't drink. Last night I seen one of them steers eat a dog, bones and all, and then look at me like it knew my name. Pike gets a visitor on Sundays, a gent in a grey suit who never takes off his hat. Don't laugh. I know you'll laugh. A.",
    },
    paras: [
      'Amos wrote that a week before they found him. You laughed when you read it. You have not laughed since.',
      'Dry Hollow is cattle country, and every cow in it belongs to Silas Pike.',
    ],
  },
  2: {
    letter: {
      from: 'Ruth Crane',
      text: 'Dear Jonah, Coldwater is cold, like the name. Madame Odile says I have the finest voice she has heard in forty years, which is strange, because she does not look forty. A gentleman in grey comes to hear me sing every Saturday. He asked after you. He says you and he have business. Write back. Your loving sister, Ruth.',
    },
    paras: [
      'That was her last letter. It came three days after you buried Amos.',
      'Coldwater sits at the bottom of a canyon where the sun comes up late and leaves early.',
    ],
  },
  3: {
    letter: {
      from: 'unsigned',
      text: 'Marshal Crane. You have been busy, and I do admire industry. Come to Babel Mesa and we shall settle our accounts like gentlemen. You will remember the terms, I trust. Cordially, G.',
    },
    paras: [
      "You found this card on Clara's headstone, weighed down with your own tin star.",
      'He talks about terms as if you shook on something. You would remember that. Wouldn\'t you?',
    ],
  },
};

// One story encounter per chapter, offered on the trail at step 2.
const STORY_EVENTS = {
  1: {
    id: 'stockyard_boy',
    title: 'The Stockyard Boy',
    kin: 'amos',
    text: "A boy of maybe twelve sits whittling on the stockyard fence where Amos died. \"You're his brother,\" he says without looking up. \"He talked about you. Said you was the best lawman in the territory. Before.\" \"Before what?\" \"Before the hanging. That's what he always said. Before the hanging.\"",
    options: [
      {
        label: 'Ask him about the man in grey.',
        run: (r, api) => {
          r.addJournal('The Grey Visitor', 'The stockyard boy says the man in grey came the night before Amos died. He shook Pike\'s hand, and Pike\'s hand came away black. Then he asked the boy whether he knew a Marshal Jonah Crane. "Tell him I\'m keeping the ledger," he said.');
          api.gainCard('dead_eye');
          return '"Said to tell you he\'s keeping the ledger," the boy says. "Whatever that means." He hands you a rifle cartridge Amos gave him. It is heavier than it should be. (Gain Dead Eye.)';
        },
      },
      {
        label: 'Ask him what hanging he means.',
        run: (r, api) => {
          r.flags.remembered = true;
          r.addJournal('Before the Hanging', '"Some drifter," the boy said. "Eli something. Amos said you hanged him and it weren\'t right, and you ain\'t been right since." You told him he didn\'t know what he was talking about. Your hands were shaking.');
          api.gainCard('grim_resolve');
          return '"Some drifter. Eli something," the boy says. "Amos said it weren\'t right." You tell him he doesn\'t know what he\'s talking about. Your hands are shaking. (Gain Grim Resolve.)';
        },
      },
      {
        label: 'Give him the money Amos would have. (25 gold)',
        req: r => r.gold >= 25,
        run: (r, api) => {
          r.gold -= 25;
          r.flags.boyHelped = true; // ten years on, the boy becomes a hunter (unlocks Toby Lark)
          r.addJournal("Amos's Boy", 'You gave the stockyard boy twenty-five dollars. He gave you Amos\'s pocketknife, the one with the elk-horn handle that you gave Amos for his sixteenth birthday.');
          api.gainCard('bowie_knife', true);
          return 'He pockets the money and hands you a knife with an elk-horn handle. You gave it to Amos for his sixteenth birthday. (Gain an upgraded Bowie Knife.)';
        },
      },
    ],
  },
  2: {
    id: 'sister_agnes',
    title: 'Sister Agnes',
    kin: 'ruth',
    text: "Coldwater's chapel is small and cold. When you give your name, Sister Agnes lights a candle for Ruth. \"She came to me a week before,\" the nun says. \"Frightened. She said the man in grey told her that her brother owed him a debt, and that debts pass down to family. She asked me what you could possibly owe a man like that.\" She waits. \"What do you owe him, Marshal?\"",
    options: [
      {
        label: 'Tell her the truth about Eli Wheeler.',
        run: (r, api) => {
          r.flags.confessed = true;
          r.addInfamy(-2);
          r.addJournal('Confession', 'Six years ago the Cinder County Butcher was killing children, and you could not catch him. A polite man in a grey suit bought you a drink and gave you a name: Eli Wheeler, a drifter. You hanged Eli Wheeler on that man\'s word, without a trial. The killings stopped. "Consider it a favor," the man said. "I\'ll collect someday."');
          r.hp = Math.min(r.maxHp, r.hp + 15);
          api.gainCard('last_rites');
          return 'You tell her everything: the Butcher, the man in grey, Eli Wheeler, the rope. You have never said it out loud before. When you finish, the candle has burned halfway down. Sister Agnes presses a blessed cartridge into your hand. "Finish it," she says. (Heal 15. Gain Last Rites.)';
        },
      },
      {
        label: '"I don\'t owe him a thing."',
        run: (r, api) => {
          r.addJournal('Denial', 'You left the chapel before the candle burned down. Sister Agnes called after you: "The ones who will not remember their debts are the ones who pay the most."');
          api.gainCard('blood_oath');
          return 'You leave before the candle burns down. "The ones who will not remember their debts," she calls after you, "are the ones who pay the most." (Gain Blood Oath.)';
        },
      },
    ],
  },
  3: {
    id: 'widow_wheeler',
    title: 'The Widow Wheeler',
    kin: 'clara',
    text: "At the foot of Babel Mesa stands the oldest cottonwood in the territory. A woman in black sits beneath it. You know the tree. You know the woman. You threw the rope over that branch yourself. \"Marshal Crane,\" says Martha Wheeler. \"He told me you'd come. The man in grey. He visits sometimes, to tell me how sorry he is about Eli. He laughs when he says it.\" She studies you. \"Eli never hurt a soul. You know that now, don't you?\"",
    options: [
      {
        label: 'Get down on your knees and ask her forgiveness.',
        run: r => {
          r.flags.forgiven = true;
          r.addInfamy(-1);
          r.addJournal('Martha Wheeler', '"I can\'t forgive you," Martha Wheeler said. "Not yet. But I can pray you finish it." She tied a strip of black cloth around your arm. For Eli.');
          r.hp = r.maxHp;
          return '"I can\'t forgive you," she says at last. "Not yet. But I can pray you finish it." She ties a strip of black cloth around your arm. For Eli. (Health fully restored.)';
        },
      },
      {
        label: '"I\'ll make him pay for Eli too."',
        run: (r, api) => {
          r.flags.vow = true;
          r.addJournal('A Fourth Name', 'You added a fourth name to the three you carry: Eli Wheeler. Martha said nothing. When you rode up the mesa she was still watching you.');
          api.gainCard('judgment', true);
          return 'You add a fourth name to the three you carry. Martha says nothing. When you ride away she is still watching. (Gain an upgraded Judgment.)';
        },
      },
      {
        label: 'Say nothing. Ride on.',
        run: r => {
          r.addJournal('Silence', 'You rode past Martha Wheeler without a word. You felt her eyes on your back all the way up the mesa.');
          r.gold += 40;
          return 'You ride on. You feel her eyes on your back all the way up the mesa. Later you find forty dollars in your saddlebag that you do not remember putting there. (Gain 40 gold.)';
        },
      },
    ],
  },
};

const FINALE = {
  text: [
    'The Gentleman in Grey lies in the red dust of the Between. His hat has rolled away. Under it there is no face, only a ledger bound in black leather where a heart should be, its pages full of names. He is still smiling.',
    '"Well played, Marshal. Here is the trouble. Someone has to keep the books. Put me down and the Veil stays open in your eyes for the rest of your life. Or pick up the hat, and the ledger, and you will never lose anyone again."',
  ],
  options: [
    { id: 'hunter', label: 'Put him down. Keep hunting.' },
    { id: 'rest', label: 'Burn the ledger.', req: r => r.flags.confessed || r.flags.forgiven, locked: 'You would have to face what you did first.' },
    { id: 'collector', label: 'Pick up the hat.' },
  ],
};

const ENDINGS = {
  hunter: {
    title: 'The Hunter',
    text: [
      'You put two rounds through the ledger. The Gentleman sighs like a man settling into a warm bath, and is gone.',
      "You ride back to Cinder County. The star is still on Clara's headstone, dull with two years of dust. You leave it there.",
      'The Veil stays open. You can still see them, the ones hiding in borrowed skins. You always will.',
      'You check your iron. Six rounds. You ride on.',
    ],
  },
  rest: {
    title: 'Rest',
    text: [
      "You tear the ledger out of him and feed it to the black sun, one page at a time. Amos. Ruth. Clara. Then a fourth name: Eli Wheeler. Then a fifth. Your own.",
      'The Between comes apart like wet paper.',
      "You wake at dawn on Clara's grave. The Sight is gone. The world is only the world, and it is very quiet.",
      'You ride to Babel Mesa and dig Eli Wheeler a proper grave beneath the cottonwood. Martha Wheeler brings wildflowers. Neither of you says anything. It is enough.',
    ],
  },
  collector: {
    title: 'The Gentleman in Grey',
    text: [
      'You pick up the grey hat. It fits. Of course it fits.',
      'The ledger is warm in your hands. Your own name is on the first page, in your own handwriting.',
      'The suit never gets dusty. You never get tired.',
      'Somewhere in the territory a desperate lawman is hunting a killer he cannot catch. You straighten your tie and go to buy him a drink.',
    ],
  },
};

// Remembered at the campfire, one per night.
const MEMORIES = [
  'Amos teaching you to throw a lasso when you were seven. You caught him instead of the fence post. He laughed until he fell over.',
  'Ruth singing "Shall We Gather at the River" at your wedding, and every dog in town howling along.',
  'Clara pressing her cold feet against you in January and pretending she had not.',
  'The smell of Clara\'s bread, and the burn on her wrist from the oven door that never quite healed.',
  "Amos's harmonica at the Fourth of July picnic. He knew two songs and played them both wrong.",
  'Ruth, twelve years old, beating you at checkers and refusing to let you forget it for a decade.',
  'The night you made marshal, and Clara pinning the star on crooked and saying it suited you better that way.',
  'Eli Wheeler\'s boots turning slowly in the wind. You try to think about something else. You cannot.',
  "Clara's last words to you: \"Mind that horse thief. He's faster than he looks.\" You laughed. You were out chasing him when it happened.",
];

// Said by townsfolk after you send their demon back.
const THANKS = [
  '"Obliged, mister," says the barkeep, and pours you one on the house.',
  "A little girl hands you a wildflower. Her mother pulls her away, but she's smiling.",
  'Nobody thanks you. Nobody saw what you saw. That is all right.',
  'The preacher rings the church bell. First time in a month, somebody says.',
  'An old man shakes your hand and will not let go. "I knew something was wrong with that one," he says. "I knew it."',
  '"You\'re the one hunting them," a woman whispers. "God keep you, Marshal."',
];

// ---------------------------------------------------------------------------
// OTHER HUNTERS' STORIES — the same three demons, seen by someone else.
// storyFor(hero) returns one bundle for any hunter; Jonah's is assembled from
// the tables above so nothing is written twice.
// ---------------------------------------------------------------------------
const CHAR_STORY = {
  martha: {
    intro: [
      'Six years ago Marshal Jonah Crane hanged your husband, Eli Wheeler, from the cottonwood at the foot of Babel Mesa. There was no trial. There was a stranger in a grey suit who said Eli was the Cinder County Butcher, and a marshal tired enough to believe him.',
      'The killings stopped. Everybody said that proved it. You knew better. Eli cried at weddings. Eli caught spiders in a teacup and carried them outside.',
      "Last spring you finally saw what nobody else can: the things that walk the frontier wearing people. Three of them built the rope that hanged Eli. A cattle baron who planted the evidence. A saloon madam who swore to a lie. And the Gentleman in Grey, who did the killing himself.",
      "You took Eli's shotgun down from over the door. You are going to clear his name, one skin at a time.",
    ],
    hunt: { 1: 'Hunting the man who planted the evidence.', 2: 'Hunting the woman who swore to the lie.', 3: 'Hunting the killer who got away with it.' },
    chapters: {
      1: { letter: { from: 'Eli Wheeler', text: "Martha. They say I'll hang Thursday. The Marshal is not a cruel man, only a tired one. Mr. Pike swears he found my coat by the stockyard, soaked through. It isn't my coat, Martha. Mine has your patch on the elbow. Don't let them tell you different. Water the tomatoes. Eli." },
        paras: ['Eli wrote that the night before they hanged him. The Marshal never read it. Nobody did.', 'Dry Hollow is cattle country, and every cow in it belongs to Silas Pike, the man who found the coat.'] },
      2: { letter: { from: 'Madame Odile', text: 'I, Odile Vasseur, proprietress of the Gilded Lily, Coldwater, do swear that on the night of the ninth I saw the drifter Eli Wheeler lead two children toward the dry wash. So help me God.' },
        paras: ['The court clerk sold you a copy of her statement for a dollar. Madame Odile signed it in a hand like no hand you have ever seen, all loops and no pressure.', 'Coldwater sits at the bottom of a canyon where the sun comes up late and leaves early.'] },
      3: { letter: { from: 'unsigned', text: 'Mrs. Wheeler. I was so sorry to hear about Eli. Truly. Come up to Babel Mesa and I will tell you everything you want to know about that night. I was there, after all. Cordially, G.' },
        paras: ['The card was tucked into your front door. Somebody had watered the tomatoes.', 'Marshal Crane is somewhere near the mesa too. You have not decided what you will do about him.'] },
    },
    bosses: {
      1: { cry: 'For Eli.', rest: 'One lie down.', reward: null,
        before: "Silas Pike swore on a stack of Bibles that he found Eli's coat in his stockyard, soaked in blood. It was a steer's blood, and it was not Eli's coat. Pike has been buying up land ever since with money nobody can account for.",
        taunt: '"Wheeler? Can\'t say I recall," says Silas Pike, and his jaw swings open like a gate. "Hanged a lot of men that summer."',
        last: '"The Gentleman paid me in land," the Steer gurgles as it burns. "Paid Odile in years. What do you suppose he\'ll pay you?"',
        after: "The Steer comes apart into smoke and flies. In Pike's office safe you find the coat: bloodstained, the wrong size, a price tag from the Dry Hollow mercantile still on the collar. You fold it carefully. It is evidence." },
      2: { cry: 'For Eli.', rest: 'Two lies down.', reward: null,
        before: 'Madame Odile swore to a lie in open court and has sworn to it every year since, to anyone who asks. She has not aged a day in six years.',
        taunt: '"I remember your Eli," says Madame Odile. "He cried for you at the end. It was very sweet. Stay a while, Mrs. Wheeler. I will tell you what he said."',
        last: '"He paid me in years," the Widow hisses. "Ask him what he paid the Marshal in." Then she comes apart.',
        after: 'The Widow unravels, thread by thread. In the silk you find her sworn statement, the original, and the ink is still wet. You watch the words crawl off the page like ants.' },
      3: { cry: 'For Eli.', rest: '', reward: null,
        before: 'The Gentleman in Grey is waiting at the top of Babel Mesa, in a suit that never gets dusty. He has been waiting six years for you, he says. He sounds pleased.',
        taunt: '"Mrs. Wheeler. You look well." He does not get up. "Your husband was very useful. A marshal needed a killer, and Eli was there. I only had to point." He smiles. "One rope, and the Marshal owed me everything he loved. I call that a bargain."',
        last: '',
        after: "The Gentleman folds into himself like a letter and burns. For a moment you smell Eli's pipe tobacco on the wind, and then it is only the wind." },
    },
    story: {
      1: { id: 'pikes_ledger', title: "Pike's Ledger", kicker: 'Eli',
        text: 'Pike\'s land office is empty after dark. In the bottom drawer of the desk is a ledger, and on the page for the summer Eli died is a single line in a hand like spilled ink: "Wheeler matter. Paid in full, 640 acres."',
        options: [
          { label: 'Take the ledger as evidence.', run: (r, api) => { r.flags.evidence = (r.flags.evidence || 0) + 1; r.addJournal('Paid in Full', 'Pike\'s ledger, the summer Eli died: "Wheeler matter. Paid in full, 640 acres." You have it now.'); api.gainCard('buckshot'); return 'You wrap the ledger in oilcloth and put it at the bottom of your saddlebag. (Evidence: 1. Gain Buckshot.)'; } },
          { label: 'Take the cash box and burn the office.', run: (r, api) => { r.gold += 45; r.addInfamy(1); r.addJournal('Fire in Dry Hollow', 'You burned Silas Pike\'s land office to the ground, ledger and all. It felt good. It proves nothing.'); return 'The cash box has forty-five dollars in it. The office burns until dawn. (Gain 45 gold. More Infamy.)'; } },
        ] },
      2: { id: 'pruitt_girl', title: 'The Pruitt Girl', kicker: 'Eli',
        text: 'The Pruitt children were the ones Madame Odile swore she saw with Eli. One of them lived. She is nineteen now and works the laundry behind the Gilded Lily. "I never saw your husband," she whispers. "Not ever. The lady told me what to say. She gave me a sugar mouse."',
        options: [
          { label: 'Ask her to swear to it in writing.', run: (r, api) => { r.flags.evidence = (r.flags.evidence || 0) + 1; r.addJournal("The Pruitt Girl's Statement", '"I never saw Eli Wheeler with me or my brother. Madame Odile told me what to say." Signed, with an X, and witnessed.'); api.gainCard('last_bullet'); return 'She signs with an X. Her hand shakes the whole time. (Evidence: 1 more. Gain The Last Bullet.)'; } },
          { label: 'Tell her it was never her fault.', run: r => { r.hp = Math.min(r.maxHp, r.hp + 15); r.addJournal('Sugar Mouse', 'You told the Pruitt girl it was never her fault. She cried, and so did you, a little.'); return 'She cries. So do you, a little. (Heal 15.)'; } },
        ] },
      3: { id: 'the_marshal', title: 'The Marshal', kicker: 'Eli',
        text: 'Under the cottonwood at the foot of Babel Mesa, a tired man in a long duster is sitting where you usually sit. He stands when he sees you. It is Jonah Crane. "Mrs. Wheeler," he says. "I know what I did. I know who I did it for. I don\'t expect anything from you."',
        options: [
          { label: 'Forgive him.', run: r => { r.flags.forgiven = true; r.addInfamy(-1); r.hp = r.maxHp; r.addJournal('Forgiveness', 'You forgave Jonah Crane under the tree where he hanged your husband. You are not sure you meant it. You said it anyway, and something in your chest came unknotted.'); return 'You say it before you can stop yourself. He takes off his hat and does not say anything at all. (Health fully restored.)'; } },
          { label: '"Then help me finish it."', run: (r, api) => { r.flags.ally = true; r.addJournal('An Unlikely Posse', 'Jonah Crane gave you a box of his silver rounds and told you where the Gentleman sleeps.'); api.gainCard('judgment', true); r.gainTonic('silver_box'); return 'He gives you a box of silver rounds and tells you where the Gentleman sleeps. (Gain an upgraded Judgment and a Box of Silver.)'; } },
          { label: 'Walk past him.', run: r => { r.addJournal('Walking Past', 'You walked past Jonah Crane without a word. He did not follow.'); r.gold += 30; return 'He does not follow. Later you find thirty dollars in your saddlebag that you did not put there. (Gain 30 gold.)'; } },
        ] },
    },
    finale: [
      "The Gentleman in Grey lies in the red dust of the Between. His hat has rolled away. Under it there is only a ledger bound in black leather, and on its first page is Eli's name, crossed out, with PAID written beside it. He is still smiling.",
      '"Well played, Mrs. Wheeler. Here is the trouble. Someone has to keep the books. Put me down and the Veil stays open in your eyes forever. Or pick up the hat, and you may write whatever you like in here. Even a pardon."',
    ],
    rest: { req: r => r.flags.forgiven || (r.flags.evidence || 0) >= 2, locked: 'You would need proof Eli was innocent, or to have forgiven the man who hanged him.' },
    endings: {
      hunter: { title: 'The Widow with the Shotgun', text: ['You put both barrels through the ledger.', "Eli's headstone still has MURDERER scratched into it. You leave it. You know the truth. That will have to be enough.", "The Veil stays open. You keep Eli's shotgun oiled, and you keep riding."] },
      rest: { title: 'Pardoned', text: ["You tear the ledger out of him and carry it down the mesa. In the morning you lay it on the circuit judge's desk with everything else you found.", 'It takes the territory eleven months to admit a mistake. The pardon comes on thick paper with a wax seal. You nail it to the cottonwood.', 'The Sight fades. You plant tomatoes. Some evenings a tired man in a long duster rides past and tips his hat, and some evenings you nod back.'] },
      collector: { title: 'The Lady in Grey', text: ['You pick up the grey hat. It fits.', 'You write a pardon for Eli in the ledger, in beautiful handwriting. Then you turn the page. There are so many other names.', 'Somewhere in the territory a tired marshal is hunting a killer he cannot catch. You straighten your gloves and go to buy him a drink.'] },
    },
    memories: [
      'Eli catching a spider in a teacup and carrying it out to the porch, talking to it the whole way.',
      'Eli sewing a patch on his own elbow, badly, because he did not want to bother you.',
      'The first tomato of the summer, split between the two of you with a pocketknife.',
      'Eli teaching the Pruitt children to whistle through a blade of grass, the week before.',
      'The cottonwood creaking in the wind. You still cannot sleep through it.',
      "Eli's last letter, read so many times the folds have worn through.",
    ],
    restFlash: 'You sleep with the shotgun across your knees. You dream Eli is humming in the kitchen.',
  },

  agnes: {
    intro: [
      'You were the sister at the Coldwater chapel for eleven years. You buried miners and babies and a sheriff, and you never once saw anything you could not explain.',
      "Then Ruth Crane came to sing in your choir. She had the finest voice in the territory and the saddest brother. One Sunday she did not come. The Gilded Lily said she had gone away. You held a funeral with an empty coffin, and at the graveside, God help you, you saw them.",
      "Demons. In the pews. In the saloon. In the mayor's house. Wearing people like Sunday clothes.",
      'The bishop told you to pray. You did. Then you took the revolver somebody left in the poor box and had it blessed by a priest who asked no questions.',
    ],
    hunt: { 1: 'Hunting the Steer of Dry Hollow.', 2: 'Hunting the thing that took Ruth.', 3: 'Hunting the one who keeps the ledger.' },
    chapters: {
      1: { letter: { from: 'Ruth Crane', text: "Sister. I've told Jonah nothing, he has enough to carry. But a man in a grey suit comes to the Lily every Saturday, and he knows things about my family no stranger should. He says my brother Amos is 'next in the ledger.' If anything happens to Amos, it was him. Pray for us. Ruth." },
        paras: ['Amos Crane was trampled in the Dry Hollow stockyards a week after Ruth wrote that.', 'Dry Hollow is cattle country, and every cow in it belongs to Silas Pike.'] },
      2: { letter: { from: 'Ruth Crane', text: "Sister, if you are reading this, I didn't come to choir. Madame Odile has asked me to sing for her alone tonight. I think I have to. I think if I don't, it will be Jonah. Don't let him come looking for me. He'll only get hurt. Your Ruth." },
        paras: ['Ruth left this under the hymnals the Sunday she vanished. You have never shown it to anyone.', 'The Gilded Lily is lit up tonight. It is always lit up.'] },
      3: { letter: { from: 'unsigned', text: "Sister Agnes. You have been praying very loudly. I hear everything, you know. Come up to Babel Mesa and we'll discuss your faith. I have always enjoyed a good theological argument. Cordially, G." },
        paras: ['It was nailed to the chapel door. The nail was still hot.', 'You cross yourself, load the Blessed rounds, and ride.'] },
    },
    bosses: {
      1: { cry: 'For Amos.', rest: 'Amos Crane can rest now.', reward: 'amos_harmonica',
        before: "Silas Pike owns every cow in Dry Hollow and most of the men. Ruth's letter named his Sunday visitor. Amos Crane died in Pike's stockyard. You mean to find out why.",
        taunt: '"A nun with a gun," says Silas Pike, and his jaw swings open like a gate. "Now I\'ve seen everything. Herd\'s hungry, Sister."',
        last: '"He keeps a ledger," the Steer gurgles as it burns. "The Crane boy was just a page."',
        after: "The Steer comes apart into smoke and flies. In the stockyard dust you find a battered harmonica. You will give it to Amos's brother, if you ever find him." },
      2: { cry: 'For Ruth.', rest: 'Ruth can rest now.', reward: 'ruths_rosary',
        before: "Madame Odile told the town Ruth had simply gone away. Ruth's note says otherwise. Tonight the Gilded Lily is full of music, and none of it is human.",
        taunt: '"Sister!" says Madame Odile, delighted. "Ruth sang your hymns for me, right up until she couldn\'t. Shall I teach you the words?"',
        last: '"You pray to someone who never answers," the Widow hisses. "He always answers." Then she comes apart.',
        after: "The Widow unravels, thread by thread. Tangled in the silk you find Ruth's rosary, every bead still warm. You say all fifty-nine beads, kneeling in the ruin of the Gilded Lily." },
      3: { cry: 'For all of them.', rest: '', reward: null,
        before: 'The Gentleman in Grey is waiting at the top of Babel Mesa. He has been collecting souls in this territory for longer than there has been a territory, and he has always been very polite about it.',
        taunt: '"Sister. You look tired." He does not get up. "You pray to someone who never answers. I always answer. Ask the Marshal. He asked me for one name, once, and look how generously he paid."',
        last: '',
        after: 'The Gentleman folds into himself like a letter and burns. The Between goes quiet, the way a church goes quiet after the last hymn.' },
    },
    story: {
      1: { id: 'burned_mission', title: 'The Burned Mission', kicker: 'Amos',
        text: 'The Dry Hollow mission burned the night after Amos Crane died. The padre is gone. The children who lived there are sleeping in Pike\'s barn now, and they will not stop staring at the cattle. "The cows talk," a little boy tells you. "At night. They say your name."',
        options: [
          { label: 'Bless the barn and stay the night.', run: (r, api) => { r.hp = Math.min(r.maxHp, r.hp + 12); api.gainCard('load_blessed'); r.addJournal('The Children in the Barn', 'You blessed Pike\'s barn and sat up all night with the mission children. The cattle did not talk. They only watched.'); return 'The cattle do not talk that night. They only watch. (Heal 12. Gain Load Blessed.)'; } },
          { label: 'Ask the boy what else the cows say.', run: (r, api) => { r.flags.remembered = true; api.gainCard('glimpse'); r.addJournal('What the Cows Say', '"They say the Crane family is all in the ledger," the boy said. "They say the Marshal signed it himself."'); return '"They say the Crane family is all in the ledger," he says. "They say the Marshal signed it himself." (Gain Glimpse.)'; } },
        ] },
      2: { id: 'confessional', title: 'The Confessional', kicker: 'Ruth',
        text: 'Someone is waiting in the Coldwater confessional. Through the grille you know the voice: Jonah Crane, Ruth\'s brother, who has not been inside a church in six years. "Sister," he says. "I need to tell someone what I did."',
        options: [
          { label: 'Hear his confession.', run: (r, api) => { r.flags.confessed = true; r.addInfamy(-2); r.hp = Math.min(r.maxHp, r.hp + 15); api.gainCard('last_rites'); r.addJournal('Confession', 'Jonah Crane confessed to you: the Butcher he could not catch, the polite man in grey who gave him a name, and Eli Wheeler, whom he hanged without a trial. You gave him absolution. You were not sure you had the right.'); return 'He tells you everything: the Butcher, the man in grey, Eli Wheeler, the rope. You give him absolution. You are not sure you have the right. (Heal 15. Gain Last Rites.)'; } },
          { label: '"Find Ruth first. Confess after."', run: (r, api) => { api.gainCard('blood_oath'); r.addJournal('Not Yet', 'You sent Jonah Crane away from the confessional. You told yourself it was for Ruth.'); return 'He leaves without another word. You tell yourself it was for Ruth. (Gain Blood Oath.)'; } },
        ] },
      3: { id: 'widow_and_sister', title: 'The Widow Wheeler', kicker: 'Eli',
        text: 'Martha Wheeler is sitting under the cottonwood at the foot of Babel Mesa. "You\'re the nun," she says. "The Marshal told you, didn\'t he. About Eli." She looks at your rosary. "Does God forgive a man for that?"',
        options: [
          { label: '"He does. The question is whether you can."', run: r => { r.flags.forgiven = true; r.hp = r.maxHp; r.addJournal('The Question', 'You told Martha Wheeler that God forgives. She asked whether she had to. You did not have an answer. She let you pray with her anyway.'); return 'She is quiet a long time. Then she lets you pray with her. (Health fully restored.)'; } },
          { label: '"Ask the Gentleman. He wrote the ledger."', run: (r, api) => { api.gainCard('judgment', true); r.addJournal('The Ledger', 'You told Martha Wheeler the Gentleman wrote the ledger. She handed you a box of her husband\'s shells without a word.'); return 'She hands you a box of her husband\'s shells without a word. (Gain an upgraded Judgment.)'; } },
        ] },
    },
    finale: [
      'The Gentleman in Grey lies in the red dust of the Between. His hat has rolled away. Under it there is no face, only a ledger bound in black leather where a heart should be, full of names: Amos, Ruth, Clara, Eli, and thousands more. He is still smiling.',
      '"Well played, Sister. Here is the trouble. Someone has to keep the books. Put me down and the Veil stays open in your eyes forever. Or pick up the hat, and you may decide who is saved. Isn\'t that what you always wanted?"',
    ],
    rest: { req: r => r.flags.confessed || r.flags.forgiven, locked: 'You would have to have heard a confession, or offered forgiveness.' },
    endings: {
      hunter: { title: 'The Riding Sister', text: ['You put a Blessed round through the ledger and say a prayer for whatever the Gentleman used to be.', 'The bishop asks for his revolver back. You tell him you lost it.', 'The Veil stays open. There are still things in the pews on Sunday. You keep Blessed rounds in the collection plate, where they are handy.'] },
      rest: { title: 'Absolution', text: ['You tear the ledger out of him and read every name aloud, one by one, and at each name the page burns white. It takes all night.', 'When you reach the end, the Sight goes out of you like a candle.', 'You go back to Coldwater. The choir needs a soprano. On the first Sunday, a tired man in a long duster sits in the back pew and, for the first time in six years, sings.'] },
      collector: { title: 'The Grey Sister', text: ['You pick up the grey hat. It fits.', 'You tell yourself you will only use it to save people. You tell yourself that for a long time.', 'The suit never gets dusty. The ledger never runs out of pages.'] },
    },
    memories: [
      'Ruth hitting the high note in "Shall We Gather at the River" and the whole congregation forgetting to breathe.',
      'Ruth stealing communion wafers to feed the chapel mouse, and confessing it every single week.',
      'Burying an empty coffin, and letting the congregation believe she was inside.',
      "Ruth's brother at the back of the church at her funeral, not coming in.",
      'Your mother telling you God speaks quietly. He has not spoken at all lately.',
      "Ruth's rosary, which you never could find after she vanished.",
    ],
    restFlash: 'You say the evening office by firelight and sleep with your rosary around the revolver.',
  },
};

/** Everything story-shaped for one hunter, in one shape. */
function storyFor(hero) {
  const alt = CHAR_STORY[hero];
  if (alt) {
    return {
      intro: alt.intro, hunt: ch => alt.hunt[ch], chapter: ch => alt.chapters[ch],
      boss: ch => ({ ...ENCOUNTERS[ch].boss, ...alt.bosses[ch] }),
      story: ch => alt.story[ch], finaleText: alt.finale, finale4Text: alt.finale4, rest: alt.rest, endings: alt.endings,
      memories: alt.memories, restFlash: alt.restFlash, voiced: false,
    };
  }
  const kin = ch => FAMILY[ENCOUNTERS[ch].boss.kin];
  return {
    intro: STORY.intro, hunt: ch => (ch === 4 ? 'Hunting the one who keeps the books.' : `Hunting the one who killed ${kin(ch)}.`), chapter: ch => CHAPTER_INTROS[ch],
    boss: ch => (ch === 4 ? { ...ENCOUNTERS[4].boss, cry: 'For all of them.', rest: '' } : { ...ENCOUNTERS[ch].boss, cry: `For ${kin(ch)}.`, rest: `${kin(ch)} can rest now.` }),
    story: ch => ({ ...STORY_EVENTS[ch], kicker: kin(ch) }), finaleText: FINALE.text, finale4Text: FINALE4.text,
    rest: { req: FINALE.options[1].req, locked: FINALE.options[1].locked }, endings: ENDINGS,
    memories: MEMORIES, restFlash: 'You sleep with your hat over your eyes and your hand on your iron. You dream of Clara laughing.', voiced: true,
  };
}

// Make available to Node (tests) as well as the browser.
if (typeof module !== 'undefined') {
  module.exports = { CHAR_STORY, storyFor, THANKS, EVENTS, STORY, CHAPTER_INTROS, STORY_EVENTS, FINALE, ENDINGS, MEMORIES };
  Object.assign(globalThis, module.exports);
}
