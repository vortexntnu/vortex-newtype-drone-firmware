################################################################################
# Automatically-generated file. Do not edit!
# Toolchain: GNU Tools for STM32 (14.3.rel1)
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
C_SRCS += \
../Core/Src/Applications/Commands.c \
../Core/Src/Applications/Controller.c \
../Core/Src/Applications/Converter.c \
../Core/Src/Applications/DShot.c \
../Core/Src/Applications/Debug.c \
../Core/Src/Applications/PWM.c 

OBJS += \
./Core/Src/Applications/Commands.o \
./Core/Src/Applications/Controller.o \
./Core/Src/Applications/Converter.o \
./Core/Src/Applications/DShot.o \
./Core/Src/Applications/Debug.o \
./Core/Src/Applications/PWM.o 

C_DEPS += \
./Core/Src/Applications/Commands.d \
./Core/Src/Applications/Controller.d \
./Core/Src/Applications/Converter.d \
./Core/Src/Applications/DShot.d \
./Core/Src/Applications/Debug.d \
./Core/Src/Applications/PWM.d 


# Each subdirectory must supply rules for building sources it contributes
Core/Src/Applications/%.o Core/Src/Applications/%.su Core/Src/Applications/%.cyclo: ../Core/Src/Applications/%.c Core/Src/Applications/subdir.mk
	arm-none-eabi-gcc "$<" -mcpu=cortex-m7 -std=gnu11 -g3 -DDEBUG -DUSE_PWR_LDO_SUPPLY -DUSE_HAL_DRIVER -DSTM32H753xx -c -I../Core/Inc -I../Drivers/STM32H7xx_HAL_Driver/Inc -I../Drivers/STM32H7xx_HAL_Driver/Inc/Legacy -I../Drivers/BSP/STM32H7xx_Nucleo -I../Drivers/CMSIS/Device/ST/STM32H7xx/Include -I../Drivers/CMSIS/Include -I../Core/Inc/Applications -I../Middlewares/Third_Party/FreeRTOS/Source/include -I../Middlewares/Third_Party/FreeRTOS/Source/CMSIS_RTOS_V2 -I../Middlewares/Third_Party/FreeRTOS/Source/portable/GCC/ARM_CM4F -I../Drivers/CMSIS/RTOS2/Include -O0 -ffunction-sections -fdata-sections -Wall -fstack-usage -fcyclomatic-complexity -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" --specs=nano.specs -mfpu=fpv5-d16 -mfloat-abi=hard -mthumb -o "$@"

clean: clean-Core-2f-Src-2f-Applications

clean-Core-2f-Src-2f-Applications:
	-$(RM) ./Core/Src/Applications/Commands.cyclo ./Core/Src/Applications/Commands.d ./Core/Src/Applications/Commands.o ./Core/Src/Applications/Commands.su ./Core/Src/Applications/Controller.cyclo ./Core/Src/Applications/Controller.d ./Core/Src/Applications/Controller.o ./Core/Src/Applications/Controller.su ./Core/Src/Applications/Converter.cyclo ./Core/Src/Applications/Converter.d ./Core/Src/Applications/Converter.o ./Core/Src/Applications/Converter.su ./Core/Src/Applications/DShot.cyclo ./Core/Src/Applications/DShot.d ./Core/Src/Applications/DShot.o ./Core/Src/Applications/DShot.su ./Core/Src/Applications/Debug.cyclo ./Core/Src/Applications/Debug.d ./Core/Src/Applications/Debug.o ./Core/Src/Applications/Debug.su ./Core/Src/Applications/PWM.cyclo ./Core/Src/Applications/PWM.d ./Core/Src/Applications/PWM.o ./Core/Src/Applications/PWM.su

.PHONY: clean-Core-2f-Src-2f-Applications

