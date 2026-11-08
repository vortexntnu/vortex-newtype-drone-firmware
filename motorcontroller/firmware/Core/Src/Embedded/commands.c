#include <commands.h>
#include <converter.h>
#include <dshot.h>
#include <weight.h>



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


void command_dshot_set_throttle(CommandContext *Context)
{
	if (Context->arguments_count < 2) {
		debug_print("Usage: dshot setthrottle {channel} {throttle}");
		return;
	}

	char *channel_string = Context->arguments_vector[0];
	char *throttle_string = Context->arguments_vector[1];
	uint32_t channel;
	uint32_t throttle;

	if (!converter_string_to_uint(&channel, channel_string)) {
		debug_print("Invalid DShot channel");
		return;
	}

	if (!converter_string_to_uint(&throttle, throttle_string)) {
		debug_print("Invalid DShot throttle");
		return;
	}

	debug_print("Setting DShot channel %'s throttle to %", channel_string, throttle_string);
	dshot_set_throttle(channel, throttle);
}


//


void command_weight_tare(CommandContext *Context)
{
	if (Context->arguments_count < 1) {
		debug_print("Usage: weight tare {channel}");
		return;
	}

	char *channel_string = Context->arguments_vector[0];
	uint32_t channel;

	if (!converter_string_to_uint(&channel, channel_string)) {
		debug_print("Invalid weight channel");
		return;
	}

	weight_tare(channel);
}

void command_weight_tareall(CommandContext *Context)
{
	weight_tareall();
}


//


static const StaticCommand COMMAND_TABLE[] = {
	{"dshot", "setthrottle", command_dshot_set_throttle},
	{"weight", "tare", command_weight_tare},
	{"weight", "tareall", command_weight_tareall},
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
