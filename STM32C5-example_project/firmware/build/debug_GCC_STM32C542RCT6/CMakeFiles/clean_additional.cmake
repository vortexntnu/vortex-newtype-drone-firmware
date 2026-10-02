# Additional clean files
cmake_minimum_required(VERSION 3.16)

if("${CONFIG}" STREQUAL "" OR "${CONFIG}" STREQUAL "debug_GCC_STM32C542RCT6")
  file(REMOVE_RECURSE
  "example-project.elf"
  "example-project.map"
  )
endif()
