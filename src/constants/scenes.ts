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