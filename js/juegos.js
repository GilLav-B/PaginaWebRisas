// Lógica de la página privada: miembros, pruebas y mensajes de resultado.
// Requiere auth.js (variable global `usuario`), burlas.js y preguntas.js.

const $ = (id) => document.getElementById(id);

function barajar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// localStorage puede fallar (modo privado); se usa memoria como respaldo.
const memoria = {};
function leer(clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v === null ? porDefecto : JSON.parse(v);
  } catch {
    return clave in memoria ? memoria[clave] : porDefecto;
  }
}
function guardar(clave, valor) {
  memoria[clave] = valor;
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch {}
}

function terminarConBoton(idBoton) {
  $(idBoton).hidden = false;
  $(idBoton).textContent = "再戦 · Otra vez";
}

// ---------- Encabezado y miembros ----------
$("saludo").textContent = `${RANGOS[usuario.id].kana} · ${usuario.nombre}`;
const titulo = $("titulo-bienvenida");
titulo.textContent = usuario.nombre.toUpperCase();
titulo.dataset.text = usuario.nombre.toUpperCase();
$("salir").addEventListener("click", cerrarSesion);

$("miembros").innerHTML = Object.entries(USUARIOS)
  .map(([id, u]) => `
    <div class="miembro${id === usuario.id ? " yo" : ""}">
      <span class="miembro-kana">${RANGOS[id].kana}</span>
      <span class="miembro-nombre">${u.nombre}</span>
      <span class="miembro-rango">${RANGOS[id].rango}</span>
    </div>`)
  .join("");

// ---------- Contador de derrotas (solo en este navegador) ----------
const CLAVE_DERROTAS = `risas_derrotas_${usuario.id}`;
$("contador-derrotas").textContent = leer(CLAVE_DERROTAS, 0);

function sumarDerrota() {
  const n = leer(CLAVE_DERROTAS, 0) + 1;
  guardar(CLAVE_DERROTAS, n);
  $("contador-derrotas").textContent = n;
}

// ---------- Modal de resultado ----------
function mostrarResultado(gano) {
  if (!gano) sumarDerrota();
  $("modal-kanji").textContent = gano ? "勝" : "負";
  $("modal-veredicto").textContent = gano ? "VICTORIA" : "DERROTA";
  $("modal-mensaje").textContent = gano ? azar(BURLAS_GANAR) : burlaPerder(usuario.id);
  $("modal").classList.toggle("perdio", !gano);
  $("modal").hidden = false;
  $("modal-cerrar").focus();
}

$("modal-cerrar").addEventListener("click", () => { $("modal").hidden = true; });

// =====================================================================
//  Prueba del saber (trivia con preguntas propias de cada usuario)
// =====================================================================
const temas = TEMAS_POR_USUARIO[usuario.id];
$("trivia-tema").textContent = temas.nombre;

// Elige preguntas que el usuario todavía no ha visto. Cuando se acaban
// las de un tema, ese tema vuelve a empezar desde cero.
function elegirPreguntas() {
  const elegidas = [];
  for (const [tema, cantidad] of temas.mezcla) {
    const clave = `risas_vistas_${usuario.id}_${tema}`;
    let vistas = leer(clave, []);
    let disponibles = PREGUNTAS[tema].filter((q) => !vistas.includes(q.p));
    if (disponibles.length < cantidad) {
      vistas = [];
      disponibles = PREGUNTAS[tema];
    }
    const nuevas = barajar(disponibles).slice(0, cantidad);
    guardar(clave, [...vistas, ...nuevas.map((q) => q.p)]);
    elegidas.push(...nuevas);
  }
  return barajar(elegidas);
}

const trivia = { preguntas: [], i: 0, aciertos: 0 };

function iniciarTrivia() {
  trivia.preguntas = elegirPreguntas();
  trivia.i = 0;
  trivia.aciertos = 0;
  $("trivia-iniciar").hidden = true;
  mostrarPregunta();
}

