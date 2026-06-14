// Gera src/data/decks/lol-champions.json a partir da lista canônica e ATUAL
// de campeões da Riot (Data Dragon). Os nomes (target) vêm da API; as
// palavras-taboo são escritas à mão no mapa TABOOS abaixo.
//
// Rodar: node scripts/build-lol-deck.mjs
// Quando a Riot lançar um campeão novo: rode de novo. O campeão entra no deck
// com taboos derivados da role (fallback) e o script AVISA quais ficaram sem
// taboo manual — daí é só adicionar a entrada no mapa e rodar mais uma vez.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/decks/lol-champions.json');

// Taboos por campeão (chave = nome exato como vem do Data Dragon).
// 4–5 palavras em PT-BR, CAIXA ALTA, misturando role/habilidade/lore/visual.
const TABOOS = {
  'Aatrox': ['DARKIN', 'ESPADA', 'SANGUE', 'DEMÔNIO', 'TOPO'],
  'Ahri': ['RAPOSA', 'CAUDA', 'ENCANTO', 'CHARME', 'ESFERA'],
  'Akali': ['NINJA', 'ASSASSINA', 'KINKOU', 'FUMAÇA', 'IONIA'],
  'Akshan': ['SENTINELA', 'REVIVER', 'BALANÇO', 'RENEGADO', 'ARMA'],
  'Alistar': ['MINOTAURO', 'TOURO', 'EMPURRÃO', 'SUPORTE', 'VACA'],
  'Ambessa': ['NOXUS', 'GENERAL', 'MEDARDA', 'GUERRA', 'ARCANE'],
  'Amumu': ['MÚMIA', 'TRISTE', 'ABRAÇO', 'CHORAR', 'ATADURA'],
  'Anivia': ['FÊNIX', 'GELO', 'PÁSSARO', 'OVO', 'PAREDE'],
  'Annie': ['CRIANÇA', 'URSO', 'TIBBERS', 'FOGO', 'MENINA'],
  'Aphelios': ['ARMAS', 'LUA', 'IRMÃ', 'ATIRADOR', 'DEVOTO'],
  'Ashe': ['ARQUEIRA', 'GELO', 'FLECHA', 'RAINHA', 'FRELJORD'],
  'Aurelion Sol': ['DRAGÃO', 'ESTRELAS', 'ASTRO', 'GALÁXIA', 'ASOL'],
  'Aurora': ['COELHA', 'ESPÍRITO', 'BRUXA', 'FRELJORD', 'MUNDOS'],
  'Azir': ['IMPERADOR', 'AREIA', 'SOLDADOS', 'SHURIMA', 'PÁSSARO'],
  'Bard': ['SINO', 'ANDARILHO', 'PORTAL', 'SUPORTE', 'CÁPSULA'],
  "Bel'Veth": ['VAZIO', 'IMPERATRIZ', 'ARRAIA', 'FORMA', 'ABISMO'],
  'Blitzcrank': ['ROBÔ', 'GANCHO', 'PUXÃO', 'GOLEM', 'VAPOR'],
  'Brand': ['FOGO', 'CHAMA', 'QUEIMAR', 'VINGANÇA', 'MAGO'],
  'Braum': ['ESCUDO', 'BIGODE', 'FRELJORD', 'FORTE', 'CORAÇÃO'],
  'Briar': ['FOME', 'SANGUE', 'FÚRIA', 'MÁSCARA', 'MORDER'],
  'Caitlyn': ['XERIFE', 'PILTOVER', 'RIFLE', 'ARMADILHA', 'MIRA'],
  'Camille': ['AÇO', 'PERNAS', 'LÂMINAS', 'PILTOVER', 'ELITE'],
  'Cassiopeia': ['SERPENTE', 'COBRA', 'VENENO', 'PETRIFICAR', 'CAUDA'],
  "Cho'Gath": ['VAZIO', 'COMER', 'CRESCER', 'TENTÁCULO', 'MONSTRO'],
  'Corki': ['AVIÃO', 'YORDLE', 'FOGUETE', 'METRALHADORA', 'BOMBA'],
  'Darius': ['NOXUS', 'MACHADO', 'SANGRAR', 'DECAPITAR', 'TOPO'],
  'Diana': ['LUA', 'LUNAR', 'ESPADA', 'ESCUDO', 'CRESCENTE'],
  'Dr. Mundo': ['ZAUN', 'MACHADO', 'VIDA', 'LOUCO', 'REGENERAR'],
  'Draven': ['MACHADOS', 'NOXUS', 'GIRAR', 'ARROGANTE', 'PEGAR'],
  'Ekko': ['TEMPO', 'VOLTAR', 'ZAUN', 'RELÓGIO', 'GAROTO'],
  'Elise': ['ARANHA', 'TEIA', 'RAINHA', 'ARACNÍDEO', 'FORMA'],
  'Evelynn': ['INVISÍVEL', 'AGONIA', 'DEMÔNIO', 'CHICOTE', 'SEDUÇÃO'],
  'Ezreal': ['EXPLORADOR', 'LUVA', 'FEIXE', 'ATIRADOR', 'ARCANO'],
  'Fiddlesticks': ['ESPANTALHO', 'MEDO', 'CORVO', 'TERROR', 'CEIFAR'],
  'Fiora': ['DUELISTA', 'FLORETE', 'DEMACIA', 'ESTOCADA', 'PONTOS'],
  'Fizz': ['PEIXE', 'TRIDENTE', 'TUBARÃO', 'MARÉ', 'ESCORREGAR'],
  'Galio': ['COLOSSO', 'PEDRA', 'ESTÁTUA', 'DEMACIA', 'GÁRGULA'],
  'Gangplank': ['PIRATA', 'BARRIL', 'LARANJA', 'CANHÃO', 'CAPITÃO'],
  'Garen': ['DEMACIA', 'GIRAR', 'ESPADA', 'JUSTIÇA', 'SILÊNCIO'],
  'Gnar': ['YORDLE', 'PRÉ-HISTÓRICO', 'TRANSFORMAR', 'BUMERANGUE', 'FOFO'],
  'Gragas': ['BARRIL', 'BÊBADO', 'CERVEJA', 'GORDO', 'ROLAR'],
  'Graves': ['ESPINGARDA', 'FORAGIDO', 'CHARUTO', 'FUMAÇA', 'ATIRADOR'],
  'Gwen': ['TESOURA', 'COSTUREIRA', 'AGULHA', 'BONECA', 'NÉVOA'],
  'Hecarim': ['CAVALO', 'FANTASMA', 'GUERRA', 'LANÇA', 'CAVALEIRO'],
  'Heimerdinger': ['INVENTOR', 'TORRETA', 'YORDLE', 'CIENTISTA', 'GRANADA'],
  'Hwei': ['PINTOR', 'TINTA', 'VISIONÁRIO', 'PINCEL', 'ARTISTA'],
  'Illaoi': ['TENTÁCULO', 'KRAKEN', 'SACERDOTISA', 'NAGAKABOUROS', 'ESPÍRITO'],
  'Irelia': ['LÂMINAS', 'IONIA', 'DANÇA', 'ESPADAS', 'FLUTUAR'],
  'Ivern': ['ÁRVORE', 'FLORESTA', 'AMIGO', 'SELVA', 'VERDE'],
  'Janna': ['VENTO', 'TORMENTA', 'ESCUDO', 'SUPORTE', 'ESPÍRITO'],
  'Jarvan IV': ['DEMACIA', 'REI', 'LANÇA', 'BANDEIRA', 'PRÍNCIPE'],
  'Jax': ['LAMPIÃO', 'MESTRE', 'ARMA', 'SALTAR', 'ESQUIVA'],
  'Jayce': ['MARTELO', 'CANHÃO', 'PILTOVER', 'HEXTECH', 'TRANSFORMAR'],
  'Jhin': ['QUATRO', 'VIRTUOSO', 'ARMA', 'TIROS', 'ARTISTA'],
  'Jinx': ['METRALHADORA', 'CAOS', 'FOGUETE', 'LOUCA', 'ZAUN'],
  "K'Sante": ['NAZUMAH', 'TANQUE', 'LÂMINAS', 'OÁSIS', 'EMPURRÃO'],
  "Kai'Sa": ['VAZIO', 'ATIRADORA', 'TRAJE', 'FILHA', 'PLASMA'],
  'Kalista': ['LANÇA', 'VINGANÇA', 'ESPECTRO', 'JURAMENTO', 'ALMA'],
  'Karma': ['ILUMINADA', 'IONIA', 'MANTRA', 'ELO', 'ESCUDO'],
  'Karthus': ['MORTE', 'LICHE', 'REQUIEM', 'GLOBAL', 'MORTO'],
  'Kassadin': ['VAZIO', 'ANDARILHO', 'TELEPORTE', 'SILÊNCIO', 'MAGO'],
  'Katarina': ['FACAS', 'NOXUS', 'GIRAR', 'ASSASSINA', 'REINICIAR'],
  'Kayle': ['ANJO', 'JUSTA', 'ESPADA', 'ASAS', 'IMUNE'],
  'Kayn': ['FOICE', 'SOMBRA', 'DARKIN', 'RHAAST', 'NINJA'],
  'Kennen': ['YORDLE', 'RAIO', 'NINJA', 'ELÉTRICO', 'ESFERA'],
  "Kha'Zix": ['VAZIO', 'INSETO', 'EVOLUIR', 'ISOLADO', 'GAFANHOTO'],
  'Kindred': ['CORDEIRO', 'LOBO', 'MORTE', 'MÁSCARA', 'CAÇADORES'],
  'Kled': ['YORDLE', 'MONTARIA', 'SKAARL', 'COVARDE', 'CANHÃO'],
  "Kog'Maw": ['VAZIO', 'CUSPIR', 'ÁCIDO', 'EXPLODIR', 'BOCA'],
  'LeBlanc': ['ILUSÃO', 'CLONE', 'NOXUS', 'FARSANTE', 'CORRENTE'],
  'Lee Sin': ['CEGO', 'MONGE', 'CHUTE', 'IONIA', 'ENERGIA'],
  'Leona': ['ESCUDO', 'SOL', 'ALVORADA', 'ATORDOAR', 'TANQUE'],
  'Lillia': ['CERVA', 'SONO', 'ÁRVORE', 'TÍMIDA', 'INCENSO'],
  'Lissandra': ['GELO', 'BRUXA', 'FRELJORD', 'GARRAS', 'CONGELAR'],
  'Lucian': ['PURIFICADOR', 'ARMAS', 'LUZ', 'SENNA', 'DISPARO'],
  'Lulu': ['FADA', 'YORDLE', 'PIX', 'ENCOLHER', 'ESCUDO'],
  'Lux': ['LUZ', 'DEMACIA', 'LASER', 'MAGA', 'FEIXE'],
  'Malphite': ['PEDRA', 'MONTANHA', 'ROCHA', 'INVESTIDA', 'ESCUDO'],
  'Malzahar': ['VAZIO', 'PROFETA', 'SUPRIMIR', 'INSETOS', 'PORTAL'],
  'Maokai': ['ÁRVORE', 'ENTE', 'BROTO', 'FLORESTA', 'RAÍZES'],
  'Master Yi': ['WUJU', 'ESPADA', 'MEDITAR', 'ALPHA', 'ESPADACHIM'],
  'Mel': ['MEDARDA', 'NOXUS', 'ARISTOCRATA', 'REFLETIR', 'ARCANE'],
  'Milio': ['CHAMA', 'FOGO', 'SUPORTE', 'GENTIL', 'GAROTO'],
  'Miss Fortune': ['RECOMPENSA', 'PISTOLAS', 'BILGEWATER', 'BALAS', 'RUIVA'],
  'Wukong': ['MACACO', 'BASTÃO', 'CLONE', 'REI', 'GIRAR'],
  'Mordekaiser': ['FERRO', 'MORTE', 'REINO', 'METAL', 'ARMADURA'],
  'Morgana': ['CAÍDA', 'ASAS', 'CORRENTE', 'ESCUDO', 'RAIZ'],
  'Naafiri': ['DARKIN', 'CÃES', 'MATILHA', 'MORDIDA', 'DESERTO'],
  'Nami': ['SEREIA', 'ONDA', 'MARÉ', 'CAJADO', 'SUPORTE'],
  'Nasus': ['CHACAL', 'SHURIMA', 'AREIA', 'ENVELHECER', 'ACÚMULO'],
  'Nautilus': ['ÂNCORA', 'MAR', 'GANCHO', 'PROFUNDEZA', 'TITÃ'],
  'Neeko': ['CAMALEOA', 'DISFARCE', 'CÓPIA', 'FLOR', 'VASTAYA'],
  'Nidalee': ['CAÇADORA', 'LANÇA', 'ONÇA', 'ARMADILHA', 'FELINA'],
  'Nilah': ['ALEGRIA', 'ÁGUA', 'CHICOTE', 'LÂMINA', 'MÁSCARA'],
  'Nocturne': ['PESADELO', 'MEDO', 'SOMBRA', 'ESCURIDÃO', 'TERROR'],
  'Nunu & Willump': ['YETI', 'GAROTO', 'NEVE', 'FRELJORD', 'GIGANTE'],
  'Olaf': ['BERSERKER', 'MACHADOS', 'VIKING', 'FRELJORD', 'FÚRIA'],
  'Orianna': ['BOLA', 'ENGRENAGEM', 'ROBÔ', 'MECÂNICA', 'DONZELA'],
  'Ornn': ['FERREIRO', 'FOGO', 'FORJA', 'CARNEIRO', 'MONTANHA'],
  'Pantheon': ['LANÇA', 'ESCUDO', 'ASCENSÃO', 'ESPARTANO', 'GUERREIRO'],
  'Poppy': ['MARTELO', 'YORDLE', 'GUARDIÃ', 'ESCUDO', 'DEMACIA'],
  'Pyke': ['ESTRIPADOR', 'FACA', 'BILGEWATER', 'EXECUTAR', 'FANTASMA'],
  'Qiyana': ['ELEMENTOS', 'IMPERATRIZ', 'LÂMINA', 'ÁGUA', 'MATO'],
  'Quinn': ['DEMACIA', 'ÁGUIA', 'VALOR', 'BESTA', 'MARCAR'],
  'Rakan': ['PENAS', 'XAYAH', 'VASTAYA', 'DANÇA', 'CHARME'],
  'Rammus': ['TATU', 'BOLA', 'ROLAR', 'ESPINHOS', 'BLINDADO'],
  "Rek'Sai": ['VAZIO', 'TÚNEL', 'CAVAR', 'TERREMOTO', 'ESCAVAR'],
  'Rell': ['FERRO', 'MONTARIA', 'METAL', 'ÍMÃ', 'DAMA'],
  'Renata Glasc': ['QUÍMICA', 'ZAUN', 'BARONESA', 'REFÉM', 'ENLOUQUECER'],
  'Renekton': ['CROCODILO', 'SHURIMA', 'FÚRIA', 'LÂMINA', 'JACARÉ'],
  'Rengar': ['CAÇADOR', 'LEÃO', 'ARBUSTO', 'TROFÉU', 'PULAR'],
  'Riven': ['EXILADA', 'ESPADA', 'NOXUS', 'QUEBRADA', 'LÂMINA'],
  'Rumble': ['YORDLE', 'ROBÔ', 'LANÇA-CHAMAS', 'MECÂNICO', 'CALOR'],
  'Ryze': ['RÚNICO', 'MAGO', 'RUNA', 'FEITIÇO', 'PERGAMINHO'],
  'Samira': ['ESTILO', 'ARMAS', 'NOXUS', 'COMBO', 'DESERTO'],
  'Sejuani': ['JAVALI', 'FRELJORD', 'GELO', 'MONTARIA', 'FÚRIA'],
  'Senna': ['LUZ', 'ARMA', 'LUCIAN', 'REDENTORA', 'ALMA'],
  'Seraphine': ['CANTORA', 'MÚSICA', 'NOTAS', 'ENCANTAR', 'PILTOVER'],
  'Sett': ['CHEFE', 'SOCO', 'LUTADOR', 'IONIA', 'MÚSCULO'],
  'Shaco': ['PALHAÇO', 'CAIXA', 'CLONE', 'FACA', 'BUFÃO'],
  'Shen': ['NINJA', 'ESPADA', 'CREPÚSCULO', 'ESCUDO', 'IONIA'],
  'Shyvana': ['DRAGÃO', 'FÚRIA', 'MEIO-DRAGÃO', 'CHAMAS', 'VOAR'],
  'Singed': ['VENENO', 'ZAUN', 'GÁS', 'QUÍMICO', 'ARREMESSAR'],
  'Sion': ['MORTO-VIVO', 'MACHADO', 'NOXUS', 'INVESTIDA', 'COLOSSO'],
  'Sivir': ['BUMERANGUE', 'LÂMINA', 'RICOCHETE', 'ESCUDO', 'BATALHA'],
  'Skarner': ['ESCORPIÃO', 'CRISTAL', 'PINÇA', 'PRIMORDIAL', 'AGARRAR'],
  'Smolder': ['DRAGÃO', 'FILHOTE', 'CHAMA', 'BEBÊ', 'VOAR'],
  'Sona': ['MÚSICA', 'CORDAS', 'SUPORTE', 'MELODIA', 'INSTRUMENTO'],
  'Soraka': ['ESTRELAS', 'CURA', 'BANANA', 'SUPORTE', 'CHIFRE'],
  'Swain': ['NOXUS', 'GENERAL', 'CORVO', 'DEMÔNIO', 'BRAÇO'],
  'Sylas': ['CORRENTES', 'ROUBAR', 'MAGO', 'ABJUGADO', 'REVOLUÇÃO'],
  'Syndra': ['ESFERAS', 'SOBERANA', 'SOMBRIA', 'BOLAS', 'PODER'],
  'Tahm Kench': ['RIO', 'LÍNGUA', 'ENGOLIR', 'SAPO', 'GULA'],
  'Taliyah': ['PEDRAS', 'TECELÃ', 'SHURIMA', 'ROCHA', 'SURFAR'],
  'Talon': ['FACAS', 'NOXUS', 'ASSASSINO', 'LÂMINAS', 'PULAR'],
  'Taric': ['GEMAS', 'ESCUDO', 'SUPORTE', 'PEDRAS', 'INVULNERÁVEL'],
  'Teemo': ['YORDLE', 'COGUMELO', 'VENENO', 'INVISÍVEL', 'CAPACETE'],
  'Thresh': ['LANTERNA', 'GANCHO', 'CORRENTE', 'SUPORTE', 'ALMAS'],
  'Tristana': ['YORDLE', 'CANHÃO', 'ARTILHEIRA', 'SALTAR', 'BOMBA'],
  'Trundle': ['TROLL', 'GELO', 'PILAR', 'MORDER', 'REI'],
  'Tryndamere': ['BÁRBARO', 'FÚRIA', 'IMORTAL', 'ESPADA', 'GIRAR'],
  'Twisted Fate': ['CARTAS', 'BARALHO', 'DESTINO', 'TELEPORTE', 'OURO'],
  'Twitch': ['RATO', 'PESTE', 'VENENO', 'INVISÍVEL', 'ZAUN'],
  'Udyr': ['ESPÍRITO', 'POSTURAS', 'ANIMAL', 'ANDARILHO', 'FRELJORD'],
  'Urgot': ['ZAUN', 'PERNAS', 'METRALHADORA', 'ENCOURAÇADO', 'EXECUTAR'],
  'Varus': ['FLECHA', 'ARCO', 'VINGANÇA', 'DARKIN', 'CORRUPÇÃO'],
  'Vayne': ['CAÇADORA', 'BESTA', 'PRATA', 'NOTURNA', 'ROLAR'],
  'Veigar': ['YORDLE', 'MAL', 'GAIOLA', 'PODER', 'MAGO'],
  "Vel'Koz": ['VAZIO', 'OLHO', 'LASER', 'TENTÁCULO', 'DESINTEGRAR'],
  'Vex': ['MELANCOLIA', 'SOMBRA', 'EMO', 'YORDLE', 'MEDO'],
  'Vi': ['PILTOVER', 'SOCO', 'MANOPLAS', 'GUARDA', 'PUNHO'],
  'Viego': ['REI', 'DESTRUÍDO', 'RUÍNA', 'NÉVOA', 'POSSUIR'],
  'Viktor': ['MÁQUINA', 'ARCANO', 'METAL', 'EVOLUÇÃO', 'LASER'],
  'Vladimir': ['SANGUE', 'VAMPIRO', 'ESCARLATE', 'POÇA', 'DRENAR'],
  'Volibear': ['URSO', 'TEMPESTADE', 'RAIO', 'FRELJORD', 'TROVÃO'],
  'Warwick': ['LOBO', 'ZAUN', 'CAÇAR', 'SANGUE', 'FERA'],
  'Xayah': ['PENAS', 'RAKAN', 'REBELDE', 'VASTAYA', 'LÂMINAS'],
  'Xerath': ['MAGO', 'ASCENDENTE', 'RAIO', 'SHURIMA', 'ENERGIA'],
  'Xin Zhao': ['LANÇA', 'DEMACIA', 'SENESCAL', 'INVESTIDA', 'DESAFIO'],
  'Yasuo': ['VENTO', 'ESPADA', 'SAMURAI', 'IONIA', 'PAREDE'],
  'Yone': ['ESPADAS', 'IRMÃO', 'YASUO', 'ESPÍRITO', 'IONIA'],
  'Yorick': ['ALMAS', 'PÁ', 'MORTE', 'GHOULS', 'PASTOR'],
  'Yunara': ['IONIA', 'ATIRADORA', 'FÉ', 'ESPÍRITO', 'KINKOU'],
  'Yuumi': ['GATA', 'LIVRO', 'GRUDAR', 'SUPORTE', 'MÁGICA'],
  'Zaahen': ['DARKIN', 'GLAIVA', 'DEUS', 'ESPADA', 'CORRUPÇÃO'],
  'Zac': ['GOSMA', 'ELÁSTICO', 'ZAUN', 'PEDAÇOS', 'VERDE'],
  'Zed': ['SOMBRAS', 'NINJA', 'SHURIKEN', 'ASSASSINO', 'ENERGIA'],
  'Zeri': ['RAIO', 'ELÉTRICA', 'ZAUN', 'FAÍSCA', 'ATIRADORA'],
  'Ziggs': ['YORDLE', 'BOMBA', 'EXPLOSÃO', 'HEXPLOSIVO', 'DINAMITE'],
  'Zilean': ['TEMPO', 'RELÓGIO', 'BOMBA', 'RESSUSCITAR', 'IDADE'],
  'Zoe': ['ESTRELA', 'CREPÚSCULO', 'SONO', 'FEITIÇOS', 'BRINCALHONA'],
  'Zyra': ['PLANTAS', 'ESPINHOS', 'FLORES', 'RAÍZES', 'SEMENTE'],
};

