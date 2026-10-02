/**
  ******************************************************************************
  * @file           : mx_fdcan1.c
  * @brief          : FDCAN1 Peripheral initialization
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2026 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the mx_stm32c5xx_hal_drivers_license.md file
  * in the same directory as the generated code.
  * If no mx_stm32c5xx_hal_drivers_license.md file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */

/* Includes ------------------------------------------------------------------*/
#include "mx_fdcan1.h"

/* Private typedef -----------------------------------------------------------*/
/* Private define ------------------------------------------------------------*/
/* Private macro -------------------------------------------------------------*/
/* Private variables ---------------------------------------------------------*/
/* Private functions prototype------------------------------------------------*/
/* Exported variables by reference--------------------------------------------*/
static hal_fdcan_handle_t hFDCAN1;
/******************************************************************************/
/* Exported functions for FDCAN1 in HAL layer                                 */
/******************************************************************************/
hal_fdcan_handle_t *mx_fdcan1_init(void)
{
  hal_fdcan_config_t fdcan_config;

  HAL_RCC_FDCAN_EnableClock();

  if (HAL_FDCAN_Init(&hFDCAN1, HAL_FDCAN1) != HAL_OK)
  {
    return NULL;
  }

  if (HAL_RCC_FDCAN_SetKernelClkSource(HAL_RCC_FDCAN_CLK_SRC_PCLK1) != HAL_OK)
  {
    return NULL;
  }

  /* FDCAN configuration */

  /* FDCAN clock Divider                      = 1 */
  /* FDCAN clock frequency after prescaler    = 144.000 MHz */

  /* Nominal bitrate                          = 500.000 kbps */
  /* Nominal time quanta                      = 6.94 ns */
  /* Nominal sample point                     = 87.50 % */

  hal_fdcan_nominal_bit_timing_t fdcan_nominal_bit_timing;
  fdcan_nominal_bit_timing.nominal_prescaler  = 1;
  fdcan_nominal_bit_timing.nominal_time_seg1  = 251;
  fdcan_nominal_bit_timing.nominal_time_seg2  = 36;
  fdcan_nominal_bit_timing.nominal_jump_width = 1;

  /* Data bit timing parameters are not used in Classic CAN or non-BRS modes */
  /* hal_fdcan_data_bit_timing_t fdcan_data_bit_timing;                      */
  /* fdcan_data_bit_timing.data_prescaler     = 1U;                          */
  /* fdcan_data_bit_timing.data_time_seg1     = 1U;                          */
  /* fdcan_data_bit_timing.data_time_seg2     = 1U;                          */
  /* fdcan_data_bit_timing.data_jump_width    = 1U;                          */

  fdcan_config.nominal_bit_timing   = fdcan_nominal_bit_timing;

  fdcan_config.frame_format         = HAL_FDCAN_FRAME_FORMAT_CLASSIC_CAN;
  fdcan_config.mode                 = HAL_FDCAN_MODE_NORMAL;
  fdcan_config.auto_retransmission  = HAL_FDCAN_AUTO_RETRANSMISSION_ENABLE;
  fdcan_config.transmit_pause       = HAL_FDCAN_TRANSMIT_PAUSE_DISABLE;
  fdcan_config.protocol_exception   = HAL_FDCAN_PROTOCOL_EXCEPTION_ENABLE;
  fdcan_config.std_filters_nbr      = 0U;
  fdcan_config.ext_filters_nbr      = 0U;
  fdcan_config.tx_fifo_queue_mode   = HAL_FDCAN_TX_MODE_FIFO;

  if (HAL_FDCAN_SetConfig(&hFDCAN1, &fdcan_config) != HAL_OK)
  {
    return NULL;
  }

  if (HAL_FDCAN_SetClockDivider(&hFDCAN1, HAL_FDCAN_CLOCK_DIV_1) != HAL_OK)
  {
    return NULL;
  }

  /* Standard filters: No filters allocated */

  /* Extended filters: No filters allocated */

  /* Configure the global filter acceptance/rejection rules */
  hal_fdcan_global_filter_config_t global_filter_cfg;
  global_filter_cfg.acceptance_non_matching_std = HAL_FDCAN_NO_MATCH_TO_RX_FIFO_0;
  global_filter_cfg.acceptance_non_matching_ext = HAL_FDCAN_NO_MATCH_TO_RX_FIFO_0;
  global_filter_cfg.acceptance_remote_std       = HAL_FDCAN_REMOTE_REJECT;
  global_filter_cfg.acceptance_remote_ext       = HAL_FDCAN_REMOTE_REJECT;
  if (HAL_FDCAN_SetGlobalFilter(&hFDCAN1, &global_filter_cfg) != HAL_OK)
  {
    return NULL;
  }

  /* ### FDCAN1 GPIO Configuration ########################### */
  /* GPIO Clocks activation */
  HAL_RCC_GPIOB_EnableClock();

  hal_gpio_config_t  gpio_config;

  /**
    [GPIO Pin] ------> [Signal Name]

       PB9     ------>   FDCAN1_TX
       PB8     ------>   FDCAN1_RX
    **/
  gpio_config.mode        = HAL_GPIO_MODE_ALTERNATE;
  gpio_config.output_type = HAL_GPIO_OUTPUT_PUSHPULL;
  gpio_config.pull        = HAL_GPIO_PULL_NO;
  gpio_config.speed       = HAL_GPIO_SPEED_FREQ_LOW;
  gpio_config.alternate   = HAL_GPIO_AF_9;
  HAL_GPIO_Init(HAL_GPIOB, HAL_GPIO_PIN_9 | HAL_GPIO_PIN_8, &gpio_config);

  return &hFDCAN1;
}

void mx_fdcan1_deinit(void)
{
  /* Deinitialize the FDCAN peripheral */
  (void)HAL_FDCAN_DeInit(&hFDCAN1);

  /* De-initialize all GPIOB pins associated with FDCAN1 */
  HAL_GPIO_DeInit(HAL_GPIOB, HAL_GPIO_PIN_8 | HAL_GPIO_PIN_9);
}

hal_fdcan_handle_t *mx_fdcan1_gethandle(void)
{
  return &hFDCAN1;
}
