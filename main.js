function onEvent(e, t, n, o) {
    if (!e) return;
    let l = t.split(" ");
    o = o || {};
    for (let t in l) e.addEventListener(l[t], n, o)
}
function onDelegatedEvent(e, t, n, o, l) {
    if (!e) return;
    let i = n.split(" ");
    l = l || {};
    let s = function (e) {
        let n = e.target.closest(t);
        n && o(e, n)
    };
    for (let t in i) e.addEventListener(i[t], s, l)
}

// Preprocesses abilities
// One entry per pokemon and ability (if the ability changes damage of a type)
pkmnsWithAbilities = []
pokemons.forEach(pkmn => {
    if (pkmn.abilities.filter(a => !Object.keys(abilities).includes(a)).length > 0) {
        p = { ...pkmn }
        abilityDontChangeEff = pkmn.abilities.filter(a => !Object.keys(abilities).includes(a))
        p.abilities = abilityDontChangeEff.reduce((x, y) => x + "/" + y)
        p["count"] = abilityDontChangeEff.length / pkmn.abilities.length
        p["typeMultiplier"] = {}
        pkmnsWithAbilities.push(p)
    }
    for (ability of pkmn.abilities.filter(a => Object.keys(abilities).includes(a))) {
        p = { ...pkmn }
        p.abilities = ability
        p["count"] = pkmn.abilities.filter(a => a == ability).length / pkmn.abilities.length
        p["typeMultiplier"] = abilities[ability]
        pkmnsWithAbilities.push(p)
    }
})

// Fill the type lists
typeListDiv = document.querySelector(".type-select")
typeListDiv.innerHTML = Object.keys(typeTable).map(t => '<span class="type-button" data-typeid="' + t + '">' + typeIcon(t) + '</span>').reduce((x, y) => x + y, "")

for (let i = 1; i <= 2; i++) {
    forceType = document.getElementById("force-type-" + i)
    forceType.innerHTML = '<option value="None" selected></option>' + Object.keys(typeTable).map(t => '<option value="' + t + '">' + t + '</option>').reduce((x, y) => x + y, "")
}

function typeIcon(t) {
    return '<span class="type-icon type-' + t.toLowerCase() + '">' + t + '</span>'
}

// Info about error or loading
infos = document.querySelector(".infos")
function resetInfos() { infos.innerHTML = "&nbsp; " }

onDelegatedEvent(document.querySelector(".type-select"), ".type-button", "click",
    (function (e, t) { resetInfos(), t.classList.toggle("selected") }))

function formatName(pkmn) {
    ability = pkmn.count && pkmn.count != 1 ? " (" + pkmn.abilities + ")" : ""
    return '<div class="pkmn-name tooltip"><img width="48" height="48" alt="' + pkmn.name + ' sprite" title="' + pkmn.name + '" loading="lazy" src="./sprites/' + pkmn.name + '.png"><br>' + pkmn.name + ability + '<span class="tooltiptext">' + pkmn.types.reduce((x, y) => x + "/" + y) + '</span></div>'
}

