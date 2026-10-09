// 2. Cancha Caótica (Micro Soccer): equipos alternados, balón elástico y patada en área.
const CANCHA = { x0: 30, y0: 40, x1: 770, y1: 430, porteria: 140 };

registrarJuego({
  id: "futbol",
  nombre: "Cancha Caótica",
  kanji: "蹴",
  boton: "PATEAR",
  ayuda: "Equipos: cian contra magenta. A = patada fuerte si el balón está cerca. Mete más goles en 60 s.",

  crear(jugadores) {
    const s = {
      goles: [0, 0],
      pausa: 0,
      ultimo: null,
      jugadores: jugadores.map((j, i) => ({ ...jugadorBase(j, 0, 0, 16), equipo: i % 2, anotados: 0, cd: 0, patada: 0 })),
      balon: { id: "b", x: 400, y: 235, vx: 0, vy: 0, r: 11, m: 0.35 },
    };
    this._colocar(s);
    return s;
  },

  _colocar(s) {
    const porEquipo = [0, 0];
    for (const j of s.jugadores) {
      const k = porEquipo[j.equipo]++;
      j.x = j.equipo === 0 ? 230 - k * 70 : 570 + k * 70;
      j.y = [235, 150, 320][k] ?? 235;
      j.vx = j.vy = 0;
    }
    Object.assign(s.balon, { x: 400, y: 235, vx: 0, vy: 0 });
  },

  paso(s, ent, dt) {
    if (s.pausa > 0) {
      s.pausa -= dt;
      if (s.pausa <= 0) this._colocar(s);
      return;
    }
    const b = s.balon;
    for (const j of s.jugadores) {
      const e = entrada(ent, j.id);
      j.cd = Math.max(0, j.cd - dt);
      j.patada = Math.max(0, j.patada - dt);
      moverDirecto(j, e, 210, dt, 8);
      encerrar(j, CANCHA.x0, CANCHA.y0, CANCHA.x1, CANCHA.y1, 0.3);
      if (e.pulso && j.cd === 0) {
        j.cd = 0.45; j.patada = 0.2;
        const d = distancia(j, b);
        if (d < j.r + b.r + 30) {
          const nx = (b.x - j.x) / (d || 1), ny = (b.y - j.y) / (d || 1);
          b.vx = nx * 520 + j.vx * 0.5;
          b.vy = ny * 520 + j.vy * 0.5;
          s.ultimo = j.id;
        }
      }
    }
    porCadaPar(s.jugadores, (a, c) => chocarCirculos(a, c, 0.6));
    for (const j of s.jugadores) if (chocarCirculos(j, b, 0.9)) s.ultimo = j.id;

    const f = Math.pow(0.55, dt);
    b.vx *= f; b.vy *= f;
    limitarVelocidad(b, 700);
    b.x += b.vx * dt; b.y += b.vy * dt;

    const enPorteria = Math.abs(b.y - 235) < CANCHA.porteria / 2;
    if (b.y < CANCHA.y0 + b.r) { b.y = CANCHA.y0 + b.r; b.vy = Math.abs(b.vy) * 0.85; }
    if (b.y > CANCHA.y1 - b.r) { b.y = CANCHA.y1 - b.r; b.vy = -Math.abs(b.vy) * 0.85; }
    if (!enPorteria) {
      if (b.x < CANCHA.x0 + b.r) { b.x = CANCHA.x0 + b.r; b.vx = Math.abs(b.vx) * 0.85; }
      if (b.x > CANCHA.x1 - b.r) { b.x = CANCHA.x1 - b.r; b.vx = -Math.abs(b.vx) * 0.85; }
    } else if (b.x < CANCHA.x0 - 4 || b.x > CANCHA.x1 + 4) {
      const equipo = b.x < CANCHA.x0 ? 1 : 0; // gol en la izquierda = punto del equipo 1
      s.goles[equipo]++;
      const autor = s.jugadores.find((j) => j.id === s.ultimo);
      if (autor && autor.equipo === equipo) autor.anotados++;
      s.pausa = 1.3;
      b.vx = b.vy = 0;
    }
  },

  terminado: () => false,
  ranking(s) {
    return [...s.jugadores]
      .sort((a, b) => s.goles[b.equipo] - s.goles[a.equipo] || b.anotados - a.anotados)
      .map((j) => j.id);
  },

  dibujar(ctx, s, yo) {
    const { x0, y0, x1, y1, porteria } = CANCHA;
    ctx.fillStyle = "#061a14";
    ctx.fillRect(0, 0, ANCHO, ALTO);
    for (let x = x0; x < x1; x += 74) {
      ctx.fillStyle = (x / 74) % 2 < 1 ? "rgba(57,255,136,0.04)" : "rgba(0,0,0,0)";
      ctx.fillRect(x, y0, 74, y1 - y0);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.beginPath(); ctx.moveTo(400, y0); ctx.lineTo(400, y1); ctx.stroke();
    circulo(ctx, 400, 235, 55, null, "rgba(255,255,255,0.5)", 2);

    const pm = 235 - porteria / 2;
    ctx.fillStyle = "rgba(5,217,232,0.35)";
    ctx.fillRect(x0 - 22, pm, 22, porteria);
    ctx.fillStyle = "rgba(255,42,109,0.35)";
    ctx.fillRect(x1, pm, 22, porteria);

    for (const j of s.jugadores) {
      circulo(ctx, j.x, j.y, j.r + 4, null, j.equipo === 0 ? "#05d9e8" : "#ff2a6d", 3);
      if (j.patada > 0) circulo(ctx, j.x, j.y, j.r + 30, "rgba(255,255,255,0.12)");
      dibujarJugador(ctx, j, j.id === yo);
    }
    const b = s.balon;
    circulo(ctx, b.x + 3, b.y + 5, b.r, "rgba(0,0,0,0.4)");
    circulo(ctx, b.x, b.y, b.r, "#ffffff", "#07040f", 2);

    ctx.font = "bold 22px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#05d9e8"; ctx.textAlign = "right"; ctx.fillText(s.goles[0], 705, 26);
    ctx.textAlign = "center"; ctx.fillStyle = "#ffffff"; ctx.fillText("–", 725, 26);
    ctx.textAlign = "left"; ctx.fillStyle = "#ff2a6d"; ctx.fillText(s.goles[1], 745, 26);
    ctx.textAlign = "center";
    if (s.pausa > 0) {
      ctx.font = "bold 64px Orbitron, sans-serif";
      ctx.fillStyle = "#f5c542";
      ctx.fillText("¡GOOOL!", 400, 240);
    }
  },
});
