---
name: kosanku-build-deploy
description: Panduan build APK, troubleshooting error build, dan deployment aplikasi KosanKu. Gunakan skill ini saat diminta build APK release, debug error build, atau menjalankan aplikasi di emulator/device.
---

# Build & Deploy KosanKu

## Menjalankan di Development
```bash
npx expo run:android        # Build & run di emulator/device (dev mode)
npx expo start              # Metro bundler saja (jika sudah pernah build)
```

## Build APK Release (Production)
```bash
cd android
.\gradlew assembleRelease
```
Output: `android/app/build/outputs/apk/release/app-release.apk`

### Prasyarat Build Release
1. Keystore sudah dikonfigurasi di `android/app/build.gradle` (signingConfigs)
2. `babel-plugin-transform-remove-console` terinstall (devDependencies) — diperlukan oleh `babel.config.js` untuk menghapus console.log di production
3. File `.env` dengan variabel: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_MAPBOX_KEY`, `EXPO_PUBLIC_WEB_CLIENT_ID`, `MAPBOX_SECRET_KEY`

## Troubleshooting Umum

### Error: "Cannot find module 'babel-plugin-transform-remove-console'"
```bash
npm install -D babel-plugin-transform-remove-console
```

### Error: Metro Bundling failed (SyntaxError)
Periksa file JSX yang disebutkan di error — biasanya ada tag JSX yang tidak tertutup atau kelebihan `<View>`.

### Error: CMake / Native build failed
```bash
# Hapus cache CMake dan build ulang
Remove-Item -Recurse -Force android/app/.cxx -ErrorAction SilentlyContinue
cd android
.\gradlew assembleRelease
```

### Error: Maven/Gradle download timeout
Jalankan ulang — biasanya masalah koneksi sementara:
```bash
.\gradlew assembleRelease --no-daemon
```

### Build lambat / cache bermasalah
```bash
# Bersihkan semua cache
Remove-Item -Recurse -Force .expo, node_modules\.cache -ErrorAction SilentlyContinue
cd android
.\gradlew clean
.\gradlew assembleRelease
```

### Error: "non-fast-forward" saat git push
```bash
git pull origin dev --rebase
git push origin dev
```

## Catatan Penting
- Build release menggunakan kode **lokal** (bukan dari GitHub) — pastikan semua perubahan sudah tersimpan
- Proses build biasanya memakan waktu 5-15 menit tergantung spesifikasi komputer
- Warning "Deprecated Gradle features" bisa diabaikan — ini dari library pihak ketiga
- Warning dari react-native-webview tentang `RCTEventEmitter` bisa diabaikan
