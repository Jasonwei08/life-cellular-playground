cmake_minimum_required(VERSION 3.15)
project(life_engine_cpp CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(life_engine STATIC engine.cpp engine.hpp experiments.cpp experiments.hpp)

add_executable(life main.cpp)
target_link_libraries(life PRIVATE life_engine)

enable_testing()
add_executable(life_tests tests.cpp)
target_link_libraries(life_tests PRIVATE life_engine)
add_test(NAME life_tests COMMAND life_tests)
