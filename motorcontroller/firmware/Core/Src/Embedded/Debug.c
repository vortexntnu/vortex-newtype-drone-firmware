#include <Embedded/Debug.h>

// screen /dev/ttyACM0 115200

#define COMMAND_MAX_LENGTH 30
#define DEBUG_PRINT_MAX_LENGTH 50
#define UART_TRANSMIT_TIMEOUT 100

extern UART_HandleTypeDef *COMMUNICATION_PORT;

char command[COMMAND_MAX_LENGTH + 1] = "";
char commandPrefix[] = "> ";


//


bool String_IsEmpty(const char string[]) {
	return string == NULL || string[0] == '\0';
}


//


bool ConcatinateWithinBounds(char output[], const char append[], uint8_t bound) // -> isFilled
{
	uint8_t outputLength = strlen(output);
	uint8_t appendLength = strlen(append);
	uint8_t remaining = bound - outputLength;

	if (appendLength < remaining) {
		strcat(output, append);
		return false;
	}

	char shortened[remaining + 1];
	shortened[remaining] = '\0';

	for (uint8_t i = 0; i < remaining; i++) {
		shortened[i] = append[i];
	}

	strcat(output, shortened);

	return true;
}

void UART_Transmit(const char message[])
{
	HAL_UART_Transmit(COMMUNICATION_PORT, (uint8_t*)message, strlen(message), UART_TRANSMIT_TIMEOUT);
}


//


void Command_WriteTerminal(const char message[])
{
	uint8_t prefixLength = strlen(commandPrefix);
	uint8_t commandLength = strlen(command);

	char commandline[prefixLength + commandLength + 1];

	strcpy(commandline, commandPrefix);
	strcat(commandline, command);

	UART_Transmit("\r\033[2K");

	if (!String_IsEmpty(message)) {
		UART_Transmit(message);
		UART_Transmit("\r\n");
	}

	UART_Transmit(commandline);
}

void Command_AppendCharacter(char character)
{
	uint8_t length = strlen(command);
	if (length >= COMMAND_MAX_LENGTH) return;

	char string[] = {character, '\0'};
	strcat(command, string);
}

void Command_RemoveCharacter()
{
	uint8_t length = strlen(command);
	if (length <= 0) return;

	command[length - 1] = '\0';
}

void Command_Enter()
{
	Commands_ExecuteCommand(command);
//	char output[] = "Command not recognized";

	command[0] = '\0';
	Command_WriteTerminal("");
}


//


void Debug_PrintRaw(const char message[])
{
	Command_WriteTerminal(message);
}

void Debug_Print(const char message[], ...)
{
	char output[DEBUG_PRINT_MAX_LENGTH + 1] = "";
    va_list Arguments;

    va_start(Arguments, message);

    for (uint16_t i = 0; i < strlen(message); i++) {
    	char character = message[i];

    	if (character == '%') {
    		const char *argument = va_arg(Arguments, const char *);
    		if (argument == NULL) break;

    		bool filled = ConcatinateWithinBounds(output, argument, DEBUG_PRINT_MAX_LENGTH);
    		if (filled) break;

    		continue;
    	}

		char string[] = {character, '\0'};
		bool filled = ConcatinateWithinBounds(output, string, DEBUG_PRINT_MAX_LENGTH); // TODO DOES NOT NEED TO CALL THIS BOHEMITH
		if (filled) break;
    }

    va_end(Arguments);

    Command_WriteTerminal(output);
}

void Debug_ReadUART()
{
	uint8_t dataWaiting = __HAL_UART_GET_FLAG(COMMUNICATION_PORT, UART_FLAG_RXNE);
	uint8_t dataOverflow = __HAL_UART_GET_FLAG(COMMUNICATION_PORT, UART_FLAG_ORE);
	BSP_LED_Toggle(LED_RED);

	if (dataWaiting) {
		uint8_t receivedByte;
		HAL_UART_Receive(COMMUNICATION_PORT, &receivedByte, 1, 0);

		switch(receivedByte) {
			case '\x7f':
				Command_RemoveCharacter();
				break;
			case '\r':
				Command_Enter();
				break;
			default:
				uint8_t normalCharacter = receivedByte >= ' ' && receivedByte <= '~';
				if (normalCharacter) Command_AppendCharacter(receivedByte);
		}

		Command_WriteTerminal("");

	} else if (dataOverflow) {
		__HAL_UART_CLEAR_OREFLAG(COMMUNICATION_PORT);
		Debug_PrintRaw("UART Overflow ");
	}
}
