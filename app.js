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
let humNode = null;

const colours = {
  W: '#ffffff', Y: '#ffff00', C: '#00ffff', G: '#00ff00',
  R: '#ff0000', B: '#0000ff', M: '#ff00ff'
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

function wrap(text, colour = 'W', bg = '') {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const rows = [];
  let current = '';
  for (const word of words) {
    if (word.length > WIDTH) {
      if (current) rows.push(line(current, colour, bg));
      for (let i = 0; i < word.length; i += WIDTH) rows.push(line(word.slice(i, i + WIDTH), colour, bg));
      current = '';
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > WIDTH) {
      rows.push(line(current, colour, bg));
      current = word;
    } else current = candidate;
  }
  if (current || !rows.length) rows.push(line(current, colour, bg));
  return rows;
}

function normalise(lines) {
  const flat = lines.flat(Infinity).filter(Boolean).slice(0, HEIGHT);
  while (flat.length < HEIGHT) flat.push(blank());
  return flat;
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

function dailyRandom(page, salt = '') {
  const now = new Date();
  const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  return mulberry32(hashString(`${key}:${page}:${salt}`));
}

const choice = (r, values) => values[Math.floor(r() * values.length)];
const score = r => 5 + Math.floor(r() * 5);

function heading(page, title, colour = 'Y') {
  return [
    line(`KAI TELEVIDEO ${String(page).padStart(3, '0')} ${title}`, colour),
    line('-'.repeat(WIDTH), colour)
  ];
}

function footer(left = '100 INDICE', right = '') {
  return [
    line('-'.repeat(WIDTH), 'B'),
    line(`${left}${right ? right.padStart(Math.max(1, WIDTH - left.length)) : ''}`, 'C')
  ];
}

function simpleIndex(page, title, items, colour = 'C') {
  return normalise([
    ...heading(page, title, colour),
    blank(),
    ...items.map(([n, label, c = 'W']) => line(`${n}  ${label}`, c)),
    blank(),
    ...footer('100 INDICE')
  ]);
}

const pages = new Map();

pages.set(100, () => normalise([
  line('       KAI TELEVIDEO - INDICE       ', 'Y', 'B'),
  line('      SERVIZIO NAZIONALE KAI        ', 'W'),
  line('-'.repeat(WIDTH), 'Y'),
  line("101  ULTIM'ORA", 'Y'),
  line('102  NOTIZIE DEL GIORNO', 'W'),
  line('110  PRIMO PIANO', 'W'),
  line('120  POLITICA', 'W'),
  line('130  ECONOMIA', 'W'),
  line('140  CRONACHE ITALIANE', 'W'),
  line('150  DAL MONDO', 'W'),
  line('160  CULTURA E SPETTACOLO', 'W'),
  line('200  SPORT', 'G'),
  line('300  BORSA E FINANZA', 'G'),
  line("400  PUBBLICA UTILITA'", 'C'),
  line('450  PREVISIONI DEL TEMPO', 'C'),
  line('500  PROGRAMMI TV E RADIO', 'C'),
  line('600  GIOCHI - LOTTO - OROSCOPO', 'M'),
  line('700  COMPUTER E SERVIZI', 'M'),
  line('800  ALMANACCO E RUBRICHE', 'Y'),
  line('899  INFORMAZIONI SUL SERVIZIO', 'C'),
  line('   DIGITARE IL NUMERO DI PAGINA    ', 'W', 'B'),
  line('   AGGIORNAMENTO AUTOMATICO CONTINUO', 'G')
]));

pages.set(101, () => {
  const r = dailyRandom(101, 'flash');
  const leads = [
    'Il Consiglio dei Ministri ha concluso i lavori. Un comunicato e atteso nelle prossime ore.',
    'Traffico intenso sulle principali direttrici. Rallentamenti segnalati in uscita dalle citta.',
    'Temperature elevate al Centro e al Sud. La Protezione civile invita alla prudenza.',
    'Raggiunta una intesa al termine del vertice. I dettagli saranno resi noti in serata.'
  ];
  return normalise([
    ...heading(101, "ULTIM'ORA", 'Y'),
    line(" ULTIM'ORA ", 'W', 'R'),
    blank(),
    ...wrap(choice(r, leads), 'Y'),
    blank(),
    line('AGGIORNAMENTO ORE ' + new Date().toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}), 'C'),
    blank(),
    ...footer('100 INDICE', '102 NOTIZIE')
  ]);
});

pages.set(102, () => simpleIndex(102, 'NOTIZIE', [
  [110, 'PRIMO PIANO'], [120, 'POLITICA ITALIANA'], [130, 'ECONOMIA E LAVORO'],
  [140, 'CRONACHE ITALIANE'], [150, 'NOTIZIE DAL MONDO'], [160, 'CULTURA E SPETTACOLO'],
  [170, 'SCIENZA E SALUTE'], [180, 'DOSSIER E SPECIALI'], [190, 'RASSEGNA STAMPA']
], 'Y'));

