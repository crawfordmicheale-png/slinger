'use strict';
// ---------------------------------------------------------------------------
// SLINGER — Chapter IV, the Far Side, and Toby Lark's story. Loaded after
// story.js, whose tables it extends.
//
// When the Gentleman in Grey falls, a hunter can follow his ledger through the
// Veil into the Between itself: a ghost frontier where the dead keep house, and
// where the Proprietor, who owns the books, has been waiting. Each hunter meets
// the one they lost there, and a fourth ending opens: tear out the last page.
// ---------------------------------------------------------------------------

// ---- Jonah ------------------------------------------------------------------
CHAPTER_INTROS[4] = {
  letter: {
    from: 'Clara Crane',
    text: "Jonah. It's quiet here. That's the first thing you'd notice. The second is that it isn't over. He only ever collected, love. Somebody else keeps the books, and now that his collector is gone he'll come to the door himself. Don't come looking for me. You will anyway. Bring Amos's harmonica, and wipe your boots. C.",
  },
  paras: [
    'The Far Side is the Between with the lamps put out. The same canyon, the same towns, the same black sun, but the people on the boardwalks are the dead, and some of the dead are not people.',
    'Somewhere at the bottom of the canyon a man in a white suit is keeping the books.',
  ],
};

STORY_EVENTS[4] = {
  id: 'porch',
  title: 'The Porch',
  kin: 'clara',
  text: "A house at the end of Lastlight's only street, the same as your house in Cinder County down to the loose step. Clara is sitting on the porch, shelling peas into her apron like it is any Tuesday. \"You're late,\" she says. \"You were always late. Sit down, Jonah.\"",
  options: [
    {
      label: 'Ask her to come home with you.',
      run: r => {
        r.hp = r.maxHp;
        r.addJournal('The Porch', '"This is home now," Clara said, and took your hand. "But I\'ll walk you to the edge, when it\'s time." She was warm. You had not expected her to be warm.');
        return '"This is home now," she says, and takes your hand. "But I\'ll walk you to the edge, when it\'s time." She is warm. You did not expect her to be warm. (Health fully restored.)';
      },
    },
    {
      label: 'Tell her about Eli Wheeler.',
      run: (r, api) => {
        r.flags.confessed = true;
        r.addJournal('What Clara Knew', '"I know," Clara said. "The man in grey told me, the night he came. He thought it would hurt me. It only made me sorry for you."');
        api.gainCard('say_her_name', true);
        return '"I know," she says. "He told me, the man in grey, the night he came. He thought it would hurt me." She shakes her head. "It only made me sorry for you." (Gain an upgraded Say Her Name.)';
      },
    },
    {
      label: 'Just sit with her.',
      run: (r, api) => {
        r.sight = r.maxSight;
        api.removeCardPrompt();
        r.addJournal('An Hour on the Porch', 'You sat with Clara while she shelled peas. Neither of you said anything for a long time.');
        return 'You sit. She shells peas. Neither of you says anything for a long time, and it is the best hour you have spent in two years. (Veil Sight restored. Let go of a card.)';
      },
    },
  ],
};

const FINALE4 = {
  text: [
    'The ledger lies open on its lectern in the ash. On the last page are four names in your own handwriting: Amos Crane, Ruth Crane, Clara Crane, Eli Wheeler. Under them, in his: Jonah Crane, balance due.',
    '"You can close it," says Clara, at the edge of the firelight. "Tear out the last page and every name on it goes free. Even yours. But you can\'t keep the Sight after, love. And you can\'t come back here."',
  ],
  options: [
    { id: 'lastpage', label: 'Tear out the last page.' },
    { id: 'keeper', label: 'Pick up the pen.' },
  ],
};

// The choice that leads here, offered on the Chapter III finale.
FINALE.options.push({ id: 'farside', label: 'Follow the ledger through the Veil. (Chapter IV: the Far Side)' });

