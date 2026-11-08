// Ricette di crafting e fusione usate dal bot (il giocatore simulato non può usare l'interfaccia del banco).
// Gli ingredienti che iniziano con "#" sono gruppi: qualsiasi oggetto del gruppo va bene.

export const GRUPPI = {
  "#assi": (id) => id.endsWith("_planks"),
  "#tronco": (id) => /_(log|stem|wood|hyphae)$/.test(id),
  "#pietra": (id) => ["minecraft:cobblestone", "minecraft:cobbled_deepslate", "minecraft:blackstone"].includes(id),
  "#carbone": (id) => id === "minecraft:coal" || id === "minecraft:charcoal",
  "#lana": (id) => id.endsWith("_wool"),
};

const attrezzi = (materiale, pref) => ({
  [`minecraft:${pref}_pickaxe`]: { ing: { [materiale]: 3, "minecraft:stick": 2 }, out: 1, banco: true },
  [`minecraft:${pref}_axe`]: { ing: { [materiale]: 3, "minecraft:stick": 2 }, out: 1, banco: true },
  [`minecraft:${pref}_sword`]: { ing: { [materiale]: 2, "minecraft:stick": 1 }, out: 1, banco: true },
  [`minecraft:${pref}_shovel`]: { ing: { [materiale]: 1, "minecraft:stick": 2 }, out: 1, banco: true },
  [`minecraft:${pref}_hoe`]: { ing: { [materiale]: 2, "minecraft:stick": 2 }, out: 1, banco: true },
});

const armatura = (materiale, pref) => ({
  [`minecraft:${pref}_helmet`]: { ing: { [materiale]: 5 }, out: 1, banco: true },
  [`minecraft:${pref}_chestplate`]: { ing: { [materiale]: 8 }, out: 1, banco: true },
  [`minecraft:${pref}_leggings`]: { ing: { [materiale]: 7 }, out: 1, banco: true },
  [`minecraft:${pref}_boots`]: { ing: { [materiale]: 4 }, out: 1, banco: true },
});

// Le assi ("minecraft:planks" generico) si fanno a parte: il tipo dipende dal tronco usato.
export const RICETTE = {
  "minecraft:stick": { ing: { "#assi": 2 }, out: 4, banco: false },
  "minecraft:crafting_table": { ing: { "#assi": 4 }, out: 1, banco: false },
  "minecraft:chest": { ing: { "#assi": 8 }, out: 1, banco: true },
  "minecraft:furnace": { ing: { "#pietra": 8 }, out: 1, banco: true },
  "minecraft:torch": { ing: { "#carbone": 1, "minecraft:stick": 1 }, out: 4, banco: false },
  "minecraft:ladder": { ing: { "minecraft:stick": 7 }, out: 3, banco: true },
  "minecraft:bread": { ing: { "minecraft:wheat": 3 }, out: 1, banco: true },
  "minecraft:bucket": { ing: { "minecraft:iron_ingot": 3 }, out: 1, banco: true },
  "minecraft:shield": { ing: { "#assi": 6, "minecraft:iron_ingot": 1 }, out: 1, banco: true },
  "minecraft:white_bed": { ing: { "#lana": 3, "#assi": 3 }, out: 1, banco: true },
  "minecraft:stone_bricks": { ing: { "minecraft:stone": 4 }, out: 4, banco: false },
  "minecraft:shears": { ing: { "minecraft:iron_ingot": 2 }, out: 1, banco: false },
  "minecraft:bow": { ing: { "minecraft:stick": 3, "minecraft:string": 3 }, out: 1, banco: true },
  "minecraft:glass_pane": { ing: { "minecraft:glass": 6 }, out: 16, banco: true },
  "minecraft:oak_fence": { ing: { "#assi": 4, "minecraft:stick": 2 }, out: 3, banco: true },
  "minecraft:oak_fence_gate": { ing: { "minecraft:stick": 4, "#assi": 2 }, out: 1, banco: true },
  "minecraft:cobblestone_wall": { ing: { "minecraft:cobblestone": 6 }, out: 6, banco: true },
  "minecraft:campfire": { ing: { "minecraft:stick": 3, "#carbone": 1, "#tronco": 3 }, out: 1, banco: true },
  "minecraft:iron_nugget": { ing: { "minecraft:iron_ingot": 1 }, out: 9, banco: false },
  "minecraft:flint_and_steel": { ing: { "minecraft:iron_ingot": 1, "minecraft:flint": 1 }, out: 1, banco: false },
  "minecraft:fishing_rod": { ing: { "minecraft:stick": 3, "minecraft:string": 2 }, out: 1, banco: true },
  "minecraft:bricks": { ing: { "minecraft:brick": 4 }, out: 1, banco: false },
  "minecraft:sandstone": { ing: { "minecraft:sand": 4 }, out: 1, banco: false },
  "minecraft:bowl": { ing: { "#assi": 3 }, out: 4, banco: true },
  "minecraft:hay_block": { ing: { "minecraft:wheat": 9 }, out: 1, banco: true },
  "minecraft:arrow": { ing: { "minecraft:flint": 1, "minecraft:stick": 1, "minecraft:feather": 1 }, out: 4, banco: true },
  ...attrezzi("#assi", "wooden"),
  ...attrezzi("#pietra", "stone"),
  ...attrezzi("minecraft:copper_ingot", "copper"),
  ...attrezzi("minecraft:iron_ingot", "iron"),
  ...attrezzi("minecraft:diamond", "diamond"),
  ...armatura("minecraft:copper_ingot", "copper"),
  ...armatura("minecraft:iron_ingot", "iron"),
  ...armatura("minecraft:diamond", "diamond"),
};

