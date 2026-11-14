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
#include "stm32c5xx_hal_fdcan.h"
#include "can.h"

#define TX_LEN 8

/* Private functions prototype -----------------------------------------------*/
// uncomment this when needed
//static int can_handle_transfer_error(uint32_t hal_status, uint32_t fdcan_error_code);

/* Functions allowing the user to configure dynamically the FDCAN callbacks instead of weak functions */
static void can_tx_cplt_callback(hal_fdcan_handle_t *hfdcan, uint32_t buffer_indexes);
static void can_rx_done_callback(hal_fdcan_handle_t *hfdcan, uint32_t buffer_indexes);
static void can_error_callback(hal_fdcan_handle_t *hfdcan);

hal_fdcan_handle_t canhan1;
hal_fdcan_handle_t* pcanhan1;
hal_fdcan_handle_t canhan2;
hal_fdcan_handle_t* pcanhan2;

void FDCAN1_IT0_IRQHandler(void)
{
	  HAL_FDCAN_Line0_IRQHandler(pcanhan1);
}
void FDCAN2_IT0_IRQHandler(void)
{
	  HAL_FDCAN_Line0_IRQHandler(pcanhan2);
}
/** ########## Step 1 ##########
  * The init of the FDCAN instance is triggered by the applicative code.
  */
int can_init(int caninst, int hal_gpio_port, unsigned long hal_gpio_pin1, unsigned long hal_gpio_pin2)
{
	if(caninst != 1 &&
	   caninst != 2)
	{
		err(3);
		return 1;
	}
	pcanhan1 = &canhan1;
	pcanhan2 = &canhan2;
	int halcan = caninst == 1 ? HAL_FDCAN1 : HAL_FDCAN2;
	hal_fdcan_handle_t* pcan = caninst == 1 ? pcanhan1 : pcanhan2;
	HAL_RCC_FDCAN_EnableClock();
	if(HAL_FDCAN_Init(pcan, halcan) != HAL_OK) err(2);
	if (HAL_RCC_FDCAN_SetKernelClkSource(HAL_RCC_FDCAN_CLK_SRC_PCLK1) != HAL_OK) err(3);

	// 1/((1/144000000Hz)/timeseg*(215+72+(1))timesegs/bit) = 500kbit/s
	// 1/((1/144000000Hz)/timeseg*(251+36+(1))timesegs/bit) = 500kbit/s
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

	if(HAL_FDCAN_SetConfig(pcan, &cancon) != HAL_OK) err(4);
	if(HAL_FDCAN_SetClockDivider(pcan, HAL_FDCAN_CLOCK_DIV_1) != HAL_OK)	err(5);

	hal_fdcan_filter_t filt;
	filt.id_type = HAL_FDCAN_ID_STANDARD;
	filt.filter_index = 0;
	filt.filter_type = HAL_FDCAN_FILTER_TYPE_CLASSIC;
	filt.filter_config = HAL_FDCAN_FILTER_TO_RX_FIFO_0;
	filt.filter_id1 = 0x080; // match
	filt.filter_id2 = 0x7fc; // mask
	if(HAL_FDCAN_SetFilter(pcan, &filt) != HAL_OK) err(6);

	hal_fdcan_global_filter_config_t globfilt;
	globfilt.acceptance_non_matching_std = HAL_FDCAN_NO_MATCH_REJECT;
	globfilt.acceptance_non_matching_ext = HAL_FDCAN_NO_MATCH_TO_RX_FIFO_0;
	globfilt.acceptance_remote_std = HAL_FDCAN_REMOTE_REJECT;
	globfilt.acceptance_remote_ext = HAL_FDCAN_REMOTE_REJECT;
	if(HAL_FDCAN_SetGlobalFilter(pcan, &globfilt) != HAL_OK) err(7);

	HAL_RCC_GPIOB_EnableClock();

	hal_gpio_config_t gpio_conf;
	gpio_conf.mode = HAL_GPIO_MODE_ALTERNATE;
	gpio_conf.output_type = HAL_GPIO_OUTPUT_PUSHPULL;
	gpio_conf.pull = HAL_GPIO_PULL_NO;
	gpio_conf.speed = HAL_GPIO_SPEED_FREQ_LOW;
	gpio_conf.alternate = HAL_GPIO_AF_9; // alternate function 9 seems to be can, from the datasheet;
	HAL_GPIO_Init(hal_gpio_port, hal_gpio_pin1 | hal_gpio_pin2, &gpio_conf);

	if(HAL_FDCAN_EnableInterrupts(pcan, HAL_FDCAN_IT_RX_FIFO_0_NEW_MSG | HAL_FDCAN_IT_TX_COMPLETE) != HAL_OK) err(8);
	if(HAL_FDCAN_EnableTxBufferCompleteInterrupts(pcan, HAL_FDCAN_IT_TX_CPLT_BUFFER_ALL) != HAL_OK) err(9);
	if(HAL_FDCAN_SetInterruptGroupsToLine(pcan, HAL_FDCAN_IT_GROUP_RX_FIFO_0 | HAL_FDCAN_IT_GROUP_STATUS_MSG,
					      HAL_FDCAN_IT_LINE_0) != HAL_OK) err(10);
	if(HAL_FDCAN_EnableInterruptLines(pcan, HAL_FDCAN_IT_LINE_0) != HAL_OK) err(11);

	HAL_CORTEX_NVIC_SetPriority(caninst == 1 ? FDCAN1_IT0_IRQn : FDCAN2_IT0_IRQn,
				    HAL_CORTEX_NVIC_PREEMP_PRIORITY_0, HAL_CORTEX_NVIC_SUB_PRIORITY_0);
	HAL_CORTEX_NVIC_EnableIRQ(caninst == 1 ? FDCAN1_IT0_IRQn : FDCAN2_IT0_IRQn);

	/* Register the FDCAN callbacks */
	if (HAL_FDCAN_RegisterTxBufferCompleteCallback(pcan, can_tx_cplt_callback) != HAL_OK) err(12);
	if (HAL_FDCAN_RegisterRxFifo0Callback(pcan, can_rx_done_callback) != HAL_OK) err(13);
	if (HAL_FDCAN_RegisterErrorCallback(pcan, can_error_callback) != HAL_OK) err(14);

	/* Start FDCAN module */
	HAL_FDCAN_Start(pcan);

	return 0;
} /* end app_init */

