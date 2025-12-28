import lineConfig from '@/lib/line-config';
import { Button } from '@/components/ui/button';

export default function LineLoginButton() {
  console.log('🔧 LINE設定読み込み:', {
    config: lineConfig,
    hasAccessToken: !!lineConfig?.channelAccessToken,
    hasSecret: !!lineConfig?.channelSecret,
    env: {
      hasAccessToken: !!process.env.NEXT_PUBLIC_LINE_CHANNEL_ACCESS_TOKEN,
      hasSecret: !!process.env.NEXT_PUBLIC_LINE_CHANNEL_SECRET,
    }
  });

  // LINE設定の存在確認
  if (!lineConfig?.channelAccessToken || !lineConfig?.channelSecret) {
    console.error('❌ LINE設定が不完全です:', {
      accessToken: !!lineConfig?.channelAccessToken,
      secret: !!lineConfig?.channelSecret
    });
    return (
      <Button disabled className="w-full bg-gray-400">
        LINEログインは現在利用できません
      </Button>
    );
  }

  const handleLineLogin = () => {
    try {
      console.log('🔄 LINEログイン開始');
      // LINEログインの処理
    } catch (error) {
      console.error('❌ LINEログインエラー:', error);
    }
  };

  return (
    <Button
      onClick={handleLineLogin}
      className="w-full bg-[#00B900] hover:bg-[#00B900]/90"
    >
      LINEでログイン
    </Button>
  );
} 