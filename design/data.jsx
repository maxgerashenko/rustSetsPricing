// Mock pricing catalog for the prototype.
// Names are generic Rust-style descriptive names; not pulled from the screenshot 1:1.
const CATALOG = [
  { key: "franken-facemask",   name: "Franken Facemask",   slot: "Head",     price: 2.96, trend: +0.04 },
  { key: "franken-chestplate", name: "Franken Chestplate", slot: "Chest",    price: 4.10, trend: -0.12 },
  { key: "flashbacks-hoodie",  name: "Flashbacks Hoodie",  slot: "Torso",    price: 3.03, trend: +0.21 },
  { key: "fish-roadsign-pants",name: "Fish Roadsign Pants",slot: "Legs",     price: 3.76, trend: +0.02 },
  { key: "flashbacks-pants",   name: "Flashbacks Pants",   slot: "Legs",     price: 8.48, trend: +0.55 },
  { key: "bombshell-boots",    name: "Bombshell Boots",    slot: "Feet",     price: 3.33, trend: -0.08 },
  { key: "scrap-helm",         name: "Scrap Helm",         slot: "Head",     price: 1.42, trend: +0.03 },
  { key: "tempered-mask",      name: "Tempered Mask",      slot: "Head",     price: 5.10, trend: +0.18 },
  { key: "blackout-vest",      name: "Blackout Vest",      slot: "Chest",    price: 6.22, trend: -0.31 },
  { key: "ironclad-plate",     name: "Ironclad Plate",     slot: "Chest",    price: 9.74, trend: +1.04 },
  { key: "wasteland-jacket",   name: "Wasteland Jacket",   slot: "Torso",    price: 2.18, trend: -0.05 },
  { key: "rusted-tee",         name: "Rusted Tee",         slot: "Torso",    price: 0.84, trend: +0.01 },
  { key: "drifter-pants",      name: "Drifter Pants",      slot: "Legs",     price: 2.55, trend: +0.07 },
  { key: "chainmail-greaves",  name: "Chainmail Greaves",  slot: "Legs",     price: 4.61, trend: -0.14 },
  { key: "wanderer-boots",     name: "Wanderer Boots",     slot: "Feet",     price: 1.99, trend: +0.03 },
  { key: "kraken-hatchet",     name: "Kraken Hatchet",     slot: "Tool",     price: 12.40,trend: +0.62 },
  { key: "rusted-pickaxe",     name: "Rusted Pickaxe",     slot: "Tool",     price: 0.55, trend: 0.00 },
  { key: "static-rifle",       name: "Static Rifle",       slot: "Weapon",   price: 22.10,trend: +1.85 },
  { key: "ember-shotgun",      name: "Ember Shotgun",      slot: "Weapon",   price: 7.30, trend: -0.22 },
  { key: "moonbeam-bow",       name: "Moonbeam Bow",       slot: "Weapon",   price: 3.18, trend: +0.09 },
];

const CATALOG_INDEX = (() => {
  const m = new Map();
  for (const it of CATALOG) {
    m.set(it.name.toLowerCase(), it);
    m.set(it.key, it);
    // also short forms
    m.set(it.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), it);
    m.set(it.name.toLowerCase().replace(/[^a-z0-9]+/g, ""), it);
  }
  return m;
})();

function lookup(name) {
  const n = (name || "").toLowerCase().trim();
  if (!n) return null;
  if (CATALOG_INDEX.has(n)) return CATALOG_INDEX.get(n);
  const compact = n.replace(/[^a-z0-9]+/g, "");
  if (CATALOG_INDEX.has(compact)) return CATALOG_INDEX.get(compact);
  // fuzzy: contains substring
  for (const it of CATALOG) {
    const itn = it.name.toLowerCase();
    if (itn.includes(n) || n.includes(itn)) return it;
  }
  return null;
}

function parseList(raw) {
  if (!raw) return [];
  // split on newlines OR commas
  const tokens = raw
    .split(/[\n,]+/g)
    .map(s => s.trim())
    .filter(Boolean);
  return tokens.map((t, i) => {
    const hit = lookup(t);
    return {
      id: `item-${Date.now()}-${i}-${Math.random().toString(36).slice(2,7)}`,
      raw: t,
      resolved: hit || null,
    };
  });
}

function fmtPrice(n, currency) {
  if (n == null || isNaN(n)) return "—";
  const sym = currency === "EUR" ? "€" : "$";
  const v = currency === "EUR" ? n * 0.92 : n;
  return `${sym}${v.toFixed(2)}`;
}

function initials(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

window.Junkpile = { CATALOG, lookup, parseList, fmtPrice, initials };
