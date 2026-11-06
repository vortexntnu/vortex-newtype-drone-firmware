// stim.h
// STIM300 IMU: USART2 with circular DMA and interrupt, configuration of STIM without flashing, Datagram parsing and decoding of Normal Mode Datagrams (ID 0xAF)
// STIM samples at 2000 HZ requires upping the baudrate, which cannot be done here, it would need reflashing of the STIM.
// Note that the USB connector for the STIM does not support the highest baudrate, so i recommmend keeping samples to 1000 HZ maximum.
#pragma once
#include <stdint.h>
#include "stm32h7xx_hal.h"    // UART_HandleTypeDef

// One sensor group as sent by the STIM: X, Y, Z followed by one status byte (Table 6-19)
// This could be gyro.x, accel.x, accel.y.. etc
typedef struct {
  int32_t x, y, z;     // 24-bit two's complement raw counts, sign-extended to 32 bits
  uint8_t status;      // status byte, Table 6-22 (0 = OK)
} stim_axis3_t;

// Temperatures for one sensor group: X, Y, Z (16-bit) followed by one status byte
typedef struct {
  int16_t x, y, z;     // 16-bit two's complement raw counts
  uint8_t status;      // Everything good if status = 0
} stim_temp3_t;

// One decoded Normal Mode datagram (ID 0xAF)
typedef struct {
  stim_axis3_t gyro;         // bytes 1-10
  stim_axis3_t accel;        // bytes 11-20
  stim_axis3_t incl;         // bytes 21-30
  stim_temp3_t gyro_temp;    // bytes 31-37
  stim_temp3_t accel_temp;   // bytes 38-44
  stim_temp3_t incl_temp;    // bytes 45-51
  int32_t      aux;          // bytes 52-54 (24-bit)
  uint8_t      aux_status;   // byte 55
  uint8_t      counter;      // byte 56, internal sample counter (wraps at 255)
  uint16_t     latency_us;   // bytes 57-58, unsigned, already in microseconds
  uint8_t      valid;        // 1 if all 7 status bytes are 0
} stim_sample_t;

// Running totals since startup. They only ever count up (and wrap at 2^32),
// so a reader computes rates by subtracting two readings.
typedef struct {
  uint32_t bytes;        // bytes received from the STIM
  uint32_t frames;       // CRC-verified frames
  uint32_t crc_errors;   // frames dropped because the CRC didn't match
  uint32_t uart_errors;  // UART errors (framing, overrun, noise)
} stim_stats_t;

// Runs the CRC and decode checks on a stored test frame and prints the results.
// Returns 1 if the CRC check passes.
int  stim_self_test(void);

// Starts DMA reception on the given UART. Called once the RTOS is running.
void stim_start(UART_HandleTypeDef *huart);


// Applies our settings via Service Mode, then returns to Normal Mode (not saved).
// Blocks for several seconds: call from a task, after stim_start().
void stim_configure(void);



// Called from HAL_UARTEx_RxEventCallback / HAL_UART_ErrorCallback in main.c.
void stim_on_rx_event(uint16_t pos);
void stim_on_uart_error(void);

// Safe to call from tasks: copy out a consistent snapshot.
void stim_get_latest(stim_sample_t *out);
void stim_get_stats(stim_stats_t *out);
uint32_t stim_get_frame_count(void);   // number of CRC-verified frames so far
