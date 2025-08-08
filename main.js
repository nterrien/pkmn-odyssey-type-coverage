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

// Fill the type lists
typeListDiv = document.querySelector(".type-select")
typeListDiv.innerHTML = Object.keys(typeTable).map(t => '<span class="type-button" data-typeid="' + t + '"><span class="type-icon type-' + t.toLowerCase() + '">' + t + '</span></span>').reduce((x, y) => x + y, "")

// Info about error or loading
infos = document.querySelector(".infos")
function resetInfos() { infos.innerHTML = "&nbsp; " }

onDelegatedEvent(document.querySelector(".type-select"), ".type-button", "click",
    (function (e, t) { resetInfos(), t.classList.toggle("selected") }))

function formatName(pkmn) {
    return '<div class="pkmn-name tooltip">' + pkmn.name + '<span class="tooltiptext">' + pkmn.types.reduce((x, y) => x + "/" + y) + '</span></div>'
}

// Click on Calculate button
onEvent(document.getElementById("calc-coverage"), "click", (function () {
    infos.textContent = "Calculating..."
    setTimeout((function () {
        let t = document.getElementsByClassName("selected", document.querySelector(".type-select"))
        nbRes = { immune: document.getElementById("total-immune"), resist: document.getElementById("total-resisted"), normal: document.getElementById("total-normal"), weak: document.getElementById("total-weak") };
        pkmnRes = { immune: document.getElementById("pkmn-immune"), resist: document.getElementById("pkmn-resisted"), normal: document.getElementById("pkmn-normal"), weak: document.getElementById("pkmn-weak") };
        res = { immune: [], resist: [], normal: [], weak: [] };
        if (t.length == 0) {
            infos.textContent = "You must select at least 1 type!"
        } else {
            attTypes = Array.from(t).map(e => e.getAttribute("data-typeid"))
            for (let pkmn of pokemons) {
                finalEff = Math.max(...attTypes.map(att => pkmn.types.map(def => effectiveness(att, def)).reduce((x, y) => x * y, 1)))
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
            resetInfos()
        }
        for (let p of ["immune", "resist", "normal", "weak"]) {
            nbRes[p].textContent = res[p].length
            if (res[p].length == 0) {
                pkmnRes[p].innerHTML = "None."
            } else {
                pkmnRes[p].innerHTML = res[p].map(pkmn => formatName(pkmn)).reduce((x, y) => x + " " + y, "")
            }
        }
    }), 10)
}))



