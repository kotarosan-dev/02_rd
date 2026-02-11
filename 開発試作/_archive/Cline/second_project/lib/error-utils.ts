import { AuthError } from '@supabase/supabase-js';

export function getAuthErrorMessage(error: AuthError | Error): string {
  if ('status' in error) {
    switch (error.status) {
      case 400:
        return 'メールアドレスまたはパスワードが正しくありません';
      case 401:
        if (error.message.includes('Invalid login credentials')) {
          return 'このメールアドレスは登録されていません。新規登録を行ってください。';
        }
        return 'メールアドレスまたはパスワードが正しくありません';
      case 422:
        return 'メールアドレスの形式が正しくありません';
      case 429:
        return 'リクエストが多すぎます。しばらく時間をおいて再度お試しください';
      default:
        return 'エラーが発生しました。しばらく時間をおいて再度お試しください';
    }
  }

  if (error.message.includes('Invalid login credentials')) {
    return 'このメールアドレスは登録されていません。新規登録を行ってください。';
  }
  if (error.message.includes('Email not confirmed')) {
    return 'メールアドレスの確認が完了していません。確認メールをご確認ください。';
  }
  if (error.message.includes('Invalid API key')) {
    return 'システムエラーが発生しました。管理者にお問い合わせください。';
  }
  if (error.message.includes('JWT expired')) {
    return 'セッションの有効期限が切れました。再度ログインしてください。';
  }

  return error.message || 'エラーが発生しました。しばらく時間をおいて再度お試しください';
}

export function getApiErrorMessage(error: Error): string {
  if (error.message.includes('Invalid API key')) {
    return 'APIキーが無効です。システム管理者にお問い合わせください';
  }
  if (error.message.includes('JWT expired')) {
    return 'セッションの有効期限が切れました。再度ログインしてください';
  }
  return 'エラーが発生しました。しばらく時間をおいて再度お試しください';
}