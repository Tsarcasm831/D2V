export const Land03 = {
  "id": "Land03",
  "name": "Land of Frost",
  "desc": "A cold, frozen nation located in the northern regions, covered in snow and ice. Its districts are carved by glaciers and frozen lakes.",
  "points": [
    [48.83359897815877, 15.146455685954448],
    [49.189734318401584, 15.801886881678556],
    [49.39748168225841, 16.238841537601694],
    [49.634907240951925, 16.5041348165717],
    [49.79813431475627, 16.878665577281605],
    [50.18395084763323, 16.90987673672763],
    [50.21362904246992, 17.33122581292775],
    [50.376859114071706, 17.534096773005714],
    [50.718152359098724, 17.549702352728723],
    [51.19300347648576, 18.0178665917767],
    [51.2078425739041, 18.51724356659188],
    [51.35623354808755, 18.95419664619383],
    [51.534302717107686, 18.642086628054784],
    [52.08334332599153, 18.657692207777796],
    [52.69174032454875, 18.673297787500807],
    [52.95884407807896, 19.125856446825768],
    [53.52272977997605, 18.03347217149971],
    [53.65628165674116, 17.518491193282703],
    [54.53178240882859, 17.72136215336067],
    [56.00084106205488, 17.830601211421744],
    [55.92664557496316, 16.457318077402665],
    [54.828558361600564, 15.94233709918566],
    [54.665334285593694, 15.708254979661673],
    [54.68017338301203, 15.380539381799618],
    [54.53178240882859, 15.27130032373854],
    [54.487265116573546, 14.756319345521533],
    [54.27951775271672, 14.05407141062839],
    [54.13112677853328, 13.554696012134396],
    [53.78982753791135, 13.91362276944247],
    [53.19626963677248, 13.835594870827414],
    [52.884648590987226, 14.038465830905377],
    [52.66206812530697, 13.866806030273438],
    [52.42464256661346, 14.178916048412479],
    [52.08334332599153, 13.726357389087521],
    [51.69752679311457, 13.585907171580416],
    [51.40075084034258, 13.91362276944247],
    [51.10396889197569, 13.78877813165838],
    [50.673635066843694, 13.757566972212357],
    [50.376859114071706, 13.4454585303945],
    [49.738777925082886, 13.258191573718362],
    [49.38264258484006, 13.679540649918485],
    [49.53103355902351, 14.022860251182367],
    [49.189734318401584, 14.085282570074412],
    [49.08586363427062, 14.725108186075511]
  ],
  "color": "#94e3fe",
  "texture": "snow",
  "config": {
    "baseHeight": 6.0,
    "noiseScale": 0.01,
    "heightMultiplier": 3.0,
    "primaryBiome": "Tundra",
    "seed": 33333,
    "biomes": {
      "0.15": "Frozen Slush",
      "0.3": "Slush Valley",
      "0.45": "Snow Rabbit Fields",
      "0.6": "Pine Ridge",
      "1.0": "Blizzard Peaks"
    }
  },
  "seeds": [
    // --- Central Capital Region ---
    { "id": "L03-1", "name": "Shimogakure", "center": [52.5, 16.2], "role": "capital" },
    { "id": "L03-2", "name": "Frozen Square", "center": [52.0, 16.0], "role": "heartland" },
    { "id": "L03-3", "name": "Glacier Palace", "center": [53.0, 16.5], "role": "heartland" },
    
    // --- Northern Tundra ---
    { "id": "L03-4", "name": "North Cape", "center": [55.5, 17.0], "role": "wild" },
    { "id": "L03-5", "name": "Ice Floe Coast", "center": [54.8, 15.5], "role": "border" },
    { "id": "L03-6", "name": "Blizzard Peak", "center": [54.5, 17.5], "role": "wild" },
    { "id": "L03-7", "name": "White Walker Path", "center": [55.0, 16.5], "role": "wild" },
    
    // --- Southern Thaw ---
    { "id": "L03-8", "name": "Southern Drifts", "center": [49.5, 14.5], "role": "wild" },
    { "id": "L03-9", "name": "Slush Valley", "center": [49.2, 15.8], "role": "border" },
    { "id": "L03-10", "name": "Mist Border", "center": [50.0, 14.0], "role": "border" },
    { "id": "L03-11", "name": "Pine Ridge", "center": [50.5, 15.0], "role": "heartland" },
    
    // --- Eastern Edge (Deep Snow) ---
    { "id": "L03-12", "name": "Frozen Port", "center": [51.5, 18.2], "role": "border" },
    { "id": "L03-13", "name": "Icicle Cliffs", "center": [52.8, 18.5], "role": "wild" },
    { "id": "L03-14", "name": "East Watch", "center": [50.5, 17.5], "role": "border" },
    { "id": "L03-15", "name": "Deep Snow Plain", "center": [53.2, 17.8], "role": "wild" },
    
    // --- Western Peaks ---
    { "id": "L03-16", "name": "Cryo Peaks", "center": [53.0, 14.2], "role": "wild" },
    { "id": "L03-17", "name": "Windy Pass", "center": [51.0, 14.0], "role": "border" },
    { "id": "L03-18", "name": "Frostbite Ridge", "center": [52.0, 14.5], "role": "wild" },
    { "id": "L03-19", "name": "Echo Canyon", "center": [53.8, 14.0], "role": "border" },
    
    // --- Inner Lands ---
    { "id": "L03-20", "name": "Mirror Lake", "center": [51.0, 16.5], "role": "heartland" },
    { "id": "L03-21", "name": "Winter Market", "center": [51.8, 17.0], "role": "heartland" },
    { "id": "L03-22", "name": "Snow Rabbit Fields", "center": [53.5, 15.5], "role": "heartland" },
    { "id": "L03-23", "name": "Cold Iron Mine", "center": [50.2, 16.8], "role": "wild" },
    { "id": "L03-24", "name": "Aurora Point", "center": [54.0, 16.8], "role": "wild" }
  ],
  "rangers": [
    { "code": "F", "name": "Frost Guard", "detail": "Heavily clad sentinels who patrol the blizzards." },
    { "code": "W", "name": "Winter Scouts", "detail": "Recon units using snow-camo and ice release." }
  ],
  "ninjaRisks": [
    { "name": "Fubuki Kakuyoku", "village": "Hidden Frost Village", "detail": "Ice Style user, often associated with Snow", "image": "../assets/characters/Land03/Fubuki Kakuyoku.png" },
    { "name": "Naderi", "village": "Hidden Frost Village", "detail": "Anbu of the Frost", "image": "../assets/characters/Land03/Naderi.png" },
    { "name": "Frost Daimyo's Guard", "village": "Hidden Frost Village", "detail": "Substitute for Chukichi", "image": "../assets/characters/Land03/Frost Daimyo's Guard.png" },
    { "name": "Genjutsu Frost", "village": "Hidden Frost Village", "detail": "Illusion Specialist", "image": "../assets/characters/Land03/Genjutsu Frost.png" },
    { "name": "Tank Frost", "village": "Hidden Frost Village", "detail": "Heavy Shield Unit", "image": "../assets/characters/Land03/Tank Frost.png" }
  ],
  "facts": [
    { "title": "Permafrost", "detail": "The ground is frozen year-round, making agriculture difficult but mining prosperous." },
    { "title": "Ice Mirrors", "detail": "Certain lakes are so still and reflective they are used for large-scale genjutsu rituals." },
    { "title": "Isolation", "detail": "The harsh weather naturally fortifies the borders, reducing the need for large standing armies." }
  ],
  "symbol": "Crystalline snowflake icon."
};