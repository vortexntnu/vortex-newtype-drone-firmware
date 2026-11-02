################################################################################
# Automatically-generated file. Do not edit!
# Toolchain: GNU Tools for STM32 (14.3.rel1)
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
C_SRCS += \
../Core/Src/Interface/bridge.c 

OBJS += \
./Core/Src/Interface/bridge.o 

C_DEPS += \
./Core/Src/Interface/bridge.d 


# Each subdirectory must supply rules for building sources it contributes
Core/Src/Interface/%.o Core/Src/Interface/%.su Core/Src/Interface/%.cyclo: ../Core/Src/Interface/%.c Core/Src/Interface/subdir.mk
	arm-none-eabi-gcc "$<" -mcpu=cortex-m7 -std=gnu11 -g3 -DDEBUG -DUSE_PWR_LDO_SUPPLY -DUSE_HAL_DRIVER -DSTM32H753xx -c -I../Core/Inc -I../Drivers/STM32H7xx_HAL_Driver/Inc -I../Drivers/STM32H7xx_HAL_Driver/Inc/Legacy -I../Drivers/BSP/STM32H7xx_Nucleo -I../Drivers/CMSIS/Device/ST/STM32H7xx/Include -I../Drivers/CMSIS/Include -I../Core/Inc/Embedded -I../Middlewares/Third_Party/FreeRTOS/Source/include -I../Middlewares/Third_Party/FreeRTOS/Source/CMSIS_RTOS_V2 -I../Middlewares/Third_Party/FreeRTOS/Source/portable/GCC/ARM_CM4F -I../Drivers/CMSIS/RTOS2/Include -I"../Core/Inc/Interface" -I../Core/Inc/Control -O0 -ffunction-sections -fdata-sections -Wall -fstack-usage -fcyclomatic-complexity -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" --specs=nano.specs -mfpu=fpv5-d16 -mfloat-abi=hard -mthumb -o "$@"

clean: clean-Core-2f-Src-2f-Interface

clean-Core-2f-Src-2f-Interface:
	-$(RM) ./Core/Src/Interface/bridge.cyclo ./Core/Src/Interface/bridge.d ./Core/Src/Interface/bridge.o ./Core/Src/Interface/bridge.su

.PHONY: clean-Core-2f-Src-2f-Interface