function newsPage(page, title, themes) {
  const r = dailyRandom(page, title);
  return normalise([
    ...heading(page, title, 'Y'),
    blank(),
    line(choice(r, themes).toUpperCase(), 'Y'),
    ...wrap(choice(r, [
      'La giornata si e svolta senza particolari difficolta. Ulteriori informazioni sono attese in serata.',
      'Le autorita hanno confermato che la situazione resta sotto controllo. Proseguono le verifiche.',
      'Il provvedimento sara esaminato nei prossimi giorni. Reazioni prudenti da maggioranza e opposizione.',
      'L iniziativa ha raccolto interesse tra cittadini e operatori del settore. Nuovi incontri sono previsti domani.'
    ]), 'W'),
    blank(),
    line('SEGUE A PAGINA ' + (page + 1), 'C'),
    ...footer('102 NOTIZIE', '100 INDICE')
  ]);
}

pages.set(110, () => newsPage(110, 'PRIMO PIANO', ['VERTICE A PALAZZO CHIGI', 'ESTATE, CRESCONO LE PARTENZE', 'NUOVE MISURE PER LE FAMIGLIE']));
pages.set(120, () => newsPage(120, 'POLITICA', ['CAMERA: RIPRENDONO I LAVORI', 'CONFRONTO TRA I PARTITI', 'REGIONI, INCONTRO A ROMA']));
pages.set(130, () => newsPage(130, 'ECONOMIA', ['INDUSTRIA, DATI IN RECUPERO', 'PREZZI STABILI NEI GRANDI CENTRI', 'LAVORO, NUOVO TAVOLO DI CONFRONTO']));
pages.set(140, () => newsPage(140, 'ITALIA', ['ROMA, PIANO PER IL TRAFFICO', 'NAPOLI, RIAPRE IL LUNGOMARE', 'TORINO, MOSTRA SULLA CITTA']));
pages.set(150, () => newsPage(150, 'ESTERO', ['BRUXELLES, RIUNIONE DEI MINISTRI', 'LONDRA, DIBATTITO AI COMUNI', 'MADRID, NUOVO PIANO URBANO']));
pages.set(160, () => newsPage(160, 'SPETTACOLO', ['ESTATE, TORNANO I FILM COMICI', 'MUSICA ITALIANA IN PIAZZA', 'TV, NUOVI PROGRAMMI IN AUTUNNO']));
pages.set(170, () => newsPage(170, 'SCIENZA E SALUTE', ['SOLE, I CONSIGLI DEI MEDICI', 'SPAZIO, NUOVA MISSIONE EUROPEA', 'RICERCA, RISULTATI INCORAGGIANTI']));
pages.set(180, () => newsPage(180, 'DOSSIER', ['LA TELEVISIONE CHE CAMBIA', 'TRENT ANNI DI INFORMATICA', 'LE CITTA E IL GRAN CALDO']));
pages.set(190, () => newsPage(190, 'RASSEGNA STAMPA', ['LE APERTURE DEI QUOTIDIANI', 'ECONOMIA IN PRIMA PAGINA', 'SPORT, ATTESA PER IL CAMPIONATO']));

pages.set(200, () => simpleIndex(200, 'SPORT', [
  [201, 'CALCIO - NOTIZIE'], [202, 'SERIE A'], [203, 'SERIE B'], [210, 'COPPE EUROPEE'],
  [220, 'CICLISMO'], [230, 'FORMULA UNO'], [240, 'TENNIS'], [250, 'BASKET'], [260, 'ALTRI SPORT']
], 'G'));

function sportPage(page, title, entries) {
  const r = dailyRandom(page, title);
  return normalise([
    ...heading(page, title, 'G'), blank(),
    ...entries.flatMap(e => [line(choice(r, e), 'Y'), ...wrap(choice(r, [
      'Allenamento regolare. Il tecnico sciogliera gli ultimi dubbi domani mattina.',
      'Pubblico numeroso e clima favorevole. La gara si annuncia equilibrata.',
      'Il risultato premia la maggiore continuita. Decisivo il finale di gara.'
    ]), 'W'), blank()]),
    ...footer('200 SPORT', '100 INDICE')
  ]);
}
pages.set(201, () => sportPage(201, 'CALCIO', [['RITIRO, DUE GOL NEL TEST', 'MERCATO, TRATTATIVA IN CORSO'], ['IL TECNICO: SERVE PAZIENZA', 'TIFOSI IN ATTESA DEI NUOVI ACQUISTI']]));
pages.set(202, () => sportPage(202, 'SERIE A', [['CAMPIONATO, CALENDARIO DOMANI', 'SQUADRE AL LAVORO NEI RITIRI'], ['MILAN E JUVE GIA IN FORMA', 'ROMA, PROVE DI ATTACCO']]));
pages.set(203, () => sportPage(203, 'SERIE B', [['NUOVE PANCHINE PER SEI CLUB', 'ATTESA PER I RIPESCAGGI'], ['OBIETTIVO PROMOZIONE', 'GIOVANI IN EVIDENZA']]));
pages.set(220, () => sportPage(220, 'CICLISMO', [['TAPPA DI MONTAGNA DECISIVA', 'VOLATA SUL LUNGOMARE'], ['MAGLIA ROSA SALDA', 'FUGA RIPRESA NEL FINALE']]));
pages.set(230, () => sportPage(230, 'FORMULA UNO', [['PROVE, MIGLIOR TEMPO FERRARI', 'POLE DECISA PER POCHI CENTESIMI'], ['PILOTI: GARA APERTA', 'METEO INCERTO SUL CIRCUITO']]));
pages.set(240, () => sportPage(240, 'TENNIS', [['ITALIANO AL SECONDO TURNO', 'FINALE DOPO TRE SET'], ['SERVIZIO DECISIVO', 'PUBBLICO DELLE GRANDI OCCASIONI']]));
pages.set(250, () => sportPage(250, 'BASKET', [['FINALE SCUDETTO, GARA TRE', 'AZZURRI IN RADUNO'], ['DECISIVO IL TIRO DA TRE', 'DIFESA SOLIDA NEL FINALE']]));

