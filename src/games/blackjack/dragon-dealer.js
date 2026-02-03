/**
 * Dragon's Blackjack - Pyraxis the Purse-Lighter
 * 
 * The sassy dragon dealer with personality and dialog.
 */

const PYRAXIS = {
  name: 'Pyraxis the Purse-Lighter',
  title: 'Dragon Dealer',
  emoji: '🐲',
  portrait: '🔥🐉🔥'
};

// Dialog categories with weighted randomness
const DIALOG = {
  // When player sits down to play
  greeting: [
    "Welcome, little mortal. Your gold looks lonely... let me reunite it with my hoard.",
    "Another brave fool seeks to challenge the house? How delightful.",
    "The cards whisper secrets, adventurer. But they speak only to me.",
    "*smoke curls from nostrils* Ah, fresh meat for the tables.",
    "Step into my lair... I mean, my humble establishment.",
    "Your coin purse looks heavy. Allow me to lighten your burden.",
    "I've been expecting you. The flames told me of your coming... and going.",
  ],

  // Dealing initial cards
  dealing: [
    "Let us see what fate has written in the cards...",
    "*shuffles with claws* The dance of fortune begins.",
    "May the odds be ever in MY favor.",
    "Cards flying like dragon scales in the wind...",
    "*deals with practiced elegance* Behold your destiny.",
  ],

  // Player gets blackjack
  playerBlackjack: [
    "IMPOSSIBLE! *smoke curls from nostrils* ...well played. THIS time.",
    "A natural twenty-one? *sighs dramatically* Even dragons have bad days.",
    "The cards favor you... for now. The hoard remembers all debts.",
    "*tail lashes* You got LUCKY, mortal. Don't let it go to your head.",
    "Blackjack?! I... I mean... congratulations. *grumbles*",
  ],

  // Player busts
  playerBust: [
    "Oh dear, you've exceeded twenty-one. Your gold will make excellent bedding.",
    "*gleeful cackle* The greed! The hubris! I LOVE IT!",
    "Another one crashes and burns. My favorite kind of adventurer.",
    "Bust! Your ambition exceeded your fortune. As I predicted.",
    "*collects chips with satisfaction* The house always wins, little one.",
    "Twenty-one is the limit, not a suggestion. Your gold, please.",
  ],

  // Dealer gets blackjack  
  dealerBlackjack: [
    "BEHOLD! The dragon's fortune reveals itself! Better luck next century.",
    "*fans cards with wing* Perfection. As expected of a dragon.",
    "Natural twenty-one! Did I mention I'm blessed by the fire gods?",
    "*preens scales* Some creatures are simply born lucky. I am one.",
    "Blackjack for the house! The hoard grows ever larger.",
  ],

  // Dealer busts
  dealerBust: [
    "*smoke pours from nostrils* This... this is TEMPORARY!",
    "I... BUST?! The cards betray me! TREACHERY!",
    "*grumbles* Take your winnings. I'll win them back.",
    "Impossible! I demand a recount! ...fine, you win.",
    "*tail thrashes angrily* Don't get used to this, mortal.",
  ],

  // Player wins (not blackjack)
  playerWin: [
    "You WIN? *tail lashes* Take your pittance. I'll win it back.",
    "Fortune smiles upon you... she must be drunk.",
    "*grudgingly pushes chips* Victory is yours. Temporarily.",
    "Well played, mortal. Enjoy it while you can.",
    "Hmph. Even a broken sundial is right twice a day.",
  ],

  // Dealer wins (not blackjack)
  dealerWin: [
    "Another offering for the hoard! You're too kind.",
    "*satisfied rumble* This is the natural order of things.",
    "The house wins. As foretold. As always.",
    "Your gold will keep my scales warm tonight.",
    "*collects winnings* Thank you for your generous donation.",
  ],

  // Push (tie)
  push: [
    "A tie? How disappointingly civil. Let's do it again.",
    "*yawns* Neither victory nor defeat. How boring.",
    "We match exactly? The universe lacks imagination.",
    "A draw! How... anticlimactic. Shall we try again?",
    "*flicks tail* Ties are for mortals who fear commitment.",
  ],

  // Player hits
  playerHit: [
    "Another card? Bold. Or foolish. Let's find out.",
    "*slides card* Greedy, are we? I approve.",
    "Chasing twenty-one? How refreshingly predictable.",
    "Hit me, you say? If only you meant literally...",
    "*deals card* Fortune favors the bold... sometimes.",
  ],

  // Player stands
  playerStand: [
    "Standing firm? Let's see if it's enough.",
    "*nods* A wise choice. Perhaps.",
    "You hold your ground. Admirable, if foolish.",
    "Content with that hand? Interesting...",
    "*examines own cards* Now it's MY turn to play.",
  ],

  // Player doubles down
  playerDouble: [
    "DOUBLE DOWN?! *excited rumble* I love a gambler with spirit!",
    "Twice the bet, twice the fall! Or glory. Usually the fall.",
    "*grins showing fangs* Now THAT'S what I like to see!",
    "Doubling your wager? Your confidence amuses me.",
    "All or nothing! My favorite kind of foolishness!",
  ],

  // Player surrenders
  playerSurrender: [
    "*sighs* Cowardice, but wise cowardice. Half your bet returns.",
    "Retreating? Can't say I blame you. The cards were not kind.",
    "A tactical withdrawal. Boring, but acceptable.",
    "Running away? Smart. The dragon always wins eventually.",
    "*yawns* Take your half and slink away, little one.",
  ],

  // When player is doing well (winning streak)
  playerStreak: [
    "*narrowed eyes* You're doing suspiciously well...",
    "Don't get cocky. Dragons have long memories.",
    "Your luck WILL turn. They always do.",
    "*smoke from nostrils* Enjoy this while it lasts.",
  ],

  // When dealer is doing well
  dealerStreak: [
    "*stretches luxuriously* All according to plan.",
    "The hoard grows! Tonight, I dine on victory!",
    "Perhaps gambling isn't your calling, little one?",
    "*admires growing pile* Beautiful, isn't it?",
  ],

  // Low bet taunts
  lowBet: [
    "Such a tiny wager? Are you even trying?",
    "*squints* I've seen kobolds bet more bravely.",
    "Playing it safe? Where's the fun in that?",
  ],

  // High bet reactions
  highBet: [
    "*perks up* NOW we're talking! A REAL wager!",
    "Ohoho! Someone brought their life savings!",
    "*eyes gleam* This is getting interesting...",
  ],

  // Insurance offered
  insuranceOffer: [
    "I show an Ace... care to insure against my brilliance?",
    "Insurance, mortal? Bet I have blackjack?",
    "*mysterious smile* An Ace revealed... do you fear what hides beneath?",
  ],
};

