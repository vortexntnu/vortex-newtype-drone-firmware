/*
 * can.c
 *
 *  Created on: Sep 25, 2026
 *      Author: elias-gravdal
 */

#include <stdint.h>
#include <stddef.h>
#include <string.h>

#include "main.h"
#include "interrupts.h"
#include "can.h"

/* Private typedef -----------------------------------------------------------*/
/* Private define ------------------------------------------------------------*/
/* @user: set the maximum number of attempts to complete a data transfer between the two boards */
//#define MAX_COM_ATTEMPTS 10U
/* @user: set the timeout period in milliseconds for transmitting and receiving data */
//#define FDCAN_COM_TIMEOUT 1000U
/* @user: define the controller requested Frame ID in Standard Mode (11bits) */
#define FDCAN_CONTROLLER_FRAME_ID 0x101
/* Data size of the TX and RX FDCAN frames in bytes. */
#define MSG_DATA_LENGTH   HAL_FDCAN_DATA_LEN_CAN_FDCAN_8_BYTE

/* Data size of the TX FDCAN buffer in bytes */
#define TX_BUFFER_SIZE       8U
/** Data size of the RX FDCAN buffer in bytes to be set to maximum frame size.
  * @user: For CAN Classical frame maximum bytes size is 8, for FDCAN frame maximum bytes size is 64.
  */
#define RX_BUFFER_SIZE       64U


/* Private macro -------------------------------------------------------------*/
/* Private variables ---------------------------------------------------------*/

/** BufferA, BufferB: fixed-size buffers to transfer alternately.
  * @user: it is possible to modify the messages content and length.
  */

/* Buffer used for reception */
uint8_t RxBuffer[RX_BUFFER_SIZE] = {0U};

/* Private functions prototype -----------------------------------------------*/
static int can_handle_transfer_error(uint32_t hal_status, uint32_t fdcan_error_code);

/* Functions allowing the user to configure dynamically the FDCAN callbacks instead of weak functions */
static void can_tx_cplt_callback(hal_fdcan_handle_t *hfdcan, uint32_t buffer_indexes);
static void can_rx_done_callback(hal_fdcan_handle_t *hfdcan, uint32_t buffer_indexes);
static void can_error_callback(hal_fdcan_handle_t *hfdcan);

hal_fdcan_handle_t canhan;
hal_fdcan_handle_t* pcanhan;

void FDCAN1_IT0_IRQHandler(void)
{
	  HAL_FDCAN_Line0_IRQHandler(pcanhan);
}
/** ########## Step 1 ##########
  * The init of the FDCAN instance is triggered by the applicative code.
  */
