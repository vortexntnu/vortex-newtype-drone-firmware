/**
  ******************************************************************************
  * file           : main.c
  * brief          : Main program body
  *                  Calls target system initialization then loop in main.
  ******************************************************************************
  *
  * Copyright (c) 2025 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */
/* Includes ------------------------------------------------------------------*/
#include "main.h"
#include "app/encode_decode_test.h"
#include <stdio.h>
#include "app/itm/itm_log.h"
#include "stm32c5xx.h"

/* Private typedef -----------------------------------------------------------*/
/* Private define ------------------------------------------------------------*/
#define ENABLE_ITM_TRACE 1
/* Private macro -------------------------------------------------------------*/
/* Private variables ---------------------------------------------------------*/
/* Private functions prototype -----------------------------------------------*/

// Setup printf 
int _write(int file, char *ptr, int len) {
  (void)file;

#if ENABLE_ITM_TRACE

  for (int i = 0; i < len; i++)
  {
    if (!ITM_TrySendChar(ptr[i]))
      break;
  }

#else

  HAL_UART_Transmit(mx_usart2_uart_gethandle(), (uint8_t *)ptr, len, HAL_MAX_DELAY);

#endif

  return len;
}

static void Trace_Init(void)
{
    // Enable Cortex-M trace infrastructure
    CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;

    // Asynchronous SWO mode
    DBGMCU->CR &= ~(3UL << 6);

    // Enable trace pin routing and clock
    DBGMCU->CR |= (1UL << 4) | (1UL << 5);
}

/**
  * brief:  The application entry point.
  * retval: none but we specify int to comply with C99 standard
  */
int main(void)
{
  /** System Init: this code placed in targets folder initializes your system.
    * It calls the initialization (and sets the initial configuration) of the peripherals.
    * You can use STM32CubeMX to generate and call this code or not in this project.
    * It also contains the HAL initialization and the initial clock configuration.
    */
  if (mx_system_init() != SYSTEM_OK)
  {
    return (-1);
  }
  else
  {
    /*
      * You can start your application code here
     */
#if ENABLE_ITM_TRACE
    Trace_Init();
#endif
    app_init();
    while (1) {
      app();
    }
  }
} /* end main */

