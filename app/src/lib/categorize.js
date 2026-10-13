// Regles portades de l'anàlisi (an2.py). Primera coincidència guanya; per defecte OCI + pendent d'IA.
const RULES = [
  ['TRANSFER', /^TRASPAS|^Enviament de dine$|^si$|^s$|^s8$|^miau$|^Si$/i],
  ['SALARI', /^NOMINA/i],
  ['SALARI', /^PAG NOMINES/i],
  ['INVERSIO', /Trading 212/i],
  ['EFECTIU', /CAIXER/i],
  ['BIZUM', /^BIZUM REBUT|^DEVOLUCIO BIZUM/i],
  ['BIZUM', /^BIZUM ENVIAT/i],
  ['ING_ALTRES', /TRANSFER\.|TRANSF AL SEU|DEVOLUCIO COMPRA/i],
  ['JOC', /888\*|RegSpain|SPORTIUM|PLAY HAWKERS|PREMI AMB TARGETA|Streetbuzz/i],
  ['VIATGES', /AIRBNB|Ryanair|LESDOMUS|Omio|RIDEMOVI|AEROPORT|TAXI|PARKING OK|HOTEL|Heinemann|FH DUS|Penny Boev|APART RESID|BK 18523|Booking|APARCAMENT|TROPICAL SALOU|METRO BARC|TRANSSEGRE/i],
  ['MOBILITAT', /GASOLINERA|BONAREA BALA|PNEUMATICS|TALLER RECANV|RENFE|GARAIG|ATISAE|BUMKER|Mecanic|ITV/i],
  ['SUBS', /Spotify|Google|HIGGSFIELD|PROTOFY|Hetzner|Upwork|GIMNAS|MYCARD|BEACONS|RAILWAY|APP BREASY|Etsy|Patreon|HOTMART|CARNET JOVE|ASS.? ?JOVES|ASSOCIACIO DE JOV|QBELLS|Ass joven|MYPROTEIN/i],
  ['TABAC', /ESTANC|TABAC|L'ESTANC|ESTANCO|CASTELLSERRAT|VapesForc|EXP\.N 1/i],
  ['ALIM', /SPAR|MERCADONA|LIDL|MARKET|SUPERMERC|MI PROXIM|CORP ALIM|GUISSONA|CAPRABO|7 ELEVEN|ALDI|PAM LOCAL|DA YUAN|HIPER|HYPER|MERCA ASIA|COOP|CARNISSERIA|FORN|AMETLLER|MINIMARKET|209 AGRAMUNT|PREMIA MERCAT|PUNT DE SERVEIS|COMERCIAL GASET|CLAREL|DE BONA GANA|QUEVIURES|MI ALCAMPO|CARME CAMARASA|SUMA BELLCAIRE|ALCAMPO|PATET|XOCOLATA|PASTISSERIA|SUPERMERCAT/i],
  ['SALUT', /FARMACIA|SALUNATUR|NUTRICION/i],
  ['COMPRES', /BERSHKA|ZARA|PULL|Levis|TEZENIS|Snipes|VINTAGE|Temu|AMAZON|MediaMarkt|SMARTBOX|SEMTEE|Zumub|TIKTOK|ALE ?HOP|SOLUTONO|Bidoo|TRANSPARENT|ONEDILEMMA|GOCRUSH|ESPORTS QUEROL|EDICIONS|COMPRA|CASSUAL|TALLER CUIR|ZAIRAH|FREUD|DELOCOS|JOIERIA|OSMOSIS|YAKKA|LLAGURT|Vinted|SPRINTER|DECATHLON|FERRETERIA|KYOCA|UDL|PUNTO ESTRELLA|el Taller/i],
];

export const normConcept = (s) => (s || '').toUpperCase().replace(/\s+/g, ' ').trim();

/** Mapa concepte -> codi de categoria més freqüent, après de l'historial ja revisat. */
export function buildLearned(txs, catById) {
  const counts = new Map();
  for (const t of txs) {
    if (t.status === 'pending_ai' || typeof t.id !== 'string' || t.id.startsWith('tmp-')) continue;
    const code = catById.get(t.category_id)?.code;
    if (!code) continue;
    const k = normConcept(t.concept);
    let m = counts.get(k);
    if (!m) counts.set(k, (m = new Map()));
    m.set(code, (m.get(code) || 0) + 1);
  }
  const out = new Map();
  for (const [k, m] of counts) {
    let best = null, n = 0;
    for (const [code, c] of m) if (c > n) { best = code; n = c; }
    out.set(k, best);
  }
  return out;
}

/** Retorna {code, certain}. certain=false -> cal revisió per IA. */
export function categorize(concept, amount, learned) {
  const k = normConcept(concept);
  if (learned && learned.has(k)) return { code: learned.get(k), certain: true };
  for (const [code, re] of RULES) if (re.test(concept)) return { code, certain: true };
  return { code: amount > 0 ? 'ING_ALTRES' : 'OCI', certain: false };
}
