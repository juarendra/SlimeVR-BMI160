SlimeVR BMI160 Firmware
=======================

This directory contains the merged firmware binary for the ESP32.

To create the firmware:
1. Flash ESP-IDF bootloader at offset 0x0000
2. Flash partition table at offset 0x8000
3. Flash application firmware at offset 0x10000

The manifest.json references slimevr-bmi160.bin which should be a merged binary
containing all components at the correct offsets.
