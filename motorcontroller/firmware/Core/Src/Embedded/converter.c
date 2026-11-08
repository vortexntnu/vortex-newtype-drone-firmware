#include <converter.h>


#define UINT_TO_STRING_MAX_ITERATIONS 10
#define STRING_TO_UINT_MAX_ITERATIONS 100

#define FLOAT_TO_STRING_MAX_DECIMALS 9

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


// uint32_t


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


// int32_t


uint8_t converter_int_to_string(char *output, int32_t number)
{
	uint8_t offset = 0;
	uint32_t magnitude;

	if (number < 0) {
		output[offset++] = '-';
		magnitude = (uint32_t)0 - (uint32_t)number;   // trygt også for INT32_MIN
	} else {
		magnitude = (uint32_t)number;
	}

	uint8_t digits = converter_uint_to_string(output + offset, magnitude);

	return offset + digits;
}


// binary representation


bool converter_int_to_byte_string(char *output, int32_t number)
{
	for (uint8_t i = 0; i < 32; i++)
	{
		bool isZero = (number & 1u) == 0;

		number >>= 1;
		output[31 - i] = isZero ? '0' : '1';
	}
	output[32] = '\0';

	return true;
}


// float


// Skriver `number` med fast antall desimaler. Returnerer lengden på strengen,
// eller 0 hvis tallet er NaN eller utenfor uint32-området.
// Bufferen må ha plass til 22 tegn (tegn + 10 sifre + '.' + 9 desimaler + '\0').
uint8_t converter_float_to_string(char *output, float number, uint8_t decimals)
{
	if (decimals > FLOAT_TO_STRING_MAX_DECIMALS) decimals = FLOAT_TO_STRING_MAX_DECIMALS;
	if (number != number) return 0;   // NaN
	if (number >= 4294967296.0f || number <= -4294967296.0f) return 0;   // inf eller for stort

	uint8_t length = 0;

	if (number < 0) {
		output[length++] = '-';
		number = -number;
	}

	uint32_t scale = 1;
	for (uint8_t i = 0; i < decimals; i++) scale *= 10;

	uint32_t whole    = (uint32_t)number;
	uint32_t fraction = (uint32_t)(((double)number - whole) * scale + 0.5);   // avrunder

	if (fraction >= scale) {   // f.eks. 1.999 med 2 desimaler -> 2.00
		whole++;
		fraction -= scale;
	}

	length += converter_uint_to_string(output + length, whole);

	if (decimals == 0) return length;

	output[length++] = '.';

	for (uint8_t i = decimals; i > 0; i--) {   // fyller bakfra, så ledende nuller blir med
		output[length + i - 1] = fraction % 10 + '0';
		fraction /= 10;
	}
	length += decimals;
	output[length] = '\0';

	return length;
}
