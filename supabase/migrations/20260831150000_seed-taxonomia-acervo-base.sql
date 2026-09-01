-- Seed da taxonomia do Acervo Base: upsert por codigo, sem DELETE.
-- Atualiza as 7 disciplinas existentes (G1, E1-E6) e cria as 15
-- restantes. Nao mexe em modulos nem em materiais - a lista "materias"
-- do seed e so informativa, nasce quando cada texto for publicado.
-- "Tecnico Legislativo" tem codigo NULL, entao nunca colide com o
-- ON CONFLICT (codigo) abaixo e nunca e tocada.

BEGIN;

INSERT INTO public.disciplinas (codigo, nome, slug, grupo, ordem) VALUES
  ('G1',  'Língua Portuguesa', 'lingua-portuguesa', 'gerais', 1),
  ('G3',  'Matemática e Raciocínio Lógico-Matemático', 'matematica-e-raciocinio-logico-matematico', 'gerais', 2),
  ('G4',  'Noções de Informática', 'nocoes-de-informatica', 'gerais', 3),
  ('G9',  'Regime Jurídico dos Servidores', 'regime-juridico-dos-servidores', 'gerais', 4),
  ('G8',  'Ética no Serviço Público', 'etica-no-servico-publico', 'gerais', 5),
  ('G2',  'Redação Oficial e Discursiva', 'redacao-oficial-e-discursiva', 'gerais', 6),
  ('G7',  'Direitos das Pessoas com Deficiência', 'direitos-das-pessoas-com-deficiencia', 'gerais', 7),
  ('G10', 'Lei de Acesso à Informação', 'lei-de-acesso-a-informacao', 'gerais', 8),
  ('G11', 'Lei Geral de Proteção de Dados', 'lei-geral-de-protecao-de-dados', 'gerais', 9),
  ('G6',  'Direitos Humanos', 'direitos-humanos', 'gerais', 10),
  ('G5',  'Análise de Dados e Inteligência Artificial', 'analise-de-dados-e-inteligencia-artificial', 'gerais', 11),
  ('E1',  'Direito Constitucional', 'direito-constitucional', 'especificos', 1),
  ('E2',  'Direito Administrativo', 'direito-administrativo', 'especificos', 2),
  ('E3',  'Direito Civil', 'direito-civil', 'especificos', 3),
  ('E4',  'Direito Processual Civil', 'direito-processual-civil', 'especificos', 4),
  ('E5',  'Direito Penal', 'direito-penal', 'especificos', 5),
  ('E6',  'Direito Processual Penal', 'direito-processual-penal', 'especificos', 6),
  ('E7',  'Administração Pública', 'administracao-publica', 'especificos', 7),
  ('E9',  'Gestão de Contratos', 'gestao-de-contratos', 'especificos', 8),
  ('E8',  'Gestão de Pessoas', 'gestao-de-pessoas', 'especificos', 9),
  ('E10', 'Orçamento Público e Administração Financeira', 'orcamento-publico-e-administracao-financeira', 'especificos', 10),
  ('E11', 'Direito Tributário', 'direito-tributario', 'especificos', 11)
ON CONFLICT (codigo) DO UPDATE
SET nome  = EXCLUDED.nome,
    slug  = EXCLUDED.slug,
    grupo = EXCLUDED.grupo,
    ordem = EXCLUDED.ordem;

COMMIT;
