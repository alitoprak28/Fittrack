# Fittrack

fitTrack, günlük fitness sürecini daha düzenli takip etmek için hazırlanmış tek sayfalık bir web uygulamasıdır.

## Özellikler

- Giriş yap ve kayıt ol akışı
- Kullanıcı bazlı profil ve hedef yönetimi
- Seçimli ve detaylı antrenman kaydı
- Öğün ve makro takibi
- Su takibi
- Haftalık ilerleme grafiği
- Yerel admin paneli

## Kurulum

Bu proje ek bağımlılık gerektirmez. Statik dosya olarak çalışır.

## Çalıştırma

PowerShell ile proje klasöründe:

```powershell
python -m http.server 4173
```

Ardından tarayıcıda şu adresi aç:

```text
http://127.0.0.1:4173/
```

## Not

Veriler şu anda tarayıcı `localStorage` içinde tutulur. Backend ve veritabanı entegrasyonu sonraki adım olarak eklenebilir.
