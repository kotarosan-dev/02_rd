const config = {
  accessToken: 'f5c261af6f3de04f27d7ec9a6fe2158331a19d7ed67a62d724fcf9fd6931598b',
  accessTokenExpiresAt: new Date('2023-06-01T00:00:00Z'),
  clientId: 'c754d112ba2cff4c372418b262e55d0014a7a78dc5a9a0ed4c123c77a00241bb',
  clientSecret: 'feffbb65d77f948de9882b060b0c93afa4953f849867a9bc97ca924285f7e8d8',
  refreshToken: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
};

function isTokenExpired() {
  return config.accessTokenExpiresAt < new Date();
}

async function refreshToken() {
  const response = await fetch('https://accounts.secure.freee.co.jp/public_api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=refresh_token&client_id=${config.clientId}&client_secret=${config.clientSecret}&refresh_token=${config.refreshToken}`,
  });

  if (!response.ok) {
    throw new Error('トークンのリフレッシュに失敗しました');
  }

  const data = await response.json();
  config.accessToken = data.access_token;
  config.accessTokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);
  config.refreshToken = data.refresh_token;
}

export default {
  accessToken: config.accessToken,
  isTokenExpired,
  refreshToken,
};