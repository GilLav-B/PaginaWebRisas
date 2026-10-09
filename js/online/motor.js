// =====================================================================
//  Motor compartido de los minijuegos online: constantes, física,
//  interpolación y utilidades de dibujo.
//  Todos los juegos usan un mundo lógico de 800 × 450 (16:9).
// =====================================================================

const ANCHO = 800;
const ALTO = 450;
const COLORES = ["#05d9e8", "#ff2a6d", "#f5c542", "#39ff88"];
const ENTRADA_VACIA = { x: 0, y: 0, a: false, pulso: false, suelta: false };

const MINIJUEGOS = {};
function registrarJuego(juego) {
  MINIJUEGOS[juego.id] = { duracion: 60, ...juego };
}

// ---------- Matemáticas ----------
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const aleatorio = (a, b) => a + Math.random() * (b - a);
const entrada = (ent, id) => ent[id] || ENTRADA_VACIA;

function normalizarAngulo(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function posicionesEnCirculo(n, cx, cy, r) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI * 0.75;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}

// Datos base de un jugador dentro del estado de un juego.
function jugadorBase(j, x, y, r = 15) {
  return { id: j.id, nombre: j.nombre, color: j.color, x, y, vx: 0, vy: 0, r, vivo: true };
}

function porCadaPar(lista, fn) {
  for (let i = 0; i < lista.length; i++)
    for (let k = i + 1; k < lista.length; k++) fn(lista[i], lista[k]);
}

// Choque entre dos círculos con masa (m, por defecto 1). Rebote > 1 = más caos.
function chocarCirculos(a, b, rebote = 1) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.hypot(dx, dy), min = a.r + b.r;
  if (d === 0 || d >= min) return false;
  const nx = dx / d, ny = dy / d;
  const ma = a.m || 1, mb = b.m || 1, total = ma + mb;
  const solape = min - d;
  a.x -= nx * solape * (mb / total); a.y -= ny * solape * (mb / total);
  b.x += nx * solape * (ma / total); b.y += ny * solape * (ma / total);
  const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rv < 0) {
    const imp = (-(1 + rebote) * rv) / (1 / ma + 1 / mb);
    a.vx -= (imp / ma) * nx; a.vy -= (imp / ma) * ny;
    b.vx += (imp / mb) * nx; b.vy += (imp / mb) * ny;
  }
  return true;
}

// Saca un círculo de un rectángulo. Devuelve true si chocó.
function circuloVsRect(c, r) {
  const px = limitar(c.x, r.x, r.x + r.w), py = limitar(c.y, r.y, r.y + r.h);
  const dx = c.x - px, dy = c.y - py, d = Math.hypot(dx, dy);
  if (d >= c.r) return false;
  if (d === 0) {
    const izq = c.x - r.x, der = r.x + r.w - c.x, arr = c.y - r.y, aba = r.y + r.h - c.y;
    const m = Math.min(izq, der, arr, aba);
    if (m === izq) c.x = r.x - c.r; else if (m === der) c.x = r.x + r.w + c.r;
    else if (m === arr) c.y = r.y - c.r; else c.y = r.y + r.h + c.r;
    return true;
  }
  c.x = px + (dx / d) * c.r;
  c.y = py + (dy / d) * c.r;
  return true;
}

// Mantiene un círculo dentro de un rectángulo, rebotando.
function encerrar(c, x0, y0, x1, y1, rebote = 0.5) {
  if (c.x < x0 + c.r) { c.x = x0 + c.r; c.vx = Math.abs(c.vx) * rebote; }
  if (c.x > x1 - c.r) { c.x = x1 - c.r; c.vx = -Math.abs(c.vx) * rebote; }
  if (c.y < y0 + c.r) { c.y = y0 + c.r; c.vy = Math.abs(c.vy) * rebote; }
  if (c.y > y1 - c.r) { c.y = y1 - c.r; c.vy = -Math.abs(c.vy) * rebote; }
}

