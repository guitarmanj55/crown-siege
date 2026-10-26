// Unit stats, costs, looks and attacks per faction, as data.
// Release 1: both factions share the same stats (STATS); only names and looks differ.

export const UNIT_TYPES = ['worker', 'melee', 'ranged', 'tank', 'mage'];

// speed in world units/s, cooldown in s, range/aggro in world units, trainTime in s.
export const STATS = {
  worker: { hp: 60, armor: 0, speed: 62, damage: 0, range: 0, aggro: 0, cooldown: 1,
    cost: { gold: 50, mana: 0 }, pop: 1, trainTime: 3 },
  melee: { hp: 130, armor: 1, speed: 52, damage: 14, range: 26, aggro: 210, cooldown: 1.0,
    cost: { gold: 75, mana: 0 }, pop: 1, trainTime: 4 },
  ranged: { hp: 75, armor: 0, speed: 52, damage: 12, range: 230, aggro: 270, cooldown: 1.6,
    cost: { gold: 100, mana: 0 }, pop: 1, trainTime: 5, projectile: true, projSpeed: 440 },
  tank: { hp: 440, armor: 4, speed: 40, damage: 20, range: 30, aggro: 210, cooldown: 1.4,
    cost: { gold: 150, mana: 40 }, pop: 2, trainTime: 7 },
  // Mage: a slow fire orb that ignores armour and splashes the foes around its target.
  mage: { hp: 70, armor: 0, speed: 48, damage: 22, range: 200, aggro: 260, cooldown: 2.6,
    cost: { gold: 125, mana: 30 }, pop: 1, trainTime: 6, projectile: true, projSpeed: 300,
    magic: true, splash: 48, splashMul: 0.6 },
};

export const SPELLS = {
  lightning: { mana: 60, cooldown: 22, radius: 70, damage: 70, delay: 0.35 },
};

export const FACTIONS = {
  kingdom: {
    name: 'Kingdom',
    dir: 1,
    building: 'keep',
    buildingName: 'Castle Keep',
    colors: {
      body: '#24365a', bodyBack: '#192640', skin: '#e2b48f', steel: '#a9bdd8', steelDark: '#6d84a6',
      gold: '#e9b949', cloth: '#3567bf', clothDark: '#24498c', wood: '#7a5230', crystal: '#7fd4ff',
      glow: '#bfe8ff', dot: '#6fb2ff',
    },
    units: {
      worker: { name: 'Dwarf Miner', look: 'dwarf' },
      melee: { name: 'Footman', look: 'footman' },
      ranged: { name: 'Elf Archer', look: 'elf' },
      tank: { name: 'Shield Knight', look: 'knight' },
      mage: { name: 'Battle Wizard', look: 'wizard' },
    },
  },
  horde: {
    name: 'Horde',
    dir: -1,
    building: 'tower',
    buildingName: 'Dark Tower',
    colors: {
      body: '#34452a', bodyBack: '#243019', skin: '#73a03c', steel: '#6b6a5e', steelDark: '#45443c',
      gold: '#c9a25a', cloth: '#a24a26', clothDark: '#74321a', wood: '#5e3f22', crystal: '#9dff6a',
      glow: '#d6ffb0', dot: '#ff7a4a',
    },
    units: {
      worker: { name: 'Goblin Digger', look: 'goblinDigger' },
      melee: { name: 'Orc Grunt', look: 'grunt' },
      ranged: { name: 'Goblin Spear-thrower', look: 'goblinSpear' },
      tank: { name: 'Armoured Brute', look: 'brute' },
      mage: { name: 'Orc Shaman', look: 'shaman' },
    },
  },
};

export function enemyOf(faction) {
  return faction === 'kingdom' ? 'horde' : 'kingdom';
}

export function statsFor(faction, type) {
  return STATS[type];
}
