-- O renderer panorâmico foi redesenhado a partir do protótipo HTML aprovado.
-- Os snapshots antigos não representam mais a composição publicada pelo código.
update public.templates
set
  preview_url = null,
  preview_vertical_url = null
where renderer_key = 'property-journey-carousel-01';
