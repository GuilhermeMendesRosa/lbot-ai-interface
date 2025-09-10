cmake_minimum_required(VERSION 3.16)
project(lbot-socket-control)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Procurar o Enki (pode estar instalado ou no diretório específico)
set(ENKI_ROOT_DIR "/Users/guilherme.mendesrosa/code/enki" CACHE PATH "Enki root directory")

# Incluir diretórios do Enki
include_directories(${ENKI_ROOT_DIR})
link_directories(${ENKI_ROOT_DIR}/build)

# Procurar Qt5 para o viewer
find_package(Qt5Core REQUIRED)
find_package(Qt5Widgets REQUIRED)
find_package(Qt5OpenGL REQUIRED)
find_package(Qt5Xml REQUIRED)
find_package(Qt5Network REQUIRED)

# Procurar OpenGL
find_package(OpenGL REQUIRED)

if(Qt5Core_FOUND AND Qt5Widgets_FOUND AND Qt5OpenGL_FOUND AND Qt5Xml_FOUND AND Qt5Network_FOUND)
    
    add_executable(lbot-socket-control enkiSocketControl.cpp enkiSocketControl.h)
    
    # Habilitar MOC apenas para este target
    set_target_properties(lbot-socket-control PROPERTIES AUTOMOC ON)
    
    # Link com as bibliotecas do Enki
    target_link_libraries(lbot-socket-control 
        ${ENKI_ROOT_DIR}/build/enki/libenki.a
        ${ENKI_ROOT_DIR}/build/viewer/libenkiviewer.a
    )
    
    # Link Qt5 libraries
    target_link_libraries(lbot-socket-control 
        Qt5::Core Qt5::Widgets Qt5::OpenGL Qt5::Xml Qt5::Network
        ${OPENGL_LIBRARIES}
    )
    
    message(STATUS "L-Bot Socket Control will be built")
    message(STATUS "Using Enki from: ${ENKI_ROOT_DIR}")
else()
    message(STATUS "L-Bot Socket Control will NOT be built because Qt5 was not found")
endif()