ENDINGS.lastpage = {
  title: 'The Last Page',
  text: [
    'You tear out the last page. It comes away easily, as if it had been waiting to.',
    'Amos goes first, laughing, his harmonica out of tune. Ruth goes singing. Eli Wheeler stops at the edge of the light, tips his hat to you, and goes. Clara walks you all the way to the edge of the Far Side, and then she lets go of your hand.',
    'You wake on her grave in Cinder County with the sun on your face. The Sight is gone. Your tin star is in your pocket, polished, though you do not remember polishing it.',
    'You pin it back on. Somebody in this county should be a lawman who asks questions first.',
  ],
};
ENDINGS.keeper = {
  title: 'The Proprietor',
  text: [
    'You pick up the pen. It is warm, and it fits your hand like your old revolver.',
    "You could write anything. You write Clara's name somewhere safe, and then you keep writing.",
    'The white suit never gets dusty. Somewhere in the territory a tired lawman is hunting a killer he cannot catch, and a polite man in grey is on his way to buy him a drink. You sent him.',
  ],
};

// ---- Martha -------------------------------------------------------------------
Object.assign(CHAR_STORY.martha.hunt, { 4: 'Hunting the one who owns Eli\'s debt.' });
CHAR_STORY.martha.chapters[4] = {
  letter: { from: 'Eli Wheeler', text: "Martha. They let me write one more, here. It's not so bad. There's a creek and a lot of tomatoes, though they don't taste of anything. The man who owns this place has my name in his book, and yours under it, in pencil. Pencil, Martha. That means he hasn't decided. Don't let him decide. Eli." },
  paras: ["Eli's handwriting, the patch-on-the-elbow kind, on paper that smells of river water.", "The Far Side is the Between with the lamps put out. Somewhere at the bottom of the canyon, the man who owns Eli's debt is keeping the books."],
};
CHAR_STORY.martha.bosses[4] = {
  cry: 'For Eli.', rest: '', reward: null,
  before: "The Proprietor owns the Far Side, and every name in the ledger. Eli's is in ink. Yours is in pencil.",
  taunt: '"Mrs. Wheeler." The Proprietor turns a page. "Your husband was a bargain. The Marshal paid three souls for one rope. I would make you the same offer, if I thought you had three to spare."',
  last: '', after: '',
};
CHAR_STORY.martha.story[4] = {
  id: 'creek', title: 'The Creek', kicker: 'Eli',
  text: "There is a creek at the edge of Mercy Flats, and a man in shirtsleeves is sitting on the bank with his boots off, catching spiders in a teacup and carrying them to the grass. He looks up. \"Martha,\" says Eli Wheeler. \"You came all this way. You never did know when to quit.\"",
  options: [
    { label: 'Tell him the territory will clear his name.', run: r => { r.flags.evidence = (r.flags.evidence || 0) + 1; r.addJournal('A Promise at the Creek', 'You told Eli the territory would clear his name. He said he believed you. He always did.'); return '"I believe you," he says. "I always did." He gives you the teacup, spider and all. (Evidence: 1 more.)'; } },
    { label: 'Sit with him by the creek. (Heal fully)', run: r => { r.hp = r.maxHp; r.addJournal('The Creek', 'You sat with Eli by the creek until the black sun moved. He hummed. You let him.'); return 'He hums while you sit. You let him. (Health fully restored.)'; } },
    { label: 'Ask him who really did it.', run: (r, api) => { r.flags.forgiven = true; api.gainCard('last_bullet', true); r.addJournal('The Real Butcher', '"The man in grey," Eli said. "But the Marshal only tied the knot. Forgive him, Martha. I did, the first week."'); return '"The man in grey," Eli says. "But the Marshal only tied the knot. Forgive him. I did, the first week." (Gain an upgraded Last Bullet.)'; } },
  ],
};
CHAR_STORY.martha.finale4 = [
  "The ledger lies open in the ash. Eli's name is there in ink, and yours under it in pencil, already half rubbed out.",
  'Eli stands at the edge of the firelight with his hat in his hands. "You can tear it out, Martha. The last page. Every name on it goes free, mine too. But then the Sight goes, and you can\'t come back for me."',
];
Object.assign(CHAR_STORY.martha.endings, {
  lastpage: { title: 'Paid in Full', text: ['You tear out the page.', 'Eli kisses your forehead the way he used to when you burned the biscuits, and walks off into the light with his boots in his hand.', 'You wake under the cottonwood at the foot of Babel Mesa. The rope scar on the branch is gone, as if the tree had grown over it in a single night.', 'The pardon comes in the spring. You plant tomatoes, and they taste of everything.'] },
  keeper: { title: 'The Widow Proprietor', text: ['You pick up the pen.', "You write Eli's name in the margin, where nothing can reach it. Then you begin, carefully, to rewrite the hanging. Then the trial that never was. Then the Marshal.", 'It is a very long book, and you have all the time there is.'] },
});

