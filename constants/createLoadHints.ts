export type HintKey =
    | 'deliveryType'
    | 'appointment'
    | 'carrierType'
    | 'savedRoute'
    | 'from'
    | 'to'
    | 'capacityType'
    | 'photos'
    | 'notes'
    | 'coupon'
    | 'insuredTransport'
    | 'amount'
    | 'submit';

export const CREATE_LOAD_HINTS: Record<HintKey, string> = {
    deliveryType: 'Gönderinizi hemen mi göndereceksiniz, yoksa ileri bir tarihe mi randevu vereceksiniz?',
    appointment: 'Gönderinin alınmasını istediğiniz tarih ve saati seçin.',
    carrierType: 'Yukarıda kaydırarak taşıma için uygun araç tipini seçebilirsiniz.',
    savedRoute: 'İsterseniz kayıtlı bir rotanızı seçerek adres bilgilerini otomatik doldurabilirsiniz. Bu adım isteğe bağlıdır.',
    from: 'Gönderinin alınacağı adresi girin.',
    to: 'Gönderinin teslim edileceği adresi girin.',
    capacityType: 'Yükünüzün kapasitesini ve türünü seçin.',
    photos: 'Zorunlu alan — göndereceğiniz yükün en az bir fotoğrafını ekleyin (en fazla 10 adet).',
    notes: 'Taşıyıcının bilmesi gereken ek bilgileri buraya yazabilirsiniz (isteğe bağlı).',
    coupon: 'Bir kampanya kodunuz varsa buraya yazıp "Uygula"ya basın.',
    insuredTransport: `Açarsanız yükünüz sigortalı taşınır, tutara ₺30 eklenir.`,
    amount: 'Tutar; seçtiğiniz araç, yükün büyüklüğü ve mesafeye göre otomatik hesaplanır.',
    submit: 'Devam etmeden önce tüm zorunlu alanları doldurduğunuzdan emin olun. Onayladığınızda eşleşme süreci başlayacaktır.',
};