int can_init(void)
{
	pcanhan = &canhan;
	HAL_RCC_FDCAN_EnableClock();
	if(HAL_FDCAN_Init(pcanhan, HAL_FDCAN1) != HAL_OK) err(2);
	if (HAL_RCC_FDCAN_SetKernelClkSource(HAL_RCC_FDCAN_CLK_SRC_PCLK1) != HAL_OK) err(3);

	// 1/((1/144000000Hz)/timeseg*(215+72+(1))timesegs/bit) = 500kbit/s
	hal_fdcan_nominal_bit_timing_t cannom;
	cannom.nominal_prescaler = 1;
	cannom.nominal_jump_width = 1;
	cannom.nominal_time_seg1 = 251;
	cannom.nominal_time_seg2 = 36;

	// unused, no bitrate switching
	//hal_fdcan_data_bit_timing_t cantim;
	//cantim.data_prescaler = 1;
	//cantim.data_jump_width = 8;
	//cantim.data_time_seg1 = 15;
	//cantim.data_time_seg2 = 15;

	hal_fdcan_config_t cancon;
	cancon.frame_format = HAL_FDCAN_FRAME_FORMAT_CLASSIC_CAN;
	cancon.mode = HAL_FDCAN_MODE_NORMAL;
	cancon.auto_retransmission = HAL_FDCAN_AUTO_RETRANSMISSION_ENABLE;
	cancon.transmit_pause = HAL_FDCAN_TRANSMIT_PAUSE_DISABLE;
	cancon.protocol_exception = HAL_FDCAN_PROTOCOL_EXCEPTION_ENABLE;

	cancon.nominal_bit_timing = cannom;
	//cancon.data_bit_timing = cantim;
	cancon.std_filters_nbr = 1;
	cancon.ext_filters_nbr = 0;
	cancon.tx_fifo_queue_mode = HAL_FDCAN_TX_MODE_FIFO;

	if(HAL_FDCAN_SetConfig(pcanhan, &cancon) != HAL_OK) err(4);
	if(HAL_FDCAN_SetClockDivider(pcanhan, HAL_FDCAN_CLOCK_DIV_1) != HAL_OK)	err(5);

	hal_fdcan_filter_t filt;
	filt.id_type = HAL_FDCAN_ID_STANDARD;
	filt.filter_index = 0;
	filt.filter_type = HAL_FDCAN_FILTER_TYPE_CLASSIC;
	filt.filter_config = HAL_FDCAN_FILTER_TO_RX_FIFO_0;
	filt.filter_id1 = 0x040;
	filt.filter_id2 = 0x7fc;
	if(HAL_FDCAN_SetFilter(pcanhan, &filt) != HAL_OK) err(6);

	hal_fdcan_global_filter_config_t globfilt;
	globfilt.acceptance_non_matching_std = HAL_FDCAN_NO_MATCH_REJECT;
	globfilt.acceptance_non_matching_ext = HAL_FDCAN_NO_MATCH_TO_RX_FIFO_0;
	globfilt.acceptance_remote_std = HAL_FDCAN_REMOTE_REJECT;
	globfilt.acceptance_remote_ext = HAL_FDCAN_REMOTE_REJECT;
	if(HAL_FDCAN_SetGlobalFilter(pcanhan, &globfilt) != HAL_OK) err(7);

	HAL_RCC_GPIOB_EnableClock();

	hal_gpio_config_t gpio_conf;
	gpio_conf.mode = HAL_GPIO_MODE_ALTERNATE;
	gpio_conf.output_type = HAL_GPIO_OUTPUT_PUSHPULL;
	gpio_conf.pull = HAL_GPIO_PULL_NO;
	gpio_conf.speed = HAL_GPIO_SPEED_FREQ_LOW;
	gpio_conf.alternate = HAL_GPIO_AF_9;
	HAL_GPIO_Init(HAL_GPIOB, HAL_GPIO_PIN_9 | HAL_GPIO_PIN_8, &gpio_conf);

	if(HAL_FDCAN_EnableInterrupts(pcanhan, HAL_FDCAN_IT_RX_FIFO_0_NEW_MSG | HAL_FDCAN_IT_TX_COMPLETE) != HAL_OK) err(8);
	if(HAL_FDCAN_EnableTxBufferCompleteInterrupts(pcanhan, HAL_FDCAN_IT_TX_CPLT_BUFFER_ALL) != HAL_OK) err(9);
	if(HAL_FDCAN_SetInterruptGroupsToLine(pcanhan, HAL_FDCAN_IT_GROUP_RX_FIFO_0 | HAL_FDCAN_IT_GROUP_STATUS_MSG, HAL_FDCAN_IT_LINE_0) != HAL_OK) err(10);
	if(HAL_FDCAN_EnableInterruptLines(pcanhan, HAL_FDCAN_IT_LINE_0) != HAL_OK) err(11);

	HAL_CORTEX_NVIC_SetPriority(FDCAN1_IT0_IRQn, HAL_CORTEX_NVIC_PREEMP_PRIORITY_0, HAL_CORTEX_NVIC_SUB_PRIORITY_0);
	HAL_CORTEX_NVIC_EnableIRQ(FDCAN1_IT0_IRQn);

  /* Register the FDCAN callbacks */
  if (HAL_FDCAN_RegisterTxBufferCompleteCallback(pcanhan, can_tx_cplt_callback) != HAL_OK) err(12);
  if (HAL_FDCAN_RegisterRxFifo0Callback(pcanhan, can_rx_done_callback) != HAL_OK) err(13);
  if (HAL_FDCAN_RegisterErrorCallback(pcanhan, can_error_callback) != HAL_OK) err(14);

//  PRINTF("[INFO] Step 1: Device initialization COMPLETED.\n");
//  return_status = EXEC_STATUS_INIT_OK;

  /* Start FDCAN module */
  HAL_FDCAN_Start(pcanhan);

//_app_init_exit:
  return 0;
} /* end app_init */

