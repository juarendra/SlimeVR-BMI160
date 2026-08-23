# Dokumentasi Penggunaan Software SlimeVR-BMI160

## 🎯 Pendahuluan

Tracker SlimeVR-BMI160 adalah perangkat full-body tracking DIY berbasis ESP32 dan sensor BMI160. Dokumentasi ini memandu Anda melalui dua metode utama:

- **🌐 Web Installer** — cara termudah, tanpa instalasi software (direkomendasikan)
- **⚙️ Manual (PlatformIO)** — untuk pengembang yang ingin mengompilasi sendiri

---

## 📸 Panduan Bergambar Web Installer

### Langkah 1: Buka Halaman Web Installer

<img src="screenshots/step1-homepage.png" alt="Halaman utama Web Installer" width="700">

Buka [SlimeVR BMI160 Web Installer](https://juarendra.github.io/SlimeVR-BMI160/) di Chrome/Edge.

### Langkah 2: Hubungkan Tracker & Connect

<img src="screenshots/step2-connect.png" alt="Tombol Connect" width="700">

1. Colokkan tracker via USB (pastikan kabel data).
2. Klik tombol **Connect** (pojok kiri atas).
3. Pilih port serial yang muncul (biasanya "USB Serial Port" atau COMx).

### Langkah 3: Verifikasi Koneksi

<img src="screenshots/step3-verified.png" alt="Status terhubung" width="700">

Jika berhasil:
- Status "Serial connected" berwarna hijau.
- "Firmware verified" (jika firmware sudah ada).

### Langkah 4: Flash Firmware

<img src="screenshots/step4-flash.png" alt="Tombol Flash Tracker" width="700">

1. Pindah ke step 2 (klik "02 Flash firmware" di sidebar).
2. Klik tombol **Flash Tracker**.
3. Konfirmasi port dan tunggu hingga selesai (jangan cabut kabel!).

**Proses flashing berlangsung ±10 detik.** Setelah selesai, tracker reboot otomatis.

### Langkah 5: Konfigurasi WiFi

<img src="screenshots/step5-wifi.png" alt="Form WiFi" width="700">

1. Pindah ke step 3.
2. Masukkan **SSID** dan **Password** WiFi Anda.
3. Klik **Save & connect WiFi**.
4. Tunggu beberapa detik hingga muncul "Connected" dan alamat IP.

### Langkah 6: Verifikasi di SlimeVR Server

<img src="screenshots/step6-server.png" alt="Tracker muncul di server" width="700">

- Buka SlimeVR Server di PC.
- Tracker akan muncul otomatis (pastikan satu jaringan).

### Langkah 7: Serial Log (Debugging)

<img src="screenshots/step7-serial.png" alt="Serial log" width="700">

Gunakan step 5 untuk melihat output real-time dari tracker (boot, WiFi, IMU).

---

## ⚙️ Metode Manual (PlatformIO)

### Prasyarat
- VS Code + PlatformIO IDE
- Kabel USB data

### Langkah-langkah

#### 1. Clone Repositori
```bash
git clone https://github.com/juarendra/SlimeVR-BMI160.git
cd SlimeVR-BMI160
```

#### 2. Buka Proyek Firmware
Buka folder `FIRMWARE/SlimeVR-Tracker-ESP-0.4.0/` di VS Code. PlatformIO akan menginstal dependensi otomatis.

#### 3. Konfigurasi WiFi (Hardcode)
Buka `platformio.ini`, tambahkan di `[env:esp32dev]`:
```ini
build_flags =
    -DWIFI_SSID='"NAMA_WIFI_ANDA"'
    -DWIFI_PASSWORD='"PASSWORD_WIFI_ANDA"'
```

#### 4. Erase Flash (Opsional)
```bash
pio run --target erase
```

#### 5. Upload Firmware
Klik tombol **Upload** (panah kanan) di toolbar PlatformIO. Tunggu hingga "SUCCESS".

#### 6. Monitor Serial
Klik ikon **Serial Monitor** (colokan), pastikan baud rate 115200.

### Output Serial yang Diharapkan
```
[20:13:30] [INFO] [main] Starting SlimeVR tracker...
[20:13:31] [INFO] [WIFI] Connecting to "NAMA_WIFI_ANDA"
[20:13:34] [INFO] [WIFI] WiFi connected. IP: 192.168.1.10
[20:13:34] [INFO] [I2C] Found BMI160 at address 0x68
[20:13:35] [INFO] [SERVER] Connected to server!
[20:13:36] [INFO] [OUTPUT:0] Sensor 0 reporting: ...
```

---

## 🔧 Perintah Serial untuk Provisioning (Advanced)

Firmware mendukung perintah serial berikut:

- `GET INFO` — tampilkan informasi perangkat.
- `SET BWIFI <base64_ssid> <base64_pass>` — kirim kredensial WiFi. Respon:
  - `[WIFI-PROVISION] ACCEPTED`
  - `[WIFI-PROVISION] CONNECTED <IP>`
  - `[WIFI-PROVISION] FAILED <reason>`

Perintah ini digunakan oleh Web Installer.

---

## 🐛 Troubleshooting Lanjutan

| Masalah | Solusi |
|---------|--------|
| **Sensor tidak terdeteksi** | Periksa koneksi I2C, pastikan header BMI160 terpasang. Coba `i2cscan`. |
| **WiFi gagal konek** | Pastikan password benar, gunakan jaringan 2.4 GHz. |
| **Tracker tidak muncul di server** | Pastikan server berjalan dan firewall tidak memblokir. |
| **Flashing manual gagal** | Periksa driver USB, coba port lain, restart VS Code. |

---

## 📚 Sumber Daya Tambahan

- [SlimeVR Official](https://www.slimevr.dev/)
- [GitHub Repo](https://github.com/juarendra/SlimeVR-BMI160)
- [README Utama](../README.md)

---

*Dokumentasi terakhir diperbarui: Agustus 2026*