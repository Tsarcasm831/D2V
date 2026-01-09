
import { Question, Element, SkillLevel, Skill } from './types';

export interface JutsuInfo {
  name: string;
  rank: 'S' | 'A' | 'B' | 'C' | 'D';
  description: string;
  lore: string;
}

export const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "The Sensory Baseline: You are asked to focus your mind on a blank space. What sensation naturally begins to gather at your core?",
    type: 'single',
    weight: 3,
    options: [
      { id: 'A', text: "A radiating warmth that wants to expand outward.", vector: { fire: 3 } },
      { id: 'B', text: "A sharp, focused pressure like a needle point.", vector: { wind: 3 } },
      { id: 'C', text: "A high-frequency vibration or a static hum.", vector: { lightning: 3 } },
      { id: 'D', text: "A heavy, cool stillness like a deep pool.", vector: { water: 3 } },
      { id: 'E', text: "A solid, unmoving density like a stone weight.", vector: { earth: 3 } }
    ]
  },
  {
    id: 2,
    text: "Conflict Resolution: When someone stands in your way, what is your most honest instinctual response?",
    type: 'single',
    weight: 2,
    options: [
      { id: 'A', text: "To meet them head-on with more intensity than they can handle.", vector: { fire: 2, yang: 1 } },
      { id: 'B', text: "To find the single, weakest point in their logic and strike it.", vector: { wind: 2, yin: 1 } },
      { id: 'C', text: "To bypass them so quickly they don't even realize you've moved.", vector: { lightning: 2, yang: 1 } },
      { id: 'D', text: "To adapt your position and move around them without friction.", vector: { water: 2, yin: 1 } },
      { id: 'E', text: "To stand your ground and wait for them to break against you.", vector: { earth: 2, yang: 1 } }
    ]
  },
  {
    id: 3,
    text: "The Crisis Trigger: You are walking alone at night and hear a sudden, sharp noise behind you. You:",
    type: 'single',
    weight: 3,
    options: [
      { id: 'A', text: "Pivot instantly with a roar, ready to attack.", vector: { fire: 2, yang: 1 } },
      { id: 'B', text: "Drop into a low crouch and analyze the environment for shadows.", vector: { wind: 2, yin: 1 } },
      { id: 'C', text: "Bolt to a safe distance before even checking what it was.", vector: { lightning: 2 } },
      { id: 'D', text: "Stay perfectly still and try to sense the vibration in the air.", vector: { water: 1, earth: 1 } },
      { id: 'E', text: "Brace yourself for impact, trusting your physical resilience.", vector: { earth: 2, yang: 1 } }
    ]
  },
  {
    id: 4,
    text: "Natural Affinity: Which of these weather patterns makes you feel the most 'at home'?",
    type: 'single',
    weight: 1,
    options: [
      { id: 'A', text: "A scorching, dry summer day.", vector: { fire: 2 } },
      { id: 'B', text: "A crisp, breezy autumn morning.", vector: { wind: 2 } },
      { id: 'C', text: "A high-tension thunderstorm.", vector: { lightning: 2 } },
      { id: 'D', text: "A steady, rhythmic spring rain.", vector: { water: 2 } },
      { id: 'E', text: "A silent, heavy snowfall or a thick fog.", vector: { earth: 1, water: 1 } }
    ]
  },
  {
    id: 5,
    text: "Problem Solving: You find a complex, knotted rope that needs to be undone. Your approach is:",
    type: 'single',
    weight: 2,
    options: [
      { id: 'A', text: "To pull at it with increasing force until it gives way.", vector: { fire: 2, yang: 1 } },
      { id: 'B', text: "To use a tool to carefully sever the core tension points.", vector: { wind: 3, yin: 1 } },
      { id: 'C', text: "To pick at it with frantic, high-speed precision.", vector: { lightning: 2 } },
      { id: 'D', text: "To loosen the whole structure until it falls apart naturally.", vector: { water: 2 } },
      { id: 'E', text: "To study the pattern patiently until you see the solution.", vector: { earth: 2, yin: 1 } }
    ]
  },
  {
    id: 6,
    text: "Physicality: If you were forced to participate in a high-stakes competition, you would rely on your:",
    type: 'single',
    weight: 1,
    options: [
      { id: 'A', text: "Explosive Burst Power.", vector: { fire: 2, yang: 1 } },
      { id: 'B', text: "Technical Dexterity and Grace.", vector: { wind: 2, yin: 1 } },
      { id: 'C', text: "Reflexes and Reaction Time.", vector: { lightning: 3 } },
      { id: 'D', text: "Flexibility and Flow.", vector: { water: 2 } },
      { id: 'E', text: "Pure Physical Endurance.", vector: { earth: 2, yang: 1 } }
    ]
  },
  {
    id: 7,
    text: "The Fear Factor: What do you find most unsettling in your daily life?",
    type: 'single',
    weight: 1,
    options: [
      { id: 'A', text: "Being ignored or feeling insignificant.", vector: { fire: 2 } },
      { id: 'B', text: "Being trapped in a small, windowless space.", vector: { wind: 2 } },
      { id: 'C', text: "Being slow to react to an important event.", vector: { lightning: 2 } },
      { id: 'D', text: "Rigid structures that refuse to change.", vector: { water: 2 } },
      { id: 'E', text: "Feeling like you have no foundation or home.", vector: { earth: 2 } }
    ]
  },
  {
    id: 8,
    text: "Group Dynamics: In a team setting, which role do you naturally fall into?",
    type: 'single',
    weight: 2,
    options: [
      { id: 'A', text: "The Spark: Providing energy and motivation.", vector: { fire: 2, yang: 1 } },
      { id: 'B', text: "The Edge: Providing critical analysis and precision.", vector: { wind: 2, yin: 1 } },
      { id: 'C', text: "The Blitz: Providing immediate, decisive action.", vector: { lightning: 2 } },
      { id: 'D', text: "The Fluid: Helping different personalities connect.", vector: { water: 2 } },
      { id: 'E', text: "The Anchor: Providing stability and protection.", vector: { earth: 2, yang: 1 } }
    ]
  },
  {
    id: 9,
    text: "Sensory Preference: Which of these sounds resonates most with you?",
    type: 'single',
    weight: 1,
    options: [
      { id: 'A', text: "The roar of a bonfire.", vector: { fire: 2 } },
      { id: 'B', text: "The whistling of wind through trees.", vector: { wind: 2 } },
      { id: 'C', text: "The sharp crack of a breaking branch.", vector: { lightning: 2 } },
      { id: 'D', text: "The rhythmic lap of waves on a shore.", vector: { water: 2 } },
      { id: 'E', text: "The deep rumble of a distant landslide.", vector: { earth: 2 } }
    ]
  },
  {
    id: 10,
    text: "Tactical Thinking: You are playing a game of strategy. Your favorite TWO moves are:",
    type: 'multi',
    maxSelections: 2,
    weight: 2,
    options: [
      { id: 'A', text: "A massive, all-out offensive push.", vector: { fire: 2, yang: 1 } },
      { id: 'B', text: "A surgical strike on the enemy's weakest flank.", vector: { wind: 2, yin: 1 } },
      { id: 'C', text: "A sudden gambit that ends the game in one turn.", vector: { lightning: 2 } },
      { id: 'D', text: "Sacrificing territory to lure the enemy into a trap.", vector: { water: 2, yin: 1 } },
      { id: 'E', text: "Building an impenetrable defense that cannot be moved.", vector: { earth: 2, yang: 1 } }
    ]
  },
  {
    id: 11,
    text: "The Ideal Tool: You are given a choice of five abstract objects. Which do you pick?",
    type: 'single',
    weight: 1,
    options: [
      { id: 'A', text: "A torch that never goes out.", vector: { fire: 2 } },
      { id: 'B', text: "A blade that never dulls.", vector: { wind: 2 } },
      { id: 'C', text: "A lens that focuses light to a point.", vector: { lightning: 1, wind: 1 } },
      { id: 'D', text: "A mirror that reflects anything.", vector: { water: 2, yin: 1 } },
      { id: 'E', text: "A shield that can't be broken.", vector: { earth: 2 } }
    ]
  },
  {
    id: 12,
    text: "Emotional Core: When you feel true passion, it feels like:",
    type: 'single',
    weight: 2,
    options: [
      { id: 'A', text: "A wildfire that consumes everything.", vector: { fire: 3 } },
      { id: 'B', text: "A cold, clear wind that reveals the truth.", vector: { wind: 3 } },
      { id: 'C', text: "A jolt of electricity that demands action.", vector: { lightning: 3 } },
      { id: 'D', text: "A rising tide that fills every space.", vector: { water: 3 } },
      { id: 'E', text: "A heavy mountain that nothing can move.", vector: { earth: 3 } }
    ]
  },
  {
    id: 13,
    text: "Training Philosophy: If you had to master a new skill, you would prefer to:",
    type: 'single',
    weight: 1,
    options: [
      { id: 'A', text: "Practice with high intensity until you collapse.", vector: { fire: 2, yang: 1 } },
      { id: 'B', text: "Study the theory and refine the technique to perfection.", vector: { wind: 2, yin: 1 } },
      { id: 'C', text: "Test yourself against others in fast-paced sparring.", vector: { lightning: 2 } },
      { id: 'D', text: "Let your instincts guide you through trial and error.", vector: { water: 2 } },
      { id: 'E', text: "Slowly build the foundation through repetitive drills.", vector: { earth: 2 } }
    ]
  },
  {
    id: 14,
    text: "Which of these concepts represents 'Truth' to you in a behavioral sense?",
    type: 'single',
    weight: 1,
    options: [
      { id: 'A', text: "Momentum: If you stop, you die.", vector: { fire: 1, lightning: 1 } },
      { id: 'B', text: "Stability: Without a base, you are nothing.", vector: { earth: 2 } },
      { id: 'C', text: "Fluidity: Survival means change.", vector: { water: 2 } },
      { id: 'D', text: "Clarity: To see is to win.", vector: { wind: 2 } },
      { id: 'E', text: "Impact: Only results matter.", vector: { fire: 1, earth: 1, yang: 1 } }
    ]
  },
  {
    id: 15,
    text: "The First Reaction: You see a beautiful sunset. Your internal reaction is:",
    type: 'single',
    weight: 1,
    options: [
      { id: 'A', text: "A feeling of intense, burning inspiration.", vector: { fire: 2 } },
      { id: 'B', text: "A sense of refreshing, clear peace.", vector: { wind: 2 } },
      { id: 'C', text: "A sudden, fleeting spark of wonder.", vector: { lightning: 2 } },
      { id: 'D', text: "A deep, emotional welling of calm.", vector: { water: 2 } },
      { id: 'E', text: "A sense of timeless, grounded awe.", vector: { earth: 2 } }
    ]
  },
  {
    id: 16,
    text: "Ranking Priorities: In a teammate, rank these from 'Essential' to 'Optional':",
    type: 'rank',
    weight: 1,
    options: [
      { id: '1', text: "Reliability (Earth-like stability)", vector: { earth: 1 } },
      { id: '2', text: "Insight (Wind-like clarity)", vector: { wind: 1 } },
      { id: '3', text: "Quickness (Lightning-like speed)", vector: { lightning: 1 } },
      { id: '4', text: "Passion (Fire-like drive)", vector: { fire: 1 } }
    ]
  },
  {
    id: 17,
    text: "The Dark Side: When you fail, your negative spiral usually involves:",
    type: 'single',
    weight: 2,
    options: [
      { id: 'A', text: "Explosive anger or destructive impulses.", vector: { fire: 2 } },
      { id: 'B', text: "Over-analyzing everything until you're paralyzed.", vector: { wind: 2, yin: 1 } },
      { id: 'C', text: "Frantic, unfocused energy and anxiety.", vector: { lightning: 2 } },
      { id: 'D', text: "Feeling aimless and emotionally overwhelmed.", vector: { water: 2 } },
      { id: 'E', text: "Becoming stubborn, rigid, and refusing to move.", vector: { earth: 2 } }
    ]
  },
  {
    id: 18,
    text: "The Win: When you succeed, what is the most satisfying part?",
    type: 'single',
    weight: 3,
    options: [
      { id: 'A', text: "The feeling of absolute, overwhelming victory.", vector: { fire: 3 } },
      { id: 'B', text: "The knowledge that you were technically superior.", vector: { wind: 3 } },
      { id: 'C', text: "The thrill of the decisive, sudden finish.", vector: { lightning: 3 } },
      { id: 'D', text: "The sense that you flowed perfectly with the moment.", vector: { water: 3 } },
      { id: 'E', text: "The fact that your foundation remained unshaken.", vector: { earth: 3 } }
    ]
  },
  {
    id: 19,
    text: "Pick ONE behavioral LIKE and ONE DISLIKE:",
    type: 'like-dislike',
    weight: 1,
    options: [
      { id: 'LIKE_A', text: "Adaptability", vector: { water: 1, wind: 1 } },
      { id: 'LIKE_B', text: "Integrity", vector: { earth: 2 } },
      { id: 'LIKE_C', text: "Enthusiasm", vector: { fire: 2 } },
      { id: 'LIKE_D', text: "Efficiency", vector: { lightning: 2 } },
      { id: 'LIKE_E', text: "Nuance", vector: { wind: 1, water: 1 } }
    ],
    dislikeOptions: [
      { id: 'DIS_A', text: "Passivity", vector: { fire: 1, lightning: 1 } },
      { id: 'DIS_B', text: "Complexity", vector: { earth: 1, fire: 1 } },
      { id: 'DIS_C', text: "Instability", vector: { earth: 2 } },
      { id: 'DIS_D', text: "Obviousness", vector: { wind: 1, water: 1 } },
      { id: 'DIS_E', text: "Slowness", vector: { lightning: 2 } }
    ]
  },
  {
    id: 20,
    text: "The Ultimate Choice: If your personality was a flavor, it would be:",
    type: 'single',
    weight: 2,
    options: [
      { id: 'A', text: "Spicy and searing.", vector: { fire: 2 } },
      { id: 'B', text: "Sharp and metallic.", vector: { wind: 2 } },
      { id: 'C', text: "Electric and numbing.", vector: { lightning: 2 } },
      { id: 'D', text: "Cool and refreshing.", vector: { water: 2 } },
      { id: 'E', text: "Rich and earthy.", vector: { earth: 2 } }
    ]
  }
];

