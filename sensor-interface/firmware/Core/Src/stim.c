// stim.c
// STIM300 IMU: USART2 with circular DMA and interrupt, configuration of STIM without flashing, Datagram parsing and decoding of Normal Mode Datagrams (ID 0xAF)
// STIM samples at 2000 HZ requires upping the baudrate, which cannot be done here, it would need reflashing of the STIM.
// Note that the STIM USB connector is USB 2.0 which does not support the highest baudrate, so i recommmend keeping samples to 1000 HZ maximum.
#include "stim.h"
#include "FreeRTOS.h"
#include "task.h"             // taskENTER_CRITICAL / taskEXIT_CRITICAL
#include <stdio.h>
#include "cmsis_os2.h"        // osDelay

/* -----------------------------------------------------------
 * Private Defines
 * -----------------------------------------------------------*/
#define STIM_RX_BUF_SIZE    1024
#define STIM_FRAME_LEN      63
#define STIM_FRAME_ID       0xAF

#define STIM_S24_SIGN_BIT   (1u << 23)     // sign bit of a 24-bit two's complement value
#define STIM_S24_EXTEND     0xFF000000u    // bits 31-24: set to 1 for negative values

#define STIM_CRC_POLY       0x04C11DB7u    // datasheet 6.3.7
#define STIM_CRC_SEED       0xFFFFFFFFu    // datasheet 6.3.7
#define STIM_CRC_DATA_LEN   59             // bytes 0..58 are covered by the CRC

typedef enum {
  HUNT,
  COLLECT
} stim_frame_state_t;

/* -----------------------------------------------------------
 * Private Variables
 * -----------------------------------------------------------*/
static UART_HandleTypeDef *stim_huart = NULL;   // set by stim_start()

__attribute__((aligned(32)))
static uint8_t  stim_rx[STIM_RX_BUF_SIZE];      // DMA writes STIM300 bytes here (circular)
static uint16_t rx_last = 0;                    // where we stopped reading last time

static uint8_t            stim_frame[STIM_FRAME_LEN];
static int                stim_frame_wr_index = 0;   // write index into stim_frame, 0..62
static stim_frame_state_t stim_frame_state = HUNT;
static uint8_t            stim_synced = 0;

// Written only from the UART interrupt. Tasks read them through
// stim_get_latest() / stim_get_stats(), which copy inside a critical section.
// The idea with using the critical section is that the stim update the struct at 1000 Hz, each time using an interrupt,
// if a interrupt fired in the middle of a read the sensor fusion algorithm could have gotten half of one frame and the other half from another frame
static stim_sample_t stim_latest;
static stim_stats_t  stim_stats;

// Frame 20 pre-captured data, used for a CRC self-test at startup (expected CRC = 9E9ED1D9)
static const uint8_t stim_test_frame[STIM_FRAME_LEN] = {
  0xAF,0xFF,0xE9,0xF8,0xFF,0xB0,0x2E,0x00,0x3E,0x40,0x00,0xFF,0xE2,0x3B,0xFF,0xF3,
  0x00,0x0F,0xEE,0x91,0x00,0xFF,0x63,0x92,0xFF,0xB1,0x47,0x41,0xF2,0x88,0x00,0x25,
  0xE7,0x25,0xE4,0x25,0x67,0x00,0x25,0xF7,0x25,0xEC,0x26,0x04,0x00,0x26,0x80,0x26,
  0xAC,0x26,0x80,0x00,0xFF,0xFD,0x43,0x00,0x41,0x01,0xFB,0x9E,0x9E,0xD1,0xD9 };

/* -----------------------------------------------------------
 * Private Function Prototypes
 * -----------------------------------------------------------*/
static void     stim_feed(const uint8_t *data, uint16_t len);
static void     new_byte_arrived(uint8_t data);
static void     stim_decode(const uint8_t *frame, stim_sample_t *out);
static int32_t  stim_s24(const uint8_t *p);
static int16_t  stim_s16(const uint8_t *p);
static uint32_t stim_crc32_byte(uint32_t crc, uint8_t byte);
static int      stim_frame_crc_ok(const uint8_t *frame);

/* -----------------------------------------------------------
 * Public Functions
 * -----------------------------------------------------------*/

