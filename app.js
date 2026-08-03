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
let audioContext = null;
let humNodes = null;

const colours = {
  W: '#ffffff', Y: '#ffff00', C: '#00ffff', G: '#00ff00',
  R: '#ff0000', B: '#0048ff', M: '#ff00ff', K: '#000000'
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
const rule = colour => line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colour);
const choice = (random, values) => values[Math.floor(random() * values.length)];
const integer = (random, min, max) => min + Math.floor(random() * (max - min + 1));

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

function heading(page, title, colour = 'Y') {
  return [
    line(`KAI TELEVIDEO ${String(page).padStart(3, '0')} ${title}`, colour),
    rule(colour)
  ];
}

function footer(left = '100 INDICE', right = '') {
  return [
    rule('B'),
    line(`${left}${right ? right.padStart(WIDTH - left.length) : ''}`, 'C')
  ];
}

function dateLabel() {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short', day: '2-digit', month: 'short'
  }).format(new Date()).replaceAll('.', '').toUpperCase();
}

const pages = new Map();

pages.set(100, () => normalise([
  line('       KAI TELEVIDEO - PAGINA 100      ', 'Y', 'B'),
  line(`          ${dateLabel().padEnd(16)} INDICE`, 'W'),
  rule('Y'),
  line("101  ULTIM'ORA", 'Y'),
  line('102  NOTIZIE', 'W'),
  line('103  PRIMA PAGINA', 'W'),
  line('110  POLITICA E PARLAMENTO', 'W'),
  line('130  ECONOMIA E LAVORO', 'W'),
  line("140  DALL'ITALIA", 'W'),
  line('150  DAL MONDO', 'W'),
  line('160  SPETTACOLO E CULTURA', 'W'),
  line('200  SPORT', 'G'),
  line('300  BORSA E FINANZA', 'G'),
  line("400  PUBBLICA UTILITA'", 'C'),
  line('450  PREVISIONI DEL TEMPO', 'C'),
  line('500  PROGRAMMI TV E RADIO', 'C'),
  line('600  GIOCHI - LOTTO - OROSCOPO', 'M'),
  line('700  SCIENZA - COMPUTER - SERVIZI', 'M'),
  line('800  ALMANACCO E TEMPO LIBERO', 'Y'),
  line('899  INFORMAZIONI SUL SERVIZIO', 'C'),
  blank(),
  line('      DIGITARE IL NUMERO DI PAGINA    ', 'W', 'B'),
  line('    C=EFFETTO VIDEO   M=RONZIO TV', 'G')
]));

pages.set(101, () => {
  const r = dailyRandom(101, 'ultima');
  const headlines = [
    ['ROMA, TERMINATO IL VERTICE', 'Comunicato atteso in tarda serata.'],
    ['TRAFFICO INTENSO VERSO LE CITTA\'', 'Rallentamenti sulle principali arterie.'],
    ['CALDO, NUOVO AUMENTO DELLE MASSIME', 'Temporali isolati sui rilievi alpini.'],
    ['TRENI, CIRCOLAZIONE REGOLARE', 'Lievi ritardi su alcune linee locali.']
  ];
  const item = choice(r, headlines);
  return normalise([
    ...heading(101, "ULTIM'ORA", 'Y'),
    line(" ULTIM'ORA ", 'W', 'R'),
    blank(),
    line(item[0], 'Y'),
    line(item[1], 'W'),
    blank(),
    line('Aggiornamento ore ' + new Date().toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}), 'C'),
    line('Ulteriori notizie nelle prossime pagine.', 'C'),
    blank(),
    line('102 NOTIZIE DEL GIORNO', 'G'),
    line('103 PRIMA PAGINA', 'G'),
    ...footer('100 INDICE', '102 NOTIZIE')
  ]);
});

pages.set(102, () => normalise([
  ...heading(102, 'NOTIZIE', 'Y'),
  line('110  POLITICA E PARLAMENTO', 'W'),
  line('120  PARTITI E ISTITUZIONI', 'W'),
  line('130  ECONOMIA E LAVORO', 'W'),
  line("140  CRONACHE DALL'ITALIA", 'W'),
  line('150  NOTIZIE DAL MONDO', 'W'),
  line('160  SPETTACOLO E CULTURA', 'W'),
  line("170  SOCIETA' E COSTUME", 'W'),
  line('180  SCIENZA E MEDICINA', 'W'),
  blank(),
  line('200  SPORT', 'G'),
  line('300  BORSA E FINANZA', 'G'),
  ...footer("101 ULTIM'ORA", '100 INDICE')
]));

