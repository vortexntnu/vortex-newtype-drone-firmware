#include <commands.h>
#include <converter.h>
#include <dshot.h>
#include <pwm.h>



//


typedef struct {
    int arguments_count;
    char **arguments_vector;
} CommandContext;

typedef struct {
    const char *category;
    const char *command;
    void (*handler)(CommandContext *context);
} StaticCommand;


//


void command_pwm_set_duty(CommandContext *context)
{
	if (context->arguments_count == 0) {
		debug_print("No duty given");
		return;
	}

	char *duty_string = context->arguments_vector[0];
	uint32_t duty;

	if (!converter_string_to_uint(&duty, duty_string)) {
		debug_print("Invalid DShot duty");
		return;
	}

	debug_print("Setting PWM duty to %", duty_string);
	pwm_set_duty(duty);
}

void command_dshot_set_duty(CommandContext *context)
{
	if (context->arguments_count == 0) {
		debug_print("No duty given");
		return;
	}

	char *duty_string = context->arguments_vector[0];
	uint32_t duty;

	if (!converter_string_to_uint(&duty, duty_string)) {
		debug_print("Invalid DShot duty");
		return;
	}

	debug_print("Setting DShot duty to %", duty_string);
	dshot_set_duty(duty, false);
}


//


static const StaticCommand COMMAND_TABLE[] = {
    {"PWM",  "SetDuty", command_pwm_set_duty},
	{"DShot",  "SetDuty", command_dshot_set_duty},
};

#define COMMAND_COUNT (sizeof(COMMAND_TABLE) / sizeof(COMMAND_TABLE[0]))
#define COMMAND_SEPARATOR " "
#define COMMAND_MAX_ARGUMENTS 8


//


void commands_execute_command(const char command[])
{
	char copy[strlen(command) + 1];
	strcpy(copy, command);

	char *category = strtok(copy, COMMAND_SEPARATOR);
	if (category == NULL) {
		debug_print("No category was given");
		return;
	}

	char *name = strtok(NULL, COMMAND_SEPARATOR);
	if (name == NULL) {
		debug_print("No command was given");
		return;
	}

	char *arguments[COMMAND_MAX_ARGUMENTS];
	char *argument = strtok(NULL, COMMAND_SEPARATOR);
	uint8_t arguments_count = 0;

	while (argument != NULL && arguments_count < COMMAND_MAX_ARGUMENTS) {
		arguments[arguments_count++] = argument;
		argument = strtok(NULL, COMMAND_SEPARATOR);
	}

	//

	for (uint8_t i = 0; i < COMMAND_COUNT; i++) {
		StaticCommand entry = COMMAND_TABLE[i];
		if ( strcmp(entry.category, category) ) continue;
		if ( strcmp(entry.command, name) ) continue;

		CommandContext Context = {
			.arguments_count = arguments_count,
			.arguments_vector = arguments
		};

		entry.handler(&Context);
		return;
	}

	debug_print("Unknown command");
}
