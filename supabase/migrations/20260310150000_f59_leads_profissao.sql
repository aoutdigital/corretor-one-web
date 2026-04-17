alter table public.leads
  add column if not exists profissao text,
  add column if not exists endereco text,
  add column if not exists numero text,
  add column if not exists complemento text,
  add column if not exists bairro text,
  add column if not exists cep text,
  add column if not exists cidade text,
  add column if not exists uf public.uf,
  add column if not exists pais text;