pages.set(103, () => {
  const r = dailyRandom(103, 'prima');
  const first = choice(r, [
    ['ESTATE, CITTA\' SOTTO IL SOLE', 'Parchi affollati nelle ore serali.'],
    ['LAVORO, RIPRENDE IL CONFRONTO', 'Nuovo incontro fissato per domani.'],
    ['TRASPORTI, PIANO PER LE VACANZE', 'Servizi rinforzati nel fine settimana.']
  ]);
  return normalise([
    ...heading(103, 'PRIMA PAGINA', 'Y'),
    line(first[0], 'Y'), line(first[1], 'W'), blank(),
    line('PALAZZO CHIGI: RIUNIONE CONCLUSA', 'Y'),
    line('Nessuna dichiarazione al termine.', 'W'), blank(),
    line('SPETTACOLO: TORNA LA COMMEDIA', 'Y'),
    line('In prima serata un film italiano.', 'W'), blank(),
    line('SPORT: MERCATO, NUOVE TRATTATIVE', 'G'),
    line('Le societa\' mantengono il riserbo.', 'W'),
    ...footer('100 INDICE', '101 ULTIMA ORA')
  ]);
});

pages.set(200, () => normalise([
  ...heading(200, 'SPORT', 'G'),
  line('CALCIO', 'K', 'G'),
  line('201  NOTIZIE E RISULTATI', 'W'),
  line('205  CAMPIONATO', 'W'),
  line('210  COPPE EUROPEE', 'W'),
  line('215  CALCIOMERCATO', 'W'),
  blank(),
  line('ALTRI SPORT', 'W', 'B'),
  line('220  CICLISMO', 'W'),
  line('230  AUTOMOBILISMO', 'W'),
  line('240  TENNIS', 'W'),
  line('250  BASKET', 'W'),
  line('260  PALLAVOLO', 'W'),
  ...footer('100 INDICE', '201 CALCIO')
]));

pages.set(300, financePage);
pages.set(301, exchangePage);

async function financePage() {
  const r = dailyRandom(300, 'borsa');
  return normalise([
    ...heading(300, 'BORSA E FINANZA', 'G'),
    line('MILANO              ULT.     VAR.%', 'K', 'G'),
    line(`INDICE GENERALE    ${integer(r, 950, 1290)},${integer(r,0,9)}  ${(r()-.46).toFixed(2)}`, 'W'),
    line(`BANCARI            ${integer(r, 780, 1160)},${integer(r,0,9)}  ${(r()-.50).toFixed(2)}`, 'W'),
    line(`INDUSTRIALI        ${integer(r, 910, 1400)},${integer(r,0,9)}  ${(r()-.47).toFixed(2)}`, 'W'),
    blank(),
    line('301  CAMBI E VALUTE', 'G'),
    line('302  TITOLI DI STATO', 'G'),
    line('303  BORSE ESTERE', 'G'),
    line('304  ORO E METALLI', 'G'),
    blank(),
    line('Quotazioni indicative. Ritardo 20 min.', 'C'),
    ...footer('100 INDICE', '301 CAMBI')
  ]);
}

async function exchangePage() {
  let rates = null;
  try {
    const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CHF,JPY', {cache:'no-store'});
    if (!response.ok) throw new Error('cambi non disponibili');
    rates = (await response.json()).rates;
  } catch (_) {}
  const r = dailyRandom(301, 'cambi-fallback');
  const value = code => rates?.[code] ?? ({USD:1.08+r()*.08, GBP:.82+r()*.08, CHF:.91+r()*.08, JPY:155+r()*18}[code]);
  return normalise([
    ...heading(301, 'CAMBI E VALUTE', 'G'),
    line('CAMBI INDICATIVI CONTRO EURO', 'K', 'G'),
    blank(),
    line(`DOLLARO USA          ${value('USD').toFixed(4)}`, 'W'),
    line(`STERLINA              ${value('GBP').toFixed(4)}`, 'W'),
    line(`FRANCO SVIZZERO       ${value('CHF').toFixed(4)}`, 'W'),
    line(`YEN GIAPPONESE      ${value('JPY').toFixed(2)}`, 'W'),
    blank(),
    line('1 EURO = 1936,27 LIRE', 'Y'),
    line('Conversione di riferimento.', 'C'),
    blank(),
    line(rates ? 'DATI IN LINEA' : 'DATI DI RISERVA', rates ? 'G' : 'Y'),
    ...footer('300 BORSA', '100 INDICE')
  ]);
}

