// =====================================================================
//  Sala de espera + torneo online.
//  El anfitrión (el primero en entrar) corre la física de cada juego a
//  30 Hz y manda fotos del estado a los demás ~15 veces por segundo.
//  Los invitados solo mandan su joystick/botón y dibujan lo que reciben.
//  Requiere: auth.js (`usuario`), burlas.js, motor.js, red.js, controles.js, juegos/*.js
// =====================================================================

const $ = (id) => document.getElementById(id);
const JUEGOS_POR_TORNEO = 5;
const TICK = 1 / 30;
const PUESTOS = ["一", "二", "三", "四"];

const interp = new Interpolador();
let red = null;
let sala = [];          // [{ slot, pid, uid, nombre }]
let miSlot = null;
let juegoActual = null;
let tiempoRestante = 0;
let faseActual = "sala";
let envioEntradas = null;
let cuentaRegresiva = null;
let esperaHost = null;

const controles = iniciarControles({
  zona: $("zona-joystick"), base: $("joystick-base"), palanca: $("joystick-palanca"), botonA: $("boton-a"),
});

// ---------------------------------------------------------------------
//  Conexión
// ---------------------------------------------------------------------
async function entrarASala(intento = 1) {
  mostrarEstadoSala("Conectando a la sala…");
  clearTimeout(esperaHost);
  red?.cerrar();
  red = new Red({ mensaje: alRecibir, salio: alSalirInvitado, hostSalio: alSalirHost });
  try {
    const soyHost = await red.conectar();
    if (soyHost) {
      agregarJugador(red.miId, usuario.id, usuario.nombre);
    } else {
      red.enviarAlHost({ t: "hola", uid: usuario.id, nombre: usuario.nombre });
      // Si el anfitrión no contesta (teléfono bloqueado, pestaña congelada), avisar.
      esperaHost = setTimeout(() => {
        mostrarEstadoSala("El anfitrión no responde (¿bloqueó su teléfono?). Pídele que vuelva a abrir la sala y reintenta.", true);
        red.cerrar();
      }, 8000);
    }
  } catch (e) {
    console.warn("No se pudo entrar:", e);
    if (intento < 3) { setTimeout(() => entrarASala(intento + 1), 1500); return; }
    mostrarEstadoSala("No se pudo conectar. Revisa tu internet o prueben todos en la misma red WiFi.", true);
  }
}

function alRecibir(de, m) {
  if (red.esHost) {
    if (m.t === "hola") agregarJugador(de, m.uid, m.nombre);
    else if (m.t === "in") {
      const p = sala.find((p) => p.pid === de);
      if (p) H.crudas[p.slot] = m;
    }
    return;
  }
  aplicar(m);
}

function alSalirHost() {
  pararEntradas();
  mostrarCapa(`
    <span class="capa-kanji perdio">去</span>
    <h2>El anfitrión salió</h2>
    <p>La sala se cerró. Vuelve a entrar: el primero que llegue será el nuevo anfitrión.</p>
    <button class="boton-neon" onclick="location.reload()">再入 · Volver a entrar</button>
    <a class="boton-fantasma" href="inicio.html">Salir</a>`);
}

// ---------------------------------------------------------------------
//  Mensajes que ven todos (el anfitrión se los aplica a sí mismo)
// ---------------------------------------------------------------------
function aplicar(m) {
  clearTimeout(esperaHost);
  if (m.t === "sala") {
    sala = m.jugadores;
    miSlot = sala.find((p) => p.pid === red.miId)?.slot ?? null;
    pintarSala(m.enCurso);
  } else if (m.t === "fase") {
    aplicarFase(m);
  } else if (m.t === "s") {
    recibirEstado(m);
  } else if (m.t === "llena") {
    mostrarEstadoSala("La sala está llena (máximo 4 jugadores).", true);
    red.cerrar();
  } else if (m.t === "duplicado") {
    mostrarEstadoSala(`${usuario.nombre} ya está en la sala desde otro teléfono o pestaña. Ciérrala allá y reintenta.`, true);
    red.cerrar();
  }
}

function recibirEstado(m) {
  interp.empujar(m.s);
  tiempoRestante = m.tr;
}

