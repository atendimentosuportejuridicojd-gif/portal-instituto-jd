-- Remove o módulo antigo de simulado (descontinuado). Não há dependências fora destas quatro tabelas.
-- Os dados pessoais dos usuários (profiles e auth.users) permanecem. Ordem: de quem aponta para quem é apontado.
DROP TABLE IF EXISTS public.simulado_respostas;
DROP TABLE IF EXISTS public.simulado_alternativas;
DROP TABLE IF EXISTS public.simulado_tentativas;
DROP TABLE IF EXISTS public.simulado_questoes;
