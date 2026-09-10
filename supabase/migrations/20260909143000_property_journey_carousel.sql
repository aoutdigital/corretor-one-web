alter table public.posts add column if not exists resultado_urls text[];

insert into public.templates (nome,tipo,objetivo,provider,renderer_key,version,mode,formatos,config,draft_config,ativo)
values ('Percurso Editorial 01','CAROUSEL','PROMOVER_IMOVEL','HTML_STATIC','property-journey-carousel-01',1,'HYBRID',array['PORTRAIT']::public.creative_output_format[],'{}','{}',true)
on conflict (renderer_key,version) do update set nome=excluded.nome, formatos=excluded.formatos, ativo=true;
