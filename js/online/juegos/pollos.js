// 5. Captura el Pollo (Chicken Run): pollos erráticos y escudo para robar pollos.
registrarJuego({
  id: "pollos",
  nombre: "Captura el Pollo",
  kanji: "鶏",
  boton: "ESCUDO",
  ayuda: "Pasa encima de los pollos para atraparlos. A = escudo: si chocas a alguien con él, le robas un pollo.",

  crear(jugadores) {
    const pos = posicionesEnCirculo(jugadores.length, 400, 235, 150);
    const s = {
      sig: 0,
      pollos: [],
      jugadores: jugadores.map((j, i) => ({ ...jugadorBase(j, pos[i].x, pos[i].y, 15), pollos: 0, escudo: 0, cd: 0, robo: false })),
    };
    for (let i = 0; i < 7; i++) s.pollos.push(this._nuevoPollo(s));
    return s;
  },

  _nuevoPollo(s) {
    let x, y, intentos = 0;
    do {
      x = aleatorio(60, 740); y = aleatorio(70, 410);
    } while (intentos++ < 20 && s.jugadores.some((j) => Math.hypot(j.x - x, j.y - y) < 140));
    return { id: s.sig++, x, y, vx: 0, vy: 0, _giro: 0 };
  },

  mover(j, e, dt) {
    moverDirecto(j, e, 200, dt, 7);
    encerrar(j, 20, 40, 780, 430, 0.6);
  },

  paso(s, ent, dt) {
    for (const j of s.jugadores) {
      const e = entrada(ent, j.id);
      j.cd = Math.max(0, j.cd - dt);
      j.escudo = Math.max(0, j.escudo - dt);
      if (e.pulso && j.cd === 0) { j.escudo = 1; j.cd = 3; j.robo = false; }
      this.mover(j, e, dt);
    }

    porCadaPar(s.jugadores, (a, b) => {
      if (!chocarCirculos(a, b, 1.2)) return;
      for (const [atacante, victima] of [[a, b], [b, a]]) {
        if (atacante.escudo > 0 && !atacante.robo && victima.escudo === 0) {
          atacante.robo = true;
          if (victima.pollos > 0) { victima.pollos--; atacante.pollos++; }
          const d = Math.hypot(victima.x - atacante.x, victima.y - atacante.y) || 1;
          victima.vx += ((victima.x - atacante.x) / d) * 380;
          victima.vy += ((victima.y - atacante.y) / d) * 380;
        }
      }
    });

    for (let i = 0; i < s.pollos.length; i++) {
      const p = s.pollos[i];
      p._giro -= dt;
      const cerca = s.jugadores.reduce((m, j) => (distancia(j, p) < (m ? distancia(m, p) : 130) ? j : m), null);
      if (cerca) {
        const d = distancia(cerca, p) || 1;
        p.vx = ((p.x - cerca.x) / d) * 165 + aleatorio(-60, 60);
        p.vy = ((p.y - cerca.y) / d) * 165 + aleatorio(-60, 60);
      } else if (p._giro <= 0) {
        const a = aleatorio(0, Math.PI * 2), v = aleatorio(40, 120);
        p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v;
        p._giro = aleatorio(0.3, 1.1);
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const c = { x: p.x, y: p.y, r: 10, vx: p.vx, vy: p.vy };
      encerrar(c, 20, 40, 780, 430, 1);
      Object.assign(p, { x: c.x, y: c.y, vx: c.vx, vy: c.vy });

      const atrapador = s.jugadores.find((j) => distancia(j, p) < j.r + 10);
      if (atrapador) { atrapador.pollos++; s.pollos[i] = this._nuevoPollo(s); }
    }
  },

  terminado: () => false,
  ranking: (s) => [...s.jugadores].sort((a, b) => b.pollos - a.pollos).map((j) => j.id),

  dibujar(ctx, s, yo) {
    fondoCiudad(ctx, "#0b1408");
    marcoNeon(ctx, 20, 40, 760, 390, "#39ff88");
    ctx.font = "24px serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const p of s.pollos) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.vx < 0) ctx.scale(-1, 1);
      ctx.fillText("🐔", 0, 0);
      ctx.restore();
    }
    for (const j of s.jugadores) {
      if (j.escudo > 0) circulo(ctx, j.x, j.y, j.r + 10, "rgba(5,217,232,0.25)", "#05d9e8", 2);
      dibujarJugador(ctx, j, j.id === yo);
      if (j.id === yo) anilloRecarga(ctx, j, j.cd / 3);
    }
    dibujarMarcador(ctx, s.jugadores, (j) => `🐔${j.pollos}`);
  },
});
