#include <Embedded/Converter.h>


#define UINT_TO_STRING_MAX_ITERATIONS 10
#define STRING_TO_UINT_MAX_ITERATIONS 100

//


bool IsCharacterNumber(const char input)
{
	return input >= '0' && input <= '9';
}

bool IsCharacterIntSeparator(const char input)
{
	return input == ' ' || input == '.' || input == ',';
}

bool WillOverflow(uint32_t currentValue, uint8_t digit)
{
	return currentValue > (4294967295u - digit) / 10;
}


//


uint8_t Converter_UIntToStringLength(uint32_t number)
{
	uint8_t	length = 1;

	for (; length < UINT_TO_STRING_MAX_ITERATIONS; length++) {
		if (number < 10) break;
		number /= 10;
	}

	return length + 1;
}

uint8_t Converter_UIntToString(char *Output, uint32_t number)
{
	if (number == 0) {
		Output[0] = '0';
		Output[1] = '\0';
		return 1;
	}

	char ReversedBuffer[10];
	uint8_t length = 0;

	for (; length < UINT_TO_STRING_MAX_ITERATIONS; length++) {
		if (number == 0) break;

		ReversedBuffer[length] = number % 10 + '0';
		number /= 10;
	}

	for (uint8_t i = 0; i < length; i++) {
		Output[i] = ReversedBuffer[length - 1 - i];
	}
	Output[length] = '\0';

	return length;
}

uint8_t Converter_StringToUInt(uint32_t *Output, const char String[])
{
	if (String[0] == '\0') return 0;

	uint32_t value = 0;
	uint8_t length = 0;
	uint8_t i = 0;

	for (; i < STRING_TO_UINT_MAX_ITERATIONS; i++) {
		char character = String[i];

		if (character == '\0') break;
		if (IsCharacterIntSeparator(character)) continue;
		if (!IsCharacterNumber(character)) return 0;

		uint8_t digit = character - '0';

		if (WillOverflow(value, digit)) return 0;

		value = value * 10 + digit;
		length++;
	}

	if (length == 0 || String[i] != '\0') return 0;

	*Output = value;
	return length;
}
