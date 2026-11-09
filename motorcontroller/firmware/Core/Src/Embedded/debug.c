#include <debug.h>

// screen /dev/ttyACM0 115200

#define COMMAND_MAX_LENGTH 30
#define DEBUG_PRINT_MAX_LENGTH 150
#define UART_TRANSMIT_TIMEOUT 100
#define RECEIVED_BUFFER_SIZE 64

extern UART_HandleTypeDef *COMMUNICATION_PORT;

static char command[COMMAND_MAX_LENGTH + 1] = "";
static char command_prefix[] = "> ";

static uint8_t received_byte;
static volatile uint8_t received_buffer[RECEIVED_BUFFER_SIZE];
static volatile uint16_t received_head, received_tail;


//


static bool string_is_empty(const char string[]) {
	return string == NULL || string[0] == '\0';
}


//


static bool concatenate_within_bounds(char output[], const char append[], uint8_t bound) // -> isFilled
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

static void uart_transmit(const char message[])
{
	HAL_UART_Transmit(COMMUNICATION_PORT, (uint8_t*)message, strlen(message), UART_TRANSMIT_TIMEOUT);
}


//


static void command_write_terminal(const char message[])
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

static void command_append_character(char character)
{
	uint8_t length = strlen(command);
	if (length >= COMMAND_MAX_LENGTH) return;

	char string[] = {character, '\0'};
	strcat(command, string);
}

static void command_remove_character()
{
	uint8_t length = strlen(command);
	if (length <= 0) return;

	command[length - 1] = '\0';
}

static void command_enter()
{
	commands_execute_command(command);
	command[0] = '\0';
	command_write_terminal("");
}


// STM32 events


void USART3_IRQHandler(void)
{
    HAL_UART_IRQHandler(&hcom_uart[COM1]);
}


void HAL_UART_ErrorCallback(UART_HandleTypeDef *huart)
{
    if (huart->Instance != USART3) return;
    HAL_UART_Receive_IT(huart, &received_byte, 1);
}

void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
{
    if (huart->Instance != USART3) return;

    received_buffer[received_head] = received_byte;
    received_head = (received_head + 1) % RECEIVED_BUFFER_SIZE;

	HAL_UART_Receive_IT(huart, &received_byte, 1);   // re-arm
	BSP_LED_Toggle(LED_RED);
}


//


void debug_init()
{
	HAL_NVIC_SetPriority(USART3_IRQn, 5, 0); // Sets up interrupts on the STLink (Can't be configured in CubeMX)
	HAL_NVIC_EnableIRQ(USART3_IRQn);
	HAL_UART_Receive_IT(&hcom_uart[COM1], &received_byte, 1);
}

void debug_proccess_input_buffer()
{
	for (uint16_t i = 0; i < RECEIVED_BUFFER_SIZE && received_tail != received_head; i++)
	{
		uint8_t byte = received_buffer[received_tail];
		received_tail = (received_tail + 1) % RECEIVED_BUFFER_SIZE;

		switch(received_byte) {
			case '\x7f':
				command_remove_character();
				break;
			case '\r':
				command_enter();
				break;
			default:
				bool normalCharacter = received_byte >= ' ' && received_byte <= '~';
				if (normalCharacter) command_append_character(received_byte);
		}
	}

	command_write_terminal(""); // TODO should by no means be called every update
}

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

    		bool filled = concatenate_within_bounds(output, argument, DEBUG_PRINT_MAX_LENGTH);
    		if (filled) break;

    		continue;
    	}

		char string[] = {character, '\0'};
		bool filled = concatenate_within_bounds(output, string, DEBUG_PRINT_MAX_LENGTH); // TODO DOES NOT NEED TO CALL THIS BOHEMITH
		if (filled) break;
    }

    va_end(arguments);

    command_write_terminal(output);
}