/**
 * Get a random dialog line from a category
 */
function getDialog(category, context = {}) {
  const lines = DIALOG[category];
  if (!lines || lines.length === 0) {
    return "*Pyraxis stares silently, smoke curling from nostrils*";
  }
  
  // Simple random selection
  const line = lines[Math.floor(Math.random() * lines.length)];
  
  // Could expand to use context for more dynamic responses
  // e.g., reference player name, bet amount, etc.
  return line;
}

/**
 * Get dealer response based on game result
 */
function getResultDialog(result, context = {}) {
  switch (result) {
    case 'player_blackjack':
      return getDialog('playerBlackjack', context);
    case 'dealer_blackjack':
      return getDialog('dealerBlackjack', context);
    case 'player_bust':
      return getDialog('playerBust', context);
    case 'dealer_bust':
      return getDialog('dealerBust', context);
    case 'player_win':
      return getDialog('playerWin', context);
    case 'dealer_win':
      return getDialog('dealerWin', context);
    case 'push':
      return getDialog('push', context);
    case 'surrender':
      return getDialog('playerSurrender', context);
    default:
      return "*Pyraxis nods cryptically*";
  }
}

/**
 * Get action response
 */
function getActionDialog(action, context = {}) {
  switch (action) {
    case 'hit':
      return getDialog('playerHit', context);
    case 'stand':
      return getDialog('playerStand', context);
    case 'double':
      return getDialog('playerDouble', context);
    case 'surrender':
      return getDialog('playerSurrender', context);
    case 'deal':
      return getDialog('dealing', context);
    default:
      return null;
  }
}

/**
 * Get bet reaction based on amount
 */
function getBetReaction(amount, minBet = 10, maxBet = 10000) {
  const ratio = amount / maxBet;
  
  if (ratio >= 0.5) {
    return getDialog('highBet');
  } else if (ratio <= 0.05) {
    return getDialog('lowBet');
  }
  return null;
}

module.exports = {
  PYRAXIS,
  DIALOG,
  getDialog,
  getResultDialog,
  getActionDialog,
  getBetReaction
};
