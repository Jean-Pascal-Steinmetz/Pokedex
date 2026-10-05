let limit = 15;
let maxSeiten = 91;
let page = 0;
let totalPokemon = 0;
let suchErgebnisse = null;

let list = document.getElementById("liste");
let backButton = document.getElementById("zurueck");
let nextButton = document.getElementById("weiter");
let pageText = document.getElementById("seitenanzeige");
let suchForm = document.getElementById("suchForm");
let suchFeld = document.getElementById("suchFeld");
let sucheLoeschen = document.getElementById("sucheLoeschen");

let detail = document.getElementById("detail");
let detailKopf = document.getElementById("detailKopf");
let aboutInfo = document.getElementById("aboutInfo");
let statsInfo = document.getElementById("statsInfo");
let aboutButton = document.getElementById("aboutButton");
let statsButton = document.getElementById("statsButton");
let vorherButton = document.getElementById("vorher");
let nachherButton = document.getElementById("nachher");
let aktuelleId = 0;


async function loadPokemon() {
  if (suchErgebnisse !== null) {
    await ladeSuchErgebnisse();
    return;
  }

  let offset = page * limit;
  let url = "https://pokeapi.co/api/v2/pokemon?limit=" + limit + "&offset=" + offset;

  let response = await fetch(url);
  let data = await response.json();

  totalPokemon = data.count;
  list.innerHTML = "";

  for (let i = 0; i < data.results.length; i++) {
    let pokemonResponse = await fetch(data.results[i].url);
    let pokemon = await pokemonResponse.json();
    showPokemon(pokemon);
  }

  updateButtons();
}

async function ladeSuchErgebnisse() {
  let start = page * limit;
  let ende = start + limit;
  list.innerHTML = "";

  if (suchErgebnisse.length == 0) {
    list.innerHTML = '<p class="suchstatus">Keine passenden Pokémon gefunden.</p>';
    updateButtons();
    return;
  }

  for (let i = start; i < ende && i < suchErgebnisse.length; i++) {
    let pokemonResponse = await fetch(suchErgebnisse[i]);
    let pokemon = await pokemonResponse.json();
    showPokemon(pokemon);
  }

  updateButtons();
}

function showPokemon(pokemon) {
  let type1 = pokemon.types[0].type.name;
  let typeText = "";

  for (let i = 0; i < pokemon.types.length; i++) {
    typeText += "<span class='pill'>" + pokemon.types[i].type.name + "</span>";
  }

  let bild = pokemon.sprites.other["official-artwork"].front_default;
  if (bild == null) {
    bild = pokemon.sprites.front_default;
  }

  list.innerHTML += `
    <div class="karte typ-${type1}" onclick="openDetail(${pokemon.id})">
      <span class="nr">#${pokemon.id}</span>
      <h2 class="name">${pokemon.name}</h2>
      <div class="typen">${typeText}</div>
      <img src="${bild}" alt="${pokemon.name}">
    </div>
  `;
}

function updateButtons() {
  let anzahlPokemon = totalPokemon;
  if (suchErgebnisse !== null) {
    anzahlPokemon = suchErgebnisse.length;
  }

  let lastPage = Math.ceil(anzahlPokemon / limit) - 1;
  if (lastPage < 0) {
    lastPage = 0;
  }
  if (lastPage > maxSeiten - 1) {
    lastPage = maxSeiten - 1;
  }

  pageText.textContent = "Page " + (page + 1) + " of " + (lastPage + 1);

  backButton.disabled = page == 0;
  nextButton.disabled = page >= lastPage;
}

backButton.onclick = function () {
  page = page - 1;
  loadPokemon();
};

nextButton.onclick = function () {
  page = page + 1;
  loadPokemon();
};

vorherButton.onclick = function () {
  if (aktuelleId > 1) {
    openDetail(aktuelleId - 1);
  }
};

nachherButton.onclick = function () {
  if (aktuelleId < totalPokemon) {
    openDetail(aktuelleId + 1);
  }
};

suchForm.onsubmit = async function (event) {
  event.preventDefault();

  let suchbegriff = suchFeld.value.trim().toLowerCase();
  if (suchbegriff.length < 3) {
    suchFeld.setCustomValidity("Bitte mindestens 3 Zeichen eingeben.");
    suchFeld.reportValidity();
    return;
  }
  suchFeld.setCustomValidity("");

  let nummer = suchbegriff.replace("#", "");
  let nummerSuche = nummer;
  if (nummer != "" && isNaN(nummer) == false) {
    nummerSuche = parseInt(nummer);
  }

  list.innerHTML = '<p class="suchstatus">Suche läuft ...</p>';

  try {
    let sucheLimit = totalPokemon;
    if (sucheLimit == 0) {
      sucheLimit = 2000;
    }

    let response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=" + sucheLimit);
    let data = await response.json();
    let treffer = [];
    let maxPokemon = totalPokemon;
    if (maxPokemon == 0) {
      maxPokemon = data.count;
    }
    if (maxPokemon > limit * maxSeiten) {
      maxPokemon = limit * maxSeiten;
    }

    for (let i = 0; i < data.results.length; i++) {
      let pokemon = data.results[i];
      let urlTeile = pokemon.url.split("/");
      let id = urlTeile[urlTeile.length - 2];

      if (parseInt(id) <= maxPokemon) {
        if (pokemon.name.includes(suchbegriff) || id == nummerSuche) {
          fuegeTrefferHinzu(pokemon.url, treffer);
        }
      }
    }

    let typAntwort = await fetch("https://pokeapi.co/api/v2/type/" + encodeURIComponent(suchbegriff));
    if (typAntwort.ok) {
      let typDaten = await typAntwort.json();
      for (let i = 0; i < typDaten.pokemon.length; i++) {
        let pokemonUrl = typDaten.pokemon[i].pokemon.url;
        let urlTeile = pokemonUrl.split("/");
        let id = urlTeile[urlTeile.length - 2];

        if (parseInt(id) <= maxPokemon) {
          fuegeTrefferHinzu(pokemonUrl, treffer);
        }
      }
    }

    suchErgebnisse = treffer;
    page = 0;
    loadPokemon();
  } catch (error) {
    suchErgebnisse = [];
    page = 0;
    list.innerHTML = '<p class="suchstatus">Die Suche hat gerade nicht geklappt.</p>';
    updateButtons();
  }
};

