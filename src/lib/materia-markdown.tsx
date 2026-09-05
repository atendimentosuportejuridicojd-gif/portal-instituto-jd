import { Children, cloneElement, createContext, isValidElement, useContext, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";

export type Heading = {
  level: 1 | 2 | 3;
  text: string;
  slug: string;
  numero: string;
  // slug do H2 mais proximo que precede este titulo — usado pelo indice
  // lateral para agrupar/colapsar os H3 sob o H2 ativo. null para H1/H2.
  parentH2: string | null;
};

/** Extrai H1/H2/H3 do markdown fonte (ignora linhas dentro de blocos ```),
 * na mesma ordem em que o componente vai renderiza-los. Usado tanto para o
 * indice lateral quanto para numerar os titulos (1., 1.1, 1.1.1) sem
 * escrever numero nenhum no texto original. */
export function extractHeadings(markdown: string): Heading[] {
  const linhas = markdown.split(/\r?\n/);
  let dentroDeCodeFence = false;
  const brutos: { level: 1 | 2 | 3; text: string }[] = [];

  for (const linha of linhas) {
    if (/^```/.test(linha.trim())) {
      dentroDeCodeFence = !dentroDeCodeFence;
      continue;
    }
    if (dentroDeCodeFence) continue;
    const m = linha.match(/^(#{1,3})\s+(.*)$/);
    if (!m) continue;
    brutos.push({ level: m[1].length as 1 | 2 | 3, text: m[2].trim() });
  }

  const slugCounts = new Map<string, number>();
  let h1 = 0;
  let h2 = 0;
  let h3 = 0;
  let parentH2: string | null = null;
  return brutos.map(({ level, text }) => {
    let slug = text
      .normalize("NFD")
      .replace(new RegExp("[̀-ͯ]", "g"), "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const count = slugCounts.get(slug) ?? 0;
    slugCounts.set(slug, count + 1);
    if (count > 0) slug = `${slug}-${count}`;

    if (level === 1) {
      h1 += 1;
      h2 = 0;
      h3 = 0;
      parentH2 = null;
      return { level, text, slug, numero: `${h1}.`, parentH2: null };
    }
    if (level === 2) {
      h2 += 1;
      h3 = 0;
      parentH2 = slug;
      return { level, text, slug, numero: `${h1}.${h2}`, parentH2: null };
    }
    h3 += 1;
    return { level, text, slug, numero: `${h1}.${h2}.${h3}`, parentH2 };
  });
}

/** Converte containerDirective/leafDirective (remark-directive) em elementos
 * <div data-directive="..." data-fonte="..." data-url="..."> para o
 * react-markdown poder estiliza-los via o mapa de `components`. Escrito a
 * mao (sem unist-util-visit) para nao adicionar dependencia alem das 4
 * pedidas. */
function remarkDirectiveToHast() {
  return (tree: any) => {
    const walk = (node: any) => {
      if (
        node.type === "containerDirective" ||
        node.type === "leafDirective" ||
        node.type === "textDirective"
      ) {
        const data = node.data || (node.data = {});
        const attrs = node.attributes || {};
        const hProperties: Record<string, string> = { "data-directive": node.name };
        if (attrs.fonte) hProperties["data-fonte"] = attrs.fonte;
        if (attrs.url) hProperties["data-url"] = attrs.url;
        data.hName = "div";
        data.hProperties = hProperties;
      }
      if (node.children) node.children.forEach(walk);
    };
    walk(tree);
  };
}

const DIRETIVA_CONFIG: Record<
  string,
  { emoji: string; rotulo: string; serifCorpo: boolean; semRecuo: boolean }
> = {
  legislacao: { emoji: "", rotulo: "", serifCorpo: true, semRecuo: true },
  atencao: { emoji: "🧠", rotulo: "ATENÇÃO", serifCorpo: false, semRecuo: true },
  exemplo: { emoji: "📌", rotulo: "EXEMPLO PRÁTICO", serifCorpo: false, semRecuo: true },
};

/** Recuo de primeira linha (1,5cm), ligado por padrao em todo paragrafo do
 * corpo comum. As tres diretivas (:::legislacao, :::atencao, :::exemplo)
 * desligam via este contexto — mantem o espacamento/alinhamento proprio de
 * caixa de destaque, sem recuo. */
const SemRecuoContext = createContext(false);

function Paragrafo({ children }: any) {
  const semRecuo = useContext(SemRecuoContext);
  return <p style={semRecuo ? undefined : { textIndent: "1.5cm" }}>{children}</p>;
}

function DirectiveBlock({ node, ...props }: any) {
  const directive = props["data-directive"] as string | undefined;
  const fonte = props["data-fonte"] as string | undefined;
  const url = props["data-url"] as string | undefined;
  const children = props.children;

  const cfg = directive ? DIRETIVA_CONFIG[directive] : undefined;
  if (!cfg) {
    // nunca deveria acontecer (skill de publicacao ja valida), mas nao
    // derruba a pagina por causa de um `div` normal.
    return <div>{children}</div>;
  }

  const corBarra = directive === "legislacao" ? "var(--jd-titulo-h1)" : "var(--jd-acento)";

  return (
    // Recuo de citacao longa (~4cm num documento Word) traduzido para a
    // web em proporcao: 10% da coluna em telas >=768px, 4% abaixo disso
    // (recuo cheio espreme demais o bloco no celular). Adicional a barra
    // vertical colorida, nao substitui.
    <div
      className="my-4 ml-[4%] mr-0 rounded-md bg-muted/30 py-3 pr-4 md:ml-[10%]"
      style={{ borderLeft: `4px solid ${corBarra}`, paddingLeft: "1rem" }}
    >
      {cfg.rotulo && (
        <div className="mb-1.5 flex items-center gap-2">
          <span>{cfg.emoji}</span>
          <span
            style={{
              fontFamily: "var(--jd-sans)",
              fontWeight: 700,
              color: "var(--jd-rotulo)",
              fontSize: "1rem",
            }}
          >
            {cfg.rotulo}
          </span>
        </div>
      )}
      {fonte && (
        <p style={{ fontFamily: "var(--jd-sans)", fontWeight: 600, fontSize: "0.9375rem" }}>
          {fonte}
        </p>
      )}
      <div
        className="mt-1 [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
        style={
          cfg.serifCorpo
            ? { fontFamily: "var(--jd-serif)", fontStyle: "italic", fontSize: "1rem" }
            : { fontSize: "1rem" }
        }
      >
        <SemRecuoContext.Provider value={cfg.semRecuo}>{children}</SemRecuoContext.Provider>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Fonte externa ↗
        </a>
      )}
    </div>
  );
}

/** Itálico do markdown (*assim*) -> --jd-serif, negrito + itálico, 16px.
 * Nunca aplicar por regex em aspas: so via o node `em` de verdade. */
function Citacao({ children }: any) {
  return (
    <em
      style={{
        fontFamily: "var(--jd-serif)",
        fontWeight: 700,
        fontStyle: "italic",
        fontSize: "1rem",
      }}
    >
      {children}
    </em>
  );
}

/* ------------------------- Tabelas (remark-gfm) -------------------------
 * No mobile a tabela vira blocos empilhados (CSS em styles.css). Para isso
 * cada <td> precisa saber o nome da sua coluna: lemos os <th> do hast da
 * <table> e injetamos data-label em cada celula, por posicao de coluna.
 * A 1a coluna (rotulo da linha: "Instrumento", "Capital"...) nao recebe
 * label — ela e o titulo do bloco. */
const HeadersTabelaContext = createContext<string[]>([]);

function textoDoNode(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  if (Array.isArray(node.children)) return node.children.map(textoDoNode).join("");
  return "";
}

function coletarHeaders(node: any): string[] {
  const headers: string[] = [];
  const walk = (n: any) => {
    if (!n) return;
    if (n.tagName === "th") {
      headers.push(textoDoNode(n).trim());
      return;
    }
    if (Array.isArray(n.children)) n.children.forEach(walk);
  };
  const thead = (node?.children ?? []).find((c: any) => c.tagName === "thead");
  walk(thead ?? node);
  return headers;
}

function TableBlock({ node, children }: any) {
  const headers = useMemo(() => coletarHeaders(node), [node]);
  return (
    <HeadersTabelaContext.Provider value={headers}>
      <div className="jd-table-wrap">
        <table className="jd-table">{children}</table>
      </div>
    </HeadersTabelaContext.Provider>
  );
}

function Td({ node, children, ...rest }: any) {
  return <td {...rest}>{children}</td>;
}

function Th({ node, children, ...rest }: any) {
  return <th {...rest}>{children}</th>;
}

function TableRow({ children }: any) {
  const headers = useContext(HeadersTabelaContext);
  let coluna = -1;
  const celulas = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type !== Td) return child;
    coluna += 1;
    const label = coluna > 0 ? (headers[coluna] ?? "") : "";
    return cloneElement(child as any, label ? { "data-label": label } : {});
  });
  return <tr>{celulas}</tr>;
}

export function MateriaMarkdown({ markdown }: { markdown: string }) {
  const headings = useMemo(() => extractHeadings(markdown), [markdown]);
  let hIndex = 0;

  const H1 = ({ children }: any) => {
    const h = headings[hIndex++];
    return (
      <h1
        id={h?.slug}
        className="scroll-mt-24"
        style={{
          fontFamily: "var(--jd-sans)",
          fontWeight: 600,
          fontSize: "1.5rem",
          color: "var(--jd-titulo-h1)",
          borderBottom: "2px solid var(--jd-acento)",
          paddingBottom: "0.375rem",
          marginTop: "2rem",
          marginBottom: "1rem",
          marginLeft: "1.5cm",
        }}
      >
        {h && <span className="mr-2 tabular-nums opacity-70">{h.numero}</span>}
        {children}
      </h1>
    );
  };

  const H2 = ({ children }: any) => {
    const h = headings[hIndex++];
    return (
      <h2
        id={h?.slug}
        className="scroll-mt-24"
        style={{
          fontFamily: "var(--jd-sans)",
          fontWeight: 600,
          fontSize: "1.25rem",
          color: "var(--jd-titulo-h2)",
          marginTop: "1.5rem",
          marginBottom: "0.75rem",
          marginLeft: "1.5cm",
        }}
      >
        {h && <span className="mr-2 tabular-nums opacity-70">{h.numero}</span>}
        {children}
      </h2>
    );
  };

  const H3 = ({ children }: any) => {
    const h = headings[hIndex++];
    return (
      <h3
        id={h?.slug}
        className="scroll-mt-24"
        style={{
          fontFamily: "var(--jd-sans)",
          fontWeight: 600,
          fontStyle: "italic",
          fontSize: "1.1rem",
          color: "var(--jd-titulo-h2)",
          marginTop: "1.25rem",
          marginBottom: "0.5rem",
          marginLeft: "1.5cm",
        }}
      >
        {h && <span className="mr-2 tabular-nums not-italic opacity-70">{h.numero}</span>}
        {children}
      </h3>
    );
  };

  // H4+ nunca deveria aparecer (a skill de publicacao ja rejeita), mas se
  // passar por fora, renderiza sem consumir headings[hIndex] — consumir
  // desalinharia a numeracao/id de todo H1/H2/H3 que vem depois.
  const HeadingInvalidaFallback = ({ children }: any) => (
    <p className="mt-4 mb-2 font-semibold">{children}</p>
  );

  return (
    // lang="pt-BR" e obrigatorio aqui para o hyphens:auto hifenizar em
    // portugues (senao o browser nao sabe as regras de silabacao). justify
    // + hyphens andam juntos: justificar sem hifenizar abre rios brancos.
    <div
      lang="pt-BR"
      className="text-[16px] leading-[1.5]"
      style={{
        textAlign: "justify",
        WebkitHyphens: "auto",
        MozHyphens: "auto",
        msHyphens: "auto",
        hyphens: "auto",
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkDirective, remarkDirectiveToHast]}
        components={{
          h1: H1,
          h2: H2,
          h3: H3,
          // A skill de publicacao ja rejeita H4+; isto e so uma rede de
          // seguranca para nao quebrar a pagina caso passe algo por fora.
          h4: HeadingInvalidaFallback,
          h5: HeadingInvalidaFallback,
          h6: HeadingInvalidaFallback,
          em: Citacao,
          p: Paragrafo,
          div: DirectiveBlock,
          table: TableBlock,
          tr: TableRow,
          td: Td,
          th: Th,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
