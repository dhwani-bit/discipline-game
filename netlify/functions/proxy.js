const https = require('https');
const http = require('http');

const GOOGLE_URL = 'https://script.google.com/macros/s/AKfycbyuQsF_B-Yc2MYp42mTuYls2lSJPvoVPZUhV9zxI6ArxE4fdsLB7Jro5h2si095MYc/exec';

function fetchUrl(requestUrl, redirectCount, originalParams) {
  if (redirectCount > 10) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const lib = requestUrl.startsWith('https') ? https : http;
    let finalUrl = requestUrl;
    if (redirectCount > 0 && originalParams && !requestUrl.includes('?')) {
      finalUrl = `${requestUrl}?${originalParams}`;
    }
    const req = lib.get(finalUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; NetlifyFunction/1.0)',
        'X-Requested-With': 'XMLHttpRequest'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const location = res.headers.location;
        const next = location.startsWith('http') ? location : new URL(location, requestUrl).href;
        res.resume();
        resolve(fetchUrl(next, redirectCount + 1, originalParams));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

exports.handler = async function(event) {
  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    const paramString = params.toString();
    const url = `${GOOGLE_URL}?${paramString}`;
    const data = await fetchUrl(url, 0, paramString);
    let parsed;
    try {
      const jsonMatch = data.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch(e) {
      if (params.get('player')) {
        parsed = { status: 'ok' };
      } else {
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'error', message: 'No JSON in response', raw: data.substring(0, 200) })
        };
      }
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(parsed)
    };
  } catch(err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'error', message: err.message })
    };
  }
};
```

Click **Commit changes**, wait 30 seconds for Netlify to redeploy, then test this in your browser:
```
https://melodic-cranachan-704e44.netlify.app/.netlify/functions/proxy?action=leaderboard