pages.set(400, () => normalise([
  ...heading(400, "PUBBLICA UTILITA'", 'C'),
  line('401  NUMERI UTILI', 'W'),
  line("410  VIABILITA' E TRAFFICO", 'W'),
  line('420  TRENI E TRASPORTI', 'W'),
  line('430  FARMACIE DI TURNO', 'W'),
  line("440  SCUOLA E UNIVERSITA'", 'W'),
  line('450  PREVISIONI DEL TEMPO', 'W'),
  line('460  MARI E VENTI', 'W'),
  line('470  POSTE E TELEFONI', 'W'),
  blank(),
  line('SERVIZIO ATTIVO 24 ORE SU 24', 'Y'),
  line('Aggiornamenti secondo disponibilita\'.', 'C'),
  ...footer('100 INDICE', '450 METEO')
]));

pages.set(450, weatherPage);

async function weatherPage() {
  const cities = [
    ['ROMA',41.90,12.50], ['MILANO',45.46,9.19], ['NAPOLI',40.85,14.27],
    ['PALERMO',38.12,13.36], ['LUSSEMBURGO',49.61,6.13]
  ];
  let rows = [];
  let online = true;
  try {
    const lat = cities.map(c=>c[1]).join(',');
    const lon = cities.map(c=>c[2]).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
    const response = await fetch(url, {cache:'no-store'});
    if (!response.ok) throw new Error('meteo non disponibile');
    const data = await response.json();
    const list = Array.isArray(data) ? data : [data];
    rows = cities.map((city, i) => line(`${city[0].padEnd(13)} ${String(Math.round(list[i].current.temperature_2m)).padStart(2)}  ${String(Math.round(list[i].daily.temperature_2m_max[0])).padStart(2)} ${String(Math.round(list[i].daily.temperature_2m_min[0])).padStart(2)}`, 'W'));
  } catch (_) {
    online = false;
    const r = dailyRandom(450, 'meteo-fallback');
    rows = cities.map(city => {
      const max = integer(r, 20, 36); const min = max - integer(r, 6, 13);
      return line(`${city[0].padEnd(13)} ${String(integer(r,min,max)).padStart(2)}  ${String(max).padStart(2)} ${String(min).padStart(2)}`, 'W');
    });
  }
  return normalise([
    ...heading(450, 'PREVISIONI DEL TEMPO', 'C'),
    line("CITTA'        ORA MAX MIN", 'K', 'C'),
    ...rows,
    blank(),
    line('NORD: sereno, nubi sui rilievi.', 'C'),
    line('CENTRO: caldo, venti deboli.', 'C'),
    line('SUD: cielo poco nuvoloso.', 'C'),
    blank(),
    line(online ? 'DATI METEO IN LINEA' : 'BOLLETTINO DI RISERVA', online ? 'G' : 'Y'),
    ...footer('400 SERVIZI', '460 MARI')
  ]);
}

pages.set(500, () => normalise([
  ...heading(500, 'PROGRAMMI TV E RADIO', 'C'),
  line('501  KAIUNO', 'Y'),
  line('502  KAIDUE', 'Y'),
  line('503  KAITRE', 'Y'),
  line('510  FILM DELLA SERA', 'W'),
  line('520  PROGRAMMI DEL POMERIGGIO', 'W'),
  line('530  PROGRAMMI DI DOMANI', 'W'),
  line('540  RADIOUNO', 'W'),
  line('550  RADIODUE', 'W'),
  line('560  RADIOTRE', 'W'),
  blank(),
  line('ORARI SOGGETTI A VARIAZIONI', 'C'),
  ...footer('100 INDICE', '510 FILM')
]));