pages.set(300, () => simpleIndex(300, 'BORSA E FINANZA', [
  [301, 'CAMBI UFFICIALI'], [302, 'BORSA DI MILANO'], [303, 'TITOLI PRINCIPALI'],
  [304, 'BOT E CCT'], [305, 'MERCATI ESTERI'], [310, 'ORO E MATERIE PRIME'], [320, 'NOTIZIARIO ECONOMICO']
], 'G'));

pages.set(301, async () => {
  let rates = { USD: '1.16', GBP: '0.86', CHF: '0.93', JPY: '171.2' };
  try {
    const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CHF,JPY', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      rates = Object.fromEntries(Object.entries(data.rates).map(([k,v]) => [k, Number(v).toFixed(k === 'JPY' ? 2 : 4)]));
    }
  } catch {}
  return normalise([
    ...heading(301, 'CAMBI UFFICIALI', 'G'),
    line('VALUTA              PER 1 EURO', 'W', 'B'), blank(),
    line(`DOLLARO USA          ${rates.USD}`, 'W'),
    line(`STERLINA             ${rates.GBP}`, 'W'),
    line(`FRANCO SVIZZERO      ${rates.CHF}`, 'W'),
    line(`YEN GIAPPONESE       ${rates.JPY}`, 'W'), blank(),
    line('1 EURO = 1936,27 LIRE', 'Y'),
    line('Dati indicativi di riferimento.', 'C'),
    ...footer('300 BORSA', '302 MILANO')
  ]);
});

pages.set(302, () => {
  const r = dailyRandom(302, 'mib');
  const delta = () => `${r() > .5 ? '+' : '-'}${(r()*2.8).toFixed(2)}`;
  return normalise([
    ...heading(302, 'BORSA MILANO', 'G'),
    line('INDICE              VARIAZIONE', 'W', 'B'), blank(),
    line(`MIB GENERALE         ${delta()}%`, 'W'),
    line(`BANCARI              ${delta()}%`, 'W'),
    line(`ASSICURATIVI         ${delta()}%`, 'W'),
    line(`INDUSTRIALI          ${delta()}%`, 'W'),
    line(`TELEMATICI           ${delta()}%`, 'W'), blank(),
    line('CONTRATTAZIONI REGOLARI', 'C'),
    ...footer('301 CAMBI', '303 TITOLI')
  ]);
});

pages.set(303, () => {
  const r = dailyRandom(303, 'titoli');
  return normalise([
    ...heading(303, 'TITOLI PRINCIPALI', 'G'),
    line('TITOLO          PREZZO   VAR', 'W', 'B'),
    ...['FIAT','OLIVETTI','PIRELLI','ENI','GENERALI','MEDIOBANCA','STET','MONDADORI'].map(name => {
      const price = (5 + r()*45).toFixed(2);
      const variation = `${r()>.5?'+':'-'}${(r()*2).toFixed(2)}`;
      return line(`${name.padEnd(14)}${price.padStart(6)} ${variation.padStart(6)}`, 'W');
    }),
    ...footer('302 MILANO', '300 BORSA')
  ]);
});

pages.set(400, () => simpleIndex(400, "PUBBLICA UTILITA'", [
  [401, 'NUMERI UTILI'], [410, 'TRAFFICO E AUTOSTRADE'], [420, 'TRENI E TRASPORTI'],
  [430, 'FARMACIE E SANITA'], [440, 'SCUOLA E UNIVERSITA'], [450, 'PREVISIONI DEL TEMPO'], [460, 'POSTE E TELEFONI']
], 'C'));

pages.set(401, () => normalise([
  ...heading(401, 'NUMERI UTILI', 'C'), blank(),
  line('CARABINIERI                 112', 'W'),
  line('POLIZIA                     113', 'W'),
  line('VIGILI DEL FUOCO            115', 'W'),
  line('EMERGENZA SANITARIA         118', 'W'),
  line('SOCCORSO STRADALE           116', 'W'), blank(),
  ...wrap('I numeri riportati sono quelli storicamente in uso in Italia nei primi anni Novanta.', 'Y'),
  ...footer('400 UTILITA', '410 TRAFFICO')
]));

