# SlimeVR-BMI160 DIY Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/release/juarendra/SlimeVR-BMI160.svg)](https://github.com/juarendra/SlimeVR-BMI160/releases)
[![GitHub last commit](https://img.shields.io/github/last-commit/juarendra/SlimeVR-BMI160.svg)](https://github.com/juarendra/SlimeVR-BMI160/commits/main)

**SlimeVR-BMI160** adalah proyek tracker full-body DIY (Do It Yourself) berbasis ESP32 dan sensor IMU BMI160, dikembangkan oleh [Positron Electronik](https://www.tokopedia.com/positronelectronic). Solusi ini merupakan alternatif hemat biaya dari tracker SlimeVR original, dengan tetap mempertahankan performa tinggi untuk pengalaman VR yang imersif.

<p align="center">
  <img src="DOC/slimeVR_real_5.jpeg" width="400">
</p>

## ⚡ Fitur Unggulan
- **Mikrokontroler**: ESP32-WROOM-32 (WiFi + BLE)
- **Sensor IMU**: BMI160 (header socket, mudah diganti)
- **Manajemen Daya**: USB-C atau LiPo 1S, charger TP4056 + proteksi DW01A
- **Konektor I2C**: Port ekspansi untuk sensor tambahan
- **LED Indikator**: 5 LED untuk status pengisian, koneksi, dan serial
- **Tombol**: Reset & power switch

## 🚀 Cara Penggunaan

### 📦 Isi Paket (untuk produk jadi)
- 1 Unit tracker SlimeVR-BMI160
- 1 Baterai LiPo (terpasang)

### 🔋 Pengisian Daya
- Colokkan USB-C: LED **biru** menyala saat mengisi, **merah** saat penuh.

### 🌐 Flash & Konfigurasi WiFi (Metode Termudah)
Gunakan **Web Installer** tanpa instalasi software:
1. Buka [SlimeVR BMI160 Web Installer](https://juarendra.github.io/SlimeVR-BMI160/) di Chrome/Edge (PC).
2. Hubungkan tracker via USB.
3. Klik **Install Firmware**, lalu masukkan SSID & Password WiFi.
4. Tunggu hingga proses selesai dan tracker terhubung ke server SlimeVR.

> **Catatan**: Web Installer menggunakan Web Serial, jadi pastikan browser mendukung (Chrome/Edge).

### 🛠️ Metode Manual (untuk Developer)
Jika Anda ingin mengembangkan atau mengompilasi firmware sendiri, ikuti panduan lengkap di:
➡️ **[Panduan Flashing Manual](./FIRMWARE/README.md)**

## 📂 Struktur Repositori
| Direktori | Isi |
|-----------|-----|
| `/PCB` | Desain PCB (EAGLE) dan file Gerber |
| `/HARDWARE` | Model 3D case (STL) dan dimensi |
| `/FIRMWARE` | Source code firmware (PlatformIO) dan file .bin compiled |
| `/site` | Web Installer (HTML, CSS, JS, manifest) |
| `/DOC` | Dokumentasi, gambar, BOM, datasheet |
| `/scripts` | Script otomatisasi (QA, release) |

## 🔧 Untuk Pengembang (DIY)
Jika Anda ingin merakit sendiri:
1. **Rakit Hardware**: Gunakan file PCB dari `/PCB/CAD-CAM`, BOM dari `/DOC/BOM_SlimeVRDiyModular.csv`, dan case 3D dari `/HARDWARE/case`.
2. **Flash Firmware**: Ikuti panduan di `/FIRMWARE/README.md`.
3. **Verifikasi**: Gunakan serial monitor untuk memastikan koneksi WiFi dan sensor.

## 🐛 Pemecahan Masalah Umum
- **Tracker tidak muncul di server**: Pastikan SSID/password benar, PC dan tracker satu jaringan, saklar ON.
- **LED mati total**: Cek saklar, charge baterai via USB-C.

## 📖 Dokumentasi Lengkap
- [Dokumentasi Software (PDF)](./DOC/SOFTWARE_USAGE.pdf) — panduan detail penggunaan web installer dan manual.

<details>
<summary><strong>📐 Detail Teknis dan Galeri</strong></summary>

| Fitur | Komponen |
|-------|----------|
| Mikrokontroler | ESP32-WROOM-32 |
| Sensor IMU | BMI160 |
| USB-to-Serial | FTDI FT231XS |
| Charger | TP4056 |
| Proteksi Baterai | DW01A + FS8205A |
| Regulator | M3406 (3.3V 800mA) |

**Diagram Pinout**:
<p align="center">
  <img src="DOC/slimeVR_5.png" width="60%">
</p>

**Dimensi Board**: [PDF](https://github.com/juarendra/SlimeVR-BMI160/blob/main/HARDWARE/dimension_SlimeVR.pdf)

**Galeri**:
<p align="center">
  <img src="DOC/slimeVR_pcb_2.jpeg" width="45%">
  <img src="DOC/slimeVR_case_1.png" width="45%">
  <img src="DOC/slimeVR_real_1.jpeg" width="45%">
  <img src="DOC/slimeVR_real_3.jpeg" width="45%">
</p>
</details>

## ❓ FAQ
*Segera hadir.*

## 🤝 Kontribusi
Pull request dan saran sangat diterima! Silakan buka issue di GitHub.

## 📜 Lisensi
MIT License © 2024 Positron Electronik
