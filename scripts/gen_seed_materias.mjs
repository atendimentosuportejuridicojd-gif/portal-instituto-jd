import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const PREPOSICOES = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "a",
  "o",
  "com",
  "para",
  "por",
  "no",
  "na",
  "nos",
  "nas",
  "ao",
  "aos",
  "as",
  "os",
  "um",
  "uma",
]);

function gerarSlug(nome) {
  // Sem limite de 60 chars aqui (diferente do gerarSlug do app, usado
  // em formularios da UI): materiais.slug e "text" puro, sem constraint
  // de tamanho, e truncar cortaria palavras no meio.
  let slug = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // remove preposicao/artigo solto que tenha sobrado no fim (ex.: por
  // causa de pontuacao final como em-dash)
  let parts = slug.split("-");
  while (parts.length > 1 && PREPOSICOES.has(parts[parts.length - 1])) {
    parts.pop();
  }
  return parts.join("-");
}

const disciplinas = [
  {
    codigo: "G1",
    id: "2bc5e600-8359-4771-b414-734c96604657",
    materias: [
      "Compreensão e interpretação de textos",
      "Tipologia e gêneros textuais",
      "Coesão e coerência",
      "Ortografia e acentuação gráfica",
      "Morfologia",
      "Sintaxe",
      "Pontuação",
      "Regência e crase",
      "Concordância verbal e nominal",
      "Semântica",
      "Reescrita e reestruturação",
      "Variação linguística e norma padrão",
    ],
  },
  {
    codigo: "G3",
    id: "6ccd8953-7d7b-440d-bc13-53130424aea4",
    materias: [
      "Lógica proposicional",
      "Equivalências e negações",
      "Argumentação lógica",
      "Diagramas lógicos e conjuntos",
      "Problemas lógicos",
      "Sequências e raciocínio sequencial",
      "Raciocínio verbal, espacial e temporal",
      "Aritmética",
      "Grandezas proporcionais",
      "Matemática financeira",
      "Análise combinatória e probabilidade",
      "Noções de estatística",
    ],
  },
  {
    codigo: "G4",
    id: "9e2219a7-21c1-436c-b7f1-29fc75af5f5b",
    materias: [
      "Conceitos fundamentais",
      "Sistemas operacionais",
      "Editor de textos",
      "Planilhas eletrônicas",
      "Apresentações",
      "Navegadores e internet",
      "Correio eletrônico",
      "Redes de computadores",
      "Computação em nuvem",
      "Segurança da informação",
      "Sistemas do Judiciário",
    ],
  },
  {
    codigo: "G9",
    id: "1bd843bc-1f55-4c94-aabb-821a25b2029c",
    materias: [
      "Disposições preliminares",
      "Provimento",
      "Vacância",
      "Movimentação",
      "Direitos e vantagens",
      "Regime disciplinar",
      "Processo administrativo disciplinar",
      "Seguridade social do servidor",
    ],
  },
  {
    codigo: "G8",
    id: "206b4514-87bf-4a99-8704-303bdf58acb1",
    materias: [
      "Fundamentos",
      "Código de Ética Profissional do Servidor Público Civil Federal",
      "Conflito de interesses",
      "Integridade e governança pública",
      "Assédio e conduta institucional",
      "Ética, improbidade e infração disciplinar",
    ],
  },
  {
    codigo: "G2",
    id: "a131b4c7-71aa-4fd8-98d3-c6fc84c76649",
    materias: [
      "Redação oficial — fundamentos",
      "Pronomes de tratamento e vocativos",
      "Expedientes oficiais",
      "Elementos formais",
      "Texto dissertativo-argumentativo",
      "Peça de natureza técnica",
    ],
  },
  {
    codigo: "G7",
    id: "e5792b4f-40a5-47e6-b2e9-b50efa8ee0b2",
    materias: [
      "Disposições preliminares",
      "Igualdade e não discriminação",
      "Direitos fundamentais",
      "Acessibilidade",
      "Capacidade civil e tomada de decisão apoiada",
      "Acesso à justiça",
      "Crimes e infrações administrativas",
      "Normas correlatas",
    ],
  },
  {
    codigo: "G10",
    id: "2f6dfa7e-3da3-40df-8886-7b586ee5ef80",
    materias: [
      "Abrangência e diretrizes",
      "Transparência ativa",
      "Transparência passiva",
      "Restrições de acesso",
      "Responsabilidades",
      "Regulamentação",
      "Interface entre LAI e LGPD",
    ],
  },
  {
    codigo: "G11",
    id: "13eccacf-3d87-4756-bf97-10211c2bf49f",
    materias: [
      "Fundamentos e aplicação",
      "Conceitos",
      "Princípios",
      "Bases legais do tratamento",
      "Tratamento pelo Poder Público",
      "Direitos do titular",
      "Segurança e boas práticas",
      "ANPD e responsabilização",
      "Transferência internacional de dados",
    ],
  },
  {
    codigo: "G6",
    id: "f04ef58a-9fe7-46dc-ae19-a1091a77246e",
    materias: [
      "Teoria geral",
      "Sistema global de proteção",
      "Sistema interamericano",
      "Direitos humanos no direito brasileiro",
      "Grupos em situação de vulnerabilidade",
      "Direitos humanos e acesso à justiça",
    ],
  },
  {
    codigo: "G5",
    id: "dde773b2-4b18-46fa-9b10-6420020ade9e",
    materias: [
      "Fundamentos de dados",
      "Estatística aplicada à análise",
      "Visualização de dados",
      "Planilhas para análise",
      "Big data e governança",
      "Inteligência artificial — fundamentos",
      "IA no Poder Judiciário e no Ministério Público",
      "Ética, riscos e conformidade",
    ],
  },
  {
    codigo: "E1",
    id: "17e4f860-589c-453e-a1a6-5c17d49c8318",
    materias: [
      "Teoria da Constituição",
      "Princípios fundamentais",
      "Direitos e garantias fundamentais",
      "Organização do Estado",
      "Administração Pública na Constituição",
      "Organização dos Poderes",
      "Funções essenciais à Justiça",
      "Controle de constitucionalidade",
      "Ordem social",
    ],
  },
  {
    codigo: "E2",
    id: "57ed4885-2fbe-454c-9c1b-59b190ad88a5",
    materias: [
      "Noções introdutórias",
      "Princípios da Administração Pública",
      "Organização administrativa",
      "Poderes administrativos",
      "Atos administrativos",
      "Licitações e contratos administrativos",
      "Serviços públicos",
      "Agentes públicos",
      "Processo administrativo",
      "Responsabilidade civil do Estado",
      "Improbidade administrativa",
      "Controle da Administração",
      "Legislação anticorrupção e de integridade",
      "Bens públicos",
      "Intervenção do Estado na propriedade",
    ],
  },
  {
    codigo: "E3",
    id: "261dff0f-76f8-4fc7-8f51-596a938e2cfc",
    materias: [
      "Lei de Introdução às Normas do Direito Brasileiro",
      "Pessoas naturais",
      "Pessoas jurídicas",
      "Domicílio",
      "Bens",
      "Fatos jurídicos",
      "Prescrição e decadência",
      "Obrigações",
      "Contratos",
      "Responsabilidade civil",
      "Direitos reais",
      "Família e sucessões",
      "Estatutos correlatos",
    ],
  },
  {
    codigo: "E4",
    id: "354084a4-47e8-4325-9429-9310d40b7fa3",
    materias: [
      "Normas fundamentais e aplicação",
      "Jurisdição e ação",
      "Competência",
      "Sujeitos do processo",
      "Atos processuais",
      "Tutela provisória",
      "Formação, suspensão e extinção do processo",
      "Processo de conhecimento",
      "Recursos",
      "Cumprimento de sentença e execução",
      "Procedimentos especiais e Juizados",
    ],
  },
  {
    codigo: "E5",
    id: "f3ce3e31-2d67-45ab-a8b7-4a2bf07aaf9b",
    materias: [
      "Aplicação da lei penal",
      "Teoria geral do crime",
      "Concurso de pessoas",
      "Concurso de crimes",
      "Penas",
      "Ação penal",
      "Punibilidade",
      "Crimes em espécie de maior incidência",
      "Legislação penal especial",
    ],
  },
  {
    codigo: "E6",
    id: "b08cc823-5f5d-494b-87e1-8487757496eb",
    materias: [
      "Princípios e aplicação da lei processual penal",
      "Inquérito policial",
      "Ação penal",
      "Jurisdição e competência",
      "Sujeitos processuais",
      "Provas",
      "Prisões e medidas cautelares",
      "Comunicação dos atos processuais",
      "Procedimentos",
      "Sentença e recursos",
      "Juizados Especiais Criminais",
    ],
  },
  {
    codigo: "E7",
    id: "7a9bd7b6-b5a0-48f1-966d-145b0919bb98",
    materias: [
      "Evolução da administração pública",
      "Organizações formais modernas",
      "Processo administrativo e funções da administração",
      "Gestão de processos",
      "Gestão estratégica no Poder Judiciário e no MP",
      "Gestão de riscos e controle",
      "Governança, transparência e accountability",
      "Gestão de recursos materiais e patrimoniais",
      "Noções de arquivologia e gestão documental",
      "Atendimento ao público e qualidade no serviço",
    ],
  },
  {
    codigo: "E9",
    id: "8aece511-8dfc-488f-ac73-241deba2514c",
    materias: [
      "Legislação aplicável à contratação de bens e serviços",
      "Planejamento da contratação",
      "Formalização do contrato",
      "Execução contratual",
      "Alteração dos contratos",
      "Sanções administrativas",
      "Extinção do contrato",
      "Controle e responsabilização",
    ],
  },
  {
    codigo: "E8",
    id: "79cd1d62-c951-486b-b53a-d8d07c730940",
    materias: [
      "Fundamentos",
      "Comportamento organizacional",
      "Recrutamento e seleção",
      "Análise e descrição de cargos",
      "Gestão de desempenho",
      "Desenvolvimento e capacitação",
      "Gestão por competências",
      "Qualidade de vida no trabalho e saúde ocupacional",
      "Tendências em gestão de pessoas no setor público",
      "Legislação aplicada",
    ],
  },
  {
    codigo: "E10",
    id: "f05ce3ce-cafb-4b63-8abb-2655a9f916ed",
    materias: [
      "Fundamentos",
      "Técnicas e princípios orçamentários",
      "O orçamento público no Brasil",
      "Classificações orçamentárias",
      "Execução orçamentária e financeira",
      "Receita e despesa públicas",
      "Lei de Responsabilidade Fiscal",
      "Sistemas estruturantes",
    ],
  },
  {
    codigo: "E11",
    id: "5a4a5ff9-0cd9-485b-ad55-ba57d9dc202b",
    materias: [
      "Sistema Tributário Nacional",
      "Tributo",
      "Legislação tributária",
      "Obrigação tributária",
      "Crédito tributário",
      "Administração tributária",
      "Processo tributário",
    ],
  },
];

