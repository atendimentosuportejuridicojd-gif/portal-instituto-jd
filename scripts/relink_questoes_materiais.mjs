import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const EMAIL = process.env.ADMIN_SCRIPT_EMAIL;
const PASSWORD = process.env.ADMIN_SCRIPT_PASSWORD;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});
if (authError) throw authError;
console.error("logado como", auth.user.email);

// tema_origem (antigo) -> slug da materia nova, por disciplina (codigo).
// Confianca: "alta" = correspondencia direta de conteudo; "media"/"baixa" =
// julgamento por nao existir bucket especifico equivalente no seed novo.
const MAPA = {
  E1: {
    "CONSTITUIÇÃO CONCEITO, CLASSIFICAÇÃO E PRINCÍPIOS FUNDAMENTAIS": { slug: "principios-fundamentais", confianca: "media" },
    "DIREITOS E GARANTIAS FUNDAMENTAIS (PARTE 1)": { slug: "direitos-e-garantias-fundamentais", confianca: "alta" },
    "DIREITOS E GARANTIAS FUNDAMENTAIS (PARTE 2)": { slug: "direitos-e-garantias-fundamentais", confianca: "alta" },
    "ORGANIZAÇÃO DO ESTADO E ADMINISTRAÇÃO PÚBLICA": { slug: "organizacao-do-estado", confianca: "media" },
    "PODER JUDICIÁRIO, CNJ E FUNÇÕES ESSENCIAIS À JUSTIÇA": { slug: "organizacao-dos-poderes", confianca: "media" },
  },
  E2: {
    "ADMINISTRAÇÃO DIRETA, INDIRETA E ÓRGÃOS PÚBLICOS": { slug: "organizacao-administrativa", confianca: "alta" },
    "AGENTES PÚBLICOS": { slug: "agentes-publicos", confianca: "alta" },
    "ATOS ADMINISTRATIVOS": { slug: "atos-administrativos", confianca: "alta" },
    "CENTRALIZAÇÃO, DESCENTRALIZAÇÃO E DESCONCENTRAÇÃO": { slug: "organizacao-administrativa", confianca: "alta" },
    "LICITAÇÕES E CONTRATOS ADMINISTRATIVOS (Lei nº 14.133-2021)": { slug: "licitacoes-e-contratos-administrativos", confianca: "alta" },
    "NOÇÕES DE ORGANIZAÇÃO ADMINISTRATIVA": { slug: "organizacao-administrativa", confianca: "alta" },
    "PODERES ADMINISTRATIVOS": { slug: "poderes-administrativos", confianca: "alta" },
    "PRINCÍPIOS DA ADMINISTRAÇÃO PÚBLICA": { slug: "principios-da-administracao-publica", confianca: "alta" },
  },
  E3: {
    "BENS": { slug: "bens", confianca: "alta" },
    "FATOS JURÍDICOS, NEGÓCIOS JURÍDICOS E ATOS (I)LÍCITOS": { slug: "fatos-juridicos", confianca: "alta" },
    "LEI DE INTRODUÇÃO ÀS NORMAS DO DIREITO BRASILEIRO (LINDB)": { slug: "lei-de-introducao-as-normas-do-direito-brasileiro", confianca: "alta" },
    "PESSOAS JURÍDICAS": { slug: "pessoas-juridicas", confianca: "alta" },
    "PESSOAS NATURAIS": { slug: "pessoas-naturais", confianca: "alta" },
  },
  E4: {
    "COMPETÊNCIA": { slug: "competencia", confianca: "alta" },
    "COOPERAÇÃO JURÍDICA INTERNACIONAL": { slug: "competencia", confianca: "baixa" },
    "JURISDIÇÃO, AÇÃO E SEUS ELEMENTOS": { slug: "jurisdicao-e-acao", confianca: "alta" },
    "PRESSUPOSTOS PROCESSUAIS": { slug: "formacao-suspensao-e-extincao-do-processo", confianca: "baixa" },
    "PRINCÍPIOS DO PROCESSO CIVIL": { slug: "normas-fundamentais-e-aplicacao", confianca: "alta" },
  },
  E5: {
    "APLICAÇÃO DA LEI PENAL": { slug: "aplicacao-da-lei-penal", confianca: "alta" },
    "CRIMES EM ESPÉCIE": { slug: "crimes-em-especie-de-maior-incidencia", confianca: "alta" },
    "LEGISLAÇÃO ESPECIAL E NORMAS CONSTITUCIONAIS": { slug: "legislacao-penal-especial", confianca: "media" },
    "TEORIA DO CRIME (PARTE 1)": { slug: "teoria-geral-do-crime", confianca: "alta" },
    "TEORIA DO CRIME (PARTE 2)": { slug: "teoria-geral-do-crime", confianca: "alta" },
  },
  E6: {
    "AÇÃO PENAL E SUJEITOS DO PROCESSO": { slug: "acao-penal", confianca: "media" },
    "ATOS PROCESSUAIS": { slug: "comunicacao-dos-atos-processuais", confianca: "media" },
    "DISPOSIÇÕES INICIAIS E INQUÉRITO POLICIAL": { slug: "inquerito-policial", confianca: "media" },
    "PRISÃO E PROCEDIMENTOS ESPECIAIS": { slug: "prisoes-e-medidas-cautelares", confianca: "media" },
    "PROCESSO COMUM": { slug: "procedimentos", confianca: "alta" },
    "REMÉDIOS E NORMAS CONSTITUCIONAIS": { slug: "sentenca-e-recursos", confianca: "baixa" },
    "TRIBUNAL DO JÚRI (PARTE 1)": { slug: "procedimentos", confianca: "baixa" },
    "TRIBUNAL DO JÚRI (PARTE 2)": { slug: "procedimentos", confianca: "baixa" },
    "TRIBUNAL DO JÚRI (PARTE 3)": { slug: "procedimentos", confianca: "baixa" },
    "TRIBUNAL DO JÚRI (PARTE 4)": { slug: "procedimentos", confianca: "baixa" },
  },
  G1: {
    "COESÃO TEXTUAL": { slug: "coesao-e-coerencia", confianca: "alta" },
    "GRAMÁTICA PRÁTICA": { slug: "sintaxe", confianca: "baixa" },
    "INTERPRETAÇÃO DE TEXTO": { slug: "compreensao-e-interpretacao-de-textos", confianca: "alta" },
    "ORTOGRAFIA E ACENTUAÇÃO": { slug: "ortografia-e-acentuacao-grafica", confianca: "alta" },
    "REESCRITA DE TEXTO": { slug: "reescrita-e-reestruturacao", confianca: "alta" },
    "TIPOS E GÊNEROS TEXTUAIS": { slug: "tipologia-e-generos-textuais", confianca: "alta" },
  },
};

