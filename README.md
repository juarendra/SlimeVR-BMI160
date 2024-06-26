# SlimeVR-BMI160

SlimeVR-BMI160 By [Positron Electronik](https://www.tokopedia.com/positronelectronic?source=universe&st=product) is a board pcb inspired by OpenSource Project SlimeVR. the original PCB is using IMU BNO085, but in here was modified for IMU BMI160 that more cheaper from BNO085. This board is based on the [ESP32 microcontroller](https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf) and this make some different from bases project that use ESP8266.
SlimeVR-BMI160 By [Positron Electronik](https://www.tokopedia.com/positronelectronic?source=universe&st=product) has three power source inputs -USB and LiPo Battery.
This board has a LI-PO battery charging feature with a max voltage of 4.2, equipped with Charging Protection so that charging your battery can be done more safely, the charging process can only be done with a USB power source.

By default, the [ESP32 microcontroller](https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf) is included with WiFi and Bluetooth Low Energy. 

## Table of Content

* [Product Specsification](#product-specsification)
* [Technical Spesification](#technical-spesification)
* [Priview Hardware](#priview-hardware)
* [Documentation](#documentation)
  * [Pinout Diagram](#pinout-diagram)
  * [Dimension](#dimension)
  * [BOM](#bom)
  * [Schematic](#schematic0)
  * [Example Program](#examples-program)
* [FAQ](#FAQ)

## Product Specsification

* ESP32 as Microcontroller
* WiFi & BLE Connectivity 
* IMU  BMI-160 with Header, you can change it if sensor have some problem
* Battery Input 1s LiPo with Battery Protection
* external i2c Connector
* LED notification , LED Charging, LED Stanby and LED Serial
* Button Reset
* Switch On/Off
* On Board ic USB to serial Programming
* USB type C port

## Technical Spesification

| Features                           | Value                |  
| ---------------------------------- | -------------------- |
| Microcontroller                    | ESP32                |
| IMU                                | BMI-160              |
| IC USB to Serial                   | FTDI FT231XS         |
| Battery Charging IC                | TP4056               |
| Battery Protection IC              | DW01A and FS8205A    |
| LED Notif                          | 5 LED 0805           |
| Main PSU                           | M3406 3v3 800mA      |  

## Priview Hardware
<p align="center">
  <img src="DOC/slimeVR_1.png" width="50%" height="50%">
  <img src="DOC/slimeVR_2.png" width="50%" height="50%">
  <img src="DOC/slimeVR_3.png" width="50%" height="50%">
  <img src="DOC/slimeVR_4.png" width="50%" height="50%">
</p>

## Documentation
### Pinout Diagram
<p align="center">
  <img src="DOC/slimeVR_5.png" width="50%" height="50%">
</p>

### Dimension
* [Dimension Board with Component](https://github.com/juarendra/SlimeVR-BMI160/blob/main/HARDWARE/dimension_SlimeVR.pdf)
### BOM
* [BOM Board](https://github.com/juarendra/SlimeVR-BMI160/blob/main/DOC/BOM_SlimeVRDiyModular.csv)
### Schematic
* [Schematic](https://github.com/juarendra/SlimeVR-BMI160/blob/main/PCB/PDF/SlimeVRDiyModularV2.pdf)
### Example Program

## FAQ