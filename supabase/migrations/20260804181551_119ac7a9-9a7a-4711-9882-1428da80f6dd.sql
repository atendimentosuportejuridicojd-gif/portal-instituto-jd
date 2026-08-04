with base as (
  select id, row_number() over (order by created_at) rn
  from public.questoes
  where material_id = '01b6f17c-bb55-4fd1-8bfa-2fc66102d1d5' and ordem = 0
)
update public.questoes q set ordem = base.rn
from base where q.id = base.id;