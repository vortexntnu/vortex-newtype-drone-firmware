#include <debug.h>

// screen /dev/ttyACM0 115200

#define COMMAND_MAX_LENGTH 30
#define DEBUG_PRINT_MAX_LENGTH 50
#define UART_TRANSMIT_TIMEOUT 100

extern UART_HandleTypeDef *COMMUNICATION_PORT;

char command[COMMAND_MAX_LENGTH + 1] = "";
char command_prefix[] = "> ";


//


bool string_is_empty(const char string[]) {
	return string == NULL || string[0] == '\0';
}


//


bool concatinate_within_bounds(char output[], const char append[], uint8_t bound) // -> isFilled
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

void uart_transmit(const char message[])
{
	HAL_uart_transmit(COMMUNICATION_PORT, (uint8_t*)message, strlen(message), UART_TRANSMIT_TIMEOUT);
}


//


void command_write_terminal(const char message[])
{
	uint8_t prefix_length = strlen(command_prefix);
	uint8_t commandLength = strlen(command);

	char commandline[prefix_length + commandLength + 1];

	strcpy(commandline, command_prefix);
	strcat(commandline, command);

	uart_transmit("\r\033[2K");

	if (!string_is_empty(message)) {
		uart_transmit(message);
		uart_transmit("\r\n");
	}

	uart_transmit(commandline);
}

void command_append_character(char character)
{
	uint8_t length = strlen(command);
	if (length >= COMMAND_MAX_LENGTH) return;

	char string[] = {character, '\0'};
	strcat(command, string);
}

void command_remove_character()
{
	uint8_t length = strlen(command);
	if (length <= 0) return;

	command[length - 1] = '\0';
}

void command_enter()
{
	commands_execute_command(command);
//	char output[] = "Command not recognized";

	command[0] = '\0';
	command_write_terminal("");
}


//


void debug_print_raw(const char message[])
{
	command_write_terminal(message);
}

void debug_print(const char message[], ...)
{
	char output[DEBUG_PRINT_MAX_LENGTH + 1] = "";
    va_list arguments;

    va_start(arguments, message);

    for (uint16_t i = 0; i < strlen(message); i++) {
    	char character = message[i];

    	if (character == '%') {
    		const char *argument = va_arg(arguments, const char *);
    		if (argument == NULL) break;

    		bool filled = concatinate_within_bounds(output, argument, DEBUG_PRINT_MAX_LENGTH);
    		if (filled) break;

    		continue;
    	}

		char string[] = {character, '\0'};
		bool filled = concatinate_within_bounds(output, string, DEBUG_PRINT_MAX_LENGTH); // TODO DOES NOT NEED TO CALL THIS BOHEMITH
		if (filled) break;
    }

    va_end(arguments);

    command_write_terminal(output);
}

void debug_read_uart()
{
	uint8_t data_waiting = __HAL_UART_GET_FLAG(COMMUNICATION_PORT, UART_FLAG_RXNE);
	uint8_t data_overflow = __HAL_UART_GET_FLAG(COMMUNICATION_PORT, UART_FLAG_ORE);
	BSP_LED_Toggle(LED_RED);

	if (data_waiting) {
		uint8_t received_byte;
		HAL_UART_Receive(COMMUNICATION_PORT, &received_byte, 1, 0);

		switch(received_byte) {
			case '\x7f':
				command_remove_character();
				break;
			case '\r':
				command_enter();
				break;
			default:
				uint8_t normalCharacter = received_byte >= ' ' && received_byte <= '~';
				if (normalCharacter) command_append_character(received_byte);
		}

		command_write_terminal("");

	} else if (data_overflow) {
		__HAL_UART_CLEAR_OREFLAG(COMMUNICATION_PORT);
		debug_print_raw("UART Overflow ");
	}
}
