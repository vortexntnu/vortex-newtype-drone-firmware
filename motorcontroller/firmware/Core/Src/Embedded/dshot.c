//#include <stdbool.h>
//#include <stdint.h>
//#include "main.h"
//
//#define DSHOT_FRAME_BITS 16
//
//// DMA requires non-DTCM memory
//__attribute__((section(".dma_buffer")))
//static uint8_t dshot_tx_buf[DSHOT_FRAME_BITS];
//
//extern SPI_HandleTypeDef hspi1;
//
//static uint16_t DShot_BuildPacket(uint16_t throttle, bool telemetry)
//{
//    uint16_t packet = (throttle << 1) | (telemetry ? 1 : 0);
//    uint16_t crc = (packet ^ (packet >> 4) ^ (packet >> 8)) & 0x0F;
//    return (packet << 4) | crc;
//}
//
//static void DShot_Encode(uint16_t packet, uint8_t *buf)
//{
//    for (int i = 0; i < DSHOT_FRAME_BITS; i++) {
//        bool bit = (packet >> (DSHOT_FRAME_BITS - 1 - i)) & 0x01;
////        buf[i] = bit ? 0b11111100 : 0b11100000;
////        buf[i] = bit ? 0b00000011 : 0b00011111;
//        buf[i] = bit ? 0b00011111 : 0b00000011;
//
//    }
//}
//
//uint16_t currentDuty = 0;
//
//void DShot_Update()
//{
////	if (HAL_SPI_GetState(&hspi1) != HAL_SPI_STATE_READY) {
////		return false; // previous frame still sending
////	}
//
//	uint16_t packet = DShot_BuildPacket(currentDuty, false);
//	DShot_Encode(packet, dshot_tx_buf);
//
//	HAL_SPI_Transmit_DMA(&hspi1, dshot_tx_buf, DSHOT_FRAME_BITS);
//}
//
//
//// throttle: 0-2047 (0 = disarmed, 48-2047 = range)
//void DShot_SetDuty(uint16_t throttle, bool telemetry)
//{
//	currentDuty = throttle;
//}







#define DSHOT_BITS 16
static uint16_t dshot_buf[DSHOT_BITS + 1];
static uint16_t BIT0, BIT1;


void DShot_Init()
{
	uint16_t period = __HAL_TIM_GET_AUTORELOAD(&htim1) + 1;  // 107 ved ARR = 106
	BIT0 = (period * 3 + 4) / 8;   // 40
	BIT1 = (period * 3 + 2) / 4;   // 80
}

void DShot_SendPacket(uint16_t throttle, bool telem)
{
    uint16_t v = (throttle << 1) | (telem ? 1 : 0);
    uint16_t crc = (v ^ (v >> 4) ^ (v >> 8)) & 0xF;
    uint16_t packet = (v << 4) | crc;

    for (int i = 0; i < DSHOT_BITS; i++) {
        dshot_buf[i] = (packet & 0x8000) ? BIT1 : BIT0;
        packet <<= 1;
    }
    dshot_buf[DSHOT_BITS] = 0;  // idle low

    HAL_TIM_PWM_Start_DMA(&htim1, TIM_CHANNEL_1, (uint32_t*)dshot_buf, DSHOT_BITS + 1);
}

void HAL_TIM_PWM_PulseFinishedCallback(TIM_HandleTypeDef *htim)
{
    if (htim->Instance == TIM1) {
        HAL_TIM_PWM_Stop_DMA(htim, TIM_CHANNEL_1);
    }
}






uint16_t currentDuty = 0;


void DShot_Update()
{
	DShot_SendPacket(currentDuty, false);
}

void DShot_SetDuty(uint16_t throttle, bool telemetry)
{
	currentDuty = throttle;
}
