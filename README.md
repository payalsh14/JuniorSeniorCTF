# Euronova CTF Rooms - deploy on Vercel

1. Create a free Vercel account and a GitHub account.
2. Unzip this folder, push it to a new GitHub repo (or use `vercel` CLI from inside the folder).
3. In Vercel: Add New > Project > import the repo. Leave build settings empty, then Deploy.
4. Storage: in the project, open Storage (or Marketplace) > add **Upstash Redis** (free plan) and connect it to the project.
   This adds the env vars UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL / KV_REST_API_TOKEN). Both are supported.
5. Settings > Environment Variables: add **JUDGE_PASSWORD** with the password judges will use.
6. Redeploy (Deployments > ... > Redeploy) so the variables take effect.
7. Open your URL, register a test team, click Enter room and Done, then log in as judge to check it appears. Delete the test team.

Editing rooms: change the `ROOMS` list in `index.html` (title, description `desc`, link `url`).
Judge password is checked on the server, never stored in the page.
