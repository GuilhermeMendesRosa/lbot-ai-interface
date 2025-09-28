package br.com.roselabs.lbot_datagen_backend.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

import java.io.*;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AIService {

    private final OpenAiChatModel openAiChatModel;

    private static final String LBML_REGEX = "^(D\\d+[FBLR];|R\\d+[LR];)+$";
    private static final Pattern LBML_PATTERN = Pattern.compile(LBML_REGEX);
    private static final int MAX_RETRIES = 3;
    private static final String ROBOT_HOST = "localhost";
    private static final int ROBOT_PORT = 9999;

    private Socket robotSocket;
    private PrintWriter socketWriter;
    private BufferedReader socketReader;
    private final AtomicBoolean connected = new AtomicBoolean(false);
    private final AtomicBoolean shouldRun = new AtomicBoolean(true);
    private CompletableFuture<Void> messageListener;

    public String normalizePromptImCm(String prompt) {
        try {
            String systemPrompt = loadPromptFromFile("static/prompts/normalize-prompts-in-cm.txt");
            return openAiChatModel.call(systemPrompt + prompt);
        } catch (IOException e) {
            throw new RuntimeException("Erro ao carregar arquivo de prompt", e);
        }
    }

    public String convertToLML(String prompt) {
        return convertWithValidation(prompt);
    }

    public String processAndExecuteCommand(String prompt) {
        try {
            log.info("Processando comando: {}", prompt);

//            if (!isConnectedToRobot()) {
//                log.warn("Não conectado ao robô. Tentando reconectar...");
//                if (!connectToRobot()) {
//                    log.error("Falha na conexão com o robô!");
//                    return "ERRO: Não foi possível conectar ao robô";
//                }
//            }

//            String normalizedPrompt = normalizePromptImCm(prompt);
//            log.info("Prompt normalizado: {}", normalizedPrompt);

            String lbmlCommand = convertToLML(prompt);
            log.info("Comando LBML gerado: {}", lbmlCommand);

//            boolean success = sendCommandToRobot(lbmlCommand);

//            if (success) {
//                log.info("Comando executado com sucesso no robô!");
                return lbmlCommand;
//            } else {
//                log.error("Falha ao executar comando no robô");
//                return "ERRO: Falha na execução";
//            }

        } catch (Exception e) {
            log.error("Erro ao processar e executar comando: {}", e.getMessage(), e);
            return "ERRO: " + e.getMessage();
        }
    }

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

    private String convertWithValidation(String prompt) {
        try {
            String systemPrompt = loadPromptFromFile("static/prompts/convert-to-lml.txt");
            String currentPrompt = prompt;

            for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                String fullPrompt = systemPrompt + currentPrompt;
                String result = openAiChatModel.call(fullPrompt);
                String cleanResult = result.trim().replaceAll("\\s+", "");

                if (isValidLBML(cleanResult)) {
                    log.info("LBML válido gerado na tentativa {}: {}", attempt, cleanResult);
                    return cleanResult;
                } else {
                    log.warn("LBML inválido na tentativa {}: {}", attempt, cleanResult);

                    if (attempt < MAX_RETRIES) {
                        currentPrompt = currentPrompt + "\n\nATENÇÃO: A resposta anterior não seguiu o formato correto. " +
                                "Certifique-se de seguir EXATAMENTE o padrão: <Prefixo><Número><Direção>; " +
                                "Exemplo válido: D40F;R90L;D20B;";
                    }
                }
            }

            throw new RuntimeException("Não foi possível gerar LBML válido após " + MAX_RETRIES + " tentativas");

        } catch (IOException e) {
            throw new RuntimeException("Erro ao carregar arquivo de prompt", e);
        }
    }

    private boolean isValidLBML(String lbml) {
        if (lbml == null || lbml.trim().isEmpty()) {
            return false;
        }

        String cleanLbml = lbml.trim();
        boolean isValid = LBML_PATTERN.matcher(cleanLbml).matches();

        if (!isValid) {
            log.debug("LBML inválido: '{}' não corresponde ao padrão: {}", cleanLbml, LBML_REGEX);
        }

        return isValid;
    }

    private String loadPromptFromFile(String filePath) throws IOException {
        ClassPathResource resource = new ClassPathResource(filePath);
        return resource.getContentAsString(StandardCharsets.UTF_8);
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