function aplicarFase(m) {
  faseActual = m.fase;
  clearInterval(cuentaRegresiva);

  if (m.fase === "sala") {
    pararEntradas();
    juegoActual = null;
    document.body.classList.remove("jugando");
    $("pantalla-juego").hidden = true;
    $("pantalla-sala").hidden = false;
    ocultarCapa();
    return;
  }

  $("pantalla-sala").hidden = true;
  $("pantalla-juego").hidden = false;
  document.body.classList.add("jugando");
  mantenerPantallaEncendida();
  const juego = MINIJUEGOS[m.juego];

  if (m.fase === "intro") {
    juegoActual = juego;
    interp.reiniciar();
    controles.reiniciar();
    $("boton-a-texto").textContent = juego.boton;
    $("hud-nombre").textContent = juego.nombre;
    let n = 3;
    mostrarCapa(`
      <p class="capa-eyebrow">// JUEGO ${m.num} DE ${m.total}</p>
      <span class="capa-kanji">${juego.kanji}</span>
      <h2>${juego.nombre}</h2>
      <p>${juego.ayuda}</p>
      <p class="capa-cuenta" id="cuenta">${n}</p>`);
    cuentaRegresiva = setInterval(() => {
      n--;
      const el = $("cuenta");
      if (el) el.textContent = n > 0 ? n : "¡YA!";
      if (n <= 0) clearInterval(cuentaRegresiva);
    }, 1000);
  } else if (m.fase === "juego") {
    juegoActual = juego;
    $("boton-a-texto").textContent = juego.boton;
    $("hud-nombre").textContent = juego.nombre;
    ocultarCapa();
    empezarEntradas();
  } else if (m.fase === "resultado") {
    pararEntradas();
    mostrarCapa(`
      <p class="capa-eyebrow">// RESULTADOS · JUEGO ${m.num} DE ${m.total}</p>
      <h2>${juego.nombre}</h2>
      ${tablaHTML(m.filas, true)}
      ${burlaHTML(m.burla)}
      <p class="capa-nota">${m.num < m.total ? "Siguiente juego en unos segundos…" : "Calculando al campeón…"}</p>`);
  } else if (m.fase === "final") {
    pararEntradas();
    const campeon = m.tabla[0];
    mostrarCapa(`
      <p class="capa-eyebrow">// FIN DEL TORNEO</p>
      <span class="capa-kanji">王</span>
      <h2>Campeón: ${campeon ? campeon.nombre : "nadie"} 👑</h2>
      ${tablaHTML(m.tabla, false)}
      ${burlaHTML(m.burla)}
      ${red.esHost
        ? `<button class="boton-neon" onclick="volverASala()">戻る · Volver a la sala</button>`
        : `<p class="capa-nota">Esperando a que el anfitrión regrese a la sala…</p>`}`);
  }
}

function tablaHTML(filas, conPuntosGanados) {
  return `<ol class="tabla">${filas.map((f, i) => `
    <li class="${f.slot === miSlot ? "yo" : ""}">
      <span class="puesto">${PUESTOS[i] || i + 1}</span>
      <span class="punto-color" style="background:${COLORES[f.slot]}"></span>
      <span class="tabla-nombre">${f.nombre}</span>
      ${conPuntosGanados ? `<span class="ganados">+${f.pts}</span>` : ""}
      <span class="total">${f.total} pts</span>
    </li>`).join("")}</ol>`;
}

function burlaHTML(b) {
  return b ? `<p class="capa-burla"><b>${b.nombre}:</b> ${b.texto}</p>` : "";
}

// ---------------------------------------------------------------------
//  Entradas del jugador → anfitrión
// ---------------------------------------------------------------------
function empezarEntradas() {
  pararEntradas();
  if (red.esHost) return; // el anfitrión lee `Control` directamente
  envioEntradas = setInterval(() => {
    red.enviarAlHost({
      t: "in",
      x: Math.round(Control.x * 100) / 100, y: Math.round(Control.y * 100) / 100,
      a: Control.a, n: Control.n, r: Control.r,
    });
  }, 50);
}

function pararEntradas() {
  clearInterval(envioEntradas);
  envioEntradas = null;
}

// ---------------------------------------------------------------------
//  Lógica del anfitrión
// ---------------------------------------------------------------------
const H = {
  crudas: {}, ultimos: {}, cola: [], idx: 0, puntos: {}, nombres: {},
  juego: null, estado: null, tiempo: 0, tick: 0, loop: null, tAnterior: 0,
  enCurso: false, ultimaFase: null, timeouts: [],
};

function emitir(m) {
  if (m.t === "fase") H.ultimaFase = m;
  aplicar(m);
  red.difundir(m);
}

function programar(fn, ms) { H.timeouts.push(setTimeout(fn, ms)); }

function anunciarSala() {
  emitir({ t: "sala", jugadores: sala, enCurso: H.enCurso });
}

function agregarJugador(pid, uid, nombre) {
  if (sala.some((p) => p.pid === pid)) return;
  if (sala.some((p) => p.uid === uid)) { red.enviarA(pid, { t: "duplicado" }); return; }
  if (sala.length >= 4) { red.enviarA(pid, { t: "llena" }); return; }
  const slot = [0, 1, 2, 3].find((s) => !sala.some((p) => p.slot === s));
  sala = [...sala, { slot, pid, uid, nombre }].sort((a, b) => a.slot - b.slot);
  anunciarSala();
  if (H.enCurso && H.ultimaFase) red.enviarA(pid, H.ultimaFase);
}

