package br.com.roselabs.lbot_datagen_backend.controllers;

import br.com.roselabs.lbot_datagen_backend.dtos.CreateVirtualControlSessionDTO;
import br.com.roselabs.lbot_datagen_backend.dtos.VirtualControlSessionDTO;
import br.com.roselabs.lbot_datagen_backend.services.VirtualControlService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/virtual-controls")
@RequiredArgsConstructor
public class VirtualControlController {

    private final VirtualControlService virtualControlService;

    @PostMapping("/sessions")
    public ResponseEntity<VirtualControlSessionDTO> createSession(
            @RequestBody CreateVirtualControlSessionDTO createDto) {
        try {
            VirtualControlSessionDTO session = virtualControlService.createSession(createDto);
            return ResponseEntity.status(HttpStatus.CREATED).body(session);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<VirtualControlSessionDTO>> getAllSessions() {
        try {
            List<VirtualControlSessionDTO> sessions = virtualControlService.getAllSessions();
            return ResponseEntity.ok(sessions);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/sessions/{id}")
    public ResponseEntity<VirtualControlSessionDTO> getSessionById(@PathVariable UUID id) {
        try {
            VirtualControlSessionDTO session = virtualControlService.getSessionById(id);
            return ResponseEntity.ok(session);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
