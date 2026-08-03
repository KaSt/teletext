const screen = document.querySelector('#screen');
const pageNode = document.querySelector('#page');
const indicator = document.querySelector('#page-indicator');
const clockNode = document.querySelector('#clock');
const serviceNode = document.querySelector('#service');

const WIDTH = 40;
const HEIGHT = 24;
const HOME = 100;
const MIN_PAGE = 100;
const MAX_PAGE = 899;

let currentPage = HOME;
let inputBuffer = '';
let requestToken = 0;

const colours = {
  W: '#ffffff', Y: '#ffff00', C: '#00ffff', G: '#00ff00',
  R: '#ff0000', B: '#5080ff', M: '#ff00ff'
};

const esc = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const pad = (text = '', width = WIDTH) => String(text).slice(0, width).padEnd(width, ' ');
const center = (text = '', width = WIDTH) => {
  const value = String(text).slice(0, width);
  const left = Math.max(0, Math.floor((width - value.length) / 2));
  return ' '.repeat(left) + value + ' '.repeat(width - left - value.length);
};
const line = (text = '', colour = 'W', bg = '') => ({ text: pad(text), colour, bg });
const blank = () => line('');

function normalise(lines) {
  const result = lines.slice(0, HEIGHT);
  while (result.length < HEIGHT) result.push(blank());
  return result;
}

function renderLines(lines) {
  pageNode.innerHTML = normalise(lines).map(item => {
    const fg = colours[item.colour] || colours.W;
    const bg = item.bg ? `background:${colours[item.bg] || item.bg};` : '';
    return `<span style="display:block;color:${fg};${bg}">${esc(item.text)}</span>`;
  }).join('');
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dailyRandom(pageNumber, salt = '') {
  const now = new Date();
  const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  return mulberry32(hashString(`${key}:${pageNumber}:${salt}`));
}

const choice = (random, values) => values[Math.floor(random() * values.length)];

function heading(page, title, colour = 'Y') {
  return [
    line(`TELEVIDEO ${String(page).padStart(3, '0')} ${title}`.padEnd(WIDTH), colour),
    line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colour)
  ];
}

function footer(left = '100 INDICE', right = '') {
  return [
    line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'B'),
    line(`${left}${right ? right.padStart(WIDTH - left.length) : ''}`, 'C')
  ];
}

const pages = new Map();

pages.set(100, () => normalise([
  line('      TELEVIDEO - INDICE GENERALE      ', 'Y', 'B'),
  line('        RAI  SERVIZIO TELEVIDEO        ', 'W'),
  line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'Y'),
  line('101  ULTIM\'ORA', 'Y'),
  line('102  NOTIZIE DEL GIORNO', 'W'),
  line('103  PRIMA PAGINA', 'W'),
  line('104  OGGI', 'W'),
  blank(),
  line('110  PRIMO PIANO', 'W'),
  line('120  POLITICA', 'W'),
  line('130  ECONOMIA', 'W'),
  line('140  DALL\'ITALIA', 'W'),
  line('150  DAL MONDO', 'W'),
  line('160  CULTURA E SPETTACOLO', 'W'),
  line('200  SPORT', 'G'),
  line('300  BORSA E FINANZA', 'G'),
  line('400  PUBBLICA UTILITA\'', 'C'),
  line('500  PROGRAMMI TV E RADIO', 'C'),
  line('600  GIOCHI - LOTTO', 'M'),
  line('700  SERVIZI E PAGINE NASCOSTE', 'M'),
  line('800  OGGI IN ITALIA', 'Y'),
  line('899  INFORMAZIONI SUL SERVIZIO', 'C'),
  line('  DIGITARE IL NUMERO DELLA PAGINA  ', 'W', 'B'),
  line('     alcune pagine non sono in indice', 'G')
]));

pages.set(101, () => {
  const random = dailyRandom(101, 'ultima');
  const headlines = [
    'CALDO: TEMPERATURE ANCORA ELEVATE',
    'TRAFFICO INTENSO SULLE AUTOSTRADE',
    'NUOVO ACCORDO AL TERMINE DEL VERTICE',
    'TRENI: RITARDI CONTENUTI NELLA SERA'
  ];
  return normalise([
    ...heading(101, "ULTIM'ORA", 'Y'),
    line('ULTIM\'ORA', 'W', 'R'),
    blank(),
    line(choice(random, headlines), 'Y'),
    line('Aggiornamenti nelle prossime pagine.', 'W'),
    blank(),
    line('Le informazioni sono simulate e create', 'C'),
    line('localmente nel browser del visitatore.', 'C'),
    blank(),
    line('Questa pagina cambia nel corso dei giorni.', 'G'),
    blank(),
    ...footer('100 INDICE', '102 NOTIZIE')
  ]);
});