const { data: disciplinas, error: dErr } = await supabase
  .from("disciplinas")
  .select("id, codigo")
  .not("codigo", "is", null);
if (dErr) throw dErr;
const discIdByCodigo = Object.fromEntries(disciplinas.map((d) => [d.codigo, d.id]));

const { data: materiais, error: mErr } = await supabase
  .from("materiais")
  .select("id, slug, disciplina_id");
if (mErr) throw mErr;
const materiaIdByDiscSlug = new Map(materiais.map((m) => [`${m.disciplina_id}::${m.slug}`, m.id]));

let totalAtualizado = 0;
const relatorio = [];

for (const [codigo, temas] of Object.entries(MAPA)) {
  const discId = discIdByCodigo[codigo];
  if (!discId) throw new Error(`disciplina ${codigo} nao encontrada`);
  for (const [tema, { slug, confianca }] of Object.entries(temas)) {
    const materiaId = materiaIdByDiscSlug.get(`${discId}::${slug}`);
    if (!materiaId) throw new Error(`materia ${codigo}/${slug} nao encontrada`);

    const { data, error } = await supabase
      .from("questoes")
      .update({ material_id: materiaId })
      .eq("disciplina_id", discId)
      .eq("tema_origem", tema)
      .select("id");
    if (error) throw error;

    totalAtualizado += data.length;
    relatorio.push({ codigo, tema, slug, confianca, questoes: data.length });
  }
}

console.error("\n=== Relatorio de religamento ===");
for (const r of relatorio) {
  console.error(`${r.codigo} | ${r.tema} -> ${r.slug} (${r.confianca}) : ${r.questoes} questao(oes)`);
}
console.error("\ntotal religado:", totalAtualizado);