function alSalirInvitado(pid) {
  const p = sala.find((p) => p.pid === pid);
  if (!p) return;
  sala = sala.filter((x) => x.pid !== pid);
  delete H.crudas[p.slot];
  const j = H.estado?.jugadores.find((j) => j.id === p.slot);
  if (j && H.estado.muertes) eliminar(H.estado, j);
  anunciarSala();
}

function iniciarTorneo(ids) {
  if (!red.esHost || H.enCurso) return;
  H.enCurso = true;
  H.cola = ids;
  H.idx = 0;
  H.puntos = {};
  anunciarSala();
  siguienteJuego();
}

function siguienteJuego() {
  const id = H.cola[H.idx];
  emitir({ t: "fase", fase: "intro", juego: id, num: H.idx + 1, total: H.cola.length });
  programar(() => empezarJuego(id), 4000);
}

function empezarJuego(id) {
  H.juego = MINIJUEGOS[id];
  const jugadores = sala.map((p) => ({ id: p.slot, nombre: p.nombre, color: COLORES[p.slot] }));
  for (const p of sala) { H.puntos[p.slot] ??= 0; H.nombres[p.slot] = p.nombre; }
  H.estado = H.juego.crear(jugadores);
  H.tiempo = H.juego.duracion;
  H.crudas = {}; H.ultimos = {}; H.tick = 0;
  emitir({ t: "fase", fase: "juego", juego: id });
  H.tAnterior = performance.now();
  H.loop = setInterval(pasoHost, 1000 * TICK);
}

function entradasDelTick() {
  const ent = {};
  for (const j of H.estado.jugadores) {
    const c = j.id === miSlot ? Control : H.crudas[j.id];
    if (!c) continue;
    const u = H.ultimos[j.id] || { n: c.n, r: c.r };
    ent[j.id] = { x: c.x, y: c.y, a: c.a, pulso: c.n > u.n, suelta: c.r > u.r };
    H.ultimos[j.id] = { n: c.n, r: c.r };
  }
  return ent;
}

function pasoHost() {
  const ahora = performance.now();
  const dt = Math.min(0.1, (ahora - H.tAnterior) / 1000);
  H.tAnterior = ahora;
  H.juego.paso(H.estado, entradasDelTick(), dt);
  H.tiempo -= dt;
  const texto = serializar({ t: "s", s: H.estado, tr: Math.max(0, H.tiempo) });
  recibirEstado(JSON.parse(texto));
  if (H.tick++ % 2 === 0) red.difundir(texto);
  if (H.tiempo <= 0 || H.juego.terminado(H.estado)) terminarJuego();
}

function terminarJuego() {
  clearInterval(H.loop);
  red.difundir(serializar({ t: "s", s: H.estado, tr: Math.max(0, H.tiempo) }));
  const orden = H.juego.ranking(H.estado);
  const n = orden.length;
  const filas = orden.map((slot, i) => {
    const pts = n - 1 - i;
    H.puntos[slot] = (H.puntos[slot] || 0) + pts;
    return { slot, nombre: H.nombres[slot], pts, total: H.puntos[slot] };
  });
  const ultimo = filas[n - 1];
  const burla = n > 1 ? { nombre: ultimo.nombre, texto: burlaPerder(ultimo.nombre.toLowerCase()) } : null;
  emitir({ t: "fase", fase: "resultado", juego: H.juego.id, filas, burla, num: H.idx + 1, total: H.cola.length });
  H.estado = null;
  H.idx++;
  programar(() => (H.idx < H.cola.length ? siguienteJuego() : finalTorneo()), 7000);
}

function finalTorneo() {
  const tabla = Object.entries(H.puntos)
    .map(([slot, total]) => ({ slot: Number(slot), nombre: H.nombres[slot], total }))
    .sort((a, b) => b.total - a.total);
  const ultimo = tabla[tabla.length - 1];
  const burla = tabla.length > 1 ? { nombre: ultimo.nombre, texto: burlaPerder(ultimo.nombre.toLowerCase()) } : null;
  H.enCurso = false;
  emitir({ t: "fase", fase: "final", tabla, burla });
  anunciarSala();
}

function volverASala() {
  H.timeouts.forEach(clearTimeout);
  H.timeouts = [];
  emitir({ t: "fase", fase: "sala" });
}

// ---------------------------------------------------------------------
//  Interfaz de la sala de espera
// ---------------------------------------------------------------------
function mostrarEstadoSala(texto, error = false) {
  const el = $("sala-estado");
  el.textContent = texto;
  el.classList.toggle("error", error);
  $("btn-reintentar").hidden = !error;
}

