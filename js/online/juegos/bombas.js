// 7. Esquiva el Peligro (Bomb Dodge): bombas con círculos de aviso, cada 10 s más rápidas.
registrarJuego({
  id: "bombas",
  nombre: "Esquiva el Peligro",
  kanji: "爆",
  boton: "LANZARSE",
  ayuda: "Sal de los círculos rojos antes de que exploten. A = lanzarte al suelo: inmune medio segundo, pero te quedas quieto.",

  crear(jugadores) {
    const pos = posicionesEnCirculo(jugadores.length, 400, 235, 120);
    return {
      t: 0, sig: 0, _prox: 1.2,
      muertes: [], bombas: [], explosiones: [],
      jugadores: jugadores.map((j, i) => ({ ...jugadorBase(j, pos[i].x, pos[i].y, 14), vidas: 3, inv: 0, buceo: 0, quieto: 0, cd: 0 })),
    };
  },

  mover(j, e, dt) {
    moverDirecto(j, j.quieto > 0 ? ENTRADA_VACIA : e, 175, dt, 12);
    encerrar(j, 20, 40, 780, 430, 0);
  },

  paso(s, ent, dt) {
    s.t += dt;
    const nivel = Math.floor(s.t / 10);
    const aviso = Math.max(0.65, 1.6 * Math.pow(0.85, nivel));

    s._prox -= dt;
    if (s._prox <= 0) {
      s._prox = Math.max(0.25, 0.9 * Math.pow(0.8, nivel));
      const vivos = s.jugadores.filter((j) => j.vivo);
      const objetivo = Math.random() < 0.45 && vivos.length ? azar(vivos) : null;
      const r = aleatorio(40, 75);
      s.bombas.push({
        id: s.sig++, r, t: aviso, total: aviso,
        x: objetivo ? limitar(objetivo.x + aleatorio(-30, 30), 40, 760) : aleatorio(40, 760),
        y: objetivo ? limitar(objetivo.y + aleatorio(-30, 30), 60, 410) : aleatorio(60, 410),
      });
    }

    for (const j of s.jugadores) {
      if (!j.vivo) continue;
      const e = entrada(ent, j.id);
      j.inv = Math.max(0, j.inv - dt);
      j.buceo = Math.max(0, j.buceo - dt);
      j.quieto = Math.max(0, j.quieto - dt);
      j.cd = Math.max(0, j.cd - dt);
      if (e.pulso && j.cd === 0) { j.buceo = 0.5; j.quieto = 0.8; j.cd = 1.8; }
      this.mover(j, e, dt);
    }
    porCadaPar(s.jugadores.filter((j) => j.vivo), (a, b) => chocarCirculos(a, b, 0.4));

    for (const b of s.bombas) {
      b.t -= dt;
      if (b.t > 0) continue;
      s.explosiones.push({ id: b.id, x: b.x, y: b.y, r: b.r, v: 0.4 });
      for (const j of s.jugadores) {
        if (!j.vivo || j.buceo > 0 || j.inv > 0) continue;
        if (Math.hypot(j.x - b.x, j.y - b.y) < b.r + j.r * 0.5) {
          j.vidas--; j.inv = 1.2;
          if (j.vidas <= 0) eliminar(s, j);
        }
      }
    }
    s.bombas = s.bombas.filter((b) => b.t > 0);
    for (const x of s.explosiones) x.v -= dt;
    s.explosiones = s.explosiones.filter((x) => x.v > 0);
  },

  terminado: quedaUnoVivo,
  ranking: (s) => rankingEliminacion(s, (j) => j.vidas),

  dibujar(ctx, s, yo, t) {
    fondoCiudad(ctx, "#0d0610");
    marcoNeon(ctx, 20, 40, 760, 390, "#f5c542");
    for (const b of s.bombas) {
      const p = 1 - b.t / b.total;
      circulo(ctx, b.x, b.y, b.r, `rgba(232,64,44,${0.08 + p * 0.25})`, "#e8402c", 2);
      circulo(ctx, b.x, b.y, b.r * p, "rgba(232,64,44,0.35)");
      ctx.font = "20px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("💣", b.x, b.y);
    }
    for (const x of s.explosiones) {
      const k = x.v / 0.4;
      circulo(ctx, x.x, x.y, x.r * (1.2 - k * 0.2), `rgba(245,197,66,${k * 0.8})`);
      circulo(ctx, x.x, x.y, x.r * 0.6, `rgba(255,255,255,${k * 0.6})`);
    }
    for (const j of s.jugadores) {
      if (!j.vivo) continue;
      const parpadeo = j.inv > 0 && Math.floor(t * 15) % 2 === 0;
      dibujarJugador(ctx, j, j.id === yo, { escala: j.buceo > 0 ? 0.7 : 1, alpha: parpadeo ? 0.35 : 1 });
      if (j.id === yo) anilloRecarga(ctx, j, j.cd / 1.8);
    }
    ctx.font = "bold 14px Orbitron, sans-serif";
    ctx.fillStyle = "#e8402c";
    ctx.textAlign = "right";
    ctx.fillText(`NIVEL ${Math.floor(s.t / 10) + 1}`, 790, 24);
    dibujarMarcador(ctx, s.jugadores, (j) => (j.vivo ? "♥".repeat(j.vidas) : "✕"));
  },
});
