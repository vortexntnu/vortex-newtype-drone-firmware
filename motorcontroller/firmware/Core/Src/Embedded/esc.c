#include <esc.h>


//


#define FRAME_SIZE 10

static UART_HandleTypeDef *uart;
//static uint8_t telemetry_buffer[32] __attribute__((aligned(32)));  // 32 bytes for cache alignment
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

static uint16_t be16(const uint8_t *p) { return (p[0] << 8) | p[1]; }


//


static void listen()
{
	HAL_StatusTypeDef status = HAL_UARTEx_ReceiveToIdle_DMA(uart, telemetry_buffer, FRAME_SIZE);
	if (status != HAL_OK) debug_print("Something happened, uh oh");

	__HAL_DMA_DISABLE_IT(uart->hdmarx, DMA_IT_HT);
}

void HAL_UARTEx_RxEventCallback(UART_HandleTypeDef *huart, uint16_t size)
{
    debug_print("Received new telemetry");

	if (huart != uart) return;

//    SCB_InvalidateDCache_by_Addr((uint32_t *)telemetry_buffer, sizeof(telemetry_buffer));

//    if (size == FRAME_SIZE && crc8(telemetry_buffer, 9) == telemetry_buffer[9]) {
//        latest.temperature    = telemetry_buffer[0];
//        latest.voltage        = be16(&telemetry_buffer[1]) / 100.0f;
//        latest.current        = be16(&telemetry_buffer[3]) / 100.0f;
//        latest.consumption    = be16(&telemetry_buffer[5]);
//        latest.erpm           = be16(&telemetry_buffer[7]) * 100;
//    }

    listen();
}

void HAL_UART_ErrorCallback(UART_HandleTypeDef *huart)
{
    if (huart == uart) listen();
}

void esc_init(UART_HandleTypeDef *huart)
{
	uart = huart;
	listen();
}

EscTelemetry esc_fetch_latest_telemetry()
{
	char string[11];
	converter_int_to_string(string, latest.temperature);
	debug_print("Temperature: %", string);

	return latest;
}