// lookup table for can sizes
static uint8_t can_sizes[] =
{
	0,  1,  2,  3,  4,  5,  6,  7,
	8, 12, 16, 20, 24, 32, 48, 64,
};
// macro in lowercase for symmetry with size_to_can_size
#define can_size_to_size(size) (can_sizes[size])
static uint8_t size_to_can_size(int size)
{
	for(int i = 0; i < 16; ++i)
		if(size <= can_sizes[i])
			return i;
	return 0;
}

// might move reception into the interrupt to give it priority, or might make a priority queue
int can_getdata(int caninst, uint8_t* data, char* size, int* id)
{
	hal_fdcan_rx_header_t rx_elt_header;

	hal_status_t hal_status;
	hal_status = HAL_FDCAN_GetReceivedMessage(caninst == 1 ? pcanhan1 : pcanhan2, HAL_FDCAN_RX_FIFO_0, &rx_elt_header, data);
	*size = can_size_to_size(rx_elt_header.b.data_length);
	*id = rx_elt_header.b.identifier;
	if(hal_status != HAL_OK)
	{
		err(1);
		return 1;
	}
	return 0;
}

// a variable length queue for each caninst
// supports 0x800 bytes or 0x100 messages, whichever is smaller
// this way, it can handle some large messages without taking up too much space,
// while not wasting space on smaller messages, which are thought to be the common case
static uint8_t queue[2][0x800];
static uint8_t sizes[2][0x100];
static uint8_t ids[2][0x100];
static uint16_t startq[2];
static uint16_t endq[2];
static uint16_t startm[2];
static uint16_t endm[2];
static uint8_t full[2];

