// Ricette di crafting e fusione usate dal bot (il giocatore simulato non può usare l'interfaccia del banco).
// Gli ingredienti che iniziano con "#" sono gruppi: qualsiasi oggetto del gruppo va bene.

export const GRUPPI = {
  "#assi": (id) => id.endsWith("_planks"),
  "#tronco": (id) => /_(log|stem|wood|hyphae)$/.test(id),
  "#pietra": (id) => ["minecraft:cobblestone", "minecraft:cobbled_deepslate", "minecraft:blackstone"].includes(id),
  "#carbone": (id) => id === "minecraft:coal" || id === "minecraft:charcoal",
  "#lana": (id) => id.endsWith("_wool"),
  "#lastra_legno": (id) => /^minecraft:(oak|spruce|birch|jungle|acacia|dark_oak|mangrove|cherry|pale_oak|bamboo|crimson|warped)_slab$/.test(id),
  "#sabbia": (id) => id === "minecraft:sand" || id === "minecraft:red_sand",
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
// Una ricetta può avere alternative: alt = [{ ing, out? }]; fabbrica usa la prima di cui ha tutti gli ingredienti.
// Gli id sbagliati per questa versione del gioco li scarta verificaRicette() all'avvio (azioni.js), quindi non fanno danni.
const R = (ing, out = 1, banco = true, alt) => ({ ing, out, banco, ...(alt ? { alt } : {}) });
const ITEM = (n) => `minecraft:${n}`;

// ---- legni: ogni legno ha la sua famiglia (scale, lastre, porte, botole, staccionate, cartelli, barche...)
// In Bedrock alcune cose di quercia hanno nomi storici (wooden_door, trapdoor, fence_gate, wooden_button, wooden_pressure_plate).
const LEGNI = ["oak", "spruce", "birch", "jungle", "acacia", "dark_oak", "mangrove", "cherry", "pale_oak", "bamboo", "crimson", "warped"];
const QUERCIA = { door: "wooden_door", trapdoor: "trapdoor", fence_gate: "fence_gate", button: "wooden_button", pressure_plate: "wooden_pressure_plate" };
function famigliaLegno(w) {
  const assi = w === "oak" ? "#assi" : ITEM(`${w}_planks`); // per la quercia va bene qualsiasi asse (come prima)
  const nome = (pezzo) => ITEM(w === "oak" && QUERCIA[pezzo] ? QUERCIA[pezzo] : `${w}_${pezzo}`);
  const r = {
    [ITEM(`${w}_stairs`)]: R({ [assi]: 6 }, 4),
    [ITEM(`${w}_slab`)]: R({ [assi]: 3 }, 6),
    [nome("door")]: R({ [assi]: 6 }, 3),
    [nome("trapdoor")]: R({ [assi]: 6 }, 2),
    [nome("fence_gate")]: R({ "minecraft:stick": 4, [assi]: 2 }),
    [nome("button")]: R({ [assi]: 1 }, 1, false),
    [nome("pressure_plate")]: R({ [assi]: 2 }, 1, false),
    [ITEM(`${w}_sign`)]: R({ [assi]: 6, "minecraft:stick": 1 }, 3),
  };
  if (w !== "bamboo") r[ITEM(`${w}_fence`)] = R({ [assi]: 4, "minecraft:stick": 2 }, 3);
  if (w === "bamboo") r["minecraft:bamboo_fence"] = R({ [assi]: 4, "minecraft:stick": 2 }, 3);
  const tronco = w === "crimson" || w === "warped" ? `${w}_stem` : w === "bamboo" ? "bamboo_block" : `${w}_log`;
  const scortecciato = w === "bamboo" ? "stripped_bamboo_block" : `stripped_${tronco}`;
  r[ITEM(`${w}_hanging_sign`)] = R({ [ITEM(scortecciato)]: 6, "minecraft:chain": 2 }, 6);
  if (w !== "bamboo") r[ITEM(w === "crimson" || w === "warped" ? `${w}_hyphae` : `${w}_wood`)] = R({ [ITEM(tronco)]: 4 }, 3, false);
  if (w !== "crimson" && w !== "warped") {
    const barca = w === "bamboo" ? "bamboo_raft" : `${w}_boat`;
    r[ITEM(barca)] = R({ [assi]: 5 });
    r[ITEM(w === "bamboo" ? "bamboo_chest_raft" : `${w}_chest_boat`)] = R({ [ITEM(barca)]: 1, "minecraft:chest": 1 }, 1, false);
  }
  return r;
}

// ---- pietre: scale (6 -> 4), lastre (3 -> 6), muri (6 -> 6)
// [blocco, scale, lastra, muro] (null = non esiste)
const PIETRE = [
  ["cobblestone", "stone_stairs", "cobblestone_slab", "cobblestone_wall"],
  ["stone", "normal_stone_stairs", "normal_stone_slab", null],
  ["smooth_stone", null, "smooth_stone_slab", null],
  ["mossy_cobblestone", "mossy_cobblestone_stairs", "mossy_cobblestone_slab", "mossy_cobblestone_wall"],
  ["stone_bricks", "stone_brick_stairs", "stone_brick_slab", "stone_brick_wall"],
  ["mossy_stone_bricks", "mossy_stone_brick_stairs", "mossy_stone_brick_slab", "mossy_stone_brick_wall"],
  ["granite", "granite_stairs", "granite_slab", "granite_wall"],
  ["polished_granite", "polished_granite_stairs", "polished_granite_slab", null],
  ["diorite", "diorite_stairs", "diorite_slab", "diorite_wall"],
  ["polished_diorite", "polished_diorite_stairs", "polished_diorite_slab", null],
  ["andesite", "andesite_stairs", "andesite_slab", "andesite_wall"],
  ["polished_andesite", "polished_andesite_stairs", "polished_andesite_slab", null],
  ["cobbled_deepslate", "cobbled_deepslate_stairs", "cobbled_deepslate_slab", "cobbled_deepslate_wall"],
  ["polished_deepslate", "polished_deepslate_stairs", "polished_deepslate_slab", "polished_deepslate_wall"],
  ["deepslate_bricks", "deepslate_brick_stairs", "deepslate_brick_slab", "deepslate_brick_wall"],
  ["deepslate_tiles", "deepslate_tile_stairs", "deepslate_tile_slab", "deepslate_tile_wall"],
  ["bricks", "brick_stairs", "brick_slab", "brick_wall"],
  ["sandstone", "sandstone_stairs", "sandstone_slab", "sandstone_wall"],
  ["smooth_sandstone", "smooth_sandstone_stairs", "smooth_sandstone_slab", null],
  ["red_sandstone", "red_sandstone_stairs", "red_sandstone_slab", "red_sandstone_wall"],
  ["mud_bricks", "mud_brick_stairs", "mud_brick_slab", "mud_brick_wall"],
  ["tuff", "tuff_stairs", "tuff_slab", "tuff_wall"],
  ["polished_tuff", "polished_tuff_stairs", "polished_tuff_slab", "polished_tuff_wall"],
  ["tuff_bricks", "tuff_brick_stairs", "tuff_brick_slab", "tuff_brick_wall"],
  ["nether_bricks", "nether_brick_stairs", "nether_brick_slab", "nether_brick_wall"],
  ["blackstone", "blackstone_stairs", "blackstone_slab", "blackstone_wall"],
  ["polished_blackstone", "polished_blackstone_stairs", "polished_blackstone_slab", "polished_blackstone_wall"],
  ["polished_blackstone_bricks", "polished_blackstone_brick_stairs", "polished_blackstone_brick_slab", "polished_blackstone_brick_wall"],
  ["quartz_block", "quartz_stairs", "quartz_slab", null],
  ["prismarine", "prismarine_stairs", "prismarine_slab", "prismarine_wall"],
  ["purpur_block", "purpur_stairs", "purpur_slab", null],
  ["end_stone_bricks", "end_stone_brick_stairs", "end_stone_brick_slab", "end_stone_brick_wall"],
];
function famigliePietra() {
  const r = {};
  for (const [b, sc, la, mu] of PIETRE) {
    if (sc) r[ITEM(sc)] = R({ [ITEM(b)]: 6 }, 4);
    if (la) r[ITEM(la)] = R({ [ITEM(b)]: 3 }, 6);
    if (mu) r[ITEM(mu)] = R({ [ITEM(b)]: 6 }, 6);
  }
  return r;
}

// ---- colori: tinture, lana, tappeti, vetri, terracotta, cemento, candele, letti
const COLORI = ["white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray", "light_gray", "cyan", "purple", "blue", "brown", "green", "red", "black"];
const TINTURE = {
  white: R({ "minecraft:bone_meal": 1 }, 1, false, [{ ing: { "minecraft:lily_of_the_valley": 1 } }]),
  red: R({ "minecraft:poppy": 1 }, 1, false, [{ ing: { "minecraft:red_tulip": 1 } }, { ing: { "minecraft:beetroot": 1 } }, { ing: { "minecraft:rose_bush": 1 }, out: 2 }]),
  yellow: R({ "minecraft:dandelion": 1 }, 1, false, [{ ing: { "minecraft:sunflower": 1 }, out: 2 }]),
  blue: R({ "minecraft:lapis_lazuli": 1 }, 1, false, [{ ing: { "minecraft:cornflower": 1 } }]),
  black: R({ "minecraft:ink_sac": 1 }, 1, false, [{ ing: { "minecraft:wither_rose": 1 } }]),
  brown: R({ "minecraft:cocoa_beans": 1 }, 1, false),
  orange: R({ "minecraft:orange_tulip": 1 }, 1, false, [{ ing: { "minecraft:torchflower": 1 } }, { ing: { "minecraft:red_dye": 1, "minecraft:yellow_dye": 1 }, out: 2 }]),
  pink: R({ "minecraft:pink_tulip": 1 }, 1, false, [{ ing: { "minecraft:peony": 1 }, out: 2 }, { ing: { "minecraft:red_dye": 1, "minecraft:white_dye": 1 }, out: 2 }]),
  lime: R({ "minecraft:green_dye": 1, "minecraft:white_dye": 1 }, 2, false),
  light_blue: R({ "minecraft:blue_orchid": 1 }, 1, false, [{ ing: { "minecraft:blue_dye": 1, "minecraft:white_dye": 1 }, out: 2 }]),
  magenta: R({ "minecraft:allium": 1 }, 1, false, [{ ing: { "minecraft:lilac": 1 }, out: 2 }, { ing: { "minecraft:purple_dye": 1, "minecraft:pink_dye": 1 }, out: 2 }]),
  purple: R({ "minecraft:red_dye": 1, "minecraft:blue_dye": 1 }, 2, false),
  cyan: R({ "minecraft:blue_dye": 1, "minecraft:green_dye": 1 }, 2, false, [{ ing: { "minecraft:pitcher_plant": 1 }, out: 2 }]),
  light_gray: R({ "minecraft:azure_bluet": 1 }, 1, false, [{ ing: { "minecraft:oxeye_daisy": 1 } }, { ing: { "minecraft:white_tulip": 1 } }, { ing: { "minecraft:gray_dye": 1, "minecraft:white_dye": 1 }, out: 2 }]),
  gray: R({ "minecraft:black_dye": 1, "minecraft:white_dye": 1 }, 2, false),
  // green: solo dalla fornace (cactus), vedi FUSIONI
};
function famiglieColori() {
  const r = {};
  for (const c of COLORI) {
    const tint = ITEM(`${c}_dye`);
    if (TINTURE[c]) r[tint] = TINTURE[c];
    if (c !== "white") r[ITEM(`${c}_wool`)] = R({ "minecraft:white_wool": 1, [tint]: 1 }, 1, false);
    r[ITEM(`${c}_carpet`)] = R({ [ITEM(`${c}_wool`)]: 2 }, 3, false);
    r[ITEM(`${c}_stained_glass`)] = R({ "minecraft:glass": 8, [tint]: 1 }, 8);
    r[ITEM(`${c}_stained_glass_pane`)] = R({ [ITEM(`${c}_stained_glass`)]: 6 }, 16);
    r[ITEM(`${c}_terracotta`)] = R({ "minecraft:hardened_clay": 8, [tint]: 1 }, 8);
    r[ITEM(`${c}_concrete_powder`)] = R({ [tint]: 1, "minecraft:sand": 4, "minecraft:gravel": 4 }, 8, false);
    r[ITEM(`${c}_candle`)] = R({ "minecraft:candle": 1, [tint]: 1 }, 1, false);
    if (c !== "white") r[ITEM(`${c}_bed`)] = R({ [ITEM(`${c}_wool`)]: 3, "#assi": 3 });
  }
  return r;
}

// ---- blocchi di minerale (9 -> 1) e ritorno (1 -> 9)
const MINERALI = [["iron_block", "iron_ingot"], ["gold_block", "gold_ingot"], ["copper_block", "copper_ingot"], ["diamond_block", "diamond"],
  ["emerald_block", "emerald"], ["lapis_block", "lapis_lazuli"], ["redstone_block", "redstone"], ["coal_block", "coal"],
  ["netherite_block", "netherite_ingot"], ["raw_iron_block", "raw_iron"], ["raw_gold_block", "raw_gold"], ["raw_copper_block", "raw_copper"],
  ["slime", "slime_ball"], ["dried_kelp_block", "dried_kelp"], ["bone_block", "bone_meal"]];
function blocchiMinerale() {
  const r = {};
  for (const [blocco, pezzo] of MINERALI) {
    r[ITEM(blocco)] = R({ [ITEM(pezzo)]: 9 });
    // i lingotti si ottengono anche dalle pepite: un'alternativa sola ricetta per uscita
    const pepite = { iron_ingot: "iron_nugget", gold_ingot: "gold_nugget", copper_ingot: "copper_nugget" }[pezzo];
    r[ITEM(pezzo)] = R({ [ITEM(blocco)]: 1 }, pezzo === "bone_meal" ? 9 : 9, false, pepite ? [{ ing: { [ITEM(pepite)]: 9 }, out: 1 }] : undefined);
  }
  r["minecraft:bone_meal"] = R({ "minecraft:bone": 1 }, 3, false, [{ ing: { "minecraft:bone_block": 1 }, out: 9 }]);
  return r;
}

export const RICETTE = {
  // base
  "minecraft:stick": R({ "#assi": 2 }, 4, false, [{ ing: { "minecraft:bamboo": 2 }, out: 1 }]),
  "minecraft:crafting_table": R({ "#assi": 4 }, 1, false),
  "minecraft:chest": R({ "#assi": 8 }),
  "minecraft:furnace": R({ "#pietra": 8 }),
  "minecraft:torch": R({ "#carbone": 1, "minecraft:stick": 1 }, 4, false),
  "minecraft:ladder": R({ "minecraft:stick": 7 }, 3),
  "minecraft:bread": R({ "minecraft:wheat": 3 }),
  "minecraft:bucket": R({ "minecraft:iron_ingot": 3 }),
  "minecraft:shield": R({ "#assi": 6, "minecraft:iron_ingot": 1 }),
  "minecraft:white_bed": R({ "#lana": 3, "#assi": 3 }),
  "minecraft:bed": R({ "#lana": 3, "#assi": 3 }),
  "minecraft:stone_bricks": R({ "minecraft:stone": 4 }, 4, false),
  "minecraft:shears": R({ "minecraft:iron_ingot": 2 }, 1, false),
  "minecraft:bow": R({ "minecraft:stick": 3, "minecraft:string": 3 }),
  "minecraft:glass_pane": R({ "minecraft:glass": 6 }, 16),
  "minecraft:oak_fence_gate": R({ "minecraft:stick": 4, "#assi": 2 }),
  "minecraft:campfire": R({ "minecraft:stick": 3, "#carbone": 1, "#tronco": 3 }),
  "minecraft:soul_campfire": R({ "minecraft:stick": 3, "minecraft:soul_sand": 1, "#tronco": 3 }),
  "minecraft:iron_nugget": R({ "minecraft:iron_ingot": 1 }, 9, false),
  "minecraft:gold_nugget": R({ "minecraft:gold_ingot": 1 }, 9, false),
  "minecraft:copper_nugget": R({ "minecraft:copper_ingot": 1 }, 9, false),
  "minecraft:flint_and_steel": R({ "minecraft:iron_ingot": 1, "minecraft:flint": 1 }, 1, false),
  "minecraft:fishing_rod": R({ "minecraft:stick": 3, "minecraft:string": 2 }),
  "minecraft:bricks": R({ "minecraft:brick": 4 }, 1, false),
  "minecraft:sandstone": R({ "minecraft:sand": 4 }, 1, false),
  "minecraft:red_sandstone": R({ "minecraft:red_sand": 4 }, 1, false),
  "minecraft:bowl": R({ "#assi": 3 }, 4),
  "minecraft:hay_block": R({ "minecraft:wheat": 9 }),
  "minecraft:wheat": R({ "minecraft:hay_block": 1 }, 9, false),
  "minecraft:arrow": R({ "minecraft:flint": 1, "minecraft:stick": 1, "minecraft:feather": 1 }, 4),
  "minecraft:white_wool": R({ "minecraft:string": 4 }, 1, false),

  // attrezzi e armature
  ...attrezzi("#assi", "wooden"),
  ...attrezzi("#pietra", "stone"),
  ...attrezzi("minecraft:copper_ingot", "copper"),
  ...attrezzi("minecraft:iron_ingot", "iron"),
  ...attrezzi("minecraft:gold_ingot", "golden"),
  ...attrezzi("minecraft:diamond", "diamond"),
  ...armatura("minecraft:leather", "leather"),
  ...armatura("minecraft:copper_ingot", "copper"),
  ...armatura("minecraft:iron_ingot", "iron"),
  ...armatura("minecraft:gold_ingot", "golden"),
  ...armatura("minecraft:diamond", "diamond"),
  "minecraft:turtle_helmet": R({ "minecraft:turtle_scute": 5 }),
  "minecraft:wolf_armor": R({ "minecraft:armadillo_scute": 6 }),
  "minecraft:crossbow": R({ "minecraft:stick": 3, "minecraft:string": 2, "minecraft:iron_ingot": 1, "minecraft:tripwire_hook": 1 }),
  "minecraft:spyglass": R({ "minecraft:amethyst_shard": 1, "minecraft:copper_ingot": 2 }),
  "minecraft:brush": R({ "minecraft:feather": 1, "minecraft:copper_ingot": 1, "minecraft:stick": 1 }),
  "minecraft:mace": R({ "minecraft:heavy_core": 1, "minecraft:breeze_rod": 1 }),
  "minecraft:compass": R({ "minecraft:iron_ingot": 4, "minecraft:redstone": 1 }),
  "minecraft:recovery_compass": R({ "minecraft:echo_shard": 8, "minecraft:compass": 1 }),
  "minecraft:clock": R({ "minecraft:gold_ingot": 4, "minecraft:redstone": 1 }),
  "minecraft:empty_map": R({ "minecraft:paper": 9 }, 1, true, [{ ing: { "minecraft:paper": 8, "minecraft:compass": 1 } }]),
  "minecraft:lead": R({ "minecraft:string": 4, "minecraft:slime_ball": 1 }, 2),
  "minecraft:name_tag": R({ "minecraft:paper": 1, "minecraft:iron_nugget": 1 }, 1, false, [{ ing: { "minecraft:paper": 1, "minecraft:gold_nugget": 1 } }, { ing: { "minecraft:paper": 1, "minecraft:copper_nugget": 1 } }]),
  "minecraft:saddle": R({ "minecraft:leather": 3, "minecraft:iron_ingot": 1 }),
  "minecraft:carrot_on_a_stick": R({ "minecraft:fishing_rod": 1, "minecraft:carrot": 1 }, 1, false),
  "minecraft:warped_fungus_on_a_stick": R({ "minecraft:fishing_rod": 1, "minecraft:warped_fungus": 1 }, 1, false),
  "minecraft:netherite_ingot": R({ "minecraft:netherite_scrap": 4, "minecraft:gold_ingot": 4 }, 1, false),
  "minecraft:netherite_upgrade_smithing_template": R({ "minecraft:netherite_upgrade_smithing_template": 1, "minecraft:diamond": 7, "minecraft:netherrack": 1 }, 2),
  // netherite: al tavolo da forgiatura (simulato come gli altri): modello + pezzo di diamante + lingotto
  ...Object.fromEntries(["sword", "pickaxe", "axe", "shovel", "hoe", "helmet", "chestplate", "leggings", "boots"].map((p) => [ITEM(`netherite_${p}`),
    R({ "minecraft:netherite_upgrade_smithing_template": 1, [ITEM(`diamond_${p}`)]: 1, "minecraft:netherite_ingot": 1 }, 1, false)])),

  // stazioni e blocchi utili
  "minecraft:smoker": R({ "minecraft:furnace": 1, "#tronco": 4 }),
  "minecraft:blast_furnace": R({ "minecraft:furnace": 1, "minecraft:iron_ingot": 5, "minecraft:smooth_stone": 3 }),
  "minecraft:barrel": R({ "#assi": 6, "#lastra_legno": 2 }),
  "minecraft:smithing_table": R({ "minecraft:iron_ingot": 2, "#assi": 4 }),
  "minecraft:cartography_table": R({ "minecraft:paper": 2, "#assi": 4 }),
  "minecraft:fletching_table": R({ "minecraft:flint": 2, "#assi": 4 }),
  "minecraft:loom": R({ "minecraft:string": 2, "#assi": 2 }),
  "minecraft:grindstone": R({ "minecraft:stick": 2, "minecraft:stone_slab": 1, "#assi": 2 }, 1, true, [{ ing: { "minecraft:stick": 2, "minecraft:normal_stone_slab": 1, "#assi": 2 } }]),
  "minecraft:stonecutter_block": R({ "minecraft:iron_ingot": 1, "minecraft:stone": 3 }),
  "minecraft:composter": R({ "#lastra_legno": 7 }),
  "minecraft:lectern": R({ "#lastra_legno": 4, "minecraft:bookshelf": 1 }),
  "minecraft:bookshelf": R({ "#assi": 6, "minecraft:book": 3 }),
  "minecraft:chiseled_bookshelf": R({ "#assi": 6, "#lastra_legno": 3 }),
  "minecraft:enchanting_table": R({ "minecraft:book": 1, "minecraft:diamond": 2, "minecraft:obsidian": 4 }),
  "minecraft:anvil": R({ "minecraft:iron_block": 3, "minecraft:iron_ingot": 4 }),
  "minecraft:cauldron": R({ "minecraft:iron_ingot": 7 }),
  "minecraft:brewing_stand": R({ "minecraft:blaze_rod": 1, "#pietra": 3 }),
  "minecraft:beacon": R({ "minecraft:glass": 5, "minecraft:nether_star": 1, "minecraft:obsidian": 3 }),
  "minecraft:conduit": R({ "minecraft:nautilus_shell": 8, "minecraft:heart_of_the_sea": 1 }),
  "minecraft:ender_chest": R({ "minecraft:obsidian": 8, "minecraft:ender_eye": 1 }),
  "minecraft:ender_eye": R({ "minecraft:ender_pearl": 1, "minecraft:blaze_powder": 1 }, 1, false),
  "minecraft:blaze_powder": R({ "minecraft:blaze_rod": 1 }, 2, false),
  "minecraft:respawn_anchor": R({ "minecraft:crying_obsidian": 6, "minecraft:glowstone": 3 }),
  "minecraft:lodestone": R({ "minecraft:chiseled_stone_bricks": 8, "minecraft:iron_ingot": 1 }),
  "minecraft:jukebox": R({ "#assi": 8, "minecraft:diamond": 1 }),
  "minecraft:noteblock": R({ "#assi": 8, "minecraft:redstone": 1 }),
  "minecraft:armor_stand": R({ "minecraft:stick": 6, "minecraft:smooth_stone_slab": 1 }),
  "minecraft:item_frame": R({ "minecraft:stick": 8, "minecraft:leather": 1 }),
  "minecraft:glow_frame": R({ "minecraft:item_frame": 1, "minecraft:glow_ink_sac": 1 }, 1, false),
  "minecraft:painting": R({ "minecraft:stick": 8, "#lana": 1 }),
  "minecraft:flower_pot": R({ "minecraft:brick": 3 }),
  "minecraft:decorated_pot": R({ "minecraft:brick": 4 }),
  "minecraft:scaffolding": R({ "minecraft:bamboo": 6, "minecraft:string": 1 }, 6),
  "minecraft:beehive": R({ "#assi": 6, "minecraft:honeycomb": 3 }),
  "minecraft:candle": R({ "minecraft:string": 1, "minecraft:honeycomb": 1 }, 1, false),
  "minecraft:honey_block": R({ "minecraft:honey_bottle": 4 }, 1, false),
  "minecraft:honeycomb_block": R({ "minecraft:honeycomb": 4 }, 1, false),
  "minecraft:lantern": R({ "minecraft:torch": 1, "minecraft:iron_nugget": 8 }),
  "minecraft:soul_lantern": R({ "minecraft:soul_torch": 1, "minecraft:iron_nugget": 8 }),
  "minecraft:soul_torch": R({ "#carbone": 1, "minecraft:stick": 1, "minecraft:soul_sand": 1 }, 4, false),
  "minecraft:copper_torch": R({ "#carbone": 1, "minecraft:stick": 1, "minecraft:copper_nugget": 1 }, 4, false),
  "minecraft:copper_lantern": R({ "minecraft:copper_torch": 1, "minecraft:copper_nugget": 8 }),
  "minecraft:chain": R({ "minecraft:iron_nugget": 2, "minecraft:iron_ingot": 1 }),
  "minecraft:iron_chain": R({ "minecraft:iron_nugget": 2, "minecraft:iron_ingot": 1 }),
  "minecraft:iron_bars": R({ "minecraft:iron_ingot": 6 }, 16),
  "minecraft:iron_door": R({ "minecraft:iron_ingot": 6 }, 3),
  "minecraft:iron_trapdoor": R({ "minecraft:iron_ingot": 4 }),
  "minecraft:copper_door": R({ "minecraft:copper_ingot": 6 }, 3),
  "minecraft:copper_trapdoor": R({ "minecraft:copper_ingot": 4 }),
  "minecraft:copper_bulb": R({ "minecraft:copper_block": 3, "minecraft:blaze_rod": 1, "minecraft:redstone": 1 }, 4),
  "minecraft:copper_chest": R({ "minecraft:chest": 1, "minecraft:copper_ingot": 8 }),
  "minecraft:lightning_rod": R({ "minecraft:copper_ingot": 3 }),
  "minecraft:cut_copper": R({ "minecraft:copper_block": 4 }, 4, false),
  "minecraft:cut_copper_stairs": R({ "minecraft:cut_copper": 6 }, 4),
  "minecraft:cut_copper_slab": R({ "minecraft:cut_copper": 3 }, 6),
  "minecraft:copper_grate": R({ "minecraft:copper_block": 4 }, 4, false),
  "minecraft:chiseled_copper": R({ "minecraft:cut_copper_slab": 2 }, 1, false),
  "minecraft:carved_pumpkin": R({ "minecraft:pumpkin": 1 }, 1, false),
  "minecraft:lit_pumpkin": R({ "minecraft:carved_pumpkin": 1, "minecraft:torch": 1 }, 1, false),
  "minecraft:snow": R({ "minecraft:snowball": 4 }, 1, false),
  "minecraft:snow_layer": R({ "minecraft:snow": 3 }, 6),
  "minecraft:clay": R({ "minecraft:clay_ball": 4 }, 1, false),
  "minecraft:packed_ice": R({ "minecraft:ice": 9 }),
  "minecraft:blue_ice": R({ "minecraft:packed_ice": 9 }),
  "minecraft:packed_mud": R({ "minecraft:mud": 1, "minecraft:wheat": 1 }, 1, false),
  "minecraft:mud_bricks": R({ "minecraft:packed_mud": 4 }, 4, false),
  "minecraft:magma": R({ "minecraft:magma_cream": 4 }, 1, false),
  "minecraft:glowstone": R({ "minecraft:glowstone_dust": 4 }, 1, false),
  "minecraft:sea_lantern": R({ "minecraft:prismarine_shard": 4, "minecraft:prismarine_crystals": 5 }),
  "minecraft:prismarine": R({ "minecraft:prismarine_shard": 4 }, 1, false),
  "minecraft:prismarine_bricks": R({ "minecraft:prismarine_shard": 9 }),
  "minecraft:dark_prismarine": R({ "minecraft:prismarine_shard": 8, "minecraft:black_dye": 1 }),
  "minecraft:quartz_block": R({ "minecraft:quartz": 4 }, 1, false),
  "minecraft:quartz_pillar": R({ "minecraft:quartz_block": 2 }, 2, false),
  "minecraft:nether_bricks": R({ "minecraft:netherbrick": 4 }, 1, false),
  "minecraft:red_nether_brick": R({ "minecraft:nether_wart": 2, "minecraft:netherbrick": 2 }, 1, false),
  "minecraft:nether_wart_block": R({ "minecraft:nether_wart": 9 }),
  "minecraft:end_stone_bricks": R({ "minecraft:end_stone": 4 }, 4, false),
  "minecraft:purpur_block": R({ "minecraft:popped_chorus_fruit": 4 }, 4, false),
  "minecraft:end_rod": R({ "minecraft:blaze_rod": 1, "minecraft:popped_chorus_fruit": 1 }, 4, false),
  "minecraft:end_crystal": R({ "minecraft:glass": 7, "minecraft:ender_eye": 1, "minecraft:ghast_tear": 1 }),
  "minecraft:shulker_box": R({ "minecraft:shulker_shell": 2, "minecraft:chest": 1 }),
  "minecraft:mossy_cobblestone": R({ "minecraft:cobblestone": 1, "minecraft:vine": 1 }, 1, false, [{ ing: { "minecraft:cobblestone": 1, "minecraft:moss_block": 1 } }]),
  "minecraft:mossy_stone_bricks": R({ "minecraft:stone_bricks": 1, "minecraft:vine": 1 }, 1, false, [{ ing: { "minecraft:stone_bricks": 1, "minecraft:moss_block": 1 } }]),
  "minecraft:chiseled_stone_bricks": R({ "minecraft:stone_brick_slab": 2 }, 1, false),
  "minecraft:polished_granite": R({ "minecraft:granite": 4 }, 4, false),
  "minecraft:polished_diorite": R({ "minecraft:diorite": 4 }, 4, false),
  "minecraft:polished_andesite": R({ "minecraft:andesite": 4 }, 4, false),
  "minecraft:granite": R({ "minecraft:diorite": 1, "minecraft:quartz": 1 }, 1, false),
  "minecraft:diorite": R({ "minecraft:cobblestone": 2, "minecraft:quartz": 2 }),
  "minecraft:andesite": R({ "minecraft:diorite": 1, "minecraft:cobblestone": 1 }, 2, false),
  "minecraft:polished_deepslate": R({ "minecraft:cobbled_deepslate": 4 }, 4, false),
  "minecraft:deepslate_bricks": R({ "minecraft:polished_deepslate": 4 }, 4, false),
  "minecraft:deepslate_tiles": R({ "minecraft:deepslate_bricks": 4 }, 4, false),
  "minecraft:polished_tuff": R({ "minecraft:tuff": 4 }, 4, false),
  "minecraft:tuff_bricks": R({ "minecraft:polished_tuff": 4 }, 4, false),
  "minecraft:polished_blackstone": R({ "minecraft:blackstone": 4 }, 4, false),
  "minecraft:polished_blackstone_bricks": R({ "minecraft:polished_blackstone": 4 }, 4, false),
  "minecraft:smooth_sandstone": R({ "minecraft:sandstone": 1 }, 1, false), // in realtà dalla fornace: vedi FUSIONI
  "minecraft:cut_sandstone": R({ "minecraft:sandstone": 4 }, 4, false),
  "minecraft:chiseled_sandstone": R({ "minecraft:sandstone_slab": 2 }, 1, false),
  "minecraft:tnt": R({ "minecraft:gunpowder": 5, "#sabbia": 4 }),
  "minecraft:fire_charge": R({ "minecraft:gunpowder": 1, "minecraft:blaze_powder": 1, "#carbone": 1 }, 3, false),
  "minecraft:firework_rocket": R({ "minecraft:paper": 1, "minecraft:gunpowder": 1 }, 3, false),
  "minecraft:target": R({ "minecraft:redstone": 4, "minecraft:hay_block": 1 }),
  "minecraft:wind_charge": R({ "minecraft:breeze_rod": 1 }, 4, false),

  // redstone e trasporti
  "minecraft:redstone_torch": R({ "minecraft:redstone": 1, "minecraft:stick": 1 }, 1, false),
  "minecraft:lever": R({ "minecraft:stick": 1, "minecraft:cobblestone": 1 }, 1, false),
  "minecraft:stone_button": R({ "minecraft:stone": 1 }, 1, false),
  "minecraft:stone_pressure_plate": R({ "minecraft:stone": 2 }, 1, false),
  "minecraft:polished_blackstone_button": R({ "minecraft:polished_blackstone": 1 }, 1, false),
  "minecraft:polished_blackstone_pressure_plate": R({ "minecraft:polished_blackstone": 2 }, 1, false),
  "minecraft:light_weighted_pressure_plate": R({ "minecraft:gold_ingot": 2 }, 1, false),
  "minecraft:heavy_weighted_pressure_plate": R({ "minecraft:iron_ingot": 2 }, 1, false),
  "minecraft:tripwire_hook": R({ "minecraft:iron_ingot": 1, "minecraft:stick": 1, "#assi": 1 }, 2),
  "minecraft:repeater": R({ "minecraft:redstone_torch": 2, "minecraft:redstone": 1, "minecraft:stone": 3 }),
  "minecraft:comparator": R({ "minecraft:redstone_torch": 3, "minecraft:quartz": 1, "minecraft:stone": 3 }),
  "minecraft:observer": R({ "minecraft:cobblestone": 6, "minecraft:redstone": 2, "minecraft:quartz": 1 }),
  "minecraft:piston": R({ "#assi": 3, "minecraft:cobblestone": 4, "minecraft:iron_ingot": 1, "minecraft:redstone": 1 }),
  "minecraft:sticky_piston": R({ "minecraft:piston": 1, "minecraft:slime_ball": 1 }, 1, false),
  "minecraft:dispenser": R({ "minecraft:cobblestone": 7, "minecraft:bow": 1, "minecraft:redstone": 1 }),
  "minecraft:dropper": R({ "minecraft:cobblestone": 7, "minecraft:redstone": 1 }),
  "minecraft:hopper": R({ "minecraft:iron_ingot": 5, "minecraft:chest": 1 }),
  "minecraft:daylight_detector": R({ "minecraft:glass": 3, "minecraft:quartz": 3, "#lastra_legno": 3 }),
  "minecraft:redstone_lamp": R({ "minecraft:redstone": 4, "minecraft:glowstone": 1 }),
  "minecraft:trapped_chest": R({ "minecraft:chest": 1, "minecraft:tripwire_hook": 1 }, 1, false),
  "minecraft:crafter": R({ "minecraft:iron_ingot": 5, "minecraft:crafting_table": 1, "minecraft:redstone": 2, "minecraft:dropper": 1 }),
  "minecraft:calibrated_sculk_sensor": R({ "minecraft:amethyst_shard": 3, "minecraft:sculk_sensor": 1 }),
  "minecraft:rail": R({ "minecraft:iron_ingot": 6, "minecraft:stick": 1 }, 16),
  "minecraft:golden_rail": R({ "minecraft:gold_ingot": 6, "minecraft:stick": 1, "minecraft:redstone": 1 }, 6),
  "minecraft:detector_rail": R({ "minecraft:iron_ingot": 6, "minecraft:stone_pressure_plate": 1, "minecraft:redstone": 1 }, 6),
  "minecraft:activator_rail": R({ "minecraft:iron_ingot": 6, "minecraft:stick": 2, "minecraft:redstone_torch": 1 }, 6),
  "minecraft:minecart": R({ "minecraft:iron_ingot": 5 }),
  "minecraft:chest_minecart": R({ "minecraft:minecart": 1, "minecraft:chest": 1 }, 1, false),
  "minecraft:furnace_minecart": R({ "minecraft:minecart": 1, "minecraft:furnace": 1 }, 1, false),
  "minecraft:hopper_minecart": R({ "minecraft:minecart": 1, "minecraft:hopper": 1 }, 1, false),
  "minecraft:tnt_minecart": R({ "minecraft:minecart": 1, "minecraft:tnt": 1 }, 1, false),

  // carta, libri, varie
  "minecraft:sugar": R({ "minecraft:sugar_cane": 1 }, 1, false, [{ ing: { "minecraft:honey_bottle": 1 }, out: 3 }]),
  "minecraft:paper": R({ "minecraft:sugar_cane": 3 }, 3),
  "minecraft:book": R({ "minecraft:paper": 3, "minecraft:leather": 1 }, 1, false),
  "minecraft:writable_book": R({ "minecraft:book": 1, "minecraft:ink_sac": 1, "minecraft:feather": 1 }, 1, false),
  "minecraft:leather": R({ "minecraft:rabbit_hide": 4 }, 1, false),
  "minecraft:glass_bottle": R({ "minecraft:glass": 3 }, 3),
  "minecraft:fermented_spider_eye": R({ "minecraft:spider_eye": 1, "minecraft:brown_mushroom": 1, "minecraft:sugar": 1 }, 1, false),
  "minecraft:magma_cream": R({ "minecraft:slime_ball": 1, "minecraft:blaze_powder": 1 }, 1, false),
  "minecraft:glistering_melon_slice": R({ "minecraft:melon_slice": 1, "minecraft:gold_nugget": 8 }),
  "minecraft:melon_block": R({ "minecraft:melon_slice": 9 }),
  "minecraft:melon_seeds": R({ "minecraft:melon_slice": 1 }, 1, false),
  "minecraft:pumpkin_seeds": R({ "minecraft:pumpkin": 1 }, 4, false),
  "minecraft:moss_carpet": R({ "minecraft:moss_block": 2 }, 3, false),
  "minecraft:pale_moss_carpet": R({ "minecraft:pale_moss_block": 2 }, 3, false),
  "minecraft:bamboo_block": R({ "minecraft:bamboo": 9 }),
  "minecraft:bamboo_planks": R({ "minecraft:bamboo_block": 1 }, 2, false),
  "minecraft:bamboo_mosaic": R({ "minecraft:bamboo_slab": 2 }, 1, false),
  "minecraft:string": R({ "minecraft:web": 1 }, 9, false),
  "minecraft:dripstone_block": R({ "minecraft:pointed_dripstone": 4 }, 1, false),
  "minecraft:amethyst_block": R({ "minecraft:amethyst_shard": 4 }, 1, false),
  "minecraft:tinted_glass": R({ "minecraft:amethyst_shard": 4, "minecraft:glass": 1 }),
  "minecraft:resin_block": R({ "minecraft:resin_clump": 9 }),
  "minecraft:resin_bricks": R({ "minecraft:resin_brick": 4 }, 1, false),
  "minecraft:harness": R({ "minecraft:leather": 3, "minecraft:glass": 2, "#lana": 1 }),
  "minecraft:hay_bed": R({ "minecraft:hay_block": 3, "#assi": 3 }),

  // cibo composto
  "minecraft:cookie": R({ "minecraft:wheat": 2, "minecraft:cocoa_beans": 1 }, 8),
  "minecraft:cake": R({ "minecraft:milk_bucket": 3, "minecraft:sugar": 2, "minecraft:egg": 1, "minecraft:wheat": 3 }),
  "minecraft:pumpkin_pie": R({ "minecraft:pumpkin": 1, "minecraft:sugar": 1, "minecraft:egg": 1 }, 1, false),
  "minecraft:mushroom_stew": R({ "minecraft:bowl": 1, "minecraft:brown_mushroom": 1, "minecraft:red_mushroom": 1 }, 1, false),
  "minecraft:beetroot_soup": R({ "minecraft:bowl": 1, "minecraft:beetroot": 6 }),
  "minecraft:rabbit_stew": R({ "minecraft:bowl": 1, "minecraft:cooked_rabbit": 1, "minecraft:carrot": 1, "minecraft:baked_potato": 1, "minecraft:brown_mushroom": 1 }),
  "minecraft:golden_carrot": R({ "minecraft:carrot": 1, "minecraft:gold_nugget": 8 }),
  "minecraft:golden_apple": R({ "minecraft:apple": 1, "minecraft:gold_ingot": 8 }),
  "minecraft:honey_bottle": R({ "minecraft:honey_block": 1, "minecraft:glass_bottle": 4 }, 4),
  "minecraft:dried_kelp": R({ "minecraft:dried_kelp_block": 1 }, 9, false),

  // famiglie generate (legni, pietre, colori, blocchi di minerale)
  ...Object.assign({}, ...LEGNI.map(famigliaLegno)),
  ...famigliePietra(),
  ...famiglieColori(),
  ...blocchiMinerale(),
};
// i lingotti dalle pepite / dal blocco non devono nascondere la fusione: fondi resta la via normale per i grezzi
// le più utili, elencate per nome a Claude (il resto è descritto per famiglie: il prompt resta corto e costa poco)
export const ESSENZIALI = ["stick", "crafting_table", "chest", "furnace", "smoker", "blast_furnace", "torch", "lantern", "ladder", "bed", "shield", "bow", "arrow",
  "crossbow", "bucket", "shears", "flint_and_steel", "fishing_rod", "bread", "cake", "cookie", "pumpkin_pie", "golden_carrot", "golden_apple", "mushroom_stew",
  "bowl", "paper", "book", "bookshelf", "enchanting_table", "anvil", "smithing_table", "barrel", "composter", "hopper", "rail", "minecart", "compass", "clock",
  "empty_map", "lead", "saddle", "name_tag", "iron_bars", "iron_door", "glass_pane", "stone_bricks", "campfire", "scaffolding", "tnt", "spyglass", "lightning_rod"];

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
  "minecraft:red_sand": "minecraft:glass",
  "minecraft:stone": "minecraft:smooth_stone",
  "minecraft:sandstone": "minecraft:smooth_sandstone",
  "minecraft:red_sandstone": "minecraft:smooth_red_sandstone",
  "minecraft:quartz_block": "minecraft:smooth_quartz",
  "minecraft:cobbled_deepslate": "minecraft:deepslate",
  "minecraft:stone_bricks": "minecraft:cracked_stone_bricks",
  "minecraft:deepslate_bricks": "minecraft:cracked_deepslate_bricks",
  "minecraft:deepslate_tiles": "minecraft:cracked_deepslate_tiles",
  "minecraft:nether_bricks": "minecraft:cracked_nether_bricks",
  "minecraft:polished_blackstone_bricks": "minecraft:cracked_polished_blackstone_bricks",
  "minecraft:clay": "minecraft:hardened_clay",
  "minecraft:netherrack": "minecraft:netherbrick",
  "minecraft:basalt": "minecraft:smooth_basalt",
  "minecraft:cactus": "minecraft:green_dye",
  "minecraft:sea_pickle": "minecraft:lime_dye",
  "minecraft:kelp": "minecraft:dried_kelp",
  "minecraft:wet_sponge": "minecraft:sponge",
  "minecraft:chorus_fruit": "minecraft:popped_chorus_fruit",
  "minecraft:ancient_debris": "minecraft:netherite_scrap",
  "minecraft:resin_clump": "minecraft:resin_brick",
  "minecraft:iron_ore": "minecraft:iron_ingot",
  "minecraft:deepslate_iron_ore": "minecraft:iron_ingot",
  "minecraft:gold_ore": "minecraft:gold_ingot",
  "minecraft:deepslate_gold_ore": "minecraft:gold_ingot",
  "minecraft:nether_gold_ore": "minecraft:gold_ingot",
  "minecraft:copper_ore": "minecraft:copper_ingot",
  "minecraft:deepslate_copper_ore": "minecraft:copper_ingot",
  "minecraft:coal_ore": "minecraft:coal",
  "minecraft:diamond_ore": "minecraft:diamond",
  "minecraft:lapis_ore": "minecraft:lapis_lazuli",
  "minecraft:redstone_ore": "minecraft:redstone",
  "minecraft:emerald_ore": "minecraft:emerald",
  "minecraft:quartz_ore": "minecraft:quartz",
  "minecraft:chorus_flower": "minecraft:popped_chorus_fruit",
  // attrezzi e armature di ferro/oro in pepite
  ...Object.fromEntries(["sword", "pickaxe", "axe", "shovel", "hoe", "helmet", "chestplate", "leggings", "boots"].flatMap((p) =>
    [[`minecraft:iron_${p}`, "minecraft:iron_nugget"], [`minecraft:golden_${p}`, "minecraft:gold_nugget"]])),
};