suchFeld.oninput = function () {
  suchFeld.setCustomValidity("");
};

function fuegeTrefferHinzu(url, treffer) {
  for (let i = 0; i < treffer.length; i++) {
    if (treffer[i] == url) {
      return;
    }
  }

  if (treffer.length < limit * maxSeiten) {
    treffer.push(url);
  }
}

sucheLoeschen.onclick = function () {
  suchFeld.value = "";
  suchErgebnisse = null;
  page = 0;
  loadPokemon();
};

document.getElementById("schliessen").onclick = function () {
  detail.close();
};

detail.onclick = function (event) {
  if (event.target == detail) {
    detail.close();
  }
};

aboutButton.onclick = function () {
  zeigeTab("about");
};

statsButton.onclick = function () {
  zeigeTab("stats");
};

function zeigeTab(name) {
  if (name == "about") {
    aboutInfo.style.display = "block";
    statsInfo.style.display = "none";
    aboutButton.classList.add("aktiv");
    statsButton.classList.remove("aktiv");
  } else {
    aboutInfo.style.display = "none";
    statsInfo.style.display = "block";
    aboutButton.classList.remove("aktiv");
    statsButton.classList.add("aktiv");
  }
}

async function openDetail(id) {
  let response = await fetch("https://pokeapi.co/api/v2/pokemon/" + id);

  if (response.ok == false) {
    return;
  }

  let pokemon = await response.json();
  aktuelleId = pokemon.id;

  vorherButton.disabled = aktuelleId <= 1;
  nachherButton.disabled = aktuelleId >= totalPokemon;

  let type1 = pokemon.types[0].type.name;
  let typeText = "";

  for (let i = 0; i < pokemon.types.length; i++) {
    typeText += "<span class='pill'>" + pokemon.types[i].type.name + "</span>";
  }

  let bild = pokemon.sprites.other["official-artwork"].front_default;
  if (bild == null) {
    bild = pokemon.sprites.front_default;
  }

  detailKopf.className = "detail-kopf typ-" + type1;
  document.getElementById("detailNr").textContent = "#" + pokemon.id;
  document.getElementById("detailName").textContent = pokemon.name;
  document.getElementById("detailTypen").innerHTML = typeText;
  document.getElementById("detailBild").src = bild;

  showAbout(pokemon);
  showStats(pokemon);
  zeigeTab("about");

  detail.showModal();
}

function showAbout(pokemon) {
  let abilities = "";

  for (let i = 0; i < pokemon.abilities.length; i++) {
    if (i > 0) {
      abilities += ", ";
    }
    abilities += pokemon.abilities[i].ability.name;
  }

  aboutInfo.innerHTML = `
    <div class="info-zeile"><span>Height</span><b>${pokemon.height / 10} m</b></div>
    <div class="info-zeile"><span>Weight</span><b>${pokemon.weight / 10} kg</b></div>
    <div class="info-zeile"><span>Abilities</span><b>${abilities}</b></div>
    <div class="info-zeile"><span>Base Exp.</span><b>${pokemon.base_experience}</b></div>
  `;
}

function showStats(pokemon) {
  let html = "";
  let total = 0;

  for (let i = 0; i < pokemon.stats.length; i++) {
    let wert = pokemon.stats[i].base_stat;
    let name = pokemon.stats[i].stat.name;
    let farbe = "gut";
    let breite = wert / 1.5;

    if (wert < 50) {
      farbe = "schwach";
    }
    if (breite > 100) {
      breite = 100;
    }

    total += wert;

    html += `
      <div class="stat-zeile">
        <span class="stat-name">${name}</span>
        <b>${wert}</b>
        <div class="balken">
          <div class="${farbe}" style="width: ${breite}%"></div>
        </div>
      </div>
    `;
  }

  html += `
    <div class="stat-zeile">
      <span class="stat-name">total</span>
      <b>${total}</b>
    </div>
  `;

  statsInfo.innerHTML = html;
}

let startAnimation = document.getElementById("startAnimation");
startAnimation.addEventListener("animationend", function (event) {
  if (event.target === startAnimation && event.animationName === "start-animation-fade") {
    startAnimation.hidden = true;
  }
});

loadPokemon();
