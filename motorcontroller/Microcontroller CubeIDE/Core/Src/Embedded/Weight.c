//#include <Embedded/Weight.h>
//#include <Embedded/Debug.h>
//
//
//
//extern ADC_HandleTypeDef hadc1;
//
//uint16_t Voltages[2] = {0};
//static int32_t ZeroOffsets[2] = {45050, 45050};
//static float TranslationConstants[2] = {0.02f, 0.02f};
//
////45050 base
//// 1430 gram ref
////45080
//
//void Weight_Init()
//{
//	if (HAL_ADCEx_Calibration_Start(&hadc1, ADC_CALIB_OFFSET, ADC_DIFFERENTIAL_ENDED) != HAL_OK)
//	{
//		Debug_Print("Something went wrong with ADC calibration");
//	}
//
//	HAL_ADC_Start_DMA(&hadc1, (uint32_t *)Voltages, 2);
//}
//
//void Weight_Tare(uint8_t cellIndex)
//{
//	ZeroOffsets[cellIndex] = Weight_Read(cellIndex);
//}
//
//uint16_t Weight_Read(uint8_t cellIndex)
//{
//	uint16_t raw = Voltages[cellIndex];
//	int32_t offset = (int32_t)raw - ZeroOffsets[cellIndex];
//	float grams = (float)offset / TranslationConstants[cellIndex];
//
//	return (uint16_t)grams;
//}
//
//


volatile uint32_t LoadAmplifier_raw;
volatile int32_t  LoadAmplifier_value;
volatile uint8_t  LoadAmplifier_new;

#define HX_EXTI_PIN GPIO_PIN_0          // your DT-copy pin
#define HX_EXTI_IRQ EXTI0_IRQn          // match the pin number

void HAL_GPIO_EXTI_Falling_Callback(uint16_t pin)   // use HAL_GPIO_EXTI_Callback on older HAL versions
{
    if (pin == HX_EXTI_PIN) {
        HAL_NVIC_DisableIRQ(HX_EXTI_IRQ);            // DT toggles while shifting, so ignore it
        HAL_SPI_Receive_IT(&hspi1, (uint8_t*)&hx_raw, 1);
    }
}

void HAL_SPI_RxCpltCallback(SPI_HandleTypeDef *hspi)
{
    if (hspi == &hspi1) {
        int32_t value = (int32_t)(LoadAmplifier_raw >> 1);          // drop the 25th (gain) bit
        LoadAmplifier_value = (value << 8) >> 8;                    // sign-extend from 24 bits
        LoadAmplifier_new = 1;

        __HAL_GPIO_EXTI_CLEAR_IT(HX_EXTI_PIN);
        HAL_NVIC_ClearPendingIRQ(HX_EXTI_IRQ);
        HAL_NVIC_EnableIRQ(HX_EXTI_IRQ);
    }
}

int main(void)
{
    /* CubeMX init ... */
    while (1) {
        if (hx_new) {
            hx_new = 0;
            // tare/scale: weight = (hx_value - offset) / scale;
        }
        __WFI();                                     // sleep until the next interrupt
    }
}
