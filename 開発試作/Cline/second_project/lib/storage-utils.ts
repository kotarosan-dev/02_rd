import { supabase } from './supabase';

export async function uploadAvatar(userId: string, file: File) {
  try {
    // 既存のアバター画像を削除
    const { data: existingFiles } = await supabase.storage
      .from('avatars')
      .list(userId);

    if (existingFiles?.length) {
      await supabase.storage
        .from('avatars')
        .remove(existingFiles.map(f => `${userId}/${f.name}`));
    }

    // 新しいアバター画像をアップロード
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: '0'
      });

    if (uploadError) throw uploadError;

    // 公開URLを取得
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = `${data.publicUrl}?v=${new Date().getTime()}`; // Add cache buster

    // プロフィールを更新
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { publicUrl, error: null };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return { publicUrl: null, error };
  }
}

export async function deleteAvatar(userId: string, url: string) {
  try {
    const fileName = url.split('/').pop();
    if (!fileName) throw new Error('Invalid avatar URL');

    const filePath = `${userId}/${fileName}`;

    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([filePath]);

    if (deleteError) throw deleteError;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { error: null };
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return { error };
  }
}