// ingresso -> uscita della fornace (10 secondi a pezzo, come nel gioco)
export const FUSIONI = {
  "minecraft:raw_iron": "minecraft:iron_ingot",
  "minecraft:raw_gold": "minecraft:gold_ingot",
  "minecraft:raw_copper": "minecraft:copper_ingot",
  "minecraft:sand": "minecraft:glass",
  "minecraft:cobblestone": "minecraft:stone",
  "minecraft:clay_ball": "minecraft:brick",
  "minecraft:beef": "minecraft:cooked_beef",
  "minecraft:porkchop": "minecraft:cooked_porkchop",
  "minecraft:chicken": "minecraft:cooked_chicken",
  "minecraft:mutton": "minecraft:cooked_mutton",
  "minecraft:rabbit": "minecraft:cooked_rabbit",
  "minecraft:cod": "minecraft:cooked_cod",
  "minecraft:salmon": "minecraft:cooked_salmon",
  "minecraft:potato": "minecraft:baked_potato",
  "#tronco": "minecraft:charcoal",
};

// pezzi fusi per ogni unità di combustibile
export const COMBUSTIBILI = [["#carbone", 8], ["#tronco", 1], ["#assi", 1]];

// punti fame ripristinati (usati dal ripiego quando il cibo non si consuma da solo)
export const CIBO = {
  "minecraft:cooked_beef": 8, "minecraft:cooked_porkchop": 8, "minecraft:cooked_mutton": 6,
  "minecraft:cooked_chicken": 6, "minecraft:cooked_salmon": 6, "minecraft:cooked_cod": 5,
  "minecraft:cooked_rabbit": 5, "minecraft:baked_potato": 5, "minecraft:bread": 5,
  "minecraft:golden_carrot": 6, "minecraft:apple": 4, "minecraft:carrot": 3,
  "minecraft:beef": 3, "minecraft:porkchop": 3, "minecraft:mutton": 2, "minecraft:potato": 1,
  "minecraft:sweet_berries": 2, "minecraft:melon_slice": 2, "minecraft:cookie": 2,
  "minecraft:pumpkin_pie": 8, "minecraft:mushroom_stew": 6, "minecraft:beetroot_soup": 6,
};

export function assiDaTronco(tronco) {
  const legno = tronco.replace("minecraft:", "").replace("stripped_", "").replace(/_(log|wood|stem|hyphae)$/, "");
  return `minecraft:${legno}_planks`;
}
