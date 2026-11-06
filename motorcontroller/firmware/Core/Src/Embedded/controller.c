#include <controller.h>
#include <converter.h>
#include <debug.h>
#include <dshot.h>
#include <weight.h>
#include "main.h"

UART_HandleTypeDef *COMMUNICATION_PORT = &hcom_uart[COM1];

//



//


void controller_init() {
	dshot_init();
	debug_init();
//	weight_init();
}

void controller_main() {
	dshot_update();
}

void controller_blinky() {
	BSP_LED_Toggle(LED_GREEN);

	int32_t weight_value;
	char weight_string[33];

	weight_read(0, &weight_value);
	converter_int_to_string(weight_string, weight_value);
	debug_print("Weight: %", weight_string);
}

void controller_can() {

}