// pezzi fusi per ogni unità di combustibile
export const COMBUSTIBILI = [["#carbone", 8], ["minecraft:dried_kelp_block", 20], ["#tronco", 1], ["#assi", 1], ["minecraft:stick", 0.5]];

// punti fame ripristinati (usati dal ripiego quando il cibo non si consuma da solo)
export const CIBO = {
  "minecraft:cooked_beef": 8, "minecraft:cooked_porkchop": 8, "minecraft:cooked_mutton": 6,
  "minecraft:cooked_chicken": 6, "minecraft:cooked_salmon": 6, "minecraft:cooked_cod": 5,
  "minecraft:cooked_rabbit": 5, "minecraft:baked_potato": 5, "minecraft:bread": 5,
  "minecraft:golden_carrot": 6, "minecraft:apple": 4, "minecraft:carrot": 3,
  "minecraft:beef": 3, "minecraft:porkchop": 3, "minecraft:mutton": 2, "minecraft:potato": 1,
  "minecraft:sweet_berries": 2, "minecraft:melon_slice": 2, "minecraft:cookie": 2,
  "minecraft:pumpkin_pie": 8, "minecraft:mushroom_stew": 6, "minecraft:beetroot_soup": 6,
  "minecraft:rabbit_stew": 10, "minecraft:golden_apple": 4, "minecraft:dried_kelp": 1,
  "minecraft:beetroot": 1, "minecraft:glow_berries": 2, "minecraft:honey_bottle": 6, "minecraft:cod": 2, "minecraft:salmon": 2,
  "minecraft:rabbit": 3,
};

export function assiDaTronco(tronco) {
  const legno = tronco.replace("minecraft:", "").replace("stripped_", "").replace(/_(log|wood|stem|hyphae)$/, "");
  return `minecraft:${legno}_planks`;
}