// Movimiento "arcade": la velocidad se acerca a la que pide el joystick.
function moverDirecto(j, e, velocidad, dt, suavidad = 12) {
  const k = 1 - Math.exp(-suavidad * dt);
  j.vx += (e.x * velocidad - j.vx) * k;
  j.vy += (e.y * velocidad - j.vy) * k;
  j.x += j.vx * dt;
  j.y += j.vy * dt;
}

function limitarVelocidad(c, max) {
  const v = Math.hypot(c.vx, c.vy);
  if (v > max) { c.vx *= max / v; c.vy *= max / v; }
}

// Dirección a la que "mira" un jugador: el joystick o, si está suelto, su velocidad.
function direccion(j, e) {
  let dx = e.x, dy = e.y;
  if (Math.hypot(dx, dy) < 0.2) { dx = j.vx; dy = j.vy; }
  const m = Math.hypot(dx, dy);
  return m < 0.01 ? { x: 1, y: 0 } : { x: dx / m, y: dy / m };
}

// Ranking para juegos de eliminación: vivos primero (por `criterio`),
// luego los eliminados del último al primero en caer.
function rankingEliminacion(s, criterio = () => 0) {
  const vivos = s.jugadores.filter((j) => j.vivo).sort((a, b) => criterio(b) - criterio(a));
  const caidos = [...s.muertes].reverse();
  return [...vivos.map((j) => j.id), ...caidos];
}

function quedaUnoVivo(s) {
  const vivos = s.jugadores.filter((j) => j.vivo).length;
  return s.jugadores.length > 1 ? vivos <= 1 : vivos === 0;
}

function eliminar(s, j) {
  if (!j.vivo) return;
  j.vivo = false;
  s.muertes.push(j.id);
}

// ---------- Serialización compacta ----------
// Redondea números a 1 decimal y omite claves que empiezan con "_" (solo del anfitrión).
function serializar(obj) {
  return JSON.stringify(obj, (k, v) => {
    if (k[0] === "_") return undefined;
    return typeof v === "number" ? Math.round(v * 10) / 10 : v;
  });
}

// ---------- Interpolación con búfer ----------
// Cada foto del estado trae el número de tick del anfitrión (30 por segundo).
// Se dibuja un poco "en el pasado" (retraso) para tener siempre dos fotos entre
// las cuales interpolar, aunque la red llegue a tirones o desordenada.
const TICK_MS = 1000 / 30;

class Interpolador {
  constructor(retrasoMs) { this.retraso = retrasoMs; this.reiniciar(); }
  reiniciar() { this.fotos = []; this.base = null; this.recibido = 0; }

  // Foto más reciente y cuándo llegó.
  get curr() { return this.fotos.length ? this.fotos[this.fotos.length - 1].s : null; }

  empujar(s, k) {
    const ahora = performance.now();
    const f = this.fotos;
    if (f.length && k <= f[f.length - 1].k) {
      if (f.some((x) => x.k === k)) return false;
      f.push({ k, s });
      f.sort((a, b) => a.k - b.k); // llegó desordenada
    } else {
      f.push({ k, s });
      this.recibido = ahora;
    }
    // Reloj del anfitrión estimado: el mínimo filtra los paquetes que llegaron tarde;
    // la pequeña deriva hacia arriba se adapta si la red se vuelve más lenta.
    const estimado = ahora - k * TICK_MS;
    this.base = this.base === null ? estimado : Math.min(this.base + 0.3, estimado);
    while (f.length > 30) f.shift();
    return k === f[f.length - 1].k;
  }

  actual() {
    const f = this.fotos;
    if (!f.length) return null;
    const kr = (performance.now() - this.base - this.retraso) / TICK_MS;
    if (kr >= f[f.length - 1].k) return f[f.length - 1].s;
    if (kr <= f[0].k) return f[0].s;
    for (let i = f.length - 2; i >= 0; i--) {
      if (f[i].k <= kr) {
        const a = f[i], b = f[i + 1];
        return mezclarEstados(a.s, b.s, (kr - a.k) / (b.k - a.k));
      }
    }
    return f[f.length - 1].s;
  }
}

