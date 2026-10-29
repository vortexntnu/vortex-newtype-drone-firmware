#include <Embedded/Controller.h>
#include <Embedded/Converter.h>
#include <Embedded/Debug.h>
#include <Embedded/DShot.h>
#include <Embedded/PWM.h>
#include <Embedded/Weight.h>
#include "main.h"

UART_HandleTypeDef *COMMUNICATION_PORT = &hcom_uart[COM1];

//





//


void Controller_Init() {
	PWM_Init();
	Weight_Init();
}

void Controller_Main() {
	Debug_ReadUART();

//	DShot_Update();
}

void Controller_Blinky() {
	BSP_LED_Toggle(LED_GREEN);
//	DShot_Update();

	uint16_t weight = Weight_Read(1);
	char string[10];
	Converter_UIntToString(string, weight);
	Debug_Print(string);
}

void Controller_CAN() {

}
