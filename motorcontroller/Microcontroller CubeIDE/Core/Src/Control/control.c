#include "Control/control.h"


//


typedef enum
{
	SUCCESS,

	// control init errorkoder
	FAILED_TO_INIT,

	// control regulator errorkoder
	REGULATOR_FAILED_TO_START,
} CONTROL_ERROR_CODE;

typedef float Temperature;



void Control_Foo()
{
	Debug_Print("Hello, world!");
}


CONTROL_ERROR_CODE control_Init()
{

}

CONTROL_ERROR_CODE control_NewWrench(WrenchData wrench)
{

}

CONTROL_ERROR_CODE control_RegulatorStep(float deltaSeconds)
{
	return REGULATOR_FAILED_TO_START;
}