int can_getdata(uint8_t* data, char* size, int* id)
{
	hal_fdcan_rx_header_t rx_elt_header;

	hal_status_t hal_status;
	hal_status = HAL_FDCAN_GetReceivedMessage(pcanhan, HAL_FDCAN_RX_FIFO_0, &rx_elt_header, data);
	*size = rx_elt_header.b.data_length;
	*id = rx_elt_header.b.identifier;
	if(*size > 8)
	{
		*size = (rx_elt_header.b.data_length - 6)*4;
	}
	if(*size > 0xc)
	{
		*size = (rx_elt_header.b.data_length - 0xb)*0x10;
	}
	if(hal_status != HAL_OK)
	{
		err(1);
		return 1;
	}
	return 0;
}

int can_senddata(const uint8_t* data, char size, int id)
{
	hal_status_t hal_status;
	hal_fdcan_tx_header_t tx_element_header =
	{
		.b =
		{
			.identifier = id,
			.frame_type = HAL_FDCAN_FRAME_DATA,
			.identifier_type = HAL_FDCAN_ID_STANDARD,
			.error_state_indicator = HAL_FDCAN_ERROR_STATE_IND_ACTIVE,
			.message_marker = 52U,
			/* @user: change to HAL_FDCAN_FRAME_FORMAT_CAN to send in classical CAN format.*/
			.frame_format = HAL_FDCAN_HEADER_FRAME_FORMAT_CAN,
			.bit_rate_switch = HAL_FDCAN_BIT_RATE_SWITCH_OFF,
			.event_fifo_control = HAL_FDCAN_TX_EVENTS_FIFO_STORE,
			.data_length = MSG_DATA_LENGTH,
		},
	};

    hal_status = HAL_FDCAN_ReqTransmitMsgFromFIFOQ(pcanhan, &tx_element_header, data);
    if (hal_status != HAL_OK)
    {
    	/* An error occurs during the FDCAN write transfer. Report it, then restart the communication */
    	uint32_t fdcan_error_code = HAL_FDCAN_GetLastErrorCodes(pcanhan);
    	int return_status = can_handle_transfer_error(hal_status, fdcan_error_code);
    	return_status = return_status; // to supress warning
    	parserr(hal_status);
    	return 1;
    }
    return 0;
}

static int can_handle_transfer_error(uint32_t hal_status, uint32_t fdcan_error_code)
{
//  PRINTF("[ERROR] Controller - Communication ERROR: hal_status = %" PRIu32 ", \
//    HAL_FDCAN_GetLastErrorCodes = %" PRIu32 ". TRYING AGAIN.\n", hal_status, fdcan_error_code);

  return 1;
} /* end HandleTransferError */


/** transmission Complete callback
  * @user This implementation of the FDCAN Tx Transmission  complete callback can be customized.
  * This function is executed if the Tx Transmission  complete interrupt is generated.
  */
static void can_tx_cplt_callback(hal_fdcan_handle_t *hfdcan, uint32_t buffer_indexes)
{
	push_interrupt(1, FI_CAN_SENT, hfdcan);
}

/** Rx Fifo0 callback
  * @user This implementation of the FDCAN Rx Fifo0 callback can be customized.
  * This function is executed if new message interrupt is generated.
  */
static void can_rx_done_callback(hal_fdcan_handle_t *hfdcan, uint32_t buffer_indexes)
{
	push_interrupt(1, FI_CAN_RECVD, hfdcan);
}
/** transfer Error callback
  * @user This implementation of the FDCAN transfer Error callback can be customized.
  * This function is executed if transfer Error interrupt is generated.
  */
static void can_error_callback(hal_fdcan_handle_t *hfdcan)
{
	push_interrupt(1, FI_CAN_ERR, hfdcan);
}

/** De-initializes the FDCAN instance before leaving the scenario.
  * In this example, app_deinit is never called and it is provided as a reference only.
  */
int can_deinit(void)
{
  /* Stop FDCAN module */
  HAL_FDCAN_Stop(pcanhan);

  //mx_example_fdcan_deinit();

  return 0;
} /* end app_deinit */
