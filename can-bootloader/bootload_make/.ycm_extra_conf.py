def Settings( **kwargs ):
    return {
            'flags': ['-x', 'c', '-Wall', '-Werror', '-Wextra', '-std=c99', '-DSTM32C542xx', '-DUSE_EXTERNAL_ENV', '-Iinclude',
                      '-I/home/elias-gravdal/uni/vortex/stm32/power_cmake/arch/cmsis/CMSIS/Core/Include',
                      '-I/home/elias-gravdal/uni/vortex/stm32/power_make/stm32c5xx-drivers/hal',
                      '-I/home/elias-gravdal/uni/vortex/stm32/power_make/stm32c5xx-drivers/ll',
                      '-I/home/elias-gravdal/uni/vortex/stm32/power_make/stm32c5xx-drivers/timebases',
                      '-I/home/elias-gravdal/uni/vortex/stm32/power_make/stm32c5xx-drivers/templates/common',
                      '-I/home/elias-gravdal/uni/vortex/stm32/power_make/stm32c5xx-dfp/Include',
                      '-I/home/elias-gravdal/uni/vortex/stm32/power_make/stm32c5xx-dfp/Include/Templates' ],
           }
