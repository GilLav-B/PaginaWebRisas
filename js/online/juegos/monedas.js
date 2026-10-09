// 8. El Ladrón de Monedas (Coin Thief): junta monedas y pásale la bomba a alguien más.
registrarJuego({
  id: "monedas",
  nombre: "El Ladrón de Monedas",
  kanji: "金",
  boton: "GOLPE",
  ayuda: "Junta monedas. A = golpear al rival cercano (le robas 1). Si tienes la 💣, golpear se la pasa. Si te explota, pierdes la mitad.",

  crear(jugadores) {
    const pos = posicionesEnCirculo(jugadores.length, 400, 235, 140);
    const s = {
      sig: 0, _prox: 0,
      monedas: [], explosiones: [],
      jugadores: jugadores.map((j, i) => ({ ...jugadorBase(j, pos[i].x, pos[i].y, 15), monedas: 0, cd: 0, golpe: 0 })),
      bomba: { de: null, mecha: 10, bloqueo: 0 },
    };
    s.bomba.de = azar(s.jugadores).id;
    return s;
  },

  mover(j, e, dt, s) {
    moverDirecto(j, e, j.id === s.bomba.de ? 215 : 195, dt, 8);
    encerrar(j, 20, 40, 780, 430, 0.5);
  },

  paso(s, ent, dt) {
    s._prox -= dt;
    if (s._prox <= 0 && s.monedas.length < 12) {
      s._prox = 0.45;
      s.monedas.push({ id: s.sig++, x: aleatorio(50, 750), y: aleatorio(70, 410) });
    }

    const bomba = s.bomba;
    bomba.bloqueo = Math.max(0, bomba.bloqueo - dt);
    bomba.mecha -= dt;

    for (const j of s.jugadores) {
      const e = entrada(ent, j.id);
      j.cd = Math.max(0, j.cd - dt);
      j.golpe = Math.max(0, j.golpe - dt);
      this.mover(j, e, dt, s);

      if (e.pulso && j.cd === 0) {
        j.cd = 0.6; j.golpe = 0.2;
        const rival = s.jugadores
          .filter((o) => o !== j && distancia(o, j) < j.r + o.r + 32)
          .sort((a, b) => distancia(a, j) - distancia(b, j))[0];
        if (rival) {
          const d = distancia(rival, j) || 1;
          rival.vx += ((rival.x - j.x) / d) * 420;
          rival.vy += ((rival.y - j.y) / d) * 420;
          if (bomba.de === j.id && bomba.bloqueo === 0) {
            bomba.de = rival.id; bomba.bloqueo = 0.6;
          } else if (rival.monedas > 0) {
            rival.monedas--; j.monedas++;
          }
        }
      }
    }
    porCadaPar(s.jugadores, (a, b) => chocarCirculos(a, b, 0.8));

    s.monedas = s.monedas.filter((m) => {
      const j = s.jugadores.find((j) => Math.hypot(j.x - m.x, j.y - m.y) < j.r + 9);
      if (j) j.monedas++;
      return !j;
    });

    if (bomba.mecha <= 0) {
      const victima = s.jugadores.find((j) => j.id === bomba.de);
      if (victima) {
        victima.monedas = Math.floor(victima.monedas / 2);
        s.explosiones.push({ id: s.sig++, x: victima.x, y: victima.y, v: 0.5 });
      }
      const otros = s.jugadores.filter((j) => j.id !== bomba.de);
      bomba.de = (otros.length ? azar(otros) : victima)?.id ?? null;
      bomba.mecha = 10;
    }
    for (const x of s.explosiones) x.v -= dt;
    s.explosiones = s.explosiones.filter((x) => x.v > 0);
  },

  terminado: () => false,
  ranking: (s) => [...s.jugadores].sort((a, b) => b.monedas - a.monedas).map((j) => j.id),

  dibujar(ctx, s, yo) {
    fondoCiudad(ctx, "#0e0b05");
    marcoNeon(ctx, 20, 40, 760, 390, "#f5c542");
    for (const m of s.monedas) {
      circulo(ctx, m.x, m.y, 9, "#f5c542", "#a87b00", 2);
      ctx.fillStyle = "#a87b00";
      ctx.font = "bold 10px 'Shippori Mincho', serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("金", m.x, m.y + 1);
    }
    for (const x of s.explosiones) circulo(ctx, x.x, x.y, 60 * (1.2 - x.v), `rgba(232,64,44,${x.v * 1.6})`);
    for (const j of s.jugadores) {
      if (j.golpe > 0) circulo(ctx, j.x, j.y, j.r + 32, "rgba(255,255,255,0.12)");
      dibujarJugador(ctx, j, j.id === yo);
      if (s.bomba.de === j.id) {
        ctx.font = "22px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("💣", j.x + 16, j.y - 16);
        ctx.font = "bold 12px Orbitron, sans-serif";
        ctx.fillStyle = s.bomba.mecha < 3 ? "#e8402c" : "#ffffff";
        ctx.fillText(Math.ceil(s.bomba.mecha), j.x + 30, j.y - 28);
      }
    }
    dibujarMarcador(ctx, s.jugadores, (j) => `◎${j.monedas}`);
  },
});
