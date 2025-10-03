package br.com.roselabs.lbot_datagen_backend.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AIService {

    private final OpenAiChatModel chatModel;

    private static final String LBML_REGEX = "^(D\\d+[FBLR];|R\\d+[LR];)+$";
    private static final Pattern LBML_PATTERN = Pattern.compile(LBML_REGEX);
    private static final int MAX_RETRIES = 3;

    public String normalizePromptImCm(String prompt) {
        try {
            String systemPrompt = loadPromptFromFile("static/prompts/normalize-prompts-in-cm.txt");

            OpenAiChatOptions options = OpenAiChatOptions.builder()
                    .model("gpt-4.1-nano")
                    .temperature(0D)
                    .build();

            Prompt chatPrompt = new Prompt(systemPrompt + prompt, options);
            return chatModel.call(chatPrompt).getResult().getOutput().getText();
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

            String normalizedPrompt = normalizePromptImCm(prompt);
            log.info("Prompt normalizado: {}", normalizedPrompt);

            String lbmlCommand = convertToLML(normalizedPrompt);
            log.info("Comando LBML gerado: {}", lbmlCommand);

            return lbmlCommand;
        } catch (Exception e) {
            log.error("Erro ao processar e executar comando: {}", e.getMessage(), e);
            return "ERRO: " + e.getMessage();
        }
    }

    private String convertWithValidation(String prompt) {
        try {
            String systemPrompt = loadPromptFromFile("static/prompts/convert-to-lml.txt");
            String currentPrompt = prompt;

            OpenAiChatOptions options = OpenAiChatOptions.builder()
                    .model("gpt-4.1-mini")
                    .temperature(0D)
                    .build();

            for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                String fullPrompt = systemPrompt + currentPrompt;

                Prompt chatPrompt = new Prompt(fullPrompt, options);
                String result = chatModel.call(chatPrompt).getResult().getOutput().getText();
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
}
