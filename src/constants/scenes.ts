export const SCENARIOS = {
  zombie: {
    label: 'Zombie Apocalypse',
    questions: [
      {
        q: 'What is your first move when the alarm sounds?',
        options: ['Hide', 'Run', 'Fight', 'Find others'],
      },
      { q: 'Your weapon of choice?', options: ['Bat', 'Axe', 'Gun', 'None'] },
      { q: 'Alone or in a group?', options: ['Alone', 'Small group', 'Large group', 'Depends'] },
      { q: 'Where do you shelter?', options: ['Mall', 'Forest', 'Underground', 'Rooftop'] },
      {
        q: 'Would you sacrifice someone to escape?',
        options: ['Yes', 'No', 'Only if necessary', 'Never'],
      },
    ],
  },
  hogwarts: {
    label: 'Hogwarts',
    questions: [
      {
        q: 'Your Hogwarts house?',
        options: ['Gryffindor', 'Slytherin', 'Hufflepuff', 'Ravenclaw'],
      },
      {
        q: 'First spell you master?',
        options: ['Expelliarmus', 'Avada Kedavra', 'Lumos', 'Accio'],
      },
      { q: 'Facing Voldemort, you...?', options: ['Fight', 'Run', 'Negotiate', 'Hide'] },
      { q: 'Your magical creature companion?', options: ['Owl', 'Phoenix', 'Dragon', 'None'] },
      {
        q: 'Dark Arts: use them or refuse?',
        options: ['Use them', 'Refuse always', 'Only in emergencies', 'Learn but never use'],
      },
    ],
  },
  doomed_love: {
    label: 'Forbidden Love',
    questions: [
      {
        q: 'You fall for someone your family would never accept. What do you do?',
        options: ['Tell your family immediately', 'Keep it completely secret', 'Run away together', 'End it before it starts'],
      },
      {
        q: 'Your lover asks you to choose between them and your family. You...?',
        options: ['Choose your family', 'Choose your lover', 'Refuse to choose', 'Ask for more time'],
      },
      {
        q: 'You receive a letter saying your lover has died. Before you can verify it, you...?',
        options: ['Rush to confirm in person', 'Collapse and believe it', 'Ask someone you trust', 'Wait for more news'],
      },
      {
        q: 'The only way to be together is to fake your own death. Do you go through with it?',
        options: ['Yes, without hesitation', 'No, it\'s too dangerous', 'Only if they go first', 'Find another way'],
      },
      {
        q: 'Everything has gone wrong. Your last chance is a single desperate act. You...?',
        options: ['Do it — love is worth it', 'Hesitate and lose the moment', 'Walk away and survive alone', 'Trust that it will work out'],
      },
    ],
  },
  got: {
    label: 'Game of Thrones',
    questions: [
      { q: 'Your house allegiance?', options: ['Stark', 'Lannister', 'Targaryen', 'No one'] },
      { q: 'Strategy for survival?', options: ['Betrayal', 'Loyalty', 'Isolation', 'Gold'] },
      {
        q: 'Winter is coming. You...?',
        options: ['Stockpile', 'Migrate south', 'Ignore it', 'Prepare army'],
      },
      {
        q: 'The throne is yours to take. How?',
        options: ['War', 'Marriage', 'Politics', 'Dragons'],
      },
      {
        q: 'A trusted ally betrays you. You...?',
        options: ['Execute them', 'Forgive', 'Exile', 'Use it against them'],
      },
    ],
  },
}