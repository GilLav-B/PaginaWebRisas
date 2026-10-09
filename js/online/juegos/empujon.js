// 1. El Empujón (Bumper Arena): isla que se encoge, esferas con inercia y embestida.
registrarJuego({
  id: "empujon",
  nombre: "El Empujón",
  kanji: "押",
  boton: "EMBESTIR",
  ayuda: "Mueve tu esfera con el joystick. A = embestida. Tira a todos de la isla, que se va encogiendo.",

  crear(jugadores) {
    const pos = posicionesEnCirculo(jugadores.length, 400, 225, 110);
    return {
      t: 0,
      radio: 200,
      muertes: [],
      jugadores: jugadores.map((j, i) => ({ ...jugadorBase(j, pos[i].x, pos[i].y, 18), cd: 0, dash: 0 })),
    };
  },

  // Movimiento de un jugador (lo usa el anfitrión y la predicción del invitado).
  mover(j, e, dt) {
    j.vx += e.x * 560 * dt;
    j.vy += e.y * 560 * dt;
    const friccion = Math.pow(0.08, dt);
    j.vx *= friccion; j.vy *= friccion;
    limitarVelocidad(j, 650);
    j.x += j.vx * dt; j.y += j.vy * dt;
  },

  paso(s, ent, dt) {
    s.t += dt;
    s.radio = Math.max(85, 200 - s.t * 2.3);
    const vivos = s.jugadores.filter((j) => j.vivo);

    for (const j of vivos) {
      const e = entrada(ent, j.id);
      j.cd = Math.max(0, j.cd - dt);
      j.dash = Math.max(0, j.dash - dt);
      if (e.pulso && j.cd === 0) {
        const d = direccion(j, e);
        j.vx += d.x * 380; j.vy += d.y * 380;
        j.cd = 1.4; j.dash = 0.25;
      }
      this.mover(j, e, dt);
    }

    porCadaPar(vivos, (a, b) => chocarCirculos(a, b, 1.5));

    for (const j of vivos)
      if (Math.hypot(j.x - 400, j.y - 225) > s.radio + j.r * 0.4) eliminar(s, j);
  },

  terminado: quedaUnoVivo,
  ranking: (s) => rankingEliminacion(s, (j) => -Math.hypot(j.x - 400, j.y - 225)),

  dibujar(ctx, s, yo, t) {
    ctx.fillStyle = "#05020c";
    ctx.fillRect(0, 0, ANCHO, ALTO);
    // Estrellas del vacío
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 40; i++) ctx.fillRect((i * 197) % ANCHO, (i * 83 + t * 6) % ALTO, 2, 2);

    const g = ctx.createRadialGradient(400, 225, 20, 400, 225, s.radio);
    g.addColorStop(0, "#2a1450");
    g.addColorStop(1, "#140a2a");
    circulo(ctx, 400, 225, s.radio, g);
    circulo(ctx, 400, 225, s.radio, null, "rgba(255,42,109,0.35)", 10);
    circulo(ctx, 400, 225, s.radio, null, "#ff2a6d", 2);
    ctx.fillStyle = "rgba(245,197,66,0.12)";
    ctx.font = "bold 90px 'Shippori Mincho', serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("押", 400, 228);

    for (const j of s.jugadores) {
      if (!j.vivo) continue;
      if (j.dash > 0) circulo(ctx, j.x, j.y, j.r + 12, "rgba(255,255,255,0.18)");
      dibujarJugador(ctx, j, j.id === yo);
      if (j.id === yo) anilloRecarga(ctx, j, j.cd / 1.4);
    }
    dibujarMarcador(ctx, s.jugadores, (j) => (j.vivo ? "●" : "✕"));
  },
});