function pintarSala(enCurso) {
  const host = sala.find((p) => p.slot === 0) || sala[0];
  $("lista-jugadores").innerHTML = [0, 1, 2, 3].map((slot) => {
    const p = sala.find((x) => x.slot === slot);
    if (!p) return `<li class="vacio"><span class="punto-color"></span>Esperando jugador…</li>`;
    return `<li class="${p.slot === miSlot ? "yo" : ""}">
      <span class="punto-color" style="background:${COLORES[slot]}"></span>
      <span class="tabla-nombre">${p.nombre}${p.slot === miSlot ? " (tú)" : ""}</span>
      ${p.pid === SALA_ID ? `<span class="corona">👑 Anfitrión</span>` : ""}
    </li>`;
  }).join("");

  const soyHost = red.esHost;
  $("panel-host").hidden = !soyHost;
  $("btn-iniciar").disabled = enCurso;
  if (soyHost) {
    mostrarEstadoSala(sala.length < 2
      ? "Eres el anfitrión. Espera a tus amigos (o inicia solo para probar)."
      : `Eres el anfitrión. ${sala.length} de 4 jugadores conectados.`);
  } else {
    mostrarEstadoSala(enCurso
      ? "Hay una partida en curso. Entrarás en la siguiente."
      : `Esperando a que ${host ? host.nombre : "el anfitrión"} inicie los minijuegos…`);
  }
}

function pintarListaJuegos() {
  $("lista-juegos").innerHTML = Object.values(MINIJUEGOS).map((j) => `
    <button class="chip-juego" data-juego="${j.id}">
      <span class="chip-kanji">${j.kanji}</span>${j.nombre}
    </button>`).join("");
  $("lista-juegos").addEventListener("click", (e) => {
    const b = e.target.closest("[data-juego]");
    if (b) iniciarTorneo([b.dataset.juego]);
  });
}

$("btn-iniciar").addEventListener("click", () => {
  const ids = Object.keys(MINIJUEGOS).sort(() => Math.random() - 0.5).slice(0, JUEGOS_POR_TORNEO);
  iniciarTorneo(ids);
});
$("btn-reintentar").addEventListener("click", () => entrarASala());
$("btn-pantalla").addEventListener("click", pantallaCompleta);
$("hud-salir").addEventListener("click", () => {
  const aviso = red?.esHost
    ? "Eres el anfitrión: si sales, la sala se cierra para todos. ¿Salir?"
    : "¿Salir de la partida?";
  if (confirm(aviso)) { red?.cerrar(); location.href = "inicio.html"; }
});
window.addEventListener("pagehide", () => red?.cerrar());

// ---------------------------------------------------------------------
//  Capa (overlay) de intro / resultados
// ---------------------------------------------------------------------
function mostrarCapa(html) {
  $("capa").innerHTML = `<div class="capa-caja">${html}</div>`;
  $("capa").hidden = false;
}
function ocultarCapa() { $("capa").hidden = true; }

// ---------------------------------------------------------------------
//  Teléfono: pantalla completa, horizontal y pantalla siempre encendida
// ---------------------------------------------------------------------
async function pantallaCompleta() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
    await screen.orientation?.lock?.("landscape");
  } catch {}
}

let candado = null;
async function mantenerPantallaEncendida() {
  try { if (!candado) candado = await navigator.wakeLock?.request("screen"); } catch {}
  candado?.addEventListener?.("release", () => { candado = null; });
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && document.body.classList.contains("jugando")) mantenerPantallaEncendida();
});

// ---------------------------------------------------------------------
//  Dibujo
// ---------------------------------------------------------------------
const lienzo = $("lienzo");
const ctx = lienzo.getContext("2d", { alpha: false });

function dibujar() {
  requestAnimationFrame(dibujar);
  if (!juegoActual || !interp.curr || $("pantalla-juego").hidden) return;

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = lienzo.clientWidth, h = lienzo.clientHeight;
  if (lienzo.width !== Math.round(w * dpr) || lienzo.height !== Math.round(h * dpr)) {
    lienzo.width = Math.round(w * dpr);
    lienzo.height = Math.round(h * dpr);
  }
  const escala = Math.min(w / ANCHO, h / ALTO);
  const ox = (w - ANCHO * escala) / 2, oy = (h - ALTO * escala) / 2;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.setTransform(escala * dpr, 0, 0, escala * dpr, ox * dpr, oy * dpr);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, ANCHO, ALTO); ctx.clip();
  juegoActual.dibujar(ctx, interp.actual(), miSlot, performance.now() / 1000);
  ctx.restore();

  $("hud-tiempo").textContent = Math.ceil(tiempoRestante);
  $("hud-tiempo").classList.toggle("urgente", tiempoRestante < 10);
}

// ---------------------------------------------------------------------
pintarListaJuegos();
requestAnimationFrame(dibujar);
entrarASala();