const films = [
  ['VACANZE A PORTO CERVO','Italia 1991','con Jerry Cala\' e Marina Suma'],
  ['IL TASSISTA DI OSTIA','Italia 1988','con Diego Abatantuono'],
  ['UNA SETTIMANA AL MARE','Italia 1990','con Jerry Cala\' e Sabrina Salerno'],
  ['L\'ESTATE DI RICCARDO','Italia 1989','commedia sentimentale'],
  ['TRE CAMERE E CUCINA','Italia 1992','con Massimo Boldi']
];

function eveningFilm() { return choice(dailyRandom(510, 'film'), films); }

pages.set(501, () => {
  const film = eveningFilm();
  return normalise([
    ...heading(501, 'KAIUNO', 'C'),
    line('18.45  GIOCO A PREMI', 'W'),
    line('19.50  CHE TEMPO FA', 'W'),
    line('20.00  TELEGIORNALE', 'Y'),
    line('20.30  SPORT', 'W'),
    line(`20.40  FILM: ${film[0]}`, 'W'),
    line(`       ${film[1]}`, 'C'),
    line('22.25  TELEGIORNALE', 'W'),
    line('22.40  APPUNTAMENTO AL CINEMA', 'W'),
    line('23.00  SPECIALE NOTTE', 'W'),
    line('00.10  PREVISIONI DEL TEMPO', 'W'),
    ...footer('500 PROGRAMMI', '510 FILM')
  ]);
});

pages.set(502, () => normalise([
  ...heading(502, 'KAIDUE', 'C'),
  line('18.30  CARTONI ANIMATI', 'W'),
  line('19.15  TELEFILM', 'W'),
  line('20.15  TELEGIORNALE', 'Y'),
  line('20.40  QUIZ DELLA SERA', 'W'),
  line('21.35  SERIE: VITE IN CORSIA', 'W'),
  line('22.30  INCONTRI', 'W'),
  line('23.20  METEO 2', 'W'),
  line('23.30  FILM TV', 'W'),
  ...footer('500 PROGRAMMI', '503 KAITRE')
]));

pages.set(503, () => normalise([
  ...heading(503, 'KAITRE', 'C'),
  line('18.00  GEO - NATURA', 'W'),
  line('19.00  TELEGIORNALE REGIONALE', 'Y'),
  line('19.30  NOTIZIE NAZIONALI', 'W'),
  line('20.05  CARTOLINA ITALIANA', 'W'),
  line('20.30  CHI LO HA VISTO?', 'W'),
  line('22.15  DOCUMENTARIO', 'W'),
  line('23.20  FUORI ORARIO', 'W'),
  line('01.10  FINE DELLE TRASMISSIONI', 'C'),
  ...footer('500 PROGRAMMI', '501 KAIUNO')
]));

pages.set(510, () => {
  const film = eveningFilm();
  return normalise([
    ...heading(510, 'FILM DELLA SERA', 'C'),
    line('KAIUNO ORE 20.40', 'Y'),
    blank(),
    line(center(film[0]), 'W', 'B'),
    blank(),
    line(film[1], 'C'),
    line(film[2], 'W'),
    blank(),
    line('Commedia. Un gruppo di amici parte', 'W'),
    line('per una vacanza destinata a cambiare', 'W'),
    line('continuamente programma.', 'W'),
    blank(),
    line('PRIMA VISIONE TELEVISIVA', 'G'),
    ...footer('500 PROGRAMMI', '501 KAIUNO')
  ]);
});

pages.set(600, () => normalise([
  ...heading(600, 'GIOCHI E TEMPO LIBERO', 'M'),
  line('610  LOTTO - ULTIMA ESTRAZIONE', 'W'),
  line('615  TOTOCALCIO', 'W'),
  line('620  OROSCOPO', 'W'),
  line('640  ENIGMISTICA', 'W'),
  line('650  PICCOLA PUBBLICITA\'', 'W'),
  blank(),
  line('OGGI: NUMERO FORTUNATO', 'Y'),
  line(center(String(integer(dailyRandom(600,'numero'), 1, 90))), 'Y'),
  blank(),
  line('Le pagine cambiano con il nuovo giorno.', 'C'),
  ...footer('100 INDICE', '620 OROSCOPO')
]));

