# DDT Profile Pro Worker

Backend for the `DDTProfilePro` plugin. Runs free on Cloudflare Workers + D1.

## Endpoints

- `GET /callback?code=...` - Discord OAuth2 redirect target, returns a signed DDT token
- `GET /users` - `{ users: { [userId]: { background?, song?, bio?, accent? } } }` (cached 2 min)
- `PUT /profile` - save your profile (`Authorization: <token>`, JSON body)
- `DELETE /profile` - remove your profile

## Deploy

1. Create a Discord application at https://discord.com/developers/applications
   - OAuth2: copy the Client ID and Client Secret
   - OAuth2 Redirects: add `https://ddt-profile-pro.<your-subdomain>.workers.dev/callback`
2. Log in to Cloudflare and create the database:

       npx wrangler login
       npx wrangler d1 create ddt-profile-pro

   Put the printed `database_id` and your Client ID into `wrangler.toml`.
3. Create the table and secrets:

       npx wrangler d1 execute ddt-profile-pro --remote --file=schema.sql
       npx wrangler secret put DISCORD_CLIENT_SECRET
       npx wrangler secret put TOKEN_SECRET

   `TOKEN_SECRET` can be any long random string.
4. Deploy:

       npx wrangler deploy

5. In DDT: Settings > Plugins > DDTProfilePro, set API URL to your worker URL and Client ID to your Discord app Client ID.
