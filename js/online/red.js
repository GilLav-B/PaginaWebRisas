// =====================================================================
//  Red P2P con PeerJS (WebRTC). No necesita servidor propio, así que
//  funciona en un hosting estático como AWS Amplify.
//
//  Cómo se elige al anfitrión: todos intentan registrarse con el mismo
//  ID de sala. El primero lo consigue y se vuelve anfitrión; a los demás
//  el servidor de PeerJS les dice "ID ocupado" y se conectan a él.
//
//  Cada invitado abre DOS canales con el anfitrión:
//   - "seguro": ordenado y confiable, para la sala, fases y resultados.
//   - "rapida": sin orden, para joystick y fotos del estado. Si un paquete
//     se pierde no frena a los siguientes (evita los tirones).
// =====================================================================

// Una sala distinta por sitio: así las pruebas en localhost no chocan con
// la página publicada (todos comparten el mismo servidor público de PeerJS).
const SALA_ID = `losmunicipales-${location.hostname.replace(/[^a-z0-9]/gi, "-")}`;
const OPCIONES_PEER = { debug: 1 };

function abrirPeer(id) {
  return new Promise((resolver, rechazar) => {
    const peer = id ? new Peer(id, OPCIONES_PEER) : new Peer(OPCIONES_PEER);
    const alAbrir = () => { peer.off("error", alFallar); resolver(peer); };
    const alFallar = (e) => { peer.off("open", alAbrir); peer.destroy(); rechazar(e); };
    peer.once("open", alAbrir);
    peer.once("error", alFallar);
  });
}

class Red {
  // eventos: { mensaje(dePid, msg), entro(pid), salio(pid), hostSalio() }
  constructor(eventos) {
    this.ev = eventos;
    this.peer = null;
    this.esHost = false;
    this.conexiones = new Map(); // solo anfitrión: pid → canal seguro
    this.rapidas = new Map();    // solo anfitrión: pid → canal rápido
    this.conexionHost = null;    // solo invitados
    this.rapidaHost = null;
  }

  get miId() { return this.peer?.id; }

  async conectar() {
    try {
      this.peer = await abrirPeer(SALA_ID);
      this.esHost = true;
      this._escucharInvitados();
    } catch (e) {
      if (e.type !== "unavailable-id") throw e;
      this.peer = await abrirPeer(null);
      this.esHost = false;
      await this._conectarAlHost();
    }
    this.peer.on("error", (e) => console.warn("PeerJS:", e.type));
    this.peer.on("disconnected", () => { try { this.peer.reconnect(); } catch {} });
    return this.esHost;
  }

  _escucharInvitados() {
    this.peer.on("connection", (conn) => {
      const rapida = conn.label === "rapida";
      conn.on("open", () => {
        if (rapida) { this.rapidas.set(conn.peer, conn); return; }
        this.conexiones.set(conn.peer, conn);
        this.ev.entro?.(conn.peer);
      });
      conn.on("data", (d) => this.ev.mensaje(conn.peer, JSON.parse(d)));
      conn.on("close", () => {
        if (rapida) { this.rapidas.delete(conn.peer); return; }
        this.conexiones.delete(conn.peer);
        this.ev.salio?.(conn.peer);
      });
      conn.on("error", () => {});
    });
  }

  _conectarAlHost() {
    return new Promise((resolver, rechazar) => {
      const conn = this.peer.connect(SALA_ID, { serialization: "raw", reliable: true, label: "seguro" });
      const fallar = (e) => { clearTimeout(reloj); this.peer.off("error", alError); rechazar(e); };
      const alError = (e) => { if (e.type === "peer-unavailable") fallar(e); };
      const reloj = setTimeout(() => fallar({ type: "timeout" }), 12000);
      this.peer.on("error", alError);
      conn.on("open", () => {
        clearTimeout(reloj);
        this.peer.off("error", alError);
        this.conexionHost = conn;
        this._abrirRapida();
        resolver();
      });
      conn.on("data", (d) => this.ev.mensaje(SALA_ID, JSON.parse(d)));
      conn.on("close", () => { if (this.conexionHost) this.ev.hostSalio?.(); });
    });
  }

  _abrirRapida() {
    // reliable:false en PeerJS = canal sin orden (no se atora esperando paquetes perdidos)
    const conn = this.peer.connect(SALA_ID, { serialization: "raw", reliable: false, label: "rapida" });
    conn.on("open", () => { this.rapidaHost = conn; });
    conn.on("data", (d) => this.ev.mensaje(SALA_ID, JSON.parse(d)));
    conn.on("close", () => { this.rapidaHost = null; });
    conn.on("error", () => {});
  }

  enviarAlHost(obj) {
    if (this.conexionHost?.open) this.conexionHost.send(JSON.stringify(obj));
  }

  // Joystick: por el canal rápido si ya abrió; si no, por el seguro.
  enviarAlHostRapido(obj) {
    const c = this.rapidaHost?.open ? this.rapidaHost : this.conexionHost;
    if (c?.open) c.send(JSON.stringify(obj));
  }

  enviarA(pid, obj) {
    const c = this.conexiones.get(pid);
    if (c?.open) c.send(JSON.stringify(obj));
  }

  // Acepta un objeto o un texto ya serializado (para no serializar dos veces).
  difundir(msg) {
    const texto = typeof msg === "string" ? msg : JSON.stringify(msg);
    for (const c of this.conexiones.values()) if (c.open) c.send(texto);
  }

  // Fotos del estado: canal rápido de cada invitado (o el seguro si aún no abre).
  difundirRapido(texto) {
    for (const [pid, segura] of this.conexiones) {
      const c = this.rapidas.get(pid);
      if (c?.open) c.send(texto);
      else if (segura.open) segura.send(texto);
    }
  }

  cerrar() {
    this.conexionHost = null;
    this.rapidaHost = null;
    try { this.peer?.destroy(); } catch {}
  }
}
