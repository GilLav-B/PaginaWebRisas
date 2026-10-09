// 3. Batalla de Tanques (Tank Arena): laberinto, torreta automática y balas que rebotan 2 veces.
const MAPA_TANQUES = [
  { x: 180, y: 90, w: 20, h: 120 },
  { x: 600, y: 240, w: 20, h: 120 },
  { x: 300, y: 215, w: 200, h: 20 },
  { x: 390, y: 60, w: 20, h: 90 },
  { x: 390, y: 300, w: 20, h: 90 },
  { x: 110, y: 320, w: 130, h: 20 },
  { x: 560, y: 110, w: 130, h: 20 },
];
const BORDE_T = { x0: 15, y0: 15, x1: 785, y1: 435 };

registrarJuego({
  id: "tanques",
  nombre: "Batalla de Tanques",
  kanji: "砲",
  boton: "DISPARAR",
  ayuda: "La torreta apunta hacia donde te mueves. A = disparar. Las balas rebotan 2 veces… y también te pegan a ti.",

  crear(jugadores) {
    const esquinas = [[60, 60], [740, 390], [740, 60], [60, 390]];
    return {
      sig: 0,
      muertes: [],
      balas: [],
      jugadores: jugadores.map((j, i) => ({
        ...jugadorBase(j, esquinas[i][0], esquinas[i][1], 14),
        ang: i % 2 === 0 ? 0 : Math.PI, vida: 3, inv: 0, cd: 0,
      })),
    };
  },

  mover(j, e, dt) {
    moverDirecto(j, e, 135, dt, 14);
    if (Math.hypot(e.x, e.y) > 0.25) {
      j.ang += normalizarAngulo(Math.atan2(e.y, e.x) - j.ang) * Math.min(1, dt * 12);
    }
    for (const m of MAPA_TANQUES) circuloVsRect(j, m);
    encerrar(j, BORDE_T.x0, BORDE_T.y0, BORDE_T.x1, BORDE_T.y1, 0);
  },

  paso(s, ent, dt) {
    for (const j of s.jugadores) {
      if (!j.vivo) continue;
      const e = entrada(ent, j.id);
      j.cd = Math.max(0, j.cd - dt);
      j.inv = Math.max(0, j.inv - dt);
      this.mover(j, e, dt);

      const propias = s.balas.filter((b) => b.dueno === j.id).length;
      if (e.pulso && j.cd === 0 && propias < 3) {
        j.cd = 0.45;
        const cx = Math.cos(j.ang), cy = Math.sin(j.ang);
        s.balas.push({ id: s.sig++, dueno: j.id, x: j.x + cx * (j.r + 6), y: j.y + cy * (j.r + 6),
                       vx: cx * 310, vy: cy * 310, rebotes: 0, edad: 0 });
      }
    }
    porCadaPar(s.jugadores.filter((j) => j.vivo), (a, b) => chocarCirculos(a, b, 0.2));

    for (const b of s.balas) {
      b.edad += dt;
      const px = b.x, py = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt;
      let reboto = false;
      if (b.x < BORDE_T.x0 || b.x > BORDE_T.x1) { b.vx = -b.vx; b.x = px; reboto = true; }
      if (b.y < BORDE_T.y0 || b.y > BORDE_T.y1) { b.vy = -b.vy; b.y = py; reboto = true; }
      for (const m of MAPA_TANQUES) {
        if (b.x > m.x - 4 && b.x < m.x + m.w + 4 && b.y > m.y - 4 && b.y < m.y + m.h + 4) {
          if (px <= m.x - 4 || px >= m.x + m.w + 4) b.vx = -b.vx; else b.vy = -b.vy;
          b.x = px; b.y = py; reboto = true;
          break;
        }
      }
      if (reboto) b.rebotes++;
      for (const j of s.jugadores) {
        if (!j.vivo || b.muerta) continue;
        if (j.id === b.dueno && b.edad < 0.25) continue;
        if (Math.hypot(j.x - b.x, j.y - b.y) < j.r + 4) {
          b.muerta = true;
          if (j.inv > 0) continue;
          j.vida--; j.inv = 0.6;
          if (j.vida <= 0) eliminar(s, j);
        }
      }
    }
    s.balas = s.balas.filter((b) => !b.muerta && b.rebotes <= 2 && b.edad < 4);
  },

  terminado: quedaUnoVivo,
  ranking: (s) => rankingEliminacion(s, (j) => j.vida),

  dibujar(ctx, s, yo, t) {
    fondoCiudad(ctx, "#0a0714");
    marcoNeon(ctx, BORDE_T.x0, BORDE_T.y0, BORDE_T.x1 - BORDE_T.x0, BORDE_T.y1 - BORDE_T.y0, "#05d9e8");
    for (const m of MAPA_TANQUES) {
      ctx.fillStyle = "#1b1036";
      ctx.fillRect(m.x, m.y, m.w, m.h);
      ctx.strokeStyle = "#ff2a6d";
      ctx.lineWidth = 2;
      ctx.strokeRect(m.x, m.y, m.w, m.h);
    }
    for (const b of s.balas) {
      circulo(ctx, b.x, b.y, 7, "rgba(245,197,66,0.3)");
      circulo(ctx, b.x, b.y, 4, "#f5c542");
    }
    for (const j of s.jugadores) {
      if (!j.vivo) continue;
      const parpadeo = j.inv > 0 && Math.floor(t * 15) % 2 === 0;
      ctx.save();
      ctx.globalAlpha = parpadeo ? 0.35 : 1;
      ctx.translate(j.x, j.y);
      ctx.rotate(j.ang);
      ctx.fillStyle = j.color;
      ctx.fillRect(-j.r, -j.r * 0.8, j.r * 2, j.r * 1.6);
      ctx.fillStyle = "#07040f";
      ctx.fillRect(-j.r, -j.r * 0.8, j.r * 2, 3);
      ctx.fillRect(-j.r, j.r * 0.8 - 3, j.r * 2, 3);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, -2.5, j.r + 9, 5);
      circulo(ctx, 0, 0, 6, "#07040f");
      ctx.restore();
      ctx.font = "bold 11px 'Share Tech Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = j.id === yo ? "#fff" : j.color;
      ctx.fillText(`${j.id === yo ? "TÚ" : j.nombre} ${"♥".repeat(j.vida)}`, j.x, j.y - j.r - 10);
    }
    dibujarMarcador(ctx, s.jugadores, (j) => (j.vivo ? "♥".repeat(j.vida) : "✕"));
  },
});
