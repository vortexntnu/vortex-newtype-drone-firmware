/**
  ******************************************************************************
  * @file           : mx_freertos_app.c
  * @brief          : FreeRTOS initialization
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2026 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the mx_freertos_license.md file
  * in the same directory as the generated code.
  * If no mx_freertos_license.md file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */
/* Includes ------------------------------------------------------------------*/
#include "mx_freertos_app.h"

/* Private define ------------------------------------------------------------*/
#define Blinky_stack_size  128U
#define USB_Sender_stack_size  128U
/* Private typedef -----------------------------------------------------------*/
/* Private macro -------------------------------------------------------------*/
/* Private variables ---------------------------------------------------------*/
/*-------------------- Tasks definition --------------------------------------*/
/* Definitions for Blinky */
static TaskHandle_t Blinky_Handle;
/* Definitions for USB_Sender */
static TaskHandle_t USB_Sender_Handle;

/* Private functions prototype -----------------------------------------------*/
/* Tasks entry function ------------------------------------------------------*/
static void function1(void *pvParameters);
static void function2(void *pvParameters);

/**
  * @brief Initializes FreeRTOS kernel objects.
  * @param None
  * @retval int32_t Returns 0 on success, -1 on failure.
  */
int32_t app_synctasks_init (void)
{
  BaseType_t ret;

  /* Blinky creation-------------------------------------*/
  ret = xTaskCreate(function1, "Blinky", Blinky_stack_size,
                    (void*) NULL, 0, &Blinky_Handle);

  if (ret != pdPASS)
  {
      return -1;
  }

  /* USB_Sender creation-------------------------------------*/
  ret = xTaskCreate(function2, "USB_Sender", USB_Sender_stack_size,
                    (void*) NULL, 0, &USB_Sender_Handle);

  if (ret != pdPASS)
  {
      return -1;
  }

  return 0;
}

/* Tasks entry function ------------------------------------------------------*/
/**
  * @brief Function implementing the Blinky thread.
  * @param pvParameters: A pointer to the parameters passed to the task.
  * @retval None
  */
static void function1(void *pvParameters)
{
  ( void ) pvParameters;

  for(;;)
  {
    /* Infinite loop executing Blinky functionality. */
  }
}

/**
  * @brief Function implementing the USB_Sender thread.
  * @param pvParameters: A pointer to the parameters passed to the task.
  * @retval None
  */
static void function2(void *pvParameters)
{
  ( void ) pvParameters;

  for(;;)
  {
    printf("Hello USB\r\n");
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
}
