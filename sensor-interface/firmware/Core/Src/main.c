/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : main.c
  * @brief          : Main program body
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2026 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */
/* USER CODE END Header */
/* Includes ------------------------------------------------------------------*/
#include "main.h"
#include "FreeRTOS.h"
#include "cmsis_os2.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */
#include <stdio.h>
#include <string.h>          // for memcpy
/* USER CODE END Includes */

/* Private typedef -----------------------------------------------------------*/
/* USER CODE BEGIN PTD */
// One sensor group as sent by the STIM: X, Y, Z followed by one status byte (Table 6-19)
typedef struct {
  int32_t xyz[3];      // 24-bit two's complement raw counts, sign-extended to 32 bits
  uint8_t status;      // status byte, Table 6-22 (0 = OK)
} stim_axis3_t;

// Temperatures for one sensor group: X, Y, Z (16-bit) followed by one status byte
typedef struct {
  int16_t xyz[3];      // 16-bit two's complement raw counts
  uint8_t status;
} stim_temp3_t;

// One decoded Normal Mode datagram (ID 0xAF), raw counts, no unit conversion
typedef struct {
  stim_axis3_t gyro;         // bytes 1-10
  stim_axis3_t accel;        // bytes 11-20
  stim_axis3_t incl;         // bytes 21-30
  stim_temp3_t gyro_temp;    // bytes 31-37
  stim_temp3_t accel_temp;   // bytes 38-44
  stim_temp3_t incl_temp;    // bytes 45-51
  int32_t      aux;          // bytes 52-54 (24-bit)
  uint8_t      aux_status;   // byte 55
  uint8_t      counter;      // byte 56, internal sample counter (2000/s, wraps at 255)
  uint16_t     latency_us;   // bytes 57-58, unsigned, already in microseconds
  uint8_t      valid;        // 1 if all 7 status bytes are 0
  uint64_t     timestamp_us; // filled in later (step 5)
} stim_sample_t;
/* USER CODE END PTD */

/* Private define ------------------------------------------------------------*/
/* USER CODE BEGIN PD */
#define RX_BUF_SIZE 1024
#define STIM_FRAME_LEN 63
#define STIM_FRAME_ID 0xAF

//
#define STIM_S24_SIGN_BIT   (1u << 23)     // sign bit of a 24-bit two's complement value
#define STIM_S24_EXTEND     0xFF000000u    // bits 31-24: set to 1 for negative values -- sign extension


//crc
#define STIM_CRC_POLY      0x04C11DB7u   // datasheet 6.3.7
#define STIM_CRC_SEED      0xFFFFFFFFu   // datasheet 6.3.7
#define STIM_CRC_DATA_LEN  59            // bytes 0..58 are covered by the CRC

/* USER CODE END PD */

/* Private macro -------------------------------------------------------------*/
/* USER CODE BEGIN PM */

/* USER CODE END PM */

/* Private variables ---------------------------------------------------------*/

UART_HandleTypeDef huart2;
UART_HandleTypeDef huart3;
DMA_HandleTypeDef hdma_usart2_rx;

/* Definitions for defaultTask */
osThreadId_t defaultTaskHandle;
const osThreadAttr_t defaultTask_attributes = {
  .name = "defaultTask",
  .stack_size = 1024 * 4,
  .priority = (osPriority_t) osPriorityNormal,
};
/* USER CODE BEGIN PV */
__attribute__((aligned(32)))
static uint8_t stim_rx[RX_BUF_SIZE];          // DMA writes STIM300 bytes here (circular)
static uint8_t stim_frame[STIM_FRAME_LEN];
static stim_sample_t stim_latest;   // most recent verified, decoded sample
static uint16_t rx_last = 0;                  // where we stopped reading last time
static int  stim_frame_wr_index = 0;          // Write index for stim_frame 0 to 63
static volatile uint32_t stim_frames = 0;     // how many complete frames have been assembled?
static volatile uint32_t stim_bytes = 0;      // bytes received this second
static uint8_t stim_synced = 0;
static volatile uint32_t stim_errors = 0;     // UART errors (framing, overrun, noise)
//crc
static volatile uint32_t stim_crc_errors = 0;   // frames dropped because the CRC didn't match

