import supabaseClient from './supabaseClient';

/**
 * Mengambil rata-rata rating dan total ulasan untuk sebuah properti
 */
export const getPropertyRatingSummary = async (propertyId) => {
  try {
    const { data, error } = await supabaseClient
      .from('reviews')
      .select('average_rating')
      .eq('property_id', propertyId);

    if (error) throw error;

    if (!data || data.length === 0) {
      return { average: 0, count: 0 };
    }

    const total = data.reduce((acc, curr) => acc + Number(curr.average_rating), 0);
    return { average: (total / data.length).toFixed(1), count: data.length };
  } catch (error) {
    console.error('Error fetching rating summary:', error);
    return { average: 0, count: 0 };
  }
};

/**
 * Mengambil daftar ulasan lengkap untuk sebuah properti
 */
export const getPropertyReviews = async (propertyId) => {
  try {
    const { data, error } = await supabaseClient
      .from('reviews')
      .select(`
        *,
        users!reviews_tenant_id_fkey(full_name, avatar_url)
      `)
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return { data: null, error: error.message };
  }
};

/**
 * Menyimpan ulasan baru dari tenant
 */
export const submitReview = async (reviewData) => {
  try {
    // Hitung rata-rata
    const {
      cleanliness, comfort, security, price, roomFacilities, publicFacilities
    } = reviewData;
    
    const avg = (cleanliness + comfort + security + price + roomFacilities + publicFacilities) / 6.0;

    const { data, error } = await supabaseClient
      .from('reviews')
      .insert({
        property_id: reviewData.propertyId,
        tenant_id: reviewData.tenantId,
        rating_cleanliness: cleanliness,
        rating_comfort: comfort,
        rating_security: security,
        rating_price: price,
        rating_room_facilities: roomFacilities,
        rating_public_facilities: publicFacilities,
        average_rating: avg,
        comment: reviewData.comment || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error submitting review:', error);
    return { success: false, error: error.message };
  }
};
