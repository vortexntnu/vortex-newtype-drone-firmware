cmake_minimum_required(VERSION 3.16)

if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    project(thrust_allocator C)
endif()

add_library(thrust_allocator STATIC
    Core/Src/Control/thrust_allocator.c
    Core/Src/Control/allocator_generated.c
)

# CasADi keeps a uniform generated-function ABI, so some parameters are unused.
if(CMAKE_C_COMPILER_ID MATCHES "GNU|Clang")
    set_source_files_properties(
        Core/Src/Control/allocator_generated.c
        PROPERTIES COMPILE_OPTIONS "-Wno-unused-parameter"
    )
endif()

target_compile_features(thrust_allocator PUBLIC c_std_11)
target_include_directories(thrust_allocator
    PUBLIC Core/Inc
    PRIVATE Core/Src/Control
)
target_link_libraries(thrust_allocator PUBLIC m)