pages.set(610, () => {
  const r = dailyRandom(610, 'lotto');
  const draw = () => [...new Set(Array.from({length:8},()=>integer(r,1,90)))].slice(0,5).sort((a,b)=>a-b).map(n=>String(n).padStart(2,'0')).join('  ');
  return normalise([
    ...heading(610, 'LOTTO', 'M'),
    line('ULTIMA ESTRAZIONE', 'K', 'M'),
    blank(),
    line(`BARI      ${draw()}`, 'W'),
    line(`MILANO    ${draw()}`, 'W'),
    line(`NAPOLI    ${draw()}`, 'W'),
    line(`ROMA      ${draw()}`, 'W'),
    line(`TORINO    ${draw()}`, 'W'),
    blank(),
    line('Estrazione ricostruita.', 'C'),
    ...footer('600 GIOCHI', '620 OROSCOPO')
  ]);
});

const signs = [
  ['ARIETE','iniziativa','evitare la fretta'], ['TORO','costanza','accettare un cambiamento'],
  ['GEMELLI','comunicazione','ascoltare con calma'], ['CANCRO','sensibilita\'','non chiudersi troppo'],
  ['LEONE','sicurezza','lasciare spazio agli altri'], ['VERGINE','precisione','non cercare la perfezione'],
  ['BILANCIA','armonia','decidere senza rinviare'], ['SCORPIONE','intuito','misurare le parole'],
  ['SAGITTARIO','entusiasmo','controllare i dettagli'], ['CAPRICORNO','concretezza','concedersi una pausa'],
  ['ACQUARIO','originalita\'','mantenere una promessa'], ['PESCI','immaginazione','proteggere le energie']
];

pages.set(620, () => normalise([
  ...heading(620, 'OROSCOPO', 'M'),
  line('621 ARIETE       627 BILANCIA', 'W'),
  line('622 TORO         628 SCORPIONE', 'W'),
  line('623 GEMELLI      629 SAGITTARIO', 'W'),
  line('624 CANCRO       630 CAPRICORNO', 'W'),
  line('625 LEONE        631 ACQUARIO', 'W'),
  line('626 VERGINE      632 PESCI', 'W'),
  blank(),
  line('Previsioni per la giornata.', 'C'),
  line('Un invito positivo per ogni segno.', 'C'),
  ...footer('600 GIOCHI', '621 ARIETE')
]));

signs.forEach((sign, index) => {
  const page = 621 + index;
  pages.set(page, () => horoscopePage(page, sign));
});

function horoscopePage(page, [name, strength, caution]) {
  const r = dailyRandom(page, name);
  const openings = [
    `La ${strength} sara' la carta migliore.`,
    `Giornata favorevole alla ${strength}.`,
    `La tua ${strength} trova finalmente spazio.`,
    `Un fatto semplice premia la ${strength}.`
  ];
  const specifics = {
    ARIETE:['Una telefonata sblocca un programma.','Buona energia nel pomeriggio.'],
    TORO:['Un acquisto rimandato puo\' attendere.','In casa torna un clima sereno.'],
    GEMELLI:['Una conversazione porta chiarezza.','Possibile incontro curioso.'],
    CANCRO:['Una persona vicina offre sostegno.','Serata adatta ai ricordi belli.'],
    LEONE:['Un riconoscimento arriva senza rumore.','Occasione per guidare con misura.'],
    VERGINE:['Un dettaglio ben curato fara\' la differenza.','Ordine e metodo danno sollievo.'],
    BILANCIA:['Un accordo diventa piu\' semplice.','Buon momento per chiarire con gentilezza.'],
    SCORPIONE:['Un dubbio trova risposta.','L\'intuizione indica la strada giusta.'],
    SAGITTARIO:['Una proposta riaccende l\'entusiasmo.','Piccolo viaggio o cambio di scena.'],
    CAPRICORNO:['Un risultato concreto e\' vicino.','La pazienza produce un vantaggio.'],
    ACQUARIO:['Una idea insolita riceve attenzione.','Amicizie in primo piano.'],
    PESCI:['Un progetto creativo riprende vita.','Un gesto affettuoso cambia la serata.']
  };
  const ratings = ['★★★☆☆','★★★★☆','★★★★☆','★★★★★'];
  return normalise([
    ...heading(page, name, 'M'),
    line(center(name), 'K', 'M'),
    blank(),
    line(choice(r, openings), 'Y'),
    blank(),
    line(choice(r, specifics[name]), 'W'),
    line(`Consiglio: ${caution}.`, 'C'),
    blank(),
    line(`AMORE     ${choice(r, ratings)}`, 'W'),
    line(`LAVORO    ${choice(r, ratings)}`, 'W'),
    line(`FORTUNA   ${choice(r, ratings)}`, 'W'),
    blank(),
    line(`NUMERO    ${integer(r,1,90)}`, 'G'),
    ...footer('620 OROSCOPO', '600 GIOCHI')
  ]);
}