pages.set(410, () => normalise([
  ...heading(410, 'TRAFFICO', 'C'),
  line('A1 MILANO-ROMA', 'Y'), ...wrap('Traffico intenso tra Firenze e Incisa. Code a tratti in direzione sud.', 'W'), blank(),
  line('A2 ROMA-NAPOLI', 'Y'), ...wrap('Circolazione regolare. Rallentamenti ai caselli principali.', 'W'), blank(),
  line('GRA ROMA', 'Y'), ...wrap('Traffico sostenuto tra Appia e Tiburtina.', 'W'),
  ...footer('400 UTILITA', '420 TRENI')
]));

pages.set(420, () => normalise([
  ...heading(420, 'TRENI', 'C'),
  line('ROMA TERMINI', 'Y'),
  line('18.10 MILANO C.LE      BIN 5', 'W'),
  line('18.22 NAPOLI C.LE      BIN 9', 'W'),
  line('18.35 FIRENZE S.M.N.   BIN 3', 'W'),
  line('18.42 BARI C.LE        BIN 7', 'W'), blank(),
  ...wrap('Ritardi contenuti entro quindici minuti. Verificare gli annunci in stazione.', 'C'),
  ...footer('410 TRAFFICO', '400 UTILITA')
]));

pages.set(450, async () => {
  let t = 29, max = 33, min = 21, wind = 11, code = 0;
  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=41.89&longitude=12.51&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FRome&forecast_days=1', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      t = Math.round(data.current.temperature_2m);
      wind = Math.round(data.current.wind_speed_10m);
      code = data.current.weather_code;
      max = Math.round(data.daily.temperature_2m_max[0]);
      min = Math.round(data.daily.temperature_2m_min[0]);
    }
  } catch {}
  const condition = code >= 80 ? 'ROVESCI SPARSI' : code >= 51 ? 'PIOGGE DEBOLI' : code >= 2 ? 'PARZIALMENTE NUVOLOSO' : 'SERENO O POCO NUVOLOSO';
  return normalise([
    ...heading(450, 'IL TEMPO', 'C'),
    line('ROMA', 'Y'),
    line(`ORA ${String(t).padStart(2)} GRADI   MAX ${max} MIN ${min}`, 'W'),
    line(`VENTO ${wind} KM/H`, 'W'), blank(),
    line(condition, 'Y'),
    ...wrap('Nord: variabile sui rilievi. Centro: caldo e ventilazione debole. Sud: sereno, mari poco mossi.', 'W'),
    blank(), line('DATI AGGIORNATI IN LINEA', 'G'),
    ...footer('400 UTILITA', '451 CITTA')
  ]);
});

pages.set(451, () => {
  const r = dailyRandom(451, 'citta');
  const cities = ['ROMA','MILANO','TORINO','FIRENZE','NAPOLI','PALERMO','CAGLIARI','LUSSEMBURGO'];
  return normalise([
    ...heading(451, 'TEMPERATURE', 'C'),
    line('CITTA            MAX MIN', 'W', 'B'),
    ...cities.map(city => {
      const hi = 24 + Math.floor(r()*13); const lo = hi - 7 - Math.floor(r()*5);
      return line(`${city.padEnd(16)}${String(hi).padStart(3)} ${String(lo).padStart(3)}`, 'W');
    }),
    ...footer('450 IL TEMPO', '100 INDICE')
  ]);
});

pages.set(500, () => simpleIndex(500, 'PROGRAMMI TV', [
  [501, 'KAIUNO'], [502, 'KAIDUE'], [503, 'KAITRE'], [510, 'FILM DELLA SERA'],
  [520, 'POMERIGGIO TV'], [530, 'PROGRAMMI DI DOMANI'], [540, 'RADIO KAI']
], 'C'));

function tvPage(page, channel, schedule) {
  return normalise([
    ...heading(page, channel, 'C'), blank(),
    ...schedule.map(([time, title, c='W']) => line(`${time}  ${title}`, c)),
    blank(),
    ...footer('500 PROGRAMMI', '510 FILM')
  ]);
}
pages.set(501, () => tvPage(501, 'KAIUNO', [['18.00','TG RAGAZZI'],['18.30','QUIZ ESTIVO'],['19.35','ALMANACCO DEL GIORNO'],['20.00','TELEGIORNALE','Y'],['20.30','IL TEMPO'],['20.40','FILM DELLA SERA','Y'],['22.25','SPECIALE NOTTE'],['23.10','TG NOTTE']]));
pages.set(502, () => tvPage(502, 'KAIDUE', [['18.15','TELEFILM'],['19.05','CARTONI ANIMATI'],['19.45','TG2'],['20.15','QUIZ DEL GIOVEDI'],['21.00','VARIETA ESTIVO','Y'],['22.30','SPORT SERA'],['23.10','METEO DUE']]));
pages.set(503, () => tvPage(503, 'KAITRE', [['18.00','GEO'],['19.00','TG REGIONALE'],['19.35','BLOB'],['20.00','TG3'],['20.30','DOCUMENTARIO'],['21.30','CHI L HA VISTO?','Y'],['23.05','FUORI ORARIO']]));

