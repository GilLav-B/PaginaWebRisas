// =====================================================================
//  BURLAS — edita aquí los mensajes. Agrega o quita frases libremente.
// =====================================================================

// Cuando alguien PIERDE una prueba. Se elige una al azar de su lista
// (o de la lista "todos" si la persona no tiene una propia).
const BURLAS_PERDER = {
  julian: [
    "Por eso Yaneth no te quiso.",
    "Por eso tu papá se murió.",
    "Yaneth vio esta partida y se sintió muy tranquila con su decisión.",
    "Ni Yaneth ni el juego te eligieron, Julian.",
    "Doctor Julian: tus pacientes ya están pidiendo segunda opinión.",
    "Con ese diagnóstico, mejor ni te acerques a un hospital, Julian.",
    "Yaneth te dejó en visto igual que te deja este juego.",
    "Julian, ni con receta médica se te quita lo malo.",
  ],
  gilberto: [
    "Programaste esta página y ni así ganas.",
    "Gilberto.exe dejó de funcionar.",
    "Hiciste el código y el código te humilló. Poesía.",
    "Tu código compila, tú no, Gilberto.",
    "Gilberto, hasta Stack Overflow cerró tu pregunta por duplicada.",
    "Error 404: habilidad de Gilberto no encontrada.",
  ],
  derek: [
    "Marco Aurelio aceptaba todo… menos tu manera de jugar, Derek.",
    "Derek, ni con todo el estoicismo del mundo se aguanta verte perder.",
    "Memento mori, Derek… y memento que eres malísimo en esto.",
    "Epicteto fue esclavo y aun así tenía más dignidad que tu partida.",
    "Séneca se murió por orden de Nerón; tú solito te mataste aquí, Derek.",
    "Derek, hasta el NPC del tutorial juega mejor que tú.",
  ],
  esteban: [
    "Con razón te gustaba el subgerente.",
    "El subgerente vio tu partida y pidió cambio de sucursal.",
    "Esteban, ni el subgerente te firma la asistencia con ese resultado.",
    "Esteban, el subgerente dice que le recuerdas a un inventario mal hecho.",
    "Esteban perdió. Noticia del año: nadie se sorprendió.",
    "Esteban, tus reflejos todavía están descargando la actualización.",
  ],
  todos: [
    "Tu cerebro corre en Windows Vista.",
    "恥 (haji): vergüenza. Búscalo, eres tú.",
    "El samurái perdió su honor… y tú ni tenías.",
    "Hasta un gato caminando sobre el teclado lo hace mejor.",
  ],
};

// Cuando alguien GANA: elogios a medias, porque aquí nadie se salva.
const BURLAS_GANAR = [
  "Ganaste… seguro fue pura suerte.",
  "Hasta un reloj descompuesto acierta dos veces al día.",
  "Bien. No te acostumbres.",
  "Felicidades, ya puedes presumirle a nadie.",
];

// Cuando alguien se equivoca de usuario o contraseña al entrar.
const BURLAS_LOGIN = [
  "Ni tu propia contraseña te sabes. Impresionante.",
  "Acceso denegado. Como en todo lo demás de tu vida.",
  "Los Municipales no dejan pasar a impostores… ni a despistados.",
  "Contraseña incorrecta. Intenta usar el cerebro esta vez.",
];

// Rango ridículo que aparece en la tarjeta de cada miembro.
const RANGOS = {
  gilberto: { kana: "ギルベルト", rango: "Shōgun del código con bugs" },
  derek:    { kana: "デレク",     rango: "Estoico de pantalla de carga" },
  julian:   { kana: "フリアン",   rango: "Rōnin rechazado por Yaneth" },
  esteban:  { kana: "エステバン", rango: "Fan #1 del subgerente" },
};

function azar(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function burlaPerder(id) {
  return azar(BURLAS_PERDER[id] || BURLAS_PERDER.todos);
}