function mezclarEstados(a, b, k) {
  const out = { ...b };
  for (const clave in b) {
    const lb = b[clave], la = a[clave];
    if (!Array.isArray(lb) || !Array.isArray(la)) continue;
    const previos = new Map();
    la.forEach((o) => o && typeof o === "object" && "id" in o && previos.set(o.id, o));
    out[clave] = lb.map((o) => {
      const p = o && typeof o === "object" ? previos.get(o.id) : null;
      if (!p) return o;
      const m = { ...o };
      for (const c of ["x", "y", "pos"]) {
        if (typeof o[c] !== "number" || typeof p[c] !== "number") continue;
        if (Math.abs(o[c] - p[c]) > 120) return o; // teletransporte: no interpolar
        m[c] = p[c] + (o[c] - p[c]) * k;
      }
      if (typeof o.ang === "number" && typeof p.ang === "number")
        m.ang = p.ang + normalizarAngulo(o.ang - p.ang) * k;
      return m;
    });
  }
  return out;
}

// ---------- Dibujo ----------
function circulo(ctx, x, y, r, relleno, borde, grosor = 2) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
  if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = grosor; ctx.stroke(); }
}

function fondoCiudad(ctx, color = "#07040f") {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.strokeStyle = "rgba(5, 217, 232, 0.07)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= ANCHO; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, ALTO); }
  for (let y = 0; y <= ALTO; y += 40) { ctx.moveTo(0, y); ctx.lineTo(ANCHO, y); }
  ctx.stroke();
}

function marcoNeon(ctx, x, y, w, h, color = "#ff2a6d") {
  ctx.strokeStyle = color + "55"; ctx.lineWidth = 8; ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
}

function dibujarJugador(ctx, j, esYo, opc = {}) {
  const r = j.r * (opc.escala || 1);
  ctx.save();
  ctx.globalAlpha = opc.alpha ?? 1;
  if (opc.sombra) circulo(ctx, j.x + 4, j.y + 8, j.r * 0.9, "rgba(0,0,0,0.45)");
  circulo(ctx, j.x, j.y, r + 6, j.color + "30");
  circulo(ctx, j.x, j.y, r, j.color, "#ffffff", esYo ? 3 : 0.001);
  ctx.fillStyle = "#07040f";
  ctx.font = `bold ${Math.round(r * 1.05)}px Orbitron, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(j.nombre[0], j.x, j.y + 1);
  ctx.font = "bold 11px 'Share Tech Mono', monospace";
  ctx.fillStyle = esYo ? "#ffffff" : j.color;
  ctx.fillText(esYo ? "TÚ" : j.nombre, j.x, j.y - r - 10);
  ctx.restore();
}

// Fila de chips arriba a la izquierda: "G 3  D 1 ..."
function dibujarMarcador(ctx, jugadores, valor) {
  ctx.save();
  ctx.font = "bold 13px 'Share Tech Mono', monospace";
  ctx.textBaseline = "middle";
  let x = 10;
  for (const j of jugadores) {
    const texto = `${j.nombre.slice(0, 3).toUpperCase()} ${valor(j)}`;
    const w = ctx.measureText(texto).width + 16;
    ctx.fillStyle = "rgba(7,4,15,0.75)";
    ctx.fillRect(x, 8, w, 22);
    ctx.fillStyle = j.vivo === false ? "#5d5577" : j.color;
    ctx.fillRect(x, 8, 3, 22);
    ctx.fillText(texto, x + 9, 19);
    x += w + 6;
  }
  ctx.restore();
}

// Anillo de recarga alrededor del jugador (0 = listo, 1 = recién usado).
function anilloRecarga(ctx, j, fraccion) {
  if (fraccion <= 0) return;
  ctx.beginPath();
  ctx.arc(j.x, j.y, j.r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraccion);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.stroke();
}
