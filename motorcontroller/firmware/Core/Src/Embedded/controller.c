#include <controller.h>

UART_HandleTypeDef *COMMUNICATION_PORT = &hcom_uart[COM1];

extern UART_HandleTypeDef huart4;


//


uint32_t controller_weight()
{
	BSP_LED_Toggle(LED_YELLOW);

	return 500;
}

uint32_t controller_dshot()
{
	dshot_update();
	return 1;
}

uint32_t controller_terminal()
{
	debug_proccess_input_buffer();
	return 50;
}


// HAL events


void HAL_UART_ErrorCallback(UART_HandleTypeDef *huart)
{
	Esc_HAL_UART_ErrorCallback(huart);
	Debug_HAL_UART_ErrorCallback(huart);
}


// Interface events


void controller_init()
{
	dshot_init();
	debug_init();
	esc_init(&huart4);
}

uint32_t controller_main()
{
	BSP_LED_Toggle(LED_GREEN);
	return 1000;
}

void controller_new_telemetry(EscTelemetry Telemetry)
{
	BSP_LED_Toggle(LED_RED);

	DShotChannel *DShot = dshot_get_channel(0);
	int32_t weights[2] = {0};
	weight_read(weights);

	char first_weight_string[11];
	char second_weight_string[11];
	char temperature_string[11];
	char voltage_string[11];
	char current_string[11];
	char consumption_string[11];
	char erpm_string[11];
	char throttle_string[11];

	converter_int_to_string(first_weight_string, weights[0]);
	converter_int_to_string(second_weight_string, weights[1]);
	converter_int_to_string(throttle_string, DShot->throttle);
	converter_int_to_string(temperature_string, (uint8_t)Telemetry.temperature);
	converter_float_to_string(voltage_string, Telemetry.voltage, 2);
	converter_float_to_string(current_string, Telemetry.current, 2);
	converter_int_to_string(consumption_string, (uint16_t)Telemetry.consumption);
	converter_int_to_string(erpm_string, (uint32_t)Telemetry.erpm);

	debug_print("{\"temperature\":%, \"voltage\":%, \"current\":%, \"consumption\":%, \"erpm\":%, \"throttle\":%, \"weight1\":%, \"weight2\":%}", temperature_string, voltage_string, current_string, consumption_string, erpm_string, throttle_string, first_weight_string, second_weight_string);
}
