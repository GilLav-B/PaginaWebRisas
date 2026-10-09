// 9. Trampa Láser (Laser Grid): láseres que barren la arena.
//    Rojo (bajo) = salta con un toque rápido de A. Cian (alto) = agáchate manteniendo A.
const TOQUE_MAX = 0.22; // segundos: menos que esto es "toque" (salto); más es "mantener" (agacharse)

registrarJuego({
  id: "laser",
  nombre: "Trampa Láser",
  kanji: "光",
  boton: "SALTO / AGACHE",
  ayuda: "Láser ROJO: toca A para saltarlo. Láser CIAN: mantén A para agacharte. Cada golpe te quita vida.",

  crear(jugadores) {
    const pos = posicionesEnCirculo(jugadores.length, 400, 235, 100);
    return {
      t: 0, sig: 0, _prox: 1,
      muertes: [], laseres: [],
      jugadores: jugadores.map((j, i) => ({
        ...jugadorBase(j, pos[i].x, pos[i].y, 13),
        vida: 100, inv: 0, salto: 0, agachado: false, _presion: -1,
      })),
    };
  },

  mover(j, e, dt) {
    moverDirecto(j, e, j.agachado ? 90 : 175, dt, 12);
    encerrar(j, 20, 40, 780, 430, 0);
  },

  paso(s, ent, dt) {
    s.t += dt;
    s._prox -= dt;
    if (s._prox <= 0) {
      s._prox = Math.max(0.55, 1.5 - s.t * 0.016);
      const eje = Math.random() < 0.5 ? "h" : "v";
      const desdeInicio = Math.random() < 0.5;
      const vel = (130 + s.t * 2.6) * (desdeInicio ? 1 : -1);
      const pos = eje === "h" ? (desdeInicio ? 40 : 430) : (desdeInicio ? 20 : 780);
      s.laseres.push({ id: s.sig++, eje, pos, vel, tipo: Math.random() < 0.5 ? "bajo" : "alto", _tocados: [] });
    }

    for (const j of s.jugadores) {
      if (!j.vivo) continue;
      const e = entrada(ent, j.id);
      j.inv = Math.max(0, j.inv - dt);
      j.salto = Math.max(0, j.salto - dt);

      if (e.pulso) j._presion = 0;
      if (j._presion >= 0) {
        j._presion += dt;
        if (e.suelta || !e.a) {
          if (j._presion < TOQUE_MAX && j.salto === 0) j.salto = 0.55;
          j._presion = -1;
        }
      }
      j.agachado = j._presion >= TOQUE_MAX && j.salto === 0;
      this.mover(j, e, dt);
    }
    porCadaPar(s.jugadores.filter((j) => j.vivo), (a, b) => chocarCirculos(a, b, 0.4));

    for (const l of s.laseres) {
      l.pos += l.vel * dt;
      for (const j of s.jugadores) {
        if (!j.vivo || j.inv > 0 || l._tocados.includes(j.id)) continue;
        const coord = l.eje === "h" ? j.y : j.x;
        if (Math.abs(coord - l.pos) > j.r + 3) continue;
        const esquiva = l.tipo === "bajo" ? j.salto > 0 : j.agachado;
        if (esquiva) continue;
        l._tocados.push(j.id);
        j.vida -= 20; j.inv = 0.5;
        if (j.vida <= 0) { j.vida = 0; eliminar(s, j); }
      }
    }
    s.laseres = s.laseres.filter((l) => (l.eje === "h" ? l.pos > 30 && l.pos < 440 : l.pos > 10 && l.pos < 790));
  },

  terminado: quedaUnoVivo,
  ranking: (s) => rankingEliminacion(s, (j) => j.vida),

  dibujar(ctx, s, yo, t) {
    fondoCiudad(ctx, "#05050f");
    marcoNeon(ctx, 20, 40, 760, 390, "#05d9e8");
    for (const l of s.laseres) {
      const color = l.tipo === "bajo" ? "#ff2a6d" : "#05d9e8";
      ctx.strokeStyle = color + "55"; ctx.lineWidth = 12;
      ctx.beginPath();
      if (l.eje === "h") { ctx.moveTo(20, l.pos); ctx.lineTo(780, l.pos); }
      else { ctx.moveTo(l.pos, 40); ctx.lineTo(l.pos, 430); }
      ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
    }
    for (const j of s.jugadores) {
      if (!j.vivo) continue;
      const altura = j.salto > 0 ? Math.sin((j.salto / 0.55) * Math.PI) : 0;
      const parpadeo = j.inv > 0 && Math.floor(t * 15) % 2 === 0;
      dibujarJugador(ctx, j, j.id === yo, {
        escala: j.agachado ? 0.65 : 1 + altura * 0.45,
        sombra: altura > 0,
        alpha: parpadeo ? 0.35 : 1,
      });
      ctx.fillStyle = "rgba(7,4,15,0.8)"; ctx.fillRect(j.x - 16, j.y + j.r + 6, 32, 4);
      ctx.fillStyle = j.vida > 50 ? "#39ff88" : j.vida > 25 ? "#f5c542" : "#e8402c";
      ctx.fillRect(j.x - 16, j.y + j.r + 6, 32 * (j.vida / 100), 4);
    }
    ctx.font = "bold 12px 'Share Tech Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillStyle = "#ff2a6d"; ctx.fillText("ROJO = toca A (salta)", 790, 20);
    ctx.fillStyle = "#05d9e8"; ctx.fillText("CIAN = mantén A (agáchate)", 790, 34);
    dibujarMarcador(ctx, s.jugadores, (j) => (j.vivo ? j.vida : "✕"));
  },
});
