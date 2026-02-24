const https = require('https');

const GOOGLE_URL = 'https://script.google.com/macros/s/AKfycbyuQsF_B-Yc2MYp42mTuYls2lSJPvoVPZUhV9zxI6ArxE4fdsLB7Jro5h2si095MYc/exec';

exports.handler = async function(event) {
  const params = new URLSearchParams(event.queryStringParameters || {});
  const url = `${GOOGLE_URL}?${params.toString()}`;

  return new Promise((resolve) => {
    const makeRequest = (requestUrl) => {
      https.get(requestUrl, (res) => {
        // Follow redirects manually
        if (res.statusCode === 301 || res.statusCode === 302) {
          makeRequest(res.headers.location);
          return;
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: data
          });
        });
      }).on('error', (err) => {
        resolve({
          statusCode: 500,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ status: 'error', message: err.message })
        });
      });
    };
    makeRequest(url);
  });
};
