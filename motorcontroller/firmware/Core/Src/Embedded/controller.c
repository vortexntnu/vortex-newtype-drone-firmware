#include <controller.h>

UART_HandleTypeDef *COMMUNICATION_PORT = &hcom_uart[COM1];

extern UART_HandleTypeDef huart4;


//


uint32_t controller_weight()
{
	BSP_LED_Toggle(LED_RED);

	EscTelemetry latest = esc_fetch_latest_telemetry();
	int32_t weights[2] = {0};
	weight_read(weights);

	char first_weight_string[11];
	char second_weight_string[11];
	char temperature_string[11];
	char voltage_string[11];
	char current_string[11];
	char consumption_string[11];
	char erpm_string[11];

	converter_int_to_string(first_weight_string, weights[0]);
	converter_int_to_string(second_weight_string, weights[1]);
	converter_int_to_string(temperature_string, (uint8_t)latest.temperature);
	converter_float_to_string(voltage_string, latest.voltage, 2);
	converter_float_to_string(current_string, latest.current, 2);
	converter_int_to_string(consumption_string, (uint16_t)latest.consumption);
	converter_int_to_string(erpm_string, (uint32_t)latest.erpm);

	debug_print("{\"temperature\":%, \"voltage\":%, \"current\":%, \"consumption\":%, \"erpm\":%, \"weight1\":%, \"weight2\":%}", temperature_string, voltage_string, current_string, consumption_string, erpm_string, first_weight_string, second_weight_string);



	return 500;
}

uint32_t controller_dshot()
{
	dshot_update();
	return 1;
}


//


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