export const ELEMENT_LORE: Record<Element, any> = {
  [Element.FIRE]: {
    color: 'from-orange-600 to-red-600',
    title: 'Fire Style (Katon)',
    jutsus: [
      {
        name: 'Great Fireball Jutsu',
        rank: 'C',
        description: 'A technique where chakra kneaded inside the body is converted into fire and expelled from the mouth.',
        lore: 'The signature move of the Uchiha Clan. To master it is a rite of passage for many Fire Style users.'
      },
      {
        name: 'Phoenix Sage Fire',
        rank: 'B',
        description: 'The user expels a series of small fireballs, each sent flying in an unpredictable pattern.',
        lore: 'A high-level technique that uses fire to mask hidden weapons like shuriken within the flames.'
      },
      {
        name: 'Dragon Flame Loud Singing',
        rank: 'A',
        description: 'The user compresses a massive amount of chakra to spit out several dragon-headed fireballs.',
        lore: 'Legendary for its ability to incinerate entire battlefields and reshape the environment through sheer heat.'
      }
    ],
    tree: [
      { id: 'f1', name: 'Ignition Ember', level: SkillLevel.ACADEMY, description: '[Projectile] A small spark projectile for testing range.' },
      { id: 'f2', name: 'Flame Haste', level: SkillLevel.GENIN, description: '[Buff] Stimulates the muscles for a temporary speed increase.' },
      { id: 'f3', name: 'Searing Wave', level: SkillLevel.GENIN, description: '[Projectile] A fan-shaped arc of fire that travels forward.' },
      { id: 'f4', name: 'Smoke Veil', level: SkillLevel.CHUNIN, description: '[Debuff] Clouds the target\'s vision, reducing their accuracy.' },
      { id: 'f5', name: 'Volcanic Bulwark', level: SkillLevel.CHUNIN, description: '[Buff] Covers the skin in heat that damages attackers.' },
      { id: 'f6', name: 'Dragon\'s Breath', level: SkillLevel.JONIN, description: '[Projectile] A continuous stream of high-intensity fire.' },
      { id: 'f7', name: 'Ash Immobilization', level: SkillLevel.JONIN, description: '[Debuff] Hot ash sticks to the target, slowing movement speed.' },
      { id: 'f8', name: 'Solar Zenith', level: SkillLevel.KAGE, description: '[Buff] Massive increase to all Ninjutsu damage for 30 seconds.' },
      { id: 'f9', name: 'Cinder Storm', level: SkillLevel.KAGE, description: '[Projectile] Multiple tracking fireballs sent in a wide area.' },
      { id: 'f10', name: 'Infernal Curse', level: SkillLevel.FORBIDDEN, description: '[Debuff] Permanently reduces target physical resistance.' }
    ],
    description: 'Intensity, passion, and direct confrontation. Your chakra burns bright, fueled by an unbreakable conviction. You don\'t just win; you overwhelm your obstacles with sheer momentum.'
  },
  [Element.WIND]: {
    color: 'from-emerald-500 to-teal-600',
    title: 'Wind Style (Futon)',
    jutsus: [
      {
        name: 'Great Breakthrough',
        rank: 'C',
        description: 'The user creates a powerful gust of wind by blowing it from their mouth.',
        lore: 'A versatile move used for clearing mist, knocking back enemies, or amplifying fire techniques.'
      },
      {
        name: 'Wind Blade',
        rank: 'A',
        description: 'A pinpoint technique where chakra is concentrated into a blade of wind that can slice through steel.',
        lore: 'Known as the invisible sword, it is nearly impossible to guard against because of its ethereal nature.'
      },
      {
        name: 'Rasenshuriken',
        rank: 'S',
        description: 'The ultimate form of Wind Style, creating a rotating vortex of microscopic wind blades.',
        lore: 'A forbidden-level technique that destroys the opponent at a cellular level. Requires god-tier chakra control.'
      }
    ],
    tree: [
      { id: 'w1', name: 'Air Dart', level: SkillLevel.ACADEMY, description: '[Projectile] A concentrated bolt of pressurized air.' },
      { id: 'w2', name: 'Gale Swiftness', level: SkillLevel.GENIN, description: '[Buff] Reduces air resistance, increasing movement speed.' },
      { id: 'w3', name: 'Vacuum Slice', level: SkillLevel.GENIN, description: '[Projectile] An invisible blade that travels instantly.' },
      { id: 'w4', name: 'Deafening Gust', level: SkillLevel.CHUNIN, description: '[Debuff] Blasts the target\'s ears, inducing disorientation.' },
      { id: 'w5', name: 'Pressure Shield', level: SkillLevel.CHUNIN, description: '[Buff] Repels minor projectiles and incoming attacks.' },
      { id: 'w6', name: 'Twin Tornadoes', level: SkillLevel.JONIN, description: '[Projectile] Two spiraling winds that converge on a point.' },
      { id: 'w7', name: 'Weightless Soul', level: SkillLevel.JONIN, description: '[Buff] Grants the ability to hover and dodge with ease.' },
      { id: 'w8', name: 'Suffocation Zone', level: SkillLevel.KAGE, description: '[Debuff] Removes air in a radius, silencing all jutsu usage.' },
      { id: 'w9', name: 'Sky-Sunder Beam', level: SkillLevel.KAGE, description: '[Projectile] A massive concentrated air beam of pure force.' },
      { id: 'w10', name: 'Void Collapse', level: SkillLevel.FORBIDDEN, description: '[Debuff] Crushes the target\'s chakra network using pressure.' }
    ],
    description: 'Sharp, analytical, and versatile. Your chakra is like a blade, capable of dismantling the most robust defenses through clever positioning and precise angles.'
  },
  [Element.LIGHTNING]: {
    color: 'from-blue-400 to-indigo-600',
    title: 'Lightning Style (Raiton)',
    jutsus: [
      {
        name: 'Chidori',
        rank: 'A',
        description: 'A high concentration of lightning chakra around the hand that creates a chirping sound.',
        lore: 'Requires extreme speed and precision. Often paired with visual prowess to track the high-speed movement.'
      },
      {
        name: 'Kirin',
        rank: 'S',
        description: 'An extremely powerful lightning technique that draws natural lightning from the sky.',
        lore: 'Moves at the speed of light. It is one of the few techniques that cannot be dodged by normal human reaction.'
      },
      {
        name: 'Purple Electricity',
        rank: 'A',
        description: 'A refined version of lightning chakra that can be emitted from the hands at various ranges.',
        lore: 'A modern masterpiece of chakra control, capable of both piercing strikes and wide-area bursts.'
      }
    ],
    tree: [
      { id: 'l1', name: 'Static Spark', level: SkillLevel.ACADEMY, description: '[Projectile] A small electrical discharge projectile.' },
      { id: 'l2', name: 'Neural Overdrive', level: SkillLevel.GENIN, description: '[Buff] Accelerates reaction time by 50%.' },
      { id: 'l3', name: 'Arcing Bolt', level: SkillLevel.GENIN, description: '[Projectile] A bolt that jumps between multiple targets.' },
      { id: 'l4', name: 'Numbing Shock', level: SkillLevel.CHUNIN, description: '[Debuff] Lowers target attack speed through muscle spasms.' },
      { id: 'l5', name: 'Thunder Cloak', level: SkillLevel.CHUNIN, description: '[Buff] Grants immunity to most projectile-based attacks.' },
      { id: 'l6', name: 'Spear of Heaven', level: SkillLevel.JONIN, description: '[Projectile] A massive lance of pure lightning energy.' },
      { id: 'l7', name: 'Blindside Jolt', level: SkillLevel.JONIN, description: '[Debuff] Stuns the target for 2 seconds on hit.' },
      { id: 'l8', name: 'Godspeed Aura', level: SkillLevel.KAGE, description: '[Buff] Maximum Speed and Evasion increase.' },
      { id: 'l9', name: 'Thunderstorm Rain', level: SkillLevel.KAGE, description: '[Projectile] Dozens of lightning bolts from the sky.' },
      { id: 'l10', name: 'Synapse Burn', level: SkillLevel.FORBIDDEN, description: '[Debuff] Drastically reduces target Intelligence stat.' }
    ],
    description: 'Burst speed and decisive strikes. You are high-risk, high-reward, favoring techniques that end a fight in a single heart-stopping moment before the enemy even realizes you\'ve moved.'
  },
  [Element.WATER]: {
    color: 'from-sky-500 to-blue-700',
    title: 'Water Style (Suiton)',
    jutsus: [
      {
        name: 'Water Dragon Bullet',
        rank: 'B',
        description: 'The user shapes a large amount of water into a giant, powerful dragon.',
        lore: 'One of the most complex hand-sign sequences in shinobi history. A symbol of true technical mastery.'
      },
      {
        name: 'Water Prison Jutsu',
        rank: 'C',
        description: 'Traps an opponent in a heavy sphere of water that restricts movement and breathing.',
        lore: 'A terrifying tool for capture and interrogation. Almost impossible to escape from the inside.'
      },
      {
        name: 'Great Waterfall',
        rank: 'A',
        description: 'The user creates a massive wave of water that crashes down like a natural disaster.',
        lore: 'Can transform a dry desert into a raging lake in seconds. It defines the power of the Hidden Mist.'
      }
    ],
    tree: [
      { id: 'v1', name: 'Mist Shot', level: SkillLevel.ACADEMY, description: '[Projectile] A pressurized water bullet.' },
      { id: 'v2', name: 'Flow State', level: SkillLevel.GENIN, description: '[Buff] Increases Stamina regeneration significantly.' },
      { id: 'v3', name: 'Tidal Sweep', level: SkillLevel.GENIN, description: '[Projectile] A wide wave that knocks targets back.' },
      { id: 'v4', name: 'Heavy Moisture', level: SkillLevel.CHUNIN, description: '[Debuff] Drenches the target, doubling the weight of their gear.' },
      { id: 'v5', name: 'Mirror Shell', level: SkillLevel.CHUNIN, description: '[Buff] Reflects the next offensive Ninjutsu back at the caster.' },
      { id: 'v6', name: 'Shark Missile', level: SkillLevel.JONIN, description: '[Projectile] A seeking water construct that chases targets.' },
      { id: 'v7', name: 'Drowning Aura', level: SkillLevel.JONIN, description: '[Debuff] Slowly drains target Stamina over time.' },
      { id: 'v8', name: 'Oceanic Blessing', level: SkillLevel.KAGE, description: '[Buff] Large scale healing aura for the entire team.' },
      { id: 'v9', name: 'Maelstrom Beam', level: SkillLevel.KAGE, description: '[Projectile] A spiraling vortex beam of crushing pressure.' },
      { id: 'v10', name: 'Abyssal Freeze', level: SkillLevel.FORBIDDEN, description: '[Debuff] Completely immobilizes target in an ice block.' }
    ],
    description: 'Flowing and adaptable. Like water, you take the shape of your container. You specialize in redirection and composure, allowing the enemy to exhaust themselves against your fluid defense.'
  },
  [Element.EARTH]: {
    color: 'from-yellow-700 to-amber-900',
    title: 'Earth Style (Doton)',
    jutsus: [
      {
        name: 'Earth Wall',
        rank: 'B',
        description: 'The user spits out earth from their mouth or uses the ground to create a sturdy wall.',
        lore: 'The fundamental defense of the Stone Village. It can be reinforced with chakra to withstand explosive tags.'
      },
      {
        name: 'Headhunter Jutsu',
        rank: 'D',
        description: 'The user hides underground and pulls the target down to their neck, leaving them immobilized.',
        lore: 'A simple but effective tactic for stealth and psychological warfare. It turns the earth into a predator.'
      },
      {
        name: 'Earth Golem',
        rank: 'A',
        description: 'The user creates a massive creature out of rock to fight on their behalf.',
        lore: 'These constructs possess immense strength and can regenerate by absorbing minerals from the surrounding earth.'
      }
    ],
    tree: [
      { id: 'e1', name: 'Pebble Blast', level: SkillLevel.ACADEMY, description: '[Projectile] A scatter-shot of small rocks.' },
      { id: 'e2', name: 'Stone Skin', level: SkillLevel.GENIN, description: '[Buff] Increases Physical Resistance by 40%.' },
      { id: 'e3', name: 'Mud Surge', level: SkillLevel.GENIN, description: '[Projectile] A wave of thick mud that travel forward.' },
      { id: 'e4', name: 'Unstable Ground', level: SkillLevel.CHUNIN, description: '[Debuff] Reduces target Evasion and Movement speed.' },
      { id: 'e5', name: 'Weighted Strike', level: SkillLevel.CHUNIN, description: '[Buff] Increases Strength and Taijutsu damage.' },
      { id: 'e6', name: 'Bedrock Spear', level: SkillLevel.JONIN, description: '[Projectile] A massive stalagmite projectile.' },
      { id: 'e7', name: 'Sand Blindness', level: SkillLevel.JONIN, description: '[Debuff] Drastically reduces target vision range.' },
      { id: 'e8', name: 'Fortress Core', level: SkillLevel.KAGE, description: '[Buff] Immunity to knockback and massive defense boost.' },
      { id: 'e9', name: 'Tectonic Spike', level: SkillLevel.KAGE, description: '[Projectile] A massive column of earth from below.' },
      { id: 'e10', name: 'Gravity Grave', level: SkillLevel.FORBIDDEN, description: '[Debuff] Pins the target to the floor with 10x gravity.' }
    ],
    description: 'Stable and unyielding. You are the anchor of any team, possessing unmatched endurance and reliability. Your battlefield control is absolute, literalized through the ground beneath your feet.'
  }
};