// Click on Calculate button
onEvent(document.getElementById("calc-coverage"), "click", (function () {
    infos.textContent = "Calculating..."
    const t = document.getElementsByClassName("selected", document.querySelector(".type-select"))
    const types = Array.from(t).map(e => e.getAttribute("data-typeid"))
    nbRes = { immune: document.getElementById("total-immune"), resist: document.getElementById("total-resisted"), normal: document.getElementById("total-normal"), weak: document.getElementById("total-weak") };
    pkmnRes = { immune: document.getElementById("pkmn-immune"), resist: document.getElementById("pkmn-resisted"), normal: document.getElementById("pkmn-normal"), weak: document.getElementById("pkmn-weak") };
    const allowAbility = !document.querySelector("#ability").checked
    const finalEvo = document.querySelector("#final-evo").checked
    const specialRules = { "scrappy": document.querySelector("#scrappy").checked, "tintedlens": document.querySelector("#tintedlens").checked }
    const pokemonsFiltered = pokemons.filter(p => p.final || !finalEvo)
    const pkmnsWithAbilitiesFilterd = pkmnsWithAbilities.filter(p => p.final || !finalEvo)
    let res = { immune: [], resist: [], normal: [], weak: [] }
    let averageEff = 0
    chooseSubSetOptimized(types, allowAbility, pokemonsFiltered, pkmnsWithAbilitiesFilterd, specialRules)
    setTimeout((function () {
        if (types.length == 0) {
            infos.textContent = "You must select at least 1 type!"
        } else {
            averageEff = calculateDamages(res, types, allowAbility, pokemonsFiltered, pkmnsWithAbilitiesFilterd, specialRules)
            resetInfos()
        }
        for (let r of Object.keys(res)) {
            nb = res[r].map(p => p.count ?? 1).reduce((x, y) => x + y, 0)
            nbRes[r].innerHTML = '<div class="tooltip">' + roundDecimal(nb, 2) + '<span class="tooltiptext">' + roundDecimal(100 * nb / pokemonsFiltered.length, 1) + '%</span></div>'
            if (res[r].length == 0) {
                pkmnRes[r].innerHTML = "None."
            } else {
                // Regroup pokémon by name (to avoid having two pokémon in the same category with different abilities
                // (for exemple Hariyama (Guts) and Hariyama (Thick Fat) when the type is Psychic)
                pkmnByName = new Map()
                res[r].forEach(p => {
                    if (pkmnByName.has(p.name)) {
                        pkmnByName.get(p.name).count += p.count
                        pkmnByName.get(p.name).abilities += "/" + p.abilities
                    } else {
                        pkmnByName.set(p.name, { ...p })
                    }
                })
                pkmnRes[r].innerHTML = pkmnByName.values().map(p => formatName(p)).reduce((x, y) => x + " " + y, "")
            }
        }
        document.getElementById("average").innerHTML = "x" + roundDecimal(averageEff, 2)
    }), 10)
}))

function damageMultiplierOnePokemon(pkmn, att, specialRules) {
    let ability = 1
    if (pkmn["typeMultiplier"] && pkmn["typeMultiplier"][att] != undefined) {
        ability = pkmn["typeMultiplier"][att]
    }
    typeEffectivness = pkmn.types.map(def => effectiveness(att, def, specialRules)).reduce((x, y) => x * y, 1)
    if (specialRules["tintedlens"] && typeEffectivness < 1) {
        typeEffectivness *= 2
    }
    damage = ability * typeEffectivness
    if (pkmn["typeMultiplier"] && pkmn["typeMultiplier"]["special"]) {
        damage = pkmn["typeMultiplier"]["special"](damage)
    }
    return damage
}

function calculateDamages(res, types, allowAbility, pkmns, pkmnsWithAbilities, specialRules) {
    averageEff = 0;
    for (let pkmn of allowAbility ? pkmnsWithAbilities : pkmns) {
        finalEff = Math.max(...types.map(att => damageMultiplierOnePokemon(pkmn, att, specialRules)))
        averageEff += (pkmn.count ?? 1) * finalEff / pkmns.length
        if (res) {
            if (finalEff == 0) {
                res.immune.push(pkmn)
            } else if (finalEff == 1) {
                res.normal.push(pkmn)
            } else if (finalEff > 1) {
                res.weak.push(pkmn)
            } else {
                res.resist.push(pkmn)
            }
        }
    }
    return averageEff
}

