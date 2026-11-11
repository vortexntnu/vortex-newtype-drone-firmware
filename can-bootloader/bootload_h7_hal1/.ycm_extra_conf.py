def Settings( **kwargs ):
    return {
            'flags': ['-x', 'c', '-Wall', '-Werror', '-Wextra', '-std=c99',
                      '-DUSE_PWR_LDO_SUPPLY', '-DUSE_HAL_DRIVER', '-DSTM32H753xx',
                      '-I/home/elias-gravdal/STM32Cube/bootload/Core/Inc',
                      '-I/home/elias-gravdal/STM32Cube/bootload/Drivers/STM32H7xx_HAL_Driver/Inc',
                      '-I/home/elias-gravdal/STM32Cube/bootload/Drivers/STM32H7xx_HAL_Driver/Inc/Legacy',
                      '-I/home/elias-gravdal/STM32Cube/bootload/Drivers/BSP/STM32H7xx_Nucleo',
                      '-I/home/elias-gravdal/STM32Cube/bootload/Drivers/CMSIS/Device/ST/STM32H7xx/Include',
                      '-I/home/elias-gravdal/STM32Cube/bootload/Drivers/CMSIS/Include' ],
           }