function sqlLiteral(v) {
  if (v === null || v === undefined) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

const inserts = [];
const slugsPorDisciplina = {};
let totalCount = 0;
let colisaoEncontrada = false;

for (const d of disciplinas) {
  const seen = new Set();
  const slugs = [];
  d.materias.forEach((titulo, idx) => {
    const slug = gerarSlug(titulo);
    if (seen.has(slug)) {
      console.error(`COLISAO em ${d.codigo}: slug '${slug}' duplicado (titulo: "${titulo}")`);
      colisaoEncontrada = true;
    }
    seen.add(slug);
    slugs.push(slug);
    const ordem = idx + 1;
    inserts.push(
      `INSERT INTO public.materiais (tipo, titulo, slug, disciplina_id, modulo_id, ordem, conteudo_md, publicado) VALUES ('markdown', ${sqlLiteral(titulo)}, ${sqlLiteral(slug)}, ${sqlLiteral(d.id)}, NULL, ${ordem}, NULL, false) ON CONFLICT (disciplina_id, slug) DO UPDATE SET titulo = EXCLUDED.titulo, ordem = EXCLUDED.ordem, tipo = EXCLUDED.tipo;`,
    );
    totalCount++;
  });
  slugsPorDisciplina[d.codigo] = slugs;
}

if (colisaoEncontrada) {
  console.error("\nABORTADO: colisao de slug detectada. Nao gerei o SQL.");
  process.exit(1);
}

const sql = [
  "-- Placeholders de materias (markdown) para as 22 disciplinas do acervo base.",
  "-- Gerado a partir da lista 'materias' do seed. Upsert por (disciplina_id, slug).",
  "",
  "BEGIN;",
  "",
  ...inserts,
  "",
  "COMMIT;",
  "",
].join("\n");

writeFileSync("supabase/migrations/20260901010000_seed-materias-acervo-base.sql", sql, "utf8");
writeFileSync(
  "scripts/backup/slugs-materias-por-disciplina.json",
  JSON.stringify(slugsPorDisciplina, null, 2),
);

console.error("total de materias:", totalCount);
console.error("por disciplina:");
for (const d of disciplinas) {
  console.error(" ", d.codigo, "->", d.materias.length);
}

// Aplica via upsert (supabase-js), respeitando UNIQUE(disciplina_id, slug).
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const EMAIL = process.env.ADMIN_SCRIPT_EMAIL;
const PASSWORD = process.env.ADMIN_SCRIPT_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_KEY || !EMAIL || !PASSWORD) {
  console.error("\n(sem credenciais no ambiente — só gerei o SQL/JSON, nao apliquei)");
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});
if (authError) throw authError;
console.error("\nlogado como", auth.user.email);

const rows = [];
for (const d of disciplinas) {
  d.materias.forEach((titulo, idx) => {
    rows.push({
      tipo: "markdown",
      titulo,
      slug: gerarSlug(titulo),
      disciplina_id: d.id,
      modulo_id: null,
      ordem: idx + 1,
      conteudo_md: null,
      publicado: false,
    });
  });
}

const CHUNK = 50;
let upserted = 0;
for (let i = 0; i < rows.length; i += CHUNK) {
  const chunk = rows.slice(i, i + CHUNK);
  const { data, error } = await supabase
    .from("materiais")
    .upsert(chunk, { onConflict: "disciplina_id,slug" })
    .select("id");
  if (error) throw error;
  upserted += data.length;
}
console.error("linhas upsertadas:", upserted, "de", rows.length, "esperadas");