function mostrarPregunta() {
  const q = trivia.preguntas[trivia.i];
  $("trivia-pregunta").textContent = q.p;
  $("trivia-progreso").textContent = `Pregunta ${trivia.i + 1} de ${trivia.preguntas.length} · Aciertos: ${trivia.aciertos}`;
  const cont = $("trivia-opciones");
  cont.innerHTML = "";
  barajar([q.c, ...q.i]).forEach((texto) => {
    const b = document.createElement("button");
    b.className = "opcion";
    b.textContent = texto;
    b.addEventListener("click", () => responder(texto === q.c, b));
    cont.appendChild(b);
  });
}

function responder(acerto, boton) {
  const q = trivia.preguntas[trivia.i];
  $("trivia-opciones").querySelectorAll("button").forEach((b) => {
    b.disabled = true;
    if (b.textContent === q.c) b.classList.add("correcta");
  });
  if (acerto) trivia.aciertos++;
  else boton.classList.add("incorrecta");

  setTimeout(() => {
    trivia.i++;
    if (trivia.i < trivia.preguntas.length) return mostrarPregunta();
    $("trivia-pregunta").textContent = `Resultado: ${trivia.aciertos} de ${trivia.preguntas.length}`;
    $("trivia-opciones").innerHTML = "";
    $("trivia-progreso").textContent = "";
    terminarConBoton("trivia-iniciar");
    mostrarResultado(trivia.aciertos >= 3);
  }, 900);
}

$("trivia-iniciar").addEventListener("click", iniciarTrivia);

// =====================================================================
//  Reflejos de samurái
// =====================================================================
const LIMITE_MS = 400;
const reflejos = { estado: "inactivo", inicio: 0, timer: null };
const zona = $("reflejos-zona");

function iniciarReflejos() {
  reflejos.estado = "esperando";
  zona.disabled = false;
  zona.className = "zona-reflejos esperando";
  $("reflejos-texto").textContent = "Espera…";
  $("reflejos-iniciar").hidden = true;
  reflejos.timer = setTimeout(() => {
    reflejos.estado = "ya";
    reflejos.inicio = performance.now();
    zona.className = "zona-reflejos ya";
    $("reflejos-texto").textContent = "斬!";
  }, 1500 + Math.random() * 3000);
}

function terminarReflejos(texto, gano) {
  clearTimeout(reflejos.timer);
  reflejos.estado = "inactivo";
  zona.disabled = true;
  zona.className = "zona-reflejos";
  $("reflejos-texto").textContent = texto;
  terminarConBoton("reflejos-iniciar");
  mostrarResultado(gano);
}

zona.addEventListener("click", () => {
  if (reflejos.estado === "esperando") {
    terminarReflejos("¡Te adelantaste!", false);
  } else if (reflejos.estado === "ya") {
    const ms = Math.round(performance.now() - reflejos.inicio);
    terminarReflejos(`${ms} ms`, ms < LIMITE_MS);
  }
});

$("reflejos-iniciar").addEventListener("click", iniciarReflejos);

// =====================================================================
//  Atrapa al ninja (whack-a-mole)
// =====================================================================
const NINJA_META = 12;
const NINJA_SEGUNDOS = 20;
const ninja = { puntos: 0, restante: 0, activa: -1, tipo: "", spawn: null, reloj: null };
const celdas = [];

for (let i = 0; i < 9; i++) {
  const c = document.createElement("button");
  c.className = "celda-ninja";
  c.disabled = true;
  c.addEventListener("pointerdown", () => golpear(i));
  $("ninja-tablero").appendChild(c);
  celdas.push(c);
}

function pintarNinja() {
  celdas.forEach((c, i) => {
    const visible = i === ninja.activa;
    c.textContent = visible ? (ninja.tipo === "ninja" ? "忍" : "鬼") : "";
    c.className = "celda-ninja" + (visible ? ` ${ninja.tipo}` : "");
  });
  $("ninja-puntos").textContent = ninja.puntos;
  $("ninja-tiempo").textContent = ninja.restante;
}

