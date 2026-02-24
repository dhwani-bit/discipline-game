const https = require('https');
const http = require('http');

const GOOGLE_URL = 'https://script.google.com/macros/s/AKfycbyuQsF_B-Yc2MYp42mTuYls2lSJPvoVPZUhV9zxI6ArxE4fdsLB7Jro5h2si095MYc/exec';

function fetchUrl(requestUrl, redirectCount) {
  if (redirectCount > 10) return Promise.reject(new Error('Too many redirects'));
  
  return new Promise((resolve, reject) => {
    const lib = requestUrl.startsWith('https') ? https : http;
    const req = lib.get(requestUrl, {
      headers: {
        'Accept': 'application/json, text/javascript, */*',
        'User-Agent': 'Mozilla/5.0'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http') 
          ? res.headers.location 
          : new URL(res.headers.location, requestUrl).href;
        res.resume();
        resolve(fetchUrl(next, redirectCount + 1));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

exports.handler = async function(event) {
  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    const url = `${GOOGLE_URL}?${params.toString()}`;
    
    const data = await fetchUrl(url, 0);
    
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch(e) {
      if (params.get('player')) {
        parsed = { status: 'ok' };
      } else {
        return {
          statusCode: 500,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'error', message: 'Invalid response from server' })
        };
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
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
