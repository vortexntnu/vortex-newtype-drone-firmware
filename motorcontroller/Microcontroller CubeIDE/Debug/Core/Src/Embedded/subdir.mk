################################################################################
# Automatically-generated file. Do not edit!
# Toolchain: GNU Tools for STM32 (14.3.rel1)
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
C_SRCS += \
../Core/Src/Embedded/Commands.c \
../Core/Src/Embedded/Controller.c \
../Core/Src/Embedded/Converter.c \
../Core/Src/Embedded/DShot.c \
../Core/Src/Embedded/Debug.c \
../Core/Src/Embedded/PWM.c 

OBJS += \
./Core/Src/Embedded/Commands.o \
./Core/Src/Embedded/Controller.o \
./Core/Src/Embedded/Converter.o \
./Core/Src/Embedded/DShot.o \
./Core/Src/Embedded/Debug.o \
./Core/Src/Embedded/PWM.o 

C_DEPS += \
./Core/Src/Embedded/Commands.d \
./Core/Src/Embedded/Controller.d \
./Core/Src/Embedded/Converter.d \
./Core/Src/Embedded/DShot.d \
./Core/Src/Embedded/Debug.d \
./Core/Src/Embedded/PWM.d 


# Each subdirectory must supply rules for building sources it contributes
Core/Src/Embedded/%.o Core/Src/Embedded/%.su Core/Src/Embedded/%.cyclo: ../Core/Src/Embedded/%.c Core/Src/Embedded/subdir.mk
	arm-none-eabi-gcc "$<" -mcpu=cortex-m7 -std=gnu11 -g3 -DDEBUG -DUSE_PWR_LDO_SUPPLY -DUSE_HAL_DRIVER -DSTM32H753xx -c -I../Core/Inc -I../Drivers/STM32H7xx_HAL_Driver/Inc -I../Drivers/STM32H7xx_HAL_Driver/Inc/Legacy -I../Drivers/BSP/STM32H7xx_Nucleo -I../Drivers/CMSIS/Device/ST/STM32H7xx/Include -I../Drivers/CMSIS/Include -I../Core/Inc/Embedded -I../Middlewares/Third_Party/FreeRTOS/Source/include -I../Middlewares/Third_Party/FreeRTOS/Source/CMSIS_RTOS_V2 -I../Middlewares/Third_Party/FreeRTOS/Source/portable/GCC/ARM_CM4F -I../Drivers/CMSIS/RTOS2/Include -O0 -ffunction-sections -fdata-sections -Wall -fstack-usage -fcyclomatic-complexity -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" --specs=nano.specs -mfpu=fpv5-d16 -mfloat-abi=hard -mthumb -o "$@"

clean: clean-Core-2f-Src-2f-Embedded

clean-Core-2f-Src-2f-Embedded:
	-$(RM) ./Core/Src/Embedded/Commands.cyclo ./Core/Src/Embedded/Commands.d ./Core/Src/Embedded/Commands.o ./Core/Src/Embedded/Commands.su ./Core/Src/Embedded/Controller.cyclo ./Core/Src/Embedded/Controller.d ./Core/Src/Embedded/Controller.o ./Core/Src/Embedded/Controller.su ./Core/Src/Embedded/Converter.cyclo ./Core/Src/Embedded/Converter.d ./Core/Src/Embedded/Converter.o ./Core/Src/Embedded/Converter.su ./Core/Src/Embedded/DShot.cyclo ./Core/Src/Embedded/DShot.d ./Core/Src/Embedded/DShot.o ./Core/Src/Embedded/DShot.su ./Core/Src/Embedded/Debug.cyclo ./Core/Src/Embedded/Debug.d ./Core/Src/Embedded/Debug.o ./Core/Src/Embedded/Debug.su ./Core/Src/Embedded/PWM.cyclo ./Core/Src/Embedded/PWM.d ./Core/Src/Embedded/PWM.o ./Core/Src/Embedded/PWM.su

.PHONY: clean-Core-2f-Src-2f-Embedded