pages.set(510, () => {
  const r = dailyRandom(510, 'film');
  const films = [
    ['VACANZE A FREGHENE', 'con Jerry Cala e Marina Suma', 'Commedia, Italia 1988'],
    ['IL TASSISTA DI OSTIA', 'con Diego Abatantuono', 'Commedia, Italia 1990'],
    ['RIMINI RIMINI ANCORA', 'con Jerry Cala e Corinne Clery', 'Commedia, Italia 1991'],
    ['UN ESTATE AL JUKE BOX', 'con Christian De Sica', 'Commedia, Italia 1987'],
    ['IL BARISTA DEL TIRRENO', 'con Massimo Boldi', 'Commedia, Italia 1992']
  ];
  const [title, cast, genre] = choice(r, films);
  return normalise([
    ...heading(510, 'FILM DELLA SERA', 'C'),
    line('KAIUNO ORE 20.40', 'Y'), blank(),
    ...wrap(title, 'Y'),
    ...wrap(cast, 'W'),
    ...wrap(genre, 'C'), blank(),
    ...wrap('Un gruppo di amici parte per le vacanze. Tra equivoci, gelosie e un albergo sul mare, la settimana sara meno tranquilla del previsto.', 'W'),
    blank(), line('DURATA 105 MINUTI', 'G'),
    ...footer('500 PROGRAMMI', '501 KAIUNO')
  ]);
});

pages.set(600, () => simpleIndex(600, 'GIOCHI E TEMPO LIBERO', [
  [601, 'LOTTO - ESTRAZIONE'], [610, 'TOTOCALCIO'], [620, 'OROSCOPO'], [640, 'ENIGMISTICA'],
  [650, 'PUBBLICITA E NOVITA'], [660, 'CUCINA'], [670, 'GIARDINAGGIO']
], 'M'));

pages.set(601, () => {
  const r = dailyRandom(601, 'lotto');
  const draw = () => [...new Set(Array.from({length:12}, () => 1 + Math.floor(r()*90)))].slice(0,5).sort((a,b)=>a-b).map(n=>String(n).padStart(2,'0')).join(' ');
  return normalise([
    ...heading(601, 'LOTTO', 'M'),
    line('ULTIMA ESTRAZIONE', 'W', 'B'), blank(),
    line(`BARI      ${draw()}`, 'W'),
    line(`CAGLIARI  ${draw()}`, 'W'),
    line(`FIRENZE   ${draw()}`, 'W'),
    line(`MILANO    ${draw()}`, 'W'),
    line(`NAPOLI    ${draw()}`, 'W'),
    line(`PALERMO   ${draw()}`, 'W'),
    line(`ROMA      ${draw()}`, 'Y'),
    line(`TORINO    ${draw()}`, 'W'),
    line(`VENEZIA   ${draw()}`, 'W'),
    ...footer('600 GIOCHI', '610 TOTOCALCIO')
  ]);
});

pages.set(620, () => simpleIndex(620, 'OROSCOPO', [
  [621,'ARIETE'],[622,'TORO'],[623,'GEMELLI'],[624,'CANCRO'],[625,'LEONE'],[626,'VERGINE'],
  [627,'BILANCIA'],[628,'SCORPIONE'],[629,'SAGITTARIO'],[630,'CAPRICORNO'],[631,'ACQUARIO'],[632,'PESCI']
], 'M'));

const zodiac = [
  ['ARIETE',['iniziativa','decisione','energia'],['Evita di anticipare troppo i tempi.','Una telefonata chiarira una questione.']],
  ['TORO',['concretezza','stabilita','pazienza'],['Una scelta pratica dara buoni risultati.','Difendi il tuo tempo senza irrigidirti.']],
  ['GEMELLI',['curiosita','dialogo','movimento'],['Una conversazione apre una nuova strada.','Metti ordine tra troppe idee.']],
  ['CANCRO',['sensibilita','famiglia','memoria'],['Un gesto semplice riporta serenita.','Ascolta senza assorbire ogni tensione.']],
  ['LEONE',['coraggio','presenza','creativita'],['E il momento di mostrare un progetto.','La fiducia cresce con risultati concreti.']],
  ['VERGINE',['precisione','metodo','cura'],['La precisione sara premiata.','Concediti una pausa senza sensi di colpa.']],
  ['BILANCIA',['equilibrio','intesa','diplomazia'],['Un accordo diventa finalmente possibile.','Non rimandare una decisione necessaria.']],
  ['SCORPIONE',['intuito','tenacia','profondita'],['Capirai cio che finora era rimasto nascosto.','Usa la determinazione senza durezza.']],
  ['SAGITTARIO',['slancio','viaggio','fiducia'],['Una novita rimette in moto i programmi.','Non promettere piu di quanto puoi fare.']],
  ['CAPRICORNO',['costanza','lavoro','responsabilita'],['Un impegno lungo comincia a dare frutti.','Accetta un aiuto senza sentirti in debito.']],
  ['ACQUARIO',['originalita','amicizia','cambiamento'],['Una idea insolita trova finalmente spazio.','Condividi il progetto con chi capisce davvero.']],
  ['PESCI',['immaginazione','empatia','intuizione'],['La tua immaginazione trova finalmente spazio.','Un progetto creativo riprende vita.']]
];