pages.set(102, () => normalise([
  ...heading(102, 'NOTIZIE DEL GIORNO', 'Y'),
  line('110  PRIMO PIANO', 'W'),
  line('120  POLITICA ITALIANA', 'W'),
  line('130  ECONOMIA E LAVORO', 'W'),
  line('140  CRONACHE ITALIANE', 'W'),
  line('150  NOTIZIE DAL MONDO', 'W'),
  line('160  CULTURA E SPETTACOLO', 'W'),
  line('170  SOCIETA\' E CITTADINI', 'W'),
  line('180  DOSSIER E SPECIALI', 'W'),
  blank(),
  line('200  SPORT', 'G'),
  line('300  BORSA E FINANZA', 'G'),
  ...footer('101 ULTIM\'ORA', '100 INDICE')
]));

pages.set(103, () => normalise([
  ...heading(103, 'PRIMA PAGINA', 'Y'),
  line('IL GRAN CALDO NON CONCEDE TREGUA', 'Y'),
  line('Pomeriggio difficile nelle grandi citta\'.', 'W'),
  line('Previsioni e temperature a pagina 300.', 'C'),
  blank(),
  line('TRASPORTI, GIORNATA SENZA EMERGENZE', 'Y'),
  line('Qualche rallentamento nelle ore di punta.', 'W'),
  blank(),
  line('ARCHIVI: RITROVATA UNA VECCHIA BOBINA', 'Y'),
  line('Conteneva immagini prive di datazione.', 'W'),
  blank(),
  ...footer('100 INDICE', '104 OGGI')
]));

pages.set(200, () => normalise([
  ...heading(200, 'SPORT', 'G'),
  line('CALCIO', 'W', 'G'),
  line('201  NOTIZIE E RISULTATI', 'W'),
  line('205  CAMPIONATO', 'W'),
  line('210  COPPE EUROPEE', 'W'),
  blank(),
  line('ALTRI SPORT', 'W', 'B'),
  line('220  CICLISMO', 'W'),
  line('230  FORMULA UNO', 'W'),
  line('240  TENNIS', 'W'),
  line('250  BASKET', 'W'),
  blank(),
  line('I risultati di questa ricostruzione', 'C'),
  line('sono volutamente immaginari.', 'C'),
  ...footer('100 INDICE', '201 CALCIO')
]));

pages.set(300, () => {
  const r = dailyRandom(300, 'meteo');
  const cities = ['ROMA', 'MILANO', 'TORINO', 'NAPOLI', 'LUSSEMBURGO', 'MADRID'];
  const rows = cities.map(city => line(`${city.padEnd(16)} ${String(16 + Math.floor(r() * 20)).padStart(2)}  ${String(14 + Math.floor(r() * 20)).padStart(2)}`, 'W'));
  return normalise([
    ...heading(300, 'PREVISIONI DEL TEMPO', 'C'),
    line('CITTA\'             MAX MIN', 'W', 'B'),
    ...rows,
    blank(),
    line('NORD: sereno, nubi sui rilievi.', 'C'),
    line('CENTRO: caldo e ventilazione debole.', 'C'),
    line('SUD: cielo limpido, mari poco mossi.', 'C'),
    blank(),
    line('Previsioni simulate per atmosfera.', 'G'),
    ...footer('100 INDICE', '301 EUROPA')
  ]);
});

pages.set(400, () => normalise([
  ...heading(400, 'PUBBLICA UTILITA\'', 'C'),
  line('401  NUMERI UTILI', 'W'),
  line('410  VIABILITA\' E TRAFFICO', 'W'),
  line('420  TRENI E TRASPORTI', 'W'),
  line('430  FARMACIE DI TURNO', 'W'),
  line('440  SCUOLA E UNIVERSITA\'', 'W'),
  line('450  CONSUMATORI', 'W'),
  line('460  POSTE E TELEFONI', 'W'),
  blank(),
  line('AVVISO AGLI UTENTI', 'Y'),
  line('Il servizio e\' in fase sperimentale.', 'W'),
  line('Le pagine possono apparire lentamente.', 'W'),
  ...footer('100 INDICE', '500 PROGRAMMI')
]));

