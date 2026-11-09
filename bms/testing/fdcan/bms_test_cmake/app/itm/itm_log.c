#include "itm_log.h"
#include "stm32c5xx.h"

bool ITM_TrySendChar(char ch)
{
    if ((DCB->DEMCR & DCB_DEMCR_TRCENA_Msk) == 0U) return false;
    if ((ITM->TCR & ITM_TCR_ITMENA_Msk) == 0U)     return false;
    if ((ITM->TER & 1UL) == 0U)                    return false;

    uint32_t tries = 2000U;
    while (ITM->PORT[0].u32 == 0U) {
        if (--tries == 0U) return false;
    }
    
    ITM->PORT[0].u8 = (uint8_t)ch;

    return true;
}