pages.set(700, () => normalise([
  ...heading(700, 'SCIENZA E SERVIZI', 'M'),
  line('701  COMPUTER E VIDEOGIOCHI', 'W'),
  line('710  RADIOAMATORI', 'W'),
  line('720  MERCATINO', 'W'),
  line('730  MESSAGGI DEGLI UTENTI', 'W'),
  line('740  ARCHIVIO', 'W'),
  blank(),
  line('777  SERVIZIO SPECIALE', 'Y'),
  blank(),
  line('Alcune pagine non sono annunciate.', 'C'),
  line('La ricezione puo\' variare nel tempo.', 'C'),
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
  ...heading(800, 'ALMANACCO', 'Y'),
  line(`OGGI E' ${dateLabel()}`, 'W'),
  blank(),
  line('801  IL GIORNO E LA STORIA', 'W'),
  line('810  RASSEGNA STAMPA', 'W'),
  line('820  SPETTACOLI', 'W'),
  line('830  APPUNTAMENTI', 'W'),
  line('840  NATURA E AMBIENTE', 'W'),
  line('850  VIAGGI', 'W'),
  blank(),
  line('IL SERVIZIO NOTTURNO RESTA ATTIVO', 'C'),
  line('ANCHE DOPO LA FINE DEI PROGRAMMI.', 'C'),
  ...footer('100 INDICE', '873 SEGNALE')
]));

pages.set(873, () => {
  const r = dailyRandom(873, 'segnale');
  const rare = r() > .70;
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
  line('KAI - SERVIZIO TELEVIDEO', 'Y'),
  blank(),
  line('Diffusione nazionale.', 'W'),
  line('Trasmissione continua.', 'W'),
  line('Aggiornamento automatico.', 'W'),
  blank(),
  line('La disponibilita\' delle pagine puo\'', 'W'),
  line('dipendere dalle condizioni di ricezione.', 'W'),
  blank(),
  line('Per tornare all\'indice: pagina 100.', 'C'),
  blank(),
  line('KAI TELEVIDEO - ROMA', 'G'),
  ...footer('100 INDICE')
]));

function generatedPage(pageNumber) {
  const r = dailyRandom(pageNumber, 'pagina-libera');
  const titles = ['SERVIZIO LOCALE','ARCHIVIO','COMUNICAZIONI','RUBRICA','NOTIZIARIO','PAGINA REGIONALE'];
  const texts = [
    'Il servizio riprendera\' regolarmente.',
    'Ulteriori informazioni non disponibili.',
    'La comunicazione resta valida fino a sera.',
    'Aggiornamento previsto nelle prossime ore.',
    'La pagina e\' trasmessa a intervalli.',
    'Conservare il numero per successive notizie.'
  ];
  return normalise([
    ...heading(pageNumber, choice(r,titles), choice(r,['Y','C','G','M'])),
    blank(),
    line(choice(r,texts), 'W'),
    blank(),
    line(choice(r,texts), 'W'),
    blank(),
    line(r()>.64 ? `SEGUE A PAGINA ${integer(r,100,899)}` : '', 'C'),
    blank(), blank(),
    ...footer('100 INDICE')
  ]);
}

