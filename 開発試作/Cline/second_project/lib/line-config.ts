// 環境変数の存在確認
const envCheck = {
  accessToken: process.env.NEXT_PUBLIC_LINE_CHANNEL_ACCESS_TOKEN,
  secret: process.env.NEXT_PUBLIC_LINE_CHANNEL_SECRET
};

console.log('🔧 LINE環境変数チェック:', {
  hasAccessToken: !!envCheck.accessToken,
  hasSecret: !!envCheck.secret,
  accessTokenLength: envCheck.accessToken?.length,
  secretLength: envCheck.secret?.length
});

// LINE設定オブジェクトの作成
const lineConfig = {
  channelAccessToken: envCheck.accessToken,
  channelSecret: envCheck.secret
};

if (!lineConfig.channelAccessToken) {
  console.warn('⚠️ LINE Channel Access Token が設定されていません');
}

if (!lineConfig.channelSecret) {
  console.warn('⚠️ LINE Channel Secret が設定されていません');
}

export default lineConfig; 