// Frame 20 pre-captured data, used for a CRC self-test at startup (expected CRC = 9E9ED1D9)
static const uint8_t stim_test_frame[STIM_FRAME_LEN] = {
  0xAF,0xFF,0xE9,0xF8,0xFF,0xB0,0x2E,0x00,0x3E,0x40,0x00,0xFF,0xE2,0x3B,0xFF,0xF3,
  0x00,0x0F,0xEE,0x91,0x00,0xFF,0x63,0x92,0xFF,0xB1,0x47,0x41,0xF2,0x88,0x00,0x25,
  0xE7,0x25,0xE4,0x25,0x67,0x00,0x25,0xF7,0x25,0xEC,0x26,0x04,0x00,0x26,0x80,0x26,
  0xAC,0x26,0x80,0x00,0xFF,0xFD,0x43,0x00,0x41,0x01,0xFB,0x9E,0x9E,0xD1,0xD9 };

//state
typedef enum {
    HUNT,
    COLLECT
} stim_frame_state_t;

static stim_frame_state_t stim_frame_state = HUNT;
/* USER CODE END PV */

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
static void MPU_Config(void);
static void MX_GPIO_Init(void);
static void MX_DMA_Init(void);
static void MX_USART3_UART_Init(void);
static void MX_USART2_UART_Init(void);
void StartDefaultTask(void *argument);

/* USER CODE BEGIN PFP */
static void stim_feed(const uint8_t *data, uint16_t len);
static void stim_decode(const uint8_t *frame, stim_sample_t *out);

static int32_t stim_s24(const uint8_t *p);
static int16_t stim_s16(const uint8_t *p);

//crc
static uint32_t stim_crc32_byte(uint32_t crc, uint8_t byte);
static int stim_frame_crc_ok(const uint8_t *frame);
/* USER CODE END PFP */

/* Private user code ---------------------------------------------------------*/
/* USER CODE BEGIN 0 */
// printf ends up here: send each character out USART3 (ST-LINK virtual COM port)
int __io_putchar(int ch)
{
  HAL_UART_Transmit(&huart3, (uint8_t *)&ch, 1, HAL_MAX_DELAY);
  return ch;
}
/* USER CODE END 0 */

/**
  * @brief  The application entry point.
  * @retval int
  */
int main(void)
{

  /* USER CODE BEGIN 1 */
	//SCnSCB->ACTLR |= SCnSCB_ACTLR_DISDEFWBUF_Msk;   // DEBUG: make bus faults precise
  /* USER CODE END 1 */

  /* MPU Configuration--------------------------------------------------------*/
  MPU_Config();

  /* MCU Configuration--------------------------------------------------------*/

  /* Reset of all peripherals, Initializes the Flash interface and the Systick. */
  HAL_Init();

  /* USER CODE BEGIN Init */

  /* USER CODE END Init */

  /* Configure the system clock */
  SystemClock_Config();

  /* USER CODE BEGIN SysInit */

  /* USER CODE END SysInit */

  /* Initialize all configured peripherals */
  MX_GPIO_Init();
  MX_DMA_Init();
  MX_USART3_UART_Init();
  MX_USART2_UART_Init();
  /* USER CODE BEGIN 2 */
  setvbuf(stdout, NULL, _IONBF, 0);       // turn off printf buffering so text appears immediately
  printf("\r\nSTIM300 test start\r\n");   // board booted and printf works
  printf("CRC self-test: %s\r\n", stim_frame_crc_ok(stim_test_frame) ? "PASS" : "FAIL");
  printf("s24 test: %ld %ld\r\n", (long)stim_s24(&stim_test_frame[1]), (long)stim_s24(&stim_test_frame[7]));
  stim_sample_t t;
  stim_decode(stim_test_frame, &t);
  printf("decode test: accZ %ld inclZ %ld gyroT_X %d lat %u cnt %u valid %u\r\n",
         (long)t.accel.xyz[2], (long)t.incl.xyz[2], (int)t.gyro_temp.xyz[0],
         (unsigned)t.latency_us, (unsigned)t.counter, (unsigned)t.valid);
  // STIM reception is started in StartDefaultTask(), once the RTOS is running
  /* USER CODE END 2 */

  /* Init scheduler */
  osKernelInitialize();

  /* USER CODE BEGIN RTOS_MUTEX */
  /* add mutexes, ... */
  /* USER CODE END RTOS_MUTEX */

  /* USER CODE BEGIN RTOS_SEMAPHORES */
  /* add semaphores, ... */
  /* USER CODE END RTOS_SEMAPHORES */

  /* USER CODE BEGIN RTOS_TIMERS */
  /* start timers, add new ones, ... */
  /* USER CODE END RTOS_TIMERS */

  /* USER CODE BEGIN RTOS_QUEUES */
  /* add queues, ... */
  /* USER CODE END RTOS_QUEUES */

  /* Create the thread(s) */
  /* creation of defaultTask */
  defaultTaskHandle = osThreadNew(StartDefaultTask, NULL, &defaultTask_attributes);

  /* USER CODE BEGIN RTOS_THREADS */
  /* add threads, ... */
  /* USER CODE END RTOS_THREADS */

  /* USER CODE BEGIN RTOS_EVENTS */
  /* add events, ... */
  /* USER CODE END RTOS_EVENTS */

  /* Start scheduler */
  osKernelStart();

  /* We should never get here as control is now taken by the scheduler */

  /* Infinite loop */
  /* USER CODE BEGIN WHILE */
  while (1)
  {
    /* USER CODE END WHILE */

	    /* USER CODE BEGIN 3 */
	    // unreachable: the scheduler runs the tasks after osKernelStart()
	  }
	  /* USER CODE END 3 */
}