int stim_self_test(void)
{
  int crc_ok = stim_frame_crc_ok(stim_test_frame);
  stim_sample_t t;
  stim_decode(stim_test_frame, &t);

  printf("CRC self-test: %s\r\n", crc_ok ? "PASS" : "FAIL");
  printf("s24 test: %ld %ld\r\n",
         (long)stim_s24(&stim_test_frame[1]), (long)stim_s24(&stim_test_frame[7]));
  printf("decode test: accZ %ld inclZ %ld gyroT_X %d lat %u cnt %u valid %u\r\n",
         (long)t.accel.z, (long)t.incl.z, (int)t.gyro_temp.x,
         (unsigned)t.latency_us, (unsigned)t.counter, (unsigned)t.valid);
  return crc_ok;
}

void stim_start(UART_HandleTypeDef *huart)
{
  stim_huart = huart;                                     // Can remember the handle so we can restart it in case of UART errors
  __HAL_UART_SEND_REQ(huart, UART_RXDATA_FLUSH_REQUEST);  // throw away the stale byte sitting in RDR
  __HAL_UART_CLEAR_OREFLAG(huart);                        // clear the overrun flag left over from before
  if (HAL_UARTEx_ReceiveToIdle_DMA(huart, stim_rx, STIM_RX_BUF_SIZE) != HAL_OK)
  {
    printf("STIM: DMA start failed\r\n");
  }
}

// Applies our settings via Service Mode, then returns to Normal Mode (not saved).
// Blocks for some seconds.
void stim_configure(void)
{
  HAL_UART_Transmit(stim_huart, (uint8_t *)"\rSERVICEMODE\r", 13, 100);
  osDelay(500);                                                // let it print its info block
  HAL_UART_Transmit(stim_huart, (uint8_t *)"m 3\r", 4, 100);  // sample rate -> 1000 samples/s
  osDelay(100);
  HAL_UART_Transmit(stim_huart, (uint8_t *)"x N\r", 4, 100);  // back to Normal Mode, not saved
}

// Called (from interrupt) on DMA half-full, DMA full, and UART idle line
void stim_on_rx_event(uint16_t pos)
{
  // D-cache is off right now; this keeps the code correct if it is enabled later
  SCB_InvalidateDCache_by_Addr((uint32_t *)stim_rx, STIM_RX_BUF_SIZE);  // stim_rx is 32-byte aligned

  // pos     = how far the DMA has written into the buffer (0..1024)
  // rx_last = where we stopped reading last time (not necessarily a datagram boundary)
  if (pos != rx_last)
  {
    if (pos > rx_last)
    {
      // one continuous block
      stim_feed(&stim_rx[rx_last], pos - rx_last);
    }
    else
    {
      // DMA wrapped around: rest of the buffer, then the start
      if (rx_last < STIM_RX_BUF_SIZE)
      {
        stim_feed(&stim_rx[rx_last], STIM_RX_BUF_SIZE - rx_last);
      }
      stim_feed(stim_rx, pos);
    }
    rx_last = pos;
  }
}

// Any UART error stops reception in HAL: count it and restart
void stim_on_uart_error(void)
{
  stim_stats.uart_errors++;
  rx_last = 0;
  HAL_UARTEx_ReceiveToIdle_DMA(stim_huart, stim_rx, STIM_RX_BUF_SIZE);
}

void stim_get_latest(stim_sample_t *out)
{
  taskENTER_CRITICAL();      // block the UART interrupt so it can't update mid-copy
  *out = stim_latest;
  taskEXIT_CRITICAL();
}

void stim_get_stats(stim_stats_t *out)
{
  taskENTER_CRITICAL();
  *out = stim_stats;
  taskEXIT_CRITICAL();
}

uint32_t stim_get_frame_count(void)
{
  return *(volatile uint32_t *)&stim_stats.frames; // Probably not necessary to cast it volatile, AI claim compiler optimizations could cause issues otherwise for the while in main.c
}

/* -----------------------------------------------------------
 * Private Functions
 * -----------------------------------------------------------*/

static void stim_feed(const uint8_t *data, uint16_t len)
{
  stim_stats.bytes += len;
  for (int i = 0; i < len; ++i)
  {
    new_byte_arrived(data[i]);
  }
}

static void new_byte_arrived(uint8_t data)
{
  switch (stim_frame_state)
  {
  case HUNT:
    if (data == STIM_FRAME_ID)
    {
      stim_frame_wr_index = 0;
      stim_frame[stim_frame_wr_index] = data;
      stim_frame_state = COLLECT;
    }
    break;

  case COLLECT:
    stim_frame_wr_index += 1;
    stim_frame[stim_frame_wr_index] = data;
    if (stim_frame_wr_index == (STIM_FRAME_LEN - 1))
    {
      if (stim_frame_crc_ok(stim_frame))
      {
        stim_decode(stim_frame, &stim_latest);
        stim_synced = 1;
        stim_stats.frames++;                 // verified frame
      }
      else if (stim_synced == 1)             // reception can start mid-frame, so the first lock may be false
      {
        stim_stats.crc_errors++;             // false lock or corrupted frame: drop it
      }
      stim_frame_state = HUNT;               // start over
    }
    break;
  }
}