zodiac.forEach(([sign, traits, notes], index) => {
  const page = 621 + index;
  pages.set(page, () => {
    const r = dailyRandom(page, sign);
    const intro = choice(r, notes);
    const second = choice(r, [
      `Giornata favorevole per usare ${choice(r, traits)} con equilibrio.`,
      `Le ore centrali premiano ${choice(r, traits)} e buon senso.`,
      `Una piccola conferma rafforza la tua ${choice(r, traits)}.`
    ]);
    return normalise([
      ...heading(page, sign, 'M'),
      line(center(sign), 'W', 'M'), blank(),
      ...wrap(intro, 'Y'),
      ...wrap(second, 'W'),
      blank(),
      line(`AMORE      ${score(r)}/10`, 'W'),
      line(`LAVORO     ${score(r)}/10`, 'W'),
      line(`FORTUNA    ${score(r)}/10`, 'W'),
      blank(), line(`NUMERO     ${1 + Math.floor(r()*90)}`, 'G'),
      ...footer('620 OROSCOPO', '600 GIOCHI')
    ]);
  });
});

pages.set(640, () => {
  const r = dailyRandom(640, 'quiz');
  const riddles = [
    ['PIU E GRANDE E MENO SI VEDE. COS E?', 'IL BUIO'],
    ['HA DENTI MA NON MORDE. COS E?', 'IL PETTINE'],
    ['CORRE SENZA GAMBE. COS E?', 'IL FIUME']
  ];
  const [q,a] = choice(r, riddles);
  return normalise([
    ...heading(640, 'ENIGMISTICA', 'M'), blank(),
    line('INDOVINELLO DEL GIORNO', 'Y'),
    ...wrap(q, 'W'), blank(),
    line('SOLUZIONE A PAGINA 641', 'C'),
    blank(), line('ANAGRAMMA', 'Y'),
    line('ROMA = AMOR', 'W'),
    ...footer('600 GIOCHI', '641 SOLUZIONE')
  ]);
});
pages.set(641, () => normalise([...heading(641, 'SOLUZIONI', 'M'), blank(), line('LA RISPOSTA ERA:', 'Y'), line(center('IL BUIO'), 'W'), blank(), ...footer('640 ENIGMISTICA', '600 GIOCHI')]));

pages.set(650, () => {
  const r = dailyRandom(650, 'ads');
  const ads = [
    ['COMMODORE AMIGA 600', 'grafica, suono e divertimento', 'dal rivenditore autorizzato'],
    ['OLIVETTI M290', 'il personal computer italiano', 'affidabilita per casa e ufficio'],
    ['PHILIPS COLOR TV', 'con Televideo e telecomando', '100 pagine in memoria'],
    ['SONY WALKMAN', 'la musica viene con te', 'stereo tascabile']
  ];
  const [name,tag,detail] = choice(r, ads);
  return normalise([
    ...heading(650, 'NOVITA', 'M'), blank(),
    line(center(name), 'Y'), blank(),
    line(center(tag), 'W'),
    line(center(detail), 'C'), blank(),
    line(center('CHIEDI INFORMAZIONI'), 'G'),
    line(center('AL TUO RIVENDITORE'), 'G'),
    ...footer('600 GIOCHI', '700 COMPUTER')
  ]);
});

pages.set(700, () => simpleIndex(700, 'COMPUTER E SERVIZI', [
  [701, 'COMPUTER DOMESTICI'], [710, 'VIDEOGIOCHI'], [720, 'MERCATINO'], [730, 'BBS E MODEM'],
  [740, 'RADIOAMATORI'], [750, 'ELETTRONICA'], [777, 'SERVIZIO SPECIALE']
], 'M'));

pages.set(701, () => normalise([
  ...heading(701, 'HOME COMPUTER', 'M'),
  line('AMIGA 600', 'Y'), ...wrap('Nuova versione compatta con grafica a colori e unita a dischetti incorporata.', 'W'), blank(),
  line('ATARI ST', 'Y'), ...wrap('Scelto da musicisti e appassionati di grafica.', 'W'), blank(),
  line('PC COMPATIBILI', 'Y'), ...wrap('Si diffondono nelle case i modelli 386 e 486.', 'W'),
  ...footer('700 COMPUTER', '710 GIOCHI')
]));

pages.set(710, () => normalise([
  ...heading(710, 'VIDEOGIOCHI', 'M'),
  line('CONSOLE A 16 BIT', 'Y'), ...wrap('Sfida tra Super Nintendo e Mega Drive. Nuovi titoli attesi per l autunno.', 'W'), blank(),
  line('PORTATILI', 'Y'), ...wrap('Game Boy resta il piu diffuso. Cresce l interesse per Game Gear.', 'W'), blank(),
  line('SALA GIOCHI', 'Y'), ...wrap('I picchiaduro attirano ancora lunghe file.', 'W'),
  ...footer('700 COMPUTER', '720 MERCATINO')
]));