// ---- Agnes --------------------------------------------------------------------
Object.assign(CHAR_STORY.agnes.hunt, { 4: 'Hunting the one who keeps the prayers.' });
CHAR_STORY.agnes.chapters[4] = {
  letter: { from: 'Ruth Crane', text: "Sister. You'll be glad to know there's a choir here, though the acoustics are terrible and the director is a demon. I sing anyway. The man in the white suit came to hear me. He said my brother's name and then yours, Agnes, and then he wrote something down. Don't come. Do come. Bring the Blessed rounds. Your Ruth." },
  paras: ["Ruth's hand, on a page torn out of a hymnal.", 'The Far Side is the Between with the lamps put out. Somewhere at the bottom of the canyon a man in a white suit is keeping the books, and the prayers.'],
};
CHAR_STORY.agnes.bosses[4] = {
  cry: 'For Ruth.', rest: '', reward: null,
  before: 'The Proprietor owns the Far Side and every name in the ledger, and every prayer said for every one of them.',
  taunt: '"Sister." The Proprietor dips his pen. "You have prayed every night for eleven years. I want you to know that I have kept every one of those prayers. They are all in here. Shall I read you one?"',
  last: '', after: '',
};
CHAR_STORY.agnes.story[4] = {
  id: 'choir_loft', title: 'The Choir Loft', kicker: 'Ruth',
  text: "The chapel in Mercy Flats has no roof and no congregation, but the choir loft is full of light. Ruth Crane is standing in it in her good Sunday dress, running her scales. She stops when she sees you. \"Sister! You came. Sing the alto, would you? Nobody here can hold a harmony.\"",
  options: [
    { label: 'Sing with her. (Heal fully, restore Sight)', run: r => { r.hp = r.maxHp; r.sight = r.maxSight; r.addJournal('The Choir Loft', 'You sang the alto. Ruth sang the soprano. For the length of one hymn the Far Side was quiet.'); return 'You sing the alto. She sings the soprano. For the length of one hymn the Far Side is quiet. (Health and Sight restored.)'; } },
    { label: 'Hear her confession.', run: (r, api) => { r.flags.confessed = true; api.gainCard('last_rites', true); r.addJournal("Ruth's Confession", 'Ruth confessed that she went to sing for Madame Odile alone so that the Gentleman would leave Jonah be. "It didn\'t work," she said. "It was worth a try."'); return '"I went to her alone so he would leave Jonah be," Ruth says. "It didn\'t work. It was worth a try." (Gain an upgraded Last Rites.)'; } },
    { label: 'Ask what the man in white wrote down.', run: (r, api) => { api.gainCard('pierce_veil', true); r.addJournal('What He Wrote', '"Your name," Ruth said. "In red. He said red is for the ones who come looking."'); return '"Your name," she says. "In red. He said red is for the ones who come looking." (Gain an upgraded Pierce the Veil.)'; } },
  ],
};
CHAR_STORY.agnes.finale4 = [
  "The ledger lies open in the ash. Ruth's name is there, and Amos's, and Clara's, and Eli's, and under them thousands more. Yours is on the last line, in red.",
  'Ruth is singing somewhere past the firelight, the last verse of "Shall We Gather at the River." She stops. "Tear it out, Sister. The last page. They all go free. You can\'t keep the Sight after. But you never wanted it."',
];
Object.assign(CHAR_STORY.agnes.endings, {
  lastpage: { title: 'Amen', text: ['You tear out the page and read every name on it aloud, and at each name a voice in the dark answers, "Here."', 'Ruth answers last, on a high note.', 'You wake in the Coldwater chapel at dawn with the hymnals scattered around you. The Sight is gone. The choir has a new soprano by Sunday, and she is nearly as good.'] },
  keeper: { title: 'The Sister in White', text: ['You pick up the pen. You tell yourself you will only write mercy.', "You write mercy for a long time. Then you write justice, which is mercy's harder cousin. Then you stop telling yourself anything at all.", 'The suit is white. It never gets dusty.'] },
});

