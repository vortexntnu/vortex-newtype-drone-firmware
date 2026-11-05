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
//	pwm_init();
	dshot_init();
//	weight_init();
}

void controller_main() {
	debug_read_uart();

	dshot_update();
}

void controller_blinky() {
	BSP_LED_Toggle(LED_GREEN);
//	dshot_update();

//	uint16_t weight = weight_read(1);
//	char string[10];
//	converter_uint_to_string(string, weight);
//	debug_print(string);
}

void controller_can() {

}
