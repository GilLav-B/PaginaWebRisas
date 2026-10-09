// 4. Suelo de Lava (Hex-A-Gone): las baldosas que pisas parpadean y caen en 1 s.
const LAVA_COLS = 16, LAVA_FILAS = 9, LAVA_TAM = 50;

registrarJuego({
  id: "lava",
  nombre: "Suelo de Lava",
  kanji: "炎",
  boton: "SALTAR",
  ayuda: "Cada baldosa que pisas se cae en 1 segundo. A = saltar una baldosa. No caigas a la lava.",

  crear(jugadores) {
    const inicio = [[3, 2], [12, 6], [12, 2], [3, 6]];
    return {
      t: 0,
      muertes: [],
      // '#' firme, '!' a punto de caer, ' ' ya no existe
      mapa: "#".repeat(LAVA_COLS * LAVA_FILAS),
      _timers: new Array(LAVA_COLS * LAVA_FILAS).fill(-1),
      jugadores: jugadores.map((j, i) => ({
        ...jugadorBase(j, inicio[i][0] * LAVA_TAM + 25, inicio[i][1] * LAVA_TAM + 25, 12),
        salto: 0, cd: 0,
      })),
    };
  },

  mover(j, e, dt) {
    moverDirecto(j, e, j.salto > 0 ? 210 : 150, dt, j.salto > 0 ? 3 : 12);
    encerrar(j, 0, 0, ANCHO, ALTO, 0);
  },

  paso(s, ent, dt) {
    s.t += dt;
    const mapa = s.mapa.split("");
    for (let i = 0; i < s._timers.length; i++) {
      if (s._timers[i] < 0) continue;
      s._timers[i] += dt;
      if (s._timers[i] >= 1) { mapa[i] = " "; s._timers[i] = -2; }
    }

    for (const j of s.jugadores) {
      if (!j.vivo) continue;
      const e = entrada(ent, j.id);
      j.cd = Math.max(0, j.cd - dt);
      j.salto = Math.max(0, j.salto - dt);
      if (e.pulso && j.cd === 0 && j.salto === 0) { j.salto = 0.5; j.cd = 0.75; }
      this.mover(j, e, dt);
      if (j.salto > 0) continue;

      const col = Math.floor(j.x / LAVA_TAM), fila = Math.floor(j.y / LAVA_TAM);
      const i = fila * LAVA_COLS + col;
      if (mapa[i] === " ") { eliminar(s, j); continue; }
      // 1.5 s de gracia al inicio para que todos alcancen a moverse
      if (mapa[i] === "#" && s.t > 1.5) { mapa[i] = "!"; s._timers[i] = 0; }
    }
    porCadaPar(s.jugadores.filter((j) => j.vivo && j.salto === 0), (a, b) => chocarCirculos(a, b, 0.5));
    s.mapa = mapa.join("");
  },

  terminado: quedaUnoVivo,
  ranking: (s) => rankingEliminacion(s),

  dibujar(ctx, s, yo, t) {
    const g = ctx.createLinearGradient(0, 0, 0, ALTO);
    g.addColorStop(0, "#ff4d00");
    g.addColorStop(0.5 + Math.sin(t * 2) * 0.1, "#b3001b");
    g.addColorStop(1, "#ff8a00");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ANCHO, ALTO);

    for (let i = 0; i < s.mapa.length; i++) {
      const c = s.mapa[i];
      if (c === " ") continue;
      const x = (i % LAVA_COLS) * LAVA_TAM, y = Math.floor(i / LAVA_COLS) * LAVA_TAM;
      const aviso = c === "!";
      ctx.fillStyle = aviso ? (Math.floor(t * 12) % 2 ? "#5a1530" : "#2a0f3d") : "#160b2c";
      ctx.fillRect(x + 3, y + 3, LAVA_TAM - 6, LAVA_TAM - 6);
      ctx.strokeStyle = aviso ? "#f5c542" : "rgba(5,217,232,0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, y + 3, LAVA_TAM - 6, LAVA_TAM - 6);
    }
    for (const j of s.jugadores) {
      if (!j.vivo) continue;
      const altura = j.salto > 0 ? Math.sin((j.salto / 0.5) * Math.PI) : 0;
      dibujarJugador(ctx, j, j.id === yo, { escala: 1 + altura * 0.5, sombra: altura > 0 });
    }
    dibujarMarcador(ctx, s.jugadores, (j) => (j.vivo ? "●" : "✕"));
  },
});
