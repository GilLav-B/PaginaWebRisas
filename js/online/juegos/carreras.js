// 6. Micro Carreras (Retro Racers): pista ovalada, derrape y nitro que se recarga en boxes.
const PISTA = { cx: 400, cy: 235, ext: [375, 195], int: [225, 80] };
const VUELTAS = 3;

function enElipse(x, y, [a, b]) {
  const dx = (x - PISTA.cx) / a, dy = (y - PISTA.cy) / b;
  return dx * dx + dy * dy;
}
const anguloPista = (x, y) => Math.atan2((y - PISTA.cy) / 137, (x - PISTA.cx) / 300);

registrarJuego({
  id: "carreras",
  nombre: "Micro Carreras",
  kanji: "走",
  boton: "NITRO",
  ayuda: "El joystick marca hacia dónde girar y acelerar. A = nitro. Recarga nitro en la zona dorada de abajo. 3 vueltas.",

  crear(jugadores) {
    const salida = [[375, 70], [375, 105], [335, 70], [335, 105]];
    return {
      llegadas: [],
      jugadores: jugadores.map((j, i) => {
        const [x, y] = salida[i];
        return { ...jugadorBase(j, x, y, 11), ang: 0, nitro: 1, turbo: 0, prog: 0, _ultimoAng: anguloPista(x, y), vuelta: 1, fin: false };
      }),
    };
  },

  paso(s, ent, dt) {
    for (const c of s.jugadores) {
      const e = entrada(ent, c.id);
      c.turbo = Math.max(0, c.turbo - dt);
      if (e.pulso && c.nitro >= 0.33 && c.turbo === 0) { c.nitro -= 0.33; c.turbo = 1; }

      const fuerza = Math.hypot(e.x, e.y);
      if (fuerza > 0.2 && !c.fin) {
        c.ang += normalizarAngulo(Math.atan2(e.y, e.x) - c.ang) * Math.min(1, dt * 4.5);
        const acel = 300 * Math.min(1, fuerza) * (c.turbo > 0 ? 1.9 : 1);
        c.vx += Math.cos(c.ang) * acel * dt;
        c.vy += Math.sin(c.ang) * acel * dt;
      }
      // Derrape: la velocidad lateral se pierde poco a poco
      const fx = Math.cos(c.ang), fy = Math.sin(c.ang);
      const adelante = c.vx * fx + c.vy * fy;
      const lado = -c.vx * fy + c.vy * fx;
      const pasto = enElipse(c.x, c.y, PISTA.int) < 1;
      const fAdelante = adelante * Math.pow(pasto ? 0.12 : 0.6, dt);
      const fLado = lado * Math.pow(0.08, dt);
      c.vx = fx * fAdelante - fy * fLado;
      c.vy = fy * fAdelante + fx * fLado;
      limitarVelocidad(c, c.turbo > 0 ? 380 : 270);
      c.x += c.vx * dt; c.y += c.vy * dt;

      // Muro exterior
      const k = enElipse(c.x, c.y, PISTA.ext);
      if (k > 1) {
        const f = 1 / Math.sqrt(k);
        c.x = PISTA.cx + (c.x - PISTA.cx) * f * 0.995;
        c.y = PISTA.cy + (c.y - PISTA.cy) * f * 0.995;
        c.vx *= 0.5; c.vy *= 0.5;
      }

      const a = anguloPista(c.x, c.y);
      c.prog += normalizarAngulo(a - c._ultimoAng);
      c._ultimoAng = a;
      if (Math.abs(a - Math.PI / 2) < 0.3) c.nitro = Math.min(1, c.nitro + dt * 0.5);

      c.vuelta = Math.min(VUELTAS, Math.max(1, Math.floor(c.prog / (Math.PI * 2)) + 1));
      if (!c.fin && c.prog >= VUELTAS * Math.PI * 2) { c.fin = true; s.llegadas.push(c.id); }
    }
    porCadaPar(s.jugadores, (a, b) => chocarCirculos(a, b, 0.6));
  },

  terminado: (s) => s.llegadas.length === s.jugadores.length,
  ranking(s) {
    const resto = s.jugadores.filter((c) => !c.fin).sort((a, b) => b.prog - a.prog).map((c) => c.id);
    return [...s.llegadas, ...resto];
  },

  dibujar(ctx, s, yo) {
    ctx.fillStyle = "#08130c";
    ctx.fillRect(0, 0, ANCHO, ALTO);
    const elipse = ([a, b]) => { ctx.beginPath(); ctx.ellipse(PISTA.cx, PISTA.cy, a, b, 0, 0, Math.PI * 2); };

    elipse(PISTA.ext); ctx.fillStyle = "#1a1726"; ctx.fill();
    ctx.strokeStyle = "#ff2a6d"; ctx.lineWidth = 4; ctx.stroke();
    // Zona de nitro (abajo)
    ctx.beginPath();
    ctx.ellipse(PISTA.cx, PISTA.cy, 300, 137, 0, Math.PI / 2 - 0.3, Math.PI / 2 + 0.3);
    ctx.strokeStyle = "rgba(245,197,66,0.45)"; ctx.lineWidth = 100; ctx.stroke();
    elipse(PISTA.int); ctx.fillStyle = "#0c2414"; ctx.fill();
    ctx.strokeStyle = "#05d9e8"; ctx.lineWidth = 4; ctx.stroke();
    ctx.setLineDash([14, 12]);
    elipse([300, 137]); ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.setLineDash([]);

    // Meta a cuadros
    for (let y = PISTA.cy - PISTA.ext[1]; y < PISTA.cy - PISTA.int[1]; y += 8)
      for (let x = 0; x < 2; x++) {
        ctx.fillStyle = (Math.floor(y / 8) + x) % 2 ? "#fff" : "#000";
        ctx.fillRect(398 + x * 8, y, 8, 8);
      }
    ctx.fillStyle = "rgba(245,197,66,0.9)";
    ctx.font = "bold 14px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("NITRO", PISTA.cx, PISTA.cy + 137 + 5);

    for (const c of s.jugadores) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.ang);
      if (c.turbo > 0) { ctx.fillStyle = "#f5c542"; ctx.fillRect(-22, -4, 10, 8); }
      ctx.fillStyle = c.color;
      ctx.fillRect(-13, -8, 26, 16);
      ctx.fillStyle = "#07040f";
      ctx.fillRect(2, -6, 7, 12);
      ctx.restore();
      ctx.font = "bold 11px 'Share Tech Mono', monospace";
      ctx.fillStyle = c.id === yo ? "#fff" : c.color;
      ctx.fillText(c.id === yo ? "TÚ" : c.nombre, c.x, c.y - 18);
      if (c.id === yo) {
        ctx.fillStyle = "rgba(7,4,15,0.8)"; ctx.fillRect(c.x - 18, c.y + 14, 36, 5);
        ctx.fillStyle = "#f5c542"; ctx.fillRect(c.x - 18, c.y + 14, 36 * c.nitro, 5);
      }
    }
    dibujarMarcador(ctx, s.jugadores, (c) => (c.fin ? "🏁" : `V${c.vuelta}/${VUELTAS}`));
  },
});
