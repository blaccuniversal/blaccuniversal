# Bemaamoo accounts: Supabase setup

1. Create a free project at supabase.com (any name; pick a region near Nigeria such as Frankfurt or London).
2. SQL Editor > New query > paste `bemaamoo-schema.sql` > Run.
3. Authentication > Sign In / Providers: keep Email on. Turn "Confirm email" off is not needed; we use a 6-digit code.
4. Authentication > Email Templates > Magic Link: replace the body with a line that shows `{{ .Token }}` (for example: `Your Bemaamoo code is {{ .Token }}`).
5. Authentication > URL Configuration: Site URL `https://blaccuniversal.com/bemaamoo/` and add the same under Redirect URLs.
6. Authentication > SMTP Settings: add a custom SMTP sender (Resend, Brevo or similar). Supabase's built-in email only sends a few messages per hour.
7. (Optional) Google: Authentication > Providers > Google, with a Google Cloud OAuth client. Then set `google: true` in `assets/bemaamoo/bmo-config.js`.
8. Project Settings > API: copy the Project URL and the anon / publishable key into `assets/bemaamoo/bmo-config.js`. Never use the service_role key.
