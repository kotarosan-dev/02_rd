export const sendBookingConfirmationEmail = async (
  email: string,
  name: string,
  date: string,
  service: string
): Promise<void> => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-booking-confirmation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          email,
          name,
          date,
          service,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send email: ${errorData.message || response.statusText}`);
    }

    console.log('✅ メール送信成功');
  } catch (error) {
    console.error('❌ メール送信エラー:', error);
    throw error;
  }
};