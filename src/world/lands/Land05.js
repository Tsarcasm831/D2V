export const Land05 = {
  "id": "Land05",
  "name": "Land of Woods",
  "desc": "A heavily forested land, once home to the Prajna Group and their ANBU forces. The districts are separated by thick bamboo groves and canopy shadows.",
  "points": [
    [57.89058662819253, 38.00478218015561],
    [57.36439523153548, 39.81754208399245],
    [58.01759731090373, 40.19917259531573],
    [58.3079040167608, 41.22958222696604],
    [58.906672089882115, 41.019685603370355],
    [58.979248766346394, 40.48539784328997],
    [59.39657215050958, 40.35182669143047],
    [59.94090621738396, 40.275501219694284],
    [60.340086931329814, 39.703050723745804],
    [61.15658503384394, 39.24509158804397],
    [62.55370853926203, 39.22600864378874],
    [62.916597917178294, 38.69172403635072],
    [64.0234087211444, 38.806212243954995],
    [64.89434082990545, 38.82529518821023],
    [65.2935215438513, 37.64223146044519],
    [65.1302195251105, 36.36375931668873],
    [64.33186409281373, 35.96304586111022],
    [63.424640648023086, 36.058454277101625],
    [62.8803065811487, 36.51641341280346],
    [62.17267649112844, 36.440087941067276],
    [61.66462776468873, 36.82171845239056],
    [60.9751403448858, 36.421004996812044],
    [60.53967429050529, 37.1079437003648],
    [59.57801683946771, 37.394168948339036],
    [59.65059351593197, 38.0429449160237],
    [58.77966140717093, 37.33692326821571]
  ],
  "color": "#22c55e",
  "texture": "bamboojungle",
  "seeds": [
    // --- The Prajna Heartland ---
    { "id": "L05-1", "name": "Prajna Stronghold", "center": [60.5, 38.5], "role": "capital" },
    { "id": "L05-2", "name": "Deep Canopy", "center": [59.5, 39.0], "role": "heartland" },
    { "id": "L05-3", "name": "Anbu Training Grounds", "center": [61.0, 38.0], "role": "wild" },
    { "id": "L05-4", "name": "Hannya Hall", "center": [60.0, 38.2], "role": "heartland" },

    // --- Western Bamboo Forests ---
    { "id": "L05-5", "name": "West Bamboo Thicket", "center": [58.0, 39.5], "role": "wild" },
    { "id": "L05-6", "name": "Silent Border", "center": [58.5, 38.5], "role": "border" },
    { "id": "L05-7", "name": "Foggy Grove", "center": [58.2, 40.5], "role": "wild" },
    { "id": "L05-8", "name": "Trappers' Path", "center": [59.0, 40.0], "role": "border" },

    // --- Shinobazu Territory (Criminal Underworld) ---
    { "id": "L05-9", "name": "Shinobazu Hideout", "center": [63.0, 37.5], "role": "wild" },
    { "id": "L05-10", "name": "Orphans' Refuge", "center": [62.5, 38.2], "role": "heartland" },
    { "id": "L05-11", "name": "Thieves' Crossing", "center": [63.5, 36.8], "role": "border" },
    { "id": "L05-12", "name": "River of Regret", "center": [62.0, 37.0], "role": "wild" },

    // --- Eastern Outskirts ---
    { "id": "L05-13", "name": "Eastern Edge", "center": [64.5, 38.0], "role": "border" },
    { "id": "L05-14", "name": "Rotting Logs", "center": [64.0, 36.5], "role": "wild" },
    { "id": "L05-15", "name": "Sunlight Clearing", "center": [65.0, 37.5], "role": "border" },

    // --- Central Densification ---
    { "id": "L05-16", "name": "Twisting Roots", "center": [61.5, 39.0], "role": "wild" },
    { "id": "L05-17", "name": "Merchant's Detour", "center": [60.0, 37.0], "role": "heartland" },
    { "id": "L05-18", "name": "Shadowed Pass", "center": [59.5, 38.0], "role": "heartland" },
    { "id": "L05-19", "name": "Gantetsu's Ridge", "center": [62.0, 38.8], "role": "wild" }
  ],
  "rangers": [
    { "code": "P", "name": "Prajna Masks", "detail": "Anbu-style troops loyal to the local warlords." },
    { "code": "F", "name": "Forest Monks", "detail": "Staff-wielding guardians of the bamboo groves." }
  ],
  "ninjaRisks": [
    { 
      "name": "Prajñā Leader", 
      "village": "Prajñā Group", 
      "detail": "Hannya Mask Anbu Commander, Wood Style User", 
      "image": "../assets/characters/Land05/Prajna Leader.png" 
    },
    { 
      "name": "Gantetsu", 
      "village": "Land of Woods", 
      "detail": "Legendary Criminal 'Gantetsu of the Ridge'", 
      "image": "../assets/characters/Land05/Gantetsu.png" 
    },
    { 
      "name": "Monju", 
      "village": "Shinobazu", 
      "detail": "Member of the Shinobazu group", 
      "image": "../assets/characters/Land05/Monju.png" 
    },
    { 
      "name": "Shura", 
      "village": "Shinobazu", 
      "detail": "Leader of the Shinobazu", 
      "image": "../assets/characters/Land05/Shura.png" 
    },
    { 
      "name": "Toki", 
      "village": "Land of Woods", 
      "detail": "Forest Guardian",
      "image": "../assets/characters/Land05/Toki.png"
    },
    { 
      "name": "Kegon", 
      "village": "Kurosuki Family", 
      "detail": "Water Style User", 
      "image": "../assets/characters/Land05/Kegon.png" 
    },
    { 
      "name": "Ninjutsu Woods", 
      "village": "Land of Woods", 
      "detail": "Generic Ninja", 
      "image": "../assets/characters/Land05/Ninjutsu Rivers.png" 
    },
    { 
      "name": "Healer Woods", 
      "village": "Land of Woods", 
      "detail": "Generic Healer", 
      "image": "../assets/characters/Land05/Healer Rivers.png" 
    }
  ],
  "facts": [
    { "title": "The Prajna Group", "detail": "An organization of Anbu who harbor a deep hatred for the Hidden Leaf due to past betrayals." },
    { "title": "Shinobazu", "detail": "A group of criminal ninja who operate out of the deep woods, often targeting travelers." },
    { "title": "Bamboo Labyrinths", "detail": "The forests here are so thick with bamboo that navigation without a guide is nearly impossible." }
  ],
  "symbol": "A Hannya mask or bamboo stalk."
};