pages.set(720, () => normalise([
  ...heading(720, 'MERCATINO', 'M'),
  line('VENDO AMIGA 500 CON MONITOR', 'Y'),
  line('Due joystick e 15 dischetti.', 'W'),
  line('Prezzo lire 450.000.', 'C'), blank(),
  line('CERCO MANUALE MODEM 2400 BAUD', 'Y'),
  line('Scambio con giochi originali.', 'W'), blank(),
  line('VENDO GAME BOY COMPLETO', 'Y'),
  line('Con Tetris e custodia rigida.', 'W'),
  ...footer('700 COMPUTER', '730 BBS')
]));

pages.set(730, () => normalise([
  ...heading(730, 'BBS E MODEM', 'M'),
  line('KAI BBS', 'Y'),
  line('Velocita 1200/2400 baud', 'W'),
  line('Orario 22.00 - 07.00', 'W'),
  line('Una linea disponibile', 'W'), blank(),
  ...wrap('Messaggi, programmi di pubblico dominio, listini e scambio posta elettronica.', 'C'), blank(),
  line('Tenere libera la linea telefonica.', 'G'),
  ...footer('700 COMPUTER', '740 RADIO')
]));

pages.set(777, () => normalise([
  ...heading(777, 'SERVIZIO SPECIALE', 'Y'), blank(), blank(),
  line(center('PAGINA NON DESTINATA'), 'W'),
  line(center('AL PUBBLICO'), 'W'), blank(),
  line(center('IL SEGNALE RICORDA'), 'C'),
  line(center('IL NUMERO'), 'C'), blank(),
  line(center('PROSSIMA VERIFICA: 873'), 'Y'),
  ...footer('100 INDICE')
]));

pages.set(800, () => simpleIndex(800, 'ALMANACCO', [
  [801, 'IL GIORNO'], [810, 'OGGI NELLA STORIA'], [820, 'SPETTACOLI'], [830, 'APPUNTAMENTI'],
  [840, 'NATURA'], [850, 'VIAGGI'], [860, 'RICETTE'], [873, 'SEGNALE']
], 'Y'));

pages.set(801, () => {
  const now = new Date();
  return normalise([
    ...heading(801, 'IL GIORNO', 'Y'), blank(),
    line(now.toLocaleDateString('it-IT', {weekday:'long', day:'numeric', month:'long', year:'numeric'}).toUpperCase(), 'Y'), blank(),
    line(`GIORNO DELL ANNO  ${Math.ceil((now - new Date(now.getFullYear(),0,1))/86400000)+1}`, 'W'),
    line(`SETTIMANA          ${Math.ceil((((now-new Date(now.getFullYear(),0,1))/86400000)+new Date(now.getFullYear(),0,1).getDay()+1)/7)}`, 'W'), blank(),
    line('IL SOLE', 'C'), line('Sorge 06.05   Tramonta 20.31', 'W'), blank(),
    line('LA LUNA', 'C'), line('Fase crescente', 'W'),
    ...footer('800 ALMANACCO', '810 STORIA')
  ]);
});

pages.set(810, () => normalise([
  ...heading(810, 'OGGI NELLA STORIA', 'Y'),
  line('1969', 'C'), ...wrap('L uomo compie i primi passi sulla Luna.', 'W'), blank(),
  line('1981', 'C'), ...wrap('Si diffondono i primi personal computer domestici.', 'W'), blank(),
  line('1990', 'C'), ...wrap('Le televisioni europee ampliano i servizi Televideo.', 'W'),
  ...footer('800 ALMANACCO', '820 SPETTACOLI')
]));

pages.set(873, () => {
  const rare = dailyRandom(873, 'signal')() > .68;
  return normalise([
    ...heading(873, 'SEGNALE', 'C'), blank(), blank(), blank(),
    line(center(rare ? 'BENTORNATO, KA.' : 'NESSUN SEGNALE'), rare ? 'Y' : 'W'), blank(),
    line(center(rare ? 'IL RICEVITORE E ANCORA CALDO' : 'ATTENDERE PREGO'), 'C'), blank(), blank(),
    line(center(rare ? '642' : ''), 'G'),
    ...footer('100 INDICE')
  ]);
});

pages.set(899, () => normalise([
  ...heading(899, 'INFORMAZIONI', 'C'), blank(),
  line('SERVIZIO KAI TELEVIDEO', 'Y'),
  line('DIFFUSIONE NAZIONALE', 'W'),
  line('TRASMISSIONE CONTINUA', 'W'),
  line('AGGIORNAMENTO AUTOMATICO', 'W'), blank(),
  ...wrap('Le pagine possono richiedere alcuni secondi prima di essere ricevute.', 'C'), blank(),
  ...wrap('Per informazioni rivolgersi alla sede regionale KAI.', 'W'),
  ...footer('100 INDICE')
]));

