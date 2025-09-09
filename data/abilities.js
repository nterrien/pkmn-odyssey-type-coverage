abilities = {
    "Dry Skin": { "Fire": 1.25, "Water": 0 },
    "Earth Eater": { "Ground": 0 },
    "Flash Fire": { "Fire": 0 },
    "Fluffy": { "Fire": 2 },
    "Heatproof": { "Fire": 0.5 },
    "Levitate": { "Ground": 0 },
    "Lightning Rod": { "Electric": 0 },
    "Lightningrod": { "Electric": 0 },
    "Motor Drive": { "Electric": 0 },
    "Purifying Salt": { "Ghost": 0.5 },
    "Sap Sipper": { "Grass": 0 },
    "Storm Drain": { "Water": 0 },
    "Thick Fat": { "Fire": 0.5, "Ice": 0.5 },
    "Volt Absorb": { "Electric": 0 },
    "Water Absorb": { "Water": 0 },
    "Water Bubble": { "Fire": 0.5 },
    "Well-Baked Body": { "Fire": 0 },
    "Solid Rock": { "special": reduceIfEffective },
    "Filter": { "special": reduceIfEffective },
    "Prism Armor": { "special": reduceIfEffective },
    "Wonder Guard": { "special": wonderGuard },
}

function reduceIfEffective(mult) {
    return mult < 2 ? mult : 3 / 4 * mult
}

function wonderGuard(mult) {
    return mult < 2 ? 0 : mult
}

