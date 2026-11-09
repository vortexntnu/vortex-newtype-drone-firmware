#include "CAN.h"

#include "mx_fdcan2.h"
#include "mx_gpio_default.h"
#include "stm32c5xx_hal_def.h"
#include "stm32c5xx_hal_fdcan.h"
#include "stm32c5xx_hal_gpio.h"
#include <stdbool.h>

// TODO: Handle interrupts: NEW MSG, MSG LOST, BUS OFF, RAM ACCESS FAILURE

static hal_fdcan_handle_t *s_hfdcan = NULL;

bool CAN_init(void) {
  s_hfdcan = mx_fdcan2_init();

  if (s_hfdcan == NULL)
    return false;

  /* Drive CAN_STB low */
  HAL_GPIO_WritePin(CAN_STB_PORT, CAN_STB_PIN, HAL_GPIO_PIN_RESET);

  /* CONFIGURE FILTER */
  /*
  // --- ONLY TEMPORARY FILTER CONFIG ---
  hal_fdcan_filter_t filter_config = {
    .id_type       = HAL_FDCAN_ID_STANDARD,
    .filter_index  = 0,
    .filter_type   = HAL_FDCAN_FILTER_TYPE_RANGE,
    .filter_config = HAL_FDCAN_FILTER_TO_RX_FIFO_0,
    .filter_id1    = 0x321FF,
    .filter_id2    = 0x1FFFFFFF
  };

  if (HAL_FDCAN_SetFilter(s_hfdcan, &filter_config) != HAL_OK) {
    return false;
  }
  */

  /* Enable interrupts/notifications */
  uint32_t groups = HAL_FDCAN_IT_GROUP_RX_FIFO_0 | HAL_FDCAN_IT_GROUP_MISC | HAL_FDCAN_IT_GROUP_BIT_LINE_ERROR;

  hal_status_t set_interruptGroups = HAL_FDCAN_SetInterruptGroupsToLine(s_hfdcan, groups, HAL_FDCAN_IT_LINE_0);
  if (set_interruptGroups != HAL_OK) {
    return false;
  }

  HAL_FDCAN_EnableInterrupts(s_hfdcan, 
    HAL_FDCAN_IT_RX_FIFO_0_NEW_MSG |
    HAL_FDCAN_IT_RX_FIFO_0_MSG_LOST |
    HAL_FDCAN_IT_BUS_OFF |
    HAL_FDCAN_IT_RAM_ACCESS_FAILURE
  );

  /* Start peripheral */
  return (HAL_FDCAN_Start(s_hfdcan) == HAL_OK);
}

void CAN_deinit(void) { HAL_FDCAN_DeInit(s_hfdcan); }

bool CAN_send(uint16_t id, const uint8_t *data) {
  if (s_hfdcan == NULL || data == NULL) {
    return false;
  }

  if (HAL_FDCAN_GetTxFifoStatus(s_hfdcan) == HAL_FDCAN_FIFO_STATUS_FULL) {
    return false;
  }

  hal_fdcan_tx_header_t tx_header = {
    .b.identifier         = id,
    .b.frame_type         = HAL_FDCAN_FRAME_DATA,
    .b.identifier_type    = HAL_FDCAN_ID_STANDARD,
    .b.data_length        = HAL_FDCAN_DATA_LEN_FDCAN_20_BYTE,
    .b.frame_format       = HAL_FDCAN_HEADER_FRAME_FORMAT_FD_CAN,
    .b.bit_rate_switch    = HAL_FDCAN_BIT_RATE_SWITCH_OFF,
    .b.event_fifo_control = HAL_FDCAN_TX_EVENTS_FIFO_DISCARD
  };

  hal_status_t send_status = HAL_FDCAN_ReqTransmitMsgFromFIFOQ(s_hfdcan, &tx_header, data);

  if (send_status != HAL_OK)
    return false;

  return true;
}

bool CAN_recieve(hal_fdcan_rx_header_t *rx_header, uint8_t *rx_data) {
  hal_status_t recieve_status = HAL_FDCAN_GetReceivedMessage(
      s_hfdcan, HAL_FDCAN_RX_FIFO_0, rx_header, rx_data);

  if (recieve_status != HAL_OK)
    return false;

  return true;
}
