################################################################################
# Automatically-generated file. Do not edit!
# Toolchain: GNU Tools for STM32 (14.3.rel1)
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
C_SRCS += \
../Core/Src/Control/allocator_generated.c \
../Core/Src/Control/control.c \
../Core/Src/Control/thrust_allocator.c 

OBJS += \
./Core/Src/Control/allocator_generated.o \
./Core/Src/Control/control.o \
./Core/Src/Control/thrust_allocator.o 

C_DEPS += \
./Core/Src/Control/allocator_generated.d \
./Core/Src/Control/control.d \
./Core/Src/Control/thrust_allocator.d 


# Each subdirectory must supply rules for building sources it contributes
Core/Src/Control/%.o Core/Src/Control/%.su Core/Src/Control/%.cyclo: ../Core/Src/Control/%.c Core/Src/Control/subdir.mk
	arm-none-eabi-gcc "$<" -mcpu=cortex-m7 -std=gnu11 -g3 -DDEBUG -DUSE_PWR_LDO_SUPPLY -DUSE_HAL_DRIVER -DSTM32H753xx -c -I../Core/Inc -I../Drivers/STM32H7xx_HAL_Driver/Inc -I../Drivers/STM32H7xx_HAL_Driver/Inc/Legacy -I../Drivers/BSP/STM32H7xx_Nucleo -I../Drivers/CMSIS/Device/ST/STM32H7xx/Include -I../Drivers/CMSIS/Include -I../Core/Inc/Embedded -I../Middlewares/Third_Party/FreeRTOS/Source/include -I../Middlewares/Third_Party/FreeRTOS/Source/CMSIS_RTOS_V2 -I../Middlewares/Third_Party/FreeRTOS/Source/portable/GCC/ARM_CM4F -I../Drivers/CMSIS/RTOS2/Include -I"../Core/Inc/Interface" -I../Core/Inc/Control -O0 -ffunction-sections -fdata-sections -Wall -fstack-usage -fcyclomatic-complexity -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" --specs=nano.specs -mfpu=fpv5-d16 -mfloat-abi=hard -mthumb -o "$@"

clean: clean-Core-2f-Src-2f-Control

clean-Core-2f-Src-2f-Control:
	-$(RM) ./Core/Src/Control/allocator_generated.cyclo ./Core/Src/Control/allocator_generated.d ./Core/Src/Control/allocator_generated.o ./Core/Src/Control/allocator_generated.su ./Core/Src/Control/control.cyclo ./Core/Src/Control/control.d ./Core/Src/Control/control.o ./Core/Src/Control/control.su ./Core/Src/Control/thrust_allocator.cyclo ./Core/Src/Control/thrust_allocator.d ./Core/Src/Control/thrust_allocator.o ./Core/Src/Control/thrust_allocator.su

.PHONY: clean-Core-2f-Src-2f-Control

