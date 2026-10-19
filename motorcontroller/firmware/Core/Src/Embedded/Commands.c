#include <Embedded/Commands.h>
#include "Embedded/Converter.h"

#include "Embedded/DShot.h"
#include "Embedded/PWM.h"


//


typedef struct {
    int argumentCount;
    char **argumentVector;
} CommandContext;

typedef struct {
    const char *category;
    const char *command;
    void (*handler)(CommandContext *Context);
} StaticCommand;


//


void Command_PWM_SetDuty(CommandContext *Context)
{
	if (Context->argumentCount == 0) {
		Debug_Print("No duty given");
		return;
	}

	char *dutyString = Context->argumentVector[0];
	uint32_t duty;

	if (!Converter_StringToUInt(&duty, dutyString)) {
		Debug_Print("Invalid DShot duty");
		return;
	}

	Debug_Print("Setting PWM duty to %", dutyString);
	PWM_SetDuty(duty);
}

void Command_DShot_SetDuty(CommandContext *Context)
{
	if (Context->argumentCount == 0) {
		Debug_Print("No duty given");
		return;
	}

	char *dutyString = Context->argumentVector[0];
	uint32_t duty;

	if (!Converter_StringToUInt(&duty, dutyString)) {
		Debug_Print("Invalid DShot duty");
		return;
	}

	Debug_Print("Setting DShot duty to %", dutyString);
	DShot_SetDuty(duty, false);
}


//


static const StaticCommand COMMAND_TABLE[] = {
    {"PWM",  "SetDuty", Command_PWM_SetDuty},
	{"DShot",  "SetDuty", Command_DShot_SetDuty},
};

#define COMMAND_COUNT (sizeof(COMMAND_TABLE) / sizeof(COMMAND_TABLE[0]))
#define COMMAND_SEPARATOR " "
#define COMMAND_MAX_ARGUMENTS 8


//


void Commands_ExecuteCommand(const char command[])
{
	char copy[strlen(command) + 1];
	strcpy(copy, command);

	char *category = strtok(copy, COMMAND_SEPARATOR);
	if (category == NULL) {
		Debug_Print("No category was given");
		return;
	}

	char *name = strtok(NULL, COMMAND_SEPARATOR);
	if (name == NULL) {
		Debug_Print("No command was given");
		return;
	}

	char *Arguments[COMMAND_MAX_ARGUMENTS];
	char *argument = strtok(NULL, COMMAND_SEPARATOR);
	uint8_t argumentCount = 0;

	while (argument != NULL && argumentCount < COMMAND_MAX_ARGUMENTS) {
		Arguments[argumentCount++] = argument;
		argument = strtok(NULL, COMMAND_SEPARATOR);
	}

	//

	for (uint8_t i = 0; i < COMMAND_COUNT; i++) {
		StaticCommand entry = COMMAND_TABLE[i];
		if ( strcmp(entry.category, category) ) continue;
		if ( strcmp(entry.command, name) ) continue;

		CommandContext Context = {
			.argumentCount = argumentCount,
			.argumentVector = Arguments
		};

		entry.handler(&Context);
		return;
	}

	Debug_Print("Unknown command");
}
