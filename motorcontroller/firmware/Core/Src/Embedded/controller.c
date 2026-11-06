#include <controller.h>

UART_HandleTypeDef *COMMUNICATION_PORT = &hcom_uart[COM1];


//


uint32_t controller_weight()
{
	BSP_LED_Toggle(LED_RED);

	int32_t weight_value;
	char weight_string[20];

	weight_read(&weight_value);
	converter_int_to_string(weight_string, weight_value);
	debug_print("Weight: %", weight_string);

	return 500;
}

uint32_t controller_dshot()
{
	dshot_update();
	return 10;
}


//


void controller_init()
{
	dshot_init();
	debug_init();
}

uint32_t controller_main()
{
	BSP_LED_Toggle(LED_GREEN);
	return 1000;
}