function missingPage(pageNumber) {
  return normalise([
    ...heading(pageNumber, 'RICERCA', 'C'),
    blank(), blank(), blank(), blank(),
    line(center('PAGINA NON TRASMESSA'), 'Y'),
    blank(),
    line(center('ATTENDERE O DIGITARE'), 'W'),
    line(center('UN ALTRO NUMERO'), 'W'),
    blank(), blank(),
    ...footer('100 INDICE')
  ]);
}

function pageExists(pageNumber) {
  if (pages.has(pageNumber)) return true;
  return dailyRandom(pageNumber, 'esistenza')() > .84;
}

function remember(pageNumber) {
  if (pages.has(pageNumber)) return;
  const key = 'kai-televideo-scoperte';
  const previous = JSON.parse(localStorage.getItem(key) || '[]');
  if (!previous.includes(pageNumber)) {
    previous.push(pageNumber);
    localStorage.setItem(key, JSON.stringify(previous));
  }
}

async function render(pageNumber) {
  currentPage = pageNumber;
  indicator.textContent = `P${pageNumber}`;
  const factory = pages.get(pageNumber);
  if (factory) {
    renderLines(await factory());
  } else if (pageExists(pageNumber)) {
    remember(pageNumber);
    renderLines(generatedPage(pageNumber));
  } else {
    renderLines(missingPage(pageNumber));
  }
}

async function requestPage(pageNumber) {
  if (pageNumber < MIN_PAGE || pageNumber > MAX_PAGE) return;
  const token = ++requestToken;
  indicator.textContent = `P${String(pageNumber).padStart(3, '0')}`;
  renderLines([
    ...heading(pageNumber, 'RICERCA', 'C'),
    blank(), blank(), blank(),
    line(center('RICERCA PAGINA...'), 'Y')
  ]);
  const r = dailyRandom(pageNumber, 'ritardo');
  await new Promise(resolve => setTimeout(resolve, 230 + Math.floor(r() * 650)));
  if (token === requestToken) await render(pageNumber);
}

function commitBuffer() {
  if (inputBuffer.length !== 3) return;
  const page = Number(inputBuffer);
  inputBuffer = '';
  requestPage(page);
}

function clickSound() {
  if (!audioContext || !humNodes) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'square'; osc.frequency.value = 105;
  gain.gain.setValueAtTime(.018, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .035);
  osc.connect(gain).connect(audioContext.destination);
  osc.start(); osc.stop(audioContext.currentTime + .04);
}

function toggleHum() {
  if (humNodes) {
    humNodes.forEach(node => { try { node.stop?.(); } catch (_) {} try { node.disconnect?.(); } catch (_) {} });
    humNodes = null;
    localStorage.setItem('kai-hum','0');
    return;
  }
  audioContext ??= new AudioContext();
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  osc.type = 'sawtooth'; osc.frequency.value = 50;
  filter.type = 'lowpass'; filter.frequency.value = 160;
  gain.gain.value = .012;
  osc.connect(filter).connect(gain).connect(audioContext.destination);
  osc.start();
  humNodes = [osc, filter, gain];
  localStorage.setItem('kai-hum','1');
}

function handleKey(event) {
  if (/^[0-9]$/.test(event.key)) {
    inputBuffer = (inputBuffer + event.key).slice(-3);
    indicator.textContent = `P${inputBuffer.padEnd(3, '–')}`;
    clickSound();
    if (inputBuffer.length === 3) setTimeout(commitBuffer, 110);
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
      localStorage.setItem('kai-crt', screen.classList.contains('crt') ? '1' : '0');
      break;
    case 'm': case 'M': toggleHum(); break;
    case 'Escape': inputBuffer = ''; indicator.textContent = `P${currentPage}`; break;
    default: return;
  }
  clickSound();
  event.preventDefault();
}

document.addEventListener('keydown', handleKey);
screen.addEventListener('click', () => screen.focus());
serviceNode.textContent = 'KAI TELEVIDEO';
if (localStorage.getItem('kai-crt') !== '0') screen.classList.add('crt');

function updateClock() {
  clockNode.textContent = new Date().toLocaleTimeString('it-IT', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}
setInterval(updateClock, 1000);
updateClock();
requestPage(HOME);
screen.focus();
