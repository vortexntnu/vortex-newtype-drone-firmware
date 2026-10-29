# origin-pack: STMicroelectronics::led_part_drivers@2.0.0
# file-format: 1.0.0
project(STMicroelectronics_led_part_drivers_2_0_0)
cmake_minimum_required(VERSION 3.30)
add_library(STMicroelectronics_led_part_drivers_2_0_0 INTERFACE)

# List of all CMSIS properties that influence conditions for this package


# Device specific defined symbols








# Enable all components in this package
if(CMSIS_ENTIRE_STMicroelectronics_led_part_drivers_2_0_0)
  list(APPEND CMSIS_COMPONENTS_LIST "Cvendor:STMicroelectronics#Cclass:Board Part#Cgroup:LED#Csub:GPIO#Cversion:1.0.0")
  list(APPEND CMSIS_COMPONENTS_LIST "Cvendor:STMicroelectronics#Cclass:Board Part#Cgroup:LED#Csub:PWM#Cversion:1.0.0")
endif()

# All conditions used by this package

# condition: STMicroelectronics.led_part_drivers.2.0.0:HAL GPIO
# description: STMicroelectronics LED GPIO HAL Driver
set(STMicroelectronics.led_part_drivers.2.0.0_HAL_GPIO "$<NOT:$<STREQUAL:$<FILTER:${CMSIS_COMPONENTS_LIST},INCLUDE,.*Cclass:Device#.*Cgroup:STM32 HAL#.*Csub:GPIO(#.*|$)>,>>")
message(DEBUG "CMSIS condition STMicroelectronics.led_part_drivers.2.0.0_HAL_GPIO enabled")


# condition: STMicroelectronics.led_part_drivers.2.0.0:HAL PWM
# description: STMicroelectronics LED PWM HAL Driver
set(STMicroelectronics.led_part_drivers.2.0.0_HAL_PWM "$<NOT:$<STREQUAL:$<FILTER:${CMSIS_COMPONENTS_LIST},INCLUDE,.*Cclass:Device#.*Cgroup:STM32 HAL#.*Csub:TIM(#.*|$)>,>>")
message(DEBUG "CMSIS condition STMicroelectronics.led_part_drivers.2.0.0_HAL_PWM enabled")


# condition: STMicroelectronics.led_part_drivers.2.0.0:LED CFG Condition
# description: STMicroelectronics configuration for LED part driver
set(STMicroelectronics.led_part_drivers.2.0.0_LED_CFG_Condition "1")
message(DEBUG "CMSIS condition STMicroelectronics.led_part_drivers.2.0.0_LED_CFG_Condition enabled")

# Files and components in this package
if("Cvendor:STMicroelectronics#Cclass:Board Part#Cgroup:LED#Csub:GPIO#Cversion:1.0.0" IN_LIST CMSIS_COMPONENTS_LIST)  # Driver for LED driven by GPIO based on STM32 HAL
  message(DEBUG "Using component Board_Part_LED_GPIO_1_0_0")
  target_compile_definitions(STMicroelectronics_led_part_drivers_2_0_0 INTERFACE "$<${STMicroelectronics.led_part_drivers.2.0.0_HAL_GPIO}:-DCMSIS_USE_Board_Part_LED_GPIO_1_0_0=1>")
  target_include_directories(STMicroelectronics_led_part_drivers_2_0_0 INTERFACE "$<${STMicroelectronics.led_part_drivers.2.0.0_HAL_GPIO}:${CMAKE_CURRENT_LIST_DIR}/gpio>")
endif()

if("Cvendor:STMicroelectronics#Cclass:Board Part#Cgroup:LED#Csub:PWM#Cversion:1.0.0" IN_LIST CMSIS_COMPONENTS_LIST)  # Driver for LED driven by PWM based on STM32 HAL
  message(DEBUG "Using component Board_Part_LED_PWM_1_0_0")
  target_compile_definitions(STMicroelectronics_led_part_drivers_2_0_0 INTERFACE "$<${STMicroelectronics.led_part_drivers.2.0.0_HAL_PWM}:-DCMSIS_USE_Board_Part_LED_PWM_1_0_0=1>")
  target_include_directories(STMicroelectronics_led_part_drivers_2_0_0 INTERFACE "$<${STMicroelectronics.led_part_drivers.2.0.0_HAL_PWM}:${CMAKE_CURRENT_LIST_DIR}/pwm>")
  target_sources(STMicroelectronics_led_part_drivers_2_0_0 INTERFACE "$<${STMicroelectronics.led_part_drivers.2.0.0_HAL_PWM}:${CMAKE_CURRENT_LIST_DIR}/pwm/led_pwm.c>")
endif()

