#include <Embedded/Controller.h>
#include <Embedded/Debug.h>
#include <Embedded/DShot.h>
#include <Embedded/PWM.h>
#include "main.h"

UART_HandleTypeDef *COMMUNICATION_PORT = &hcom_uart[COM1];

//





//


void Controller_Init() {
	PWM_Init();
}

void Controller_Main() {
	Debug_ReadUART();

//	DShot_Update();
}

void Controller_Blinky() {
//	BSP_LED_Toggle(LED_GREEN);
//	PWM_Command(10); //
//	DShot_Command();
//	DShot_SetDuty(1048, false);
	DShot_Update();
//	DShot_SetDuty(500, false);
}

void Controller_CAN() {

}
