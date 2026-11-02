################################################################################
# Automatically-generated file. Do not edit!
# Toolchain: GNU Tools for STM32 (14.3.rel1)
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
C_SRCS += \
../Core/Src/Embedded/commands.c \
../Core/Src/Embedded/controller.c \
../Core/Src/Embedded/converter.c \
../Core/Src/Embedded/debug.c \
../Core/Src/Embedded/dshot.c \
../Core/Src/Embedded/pwm.c \
../Core/Src/Embedded/weight.c 

OBJS += \
./Core/Src/Embedded/commands.o \
./Core/Src/Embedded/controller.o \
./Core/Src/Embedded/converter.o \
./Core/Src/Embedded/debug.o \
./Core/Src/Embedded/dshot.o \
./Core/Src/Embedded/pwm.o \
./Core/Src/Embedded/weight.o 

C_DEPS += \
./Core/Src/Embedded/commands.d \
./Core/Src/Embedded/controller.d \
./Core/Src/Embedded/converter.d \
./Core/Src/Embedded/debug.d \
./Core/Src/Embedded/dshot.d \
./Core/Src/Embedded/pwm.d \
./Core/Src/Embedded/weight.d 


# Each subdirectory must supply rules for building sources it contributes
Core/Src/Embedded/%.o Core/Src/Embedded/%.su Core/Src/Embedded/%.cyclo: ../Core/Src/Embedded/%.c Core/Src/Embedded/subdir.mk
	arm-none-eabi-gcc "$<" -mcpu=cortex-m7 -std=gnu11 -g3 -DDEBUG -DUSE_PWR_LDO_SUPPLY -DUSE_HAL_DRIVER -DSTM32H753xx -c -I../Core/Inc -I../Drivers/STM32H7xx_HAL_Driver/Inc -I../Drivers/STM32H7xx_HAL_Driver/Inc/Legacy -I../Drivers/BSP/STM32H7xx_Nucleo -I../Drivers/CMSIS/Device/ST/STM32H7xx/Include -I../Drivers/CMSIS/Include -I../Core/Inc/Embedded -I../Middlewares/Third_Party/FreeRTOS/Source/include -I../Middlewares/Third_Party/FreeRTOS/Source/CMSIS_RTOS_V2 -I../Middlewares/Third_Party/FreeRTOS/Source/portable/GCC/ARM_CM4F -I../Drivers/CMSIS/RTOS2/Include -I"../Core/Inc/Interface" -I../Core/Inc/Control -O0 -ffunction-sections -fdata-sections -Wall -fstack-usage -fcyclomatic-complexity -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" --specs=nano.specs -mfpu=fpv5-d16 -mfloat-abi=hard -mthumb -o "$@"

clean: clean-Core-2f-Src-2f-Embedded

clean-Core-2f-Src-2f-Embedded:
	-$(RM) ./Core/Src/Embedded/commands.cyclo ./Core/Src/Embedded/commands.d ./Core/Src/Embedded/commands.o ./Core/Src/Embedded/commands.su ./Core/Src/Embedded/controller.cyclo ./Core/Src/Embedded/controller.d ./Core/Src/Embedded/controller.o ./Core/Src/Embedded/controller.su ./Core/Src/Embedded/converter.cyclo ./Core/Src/Embedded/converter.d ./Core/Src/Embedded/converter.o ./Core/Src/Embedded/converter.su ./Core/Src/Embedded/debug.cyclo ./Core/Src/Embedded/debug.d ./Core/Src/Embedded/debug.o ./Core/Src/Embedded/debug.su ./Core/Src/Embedded/dshot.cyclo ./Core/Src/Embedded/dshot.d ./Core/Src/Embedded/dshot.o ./Core/Src/Embedded/dshot.su ./Core/Src/Embedded/pwm.cyclo ./Core/Src/Embedded/pwm.d ./Core/Src/Embedded/pwm.o ./Core/Src/Embedded/pwm.su ./Core/Src/Embedded/weight.cyclo ./Core/Src/Embedded/weight.d ./Core/Src/Embedded/weight.o ./Core/Src/Embedded/weight.su

.PHONY: clean-Core-2f-Src-2f-Embedded

