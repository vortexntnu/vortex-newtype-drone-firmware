#include <Embedded/Converter.h>
#include <Embedded/Debug.h>
#include <Embedded/PWM.h>

extern TIM_HandleTypeDef htim1;

void PWM_Init() {
	HAL_TIM_PWM_Start(&htim1, TIM_CHANNEL_1);
}

void PWM_SetDuty(uint16_t power) {
	uint16_t ARR = htim1.Init.Period;
	float_t percentage = (float_t)power / 255;
	uint16_t duty = (uint16_t)round(percentage * ARR);

	if(power > ARR){
		duty = ARR;
	}else{
		duty = power;
	}

	__HAL_TIM_SET_COMPARE(&htim1, TIM_CHANNEL_1, duty);
}
