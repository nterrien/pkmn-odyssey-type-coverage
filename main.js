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
    setTimeout((function () {
        const t = document.getElementsByClassName("selected", document.querySelector(".type-select"))
        const types = Array.from(t).map(e => e.getAttribute("data-typeid"))
        nbRes = { immune: document.getElementById("total-immune"), resist: document.getElementById("total-resisted"), normal: document.getElementById("total-normal"), weak: document.getElementById("total-weak") };
        pkmnRes = { immune: document.getElementById("pkmn-immune"), resist: document.getElementById("pkmn-resisted"), normal: document.getElementById("pkmn-normal"), weak: document.getElementById("pkmn-weak") };
        const allowAbility = !document.querySelector("#ability").checked
        const finalEvo = document.querySelector("#final-evo").checked
        const pokemonsFiltered = pokemons.filter(p => p.final || !finalEvo)
        const pkmnsWithAbilitiesFilterd = pkmnsWithAbilities.filter(p => p.final || !finalEvo)
        let res = { immune: [], resist: [], normal: [], weak: [] }
        let averageEff = 0
        chooseSubSetOptimized(types, allowAbility, pokemonsFiltered, pkmnsWithAbilitiesFilterd)
        if (types.length == 0) {
            infos.textContent = "You must select at least 1 type!"
        } else {
            averageEff = calculateDamages(res, types, allowAbility, pokemonsFiltered, pkmnsWithAbilitiesFilterd)
            resetInfos()
        }
        for (let r of Object.keys(res)) {
            nb = res[r].map(p => p.count ?? 1).reduce((x, y) => x + y, 0)
            nbRes[r].innerHTML = '<div class="tooltip">' + nb + '<span class="tooltiptext">' + Math.round(1000 * nb / pokemonsFiltered.length) / 10 + '%</span></div>'
            if (res[r].length == 0) {
                pkmnRes[r].innerHTML = "None."
            } else {
                pkmnRes[r].innerHTML = res[r].map(p => formatName(p)).reduce((x, y) => x + " " + y, "")
            }
        }
        document.getElementById("average").innerHTML = "x" + Math.round(100 * averageEff) / 100
    }), 10)
}))

function calculateDamages(res, types, allowAbility, pkmns, pkmnsWithAbilities) {
    averageEff = 0;
    for (let pkmn of allowAbility ? pkmnsWithAbilities : pkmns) {
        finalEff = Math.max(...types.map(att =>
            (pkmn["typeMultiplier"] && pkmn["typeMultiplier"][att] != undefined ? pkmn["typeMultiplier"][att] : 1) * pkmn.types.map(def => effectiveness(att, def)).reduce((x, y) => x * y, 1))
        )
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

function chooseSubSetOptimized(types, allowAbility, pkmns, pkmnsWithAbilities) {
    let nbCombo = document.getElementById("nbcombo").value
    if (nbCombo <= 0) {
        document.getElementById("nbcombo").value = null
        nbCombo = null
    }
    if (nbCombo > types.length) {
        document.getElementById("nbcombo").value = types.length
        nbCombo = types.length
    }
    if (nbCombo) {
        typesCombinaisons = findCombinaisons(types, nbCombo)
        const result = []
        for (let typesCombo of typesCombinaisons) {
            result.push({ types: typesCombo, avg: calculateDamages(null, typesCombo, allowAbility, pkmns, pkmnsWithAbilities) })
        }
        result.sort((x, y) => y.avg - x.avg)
        listRes = result.map(x => x.types.map(t => typeIcon(t)).join(" ") + ": x" + x.avg.toFixed(3)).slice(0, 10)
        document.getElementById("comboResult").innerHTML = listRes.join("<br>")
        document.getElementById("comboResult").classList.remove("hide")
    } else {
        document.getElementById("comboResult").innerHTML = null
        document.getElementById("comboResult").classList.add("hide")
    }
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