function chooseSubSetOptimized(types, allowAbility, pkmns, pkmnsWithAbilities, specialRules) {
    let nbCombo = document.getElementById("nbcombo").value
    if (nbCombo <= 0) {
        document.getElementById("nbcombo").value = null
        nbCombo = null
    }
    if (nbCombo > types.length) {
        document.getElementById("nbcombo").value = types.length
        nbCombo = types.length
    }
    let criteria = document.getElementById("criteria").value
    let forcedTypes = []
    for (let i = 1; i <= 2; i++) {
        const forcedType = document.getElementById("force-type-" + i).value
        if (forcedType != 'None') {
            if (forcedTypes.includes(forcedType) || !types.includes(forcedType) || forcedTypes.length + 1 > nbCombo) {
                document.getElementById("force-type-" + i).value = 'None'
            } else {
                forcedTypes.push(document.getElementById("force-type-" + i).value)
            }
        }
    }
    nbCombo -= forcedTypes.length
    const typeCombiLength = binomialCoeff(nbCombo, types.length)
    estimatedTime = 0.00000045 * typeCombiLength * nbCombo * pkmnsWithAbilities.length
    if (estimatedTime > 0.9) {
        infos.textContent = "Calculating " + typeCombiLength + " combos... It can take up to " + roundDecimal(estimatedTime, 1) + " seconds"
    }
    document.getElementById("comboResult").innerHTML = null
    document.getElementById("comboResult").classList.add("hide")
    setTimeout((function () {
        if (nbCombo || forcedTypes.length > 0) {
            const typesWithoutForced = types.filter(t => !forcedTypes.includes(t))
            const typesCombinaisons = findCombinaisons(typesWithoutForced, nbCombo)
            forcedTypes.reverse().forEach(t => typesCombinaisons.forEach(tc => tc.unshift(t)))
            let typesComboValues = []
            for (let typesCombo of typesCombinaisons) {
                let res = { immune: [], resist: [], normal: [], weak: [] }
                const avg = calculateDamages(res, typesCombo, allowAbility, pkmns, pkmnsWithAbilities, specialRules)
                typesComboValues.push({
                    types: typesCombo,
                    avg: avg,
                    weak: res.weak.map(r => r.count ?? 1).reduce((x, y) => x + y, 0),
                    resist: res.immune.concat(res.resist).map(r => r.count ?? 1).reduce((x, y) => x + y, 0)
                })
            }
            switch (criteria) {
                case "average":
                    // Sort primary: avg, secondary: less res, tertiary: most super
                    typesComboValues.sort((x, y) => y.avg == x.avg ? (y.resist == x.resist ? y.weak - x.weak : x.resist - y.resist) : y.avg - x.avg)
                    result = typesComboValues.map(x => { return { types: x.types, value: "x" + x.avg.toFixed(3) } })
                    break;
                case "most-super":
                    // Sort primary: most super, secondary: avg, tertiary: less res
                    typesComboValues.sort((x, y) => y.weak == x.weak ? (y.avg == x.avg ? x.resist - y.resist : y.avg - x.avg) : y.weak - x.weak)
                    result = typesComboValues.map(x => { return { types: x.types, value: roundDecimal(x.weak, 2) } })
                    break;
                case "less-res":
                    // Sort primary: less res, secondary: avg, tertiary: most super
                    typesComboValues.sort((x, y) => y.resist == x.resist ? (y.avg == x.avg ? y.weak - x.weak : y.avg - x.avg) : x.resist - y.resist)
                    result = typesComboValues.map(x => { return { types: x.types, value: roundDecimal(x.resist, 2) } })
                    break;
            }
            console.log("Full list of types combo: ", typesComboValues)
            listRes = result.map(x => "<div>" + x.types.map(t => typeIcon(t)).join(" ") + ": " + x.value + "</div>").slice(0, 10)
            document.getElementById("comboResult").innerHTML = listRes.join("")
            document.getElementById("comboResult").classList.remove("hide")
        }
    }))
}

function binomialCoeff(k, n) {
    return fact(n) / (fact(k) * fact(n - k))
}
function fact(n) {
    if (n <= 1) {
        return 1;
    }
    return n * fact(n - 1);
}
function roundDecimal(nb, decimal) {
    return Math.round((10 ** decimal) * nb) / (10 ** decimal)
}

// From https://stackoverflow.com/a/42774126
function findCombinaisons(array, nb) {
    function fork(i, t) {
        if (i === array.length) {
            result.push(t);
            return;
        }
        fork(i + 1, t.concat([array[i]]));
        fork(i + 1, t);
    }
    if (nb >= array.length) {
        return [array]
    }
    var result = [];
    fork(0, []);
    return result.filter(r => r.length == nb);
}
