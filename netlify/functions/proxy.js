const https = require('https');

const GOOGLE_URL = 'https://script.google.com/macros/s/AKfycbwA-ho6gv_emtIh-PWwdIgwazf7j21FH6qgdhtbY3lEDn1FFPk9ssSeOI7HHRsdLGgZ/exec';

function get(url) {
  return new Promise(function(resolve, reject) {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, function(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        resolve(get(res.headers.location));
        return;
      }
      var body = '';
      res.on('data', function(c) { body += c; });
      res.on('end', function() { resolve(body); });
    }).on('error', reject);
  });
}

exports.handler = function(event) {
  var params = new URLSearchParams(event.queryStringParameters || {});
  var url = GOOGLE_URL + '?' + params.toString();

  return get(url).then(function(body) {
    var parsed;
    try {
      parsed = JSON.parse(body);
    } catch(e) {
      parsed = params.get('player') ? { status: 'ok' } : { status: 'error', raw: body.slice(0, 200) };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(parsed)
    };
  }).catch(function(err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: 'error', message: err.message })
    };
  });
};
```

Click **Commit changes**, wait 30 seconds, then test this in your browser:
```
https://melodic-cranachan-704e44.netlify.app/.netlify/functions/proxy?action=leaderboard
