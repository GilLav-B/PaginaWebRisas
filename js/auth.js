// Usuarios permitidos: se guarda solo el hash SHA-256 de "usuario:contraseña",
// nunca la contraseña en texto plano.
const USUARIOS = {
  gilberto: { nombre: "Gilberto", hash: "46fbf111b85e86d327e6cf95ac323c38016113f20fd38106b1185c68ebf9dd8c" },
  derek:    { nombre: "Derek",    hash: "be03ee67e27b6f7bcb4822c316394ffa29cf1ebac68c43876322e72cf451d11d" },
  julian:   { nombre: "Julian",   hash: "9e5b9fd34f03ff756d506959d46c16f4ddab037a801b2c9d381bad9a96c100c9" },
  esteban:  { nombre: "Esteban",  hash: "6de9dba334f93cd491719fe6ee2c9eb1126c533d37fdfa3655fabc9b13f5dd4c" },
};

const CLAVE_SESION = "risas_usuario";

async function sha256(texto) {
  const datos = new TextEncoder().encode(texto);
  const buffer = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function iniciarSesion(usuario, contrasena) {
  const id = usuario.trim().toLowerCase();
  const registro = USUARIOS[id];
  if (!registro) return false;

  const hash = await sha256(`${id}:${contrasena}`);
  if (hash !== registro.hash) return false;

  sessionStorage.setItem(CLAVE_SESION, id);
  return true;
}

function usuarioActual() {
  const id = sessionStorage.getItem(CLAVE_SESION);
  return id && USUARIOS[id] ? { id, ...USUARIOS[id] } : null;
}

function cerrarSesion() {
  sessionStorage.removeItem(CLAVE_SESION);
  window.location.href = "index.html";
}

// Llamar al inicio de cada página privada.
function protegerPagina() {
  const usuario = usuarioActual();
  if (!usuario) {
    window.location.replace("index.html");
    return null;
  }
  return usuario;
}