static uint16_t free_space(int i)
{
	if(startq[i] > endq[i])
		return endq[i] - startq[i];
	return 0x800 - startq[i] + endq[i];
}
static uint8_t queue_empty(int i)
{
	return !full[i] && startq[i] == endq[i];
}

static int push_to_queue(int caninst, const uint8_t* data, uint8_t can_size, uint16_t id)
{
	if(full[caninst])
		return 1;
	if(can_size_to_size(can_size) > free_space(caninst))
		return 2;
	memcpy(&queue[caninst][endq[caninst]], data, can_size_to_size(can_size));
	sizes[caninst][endm[caninst]] = can_size;
	ids[caninst][endm[caninst]] = id;
	endq[caninst] += can_size_to_size(can_size);
	endq[caninst] &= 0x7ff;
	endm[caninst] += 1;
	endm[caninst] &= 0xff;
	full[caninst] = startm[caninst] == endm[caninst];

	return 0;
}
static int pop_from_queue(int caninst)
{
	full[caninst] = 0;
	startq[caninst] += can_size_to_size(sizes[caninst][startm[caninst]]);
	++startm[caninst];
	return 0;
}

static int can_try_send_data(int caninst, uint8_t* data, uint8_t can_size, uint16_t id)
{
	hal_status_t hal_status = 0;
	hal_fdcan_tx_header_t tx_header =
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
			.data_length = can_size,
		}
	};
	hal_status = HAL_FDCAN_ReqTransmitMsgFromFIFOQ(caninst == 1 ? pcanhan1 : pcanhan2, &tx_header, data);
	if(hal_status == HAL_OK)
		return 0;
	/* An error occurs during the FDCAN write transfer. Report it, then restart the communication */
	// ed: do not report error, retry till success, reports happen over can itself, this can't go down,
	// and if it does we got bigger problems. Also, most of the errors are internal queue full, resolved by waiting;
	return 1;
}

int can_resend(void* caninstfp)
{
	noerr(1);
	size_t caninst = (size_t)caninstfp;
	for(; !can_try_send_data(caninst, &queue[caninst - 1][startq[caninst - 1]],
				 sizes[caninst - 1][startm[caninst - 1]],
				 ids[caninst - 1][startm[caninst - 1]]) && !queue_empty(caninst - 1);)
	{
		pop_from_queue(caninst - 1);
	}
	if(queue_empty(caninst - 1))
		return 0; // done
	// need another round, queue not empty
	push_interrupt(1, FI_CAN_RESEND, caninstfp);
	return 1;
}

int can_senddata(int caninst, uint8_t* data, char size, uint16_t id)
{
	uint8_t can_size = size_to_can_size(size);
	size_t ci = caninst;
	if(queue_empty(caninst - 1))
	{
		// might be able to send directly without pushing to queue
		if(can_try_send_data(caninst, data, can_size, id))
		{
			// but if that fails, push the message and try again next time.
			push_to_queue(caninst - 1, data, can_size, id);
			push_interrupt(1, FI_CAN_RESEND, (void*)ci);
			return 1;
		}
		return 0;
	}
	push_to_queue(caninst - 1, data, can_size, id);
	// no need to do this, if queue is not empty, there sould already be an interrupt in there somewhere
//	can_resend((void*)ci);
	return 1;
}

// uncomment this when used
//static int can_handle_transfer_error(uint32_t hal_status, uint32_t fdcan_error_code)
//{
//	PRINTF("[ERROR] Controller - Communication ERROR: hal_status = %" PRIu32 ", \
//	       HAL_FDCAN_GetLastErrorCodes = %" PRIu32 ". TRYING AGAIN.\n", hal_status, fdcan_error_code);

//	return 1;
//} /* end HandleTransferError */

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
int can_deinit(int caninst)
{
	/* Stop FDCAN module */
	HAL_FDCAN_Stop(caninst == 1 ? pcanhan1 : pcanhan2);

	//mx_example_fdcan_deinit();

	return 0;
} /* end app_deinit */
