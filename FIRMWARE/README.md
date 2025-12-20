# Panduan Flashing Firmware SlimeVR untuk ESP32

Dokumen ini menjelaskan cara melakukan instalasi, konfigurasi, dan flashing firmware SlimeVR ke board ESP32 menggunakan Visual Studio Code dan PlatformIO.

## Daftar Isi
1. [Alat yang Dibutuhkan](#1-alat-yang-dibutuhkan)
2. [Instalasi Perangkat Lunak](#2-instalasi-perangkat-lunak)
    - [Download dan Instal Visual Studio Code](#a-download-dan-instal-visual-studio-code)
    - [Instal Ekstensi PlatformIO IDE](#b-instal-ekstensi-platformio-ide)
3. [Persiapan Firmware](#3-persiapan-firmware)
    - [Download Kode Firmware](#a-download-kode-firmware)
    - [Buka Proyek di VS Code](#b-buka-proyek-di-vs-code)
4. [Konfigurasi Wi-Fi (Hardcode)](#4-konfigurasi-wi-fi-hardcode)
5. [Proses Flashing](#5-proses-flashing)
    - [A. Hapus Flash (Erase Flash)](#a-hapus-flash-erase-flash---opsional-tapi-direkomendasikan)
    - [B. Upload Firmware](#b-upload-firmware)
6. [Monitoring dan Verifikasi](#6-monitoring-dan-verifikasi)
    - [Membuka Serial Monitor](#a-membuka-serial-monitor)
    - [Memahami Output Serial Monitor](#b-memahami-output-serial-monitor)

---

### 1. Alat yang Dibutuhkan
- **SLIMEVR By POSITRON ELECTRONIC**: Pastikan Anda memiliki board pengembangan ESP32.
- **Kabel USB**: Kabel data USB untuk menghubungkan ESP32 ke komputer.
- **Komputer**: PC atau laptop dengan sistem operasi Windows, macOS, atau Linux.

### 2. Instalasi Perangkat Lunak

#### a. Download dan Instal Visual Studio Code
Visual Studio Code (VS Code) adalah editor kode yang akan kita gunakan.
- **Download di sini**: [https://code.visualstudio.com/](https://code.visualstudio.com/)
- Instal VS Code sesuai dengan petunjuk untuk sistem operasi Anda.

#### b. Instal Ekstensi PlatformIO IDE
PlatformIO adalah sebuah _toolchain_ yang memudahkan pengembangan untuk perangkat keras _embedded_ seperti ESP32.
1. Buka VS Code.
2. Buka menu **Extensions** di sidebar kiri (ikon kotak).
3. Di kotak pencarian, ketik `PlatformIO IDE`.
4. Pilih ekstensi dari **PlatformIO** dan klik **Install**.
5. Tunggu hingga proses instalasi selesai. Ini mungkin memakan waktu beberapa menit karena PlatformIO akan menginstal banyak komponen. Setelah selesai, VS Code mungkin akan meminta untuk di-reload.

### 3. Persiapan Firmware

#### a. Download Kode Firmware
Firmware yang akan kita gunakan berasal dari repositori ini.
- **Download di sini**: [SlimeVR-BMI160 Firmware](https://github.com/juarendra/SlimeVR-BMI160/archive/refs/heads/main.zip)
- Ekstrak file ZIP yang sudah di-download. Anda akan mendapatkan folder `SlimeVR-BMI160-main`.

#### b. Buka Proyek di VS Code
1. Buka VS Code.
2. Klik **File** > **Open Folder...**.
3. Arahkan ke folder firmware yang telah Anda ekstrak, lalu buka `SlimeVR-BMI160-main\FIRMWARE\SlimeVR-Tracker-ESP`.
4. VS Code akan membuka proyek tersebut. PlatformIO mungkin akan mulai menginstal _library_ dan _toolchain_ yang dibutuhkan secara otomatis. Biarkan proses ini berjalan hingga selesai.

### 4. Konfigurasi Wi-Fi (Hardcode)
Untuk menghubungkan tracker ke jaringan Wi-Fi Anda, Anda perlu memasukkan nama (SSID) dan password Wi-Fi secara manual ke dalam file konfigurasi.
1. Di panel explorer VS Code (sidebar kiri), cari dan buka file `platformio.ini`.
2. Cari bagian `[env:esp32dev]`.
3. Di bawahnya, temukan `build_flags`.
4. Tambahkan atau ubah baris berikut di dalam `build_flags` untuk memasukkan informasi Wi-Fi Anda.

    ```ini
    [env:esp32dev]
    ; ... (konfigurasi lainnya)
    build_flags = 
        ; ... (flags lainnya)
        -DWIFI_SSID='"NAMA_WIFI_ANDA"'
        -DWIFI_PASSWORD='"PASSWORD_WIFI_ANDA"'
    ```
    **Ganti `NAMA_WIFI_ANDA` dan `PASSWORD_WIFI_ANDA`** dengan nama dan password Wi-Fi Anda yang sebenarnya. Pastikan untuk tetap menggunakan tanda kutip ganda di dalam dan di luar (`'"..."'`).

### 5. Proses Flashing
Hubungkan board ESP32 Anda ke komputer menggunakan kabel USB.

#### a. Hapus Flash (Erase Flash - Opsional tapi Direkomendasikan)
Menghapus flash sangat disarankan jika Anda baru pertama kali melakukan flash atau jika Anda mengubah konfigurasi Wi-Fi. Ini memastikan tidak ada konfigurasi lama yang tersisa.
1. Di bagian bawah jendela VS Code, cari toolbar PlatformIO.
2. Klik ikon centang (**✓**) untuk **Build** terlebih dahulu guna memastikan tidak ada eror.
3. Setelah build berhasil, klik **PlatformIO: Erase Flash**. Atau, buka terminal PlatformIO dengan mengklik ikon terminal (mirip `>_`) di toolbar, lalu ketik perintah:
    ```sh
    pio run --target erase
    ```
4. Tunggu hingga proses penghapusan selesai.

#### b. Upload Firmware
Setelah flash dihapus (atau jika Anda memilih untuk melewatinya), Anda dapat meng-upload firmware.
1. Di toolbar PlatformIO (bagian bawah jendela VS Code), klik ikon panah ke kanan (**→**) yang merupakan tombol **Upload**.
2. PlatformIO akan secara otomatis meng-compile (build) kode dan meng-upload-nya ke ESP32.
3. Anda akan melihat log proses di terminal. Jika berhasil, akan ada pesan `SUCCESS`.

### 6. Monitoring dan Verifikasi
Serial Monitor digunakan untuk melihat log dan status dari tracker ESP32 secara real-time.

#### a. Membuka Serial Monitor
1. Setelah proses upload berhasil, klik ikon steker (**🔌**) di toolbar PlatformIO untuk membuka **Serial Monitor**.
2. Pastikan baud rate (kecepatan) diatur ke **115200**. Biasanya ini sudah diatur secara otomatis.

#### b. Memahami Output Serial Monitor
Saat Serial Monitor terbuka, Anda akan melihat output teks dari ESP32. Berikut adalah contoh output dan penjelasannya:

```
[20:13:30] [INFO] [main] Starting SlimeVR tracker...
[20:13:30] [INFO] [main] SlimeVR v0.4.0
```
- **Penjelasan**: Tracker mulai berjalan dan menampilkan versi firmware.

```
[20:13:31] [INFO] [WIFI] Connecting to "NAMA_WIFI_ANDA"
...
[20:13:34] [INFO] [WIFI] WiFi connected. SSID: NAMA_WIFI_ANDA
[20:13:34] [INFO] [WIFI] IP address: 192.168.1.10
```
- **Penjelasan**: Tracker sedang mencoba terhubung ke jaringan Wi-Fi yang Anda konfigurasikan. Jika berhasil, ia akan menampilkan alamat IP yang didapat. Jika gagal, akan ada pesan error atau percobaan koneksi berulang.

```
[20:13:34] [INFO] [I2C] Scanning I2C bus...
[20:13:34] [INFO] [I2C] Found I2C device at address 0x68
[20:13:34] [INFO] [SENSOR] Found BMI160 at address 0x68
```
- **Penjelasan**: Tracker memindai sensor IMU (Inertial Measurement Unit) yang terhubung melalui I2C. Dalam kasus ini, ia berhasil menemukan sensor BMI160 di alamat `0x68`. Jika sensor tidak terdeteksi, Anda akan melihat pesan error.

```
[20:13:35] [INFO] [SERVER] Trying to connect to server at 192.168.1.255:6969...
[20:13:35] [INFO] [SERVER] Connected to server!
```
- **Penjelasan**: Tracker mencari dan mencoba terhubung ke server SlimeVR di jaringan lokal Anda. Setelah terhubung, ia siap mengirim data.

```
[20:13:36] [INFO] [OUTPUT:0] Sensor 0 reporting: 1.00 0.00 0.00 0.00
```
- **Penjelasan**: Ini adalah data rotasi (dalam bentuk quaternion) yang dikirim oleh sensor ke server. Anda akan melihat pesan ini berulang kali saat tracker aktif.

Jika Anda melihat semua log ini (koneksi Wi-Fi berhasil, sensor terdeteksi, dan terhubung ke server), maka proses flashing dan konfigurasi Anda telah berhasil!