pages.set(500, () => normalise([
  ...heading(500, 'PROGRAMMI TV', 'C'),
  line('RAIUNO', 'Y'),
  line('20.00  TELEGIORNALE', 'W'),
  line('20.30  PREVISIONI DEL TEMPO', 'W'),
  line('20.40  FILM: ESTATE ALLA STAZIONE', 'W'),
  blank(),
  line('RAIDUE', 'Y'),
  line('20.15  CARTONI ANIMATI', 'W'),
  line('20.45  QUIZ DEL GIOVEDI\'', 'W'),
  line('22.10  SPECIALE NOTTE', 'W'),
  blank(),
  line('RAITRE', 'Y'),
  line('20.30  TELEGIORNALE REGIONALE', 'W'),
  line('21.00  DOCUMENTARIO', 'W'),
  ...footer('100 INDICE', '501 DOMANI')
]));

pages.set(600, () => normalise([
  ...heading(600, 'GIOCHI E LOTTERIE', 'M'),
  line('601  LOTTO - ULTIMA ESTRAZIONE', 'W'),
  line('610  TOTOCALCIO', 'W'),
  line('620  OROSCOPO', 'W'),
  line('630  QUIZ DEL GIORNO', 'W'),
  line('640  ENIGMISTICA', 'W'),
  blank(),
  line('INDIZIO', 'Y'),
  line('Una pagina fuori indice conserva una', 'C'),
  line('chiave trovata vicino al numero 642.', 'C'),
  blank(),
  line('Non tutte le piste portano a qualcosa.', 'G'),
  ...footer('100 INDICE', '700 SERVIZI')
]));

pages.set(700, () => normalise([
  ...heading(700, 'SERVIZI', 'M'),
  line('701  COMPUTER E VIDEOGIOCHI', 'W'),
  line('710  RADIOAMATORI', 'W'),
  line('720  MERCATINO', 'W'),
  line('730  MESSAGGI DEGLI UTENTI', 'W'),
  line('740  ARCHIVIO', 'W'),
  blank(),
  line('777  SOTTOTITOLI / SERVIZIO SPECIALE', 'Y'),
  blank(),
  line('Alcune pagine non vengono annunciate.', 'C'),
  line('Provare numeri liberi tra 701 e 899.', 'C'),
  ...footer('100 INDICE', '777 SERVIZIO')
]));

pages.set(777, () => normalise([
  ...heading(777, 'SERVIZIO SPECIALE', 'Y'),
  blank(), blank(),
  line(center('PAGINA NON DESTINATA AL PUBBLICO'), 'W'),
  blank(),
  line(center('IL SEGNALE RICORDA IL NUMERO'), 'C'),
  blank(),
  line(center('PROSSIMA VERIFICA: 873'), 'Y'),
  blank(), blank(),
  ...footer('100 INDICE')
]));

pages.set(800, () => normalise([
  ...heading(800, 'OGGI', 'Y'),
  line('801  IL GIORNO E LA STORIA', 'W'),
  line('810  RASSEGNA STAMPA', 'W'),
  line('820  SPETTACOLI', 'W'),
  line('830  APPUNTAMENTI', 'W'),
  line('840  IL TEMPO', 'W'),
  line('850  VIAGGI', 'W'),
  blank(),
  line('IL SERVIZIO NOTTURNO RESTA ATTIVO', 'C'),
  line('ANCHE DOPO LA CHIUSURA DEI PROGRAMMI.', 'C'),
  ...footer('100 INDICE', '873 SEGNALE')
]));

pages.set(873, () => {
  const rare = dailyRandom(873, 'segnale')() > .70;
  return normalise([
    ...heading(873, 'SEGNALE', 'C'),
    blank(), blank(), blank(),
    line(center(rare ? 'BENTORNATO, KA.' : 'NESSUN SEGNALE'), rare ? 'Y' : 'W'),
    blank(),
    line(center(rare ? 'IL RICEVITORE E\' ANCORA CALDO' : 'ATTENDERE PREGO'), 'C'),
    blank(), blank(),
    line(center(rare ? '642' : ''), 'G'),
    ...footer('100 INDICE')
  ]);
});

pages.set(899, () => normalise([
  ...heading(899, 'INFORMAZIONI', 'C'),
  line('SERVIZIO: TELEVIDEO KA', 'W'),
  line('PERIODO ISPIRATORE: 1990-1994', 'W'),
  line('TECNOLOGIA: HTML, CSS, JAVASCRIPT', 'W'),
  line('FUNZIONAMENTO: COMPLETAMENTE STATICO', 'W'),
  line('DATI PERSONALI: NESSUNO', 'W'),
  blank(),
  line('Le pagine variabili usano un seme', 'C'),
  line('giornaliero deterministico nel browser.', 'C'),
  blank(),
  line('Questo non e\' un servizio ufficiale RAI.', 'Y'),
  ...footer('100 INDICE')
]));

function pageExists(pageNumber) {
  if (pages.has(pageNumber)) return true;
  return dailyRandom(pageNumber, 'existence')() > .82;
}