// Decode a CRC-verified 0xAF frame (63 bytes) into raw-count fields (Table 6-19)
static void stim_decode(const uint8_t *frame, stim_sample_t *out)
{
  out->gyro.x            = stim_s24(&frame[1]);
  out->gyro.y            = stim_s24(&frame[4]);
  out->gyro.z            = stim_s24(&frame[7]);
  out->gyro.status       = frame[10];

  out->accel.x           = stim_s24(&frame[11]);
  out->accel.y           = stim_s24(&frame[14]);
  out->accel.z           = stim_s24(&frame[17]);
  out->accel.status      = frame[20];

  out->incl.x            = stim_s24(&frame[21]);
  out->incl.y            = stim_s24(&frame[24]);
  out->incl.z            = stim_s24(&frame[27]);
  out->incl.status       = frame[30];

  out->gyro_temp.x       = stim_s16(&frame[31]);
  out->gyro_temp.y       = stim_s16(&frame[33]);
  out->gyro_temp.z       = stim_s16(&frame[35]);
  out->gyro_temp.status  = frame[37];

  out->accel_temp.x      = stim_s16(&frame[38]);
  out->accel_temp.y      = stim_s16(&frame[40]);
  out->accel_temp.z      = stim_s16(&frame[42]);
  out->accel_temp.status = frame[44];

  out->incl_temp.x       = stim_s16(&frame[45]);
  out->incl_temp.y       = stim_s16(&frame[47]);
  out->incl_temp.z       = stim_s16(&frame[49]);
  out->incl_temp.status  = frame[51];

  out->aux               = stim_s24(&frame[52]);
  out->aux_status        = frame[55];
  out->counter           = frame[56];
  out->latency_us        = (uint16_t)((frame[57] << 8) | frame[58]);

  out->valid = (out->gyro.status | out->accel.status | out->incl.status |
                out->gyro_temp.status | out->accel_temp.status | out->incl_temp.status |
                out->aux_status) == 0;
}

static int32_t stim_s24(const uint8_t *p)
{
  uint32_t v = ((uint32_t)p[0] << 16) | ((uint32_t)p[1] << 8) | (uint32_t)p[2];  // 0 .. 0xFFFFFF
  if (v & STIM_S24_SIGN_BIT)    // bit 23 set: the 24-bit value is negative
  {
    v |= STIM_S24_EXTEND;       // sign extension: set bits 31-24
  }
  return (int32_t)v;
}

static int16_t stim_s16(const uint8_t *p)
{
  uint16_t v = ((uint16_t)p[0] << 8) | (uint16_t)p[1];
  return (int16_t)v;
}

// Feed one byte into the CRC-32: MSB first, no reflection (datasheet 6.3.7)
static uint32_t stim_crc32_byte(uint32_t crc, uint8_t byte)
{
  crc ^= (uint32_t)byte << 24;            // put the byte into the top 8 bits of the register
  for (int bit = 0; bit < 8; bit++)
  {
    if (crc & 0x80000000u)                // top bit is 1: shift it out and XOR in the polynomial
      crc = (crc << 1) ^ STIM_CRC_POLY;
    else                                  // top bit is 0: just shift
      crc = crc << 1;
  }
  return crc;
}

// Returns 1 if bytes 59..62 match the CRC of bytes 0..58 plus one 0x00 dummy byte
static int stim_frame_crc_ok(const uint8_t *frame)
{
  uint32_t crc = STIM_CRC_SEED;
  for (int i = 0; i < STIM_CRC_DATA_LEN; i++)
  {
    crc = stim_crc32_byte(crc, frame[i]);
  }
  crc = stim_crc32_byte(crc, 0x00);       // dummy byte for the 0xAF datagram (Table 6-21)

  uint32_t rx_crc = ((uint32_t)frame[59] << 24) |   // CRC is sent most significant byte first
                    ((uint32_t)frame[60] << 16) |
                    ((uint32_t)frame[61] << 8)  |
                     (uint32_t)frame[62];
  return crc == rx_crc;
}



