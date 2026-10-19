//#include <Embedded/Debug.h>
//#include "main.h"
//
//
////
//
//
//// ---- DShot600 bidirectional, one SPI instance ----
//// Buffers MUST NOT be in DTCM (DMA can't reach it)
//#define DSHOT_FRAME_BITS 16
//#define DSHOT_RX_BYTES   40
//
//__attribute__((section(".dma_buffer")))
//uint8_t dshot_tx_buf[DSHOT_FRAME_BITS];
//
//__attribute__((section(".dma_buffer")))
//uint8_t dshot_rx_buf[DSHOT_RX_BYTES];
//
//extern SPI_HandleTypeDef hspi1; // repeat per SPI instance
//
//// 1. Build the 16-bit DShot packet: throttle (0-2047) + telemetry request bit + CRC
//uint16_t dshot_build_packet(uint16_t throttle, bool request_telemetry)
//{
////    uint16_t packet = (throttle << 1) | (request_telemetry ? 1 : 0);
////    uint16_t crc = (packet ^ (packet >> 4) ^ (packet >> 8)) & 0x0F;
////    crc = (~crc) & 0x0F;              // inverted CRC for bidirectional mode
////    return (packet << 4) | crc;
//
//	uint16_t packet = (throttle << 1) | (request_telemetry ? 1 : 0);
//	uint16_t crc = (packet ^ (packet >> 4) ^ (packet >> 8)) & 0x0F;
//	return (packet << 4) | crc;
//}
//
//// 2. Encode each of the 16 bits into one SPI byte (MSB first)
//void dshot_encode(uint16_t packet, uint8_t *buf)
//{
//    for (int i = 0; i < DSHOT_FRAME_BITS; i++) {
//        bool bit = (packet >> (DSHOT_FRAME_BITS - 1 - i)) & 0x01;
//        buf[i] = bit ? 0b00011111 : 0b00000011;
//    }
//}
//
//// 3. Kick off transmission (call this every control-loop tick)
//void DShot_Send(uint16_t throttle, bool request_telemetry)
//{
//    uint16_t packet = dshot_build_packet(throttle, request_telemetry);
//    dshot_encode(packet, dshot_tx_buf);
//
//    HAL_SPI_Transmit_DMA(&hspi1, dshot_tx_buf, DSHOT_FRAME_BITS);
//}
//
//// 4. On TX complete, flip direction and start listening for the ESC reply
//void HAL_SPI_TxCpltCallback(SPI_HandleTypeDef *hspi)
//{
//    if (hspi->Instance == SPI1) {
//        HAL_SPI_Receive_DMA(&hspi1, dshot_rx_buf, DSHOT_RX_BYTES);
//    }
//}
//
//void HAL_SPI_RxCpltCallback(SPI_HandleTypeDef *hspi)
//{
//    if (hspi->Instance == SPI1) {
//        // dshot_rx_buf now holds the raw oversampled reply — decode later
//    }
//}
//
//
////
//
//uint16_t currentDuty = 0;
//bool currentTelemetry = false;
//
//
//void DShot_Update()
//{
//	DShot_Send(currentDuty, currentTelemetry);
//}
//
//void DShot_SetDuty(uint16_t duty, bool telemetry)
//{
//	currentDuty = duty;
//}




#include <stdbool.h>
#include <stdint.h>
#include "main.h"

#define DSHOT_FRAME_BITS 16

// DMA requires non-DTCM memory
__attribute__((section(".dma_buffer")))
static uint8_t dshot_tx_buf[DSHOT_FRAME_BITS];

extern SPI_HandleTypeDef hspi1;

static uint16_t DShot_BuildPacket(uint16_t throttle, bool telemetry)
{
    uint16_t packet = (throttle << 1) | (telemetry ? 1 : 0);
    uint16_t crc = (packet ^ (packet >> 4) ^ (packet >> 8)) & 0x0F;
    return (packet << 4) | crc;
}

static void DShot_Encode(uint16_t packet, uint8_t *buf)
{
    for (int i = 0; i < DSHOT_FRAME_BITS; i++) {
        bool bit = (packet >> (DSHOT_FRAME_BITS - 1 - i)) & 0x01;
//        buf[i] = bit ? 0b11111100 : 0b11100000;
//        buf[i] = bit ? 0b00000011 : 0b00011111;
        buf[i] = bit ? 0b00011111 : 0b00000011;

    }
}

uint16_t currentDuty = 0;

void DShot_Update()
{
//	if (HAL_SPI_GetState(&hspi1) != HAL_SPI_STATE_READY) {
//		return false; // previous frame still sending
//	}

	uint16_t packet = DShot_BuildPacket(currentDuty, false);
	DShot_Encode(packet, dshot_tx_buf);

	HAL_SPI_Transmit_DMA(&hspi1, dshot_tx_buf, DSHOT_FRAME_BITS);
}


// throttle: 0-2047 (0 = disarmed, 48-2047 = range)
void DShot_SetDuty(uint16_t throttle, bool telemetry)
{
	currentDuty = throttle;
}