/**
  * @brief System Clock Configuration
  * @retval None
  */
void SystemClock_Config(void)
{
  RCC_OscInitTypeDef RCC_OscInitStruct = {0};
  RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};

  /** Supply configuration update enable
  */
  HAL_PWREx_ConfigSupply(PWR_LDO_SUPPLY);

  /** Configure the main internal regulator output voltage
  */
  __HAL_PWR_VOLTAGESCALING_CONFIG(PWR_REGULATOR_VOLTAGE_SCALE3);

  while(!__HAL_PWR_GET_FLAG(PWR_FLAG_VOSRDY)) {}

  /** Initializes the RCC Oscillators according to the specified parameters
  * in the RCC_OscInitTypeDef structure.
  */
  RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSI;
  RCC_OscInitStruct.HSIState = RCC_HSI_DIV1;
  RCC_OscInitStruct.HSICalibrationValue = RCC_HSICALIBRATION_DEFAULT;
  RCC_OscInitStruct.PLL.PLLState = RCC_PLL_NONE;
  if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
  {
    Error_Handler();
  }

  /** Initializes the CPU, AHB and APB buses clocks
  */
  RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK|RCC_CLOCKTYPE_SYSCLK
                              |RCC_CLOCKTYPE_PCLK1|RCC_CLOCKTYPE_PCLK2
                              |RCC_CLOCKTYPE_D3PCLK1|RCC_CLOCKTYPE_D1PCLK1;
  RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_HSI;
  RCC_ClkInitStruct.SYSCLKDivider = RCC_SYSCLK_DIV1;
  RCC_ClkInitStruct.AHBCLKDivider = RCC_HCLK_DIV1;
  RCC_ClkInitStruct.APB3CLKDivider = RCC_APB3_DIV1;
  RCC_ClkInitStruct.APB1CLKDivider = RCC_APB1_DIV2;
  RCC_ClkInitStruct.APB2CLKDivider = RCC_APB2_DIV2;
  RCC_ClkInitStruct.APB4CLKDivider = RCC_APB4_DIV1;

  if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_1) != HAL_OK)
  {
    Error_Handler();
  }
}

/**
  * @brief USART2 Initialization Function
  * @param None
  * @retval None
  */
