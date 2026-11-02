# origin-pack: STMicroelectronics::button_part_drivers@2.0.0
# file-format: 1.0.0
project(STMicroelectronics_button_part_drivers_2_0_0)
cmake_minimum_required(VERSION 3.30)
add_library(STMicroelectronics_button_part_drivers_2_0_0 INTERFACE)

# List of all CMSIS properties that influence conditions for this package


# Device specific defined symbols








# Enable all components in this package
if(CMSIS_ENTIRE_STMicroelectronics_button_part_drivers_2_0_0)
  list(APPEND CMSIS_COMPONENTS_LIST "Cvendor:STMicroelectronics#Cclass:Board Part#Cgroup:Button#Csub:gpio#Cversion:1.0.0")
endif()

# All conditions used by this package

# condition: STMicroelectronics.button_part_drivers.2.0.0:Button CFG Condition
# description: STMicroelectronics configuration for Button part driver
set(STMicroelectronics.button_part_drivers.2.0.0_Button_CFG_Condition "1")
message(DEBUG "CMSIS condition STMicroelectronics.button_part_drivers.2.0.0_Button_CFG_Condition enabled")


# condition: STMicroelectronics.button_part_drivers.2.0.0:HAL GPIO
# description: STMicroelectronics GPIO HAL Driver
set(STMicroelectronics.button_part_drivers.2.0.0_HAL_GPIO "$<AND:$<NOT:$<STREQUAL:$<FILTER:${CMSIS_COMPONENTS_LIST},INCLUDE,.*Cclass:Device#.*Cgroup:STM32 HAL#.*Csub:GPIO(#.*|$)>,>>,$<NOT:$<STREQUAL:$<FILTER:${CMSIS_COMPONENTS_LIST},INCLUDE,.*Cclass:Device#.*Cgroup:STM32 HAL#.*Csub:EXTI(#.*|$)>,>>>")
message(DEBUG "CMSIS condition STMicroelectronics.button_part_drivers.2.0.0_HAL_GPIO enabled")

# Files and components in this package
if("Cvendor:STMicroelectronics#Cclass:Board Part#Cgroup:Button#Csub:gpio#Cversion:1.0.0" IN_LIST CMSIS_COMPONENTS_LIST)  # Driver for button based on STM32 HAL
  message(DEBUG "Using component Board_Part_Button_gpio_1_0_0")
  target_compile_definitions(STMicroelectronics_button_part_drivers_2_0_0 INTERFACE "$<${STMicroelectronics.button_part_drivers.2.0.0_HAL_GPIO}:-DCMSIS_USE_Board_Part_Button_gpio_1_0_0=1>")
  target_include_directories(STMicroelectronics_button_part_drivers_2_0_0 INTERFACE "$<${STMicroelectronics.button_part_drivers.2.0.0_HAL_GPIO}:${CMAKE_CURRENT_LIST_DIR}/gpio>")
  target_sources(STMicroelectronics_button_part_drivers_2_0_0 INTERFACE "$<${STMicroelectronics.button_part_drivers.2.0.0_HAL_GPIO}:${CMAKE_CURRENT_LIST_DIR}/gpio/button.c>")
endif()

