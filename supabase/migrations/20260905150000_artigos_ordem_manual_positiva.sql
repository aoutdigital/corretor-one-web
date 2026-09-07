with ranked_articles as (
  select
    id,
    row_number() over (
      partition by owner_id
      order by
        case when ordem_manual > 0 then 0 else 1 end,
        ordem_manual asc,
        updated_at desc,
        id asc
    ) as new_order
  from public.artigos
)
update public.artigos as article
set ordem_manual = ranked_articles.new_order
from ranked_articles
where article.id = ranked_articles.id;

alter table public.artigos
  alter column ordem_manual set default 1;

alter table public.artigos
  add constraint artigos_ordem_manual_positive_check
  check (ordem_manual > 0);