function generatedPage(pageNumber) {
  const r = dailyRandom(pageNumber, 'content');
  const titles = ['ARCHIVIO', 'MESSAGGI', 'SERVIZIO LOCALE', 'NOTIZIARIO', 'PAGINA DI PROVA'];
  const texts = [
    'Il documento originale non reca una data.',
    'La trasmissione riprendera\' regolarmente.',
    'Conservare questo numero per una verifica.',
    'La riga successiva risulta illeggibile.',
    'Un duplicato e\' stato ricevuto altrove.',
    'Nessun operatore e\' presente in redazione.'
  ];
  return normalise([
    ...heading(pageNumber, choice(r, titles), choice(r, ['Y', 'C', 'G', 'M'])),
    blank(),
    line(choice(r, texts), 'W'),
    blank(),
    line(choice(r, texts), 'W'),
    blank(),
    line(choice(r, texts), 'W'),
    blank(),
    r() > .6 ? line(`RIFERIMENTO PAGINA ${100 + Math.floor(r() * 800)}`, 'Y') : blank(),
    ...footer('100 INDICE')
  ]);
}

function missingPage(pageNumber) {
  return normalise([
    ...heading(pageNumber, 'RICERCA PAGINA', 'W'),
    blank(), blank(), blank(), blank(),
    line(center('PAGINA NON TRASMESSA'), 'Y'),
    blank(),
    line(center('ATTENDERE O DIGITARE ALTRO NUMERO'), 'C'),
    blank(), blank(),
    ...footer('100 INDICE')
  ]);
}

function remember(pageNumber) {
  if (pages.has(pageNumber)) return;
  const key = 'ka-text-discovered';
  const previous = JSON.parse(localStorage.getItem(key) || '[]');
  if (!previous.includes(pageNumber)) {
    previous.push(pageNumber);
    localStorage.setItem(key, JSON.stringify(previous));
  }
}

function render(pageNumber) {
  currentPage = pageNumber;
  indicator.textContent = `P${pageNumber}`;
  const factory = pages.get(pageNumber);
  if (factory) return renderLines(factory());
  if (pageExists(pageNumber)) {
    remember(pageNumber);
    return renderLines(generatedPage(pageNumber));
  }
  renderLines(missingPage(pageNumber));
}

async function requestPage(pageNumber) {
  if (pageNumber < MIN_PAGE || pageNumber > MAX_PAGE) return;
  const token = ++requestToken;
  indicator.textContent = `P${String(pageNumber).padStart(3, '0')}`;
  renderLines(normalise([
    ...heading(pageNumber, 'RICERCA', 'W'),
    blank(), blank(), blank(), blank(), blank(),
    line(center('ATTENDERE PREGO...'), 'Y')
  ]));
  const r = dailyRandom(pageNumber, 'delay');
  await new Promise(resolve => setTimeout(resolve, 350 + Math.floor(r() * 900)));
  if (token === requestToken) render(pageNumber);
}

function commitBuffer() {
  if (inputBuffer.length !== 3) return;
  const number = Number(inputBuffer);
  inputBuffer = '';
  requestPage(number);
}

function handleKey(event) {
  if (/^[0-9]$/.test(event.key)) {
    inputBuffer = (inputBuffer + event.key).slice(-3);
    indicator.textContent = `P${inputBuffer.padEnd(3, '–')}`;
    if (inputBuffer.length === 3) setTimeout(commitBuffer, 120);
    event.preventDefault();
    return;
  }
  switch (event.key) {
    case 'Enter': commitBuffer(); break;
    case 'ArrowLeft': requestPage(Math.max(MIN_PAGE, currentPage - 1)); break;
    case 'ArrowRight': requestPage(Math.min(MAX_PAGE, currentPage + 1)); break;
    case 'h': case 'H': requestPage(HOME); break;
    case 'c': case 'C':
      screen.classList.toggle('crt');
      localStorage.setItem('ka-text-crt', screen.classList.contains('crt') ? '1' : '0');
      break;
    case 'Escape':
      inputBuffer = '';
      indicator.textContent = `P${currentPage}`;
      break;
    default: return;
  }
  event.preventDefault();
}

function updateClock() {
  clockNode.textContent = new Date().toLocaleTimeString('it-IT', { hour12: false });
}

serviceNode.textContent = 'TELEVIDEO';
screen.classList.toggle('crt', localStorage.getItem('ka-text-crt') !== '0');
document.addEventListener('keydown', handleKey);
screen.addEventListener('click', () => screen.focus());
setInterval(updateClock, 1000);
updateClock();
render(HOME);
screen.focus();