function aparecer() {
  let nueva;
  do { nueva = Math.floor(Math.random() * 9); } while (nueva === ninja.activa);
  ninja.activa = nueva;
  ninja.tipo = Math.random() < 0.8 ? "ninja" : "demonio";
  pintarNinja();
}

function golpear(i) {
  if (i !== ninja.activa) return;
  ninja.puntos = ninja.tipo === "ninja" ? ninja.puntos + 1 : Math.max(0, ninja.puntos - 2);
  celdas[i].classList.add(ninja.tipo === "ninja" ? "golpe" : "castigo");
  ninja.activa = -1;
  setTimeout(pintarNinja, 120);
}

function iniciarNinja() {
  ninja.puntos = 0;
  ninja.restante = NINJA_SEGUNDOS;
  ninja.activa = -1;
  celdas.forEach((c) => (c.disabled = false));
  $("ninja-iniciar").hidden = true;
  pintarNinja();
  aparecer();
  ninja.spawn = setInterval(aparecer, 650);
  ninja.reloj = setInterval(() => {
    ninja.restante--;
    $("ninja-tiempo").textContent = ninja.restante;
    if (ninja.restante <= 0) terminarNinja();
  }, 1000);
}

function terminarNinja() {
  clearInterval(ninja.spawn);
  clearInterval(ninja.reloj);
  ninja.activa = -1;
  celdas.forEach((c) => (c.disabled = true));
  pintarNinja();
  terminarConBoton("ninja-iniciar");
  mostrarResultado(ninja.puntos >= NINJA_META);
}

$("ninja-iniciar").addEventListener("click", iniciarNinja);

// =====================================================================
//  Memorama del templo
// =====================================================================
const MEMO_KANJI = ["笑", "侍", "忍", "龍", "桜", "鬼"];
const MEMO_MAX = 12;
const memo = { cartas: [], abiertas: [], intentos: 0, pares: 0, bloqueado: false };

function iniciarMemo() {
  memo.intentos = 0;
  memo.pares = 0;
  memo.abiertas = [];
  memo.bloqueado = false;
  $("memo-intentos").textContent = 0;
  $("memo-pares").textContent = 0;
  $("memo-iniciar").hidden = true;

  const tablero = $("memo-tablero");
  tablero.innerHTML = "";
  memo.cartas = barajar([...MEMO_KANJI, ...MEMO_KANJI]).map((kanji) => {
    const carta = document.createElement("button");
    carta.className = "carta";
    carta.dataset.kanji = kanji;
    carta.addEventListener("click", () => voltear(carta));
    tablero.appendChild(carta);
    return carta;
  });
}

function voltear(carta) {
  if (memo.bloqueado || carta.classList.contains("abierta")) return;
  carta.classList.add("abierta");
  carta.textContent = carta.dataset.kanji;
  memo.abiertas.push(carta);
  if (memo.abiertas.length < 2) return;

  memo.intentos++;
  $("memo-intentos").textContent = memo.intentos;
  const [a, b] = memo.abiertas;
  memo.abiertas = [];

  if (a.dataset.kanji === b.dataset.kanji) {
    a.classList.add("par");
    b.classList.add("par");
    memo.pares++;
    $("memo-pares").textContent = memo.pares;
    if (memo.pares === MEMO_KANJI.length) return terminarMemo(true);
  } else {
    memo.bloqueado = true;
    setTimeout(() => {
      [a, b].forEach((c) => { c.classList.remove("abierta"); c.textContent = ""; });
      memo.bloqueado = false;
    }, 750);
  }
  if (memo.intentos >= MEMO_MAX) terminarMemo(false);
}

