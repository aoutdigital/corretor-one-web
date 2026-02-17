# Templates de E-mail (Supabase Auth)

Esta pasta guarda os templates HTML dos e-mails transacionais do Supabase para o projeto `corretor.one`.

## Onde configurar no Supabase

1. Acesse `Supabase Dashboard` -> `Authentication` -> `Emails`.
2. Em `Templates`, abra cada tipo de e-mail.
3. Cole o HTML correspondente desta pasta.
4. Salve.

## Arquivos

- `confirm-signup.html`: confirmação de cadastro.
- `reset-password.html`: recuperação de senha.
- `magic-link.html`: acesso sem senha.
- `invite-user.html`: convite de usuário.
- `change-email.html`: confirmação de troca de e-mail.

## Variáveis usadas

Os templates usam placeholders do GoTrue/Supabase, principalmente:

- `{{ .ConfirmationURL }}`
- `{{ .Email }}`
- `{{ .NewEmail }}`
- `{{ .SiteURL }}`

Se quiser, podemos evoluir para versões com componentes e build de MJML/React Email.
