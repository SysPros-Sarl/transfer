# transfer

`curl --upload-file` for [transfer.it](https://transfer.it), the transfer.sh way, as a Cloudflare Worker.

```bash
curl -T hello.txt https://transfer.example.com
# https://transfer.it/t/AbCdEfGhIjKl
# https://transfer.example.com/t/AbCdEfGhIjKl/hello.txt
# delete: curl -X DELETE https://transfer.example.com/t/AbCdEfGhIjKl/<delete-token>

curl -T hello.txt https://transfer.example.com/1/            # only 1 download (/5/ = 5)
curl -sL https://transfer.example.com/sh | sh -s big.iso     # any size, folders too
wget -c https://transfer.example.com/t/AbCdEfGhIjKl/hello.txt
```

`GET /` shows a help page with a drag-and-drop uploader (with a "1 download" option and delete buttons). curl gets plain-text help.

## Deploy

```bash
npm install
npx wrangler login
npx wrangler deploy
```

If your login has several Cloudflare accounts, pick one with a gitignored `.env` file next to `wrangler.toml`:

```bash
echo "CLOUDFLARE_ACCOUNT_ID=<your account id>" > .env
```

Add a custom domain in the dashboard (Workers → transfer → Settings → Domains & Routes) if you don't want the `*.workers.dev` address.

## How it works

transfer.it runs on MEGA's API. For each upload the Worker does what the transfer.it page does in your browser:

1. creates an anonymous throwaway MEGA session and a transfer container (`up`, `us`, `xn`);
2. encrypts the stream chunk by chunk (AES-128-CTR plus MEGA's CBC-MAC) and sends it over a WebSocket to MEGA's upload server;
3. attaches the file, sets the download limit if any (`xm`), closes the transfer (`xc`) and returns the links.

**Downloads** (`/t/<id>/<name>`) ask MEGA for a plaintext URL (`g` with `pt: 1`, like transfer.it's own page) and stream it through. MEGA decrypts server-side, so downloads cost the Worker almost no CPU. HTTP ranges pass through, so `wget -c` and `curl -C -` resume.

**Delete token**: the token is the upload's throwaway MEGA session; `DELETE /t/<id>/<token>` runs `xd` with it. Without the token nobody can delete the transfer.

**Download limit** (`/n/`): MEGA's `mc` setting counts *listings* of the transfer (`f`), not download URLs, and locks the transfer as soon as the `mc`-th listing happens. Every download does one listing, so the Worker sets `mc = n + 1`. HEAD requests, link-preview bots (Slack, WhatsApp, Discord…) and the browser redirect from `/t/<id>` to transfer.it never list the transfer, so they don't use up a download. Opening the transfer.it page does count as one, like a download through the Worker. A resumed download (`wget -c`) counts again.

Protocol reference: [transferit-py](https://github.com/viperadnan-git/transferit-py). One difference from it: the empty end-of-file chunk (sent when a file ends exactly on a chunk boundary) is left out of the MAC, as MEGA's own uploader does. Otherwise transfer.it's download page reports those files as corrupt.

## Files over 100 MB

Cloudflare caps one request body at 100 MB (Free and Pro plans) and rejects bigger ones before the Worker sees them, so a single `curl -T` can't go past that. The helper script splits bigger files into parts (`PART_MB`, 90 by default) and sends them one after another. It runs straight from a pipe, so nothing needs installing:

```bash
curl -sL https://transfer.example.com/sh | sh -s big.iso     # any size; folders are tar.gz'd
curl -sL https://transfer.example.com/1/sh | sh -s big.iso   # same, 1 download only
```

```powershell
irm https://transfer.example.com/ps | iex; transfer big.iso  # PowerShell (folders are zipped)
```

Or install it once and type `transfer big.iso` from then on:

```bash
curl -sL https://transfer.example.com/sh > ~/.transfer.sh && echo '. ~/.transfer.sh' >> ~/.bashrc
```

The web page does the same. The part protocol is stateless on the Worker side:

```
PUT /[n/]<name>   X-Total-Size: <bytes>   X-Offset: <offset>   [X-State: <token>]
→ 202 "next <offset> <token>"   send the next part from <offset> with <token>
→ 200 <links>                   done
```

A part can be any size of at least 1 MiB. The Worker only uploads whole MEGA chunks, and the reply says where the next part must start.

## Limits

- **CPU**: uploading costs about 2.5 ms of CPU per MiB (encryption). Workers Paid ($5/month, 30 s CPU per request by default) handles 90 MiB parts easily. The Free plan allows 10 ms per request, enough for uploads of a few MiB only. Downloads are cheap on either plan.
- **Privacy**: like transfer.sh, anyone with the link can download. transfer.it keeps the decryption key on MEGA's side, so this is not end-to-end encrypted.
- **Unofficial**: this uses transfer.it's private API. If MEGA changes it, things break until this is updated.

## Testing

```bash
npx wrangler dev --var PART_MB:6          # small parts to exercise the multipart path
curl -T ./file http://127.0.0.1:8787
node test/verify-mac.mjs ./file <link>    # checks the MAC the way transfer.it's downloader does
```
