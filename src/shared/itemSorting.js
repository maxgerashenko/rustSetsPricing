// Item display priority and keyword matching for consistent ordering across views
// Keywords are matched case-insensitively against item names
const ITEM_PRIORITY = [
  {
    priority: 1,
    name: 'Masks',
    keywords: ['facemask', 'mask', 'balaclava', 'hockey mask']
  },
  {
    priority: 2,
    name: 'Chest Armor',
    keywords: ['chest plate', 'chestplate', 'chest armor', 'kevlar chest']
  },
  {
    priority: 3,
    name: 'Jackets',
    keywords: ['jacket', 'coat']
  },
  {
    priority: 4,
    name: 'Hoodies',
    keywords: ['hoodie', 'hooded', 'sweatshirt']
  },
  {
    priority: 5,
    name: 'Pants',
    keywords: ['pants', 'trousers', 'roadsign pants', 'kilt', 'legs']
  },
  {
    priority: 6,
    name: 'Boots',
    keywords: ['boots', 'shoes', 'footwear']
  },
  {
    priority: 7,
    name: 'Gloves',
    keywords: ['gloves', 'glove', 'hands', 'mittens']
  }
]

const getPriority = (itemName) => {
  const lowerName = itemName.toLowerCase()

  for (const slot of ITEM_PRIORITY) {
    for (const keyword of slot.keywords) {
      if (lowerName.includes(keyword)) {
        return slot.priority
      }
    }
  }

  return Infinity // unmatched items go to end
}

export const sortItems = (items) => {
  return [...items].sort((a, b) => {
    const priorityA = getPriority(a.name)
    const priorityB = getPriority(b.name)

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    return a.name.localeCompare(b.name)
  })
}

export const updateItemPriority = (newPriority) => {
  ITEM_PRIORITY.length = 0
  ITEM_PRIORITY.push(...newPriority)
}