function generatedPage(page) {
  const r = dailyRandom(page, 'generated');
  const sections = [
    ['NOTIZIARIO LOCALE','La giunta comunale ha approvato il piano per la manutenzione estiva. I lavori inizieranno lunedi.'],
    ['AVVISO AGLI UTENTI','Il servizio potra subire brevi interruzioni nelle ore notturne per controlli tecnici.'],
    ['APPUNTAMENTI','Questa sera concerto in piazza alle ore 21.30. Ingresso libero fino a esaurimento posti.'],
    ['ARCHIVIO','Ritrovata una registrazione priva di data. Le immagini mostrano una stazione quasi deserta.'],
    ['MERCATINO','Vendesi televisore a colori 20 pollici con telecomando e Televideo. Prezzo da concordare.'],
    ['SERVIZIO REGIONALE','Domani uffici aperti dalle 8.30 alle 12.30. Chiusura pomeridiana.']
  ];
  const [title, text] = choice(r, sections);
  return normalise([
    ...heading(page, title, choice(r, ['Y','C','G','M'])), blank(),
    ...wrap(text, 'W'), blank(),
    ...wrap(choice(r, [
      'Ulteriori informazioni nella prossima edizione.',
      'Conservare il numero della pagina per successive consultazioni.',
      'La pagina sara aggiornata nel corso della giornata.'
    ]), 'C'),
    blank(), line(`RIFERIMENTO ${100 + Math.floor(r()*800)}`, 'G'),
    ...footer('100 INDICE')
  ]);
}

function missingPage(page) {
  return normalise([
    ...heading(page, 'RICERCA PAGINA', 'C'), blank(), blank(), blank(),
    line(center('PAGINA NON TRASMESSA'), 'Y'), blank(),
    line(center('ATTENDERE O DIGITARE'), 'W'),
    line(center('UN ALTRO NUMERO'), 'W'),
    ...footer('100 INDICE')
  ]);
}

function exists(page) {
  if (pages.has(page)) return true;
  const rangeLikely = (page >= 100 && page <= 199) || (page >= 200 && page <= 260) ||
    (page >= 300 && page <= 330) || (page >= 400 && page <= 470) ||
    (page >= 500 && page <= 550) || (page >= 600 && page <= 680) ||
    (page >= 700 && page <= 760) || (page >= 800 && page <= 880);
  const r = dailyRandom(page, 'existence');
  return rangeLikely ? r() > .28 : r() > .82;
}

async function render(page) {
  currentPage = page;
  indicator.textContent = `P${String(page).padStart(3,'0')}`;
  const factory = pages.get(page);
  if (factory) renderLines(await factory());
  else if (exists(page)) renderLines(generatedPage(page));
  else renderLines(missingPage(page));
}

async function requestPage(page) {
  if (page < MIN_PAGE || page > MAX_PAGE) return;
  const token = ++requestToken;
  indicator.textContent = `P${String(page).padStart(3,'0')}`;
  renderLines(normalise([
    ...heading(page, 'RICERCA PAGINA', 'C'), blank(), blank(), blank(),
    line(center('RICERCA IN CORSO'), 'Y')
  ]));
  const r = dailyRandom(page, 'delay');
  await new Promise(resolve => setTimeout(resolve, 180 + Math.floor(r()*560)));
  if (token === requestToken) await render(page);
}

function commitBuffer() {
  if (inputBuffer.length !== 3) return;
  const page = Number(inputBuffer);
  inputBuffer = '';
  requestPage(page);
}

function clickSound() {
  if (!audioContext) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.frequency.value = 110;
  gain.gain.setValueAtTime(.025, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .03);
  osc.connect(gain).connect(audioContext.destination);
  osc.start(); osc.stop(audioContext.currentTime + .03);
}

function toggleAudio() {
  if (humNode) {
    humNode.osc.stop(); humNode = null;
    localStorage.setItem('kai-audio', '0');
    return;
  }
  audioContext ||= new AudioContext();
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'sine'; osc.frequency.value = 50; gain.gain.value = .012;
  osc.connect(gain).connect(audioContext.destination); osc.start();
  humNode = { osc, gain };
  localStorage.setItem('kai-audio', '1');
}

function handleKey(event) {
  if (/^[0-9]$/.test(event.key)) {
    inputBuffer = (inputBuffer + event.key).slice(-3);
    indicator.textContent = `P${inputBuffer.padEnd(3, '-')}`;
    clickSound();
    if (inputBuffer.length === 3) setTimeout(commitBuffer, 100);
    event.preventDefault(); return;
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
    case 'm': case 'M': toggleAudio(); break;
    case 'Escape': inputBuffer = ''; indicator.textContent = `P${currentPage}`; break;
    default: return;
  }
  event.preventDefault();
}

function updateClock() {
  clockNode.textContent = new Date().toLocaleTimeString('it-IT');
}

serviceNode.textContent = 'KAI TELEVIDEO';
if (localStorage.getItem('kai-crt') !== '0') screen.classList.add('crt');
document.addEventListener('keydown', handleKey);
screen.addEventListener('click', () => screen.focus());
setInterval(updateClock, 1000);
updateClock();
requestPage(HOME);
screen.focus();
