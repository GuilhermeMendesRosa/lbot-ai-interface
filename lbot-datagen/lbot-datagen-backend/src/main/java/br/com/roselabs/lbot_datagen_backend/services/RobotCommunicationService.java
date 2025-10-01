package br.com.roselabs.lbot_datagen_backend.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

import java.io.*;
import java.net.Socket;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
//@Service
public class RobotCommunicationService {

    private static final String ROBOT_HOST = "localhost";
    private static final int ROBOT_PORT = 9999;

    private Socket robotSocket;
    private PrintWriter socketWriter;
    private BufferedReader socketReader;
    private final AtomicBoolean connected = new AtomicBoolean(false);
    private final AtomicBoolean shouldRun = new AtomicBoolean(true);
    private CompletableFuture<Void> messageListener;

    public boolean connectToRobot() {
        try {
            log.info("Tentando conectar ao robô em {}:{}", ROBOT_HOST, ROBOT_PORT);

            robotSocket = new Socket(ROBOT_HOST, ROBOT_PORT);
            socketWriter = new PrintWriter(robotSocket.getOutputStream(), true);
            socketReader = new BufferedReader(new InputStreamReader(robotSocket.getInputStream()));

            connected.set(true);
            shouldRun.set(true);
            startMessageListener();

            log.info("Conectado ao robô em {}:{}", ROBOT_HOST, ROBOT_PORT);
            return true;

        } catch (Exception e) {
            log.error("Erro ao conectar ao robô: {}", e.getMessage());
            log.error("Certifique-se de que o programa Enki está rodando!");
            return false;
        }
    }

    public void disconnectFromRobot() {
        shouldRun.set(false);
        connected.set(false);

        try {
            if (messageListener != null) {
                messageListener.cancel(true);
            }
            if (socketWriter != null) {
                socketWriter.close();
            }
            if (socketReader != null) {
                socketReader.close();
            }
            if (robotSocket != null) {
                robotSocket.close();
            }
            log.info("Desconectado do robô.");
        } catch (Exception e) {
            log.warn("Erro ao desconectar: {}", e.getMessage());
        }
    }

    public boolean sendCommandToRobot(String command) {
        if (!connected.get()) {
            log.error("Não conectado ao robô!");
            return false;
        }

        try {
            log.info("Enviando comando: {}", command);
            socketWriter.println(command);
            return true;
        } catch (Exception e) {
            log.error("Erro ao enviar comando: {}", e.getMessage());
            connected.set(false);
            return false;
        }
    }

    public boolean isConnectedToRobot() {
        return connected.get();
    }

    private void startMessageListener() {
        messageListener = CompletableFuture.runAsync(() -> {
            while (connected.get() && shouldRun.get()) {
                try {
                    String message = socketReader.readLine();
                    if (message != null && !message.trim().isEmpty()) {
                        log.info("Robô: {}", message);
                    } else {
                        break;
                    }
                } catch (IOException e) {
                    if (connected.get()) {
                        log.warn("Erro ao receber mensagem: {}", e.getMessage());
                    }
                    break;
                }
            }
            connected.set(false);
        });
    }

    @PostConstruct
    public void initializeRobotConnection() {
        log.info("Inicializando conexão com o robô...");
        connectToRobot();
    }

    @PreDestroy
    public void cleanup() {
        disconnectFromRobot();
    }
}