// ---- Toby Lark: the stockyard boy, ten years on ---------------------------------
CHAR_STORY.toby = {
  intro: [
    "You were the stockyard boy in Dry Hollow. Amos Crane taught you to whittle, to rope, and never to look the cattle in the eye. When they found Amos in the stockyard, you were the one who found him first.",
    'His brother the Marshal came through afterwards and killed the thing that wore Silas Pike, and two more like it, and then rode off into the Between and did not come back.',
    'That was ten years ago. Last month the Hollow Steer was grazing outside Dry Hollow again, as fat and patient as ever. The ledger has started writing them back in.',
    "You have Amos's pocketknife, a sack of traps, and Ranger, who has never once in his life been afraid of anything. It will have to be enough.",
  ],
  hunt: { 1: 'Hunting the Steer that came back.', 2: 'Hunting the Widow that came back.', 3: 'Hunting the Gentleman that came back.', 4: 'Hunting the one who keeps writing them in.' },
  chapters: {
    1: { letter: { from: 'Amos Crane', text: "Toby. If you're reading this I'm dead, and Mrs. Hatch has kept her word and given you my box. In it is my knife and twenty dollars. The knife is for whittling. The money is for school. If Pike's cows ever come back, use the money for bullets instead and don't tell Mrs. Hatch. Your friend, Amos." },
      paras: ['You never did go to school. You did buy bullets.', 'Dry Hollow has a new cattle baron. His herd does not graze and does not drink.'] },
    2: { letter: { from: 'unsigned', text: 'To the boy with the dog. You are making a nuisance of yourself. The Gilded Lily has reopened under new management, and the new management would very much like you to come and hear her sing. Bring the dog. She is fond of dogs. Cordially, G.' },
      paras: ['Ranger growled at the letter until you burned it.', 'Coldwater sits at the bottom of a canyon where the sun comes up late and leaves early.'] },
    3: { letter: { from: 'Martha Wheeler', text: 'Mr. Lark. I am told you are hunting the man in grey. So was the Marshal, ten years ago, and so was I. At the end he went through, into the Between. He did not come back, and the man in grey did. Whatever you do at the top of the mesa, do not let the ledger fall shut with you on the wrong side. Mrs. E. Wheeler.' },
      paras: ["Martha Wheeler is an old woman now. She still keeps her husband's shotgun over the door.", 'Babel Mesa stands over the territory like a judge.'] },
    4: { letter: { from: 'Jonah Crane', text: "Kid. Amos's boy, if I have it right. I've been on this side ten years. There's a man here in a white suit who keeps the books, and every time you put one of his down, he writes it back in. Can't be done from out there. Has to be done from here. Bring the dog. I miss dogs. J. Crane, formerly Marshal." },
      paras: ['The letter came out of the river at Mercy Flats, dry as a bone.', 'The Far Side is the Between with the lamps put out. Somewhere at the bottom of the canyon a man in a white suit is keeping the books, and the Marshal is waiting for you.'] },
  },
  bosses: {
    1: { cry: 'For Amos.', rest: 'Amos can rest again.', reward: 'amos_harmonica',
      before: 'The thing that wore Silas Pike is wearing someone new: a cattle buyer from Abilene, big and smiling. The herd is the same herd. You know it by the way it watches Ranger.',
      taunt: '"The stockyard boy," the cattle buyer says, and his jaw swings open like a gate. "Amos was fond of you. He said so, right at the end."',
      last: '"He writes us back in, boy. Every time. You\'re only keeping the books warm."',
      after: "The Steer comes apart into smoke and flies for the second time in ten years. In the ash is Amos's harmonica, the one the Marshal took. The ledger gave that back too." },
    2: { cry: 'For Ruth.', rest: 'Ruth can rest again.', reward: 'ruths_rosary',
      before: 'The Gilded Lily has a new madam with an old face. The girls who sing there go missing on Saturdays, the same as ten years ago.',
      taunt: '"A dog," says Madame Odile, delighted. "I adore dogs. They are so loyal, right up to the end. Stay a while, little hunter."',
      last: '"The Marshal is still on the other side," the Widow hisses. "He never came home. Ask the ledger why."',
      after: "The Widow unravels again, thread by thread. Ruth's rosary is tangled in the silk, every bead still warm, as if no time had passed at all." },
    3: { cry: 'For all of them.', rest: '', reward: null,
      before: 'The Gentleman in Grey is waiting at the top of Babel Mesa, in a suit that never gets dusty. He was put down ten years ago. He does not seem to mind.',
      taunt: '"Mr. Lark. The stockyard boy." He does not get up. "Your friend Amos owed me nothing. I took him anyway, to make a point to his brother. You understand. A ledger has to balance."',
      last: '', after: 'The Gentleman folds into himself like a letter and burns. Ranger sits down in the ash and will not stop growling at the place where the Veil is thinnest.' },
    4: { cry: 'For Amos. For all of them.', rest: '', reward: null,
      before: 'The Proprietor owns the Far Side and every name on it. The Marshal is on his books, ten years overdue. So, as of this morning, are you.',
      taunt: '"Mr. Lark." The Proprietor turns a page. "Every time you put one of mine down, I write it back. Do you know why? Because somebody always comes to put it down again. You are very good for business."',
      last: '', after: '' },
  },
  story: {
    1: { id: 'stockyard_again', title: 'The Stockyard', kicker: 'Amos',
      text: "The stockyard fence where you used to whittle is still standing. Somebody carved AMOS into the top rail, years ago, in a child's hand. Yours. Ranger sniffs it and whines.",
      options: [
        { label: 'Carve a new name under it.', run: (r, api) => { api.gainCard('good_boy', true); r.addJournal('The Top Rail', 'You carved RANGER under AMOS on the top rail of the stockyard fence. Ranger approved.'); return 'You carve RANGER under AMOS. Ranger approves, loudly. (Gain an upgraded Good Boy.)'; } },
        { label: 'Search the yard where Amos fell.', run: (r, api) => { api.gainCard('bear_trap', true); r.addJournal('Where Amos Fell', "In the mud where Amos fell you found one of Pike's old trap chains, the links bitten through. Something big bit through iron."); return 'In the mud you find one of Pike\'s old trap chains, the links bitten clean through. You keep it. (Gain an upgraded Bear Trap.)'; } },
        { label: 'Sit on the rail a while. (Heal 15)', run: r => { r.hp = Math.min(r.maxHp, r.hp + 15); r.addJournal('The Rail', 'You sat on the stockyard rail where you used to sit with Amos, and did not look the cattle in the eye.'); return 'You sit where you used to sit with Amos, and you do not look the cattle in the eye. (Heal 15.)'; } },
      ] },
    2: { id: 'lily_back', title: 'Behind the Lily', kicker: 'Ruth',
      text: 'Behind the Gilded Lily a girl of about twelve is hiding in the woodpile, the way you used to hide in the stockyard. She says the lady inside sings to the other girls until they stop coming down for breakfast.',
      options: [
        { label: 'Take her somewhere safe. (Gain On the Scent)', run: (r, api) => { api.gainCard('on_the_scent'); r.addInfamy(-1); r.addJournal('The Woodpile Girl', 'You took the girl from the woodpile to the chapel. Sister Agnes, very old now, took her in without a word.'); return 'You take her to the chapel. An old nun takes her in without a word, and gives Ranger the heel of a loaf. (Gain On the Scent. Less Infamy.)'; } },
        { label: 'Let Ranger stay with her tonight. (Ranger bites 1 harder for the rest of the hunt)', run: r => { r.flags.rangerBonus = (r.flags.rangerBonus || 0) + 1; r.addJournal('A Dog for the Night', 'You left Ranger with the girl in the woodpile overnight. In the morning he came back with blood on his muzzle and a very satisfied look.'); return 'In the morning Ranger comes back with blood on his muzzle and a very satisfied look. The girl is fine. (Ranger bites 1 harder for the rest of the hunt.)'; } },
      ] },
    3: { id: 'old_widow', title: 'Martha Wheeler', kicker: 'Eli',
      text: 'Martha Wheeler is waiting under the cottonwood at the foot of Babel Mesa, white-haired now, her husband\'s shotgun across her knees. "The Marshal went through," she says. "At the end. He made a choice up there, and it wasn\'t the one anybody expected. You\'ll have to make one too."',
      options: [
        { label: 'Ask her what he chose.', run: r => { r.flags.confessed = true; r.addJournal('What the Marshal Chose', '"He followed the ledger through," Martha said. "Into the Between. He told me about Eli first. All of it." She looked at the mesa. "I forgave him. Took me nine years."'); return '"He followed it through, into the Between. He told me about Eli first. All of it." She looks at the mesa. "I forgave him. Took me nine years."'; } },
        { label: 'Ask her for shells. (Gain an upgraded Judgment)', run: (r, api) => { api.gainCard('judgment', true); r.addJournal('Shells', "Martha Wheeler gave you a box of her husband's shotgun shells without a word."); return 'She hands you a box of her husband\'s shells without a word. (Gain an upgraded Judgment.)'; } },
        { label: 'Ask her to forgive him, for you. (Heal fully)', run: r => { r.flags.forgiven = true; r.hp = r.maxHp; r.addJournal('For the Marshal', '"I already did," Martha said. "But it\'s good somebody asked."'); return '"I already did," she says. "But it\'s good somebody asked." (Health fully restored.)'; } },
      ] },
    4: { id: 'marshal', title: 'The Marshal', kicker: 'Amos',
      text: "Jonah Crane is sitting on the porch of a house at the end of Lastlight's only street, older than you remember and younger than he should be. A woman is shelling peas beside him. He looks at you, then at Ranger, and almost smiles. \"Amos's boy,\" he says. \"You came the long way round.\"",
      options: [
        { label: 'Ask him to come home.', run: r => { r.hp = r.maxHp; r.addJournal('The Marshal', '"This is home now," the Marshal said. "But I\'ll see you to the edge."'); return '"This is home now," he says. "But I\'ll see you to the edge, when it\'s time." (Health fully restored.)'; } },
        { label: 'Ask him how to close the books.', run: (r, api) => { r.flags.confessed = true; api.gainCard('deadfall', true); r.addJournal('How to Close the Books', '"Tear out the last page," the Marshal said. "Everybody on it goes free. Me too. Don\'t look so sad about it, kid."'); return '"Tear out the last page," he says. "Everybody on it goes free. Me too. Don\'t look so sad about it, kid." (Gain an upgraded Deadfall.)'; } },
        { label: "Give him Amos's harmonica.", req: r => r.has('amos_harmonica'), run: r => { r.keepsakes = r.keepsakes.filter(k => k !== 'amos_harmonica'); r.maxHp += 10; r.hp = r.maxHp; r.addJournal('The Harmonica', 'You gave the Marshal his brother\'s harmonica. He played it badly, both songs wrong, and laughed until he cried.'); return 'He plays it badly, both songs wrong, and laughs until he cries. (Lose Amos\'s Harmonica. +10 max HP, fully healed.)'; } },
      ] },
  },
  finale: [
    'The Gentleman in Grey lies in the red dust of the Between for the second time in ten years. His hat has rolled away. Under it is the ledger, and in it, freshly inked, the Hollow Steer, the Silk Widow, and himself.',
    '"Well played, Mr. Lark. You see the trouble. Put me down and he writes me back in. Pick up the hat, and you could stop him writing anyone at all. Or follow the ledger through, the way the Marshal did, and see who keeps it."',
  ],
  finale4: [
    'The ledger lies open in the ash on the Far Side. Every name you have ever put down is on the last page, and under them, Jonah Crane, ten years overdue.',
    'The Marshal is standing at the edge of the firelight with Ranger leaning on his leg. "Tear it out, kid," he says. "The last page. They don\'t come back after that. Neither do I. That\'s fine. Amos would want you to have a quiet life."',
  ],
  rest: { req: r => r.flags.confessed || r.flags.forgiven, locked: 'You would need to understand what the Marshal chose, or forgive him for it.' },
  endings: {
    hunter: { title: 'The Tracker', text: ['You put two rounds through the ledger. The Gentleman sighs, and is gone, and you know he will be back.', 'You ride home to Dry Hollow. Ranger rides in front of the saddle, the way he did when he was a pup.', 'You keep the traps oiled. You will be here when they come back.'] },
    rest: { title: 'A Quiet Life', text: ["You tear the ledger out of the Gentleman and feed it to the black sun. The Hollow Steer's page burns blue.", "The Sight goes out of you on the ride down the mesa. Ranger doesn't notice the difference; he never needed it.", 'You go to school in Abilene at twenty-two, the oldest boy in the room, on twenty dollars a dead man left you. Amos would have laughed himself sick.'] },
    collector: { title: 'The Boy in Grey', text: ['You pick up the grey hat. It is too big. Then it fits.', 'Ranger will not come near you after that. He sits at the bottom of the mesa and howls until morning, and then he goes home without you.', 'The suit never gets dusty.'] },
    lastpage: { title: 'Balance Paid', text: ['You tear out the last page.', 'The Marshal shakes your hand like a man, then thinks better of it and hugs you like a boy. He scratches Ranger behind the ears, and goes, and does not look back.', 'You wake in the stockyard at Dry Hollow with Ranger licking your face. There is no herd. There never will be again.', 'You whittle a new name into the top rail, under AMOS and RANGER: JONAH. Then you go and buy a bigger pan.'] },
    keeper: { title: "The Proprietor's Boy", text: ['You pick up the pen.', 'You write Amos back into the world first, then the Marshal, then everyone. The ledger lets you. It is very generous, at first.', 'Ranger finds his way home alone. He waits at the stockyard every evening for the rest of his life.'] },
  },
  memories: [
    'Amos teaching you to whittle a duck, which came out looking like a boot. He kept it on his windowsill anyway.',
    'Ranger as a pup, asleep in your hat, which he had also chewed.',
    "Amos's harmonica at the Fourth of July picnic. Two songs, both wrong.",
    'The Marshal riding out of Dry Hollow after the Steer burned, not looking back. You waved anyway.',
    'Mrs. Hatch handing you a tin box with twenty dollars and a pocketknife in it, and crying.',
    'Ranger dragging you out of the creek the winter you went through the ice.',
  ],
  restFlash: 'Ranger curls up against your back. You sleep with one hand in his fur.',
};

if (typeof module !== 'undefined') {
  module.exports = { FINALE4 };
  Object.assign(globalThis, module.exports);
}
