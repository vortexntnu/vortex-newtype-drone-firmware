#include <converter.h>


#define UINT_TO_STRING_MAX_ITERATIONS 10
#define STRING_TO_UINT_MAX_ITERATIONS 100

//


bool is_character_number(const char input)
{
	return input >= '0' && input <= '9';
}

bool is_character_int_separator(const char input)
{
	return input == ' ' || input == '.' || input == ',';
}

bool will_overflow(uint32_t current_value, uint8_t digit)
{
	return current_value > (4294967295u - digit) / 10;
}


//


uint8_t converter_uint_to_string_length(uint32_t number)
{
	uint8_t	length = 1;

	for (; length < UINT_TO_STRING_MAX_ITERATIONS; length++) {
		if (number < 10) break;
		number /= 10;
	}

	return length + 1;
}

uint8_t converter_uint_to_string(char *output, uint32_t number)
{
	if (number == 0) {
		output[0] = '0';
		output[1] = '\0';
		return 1;
	}

	char reversed_buffer[10];
	uint8_t length = 0;

	for (; length < UINT_TO_STRING_MAX_ITERATIONS; length++) {
		if (number == 0) break;

		reversed_buffer[length] = number % 10 + '0';
		number /= 10;
	}

	for (uint8_t i = 0; i < length; i++) {
		output[i] = reversed_buffer[length - 1 - i];
	}
	output[length] = '\0';

	return length;
}

uint8_t converter_string_to_uint(uint32_t *output, const char string[])
{
	if (string[0] == '\0') return 0;

	uint32_t value = 0;
	uint8_t length = 0;
	uint8_t i = 0;

	for (; i < STRING_TO_UINT_MAX_ITERATIONS; i++) {
		char character = string[i];

		if (character == '\0') break;
		if (is_character_int_separator(character)) continue;
		if (!is_character_number(character)) return 0;

		uint8_t digit = character - '0';

		if (will_overflow(value, digit)) return 0;

		value = value * 10 + digit;
		length++;
	}

	if (length == 0 || string[i] != '\0') return 0;

	*output = value;
	return length;
}
