// Persondata laddas från data/people.js.

let round = 0,
    score = 0,
    streak = 0,
    highScore = 0,
    answered = false,
    lifelineUsed = false;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let deck = shuffle([...PEOPLE]);
const correctHistory = [];

const map = document.getElementById("map");
const world = document.getElementById("mapWorld");
const birthPin = document.getElementById("birthPin");
const deathPin = document.getElementById("deathPin");
const guessBox = document.querySelector(".guess-area");

let currentPerson = null;
let firstMapRender = true;
let resizeFrame = null;

function yearOnly(date) {
  const m = date.match(/\d{1,4}/g);
  return m ? m[m.length - 1] : date;
}

/*
 * Equirectangular projection.
 *
 * This deliberately stays compatible with the coordinate system
 * already used by people.js.
 */
function project([lat, lon]) {
  const w = map.clientWidth;
  const h = map.clientHeight;

  return {
    x: ((lon + 180) / 360) * w,
    y: ((90 - lat) / 180) * h
  };
}


/* =========================================================
   INTELLIGENT MAP VIEWPORT
   ========================================================= */

function setZoomAndCenter(a, d, animate = true) {
  const w = map.clientWidth;
  const h = map.clientHeight;

  /*
   * The goal is NOT simply to fit the two points.
   *
   * Instead:
   *  - distant points get a broad geographic view
   *  - medium-distance points get a regional view
   *  - close points get a country/local view
   *  - identical locations still retain enough surrounding
   *    geography to understand where they are
   */

  const dx = Math.abs(d.x - a.x);
  const dy = Math.abs(d.y - a.y);

  /*
   * Minimum geographic span we allow before calculating zoom.
   *
   * This is the important part that prevents:
   *
   * "Both points are in the same city -> zoom 15x into a tiny dot."
   */
  const minimumSpanX = Math.max(w * 0.075, 42);
  const minimumSpanY = Math.max(h * 0.10, 50);

  const spanX = Math.max(dx, minimumSpanX);
  const spanY = Math.max(dy, minimumSpanY);

  /*
   * Target occupancy.
   *
   * We want the two points to occupy roughly 60–65% of the
   * available map area, rather than touching the edges.
   */
  const horizontalScale = (w * 0.62) / spanX;
  const verticalScale = (h * 0.54) / spanY;

  let scale = Math.min(horizontalScale, verticalScale);

  /*
   * Keep the map from ever becoming absurdly small or huge.
   */
  const minScale = 1;
  const maxScale = 4.8;

  scale = Math.max(minScale, Math.min(maxScale, scale));

  /*
   * For very distant points, deliberately reduce the zoom slightly.
   * This gives the player some surrounding geography instead of
   * making the two locations dominate the entire map.
   */
  const normalizedDistance = Math.hypot(dx / w, dy / h);

  if (normalizedDistance > 0.55) {
    scale = Math.min(scale, 1.0);
  } else if (normalizedDistance > 0.38) {
    scale = Math.min(scale, 1.25);
  } else if (normalizedDistance > 0.25) {
    scale = Math.min(scale, 1.55);
  }

  /*
   * Center exactly between the two real geographic coordinates.
   */
  const cx = (a.x + d.x) / 2;
  const cy = (a.y + d.y) / 2;

  let tx = w / 2 - cx * scale;
  let ty = h / 2 - cy * scale;

  /*
   * Never allow the transformed world to expose empty space
   * outside the map.
   */
  const minTx = w - w * scale;
  const maxTx = 0;

  const minTy = h - h * scale;
  const maxTy = 0;

  tx = Math.max(minTx, Math.min(maxTx, tx));
  ty = Math.max(minTy, Math.min(maxTy, ty));

  /*
   * Disable animation during a resize.
   * Round-to-round movement remains animated.
   */
  if (!animate) {
    world.classList.add("no-map-transition");
  } else {
    world.classList.remove("no-map-transition");
  }

  world.style.transform =
    `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;

  if (!animate) {
    requestAnimationFrame(() => {
      world.classList.remove("no-map-transition");
    });
  }

  return {
    scale,
    tx,
    ty
  };
}


function screenPoint(base, view) {
  return {
    x: base.x * view.scale + view.tx,
    y: base.y * view.scale + view.ty
  };
}


/* =========================================================
   PIN PLACEMENT
   ========================================================= */

function placePins(person, animate = true) {
  const a = project(person.b);
  const d = project(person.d);

  const view = setZoomAndCenter(a, d, animate);

  const exactBirth = screenPoint(a, view);
  const exactDeath = screenPoint(d, view);

  const samePlace =
    Math.hypot(
      exactDeath.x - exactBirth.x,
      exactDeath.y - exactBirth.y
    ) < 2;

  /*
   * These are the TRUE geographic positions.
   * No artificial offsets are introduced.
   */
  birthPin.style.left = exactBirth.x + "px";
  birthPin.style.top = exactBirth.y + "px";

  deathPin.style.left = exactDeath.x + "px";
  deathPin.style.top = exactDeath.y + "px";

  birthPin.classList.toggle("same-location", samePlace);
  deathPin.classList.toggle("same-location", samePlace);

  document.getElementById("birthYear").textContent =
    yearOnly(person.birth);

  document.getElementById("deathYear").textContent =
    yearOnly(person.death);

  positionGuessBox(exactBirth, exactDeath);
}


/* =========================================================
   GUESS BOX POSITIONING
   ========================================================= */

function positionGuessBox(b, d) {
  const pad = 14;

  const w = guessBox.offsetWidth || 270;
  const h = guessBox.offsetHeight || 64;

  const mw = map.clientWidth;
  const mh = map.clientHeight;

  const candidates = [
    { x: mw - w - pad, y: mh - h - pad },
    { x: pad,          y: mh - h - pad },
    { x: mw - w - pad, y: pad },
    { x: pad,          y: pad },

    { x: (mw - w) / 2, y: mh - h - pad },
    { x: (mw - w) / 2, y: pad },

    { x: mw - w - pad, y: (mh - h) / 2 },
    { x: pad,          y: (mh - h) / 2 }
  ];

  const pinSafe = 38;
  const important = [b, d];

  function scoreCandidate(c) {
    const cx = c.x + w / 2;
    const cy = c.y + h / 2;

    let score = 0;

    for (const q of important) {
      const dx = Math.max(
        Math.abs(q.x - cx) - w / 2,
        0
      );

      const dy = Math.max(
        Math.abs(q.y - cy) - h / 2,
        0
      );

      const gap = Math.hypot(dx, dy);

      if (gap < pinSafe) {
        score += 100000 + (pinSafe - gap) * 1000;
      }

      score += 1 / (gap + 12) * 5000;
    }

    /*
     * Prefer lower/right placement when there is no conflict.
     */
    score += (mw - c.x) * 0.01;
    score += (mh - c.y) * 0.005;

    return score;
  }

  candidates.forEach(c => {
    c.x = Math.max(
      pad,
      Math.min(mw - w - pad, c.x)
    );

    c.y = Math.max(
      pad,
      Math.min(mh - h - pad, c.y)
    );
  });

  const best = candidates
    .sort((a, b) => scoreCandidate(a) - scoreCandidate(b))[0];

  guessBox.style.left = best.x + "px";
  guessBox.style.top = best.y + "px";
}


/* =========================================================
   ROUND LOADING
   ========================================================= */

function loadRound() {
  answered = false;

  document.getElementById("guess").value = "";
  document.getElementById("guess").disabled = false;

  document.getElementById("result").className =
    "result hidden";

  document.getElementById("nextBtn").className =
    "next hidden";

  document.getElementById("runStatus").textContent =
    "Pågående";

  const p = deck[round % deck.length];

  currentPerson = p;

  document.getElementById("runLabel").textContent =
    `Runda ${round + 1}`;

  document.getElementById("highScore").textContent =
    highScore;

  document.getElementById("lifelineText").textContent =
    lifelineUsed
      ? "Livlinan är använd"
      : "1 livlina kvar";

  document.getElementById("lifelineBtn").disabled =
    lifelineUsed;

  requestAnimationFrame(() => {
    placePins(p, !firstMapRender);
    firstMapRender = false;
  });
}


/* =========================================================
   ANSWER VALIDATION
   ========================================================= */

function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  let prev = Array.from(
    { length: b.length + 1 },
    (_, i) => i
  );

  for (let i = 1; i <= a.length; i++) {
    let cur = [i];

    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        cur[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] +
          (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }

    prev = cur;
  }

  return prev[b.length];
}

function fuzzyMatch(answer, guess) {
  if (!guess) return false;

  if (answer === guess) return true;

  /*
   * Never accept a partial name.
   * Every alias remains a complete accepted form.
   */
  const d = levenshtein(answer, guess);
  const max = Math.max(answer.length, guess.length);

  const allowed =
    max <= 5
      ? 1
      : max <= 9
        ? 2
        : Math.max(2, Math.floor(max * 0.18));

  return d <= allowed;
}


document
  .getElementById("guessForm")
  .addEventListener("submit", e => {
    e.preventDefault();

    if (answered) return;

    answered = true;

    const p = deck[round % deck.length];

    const guess = normalize(
      document.getElementById("guess").value
    );

    const correct = p.aliases.some(a =>
      fuzzyMatch(normalize(a), guess)
    );

    const r = document.getElementById("result");

    r.className =
      "result " + (correct ? "correct" : "wrong");

    if (correct) {
      score++;
      streak++;

      highScore = Math.max(
        highScore,
        score
      );

      document.getElementById("runStatus").textContent =
        "Rätt!";

      r.innerHTML =
        `<h3>Rätt! ${p.name}</h3>
         <p>Född ${p.birth}. Död ${p.death}.</p>`;

      correctHistory.push({
        round: round + 1,
        name: p.name,
        birth: p.birth,
        death: p.death
      });

      renderHistory();

    } else {

      streak = 0;

      /*
       * A wrong guess ends the current run.
       */
      round = 0;
      deck = shuffle([...PEOPLE]);

      document.getElementById("runLabel").textContent =
        "Runda 1";

      document.getElementById("runStatus").textContent =
        "Rundan är slut";

      r.innerHTML =
        `<h3>Fel gissning.</h3>
         <p>Rätt svar var <strong>${p.name}</strong>.
         Född ${p.birth} i ${p.bp};
         dog ${p.death} i ${p.dp}.</p>
         <p><strong>Rundan är slut.</strong>
         Nästa gång börjar du om från noll.</p>`;

      document.getElementById("nextBtn").textContent =
        "Ny runda →";

      document.getElementById("nextBtn").className =
        "next";
    }

    document.getElementById("highScore").textContent =
      highScore;

    document.getElementById("guess").disabled = true;

    requestAnimationFrame(() => {
      placePins(p, true);
    });

    if (correct) {
      setTimeout(() => {
        const previous =
          deck[round % deck.length];

        round++;

        if (round % deck.length === 0) {
          deck = shuffle([...PEOPLE]);

          if (
            deck.length > 1 &&
            deck[0] === previous
          ) {
            [deck[0], deck[1]] =
              [deck[1], deck[0]];
          }
        }

        loadRound();
      }, 850);
    }
  });


/* =========================================================
   HISTORY
   ========================================================= */

function renderHistory() {
  const list =
    document.getElementById("historyList");

  if (!correctHistory.length) {
    list.innerHTML =
      '<div class="history-empty">Inga rätta gissningar ännu.</div>';

    return;
  }

  list.innerHTML =
    correctHistory
      .slice()
      .reverse()
      .map(x =>
        `<div class="history-item">
          <span class="history-round">${x.round}</span>
          <span>
            <strong>${x.name}</strong>
            <small>${x.birth} → ${x.death}</small>
          </span>
        </div>`
      )
      .join("");
}


document
  .getElementById("runLabel")
  .addEventListener("click", () => {
    document
      .getElementById("historyPanel")
      .classList.toggle("hidden");
  });


document.addEventListener("click", e => {
  const panel =
    document.getElementById("historyPanel");

  const btn =
    document.getElementById("runLabel");

  if (
    !panel.contains(e.target) &&
    e.target !== btn
  ) {
    panel.classList.add("hidden");
  }
});


/* =========================================================
   LIFELINE
   ========================================================= */

document
  .getElementById("lifelineBtn")
  .addEventListener("click", () => {

    if (lifelineUsed || answered) return;

    lifelineUsed = true;

    const p = deck[round % deck.length];

    document.getElementById("lifelineBtn").disabled =
      true;

    document.getElementById("lifelineText").textContent =
      "Livlinan är använd";

    const r =
      document.getElementById("result");

    r.className = "result";

    r.innerHTML =
      `<h3>Livlina</h3>
       <p>En ledtråd:
       <strong>${p.hint}</strong>.</p>`;

    requestAnimationFrame(() => {
      placePins(p, true);
    });
  });


/* =========================================================
   NEW ROUND
   ========================================================= */

document
  .getElementById("nextBtn")
  .addEventListener("click", () => {

    score = 0;
    streak = 0;
    lifelineUsed = false;

    deck = shuffle([...PEOPLE]);

    document.getElementById("nextBtn").textContent =
      "Nästa →";

    loadRound();
  });


/* =========================================================
   RESIZE
   ========================================================= */

/*
 * IMPORTANT:
 * Resizing the browser must NOT create a new round,
 * clear the answer field, or alter game state.
 *
 * We simply re-project the CURRENT person onto the
 * new map dimensions.
 */
window.addEventListener("resize", () => {

  if (resizeFrame) {
    cancelAnimationFrame(resizeFrame);
  }

  resizeFrame = requestAnimationFrame(() => {

    if (currentPerson) {
      placePins(currentPerson, false);
    }

    resizeFrame = null;
  });
});


/* =========================================================
   START
   ========================================================= */

loadRound();