static void MX_USART2_UART_Init(void)
{

  /* USER CODE BEGIN USART2_Init 0 */

  /* USER CODE END USART2_Init 0 */

  /* USER CODE BEGIN USART2_Init 1 */

  /* USER CODE END USART2_Init 1 */
  huart2.Instance = USART2;
  huart2.Init.BaudRate = 921600;
  huart2.Init.WordLength = UART_WORDLENGTH_8B;
  huart2.Init.StopBits = UART_STOPBITS_1;
  huart2.Init.Parity = UART_PARITY_NONE;
  huart2.Init.Mode = UART_MODE_TX_RX;
  huart2.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart2.Init.OverSampling = UART_OVERSAMPLING_16;
  huart2.Init.OneBitSampling = UART_ONE_BIT_SAMPLE_DISABLE;
  huart2.Init.ClockPrescaler = UART_PRESCALER_DIV1;
  huart2.AdvancedInit.AdvFeatureInit = UART_ADVFEATURE_NO_INIT;
  if (HAL_UART_Init(&huart2) != HAL_OK)
  {
    Error_Handler();
  }
  if (HAL_UARTEx_SetTxFifoThreshold(&huart2, UART_TXFIFO_THRESHOLD_1_8) != HAL_OK)
  {
    Error_Handler();
  }
  if (HAL_UARTEx_SetRxFifoThreshold(&huart2, UART_RXFIFO_THRESHOLD_1_8) != HAL_OK)
  {
    Error_Handler();
  }
  if (HAL_UARTEx_DisableFifoMode(&huart2) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN USART2_Init 2 */

  /* USER CODE END USART2_Init 2 */

}

/**
  * @brief USART3 Initialization Function
  * @param None
  * @retval None
  */
static void MX_USART3_UART_Init(void)
{

  /* USER CODE BEGIN USART3_Init 0 */

  /* USER CODE END USART3_Init 0 */

  /* USER CODE BEGIN USART3_Init 1 */

  /* USER CODE END USART3_Init 1 */
  huart3.Instance = USART3;
  huart3.Init.BaudRate = 115200;
  huart3.Init.WordLength = UART_WORDLENGTH_8B;
  huart3.Init.StopBits = UART_STOPBITS_1;
  huart3.Init.Parity = UART_PARITY_NONE;
  huart3.Init.Mode = UART_MODE_TX_RX;
  huart3.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart3.Init.OverSampling = UART_OVERSAMPLING_16;
  huart3.Init.OneBitSampling = UART_ONE_BIT_SAMPLE_DISABLE;
  huart3.Init.ClockPrescaler = UART_PRESCALER_DIV1;
  huart3.AdvancedInit.AdvFeatureInit = UART_ADVFEATURE_NO_INIT;
  if (HAL_UART_Init(&huart3) != HAL_OK)
  {
    Error_Handler();
  }
  if (HAL_UARTEx_SetTxFifoThreshold(&huart3, UART_TXFIFO_THRESHOLD_1_8) != HAL_OK)
  {
    Error_Handler();
  }
  if (HAL_UARTEx_SetRxFifoThreshold(&huart3, UART_RXFIFO_THRESHOLD_1_8) != HAL_OK)
  {
    Error_Handler();
  }
  if (HAL_UARTEx_DisableFifoMode(&huart3) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN USART3_Init 2 */

  /* USER CODE END USART3_Init 2 */

}

/**
  * Enable DMA controller clock
  */
static void MX_DMA_Init(void)
{

  /* DMA controller clock enable */
  __HAL_RCC_DMA1_CLK_ENABLE();

  /* DMA interrupt init */
  /* DMA1_Stream1_IRQn interrupt configuration */
  HAL_NVIC_SetPriority(DMA1_Stream1_IRQn, 5, 0);
  HAL_NVIC_EnableIRQ(DMA1_Stream1_IRQn);

}

/**
  * @brief GPIO Initialization Function
  * @param None
  * @retval None
  */
static void MX_GPIO_Init(void)
{
  /* USER CODE BEGIN MX_GPIO_Init_1 */

  /* USER CODE END MX_GPIO_Init_1 */

  /* GPIO Ports Clock Enable */
  __HAL_RCC_GPIOD_CLK_ENABLE();

  /* USER CODE BEGIN MX_GPIO_Init_2 */

  /* USER CODE END MX_GPIO_Init_2 */
}

/* USER CODE BEGIN 4 */

static int32_t stim_s24(const uint8_t *p)
{
  uint32_t v = ((int32_t)p[0] << 16) | ((int32_t)p[1] << 8) | (int32_t)p[2];  // 0 .. 0xFFFFFF
  if (v & STIM_S24_SIGN_BIT)    // bit 23 set: the 24-bit value is negative
  {
    v |= STIM_S24_EXTEND;            // Sign extension -- pad 1's to bit 31-24 so it's a negative number
  }
  return (int32_t)v; // cast signed v
}

static int16_t stim_s16(const uint8_t *p)
{
  uint16_t v = ((uint16_t)p[0] << 8) | (uint16_t)p[1];
  return (int16_t)v;
}

// Called by HAL (from interrupt) on DMA half-full, DMA full, and UART idle line
void HAL_UARTEx_RxEventCallback(UART_HandleTypeDef *huart, uint16_t pos)
{
  if (huart->Instance != USART2) return;   // only handle the STIM300 UART

  // D-cache is off right now; this keeps the code correct if it is enabled later
  SCB_InvalidateDCache_by_Addr((uint32_t *)stim_rx, RX_BUF_SIZE); // relies that stim_rx is aligned 32 bit

  // pos     = how far the DMA has written into the buffer (0..1024)
  // rx_last = where we stopped reading last time (not necessarily a datagram boundary)
  if (pos != rx_last)
  {
    if (pos > rx_last)
    {
      // one continuous block
      stim_feed(&stim_rx[rx_last], pos - rx_last); // aka send dma buffer from rx_last to (pos-rx_last )
    }
    else
    {
      // DMA wrapped around: rest of the buffer, then the start
      if (rx_last < RX_BUF_SIZE)
      {
        stim_feed(&stim_rx[rx_last], RX_BUF_SIZE - rx_last);
      }
      stim_feed(stim_rx, pos);
    }
    rx_last = pos;   // keep 1024 as-is so a duplicate "pos = 1024" event is ignored
  }
}

// Any UART error stops reception in HAL: count it and restart
void HAL_UART_ErrorCallback(UART_HandleTypeDef *huart)
{
  if (huart->Instance == USART2)
  {
    stim_errors++;
    rx_last = 0;
    HAL_UARTEx_ReceiveToIdle_DMA(&huart2, stim_rx, RX_BUF_SIZE);
  }
}

//crc
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

// Decode a CRC-verified 0xAF frame (63 bytes) into raw-count fields (Table 6-19)
// Decode a CRC-verified 0xAF frame (63 bytes) into raw-count fields (Table 6-19)
static void stim_decode(const uint8_t *frame, stim_sample_t *out)
{
  for (int k = 0; k < 3; k++)   // k = 0, 1, 2 -> X, Y, Z
  {
    out->gyro.xyz[k]       = stim_s24(&frame[1 + 3 * k]);
    out->accel.xyz[k]      = stim_s24(&frame[11 + 3 * k]);
    out->incl.xyz[k]       = stim_s24(&frame[21 + 3 * k]);

    out->gyro_temp.xyz[k]  = stim_s16(&frame[31 + 2 * k]);
    out->accel_temp.xyz[k] = stim_s16(&frame[38 + 2 * k]);
    out->incl_temp.xyz[k]  = stim_s16(&frame[45 + 2 * k]);
  }

  out->gyro.status       = frame[10];
  out->accel.status      = frame[20];
  out->incl.status       = frame[30];
  out->gyro_temp.status  = frame[37];
  out->accel_temp.status = frame[44];
  out->incl_temp.status  = frame[51];

  out->aux        = stim_s24(&frame[52]);
  out->aux_status = frame[55];
  out->counter    = frame[56];
  out->latency_us = (uint16_t)((frame[57]<<8) | frame[58]);

  out->valid = (out->gyro.status | out->accel.status | out->incl.status | out->gyro_temp.status | out->accel_temp.status | out->incl_temp.status | out->aux_status) == 0;
}

static void new_byte_arrived(const uint8_t data)
 {
     switch (stim_frame_state)
     {
     case HUNT:
    	 if (data == STIM_FRAME_ID) {
    		 stim_frame_wr_index = 0;
    		 stim_frame[stim_frame_wr_index] = data;
    		 stim_frame_state = COLLECT;
    	 }
         break;

     case COLLECT:
    	 stim_frame_wr_index += 1;
    	 stim_frame[stim_frame_wr_index] = data;
    	 if (stim_frame_wr_index == (STIM_FRAME_LEN-1)) {
			 if (stim_frame_crc_ok(stim_frame)) {//crc
			   stim_decode(stim_frame, &stim_latest);
			   stim_synced = 1;
			   stim_frames += 1;               // verified frame
			 } else {
				 if (stim_synced == 1) { // Reception can start mid-frame, so the first lock may be false.
					 stim_crc_errors += 1;           // false lock or corrupted frame: drop it
				 }
			   //stim_synced = 0;
			 }
         stim_frame_state = HUNT;          // start over
    	 }
    	 break;
     }
 }

static void stim_feed(const uint8_t *data, uint16_t len) // personal note: i get in data, use len to not use more than necessary blabla
{
  stim_bytes += len;   // replace with the real datagram parser later
  for(int i = 0; i < len; ++i) {
	  new_byte_arrived(data[i]);
  }


}




/* USER CODE END 4 */

/* USER CODE BEGIN Header_StartDefaultTask */
/**
  * @brief  Function implementing the defaultTask thread.
  * @param  argument: Not used
  * @retval None
  */
/* USER CODE END Header_StartDefaultTask */
void StartDefaultTask(void *argument)
{
	  /* USER CODE BEGIN 5 */
	  // Start STIM reception (moved here from main so it begins once the RTOS is running)
	  __HAL_UART_SEND_REQ(&huart2, UART_RXDATA_FLUSH_REQUEST);  // throw away the stale byte sitting in RDR
	  __HAL_UART_CLEAR_OREFLAG(&huart2);                        // clear the overrun flag left over from before
	  if (HAL_UARTEx_ReceiveToIdle_DMA(&huart2, stim_rx, RX_BUF_SIZE) != HAL_OK)
	  {
	    printf("DMA start failed\r\n");
	  }

	  for (;;)
	  {
	    osDelay(1000);   // sleep 1 s; the CPU is free for other tasks meanwhile

	    uint32_t n = stim_bytes;  stim_bytes = 0;
	    uint32_t f = stim_frames; stim_frames = 0;
	    printf("STIM: %lu bytes/s, %lu frames/s, crc errors: %lu, uart errors: %lu\r\n",
	           n, f, stim_crc_errors, stim_errors);
	    printf("  accZ %ld  inclZ %ld  gyroT_X %d  lat %u  cnt %u  valid %u\r\n",
	           (long)stim_latest.accel.xyz[2], (long)stim_latest.incl.xyz[2],
	           (int)stim_latest.gyro_temp.xyz[0], (unsigned)stim_latest.latency_us,
	           (unsigned)stim_latest.counter, (unsigned)stim_latest.valid);
	  }
	  /* USER CODE END 5 */
}

 /* MPU Configuration */

void MPU_Config(void)
{
  MPU_Region_InitTypeDef MPU_InitStruct = {0};

  /* Disables the MPU */
  HAL_MPU_Disable();

  /** Initializes and configures the Region and the memory to be protected
  */
  MPU_InitStruct.Enable = MPU_REGION_ENABLE;
  MPU_InitStruct.Number = MPU_REGION_NUMBER0;
  MPU_InitStruct.BaseAddress = 0x0;
  MPU_InitStruct.Size = MPU_REGION_SIZE_4GB;
  MPU_InitStruct.SubRegionDisable = 0x87;
  MPU_InitStruct.TypeExtField = MPU_TEX_LEVEL0;
  MPU_InitStruct.AccessPermission = MPU_REGION_NO_ACCESS;
  MPU_InitStruct.DisableExec = MPU_INSTRUCTION_ACCESS_DISABLE;
  MPU_InitStruct.IsShareable = MPU_ACCESS_SHAREABLE;
  MPU_InitStruct.IsCacheable = MPU_ACCESS_NOT_CACHEABLE;
  MPU_InitStruct.IsBufferable = MPU_ACCESS_NOT_BUFFERABLE;

  HAL_MPU_ConfigRegion(&MPU_InitStruct);
  /* Enables the MPU */
  HAL_MPU_Enable(MPU_PRIVILEGED_DEFAULT);

}

/**
  * @brief  Period elapsed callback in non blocking mode
  * @note   This function is called  when TIM6 interrupt took place, inside
  * HAL_TIM_IRQHandler(). It makes a direct call to HAL_IncTick() to increment
  * a global variable "uwTick" used as application time base.
  * @param  htim : TIM handle
  * @retval None
  */
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
  /* USER CODE BEGIN Callback 0 */

  /* USER CODE END Callback 0 */
  if (htim->Instance == TIM6)
  {
    HAL_IncTick();
  }
  /* USER CODE BEGIN Callback 1 */

  /* USER CODE END Callback 1 */
}

/**
  * @brief  This function is executed in case of error occurrence.
  * @retval None
  */
void Error_Handler(void)
{
  /* USER CODE BEGIN Error_Handler_Debug */
  /* User can add his own implementation to report the HAL error return state */
  __disable_irq();
  while (1)
  {
  }
  /* USER CODE END Error_Handler_Debug */
}
#ifdef USE_FULL_ASSERT
/**
  * @brief  Reports the name of the source file and the source line number
  *         where the assert_param error has occurred.
  * @param  file: pointer to the source file name
  * @param  line: assert_param error line source number
  * @retval None
  */
void assert_failed(uint8_t *file, uint32_t line)
{
  /* USER CODE BEGIN 6 */
  /* User can add his own implementation to report the file name and line number,
     ex: printf("Wrong parameters value: file %s on line %d\r\n", file, line) */
  /* USER CODE END 6 */
}
#endif /* USE_FULL_ASSERT */