function terminarMemo(gano) {
  memo.bloqueado = true;
  setTimeout(() => {
    memo.cartas.forEach((c) => { c.classList.add("abierta"); c.textContent = c.dataset.kanji; c.disabled = true; });
  }, 800);
  terminarConBoton("memo-iniciar");
  mostrarResultado(gano);
}

$("memo-iniciar").addEventListener("click", iniciarMemo);

// =====================================================================
//  Duelo contra el Shōgun (piedra, papel o tijera)
// =====================================================================
const PPT_EMOJI = { piedra: "✊", papel: "✋", tijera: "✌️" };
const PPT_GANA_A = { piedra: "tijera", papel: "piedra", tijera: "papel" };
const ppt = { tu: 0, shogun: 0 };
const botonesPpt = $("ppt-botones").querySelectorAll("button");

function iniciarPpt() {
  ppt.tu = 0;
  ppt.shogun = 0;
  $("ppt-tu").textContent = 0;
  $("ppt-shogun").textContent = 0;
  $("ppt-ronda").textContent = "Elige tu jugada.";
  botonesPpt.forEach((b) => (b.disabled = false));
  $("ppt-iniciar").hidden = true;
}

function jugarPpt(tuya) {
  const suya = azar(Object.keys(PPT_EMOJI));
  let texto = `${PPT_EMOJI[tuya]} vs ${PPT_EMOJI[suya]} · `;
  if (tuya === suya) texto += "Empate.";
  else if (PPT_GANA_A[tuya] === suya) { ppt.tu++; texto += "Ganaste la ronda."; }
  else { ppt.shogun++; texto += "El Shōgun gana la ronda."; }

  $("ppt-tu").textContent = ppt.tu;
  $("ppt-shogun").textContent = ppt.shogun;
  $("ppt-ronda").textContent = texto;

  if (ppt.tu === 2 || ppt.shogun === 2) {
    botonesPpt.forEach((b) => (b.disabled = true));
    terminarConBoton("ppt-iniciar");
    mostrarResultado(ppt.tu === 2);
  }
}

botonesPpt.forEach((b) => b.addEventListener("click", () => jugarPpt(b.dataset.jugada)));
$("ppt-iniciar").addEventListener("click", iniciarPpt);

// =====================================================================
//  El número del destino
// =====================================================================
const adivina = { secreto: 0, intentos: 0 };
const MAX_INTENTOS = 6;

function iniciarAdivina() {
  adivina.secreto = 1 + Math.floor(Math.random() * 50);
  adivina.intentos = 0;
  $("adivina-input").disabled = false;
  $("adivina-probar").disabled = false;
  $("adivina-input").value = "";
  $("adivina-input").focus();
  $("adivina-pista").textContent = `Intentos restantes: ${MAX_INTENTOS}`;
  $("adivina-iniciar").hidden = true;
}

function terminarAdivina(gano) {
  $("adivina-input").disabled = true;
  $("adivina-probar").disabled = true;
  terminarConBoton("adivina-iniciar");
  mostrarResultado(gano);
}

$("adivina-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const n = Number($("adivina-input").value);
  if (!Number.isInteger(n) || n < 1 || n > 50) {
    $("adivina-pista").textContent = "Del 1 al 50. Hasta eso se te complica.";
    return;
  }
  adivina.intentos++;
  const restantes = MAX_INTENTOS - adivina.intentos;

  if (n === adivina.secreto) {
    $("adivina-pista").textContent = `¡Era ${adivina.secreto}!`;
    return terminarAdivina(true);
  }
  if (restantes === 0) {
    $("adivina-pista").textContent = `Era ${adivina.secreto}. Ni cerca.`;
    return terminarAdivina(false);
  }
  const direccion = n < adivina.secreto ? "más alto ↑" : "más bajo ↓";
  $("adivina-pista").textContent = `${n}: ${direccion} · Intentos restantes: ${restantes}`;
  $("adivina-input").value = "";
  $("adivina-input").focus();
});

$("adivina-iniciar").addEventListener("click", iniciarAdivina);
