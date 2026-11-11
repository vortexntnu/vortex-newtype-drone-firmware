#include <esc.h>


//


#define FRAME_SIZE 10

static UART_HandleTypeDef *uart;
static uint8_t telemetry_buffer[32];
static volatile EscTelemetry latest;

static uint8_t crc8(const uint8_t *data, int len)
{
    uint8_t crc = 0;
    for (int i = 0; i < len; i++) {
        crc ^= data[i];
        for (int bit = 0; bit < 8; bit++)
            crc = (crc & 0x80) ? (crc << 1) ^ 0xD5 : (crc << 1);
    }
    return crc;
}

//static uint16_t be16(const uint8_t *p) { return (p[0] << 8) | p[1]; }


//


static void listen()
{
//	HAL_UART_AbortReceive(uart);
//	__HAL_UART_CLEAR_OREFLAG(uart);
//	__HAL_UART_CLEAR_FEFLAG(uart);
//	__HAL_UART_CLEAR_NEFLAG(uart);

	HAL_StatusTypeDef status = HAL_UARTEx_ReceiveToIdle_DMA(uart, telemetry_buffer, FRAME_SIZE);
	if (status != HAL_OK) debug_print("Something happened, uh oh");

	__HAL_DMA_DISABLE_IT(uart->hdmarx, DMA_IT_HT);
}

void HAL_UARTEx_RxEventCallback(UART_HandleTypeDef *huart, uint16_t size)
{
	if (huart != uart) return;
//    if (size != FRAME_SIZE || crc8(telemetry_buffer, 9) != telemetry_buffer[9]) return;

	latest.temperature = telemetry_buffer[0];
	latest.voltage = (float)((uint16_t)(telemetry_buffer[1] << 8) | (telemetry_buffer[2])) / 100.0;
	latest.current = (float)((uint16_t)(telemetry_buffer[3] << 8) | (telemetry_buffer[4])) / 100.0;
	latest.consumption = (uint16_t)(telemetry_buffer[5] << 8) | (telemetry_buffer[6]);
	latest.erpm = (uint32_t)(telemetry_buffer[7] << 8) | (telemetry_buffer[8]) * 100;

    listen();
    controller_new_telemetry(latest);

}

void Esc_HAL_UART_ErrorCallback(UART_HandleTypeDef *huart)
{
    if (huart == uart) listen();
}

void esc_init(UART_HandleTypeDef *huart)
{
	uart = huart;
	listen();
}