// Tradução de role -> palavra PT, usada só no fallback de campeão novo
// ainda não mapeado em TABOOS (mantém o deck completo sem inventar lore).
const ROLE_PT = {
  Fighter: 'LUTADOR',
  Tank: 'TANQUE',
  Mage: 'MAGO',
  Assassin: 'ASSASSINO',
  Marksman: 'ATIRADOR',
  Support: 'SUPORTE',
};

function slug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // tira acentos
    .replace(/[^a-z0-9]+/g, '');     // tira espaço, ', ., &, etc.
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res.json();
}

async function main() {
  const versions = await getJson('https://ddragon.leagueoflegends.com/api/versions.json');
  const version = versions[0];
  const champData = await getJson(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`,
  );

  const champs = Object.values(champData.data).sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  const missing = [];

  const cards = champs.map((c) => {
    let taboo = TABOOS[c.name];
    if (!taboo) {
      missing.push(c.name);
      // fallback: role(s) + marcador genérico, garante >= 4 palavras sem inventar lore
      const roles = c.tags.map((t) => ROLE_PT[t]).filter(Boolean);
      taboo = [...new Set([...roles, 'CAMPEÃO', 'LEAGUE', 'RIOT'])].slice(0, 5);
    }
    return { id: `lol-${slug(c.name)}`, target: c.name.toUpperCase(), taboo };
  });

  const deck = { id: 'lol-champions', name: 'Champions (LoL)', cards };
  await writeFile(OUT, JSON.stringify(deck, null, 2) + '\n', 'utf8');

  console.log(`Data Dragon ${version}: ${cards.length} campeões -> ${OUT}`);
  if (missing.length) {
    console.warn(`\n⚠ ${missing.length} sem taboo manual (usaram fallback de role):`);
    console.warn('  ' + missing.join(', '));
    console.warn('  Adicione-os no mapa TABOOS e rode de novo.');
  } else {
    console.log('Todos os campeões têm taboos manuais. ✔');
  }
}

main().catch((e) => {
  console.error('Falha ao gerar o deck:', e.message);
  process.exit(1);
});
