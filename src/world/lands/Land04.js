export const Land04 = {
  "id": "Land04",
  "name": "Land of Waves",
  "desc": "An island nation that gained prosperity through the Great Naruto Bridge, formerly impoverished by Gato. It is a hub of sea trade and carpentry.",
  "points": [
    [57.80820715403978, 31.826577304808563],
    [57.61462138537574, 32.35007987534704],
    [57.86351651714452, 32.66999741231114],
    [57.697588427830304, 33.018998075122674],
    [57.80820715403978, 33.57158377150859],
    [58.47192550689157, 33.164416857002195],
    [58.47192550689157, 32.93174869758039],
    [58.776130001765104, 32.989914949275246],
    [58.8867547235695, 32.46641237873676],
    [59.32922962840742, 32.03016233838294],
    [59.10799217598846, 31.73932792726627],
    [59.05268281288372, 31.4484935161496]
  ],
  "color": "#3b82f6",
  "texture": "water",
  "seeds": [
    // --- The Bridge Connection ---
    { "id": "L04-1", "name": "Naruto Bridge Gate", "center": [57.9, 31.9], "role": "border" },
    { "id": "L04-2", "name": "Underpass Markets", "center": [57.7, 32.2], "role": "heartland" },
    
    // --- Town Centers ---
    { "id": "L04-3", "name": "Tazuna's District", "center": [58.2, 32.4], "role": "capital" },
    { "id": "L04-4", "name": "Town Square", "center": [58.5, 32.7], "role": "heartland" },
    { "id": "L04-5", "name": "Carpenters' Guild", "center": [58.3, 32.6], "role": "heartland" },
    
    // --- Coastal & Wild ---
    { "id": "L04-6", "name": "Gato's Ruins", "center": [59.0, 32.1], "role": "wild" },
    { "id": "L04-7", "name": "Eastern Port", "center": [59.1, 31.6], "role": "border" },
    { "id": "L04-8", "name": "Northern Cape", "center": [58.0, 33.3], "role": "wild" },
    { "id": "L04-9", "name": "Misty Woods", "center": [58.6, 33.0], "role": "wild" },
    { "id": "L04-10", "name": "Inari's Lookout", "center": [58.9, 32.3], "role": "heartland" },
    { "id": "L04-11", "name": "Smuggler's Cove", "center": [59.2, 31.9], "role": "wild" },
    { "id": "L04-12", "name": "Western Shoals", "center": [57.65, 32.8], "role": "border" }
  ],
  "rangers": [
    { "code": "B", "name": "Bridge Builders", "detail": "Civilian contractors who double as militia." },
    { "code": "S", "name": "Sea Patrol", "detail": "Small skiffs patrolling the heavy fog banks." }
  ],
  "ninjaRisks": [
    { 
      "name": "Zabuza Momochi", 
      "village": "Independent", 
      "detail": "Demon of the Hidden Mist – Hired Protector", 
      "image": "../assets/characters/Land04/Zabuza Momochi.png" 
    },
    { 
      "name": "Haku", 
      "village": "Independent", 
      "detail": "Ice Release User – Hired Protector", 
      "image": "../assets/characters/Land04/Haku.png" 
    },
    { 
      "name": "Gozu", 
      "village": "Independent", 
      "detail": "Demon Brother, Chain User", 
      "image": "../assets/characters/Land04/Gozu and Meizu.png" 
    },
    { 
      "name": "Meizu", 
      "village": "Independent", 
      "detail": "Demon Brother, Chain User", 
      "image": "../assets/characters/Land04/Gozu and Meizu.png" 
    },
    { 
      "name": "Zori", 
      "village": "Independent", 
      "detail": "Gato’s Bodyguard/Mercenary Swordsman", 
      "image": "../assets/characters/Land04/Zori.png" 
    }
  ],
  "facts": [
    { "title": "The Great Bridge", "detail": "Named after Naruto Uzumaki, this bridge ended the economic blockade and connected the island to the mainland." },
    { "title": "Heavy Fog", "detail": "The island is perpetually shrouded in mist, making it a natural haven for Missing-Nin like Zabuza." },
    { "title": "No Hidden Village", "detail": "The Land of Waves does not have a hidden ninja village, relying on hired protection and its own citizens." }
  ],
  "symbol": "Stylized wave or bridge arch."
};