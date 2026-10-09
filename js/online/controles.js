// =====================================================================
//  Controles en pantalla: joystick virtual flotante (mitad izquierda)
//  y botón A (abajo a la derecha). Multitouch con touchstart/touchend
//  y preventDefault para evitar zoom y scroll. Teclado para pruebas en PC.
//
//  `n` y `r` cuentan pulsaciones y sueltas: así el anfitrión no pierde
//  un toque rápido aunque ocurra entre dos envíos de red.
// =====================================================================

const Control = { x: 0, y: 0, a: false, n: 0, r: 0 };

function iniciarControles({ zona, base, palanca, botonA }) {
  const RADIO = 55;
  let toqueJoy = null, origen = null;
  const teclas = new Set();
  const opc = { passive: false };

  function moverPalanca(dx, dy) {
    const d = Math.hypot(dx, dy);
    const k = d > RADIO ? RADIO / d : 1;
    dx *= k; dy *= k;
    Control.x = dx / RADIO;
    Control.y = dy / RADIO;
    palanca.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function soltarJoy() {
    toqueJoy = null;
    Control.x = 0; Control.y = 0;
    palanca.style.transform = "";
    base.classList.remove("activo");
    base.style.left = ""; base.style.top = "";
  }

  zona.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (toqueJoy !== null) return;
    const t = e.changedTouches[0];
    toqueJoy = t.identifier;
    origen = { x: t.clientX, y: t.clientY };
    base.style.left = `${t.clientX}px`;
    base.style.top = `${t.clientY}px`;
    base.classList.add("activo");
    moverPalanca(0, 0);
  }, opc);

  zona.addEventListener("touchmove", (e) => {
    e.preventDefault();
    for (const t of e.changedTouches)
      if (t.identifier === toqueJoy) moverPalanca(t.clientX - origen.x, t.clientY - origen.y);
  }, opc);

  const finJoy = (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === toqueJoy) soltarJoy();
  };
  zona.addEventListener("touchend", finJoy, opc);
  zona.addEventListener("touchcancel", finJoy, opc);

  const presionarA = () => { if (!Control.a) { Control.a = true; Control.n++; botonA.classList.add("presionado"); } };
  const soltarA = () => { if (Control.a) { Control.a = false; Control.r++; botonA.classList.remove("presionado"); } };

  botonA.addEventListener("touchstart", (e) => { e.preventDefault(); presionarA(); }, opc);
  botonA.addEventListener("touchend", (e) => { e.preventDefault(); soltarA(); }, opc);
  botonA.addEventListener("touchcancel", (e) => { e.preventDefault(); soltarA(); }, opc);
  botonA.addEventListener("mousedown", presionarA);
  window.addEventListener("mouseup", soltarA);

  // Teclado (PC): flechas/WASD + espacio o J
  const DIR = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
                ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
  function teclado() {
    let x = 0, y = 0;
    for (const t of teclas) if (DIR[t]) { x += DIR[t][0]; y += DIR[t][1]; }
    const m = Math.hypot(x, y) || 1;
    Control.x = x / m; Control.y = y / m;
  }
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "KeyJ") { e.preventDefault(); presionarA(); return; }
    if (DIR[e.code]) { e.preventDefault(); teclas.add(e.code); teclado(); }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space" || e.code === "KeyJ") { soltarA(); return; }
    if (DIR[e.code]) { teclas.delete(e.code); teclado(); }
  });

  return { reiniciar() { soltarJoy(); soltarA(); teclas.clear(); } };
}
